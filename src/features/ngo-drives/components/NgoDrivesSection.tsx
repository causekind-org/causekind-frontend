"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { getNgoDrives, type PublicNgoDrive } from "@/lib/api";
import { NgoDriveCard, NgoDriveCardSkeleton } from "./NgoDriveCard";
import { sortNgoDrives } from "../ngoDriveFilters";
import { DiwaliSeam } from "@/components/home/DiwaliMobileLayer";
import { LiveBoardHeader } from "@/components/home/LiveBoardHeader";
import { CategoryChipsRow } from "@/components/home/CategoryChipsRow";
import { LiveBoardBanner } from "@/components/home/LiveBoardBanner";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
import { useCategoryLabel } from "@/lib/categoryLabel";
const DRIVES_SHOWN = 3;
/** The skeletons give way to an error + Retry after this long; a late answer still fills the cards. */
export const DRIVES_LOAD_TIMEOUT_MS = 10_000;

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
  const [failed, setFailed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  // Below 768px: one card at a time (swipe, < >, dots), like the donee section.
  const [isMobile, setIsMobile] = useState(false);
  const [page, setPage] = useState(0);
  const swipeStart = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => { setIsMobile(query.matches); setPage(0); };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  useEffect(() => { setPage(0); }, [selectedCategory]);
  // Only the latest attempt of the mounted section may touch state.
  const attempt = useRef(0);

  const load = useCallback(() => {
    const mine = ++attempt.current;
    setLoading(true);
    setFailed(false);
    const fail = () => {
      if (attempt.current !== mine) return;
      setFailed(true);
      setLoading(false);
    };
    const timer = setTimeout(fail, DRIVES_LOAD_TIMEOUT_MS);
    getNgoDrives()
      .then((rows) => {
        if (attempt.current !== mine) return;
        // LIVE drives only
        setDrives((rows ?? []).filter((d) => (d.status ?? "").toUpperCase() === "LIVE"));
        setFailed(false);
        setLoading(false);
      })
      .catch(fail)
      .finally(() => clearTimeout(timer));
  }, []);

  useEffect(() => {
    if (initialDrives) return;
    load();
    return () => {
      attempt.current += 1;
    };
  }, [initialDrives, load]);

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

  const noLiveDrives = !loading && !failed && drives.length === 0;
  const pageCount = filteredDrives.length;
  const activePage = Math.min(page, Math.max(0, pageCount - 1));
  const visibleDrives = isMobile ? filteredDrives.slice(activePage, activePage + 1) : filteredDrives.slice(0, DRIVES_SHOWN);
  const moreCount = filteredDrives.length - visibleDrives.length;

  return (
    <>
    <DiwaliSeam kind="line" lanterns="right" art="oval" />
    <section
      id="ngo-drives-section"
      aria-labelledby="ngo-drives-heading"
      className={`ck-m-section ck-drives-theme relative w-full lg:bg-[var(--surface-cream,#faf8f5)] lg:dark:bg-zinc-950 ck-live-needs-section overflow-hidden transition-colors ${className}`}
      data-testid="ngo-drives-section"
    >
      <div className="relative mx-auto max-w-7xl px-0 lg:px-8">
        {/* ── Section Header ── */}
        <LiveBoardHeader
          headingId="ngo-drives-heading"
          badgeLabel="NGO DRIVES"
          headlinePrimary="Drives by"
          headlineAccent="verified NGOs"
          subtitle="NGOs across India list the exact items they need. Pick a drive and give."
          trustCard={{
            title: ui("Every NGO is verified"),
            description: isMobile ? "Documents and registration checked before a drive goes live" : "We check each NGO's registration, address and contact person before its drive goes live.",
          }}
        />

        {/* ── Category Filter Pills Row ── */}
        <CategoryChipsRow
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          categoryCounts={categoryCounts}
          disableEmpty
          groupAriaLabel={ui("Filter NGO drives by category")}
        />

        {/* ── Cards Grid / Loading / Empty State ── */}
        {noLiveDrives ? (
          <div
            data-testid="ngo-drives-empty"
            className="mx-auto flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/50 px-6 py-10 text-center max-w-2xl"
          >
            <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center text-stone-400 dark:text-stone-500">
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            </div>
            <p className="text-sm sm:text-base font-bold text-stone-700 dark:text-stone-200">
              <UiText>No open drives in</UiText> {selectedCategory} <UiText>right now</UiText>
            </p>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm">
              <UiText>Check back soon: verified NGOs add new drives regularly.</UiText>
            </p>
          </div>
        ) : loading ? (
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {(isMobile ? [0] : [0, 1, 2]).map((n) => (
              <NgoDriveCardSkeleton key={n} />
            ))}
          </div>
        ) : failed && drives.length === 0 ? (
          <div role="alert" data-testid="ngo-drives-error" className="mx-auto flex max-w-2xl flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
            <p className="text-sm font-bold text-stone-700 dark:text-stone-200"><UiText>We couldn't load the drives.</UiText></p>
            <button type="button" onClick={load} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--ck-home-accent,#b04a15)] hover:bg-[var(--ck-home-hover,#963c0d)] text-white px-5 text-xs font-extrabold uppercase tracking-wider">
              <UiText>Retry</UiText>
            </button>
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
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--ck-home-accent,#b04a15)] hover:bg-[var(--ck-home-hover,#963c0d)] text-white font-extrabold px-5 py-2.5 text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              <span><UiText>Show all categories</UiText></span>
            </button>
          </div>
        ) : (
          <div
            className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3"
            role="region"
            aria-label={ui("Active NGO drives")}
            onTouchStart={(e) => { swipeStart.current = e.touches[0]?.clientX ?? null; }}
            onTouchEnd={(e) => {
              if (!isMobile || swipeStart.current == null) return;
              const delta = (e.changedTouches[0]?.clientX ?? swipeStart.current) - swipeStart.current;
              swipeStart.current = null;
              if (delta < -40) setPage(Math.min(pageCount - 1, activePage + 1));
              if (delta > 40) setPage(Math.max(0, activePage - 1));
            }}
          >
            {visibleDrives.map((drive) => (
              <NgoDriveCard key={drive.id} drive={drive} />
            ))}
          </div>
        )}

        {isMobile && !loading && pageCount > 1 && (
          <nav aria-label={ui("Drive pages")} data-testid="ngo-drives-pager" className="mt-3 flex items-center justify-center gap-2">
            <button type="button" aria-label={ui("Previous drive")} disabled={activePage === 0} onClick={() => setPage(activePage - 1)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-current text-[var(--ck-home-ink,#b04a15)] disabled:cursor-not-allowed disabled:opacity-30 dark:text-[var(--ck-home-ink,#e07b3a)]">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <div className="flex min-w-0 items-center overflow-x-auto">
              {filteredDrives.map((d, i) => (
                <button key={d.id} type="button" aria-label={`Drive ${i + 1}`} aria-current={i === activePage ? "page" : undefined} onClick={() => setPage(i)}
                  className="flex h-11 w-8 shrink-0 items-center justify-center text-[var(--ck-home-ink,#b04a15)] dark:text-[var(--ck-home-ink,#e07b3a)]">
                  <span className={`h-2 w-2 rounded-full bg-current ${i === activePage ? "opacity-100" : "opacity-30"}`} />
                </button>
              ))}
            </div>
            <button type="button" aria-label={ui("Next drive")} disabled={activePage === pageCount - 1} onClick={() => setPage(activePage + 1)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-current text-[var(--ck-home-ink,#b04a15)] disabled:cursor-not-allowed disabled:opacity-30 dark:text-[var(--ck-home-ink,#e07b3a)]">
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </nav>
        )}

        {isMobile && !loading && moreCount > 0 && (
          <Link href="/requests?type=ngos" className="mt-4 inline-flex min-h-11 flex-wrap items-center gap-x-1.5 text-xs text-stone-500 dark:text-stone-400">
            <span className="font-bold text-stone-700 dark:text-stone-200">{moreCount} more open {moreCount === 1 ? "drive" : "drives"}</span>
            <span className="text-stone-300 dark:text-stone-700">·</span>
            <span className="font-semibold"><UiText>See them all</UiText></span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}

        {/* ── Bottom Banner ── */}
        <LiveBoardBanner
          heading={isMobile ? ui("Want to help an NGO?") : ui("Want to see every drive?")}
          subtext={isMobile ? "Browse drives near you and give the exact items they need." : "Browse every drive by a verified NGO and give the items they need."}
          buttonLabel={ui("SEE ALL DRIVES")}
          buttonHref="/requests?type=ngos"
        />
      </div>
    </section>
    </>
  );
}
