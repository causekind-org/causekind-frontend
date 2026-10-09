"use client";

import { Suspense } from "react";
import { useNgoStatus } from "./useNgoStatus";
import { PreApprovalLanding } from "./PreApprovalLanding";
import { PostApprovalLanding } from "./PostApprovalLanding";
import { NgoVerifiedWelcomeModal } from "./NgoVerifiedWelcomeModal";
import { AlertCircle } from "lucide-react";

function NgoLandingViewContent() {
  const status = useNgoStatus();

  if (status.isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] dark:bg-[#09090b] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#176B50] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-stone-500 font-medium">Checking your organization status...</p>
      </div>
    );
  }

  if (status.isError) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] dark:bg-[#09090b] flex flex-col items-center justify-center p-4 text-center">
        <div className="text-red-500 mb-4 bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
          <AlertCircle className="w-8 h-8" />
        </div>
        <p className="text-xl font-medium text-stone-900 dark:text-stone-100 mb-2" role="alert">
          {status.error || "We could not load your NGO activity. Please retry."}
        </p>
        <button 
          onClick={() => status.refresh()} 
          className="mt-6 px-6 py-2 bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-full font-medium hover:bg-stone-300 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="ck-ngo-landing-page min-h-screen bg-[#FAF8F3] dark:bg-[#09090b] text-stone-900 dark:text-stone-100 transition-colors duration-300 overflow-x-clip">
      {status.isVerified && <NgoVerifiedWelcomeModal />}

      {status.isVerified ? (
        <PostApprovalLanding status={status} />
      ) : (
        <PreApprovalLanding status={status} />
      )}
    </div>
  );
}

export function NgoLandingView() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF8F3] dark:bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#176B50] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <NgoLandingViewContent />
    </Suspense>
  );
}

export default NgoLandingView;
