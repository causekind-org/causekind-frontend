"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import HandoverCelebration from "@/components/handover/HandoverCelebration";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { getMyDonationOffers, getMyMatches, getOffersForMyRequests } from "@/lib/api";
import { claimCelebration, MATCH_DONE, OFFER_DONE, type CelebrationContext } from "@/lib/celebration";

type Pending = { type: CelebrationContext; id: number; role: "DONOR" | "DONEE" };

/**
 * Opens the donation-complete celebration (thank-you → feedback → support
 * CauseKind) on whatever page the person is on, the first time they come back
 * after a donation they were part of finished (owner, 2026-10-08). Before this
 * it lived only on the Handover Hub, so a donor who returned to the dashboard
 * after the recipient confirmed never saw it.
 *
 * <p>The hubs keep their own copy; both claim through `claimCelebration`, so
 * each person sees it exactly once wherever they land first.
 */
export function CompletionCelebrationWatcher() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [pending, setPending] = useState<Pending | null>(null);

  // The hubs show their own celebration; don't race them for the claim.
  const onHub = !!pathname?.endsWith("/handover");

  const check = useCallback(async () => {
    if (!user?.email || (user.role !== "DONOR" && user.role !== "DONEE")) return;
    if (onHub || pending) return;
    const email = user.email;
    try {
      const [matches, offers] = await Promise.all([
        getMyMatches().catch(() => []),
        (user.role === "DONOR" ? getMyDonationOffers() : getOffersForMyRequests()).catch(() => []),
      ]);
      // Everything finished that this person has not celebrated yet. Only the
      // most recent one opens; the rest are marked seen in the same pass, so
      // someone with a backlog (the first visit after this shipped) gets one
      // window, not a queue of them.
      const lower = email.toLowerCase();
      const fresh: (Pending & { at: number })[] = [];
      for (const m of matches) {
        if (!MATCH_DONE.has(m.status) || !claimCelebration("MATCH", m.id, email)) continue;
        const role = m.donorEmail && m.donorEmail.toLowerCase() === lower ? "DONOR" : "DONEE";
        fresh.push({ type: "MATCH", id: m.id, role, at: Date.parse(m.doneeConfirmedAt ?? "") || 0 });
      }
      for (const o of offers) {
        if (!OFFER_DONE.has(o.status) || !claimCelebration("OFFER", o.id, email)) continue;
        const role = user.role === "DONOR" ? "DONOR" : "DONEE";
        fresh.push({ type: "OFFER", id: o.id, role, at: Date.parse(o.closedAt ?? o.createdAt ?? "") || 0 });
      }
      if (fresh.length) {
        const { type, id, role } = fresh.sort((a, b) => b.at - a.at)[0];
        setPending({ type, id, role });
      }
    } catch { /* a convenience; never block the page */ }
  }, [user?.email, user?.role, onHub, pending]);

  useEffect(() => { if (!isLoading) void check(); }, [isLoading, check]);
  useEntityUpdates(["MATCH", "OFFER"], () => { void check(); });

  if (!pending) return null;
  return (
    <HandoverCelebration
      contextType={pending.type}
      contextId={pending.id}
      role={pending.role}
      open
      onClose={() => setPending(null)}
    />
  );
}
