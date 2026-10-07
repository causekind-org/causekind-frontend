"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/AppLink";
import { X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { doneeAcceptMatch, donorAcceptMatch, getMyMatches, type ItemMatch } from "@/lib/api";
import { toast } from "@/lib/toast";

/**
 * A pinned dock, on any page, telling a donor that one of their items has been
 * matched (design D of https://claude.ai/artifact/DRtcEBQ6VcDHQ4cjJw7fsR, chosen
 * 2026-10-07). It shows each waiting match until the donor answers it or closes the
 * dock; a closed match never shows the dock again (remembered in this browser).
 * The full card with Decline and its reason form lives on the dashboard.
 *
 * <p>Donees get the same dock for a match waiting on them
 * (AWAITING_DONEE_CONFIRMATION), worded from their side: the donor's item.
 */
const DISMISSED_KEY = "ck_match_dock_dismissed_v1";

function loadDismissed(): Set<number> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch { return new Set(); }
}

function saveDismissed(ids: Set<number>) {
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids])); } catch { /* best-effort */ }
}

export function MatchActionDock() {
  const { user, isLoading } = useAuth();
  const [waiting, setWaiting] = useState<ItemMatch | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user || (user.role !== "DONOR" && user.role !== "DONEE")) { setWaiting(null); return; }
    try {
      const dismissed = loadDismissed();
      // DONOR_REVIEW only ever reaches the donor of the match (the backend hides it
      // from the donee); AWAITING_DONEE_CONFIRMATION is the donee's turn.
      const waitingStatus = user.role === "DONOR" ? "DONOR_REVIEW" : "AWAITING_DONEE_CONFIRMATION";
      const next = (await getMyMatches()).find(m => m.status === waitingStatus && !dismissed.has(m.id)) ?? null;
      setWaiting(next);
    } catch { /* the dock is a convenience; the dashboard still lists the match */ }
  }, [user]);

  useEffect(() => { if (!isLoading) void load(); }, [isLoading, load]);
  useEntityUpdates(["MATCH"], () => { void load(); });

  const dismiss = useCallback((id: number) => {
    const ids = loadDismissed();
    ids.add(id);
    saveDismissed(ids);
    setWaiting(null);
  }, []);

  const accept = useCallback(async () => {
    if (!waiting) return;
    setBusy(true);
    try {
      if (user?.role === "DONEE") {
        await doneeAcceptMatch(waiting.id);
        toast.success("Accepted! The handover will be arranged next.");
      } else {
        await donorAcceptMatch(waiting.id);
        toast.success("Thanks! An admin will approve the match next.");
      }
      dismiss(waiting.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not confirm the match");
    } finally {
      setBusy(false);
    }
  }, [waiting, dismiss, user?.role]);

  if (!waiting) return null;
  const item = waiting.listingTitle || "your item";
  const need = waiting.requestTitle || "a nearby need";
  const km = waiting.scoreDistanceKm;
  const isDonee = user?.role === "DONEE";
  const headline = isDonee
    ? `A donor near you has “${item}” for your need`
    : `A need near you matches “${item}”`;
  const subline = isDonee ? `For “${need}”` : `“${need}”`;
  const acceptLabel = isDonee ? "Yes, I want it" : "I still have it";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-4 z-[60] mx-auto flex max-w-3xl flex-col gap-3 rounded-3xl bg-stone-900 p-3 pl-4 text-white shadow-[0_24px_50px_-18px_rgba(28,20,16,0.6)] sm:bottom-6 sm:flex-row sm:items-center sm:rounded-full sm:pl-5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--ck-role-accent,#c4561c)] text-sm font-black" aria-hidden>1</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{headline}</p>
          <p className="truncate text-xs text-stone-300">
            {subline}{km != null ? ` · about ${km < 1 ? "<1" : Math.round(km)} km` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/dashboard#matches"
          onClick={() => dismiss(waiting.id)}
          className="inline-flex h-11 items-center rounded-full border border-white/30 px-4 text-sm font-extrabold text-white hover:bg-white/10"
        >
          View details
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={accept}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--ck-role-accent,#c4561c)] px-5 text-sm font-black text-white hover:brightness-110 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {acceptLabel}
        </button>
        <button
          type="button"
          aria-label="Close and don't show this match again"
          onClick={() => dismiss(waiting.id)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-stone-300 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
