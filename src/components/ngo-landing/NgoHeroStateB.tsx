"use client";

import { useNgoStatus } from "./useNgoStatus";
import { LockedCta } from "./LockedCta";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Box, Camera, CheckCircle2, ShieldCheck } from "lucide-react";
import { CountUp } from "./motion/CountUp";

export function NgoHeroStateB() {
  const status = useNgoStatus();
  const { ngoName, overview } = status;

  const resetWelcomeShown = () => {
    try { localStorage.removeItem(`ngo-verified-welcome-shown-undefined`); } catch {}
    // Need a page reload to trigger it again since we removed the state from useNgoStatus.
    // In dev it works for preview
    window.location.reload();
  };

  return (
    <section className="relative pt-32 pb-16 px-6 max-w-6xl mx-auto min-h-[70vh] flex flex-col justify-center">
      <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-4 text-center items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-ngo-500)]/10 text-[var(--color-ngo-700)] dark:text-[var(--color-ngo-400)] rounded-full text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified NGO</span>
            <button 
              onClick={resetWelcomeShown} 
              className="ml-2 text-xs opacity-60 hover:opacity-100 hover:underline transition-opacity"
            >
              Replay
            </button>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-display">
            Welcome, {ngoName}.
          </h1>
          <p className="text-lg md:text-xl text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
            You're verified. Mission Control gives you a high-level view of your active drives and required actions.
          </p>
        </div>

        {/* Glance Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Link href="/dashboard/ngo#live-drives" className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group">
            <p className="text-sm font-medium text-stone-500 mb-2">Live Drives</p>
            <p className="text-3xl font-bold text-[var(--color-ngo-600)] dark:text-[var(--color-ngo-400)] group-hover:scale-105 transform origin-left transition-transform">
              <CountUp end={overview?.activeRequests ?? 0} />
            </p>
          </Link>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-sm">
            <p className="text-sm font-medium text-stone-500 mb-2">Items Pledged</p>
            <p className="text-3xl font-bold text-stone-900 dark:text-stone-100">
              <CountUp end={overview?.itemsPledged ?? 0} />
            </p>
          </div>
          <Link href="/ngo/handovers" className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-stone-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group">
            <p className="text-sm font-medium text-stone-500 mb-2">Confirm Drop-offs</p>
            <p className="text-3xl font-bold text-stone-900 dark:text-stone-100 group-hover:scale-105 transform origin-left transition-transform">
              <CountUp end={overview?.dropoffsToConfirm ?? 0} />
            </p>
          </Link>
          <Link href="/ngo/handovers" className={`p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow group ${status.photosDue > 0 ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/50' : 'bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-800'}`}>
            <p className={`text-sm font-medium mb-2 ${status.photosDue > 0 ? 'text-amber-700 dark:text-amber-500' : 'text-stone-500'}`}>Photos Due</p>
            <p className={`text-3xl font-bold group-hover:scale-105 transform origin-left transition-transform ${status.photosDue > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-stone-900 dark:text-stone-100'}`}>
              <CountUp end={overview?.photosDue ?? 0} />
            </p>
          </Link>
        </div>

        {/* Next Best Action & Active Drive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          
          {/* Next Best Action */}
          <div className="bg-[var(--color-ngo-500)] text-white p-8 rounded-3xl flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold mb-4">Next Best Action</h2>
              {status.photosDue > 0 ? (
                <p className="text-[var(--color-ngo-50)] text-lg">
                  You have {status.photosDue} drop-off{status.photosDue === 1 ? '' : 's'} requiring a receipt photo.
                </p>
              ) : status.dropoffsToConfirm > 0 ? (
                <p className="text-[var(--color-ngo-50)] text-lg">
                  You have {status.dropoffsToConfirm} drop-off{status.dropoffsToConfirm === 1 ? '' : 's'} to confirm.
                </p>
              ) : status.activeRequests > 0 ? (
                <p className="text-[var(--color-ngo-50)] text-lg">
                  Your drive is live and looking for local donors.
                </p>
              ) : (
                <p className="text-[var(--color-ngo-50)] text-lg">
                  You're all caught up! You have no active drives or pending actions.
                </p>
              )}
            </div>
            
            <div className="mt-8">
              {status.photosDue > 0 ? (
                <Button asChild variant="secondary" className="w-fit text-[var(--color-ngo-700)]">
                  <Link href="/ngo/handovers">
                    <Camera className="w-4 h-4 mr-2" />
                    Upload Photos
                  </Link>
                </Button>
              ) : status.dropoffsToConfirm > 0 ? (
                <Button asChild variant="secondary" className="w-fit text-[var(--color-ngo-700)]">
                  <Link href="/ngo/handovers">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm Drop-offs
                  </Link>
                </Button>
              ) : status.activeRequests > 0 ? (
                <Button asChild variant="secondary" className="w-fit text-[var(--color-ngo-700)]">
                  <Link href="/dashboard/ngo#live-drives">
                    <Box className="w-4 h-4 mr-2" />
                    View Drive
                  </Link>
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <LockedCta className="w-fit bg-white hover:bg-stone-100 text-[var(--color-ngo-700)] hover:text-[var(--color-ngo-800)] border-none" variant="outline">
                    Start a Drive
                  </LockedCta>
                  {!status.canStartDrive && (
                    <p className="text-xs text-[var(--color-ngo-100)]">{status.lockReason}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active Drive Card (from real fields) */}
          <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 p-8 rounded-3xl flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold mb-4 text-stone-900 dark:text-stone-100">Current Drive</h2>
              {status.blockingDriveTitle ? (
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium text-lg">{status.blockingDriveTitle}</h3>
                  {overview?.blockingDriveStatus && (
                    <span className="text-sm font-medium text-stone-500 uppercase tracking-wide">
                      {overview.blockingDriveStatus.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-12 text-stone-500">
                  <Box className="w-12 h-12 mb-4 text-stone-300 dark:text-stone-700" />
                  <p>No active drive.</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 flex justify-end">
               {status.blockingDriveTitle ? (
                 <Button asChild variant="outline">
                    <Link href="/dashboard/ngo#live-drives">
                      Manage Drive <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                 </Button>
               ) : (
                 <div className="flex flex-col items-end gap-2">
                    <LockedCta>
                      Start a Drive
                    </LockedCta>
                    {!status.canStartDrive && (
                      <p className="text-xs text-stone-500 text-right">{status.lockReason}</p>
                    )}
                 </div>
               )}
            </div>
          </div>
        </div>
        {/* Impact Area (Empty State) */}
        <div className="mt-4 bg-stone-50 dark:bg-zinc-800/50 p-8 rounded-3xl border border-stone-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold mb-2 text-stone-900 dark:text-stone-100">Your Impact</h2>
          <p className="text-stone-500 max-w-md">
            Complete your first drive to start building your impact profile. Verified deliveries and community badges will appear here.
          </p>
        </div>
      </div>
    </section>
  );
}
