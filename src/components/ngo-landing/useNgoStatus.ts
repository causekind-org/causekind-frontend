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

export type NgoStatusType =
  | "loading" | "incomplete" | "pending_otp" | "under_review" | "changes_requested" | "rejected" | "verified";

/** Who is looking at the NGO area: only "ngo" viewers get NGO status, CTAs and API calls. */
export type NgoViewer = "guest" | "ngo" | "other";

const NGO_ROLES = ["NGO", "NGO_PARTNER"];

/** Where a logged-out visitor's "apply" CTAs go. */
export const NGO_LOGIN_HREF = "/login?next=/ngo";

function toNgoStatus(raw: string | undefined): NgoStatusType {
  switch (raw) {
    case "APPROVED": return "verified";
    case "NEEDS_INFORMATION": return "changes_requested";
    case "REJECTED": return "rejected";
    case "PENDING_VERIFICATION": return "pending_otp";
    case "UNDER_REVIEW": return "under_review";
    default: return "incomplete";
  }
}

function parseFormState(raw: any): NGOFormState {
  if (!raw) return INITIAL_NGO_FORM;
  return {
    ...INITIAL_NGO_FORM,
    organizationName: fieldText(raw.organizationName),
    legalStructure: raw.legalStructure || "",
    panNumber: fieldText(raw.panNumber),
    organizationPhone: fieldText(raw.organizationPhone),
    aboutUs: typeof raw.aboutUs === "string" ? raw.aboutUs : "",
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
  } else if (status === "pending_otp") {
    toast.info("Verify your email to send your application for review.", {
      action: router
        ? {
          label: "Verify",
          onClick: () => router.push("/profile/ngo-details"),
        }
        : undefined,
    });
  } else if (status === "under_review") {
    toast.info("Your application is under review. We'll unlock this once you're approved.");
  } else if (status === "rejected") {
    toast.info("Your application was not approved. See your application for the reason.");
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
  viewer: NgoViewer;
  /** When CauseKind approved the NGO (ISO, UTC), if it has been. */
  verifiedAt: string | null;
  /** The reviewer's reason, for a rejected application. */
  rejectionReason: string | null;
  /** The overview counters failed to load: show "—", the status itself is unaffected. */
  statsUnavailable: boolean;
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
  const [statsUnavailable, setStatsUnavailable] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(true);
  const [documents, setDocuments] = useState<Record<string, any>>({});
  const sequence = useRef(0);
  /** Whose status is on screen: later refreshes for the same NGO keep it instead of blanking it. */
  const loadedFor = useRef<string | null>(null);
  // Depend on who the user is, not on the object: a new user object with the same
  // identity (each re-render, e.g. the hero gallery's slideshow) must not restart the load.
  const userRef = useRef(user);
  userRef.current = user;
  const userKey = user ? `${user.id}|${user.role}|${user.fullName ?? ""}` : "";

  const refresh = useCallback(async () => {
    const user = userRef.current;
    const request = ++sequence.current;
    if (authLoading) return;
    if (!user || !NGO_ROLES.includes(user.role?.toUpperCase() || "")) {
      setStatus("incomplete"); setOverview(null); setLoading(false); setError(null); return;
    }
    // Only the first load for this account shows "loading". A background refresh (focus,
    // live update, the profile name arriving) kept flipping isVerified off for ~2s, so every
    // NGO page dropped to its locked/blank state and came back.
    const id = String(user.id ?? user.email ?? "");
    if (loadedFor.current !== id) setLoading(true);
    try {
      // The status comes from the application alone: a failed overview only blanks the counters.
      const totalsRequest = getNgoOverview().then(
        (totals) => ({ totals, failed: false }),
        () => ({ totals: null as NgoOverview | null, failed: true }),
      );
      const [application, draft, { totals, failed }] = await Promise.all([getMyNgoApplication(), getNgoDraft(), totalsRequest]);
      if (request !== sequence.current) return;
      setStatus(toNgoStatus(application?.status));
      setVerifiedAt(application?.verifiedAt ?? null);
      setRejectionReason(application?.status === "REJECTED" ? application.rejectionReason ?? null : null);
      setStatsUnavailable(failed);
      setNgoName(application?.organizationName || draft?.organizationName || user?.fullName || "Your Organization");
      const form = parseFormState(draft || application);
      setProgress(calculateNgoProgress(form));
      setDocuments(form.documents || {});
      setOverview(totals);
      setError(null);
      loadedFor.current = id;
    } catch (e) {
      if (request === sequence.current) {
        setError(e instanceof Error ? e.message : "We could not load your NGO activity. Please retry.");
        setOverview(null);
        setStatus("incomplete"); // Cached approval is never a permission fallback.
      }
    } finally { if (request === sequence.current) setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- userKey stands for user
  }, [userKey, authLoading]);

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
  const viewer: NgoViewer = !user ? "guest" : NGO_ROLES.includes(user.role?.toUpperCase() || "") ? "ngo" : "other";
  return {
    isLoading: isLoading || authLoading, error, refresh, overview, status, ngoName,
    viewer, verifiedAt, rejectionReason, statsUnavailable,
    stepNumber: progress.completedCount, totalSteps: 6, nextIncompleteStep: progress.nextIncompleteStep,
    wizardHref: viewer === "guest" ? NGO_LOGIN_HREF
      : progress.nextIncompleteStep ? `/profile/ngo-details?step=${progress.nextIncompleteStep}` : "/profile/ngo-details",
    activeRequests: overview?.activeRequests ?? 0, itemsPledged: overview?.itemsPledged ?? 0,
    dropoffsToConfirm: overview?.dropoffsToConfirm ?? 0, photosDue: overview?.photosDue ?? 0,
    photosDueRequestName: overview?.photosDueRequestName ?? "", isVerified, isPhotosDue,
    canPostRequest, lockReason, canStartDrive, blockingDriveTitle, driveLockReason, hasShownWelcome, markWelcomeShown,
    documents, isError: !!error,
  };
}
