"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { reviewNgoDriveOffer, reviewNgoDriveOffersBulk, type NgoDrive } from "@/lib/api";
import { serverDate } from "@/lib/serverTime";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage } from "@/features/ngo-drives/driveGiveState";
import { NgoOfferReviewCard } from "./NgoOfferReviewCard";
import type { DriveOffer } from "./useNgoOffers";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
import { useDriveCopy } from "@/features/ngo-drives/driveCopy";
export type OfferSort = "oldest" | "condition" | "distance" | "quantity";
const SORTS: [OfferSort, string][] = [["oldest", "Oldest first"], ["condition", "Condition"], ["distance", "Distance"], ["quantity", "Quantity"]];
const CONDITION_RANK = ["Unused", "Like New", "Good", "Fair", "Needs Minor Repair"];
const time = (o: DriveOffer) => (o.submittedAt ? serverDate(o.submittedAt).getTime() : o.id);

export function sortOffers(list: DriveOffer[], sort: OfferSort): DriveOffer[] {
  const rank = (c?: string | null) => { const i = CONDITION_RANK.indexOf(c ?? ""); return i < 0 ? 99 : i; };
  return [...list].sort((a, b) => {
    if (sort === "condition") return rank(a.condition) - rank(b.condition) || time(a) - time(b);
    if (sort === "distance") return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || time(a) - time(b);
    if (sort === "quantity") return (b.quantity ?? 0) - (a.quantity ?? 0) || time(a) - time(b);
    return time(a) - time(b);
  });
}

const stillNeeded = (d: NgoDrive) => d.quantityNeeded - (d.quantityReceived ?? 0) - (d.quantityPledged ?? 0);

type Decline = { offers: DriveOffer[]; title: string };

/** Offers to review (PENDING_NGO_REVIEW only), grouped by drive. Accept moves an offer to Handovers, decline to History. */
export function OffersPanel({ offers, reload }: { offers: DriveOffer[]; reload: () => Promise<void> | void }) {
  const ui = useUiText();
  const df = useTranslations("driveFlow");
  const dc = useDriveCopy();
  const [sort, setSort] = useState<OfferSort>("oldest");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [declining, setDeclining] = useState<Decline | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => {
    const byDrive = new Map<number, { drive: NgoDrive; offers: DriveOffer[] }>();
    for (const o of offers) {
      const g = byDrive.get(o.drive.id) ?? { drive: o.drive, offers: [] };
      g.offers.push(o);
      byDrive.set(o.drive.id, g);
    }
    // Drives with the longest-waiting offer first.
    return [...byDrive.values()]
      .map((g) => ({ ...g, offers: sortOffers(g.offers, sort) }))
      .sort((a, b) => Math.min(...a.offers.map(time)) - Math.min(...b.offers.map(time)));
  }, [offers, sort]);

  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const picked = offers.filter((o) => selected.has(o.id));

  async function run(action: () => Promise<unknown>, ok: string, fail: string) {
    setBusy(true);
    try { await action(); toast.success(ok); setSelected(new Set()); await reload(); return true; }
    catch (e) { toast.error(errorMessage(e, fail)); await reload(); return false; }
    finally { setBusy(false); }
  }

  /** One bulk call per drive (the endpoint is per drive). */
  function byDriveIds(list: DriveOffer[]) {
    const m = new Map<number, number[]>();
    for (const o of list) m.set(o.drive.id, [...(m.get(o.drive.id) ?? []), o.id]);
    return [...m.entries()];
  }

  /** One click: accept the full offered quantity. No quantity dialog. */
  async function acceptOne(offer: DriveOffer) {
    await run(() => reviewNgoDriveOffer(offer.drive.id, offer.id, "ACCEPT", undefined, offer.quantity ?? undefined),
      ui("Offer accepted. It's now in Handovers."), ui("We couldn't accept this offer."));
  }

  async function confirmDecline() {
    if (!declining || !reason.trim()) return;
    const list = declining.offers;
    const done = await run(
      () => list.length === 1
        ? reviewNgoDriveOffer(list[0].drive.id, list[0].id, "DECLINE", reason.trim())
        : Promise.all(byDriveIds(list).map(([driveId, ids]) => reviewNgoDriveOffersBulk(driveId, ids, "DECLINE", reason.trim()))),
      list.length === 1 ? ui("Offer declined. The donor will see your reason.") : df("offersDeclined", { count: list.length }),
      ui("We couldn't decline these offers."));
    if (done) { setDeclining(null); setReason(""); }
  }

  async function acceptSelected() {
    await run(() => Promise.all(byDriveIds(picked).map(([driveId, ids]) => reviewNgoDriveOffersBulk(driveId, ids, "ACCEPT"))),
      df("offersAccepted", { count: picked.length }), ui("We couldn't accept these offers."));
  }

  if (offers.length === 0) return <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400"><UiText>No offers waiting for your decision.</UiText></p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300"><UiText>Sort</UiText>
          <select value={sort} onChange={(e) => setSort(e.target.value as OfferSort)} data-testid="offer-sort"
            className="min-h-9 rounded-lg border border-stone-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{dc(l)}</option>)}
          </select>
        </label>
        {picked.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" data-testid="bulk-bar">
            <span className="text-sm font-semibold text-stone-600 dark:text-stone-300">{df("selectedCount", { count: picked.length })}</span>
            <Button size="sm" disabled={busy} onClick={() => void acceptSelected()} className="bg-ngo-700 hover:bg-ngo-800"><UiText>Accept selected</UiText></Button>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => { setDeclining({ offers: picked, title: df("declineN", { count: picked.length }) }); setReason(""); }}><UiText>Decline selected</UiText></Button>
          </div>
        )}
      </div>

      {groups.map(({ drive, offers: list }) => {
        const covered = drive.status === "FULLY_PLEDGED";
        return (
          <section key={drive.id} aria-label={drive.title} data-testid="offer-group" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-stone-900 dark:text-stone-100">{drive.title} <span className="font-normal text-stone-500">({list.length})</span></h3>
              {covered && (
                <Button size="sm" variant="outline" disabled={busy} data-testid="decline-remaining"
                  onClick={() => { setDeclining({ offers: list, title: ui("Decline all remaining offers?") }); setReason("This drive is now covered. Thank you for offering."); }}>
                  <UiText>Decline all remaining</UiText>
                </Button>
              )}
            </div>
            <ul className="space-y-3">
              {list.map((offer) => (
                <NgoOfferReviewCard key={offer.id} offer={offer} unit={drive.unit} stillNeeded={stillNeeded(drive)} label={covered ? ui("Drive covered") : null}
                  select={<input type="checkbox" aria-label={offer.donorDisplayName ? df("selectOfferFrom", { name: offer.donorDisplayName }) : ui("Select offer from donor")} checked={selected.has(offer.id)} onChange={() => toggle(offer.id)} className="mt-1 h-4 w-4 shrink-0 accent-ngo-700" />}
                  actions={<>
                    <Button size="sm" disabled={busy} className="bg-ngo-700 hover:bg-ngo-800" data-testid="accept-offer" onClick={() => void acceptOne(offer)}><UiText>Accept</UiText></Button>
                    <Button size="sm" variant="destructive" disabled={busy} onClick={() => { setDeclining({ offers: [offer], title: ui("Decline this offer?") }); setReason(""); }}><UiText>Decline</UiText></Button>
                  </>} />
              ))}
            </ul>
          </section>
        );
      })}

      <Dialog open={!!declining} onOpenChange={(o) => { if (!o) setDeclining(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{declining?.title}</DialogTitle>
            <DialogDescription><UiText>The donor will see your reason. Their quantity goes back to the drive.</UiText></DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-bold"><UiText>Reason</UiText>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} data-testid="decline-reason"
              className="mt-1 block w-full rounded-lg border border-stone-300 p-2 font-normal dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclining(null)}><UiText>Cancel</UiText></Button>
            <Button variant="destructive" disabled={!reason.trim() || busy} onClick={() => void confirmDecline()}><UiText>Decline</UiText></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
