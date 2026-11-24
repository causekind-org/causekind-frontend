"use client";

/**
 * "Save group as list" from a campaign report (Phase 2; inventory RP06).
 * Saving only records the people; it never sends anything and never lifts a
 * bounce or unsubscribe block.
 */
import { useEffect, useState } from "react";
import { mcAudiences, mcSaveCohort, type McAudience, type McCohort } from "@/lib/api";
import { Loader2 } from "lucide-react";

const COHORTS: { value: McCohort; label: string }[] = [
  { value: "EVERYONE", label: "Everyone" }, { value: "DELIVERED", label: "Delivered" }, { value: "OPENED", label: "Opened" },
  { value: "NOT_OPENED", label: "Didn't open" }, { value: "CLICKED", label: "Clicked" }, { value: "BOUNCED", label: "Bounced" },
  { value: "FAILED", label: "Failed" },
];

export function SaveCohort({ campaignId, campaignName, fieldClass, btnClass, mutedClass }: {
  campaignId: number; campaignName: string; fieldClass: string; btnClass: string; mutedClass: string;
}) {
  const [open, setOpen] = useState(false);
  const [cohort, setCohort] = useState<McCohort>("OPENED");
  const [target, setTarget] = useState<"new" | number>("new");
  const [name, setName] = useState("");
  const [lists, setLists] = useState<McAudience[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { if (open) mcAudiences().then(setLists).catch(() => setLists([])); }, [open]);
  useEffect(() => {
    setName(`${COHORTS.find((c) => c.value === cohort)?.label} · ${campaignName}`.slice(0, 120));
  }, [cohort, campaignName]);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await mcSaveCohort(campaignId, target === "new" ? { cohort, name } : { cohort, audienceId: target });
      setMsg({ ok: true, text: `Saved to “${r.audience.name}”: ${r.result.added} added, ${r.result.updated} updated. Nothing was sent.` +
        (cohort === "BOUNCED" || cohort === "FAILED" ? " Bounced/blocked addresses stay blocked." : "") });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save." }); }
    finally { setBusy(false); }
  };

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className={`mt-2 min-h-8 rounded-lg border px-3 text-xs font-semibold ${btnClass}`}>Save a group as a list…</button>;
  }
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 text-xs">
      <label className="font-bold">Group
        <select className={`${fieldClass} mt-1 block`} value={cohort} onChange={(e) => setCohort(e.target.value as McCohort)}>
          {COHORTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </label>
      <label className="font-bold">Into
        <select className={`${fieldClass} mt-1 block`} value={String(target)} onChange={(e) => setTarget(e.target.value === "new" ? "new" : Number(e.target.value))}>
          <option value="new">A new list</option>
          {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
      {target === "new" && (
        <label className="font-bold">New list name
          <input className={`${fieldClass} mt-1 block`} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </label>
      )}
      <button type="button" disabled={busy || (target === "new" && !name.trim())} onClick={save}
        className={`inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 font-bold ${btnClass}`}>
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />} Save
      </button>
      <button type="button" onClick={() => { setOpen(false); setMsg(null); }} className={`min-h-9 rounded-lg border px-3 ${btnClass}`}>Close</button>
      {msg && <p role={msg.ok ? undefined : "alert"} className={`w-full ${msg.ok ? "text-emerald-500" : "text-red-500"}`}>{msg.text}</p>}
      <p className={`w-full ${mutedClass}`}>A new list keeps the campaign&apos;s original consent and notes which campaign it came from.</p>
    </div>
  );
}
