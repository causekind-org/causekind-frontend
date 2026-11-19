"use client";

import { ArrowRight, Check } from "lucide-react";

import Link from "@/components/AppLink";
import { LandingText } from "@/components/LandingTranslation";

const ITEMS = [
  "Pick a real request from someone nearby",
  "Hand it over; they confirm with a one-time code",
  "Get a certificate anyone can verify by QR",
];
const MONEY = [
  "Every fundraiser is reviewed before it goes public",
  "See how much is raised and what it pays for",
  "Updates from the organiser as the money is used",
];

/**
 * About CauseKind — "Two ways to give" (layout C of the "About CauseKind Section
 * Layouts" canvas, owner's pick 2026-11-16). Replaces the orbit section on the
 * public and donor home pages; the donee variant of WhoAreWeDesktop is unchanged.
 */
export function AboutTwoWays() {
  return (
    <section id="about-causekind" aria-labelledby="about-causekind-h"
      className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-20 text-[#1c1917] dark:text-stone-100">
      <div className="flex max-w-3xl flex-col gap-3">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-[#b04a15] dark:text-[#ff8a4c]">
          <LandingText>About CauseKind</LandingText>
        </span>
        <h2 id="about-causekind-h" className="m-0 [font-family:var(--font-source-serif-4),Georgia,serif] text-3xl font-semibold tracking-[-0.03em] leading-[1.1] sm:text-[44px]">
          <LandingText>A free place to give</LandingText>{" "}
          <em className="text-[#b04a15] dark:text-[#ff8a4c]"><LandingText>things or money</LandingText></em>{" "}
          <LandingText>to verified people near you.</LandingText>
        </h2>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        <article className="flex flex-col gap-4 rounded-3xl border border-[#ece4da] bg-white p-7 sm:p-9 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="w-fit rounded-full bg-[#f6e7dc] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#8f3a0f] dark:bg-[#b04a15]/25 dark:text-[#ffb08a]">
            <LandingText>Give items</LandingText>
          </span>
          <h3 className="m-0 [font-family:var(--font-source-serif-4),Georgia,serif] text-2xl font-semibold tracking-[-0.02em] sm:text-[28px]">
            <LandingText>Books, clothes, furniture, electronics</LandingText>
          </h3>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px] leading-relaxed text-stone-700 sm:text-base dark:text-stone-300">
            {ITEMS.map((line) => (
              <li key={line} className="flex gap-2.5">
                <Check className="mt-1 size-4 shrink-0 text-[#b04a15] dark:text-[#ff8a4c]" aria-hidden="true" />
                <LandingText>{line}</LandingText>
              </li>
            ))}
          </ul>
          <Link href="/requests"
            className="mt-auto inline-flex min-h-[50px] w-fit items-center rounded-xl bg-[#b04a15] px-6 font-bold text-white no-underline hover:bg-[#933c10]">
            <LandingText>See live needs</LandingText>
          </Link>
        </article>

        <article className="flex flex-col gap-4 rounded-3xl bg-[#1c1917] p-7 text-[#f5f0e8] sm:p-9 dark:border dark:border-zinc-800 dark:bg-black">
          <span className="w-fit rounded-full bg-[#f4a25b] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#1c1917]">
            <LandingText>Give money</LandingText>
          </span>
          <h3 className="m-0 [font-family:var(--font-source-serif-4),Georgia,serif] text-2xl font-semibold tracking-[-0.02em] text-white sm:text-[28px]">
            <LandingText>Verified fundraisers and community campaigns</LandingText>
          </h3>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px] leading-relaxed text-stone-300 sm:text-base">
            {MONEY.map((line) => (
              <li key={line} className="flex gap-2.5">
                <Check className="mt-1 size-4 shrink-0 text-[#f4a25b]" aria-hidden="true" />
                <LandingText>{line}</LandingText>
              </li>
            ))}
          </ul>
          <Link href="/fundraisers"
            className="mt-auto inline-flex min-h-[50px] w-fit items-center rounded-xl bg-[#f4a25b] px-6 font-bold text-[#1c1917] no-underline hover:bg-[#f7b57a]">
            <LandingText>See fundraisers</LandingText>
          </Link>
        </article>
      </div>

      <Link href="/about"
        className="mt-6 inline-flex min-h-[44px] items-center gap-1.5 font-bold text-[#b04a15] no-underline hover:underline dark:text-[#ff8a4c]">
        <LandingText>Know more about CauseKind</LandingText>
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
