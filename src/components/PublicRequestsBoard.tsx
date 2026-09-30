"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowUpRight, Building2, ChevronLeft, ChevronRight, Inbox,
  MapPin, Package, RefreshCw, Search, SlidersHorizontal, UserRound, X,
} from "lucide-react";
import {
  getPublicRequestPage,
  type PublicItemRequest,
  type PublicRequestPage,
  type PublicRequesterType,
} from "@/lib/api";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import {
  AUDIENCE_OPTIONS,
  audienceFromUrlType,
  urlTypeFromAudience,
  type RequestAudience,
} from "@/lib/requestAudience";
import AudienceDialog from "@/components/requests/AudienceDialog";

/**
 * The need board as a logged-out visitor sees it — the "Neighbourhood board".
 *
 * Everything that narrows the list (search, requester type, city, category,
 * urgency, sort, page) runs on the server via `/item-requests/public/page`, so
 * the counts and pages always describe the whole board, never the slice this
 * browser happens to hold. The browse state lives in the URL, which is what
 * makes Back from a request detail land on the same page of the same results.
 *
 * No GPS, ever: the public projection carries no coordinates, so there is no
 * distance to sort by and no reason to ask. City is typed, not detected.
 */

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "urgent", label: "Most urgent" },
  { value: "quantity", label: "Highest quantity" },
] as const;
type SortValue = (typeof SORTS)[number]["value"];

/** Mirrors the backend `ItemUrgency` enum (NORMAL, HIGH, CRITICAL). */
const URGENCIES = ["CRITICAL", "HIGH", "NORMAL"] as const;
const URGENCY_LABELS: Record<string, string> = { CRITICAL: "Critical", HIGH: "High", NORMAL: "Normal" };

/** 12 divides evenly into the 1-, 2- and 3-column grids. */
const PAGE_SIZE = 12;
const MAX_TEXT = 100;
const SEARCH_DEBOUNCE_MS = 300;

type TypeParam = "all" | "people" | "ngos";
const TYPE_TO_API: Record<TypeParam, PublicRequesterType | null> = { all: null, people: "PERSON", ngos: "NGO" };

type BrowseState = {
  q: string;
  type: TypeParam;
  city: string;
  categories: string[];
  urgencies: string[];
  sort: SortValue;
  /** One-based, as shown and as written to the URL. */
  page: number;
};

const DEFAULT_STATE: BrowseState = {
  q: "", type: "all", city: "", categories: [], urgencies: [], sort: "newest", page: 1,
};

function cleanText(v: string | null): string {
  return (v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, MAX_TEXT);
}

function cleanList(v: string | null, allowed: readonly string[]): string[] {
  if (!v) return [];
  return Array.from(new Set(v.split(",").map(s => s.trim()).filter(s => allowed.includes(s))));
}

/** Every URL value is untrusted: anything unknown falls back to the default. */
export function parseBrowseState(search: string): BrowseState {
  const p = new URLSearchParams(search);
  const type = p.get("type");
  const sort = p.get("sort");
  const page = Number(p.get("page"));
  return {
    q: cleanText(p.get("q")),
    type: type === "people" || type === "ngos" ? type : "all",
    city: cleanText(p.get("city")),
    categories: cleanList(p.get("cat"), ALL_REQUEST_CATEGORIES),
    urgencies: cleanList(p.get("urgency"), URGENCIES),
    sort: SORTS.some(s => s.value === sort) ? (sort as SortValue) : "newest",
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** Id of each page audience control, so the dialog can return focus to it. */
const audienceControlId = (a: RequestAudience) => `guest-board-audience-${a}`;

export function browseStateToSearch(s: BrowseState): string {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.type !== "all") p.set("type", s.type);
  if (s.city) p.set("city", s.city);
  if (s.categories.length) p.set("cat", s.categories.join(","));
  if (s.urgencies.length) p.set("urgency", s.urgencies.join(","));
  if (s.sort !== "newest") p.set("sort", s.sort);
  if (s.page > 1) p.set("page", String(s.page));
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

/** Identity of a result set — everything except which page of it. */
function listKey(s: BrowseState) {
  return JSON.stringify([s.q, s.type, s.city, s.categories, s.urgencies, s.sort]);
}

function writeUrl(s: BrowseState, mode: "push" | "replace") {
  const url = `${window.location.pathname}${browseStateToSearch(s)}${window.location.hash}`;
  if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  if (mode === "push") window.history.pushState(window.history.state, "", url);
  else window.history.replaceState(window.history.state, "", url);
}

export default function PublicRequestsBoard({
  initialPage = null,
}: {
  /**
   * Page one of the unfiltered board, fetched on the server by
   * src/app/requests/page.tsx. Used only when the URL carries no browse state,
   * so a shared filtered link never flashes the wrong results. Null when the
   * server fetch failed — the client then fetches for itself.
   */
  initialPage?: PublicRequestPage | null;
} = {}) {
  const [state, setState] = useState<BrowseState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<PublicRequestPage | null>(initialPage);
  const [loading, setLoading] = useState(initialPage === null);
  const [failed, setFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [cityDraft, setCityDraft] = useState("");
  const resultsRef = useRef<HTMLElement>(null);
  const seedUsed = useRef(false);
  const requestSeq = useRef(0);

  const [audienceDialogOpen, setAudienceDialogOpen] = useState(false);

  // Read the URL after mount so server and client render the same first
  // frame, then follow Back/Forward. The audience comes from the URL `type`
  // alone (else Everyone) — nothing is stored, by the owner's decision.
  useEffect(() => {
    const sync = () => {
      const s = parseBrowseState(window.location.search);
      setState(s);
      setSearchDraft(s.q);
      setCityDraft(s.city);
    };
    sync();
    setReady(true);
    // Asked on every visit to the page (every mount) — but not on Back/Forward
    // within it, which is the same visit.
    setAudienceDialogOpen(true);
    const onPop = () => { setAudienceDialogOpen(false); sync(); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /** Change what is listed: always back to page 1, replacing history. */
  const updateList = useCallback((patch: Partial<Omit<BrowseState, "page">>) => {
    setState(prev => {
      const next = { ...prev, ...patch, page: 1 };
      // Unchanged list (e.g. the debounce echoing the URL on mount): keep the
      // page too, or a shared ?page=3 link would reset itself.
      if (listKey(next) === listKey(prev)) return prev;
      writeUrl(next, "replace");
      return next;
    });
  }, []);

  /**
   * The one way an audience is chosen — the dialog, the page tabs and "See all
   * requests" all call this. Applies the filter (back to page 1, other filters
   * kept) and writes the URL. Nothing is saved.
   */
  const chooseAudience = useCallback((audience: RequestAudience) => {
    setAudienceDialogOpen(false);
    updateList({ type: urlTypeFromAudience(audience) });
  }, [updateList]);

  const dismissAudienceDialog = useCallback(() => {
    setAudienceDialogOpen(false);
  }, []);

  // Debounced search and city: typing does not fire a request per keystroke.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => updateList({ q: cleanText(searchDraft) }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchDraft, ready, updateList]);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => updateList({ city: cleanText(cityDraft) }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [cityDraft, ready, updateList]);

  // The one fetch. A sequence number drops any response that is not the
  // latest, so a slow early request can never overwrite newer results.
  useEffect(() => {
    if (!ready) return;
    const isDefault = listKey(state) === listKey(DEFAULT_STATE) && state.page === 1;
    if (isDefault && initialPage && !seedUsed.current && retryTick === 0) {
      seedUsed.current = true;
      setData(initialPage);
      setLoading(false);
      return;
    }
    seedUsed.current = true;
    const seq = ++requestSeq.current;
    setLoading(true);
    setFailed(false);
    getPublicRequestPage({
      q: state.q,
      requesterType: TYPE_TO_API[state.type],
      city: state.city,
      categories: state.categories,
      urgencies: state.urgencies,
      sort: state.sort,
      page: state.page - 1,
      size: PAGE_SIZE,
    })
      .then(res => {
        if (seq !== requestSeq.current) return;
        // Data changed under a deep link (?page=9 on a board that now has 3):
        // move to the real last page instead of showing an empty one.
        const lastPage = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
        if (res.items.length === 0 && res.total > 0 && state.page > lastPage) {
          setState(prev => {
            const next = { ...prev, page: lastPage };
            writeUrl(next, "replace");
            return next;
          });
          return;
        }
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setFailed(true);
        setLoading(false);
      });
  }, [state, ready, initialPage, retryTick]);

  const goToPage = (n: number) => {
    setState(prev => {
      const next = { ...prev, page: Math.max(1, n) };
      writeUrl(next, "push");
      return next;
    });
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current?.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  // Clears the narrowing filters but keeps the audience, which is changed
  // only through the audience buttons (chooseAudience).
  const resetAll = () => {
    setSearchDraft("");
    setCityDraft("");
    updateList({ q: "", city: "", categories: [], urgencies: [], sort: "newest" });
  };

  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(state.page, totalPages);
  const personCount = data?.typeCounts?.PERSON;
  const ngoCount = data?.typeCounts?.NGO;
  // Labels and descriptions come from the shared audience config, so the tabs
  // and the first-visit dialog can never name the choices differently.
  const tabCount: Record<TypeParam, number | undefined> = {
    all: personCount !== undefined && ngoCount !== undefined ? personCount + ngoCount : undefined,
    people: personCount,
    ngos: ngoCount,
  };
  const tabIcon: Record<TypeParam, React.ElementType | null> = { all: null, people: UserRound, ngos: Building2 };
  const typeTabs = AUDIENCE_OPTIONS.map(o => ({
    value: o.urlType as TypeParam,
    audience: o.value,
    label: o.label,
    description: o.description,
    Icon: tabIcon[o.urlType as TypeParam],
    count: tabCount[o.urlType as TypeParam],
  }));
  const narrowing = state.q || state.city || state.categories.length > 0 || state.urgencies.length > 0;
  const extraFilterCount = state.categories.length + state.urgencies.length;
  const boardSearch = useMemo(() => browseStateToSearch(state), [state]);

  return (
    <div className="min-h-screen bg-[#f2ede7] text-stone-900 dark:bg-zinc-950 dark:text-stone-100">
      <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">

        {/* ── Introduction ── */}
        <header className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--ck-role-accent)]">
            Small things. Real help.
          </p>
          <h1 className="mt-2 text-[clamp(1.75rem,1.3rem+2vw,2.75rem)] font-medium leading-[1.08] tracking-tight [font-family:var(--font-lora),Georgia,serif]">
            Someone needs what you can give.
          </h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-stone-600 dark:text-stone-300">
            Find an item you can share. Browse first, sign in when you&apos;re ready.
          </p>
        </header>

        {/* ── Search + city ── */}
        <form
          role="search"
          onSubmit={e => { e.preventDefault(); updateList({ q: cleanText(searchDraft), city: cleanText(cityDraft) }); }}
          className="mt-5 flex flex-col gap-2 sm:flex-row"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            {/* 16px text: smaller makes iOS Safari zoom on focus. */}
            <input
              type="search"
              value={searchDraft}
              onChange={e => setSearchDraft(e.target.value)}
              maxLength={MAX_TEXT}
              placeholder="What would you like to give?"
              aria-label="Search requests by item, category, city or organisation"
              className="min-h-11 w-full rounded-lg border border-stone-200 bg-white ps-9 pe-3 text-base placeholder:text-stone-400 focus:border-[var(--ck-role-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)]/40 dark:border-white/10 dark:bg-white/[0.04]"
            />
          </div>
          <div className="relative sm:w-56">
            <MapPin className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <input
              type="text"
              value={cityDraft}
              onChange={e => setCityDraft(e.target.value)}
              maxLength={MAX_TEXT}
              placeholder="Any city"
              aria-label="Filter by city"
              autoComplete="address-level2"
              className="min-h-11 w-full rounded-lg border border-stone-200 bg-white ps-9 pe-9 text-base placeholder:text-stone-400 focus:border-[var(--ck-role-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)]/40 dark:border-white/10 dark:bg-white/[0.04]"
            />
            {cityDraft && (
              <button
                type="button"
                onClick={() => { setCityDraft(""); updateList({ city: "" }); }}
                aria-label="Clear city"
                className="absolute end-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-stone-500 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:hover:text-stone-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </form>

        {/* ── Requester type + filter toggle + sort ── */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Who posted the request" className="flex flex-wrap gap-2">
            {typeTabs.map(({ value, audience, label, description, Icon, count }) => {
              const on = state.type === value;
              return (
                <button
                  key={value}
                  id={audienceControlId(audience)}
                  type="button"
                  aria-pressed={on}
                  title={description}
                  onClick={() => chooseAudience(audience)}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
                    on
                      ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-accent)] text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-200"
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                  {label}
                  <span className="sr-only">: {description}</span>
                  {count !== undefined && (
                    <span className={on ? "text-white/85" : "text-stone-400"}>
                      <span className="sr-only">, </span>{count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="ms-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="guest-board-filters"
              onClick={() => setFiltersOpen(o => !o)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-semibold text-stone-700 hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-200"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters{extraFilterCount > 0 ? ` (${extraFilterCount})` : ""}
            </button>
            <label htmlFor="public-requests-sort" className="sr-only">Sort requests</label>
            <select
              id="public-requests-sort"
              value={state.sort}
              onChange={e => updateList({ sort: e.target.value as SortValue })}
              className="min-h-11 rounded-lg border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 focus:border-[var(--ck-role-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/10 dark:bg-zinc-900 dark:text-stone-200"
            >
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── Category + urgency (collapsed by default) ── */}
        <div id="guest-board-filters" hidden={!filtersOpen} className="mt-3 space-y-3 rounded-lg border border-stone-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
            {ALL_REQUEST_CATEGORIES.map(cat => {
              const on = state.categories.includes(cat);
              const n = data?.categoryCounts?.[cat];
              const visual = CATEGORY_VISUALS[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={on}
                  onClick={() => updateList({ categories: toggleIn(state.categories, cat) })}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] ${
                    on
                      ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-accent)] text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300"
                  }`}
                >
                  {visual && <visual.Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                  {cat}
                  {n !== undefined && <span className={on ? "text-white/80" : "text-stone-400"}><span className="sr-only">, </span>{n}</span>}
                </button>
              );
            })}
          </div>
          <div role="group" aria-label="Filter by urgency" className="flex flex-wrap gap-2">
            {URGENCIES.map(u => {
              const on = state.urgencies.includes(u);
              return (
                <button
                  key={u}
                  type="button"
                  aria-pressed={on}
                  onClick={() => updateList({ urgencies: toggleIn(state.urgencies, u) })}
                  className={`inline-flex min-h-10 items-center rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] ${
                    on
                      ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-accent)] text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300"
                  }`}
                >
                  {URGENCY_LABELS[u]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Results ── */}
        <section ref={resultsRef} aria-label="Requests" className="mt-5 scroll-mt-24">
          <p className="mb-3 min-h-5 text-xs text-stone-500 dark:text-stone-400" aria-live="polite">
            {loading ? "Loading requests…" : failed ? "" : `${total} open ${total === 1 ? "request" : "requests"}${state.city ? ` in ${state.city}` : ""}`}
          </p>

          {loading ? (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </ul>
          ) : failed ? (
            <Notice icon={<AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />}>
              <span className="flex-1">We couldn&apos;t load requests right now.</span>
              <NoticeButton onClick={() => setRetryTick(t => t + 1)}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Try again
              </NoticeButton>
            </Notice>
          ) : items.length === 0 ? (
            state.type === "ngos" && !narrowing ? (
              <Notice icon={<Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />}>
                <span className="flex-1">No open NGO requests right now.</span>
                <NoticeButton onClick={() => chooseAudience("everyone")}>See all requests</NoticeButton>
              </Notice>
            ) : state.type === "people" && !narrowing ? (
              <Notice icon={<Inbox className="h-4 w-4 shrink-0" aria-hidden="true" />}>
                <span className="flex-1">No open requests from people right now.</span>
                <NoticeButton onClick={() => chooseAudience("everyone")}>See all requests</NoticeButton>
              </Notice>
            ) : narrowing ? (
              <Notice icon={<Inbox className="h-4 w-4 shrink-0" aria-hidden="true" />}>
                <span className="flex-1">No open requests match these filters.</span>
                <NoticeButton onClick={resetAll}>Clear all filters</NoticeButton>
              </Notice>
            ) : (
              <Notice icon={<Inbox className="h-4 w-4 shrink-0" aria-hidden="true" />}>
                <span className="flex-1">There are no open requests at the moment. Please check back soon.</span>
              </Notice>
            )
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map(r => <RequestCard key={r.id} req={r} boardSearch={boardSearch} />)}
              </ul>

              {totalPages > 1 && (
                <nav aria-label="Pages of requests" className="mt-6 flex items-center justify-between gap-3">
                  <PagerButton onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                  </PagerButton>
                  <p className="text-center text-xs text-stone-500 dark:text-stone-400">
                    Page {currentPage} of {totalPages}
                  </p>
                  <PagerButton onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
                    Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </PagerButton>
                </nav>
              )}
            </>
          )}
        </section>
      </div>

      {/* Mounted once, only on this board; it owns no state of its own. */}
      <AudienceDialog
        open={audienceDialogOpen}
        current={audienceFromUrlType(state.type)}
        returnFocusId={audienceControlId}
        onChoose={chooseAudience}
        onDismiss={dismissAudienceDialog}
      />
    </div>
  );
}

/**
 * One request. The whole card is a single link to the public detail page —
 * no nested controls, so there is nothing to mis-tap.
 */
function RequestCard({ req, boardSearch }: { req: PublicItemRequest; boardSearch: string }) {
  const visual = CATEGORY_VISUALS[req.category];
  const isNgo = req.requesterType === "NGO";
  const who = isNgo ? (req.organizationName || "A registered organisation") : (req.doneeFirstName || "A neighbour");
  const urgent = req.urgency === "CRITICAL" || req.emergency;
  const href = `/requests/${req.id}${boardSearch ? `?from=${encodeURIComponent(`/requests${boardSearch}`)}` : ""}`;

  return (
    <li className="min-w-0">
      <Link
        href={href}
        className="group flex h-full min-w-0 flex-col rounded-xl border border-stone-200/90 bg-white p-4 transition-colors hover:border-[var(--ck-role-accent)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] focus-visible:ring-offset-2 dark:border-white/10 dark:bg-white/[0.04] dark:focus-visible:ring-offset-zinc-950 sm:p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--ck-role-accent)]">
            {isNgo ? <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> : <UserRound className="h-3.5 w-3.5" aria-hidden="true" />}
            {isNgo ? "NGO request" : "Person request"}
          </span>
          {urgent && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
              Urgent
            </span>
          )}
        </div>

        <div className="mt-3 flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--ck-role-accent)]/10 text-[var(--ck-role-accent)] sm:h-12 sm:w-12" aria-hidden="true">
            {visual ? <visual.Icon className="h-5 w-5" /> : <Package className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 break-words text-base font-semibold leading-snug">{req.title}</h2>
            {req.description && (
              <p className="mt-1 line-clamp-2 break-words text-sm leading-relaxed text-stone-600 [overflow-wrap:anywhere] dark:text-stone-400">
                {req.description}
              </p>
            )}
          </div>
        </div>

        <dl className="mb-3 mt-3 space-y-1 text-xs text-stone-600 dark:text-stone-400">
          <div className="flex min-w-0 gap-1">
            <dt className="sr-only">Posted by</dt>
            <dd className="min-w-0 truncate font-medium text-stone-800 dark:text-stone-200" title={who}>{who}</dd>
          </div>
          <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
            {req.city && (
              <div className="inline-flex min-w-0 items-center gap-1">
                <dt><MapPin className="h-3 w-3" aria-label="City" /></dt>
                <dd className="truncate">{req.city}</dd>
              </div>
            )}
            <div className="inline-flex items-center gap-1">
              <dt>Quantity requested:</dt>
              <dd className="tabular-nums">{req.quantity.toLocaleString("en-IN")}</dd>
            </div>
            {req.category && (
              <div className="inline-flex items-center gap-1">
                <dt className="sr-only">Category</dt>
                <dd>{req.category}</dd>
              </div>
            )}
          </div>
        </dl>

        <span className="mt-auto inline-flex items-center justify-between gap-2 border-t border-stone-100 pt-3 text-sm font-semibold text-[var(--ck-role-accent)] dark:border-white/10">
          View need <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:transform-none" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

function CardSkeleton() {
  return (
    <li className="rounded-xl border border-stone-200/90 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-5">
      <div className="h-3 w-24 animate-pulse rounded bg-stone-200 motion-reduce:animate-none dark:bg-white/10" />
      <div className="mt-3 flex gap-3">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-stone-200 motion-reduce:animate-none dark:bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200 motion-reduce:animate-none dark:bg-white/10" />
          <div className="h-3 w-full animate-pulse rounded bg-stone-100 motion-reduce:animate-none dark:bg-white/5" />
        </div>
      </div>
      <div className="mt-4 h-3 w-1/2 animate-pulse rounded bg-stone-100 motion-reduce:animate-none dark:bg-white/5" />
    </li>
  );
}

function Notice({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white/70 p-5 text-sm text-stone-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-300">
      {icon}
      {children}
    </div>
  );
}

function NoticeButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-stone-300 px-3.5 text-sm font-semibold hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/15 dark:hover:bg-white/5"
    >
      {children}
    </button>
  );
}

function PagerButton({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 hover:border-stone-400 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-200"
    >
      {children}
    </button>
  );
}
