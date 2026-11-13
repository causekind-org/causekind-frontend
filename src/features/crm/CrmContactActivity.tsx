"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  crmAddNote, crmCallers, crmHistory, crmLogCall, crmSaveFollowup,
  type CrmActivity, type CrmCallOutcome, type CrmCallPurpose, type CrmCaller,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const OUTCOMES: { value: CrmCallOutcome; label: string }[] = [
  { value: "CONNECTED", label: "Connected" },
  { value: "NO_ANSWER", label: "No answer" },
  { value: "BUSY", label: "Busy" },
  { value: "SWITCHED_OFF", label: "Switched off" },
  { value: "WRONG_NUMBER", label: "Wrong number" },
  { value: "CALLBACK", label: "Callback" },
];

const selectClass = "h-8 rounded-md border bg-background px-2 text-sm";

type Kind = CrmActivity["kind"];

const KIND_FILTERS: { label: string; value: Kind | null }[] = [
  { label: "All", value: null },
  { label: "Calls", value: "CALL" },
  { label: "Notes", value: "NOTE" },
  { label: "Changes", value: "CHANGE" },
  { label: "Number views", value: "ACCESS" },
];

const KIND_LABEL: Record<Kind, string> = { CALL: "Call", NOTE: "Note", CHANGE: "Change", ACCESS: "Viewed" };

const KIND_STYLE: Record<Kind, string> = {
  CALL: "bg-orange-50 text-orange-900",
  NOTE: "bg-muted text-foreground",
  CHANGE: "bg-indigo-50 text-indigo-900",
  ACCESS: "bg-emerald-50 text-emerald-900",
};

function title(a: CrmActivity) {
  if (a.kind === "CALL") {
    const outcome = OUTCOMES.find((o) => o.value === a.outcome)?.label ?? a.outcome;
    return `Call logged: ${outcome}`;
  }
  if (a.kind === "NOTE") return "Note added";
  if (a.kind === "ACCESS") return "Phone number viewed";
  return `${a.fieldName} changed`;
}

function formatIst(value: string) {
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

/** Field / old / new rows for the details pane. */
function changesOf(a: CrmActivity): { field: string; old: string; next: string }[] {
  if (a.kind === "CHANGE") return [{ field: a.fieldName ?? "Field", old: a.oldValue ?? "None", next: a.newValue ?? "None" }];
  if (a.kind === "ACCESS") return [{ field: "Purpose", old: "", next: a.newValue ?? "" }];
  const rows: { field: string; old: string; next: string }[] = [];
  if (a.kind === "CALL") {
    rows.push({ field: "Outcome", old: "", next: OUTCOMES.find((o) => o.value === a.outcome)?.label ?? a.outcome ?? "" });
    if (a.purpose) rows.push({ field: "Purpose", old: "", next: a.purpose.toLowerCase() });
    if (a.callerName) rows.push({ field: "Called by", old: "", next: a.callerName });
  }
  if (a.notes) rows.push({ field: a.kind === "NOTE" ? "Note" : "Notes", old: "", next: a.notes });
  return rows;
}

/** Log a call, set a follow-up, add a note. */
export function CrmLogCallForm({ userId, role, onChanged }: {
  userId: number; role: string; onChanged: () => void;
}) {
  const [outcome, setOutcome] = useState<CrmCallOutcome | "">("");
  const [purpose, setPurpose] = useState<CrmCallPurpose>("SUPPORT");
  const [callers, setCallers] = useState<CrmCaller[]>([]);
  const [callerId, setCallerId] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    crmCallers().then(setCallers).catch(() => toast.error("Could not load the caller names."));
  }, []);

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await action();
      toast.success(done);
      onChanged();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveCall() {
    if (!outcome || !callerId) return;
    const saved = await run(() => crmLogCall(userId, {
      clientRequestId: requestId, outcome, purpose, callerId: Number(callerId), notes,
      followUpAt: followUpAt ? new Date(followUpAt).toISOString() : null,
    }), "Call logged.");
    if (saved) {
      setOutcome(""); setNotes(""); setFollowUpAt(""); setRequestId(crypto.randomUUID());
    }
  }

  async function saveFollowupOnly() {
    if (!followUpAt) return;
    if (await run(() => crmSaveFollowup(userId, new Date(followUpAt).toISOString()), "Follow-up saved.")) setFollowUpAt("");
  }

  async function saveNote() {
    if (!note.trim()) return;
    if (await run(() => crmAddNote(userId, note.trim()), "Note saved.")) setNote("");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Log a call</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">Outcome
            <select aria-label="Call outcome" className={`${selectClass} w-full`} value={outcome}
              onChange={(e) => setOutcome(e.target.value as CrmCallOutcome)}>
              <option value="" disabled>Choose</option>
              {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Purpose
            <select aria-label="Purpose of the call" className={`${selectClass} w-full`} value={purpose}
              onChange={(e) => setPurpose(e.target.value as CrmCallPurpose)}>
              <option value="SUPPORT">Support</option>
              <option value="ONBOARDING">Onboarding</option>
              {role === "DONOR" && <option value="FUNDRAISING">Fundraising</option>}
            </select>
          </label>
          <label className="space-y-1 text-sm">Called by
            <select aria-label="Called by" className={`${selectClass} w-full`} value={callerId}
              onChange={(e) => setCallerId(e.target.value)}>
              <option value="" disabled>Choose</option>
              {callers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">Follow up (IST, optional)
            <input type="datetime-local" className={`${selectClass} w-full`} value={followUpAt}
              onChange={(e) => setFollowUpAt(e.target.value)} />
          </label>
        </div>
        {callers.length === 0 && <p className="text-xs text-destructive">No caller names yet. A manager can add them under Follow-ups and report.</p>}
        <Textarea aria-label="Call notes" placeholder="What was said?" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!outcome || !callerId || busy || (outcome === "CALLBACK" && !followUpAt)} onClick={saveCall}>Log call</Button>
          <Button size="sm" variant="outline" disabled={!followUpAt || busy} onClick={saveFollowupOnly}>Set follow-up only</Button>
        </div>
      </section>

      <section className="space-y-2 border-t pt-4">
        <h2 className="text-base font-semibold">Add a note</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Input className="w-full sm:w-96" aria-label="Add a note" placeholder="Anything worth remembering" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" variant="outline" disabled={!note.trim() || busy} onClick={saveNote}>Save note</Button>
        </div>
      </section>
    </div>
  );
}

/** The contact's permanent history: a table, with the selected entry's details beside it. */
export function CrmActivityLog({ userId }: { userId: number }) {
  const [items, setItems] = useState<CrmActivity[] | null>(null);
  const [kindFilter, setKindFilter] = useState<Kind | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(() => {
    crmHistory(userId).then((p) => setItems(p.items)).catch(() => toast.error("Could not load the history."));
  }, [userId]);

  useEffect(load, [load]);

  const shown = (items ?? []).filter((a) => !kindFilter || a.kind === kindFilter);
  const selected = shown.find((a) => a.id === selectedId) ?? shown[0] ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs">Timespan: <b>All time</b></span>
        {KIND_FILTERS.map((f) => (
          <button key={f.label} type="button" onClick={() => setKindFilter(f.value)} aria-pressed={kindFilter === f.value}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              kindFilter === f.value ? "border-blue-700 bg-blue-50 text-blue-900" : "bg-background hover:bg-muted"
            }`}>
            Type: {f.label}
          </button>
        ))}
        <button type="button" onClick={load} className="ml-auto text-xs text-blue-700 hover:underline">Refresh</button>
      </div>

      {items === null ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        : shown.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nothing here yet.</p> : (
        <div className="flex flex-wrap overflow-hidden rounded-md border">
          <div className="min-w-0 flex-[999_1_480px] overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Operation</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Time (IST)</th>
                  <th className="px-3 py-2 font-semibold">Done by</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.id} onClick={() => setSelectedId(a.id)}
                    className={`cursor-pointer border-t ${selected?.id === a.id ? "bg-blue-50" : "hover:bg-muted/40"}`}>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => setSelectedId(a.id)} className="text-left text-blue-700 hover:underline">
                        {title(a)}
                      </button>
                    </td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-px text-[11px] ${KIND_STYLE[a.kind]}`}>{KIND_LABEL[a.kind]}</span></td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatIst(a.occurredAt)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.callerName ?? a.actorEmail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <section aria-label="Change details" className="flex-[1_1_300px] space-y-2 border-t bg-muted/20 p-4 md:max-w-sm md:border-l md:border-t-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Change details</p>
              <h3 className="text-base font-semibold">{title(selected)}</h3>
              <p className="text-xs text-muted-foreground">
                {formatIst(selected.occurredAt)} IST · {selected.callerName ? `${selected.callerName} (${selected.actorEmail})` : selected.actorEmail}
              </p>
              <table className="w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="py-1.5 font-semibold">Field</th><th className="px-2 py-1.5 font-semibold">Old value</th><th className="py-1.5 font-semibold">New value</th></tr>
                </thead>
                <tbody>
                  {changesOf(selected).map((c) => (
                    <tr key={c.field} className="border-t align-top">
                      <td className="py-1.5 font-medium">{c.field}</td>
                      <td className="px-2 py-1.5 text-red-800 line-through">{c.old}</td>
                      <td className="whitespace-pre-wrap py-1.5 text-green-800">{c.next}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="pt-2 text-[11px] text-muted-foreground">Entries are permanent. Nobody can edit or delete them.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
