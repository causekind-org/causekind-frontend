"use client";

import { Check, CircleDot, TriangleAlert, X } from "lucide-react";
import { JOURNEY_STEPS, journeyIndex, type HandoverState } from "./model";

/**
 * Horizontal progress rail.
 *
 * <p>Status is never carried by colour alone: every step has a label, and the
 * current/complete/halted distinction is also an icon and an `aria-current`. That
 * matters here more than usual — the two role themes are terracotta and navy, and
 * a red/green-blind user reading "is this done?" from hue alone would be guessing.
 *
 * <p>The connector fill is a scaleX transform (see `.handover-rail-fill` in
 * styles.css), not a width animation, so completing a step cannot reflow the row.
 */
export function HandoverJourneyRail({ state }: { state: HandoverState }) {
  const current = journeyIndex(state);
  const halted = current === -1;
  const atRisk = state === "at_risk" || state === "issue_raised";

  return (
    <nav aria-label="Handover progress" className="w-full">
      <ol className="flex items-start gap-1 sm:gap-2">
        {JOURNEY_STEPS.map((step, i) => {
          const done = !halted && i < current;
          const isCurrent = !halted && i === current;
          const state_ = halted ? "halted" : done ? "done" : isCurrent ? "current" : "upcoming";

          return (
            <li key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-center gap-1">
                <Marker kind={state_} atRisk={isCurrent && atRisk} />
                {i < JOURNEY_STEPS.length - 1 && (
                  <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-700">
                    <div
                      className="handover-rail-fill h-full w-full rounded-full bg-[var(--handover-rail,var(--handover-accent))]"
                      style={{ transform: `scaleX(${done ? 1 : 0})` }}
                    />
                  </div>
                )}
              </div>
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={`w-full truncate text-center text-[10px] font-semibold sm:text-[11px] ${
                  isCurrent
                    ? "text-[var(--handover-accent)]"
                    : done
                      ? "text-stone-600 dark:text-stone-300"
                      : "text-stone-400 dark:text-stone-500"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      {/* The rail is decorative for a screen reader once this sentence exists. */}
      <p className="sr-only" aria-live="polite">
        {halted
          ? "This handover is closed and did not complete."
          : `Step ${current + 1} of ${JOURNEY_STEPS.length}: ${JOURNEY_STEPS[current]?.label}.`}
      </p>
    </nav>
  );
}

function Marker({ kind, atRisk }: { kind: "done" | "current" | "upcoming" | "halted"; atRisk: boolean }) {
  const base = "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2";

  if (kind === "halted") {
    return (
      <span className={`${base} border-stone-300 bg-stone-100 text-stone-400 dark:border-zinc-700 dark:bg-zinc-800`}>
        <X className="h-2.5 w-2.5" aria-hidden />
      </span>
    );
  }
  if (kind === "done") {
    return (
      <span className={`${base} border-green-500 bg-green-500 text-white`}>
        <Check className="h-2.5 w-2.5" aria-hidden strokeWidth={3} />
      </span>
    );
  }
  if (kind === "current") {
    return atRisk ? (
      <span className={`${base} border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-950/40`}>
        <TriangleAlert className="h-2.5 w-2.5" aria-hidden />
      </span>
    ) : (
      <span
        className={`${base} border-[var(--handover-accent)] bg-[var(--handover-soft)] text-[var(--handover-accent)]`}
      >
        <CircleDot className="h-2.5 w-2.5" aria-hidden />
      </span>
    );
  }
  return <span className={`${base} border-stone-300 bg-transparent dark:border-zinc-700`} />;
}
