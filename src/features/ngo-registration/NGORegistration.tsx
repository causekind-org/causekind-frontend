"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  INITIAL_NGO_FORM,
  IS_NGO_DEMO_MODE,
  NGO_STEPS,
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
import { submitNgoApplication, getNgoDraft, saveNgoDraft, type UploadedFileDto } from "@/lib/api";
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

function toDto(file: UploadedFile | null): UploadedFileDto | null {
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

function fromDto(dto: UploadedFileDto | null | undefined): UploadedFile | null {
  if (!dto) return null;
  return {
    name: dto.name || "Uploaded document",
    documentId: dto.documentId ?? undefined,
    photoId: dto.photoId ?? undefined,
    s3Key: dto.key ?? undefined,
    s3Url: dto.url ?? undefined,
    size: dto.size ?? undefined,
    mimeType: dto.mimeType ?? undefined,
    demo: dto.demo ?? false,
  };
}

export function NGORegistration({ onCancelToDonor, onProgressChange }: NGORegistrationProps) {
  const { user } = useAuth();
  const [data, setData] = useState<NGOFormState>(INITIAL_NGO_FORM);
  const [currentStep, setCurrentStep] = useState<NGOStep | "submitted">("org-details");
  const [completedSteps, setCompletedSteps] = useState<Set<NGOStep>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
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
              const stepIdx = NGO_STEPS.indexOf(typedStep);
              if (stepIdx > 0) {
                const prevSteps = new Set<NGOStep>();
                for (let i = 0; i < stepIdx; i++) {
                  prevSteps.add(NGO_STEPS[i]);
                }
                setCompletedSteps(prevSteps);
              } else {
                setCompletedSteps(new Set());
              }
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load demo draft:", err);
      }
      return;
    }

    if (!user) return;

    getNgoDraft()
      .then((draft) => {
        if (cancelled || !draft) return;

        const restoredDocs: Record<string, UploadedFile | null> = {};
        if (draft.documents) {
          for (const [docKey, fileDto] of Object.entries(draft.documents)) {
            restoredDocs[docKey] = fromDto(fileDto);
          }
        }

        const restoredActivity: (UploadedFile | null)[] = [null, null, null];
        if (draft.activityPhotos && Array.isArray(draft.activityPhotos)) {
          draft.activityPhotos.forEach((photoDto, idx) => {
            if (idx < 3) {
              restoredActivity[idx] = fromDto(photoDto);
            }
          });
        }

        setData((prev) => ({
          ...prev,
          organizationName: draft.organizationName ?? prev.organizationName,
          legalStructure: (draft.legalStructure as any) ?? prev.legalStructure,
          registrationNumber: draft.registrationNumber ?? prev.registrationNumber,
          registeredOfficeAddress: draft.registeredOfficeAddress ?? prev.registeredOfficeAddress,
          yearOfEstablishment: draft.yearOfEstablishment ?? prev.yearOfEstablishment,
          representativeName: draft.representativeName ?? prev.representativeName,
          designation: draft.designation ?? prev.designation,
          mobileNumber: draft.mobileNumber ?? prev.mobileNumber,
          officialEmail: draft.officialEmail ?? prev.officialEmail,
          confirmationChecked: draft.confirmationChecked ?? prev.confirmationChecked,
          authorizationLetter: draft.authorizationLetter ? fromDto(draft.authorizationLetter) : prev.authorizationLetter,
          documents: Object.keys(restoredDocs).length > 0 ? restoredDocs : prev.documents,
          logo: draft.logo ? fromDto(draft.logo) : prev.logo,
          officePhoto: draft.officePhoto ? fromDto(draft.officePhoto) : prev.officePhoto,
          activityPhotos: restoredActivity,
        }));

        const savedStep = draft.currentStep as string;
        if (savedStep && (NGO_STEPS as readonly string[]).includes(savedStep)) {
          const typedStep = savedStep as NGOStep;
          setCurrentStep(typedStep);
          const stepIdx = NGO_STEPS.indexOf(typedStep);
          if (stepIdx > 0) {
            const prevSteps = new Set<NGOStep>();
            for (let i = 0; i < stepIdx; i++) {
              prevSteps.add(NGO_STEPS[i]);
            }
            setCompletedSteps(prevSteps);
          } else {
            setCompletedSteps(new Set());
          }
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
      const documentsDto: Record<string, UploadedFileDto | null> = {};
      for (const [id, file] of Object.entries(updatedForm.documents)) {
        documentsDto[id] = toDto(file);
      }

      await saveNgoDraft({
        currentStep: targetStep,
        organizationName: updatedForm.organizationName,
        legalStructure: updatedForm.legalStructure,
        registrationNumber: updatedForm.registrationNumber,
        registeredOfficeAddress: updatedForm.registeredOfficeAddress,
        yearOfEstablishment: updatedForm.yearOfEstablishment,
        representativeName: updatedForm.representativeName,
        designation: updatedForm.designation,
        mobileNumber: updatedForm.mobileNumber,
        officialEmail: updatedForm.officialEmail,
        confirmationChecked: updatedForm.confirmationChecked,
        authorizationLetter: toDto(updatedForm.authorizationLetter),
        documents: documentsDto,
        logo: toDto(updatedForm.logo),
        officePhoto: toDto(updatedForm.officePhoto),
        activityPhotos: updatedForm.activityPhotos.map(toDto),
      });
    } catch (err) {
      console.warn("Failed to persist NGO draft:", err);
    }
  }

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
    saveDraftProgress("legal-documents", data);
  }

  // Step 2 -> 3
  function handleContinueFromLegalDocs() {
    markStepComplete("legal-documents");
    goToStep("authorized-rep");
    saveDraftProgress("authorized-rep", data);
  }

  // Step 3 -> 4
  function handleContinueFromAuthorizedRep() {
    markStepComplete("authorized-rep");
    goToStep("org-photos");
    saveDraftProgress("org-photos", data);
  }

  // Step 4 -> 5
  function handleContinueFromOrgPhotos() {
    markStepComplete("org-photos");
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
        });
        markStepComplete("review-submit");
        goToStep("email-verification");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
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
