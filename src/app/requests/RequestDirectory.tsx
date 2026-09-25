"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, MapPin, Package, SlidersHorizontal, Search } from "lucide-react";
import type { ItemRequest } from "@/lib/api";
import { ALL_REQUEST_CATEGORIES } from "@/lib/categoryVisuals";
import { TranslatedText } from "@/hooks/useDynamicTranslation";

type Sort = "nearest" | "urgent" | "newest" | "qty";
type Props = {
  requests: ItemRequest[];
  total: number;
  counts: Record<string, number>;
  categories: string[];
  toggleCategory: (category: string) => void;
  clearCategories: () => void;
  urgencies: string[];
  toggleUrgency: (urgency: string) => void;
  search: string;
  setSearch: (value: string) => void;
  sort: Sort;
  setSort: (value: Sort) => void;
  reset: () => void;
  loading: boolean;
  onOpen: (request: ItemRequest) => void;
};

export function RequestDirectory(props: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { requests, total, counts, categories, toggleCategory, clearCategories,
    urgencies, toggleUrgency, search, setSearch, sort, setSort, reset, loading, onOpen } = props;
  const categoryButton = "flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors lg:w-full lg:text-sm";
  return (
    <section className="w-full px-3 py-5 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      <header className="mb-5 sm:mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--ck-role-accent)] sm:text-xs">Give what you have</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">Start with what you can give.</h1>
        <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400 sm:text-sm">Explore local requests by the kind of item you can offer.</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-9">
        <nav aria-label="Request categories" className="min-w-0 lg:sticky lg:top-28">
          <p className="mb-2 hidden text-xs font-bold uppercase tracking-wider text-stone-500 lg:block">Categories</p>
          <div className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            <button type="button" onClick={clearCategories} aria-pressed={!categories.length}
              className={`${categoryButton} ${!categories.length ? "bg-[var(--ck-role-accent)] text-white" : "text-stone-600 hover:bg-white dark:text-stone-300 dark:hover:bg-zinc-900"}`}>
              All needs <span className="text-xs tabular-nums opacity-75">{total}</span>
            </button>
            {ALL_REQUEST_CATEGORIES.map(category => (
              <button type="button" key={category} onClick={() => toggleCategory(category)} aria-pressed={categories.includes(category)}
                className={`${categoryButton} ${categories.includes(category) ? "bg-[var(--ck-role-accent)] text-white" : "text-stone-600 hover:bg-white dark:text-stone-300 dark:hover:bg-zinc-900"}`}>
                <TranslatedText text={category} /><span className="text-xs tabular-nums opacity-75">{counts[category] ?? 0}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-stone-300/70 pb-4 dark:border-zinc-700">
            <div className="relative min-w-0 basis-full sm:flex-1 sm:basis-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" aria-hidden />
              <input aria-label="Search requests" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search needs…"
                className="min-h-11 w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-base dark:border-zinc-700 dark:bg-zinc-900" />
            </div>
            <button type="button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="request-directory-filters"
              className="flex min-h-11 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-xs dark:border-zinc-700 dark:bg-zinc-900">
              <SlidersHorizontal className="size-3.5" aria-hidden /> Urgency{urgencies.length ? ` (${urgencies.length})` : ""}
            </button>
            <select aria-label="Sort requests" value={sort} onChange={event => setSort(event.target.value as Sort)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 text-xs dark:border-zinc-700 dark:bg-zinc-900 sm:flex-none">
              <option value="nearest">Nearest first</option><option value="urgent">Most urgent</option><option value="newest">Just added</option><option value="qty">Highest quantity</option>
            </select>
          </div>
          {filtersOpen && <div id="request-directory-filters" className="flex flex-wrap gap-4 border-b border-stone-200 py-3 dark:border-zinc-700">
            {["CRITICAL", "HIGH", "NORMAL"].map(urgency => <label key={urgency} className="flex min-h-11 cursor-pointer items-center gap-2 text-xs"><input type="checkbox" checked={urgencies.includes(urgency)} onChange={() => toggleUrgency(urgency)} className="size-4 accent-[var(--ck-role-accent)]" />{urgency[0] + urgency.slice(1).toLowerCase()}</label>)}
          </div>}
          <div className="flex flex-wrap items-center justify-between gap-2 py-4">
            <h2 className="text-lg font-semibold tracking-tight sm:text-2xl">{categories.length === 1 ? <TranslatedText text={categories[0]} /> : categories.length ? "Selected categories" : "All local needs"}</h2>
            <span role="status" className="text-xs text-stone-500">{loading ? "Loading requests…" : `${requests.length} requests`}</span>
            {(categories.length > 0 || urgencies.length > 0 || search || sort !== "nearest") && <button type="button" onClick={reset} className="min-h-11 text-xs text-[var(--ck-role-accent)] underline underline-offset-4">Clear filters</button>}
          </div>

          <div aria-busy={loading}>
            {loading ? <div aria-label="Loading requests" className="space-y-3">{[0, 1, 2, 3].map(n => <div key={n} className="h-24 rounded-lg bg-stone-200/60 motion-safe:animate-pulse dark:bg-zinc-800" />)}</div> : !requests.length ? (
              <div className="border-y border-stone-200 py-10 text-center dark:border-zinc-700"><Package className="mx-auto mb-3 size-7 text-stone-400" aria-hidden /><h3 className="text-sm font-semibold">{total ? "No matching needs" : "No needs posted yet"}</h3><p className="mt-2 text-xs text-stone-500">{total ? "Try another category, urgency, or search term." : "Community requests will appear here when available."}</p></div>
            ) : requests.map(request => (
              <article key={request.id} className="grid grid-cols-[36px_minmax(0,1fr)] items-start gap-x-3 gap-y-2 border-t border-stone-300/70 py-4 last:border-b dark:border-zinc-700 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:gap-5 sm:py-6">
                <div className="relative flex size-9 items-center justify-center overflow-hidden rounded-lg bg-stone-200/70 text-stone-500 dark:bg-zinc-800 sm:size-14">
                  {request.imageUrl ? <Image src={request.imageUrl} alt="" fill sizes="56px" className="object-cover" /> : <Package className="size-4 sm:size-6" aria-hidden />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold sm:text-xs"><span className="text-stone-500"><TranslatedText text={request.category} /></span>{(request.isEmergency || request.urgency === "CRITICAL" || request.urgency === "HIGH") && <span className={`rounded px-1.5 py-0.5 ${request.isEmergency || request.urgency === "CRITICAL" ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}>{request.isEmergency ? "Emergency" : request.urgency === "CRITICAL" ? "Critical" : "High priority"}</span>}</div>
                  <h3 className="mt-1 break-words text-sm font-bold leading-snug sm:text-lg"><TranslatedText text={request.title} /></h3>
                  {request.description && <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-stone-600 dark:text-stone-400 sm:text-sm"><TranslatedText text={request.description} /></p>}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500 sm:text-xs"><span className="flex min-w-0 items-center gap-1"><MapPin className="size-3 shrink-0" aria-hidden /><TranslatedText text={request.city || "Location not provided"} /></span><span className="tabular-nums">{request.quantity} needed</span></div>
                </div>
                <button type="button" onClick={() => onOpen(request)} aria-label={`Offer an item for ${request.title}`} className="col-start-2 flex min-h-11 w-fit items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-[var(--ck-role-accent)] transition-colors hover:bg-[var(--ck-role-soft)] dark:border-zinc-700 dark:bg-zinc-900 sm:col-start-3 sm:self-center sm:px-4">Offer an item <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden /></button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
