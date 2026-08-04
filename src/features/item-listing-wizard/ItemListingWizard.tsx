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

import { WizardProgressBar, WizardProgressRail, type StepAvailability } from "./components/WizardProgress";
import { WizardNavigation } from "./components/WizardNavigation";
import { DraftSaveStatus } from "./components/DraftSaveStatus";
import { StepErrorSummary } from "./components/StepErrorSummary";
import { StepCardStack } from "./components/StepCardStack";
import { PhotosStep } from "./steps/PhotosStep";
import { BasicsStep } from "./steps/BasicsStep";
import { ConditionDetailsStep } from "./steps/ConditionDetailsStep";
import { LocationStep } from "./steps/LocationStep";
import { ReviewSubmitStep } from "./steps/ReviewSubmitStep";
import { useListingDraft } from "./useListingDraft";
import { useListingPhotos } from "./useListingPhotos";
import { materialDigest } from "./wizardSerializer";
import { parseCity } from "./wizardLocation";
import { cardVariants } from "./wizardMotion";
import { validateAll, validateStep, stepForField } from "./wizardSchema";
import {
  WIZARD_STEPS, emptyModel, isSubcategoryValid, modelFromListing,
  needsDimensions, needsWorkingStatus, stepIndex, uploadedUrls,
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
  const aiRanRef = useRef(mode !== "create");

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
      if (key === "category") {
        const cat = value as string;
        if (!isSubcategoryValid(cat, next.subcategory)) next.subcategory = "";
        if (!needsWorkingStatus(cat)) next.workingStatus = "";
        if (!needsDimensions(cat)) { next.dimensions = ""; next.approximateWeight = ""; }
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

      queueSave(next);
      return next;
    });

    // Once an error is showing, correcting the field should clear it promptly.
    setErrors(prev => (prev[key as string] ? { ...prev, [key as string]: "" } : prev));
  }, [queueSave]);

  const setPhotos = useCallback((updater: (prev: WizardPhoto[]) => WizardPhoto[]) => {
    setModel(prev => ({ ...prev, photos: updater(prev.photos) }));
  }, []);

  const onUrlsChanged = useCallback(() => {
    // Photo changes are worth an immediate save; waiting out the debounce risks
    // losing an upload if the tab closes.
    setModel(prev => { queueSaveNow(prev); return prev; });
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
    setModel(prev => {
      const next = { ...prev };
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

      if (r.workingStatus && canSet("workingStatus") && !next.workingStatus && needsWorkingStatus(next.category)) {
        next.workingStatus = r.workingStatus;
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

      queueSave(next);
      return next;
    });

    setAiFilled(filled);
    setUncertain(new Set(r.uncertainFields ?? []));
    setAiNote(filled.size ? "Filled in from your photos — please check each one." : "Nothing new to suggest from these photos.");
  }, [queueSave]);

  const runAnalysis = useCallback(async () => {
    const urls = uploadedUrls(model.photos);
    if (urls.length < 2) return;
    setAiRunning(true);
    setAiNote(null);
    try {
      applyAnalysis(await analyzeListingImages(urls));
    } catch {
      setAiNote("Photo analysis failed — you can retry, or just fill in the details yourself.");
    } finally {
      setAiRunning(false);
    }
  }, [model.photos, applyAnalysis]);

  // Auto-run exactly once for a new listing, never for a resumed one.
  const uploadedCount = uploadedUrls(model.photos).length;
  useEffect(() => {
    if (aiRanRef.current || mode !== "create" || uploadedCount < 2) return;
    aiRanRef.current = true;
    void runAnalysis();
  }, [uploadedCount, mode, runAnalysis]);

  // ── Profile prefill — never over a value the donor already set ─────────────
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current || mode !== "create") return;
    prefilledRef.current = true;
    getProfile()
      .then(p => setModel(prev => {
        // The profile stores city in the same flattened "City, StateIso,
        // CountryIso" shape, so it is parsed rather than dropped into the city
        // box whole. parseCity falls back to free text for older profiles.
        // There is no postal code on UserProfile, so the donor always supplies
        // that themselves — which is why the location step opens in edit mode
        // for a new listing rather than offering a half-empty summary.
        const parsed = parseCity(p.city);
        return {
          ...prev,
          countryIso: dirtyRef.current.has("countryIso") ? prev.countryIso : (parsed.countryIso || prev.countryIso),
          stateIso: dirtyRef.current.has("stateIso") ? prev.stateIso : (prev.stateIso || parsed.stateIso),
          city: dirtyRef.current.has("city") ? prev.city : (prev.city || parsed.city),
          latitude: prev.latitude ?? p.latitude ?? undefined,
          longitude: prev.longitude ?? p.longitude ?? undefined,
        };
      }))
      .catch(() => { /* prefill is best-effort and must never block the form */ });
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
          const data = await detectLocationFromServer(pos.coords.latitude, pos.coords.longitude);
          if (!data?.address) throw new Error("no address");
          const a = data.address as Record<string, string>;
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
      <div className="flex min-h-[100dvh] flex-col bg-[#faf8f5] dark:bg-zinc-950 lg:flex-row">
        {/* Desktop sidebar — preserved concept, now carrying the journey rail. */}
        <aside className="hidden w-[300px] shrink-0 flex-col justify-between bg-gradient-to-b from-[#1c0905] via-[#3a1d0e] to-[#241206] p-7 text-white lg:flex">
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-8 flex min-h-[44px] items-center gap-1.5 text-[13px] font-medium text-white/60 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-highlight)]"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> Back
            </button>
            <h2 className="mb-1 text-2xl font-bold" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
              {mode === "needs-info" ? "Update your listing" : "List an item"}
            </h2>
            <p className="mb-8 text-[13px] text-white/50">Five short steps. We save as you go.</p>
            <WizardProgressRail current={step} labels={STEP_LABELS} availability={availability} onJump={s => goTo(s, -1)} />
          </div>
          <p className="text-[11px] text-white/35">Your name and address stay private until a match is approved.</p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile sticky progress — never rendered alongside the desktop rail. */}
          <div className="sticky top-0 z-30 border-b border-stone-200 bg-[#faf8f5]/95 backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
            <div className="flex items-center justify-between px-4 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex min-h-[44px] items-center gap-1 text-[13px] font-medium text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> Back
              </button>
              <DraftSaveStatus status={draft.status} onRetry={draft.retry} />
            </div>
            <WizardProgressBar current={step} labels={STEP_LABELS} availability={availability} onJump={s => goTo(s, -1)} />
          </div>

          <div ref={scrollRef} className="flex-1 px-4 py-5">
            <div className="mx-auto w-full max-w-[680px]">
              <div className="mb-4 hidden items-center justify-between lg:flex">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Step {stepIndex(step) + 1} of {WIZARD_STEPS.length}
                </p>
                <DraftSaveStatus status={draft.status} onRetry={draft.retry} />
              </div>

              {mode === "needs-info" && adminNote && (
                <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> Our team asked for more information
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">{adminNote}</p>
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
                  className="rounded-2xl border border-stone-200 bg-white p-3 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-16px_rgba(28,25,23,0.25)] sm:p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-lg font-bold text-stone-900 outline-none sm:text-xl dark:text-stone-100"
                    style={{ fontFamily: "var(--font-source-serif-4), serif" }}
                  >
                    {STEP_LABELS[step]}
                  </h1>
                  <p className="mb-3 mt-0.5 text-[13px] text-stone-500 dark:text-stone-400">{STEP_INTROS[step]}</p>

                  <div className="mb-3">
                    <StepErrorSummary errors={Object.fromEntries(Object.entries(errors).filter(([, v]) => v))} onFocusField={focusField} />
                  </div>

                  {step === "photos" && (
                    <PhotosStep
                      photos={model.photos}
                      error={errors.photos}
                      aiState={{ running: aiRunning, note: aiNote, canReanalyze: uploadedCount >= 2 }}
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
