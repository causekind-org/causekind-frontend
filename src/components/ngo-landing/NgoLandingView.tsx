"use client";

import { Suspense, lazy } from "react";
import Link from "next/link";
import { useNgoStatus } from "./useNgoStatus";
import { NgoVerifiedWelcomeModal } from "./NgoVerifiedBadgeMoment";
import "./ngo-redesign.css";

const PostApprovalLanding = lazy(() => import("./PostApprovalLanding"));
const PreApprovalLanding = lazy(() => import("./PreApprovalLanding"));

function NgoLandingViewContent() {
  const status = useNgoStatus();
  const { isVerified, isLoading, error, refresh, viewer } = status;

  // Donors and donees get no NGO status, CTAs or NGO API calls (useNgoStatus skips them).
  if (viewer === "other" && !isLoading) {
    return (
      <div className="ck-ngo-landing-page ngo-theme-wrapper min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <p className="text-lg font-semibold mb-4">This area is for NGO partners.</p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center px-5 py-2.5 rounded-full bg-[#1E6B4F] text-white font-medium hover:bg-[#16533D] transition-colors"
        >
          Go to home
        </Link>
      </div>
    );
  }

  return (
    <div className="ck-ngo-landing-page ngo-theme-wrapper min-h-screen transition-colors duration-300">
      <NgoVerifiedWelcomeModal />

      {error ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center" role="alert">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-4">{error}</p>
          <button
            onClick={() => refresh()}
            className="px-5 py-2.5 rounded-full bg-[#1E6B4F] text-white font-medium hover:bg-[#16533D] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : isVerified ? (
        <Suspense fallback={<div className="min-h-screen bg-[#0B3D2E]" />}>
          <PostApprovalLanding status={status} />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="min-h-screen bg-[#0B3D2E]" />}>
          <PreApprovalLanding status={status} />
        </Suspense>
      )}
    </div>
  );
}

export function NgoLandingView() {
  return (
    <Suspense fallback={null}>
      <NgoLandingViewContent />
    </Suspense>
  );
}

export default NgoLandingView;
