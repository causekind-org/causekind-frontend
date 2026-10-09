"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useNgoStatus } from "./useNgoStatus";
import { SmoothScrollProvider } from "./motion/SmoothScrollProvider";

import { NgoHeroSection } from "./NgoHeroSection";
import { NgoGlanceStrip } from "./NgoGlanceStrip";
import { NgoProblemSolutionSection } from "./NgoProblemSolutionSection";
import { NgoTransparencySection } from "./NgoTransparencySection";
import { NgoTrustSection } from "./NgoTrustSection";
import { NgoHowItWorksSection } from "./NgoHowItWorksSection";
import { NgoVerifiedWelcomeModal } from "./NgoVerifiedWelcomeModal";
import { Skeleton } from "@/components/ui/skeleton";

function DevPreviewWrapper({ children }: { children: React.ReactNode }) {
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

      setStatus({
        ...realStatus,
        status: nextStatus,
        isVerified,
        isPhotosDue: devState === "verified_photos_due",
        canStartDrive: devState !== "verified_locked",
        isLoading: false,
        error: null,
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

  // Phase 1: Keep the existing UI rendering through the new router for now
  return (
    <SmoothScrollProvider>
      <div className="ck-ngo-landing-page min-h-screen bg-[#FBF9F4] dark:bg-[#09090b] text-stone-900 dark:text-stone-100 transition-colors duration-300 overflow-x-clip">
        {children}
      </div>
    </SmoothScrollProvider>
  );
}

export function NgoLandingView() {
  return (
    <Suspense fallback={null}>
      <DevPreviewWrapper>
        <NgoVerifiedWelcomeModal />
        <NgoHeroSection />
        <NgoGlanceStrip />
        <NgoProblemSolutionSection />
        <NgoTransparencySection />
        <NgoTrustSection />
        <NgoHowItWorksSection />
      </DevPreviewWrapper>
    </Suspense>
  );
}

export default NgoLandingView;

