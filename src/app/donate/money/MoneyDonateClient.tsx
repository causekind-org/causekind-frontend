"use client";

import { FEATURES } from "@/lib/features";
import { ComingSoon } from "@/components/ComingSoon";
import { MoneyHero } from "@/components/money-donation/MoneyHero";
import { MoneyFlowStory } from "@/components/money-donation/MoneyFlowStory";
import { MoneyDonationForm } from "@/components/money-donation/MoneyDonationForm";
import { AboutSahas } from "@/components/money-donation/AboutSahas";
import { TrustCredibility } from "@/components/money-donation/TrustCredibility";

/**
 * The monetary donation portal for Sahas Charitable Trust.
 *
 * <p><b>Gated on `FEATURES.money`, like every other money surface.</b> Monetary
 * donations are postponed per the In-Kind Donation Blueprint, so this renders
 * the same {@link ComingSoon} screen `/donate` and `/campaigns` do until that
 * flag is flipped. The page below is complete and reviewable locally by
 * flipping it; nothing here is reachable by a visitor while it is false.
 *
 * <p>Section order is the author's: the hero states the promise, the flow story
 * answers "where does my money actually go", the form asks for the money only
 * after that has been answered, and the trust/credentials material backs it up
 * last for anyone still deciding.
 */
export default function MoneyDonateClient() {
  if (!FEATURES.money) return <ComingSoon feature="donate" />;

  return (
    <>
      <MoneyHero />
      <MoneyFlowStory />
      <MoneyDonationForm />
      <AboutSahas />
      <TrustCredibility />
    </>
  );
}
