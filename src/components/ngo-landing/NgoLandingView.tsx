"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useNgoStatus } from "./useNgoStatus";
import { SmoothScrollProvider } from "./motion/SmoothScrollProvider";

import { Skeleton } from "@/components/ui/skeleton";


import dynamic from 'next/dynamic';

const NgoHeroStateA = dynamic(() => import('./NgoHeroStateA').then(mod => mod.NgoHeroStateA), { loading: () => <div className="min-h-screen" /> });
const NgoSoundFamiliar = dynamic(() => import('./NgoSoundFamiliar').then(mod => mod.NgoSoundFamiliar), { loading: () => <div className="min-h-screen" /> });
const NgoJourneyPinned = dynamic(() => import('./NgoJourneyPinned').then(mod => mod.NgoJourneyPinned), { loading: () => <div className="min-h-screen" /> });
const NgoVerificationScan = dynamic(() => import('./NgoVerificationScan').then(mod => mod.NgoVerificationScan), { loading: () => <div className="min-h-screen" /> });
const NgoVerificationFinale = dynamic(() => import('./NgoVerificationFinale').then(mod => mod.NgoVerificationFinale), { loading: () => <div className="min-h-[60vh]" /> });
const NgoFaqSection = dynamic(() => import('./NgoFaqSection').then(mod => mod.NgoFaqSection), { loading: () => <div className="min-h-[50vh]" /> });
const NgoHeroStateB = dynamic(() => import('./NgoHeroStateB').then(mod => mod.NgoHeroStateB), { loading: () => <div className="min-h-[70vh]" /> });
const NgoVerifiedBadgeMoment = dynamic(() => import('./NgoVerifiedBadgeMoment').then(mod => mod.NgoVerifiedBadgeMoment), { ssr: false });
const NgoEducationDrawer = dynamic(() => import('./NgoEducationDrawer').then(mod => mod.NgoEducationDrawer), { loading: () => <div className="min-h-[20vh]" /> });
import { ScrollProgressRail } from "./motion/ScrollProgressRail";

function NgoLandingRouter({ statusData }: { statusData: any }) {
  if (statusData.isVerified) {
    // STATE B: Verified NGO (Phase 3)
    const stateBLabels = [
      { text: "Mission Control", top: "0%" },
      { text: "Overview", top: "50%" },
      { text: "Education", top: "95%" }
    ];

    return (
      <>
        <NgoVerifiedBadgeMoment />
        <ScrollProgressRail labels={stateBLabels} />
        <NgoHeroStateB />
        <NgoEducationDrawer />
      </>
    );
  }

  // STATE A: Incomplete / Under Review / Changes Requested (Phase 2)
  return (
    <>
      <ScrollProgressRail />
      <NgoHeroStateA 
        status={statusData.status} 
        stepNumber={statusData.stepNumber} 
        totalSteps={statusData.totalSteps} 
        wizardHref={statusData.wizardHref} 
      />
      <NgoSoundFamiliar />
      <NgoJourneyPinned />
      <NgoVerificationScan />
      <NgoVerificationFinale 
        status={statusData.status} 
        wizardHref={statusData.wizardHref} 
      />
      <NgoFaqSection />
    </>
  );
}

function DevPreviewWrapper() {
  // Use a query parameter to override the state for dev preview ONLY
  const searchParams = useSearchParams();
  const devState = searchParams?.get("devState");
  
  // Real hook data
  const realStatus = useNgoStatus();
  const [status, setStatus] = useState(realStatus);

  useEffect(() => {
    // Only in development and if devState is provided
    if (process.env.NODE_ENV === "development" && devState) {
      const isVerified = devState.startsWith("verified");
      
      let nextStatus = realStatus.status;
      if (devState.includes("under_review")) nextStatus = "under_review" as any;
      else if (devState.includes("changes_requested")) nextStatus = "changes_requested" as any;
      else if (devState.includes("incomplete")) nextStatus = "incomplete" as any;
      else if (isVerified) nextStatus = "verified" as any;
      else if (devState.includes("APPROVED")) nextStatus = "APPROVED" as any;
      else if (devState.includes("UNDER_REVIEW")) nextStatus = "UNDER_REVIEW" as any;
      else if (devState.includes("REJECTED")) nextStatus = "REJECTED" as any;
      else if (devState.includes("INCOMPLETE")) nextStatus = "INCOMPLETE" as any;

      let mockOverview = { ...realStatus.overview } as any;
      if (isVerified) {
        mockOverview = {
          activeRequests: devState === "verified_active" ? 1 : 0,
          itemsPledged: devState === "verified_active" ? 24 : 0,
          dropoffsToConfirm: devState === "verified_active" ? 3 : 0,
          photosDue: devState === "verified_photos_due" ? 1 : 0,
          photosDueRequestName: "Winter Blanket Drive",
          verifiedDeliveries: 0,
          handovers: [],
          canStartDrive: devState === "verified_empty",
          blockingDriveTitle: devState === "verified_empty" ? "" : "Winter Blanket Drive",
          blockingDriveStatus: "active"
        };
      }

      setStatus({
        ...realStatus,
        status: nextStatus,
        isVerified,
        isPhotosDue: devState === "verified_photos_due",
        canStartDrive: devState === "verified_empty",
        isLoading: false,
        error: null,
        overview: isVerified ? mockOverview : realStatus.overview,
        photosDue: mockOverview?.photosDue ?? 0,
        activeRequests: mockOverview?.activeRequests ?? 0,
        dropoffsToConfirm: mockOverview?.dropoffsToConfirm ?? 0,
        itemsPledged: mockOverview?.itemsPledged ?? 0,
        blockingDriveTitle: mockOverview?.blockingDriveTitle ?? "",
        lockReason: isVerified 
          ? (devState === "verified_empty" 
             ? "" 
             : devState === "verified_photos_due" 
               ? "Upload handover photos for Winter Blanket Drive before starting another drive." 
               : "Available after your current drive \"Winter Blanket Drive\" is completed and its photos are approved.")
          : realStatus.lockReason,
      });
    } else {
      setStatus(realStatus);
    }
  }, [devState, realStatus]);

  if (status.isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF9F4] dark:bg-[#09090b] pt-32 px-6 flex flex-col gap-8">
        <Skeleton className="w-full max-w-4xl h-96 mx-auto rounded-3xl" />
        <Skeleton className="w-full max-w-4xl h-32 mx-auto rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (status.error) {
    return (
      <div className="min-h-screen bg-[#FBF9F4] dark:bg-[#09090b] flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Unable to load dashboard</h2>
          <p className="text-stone-500 max-w-md">There was a problem loading your NGO status. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <SmoothScrollProvider>
      <div className="ck-ngo-landing-page min-h-screen bg-[#FBF9F4] dark:bg-[#09090b] text-stone-900 dark:text-stone-100 transition-colors duration-300 overflow-x-clip">
        <NgoLandingRouter statusData={status} />
      </div>
    </SmoothScrollProvider>
  );
}

export function NgoLandingView() {
  return (
    <Suspense fallback={null}>
      <DevPreviewWrapper />
    </Suspense>
  );
}

export default NgoLandingView;

