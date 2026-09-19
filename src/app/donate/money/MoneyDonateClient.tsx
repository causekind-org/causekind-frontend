"use client";

import { MoneyHero } from "@/components/money-donation/MoneyHero";
import { MoneyFlowStory } from "@/components/money-donation/MoneyFlowStory";
import { MoneyDonationForm } from "@/components/money-donation/MoneyDonationForm";
import { AboutSahas } from "@/components/money-donation/AboutSahas";
import { ImpactCarousel } from "@/components/money-donation/ImpactCarousel";
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
    <div className="money-donate-ganpati relative min-h-screen bg-[#fffbf5] dark:bg-[#1a0b04]">
      {/* Subtle repeating festive background pattern (3-4% opacity) behind sections below hero */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[100vh] bottom-0 z-0 opacity-[0.035] dark:opacity-[0.05] select-none bg-[radial-gradient(#ea580c_1px,transparent_1px)] [background-size:28px_28px]"
        aria-hidden="true"
      />
      <MoneyHero />
      <RangoliBorderStrip className="relative z-10" />
      {/* "See Sahas in Action" — the impact videos, second on the page at
          Sushil's request: proof of the work lands immediately after the hero,
          before the page explains how the money moves.

          Worth knowing when tuning this page: it is the heaviest section on the
          site (~47 MB fetched once it scrolls into view, from raw uncompressed
          WhatsApp exports), and at position two nearly every visitor now pays
          that cost rather than only those who scroll past the form. Compressing
          the files in public/videos is the fix, not moving the section. */}
      <ImpactCarousel />
      <RangoliBorderStrip className="relative z-10" />
      <MoneyFlowStory />
      <RangoliBorderStrip className="relative z-10" />
      <MoneyDonationForm />
      <RangoliBorderStrip className="relative z-10" />
      <AboutSahas />
      <RangoliBorderStrip className="relative z-10" />
      <TrustCredibility />
    </div>
  );
}

