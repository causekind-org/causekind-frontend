"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { getNgoDrives, type PublicNgoDrive } from "@/lib/api";
import { NgoDriveCard, NgoDriveCardSkeleton } from "./NgoDriveCard";
import {
  type DriveTypeFilter,
  type DriveUrgencyFilter,
  DRIVE_TYPE_OPTIONS,
  DRIVE_URGENCY_OPTIONS,
  filterNgoDrives,
  sortNgoDrives,
} from "../ngoDriveFilters";

export type NgoDrivesSectionProps = {
  /** Optional pre-fetched drives */
  initialDrives?: PublicNgoDrive[];
  className?: string;
};

export function NgoDrivesSection({ initialDrives, className = "" }: NgoDrivesSectionProps) {
  const [drives, setDrives] = useState<PublicNgoDrive[]>(initialDrives ?? []);
  const [loading, setLoading] = useState<boolean>(!initialDrives);
  const [typeFilter, setTypeFilter] = useState<DriveTypeFilter>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<DriveUrgencyFilter>("all");

  useEffect(() => {
    if (initialDrives) return;
    let active = true;
    getNgoDrives()
      .then((rows) => {
        if (active) {
          // LIVE drives only
          const liveRows = (rows ?? []).filter((d) => (d.status ?? "").toUpperCase() === "LIVE");
          setDrives(liveRows);
        }
      })
      .catch(() => {
        // Silently tolerate backend error on landing page
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialDrives]);

  // Filter and sort drives
  const processedDrives = useMemo(() => {
    const filtered = filterNgoDrives(drives, {
      type: typeFilter,
      urgency: urgencyFilter,
    });
    return sortNgoDrives(filtered);
  }, [drives, typeFilter, urgencyFilter]);

  // If there are zero live drives at all, hide the whole section (no empty box on landing)
  if (!loading && drives.length === 0) {
    return null;
  }

  const visibleDrives = processedDrives.slice(0, 6);
  const isFiltering = typeFilter !== "all" || urgencyFilter !== "all";

  const handleClearFilters = () => {
    setTypeFilter("all");
    setUrgencyFilter("all");
  };

  const pillClass = (active: boolean) =>
    `inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
      active
        ? "bg-emerald-700 text-white shadow-sm dark:bg-emerald-600"
        : "border border-stone-200/90 bg-white text-stone-700 hover:border-stone-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-stone-300 dark:hover:border-zinc-700"
    }`;

  return (
    <section
      id="ngo-drives-section"
      aria-labelledby="ngo-drives-heading"
      className={`relative w-full py-12 sm:py-16 transition-colors ${className}`}
      data-testid="ngo-drives-section"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Section Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="max-w-2xl min-w-0">
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
              Verified Initiatives
            </div>
            <h2
              id="ngo-drives-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100"
            >
              NGO drives
            </h2>
            <p className="mt-2 text-sm sm:text-base text-stone-600 dark:text-stone-400 font-medium">
              Community campaigns run by verified ground organisations across India.
            </p>
          </div>

          <Link
            href="/requests?source=ngo"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 group shrink-0"
            data-testid="view-all-ngo-drives-link"
          >
            <span>View all NGO drives</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        {/* ── Filter Controls ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            {/* Drive Type Chips: All / Items / Money (Money disabled) */}
            <div role="group" aria-label="Filter drives by type" className="flex items-center gap-1.5">
              {DRIVE_TYPE_OPTIONS.map((opt) => {
                const active = typeFilter === opt.id;
                if (opt.disabled) {
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Money drives are coming soon"
                      className="inline-flex min-h-9 cursor-not-allowed items-center gap-1.5 rounded-full border border-dashed border-stone-200 bg-stone-100/70 px-3.5 py-1.5 text-xs font-semibold text-stone-400 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-stone-500 opacity-70"
                    >
                      {opt.label}
                      {opt.badge && (
                        <span className="rounded-full bg-stone-200/80 px-1.5 py-0.5 text-4xs uppercase tracking-wider text-stone-600 dark:bg-zinc-800 dark:text-stone-400 font-bold">
                          {opt.badge}
                        </span>
                      )}
                    </button>
                  );
                }
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTypeFilter(opt.id)}
                    aria-pressed={active}
                    className={pillClass(active)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <span className="hidden sm:inline-block h-4 w-px bg-stone-200 dark:bg-zinc-800 mx-1" aria-hidden="true" />

            {/* Urgency Chips: All / Normal / High / Urgent */}
            <div role="group" aria-label="Filter drives by urgency" className="flex items-center gap-1.5">
              {DRIVE_URGENCY_OPTIONS.map((opt) => {
                const active = urgencyFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setUrgencyFilter(opt.id)}
                    aria-pressed={active}
                    className={pillClass(active)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {isFiltering && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 underline underline-offset-4"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>

        {/* ── Cards Grid / Empty State ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((n) => (
              <NgoDriveCardSkeleton key={n} />
            ))}
          </div>
        ) : visibleDrives.length === 0 ? (
          <div
            data-testid="ngo-drives-empty-filters"
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/70 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <p className="text-base font-bold text-stone-800 dark:text-stone-200">
              No live drives match your filters
            </p>
            <p className="mt-1 text-xs sm:text-sm text-stone-500 dark:text-stone-400">
              Try adjusting the urgency or type filter.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleDrives.map((drive) => (
              <NgoDriveCard key={drive.id} drive={drive} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
