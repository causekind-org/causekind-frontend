"use client";

import { MoneyHero } from "@/components/money-donation/MoneyHero";
import { MoneyFlowStory } from "@/components/money-donation/MoneyFlowStory";
import { MoneyDonationForm } from "@/components/money-donation/MoneyDonationForm";
import { AboutSahas } from "@/components/money-donation/AboutSahas";
import { ImpactCarousel } from "@/components/money-donation/ImpactCarousel";
import { TrustCredibility } from "@/components/money-donation/TrustCredibility";

/**
 * The monetary donation portal for Sahas Charitable Trust.
 */
export default function MoneyDonateClient() {
  return (
    <div className="relative min-h-screen bg-[#fffbf5] dark:bg-[#1a0b04]">
      <MoneyHero />
      {/* "See Sahas in Action" — the impact videos, second on the page at
          Sushil's request: proof of the work lands immediately after the hero,
          before the page explains how the money moves.

          Worth knowing when tuning this page: it is the heaviest section on the
          site (~47 MB fetched once it scrolls into view, from raw uncompressed
          WhatsApp exports), and at position two nearly every visitor now pays
          that cost rather than only those who scroll past the form. Compressing
          the files in public/videos is the fix, not moving the section. */}
      <ImpactCarousel />
      <MoneyFlowStory />
      <MoneyDonationForm />
      <AboutSahas />
      <TrustCredibility />
    </div>
  );
}

