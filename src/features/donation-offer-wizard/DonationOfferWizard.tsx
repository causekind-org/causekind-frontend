"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { useLocale } from "next-intl";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  analyzeOfferImages, checkOfferCompatibility, saveFlowBCommitment, submitOffer,
  updateOfferItemDetails, type CompatibilityCheck, type DonationOffer,
} from "@/lib/api";
import { detectLocationFromServer } from "@/app/actions/locations";

import { WizardProgressBar, WizardProgressRail, type StepAvailability } from "@/features/wizard-kit/WizardProgress";
import { WizardNavigation } from "@/features/wizard-kit/WizardNavigation";
import { DraftSaveStatus } from "@/features/wizard-kit/DraftSaveStatus";
import { StepErrorSummary } from "@/features/wizard-kit/StepErrorSummary";
import { StepCardStack } from "@/features/wizard-kit/StepCardStack";
import { WizardBorderGlow } from "@/features/wizard-kit/WizardBorderGlow";
import { cardVariants } from "@/features/wizard-kit/wizardMotion";
import { useWizardDraft } from "@/features/wizard-kit/useWizardDraft";

import { OfferPhotosStep, type ScreeningState } from "./steps/OfferPhotosStep";
import { GuidedPurchaseLayout } from "./GuidedPurchaseLayout";
import { OfferPurchasePlanStep } from "./steps/OfferPurchasePlanStep";
import { OfferDetailsStep } from "./steps/OfferDetailsStep";
import { OfferConditionStep, type CompatState } from "./steps/OfferConditionStep";
import { OfferPickupStep } from "./steps/OfferPickupStep";
import { OfferReviewStep } from "./steps/OfferReviewStep";
import { useOfferPhotos } from "./useOfferPhotos";
import { useOfferVideo } from "./useOfferVideo";
import {
  emptyOfferModel, firstIncompleteOfferStep, isPurchaseFlow, needsSpecNotes,
  offerModelFrom, offerStepIndex, offerStepsFor, uploadedOfferPhotos,
  type OfferModel, type OfferStep,
} from "./offerModel";
import {
  offerMaterialDigest, offerSnapshotKey, serializeOffer, serializePurchaseCommitment,
} from "./offerSerializer";
import { offerStepForField, validateOfferAll, validateOfferStep } from "./offerSchema";

const STEP_LABELS: Record<OfferStep, string> = {
  photos: "Show the item",
  purchasePlan: "What you'll buy",
  details: "Tell us about the item",
  condition: "Condition & fit",
  pickup: "Pickup & delivery",
  review: "Review your offer",
};

const STEP_INTROS: Record<OfferStep, string> = {
  photos: "A few good photos do most of the work.",
  purchasePlan: "Tell the recipient what you plan to buy, and how soon.",
  details: "What are you giving, and how much of it?",
  condition: "How is it doing, and what should the recipient know?",
  pickup: "Where would this be collected from?",
  review: "One last look before it goes to the recipient and our team.",
};

/** Step count in words, for the sidebar. Two flows, two lengths. */
const STEP_COUNT_WORD: Record<number, string> = { 4: "Four", 5: "Five" };

/**
 * The five-step donation-offer editor.
 *
 * <p>Composed from the same primitives as the listing wizard — the stack, the
 * glow, the motion variants, the autosave queue — so the two flows animate and
 * persist identically rather than being two lookalike implementations that drift.
 *
 * <p>The draft already exists before this mounts: the prelude creates it when
 * the donor picks a flow type. So there is no `ensureDraft` race here, and
 * `offerId` is non-null for the whole lifetime of this component.
 */
export function DonationOfferWizard({
  offerId, offer, requestTitle, requestedQuantity, adminNote, onSubmitted, onExit, onSaveExit,
}: {
  offerId: number;
  /** Hydration source — a resumed DRAFT or NEEDS_INFORMATION offer. */
  offer: DonationOffer | null;
  requestTitle: string | null;
  requestedQuantity: number | null;
  /** Rejection guidance, kept visible while editing a NEEDS_INFORMATION offer. */
  adminNote?: string | null;
  onSubmitted: (offer: DonationOffer) => void;
  /** Leaves the editor without submitting, after the latest snapshot is saved. */
  onSaveExit?: () => void;
  /** Returns from the editor to the request/offer-type prelude. */
  onExit: () => void;
}) {
  const reduced = !!useReducedMotion();
  const locale = useLocale();
  const isRtl = locale === "ar" || locale === "ur";

  const flowType = offer?.flowType ?? null;
  const purchase = isPurchaseFlow(flowType);
  const showSpecNotes = needsSpecNotes(flowType);
  const serializerOpts = useMemo(
    () => ({ includeSpecNotes: showSpecNotes, flowType }),
    [showSpecNotes, flowType],
  );

  /** This flow's steps. Everything that counts, walks or jumps reads this. */
  const steps = useMemo(() => offerStepsFor(flowType), [flowType]);

  const [model, setModel] = useState<OfferModel>(() => offer ? offerModelFrom(offer) : emptyOfferModel);

  /**
   * The committed model, for handlers that need to read it without closing over
   * a stale render — and, more importantly, so the setters below can stay pure
   * `setModel(value)` calls rather than updaters that also cause side effects.
   *
   * <p>Assigned during render, not in an effect: a handler firing between render
   * and commit (a click on a freshly painted control) must not read the previous
   * model. Writing a ref during render is safe here because the value is derived
   * from the render's own state, so a discarded render writes a value that a
   * later one immediately overwrites.
   */
  const modelRef = useRef(model);
  modelRef.current = model;
  const [step, setStep] = useState<OfferStep>(() =>
    offer ? firstIncompleteOfferStep(offerModelFrom(offer), offer.flowType) : steps[0]);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savingExit, setSavingExit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [gps, setGps] = useState<{ running: boolean; error: string | null }>({ running: false, error: null });

  const [screening, setScreening] = useState<ScreeningState>({ kind: "idle" });
  const [compat, setCompat] = useState<CompatibilityCheck | null>(null);
  const [compatState, setCompatState] = useState<CompatState>({ kind: "incomplete" });

  const headingRef = useRef<HTMLHeadingElement>(null);

  /** Last purchase commitment the server confirmed, as a JSON digest. */
  const lastCommitmentRef = useRef<string | null>(null);

  // ── Autosave ──────────────────────────────────────────────────────────────
  const snapshotKey = useCallback((m: OfferModel) => offerSnapshotKey(m, serializerOpts), [serializerOpts]);
  const createDraft = useCallback(async () => offerId, [offerId]);
  /**
   * One save, two endpoints on the purchase flow.
   *
   * <p>The commitment has its own endpoint and is not part of the item-details
   * PATCH, so autosave has to drive both or the plan would only ever reach the
   * server on submit — and a donor who closed the tab would lose it while the
   * chip said "Saved".
   *
   * <p>Sequential, not parallel, and details first: `saveCommitment` rejects an
   * offer whose flowType is not WILL_PURCHASE, so a failure there should not
   * leave the item details unsaved too.
   */
  const updateDraft = useCallback(
    async (id: number, m: OfferModel) => {
      const result = await updateOfferItemDetails(id, serializeOffer(m, serializerOpts));
      if (purchase) {
        const commitment = serializePurchaseCommitment(m, requestTitle);
        // Only when it actually changed. The plan is entered once on step 1 and
        // then never touched again, but this runs on every autosave and every
        // Continue — so without this check a donor on the details or pickup step
        // pays a second round trip to rewrite a row with identical contents.
        // That is the difference between one and two cold-pool waits on the
        // Neon resume that CLAUDE.md's connection policy deliberately allows.
        //
        // The ref is only advanced after the save resolves, so a failure leaves
        // it stale and the next attempt retries rather than skipping.
        const key = commitment ? JSON.stringify(commitment) : null;
        if (commitment && key !== lastCommitmentRef.current) {
          await saveFlowBCommitment(id, commitment);
          lastCommitmentRef.current = key;
        }
      }
      return result;
    },
    [serializerOpts, purchase, requestTitle],
  );

  const draft = useWizardDraft<OfferModel>({
    initialId: offerId, createDraft, updateDraft, snapshotKey,
  });
  const { queueSave, queueSaveNow, flush, markSavedBaseline } = draft;

  // Hydrated data is already what the server holds; without this baseline the
  // status chip would claim unsaved changes the instant the editor opened.
  const baselineRef = useRef(false);
  useEffect(() => {
    if (offer && !baselineRef.current) {
      baselineRef.current = true;
      markSavedBaseline(offerModelFrom(offer));
    }
  }, [offer, markSavedBaseline]);

  /** Declarations are void once the offer materially changes. */
  const confirmedDigestRef = useRef<string | null>(null);
  const [declarationsInvalidated, setDeclarationsInvalidated] = useState(false);

  /**
   * <b>Everything with a side effect happens OUTSIDE the updater.</b>
   *
   * <p>This used to compute `next` inside `setModel(prev => …)` and, from in
   * there, call `setDeclarationsInvalidated`, mutate `confirmedDigestRef` and
   * fire `queueSave`. A `useState` updater must be pure: React runs it during
   * render, again eagerly at dispatch when the queue is empty, and twice more
   * under StrictMode in development. So the autosave was queued two or three
   * times per keystroke, `queueSave`'s internal `setStatus` became a
   * render-phase update, and the ref mutation made the declarations logic
   * non-idempotent — the second invocation saw a ref the first had already
   * cleared and took the other branch.
   *
   * <p>Reading `modelRef` instead of `prev` keeps this a pure `setModel(value)`.
   * The ref is written in an effect below, so it always holds the committed
   * model.
   */
  const setField = useCallback(<K extends keyof OfferModel>(key: K, value: OfferModel[K]) => {
    const prev = modelRef.current;
    const next: OfferModel = { ...prev, [key]: value };

    // Unticking defects clears the text, so a stale description cannot ride
    // along in the payload or reappear in Review.
    if (key === "hasKnownDefects" && value === false) next.knownDefects = "";

    // A material edit after agreeing voids the agreement. The donor is
    // submitting a promise about specific content; changing that content
    // afterwards would submit something they never saw.
    let invalidated: boolean | null = null;
    if (key !== "declarationsConfirmed" && confirmedDigestRef.current !== null) {
      if (offerMaterialDigest(next) !== confirmedDigestRef.current) {
        next.declarationsConfirmed = false;
        confirmedDigestRef.current = null;
        invalidated = true;
      }
    }
    if (key === "declarationsConfirmed" && value === true) {
      confirmedDigestRef.current = offerMaterialDigest(next);
      invalidated = false;
    }

    setModel(next);
    if (invalidated !== null) setDeclarationsInvalidated(invalidated);
    queueSave(next);
  }, [queueSave]);

  // ── Photos ────────────────────────────────────────────────────────────────
  const setPhotos = useCallback((updater: (prev: OfferModel["photos"]) => OfferModel["photos"]) => {
    const next = { ...modelRef.current, photos: updater(modelRef.current.photos) };
    setModel(next);
    queueSaveNow(next);
  }, [queueSaveNow]);

  /**
   * Monotonic id for the photo set an analysis belongs to.
   *
   * <p>Deleting a photo must invalidate a verdict that was about the old set —
   * otherwise a "prohibited" result from a photo that no longer exists keeps
   * Continue disabled forever, and a late "safe" response can unblock a set that
   * was never checked.
   */
  const screenTokenRef = useRef(0);

  const runScreening = useCallback(async () => {
    const urls = uploadedOfferPhotos(model.photos);
    if (urls.length === 0) { setScreening({ kind: "idle" }); return; }

    const token = ++screenTokenRef.current;
    setScreening({ kind: "running" });
    try {
      const res = await analyzeOfferImages(offerId);
      if (token !== screenTokenRef.current) return; // superseded
      if (!res.aiAvailable) {
        setScreening({ kind: "unavailable", note: res.note ?? "We couldn't check your photos just now — you can continue." });
      } else if (res.prohibited) {
        setScreening({ kind: "prohibited", code: res.prohibitedCode, category: res.prohibitedCategory });
      } else {
        setScreening({ kind: "safe" });
      }
    } catch {
      if (token !== screenTokenRef.current) return;
      setScreening({ kind: "unavailable", note: "We couldn't check your photos just now — you can continue." });
    }
  }, [model.photos, offerId]);

  const onPhotoSetChanged = useCallback(() => {
    // Any change invalidates the previous verdict immediately, before the new
    // request even starts.
    screenTokenRef.current += 1;
    setScreening({ kind: "idle" });
  }, []);

  const photoApi = useOfferPhotos({
    offerId,
    photos: model.photos,
    setPhotos,
    onUrlsChanged: onPhotoSetChanged,
    onRejected: msg => toast.error(msg),
  });

  // The optional item video. Held here rather than inside the photos step so it
  // survives stepping away and back — screening runs on the server and its
  // verdict should not be lost because the donor moved to Details and returned.
  // offerId exists for this component’s whole lifetime (the prelude creates the
  // draft), so the resolver is immediate here. The listing wizard is the one
  // that needs it lazy.
  const resolveOfferId = useCallback(async () => offerId, [offerId]);
  const videoApi = useOfferVideo(resolveOfferId);

  // Re-screen once uploads settle, keyed on the uploaded set.
  const uploadedKey = uploadedOfferPhotos(model.photos).map(p => p.remoteUrl).join("|");
  const isUploading = model.photos.some(p => p.status === "uploading" || p.status === "pending");
  const screenedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (isUploading || !uploadedKey) return;
    if (screenedKeyRef.current === uploadedKey) return;
    screenedKeyRef.current = uploadedKey;
    void runScreening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedKey, isUploading]);

  // ── Compatibility ─────────────────────────────────────────────────────────
  /**
   * Runs only against data the server has confirmed.
   *
   * <p>Checking local values would report a fit for a quantity the backend has
   * never seen. The revision token drops responses belonging to an older form
   * state, so a slow early check cannot overwrite a newer verdict.
   */
  const compatTokenRef = useRef(0);
  const compatSavedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const qty = Number(model.quantity);
    if (!Number.isInteger(qty) || qty < 1 || !model.condition) {
      setCompatState({ kind: "incomplete" });
      return;
    }
    const key = `${qty}|${model.condition}`;
    if (compatSavedKeyRef.current === key) return;

    const token = ++compatTokenRef.current;
    setCompatState({ kind: "saving" });

    const timer = setTimeout(() => {
      void (async () => {
        const saved = await flush(model);
        if (token !== compatTokenRef.current) return;
        if (!saved) { setCompatState({ kind: "unavailable" }); return; }

        setCompatState({ kind: "checking" });
        try {
          const check = await checkOfferCompatibility(offerId);
          if (token !== compatTokenRef.current) return;
          compatSavedKeyRef.current = key;
          setCompat(check);
          setCompatState({ kind: "result", check });
        } catch {
          if (token !== compatTokenRef.current) return;
          setCompatState({ kind: "unavailable" });
        }
      })();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.quantity, model.condition, offerId]);

  // ── Navigation ────────────────────────────────────────────────────────────
  /**
   * Move to another step.
   *
   * <p>`carryErrors` exists because Submit needs to land the donor on the step
   * that failed WITH the failure visible. It used to call `setErrors(allErrors)`
   * and then `goTo`, which cleared them — both updates in one tick, so React
   * batched them and the empty object won. The donor was thrown to another step
   * with no message and no focus, which reads exactly as "Submit does nothing".
   * Clearing stays the default; carrying is opt-in.
   */
  const goTo = useCallback((next: OfferStep, dir: number, carryErrors?: Record<string, string>) => {
    setDirection(dir);
    setErrors(carryErrors ?? {});
    setStep(next);
  }, []);

  // Focus the new card's heading so a keyboard or screen-reader user lands in
  // the content rather than back at the top of the document.
  useEffect(() => { headingRef.current?.focus(); }, [step]);

  const focusField = useCallback((field: string) => {
    const el = document.querySelector<HTMLElement>(`[name="${field}"], [data-field="${field}"]`);
    el?.focus();
    el?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);

  // Screening only ever runs on the photos step, which the purchase flow does
  // not have. Without this guard a stale `prohibited` result from a flow the
  // donor backed out of would silently block submit on a flow with no photos
  // and no way to clear it.
  const photosBlocked = !purchase && screening.kind === "prohibited";

  const handleContinue = useCallback(async () => {
    const stepErrors = validateOfferStep(step, model, flowType);
    if (step === "photos" && photosBlocked) {
      setErrors({ photos: "Remove the photo we cannot accept before continuing." });
      return;
    }
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusField(Object.keys(stepErrors)[0]);
      return;
    }

    const idx = offerStepIndex(step, steps);
    if (idx < steps.length - 1) {
      // Flush before advancing so the next step — and the compatibility check —
      // never reason about data the server has not accepted.
      const saved = await flush(model);
      if (!saved) {
        // The toast is the whole message. This used to also set an error keyed to
        // a field with an EMPTY string, which WizardField and StepErrorSummary
        // both treat as "no error" — it rendered nowhere and only looked like
        // feedback in the source.
        toast.error("We couldn't save your changes. Check your connection and try again.");
        return;
      }
      goTo(steps[idx + 1], 1);
    }
  }, [step, model, photosBlocked, flush, goTo, focusField, steps, flowType]);

  /** Synchronous guard. Disabled UI alone loses the race on a double tap. */
  const submitLockRef = useRef(false);

  const handleSubmit = useCallback(async () => {
    if (submitLockRef.current || submitted) return;
    submitLockRef.current = true;
    setSubmitError(null);

    const allErrors = validateOfferAll(model, flowType);
    if (Object.keys(allErrors).length > 0) {
      const first = Object.keys(allErrors)[0];
      const target = offerStepForField(first, flowType);
      submitLockRef.current = false;
      if (target !== step) {
        // Carry the errors THROUGH the step change — see goTo. Focus has to wait
        // for the new step to mount, hence the frame.
        goTo(target, -1, allErrors);
        requestAnimationFrame(() => focusField(first));
      } else {
        setErrors(allErrors);
        focusField(first);
      }
      return;
    }
    if (photosBlocked) {
      submitLockRef.current = false;
      setSubmitError("One of your photos shows something we cannot accept. Replace it to submit.");
      return;
    }

    setSubmitting(true);
    try {
      const saved = await flush(model);
      if (!saved) throw new Error("Your latest changes could not be saved.");
      const result = await submitOffer(offerId, true);
      setSubmitted(true);
      onSubmitted(result);
    } catch (e) {
      // Stay on Review. A failed submit that navigated away would strand the
      // donor on a status screen for an offer that was never sent.
      setSubmitError(e instanceof Error ? e.message : "We couldn't submit your offer. Please try again.");
      submitLockRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [model, submitted, photosBlocked, flush, offerId, onSubmitted, step, goTo, focusField, flowType]);

  const handleSaveExit = useCallback(async () => {
    setSavingExit(true);
    try {
      const saved = await flush(model);
      if (!saved) { toast.error("We couldn't save your changes — please try again."); return; }
      (onSaveExit ?? onExit)();
    } finally {
      setSavingExit(false);
    }
  }, [flush, model, onExit, onSaveExit]);

  const handleUseMyLocation = useCallback(async () => {
    setGps({ running: true, error: null });
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10_000 }));
      const resolved = await detectLocationFromServer(pos.coords.latitude, pos.coords.longitude);
      if (!resolved.ok) throw new Error(resolved.reason);
      const address = resolved.address;
      const city = address.city || address.town || address.village || address.state_district || "";
      const locality = address.suburb || address.neighbourhood || address.road || "";
      const pincode = address.postcode || "";
      // Pure setModel, then the save — same rule as setField above.
      const prev = modelRef.current;
      const next: OfferModel = {
        ...prev,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        pickupCity: city || prev.pickupCity,
        pickupPincode: pincode || prev.pickupPincode,
        pickupLocality: locality || prev.pickupLocality,
      };
      setModel(next);
      queueSave(next);
      setGps({ running: false, error: null });
    } catch {
      // Never blocking — the fields below are the real input.
      setGps({ running: false, error: "We couldn't find your location. Please type your city below." });
    }
  }, [queueSave]);

  // ── Step availability ─────────────────────────────────────────────────────
  /**
   * Which steps the rail lets the donor jump to.
   *
   * <p><b>A completed step is navigable, full stop.</b> This used to also require
   * `draft.isSnapshotSaved(model)` — one global flag for the whole model — so a
   * failed save, or merely the 650ms debounce after each keystroke, greyed out
   * EVERY node on both the rail and the mobile bar. That is a large part of why
   * the wizard felt like "none of the buttons work". The original worry was a
   * donor editing an unsaved earlier answer, but autosave is unchanged and the
   * edit lands in the same model either way; locking navigation never protected
   * anything, it just stranded people.
   *
   * <p>The dependency is `draft.status`, not `draft`. `useWizardDraft` returns a
   * fresh object literal every render, so depending on it meant this memo never
   * hit — and it is expensive: one `validateOfferStep` per step, each building a
   * whole Zod schema and parsing the model. That was ~5 schema builds and 5
   * parses on EVERY render, which is what turned a re-render into a frozen page.
   */
  const availability = useMemo(() => {
    const out = {} as Record<OfferStep, StepAvailability>;
    for (const s of steps) {
      const complete = Object.keys(validateOfferStep(s, model, flowType)).length === 0;
      out[s] = { complete, canNavigate: complete };
    }
    return out;
  }, [model, steps, flowType]);

  const isLast = step === "review";

  const stepContent = (
                <AnimatePresence mode="wait" initial={false} custom={isRtl ? -direction : direction}>
                  <motion.section
                    key={step}
                    custom={isRtl ? -direction : direction}
                    variants={cardVariants(reduced)}
                    initial="enter" animate="center" exit="exit"
                    className={`${purchase ? "p-5 sm:p-6 [&_input]:min-h-11 [&_select]:min-h-11 [&_input]:text-base [&_select]:text-base [&_textarea]:text-base" : "p-2.5 sm:p-3.5"} ck-wizard-step-card rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-16px_rgba(28,25,23,0.25)] dark:border-zinc-800 dark:bg-zinc-900`}
                  >
                    {/* Decorative only. Inside the keyed section on purpose, so it
                        enters, moves and exits with the card — a wrapper outside
                        AnimatePresence would sit still while the card animated,
                        and would disturb mode="wait" exit sequencing. */}
                    {!purchase && <WizardBorderGlow />}

                    <div className="ck-wizard-step-card-content">
                      <h1
                        ref={headingRef} tabIndex={-1}
                        className="text-base font-bold text-stone-900 outline-none sm:text-lg dark:text-stone-100"
                        style={{ fontFamily: "var(--font-source-serif-4), serif" }}
                      >
                        {STEP_LABELS[step]}
                      </h1>
                      <p className="mb-2 mt-0.5 text-xs text-stone-500 dark:text-stone-400">{STEP_INTROS[step]}</p>

                      <div className="mb-2 empty:hidden">
                        <StepErrorSummary
                          errors={Object.fromEntries(Object.entries(errors).filter(([, v]) => v))}
                          onFocusField={focusField}
                        />
                      </div>

                      {step === "photos" && (
                        <OfferPhotosStep
                          photos={model.photos} error={errors.photos} screening={screening}
                          onAddFiles={photoApi.addFiles}
                          onRetryPhoto={photoApi.retryPhoto}
                          onRemovePhoto={photoApi.removePhoto}
                          onRescreen={() => { screenedKeyRef.current = null; void runScreening(); }}
                          video={videoApi}
                          onPickVideo={file => void videoApi.upload(file)}
                          onRemoveVideo={() => void videoApi.remove()}
                        />
                      )}
                      {step === "purchasePlan" && (
                        <OfferPurchasePlanStep
                          model={model} errors={errors} onChange={setField}
                          requestTitle={requestTitle}
                        />
                      )}
                      {step === "details" && (
                        <OfferDetailsStep
                          model={model} errors={errors} onChange={setField}
                          requestedQuantity={requestedQuantity} showSpecNotes={showSpecNotes}
                          purchase={purchase}
                        />
                      )}
                      {step === "condition" && (
                        <OfferConditionStep model={model} errors={errors} onChange={setField} compat={compatState} />
                      )}
                      {step === "pickup" && (
                        <OfferPickupStep
                          model={model} errors={errors} onChange={setField}
                          gps={gps} onUseMyLocation={() => void handleUseMyLocation()}
                        />
                      )}
                      {step === "review" && (
                        <>
                          <OfferReviewStep
                            model={model} errors={errors} requestTitle={requestTitle} compat={compat}
                            declarationsInvalidated={declarationsInvalidated} flowType={flowType}
                            onChange={setField} onEdit={s => goTo(s, -1)}
                          />
                          {submitError && (
                            <p role="alert" className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-2xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                              {submitError}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </motion.section>
                </AnimatePresence>
  );

  if (purchase) {
    return (
      <MotionConfig reducedMotion={reduced ? "always" : "never"}>
        <GuidedPurchaseLayout
          current={step} steps={steps} labels={STEP_LABELS} availability={availability}
          requestTitle={requestTitle} requestedQuantity={requestedQuantity}
          saveStatus={<DraftSaveStatus status={draft.status} onRetry={draft.retry} />}
          onJump={s => goTo(s, offerStepIndex(s, steps) < offerStepIndex(step, steps) ? -1 : 1)}
          onExit={onExit} onSaveExit={() => void handleSaveExit()}
          onContinue={() => void (isLast ? handleSubmit() : handleContinue())}
          submitting={submitting} submitted={submitted} savingExit={savingExit}
        >
          {adminNote && <p role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">Our team asked for more information: {adminNote}</p>}
          {stepContent}
        </GuidedPurchaseLayout>
      </MotionConfig>
    );
  }


  return (
    <MotionConfig reducedMotion={reduced ? "always" : "never"}>
      <div className="flex min-h-[calc(100svh-3.5rem)] flex-col justify-between bg-[#faf8f5] -mb-[calc(var(--ck-bottom-chrome)+0.5rem)] lg:mb-0 dark:bg-zinc-950 lg:min-h-[100dvh] lg:flex-row">
        <aside className="hidden w-[300px] shrink-0 flex-col justify-between bg-gradient-to-b from-[#1c0905] via-[#3a1d0e] to-[#241206] p-7 text-white lg:flex">
          <div>
            <button
              type="button"
              onClick={onExit}
              className="mb-8 flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-highlight)]"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> Back
            </button>
            <h2 className="mb-1 text-2xl font-bold" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
              Offer this item
            </h2>
            <p className="mb-8 text-sm text-white/50">
              {STEP_COUNT_WORD[steps.length] ?? steps.length} short steps. We save as you go.
            </p>
            <WizardProgressRail
              current={step} steps={steps} navLabel="Donation offer progress"
              labels={STEP_LABELS} availability={availability} onJump={s => goTo(s, -1)} />
          </div>
          <p className="text-2xs text-white/35">Your name and address stay private until a match is approved.</p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          {/* Mobile sticky progress — never rendered alongside the desktop rail. */}
          <div className="sticky top-0 z-30 border-b border-stone-200 bg-[#faf8f5] dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
            <div className="flex items-center justify-between px-4 pt-2">
              <button
                type="button"
                onClick={onExit}
                className="flex min-h-[44px] items-center gap-1 text-sm font-medium text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> Back
              </button>
              <DraftSaveStatus status={draft.status} onRetry={draft.retry} />
            </div>
            <WizardProgressBar
              current={step} steps={steps} navLabel="Donation offer progress"
              labels={STEP_LABELS} availability={availability} onJump={s => goTo(s, -1)} />
          </div>

          {/* No extra bottom clearance: the controls are in normal flow below
              this, not overlaying it, and they carry the dock's clearance
              themselves. */}
          <div className="flex-1 px-4 py-5">
            <div className="mx-auto w-full max-w-[680px]">
              <div className="mb-4 hidden items-center justify-between lg:flex">
                <p className="text-2xs font-bold uppercase tracking-wider text-stone-400">
                  Step {offerStepIndex(step, steps) + 1} of {steps.length}
                </p>
                <DraftSaveStatus status={draft.status} onRetry={draft.retry} />
              </div>

              {adminNote && (
                <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> Our team asked for more information
                  </p>
                  <p className="mt-1 text-2xs leading-relaxed text-amber-800 dark:text-amber-300">{adminNote}</p>
                </div>
              )}

              <StepCardStack depth={offerStepIndex(step, steps)}>
{stepContent}
              </StepCardStack>
            </div>
          </div>

          <WizardNavigation
            canGoBack={offerStepIndex(step, steps) > 0}
            onBack={() => goTo(steps[offerStepIndex(step, steps) - 1], -1)}
            onContinue={() => void (isLast ? handleSubmit() : handleContinue())}
            onSaveExit={() => void handleSaveExit()}
            continueLabel={isLast ? "Submit donation offer" : "Continue"}
            isLast={isLast}
            submitting={submitting}
            submitted={submitted}
            savingExit={savingExit}
            avoidBottomChrome
            // Corner clusters rather than a full-width bar. This route keeps the
            // global dock, so a slab here stacked a third band of chrome over
            // the form and collided with the dock's raised centre button.
            variant="floating"
          />
        </div>
      </div>
    </MotionConfig>
  );
}
