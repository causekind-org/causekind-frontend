"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  INITIAL_NGO_FORM,
  IS_NGO_DEMO_MODE,
  NGO_STEPS,
  formatSubmissionTime,
  prefillNgoFormWithUser,
  type NGOFormState,
  type NGOStep,
  calculateNgoProgress,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { NGOProgress } from "@/features/ngo-registration/components/NGOProgress";
import { OrgDetails } from "@/features/ngo-registration/steps/OrgDetails";
import { LegalDocuments } from "@/features/ngo-registration/steps/LegalDocuments";
import { AuthorizedRepresentative } from "@/features/ngo-registration/steps/AuthorizedRepresentative";
import { OrgPhotos } from "@/features/ngo-registration/steps/OrgPhotos";
import { ReviewSubmit } from "@/features/ngo-registration/steps/ReviewSubmit";
import { EmailVerification } from "@/features/ngo-registration/steps/EmailVerification";
import { ApplicationSubmitted } from "@/features/ngo-registration/steps/ApplicationSubmitted";
import { submitNgoApplication, getMyNgoApplication, getNgoDraft, saveNgoDraft } from "@/lib/api";
import { applyDraft, buildDraftPayload, buildSubmitPayload } from "@/features/ngo-registration/ngoWizardPayload";
import { useAuth } from "@/hooks/useAuth";

export interface NGOProgressInfo {
  completedCount: number;
  totalSteps: number;
  percent: number;
  currentStep: NGOStep | "submitted";
}

interface NGORegistrationProps {
  onCancelToDonor?: () => void;
  onProgressChange?: (info: NGOProgressInfo) => void;
}

export function NGORegistration({ onCancelToDonor, onProgressChange }: NGORegistrationProps) {
  const { user } = useAuth();
  const [data, setData] = useState<NGOFormState>(INITIAL_NGO_FORM);
  const [currentStep, setCurrentStep] = useState<NGOStep | "submitted">("org-details");
  // True when the OTP step was restored for an application submitted before a reload.
  const [resumedVerification, setResumedVerification] = useState(false);
  const { completedSteps } = calculateNgoProgress(data);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reduced = !!useReducedMotion();

  const userIdentifier =
    user?.id ?? user?.userId ?? (user?.email ? user.email.toLowerCase().replace(/[^a-z0-9]/g, "_") : "anonymous");

  const onProgressChangeRef = useRef(onProgressChange);
  useEffect(() => {
    onProgressChangeRef.current = onProgressChange;
  }, [onProgressChange]);

  // Report progress to parent whenever completedSteps or currentStep updates
  useEffect(() => {
    const totalSteps = NGO_STEPS.length;
    const count = currentStep === "submitted" ? totalSteps : completedSteps.size;
    const percent = Math.min(100, Math.round((count / totalSteps) * 100));
    onProgressChangeRef.current?.({
      completedCount: count,
      totalSteps,
      percent,
      currentStep,
    });
  }, [completedSteps, currentStep]);

  // Load draft on mount (Real backend draft or account-scoped demo localStorage draft)
  useEffect(() => {
    let cancelled = false;

    if (IS_NGO_DEMO_MODE) {
      if (typeof window === "undefined") return;
      try {
        const saved = localStorage.getItem(`ngo-demo-draft-${userIdentifier}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            setData((prev) => ({ ...prev, ...parsed }));
            const savedStep = parsed.currentStep as string;
            if (savedStep && (NGO_STEPS as readonly string[]).includes(savedStep)) {
              const typedStep = savedStep as NGOStep;
              setCurrentStep(typedStep);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load demo draft:", err);
      }
      return;
    }

    if (!user) return;
    getMyNgoApplication()
      .then((application) => {
        if (cancelled) return null;
        if (application && ["PENDING_VERIFICATION", "UNDER_REVIEW", "APPROVED"].includes(application.status)) {
          setData((prev) => ({
            ...prev,
            applicationId: application.applicationId,
            organizationName: application.organizationName || prev.organizationName,
            submittedAt: application.submittedAt || "",
            officialEmail: user.email || prev.officialEmail,
          }));
          if (application.status === "APPROVED") {
            window.location.replace("/profile/ngo-details");
            return null;
          }
          if (application.status === "PENDING_VERIFICATION") setResumedVerification(true);
          setCurrentStep(application.status === "PENDING_VERIFICATION" ? "email-verification" : "submitted");
          return null;
        }
        if (application?.status === "REJECTED" || application?.status === "NEEDS_INFORMATION") {
          setData(INITIAL_NGO_FORM);
          setReviewMessage(`${application.needsInformationDetails || application.rejectionReason || "Please review your details."} Your details have been restored. Upload fresh evidence for this submission; your earlier application remains on record.`);
        }
        return getNgoDraft();
      })
      .then((draft) => {
        if (cancelled) return;
        if (!draft) {
          setData((prev) => prefillNgoFormWithUser(prev, user));
          return;
        }

        setData((prev) => prefillNgoFormWithUser(applyDraft(prev, draft), user));

        const savedStep = draft.currentStep as string;
        if (savedStep && (NGO_STEPS as readonly string[]).includes(savedStep)) {
          const typedStep = savedStep as NGOStep;
          setCurrentStep(typedStep);
        }
      })
      .catch((err) => {
        console.warn("No active NGO draft found or error retrieving draft:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [user, userIdentifier]);

  async function saveDraftProgress(targetStep: NGOStep, updatedForm: NGOFormState) {
    if (IS_NGO_DEMO_MODE) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            `ngo-demo-draft-${userIdentifier}`,
            JSON.stringify({
              ...updatedForm,
              currentStep: targetStep,
            })
          );
        } catch {
          // ignore
        }
      }
      return;
    }

    if (!user) return;

    try {
      await saveNgoDraft(buildDraftPayload(updatedForm, targetStep));
    } catch (err) {
      console.warn("Failed to persist NGO draft:", err);
    }
  }

  function updateData(patch: Partial<NGOFormState>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function goToStep(step: NGOStep | "submitted") {
    setCurrentStep(step);
    // Scroll smoothly to top of card when step changes
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    }
  }

  // Step 1 -> 2
  function handleContinueFromOrgDetails() {
    goToStep("legal-documents");
    saveDraftProgress("legal-documents", data);
  }

  // Step 2 -> 3
  function handleContinueFromLegalDocs() {
    goToStep("authorized-rep");
    saveDraftProgress("authorized-rep", data);
  }

  // Step 3 -> 4
  function handleContinueFromAuthorizedRep() {
    goToStep("org-photos");
    saveDraftProgress("org-photos", data);
  }

  // Step 4 -> 5
  function handleContinueFromOrgPhotos() {
    goToStep("review-submit");
    saveDraftProgress("review-submit", data);
  }

  // Step 5 -> 6: call the real backend /submit endpoint (or simulate in demo mode)
  async function handleSubmitReview() {
    setSubmitError(null);
    setIsSubmitting(true);

    // DEMO MODE ONLY: Skip real backend /submit call when demo mode is active.
    // Simulates a realistic response and proceeds to Step 6 without backend persistence.
    if (IS_NGO_DEMO_MODE) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const demoAppId = `CK-NGO-DEMO-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        const subTime = formatSubmissionTime(new Date());
        updateData({
          applicationId: demoAppId,
          submittedAt: subTime,
          officialEmail: user?.email || buildSubmitPayload(data).officialEmail,
        });
        goToStep("email-verification");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      const payload = buildSubmitPayload(data);
      const response = await submitNgoApplication(payload);

      // Store the canonical backend-issued applicationId and the submission time.
      // The local `generateApplicationId()` placeholder is intentionally NOT used here.
      const subTime = formatSubmissionTime(new Date());
      updateData({
        applicationId: response.applicationId,
        submittedAt: subTime,
        officialEmail: response.officialEmail || user?.email || payload.officialEmail,
      });

      goToStep("email-verification");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed. Please try again.";
      setSubmitError(msg);
      // Scroll into view so the error is visible without the user hunting for it
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 6 -> Success
  function handleVerifiedOtp() {
    if (typeof window !== "undefined" && data.applicationId) {
      try {
        const userIdentifier = user?.id ?? user?.userId ?? (user?.email ? user.email.toLowerCase().replace(/[^a-z0-9]/g, "_") : "anonymous");
        const payload = JSON.stringify({
          applicationId: data.applicationId,
          status: "UNDER_REVIEW",
          submittedAt: data.submittedAt || new Date().toLocaleDateString(),
        });
        if (IS_NGO_DEMO_MODE) {
          localStorage.setItem(`ngo-demo-application-${userIdentifier}`, payload);
        } else {
          localStorage.setItem(`ngo-application-${userIdentifier}`, payload);
        }
        // Purge legacy unscoped global keys so they never leak across accounts
        localStorage.removeItem("ck_ngo_application_id");
        localStorage.removeItem("ck_ngo_status");
        localStorage.removeItem("ck_ngo_submitted_at");
        localStorage.removeItem(`ngo-demo-draft-${userIdentifier}`);

        // Notify Navbar and other mounted listeners immediately
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
    goToStep("submitted");
  }

  function handleReset() {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`ngo-demo-draft-${userIdentifier}`);
      } catch {
        // ignore
      }
    }
    setData(INITIAL_NGO_FORM);
    setSubmitError(null);
    goToStep("org-details");
  }

  return (
    <div className="w-full space-y-6">
      {/* Step Progress Bar (hidden on final success screen) */}
      {currentStep !== "submitted" && (
        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <NGOProgress
            currentStep={currentStep}
            completedSteps={completedSteps}
            onJump={(s) => goToStep(s)}
          />
        </div>
      )}

      {/* Step Components with Smooth Transition */}
      {reviewMessage && <p role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 whitespace-pre-wrap">{reviewMessage}</p>}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="w-full"
        >
          {currentStep === "org-details" && (
            <OrgDetails
              data={data}
              onChange={updateData}
              onBack={() => {
                if (onCancelToDonor) onCancelToDonor();
              }}
              onContinue={handleContinueFromOrgDetails}
            />
          )}

          {currentStep === "legal-documents" && (
            <LegalDocuments
              data={data}
              onChange={updateData}
              onBack={() => goToStep("org-details")}
              onContinue={handleContinueFromLegalDocs}
            />
          )}

          {currentStep === "authorized-rep" && (
            <AuthorizedRepresentative
              data={data}
              onChange={updateData}
              onBack={() => goToStep("legal-documents")}
              onContinue={handleContinueFromAuthorizedRep}
            />
          )}

          {currentStep === "org-photos" && (
            <OrgPhotos
              data={data}
              onChange={updateData}
              onBack={() => goToStep("authorized-rep")}
              onContinue={handleContinueFromOrgPhotos}
            />
          )}

          {currentStep === "review-submit" && (
            <ReviewSubmit
              data={data}
              onChange={updateData}
              onBack={() => goToStep("org-photos")}
              onEditStep={(s) => goToStep(s)}
              onSubmit={handleSubmitReview}
              isSubmitting={isSubmitting}
              submitError={submitError}
            />
          )}

          {currentStep === "email-verification" && (
            <EmailVerification
              data={data}
              onChange={updateData}
              // Reopened after a reload: the application is already submitted (resubmitting
              // is refused as a duplicate), so offer Resend at once and no way back.
              onBack={resumedVerification ? undefined : () => goToStep("review-submit")}
              resumed={resumedVerification}
              onVerified={handleVerifiedOtp}
            />
          )}

          {currentStep === "submitted" && (
            <ApplicationSubmitted data={data} onReset={handleReset} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
