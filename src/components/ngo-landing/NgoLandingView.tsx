"use client";

import { Suspense, lazy } from "react";
import Link from "next/link";
import { useNgoStatus } from "./useNgoStatus";
import { ErrorIdNote } from "@/components/ErrorIdNote";
import "./ngo-redesign.css";
import { ngoFonts } from "./fonts";

// PreApprovalLanding (guests and unverified NGOs — almost every visitor) is a
// static import on purpose. As a lazy() it became its own streamed Suspense
// boundary: the server sent an empty green fallback first and the real hero in
// a hidden block revealed only after the rest of the page streamed (+ React's
// reveal throttle). Measured on live /ngo, 26 Nov: load 2.6 s, hero LCP 5.4 s
// (Lighthouse: hero downloaded in 240 ms, painted 3.4 s later).
// PostApprovalLanding is only for verified NGOs, so it can stay split out.
import PreApprovalLanding from "./PreApprovalLanding";
const PostApprovalLanding = lazy(() => import("./PostApprovalLanding"));

function NgoLandingViewContent() {
  const status = useNgoStatus();
  const { isVerified, isLoading, error, errorId, refresh, viewer } = status;

  // Donors and donees get no NGO status, CTAs or NGO API calls (useNgoStatus skips them).
  if (viewer === "other" && !isLoading) {
    return (
      <div className={`${ngoFonts} ck-ngo-landing-page ngo-theme-wrapper min-h-[60vh] flex flex-col items-center justify-center p-8 text-center`}>
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
    <div className={`${ngoFonts} ck-ngo-landing-page ngo-theme-wrapper min-h-screen transition-colors duration-300`}>

      {error ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center" role="alert">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-4">{error}</p>
          <div className="mb-4"><ErrorIdNote id={errorId} /></div>
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
        <PreApprovalLanding status={status} />
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
