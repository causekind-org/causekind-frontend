"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, RefreshCw } from "lucide-react";

/**
 * Request readiness, rendered as a row inside the profile hero band rather than
 * as a card above it.
 *
 * The band's live ledger states facts about the past in large serif numerals.
 * This states an unfinished obligation, so it borrows the ledger's hairline
 * (`border-t border-white/10`) and its label type — but deliberately not its
 * numerals or its three-column grid, or a donee reads it as a fourth stat and
 * never clicks.
 *
 * Presentational only: the page owns the fetch, so a failed check can be told
 * apart from an incomplete profile.
 */
export function RequestReadinessRail({
  pct, remaining, complete, nextLabel, failed, retrying, onRetry,
}: {
  pct: number;
  remaining: number;
  complete: boolean;
  nextLabel?: string;
  failed: boolean;
  retrying: boolean;
  onRetry: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      data-tour="request-readiness"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      // 0.5 continues the band's hand-tuned cascade; the ledger cells end at 0.4.
      transition={{ duration: 0.5, delay: 0.5 }}
      className="border-t border-white/10 py-4 sm:py-5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="min-w-0 space-y-2">
        <p className="text-4xs sm:text-3xs uppercase tracking-[0.16em] sm:tracking-[0.22em] text-white/60">
          Request readiness
        </p>

        {/* The track is white/15, not the band's white/10 divider token — at 3px
            a meter in the divider's own colour just reads as another rule. The
            glow is what tells them apart on a dark gradient. */}
        <div
          role="progressbar"
          aria-valuenow={failed ? undefined : pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Request readiness"
          className="h-[3px] sm:h-1 w-full max-w-xs sm:max-w-sm overflow-hidden rounded-full bg-white/15"
        >
          <motion.div
            className="h-full origin-left rounded-full bg-[var(--ck-role-highlight,#7fb0e8)] shadow-[0_0_12px_rgba(127,176,232,0.45)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: failed ? 0 : pct / 100 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.9, ease: "easeOut", delay: 0.6 }}
            style={{ width: "100%" }}
          />
        </div>

        {/* Colour is never the only signal — this line says what the meter shows. */}
        <p className="text-2xs sm:text-xs text-white/85">
          {failed ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <span>— Couldn&apos;t check your request readiness.</span>
              <button
                type="button"
                onClick={onRetry}
                disabled={retrying}
                className="inline-flex items-center gap-1 font-semibold text-white/70 underline underline-offset-4 transition-colors hover:text-white disabled:opacity-60"
              >
                <RefreshCw className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} />
                Retry
              </button>
            </span>
          ) : complete ? (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--ck-role-highlight,#7fb0e8)]" />
              Ready to request
            </span>
          ) : (
            <>
              {remaining} item{remaining === 1 ? "" : "s"} left
              {nextLabel && <span className="hidden sm:inline"> · Next: {nextLabel}</span>}
            </>
          )}
        </p>
      </div>

      {/* acc.focusRing is navy and invisible on this gradient, so the ring is white. */}
      <Link
        href="/profile/need-details"
        className="self-start rounded-sm text-2xs sm:text-xs font-bold uppercase tracking-wider text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#132a4c] sm:self-auto sm:shrink-0"
      >
        {complete ? "Review details →" : "Finish setup →"}
      </Link>
    </motion.div>
  );
}
