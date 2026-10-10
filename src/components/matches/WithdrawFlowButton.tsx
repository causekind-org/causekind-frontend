"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, Undo2 } from "lucide-react";
import {
  getMatchCancellationOptions, getOfferCancellationOptions, hideMatch, hideOffer,
  type CancellationOption,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { CancelOfferDialog } from "@/components/CancelOfferDialog";
import { CancelMatchDialog } from "@/features/handover/HandoverSafetyActions";
import type { HandoverRole } from "@/features/handover/model";

/**
 * Withdraw from a match or offer straight from the dashboard (owner, 2026-10-07:
 * "an option for both the donor and donee to withdraw and delete the flow anytime").
 *
 * <p>Server-authoritative, like the handover hub's exit: the label and whether it
 * shows at all come from `/cancellation-options`. Once either side has confirmed
 * the handover the server answers DISPUTE, and this renders nothing — the hub's
 * "Report a problem" is the only route then. A finished or cancelled flow answers
 * HIDE, shown as "Remove from dashboard".
 */
export function WithdrawFlowButton({ kind, id, role, onChanged, className = "" }: {
  kind: "match" | "offer";
  id: number;
  role: HandoverRole;
  onChanged?: () => void;
  className?: string;
}) {
  const [option, setOption] = useState<CancellationOption | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (kind === "match" ? getMatchCancellationOptions(id) : getOfferCancellationOptions(id))
      .then((o) => { if (alive) setOption(o); })
      .catch(() => { /* no button rather than a wrong one */ });
    return () => { alive = false; };
  }, [kind, id]);

  const changed = () => { if (onChanged) onChanged(); else window.location.reload(); };

  if (!option || !option.allowed) return null;
  if (option.outcome === "DISPUTE" || option.outcome === "NONE") return null;

  const base = `inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors disabled:opacity-50 ${className}`;

  if (option.outcome === "HIDE") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await (kind === "match" ? hideMatch(id) : hideOffer(id));
            toast.success("Removed from your dashboard.");
            changed();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Couldn't remove it.");
          } finally { setBusy(false); }
        }}
        className={`${base} border-stone-200 text-stone-500 hover:bg-stone-50 dark:border-zinc-700 dark:text-stone-400 dark:hover:bg-zinc-800`}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />}
        Remove from dashboard
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${base} border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30`}
      >
        <Undo2 className="h-3.5 w-3.5" aria-hidden />
        {option.actionLabel || "Withdraw"}
      </button>
      {kind === "offer" ? (
        <CancelOfferDialog offerId={id} option={option} open={open} onOpenChange={setOpen} onCancelled={changed} />
      ) : (
        <CancelMatchDialog matchId={id} role={role} option={option} open={open} onOpenChange={setOpen} onCancelled={changed} />
      )}
    </>
  );
}
