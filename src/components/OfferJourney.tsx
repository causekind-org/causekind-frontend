"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, CircleDot, Route, TriangleAlert } from "lucide-react";
import {
  Drawer, DrawerBody, DrawerClose, DrawerContent, DrawerDescription,
  DrawerHeader, DrawerTitle, DrawerTrigger,
} from "@/components/ui/drawer";

/**
 * The donor's seven-milestone donation journey.
 *
 * <p>Two levels. The card carries a *compact* rail — seven nodes, no labels — plus
 * the current stage and a one-line preview of the next one. Everything else lives
 * behind "View full journey" in a bottom sheet. The previous version put seven
 * 9px truncated labels under a segmented bar inside a card that is ~300px wide on
 * a phone, which rendered as "Submi… Sent t… Recipi…" — present but unreadable.
 *
 * <p>Status is never carried by colour alone: every node has an icon, the current
 * one has `aria-current="step"`, and the rail is followed by an `aria-live`
 * sentence. The two role themes are terracotta and navy, so a red/green-blind
 * donor reading "is this done?" from hue would otherwise be guessing.
 *
 * <p>No percentage is shown. These are discrete milestones, not continuous work.
 */

export type JourneyStage = {
  label: string;
  sublabel: string;
  statuses: string[];
  /** Status-specific detail for the stage the offer is actually sitting on. */
  nowText: string;
};

/**
 * `nowText` varies by the exact status inside a milestone, so the stage list is
 * built per offer rather than being a module constant.
 */
export function buildDonorJourney(status: string): JourneyStage[] {
  return [
    {
      label: "Submitted",
      sublabel: "Your offer was submitted for review",
      statuses: ["DRAFT", "SUBMITTED", "AI_ELIGIBILITY_SCREENING", "AI_COMPATIBILITY_SCREENING", "COMPATIBILITY_CHECKED", "NEEDS_INFORMATION"],
      nowText:
        status === "DRAFT" ? "Complete your item details and photos to submit the offer." :
        status === "NEEDS_INFORMATION" ? "AI screening found missing details. Please update your offer before it can proceed." :
        "Your offer has been submitted. AI is checking your item details and photos. No action needed.",
    },
    {
      label: "Sent to Recipient",
      sublabel: "Recipient is reviewing your item",
      statuses: ["PENDING_DONEE_REVIEW", "SOFT_RESERVED_PRIMARY", "SOFT_RESERVED_BACKUP"],
      nowText:
        status === "SOFT_RESERVED_BACKUP" ? "Your offer is on standby as a backup in case the primary offer falls through." :
        "Your offer has passed AI screening and has been sent to the recipient. Waiting for them to accept or decline.",
    },
    {
      label: "Recipient Accepted",
      sublabel: "Recipient accepted — waiting for you",
      statuses: ["DONEE_ACCEPTED", "DONOR_RECONFIRMATION_REQUIRED"],
      nowText: "The recipient accepted your offer! Please confirm that your item is still available and in the same condition before we proceed.",
    },
    {
      label: "You Reconfirmed",
      sublabel: "You confirmed item availability",
      statuses: ["DONOR_RECONFIRMED", "CONDITION_CHANGED_RESCREENING", "PENDING_ADMIN_APPROVAL"],
      nowText:
        status === "CONDITION_CHANGED_RESCREENING" ? "Your updated item details are being re-checked by AI." :
        "You confirmed availability. CauseKind admin is doing a final review before approving the match.",
    },
    {
      label: "Admin Approved",
      sublabel: "CauseKind approved the match",
      statuses: ["ADMIN_APPROVED"],
      nowText: "Your donation has been approved! Please go to the Handover Hub to schedule when and how you will hand over the item.",
    },
    {
      label: "Handover",
      sublabel: "Item handed over to recipient",
      statuses: ["HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"],
      nowText:
        status === "HANDOVER_AT_RISK" ? "The handover has been rescheduled multiple times. Please contact us or the recipient to resolve the scheduling." :
        "A handover has been scheduled. Generate the OTP in the Handover Hub and hand it over to the recipient at the agreed time.",
    },
    {
      label: "Complete",
      sublabel: "Donation successfully delivered",
      statuses: ["ISSUE_WINDOW_OPEN", "ISSUE_RAISED", "COMPLETED"],
      nowText:
        status === "ISSUE_RAISED" ? "An issue was reported for this donation. Our team is reviewing it." :
        status === "ISSUE_WINDOW_OPEN" ? "The recipient confirmed they got the item. A short issue window is open. Once it closes, your certificate will be issued." :
        "Your donation is complete! Download your certificate as a record of your contribution.",
    },
  ];
}

/**
 * Index of the milestone this status sits on, or -1 when the status maps to no
 * milestone. Callers use -1 to fall back to the card's standalone explanation.
 */
export function donorJourneyIndex(status: string): number {
  return buildDonorJourney(status).findIndex(s => s.statuses.includes(status));
}

const isAtRiskStatus = (status: string) =>
  status === "HANDOVER_AT_RISK" || status === "ISSUE_RAISED";

export function OfferJourney({ status }: { status: string }) {
  const reduce = useReducedMotion();
  const stages = buildDonorJourney(status);
  const idx = stages.findIndex(s => s.statuses.includes(status));

  // Unmapped status — the card keeps its own explanation instead.
  if (idx < 0) return null;

  const atRisk = isAtRiskStatus(status);
  const current = stages[idx];
  const next = idx < stages.length - 1 ? stages[idx + 1] : null;
  const accent = atRisk ? "text-amber-600 dark:text-amber-400" : "text-[var(--ck-role-accent)]";

  return (
    <div className="space-y-2.5 pt-1">
      {/* Step count + normalized milestone name */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-3xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Step {idx + 1} of {stages.length}
        </span>
        <span className={`truncate text-2xs font-bold ${accent}`}>{current.label}</span>
      </div>

      <JourneyRail stages={stages} idx={idx} atRisk={atRisk} reduce={!!reduce} />

      {/* Current stage — the richer per-status text, so the card does not print a
          generic explanation and this one back to back. */}
      <div className="rounded-xl border border-stone-100 bg-stone-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-800">
        <p className={`text-3xs font-black uppercase tracking-wider ${accent}`}>
          Now · {current.label}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
          {current.nowText}
        </p>
      </div>

      {next && (
        <p className="truncate text-2xs text-stone-400 dark:text-stone-500">
          <span className="font-semibold">Next:</span> {next.label} — {next.sublabel}
        </p>
      )}

      <Drawer>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-600 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-zinc-700 dark:bg-transparent dark:text-stone-300 dark:hover:bg-zinc-800"
          >
            <Route className="h-3.5 w-3.5" aria-hidden />
            View full journey
            <span aria-hidden className="text-stone-400">›</span>
          </button>
        </DrawerTrigger>

        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Donation journey</DrawerTitle>
            <DrawerDescription>
              Step {idx + 1} of {stages.length} · {current.label}
            </DrawerDescription>
          </DrawerHeader>

          {/* DrawerBody is overflow-hidden by design; the scroller lives inside it
              so the drag handle and header stay put. vaul owns the body scroll
              lock — nothing extra here. */}
          <DrawerBody>
            <ol className="max-h-full overflow-y-auto px-5 pb-2">
              {stages.map((stage, i) => {
                const done = i < idx;
                const isCurrent = i === idx;
                const last = i === stages.length - 1;

                return (
                  <li key={stage.label} className="flex gap-3">
                    {/* Marker column + vertical connector */}
                    <div className="flex flex-col items-center">
                      <Marker
                        kind={done ? "done" : isCurrent ? "current" : "upcoming"}
                        atRisk={isCurrent && atRisk}
                      />
                      {!last && (
                        <div className="my-1 w-0.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-700">
                          <motion.div
                            className="h-full w-full origin-top rounded-full bg-green-500"
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: done ? 1 : 0 }}
                            transition={reduce ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
                          />
                        </div>
                      )}
                    </div>

                    <div className={`min-w-0 flex-1 ${last ? "pb-4" : "pb-5"}`}>
                      <p
                        aria-current={isCurrent ? "step" : undefined}
                        className={`text-sm font-bold ${
                          isCurrent ? accent
                            : done ? "text-stone-700 dark:text-stone-200"
                            : "text-stone-400 dark:text-stone-500"
                        }`}
                      >
                        {stage.label}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                        {stage.sublabel}
                      </p>
                      {isCurrent && (
                        <motion.p
                          initial={reduce ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.28, ease: "easeOut" }}
                          className="mt-2 rounded-lg border border-stone-100 bg-stone-50 p-2.5 text-xs leading-relaxed text-stone-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-300"
                        >
                          {stage.nowText}
                        </motion.p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </DrawerBody>

          <div className="shrink-0 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2">
            <DrawerClose asChild>
              <button
                type="button"
                className="min-h-[44px] w-full rounded-xl bg-stone-100 text-xs font-bold text-stone-600 transition-colors hover:bg-stone-200 dark:bg-zinc-800 dark:text-stone-300 dark:hover:bg-zinc-700"
              >
                Close
              </button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

/** Slim seven-node rail. No labels — the drawer carries those. */
function JourneyRail({
  stages, idx, atRisk, reduce,
}: {
  stages: JourneyStage[]; idx: number; atRisk: boolean; reduce: boolean;
}) {
  return (
    <nav aria-label="Donation progress">
      <ol className="flex items-center">
        {stages.map((stage, i) => {
          const done = i < idx;
          const isCurrent = i === idx;

          return (
            <li key={stage.label} className={`flex items-center ${i < stages.length - 1 ? "flex-1" : ""}`}>
              <Marker
                kind={done ? "done" : isCurrent ? "current" : "upcoming"}
                atRisk={isCurrent && atRisk}
                small
                label={stage.label}
                isCurrent={isCurrent}
              />
              {i < stages.length - 1 && (
                // scaleX, not width: completing a step cannot reflow the row.
                <div className="mx-0.5 h-0.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-700">
                  <motion.div
                    className="h-full w-full origin-left rounded-full bg-green-500"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: done ? 1 : 0 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {/* Once this sentence exists the rail itself is decorative to a screen reader. */}
      <p className="sr-only" aria-live="polite">
        Step {idx + 1} of {stages.length}: {stages[idx]?.label}.
      </p>
    </nav>
  );
}

function Marker({
  kind, atRisk, small = false, label, isCurrent,
}: {
  kind: "done" | "current" | "upcoming";
  atRisk: boolean;
  small?: boolean;
  label?: string;
  isCurrent?: boolean;
}) {
  const size = small ? "h-4 w-4" : "h-5 w-5";
  const icon = small ? "h-2 w-2" : "h-2.5 w-2.5";
  const base = `flex ${size} shrink-0 items-center justify-center rounded-full border-2`;
  const a11y = { "aria-current": isCurrent ? ("step" as const) : undefined, title: label };

  if (kind === "done") {
    return (
      <span {...a11y} className={`${base} border-green-500 bg-green-500 text-white`}>
        <Check className={icon} aria-hidden strokeWidth={3} />
      </span>
    );
  }
  if (kind === "current") {
    return atRisk ? (
      <span {...a11y} className={`${base} border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-950/40`}>
        <TriangleAlert className={icon} aria-hidden />
      </span>
    ) : (
      <span {...a11y} className={`${base} border-[var(--ck-role-accent)] bg-[var(--ck-role-soft)] text-[var(--ck-role-accent)]`}>
        <CircleDot className={icon} aria-hidden />
      </span>
    );
  }
  return <span {...a11y} className={`${base} border-stone-300 bg-transparent dark:border-zinc-700`} />;
}
