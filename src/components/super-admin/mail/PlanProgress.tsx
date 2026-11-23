"use client";

/** Batch plan progress in the campaign report (Phase 3b; inventory BP11–BP13). Renders nothing without a plan. */
import { useCallback, useEffect, useState } from "react";
import { mcPlan, type McPlanView } from "@/lib/api";

const ist = (s: string) => new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const STATE: Record<string, string> = { WAITING: "Waiting", SENDING: "Sending", DONE: "Done", PAUSED: "Paused", CANCELLED: "Cancelled" };

export function PlanProgress({ campaignId, cardClass, mutedClass, headingClass, btnClass }: {
  campaignId: number; cardClass: string; mutedClass: string; headingClass: string; btnClass: string;
}) {
  const [plan, setPlan] = useState<McPlanView | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const [all, setAll] = useState(false);
  const load = useCallback(() => { setError(false); mcPlan(campaignId).then(setPlan).catch(() => setError(true)); }, [campaignId]);
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="mt-2 text-xs text-red-500">Couldn&apos;t load the plan. <button type="button" className="underline" onClick={load}>Try again</button></p>;
  if (!plan) return null;
  const shown = all ? plan.rounds : plan.rounds.slice(0, 8);
  return (
    <div className={`mt-3 rounded-xl border p-3 text-xs ${cardClass}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className={`mr-auto font-bold ${headingClass}`}>
          Batch plan · {plan.mode === "DATES" ? "date phases" : "round sizes"} · {plan.rounds.length} rounds
        </p>
        <button type="button" onClick={load} className={`min-h-7 rounded-lg border px-2 ${btnClass}`}>Refresh</button>
      </div>
      <p className={mutedClass}>
        {plan.sent} sent · {plan.remaining} still to send · {plan.planned} planned
        {plan.excludedByCap ? ` · ${plan.excludedByCap} left out by the stop limit` : ""}
        {plan.notReached ? ` · ${plan.notReached} not reached by the phases` : ""}
      </p>
      <p className={mutedClass}>Pause, Resume and Cancel on the campaign apply to the whole plan. Rounds already sent stay sent.</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[460px] text-left">
          <thead className={mutedClass}><tr>{["Round", "When (IST)", "Sent / planned", "Failed", "State"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={r.round} className="border-t">
              <td className="px-2 py-1">{r.round}</td>
              <td className="px-2 py-1">{ist(r.scheduledAt)}</td>
              <td className="px-2 py-1 tabular-nums">{r.sent} / {r.target}</td>
              <td className="px-2 py-1 tabular-nums">{r.failed || ""}</td>
              <td className="px-2 py-1">{STATE[r.state] ?? r.state}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {plan.rounds.length > 8 && (
        <button type="button" onClick={() => setAll(!all)} className="mt-1 underline">{all ? "Show fewer rounds" : `Show all ${plan.rounds.length} rounds`}</button>
      )}
    </div>
  );
}
