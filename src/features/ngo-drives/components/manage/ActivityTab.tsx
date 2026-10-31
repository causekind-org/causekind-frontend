"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { NgoDrive } from "@/lib/api";
import { Chip } from "./YourDrivesTab";
import { isHandover, isOfferToReview, isProofDue, type ActivityFilter } from "./driveActivity";
import { OffersPanel } from "./OffersPanel";
import { HandoversPanel } from "./HandoversPanel";
import { useDriveCopy } from "@/features/ngo-drives/driveCopy";
import { ProofDuePanel } from "./ProofDuePanel";
import type { DriveOffer } from "./useNgoOffers";

import { UiText, useUiText } from "@/components/UiText";
const FILTERS: [ActivityFilter, string][] = [["offers", "Offers to review"], ["handovers", "Handovers"], ["proof", "Proof due"]];

/** Activity: what needs the NGO now. ?filter= picks the list, ?drive= narrows it to one drive. */
export function ActivityTab({ drives, offers, loading, error, reload, onDrivesChanged }: {
  drives: NgoDrive[]; offers: DriveOffer[]; loading: boolean; error: string | null; reload: () => Promise<void> | void; onDrivesChanged: () => void;
}) {
  const ui = useUiText();
  const dc = useDriveCopy();
  const router = useRouter();
  const params = useSearchParams();
  const filterParam = params.get("filter");
  // No ?filter=: all three rows. A chip (or an old ?filter= link) shows only its row.
  const filter: ActivityFilter | null = FILTERS.some(([f]) => f === filterParam) ? (filterParam as ActivityFilter) : null;
  const driveId = Number(params.get("drive")) || null;
  const focus = driveId ? drives.find((d) => d.id === driveId) ?? null : null;

  const forDrive = <T extends { drive: NgoDrive }>(list: T[]) => (driveId ? list.filter((o) => o.drive.id === driveId) : list);
  const toReview = forDrive(offers.filter(isOfferToReview));
  const handovers = forDrive(offers.filter(isHandover));
  const proofDue = drives.filter(isProofDue).filter((d) => !driveId || d.id === driveId);
  const counts: Record<ActivityFilter, number> = { offers: toReview.length, handovers: handovers.length, proof: proofDue.length };

  function go(next: Partial<{ filter: ActivityFilter | null; drive: number | null }>) {
    const q = new URLSearchParams(params.toString());
    q.set("tab", "activity");
    if (next.filter) q.set("filter", next.filter);
    if (next.filter === null) q.delete("filter");
    if (next.drive === null) q.delete("drive");
    router.replace(`/dashboard/ngo?${q.toString()}`, { scroll: false });
  }
  const refresh = async () => { await reload(); onDrivesChanged(); };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={ui("Activity")}>
        {FILTERS.map(([key, label]) => (
          <Chip key={key} active={filter === key} onClick={() => go({ filter: filter === key ? null : key })} testId={`activity-chip-${key}`}>
            {dc(label)} <span className="tabular-nums opacity-70">{counts[key]}</span>
          </Chip>
        ))}
      </div>
      {driveId && (
        <p className="text-sm text-stone-600 dark:text-stone-300" data-testid="activity-drive-filter">
          <UiText>Showing</UiText> {focus ? <Link href={`/ngo/drives/${focus.id}`} className="font-bold text-ngo-700 underline dark:text-ngo-300">{focus.title}</Link> : ui("one drive")}.{" "}
          <button type="button" className="font-semibold underline" onClick={() => go({ drive: null })}><UiText>Show all drives</UiText></button>
        </p>
      )}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error === "LOAD_FAILED" ? ui("We couldn't load your offers.") : error} <button type="button" className="font-bold underline" onClick={() => void reload()}><UiText>Retry</UiText></button></p>}
      {loading && offers.length === 0 ? <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-stone-300" /></div> : (
        FILTERS.filter(([key]) => !filter || filter === key).map(([key, label]) => (
          <section key={key} data-testid={`activity-row-${key}`} aria-labelledby={`activity-row-${key}-h`} className="space-y-3">
            <h3 id={`activity-row-${key}-h`} className="flex items-center gap-2 border-b-2 border-ngo-700/50 pb-2 text-3xs font-black uppercase tracking-[0.24em] text-ngo-700 dark:border-ngo-400/40 dark:text-ngo-400">
              {dc(label)} <span className="rounded-full bg-ngo-100 px-1.5 py-px tabular-nums text-ngo-800 dark:bg-ngo-900/40 dark:text-ngo-100">{counts[key]}</span>
            </h3>
            {key === "offers" ? <OffersPanel offers={toReview} reload={refresh} />
              : key === "handovers" ? <HandoversPanel offers={handovers} reload={refresh} />
              : <ProofDuePanel drives={proofDue} onSubmitted={refresh} focusDriveId={driveId} />}
          </section>
        ))
      )}
    </div>
  );
}
