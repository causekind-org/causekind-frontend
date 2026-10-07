"use client";

import { Suspense } from "react";
import { NgoHeroSection } from "./NgoHeroSection";
import { NgoGlanceStrip } from "./NgoGlanceStrip";
import { NgoProblemSolutionSection } from "./NgoProblemSolutionSection";
import { NgoTransparencySection } from "./NgoTransparencySection";
import { NgoTrustSection } from "./NgoTrustSection";
import { NgoHowItWorksSection } from "./NgoHowItWorksSection";
import { CreditsSection } from "@/components/home/CreditsSection";
import { NgoVerifiedWelcomeModal } from "./NgoVerifiedWelcomeModal";

function NgoLandingViewContent() {
  return (
    <div className="ck-ngo-landing-page min-h-screen bg-[#FBF9F4] dark:bg-[#09090b] text-stone-900 dark:text-stone-100 transition-colors duration-300 overflow-x-clip">
      {/* VERIFIED WELCOME MOMENT (shown once on first visit after verification) */}
      <NgoVerifiedWelcomeModal />

      {/* SECTION 1 — HERO (Contains Image Wall, Category Pill Bar, and Restyled Trust Card) */}
      <NgoHeroSection />

      {/* "YOUR NGO AT A GLANCE" STRIP (verified ONLY, directly under hero) */}
      <NgoGlanceStrip />

      {/* SECTION 2 — PROBLEM / SOLUTION (before verification ONLY) */}
      <NgoProblemSolutionSection />

      {/* SECTION 3 — TRANSPARENCY (Gift Journey Tracker + Live Stats + Live Ticker + What Great Proof Looks Like) */}
      <NgoTransparencySection />

      {/* SECTION 4 — TRUST (Trust Grid before verification + Dynamic Scorecard) */}
      <NgoTrustSection />

      {/* SECTION 5 — HOW IT WORKS (For NGOs and trusts / True Focus headline + 3 Step Cards + CTA) */}
      <NgoHowItWorksSection />

      {/* The people behind CauseKind: same credit as the public home page. */}
      <CreditsSection />

      {/* SECTION 6 — COMMUNITY REVIEWS (Trusted by Givers and NGOs Marquee - last section before footer) */}
      {/* Publish testimonials only when sourced and approved for use. */}
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
