"use client";

/**
 * Batch plan builder in the composer (Phase 3b; inventory BP01–BP10).
 * Rounds (sizes, repeat last, growth, max, stop cap, start, every N) or date
 * phases (From/To, people per send, every N, shared send time). Preview shows
 * every round before anything is scheduled. All times are IST.
 */
import { useState } from "react";
import { mcPreviewPlan, mcSchedulePlan, type McPlanInput, type McPlanPreview, type McPlanUnit } from "@/lib/api";
import { Loader2, Plus, X } from "lucide-react";

type PhaseRow = { from: string; to: string; perSend: string; every: string; unit: McPlanUnit };
const PRESETS = ["10, 100, 500", "10, 1000, 1500, 2000", "50, 200, 500, 1000"];
const UNITS: { v: McPlanUnit; l: string }[] = [{ v: "DAYS", l: "days" }, { v: "WEEKS", l: "weeks" }, { v: "MONTHS", l: "months" }];
const ist = (s: string) => new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const num = (s: string) => (s.trim() === "" ? null : Number(s));

/** "2026-12-01T10:00" typed in IST → ISO instant. */
const istToIso = (local: string) => new Date(`${local}:00+05:30`).toISOString();

export function PlanBuilder({ ensureSaved, confirmVariables, onScheduled, fieldClass, labelClass, btnClass, accentClass, mutedClass, headingClass }: {
  ensureSaved: () => Promise<number | null>;
  /** Same whole-list check as Send: null = abort, else whether blanks were accepted. */
  confirmVariables: (id: number) => Promise<boolean | null>;
  onScheduled: () => void;
  fieldClass: string; labelClass: string; btnClass: string; accentClass: string; mutedClass: string; headingClass: string;
}) {
  const [mode, setMode] = useState<"ROUNDS" | "DATES">("ROUNDS");
  const [sizes, setSizes] = useState("10, 1000, 1500, 2000");
  const [growth, setGrowth] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [stopAfter, setStopAfter] = useState("");
  const [firstAt, setFirstAt] = useState("");
  const [every, setEvery] = useState("1");
  const [unit, setUnit] = useState<McPlanUnit>("DAYS");
  const [phases, setPhases] = useState<PhaseRow[]>([{ from: "", to: "", perSend: "200", every: "1", unit: "DAYS" }]);
  const [sendTime, setSendTime] = useState("10:00");
  const [preview, setPreview] = useState<McPlanPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input = (): McPlanInput => {
    const stop = num(stopAfter);
    if (mode === "ROUNDS") {
      const list = sizes.split(/[,\s]+/).filter(Boolean).map(Number);
      if (!list.length || list.some((n) => !Number.isInteger(n) || n < 1)) throw new Error("Round sizes must be whole numbers, e.g. 10, 1000, 1500.");
      if (!firstAt) throw new Error("Choose when the first round goes out.");
      return { mode, sizes: list, growth: num(growth), maxSize: num(maxSize), stopAfter: stop, firstAt: istToIso(firstAt), every: Number(every) || 1, unit };
    }
    return {
      mode, stopAfter: stop, sendTime,
      phases: phases.map((p, i) => {
        if (!p.from) throw new Error(`Phase ${i + 1} needs a From date.`);
        return { from: p.from, to: p.to || null, perSend: Number(p.perSend) || 0, every: Number(p.every) || 1, unit: p.unit };
      }),
    };
  };

  const run = async (fn: (id: number) => Promise<void>) => {
    setBusy(true); setError(null);
    try { const id = await ensureSaved(); if (id != null) await fn(id); }
    catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setBusy(false); }
  };

  const doPreview = () => run(async (id) => setPreview(await mcPreviewPlan(id, input())));
  const doSchedule = () => run(async (id) => {
    const body = input();
    const p = await mcPreviewPlan(id, body);
    setPreview(p);
    if (!p.rounds.length) throw new Error("This plan has no rounds.");
    const accept = await confirmVariables(id);
    if (accept === null) return;
    if (!window.confirm(`Schedule ${p.rounds.length} rounds for ${p.planned} people, starting ${ist(p.rounds[0].at)} IST and finishing about ${p.finishesAt ? ist(p.finishesAt) : "?"}?` +
      (p.excludedByCap ? `\n${p.excludedByCap} people are left out by the stop limit.` : "") +
      "\n\nYou can pause or cancel the plan later; rounds already sent stay sent.")) return;
    await mcSchedulePlan(id, body, accept);
    onScheduled();
  });

  const tab = (m: "ROUNDS" | "DATES", l: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setPreview(null); }}
      className={`min-h-8 rounded-full border px-3 text-xs font-bold ${mode === m ? accentClass : btnClass}`}>{l}</button>
  );

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Plan type" className="flex gap-1.5">{tab("ROUNDS", "Round sizes")}{tab("DATES", "Date phases")}</div>

      {mode === "ROUNDS" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="pl-sizes">People per round, in order (the last size repeats)</label>
            <input id="pl-sizes" className={fieldClass} value={sizes} onChange={(e) => { setSizes(e.target.value); setPreview(null); }} />
            <div className="mt-1 flex flex-wrap gap-1">{PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => { setSizes(p); setPreview(null); }} className={`rounded-full border px-2 py-0.5 text-3xs ${btnClass}`}>{p}</button>
            ))}</div>
          </div>
          <div><label className={labelClass} htmlFor="pl-growth">Grow each repeat by (optional)</label>
            <input id="pl-growth" inputMode="numeric" className={fieldClass} value={growth} onChange={(e) => { setGrowth(e.target.value.replace(/\D/g, "")); setPreview(null); }} /></div>
          <div><label className={labelClass} htmlFor="pl-max">Largest round (optional)</label>
            <input id="pl-max" inputMode="numeric" className={fieldClass} value={maxSize} onChange={(e) => { setMaxSize(e.target.value.replace(/\D/g, "")); setPreview(null); }} /></div>
          <div><label className={labelClass} htmlFor="pl-first">First round (IST)</label>
            <input id="pl-first" type="datetime-local" className={fieldClass} value={firstAt} onChange={(e) => { setFirstAt(e.target.value); setPreview(null); }} /></div>
          <div className="flex items-end gap-2">
            <div className="w-20"><label className={labelClass} htmlFor="pl-every">Every</label>
              <input id="pl-every" inputMode="numeric" className={fieldClass} value={every} onChange={(e) => { setEvery(e.target.value.replace(/\D/g, "")); setPreview(null); }} /></div>
            <select aria-label="Repeat unit" className={fieldClass} value={unit} onChange={(e) => { setUnit(e.target.value as McPlanUnit); setPreview(null); }}>
              {UNITS.map((u) => <option key={u.v} value={u.v}>{u.l}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {phases.map((p, i) => (
            <div key={i} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_6rem_4rem_7rem_auto]">
              <div><label className={labelClass} htmlFor={`ph-from-${i}`}>From</label>
                <input id={`ph-from-${i}`} type="date" className={fieldClass} value={p.from} onChange={(e) => { setPhases(phases.map((x, j) => j === i ? { ...x, from: e.target.value } : x)); setPreview(null); }} /></div>
              <div><label className={labelClass} htmlFor={`ph-to-${i}`}>To {i === phases.length - 1 ? "(optional)" : ""}</label>
                <input id={`ph-to-${i}`} type="date" className={fieldClass} value={p.to} onChange={(e) => { setPhases(phases.map((x, j) => j === i ? { ...x, to: e.target.value } : x)); setPreview(null); }} /></div>
              <div><label className={labelClass} htmlFor={`ph-n-${i}`}>People</label>
                <input id={`ph-n-${i}`} inputMode="numeric" className={fieldClass} value={p.perSend} onChange={(e) => { setPhases(phases.map((x, j) => j === i ? { ...x, perSend: e.target.value.replace(/\D/g, "") } : x)); setPreview(null); }} /></div>
              <div><label className={labelClass} htmlFor={`ph-e-${i}`}>Every</label>
                <input id={`ph-e-${i}`} inputMode="numeric" className={fieldClass} value={p.every} onChange={(e) => { setPhases(phases.map((x, j) => j === i ? { ...x, every: e.target.value.replace(/\D/g, "") } : x)); setPreview(null); }} /></div>
              <select aria-label={`Phase ${i + 1} unit`} className={fieldClass} value={p.unit} onChange={(e) => { setPhases(phases.map((x, j) => j === i ? { ...x, unit: e.target.value as McPlanUnit } : x)); setPreview(null); }}>
                {UNITS.map((u) => <option key={u.v} value={u.v}>{u.l}</option>)}
              </select>
              <button type="button" aria-label={`Remove phase ${i + 1}`} disabled={phases.length === 1}
                onClick={() => { setPhases(phases.filter((_, j) => j !== i)); setPreview(null); }} className={`min-h-9 rounded-lg border px-2 ${btnClass}`}><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <div className="flex flex-wrap items-end gap-3">
            <button type="button" onClick={() => setPhases([...phases, { from: "", to: "", perSend: "500", every: "1", unit: "WEEKS" }])}
              className={`inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 text-xs font-bold ${btnClass}`}><Plus className="h-3.5 w-3.5" /> Add a phase (change the pace later)</button>
            <div><label className={labelClass} htmlFor="pl-time">Send time (IST)</label>
              <input id="pl-time" type="time" className={fieldClass} value={sendTime} onChange={(e) => { setSendTime(e.target.value); setPreview(null); }} /></div>
          </div>
          <p className={`text-xs ${mutedClass}`}>Phases must be in date order and can&apos;t overlap. Only the last one can have no end date; it then continues until everyone is reached.</p>
        </div>
      )}

      <div className="max-w-[14rem]"><label className={labelClass} htmlFor="pl-stop">Stop after this many people (optional)</label>
        <input id="pl-stop" inputMode="numeric" className={fieldClass} value={stopAfter} onChange={(e) => { setStopAfter(e.target.value.replace(/\D/g, "")); setPreview(null); }} /></div>

      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={doPreview} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${btnClass}`}>{busy && <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />}Preview plan</button>
        <button type="button" disabled={busy} onClick={doSchedule} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${accentClass}`}>Schedule the rounds</button>
      </div>

      {preview && (
        <div className="space-y-2 text-xs">
          <p className={headingClass}>
            {preview.rounds.length} rounds · {preview.planned} of {preview.audience} people
            {preview.excludedByCap ? ` · ${preview.excludedByCap} left out by the stop limit` : ""}
            {preview.notReached ? ` · ${preview.notReached} not reached` : ""}
            {preview.finishesAt ? ` · last round ${ist(preview.finishesAt)}` : ""}
          </p>
          {preview.warnings.map((w) => <p key={w} className="text-amber-500">• {w}</p>)}
          {preview.rounds.length === 0 ? <p className={mutedClass}>No rounds: nobody to send to, or no dates left in the phases.</p> : (
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-left">
                <thead className={mutedClass}><tr><th className="px-2 py-1">Round</th><th className="px-2 py-1">When (IST)</th><th className="px-2 py-1">People</th><th className="px-2 py-1">Total so far</th></tr></thead>
                <tbody>{preview.rounds.map((r) => (
                  <tr key={r.round} className="border-t"><td className="px-2 py-1">{r.round}</td><td className="px-2 py-1">{ist(r.at)}</td><td className="px-2 py-1 tabular-nums">{r.size}</td><td className="px-2 py-1 tabular-nums">{r.cumulative}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
