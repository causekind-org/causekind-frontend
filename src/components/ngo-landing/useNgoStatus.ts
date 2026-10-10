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

export type NgoStatusType = "loading" | "incomplete" | "under_review" | "changes_requested" | "verified";

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
  } else if (status === "changes_requested") {
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
  const [hasShownWelcome, setHasShownWelcome] = useState(true);
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
        : raw === "REJECTED" || raw === "NEEDS_INFORMATION" ? "changes_requested"
        : raw === "UNDER_REVIEW" || raw === "PENDING_VERIFICATION" ? "under_review" : "incomplete");
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

  const isVerified = !isLoading && !error && status === "verified";
  const isPhotosDue = (overview?.photosDue ?? 0) > 0;
  const canStartDrive = overview?.canStartDrive !== false;
  const blockingDriveTitle = overview?.blockingDriveTitle ?? "";
  const driveLockReason = canStartDrive ? ""
    : `Available after your current drive${blockingDriveTitle ? ` "${blockingDriveTitle}"` : ""} is completed and its photos are approved.`;
  const canPostRequest = isVerified && !isPhotosDue && canStartDrive;
  const lockReason = isLoading ? "Checking your NGO status…" : error || (!isVerified
    ? "Available once CauseKind verifies your NGO."
    : isPhotosDue ? `Upload handover photos for ${overview?.photosDueRequestName} before starting another drive.`
    : driveLockReason);
  return {
    isLoading: isLoading || authLoading, error, refresh, overview, status, ngoName,
    stepNumber: progress.completedCount, totalSteps: 6, nextIncompleteStep: progress.nextIncompleteStep,
    wizardHref: progress.nextIncompleteStep ? `/profile/ngo-details?step=${progress.nextIncompleteStep}` : "/profile/ngo-details",
    activeRequests: overview?.activeRequests ?? 0, itemsPledged: overview?.itemsPledged ?? 0,
    dropoffsToConfirm: overview?.dropoffsToConfirm ?? 0, photosDue: overview?.photosDue ?? 0,
    photosDueRequestName: overview?.photosDueRequestName ?? "", isVerified, isPhotosDue,
    canPostRequest, lockReason, canStartDrive, blockingDriveTitle, driveLockReason, hasShownWelcome, markWelcomeShown,
    documents, isError: !!error,
  };
}
