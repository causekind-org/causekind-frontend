"use client";

import type { NgoDrive } from "@/lib/api";
import { serverDate } from "@/lib/serverTime";
import { DriveProofPanel } from "./DriveProofPanel";

import { UiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
const DAY = 24 * 60 * 60 * 1000;

/** "Due in 2 days" / "Overdue by 3 days", from proofDueAt (48 hours after collection completes). */
export function proofDeadline(dueAt: string | null | undefined, now = Date.now(),
  t: (key: "dueWithinDay" | "dueIn" | "overdueBy", values?: { count: number }) => string = (key, v) =>
    key === "dueWithinDay" ? "Due within a day" : `${key === "dueIn" ? "Due in" : "Overdue by"} ${v?.count} ${v?.count === 1 ? "day" : "days"}`): { text: string; overdue: boolean } | null {
  if (!dueAt) return null;
  const left = serverDate(dueAt).getTime() - now;
  const days = Math.ceil(Math.abs(left) / DAY);
  if (left >= 0) return { text: left < DAY ? t("dueWithinDay") : t("dueIn", { count: days }), overdue: false };
  return { text: t("overdueBy", { count: days }), overdue: true };
}

/** Collection is complete and no proof was sent yet: one upload form per drive. Sending it goes to admin review. */
export function ProofDuePanel({ drives, onSubmitted }: { drives: NgoDrive[]; onSubmitted: () => Promise<void> | void }) {
  const df = useTranslations("driveFlow");
  if (drives.length === 0) return <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400"><UiText>No proof due right now.</UiText></p>;
  return (
    <ul className="space-y-4">
      {drives.map((d) => {
        const deadline = proofDeadline(d.proofDueAt, Date.now(), (key, v) => df(key, v));
        return (
          <li key={d.id} data-testid="proof-due-drive" className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-stone-900 dark:text-stone-100">{d.title}</h3>
              {d.status === "PROOF_SUBMITTED" ? (
                <span data-testid="proof-waiting-admin" className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-900 dark:bg-sky-900/40 dark:text-sky-100"><UiText>Waiting for admin</UiText></span>
              ) : deadline && (
                <span data-testid="proof-deadline" className={`rounded-full px-2.5 py-1 text-xs font-bold ${deadline.overdue ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100" : "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"}`}>
                  {deadline.text}
                </span>
              )}
            </div>
            <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
              <UiText>Proof is due 48 hours after collection completes. If it&apos;s still missing after 7 days, we remind you.</UiText>
              {d.quantityReceived ? ` ${df("youReceived", { count: d.quantityReceived })}` : ""}
            </p>
            <DriveProofPanel drive={d} onSubmitted={onSubmitted} />
          </li>
        );
      })}
    </ul>
  );
}
