"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { getNgoDrives, type PublicNgoDrive } from "@/lib/api";
import { NgoDriveCard, NgoDriveCardSkeleton } from "./NgoDriveCard";
import { sortNgoDrives } from "../ngoDriveFilters";
import { LiveBoardHeader } from "@/components/home/LiveBoardHeader";
import { CategoryChipsRow } from "@/components/home/CategoryChipsRow";
import { LiveBoardBanner } from "@/components/home/LiveBoardBanner";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
import { useCategoryLabel } from "@/lib/categoryLabel";
const DRIVES_SHOWN = 3;

export type NgoDrivesSectionProps = {
  /** Optional pre-fetched drives */
  initialDrives?: PublicNgoDrive[];
  className?: string;
};

export function NgoDrivesSection({ initialDrives, className = "" }: NgoDrivesSectionProps) {
  const ui = useUiText();
  const df = useTranslations("driveFlow");
  const categoryLabel = useCategoryLabel();
  const [drives, setDrives] = useState<PublicNgoDrive[]>(initialDrives ?? []);
  const [loading, setLoading] = useState<boolean>(!initialDrives);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

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

  // Compute category counts from all live drives
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const drive of drives) {
      if (drive.category) {
        counts[drive.category] = (counts[drive.category] ?? 0) + 1;
      }
    }
    return counts;
  }, [drives]);

  // Filter and sort drives (urgency-first sort maintained)
  const filteredDrives = useMemo(() => {
    const matched =
      selectedCategory === "All"
        ? drives
        : drives.filter((d) => d.category === selectedCategory);
    return sortNgoDrives(matched);
  }, [drives, selectedCategory]);

  // If there are zero live drives at all, hide the whole section (no empty box or orphan header on landing)
  if (!loading && drives.length === 0) {
    return null;
  }

  const visibleDrives = filteredDrives.slice(0, DRIVES_SHOWN);

  return (
    <section
      id="ngo-drives-section"
      aria-labelledby="ngo-drives-heading"
      className={`ck-m-section ck-drives-donor-tone relative w-full lg:bg-[var(--surface-cream,#faf8f5)] lg:dark:bg-zinc-950 ck-live-needs-section overflow-hidden transition-colors ${className}`}
      data-testid="ngo-drives-section"
    >
      <div className="relative mx-auto max-w-7xl px-0 lg:px-8">
        {/* ── Section Header ── */}
        <LiveBoardHeader
          headingId="ngo-drives-heading"
          badgeLabel="NGO DRIVES"
          badgeDotClassName="bg-emerald-600 dark:bg-emerald-400"
          badgeClassName="mb-5 inline-flex w-max items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800 ring-1 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30"
          headlinePrimary="Drives by"
          headlineAccent="verified NGOs"
          headlineAccentClassName="text-emerald-700 dark:text-emerald-400"
          subtitle="NGOs across India list the exact items they need. Pick a drive and give."
          trustCard={{
            title: ui("Every NGO is verified"),
            description: "We check each NGO's registration, address and contact person before its drive goes live.",
            iconBoxClassName: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
          }}
        />

        {/* ── Category Filter Pills Row ── */}
        <CategoryChipsRow
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          categoryCounts={categoryCounts}
          disableEmpty
          activeClassName="bg-emerald-700 text-white shadow-sm shadow-emerald-950/20 ring-2 ring-emerald-600/30 dark:bg-emerald-600"
          groupAriaLabel={ui("Filter NGO drives by category")}
        />

        {/* ── Cards Grid / Loading / Empty State ── */}
        {loading ? (
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((n) => (
              <NgoDriveCardSkeleton key={n} />
            ))}
          </div>
        ) : visibleDrives.length === 0 ? (
          <div
            data-testid="ngo-drives-empty-filters"
            className="mx-auto flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/50 px-6 py-10 text-center max-w-2xl"
          >
            <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center text-stone-400 dark:text-stone-500">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm sm:text-base font-bold text-stone-700 dark:text-stone-200">
              {df("noActiveDrivesIn", { category: categoryLabel(selectedCategory) })}
            </p>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm">
              <UiText>Check back soon — new drives are added regularly. Try another category in the meantime.</UiText>
            </p>
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold px-5 py-2.5 text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              <span><UiText>Show all categories</UiText></span>
            </button>
          </div>
        ) : (
          <div
            className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3"
            role="region"
            aria-label={ui("Active NGO drives")}
          >
            {visibleDrives.map((drive) => (
              <NgoDriveCard key={drive.id} drive={drive} />
            ))}
          </div>
        )}

        {/* ── Bottom Banner ── */}
        <LiveBoardBanner
          heading={ui("Want to see every drive?")}
          subtext="Browse every drive by a verified NGO and give the items they need."
          buttonLabel={ui("SEE ALL DRIVES")}
          buttonHref="/requests?source=ngo"
          iconBoxClassName="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0"
          buttonClassName="inline-flex items-center gap-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold px-5 py-2.5 lg:min-h-12 lg:px-7 text-xs uppercase tracking-wider transition-all lg:duration-500 lg:ease-[cubic-bezier(0.32,0.72,0,1)] shadow-md shadow-emerald-950/20 active:scale-95 lg:active:scale-[0.98] shrink-0"
        />
      </div>
    </section>
  );
}
