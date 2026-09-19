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
  const isCompleted = state === "completed";

  return (
    <nav aria-label="Handover progress" className="w-full">
      <ol className="flex items-start">
        {JOURNEY_STEPS.map((step, i) => {
          const done = !halted && (isCompleted ? i <= current : i < current);
          const isCurrent = !halted && !isCompleted && i === current;
          // A connector segment is "filled" when the step it leads FROM is done.
          const leftDone = !halted && (isCompleted ? i - 1 <= current : i - 1 < current);
          const rightDone = done;
          const state_ = halted ? "halted" : done ? "done" : isCurrent ? "current" : "upcoming";

          return (
            <li key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              {/* Connector row: [left-half] [marker] [right-half] */}
              <div className="flex w-full items-center">
                {/* Left half-connector — hidden for first step */}
                <div className="h-0.5 flex-1 overflow-hidden bg-stone-200 dark:bg-zinc-700" style={{ visibility: i === 0 ? "hidden" : undefined }}>
                  <div
                    className="handover-rail-fill h-full w-full bg-[var(--handover-rail,var(--handover-accent))]"
                    style={{ transform: `scaleX(${leftDone ? 1 : 0})` }}
                  />
                </div>
                <Marker kind={state_} atRisk={isCurrent && atRisk} />
                {/* Right half-connector — hidden for last step */}
                <div className="h-0.5 flex-1 overflow-hidden bg-stone-200 dark:bg-zinc-700" style={{ visibility: i === JOURNEY_STEPS.length - 1 ? "hidden" : undefined }}>
                  <div
                    className="handover-rail-fill h-full w-full bg-[var(--handover-rail,var(--handover-accent))]"
                    style={{ transform: `scaleX(${rightDone ? 1 : 0})` }}
                  />
                </div>
              </div>
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={`w-full truncate text-center text-3xs font-semibold sm:text-2xs ${
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
          : isCompleted
            ? "Handover complete: all steps finished."
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
