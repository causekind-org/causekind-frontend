"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getMyNgoApplication, getNgoDraft } from "@/lib/api";
import {
  calculateNgoProgress,
  INITIAL_NGO_FORM,
  IS_NGO_DEMO_MODE,
  type NGOFormState,
  type NGOStep,
} from "@/features/ngo-registration/ngoRegistrationModel";

export type NgoStatusType = "loading" | "incomplete" | "under_review" | "changes_requested" | "verified";

function parseFormState(raw: any): NGOFormState {
  if (!raw) return INITIAL_NGO_FORM;
  return {
    ...INITIAL_NGO_FORM,
    organizationName: raw.organizationName || "",
    legalStructure: raw.legalStructure || "",
    registrationNumber: raw.registrationNumber || "",
    registeredOfficeAddress: raw.registeredOfficeAddress || "",
    yearOfEstablishment: raw.yearOfEstablishment || "",
    representativeName: raw.representativeName || "",
    designation: raw.designation || "",
    mobileNumber: raw.mobileNumber || "",
    officialEmail: raw.officialEmail || "",
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
  photosDueRequestName: string = "Winter Relief Blankets Drive",
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
    toast.warning(`Upload handover photos for ${photosDueRequestName} to post your next request.`, {
      action: router
        ? {
            label: "Upload",
            onClick: () => router.push("/dashboard/ngo"),
          }
        : undefined,
    });
  }
}

export interface NgoStatusData {
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
  hasShownWelcome: boolean;
  markWelcomeShown: () => void;
  documents: Record<string, any>;
}

export function useNgoStatus(): NgoStatusData {
  const { user, isLoading } = useAuth();

  const userIdentifier =
    user?.id ?? user?.userId ?? (user?.email ? user.email.toLowerCase().replace(/[^a-z0-9]/g, "_") : "anonymous");

  const [status, setStatus] = useState<NgoStatusType>("loading");
  const [ngoName, setNgoName] = useState<string>("Your Organization");
  
  // Real readiness progress calculated directly from the form/draft state
  const initialProg = calculateNgoProgress(INITIAL_NGO_FORM);
  const [stepNumber, setStepNumber] = useState<number>(initialProg.completedCount);
  const [nextIncompleteStep, setNextIncompleteStep] = useState<NGOStep | null>(initialProg.nextIncompleteStep);
  const [documents, setDocuments] = useState<Record<string, any>>({});

  const [activeRequests, setActiveRequests] = useState<number>(0);
  const [itemsPledged, setItemsPledged] = useState<number>(0);
  const [dropoffsToConfirm, setDropoffsToConfirm] = useState<number>(0);
  const [photosDue, setPhotosDue] = useState<number>(0);
  const [photosDueRequestName, setPhotosDueRequestName] = useState<string>("Winter Relief Blankets Drive");

  const [hasShownWelcome, setHasShownWelcome] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return !!localStorage.getItem(`ngo-verified-welcome-shown-${userIdentifier}`);
  });

  const markWelcomeShown = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`ngo-verified-welcome-shown-${userIdentifier}`, "true");
    }
    setHasShownWelcome(true);
  }, [userIdentifier]);

  const evaluateApplication = useCallback(
    (appData: any, draftData?: any) => {
      if (!appData && !draftData) {
        setStatus("incomplete");
        const prog = calculateNgoProgress(INITIAL_NGO_FORM);
        setStepNumber(prog.completedCount);
        setNextIncompleteStep(prog.nextIncompleteStep);
        return;
      }

      const rawStatus = (appData?.submissionStatus || appData?.status || "").toUpperCase();
      if (appData?.organizationName) {
        setNgoName(appData.organizationName);
      } else if (draftData?.organizationName) {
        setNgoName(draftData.organizationName);
      }

      if (rawStatus === "APPROVED" || rawStatus === "VERIFIED") {
        setStatus("verified");
      } else if (
        rawStatus === "UNDER_REVIEW" ||
        rawStatus === "SUBMITTED" ||
        rawStatus === "PENDING_VERIFICATION"
      ) {
        setStatus("under_review");
      } else if (
        rawStatus === "NEEDS_INFORMATION" ||
        rawStatus === "CHANGES_REQUESTED" ||
        rawStatus === "REJECTED"
      ) {
        setStatus("changes_requested");
      } else {
        setStatus("incomplete");
      }

      // Calculate real readiness progress using the exact canonical model calculation
      const sourceData = draftData || appData;
      const formState = parseFormState(sourceData);
      const prog = calculateNgoProgress(formState);
      setStepNumber(prog.completedCount);
      setNextIncompleteStep(prog.nextIncompleteStep);
      setDocuments(formState.documents || {});
    },
    []
  );

  const checkStatus = useCallback(() => {
    if (isLoading) {
      setStatus("loading");
      return;
    }

    if (typeof window === "undefined" || !user) {
      setStatus("incomplete");
      const prog = calculateNgoProgress(INITIAL_NGO_FORM);
      setStepNumber(prog.completedCount);
      setNextIncompleteStep(prog.nextIncompleteStep);
      return;
    }

    const demoAppKey = `ngo-demo-application-${userIdentifier}`;
    const realAppKey = `ngo-application-${userIdentifier}`;
    const demoDraftKey = `ngo-demo-draft-${userIdentifier}`;
    const realDraftKey = `ngo-draft-${userIdentifier}`;

    let appObj: any = null;
    let draftObj: any = null;

    try {
      const cachedApp = localStorage.getItem(demoAppKey) || localStorage.getItem(realAppKey);
      if (cachedApp) appObj = JSON.parse(cachedApp);
      const cachedDraft = localStorage.getItem(demoDraftKey) || localStorage.getItem(realDraftKey);
      if (cachedDraft) draftObj = JSON.parse(cachedDraft);
    } catch {}

    evaluateApplication(appObj, draftObj);

    // Also fetch latest from backend
    Promise.allSettled([getMyNgoApplication(), getNgoDraft()])
      .then(([appRes, draftRes]) => {
        // Only fallback to local storage (appObj) if we are in demo mode AND the API returns null (HTTP 204/404)
        let apiApp = null;
        if (appRes.status === "fulfilled") {
          apiApp = appRes.value ? appRes.value : (IS_NGO_DEMO_MODE ? appObj : null);
        } else {
          apiApp = IS_NGO_DEMO_MODE ? appObj : null;
        }

        let apiDraft = null;
        if (draftRes.status === "fulfilled") {
          apiDraft = draftRes.value ? draftRes.value : (IS_NGO_DEMO_MODE ? draftObj : null);
        } else {
          apiDraft = IS_NGO_DEMO_MODE ? draftObj : null;
        }
        
        evaluateApplication(apiApp, apiDraft);
      })
      .catch(() => {});
  }, [isLoading, user, userIdentifier, evaluateApplication]);

  useEffect(() => {
    checkStatus();

    const handleUpdate = (e?: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent?.detail) {
        evaluateApplication(customEvent.detail);
        return;
      }
      checkStatus();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("ngo-application-submitted", handleUpdate);
      window.addEventListener("storage", handleUpdate);
      return () => {
        window.removeEventListener("ngo-application-submitted", handleUpdate);
        window.removeEventListener("storage", handleUpdate);
      };
    }
  }, [checkStatus, evaluateApplication]);

  const isVerified = status === "verified";
  const isPhotosDue = isVerified && photosDue > 0;
  const canPostRequest = isVerified && !isPhotosDue;

  let lockReason = "";
  if (!isVerified) {
    lockReason = "Available once CauseKind verifies your NGO.";
  } else if (isPhotosDue) {
    lockReason = `Upload handover photos for ${photosDueRequestName} to start your next drive.`;
  }

  const wizardHref = nextIncompleteStep
    ? `/profile/ngo-details?step=${nextIncompleteStep}`
    : "/profile/ngo-details";

  return {
    status,
    ngoName,
    stepNumber,
    totalSteps: 6,
    nextIncompleteStep,
    wizardHref,
    activeRequests,
    itemsPledged,
    dropoffsToConfirm,
    photosDue,
    photosDueRequestName,
    isVerified,
    isPhotosDue,
    canPostRequest,
    lockReason,
    hasShownWelcome,
    markWelcomeShown,
    documents,
  };
}


