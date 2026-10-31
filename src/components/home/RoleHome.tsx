import React, { useEffect } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { DiwaliCampaigns } from "@/components/home/DiwaliCampaigns";
import { DiwaliSeam } from "@/components/home/DiwaliMobileLayer";
import { SupportGallery } from "@/components/home/supportGallery/SupportGallery";
import { LiveNeedsSection } from "@/components/home/LiveNeedsSection";
import { NgoDrivesSection } from "@/features/ngo-drives/components/NgoDrivesSection";
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
      <DiwaliCampaigns />
      <DiwaliSeam kind="edge" from="butter" to="crimson" />
      <DiwaliSeam kind="arch-bulbs" from="crimson" lanterns="right" />
      {/* The main page's About (flip cards), in the default donor colours. */}
      <WhoAreWeDesktop />
      <DiwaliSeam kind="diya" diyas={3} />
      <DiwaliSeam kind="line" />
      <SupportGallery />
      <DiwaliSeam kind="line" webLanterns="right" art="oval" />
      <div className="ck-home-paper relative z-10">
        <LiveNeedsSection initialRequests={initialPublicRequests} stats={stats} />
      </div>
      <div className="ck-home-paper relative z-10">
        <NgoDrivesSection />
      </div>
      <DiwaliSeam kind="arch-step" to="butter" lanterns="both" />
      <TrustSafetySection variant="desktop" />
      <DiwaliSeam kind="diya" from="butter" to="butter" diyas={3} />
      <DiwaliSeam kind="line" from="butter" webLanterns="both" art="kandil" />
      <FoundersNoteSection variant="desktop" />
      <DiwaliSeam kind="edge" from="butter" />
      <div data-dw-panel>
        <GoogleReviewsSection />
      </div>
      <DonorTwoDoors />
      <CreditsSection />
      <DiwaliSeam kind="edge" to="night" />
      <DiwaliSeam kind="lotus" from="night" to="night" />
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
      <DiwaliSeam kind="edge" from="night" to="crimson" />
      <DiwaliSeam kind="arch-bulbs" from="crimson" lanterns="right" />
      <WhoAreWeDesktop variant="donee" />
      <DiwaliSeam kind="edge" to="butter" />
      <HowReceivingWorksSection />
      <DiwaliSeam kind="edge" from="butter" />
      <MyRequestsSection />
      <DiwaliSeam kind="arch-step" to="butter" lanterns="both" />
      <div className="hidden lg:block">
        <TrustSafetySection variant="desktop" tone="donee" seamless />
      </div>
      <div className="lg:hidden">
        <TrustSafetySection variant="mobile" tone="donee" seamless />
      </div>
      <DiwaliSeam kind="edge" from="butter" />
      <HandoverTipsSection />
      <DiwaliSeam kind="edge" to="butter" />
      <DiwaliSeam kind="line" from="butter" webLanterns="both" art="kandil" />
      <div className="hidden lg:block">
        <FoundersNoteSection variant="desktop" tone="donee" seamless />
      </div>
      <div className="lg:hidden">
        <FoundersNoteSection variant="mobile" tone="donee" seamless />
      </div>
      <DiwaliSeam kind="edge" from="butter" />
      <div data-dw-panel>
        <GoogleReviewsSection />
      </div>
      <CreditsSection variant="donee" />
      <DiwaliSeam kind="edge" to="night" />
      <DiwaliSeam kind="lotus" from="night" to="night" />
    </div>
  );
}
