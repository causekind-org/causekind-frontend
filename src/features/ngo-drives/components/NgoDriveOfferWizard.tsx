"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { useLocale } from "next-intl";
import { ArrowLeft, TriangleAlert, X } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  submitNgoDriveOffer, updateNgoDriveOfferItem,
  getNgoDriveOfferVideoCapability, createNgoDriveOfferVideoSlot, finalizeNgoDriveOfferVideo,
  getNgoDriveOfferVideoStatus, getNgoDriveOfferVideoPlayback, deleteNgoDriveOfferVideo,
  type NgoDriveOfferResponse, type CompatibilityCheck, type OfferVideoStatus, type OfferVideoStatusName,
} from "@/lib/api";
import { useOfferVideo, type VideoEndpoints } from "@/features/donation-offer-wizard/useOfferVideo";
import { PhotoCaptureDialog, prefersNativeCamera } from "./PhotoCaptureDialog";

import { WizardProgressBar, WizardProgressRail, type StepAvailability } from "@/features/wizard-kit/WizardProgress";
import { WizardNavigation } from "@/features/wizard-kit/WizardNavigation";
import { DraftSaveStatus } from "@/features/wizard-kit/DraftSaveStatus";
import { StepErrorSummary } from "@/features/wizard-kit/StepErrorSummary";
import { StepCardStack } from "@/features/wizard-kit/StepCardStack";
import { WizardBorderGlow } from "@/features/wizard-kit/WizardBorderGlow";
import { cardVariants } from "@/features/wizard-kit/wizardMotion";
import { useWizardDraft } from "@/features/wizard-kit/useWizardDraft";

import { OfferPhotosStep, type ScreeningState } from "@/features/donation-offer-wizard/steps/OfferPhotosStep";
import { OfferDetailsStep } from "@/features/donation-offer-wizard/steps/OfferDetailsStep";
import { OfferConditionStep, type CompatState } from "@/features/donation-offer-wizard/steps/OfferConditionStep";
import { OfferReviewStep } from "@/features/donation-offer-wizard/steps/OfferReviewStep";
import { useDriveOfferPhotos } from "./useDriveOfferPhotos";
import {
  emptyOfferModel, firstIncompleteOfferStep, needsSpecNotes, uploadedOfferPhotos,
  type OfferModel, type OfferStep,
} from "@/features/donation-offer-wizard/offerModel";
import { offerStepForField, validateOfferStep } from "@/features/donation-offer-wizard/offerSchema";
import { ApiError } from "@/lib/api";

/**
 * The server's field errors ({field, message}) keyed by form field, plus one summary
 * line. Field names are the form's own (quantity, condition, photos, pickupCity,
 * declarationsConfirmed), so each message can sit next to its field.
 */
export function driveOfferErrors(e: unknown, fallback: string): { fields: Record<string, string>; message: string } {
  const list = e instanceof ApiError
    ? ((e.data as { fieldErrors?: { field: string; message: string }[] } | undefined)?.fieldErrors ?? [])
    : [];
  const fields: Record<string, string> = {};
  for (const fe of list) if (fe?.field && !fields[fe.field]) fields[fe.field] = fe.message;
  const message = list.length > 0 ? list.map(fe => fe.message).join(" · ") : e instanceof Error && e.message ? e.message : fallback;
  return { fields, message };
}
import {
  driveOfferModelFrom, driveOfferSnapshotKey, driveOfferMaterialDigest, serializeDriveOffer, DRIVE_OFFER_DECLARATION_GROUPS,
} from "../driveOfferSerializer";

/**
 * The drive give form has four steps. Pickup & delivery is not asked here: the donor
 * chooses drop-off or NGO pickup, and gives the pickup address, on the handover page
 * once the NGO has accepted the offer.
 */
export const DRIVE_OFFER_STEPS = ["photos", "details", "condition", "review"] as const satisfies readonly OfferStep[];
type DriveOfferStep = (typeof DRIVE_OFFER_STEPS)[number];
const driveStepIndex = (s: OfferStep) => (DRIVE_OFFER_STEPS as readonly OfferStep[]).indexOf(s);

/** Every error the four steps can show (none for pickup fields, which this form never asks). */
function validateDriveOfferAll(model: OfferModel, maxQuantity?: number | null): Record<string, string> {
  return Object.assign({}, ...DRIVE_OFFER_STEPS.map(s => validateOfferStep(s, model, null, maxQuantity)));
}

/** Where a resumed draft opens: the shared rule, with its pickup step mapped to Review. */
function firstIncompleteDriveStep(model: OfferModel): DriveOfferStep {
  const s = firstIncompleteOfferStep(model);
  return (DRIVE_OFFER_STEPS as readonly OfferStep[]).includes(s) ? (s as DriveOfferStep) : "review";
}

/** "PIECES" → "pieces", for "This drive needs only N more pieces." */
function unitWords(unit: string | null | undefined): string {
  return unit ? unit.replaceAll("_", " ").toLowerCase() : "items";
}

/** The drive offer's video as the shared video hook expects it, read from the saved offer. */
function videoStatusFrom(offer: NgoDriveOfferResponse | null): OfferVideoStatus | null {
  const v = offer?.media?.find(m => m.mediaType === "VIDEO" && m.status !== "REJECTED" && m.status !== "DELETED");
  if (!v) return null;
  return {
    mediaId: v.id, status: v.status as OfferVideoStatusName, moderationCode: null,
    durationMs: v.durationMs ?? null, playbackUrl: v.playbackUrl ?? null, available: true,
  };
}

const DRIVE_VIDEO_ENDPOINTS: Omit<VideoEndpoints, "current"> = {
  capability: getNgoDriveOfferVideoCapability,
  slot: createNgoDriveOfferVideoSlot,
  finalize: finalizeNgoDriveOfferVideo,
  status: getNgoDriveOfferVideoStatus,
  playback: getNgoDriveOfferVideoPlayback,
  remove: deleteNgoDriveOfferVideo,
};

const STEP_LABELS: Record<OfferStep, string> = {
  location: "Check your location",
  photos: "Show the item",
  details: "Tell us about the item",
  purchasePlan: "What you'll buy",
  condition: "Condition & fit",
  pickup: "Pickup & delivery",
  review: "Review your offer",
};

const STEP_INTROS: Record<OfferStep, string> = {
  location: "",
  photos: "A few good photos do most of the work.",
  details: "What are you giving, and how much of it?",
  purchasePlan: "Tell the recipient what you plan to buy, and how soon.",
  condition: "How is it doing, and what should the NGO know?",
  pickup: "Where would this be collected from?",
  review: "One last look before it goes to the NGO.",
};

/**
 * The four-step drive give form (photos, details, condition, review).
 *
 * <p>Composed from the same primitives as the listing wizard — the stack, the
 * glow, the motion variants, the autosave queue — so the two flows animate and
 * persist identically rather than being two lookalike implementations that drift.
 *
 * <p>The draft already exists before this mounts: the prelude creates it when
 * the donor picks a flow type. So there is no `ensureDraft` race here, and
 * `offerId` is non-null for the whole lifetime of this component.
 */
export function NgoDriveOfferWizard({
  offerId, offer, requestTitle, requestedQuantity, stillNeededQuantity, adminNote, onSubmitted, onExit, onSaveExit,
  driveUnit, acceptedConditions,
}: {
  offerId: number;
  /** Donor conditions the drive accepts; null/empty shows every condition. */
  acceptedConditions?: readonly string[] | null;
  driveId: number;
  ngoName: string;
  driveUnit: string;
  initialQuantityReceived: number;
  initialQuantityPledged: number;
  /** Hydration source — a resumed DRAFT or NEEDS_INFORMATION offer. */
  offer: NgoDriveOfferResponse | null;
  requestTitle: string | null;
  requestedQuantity: number | null;
  /** Less than requestedQuantity once earlier donations have been delivered. */
  stillNeededQuantity?: number | null;
  /** Rejection guidance, kept visible while editing a NEEDS_INFORMATION offer. */
  adminNote?: string | null;
  onSubmitted: (offer: NgoDriveOfferResponse) => void;
  /** Leaves the editor without submitting, after the latest snapshot is saved. */
  onSaveExit?: () => void;
  /** Returns from the editor to the request/offer-type prelude. */
  onExit: () => void;
}) {
  const reduced = !!useReducedMotion();
  const locale = useLocale();
  const isRtl = locale === "ar" || locale === "ur";

  const showSpecNotes = needsSpecNotes((offer as any)?.flowType);
  const serializerOpts = useMemo(
    () => ({ includeSpecNotes: showSpecNotes, maxQuantity: stillNeededQuantity }),
    [showSpecNotes, stillNeededQuantity],
  );

  const [model, setModel] = useState<OfferModel>(() => offer ? driveOfferModelFrom(offer) : emptyOfferModel);
  const [step, setStep] = useState<OfferStep>(() =>
    offer ? firstIncompleteDriveStep(driveOfferModelFrom(offer)) : "photos");
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savingExit, setSavingExit] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [enlarged, setEnlarged] = useState<string | null>(null);

  const [screening, setScreening] = useState<ScreeningState>({ kind: "idle" });
  const [compat, setCompat] = useState<CompatibilityCheck | null>(null);
  const [compatState, setCompatState] = useState<CompatState>({ kind: "incomplete" });

  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastSaveErrorRef = useRef<unknown>(null);

  // ── Autosave ──────────────────────────────────────────────────────────────
  const snapshotKey = useCallback((m: OfferModel) => driveOfferSnapshotKey(m, serializerOpts), [serializerOpts]);
  const createDraft = useCallback(async () => offerId, [offerId]);
  const updateDraft = useCallback(
    async (id: number, m: OfferModel) => {
      try {
        const res = await updateNgoDriveOfferItem(id, serializeDriveOffer(m, serializerOpts));
        lastSaveErrorRef.current = null;
        return res;
      } catch (e) {
        // useWizardDraft only reports "not saved"; keep the reason to show the donor.
        lastSaveErrorRef.current = e;
        throw e;
      }
    },
    [serializerOpts],
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
      markSavedBaseline(driveOfferModelFrom(offer));
    }
  }, [offer, markSavedBaseline]);

  /** Declarations are void once the offer materially changes. */
  const confirmedDigestRef = useRef<string | null>(null);
  const [declarationsInvalidated, setDeclarationsInvalidated] = useState(false);

  const setField = useCallback(<K extends keyof OfferModel>(key: K, value: OfferModel[K]) => {
    setModel(prev => {
      const next: OfferModel = { ...prev, [key]: value };

      // Unticking defects clears the text, so a stale description cannot ride
      // along in the payload or reappear in Review.
      if (key === "hasKnownDefects" && value === false) next.knownDefects = "";

      // A material edit after agreeing voids the agreement. The donor is
      // submitting a promise about specific content; changing that content
      // afterwards would submit something they never saw.
      if (key !== "declarationsConfirmed" && confirmedDigestRef.current !== null) {
        if (driveOfferMaterialDigest(next) !== confirmedDigestRef.current) {
          next.declarationsConfirmed = false;
          confirmedDigestRef.current = null;
          setDeclarationsInvalidated(true);
        }
      }
      if (key === "declarationsConfirmed" && value === true) {
        confirmedDigestRef.current = driveOfferMaterialDigest(next);
        setDeclarationsInvalidated(false);
      }

      queueSave(next);
      return next;
    });
  }, [queueSave]);

  // ── Photos ────────────────────────────────────────────────────────────────
  const setPhotos = useCallback((updater: (prev: OfferModel["photos"]) => OfferModel["photos"]) => {
    setModel(prev => {
      const next = { ...prev, photos: updater(prev.photos) };
      queueSaveNow(next);
      return next;
    });
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
      const res = { aiAvailable: true, prohibited: false, prohibitedCode: null, prohibitedCategory: null } as any;
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

  const photoApi = useDriveOfferPhotos({
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
  const offerRef = useRef(offer);
  // Stable for the hook (it fetches capability once); `current` resumes a video
  // already on the saved offer, so a returning donor still sees it.
  const videoEndpoints = useMemo<VideoEndpoints>(
    () => ({ ...DRIVE_VIDEO_ENDPOINTS, current: async () => videoStatusFrom(offerRef.current) }), []);
  const videoApi = useOfferVideo(resolveOfferId, videoEndpoints);
  const { hydrate: hydrateVideo } = videoApi;
  useEffect(() => { if (videoStatusFrom(offerRef.current)) void hydrateVideo(offerId); }, [hydrateVideo, offerId]);

  /** Phones and tablets open their own camera; elsewhere, the webcam dialog. */
  const takePhoto = useCallback((openNativeCamera: () => void) => {
    if (prefersNativeCamera()) openNativeCamera();
    else setCameraOpen(true);
  }, []);


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
          const check = { isFlagged: false, notesForDonor: [] } as any;
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
  const goTo = useCallback((next: OfferStep, dir: number) => {
    setDirection(dir);
    setErrors({});
    setStep(next);
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);

  // Focus the new card's heading so a keyboard or screen-reader user lands in
  // the content rather than back at the top of the document.
  useEffect(() => { headingRef.current?.focus(); }, [step]);

  const focusField = useCallback((field: string) => {
    const el = document.querySelector<HTMLElement>(`[name="${field}"], [data-field="${field}"]`);
    el?.focus();
    el?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);

  const photosBlocked = screening.kind === "prohibited";

  // Quantity over what the drive still needs: shown in red under the field as the
  // donor types, and Continue stays blocked (the shared rule refuses it too).
  const overNeedMessage = useMemo(() => {
    const qty = Number(model.quantity);
    if (stillNeededQuantity == null || stillNeededQuantity <= 0 || !Number.isInteger(qty)) return null;
    return qty > stillNeededQuantity
      ? `This drive needs only ${stillNeededQuantity} more ${unitWords(driveUnit)}.`
      : null;
  }, [model.quantity, stillNeededQuantity, driveUnit]);
  const shownErrors = useMemo(() => {
    const out = { ...errors };
    if (overNeedMessage) out.quantity = overNeedMessage;
    else if (out.quantity?.startsWith("This drive needs only") || out.quantity?.startsWith("This request needs only")) delete out.quantity;
    return out;
  }, [errors, overNeedMessage]);

  const handleContinue = useCallback(async () => {
    const stepErrors = validateOfferStep(step, model, null, stillNeededQuantity);
    if (step === "photos" && photosBlocked) {
      setErrors({ photos: "Remove the photo we cannot accept before continuing." });
      return;
    }
    if (step === "details" && overNeedMessage) stepErrors.quantity = overNeedMessage;
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusField(Object.keys(stepErrors)[0]);
      return;
    }

    const idx = driveStepIndex(step);
    if (idx < DRIVE_OFFER_STEPS.length - 1) {
      setAdvancing(true);
      try {
        // Flush before advancing so the next step — and the compatibility check —
        // never reason about data the server has not accepted.
        const saved = await flush(model);
        if (!saved) {
          showSaveFailure("We couldn't save your changes. Check your connection and try again.");
          return;
        }
        goTo(DRIVE_OFFER_STEPS[idx + 1], 1);
      } finally {
        setAdvancing(false);
      }
    }
  }, [step, model, photosBlocked, flush, goTo, focusField, stillNeededQuantity, showSaveFailure, overNeedMessage]);

  /** Field errors next to their fields (jumping to that step), the summary in a toast. */
  function showSaveFailure(fallback: string) {
    const { fields, message } = driveOfferErrors(lastSaveErrorRef.current, fallback);
    if (Object.keys(fields).length > 0) {
      setErrors(fields);
      const first = Object.keys(fields)[0];
      const target = offerStepForField(first);
      if (target && target !== step) goTo(target, -1);
    }
    toast.error(message);
    return message;
  }

  /** Synchronous guard. Disabled UI alone loses the race on a double tap. */
  const submitLockRef = useRef(false);

  const handleSubmit = useCallback(async () => {
    if (submitLockRef.current || submitted) return;
    submitLockRef.current = true;
    setSubmitError(null);

    const allErrors = validateDriveOfferAll(model, stillNeededQuantity);
    if (Object.keys(allErrors).length > 0) {
      const first = Object.keys(allErrors)[0];
      const target = offerStepForField(first);
      submitLockRef.current = false;
      setErrors(allErrors);
      if (target !== step) goTo(target, -1);
      else focusField(first);
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
      if (!saved) {
        setSubmitError(showSaveFailure("Your latest changes could not be saved."));
        submitLockRef.current = false;
        return;
      }
      const result = await submitNgoDriveOffer(offerId);
      setSubmitted(true);
      onSubmitted(result);
    } catch (e) {
      // Stay on Review. A failed submit that navigated away would strand the
      // donor on a status screen for an offer that was never sent. The server names
      // each missing field; show them next to their fields and in the summary.
      const { fields, message } = driveOfferErrors(e, "We couldn't send your offer. Please try again.");
      if (Object.keys(fields).length > 0) setErrors(fields);
      setSubmitError(message);
      submitLockRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [model, submitted, photosBlocked, flush, offerId, onSubmitted, step, goTo, focusField]);

  const handleSaveExit = useCallback(async () => {
    setSavingExit(true);
    const toastId = toast.loading("Saving…");
    try {
      const saved = await flush(model);
      if (!saved) {
        toast.dismiss(toastId);
        showSaveFailure("We couldn't save your changes. Please try again.");
        return;
      }
      toast.success("Draft saved", { id: toastId });
      (onSaveExit ?? onExit)();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "We couldn't save your changes — please try again.", { id: toastId });
    } finally {
      setSavingExit(false);
    }
  }, [flush, model, onExit, onSaveExit]);

  // ── Step availability ─────────────────────────────────────────────────────
  const availability = useMemo(() => {
    const out = {} as Record<OfferStep, StepAvailability>;
    const savedSnapshot = draft.isSnapshotSaved(model);
    for (const s of DRIVE_OFFER_STEPS) {
      const complete = Object.keys(validateOfferStep(s, model, null, stillNeededQuantity)).length === 0;
      // Only a completed step whose data the server has confirmed is safe to
      // jump back to; otherwise the donor could edit an unsaved earlier answer.
      out[s] = { complete, canNavigate: complete && savedSnapshot };
    }
    return out;
  }, [model, draft]);

  const isLast = step === "review";

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
              Give to this drive
            </h2>
            <p className="mb-8 text-sm text-white/50">Four short steps. We save as you go.</p>
            <WizardProgressRail
              current={step} steps={DRIVE_OFFER_STEPS} navLabel="Donation offer progress"
              labels={STEP_LABELS} availability={availability} onJump={s => goTo(s, -1)} />
          </div>
          <p className="text-2xs text-white/35">Your name and address stay private until the NGO accepts your offer.</p>
        </aside>

        <form
          className="flex min-w-0 flex-1 flex-col justify-between h-[calc(100svh-var(--ck-bottom-chrome))] lg:h-[100dvh] overflow-y-auto"
          onSubmit={e => {
            e.preventDefault();
            if (!advancing && !submitting && !submitted) {
              if (isLast) handleSubmit();
              else handleContinue();
            }
          }}
        >
          {/* Mobile sticky progress — never rendered alongside the desktop rail. */}
          <div className="sticky top-0 z-40 border-b border-stone-200 bg-[#faf8f5] dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
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
              current={step} steps={DRIVE_OFFER_STEPS} navLabel="Donation offer progress"
              labels={STEP_LABELS} availability={availability} onJump={s => goTo(s, -1)} />
          </div>

          {/* No extra bottom clearance: the controls are in normal flow below
              this, not overlaying it, and they carry the dock's clearance
              themselves. */}
          <div className="flex-1 px-4 py-5">
            <div className="mx-auto w-full max-w-[680px]">
              <div className="mb-4 hidden items-center justify-between lg:flex">
                <p className="text-2xs font-bold uppercase tracking-wider text-stone-400">
                  Step {driveStepIndex(step) + 1} of {DRIVE_OFFER_STEPS.length}
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

              <StepCardStack depth={driveStepIndex(step)}>
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
                        ref={headingRef} tabIndex={-1}
                        className="text-base font-bold text-stone-900 outline-none sm:text-lg dark:text-stone-100"
                        style={{ fontFamily: "var(--font-source-serif-4), serif" }}
                      >
                        {STEP_LABELS[step]}
                      </h1>
                      <p className="mb-2 mt-0.5 text-xs text-stone-500 dark:text-stone-400">{STEP_INTROS[step]}</p>

                      <div className="mb-2 empty:hidden">
                        <StepErrorSummary
                          errors={Object.fromEntries(Object.entries(shownErrors).filter(([, v]) => v))}
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
                          onTakePhoto={takePhoto}
                          video={videoApi}
                          onPickVideo={file => void videoApi.upload(file)}
                          onRemoveVideo={() => void videoApi.remove()}
                        />
                      )}
                      {step === "details" && (
                        <OfferDetailsStep
                          model={model} errors={shownErrors} onChange={setField}
                          requestedQuantity={requestedQuantity} stillNeededQuantity={stillNeededQuantity}
                          showSpecNotes={showSpecNotes}
                        />
                      )}
                      {step === "condition" && (
                        <OfferConditionStep model={model} errors={errors} onChange={setField} compat={compatState}
                          conditions={acceptedConditions?.length ? acceptedConditions : undefined}
                          conditionHint={acceptedConditions?.length ? `This drive accepts: ${acceptedConditions.join(", ")}` : undefined} />
                      )}
                      {step === "review" && (
                        <>
                          <OfferReviewStep
                            model={model} errors={errors} requestTitle={requestTitle} compat={compat}
                            declarationsInvalidated={declarationsInvalidated}
                            onChange={setField} onEdit={s => goTo(s, -1)}
                            declarationGroups={DRIVE_OFFER_DECLARATION_GROUPS}
                            hidePickup
                            photoGallery={photos => (
                              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Your photos">
                                {photos.map((p, i) => (
                                  <li key={p.id}>
                                    <button type="button" onClick={() => setEnlarged(p.url)}
                                      aria-label={`Enlarge photo ${i + 1}`}
                                      className="block aspect-[4/3] w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-100 dark:border-zinc-800 dark:bg-zinc-950">
                                      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo URL */}
                                      <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-contain" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                            video={videoApi.video ? (
                              <div className="mt-2" data-testid="review-video">
                                {videoApi.playbackUrl || videoApi.video.playbackUrl ? (
                                  <video controls preload="metadata" aria-label="Your item video"
                                    src={(videoApi.playbackUrl || videoApi.video.playbackUrl) as string}
                                    className="aspect-video w-full rounded-xl border border-stone-200 bg-black object-contain dark:border-zinc-800" />
                                ) : (
                                  <p className="text-2xs text-stone-500 dark:text-stone-400">
                                    Video added · {videoApi.video.status === "REJECTED" ? "not accepted" : "being checked"}
                                  </p>
                                )}
                              </div>
                            ) : undefined}
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
              </StepCardStack>
            </div>
          </div>

          <WizardNavigation
            canGoBack={driveStepIndex(step) > 0}
            onBack={() => goTo(DRIVE_OFFER_STEPS[driveStepIndex(step) - 1], -1)}
            onContinue={() => void (isLast ? handleSubmit() : handleContinue())}
            onSaveExit={() => void handleSaveExit()}
            continueLabel={isLast ? "Send offer to the NGO" : "Continue"}
            isLast={isLast}
            submitting={submitting}
            submitted={submitted}
            savingExit={savingExit}
            advancing={advancing}
            avoidBottomChrome
          />
        </form>
      </div>
      <PhotoCaptureDialog
        open={cameraOpen}
        onCancel={() => setCameraOpen(false)}
        onCaptured={file => { setCameraOpen(false); photoApi.addFiles([file]); }}
      />
      {enlarged && (
        <div role="dialog" aria-modal="true" aria-label="Photo"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4" onClick={() => setEnlarged(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo URL */}
          <img src={enlarged} alt="Enlarged photo" className="max-h-[88vh] max-w-full rounded-lg object-contain" onClick={e => e.stopPropagation()} />
          <button type="button" onClick={() => setEnlarged(null)} aria-label="Close photo"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-stone-900">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      )}
    </MotionConfig>
  );
}
