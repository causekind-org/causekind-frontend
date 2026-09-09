"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  INITIAL_NGO_FORM,
  IS_NGO_DEMO_MODE,
  formatSubmissionTime,
  type NGOFormState,
  type NGOStep,
  type UploadedFile,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { NGOProgress } from "@/features/ngo-registration/components/NGOProgress";
import { OrgDetails } from "@/features/ngo-registration/steps/OrgDetails";
import { LegalDocuments } from "@/features/ngo-registration/steps/LegalDocuments";
import { AuthorizedRepresentative } from "@/features/ngo-registration/steps/AuthorizedRepresentative";
import { OrgPhotos } from "@/features/ngo-registration/steps/OrgPhotos";
import { ReviewSubmit } from "@/features/ngo-registration/steps/ReviewSubmit";
import { EmailVerification } from "@/features/ngo-registration/steps/EmailVerification";
import { ApplicationSubmitted } from "@/features/ngo-registration/steps/ApplicationSubmitted";
import { submitNgoApplication } from "@/lib/api";

interface NGORegistrationProps {
  onCancelToDonor?: () => void;
}

export function NGORegistration({ onCancelToDonor }: NGORegistrationProps) {
  const [data, setData] = useState<NGOFormState>(INITIAL_NGO_FORM);
  const [currentStep, setCurrentStep] = useState<NGOStep | "submitted">("org-details");
  const [completedSteps, setCompletedSteps] = useState<Set<NGOStep>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reduced = !!useReducedMotion();

  function updateData(patch: Partial<NGOFormState>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function markStepComplete(step: NGOStep) {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
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
    markStepComplete("org-details");
    goToStep("legal-documents");
  }

  // Step 2 -> 3
  function handleContinueFromLegalDocs() {
    markStepComplete("legal-documents");
    goToStep("authorized-rep");
  }

  // Step 3 -> 4
  function handleContinueFromAuthorizedRep() {
    markStepComplete("authorized-rep");
    goToStep("org-photos");
  }

  // Step 4 -> 5
  function handleContinueFromOrgPhotos() {
    markStepComplete("org-photos");
    goToStep("review-submit");
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
        });
        markStepComplete("review-submit");
        goToStep("email-verification");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      // Build the UploadedFileDto shape the backend expects for each file.
      // Propagates real backend documentId / photoId and S3 metadata when uploaded.
      function toDto(file: UploadedFile | null) {
        if (!file) return null;
        return {
          documentId: file.documentId ?? null,
          photoId: file.photoId ?? null,
          name: file.name,
          key: file.s3Key ?? null,
          url: file.s3Url ?? null,
          size: file.size ?? null,
          mimeType: file.mimeType ?? null,
          demo: file.demo ?? false,
        };
      }

      // Convert documents map (Record<string, UploadedFile | null>)
      const documentsDto: Record<
        string,
        ReturnType<typeof toDto>
      > = {};
      for (const [id, file] of Object.entries(data.documents)) {
        documentsDto[id] = toDto(file);
      }

      const response = await submitNgoApplication({
        organizationName: data.organizationName,
        legalStructure: data.legalStructure,
        registrationNumber: data.registrationNumber,
        registeredOfficeAddress: data.registeredOfficeAddress,
        yearOfEstablishment: data.yearOfEstablishment,
        representativeName: data.representativeName,
        designation: data.designation,
        mobileNumber: data.mobileNumber,
        officialEmail: data.officialEmail,
        confirmationChecked: data.confirmationChecked,
        authorizationLetter: toDto(data.authorizationLetter),
        documents: documentsDto,
        logo: toDto(data.logo),
        officePhoto: toDto(data.officePhoto),
        activityPhotos: data.activityPhotos.map(toDto),
      });

      // Store the canonical backend-issued applicationId and the submission time.
      // The local `generateApplicationId()` placeholder is intentionally NOT used here.
      const subTime = formatSubmissionTime(new Date());
      updateData({
        applicationId: response.applicationId,
        submittedAt: subTime,
      });

      markStepComplete("review-submit");
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
    markStepComplete("email-verification");
    if (typeof window !== "undefined" && data.applicationId) {
      try {
        localStorage.setItem("ck_ngo_application_id", data.applicationId);
        localStorage.setItem("ck_ngo_status", "UNDER_REVIEW");
        localStorage.setItem("ck_ngo_submitted_at", data.submittedAt || new Date().toLocaleDateString());
      } catch {
        // ignore
      }
    }
    goToStep("submitted");
  }

  function handleReset() {
    setData(INITIAL_NGO_FORM);
    setCompletedSteps(new Set());
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
              onBack={() => goToStep("review-submit")}
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
