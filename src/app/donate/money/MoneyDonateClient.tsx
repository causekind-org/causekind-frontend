"use client";

import { MoneyHero } from "@/components/money-donation/MoneyHero";
import { MoneyFlowStory } from "@/components/money-donation/MoneyFlowStory";
import { MoneyDonationForm } from "@/components/money-donation/MoneyDonationForm";
import { AboutSahas } from "@/components/money-donation/AboutSahas";
import { TrustCredibility } from "@/components/money-donation/TrustCredibility";
import SectionDivider from "@/components/SectionDivider";

/**
 * The monetary donation portal for Sahas Charitable Trust.
 *
 * Publicly accessible to guests and signed-in visitors, independently of the
 * campaign fundraising feature flag.
 *
 * <p>Section order is the author's: the hero states the promise, the flow story
 * answers "where does my money actually go", the form asks for the money only
 * after that has been answered, and the trust/credentials material backs it up
 * last for anyone still deciding.
 */
export default function MoneyDonateClient() {
  return (
    <>
      <MoneyHero />
      <SectionDivider />
      <MoneyFlowStory />
      <SectionDivider />
      <MoneyDonationForm />
      <SectionDivider />
      <AboutSahas />
      <SectionDivider />
      <TrustCredibility />
    </>
  );
}
