"use client";

import Link from "next/link";
import { ArrowRight, Camera } from "lucide-react";
import type { NgoOverview } from "@/lib/api";
import { proofDeadline } from "@/features/ngo-drives/components/manage/ProofDuePanel";
import { activityHref } from "@/features/ngo-drives/components/manage/driveActivity";
import type { NgoStatusData } from "./useNgoStatus";

type ProofDueDrive = NonNullable<NgoOverview["proofDueDrives"]>[number];
const LIMIT = 3;

/**
 * Approved-state landing section: drives waiting for distribution proof. Same data source as
 * the navbar locks (useNgoStatus -> /ngo/overview.proofDueDrives; the backend applies
 * COLLECTION_COMPLETE/CLOSED, received > 0, no proof). Skeleton while loading; hidden on
 * error or when nothing is due.
 */
export function NgoProofDueSection({ status }: { status: Pick<NgoStatusData, "isLoading" | "error" | "overview" | "statsUnavailable"> }) {
  const loading = status.isLoading;
  const drives: ProofDueDrive[] | null = loading ? null : (status.overview?.proofDueDrives ?? []).filter((d) => (d.quantityReceived ?? 0) > 0);
  if (!loading && (status.error || status.statsUnavailable || !status.overview || !drives || drives.length === 0)) return null;

  return (
    <section className="ngo-section ngo-band-cream pt-0" aria-labelledby="ngo-proof-due-heading" data-testid="ngo-proof-due">
      <div className="ngo-container">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="ngo-eyebrow">Proof due</span>
            <h2 id="ngo-proof-due-heading" className="ngo-heading text-3xl text-stone-900 dark:text-stone-100">Show donors where their items went.</h2>
          </div>
          {drives && drives.length > LIMIT && (
            <Link href={activityHref("proof")} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-[#2F8F5B] underline-offset-2 hover:underline">
              See all ({drives.length}) <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
        {!drives ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="ngo-proof-due-skeleton" aria-busy="true">
            {[0, 1, 2].map((i) => <div key={i} className="ngo-card h-40 animate-pulse bg-stone-100 dark:bg-white/5" />)}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {drives.slice(0, LIMIT).map((d) => {
              const deadline = proofDeadline(d.proofDueAt);
              return (
                <li key={d.id} data-testid="ngo-proof-due-card" className="ngo-card h-full justify-between">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h3 className="ngo-heading min-w-0 break-words text-xl text-stone-900 dark:text-stone-100">{d.title}</h3>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${deadline?.overdue ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100" : "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"}`}>
                      {deadline?.overdue ? "Overdue" : "Due soon"}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600 dark:text-stone-300">{d.quantityReceived} received</p>
                  {deadline && <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{deadline.text}</p>}
                  <Link href={activityHref("proof", d.id)} className="ngo-btn-pill ngo-btn-gold mt-5 inline-flex min-h-[44px] items-center justify-center">
                    <Camera className="mr-2 h-4 w-4" aria-hidden /> <span>Submit proof</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
