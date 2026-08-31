"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { DONOR_CATEGORY_EVENT, DONOR_CATEGORY_OPEN_EVENT } from "@/components/DonorCategoryModal";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS, readSelectedDonorCategories } from "@/lib/categoryVisuals";
import { slugForCategory } from "@/lib/inKindCategories";
import { useAuth } from "@/hooks/useAuth";
import { Bell, SlidersHorizontal } from "lucide-react";
import type { ItemRequest } from "@/lib/api";

/* ── Watching for you — the categories a donor follows, sized by how much is
   actually happening in each one. ──

   The band used to be nine identical white cards, each stamped "WATCHING" — a
   word the section eyebrow already carries — with no icon, no colour and no
   count. A category with a dozen open needs looked exactly like one with none,
   which is precisely the distinction this section exists to draw.

   So the grid is driven by the counts: the busiest category takes a 2×2 tile,
   the next a 2×1, everything else a single cell, and a category with nothing
   open recedes into a quiet outline. When every category is quiet the grid is
   uniform and calm — that is the honest rendering of "nothing to report", not a
   failure state to paper over.

   Every visual comes from CATEGORY_VISUALS, the shared source that already
   holds a per-category icon and colour set. Nothing here invents a palette. */

type Tile = {
  name: string;
  count: number;
  /** Grid footprint. Only the two busiest categories are ever promoted. */
  size: "large" | "wide" | "small";
};

export function DoneeRequestsSection({ itemRequests }: { itemRequests: ItemRequest[] }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSelected(readSelectedDonorCategories());
    setMounted(true);
    function onChange(e: Event) {
      // The modal always dispatches an array (possibly empty = "all"), never null —
      // this event only fires after an explicit apply(), so there's no ambiguity here.
      setSelected((e as CustomEvent<string[]>).detail ?? []);
    }
    window.addEventListener(DONOR_CATEGORY_EVENT, onChange);
    return () => window.removeEventListener(DONOR_CATEGORY_EVENT, onChange);
  }, []);

  // Avoid an SSR/client mismatch — localStorage only exists client-side
  if (!mounted) return null;

  // Never chosen anything → nothing to personalize, hide the section.
  // Explicitly chose "all" (empty array from an actual apply()) → show every category.
  // Chose specific categories → show only those.
  const categoriesToShow = selected === null
    ? []
    : selected.length > 0
      ? selected.filter(c => ALL_REQUEST_CATEGORIES.includes(c))
      : ALL_REQUEST_CATEGORIES;
  if (categoriesToShow.length === 0) return null;

  // Open-request count per followed category — the number the whole layout keys off.
  const countByCategory = new Map<string, number>();
  for (const r of itemRequests) {
    if (!categoriesToShow.includes(r.category)) continue;
    countByCategory.set(r.category, (countByCategory.get(r.category) ?? 0) + 1);
  }

  /*
    Ordering, then sizing.

    Active categories lead, busiest first; quiet ones follow in
    ALL_REQUEST_CATEGORIES order. That trailing order is a deliberate stable
    tiebreak — sorting the quiet ones by their (identical, zero) counts would
    leave their relative order at the mercy of the sort implementation, and
    tiles would reshuffle between renders for no reason a visitor could see.

    Only the top two actives are promoted. Promoting more would flatten the
    hierarchy back out, which is the failure the old grid already demonstrated.
  */
  const active = categoriesToShow
    .filter(c => (countByCategory.get(c) ?? 0) > 0)
    .sort((a, b) => (countByCategory.get(b) ?? 0) - (countByCategory.get(a) ?? 0));
  const quiet = ALL_REQUEST_CATEGORIES.filter(
    c => categoriesToShow.includes(c) && !active.includes(c),
  );

  const tiles: Tile[] = [
    ...active.map((name, i): Tile => ({
      name,
      count: countByCategory.get(name) ?? 0,
      size: i === 0 ? "large" : i === 1 ? "wide" : "small",
    })),
    ...quiet.map((name): Tile => ({ name, count: 0, size: "small" })),
  ];

  return (
    <section className="relative w-full bg-[#faf8f5] dark:bg-zinc-950 py-20 border-t border-stone-200/60 dark:border-stone-800 overflow-hidden">
      {/* Warm ambient glow behind the board */}
      <div className="pointer-events-none absolute -top-32 right-[10%] w-[480px] h-[480px] rounded-full bg-[#e07b3a]/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-[5%] w-72 h-72 rounded-full bg-[#f0b97a]/10 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6 sm:px-10">
        <Reveal>
          <div className="flex items-center gap-2.5">
            <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#f0b97a]/20">
              <Bell className="h-3 w-3 text-[#b04a15] dark:text-[#e07b3a]" />
            </span>
            <p className="text-3xs font-black uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">Watching for you</p>

            {/*
              Donors only. `DonorCategoryModal` returns null for every other
              viewer, and this section renders for guests and admins too
              (HomeClient gates it on `user?.role !== "DONEE"`), so for anyone
              else this would be a control that visibly does nothing.
            */}
            {user?.role === "DONOR" && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event(DONOR_CATEGORY_OPEN_EVENT))}
                className="ms-auto inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-stone-500 transition-colors hover:text-[#b04a15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] dark:text-stone-400 dark:hover:text-[#e07b3a]"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                Edit watchlist
              </button>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="mt-4"
          >
            {/*
              Fixed row heights rather than `auto-rows-auto`: a 2×2 tile only
              spans a predictable amount of space if the rows it spans have a
              known height, and dense flow needs somewhere uniform to backfill
              the single cells into. `dense` is what stops the mixed footprints
              from leaving holes when a large tile does not divide the row.
            */}
            <div className="grid grid-cols-2 gap-3 auto-rows-[7rem] md:grid-cols-4 md:auto-rows-[8.5rem] [grid-auto-flow:dense]">
              {tiles.map(tile => <WatchTile key={tile.name} {...tile} />)}
            </div>
          </motion.div>

          <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
            The moment a verified need is posted in a quiet category, you&apos;ll be first to know.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * One category tile.
 *
 * An active tile is filled and carries its count; a quiet one is a dashed
 * outline with no fill and no numeral. The difference is deliberately large —
 * a visitor should be able to tell at a glance, without reading a single word,
 * which of their categories have something waiting.
 */
function WatchTile({ name, count, size }: Tile) {
  const visual = CATEGORY_VISUALS[name];
  const slug = slugForCategory(name);
  const Icon = visual?.Icon;
  const isQuiet = count === 0;

  const span =
    size === "large" ? "col-span-2 row-span-2"
    : size === "wide" ? "col-span-2"
    : "";

  const surface = isQuiet
    ? "border border-dashed border-stone-300/70 bg-transparent dark:border-stone-700"
    : `border ${visual?.border ?? "border-stone-200"} bg-white/80 dark:bg-white/[0.04]`;

  // The lead tile carries the section's whole argument — this category is where
  // the need is — so its icon and numeral are scaled with the footprint. A 2×2
  // tile wearing the same 8px chip and 24px numeral as a single cell just looks
  // like a small tile with empty space around it.
  const isLead = size === "large";

  const body = (
    <>
      <span
        className={`flex items-center justify-center rounded-xl ${isLead ? "h-11 w-11" : "h-8 w-8"} ${
          isQuiet ? "bg-stone-200/50 dark:bg-white/5" : visual?.iconBg ?? "bg-stone-100"
        }`}
        aria-hidden="true"
      >
        {Icon && (
          <Icon className={`${isLead ? "h-5 w-5" : "h-4 w-4"} ${isQuiet ? "text-stone-400 dark:text-stone-500" : visual?.text}`} />
        )}
      </span>

      <div className="mt-auto">
        {isQuiet ? (
          <p className="text-3xs font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
            Quiet
          </p>
        ) : (
          <p className={`font-black leading-none tabular-nums ${visual?.text} ${isLead ? "text-4xl sm:text-6xl" : "text-2xl"}`}>
            {count}
            <span className="ms-1.5 align-middle text-3xs font-bold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
              open
            </span>
          </p>
        )}

        <p className="mt-1 truncate text-sm font-bold text-stone-800 dark:text-stone-100">
          {name}
        </p>

        {/* The blurb only earns its space on the 2×2 tile; anywhere else it
            would be clamped to a fragment that reads worse than no line. */}
        {isLead && visual?.blurb && (
          <p className="mt-1 hidden text-xs leading-relaxed text-stone-500 sm:block dark:text-stone-400">
            {visual.blurb}
          </p>
        )}
      </div>
    </>
  );

  const shell = `group flex h-full flex-col rounded-2xl p-3.5 transition-all ${span} ${surface}`;

  // No editorial entry means no category page to send anyone to. Rendering a
  // plain div keeps the tile in the grid rather than shipping a link to a 404.
  if (!slug) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <Link
      href={`/requests/category/${slug}`}
      className={`${shell} hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]`}
    >
      {body}
    </Link>
  );
}
