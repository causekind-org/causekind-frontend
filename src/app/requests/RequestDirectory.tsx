"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, ArrowUpRight, Building2, ChevronLeft, ChevronRight,
  LayoutGrid, Loader2, LocateFixed, MapPin, Package, RefreshCw, Search, SearchX,
  SlidersHorizontal, UserRound,
} from "lucide-react";
import type { ItemRequest } from "@/lib/api";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import { AUDIENCE_OPTIONS, type AudienceUrlType } from "@/lib/requestAudience";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { LiveNeedCard, LiveNeedCardSkeleton } from "@/components/home/LiveNeedCard";
import { registerUrlPreserving } from "@/lib/postAuthDestination";
import { NgoDriveCard } from "@/features/ngo-drives/components/NgoDriveCard";
import type { UnifiedNeedItem } from "@/features/ngo-drives/ngoDriveFilters";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
/**
 * The signed-in Category Directory: category rail (desktop) / chip row (phone)
 * beside a card grid, under the page's existing hero.
 *
 * Restored from commit a140636 (this component, unplugged by 5db0252) and
 * adapted on 2026-09-29: audience tabs, card grid instead of rows, paging,
 * an opt-in location control and explicit error state. Presentational only —
 * RequestsClient owns every piece of state and all data.
 */

export type DirectorySort = "nearest" | "urgent" | "newest" | "qty";
export type LocationState = "off" | "locating" | "on" | "denied";

type Props = {
  /** The current page of filtered, sorted items (requests and/or drives). */
  items?: UnifiedNeedItem[];
  /** Legacy fallback for any caller */
  requests?: ItemRequest[];
  /** How many match the current filters across all pages. */
  total: number;
  /** Category counts across the audience/search/urgency-filtered set. */
  counts: Record<string, number>;
  typeCounts: { PERSON: number; NGO: number };
  categories: string[];
  toggleCategory: (category: string) => void;
  clearCategories: () => void;
  audience: AudienceUrlType;
  setAudience: (value: AudienceUrlType) => void;
  urgencies: string[];
  toggleUrgency: (urgency: string) => void;
  search: string;
  setSearch: (value: string) => void;
  sort: DirectorySort;
  setSort: (value: DirectorySort) => void;
  location: LocationState;
  onUseLocation: () => void;
  reset: () => void;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  /** Only donor accounts may offer (DonationOfferService.resolveDonor). */
  canOffer: boolean;
  onOffer: (request: ItemRequest) => void;
  /**
   * Not signed in: needs render as Live Board cards ("Log in to offer this
   * item"), and the card or its button leads to sign-up for that need's offer.
   * Donors keep the directory cards.
   */
  guest?: boolean;
};

/** Guests' Live Board cards: 1 column on phones, 2 beside the rail, 3 on wide screens. */
const GUEST_GRID = "grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3";

const URGENCIES = [
  { value: "CRITICAL", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "NORMAL", label: "Normal" },
];

export function RequestDirectory(props: Props) {
  const rt = useTranslations("requestsArea");
  const ui = useUiText();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const {
    items, requests = [], total, counts, typeCounts, categories, toggleCategory, clearCategories,
    audience, setAudience, urgencies, toggleUrgency,
    search, setSearch, sort, setSort, location, onUseLocation, reset, loading, failed, onRetry,
    page, totalPages, onPage, canOffer, onOffer, guest = false,
  } = props;

  const renderedItems: UnifiedNeedItem[] =
    items ?? requests.map(r => ({ kind: "request" as const, data: r }));

  const allCount = categories.length === 0 ? total : Object.values(counts).reduce((a, b) => a + b, 0);
  const narrowing = categories.length > 0 || urgencies.length > 0 || search.trim().length > 0 || audience !== "all";
  const tabCount: Record<AudienceUrlType, number> = {
    all: typeCounts.PERSON + typeCounts.NGO,
    people: typeCounts.PERSON,
    ngos: typeCounts.NGO,
  };
  const tabIcon: Record<AudienceUrlType, React.ElementType> = { all: LayoutGrid, people: UserRound, ngos: Building2 };

  const pill = (on: boolean) =>
    `inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
      on
        ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-accent)] text-white"
        : "border-stone-200 bg-white text-stone-700 hover:border-stone-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200"
    }`;
  const railItem = (on: boolean) =>
    `flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-start text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] ${
      on
        ? "bg-[var(--ck-role-accent)] text-white"
        : "text-stone-700 hover:bg-white dark:text-stone-300 dark:hover:bg-zinc-900"
    }`;

  return (
    <section aria-label={ui("Request directory")} className="w-full px-3 py-5 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-0 lg:min-w-[240px] lg:flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" aria-hidden />
          <input
            type="search"
            aria-label={ui("Search requests by item, category, city or organisation")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            maxLength={100}
            placeholder={ui("Search needs…")}
            className="min-h-11 w-full rounded-lg border border-stone-200 bg-white py-2 ps-9 pe-3 text-base placeholder:text-stone-400 focus:border-[var(--ck-role-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)]/30 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div role="group" aria-label={ui("Who posted the request")} className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5 sm:mx-0 sm:px-0">
          {AUDIENCE_OPTIONS.map(o => {
            const Icon = tabIcon[o.urlType];
            const on = audience === o.urlType;
            return (
              <button key={o.value} id={`directory-audience-${o.value}`} type="button" aria-pressed={on} title={o.description} onClick={() => setAudience(o.urlType)} className={pill(on)}>
                <Icon className="size-4" aria-hidden />
                {o.label}
                <span className="sr-only">: {o.description}, </span>
                <span className={`tabular-nums ${on ? "text-white/80" : "text-stone-400"}`}>{tabCount[o.urlType]}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(o => !o)}
            aria-expanded={filtersOpen}
            aria-controls="request-directory-filters"
            className={pill(false)}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            <UiText>Urgency</UiText>{urgencies.length ? ` (${urgencies.length})` : ""}
          </button>
          <label htmlFor="request-directory-sort" className="sr-only"><UiText>Sort requests</UiText></label>
          <select
            id="request-directory-sort"
            value={sort}
            onChange={e => setSort(e.target.value as DirectorySort)}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2.5 text-sm font-semibold text-stone-700 focus:border-[var(--ck-role-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200 sm:flex-none"
          >
            <option value="newest"><UiText>Just added</UiText></option>
            {location === "on" && <option value="nearest"><UiText>Nearest first</UiText></option>}
            <option value="urgent"><UiText>Most urgent</UiText></option>
            <option value="qty"><UiText>Highest quantity</UiText></option>
          </select>
          {location !== "on" && (
            <button
              type="button"
              onClick={onUseLocation}
              disabled={location === "locating"}
              className={`${pill(false)} disabled:opacity-60`}
            >
              {location === "locating"
                ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                : <LocateFixed className="size-4" aria-hidden />}
              {location === "locating" ? ui("Locating…") : ui("Use my location")}
            </button>
          )}
        </div>
      </div>

      {location === "denied" && (
        <p role="status" className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          <UiText>Location isn&apos;t available, so nearest-first sorting is off. You can keep browsing every request.</UiText>
        </p>
      )}

      <div id="request-directory-filters" hidden={!filtersOpen} className="mt-2.5">
        <div role="group" aria-label={ui("Filter by urgency")} className="flex flex-wrap gap-2">
          {URGENCIES.map(u => (
            <button key={u.value} type="button" aria-pressed={urgencies.includes(u.value)} onClick={() => toggleUrgency(u.value)} className={pill(urgencies.includes(u.value))}>
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Category navigation + results ── */}
      <div className="mt-4 grid items-start gap-4 lg:mt-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <nav aria-label={ui("Request categories")} className="min-w-0 lg:sticky lg:top-24">
          <p className="mb-2 hidden text-xs font-bold uppercase tracking-wider text-stone-500 lg:block"><UiText>Categories</UiText></p>

          {/* Phone/tablet: one horizontally scrolling chip row. */}
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0 lg:hidden">
            <button type="button" onClick={clearCategories} aria-pressed={!categories.length} className={pill(!categories.length)}>
              <UiText>All categories</UiText>
            </button>
            {ALL_REQUEST_CATEGORIES.map(category => {
              const visual = CATEGORY_VISUALS[category];
              const on = categories.includes(category);
              return (
                <button key={category} type="button" onClick={() => toggleCategory(category)} aria-pressed={on} className={pill(on)}>
                  {visual && <visual.Icon className="size-4" aria-hidden />}
                  <TranslatedText text={category} />
                  <span className={`tabular-nums ${on ? "text-white/80" : "text-stone-400"}`}>{counts[category] ?? 0}</span>
                </button>
              );
            })}
          </div>

          {/* Desktop: the rail. */}
          <ul className="hidden space-y-0.5 lg:block">
            <li>
              <button type="button" onClick={clearCategories} aria-pressed={!categories.length} className={railItem(!categories.length)}>
                <LayoutGrid className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate"><UiText>All categories</UiText></span>
                <span className="text-xs tabular-nums opacity-75">{allCount}</span>
              </button>
            </li>
            {ALL_REQUEST_CATEGORIES.map(category => {
              const visual = CATEGORY_VISUALS[category];
              const on = categories.includes(category);
              return (
                <li key={category}>
                  <button type="button" onClick={() => toggleCategory(category)} aria-pressed={on} className={railItem(on)}>
                    {visual ? <visual.Icon className="size-4 shrink-0" aria-hidden /> : <Package className="size-4 shrink-0" aria-hidden />}
                    <span className="min-w-0 flex-1 truncate"><TranslatedText text={category} /></span>
                    <span className="text-xs tabular-nums opacity-75">{counts[category] ?? 0}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight sm:text-2xl">
              {categories.length === 1 ? <TranslatedText text={categories[0]} /> : categories.length ? ui("Selected categories") : ui("All local needs")}
            </h2>
            <div className="flex items-center gap-3">
              <span role="status" className="text-xs text-stone-500 dark:text-stone-400">
                {loading
                  ? ui("Loading needs…")
                  : failed
                  ? ""
                  : rt(audience === "ngos" ? "drivesCount" : audience === "people" ? "requestsCount" : "needsCount", { count: total })}
              </span>
              {narrowing && (
                <button type="button" onClick={reset} className="min-h-11 text-xs font-semibold text-[var(--ck-role-accent)] underline underline-offset-4">
                  <UiText>Clear filters</UiText>
                </button>
              )}
            </div>
          </div>

          {loading && guest ? (
            <ul aria-hidden="true" className={GUEST_GRID}>
              {[0, 1, 2, 3, 4, 5].map(n => <li key={n} className="flex"><LiveNeedCardSkeleton /></li>)}
            </ul>
          ) : loading ? (
            <ul aria-hidden="true" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map(n => (
                <li key={n} className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex gap-3">
                    <div className="size-11 shrink-0 rounded-lg bg-stone-200 motion-safe:animate-pulse dark:bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-20 rounded bg-stone-200 motion-safe:animate-pulse dark:bg-zinc-800" />
                      <div className="h-4 w-3/4 rounded bg-stone-200 motion-safe:animate-pulse dark:bg-zinc-800" />
                    </div>
                  </div>
                  <div className="mt-3 h-3 w-full rounded bg-stone-100 motion-safe:animate-pulse dark:bg-zinc-800/70" />
                </li>
              ))}
            </ul>
          ) : failed ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <AlertTriangle className="size-4 text-amber-600" aria-hidden />
              <span className="flex-1"><UiText>We couldn&apos;t load requests right now.</UiText></span>
              <button type="button" onClick={onRetry} className={pill(false)}>
                <RefreshCw className="size-4" aria-hidden /> <UiText>Try again</UiText>
              </button>
            </div>
          ) : renderedItems.length === 0 ? (
            <div className="rounded-xl border border-stone-200 bg-white px-5 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <SearchX className="mx-auto mb-3 size-7 text-stone-400" aria-hidden />
              <h3 className="text-sm font-semibold"><UiText>No needs match your filters</UiText></h3>
              <p className="mt-1 text-xs text-stone-500"><UiText>Try another category, urgency or search term.</UiText></p>
              <button
                type="button"
                onClick={reset}
                className="mt-3 min-h-11 text-sm font-semibold text-[var(--ck-role-accent)] underline underline-offset-4"
              >
                <UiText>Clear filters</UiText>
              </button>
            </div>
          ) : (
            <>
              {guest ? (
                <ul className={GUEST_GRID}>
                  {renderedItems.map(item =>
                    item.kind === "request" ? (
                      <li key={`req-${item.data.id}`} className="flex">
                        <LiveNeedCard
                          className="w-full"
                          need={{
                            category: item.data.category,
                            title: item.data.title,
                            description: item.data.description,
                            city: item.data.city,
                            quantity: item.data.quantity,
                            urgent: item.data.urgency === "CRITICAL" || item.data.isEmergency,
                            byName: item.data.requesterType === "NGO" ? item.data.organizationName : item.data.doneeName || null,
                          }}
                          href={registerUrlPreserving(`/requests/${item.data.id}/offer`)}
                          ctaLabel={ui("Log in to offer this item")}
                          locked
                          onCardClick={() => onOffer(item.data)}
                        />
                      </li>
                    ) : (
                      <li key={`drive-${item.data.id}`} className="flex">
                        <NgoDriveCard drive={item.data} className="w-full" />
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {renderedItems.map(item =>
                    item.kind === "request" ? (
                      <DirectoryCard key={`req-${item.data.id}`} request={item.data} canOffer={canOffer} onOffer={onOffer} />
                    ) : (
                      <li key={`drive-${item.data.id}`} className="flex">
                        <NgoDriveCard drive={item.data} className="w-full" />
                      </li>
                    )
                  )}
                </ul>
              )}

              {totalPages > 1 && (
                <nav aria-label={ui("Pages of requests")} className="mt-6 flex items-center justify-between gap-3">
                  <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className={`${pill(false)} disabled:pointer-events-none disabled:opacity-40`}>
                    <ChevronLeft className="size-4" aria-hidden /> <UiText>Previous</UiText>
                  </button>
                  <span className="text-xs text-stone-500 dark:text-stone-400">{rt("pageOf", { page, total: totalPages })}</span>
                  <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages} className={`${pill(false)} disabled:pointer-events-none disabled:opacity-40`}>
                    <UiText>Next</UiText> <ChevronRight className="size-4" aria-hidden />
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function DirectoryCard({ request: r, canOffer, onOffer }: { request: ItemRequest; canOffer: boolean; onOffer: (r: ItemRequest) => void }) {
  const rt = useTranslations("requestsArea");
  const ui = useUiText();
  const visual = CATEGORY_VISUALS[r.category];
  const isNgo = r.requesterType === "NGO";
  const urgentLabel = r.isEmergency ? ui("Emergency", "urgency") : r.urgency === "CRITICAL" ? ui("Critical", "urgency") : r.urgency === "HIGH" ? ui("High priority", "urgency") : null;
  const urgentTone = r.isEmergency || r.urgency === "CRITICAL"
    ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
    : "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300";

  return (
    <li className="flex min-w-0 flex-col rounded-xl border border-stone-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--ck-role-accent)]/10 text-[var(--ck-role-accent)] sm:size-12">
          {r.imageUrl
            ? <Image src={r.imageUrl} alt="" fill sizes="48px" className="object-cover" />
            : visual ? <visual.Icon className="size-5" aria-hidden /> : <Package className="size-5" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold sm:text-xs">
            <span className="inline-flex items-center gap-1 text-[var(--ck-role-accent)]">
              {isNgo ? <Building2 className="size-3" aria-hidden /> : <UserRound className="size-3" aria-hidden />}
              {isNgo ? ui("NGO") : ui("Person")}
            </span>
            <span className="text-stone-500"><TranslatedText text={r.category} /></span>
            {urgentLabel && <span className={`rounded px-1.5 py-0.5 ${urgentTone}`}>{urgentLabel}</span>}
          </div>
          <h3 className="mt-1 line-clamp-2 break-words text-[15px] font-semibold leading-snug sm:text-base">
            <TranslatedText text={r.title} />
          </h3>
        </div>
      </div>

      {r.description && (
        <p className="mt-2 line-clamp-2 break-words text-sm leading-relaxed text-stone-600 [overflow-wrap:anywhere] dark:text-stone-400">
          <TranslatedText text={r.description} />
        </p>
      )}

      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
        {isNgo && r.organizationName && (
          <span className="min-w-0 max-w-full truncate font-medium text-stone-700 dark:text-stone-300" title={r.organizationName}>{r.organizationName}</span>
        )}
        <span className="flex min-w-0 items-center gap-1">
          <MapPin className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{r.city ? <TranslatedText text={r.city} /> : ui("Location not provided")}</span>
        </span>
        <span className="tabular-nums">{rt("quantityRequested", { quantity: r.quantity.toLocaleString("en-IN") })}</span>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        <Link
          href={`/requests/${r.id}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-stone-700 hover:text-[var(--ck-role-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:text-stone-300"
        >
          <UiText>View need</UiText> <ArrowUpRight className="size-4" aria-hidden />
        </Link>
        {canOffer && (
          <button
            type="button"
            onClick={() => onOffer(r)}
            aria-label={rt("offerFor", { title: r.title })}
            className="ms-auto inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--ck-role-accent)] px-3.5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
          >
            <UiText>Offer an item</UiText> <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </button>
        )}
      </div>
    </li>
  );
}
