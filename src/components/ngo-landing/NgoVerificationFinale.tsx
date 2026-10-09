"use client";

import React from "react";
import { Reveal } from "./motion/Reveal";
import { MagneticButton } from "./motion/MagneticButton";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import type { NgoStatusType } from "./useNgoStatus";

export function NgoVerificationFinale({ status, wizardHref }: { status: NgoStatusType, wizardHref: string }) {
  const getPrimaryCta = () => {
    switch (status) {
      case "under_review": return { label: "View application status", href: "/profile/ngo-details" };
      case "changes_requested": return { label: "Fix your documents", href: "/profile/ngo-details" };
      case "incomplete":
      default: return { label: "Start your application", href: wizardHref };
    }
  };

  const primaryCta = getPrimaryCta();

  return (
    <section className="py-32 bg-white dark:bg-black relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <Reveal>
          <h2 className="text-5xl md:text-7xl font-serif font-bold mb-6 tracking-tight">
            Get verified. <span className="text-[var(--color-ngo-500)] italic">Post.</span> Deliver.
          </h2>
          <p className="text-xl text-stone-600 dark:text-stone-400 mb-12 max-w-2xl mx-auto">
            Join hundreds of trusted NGOs already receiving verified items from givers in their city. 
          </p>
        </Reveal>

        <Reveal delay={0.2} className="mb-16">
          <div className="inline-flex flex-col md:flex-row items-center gap-8 bg-stone-50 dark:bg-zinc-900/50 p-8 rounded-3xl border border-stone-200 dark:border-zinc-800 text-left">
            <div>
              <h4 className="font-bold mb-4 flex items-center gap-2"><CheckCircle2 className="text-[var(--color-ngo-500)]" /> Keep these ready:</h4>
              <ul className="space-y-2 text-sm text-stone-600 dark:text-stone-400 font-medium">
                <li>• Registration Certificate</li>
                <li>• Authorization Letter</li>
                <li>• Office & Activity Photos</li>
              </ul>
            </div>
            <div className="w-px h-24 bg-stone-200 dark:bg-zinc-800 hidden md:block"></div>
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-[var(--color-ngo-600)] mb-2">
                <Clock className="w-5 h-5" />
                <span className="font-bold">Takes ~15 minutes</span>
              </div>
              <p className="text-sm text-stone-500">You can save your progress and<br/>return later.</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.4}>
          <div className="inline-block relative">
            <MagneticButton className="bg-[var(--color-ngo-500)] text-white hover:bg-[var(--color-ngo-600)] h-16 px-12 text-lg rounded-full font-bold shadow-xl shadow-[var(--color-ngo-500)]/20 flex items-center justify-center cursor-pointer" onClick={() => window.location.href = primaryCta.href}>
              {primaryCta.label}
            </MagneticButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
