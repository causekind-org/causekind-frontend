"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, EyeOff, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "@/lib/toast";
import { displayReason } from "@/lib/rejectionReason";
import { hideOffer, unhideOffer, type DonationOffer } from "@/lib/api";

/**
 * A finished offer, at the weight a finished offer deserves.
 *
 * <p>An ADMIN_REJECTED offer used to render through OfferStageCard: a full red
 * panel, permanently expanded, with a three-item "what you can do next" list and
 * a progress tracker — indistinguishable at a glance from an offer that still
 * needed the donor to do something. Worse, it appeared twice, because the
 * dashboard's "active" and "terminal" status lists disagreed about it.
 *
 * <p>So: a one-line summary by default, the explanation on demand, and a way out.
 */

const CLOSED_LABELS: Record<string, { label: string; tone: string }> = {
  ADMIN_REJECTED: { label: "Not approved", tone: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
  DONEE_DECLINED: { label: "Recipient declined", tone: "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-stone-400" },
  CANCELLED:      { label: "Cancelled", tone: "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-stone-400" },
  WITHDRAWN:      { label: "Withdrawn", tone: "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-stone-400" },
};

const NEXT_STEPS = [
  { href: "/requests", icon: "🔍", title: "Offer to a different request",
    blurb: "Browse verified requests and find a better match for your item." },
  { href: "/items/new", icon: "📦", title: "List the item as a general listing",
    blurb: "Let the system find any suitable recipient automatically." },
];

export function ClosedOfferCard({ offer, onChanged }: {
  offer: DonationOffer;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState(false);

  const meta = CLOSED_LABELS[offer.status] ?? {
    label: offer.status.replace(/_/g, " ").toLowerCase(),
    tone: "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-stone-400",
  };

  // Prefer the server's value; displayReason covers the case where an older
  // cached payload doesn't carry it yet. Either way, never the raw ".".
  const reason = offer.rejectionReason
    ? offer.displayRejectionReason ?? displayReason(offer.rejectionReason)
    : null;

  const closedOn = offer.closedAt ?? offer.createdAt;

  async function remove() {
    if (busy) return;                       // `disabled` lags a fast double-click
    setBusy(true);
    try {
      await hideOffer(offer.id);
      setConfirming(false);
      setRemoved(true);                     // animate out before the refetch
      toast.success("Offer removed from dashboard.", {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await unhideOffer(offer.id);
              setRemoved(false);
              onChanged();
            } catch {
              toast.error("Couldn't restore this offer. Try the Archived filter on your offers page.");
            }
          },
        },
      });
      // After the exit animation, so the list doesn't snap out from under it.
      setTimeout(onChanged, 300);
    } catch (e) {
      // The card stays exactly where it was — nothing was removed, so nothing
      // should look removed.
      toast.error(e instanceof Error ? e.message : "Couldn't remove this offer. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence initial={false}>
      {!removed && (
        <motion.div
          layout
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        >
          {/* Summary — everything a donor needs to recognise it, nothing more */}
          <div className="flex items-start gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.tone}`}>
                  {meta.label}
                </span>
                <span className="text-[10px] text-stone-400">
                  Closed {new Date(closedOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-stone-800 dark:text-stone-200">
                {offer.requestTitle}
              </p>
              {reason && (
                <p className="mt-0.5 line-clamp-1 text-xs text-stone-500 dark:text-stone-400" title={reason}>
                  {reason}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                aria-expanded={expanded}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700 dark:hover:bg-zinc-800 dark:hover:text-stone-300"
              >
                View details
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={busy}
                aria-label="Remove from dashboard"
                title="Remove from dashboard"
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Detail — the full reason and next steps, only once asked for */}
          {expanded && (
            <div className="space-y-3 border-t border-stone-100 px-3 py-3 dark:border-zinc-800">
              {reason && (
                <div className="rounded-lg bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-600 dark:bg-zinc-800 dark:text-stone-300">
                  <span className="font-semibold">Reason: </span>{reason}
                </div>
              )}
              {offer.status === "ADMIN_REJECTED" && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">What you can do next</p>
                  {[...NEXT_STEPS, {
                    href: `/requests/${offer.requestId}/offer`, icon: "✏️",
                    title: "Re-offer with updated details",
                    blurb: "Address the reason above and submit a fresh offer for the same request.",
                  }].map(step => (
                    <Link key={step.href} href={step.href}
                      className="flex items-start gap-2 rounded-lg border border-stone-200 px-3 py-2 transition-colors hover:border-[var(--ck-role-accent)] dark:border-zinc-700">
                      <span className="text-sm">{step.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">{step.title}</p>
                        <p className="text-[10px] text-stone-400">{step.blurb}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <AlertDialog open={confirming} onOpenChange={(o) => { if (!busy) setConfirming(o); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this offer from your dashboard?</AlertDialogTitle>
                <AlertDialogDescription>
                  This closed offer will no longer appear on your dashboard. CauseKind will
                  retain its record for support, safety, and auditing.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Keep offer</AlertDialogCancel>
                <AlertDialogAction
                  disabled={busy}
                  onClick={(e) => { e.preventDefault(); remove(); }}
                  className="border-0 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {busy ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Removing</> : "Remove"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
