"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  Gift,
  CheckCircle2,
  Camera,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useNgoStatus } from "./useNgoStatus";

export function NgoGlanceStrip() {
  const {
    isVerified,
    activeRequests,
    itemsPledged,
    dropoffsToConfirm,
    photosDue,
    photosDueRequestName,
    canPostRequest,
  } = useNgoStatus();

  // Strip is rendered for verified NGOs ONLY
  if (!isVerified) return null;

  const isPhotosWarning = photosDue > 0;
  const isEmptyState = activeRequests === 0 && photosDue === 0;

  return (
    <div className="w-full relative z-20 -mt-2 mb-8 sm:mb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Amber Photos-Due Banner Alert */}
        {isPhotosWarning ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40 p-4 sm:p-5 shadow-lg mb-4 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Photos Due · Request Posting Paused
                </p>
                <p className="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-100 mt-0.5">
                  Upload handover photos for <span className="underline decoration-amber-500">{photosDueRequestName}</span> to post your next request.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/ngo"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold px-5 py-2.5 text-xs sm:text-sm shadow-md transition-all shrink-0 w-full sm:w-auto"
            >
              <Camera className="w-4 h-4" />
              <span>Upload Photos →</span>
            </Link>
          </motion.div>
        ) : null}

        {/* 4 Stats Cards Grid */}
        <div
          className={`rounded-3xl border shadow-xl p-5 sm:p-7 backdrop-blur-md transition-all duration-300 ${
            isPhotosWarning
              ? "border-amber-300/80 dark:border-amber-800/80 bg-gradient-to-r from-amber-50/90 via-white/95 to-amber-50/90 dark:from-amber-950/30 dark:via-zinc-900/90 dark:to-amber-950/30"
              : "border-stone-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90"
          }`}
        >
          {/* Header row */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-200/70 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-ngo-950 dark:text-stone-100">
                At a glance
              </span>
            </div>
            <span className="text-3xs text-stone-500 dark:text-stone-400 font-medium">
              Live operations
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {/* 1. Active requests */}
            <div className="flex items-center gap-3.5 p-3 sm:p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-zinc-700/60">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-ngo-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tabular-nums">
                  {activeRequests}
                </div>
                <div className="text-3xs sm:text-xs font-bold text-stone-600 dark:text-stone-400">
                  Active requests
                </div>
              </div>
            </div>

            {/* 2. Items pledged */}
            <div className="flex items-center gap-3.5 p-3 sm:p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-zinc-700/60">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-ngo-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tabular-nums">
                  {itemsPledged}
                </div>
                <div className="text-3xs sm:text-xs font-bold text-stone-600 dark:text-stone-400">
                  Items pledged
                </div>
              </div>
            </div>

            {/* 3. Drop-offs to confirm */}
            <div className="flex items-center gap-3.5 p-3 sm:p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200/60 dark:border-zinc-700/60">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-ngo-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 tabular-nums">
                  {dropoffsToConfirm}
                </div>
                <div className="text-3xs sm:text-xs font-bold text-stone-600 dark:text-stone-400">
                  Drop-offs to confirm
                </div>
              </div>
            </div>

            {/* 4. Photos due */}
            <div
              className={`flex items-center gap-3.5 p-3 sm:p-4 rounded-2xl border ${
                photosDue > 0
                  ? "bg-amber-100/70 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100"
                  : "bg-stone-50 dark:bg-zinc-800/60 border-stone-200/60 dark:border-zinc-700/60"
              }`}
            >
              <div
                className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  photosDue > 0
                    ? "bg-amber-500 text-white"
                    : "bg-ngo-700 text-white"
                }`}
              >
                <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div
                  className={`text-2xl sm:text-3xl font-black tabular-nums ${
                    photosDue > 0
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-stone-900 dark:text-stone-100"
                  }`}
                >
                  {photosDue}
                </div>
                <div className="text-3xs sm:text-xs font-bold text-stone-600 dark:text-stone-400">
                  Photos due
                </div>
              </div>
            </div>
          </div>

          {/* Empty state message for new NGO */}
          {isEmptyState && (
            <div className="mt-5 pt-4 border-t border-stone-100 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm text-stone-600 dark:text-stone-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-ngo-700 dark:text-ngo-300 shrink-0" />
                <span>
                  Nothing posted yet. Your first request takes 2 minutes.
                </span>
              </div>
              <Link
                href="/ngo/requests/new"
                className="inline-flex items-center gap-1.5 font-bold text-ngo-700 dark:text-ngo-300 hover:text-ngo-800 dark:hover:text-ngo-200"
              >
                <span>Post a Request</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NgoGlanceStrip;
