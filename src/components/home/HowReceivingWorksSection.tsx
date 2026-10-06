"use client";

import React from "react";
import { PenLine, ShieldCheck, HandHeart, PackageCheck, Plus } from "lucide-react";
import { NewRequestLink } from "@/components/NewRequestLink";
import { DoneeSectionHeading, DONEE_PILL_BUTTON, DONEE_SECTION } from "./DoneeSectionHeading";

const STEPS = [
  { icon: PenLine, title: "Post your need", text: "Tell us exactly what you need and how many." },
  { icon: ShieldCheck, title: "Get verified", text: "Our team checks your details before your request goes live." },
  { icon: HandHeart, title: "A donor offers", text: "Someone nearby offers the exact item you asked for." },
  { icon: PackageCheck, title: "Receive and confirm", text: "Collect the item and mark it as received." },
] as const;

/**
 * Donee landing only: the four steps of receiving help. A horizontal stepper
 * joined by a thin line from `lg` up; a vertical list joined by a rail below.
 */
export function HowReceivingWorksSection() {
  return (
    <section
      id="how-receiving-works"
      aria-labelledby="how-receiving-works-heading"
      data-ck-role-theme="donee"
      className={DONEE_SECTION}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <DoneeSectionHeading id="how-receiving-works-heading" eyebrow="How it works" title="Getting help is simple." />

        <ol className="relative mt-8 sm:mt-12 grid grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-8 max-w-2xl lg:max-w-none">
          {/* Desktop connector: runs between the first and last badge centres. */}
          <span
            aria-hidden="true"
            className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-[var(--ck-role-accent)]/25"
          />
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === STEPS.length - 1;
            return (
              <li key={step.title} className="relative flex gap-4 lg:flex-col lg:items-center lg:text-center lg:gap-0">
                {/* Mobile/tablet rail down to the next badge. */}
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="lg:hidden absolute left-7 top-14 -bottom-6 w-px -translate-x-1/2 bg-[var(--ck-role-accent)]/25"
                  />
                )}
                <div className="relative z-10 shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--ck-role-accent)] text-[var(--ck-role-on-accent)] flex items-center justify-center shadow-md ring-4 ring-[#FAF8F5] dark:ring-[#0E0C0A]">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border border-[var(--ck-role-border)]! text-[11px] font-black text-[var(--ck-role-accent)] flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div className="pt-1.5 lg:pt-5 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                    <span className="sr-only">Step {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-400 leading-relaxed lg:max-w-[16rem] lg:mx-auto">
                    {step.text}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-10 sm:mt-12 flex justify-start lg:justify-center">
          <NewRequestLink href="/requests/new" className={DONEE_PILL_BUTTON}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Post a new need
          </NewRequestLink>
        </div>
      </div>
    </section>
  );
}
