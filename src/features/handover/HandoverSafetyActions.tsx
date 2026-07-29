"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Loader2, ShieldAlert } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import {
  cancelMatch, getMatchCancellationOptions, getOfferCancellationOptions,
  reportPostDeliveryIssue, confirmNoIssue,
  CANCELLATION_REASONS,
  type CancellationOption, type CancellationReason,
} from "@/lib/api";
import { CancelOfferDialog } from "@/components/CancelOfferDialog";
import { handoverScope, type HandoverRole, type HandoverViewModel } from "./model";
import {
  handoverPrimary, handoverSecondary, handoverDestructive,
  handoverSelectTrigger, handoverSelectItem, handoverLabel,
} from "./handoverStyles";

const ISSUE_TYPES = [
  { value: "ITEM_NOT_RECEIVED",     label: "I never received the item" },
  { value: "ITEM_DAMAGED",          label: "The item arrived damaged" },
  { value: "ITEM_NOT_AS_DESCRIBED", label: "It isn't what was described" },
  { value: "QUANTITY_MISMATCH",     label: "The quantity was wrong" },
  { value: "OTHER",                 label: "Something else" },
];

/**
 * The escape routes: leaving the handover, and reporting a problem after delivery.
 *
 * <p>Two things this fixes from the old hubs:
 *
 * <p>1. <b>Cancellation is server-authoritative.</b> Options come from
 * `/cancellation-options`, so the UI can't claim an exit the API will refuse, or
 * hide one it would allow. The old pages hardcoded status lists that had already
 * drifted.
 *
 * <p>2. <b>A reported issue is a real record.</b> The old "Notify CauseKind" button
 * posted a SYSTEM chat message and told the user their report had been filed —
 * nothing was persisted as a dispute, nothing entered the admin queue, and
 * `resolvedAt` could never be set because no row existed. This calls
 * `reportPostDeliveryIssue`, which creates a PostDeliveryIssue and moves the offer
 * to ISSUE_RAISED.
 *
 * <p>Presented as a visible secondary action below the fold, never a hidden menu:
 * someone who needs out should not have to hunt.
 */
export function HandoverSafetyActions({ vm, onChanged }: {
  vm: HandoverViewModel;
  onChanged: () => void;
}) {
  const [option, setOption] = useState<CancellationOption | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = vm.flow === "OFFER"
      ? getOfferCancellationOptions(vm.id)
      : getMatchCancellationOptions(vm.id);
    load.then((o) => { if (alive) setOption(o); })
        .catch(() => { /* no control beats a broken one */ });
    return () => { alive = false; };
  }, [vm.flow, vm.id, vm.state]);

  const canReportIssue = vm.flow === "OFFER" && (vm.state === "issue_window" || vm.state === "completed");
  const showCancel = option?.allowed && option.outcome !== "HIDE";
  const disputeOnly = option?.outcome === "DISPUTE";

  if (!showCancel && !disputeOnly && !canReportIssue) return null;

  return (
    <section className="border-t border-stone-200 pt-5 dark:border-zinc-800">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
        If something goes wrong
      </h2>
      <p className="mt-1.5 max-w-prose text-sm text-stone-500 dark:text-stone-400">
        {disputeOnly
          ? option?.blockedReason
          : "You can step back from this, or tell us if something wasn't right. Either way the record stays."}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {showCancel && (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-red-200 px-3.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <ShieldAlert className="h-4 w-4" aria-hidden />
            {option?.actionLabel ?? "Cancel"}
          </button>
        )}
        {canReportIssue && (
          <button
            type="button"
            onClick={() => setIssueOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-amber-300 px-3.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
          >
            <CircleAlert className="h-4 w-4" aria-hidden />
            Report a problem
          </button>
        )}
      </div>

      {showCancel && option && (
        vm.flow === "OFFER"
          ? <CancelOfferDialog
              offerId={vm.id}
              option={option}
              open={cancelOpen}
              onOpenChange={setCancelOpen}
              onCancelled={onChanged}
            />
          : <CancelMatchDialog
              matchId={vm.id}
              role={vm.role}
              option={option}
              open={cancelOpen}
              onOpenChange={setCancelOpen}
              onCancelled={onChanged}
            />
      )}

      {canReportIssue && (
        <ReportIssueDialog
          offerId={vm.id}
          role={vm.role}
          open={issueOpen}
          onOpenChange={setIssueOpen}
          onReported={onChanged}
        />
      )}
    </section>
  );
}

/**
 * Match equivalent of CancelOfferDialog. Separate because the endpoints differ;
 * identical in shape and copy so the two flows feel like one product.
 */
function CancelMatchDialog({ matchId, role, option, open, onOpenChange, onCancelled }: {
  matchId: number;
  role: HandoverRole;
  option: CancellationOption;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState<CancellationReason | "">("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = CANCELLATION_REASONS.find((r) => r.value === reason);
  const needsDetail = selected?.needsDetail ?? false;
  const canSubmit = !busy &&
    (!option.requiresReason || (reason !== "" && (!needsDetail || details.trim().length > 0)));

  async function submit() {
    if (busy || !canSubmit) return;
    setBusy(true); setError(null);
    try {
      await cancelMatch(matchId, reason === "" ? null : reason, details.trim() || undefined);
      onOpenChange(false);
      toast.success("Cancelled — the other person has been told");
      onCancelled();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't cancel this.");
    } finally {
      setBusy(false);
    }
  }

  const scope = handoverScope(role);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className={scope}>
        <DialogHeader>
          <DialogTitle>{option.actionLabel ?? "Cancel this handover"}?</DialogTitle>
          <DialogDescription>
            {option.warning ?? "This handover will be cancelled and the item released."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          {option.requiresReason && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="cm-reason" className={handoverLabel}>
                  Why?<span className="ml-0.5 text-destructive" aria-hidden>*</span>
                </label>
                <Select
                  value={reason || undefined}
                  onValueChange={(v) => setReason(v as CancellationReason)}
                  disabled={busy}
                >
                  <SelectTrigger id="cm-reason" className={handoverSelectTrigger}>
                    <SelectValue placeholder="Choose a reason…" />
                  </SelectTrigger>
                  <SelectContent className={scope}>
                    {CANCELLATION_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value} className={handoverSelectItem}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {needsDetail && (
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  disabled={busy}
                  placeholder="A short explanation for the other person."
                  aria-label="Explanation"
                  className="text-base"
                />
              )}
            </>
          )}
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)} className={handoverSecondary}>
            Keep it
          </Button>
          <Button disabled={!canSubmit} onClick={submit} className={handoverDestructive}>
            {busy ? <><Loader2 className="animate-spin" aria-hidden /> Cancelling</> : "Cancel it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Creates a real PostDeliveryIssue — not a chat message dressed up as one. */
function ReportIssueDialog({ offerId, role, open, onOpenChange, onReported }: {
  offerId: number;
  role: HandoverRole;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onReported: () => void;
}) {
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0].value);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !busy && description.trim().length >= 10;

  async function submit() {
    if (busy || !canSubmit) return;
    setBusy(true); setError(null);
    try {
      await reportPostDeliveryIssue(offerId, {
        issueType, description: description.trim(), windowCategory: "GENERAL",
      });
      onOpenChange(false);
      toast.success("Reported. Our team will look into this and contact you both.");
      onReported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send this report.");
    } finally {
      setBusy(false);
    }
  }

  const scope = handoverScope(role);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className={scope}>
        <DialogHeader>
          <DialogTitle>What went wrong?</DialogTitle>
          <DialogDescription>
            This opens a case with the CauseKind team. Both of you will be contacted.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="issue-type" className={handoverLabel}>Type of problem</label>
            <Select value={issueType} onValueChange={setIssueType} disabled={busy}>
              <SelectTrigger id="issue-type" className={handoverSelectTrigger}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={scope}>
                {ISSUE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className={handoverSelectItem}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="issue-desc" className={handoverLabel}>What happened?</label>
            <Textarea
              id="issue-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={busy}
              placeholder="Tell us what happened, in your own words."
              className="text-base"
            />
            {description.trim().length > 0 && description.trim().length < 10 && (
              <p className="text-xs text-muted-foreground">A sentence or two helps us act on it.</p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)} className={handoverSecondary}>
            Go back
          </Button>
          <Button disabled={!canSubmit} onClick={submit} className={handoverPrimary}>
            {busy ? <><Loader2 className="animate-spin" aria-hidden /> Sending</> : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Donee-only: closes the issue window early instead of waiting it out. */
export function ConfirmNoIssueButton({ offerId, onDone }: { offerId: number; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      await confirmNoIssue(offerId);
      toast.success("Thanks — this is now closed.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't close this. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={submit} disabled={busy} className={`${handoverPrimary} w-full sm:w-auto`}>
      {busy ? <><Loader2 className="animate-spin" aria-hidden /> Closing</> : "Everything's fine"}
    </Button>
  );
}
