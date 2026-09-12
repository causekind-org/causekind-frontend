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
  /* `overflow-x-clip`, never `overflow-x-hidden` — the same rule HomeClient
     states at its own wrapper, and for a sharper reason here. CSS will not let
     a box be `hidden` across and `visible` down, so `hidden` computes
     `overflow-y: auto` and makes this a scroll container; a scroll container
     clips whatever a negative margin pulls above its top edge, and MoneyHero is
     pulled up by the full nav height so its photograph can run under the
     floating bar. `hidden` therefore ate exactly that strip and painted cream
     across the top of the hero. `clip` leaves `overflow-y: visible` alone.

     Still needed rather than simply dropped: the allocation cards in
     TrustCredibility and AboutSahas enter with `initial={{ x: 30 }}`, so until
     `whileInView` fires they sit 30px right of their own box — about 14px past
     a 390px viewport. That is a bleed to clip, not a layout to fix. */
  return (
    <div className="money-donate-ganpati relative min-h-screen bg-[#fffbf5] dark:bg-[#1a0b04] overflow-x-clip">
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

