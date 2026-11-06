"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  crmAddNote, crmHistory, crmLogCall, crmSaveFollowup,
  type CrmActivity, type CrmCallOutcome, type CrmCallPurpose,
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
  const [notes, setNotes] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    crmHistory(userId).then((p) => setItems(p.items)).catch(() => toast.error("Could not load the history."));
  }, [userId]);

  useEffect(load, [load]);

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
    if (!outcome) return;
    const saved = await run(() => crmLogCall(userId, {
      clientRequestId: requestId, outcome, purpose, notes,
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
          <label className="flex items-center gap-1.5 text-sm">
            Follow up (IST)
            <input type="datetime-local" className={selectClass} value={followUpAt}
              onChange={(e) => setFollowUpAt(e.target.value)} />
          </label>
        </div>
        <Textarea aria-label="Call notes" placeholder="What was said?" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!outcome || busy || (outcome === "CALLBACK" && !followUpAt)} onClick={saveCall}>Log call</Button>
          <Button size="sm" variant="outline" disabled={!followUpAt || busy} onClick={saveFollowupOnly}>Set follow-up only</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input className="w-full sm:w-80" aria-label="Add a note" placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="sm" variant="outline" disabled={!note.trim() || busy} onClick={saveNote}>Save note</Button>
      </div>

      {items.length === 0 ? <p className="text-xs text-muted-foreground">No calls or notes yet.</p> : (
        <ul className="space-y-1.5">
          {items.map((a) => (
            <li key={a.id} className="text-xs">
              <span className="font-medium">{a.kind === "CALL" ? `Call: ${a.outcome}` : "Note"}</span>
              {a.purpose && ` (${a.purpose})`} · {formatIst(a.occurredAt)} · {a.actorEmail}
              {a.notes && <p className="whitespace-pre-wrap text-muted-foreground">{a.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
