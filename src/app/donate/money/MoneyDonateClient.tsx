"use client";

import { MoneyHero } from "@/components/money-donation/MoneyHero";
import { MoneyFlowStory } from "@/components/money-donation/MoneyFlowStory";
import { ImpactCarousel } from "@/components/money-donation/ImpactCarousel";
import { MoneyDonationForm } from "@/components/money-donation/MoneyDonationForm";
import { AboutSahas } from "@/components/money-donation/AboutSahas";
import { TrustCredibility } from "@/components/money-donation/TrustCredibility";
import { RangoliBorderStrip } from "@/components/home/GanpatiVisuals";

/**
 * The monetary donation portal for Sahas Charitable Trust.
 *
 * Scoped with .money-donate-ganpati to apply the Ganpati festival visual theme
 * exclusively to this route without altering shared components or other pages.
 */
export default function MoneyDonateClient() {
  return (
    <div className="money-donate-ganpati relative min-h-screen bg-[#fffbf5] dark:bg-[#1a0b04] overflow-x-hidden">
      {/* Subtle repeating festive background pattern (3-4% opacity) behind sections below hero */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[100vh] bottom-0 z-0 opacity-[0.035] dark:opacity-[0.05] select-none bg-[radial-gradient(#ea580c_1px,transparent_1px)] [background-size:28px_28px]"
        aria-hidden="true"
      />
      <MoneyHero />
      <RangoliBorderStrip className="relative z-10" />
      <MoneyFlowStory />
      <RangoliBorderStrip className="relative z-10" />
      {/* Restored after the Ganpati rework dropped it. It is the only proof on
          the page — real photographs of the work being funded — and it earns the
          slot directly before the form, where it is the last thing read before
          the amount buttons. The component was never deleted, only unmounted. */}
      <ImpactCarousel />
      <RangoliBorderStrip className="relative z-10" />
      <MoneyDonationForm />
      <RangoliBorderStrip className="relative z-10" />
      <AboutSahas />
      <RangoliBorderStrip className="relative z-10" />
      <TrustCredibility />
    </div>
  );
}

