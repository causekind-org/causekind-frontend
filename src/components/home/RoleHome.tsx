import React, { useEffect } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { SupportGallery } from "@/components/home/supportGallery/SupportGallery";
import { LiveNeedsSection } from "@/components/home/LiveNeedsSection";
import { TrustSafetySection } from "@/components/home/TrustSafetySection";
import { FoundersNoteSection } from "@/components/home/FoundersNoteSection";
import { GoogleReviewsSection } from "@/components/home/GoogleReviewsSection";
import { DonorTwoDoors } from "@/components/home/DonorTwoDoors";
import { WhoAreWeDesktop } from "@/components/home/desktop/WhoAreWeDesktop";
import { CreditsSection } from "@/components/home/CreditsSection";
import { HowReceivingWorksSection } from "@/components/home/HowReceivingWorksSection";
import { MyRequestsSection } from "@/components/home/MyRequestsSection";
import { HandoverTipsSection } from "@/components/home/HandoverTipsSection";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { PublicItemRequest, PlatformStats } from "@/lib/api";

export function RoleHome({ 
  role,
  initialPublicRequests,
  stats,
  hero,
}: { 
  role: "donor" | "donee",
  initialPublicRequests?: PublicItemRequest[],
  stats?: PlatformStats | null,
  /** Donee only: the hero to render, so phones keep their own (cinematic) one. */
  hero?: React.ReactNode,
}) {
  useEffect(() => {
    // Refresh ScrollTrigger when RoleHome mounts
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);
  }, []);

  if (role === "donee") return <DoneeHome hero={hero} />;

  return (
    <div className={`ck-role-desktop-${role} relative z-10 w-full`}>
      <HeroSection />
      {/* The main page's About (flip cards), in the default donor colours. */}
      <WhoAreWeDesktop />
      <SupportGallery />
      <div className="ck-home-paper relative z-10">
        <LiveNeedsSection initialRequests={initialPublicRequests} stats={stats} />
      </div>
      <TrustSafetySection variant="desktop" />
      <FoundersNoteSection variant="desktop" />
      <GoogleReviewsSection />
      <DonorTwoDoors />
      <CreditsSection />
    </div>
  );
}

/**
 * The donee landing page, at every width. The order is fixed by design:
 * hero, about, how receiving works, my requests, trust & safety, handover
 * tips, founder's note, reviews, the people behind CauseKind. Accents are the
 * donee blue throughout; no live needs board (a donee is shown no one else's
 * needs).
 */
function DoneeHome({ hero }: { hero?: React.ReactNode }) {
  return (
    <div className="ck-role-desktop-donee relative z-10 w-full">
      {hero ?? <HeroSection />}
      <WhoAreWeDesktop variant="donee" />
      <HowReceivingWorksSection />
      <MyRequestsSection />
      <div className="hidden lg:block">
        <TrustSafetySection variant="desktop" tone="donee" seamless />
      </div>
      <div className="lg:hidden">
        <TrustSafetySection variant="mobile" tone="donee" seamless />
      </div>
      <HandoverTipsSection />
      <div className="hidden lg:block">
        <FoundersNoteSection variant="desktop" tone="donee" seamless />
      </div>
      <div className="lg:hidden">
        <FoundersNoteSection variant="mobile" tone="donee" seamless />
      </div>
      <GoogleReviewsSection />
      <CreditsSection variant="donee" />
    </div>
  );
}
