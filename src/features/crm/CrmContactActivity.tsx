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
    return `Call logged: ${outcome}${a.purpose ? ` (${a.purpose.toLowerCase()})` : ""}`;
  }
  if (a.kind === "NOTE") return "Note added";
  if (a.kind === "ACCESS") return "Phone number viewed";
  return `${a.fieldName} changed`;
}

function formatIst(value: string) {
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";
}

/** Log a call, add a note, set a follow-up, and read this contact's history. */
export function CrmContactActivity({ userId, role, onChanged }: {
  userId: number; role: string; onChanged: () => void;
}) {
  const [items, setItems] = useState<CrmActivity[]>([]);
  const [outcome, setOutcome] = useState<CrmCallOutcome | "">("");
  const [purpose, setPurpose] = useState<CrmCallPurpose>("SUPPORT");
  const [callers, setCallers] = useState<CrmCaller[]>([]);
  const [callerId, setCallerId] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [kindFilter, setKindFilter] = useState<Kind | null>(null);
  const shown = kindFilter ? items.filter((a) => a.kind === kindFilter) : items;

  const load = useCallback(() => {
    crmHistory(userId).then((p) => setItems(p.items)).catch(() => toast.error("Could not load the history."));
  }, [userId]);

  useEffect(load, [load]);

  useEffect(() => {
    crmCallers().then(setCallers).catch(() => toast.error("Could not load the caller names."));
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      load();
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
    }));
    if (saved) {
      setOutcome(""); setNotes(""); setFollowUpAt(""); setRequestId(crypto.randomUUID());
    }
  }

  async function saveFollowupOnly() {
    if (!followUpAt) return;
    if (await run(() => crmSaveFollowup(userId, new Date(followUpAt).toISOString()))) setFollowUpAt("");
  }

  async function saveNote() {
    if (!note.trim()) return;
    if (await run(() => crmAddNote(userId, note.trim()))) setNote("");
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Call outcome" className={selectClass} value={outcome}
            onChange={(e) => setOutcome(e.target.value as CrmCallOutcome)}>
            <option value="" disabled>Call outcome</option>
            {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select aria-label="Purpose of the call" className={selectClass} value={purpose}
            onChange={(e) => setPurpose(e.target.value as CrmCallPurpose)}>
            <option value="SUPPORT">Support</option>
            <option value="ONBOARDING">Onboarding</option>
            {role === "DONOR" && <option value="FUNDRAISING">Fundraising</option>}
          </select>
          <select aria-label="Called by" className={selectClass} value={callerId}
            onChange={(e) => setCallerId(e.target.value)}>
            <option value="" disabled>Called by</option>
            {callers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm">
            Follow up (IST)
            <input type="datetime-local" className={selectClass} value={followUpAt}
              onChange={(e) => setFollowUpAt(e.target.value)} />
          </label>
        </div>
        {callers.length === 0 && <p className="text-xs text-destructive">No caller names yet. An admin can add them under Follow-ups and report.</p>}
        <Textarea aria-label="Call notes" placeholder="What was said?" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!outcome || !callerId || busy || (outcome === "CALLBACK" && !followUpAt)} onClick={saveCall}>Log call</Button>
          <Button size="sm" variant="outline" disabled={!followUpAt || busy} onClick={saveFollowupOnly}>Set follow-up only</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input className="w-full sm:w-80" aria-label="Add a note" placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="sm" variant="outline" disabled={!note.trim() || busy} onClick={saveNote}>Save note</Button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="mr-1 text-sm font-medium">Activity log</p>
          {KIND_FILTERS.map((f) => (
            <button key={f.label} type="button" onClick={() => setKindFilter(f.value)}
              aria-pressed={kindFilter === f.value}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                kindFilter === f.value ? "border-blue-700 bg-blue-50 text-blue-900" : "hover:bg-muted"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        {shown.length === 0 ? <p className="text-xs text-muted-foreground">Nothing here yet.</p> : (
          <ul className="divide-y rounded-md border">
            {shown.map((a) => (
              <li key={a.id} className="space-y-0.5 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className={`rounded-full px-2 py-px text-[11px] ${KIND_STYLE[a.kind]}`}>{KIND_LABEL[a.kind]}</span>
                  <span className="font-medium">{title(a)}</span>
                  <span className="ml-auto text-muted-foreground">{formatIst(a.occurredAt)}</span>
                </div>
                {(a.kind === "CHANGE" || a.kind === "ACCESS") && (
                  <p>
                    {a.oldValue && <><span className="text-red-800 line-through">{a.oldValue}</span> → </>}
                    <span className="text-green-800">{a.newValue}</span>
                  </p>
                )}
                {a.notes && <p className="whitespace-pre-wrap text-muted-foreground">{a.notes}</p>}
                <p className="text-muted-foreground">
                  By {a.callerName ? `${a.callerName} (${a.actorEmail})` : a.actorEmail}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">Entries are permanent. Nobody can edit or delete them.</p>
      </div>
    </div>
  );
}
