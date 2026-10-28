"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  INITIAL_NGO_FORM,
  IS_NGO_DEMO_MODE,
  NGO_STEPS,
  NGO_STEP_FULL_TITLES,
  formatSubmissionTime,
  getNgoStillNeededItems,
  calculateNgoProgress,
  prefillNgoFormWithUser,
  correctionFieldLabel,
  correctionFieldStep,
  firstCorrectionStep,
  type NGOFormState,
  type NGOStep,
  type UploadedFile,
  fieldText,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { applyDraft, buildDraftPayload, buildSubmitPayload } from "@/features/ngo-registration/ngoWizardPayload";
import { OrgDetails } from "@/features/ngo-registration/steps/OrgDetails";
import { LegalDocuments } from "@/features/ngo-registration/steps/LegalDocuments";
import { AuthorizedRepresentative } from "@/features/ngo-registration/steps/AuthorizedRepresentative";
import { OrgPhotos } from "@/features/ngo-registration/steps/OrgPhotos";
import { ReviewSubmit } from "@/features/ngo-registration/steps/ReviewSubmit";
import { EmailVerification } from "@/features/ngo-registration/steps/EmailVerification";
import { ApplicationSubmitted } from "@/features/ngo-registration/steps/ApplicationSubmitted";
import { CorrectionStatusContext, type NgoCorrections } from "@/features/ngo-registration/components/CorrectionNote";
import { changedFlaggedFields, correctionDisplayValue, fillFlaggedFileSlots, originalFlaggedValues } from "@/features/ngo-registration/ngoCorrectionFields";
import {
  submitNgoApplication,
  getNgoDraft,
  saveNgoDraft,
  getMyNgoApplication,
  ApiError,
  type NgoCorrectionItem,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { isNgoRole } from "@/lib/isNgoRole";

// Reads a ?step=... deep link. email-verification is never a valid entry point.
function readUrlStep(param: string | null): NGOStep | null {
  if (!param || param === "email-verification") return null;
  return (NGO_STEPS as readonly string[]).includes(param) ? (param as NGOStep) : null;
}

export default function NgoDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf8f5] dark:bg-zinc-950 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-ngo-700" />
        </div>
      }
    >
      <NgoDetailsEditor />
    </Suspense>
  );
}

function NgoDetailsEditor() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedStepLink = useRef<string | null>(null);
  const startingStepChosen = useRef(false);
  const initialUrlStep = useRef<NGOStep | null>(readUrlStep(searchParams.get("step")));
  const [clampPending, setClampPending] = useState(false);

  const [data, setData] = useState<NGOFormState>(INITIAL_NGO_FORM);
  const [currentStep, setCurrentStep] = useState<NGOStep | "submitted">("org-details");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [restoreError, setRestoreError] = useState("");
  // "fresh" = just submitted in this session, "restored" = returned to a pending application.
  const [awaitingVerification, setAwaitingVerification] = useState<"fresh" | "restored" | null>(null);
  // A reviewer's per-item correction request: the flagged items start empty and show these notes.
  const [correctionItems, setCorrectionItems] = useState<NgoCorrectionItem[]>([]);
  const flaggedFields = useRef<string[]>([]);
  /** Each flagged item's value when the wizard opened; a fix must change it. */
  const originalFlagged = useRef<Record<string, string>>({});
  /** The status response (holds the originally submitted values of flagged items, when sent). */
  const statusRef = useRef<Record<string, unknown> | null>(null);
  const [overallNote, setOverallNote] = useState("");
  const corrections: NgoCorrections = Object.fromEntries(correctionItems.map((i) => [i.field, i.note]));
  // A corrections resubmission: About us is optional (it may predate the field).
  useEffect(() => {
    if (correctionItems.length > 0) setData((d) => (d.aboutUsOptional ? d : { ...d, aboutUsOptional: true }));
  }, [correctionItems.length]);
  const flaggedSteps = new Set(correctionItems.map((i) => correctionFieldStep(i.field)));
  const resubmitting = correctionItems.length > 0;
  const changedFields = resubmitting ? changedFlaggedFields(data, originalFlagged.current) : new Set<string>();
  const unfixed = correctionItems.filter((i) => !changedFields.has(i.field));
  const toFixInStep = (step: NGOStep) => unfixed.filter((i) => correctionFieldStep(i.field) === step).length;

  const userIdentifier =
    user?.id ?? user?.userId ?? (user?.email ? user.email.toLowerCase().replace(/[^a-z0-9]/g, "_") : "anonymous");
  // The load below runs once per signed-in account, not again when the same account's
  // details refresh (login stores the user without a phone; /users/me adds it a moment
  // later). Re-running it would reset what the NGO has started typing.
  const userRef = useRef(user);
  userRef.current = user;
  const userIdentifierRef = useRef(userIdentifier);
  userIdentifierRef.current = userIdentifier;
  const accountKey = user ? `${(user.email ?? "").toLowerCase()}|${user.role ?? ""}` : "";
  const routerRef = useRef(router);
  routerRef.current = router;

  // Load existing application status or draft on mount
  useEffect(() => {
    const user = userRef.current;
    const userIdentifier = userIdentifierRef.current;
    const router = routerRef.current;
    if (isLoading) return;
    if (!user) {
      router.replace("/login?next=%2Fprofile%2Fngo-details");
      return;
    }

    const hasRole = isNgoRole(user.role?.toUpperCase());
    if (!hasRole) {
      router.replace("/profile");
      return;
    }

    let active = true;

    async function init() {
      try {
        // 1. Check if application is already submitted
        try {
          let submittedApp: any = null;
          if (IS_NGO_DEMO_MODE && typeof window !== "undefined") {
            const demoAppRaw = localStorage.getItem(`ngo-demo-application-${userIdentifier}`);
            if (demoAppRaw) {
              try {
                submittedApp = JSON.parse(demoAppRaw);
              } catch { }
            }
          }
          if (!submittedApp) {
            submittedApp = await getMyNgoApplication();
          }

          if (active) {
            setApplicationStatus(submittedApp?.status || "");
            const items: NgoCorrectionItem[] =
              submittedApp?.status === "NEEDS_INFORMATION" && Array.isArray(submittedApp.correctionItems)
                ? submittedApp.correctionItems : [];
            if (items.length > 0) {
              // Per-item request: everything else comes back filled in (fields and files).
              flaggedFields.current = items.map((i) => i.field);
              setCorrectionItems(items);
              statusRef.current = submittedApp;
              setOverallNote(String(submittedApp.overallNote || submittedApp.needsInformationDetails || ""));
              setReviewMessage("");
              setData(INITIAL_NGO_FORM);
            } else if (submittedApp?.status === "REJECTED" || submittedApp?.status === "NEEDS_INFORMATION") {
              const reason = submittedApp.needsInformationDetails || submittedApp.rejectionReason || "Please review your organization details.";
              setReviewMessage(`${reason} Your details have been restored below. Please upload fresh evidence for this submission; your earlier application stays on record.`);
              setData(INITIAL_NGO_FORM);
            }
          }

          if (submittedApp && active && submittedApp.status === "PENDING_VERIFICATION") {
            setData((prev) => ({
              ...prev,
              organizationName: submittedApp.organizationName || prev.organizationName,
              applicationId: submittedApp.applicationId,
              submittedAt: submittedApp.submittedAt || "",
              // The org email stays as entered; the OTP step shows the account email it was sent to.
              officialEmail: prev.officialEmail,
            }));
            setAwaitingVerification("restored");
            setCurrentStep("email-verification");
            setLoading(false);
            return;
          }

          if (
            submittedApp &&
            active &&
            (submittedApp.status === "UNDER_REVIEW" || submittedApp.status === "APPROVED")
          ) {
            setData((prev) => ({
              ...prev,
              organizationName: submittedApp.organizationName || prev.organizationName,
              applicationId: submittedApp.applicationId,
              submittedAt: submittedApp.submittedAt || "",
            }));
            setCurrentStep("submitted");
            setLoading(false);
            return;
          }
        } catch (error) {
          if (active) setRestoreError(error instanceof Error ? error.message : "We could not restore your application. Please retry.");
          return;
        }

        // 2. If not submitted, load draft
        let draft: any = null;
        if (IS_NGO_DEMO_MODE && typeof window !== "undefined") {
          const raw = localStorage.getItem(`ngo-demo-draft-${userIdentifier}`);
          if (raw) {
            try {
              draft = JSON.parse(raw);
            } catch { }
          }
        }

        if (!draft) {
          try {
            draft = await getNgoDraft();
          } catch (error) {
            if (active) setRestoreError(error instanceof Error ? error.message : "We could not restore your saved details. Please retry.");
            return;
          }
        }

        if (active) {
          setData((prev) => {
            let next = prefillNgoFormWithUser(draft ? applyDraft(prev, draft) : prev, user, flaggedFields.current);
            if (flaggedFields.current.length) {
              const sources = { ...(draft ?? {}), ...(statusRef.current ?? {}) } as Record<string, unknown>;
              originalFlagged.current = originalFlaggedValues(next, flaggedFields.current, sources);
              next = fillFlaggedFileSlots(next, flaggedFields.current, statusRef.current, draft);
            }
            return next;
          });
        }

        // Choose the starting step once: a ?step= deep link wins over the saved draft step.
        if (active && !startingStepChosen.current) {
          startingStepChosen.current = true;
          const savedStep =
            draft?.currentStep && (NGO_STEPS as readonly string[]).includes(draft.currentStep)
              ? (draft.currentStep as NGOStep)
              : null;
          // After a per-item correction request, open on the first step with something to fix.
          const startStep = firstCorrectionStep(flaggedFields.current) ?? initialUrlStep.current ?? savedStep;
          if (startStep) setCurrentStep(startStep);
          setClampPending(!firstCorrectionStep(flaggedFields.current));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void init();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per account; see accountKey
  }, [accountKey, isLoading]);

  // Signup details that arrive after the load (e.g. the phone from /users/me) still fill
  // the empty fields; nothing typed and nothing flagged for correction is touched.
  useEffect(() => {
    if (loading || !user) return;
    setData((prev) => (prev.applicationId ? prev : prefillNgoFormWithUser(prev, user, flaggedFields.current)));
  }, [loading, user, user?.phone, user?.fullName, user?.email]);

  // Keep the URL in sync with the current step.
  useEffect(() => {
    if (loading || data.applicationId || currentStep === "submitted") return;
    if (typeof window !== "undefined") {
      const currentSearch = new URLSearchParams(window.location.search);
      if (currentSearch.get("step") !== currentStep) {
        window.history.replaceState(null, "", `?step=${currentStep}`);
      }
    }
  }, [currentStep, loading, data.applicationId]);

  /**
   * Puts the server's per-file refusals (UPLOAD_NOT_READY field errors) on the files
   * themselves, so each upload card shows which one to re-upload. Returns the messages.
   */
  function markRejectedFiles(err: unknown): string[] {
    const body = err instanceof ApiError ? (err.data as { fieldErrors?: { field?: string; message?: string }[] } | undefined) : undefined;
    const rejected = (body?.fieldErrors ?? []).filter(f => f?.field && f?.message);
    if (rejected.length === 0) return [];
    const mark = (file: UploadedFile | null, message: string) => (file ? { ...file, rejectedReason: message } : file);
    const patch: Partial<NGOFormState> = {};
    const documents = { ...data.documents };
    const activityPhotos = [...data.activityPhotos];
    for (const { field, message } of rejected) {
      const rep = /^representatives\.(\d)\.idProof$/.exec(field!);
      if (rep) {
        const i = Number(rep[1]);
        const reps = [...(patch.representatives ?? data.representatives)];
        if (reps[i]) reps[i] = { ...reps[i], idProof: mark(reps[i].idProof, message!) };
        patch.representatives = reps;
      } else if (field!.startsWith("documents.")) documents[field!.slice(10)] = mark(documents[field!.slice(10)] ?? null, message!);
      else if (field === "authorizationLetter") patch.authorizationLetter = mark(data.authorizationLetter, message!);
      else if (field === "logo") patch.logo = mark(data.logo, message!);
      else if (field === "officePhoto") patch.officePhoto = mark(data.officePhoto, message!);
      else if (field!.startsWith("activityPhotos.")) {
        const i = Number(field!.slice(15));
        if (Number.isInteger(i) && i >= 0 && i < activityPhotos.length) activityPhotos[i] = mark(activityPhotos[i], message!);
      }
    }
    updateData({ ...patch, documents, activityPhotos });
    return rejected.map(f => f.message!);
  }

  function updateData(patch: Partial<NGOFormState>) {
    setData((prev) => {
      const next = { ...prev, ...patch };
      // Sync local demo draft
      if (IS_NGO_DEMO_MODE && typeof window !== "undefined") {
        try {
          localStorage.setItem(
            `ngo-demo-draft-${userIdentifier}`,
            JSON.stringify({ ...next, currentStep })
          );
        } catch {
          // ignore
        }
      }
      return next;
    });
  }

  // Save draft to backend or localStorage
  async function handleSaveDraft() {
    setBusy(true);
    try {
      if (IS_NGO_DEMO_MODE) {
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `ngo-demo-draft-${userIdentifier}`,
            JSON.stringify({ ...data, currentStep })
          );
        }
        toast.success("Progress saved locally (Demo Mode)");
      } else {
        await saveNgoDraft(buildDraftPayload(data, currentStep));
        toast.success("Registration draft saved");
      }
    } catch (e) {
      const rejected = markRejectedFiles(e);
      toast.error(rejected.length ? rejected.join(" · ") : e instanceof Error ? e.message : "Failed to save draft");
    } finally {
      setBusy(false);
    }
  }

  /** Index of the first step not yet complete: the furthest the wizard may move forward. */
  function firstOpenStepIndex(): number {
    const done = calculateNgoProgress(data).completedSteps;
    const i = NGO_STEPS.findIndex(s => !done.has(s));
    return i < 0 ? NGO_STEPS.length - 1 : i;
  }

  function goToStep(step: NGOStep) {
    if (data.applicationId && step !== "email-verification") return;
    if (currentStep === "submitted") return;
    // Only the in-form Continue (enabled when the step is valid) moves forward: no skipping
    // ahead from the step list, ?step= or anything else past an incomplete step.
    const target = NGO_STEPS.indexOf(step);
    // A correction round (flagged items) may move between the steps to fix them.
    const correcting = flaggedFields.current.length > 0 || resubmitting;
    if (!correcting && target > NGO_STEPS.indexOf(currentStep as NGOStep) && target > firstOpenStepIndex()) {
      toast.error("Complete this step before moving on");
      return;
    }
    setCurrentStep(step);
    // Auto-save draft in the background so active uploads are never orphaned
    if (!IS_NGO_DEMO_MODE && !data.applicationId) {
      try {
        const res = saveNgoDraft(buildDraftPayload(data, step));
        if (res && typeof res.catch === "function") {
          void res.catch(() => {});
        }
      } catch {
        // ignore draft auto-save error
      }
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleNextSection() {
    const currentIndex = NGO_STEPS.indexOf(currentStep as NGOStep);
    if (currentStep === "review-submit") return;
    if (currentIndex >= 0 && currentIndex < NGO_STEPS.length - 1) {
      goToStep(NGO_STEPS[currentIndex + 1]);
    }
  }

  function handlePreviousSection() {
    const currentIndex = NGO_STEPS.indexOf(currentStep as NGOStep);
    if (currentIndex > 0) {
      goToStep(NGO_STEPS[currentIndex - 1]);
    }
  }

  // Step 5 Submit Application
  async function handleSubmitApplication() {
    setBusy(true);
    setSubmitError(null);

    if (IS_NGO_DEMO_MODE) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const demoAppId = `CK-NGO-DEMO-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        const subTime = formatSubmissionTime(new Date());
        updateData({
          applicationId: demoAppId,
          submittedAt: subTime,
          officialEmail: buildSubmitPayload(data).officialEmail,
        });
        setAwaitingVerification("fresh");
        goToStep("email-verification");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (resubmitting) {
      if (unfixed.length > 0) { setBusy(false); return; }
      try {
        const response = await submitNgoApplication(buildSubmitPayload(data));
        if (response?.status === "PENDING_VERIFICATION") {
          // The official email changed: the server sent a code to confirm it.
          updateData({ applicationId: response.applicationId, submittedAt: formatSubmissionTime(new Date()) });
          setApplicationStatus("PENDING_VERIFICATION");
          setAwaitingVerification("fresh");
          setCorrectionItems([]);
          flaggedFields.current = [];
          goToStep("email-verification");
          return;
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("ngo-application-submitted", {
            detail: { applicationId: response?.applicationId ?? data.applicationId, status: "UNDER_REVIEW" },
          }));
        }
        toast.success("Changes sent. Your application is under review again.");
        router.push("/profile");
      } catch (err) {
        const rejected = markRejectedFiles(err);
        const msg = rejected.length ? rejected.join(" · ")
          : err instanceof Error ? err.message : "Resubmission failed. Please try again.";
        setSubmitError(msg);
        toast.error(msg);
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      const response = await submitNgoApplication(buildSubmitPayload(data));

      const subTime = formatSubmissionTime(new Date());
      updateData({
        applicationId: response.applicationId,
        submittedAt: subTime,
        officialEmail: data.officialEmail,
      });

      setApplicationStatus("PENDING_VERIFICATION");
      setAwaitingVerification("fresh");
      setReviewMessage("");
      setCorrectionItems([]);
      flaggedFields.current = [];
      goToStep("email-verification");
    } catch (err) {
      const rejected = markRejectedFiles(err);
      const msg = rejected.length ? rejected.join(" · ")
        : err instanceof Error ? err.message : "Submission failed. Please try again.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  // Step 6 OTP verified -> Finish & return to /profile
  function handleVerifiedOtp() {
    if (typeof window !== "undefined" && data.applicationId) {
      try {
        const payload = JSON.stringify({
          applicationId: data.applicationId,
          status: "UNDER_REVIEW",
          submittedAt: data.submittedAt || formatSubmissionTime(new Date()),
        });
        if (IS_NGO_DEMO_MODE) {
          localStorage.setItem(`ngo-demo-application-${userIdentifier}`, payload);
        } else {
          localStorage.setItem(`ngo-application-${userIdentifier}`, payload);
        }
        localStorage.removeItem(`ngo-demo-draft-${userIdentifier}`);

        // Notify Navbar and mounted listeners immediately
        window.dispatchEvent(
          new CustomEvent("ngo-application-submitted", {
            detail: {
              applicationId: data.applicationId,
              status: "UNDER_REVIEW",
            },
          })
        );
      } catch {
        // ignore
      }
    }

    toast.success("Application submitted successfully! Redirecting to profile…");
    router.push("/profile");
  }


  // A ?step= link or a saved draft can't open past the first incomplete step.
  useEffect(() => {
    if (loading || !clampPending) return;
    setClampPending(false);
    if (data.applicationId || flaggedFields.current.length > 0 || resubmitting) return;
    const i = NGO_STEPS.indexOf(currentStep as NGOStep);
    const open = firstOpenStepIndex();
    if (i > open) setCurrentStep(NGO_STEPS[open]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, after the draft loads
  }, [loading, clampPending]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] dark:bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ngo-700" />
      </div>
    );
  }

  if (restoreError) return (
    <main className="mx-auto max-w-xl space-y-4 p-8">
      <h1 className="text-xl font-bold">Let’s restore your application</h1>
      <p role="alert">{restoreError}</p>
      <button type="button" className="rounded-lg border px-4 py-2" onClick={() => window.location.reload()}>Try again</button>
      <Link href="/profile" className="ml-4 underline">Back to profile</Link>
    </main>
  );

  const progress = calculateNgoProgress(data);
  const remaining = Math.max(0, 6 - progress.completedCount);
  const stillNeeded = currentStep !== "submitted" ? [
    ...unfixed.filter((i) => correctionFieldStep(i.field) === currentStep).map((i) => `Fix: ${correctionFieldLabel(i.field)}`),
    ...getNgoStillNeededItems(currentStep, data),
  ] : [];

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-zinc-950">
      <div className="flex">
        {/* ── Left Sidebar (Desktop) ─────────────────────────────────── */}
        <aside className="sticky top-0 hidden h-screen w-[300px] shrink-0 flex-col border-r border-[#EADBCE] bg-[#FAF7F2] lg:flex dark:border-emerald-950/80 dark:bg-[#141E18]">
          <div className="flex flex-col gap-4 border-b border-[#EADBCE] px-7 pb-6 pt-8 dark:border-emerald-950/80">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 text-sm font-semibold text-ngo-700 hover:text-ngo-600 dark:text-ngo-300 dark:hover:text-ngo-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to profile
            </Link>
            <div>
              <p className="text-3xs font-black uppercase tracking-[0.22em] text-stone-400">
                NGO Registration
              </p>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-stone-900 dark:text-stone-100">
                Your readiness
              </h1>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-4xl font-black leading-none tabular-nums text-ngo-700 dark:text-ngo-300">
                {currentStep === "submitted" || currentStep === "email-verification" ? "100%" : `${progress.percent}%`}
              </span>
              <span className="text-xs font-semibold text-stone-500">
                {currentStep === "submitted" ? 6 : currentStep === "email-verification" ? 5 : progress.completedCount} of 6 done
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-ngo-700 transition-[width] duration-500"
                style={{ width: `${currentStep === "submitted" || currentStep === "email-verification" ? 100 : progress.percent}%` }}
              />
            </div>
            <p className="text-xs leading-relaxed text-stone-500">
              {currentStep === "submitted"
                ? (applicationStatus === "APPROVED" ? "Your organization’s application is approved." : "Your application is submitted and under review.")
                : awaitingVerification
                  ? "Submitted. Enter the email code to finish."
                  : remaining === 0
                    ? "All steps completed. Ready to submit."
                    : `${remaining} ${remaining === 1 ? "step" : "steps"} left before you can submit.`}
            </p>
          </div>

          {/* Vertical Step Navigation */}
          <nav className="flex flex-col gap-1 overflow-y-auto px-4 py-5 flex-1">
            {NGO_STEPS.map((stepKey, index) => {
              const isCurrent = currentStep === stepKey;
              const isCompleted = progress.completedSteps.has(stepKey);
              return (
                <button
                  key={stepKey}
                  type="button"
                  onClick={() => goToStep(stepKey)}
                  disabled={stepKey === "email-verification" || (!!awaitingVerification && !isCurrent)}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isCurrent
                      ? "bg-ngo-50 font-bold text-ngo-700 dark:bg-ngo-900/30 dark:text-ngo-300"
                      : "font-semibold text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-zinc-800/60"
                    }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-2xs font-black ${isCurrent
                        ? "bg-ngo-700 text-white"
                        : isCompleted
                          ? "bg-emerald-600 text-white"
                          : "border border-stone-300 text-stone-400 dark:border-zinc-600"
                      }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : index + 1}
                  </span>
                  <span className="truncate">{NGO_STEP_FULL_TITLES[stepKey]}</span>
                  {flaggedSteps.has(stepKey) && (toFixInStep(stepKey) > 0 ? (
                    <span data-testid={`to-fix-${stepKey}`} className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-3xs font-black text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                      {toFixInStep(stepKey)} to fix
                    </span>
                  ) : (
                    <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-3xs font-black text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">Updated</span>
                  ))}
                </button>
              );
            })}
          </nav>

          {/* Still Needed Checklist for Active Step */}
          {currentStep !== "submitted" && (
            <div className="border-t border-[#EADBCE] px-7 py-5 dark:border-emerald-950/80">
              <p className="text-3xs font-black uppercase tracking-[0.18em] text-stone-400">
                Still needed in this step
              </p>
              {stillNeeded.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                  {stillNeeded.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ngo-700" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  All requirements in this step met
                </p>
              )}
            </div>
          )}
        </aside>

        {/* ── Working Pane ───────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile Compact Top Bar (lg:hidden) */}
          <div className="border-b border-[#EADBCE] bg-[#FAF7F2] px-4 py-2.5 lg:hidden dark:border-emerald-950/80 dark:bg-[#141E18]">
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/profile"
                className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-ngo-700 dark:text-ngo-300 hover:text-ngo-800"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Profile</span>
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  {currentStep === "submitted"
                    ? "Submitted"
                    : `Step ${NGO_STEPS.indexOf(currentStep as NGOStep) + 1} of 6`}
                </span>
                <span className="rounded-full bg-ngo-50 dark:bg-ngo-950/50 border border-ngo-200 dark:border-ngo-800 px-2 py-0.5 text-xs font-black tabular-nums text-ngo-700 dark:text-ngo-300">
                  {currentStep === "submitted" ? 100 : progress.percent}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200/80 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-ngo-700 transition-[width] duration-500"
                style={{ width: `${currentStep === "submitted" ? 100 : progress.percent}%` }}
              />
            </div>

            {/* Horizontal step indicator / pills */}
            {currentStep !== "submitted" && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {NGO_STEPS.map((stepKey, index) => {
                  const isCurrent = currentStep === stepKey;
                  const isCompleted = progress.completedSteps.has(stepKey);
                  return (
                    <button
                      key={stepKey}
                      type="button"
                      onClick={() => goToStep(stepKey)}
                      disabled={stepKey === "email-verification" || (!!awaitingVerification && !isCurrent)}
                      className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-full px-3 text-2xs font-bold transition-colors flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                        isCurrent
                          ? "bg-ngo-700 text-white shadow-sm"
                          : isCompleted
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                          : "border border-[#EADBCE] dark:border-zinc-700 text-stone-600 dark:text-stone-300 bg-white dark:bg-zinc-800/50"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <span>{index + 1}.</span>}
                      <span>{NGO_STEP_FULL_TITLES[stepKey]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Content Area */}
          <div className="flex flex-1 flex-col">
            <div className="flex-1 px-4 py-6 sm:px-10 pb-28 sm:pb-24">
              <div className="max-w-3xl">
                {/* Collapsible Still Needed in this step on mobile */}
                {currentStep !== "submitted" && stillNeeded.length > 0 && (
                  <details className="mb-5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-xs lg:hidden">
                    <summary className="cursor-pointer font-bold text-amber-900 dark:text-amber-200 flex items-center justify-between select-none">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Still needed in this step ({stillNeeded.length})
                      </span>
                      <span className="text-3xs text-stone-400 font-semibold underline underline-offset-2">Toggle</span>
                    </summary>
                    <ul className="mt-2.5 space-y-1 pl-4 list-disc text-stone-700 dark:text-stone-300">
                      {stillNeeded.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </details>
                )}
                {reviewMessage && <div role="status" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 whitespace-pre-wrap">{reviewMessage}</div>}
                {correctionItems.length > 0 && currentStep !== "submitted" && !awaitingVerification && (
                  <div role="status" aria-label="Changes requested" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-100">
                    <p className="text-base font-black">Our team asked for changes</p>
                    {overallNote && <p data-testid="overall-note" className="mt-1 whitespace-pre-wrap">{overallNote}</p>}
                    <p className="mt-2 font-bold">
                      Our team asked you to fix {correctionItems.length === 1 ? "1 item" : `${correctionItems.length} items`}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {correctionItems.map((item) => (
                        <li key={item.field}>
                          <button
                            type="button"
                            className="font-semibold underline underline-offset-2"
                            onClick={() => goToStep(correctionFieldStep(item.field))}
                          >
                            {correctionFieldLabel(item.field)}
                          </button>
                          {": "}{item.note}
                          {changedFields.has(item.field) && <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-3xs font-black text-emerald-800">Updated</span>}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs">Everything else is filled in from your last application. Fix these items, then submit again.</p>
                  </div>
                )}
                {submitError && (
                  <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    {submitError}
                  </div>
                )}

                {currentStep === "submitted" ? (
                  <div className="rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] p-5 sm:p-8 dark:border-emerald-950/80 dark:bg-[#141E18]">
                    <div className="flex items-center gap-3 border-b border-[#EADBCE] pb-5 dark:border-emerald-950/80">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-ngo-800 to-ngo-600 flex items-center justify-center text-white shadow-md shadow-ngo-700/20">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                          {applicationStatus === "APPROVED" ? "Application approved" : "Application submitted"}
                        </h2>
                        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                          {applicationStatus === "APPROVED" ? "Thank you. Your organization’s registration has been approved." : "Thank you. Your registration is with our team for review."}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-4">
                      <Link
                        href="/profile"
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-ngo-700 hover:bg-ngo-600 px-6 py-3 text-xs font-bold text-white transition-colors shadow-sm"
                      >
                        Return to Profile
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <CorrectionStatusContext.Provider value={resubmitting ? changedFields : null}>
                  {resubmitting && (
                    // Amber border on every input that sits next to a reviewer's note (until it is changed).
                    <style>{`.ck-resubmit div:has(> [data-testid="correction-note"]:not([data-updated])) :is(input:not([type=checkbox]):not([type=radio]),textarea,select){border-color:#f59e0b !important;box-shadow:0 0 0 1px #f59e0b}`}</style>
                  )}
                  <div className={`${resubmitting ? "ck-resubmit " : ""}rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] p-5 sm:p-8 dark:border-emerald-950/80 dark:bg-[#141E18] shadow-sm`}>
                    {currentStep === "org-details" && (
                      <OrgDetails
                        data={data}
                        corrections={corrections}
                        onChange={updateData}
                        onBack={() => router.push("/profile")}
                        onContinue={handleNextSection}
                      />
                    )}

                    {currentStep === "legal-documents" && (
                      <LegalDocuments
                        data={data}
                        corrections={corrections}
                        onChange={updateData}
                        onBack={handlePreviousSection}
                        onContinue={handleNextSection}
                      />
                    )}

                    {currentStep === "authorized-rep" && (
                      <AuthorizedRepresentative
                        data={data}
                        corrections={corrections}
                        onChange={updateData}
                        onBack={handlePreviousSection}
                        onContinue={handleNextSection}
                      />
                    )}

                    {currentStep === "org-photos" && (
                      <OrgPhotos
                        data={data}
                        corrections={corrections}
                        onChange={updateData}
                        onBack={handlePreviousSection}
                        onContinue={handleNextSection}
                      />
                    )}

                    {currentStep === "review-submit" && (
                      <ReviewSubmit
                        data={data}
                        onChange={updateData}
                        onBack={handlePreviousSection}
                        onSubmit={handleSubmitApplication}
                        onEditStep={(s) => goToStep(s)}
                        isSubmitting={busy}
                        submitError={submitError}
                        resubmission={resubmitting ? {
                          changes: correctionItems.filter((i) => changedFields.has(i.field)).map((i) => ({
                            key: i.field, label: correctionFieldLabel(i.field), value: correctionDisplayValue(data, i.field),
                          })),
                          remaining: unfixed.length,
                        } : null}
                      />
                    )}

                    {currentStep === "email-verification" && (
                      <EmailVerification
                        data={data}
                        onChange={updateData}
                        onBack={awaitingVerification ? undefined : handlePreviousSection}
                        onVerified={handleVerifiedOtp}
                        resumed={awaitingVerification === "restored"}
                      />
                    )}
                  </div>
                  </CorrectionStatusContext.Provider>
                )}
              </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            {currentStep !== "submitted" && currentStep !== "email-verification" && (
              <div className="sticky bottom-0 z-20 border-t border-[#EADBCE] bg-[#FAF7F2]/95 backdrop-blur-sm px-4 py-3 sm:px-10 dark:border-emerald-950/80 dark:bg-[#141E18]/95 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                <div className="flex max-w-3xl flex-wrap items-center justify-between gap-2.5">
                  <p className="text-xs sm:text-sm font-semibold text-stone-500 dark:text-stone-400">
                    Step {NGO_STEPS.indexOf(currentStep as NGOStep) + 1} of 6:{" "}
                    <span className="text-stone-900 dark:text-stone-100 font-bold">
                      {NGO_STEP_FULL_TITLES[currentStep as NGOStep]}
                    </span>
                  </p>
                  {/* Not rendered (rather than hidden) once submitted, so neither action is reachable by keyboard either. */}
                  {!awaitingVerification && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleSaveDraft}
                        className="min-h-[44px] rounded-xl border border-stone-300 dark:border-zinc-700 px-3.5 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                      >
                        {busy ? "Saving…" : "Save draft"}
                      </button>
                      {NGO_STEPS.indexOf(currentStep as NGOStep) > 0 && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={handlePreviousSection}
                          className="min-h-[44px] rounded-xl border border-stone-300 dark:border-zinc-700 px-3.5 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                        >
                          Previous
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}