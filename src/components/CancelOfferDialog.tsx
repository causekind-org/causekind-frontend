"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import {
  cancelOffer, CANCELLATION_REASONS,
  type CancellationOption, type CancellationReason,
} from "@/lib/api";

/**
 * Leaving an offer, with the reason the other party will actually read.
 *
 * Replaces a `window.prompt` that asked for a free-text reason inside a numbered
 * list the user had to retype — unstructured, unstyled, and impossible to
 * validate. Reason is required whenever a counterpart is involved, because
 * "cancelled" with no explanation is the worst possible message for the person
 * left waiting.
 */
export function CancelOfferDialog({
  offerId, option, open, onOpenChange, onCancelled,
}: {
  offerId: number;
  option: CancellationOption;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState<CancellationReason | "">("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = CANCELLATION_REASONS.find(r => r.value === reason);
  const needsDetail = selected?.needsDetail ?? false;
  const canSubmit =
    !busy &&
    (!option.requiresReason || (reason !== "" && (!needsDetail || details.trim().length > 0)));

  async function submit() {
    if (busy || !canSubmit) return;   // guard here too: `disabled` lags a fast click
    setBusy(true);
    try {
      await cancelOffer(offerId, reason === "" ? null : reason, details.trim() || undefined);
      onOpenChange(false);
      toast.success("Offer cancelled — the other person has been told");
      onCancelled();
    } catch (e) {
      // Leave the dialog open so the typed reason isn't lost on a transient failure.
      toast.error(e instanceof Error ? e.message : "Couldn't cancel this offer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{option.actionLabel ?? "Cancel offer"}?</AlertDialogTitle>
          <AlertDialogDescription>
            {option.warning ?? "This offer will be withdrawn and the item released."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Only shown when someone else is actually affected — a draft nobody saw
            doesn't need a warning banner. */}
        {option.late && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>They are already expecting this item. Please tell them why so they can plan.</span>
          </div>
        )}

        {option.requiresReason && (
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as CancellationReason)}
              disabled={busy}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Select a reason…</option>
              {CANCELLATION_REASONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            {needsDetail && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                  Please explain <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  disabled={busy}
                  rows={3}
                  placeholder={reason === "SAFETY_CONCERN"
                    ? "What happened? This goes to the CauseKind team."
                    : "A short explanation for the other person."}
                />
                {reason === "SAFETY_CONCERN" && (
                  <p className="text-[11px] text-stone-500">
                    Safety reports are reviewed by the CauseKind team.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep offer</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canSubmit}
            onClick={(e) => { e.preventDefault(); submit(); }}
            className="bg-red-600 hover:bg-red-700 text-white border-0 disabled:opacity-50"
          >
            {busy
              ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Cancelling</>
              : (option.actionLabel ?? "Cancel offer")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
