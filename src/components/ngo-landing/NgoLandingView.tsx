"use client";

import { Suspense } from "react";
import { useNgoStatus } from "./useNgoStatus";
import { PreApprovalLanding } from "./PreApprovalLanding";
import { PostApprovalLanding } from "./PostApprovalLanding";
import { NgoVerifiedWelcomeModal } from "./NgoVerifiedWelcomeModal";
import { AlertCircle } from "lucide-react";
import "./ngo-redesign.css";
import { useEffect } from "react";

function NgoLandingViewContent() {
  const status = useNgoStatus();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("theme") === "dark") {
        document.documentElement.classList.add("dark");
      } else if (params.get("theme") === "light") {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const isDarkQuery = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("theme") === "dark";

  if (status.isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F1E4] dark:bg-[#071A13] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2F8F5B] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#10231B] dark:text-[#EFEADB] font-medium opacity-75">Checking your organization status...</p>
      </div>
    );
  }

  if (status.isError) {
    return (
      <div className="min-h-screen bg-[#F6F1E4] dark:bg-[#071A13] flex flex-col items-center justify-center p-4 text-center">
        <div className="text-red-500 mb-4 bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
          <AlertCircle className="w-8 h-8" />
        </div>
        <p className="text-xl font-medium text-[#10231B] dark:text-[#EFEADB] mb-2" role="alert">
          {status.error || "We could not load your NGO activity. Please retry."}
        </p>
        <button
          onClick={() => status.refresh()}
          className="mt-6 px-6 py-2 bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-full font-medium hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`ck-ngo-landing-page ngo-theme-wrapper min-h-screen transition-colors duration-300 ${isDarkQuery ? "dark" : ""}`}>
      {status.isVerified && (
        <NgoVerifiedWelcomeModal
          isVerified={status.isVerified}
          hasShownWelcome={status.hasShownWelcome}
          markWelcomeShown={status.markWelcomeShown}
        />
      )}

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
      <div className="min-h-screen bg-[#F6F1E4] dark:bg-[#071A13] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2F8F5B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <NgoLandingViewContent />
    </Suspense>
  );
}

export default NgoLandingView;
