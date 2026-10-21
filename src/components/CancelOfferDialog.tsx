"use client";

import { useRef, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import {
  cancelOffer, cancellationReasonsFor,
  type CancellationOption, type CancellationReason,
} from "@/lib/api";
import { useTranslations } from "next-intl";
import { UiText, useUiText } from "@/components/UiText";
import { useCancellationCopy } from "@/lib/cancellationCopy";

// Translation: interface copy and the fixed reason labels (translated by value —
// the submitted value is unchanged). option.actionLabel / warning come from the
// server and are shown as sent; server error messages and typed details too.

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
  offerId, role = "DONOR", option, open, onOpenChange, onCancelled,
}: {
  offerId: number;
  /** Whose reasons to offer; the donee gets recipient-side wording. */
  role?: "DONOR" | "DONEE";
  option: CancellationOption;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
}) {
  const ui = useUiText();
  const copy = useCancellationCopy();
  const t = useTranslations("offerCancel");
  const [reason, setReason] = useState<CancellationReason | "">("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  const reasons = cancellationReasonsFor(role);
  // Same value can read differently per side (e.g. "Unable to arrange handover"
  // vs "I can't collect or receive it"), so each role has its own labels.
  const reasonLabel: Partial<Record<CancellationReason, string>> = role === "DONEE"
    ? {
        NO_LONGER_NEEDED: ui("I no longer need this item"),
        RECEIVED_ELSEWHERE: ui("I already got this item elsewhere"),
        CANNOT_ARRANGE_HANDOVER: ui("I can't collect or receive it"),
        SCHEDULING_PROBLEM: ui("The handover time doesn't work for me"),
        OTHER_PARTY_UNRESPONSIVE: ui("The donor isn't responding"),
        SAFETY_CONCERN: ui("Safety concern"),
        OTHER: ui("Other", "reason"),
      }
    : {
        ITEM_NO_LONGER_AVAILABLE: ui("The item is no longer available"),
        CANNOT_ARRANGE_HANDOVER: ui("Unable to arrange handover"),
        SCHEDULING_PROBLEM: ui("Scheduling problem"),
        OTHER_PARTY_UNRESPONSIVE: ui("The other party is unresponsive"),
        SAFETY_CONCERN: ui("Safety concern"),
        CREATED_BY_MISTAKE: ui("Created by mistake"),
        OTHER: ui("Other", "reason"),
      };
  const selected = reasons.find(r => r.value === reason);
  const needsDetail = selected?.needsDetail ?? false;
  const canSubmit =
    !busy &&
    (!option.requiresReason || (reason !== "" && (!needsDetail || details.trim().length > 0)));

  async function submit() {
    if (submittingRef.current || !canSubmit) return;
    submittingRef.current = true;
    setBusy(true);
    try {
      await cancelOffer(offerId, reason === "" ? null : reason, details.trim() || undefined);
      onOpenChange(false);
      toast.success(ui("Offer cancelled — the other person has been told"));
      onCancelled();
    } catch (e) {
      // Leave the dialog open so the typed reason isn't lost on a transient failure.
      toast.error(e instanceof Error ? e.message : ui("Couldn't cancel this offer"));
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("titleQuestion", { action: copy.label(option) ?? ui("Cancel offer") })}</AlertDialogTitle>
          <AlertDialogDescription>
            {copy.warning(option) ?? ui("This offer will be withdrawn and the item released.")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Only shown when someone else is actually affected — a draft nobody saw
            doesn't need a warning banner. */}
        {option.late && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span><UiText>They are already expecting this item. Please tell them why so they can plan.</UiText></span>
          </div>
        )}

        {option.requiresReason && (
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
              <UiText>Reason</UiText> <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as CancellationReason)}
              disabled={busy}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">{ui("Select a reason…")}</option>
              {reasons.map(r => (
                <option key={r.value} value={r.value}>{reasonLabel[r.value] ?? r.label}</option>
              ))}
            </select>

            {needsDetail && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300">
                  <UiText>Please explain</UiText> <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  disabled={busy}
                  rows={3}
                  placeholder={reason === "SAFETY_CONCERN"
                    ? ui("What happened? This goes to the CauseKind team.")
                    : ui("A short explanation for the other person.")}
                />
                {reason === "SAFETY_CONCERN" && (
                  <p className="text-2xs text-stone-500">
                    <UiText>Safety reports are reviewed by the CauseKind team.</UiText>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}><UiText>Keep offer</UiText></AlertDialogCancel>
          <AlertDialogAction
            disabled={!canSubmit}
            onClick={(e) => { e.preventDefault(); submit(); }}
            className="bg-red-600 hover:bg-red-700 text-white border-0 disabled:opacity-50"
          >
            {busy
              ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> <UiText>Cancelling</UiText></>
              : (copy.label(option) ?? ui("Cancel offer"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
