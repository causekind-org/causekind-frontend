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
  type NGOFormState,
  type NGOStep,
  type UploadedFile,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { OrgDetails } from "@/features/ngo-registration/steps/OrgDetails";
import { LegalDocuments } from "@/features/ngo-registration/steps/LegalDocuments";
import { AuthorizedRepresentative } from "@/features/ngo-registration/steps/AuthorizedRepresentative";
import { OrgPhotos } from "@/features/ngo-registration/steps/OrgPhotos";
import { ReviewSubmit } from "@/features/ngo-registration/steps/ReviewSubmit";
import { EmailVerification } from "@/features/ngo-registration/steps/EmailVerification";
import { ApplicationSubmitted } from "@/features/ngo-registration/steps/ApplicationSubmitted";
import {
  submitNgoApplication,
  getNgoDraft,
  saveNgoDraft,
  getMyNgoApplication,
  type UploadedFileDto,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { isNgoRole } from "@/lib/isNgoRole";

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
  // A saved reference with no upload id is not a file the backend will attach, so
  // showing it as uploaded would only hide that it has to be uploaded again.
  if (!IS_NGO_DEMO_MODE && dto.documentId == null && dto.photoId == null) return null;
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

  const userIdentifier =
    user?.id ?? user?.userId ?? (user?.email ? user.email.toLowerCase().replace(/[^a-z0-9]/g, "_") : "anonymous");

  // Load existing application status or draft on mount
  useEffect(() => {
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
              } catch {}
            }
          }
          if (!submittedApp) {
            submittedApp = await getMyNgoApplication();
          }

          if (active) {
            setApplicationStatus(submittedApp?.status || "");
            if (submittedApp?.status === "REJECTED" || submittedApp?.status === "NEEDS_INFORMATION") {
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
              officialEmail: user?.email || prev.officialEmail,
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
            } catch {}
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

        if (draft && active) {
          const restoredDocs: Record<string, UploadedFile | null> = {};
          if (draft.documents) {
            for (const [key, dto] of Object.entries(draft.documents)) {
              restoredDocs[key] = fromDto(dto as any);
            }
          }

          setData((prev) => ({
            ...prev,
            organizationName: draft.organizationName || prev.organizationName,
            legalStructure: (draft.legalStructure as any) || prev.legalStructure,
            registrationNumber: draft.registrationNumber || prev.registrationNumber,
            registeredOfficeAddress: draft.registeredOfficeAddress || prev.registeredOfficeAddress,
            yearOfEstablishment: draft.yearOfEstablishment || prev.yearOfEstablishment,
            representativeName: draft.representativeName || prev.representativeName,
            designation: draft.designation || prev.designation,
            mobileNumber: draft.mobileNumber || prev.mobileNumber,
            officialEmail: draft.officialEmail || prev.officialEmail || user?.email || "",
            authorizationLetter: fromDto(draft.authorizationLetter) || prev.authorizationLetter,
            logo: fromDto(draft.logo) || prev.logo,
            officePhoto: fromDto(draft.officePhoto) || prev.officePhoto,
            activityPhotos:
              draft.activityPhotos && draft.activityPhotos.length > 0
                ? draft.activityPhotos.map(fromDto)
                : prev.activityPhotos,
            confirmationChecked: draft.confirmationChecked ?? prev.confirmationChecked,
            documents: { ...prev.documents, ...restoredDocs },
          }));
        }

        // Choose the starting step once: a ?step= deep link wins over the saved draft step.
        if (active && !startingStepChosen.current) {
          startingStepChosen.current = true;
          const savedStep =
            draft?.currentStep && (NGO_STEPS as readonly string[]).includes(draft.currentStep)
              ? (draft.currentStep as NGOStep)
              : null;
          const startStep = initialUrlStep.current ?? savedStep;
          if (startStep) setCurrentStep(startStep);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void init();

    return () => {
      active = false;
    };
  }, [user, isLoading, router, userIdentifier]);

  // Apply each deep link once after restoration; lifecycle screens take precedence.
  useEffect(() => {
    if (loading) return;
    const stepParam = searchParams.get("step");
    if (appliedStepLink.current === stepParam) return;
    appliedStepLink.current = stepParam;
    if (data.applicationId || !stepParam || stepParam === "email-verification") return;
    if (NGO_STEPS.includes(stepParam as NGOStep)) setCurrentStep(stepParam as NGOStep);
  }, [searchParams, loading, data.applicationId]);

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
        const documentsDto: Record<string, ReturnType<typeof toDto>> = {};
        for (const [id, file] of Object.entries(data.documents)) {
          documentsDto[id] = toDto(file);
        }

        await saveNgoDraft({
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
          currentStep,
        });
        toast.success("Registration draft saved");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save draft");
    } finally {
      setBusy(false);
    }
  }

  function goToStep(step: NGOStep) {
    if (data.applicationId && step !== "email-verification") return;
    if (currentStep === "submitted") return;
    setCurrentStep(step);
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
          officialEmail: user?.email || data.officialEmail,
        });
        setAwaitingVerification("fresh");
        goToStep("email-verification");
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      const documentsDto: Record<string, ReturnType<typeof toDto>> = {};
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

      const subTime = formatSubmissionTime(new Date());
      updateData({
        applicationId: response.applicationId,
        submittedAt: subTime,
        officialEmail: response.officialEmail || user?.email || data.officialEmail,
      });

      setApplicationStatus("PENDING_VERIFICATION");
      setAwaitingVerification("fresh");
      setReviewMessage("");
      goToStep("email-verification");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed. Please try again.";
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
          submittedAt: data.submittedAt || new Date().toLocaleDateString(),
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
  const stillNeeded = currentStep !== "submitted" ? getNgoStillNeededItems(currentStep, data) : [];

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-zinc-950">
      <div className="flex">
        {/* ── Left Sidebar (Desktop) ─────────────────────────────────── */}
        <aside className="sticky top-0 hidden h-screen w-[300px] shrink-0 flex-col border-r border-stone-200 bg-white lg:flex dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-4 border-b border-stone-200 px-7 pb-6 pt-8 dark:border-zinc-800">
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
                {currentStep === "submitted" ? "100%" : `${progress.percent}%`}
              </span>
              <span className="text-xs font-semibold text-stone-500">
                {currentStep === "submitted" ? 6 : progress.completedCount} of 6 done
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-ngo-700 transition-[width] duration-500"
                style={{ width: `${currentStep === "submitted" ? 100 : progress.percent}%` }}
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
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    isCurrent
                      ? "bg-ngo-50 font-bold text-ngo-700 dark:bg-ngo-900/30 dark:text-ngo-300"
                      : "font-semibold text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-2xs font-black ${
                      isCurrent
                        ? "bg-ngo-700 text-white"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "border border-stone-300 text-stone-400 dark:border-zinc-600"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : index + 1}
                  </span>
                  <span className="truncate">{NGO_STEP_FULL_TITLES[stepKey]}</span>
                </button>
              );
            })}
          </nav>

          {/* Still Needed Checklist for Active Step */}
          {currentStep !== "submitted" && (
            <div className="border-t border-stone-200 px-7 py-5 dark:border-zinc-800">
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
          {/* Mobile Header (lg:hidden) */}
          <div className="border-b border-stone-200 bg-white px-5 py-4 lg:hidden dark:border-zinc-800 dark:bg-zinc-900">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 text-sm font-semibold text-ngo-700 dark:text-ngo-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to profile
            </Link>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                Your readiness
              </h1>
              <span className="text-2xl font-black tabular-nums text-ngo-700 dark:text-ngo-300">
                {currentStep === "submitted" ? 100 : progress.percent}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-ngo-700 transition-[width] duration-500"
                style={{ width: `${currentStep === "submitted" ? 100 : progress.percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-stone-500">
              {currentStep === "submitted"
                ? "Application submitted."
                : awaitingVerification
                ? "Submitted. Enter the email code to finish."
                : `${remaining} ${remaining === 1 ? "step" : "steps"} left before submit.`}
            </p>
            {currentStep !== "submitted" && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {NGO_STEPS.map((stepKey, index) => {
                  const isCurrent = currentStep === stepKey;
                  const isCompleted = progress.completedSteps.has(stepKey);
                  return (
                    <button
                      key={stepKey}
                      type="button"
                      onClick={() => goToStep(stepKey)}
                      disabled={stepKey === "email-verification" || (!!awaitingVerification && !isCurrent)}
                      className={`min-h-9 shrink-0 whitespace-nowrap rounded-full px-3.5 text-2xs font-bold transition-colors flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                        isCurrent
                          ? "bg-ngo-700 text-white"
                          : "border border-stone-300 text-stone-600 dark:border-zinc-600 dark:text-stone-300"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : `${index + 1}.`} {NGO_STEP_FULL_TITLES[stepKey]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form Content Area */}
          <div className="flex flex-1 flex-col">
            <div className="flex-1 px-5 py-8 sm:px-10">
              <div className="max-w-3xl">
                {reviewMessage && <div role="status" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 whitespace-pre-wrap">{reviewMessage}</div>}
                {submitError && (
                  <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    {submitError}
                  </div>
                )}

                {currentStep === "submitted" ? (
                  <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center gap-3 border-b border-stone-200 pb-5 dark:border-zinc-800">
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
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-ngo-700 hover:bg-ngo-600 px-6 py-3 text-xs font-bold text-white transition-colors shadow-sm"
                      >
                        Return to Profile
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
                    {currentStep === "org-details" && (
                      <OrgDetails
                        data={data}
                        onChange={updateData}
                        onBack={() => router.push("/profile")}
                        onContinue={handleNextSection}
                      />
                    )}

                    {currentStep === "legal-documents" && (
                      <LegalDocuments
                        data={data}
                        onChange={updateData}
                        onBack={handlePreviousSection}
                        onContinue={handleNextSection}
                      />
                    )}

                    {currentStep === "authorized-rep" && (
                      <AuthorizedRepresentative
                        data={data}
                        onChange={updateData}
                        onBack={handlePreviousSection}
                        onContinue={handleNextSection}
                      />
                    )}

                    {currentStep === "org-photos" && (
                      <OrgPhotos
                        data={data}
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
                )}
              </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            {currentStep !== "submitted" && currentStep !== "email-verification" && (
              <div className="sticky bottom-0 border-t border-stone-200 bg-white px-5 py-4 sm:px-10 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex max-w-3xl flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-stone-500">
                    Step {NGO_STEPS.indexOf(currentStep as NGOStep) + 1} of 6:{" "}
                    <span className="text-stone-900 dark:text-stone-100 font-bold">
                      {NGO_STEP_FULL_TITLES[currentStep as NGOStep]}
                    </span>
                  </p>
                  {/* Not rendered (rather than hidden) once submitted, so neither action is reachable by keyboard either. */}
                  {!awaitingVerification && (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleSaveDraft}
                        className="rounded-xl border border-stone-300 dark:border-zinc-700 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                      >
                        {busy ? "Saving…" : "Save draft"}
                      </button>
                      {NGO_STEPS.indexOf(currentStep as NGOStep) > 0 && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={handlePreviousSection}
                          className="rounded-xl border border-stone-300 dark:border-zinc-700 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
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