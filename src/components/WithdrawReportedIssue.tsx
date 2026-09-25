"use client";

import { useEffect, useState } from "react";
import { getMyReportedIssues, withdrawReportedIssue, type ReporterIssue } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";

export function WithdrawReportedIssue({ offerId, onChanged }: { offerId: number; onChanged: () => void }) {
  const [issues, setIssues] = useState<ReporterIssue[]>([]);
  const [selected, setSelected] = useState<ReporterIssue | null>(null);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoadError(false);
    getMyReportedIssues(offerId).then(data => { if (active) setIssues(data); })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [offerId, retry]);

  async function submit() {
    if (!selected || busy) return;
    setBusy(true); setError("");
    try {
      await withdrawReportedIssue(offerId, selected.id, reason || null, details.trim());
      setIssues(previous => previous.filter(issue => issue.id !== selected.id));
      setSelected(null);
      toast.success("Your issue was withdrawn. The report remains in the history.");
      onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not withdraw the issue. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <>
      {loadError && <button type="button" onClick={() => setRetry(n => n + 1)} className="min-h-11 text-xs text-stone-500 underline">Could not check your issue — retry</button>}
      {issues.filter(issue => issue.canWithdraw).map(issue => <button key={issue.id} type="button"
        onClick={() => { setSelected(issue); setReason(""); setDetails(""); setError(""); }}
        className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-zinc-900 dark:text-amber-300">
        Withdraw reported issue{issues.filter(i => i.canWithdraw).length > 1 ? ` #${issue.id}` : ""}
      </button>)}
      <Dialog open={selected !== null} onOpenChange={open => { if (!open && !busy) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Withdraw this issue?</DialogTitle><DialogDescription>Our team will stop reviewing this report. It stays in the history as withdrawn by you. Other open reports will still be reviewed.</DialogDescription></DialogHeader>
          <DialogBody className="space-y-4">
            <p className="break-words rounded-lg bg-stone-100 p-3 text-sm dark:bg-zinc-800">{selected?.description}</p>
            <label className="block space-y-2 text-sm"><span>Reason (optional)</span><select disabled={busy} value={reason} onChange={e => setReason(e.target.value)} className="min-h-11 w-full rounded-lg border bg-white px-3 text-base dark:bg-zinc-900"><option value="">Choose a reason</option><option value="REPORTED_BY_MISTAKE">Reported by mistake</option><option value="PROBLEM_RESOLVED">Problem resolved</option><option value="OTHER">Other</option></select></label>
            <label className="block space-y-2 text-sm"><span>Additional details (optional)</span><textarea disabled={busy} value={details} onChange={e => setDetails(e.target.value)} maxLength={1000} rows={3} className="w-full rounded-lg border bg-white p-3 text-base dark:bg-zinc-900" /></label>
            <p className="text-xs text-stone-500">Withdrawing a report does not confirm that the donation is complete.</p>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          </DialogBody>
          <DialogFooter><button type="button" disabled={busy} onClick={() => setSelected(null)} className="min-h-11 rounded-lg border px-4 text-sm">Keep report</button><button type="button" disabled={busy} onClick={() => void submit()} className="min-h-11 rounded-lg bg-[var(--ck-role-accent)] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Withdrawing…" : "Withdraw issue"}</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
