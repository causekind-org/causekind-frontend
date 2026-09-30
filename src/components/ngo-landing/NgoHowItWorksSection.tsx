"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  FileCheck2,
  Megaphone,
  Sparkles,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { useNgoStatus } from "./useNgoStatus";
import { NgoSectionLabel } from "./NgoSectionLabel";
import { TrueFocus } from "./TrueFocus";

export function NgoHowItWorksSection() {
  const { status, isVerified, canPostRequest } = useNgoStatus();
  const [activeFocusIndex, setActiveFocusIndex] = useState(0);

  // NGO Steps definitions
  const steps = [
    {
      num: "1",
      icon: FileCheck2,
      title: "Get verified",
      desc: "Submit your legal registration documents once. File checks support a review by our team.",
    },
    {
      num: "2",
      icon: Megaphone,
      title: "Post what you need",
      desc: "Describe the items, quantity and intended use. Our team reviews your need before looking for nearby donor matches.",
    },
    {
      num: "3",
      icon: Sparkles,
      title: "Deliver, then prove it",
      desc: "Confirm receipt and upload a handover photo. Certificate eligibility follows the completed handover checks.",
    },
  ];

  // CTA href and label
  let ctaHref = "/profile/ngo-details";
  let ctaLabel = "Complete Verification →";

  if (isVerified) {
    ctaHref = "/ngo/requests/new";
    ctaLabel = "Post a Request →";
  } else if (status === "under_review") {
    ctaHref = "/profile/ngo-details";
    ctaLabel = "View Application Status →";
  } else if (status === "changes_requested") {
    ctaHref = "/profile/ngo-details";
    ctaLabel = "Fix Verification Documents →";
  }

  return (
    <section className="relative overflow-hidden py-16 sm:py-24 text-stone-900 dark:text-stone-100">
      {/* Background bleed connecting to Section 6 */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(238,248,242,0.3) 0%, rgba(247,240,232,0.4) 100%)",
        }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center max-w-3xl mx-auto"
        >
          <NgoSectionLabel align="center">For NGOs and trusts</NgoSectionLabel>

          <div className="mt-1 flex justify-center">
            <TrueFocus
              items={["Get verified.", "Post.", "Deliver."]}
              isVerified={isVerified}
              onFocusChange={setActiveFocusIndex}
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-50 leading-tight"
              style={{ fontFamily: "var(--font-source-serif-4), var(--font-lora), serif" }}
            />
          </div>
          <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400 mt-2 max-w-xl mx-auto">
            From legal verification to community handovers, here is how CauseKind supports your mission.
          </p>
        </motion.div>

        {/* Single-Track NGO Workflow Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-ngo-300/60 bg-gradient-to-b from-white/95 via-ngo-50/40 to-white/95 dark:from-zinc-900/95 dark:via-ngo-950/20 dark:to-zinc-900/95 p-6 sm:p-10 shadow-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isStep1 = idx === 0;
              const isStep2or3 = idx > 0;

              // Independent, combinable state flags
              const isStep1Complete = isStep1 && isVerified;
              const isStep1UnderReview = isStep1 && status === "under_review";
              const isStep1IncompleteCurrent = isStep1 && (status === "incomplete" || status === "changes_requested");

              const isCurrent = isStep1IncompleteCurrent || (isVerified && isStep2or3);
              const isCompleted = isStep1Complete;
              const isUnderReview = isStep1UnderReview;
              const isFocused = activeFocusIndex === idx;

              // Dynamic combinable styling
              let cardStateClasses = "border-stone-200/80 dark:border-zinc-800 shadow-none translate-y-0 bg-stone-50/60 dark:bg-zinc-800/40 ring-0";

              if (isFocused) {
                // Focus highlight wins the border and lift while preserving internal badges
                cardStateClasses = "border-ngo-700 dark:border-ngo-500 shadow-xl -translate-y-1 bg-ngo-50/90 dark:bg-ngo-950/50 ring-2 ring-ngo-700/20 dark:ring-ngo-500/20";
              } else if (isCurrent) {
                cardStateClasses = "border-ngo-500/50 dark:border-ngo-500/40 shadow-lg translate-y-0 bg-white dark:bg-zinc-850 ring-2 ring-ngo-500/20";
              } else if (isCompleted) {
                cardStateClasses = "border-emerald-300 dark:border-emerald-800 shadow-sm translate-y-0 bg-emerald-50/50 dark:bg-emerald-950/20 ring-0";
              } else if (isUnderReview) {
                cardStateClasses = "border-amber-300 dark:border-amber-800 shadow-sm translate-y-0 bg-amber-50/30 dark:bg-amber-950/20 ring-0";
              }

              return (
                <div
                  key={step.num}
                  data-step={step.num}
                  data-current={isCurrent ? "true" : "false"}
                  data-focused={isFocused ? "true" : "false"}
                  data-completed={isCompleted ? "true" : "false"}
                  className={`rounded-2xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between border-2 ${cardStateClasses}`}
                >
                  <div>
                    {/* Step badge & status */}
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono font-black text-sm shadow-sm transition-colors duration-300 ${
                          isCompleted
                            ? "bg-emerald-600 text-white"
                            : isCurrent || isFocused
                            ? "bg-ngo-700 text-white shadow-ngo-700/30"
                            : isUnderReview
                            ? "bg-amber-500 text-white"
                            : "bg-stone-200 dark:bg-zinc-700 text-stone-700 dark:text-stone-300"
                        }`}
                      >
                        {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : step.num}
                      </div>

                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-4xs font-bold text-emerald-800 dark:text-emerald-300">
                          <Check className="w-3 h-3" /> Completed
                        </span>
                      )}

                      {isUnderReview && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-4xs font-bold text-amber-800 dark:text-amber-300">
                          <Clock className="w-3 h-3 animate-spin" /> In review…
                        </span>
                      )}

                      {isStep1IncompleteCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ngo-100 dark:bg-ngo-900/60 px-2.5 py-0.5 text-4xs font-bold text-ngo-800 dark:text-ngo-200">
                          Current Step
                        </span>
                      )}

                      {isVerified && isStep2or3 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ngo-100 dark:bg-ngo-900/60 px-2.5 py-0.5 text-4xs font-bold text-ngo-800 dark:text-ngo-200">
                          Unlocked ✓
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2 mb-2">
                      <span>{step.title}</span>
                      <Icon className="w-4 h-4 text-ngo-700 dark:text-ngo-300 shrink-0" />
                    </h3>

                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="mt-8 pt-6 border-t border-stone-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 text-center sm:text-left">
              {isVerified
                ? "Your organization is verified. Post a request to reach donors nearby."
                : status === "under_review"
                ? "Your documents are currently being checked by our team."
                : "Complete your 6-step registration to start receiving in-kind gifts."}
            </p>

            <Link
              href={ctaHref}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-ngo-700 hover:bg-ngo-600 active:bg-ngo-800 text-white font-bold px-7 py-3 text-xs sm:text-sm shadow-lg shadow-ngo-700/25 transition-all duration-200"
            >
              <span>{ctaLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

export default NgoHowItWorksSection;
