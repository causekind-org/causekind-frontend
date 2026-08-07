"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { useLocale } from "next-intl";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  analyzeListingImages, getProfile, submitItemListing,
  type ItemListing, type ListingImageAnalysis,
} from "@/lib/api";
import { resolveLocationFromGPS, detectLocationFromServer } from "@/app/actions/locations";

import { WizardProgressBar, WizardProgressRail, type StepAvailability } from "@/features/wizard-kit/WizardProgress";
import { WizardNavigation } from "@/features/wizard-kit/WizardNavigation";
import { DraftSaveStatus } from "@/features/wizard-kit/DraftSaveStatus";
import { StepErrorSummary } from "@/features/wizard-kit/StepErrorSummary";
import { StepCardStack } from "@/features/wizard-kit/StepCardStack";
import { WizardBorderGlow } from "@/features/wizard-kit/WizardBorderGlow";
import { PhotosStep } from "./steps/PhotosStep";
import { BasicsStep } from "./steps/BasicsStep";
import { ConditionDetailsStep } from "./steps/ConditionDetailsStep";
import { LocationStep } from "./steps/LocationStep";
import { ReviewSubmitStep } from "./steps/ReviewSubmitStep";
import { useListingDraft } from "./useListingDraft";
import { useListingPhotos } from "./useListingPhotos";
import { materialDigest } from "./wizardSerializer";
import { parseCity } from "./wizardLocation";
import { fieldsFor } from "./wizardFields";
import { cardVariants } from "@/features/wizard-kit/wizardMotion";
import { validateAll, validateStep, stepForField } from "./wizardSchema";
import {
  WIZARD_STEPS, emptyModel, isSubcategoryValid, modelFromListing,
  needsDimensions, needsWorkingStatus, normalizeWorkingStatus, stepIndex, uploadedUrls,
  type WizardMode, type WizardModel, type WizardPhoto, type WizardStep,
} from "./wizardModel";

const STEP_LABELS: Record<WizardStep, string> = {
  photos: "Show the item",
  basics: "Item basics",
  condition: "Condition & details",
  location: "Confirm location",
  review: "Review & submit",
};

const STEP_INTROS: Record<WizardStep, string> = {
  photos: "A few good photos do most of the work.",
  basics: "What is it, and how many?",
  condition: "How is it doing, and what should a recipient know?",
  location: "Where would a recipient collect it from?",
  review: "One last look before it goes to our team.",
};

const GROUP_TITLES = {
  ownership: "Ownership & accuracy",
  safety: "Safety & conduct",
  screening: "Screening & process",
};

/**
 * The canonical listing wizard — create, draft-resume and NEEDS_INFORMATION
 * resubmit all render this. Keeping one component is the point: the previous
 * create and edit pages had drifted into different validation and different
 * payloads for the same listing.
 */
export function ItemListingWizard({
  mode, listing, initialDraftId, initialStep, adminNote, onDraftCreated,
}: {
  mode: WizardMode;
  /** Hydration source for draft / needs-info. */
  listing?: ItemListing | null;
  initialDraftId?: number | null;
  initialStep?: WizardStep;
  adminNote?: string | null;
  /**
   * Fired once, when a draft id first exists. The route owns the URL rewrite —
   * the wizard deliberately knows nothing about route shapes, and doing the
   * `router.replace` in here made the page's own draft-id handling circular.
   */
  onDraftCreated?: (id: number) => void;
}) {
  const router = useRouter();
  const reduced = !!useReducedMotion();
  const locale = useLocale();
  const isRtl = locale === "ar" || locale === "ur";

  const [model, setModel] = useState<WizardModel>(() => listing ? modelFromListing(listing) : emptyModel);
  const [step, setStep] = useState<WizardStep>(initialStep ?? "photos");
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savingExit, setSavingExit] = useState(false);
  const [gps, setGps] = useState<{ running: boolean; error: string | null }>({ running: false, error: null });

  const [aiRunning, setAiRunning] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiFilled, setAiFilled] = useState<Set<string>>(new Set());
  const [uncertain, setUncertain] = useState<Set<string>>(new Set());
  const [prohibited, setProhibited] = useState<{ category: string | null; reason: string | null } | null>(null);

  /** Fields the donor has touched — the AI may never overwrite these. */
  const dirtyRef = useRef<Set<string>>(new Set());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  /**
   * The photo set the current AI note describes, or null if none.
   *
   * <p>This replaced a plain `hasRun` boolean, which was wrong in two ways. It
   * latched true forever, so adding or removing a photo never re-ran the
   * analysis — and because a ref survives React Fast Refresh and draft resume,
   * the note from an old run stayed on screen describing photos that were no
   * longer there. A donor could swap in completely different photos and still be
   * told "Nothing could be read from these photos with confidence".
   *
   * <p>Keying on the actual URL list means the note is either about the photos
   * currently on screen or it is not shown at all.
   */
  const analysedKeyRef = useRef<string | null>(mode === "create" ? null : "__existing__");
  const modelRef = useRef(model);
  useEffect(() => { modelRef.current = model; }, [model]);

  const draft = useListingDraft({
    initialId: initialDraftId ?? listing?.id ?? null,
    onDraftCreated,
  });
  const { queueSave, queueSaveNow, flush, ensureDraft, markSavedBaseline } = draft;

  // Hydrated data is already what the server holds; without this baseline the
  // status chip would claim "Not saved" the instant an edit screen opened.
  const baselineRef = useRef(false);
  useEffect(() => {
    if (listing && !baselineRef.current) {
      baselineRef.current = true;
      markSavedBaseline(modelFromListing(listing));
    }
  }, [listing, markSavedBaseline]);

  /** Declarations are void once the listing materially changes. */
  const confirmedDigestRef = useRef<string | null>(null);
  const [declarationsInvalidated, setDeclarationsInvalidated] = useState(false);

  const setField = useCallback(<K extends keyof WizardModel>(key: K, value: WizardModel[K]) => {
    dirtyRef.current.add(key as string);
    setModel(prev => {
      let next: WizardModel = { ...prev, [key]: value };

      // Category drives three conditional fields. Clearing them here (rather
      // than only hiding them) is what stops a stale value reappearing in
      // review or being kept by the PATCH.
      // Category (and now subcategory, since it can carry overrides) decides
      // which optional fields exist. Anything the new pair hides is CLEARED, not
      // merely hidden — otherwise a donor who fills a model under Electronics
      // then switches to Furniture carries an invisible model into review and
      // into the PATCH.
      if (key === "category" || key === "subcategory") {
        if (key === "category" && !isSubcategoryValid(value as string, next.subcategory)) {
          next.subcategory = "";
        }
        for (const hidden of fieldsFor(next.category, next.subcategory).hiddenKeys()) {
          next[hidden] = "";
        }
      }
      if (key === "noDefects" && value === true) next.knownDefects = "";
      if (key === "countryIso") { next.stateIso = ""; next.city = ""; }
      if (key === "stateIso") next.city = "";

      // A material edit after agreeing voids the confirmation — including any
      // `true` the server already stored from an earlier save.
      if (key !== "declarationsConfirmed" && confirmedDigestRef.current) {
        if (materialDigest(next) !== confirmedDigestRef.current) {
          next = { ...next, declarationsConfirmed: false };
          confirmedDigestRef.current = null;
          setDeclarationsInvalidated(true);
        }
      }
      if (key === "declarationsConfirmed" && value === true) {
        confirmedDigestRef.current = materialDigest(next);
        setDeclarationsInvalidated(false);
      }

      modelRef.current = next;
      queueSave(next);
      return next;
    });

    // Once an error is showing, correcting the field should clear it promptly.
    setErrors(prev => (prev[key as string] ? { ...prev, [key as string]: "" } : prev));
  }, [queueSave]);

  const setPhotos = useCallback((updater: (prev: WizardPhoto[]) => WizardPhoto[]) => {
    setModel(prev => {
      const next = { ...prev, photos: updater(prev.photos) };
      modelRef.current = next;
      return next;
    });
  }, []);

  const onUrlsChanged = useCallback(() => {
    // Photo changes are worth an immediate save; waiting out the debounce risks
    // losing an upload if the tab closes.
    queueSaveNow(modelRef.current);
  }, [queueSaveNow]);

  const photoApi = useListingPhotos({
    photos: model.photos,
    setPhotos,
    onUrlsChanged,
    onRejected: msg => toast.error(msg),
  });

  /** Creating the draft on first photo gives the upload something to belong to. */
  const addFiles = useCallback((files: File[]) => {
    void ensureDraft().catch(() => { /* uploads still work; save will retry */ });
    photoApi.addFiles(files);
  }, [ensureDraft, photoApi]);

  // ── AI analysis ───────────────────────────────────────────────────────────
  const applyAnalysis = useCallback((r: ListingImageAnalysis) => {
    if (!r.aiAvailable) {
      setAiNote(r.note ?? "Photo analysis isn't available right now — please fill in the details yourself.");
      return;
    }
    if (r.prohibited) {
      setProhibited({ category: r.prohibitedCategory, reason: r.prohibitedReason });
    }

    const filled = new Set<string>();
    const current = modelRef.current;
    const next: WizardModel = { ...current };
    const canSet = (k: string) => !dirtyRef.current.has(k);

    // Category and subcategory are one decision: applying a category without
    // its subcategory (or vice versa) can leave an incompatible pair.
    if (r.category && canSet("category") && !next.category) {
      next.category = r.category;
      filled.add("category");
      if (r.subcategory && canSet("subcategory") && isSubcategoryValid(r.category, r.subcategory)) {
        next.subcategory = r.subcategory;
        filled.add("subcategory");
      }
    } else if (r.subcategory && canSet("subcategory") && !next.subcategory
               && isSubcategoryValid(next.category, r.subcategory)) {
      next.subcategory = r.subcategory;
      filled.add("subcategory");
    }

    const simple: [keyof WizardModel, string | null][] = [
      ["title", r.title], ["brand", r.brand], ["model", r.model],
      ["condition", r.condition], ["approximateAge", r.approximateAge],
      ["description", r.description],
    ];
    for (const [key, value] of simple) {
      if (value && canSet(key as string) && !next[key]) {
        (next[key] as string) = value;
        filled.add(key as string);
      }
    }

    // Normalised, never assigned raw: the service returns WORKING /
    // PARTIALLY_WORKING / NOT_WORKING, which no <option> here matches. An
    // unrecognised value resolves to "" and is dropped rather than written.
    const normalizedWorking = normalizeWorkingStatus(r.workingStatus);
    if (normalizedWorking && canSet("workingStatus") && !next.workingStatus && needsWorkingStatus(next.category)) {
      next.workingStatus = normalizedWorking;
      filled.add("workingStatus");
    }
    if (needsDimensions(next.category)) {
      if (r.dimensions && canSet("dimensions") && !next.dimensions) { next.dimensions = r.dimensions; filled.add("dimensions"); }
      if (r.approximateWeight && canSet("approximateWeight") && !next.approximateWeight) { next.approximateWeight = r.approximateWeight; filled.add("approximateWeight"); }
    }
    if (r.knownDefects && canSet("knownDefects") && !next.knownDefects && !next.noDefects) {
      if (r.knownDefects === "NONE") next.noDefects = true;
      else { next.knownDefects = r.knownDefects; filled.add("knownDefects"); }
    }

    modelRef.current = next;
    setModel(next);
    queueSave(next);

    setAiFilled(filled);
    setUncertain(new Set(r.uncertainFields ?? []));

    if (filled.size > 0) {
      toast.success(
        `AI filled in ${filled.size} field${filled.size === 1 ? "" : "s"} from your photos — please review before submitting.`
      );
    }

    // Say what was filled AND why the rest is blank. A bare "filled in from your
    // photos" reads as a failure when three of eight fields populate, when in
    // fact age is never inferred (a photo cannot tell you how old something is)
    // and brand/model are only taken from a legible label — both deliberate
    // accuracy rules, not gaps.
    setAiNote(
      filled.size
        ? `Filled ${filled.size} field${filled.size === 1 ? "" : "s"} from your photos — please check each one. Age, and brand or model where there's no visible label, are for you to add.`
        : "Nothing could be read from these photos with confidence — please fill the details in yourself.",
    );
  }, [queueSave]);

  // Read through a ref so runAnalysis keeps a stable identity. It is a dependency
  // of the debounced auto-run effect below, and an identity that changed on every
  // photo-state tick would clear the pending timer before it could ever fire.
  const photosRef = useRef(model.photos);
  useEffect(() => { photosRef.current = model.photos; }, [model.photos]);

  const runAnalysis = useCallback(async (customUrls?: string[]) => {
    const urls = customUrls && customUrls.length > 0 ? customUrls : uploadedUrls(photosRef.current);
    if (urls.length < 1) return;
    analysedKeyRef.current = urls.join("|");
    setAiRunning(true);
    setAiNote(null);
    try {
      const res = await analyzeListingImages(urls);
      applyAnalysis(res);
    } catch (err) {
      console.error("AI photo analysis failed", err);
      setAiNote("Photo analysis failed — you can retry, or just fill in the details yourself.");
      toast.error("Photo analysis failed. You can fill in the details manually or retry.");
    } finally {
      setAiRunning(false);
    }
  }, [applyAnalysis]);

  const isUploading = model.photos.some(p => p.status === "uploading" || p.status === "pending");
  const uploadedList = uploadedUrls(model.photos);
  const uploadedCount = uploadedList.length;
  // The identity of the photo set, not its size: swapping one photo for another
  // leaves the count unchanged but must still invalidate the previous analysis.
  const uploadedKey = uploadedList.join("|");

  useEffect(() => {
    if (mode !== "create") return;

    // All photos removed — drop the note with them rather than leaving it to
    // describe an empty picker.
    if (uploadedCount < 1) {
      analysedKeyRef.current = null;
      setAiNote(null);
      setAiFilled(new Set());
      setUncertain(new Set());
      setProhibited(null);
      return;
    }

    if (isUploading) return;                              // wait for the set to settle
    if (analysedKeyRef.current === uploadedKey) return;   // already analysed these

    // Coalesce: a donor adding three photos one at a time would otherwise spend
    // three analysis calls, each superseded by the next. One call once they stop.
    const timer = setTimeout(() => {
      analysedKeyRef.current = uploadedKey;
      void runAnalysis(uploadedKey.split("|"));
    }, 700);
    return () => clearTimeout(timer);
  }, [uploadedKey, uploadedCount, isUploading, mode, runAnalysis]);

  // ── Profile prefill — never over a value the donor already set ─────────────
  const prefilledRef = useRef(false);
  useEffect(() => {
    let isMounted = true;
    if (prefilledRef.current || mode !== "create") return;
    prefilledRef.current = true;
    getProfile()
      .then(p => {
        if (!isMounted) return;
        setModel(prev => {
          // The profile stores city in the same flattened "City, StateIso,
          // CountryIso" shape, so it is parsed rather than dropped into the city
          // box whole. parseCity falls back to free text for older profiles.
          // There is no postal code on UserProfile, so the donor always supplies
          // that themselves — which is why the location step opens in edit mode
          // for a new listing rather than offering a half-empty summary.
          const parsed = parseCity(p.city);
          const next = {
            ...prev,
            countryIso: dirtyRef.current.has("countryIso") ? prev.countryIso : (parsed.countryIso || prev.countryIso),
            stateIso: dirtyRef.current.has("stateIso") ? prev.stateIso : (prev.stateIso || parsed.stateIso),
            city: dirtyRef.current.has("city") ? prev.city : (prev.city || parsed.city),
            latitude: prev.latitude ?? p.latitude ?? undefined,
            longitude: prev.longitude ?? p.longitude ?? undefined,
          };
          modelRef.current = next;
          return next;
        });
      })
      .catch(() => { /* prefill is best-effort and must never block the form */ });
    return () => { isMounted = false; };
  }, [mode]);

  const handleGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGps({ running: false, error: "This device can't share its location." });
      return;
    }
    setGps({ running: true, error: null });
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const geo = await detectLocationFromServer(pos.coords.latitude, pos.coords.longitude);
          if (!geo.ok) {
            // Distinguish "nothing is mapped there" from "the lookup service is
            // unavailable" — they call for different things from the donor, and
            // the old code showed one message for both.
            setGps({
              running: false,
              error: geo.reason === "no-address"
                ? "There's no street address at that spot."
                : "The address lookup is unavailable right now.",
            });
            return;
          }
          const a = geo.address;
          const countryIso = (a.country_code ?? "").toUpperCase() || model.countryIso;
          const cityName = a.city ?? a.town ?? a.village ?? a.state_district ?? "";
          const { stateIso, cityValue } = await resolveLocationFromGPS(countryIso, a.state ?? "", cityName);

          setModel(prev => {
            const next = {
              ...prev,
              countryIso: countryIso || prev.countryIso,
              stateIso: stateIso || prev.stateIso,
              city: cityValue || cityName || prev.city,
              pincode: dirtyRef.current.has("pincode") ? prev.pincode : (a.postcode ?? prev.pincode),
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            queueSave(next);
            return next;
          });
          setGps({ running: false, error: null });
        } catch {
          setGps({ running: false, error: "We couldn't turn that into an address." });
        }
      },
      () => setGps({ running: false, error: "Location permission was denied." }),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [model.countryIso, queueSave]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const focusField = useCallback((field: string) => {
    const target = stepForField(field);
    if (target !== step) { setDirection(-1); setStep(target); return; }
    const el = document.querySelector<HTMLElement>(`[name="${field}"]`);
    el?.focus();
    el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }, [step, reduced]);

  const goTo = useCallback((next: WizardStep, dir: number) => {
    setDirection(dir);
    setErrors({});
    setStep(next);
  }, []);

  const handleContinue = useCallback(() => {
    const stepErrors = validateStep(step, model);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      const first = Object.keys(stepErrors)[0];
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[name="${first}"]`);
        el?.focus();
        el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      });
      return;
    }

    const idx = stepIndex(step);
    if (idx < WIZARD_STEPS.length - 1) {
      // Transition starts now. The save queue keeps running behind it — the old
      // flow awaited the network and then a 380ms timer before moving.
      goTo(WIZARD_STEPS[idx + 1], 1);
    } else {
      void handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, model, goTo, reduced]);

  const handleBack = useCallback(() => {
    const idx = stepIndex(step);
    if (idx > 0) goTo(WIZARD_STEPS[idx - 1], -1);
  }, [step, goTo]);

  const handleSaveExit = useCallback(async () => {
    setSavingExit(true);
    const ok = await flush(model);
    setSavingExit(false);
    if (!ok) { toast.error("We couldn't save your draft. Check your connection and try again."); return; }
    router.push("/dashboard");
  }, [flush, model, router]);

  const handleSubmit = useCallback(async () => {
    const allErrors = validateAll(model);
    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      const first = Object.keys(allErrors)[0];
      const target = stepForField(first);
      if (target !== step) { setDirection(-1); setStep(target); }
      toast.error("A few things still need fixing.");
      return;
    }

    setSubmitting(true);
    try {
      const id = await ensureDraft();
      // Never submit stale data: the newest snapshot must be confirmed first.
      const saved = await flush(model);
      if (!saved) {
        toast.error("We couldn't save your latest changes, so we didn't submit. Please retry.");
        return;
      }
      await submitItemListing(id);
      setSubmitted(true);
      toast.success(mode === "needs-info" ? "Resubmitted for review." : "Submitted for review.");
      setTimeout(() => router.push("/dashboard"), 700);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [model, step, ensureDraft, flush, mode, router]);

  // ── Progress availability ─────────────────────────────────────────────────
  const availability = useMemo(() => {
    const current = stepIndex(step);
    const savedSnapshot = draft.isSnapshotSaved(model);
    const out = {} as Record<WizardStep, StepAvailability>;
    for (const s of WIZARD_STEPS) {
      const i = stepIndex(s);
      const complete = i < current;
      out[s] = {
        complete,
        // Only a completed step whose data the server has confirmed is safe to
        // jump back to; future steps are never reachable from the rail.
        canNavigate: complete && savedSnapshot,
      };
    }
    return out;
  }, [step, model, draft]);

  // Focus the new step heading so keyboard and screen-reader users land in the
  // right place rather than at the top of the document.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const isLast = step === "review";
  const continueLabel = isLast
    ? (mode === "needs-info" ? "Resubmit for review" : "Submit for review")
    : "Continue";

  return (
    <MotionConfig reducedMotion={reduced ? "always" : "never"}>
      {/* flex-col on mobile too. It was `lg:flex` only, so below lg the inner
          column had no height context, `flex-1` collapsed to content height and
          the footer sat directly under the form — leaving the rest of the
          100dvh as dead space beneath it. */}
      <div className="flex min-h-[calc(100svh-3.5rem)] flex-col justify-between bg-[#faf8f5] -mb-[72px] lg:mb-0 dark:bg-zinc-950 lg:min-h-[100dvh] lg:flex-row">
        {/* Desktop sidebar — preserved concept, now carrying the journey rail. */}
        <aside className="hidden w-[300px] shrink-0 flex-col justify-between bg-gradient-to-b from-[#1c0905] via-[#3a1d0e] to-[#241206] p-7 text-white lg:flex">
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-8 flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-highlight)]"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> Back
            </button>
            <h2 className="mb-1 text-2xl font-bold" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
              {mode === "needs-info" ? "Update your listing" : "List an item"}
            </h2>
            <p className="mb-8 text-sm text-white/50">Five short steps. We save as you go.</p>
            <WizardProgressRail current={step} steps={WIZARD_STEPS} navLabel="Listing progress" labels={STEP_LABELS} availability={availability} onJump={s => goTo(s, -1)} />
          </div>
          <p className="text-2xs text-white/35">Your name and address stay private until a match is approved.</p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          {/* Mobile sticky progress — never rendered alongside the desktop rail. */}
          <div className="sticky top-0 z-30 border-b border-stone-200 bg-[#faf8f5] dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
            <div className="flex items-center justify-between px-4 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex min-h-[44px] items-center gap-1 text-sm font-medium text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> Back
              </button>
              <DraftSaveStatus status={draft.status} onRetry={draft.retry} />
            </div>
            <WizardProgressBar current={step} steps={WIZARD_STEPS} navLabel="Listing progress" labels={STEP_LABELS} availability={availability} onJump={s => goTo(s, -1)} />
          </div>

          <div ref={scrollRef} className="flex-1 px-4 py-5">
            <div className="mx-auto w-full max-w-[680px]">
              <div className="mb-4 hidden items-center justify-between lg:flex">
                <p className="text-2xs font-bold uppercase tracking-wider text-stone-400">
                  Step {stepIndex(step) + 1} of {WIZARD_STEPS.length}
                </p>
                <DraftSaveStatus status={draft.status} onRetry={draft.retry} />
              </div>

              {mode === "needs-info" && adminNote && (
                <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> Our team asked for more information
                  </p>
                  <p className="mt-1 text-2xs leading-relaxed text-amber-800 dark:text-amber-300">{adminNote}</p>
                </div>
              )}

              {/* One card per step, sitting on a pile of the steps already done.
                  The pile is decorative siblings, not a wrapper — see
                  StepCardStack for why that distinction matters here. */}
              <StepCardStack depth={stepIndex(step)}>
              <AnimatePresence mode="wait" initial={false} custom={isRtl ? -direction : direction}>
                <motion.section
                  key={step}
                  custom={isRtl ? -direction : direction}
                  variants={cardVariants(reduced)}
                  initial="enter" animate="center" exit="exit"
                  className="ck-wizard-step-card rounded-2xl border border-stone-200 bg-white p-2.5 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-16px_rgba(28,25,23,0.25)] sm:p-3.5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {/* Decorative only. Inside the keyed section on purpose, so it
                      enters, moves and exits with the card — a wrapper outside
                      AnimatePresence would sit still while the card animated,
                      and would disturb mode="wait" exit sequencing. */}
                  <WizardBorderGlow />

                  <div className="ck-wizard-step-card-content">
                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-base font-bold text-stone-900 outline-none sm:text-lg dark:text-stone-100"
                    style={{ fontFamily: "var(--font-source-serif-4), serif" }}
                  >
                    {STEP_LABELS[step]}
                  </h1>
                  <p className="mb-2 mt-0.5 text-xs text-stone-500 dark:text-stone-400">{STEP_INTROS[step]}</p>

                  <div className="mb-2 empty:hidden">
                    <StepErrorSummary errors={Object.fromEntries(Object.entries(errors).filter(([, v]) => v))} onFocusField={focusField} />
                  </div>

                  {step === "photos" && (
                    <PhotosStep
                      photos={model.photos}
                      error={errors.photos}
                      aiState={{ running: aiRunning, note: aiNote, canReanalyze: uploadedCount >= 1 }}
                      prohibited={prohibited}
                      onAddFiles={addFiles}
                      onRetryPhoto={photoApi.retryPhoto}
                      onRemovePhoto={photoApi.removePhoto}
                      onMakeMain={photoApi.makeMain}
                      onReanalyze={() => void runAnalysis()}
                    />
                  )}
                  {step === "basics" && (
                    <BasicsStep model={model} errors={errors} aiFilled={aiFilled} uncertain={uncertain} onChange={setField} />
                  )}
                  {step === "condition" && (
                    <ConditionDetailsStep model={model} errors={errors} aiFilled={aiFilled} uncertain={uncertain} onChange={setField} />
                  )}
                  {step === "location" && (
                    <LocationStep model={model} errors={errors} gps={gps} onChange={setField} onUseGps={handleGps} onConfirm={handleContinue} />
                  )}
                  {step === "review" && (
                    <ReviewSubmitStep
                      model={model}
                      errors={errors}
                      groupTitles={GROUP_TITLES}
                      declarationsInvalidated={declarationsInvalidated}
                      onJump={s => goTo(s, -1)}
                      onChange={setField}
                      resubmit={mode === "needs-info"}
                    />
                  )}
                  </div>
                </motion.section>
              </AnimatePresence>
              </StepCardStack>
            </div>
          </div>

          <WizardNavigation
            canGoBack={stepIndex(step) > 0}
            onBack={handleBack}
            onContinue={handleContinue}
            onSaveExit={() => void handleSaveExit()}
            continueLabel={continueLabel}
            isLast={isLast}
            submitting={submitting}
            submitted={submitted}
            savingExit={savingExit}
          />
        </div>
      </div>
    </MotionConfig>
  );
}
