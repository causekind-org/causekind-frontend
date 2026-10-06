import React, { useEffect } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { WhoAreWeSection } from "@/components/home/WhoAreWeSection";
import { SupportGallery } from "@/components/home/supportGallery/SupportGallery";
import { LiveNeedsSection } from "@/components/home/LiveNeedsSection";
import { TrustSafetySection } from "@/components/home/TrustSafetySection";
import { FoundersNoteSection } from "@/components/home/FoundersNoteSection";
import { GoogleReviewsSection } from "@/components/home/GoogleReviewsSection";
import { DonorTwoDoors } from "@/components/home/DonorTwoDoors";
import { WhoAreWeDesktop } from "@/components/home/desktop/WhoAreWeDesktop";
import { CreditsSection } from "@/components/home/CreditsSection";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { PublicItemRequest, PlatformStats } from "@/lib/api";

export function RoleHome({ 
  role,
  initialPublicRequests,
  stats
}: { 
  role: "donor" | "donee",
  initialPublicRequests?: PublicItemRequest[],
  stats?: PlatformStats | null
}) {
  useEffect(() => {
    // Refresh ScrollTrigger when RoleHome mounts
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);
  }, []);

  return (
    <div className={`ck-role-desktop-${role} relative z-10 w-full`}>
      <HeroSection />
      {/* Donees get the main page's About layout in the donee blue. */}
      {role === "donee" ? <WhoAreWeDesktop variant="donee" /> : <WhoAreWeSection />}
      {role === "donor" && <SupportGallery />}
      {/* The live needs board is for givers; a donee is shown no one else's needs. */}
      {role === "donor" && (
        <div className="ck-home-paper relative z-10">
          <LiveNeedsSection initialRequests={initialPublicRequests} stats={stats} />
        </div>
      )}
      <TrustSafetySection variant="desktop" />
      <FoundersNoteSection variant="desktop" />
      <GoogleReviewsSection />
      {role === "donor" && <DonorTwoDoors />}
      {role === "donee" && <CreditsSection variant="donee" />}
    </div>
  );
}
