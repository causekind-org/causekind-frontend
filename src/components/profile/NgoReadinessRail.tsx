"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface NgoReadinessRailProps {
  pct: number;
  completedCount: number;
  totalSteps?: number;
  isSubmitted: boolean;
  status?: string | null;
  nextStepLabel?: string;
}

/**
 * NGO profile completion progress rail, displayed inside the hero band
 * below the 3-stat counter strip (matching Donee's RequestReadinessRail).
 */
export function NgoReadinessRail({
  pct,
  completedCount,
  totalSteps = 6,
  isSubmitted,
  status,
  nextStepLabel,
}: NgoReadinessRailProps) {
  const reduceMotion = useReducedMotion();

  const isApproved = status === "APPROVED";
  const displayPct = isSubmitted ? 100 : Math.max(0, Math.min(100, pct));
  const remainingSteps = Math.max(0, totalSteps - completedCount);

  return (
    <motion.div
      data-testid="ngo-readiness-rail"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="border-t border-white/10 py-4 sm:py-5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="min-w-0 space-y-2">
        <p className="text-4xs sm:text-3xs uppercase tracking-[0.16em] sm:tracking-[0.22em] text-white/60">
          Complete your profile
        </p>

        {/* Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={displayPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Complete your profile"
          className="h-[3px] sm:h-1 w-full max-w-xs sm:max-w-sm overflow-hidden rounded-full bg-white/15"
        >
          <motion.div
            className="h-full origin-left rounded-full bg-[#4338CA] shadow-[0_0_12px_rgba(67,56,202,0.5)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: displayPct / 100 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.8, ease: "easeOut", delay: 0.5 }
            }
            style={{ width: "100%" }}
          />
        </div>

        {/* Status Line */}
        <p className="text-2xs sm:text-xs text-white/85 flex items-center gap-1.5">
          {isApproved ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified NGO Partner · All requirements met
            </span>
          ) : isSubmitted ? (
            <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Application submitted · Verification in progress
            </span>
          ) : (
            <span>
              {completedCount} of {totalSteps} steps done
              {nextStepLabel ? (
                <span className="hidden sm:inline text-white/60"> · Next: {nextStepLabel}</span>
              ) : remainingSteps > 0 ? (
                <span className="hidden sm:inline text-white/60"> · {remainingSteps} step{remainingSteps === 1 ? "" : "s"} left</span>
              ) : null}
            </span>
          )}
        </p>
      </div>

      {/* Action link */}
      <Link
        href="/profile/ngo-details"
        className="self-start rounded-sm text-2xs sm:text-xs font-bold uppercase tracking-wider text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1b4b] sm:self-auto sm:shrink-0 inline-flex items-center gap-1"
      >
        {isSubmitted ? "View application →" : "Finish setup →"}
      </Link>
    </motion.div>
  );
}
