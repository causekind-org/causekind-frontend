"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getMyNgoApplication, getNgoDraft, getNgoOverview, type NgoOverview } from "@/lib/api";
import {
  calculateNgoProgress,
  INITIAL_NGO_FORM,
  IS_NGO_DEMO_MODE,
  type NGOFormState,
  type NGOStep,
  fieldText,
} from "@/features/ngo-registration/ngoRegistrationModel";

export type NgoStatusType = "loading" | "incomplete" | "under_review" | "changes_requested" | "rejected" | "verified";

function parseFormState(raw: any): NGOFormState {
  if (!raw) return INITIAL_NGO_FORM;
  return {
    ...INITIAL_NGO_FORM,
    organizationName: fieldText(raw.organizationName),
    legalStructure: raw.legalStructure || "",
    registrationNumber: fieldText(raw.registrationNumber),
    registeredOfficeAddress: fieldText(raw.registeredOfficeAddress),
    yearOfEstablishment: fieldText(raw.yearOfEstablishment),
    representativeName: fieldText(raw.representativeName),
    designation: raw.designation || "",
    mobileNumber: fieldText(raw.mobileNumber),
    officialEmail: fieldText(raw.officialEmail),
    authorizationLetter: raw.authorizationLetter || null,
    logo: raw.logo || null,
    officePhoto: raw.officePhoto || null,
    activityPhotos: Array.isArray(raw.activityPhotos) ? raw.activityPhotos : [null, null, null],
    confirmationChecked: !!raw.confirmationChecked,
    emailOtp: raw.emailOtp || "",
    documents: raw.documents || {},
  };
}

export function triggerNgoLockedToast(
  status: NgoStatusType,
  isPhotosDue: boolean = false,
  photosDueRequestName: string = "your recent handover",
  router?: { push: (url: string) => void },
  isLoggedOut: boolean = false
) {
  if (isLoggedOut) {
    toast.info("Log in as an NGO to access this.", {
      action: router
        ? {
          label: "Log in",
          onClick: () => router.push("/login"),
        }
        : undefined,
    });
    return;
  }
  if (status === "incomplete") {
    toast.info("Complete your profile to get verified. Continue →", {
      action: router
        ? {
          label: "Continue",
          onClick: () => router.push("/profile/ngo-details"),
        }
        : undefined,
    });
  } else if (status === "under_review") {
    toast.info("Your application is under review. We'll unlock this once you're approved.");
  } else if (status === "changes_requested" || status === "rejected") {
    toast.warning("A few documents need fixing. Fix now →", {
      action: router
        ? {
          label: "Fix now",
          onClick: () => router.push("/profile/ngo-details"),
        }
        : undefined,
    });
  } else if (isPhotosDue) {
    toast.warning(`Upload handover photos for ${photosDueRequestName} to start your next drive.`, {
      action: router
        ? {
            label: "Upload",
            onClick: () => router.push("/ngo/handovers"),
          }
        : undefined,
    });
  }
}

export interface NgoStatusData {
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  overview: NgoOverview | null;
  status: NgoStatusType;
  ngoName: string;
  stepNumber: number;
  totalSteps: number;
  nextIncompleteStep: NGOStep | null;
  wizardHref: string;
  activeRequests: number;
  itemsPledged: number;
  dropoffsToConfirm: number;
  photosDue: number;
  photosDueRequestName: string;
  isVerified: boolean;
  isPhotosDue: boolean;
  canPostRequest: boolean;
  lockReason: string;
  /** One drive at a time (no local test flag bypasses this). */
  canStartDrive: boolean;
  blockingDriveTitle: string;
  driveLockReason: string;
  hasShownWelcome: boolean;
  markWelcomeShown: () => void;
  documents: Record<string, any>;
  isError: boolean;
  verifiedAt?: string | null;
}

export function useNgoStatus(): NgoStatusData {
  const { user, isLoading: authLoading } = useAuth();
  const userIdentifier = String(user?.id ?? user?.userId ?? user?.email ?? "anonymous");
  const [status, setStatus] = useState<NgoStatusType>("incomplete");
  const [ngoName, setNgoName] = useState("Your Organization");
  const [progress, setProgress] = useState(() => calculateNgoProgress(INITIAL_NGO_FORM));
  const [overview, setOverview] = useState<NgoOverview | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return !!localStorage.getItem(`ngo-verified-welcome-shown-${userIdentifier}`);
    } catch {
      return true;
    }
  });
  const [documents, setDocuments] = useState<Record<string, any>>({});
  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    if (authLoading) return;
    if (!user || !["NGO", "NGO_PARTNER"].includes(user.role?.toUpperCase() || "")) {
      setStatus("incomplete"); setOverview(null); setLoading(false); setError(null); return;
    }
    setLoading(true); setError(null);
    try {
      const [application, draft, totals] = await Promise.all([getMyNgoApplication(), getNgoDraft(), getNgoOverview()]);
      if (request !== sequence.current) return;
      const raw = application?.status;
      setStatus(raw === "APPROVED" ? "verified"
        : raw === "REJECTED" ? "rejected"
        : raw === "NEEDS_INFORMATION" ? "changes_requested"
        : raw === "UNDER_REVIEW" || raw === "PENDING_VERIFICATION" ? "under_review" : "incomplete");
      setVerifiedAt(application?.verifiedAt || null);
      setNgoName(application?.organizationName || draft?.organizationName || user?.fullName || "Your Organization");
      const form = parseFormState(draft || application);
      setProgress(calculateNgoProgress(form));
      setDocuments(form.documents || {});
      setOverview(totals);
    } catch (e) {
      if (request === sequence.current) {
        setError(e instanceof Error ? e.message : "We could not load your NGO activity. Please retry.");
        setOverview(null);
        setStatus("incomplete"); // Cached approval is never a permission fallback.
      }
    } finally { if (request === sequence.current) setLoading(false); }
  }, [user, authLoading]);

  useEffect(() => {
    void refresh();
    const reload = () => { void refresh(); };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const activity = () => { clearTimeout(timer); timer = setTimeout(reload, 400); };
    window.addEventListener("focus", reload);
    window.addEventListener("ngo-application-submitted", reload);
    window.addEventListener("ngo-activity-updated", reload);
    window.addEventListener("ck-entity-update", activity);
    return () => {
      ++sequence.current; clearTimeout(timer);
      window.removeEventListener("focus", reload);
      window.removeEventListener("ngo-application-submitted", reload);
      window.removeEventListener("ngo-activity-updated", reload);
      window.removeEventListener("ck-entity-update", activity);
    };
  }, [refresh]);

  useEffect(() => {
    try { setHasShownWelcome(!!localStorage.getItem(`ngo-verified-welcome-shown-${userIdentifier}`)); }
    catch { setHasShownWelcome(true); }
  }, [userIdentifier]);
  const markWelcomeShown = useCallback(() => {
    try { localStorage.setItem(`ngo-verified-welcome-shown-${userIdentifier}`, "true"); } catch {}
    setHasShownWelcome(true);
  }, [userIdentifier]);

  // Support visual preview states via query param (e.g. ?state=under_review, ?state=approved, etc.)
  let effectiveStatus = status;
  let effectiveStepNumber = progress.completedCount;
  let effectiveOverview = overview;
  let effectiveIsLoading = isLoading || authLoading;
  let effectiveVerifiedAt = verifiedAt;

  if (typeof window !== "undefined" && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("preview") || params.get("previewState") || params.get("state");
    if (preview) {
      effectiveIsLoading = false;
      if (preview === "approved" || preview === "verified") {
        effectiveStatus = "verified";
        effectiveVerifiedAt = effectiveVerifiedAt || "2025-10-12T00:00:00Z";
        effectiveOverview = effectiveOverview || {
          activeRequests: 2,
          itemsPledged: 140,
          dropoffsToConfirm: 3,
          photosDue: 0,
          canStartDrive: true,
          blockingDriveTitle: "",
          photosDueRequestName: "",
          verifiedDeliveries: 12,
          handovers: [],
        };
      } else if (preview === "under_review") {
        effectiveStatus = "under_review";
        effectiveStepNumber = 5;
      } else if (preview === "changes_requested" || preview === "needs_information") {
        effectiveStatus = "changes_requested";
        effectiveStepNumber = 3;
      } else if (preview === "rejected") {
        effectiveStatus = "rejected";
        effectiveStepNumber = 2;
      } else if (preview === "new" || preview === "incomplete") {
        effectiveStatus = "incomplete";
        effectiveStepNumber = 0;
      }
    }
  }

  const isVerified = !effectiveIsLoading && !error && effectiveStatus === "verified";
  const isPhotosDue = (effectiveOverview?.photosDue ?? 0) > 0;
  const canStartDrive = effectiveOverview?.canStartDrive !== false;
  const blockingDriveTitle = effectiveOverview?.blockingDriveTitle ?? "";
  const driveLockReason = canStartDrive ? ""
    : `Available after your current drive${blockingDriveTitle ? ` "${blockingDriveTitle}"` : ""} is completed and its photos are approved.`;
  const canPostRequest = isVerified && !isPhotosDue && canStartDrive;
  const lockReason = effectiveIsLoading ? "Checking your NGO status…" : error || (!isVerified
    ? "Available once CauseKind verifies your NGO."
    : isPhotosDue ? `Upload handover photos for ${effectiveOverview?.photosDueRequestName} before starting another drive.`
    : driveLockReason);

  return {
    isLoading: effectiveIsLoading, error, refresh, overview: effectiveOverview, status: effectiveStatus, ngoName,
    stepNumber: effectiveStepNumber, totalSteps: 6, nextIncompleteStep: progress.nextIncompleteStep,
    wizardHref: progress.nextIncompleteStep ? `/profile/ngo-details?step=${progress.nextIncompleteStep}` : "/profile/ngo-details",
    activeRequests: effectiveOverview?.activeRequests ?? 0, itemsPledged: effectiveOverview?.itemsPledged ?? 0,
    dropoffsToConfirm: effectiveOverview?.dropoffsToConfirm ?? 0, photosDue: effectiveOverview?.photosDue ?? 0,
    photosDueRequestName: effectiveOverview?.photosDueRequestName ?? "", isVerified, isPhotosDue,
    canPostRequest, lockReason, canStartDrive, blockingDriveTitle, driveLockReason, hasShownWelcome, markWelcomeShown,
    documents, isError: !!error, verifiedAt: effectiveVerifiedAt,
  };
}
