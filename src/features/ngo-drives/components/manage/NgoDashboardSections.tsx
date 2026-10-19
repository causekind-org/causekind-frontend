"use client";

import type { ComponentType, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, History, LayoutGrid, Lock } from "lucide-react";
import type { NgoDrive } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isOfferToReview, isHandover, isProofDue, isHistoryDrive, isHistoryOffer, HANDOVER_GROUPS } from "./driveActivity";
import { useNgoOffers } from "./useNgoOffers";
import { YourDrivesTab } from "./YourDrivesTab";
import { ActivityTab } from "./ActivityTab";
import { HistoryTab } from "./HistoryTab";

export type NgoSection = "drives" | "activity" | "history";
const SECTIONS: readonly string[] = ["drives", "activity", "history"];
const ISSUE_STATUSES = new Set<string>(HANDOVER_GROUPS.issues);

/** Same look as the donor dashboard's section tabs, in NGO green: count badge + dot when action is needed. */
function NgoSectionTab({ value, icon: Icon, label, count, attention }: {
  value: NgoSection; icon: ComponentType<{ className?: string }>; label: string; count: number; attention: boolean;
}) {
  return (
    <TabsTrigger value={value} data-testid={`ngo-tab-${value}`}
      className="group relative flex h-auto min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold text-stone-500 transition-colors hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-600/40 data-[state=active]:bg-ngo-700 data-[state=active]:text-white data-[state=active]:shadow-md dark:text-stone-400 dark:hover:text-stone-200 dark:data-[state=active]:bg-ngo-500/25 dark:data-[state=active]:text-ngo-50 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm">
      <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
      <span className="truncate">{label}</span>
      <span className="shrink-0 rounded-full bg-stone-100 px-1.5 py-px text-3xs font-bold tabular-nums text-stone-500 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white dark:bg-zinc-800 dark:text-stone-400">{count}</span>
      {attention && (
        <>
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2" aria-hidden data-testid={`ngo-tab-${value}-dot`}>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ngo-400 opacity-75 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ngo-500" />
          </span>
          <span className="sr-only">(needs your attention)</span>
        </>
      )}
    </TabsTrigger>
  );
}

/** /dashboard/ngo: Your Drives, Activity, History. ?tab=, ?drive= and ?filter= deep-link into them. */
export function NgoDashboardSections({ drives, verified, loading, error, onRetry, startDrive }: {
  drives: NgoDrive[]; verified: boolean; loading: boolean; error: boolean; onRetry: () => void;
  /** The existing Start a Drive control (enabled or locked), shown when there are no drives. */
  startDrive: ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const section: NgoSection = tabParam && SECTIONS.includes(tabParam) ? (tabParam as NgoSection) : "drives";
  const { offers, loading: offersLoading, error: offersError, reload } = useNgoOffers(drives, verified);

  const toReview = offers.filter(isOfferToReview);
  const handovers = offers.filter(isHandover);
  const proofDue = drives.filter(isProofDue);
  // Each drive and offer in exactly one place: Your Drives/Activity until proof is approved, then History.
  const activeDrives = drives.filter((d) => !isHistoryDrive(d));
  const historyDrives = drives.filter(isHistoryDrive);
  const historyOffers = offers.filter(isHistoryOffer);
  const activityNeedsYou = toReview.length > 0 || proofDue.some((d) => d.status === "COLLECTION_COMPLETE") || handovers.some((o) => ISSUE_STATUSES.has(o.status));

  function select(next: string) {
    const q = new URLSearchParams(params.toString());
    q.set("tab", next);
    if (next !== "activity") { q.delete("filter"); q.delete("drive"); }
    router.replace(`/dashboard/ngo?${q.toString()}`, { scroll: false });
  }

  if (!verified) {
    return (
      <div className="space-y-3 py-10 text-center">
        <Lock className="mx-auto h-6 w-6 text-ngo-700 dark:text-ngo-400" aria-hidden />
        <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Drives unlock after verification</p>
        <p className="mx-auto max-w-[260px] text-xs text-stone-400">Once our team approves your NGO, you can start drives for givers near you.</p>
      </div>
    );
  }

  return (
    <Tabs value={section} onValueChange={select} className="space-y-4 sm:space-y-6">
      <TabsList aria-label="Dashboard sections"
        className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border border-stone-200/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/70">
        <NgoSectionTab value="drives" icon={LayoutGrid} label="Your Drives" count={activeDrives.length} attention={false} />
        <NgoSectionTab value="activity" icon={ClipboardList} label="Activity" count={toReview.length + handovers.length + proofDue.length} attention={activityNeedsYou} />
        <NgoSectionTab value="history" icon={History} label="History" count={historyDrives.length + historyOffers.length} attention={false} />
      </TabsList>
      <TabsContent value="drives" className="mt-0">
        <YourDrivesTab drives={activeDrives} offers={offers} loading={loading} error={error} onRetry={onRetry} startDrive={startDrive} />
      </TabsContent>
      <TabsContent value="activity" className="mt-0">
        <ActivityTab drives={drives} offers={offers} loading={offersLoading} error={offersError} reload={reload} onDrivesChanged={onRetry} />
      </TabsContent>
      <TabsContent value="history" className="mt-0">
        <HistoryTab drives={historyDrives} offers={historyOffers} />
      </TabsContent>
    </Tabs>
  );
}
