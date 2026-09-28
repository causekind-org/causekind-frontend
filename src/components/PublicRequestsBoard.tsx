"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, AlertTriangle, Inbox, RefreshCw, LogIn, Search, ArrowRight, SlidersHorizontal, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { getPublicItemRequests, type PublicItemRequest } from "@/lib/api";
import { CardGridSkeleton, EditorialListSkeleton } from "@/components/skeletons";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import styles from "./PublicRequestsBoard.module.css";
import { loginUrlFor } from "@/lib/safeRedirect";

/**
 * The need board as a logged-out visitor sees it.
 *
 * Two things make this a separate component rather than a branch inside the
 * donor board:
 *
 * 1. **It reads a different endpoint with a different shape.** `/item-requests/public`
 *    returns no coordinates, so there is nothing to sort by distance and no
 *    reason to ask for GPS. A guest is never prompted for location.
 * 2. **Every route out of it leads to login.** A guest may read a need in full,
 *    but the moment they act on one they are sent to `/login?next=…` and
 *    returned to precisely the offer page they wanted.
 *
 * Category filtering is client-side over the full fetched set, matching how the
 * signed-in board works — sending `categories` to the server would shrink the
 * response and break the per-category counts.
 */
/**
 * Sorting a guest may do.
 *
 * <p>There is deliberately no "nearest": the public projection carries no
 * coordinates, so distance cannot be computed, and offering the option would
 * mean asking an anonymous visitor for GPS in order to sort a list they are
 * only reading. The signed-in donor board keeps its distance sort — that path
 * has both a location and a reason to use it.
 */
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "urgent", label: "Most urgent" },
  { value: "quantity", label: "Highest quantity" },
] as const;
type SortValue = (typeof SORTS)[number]["value"];

/**
 * Urgency values in severity order, so the filter row reads worst-first.
 *
 * <p>Must mirror the backend `ItemUrgency` enum (NORMAL, HIGH, CRITICAL). This
 * list used to carry MEDIUM and LOW, which the API never returns — those chips
 * always emptied the board, and NORMAL needs could not be filtered at all.
 */
const URGENCIES = ["CRITICAL", "HIGH", "NORMAL"] as const;
const URGENCY_LABELS: Record<(typeof URGENCIES)[number], string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  NORMAL: "Normal",
};

/** Rank for the "most urgent" sort. Emergency outranks every urgency label. */
function urgencyRank(r: PublicItemRequest): number {
  if (r.emergency) return 0;
  const i = (URGENCIES as readonly string[]).indexOf(r.urgency ?? "");
  // Unknown or absent urgency sorts after everything known rather than
  // silently ranking as most urgent, which is what `indexOf` -1 would do.
  return i === -1 ? URGENCIES.length + 1 : i + 1;
}

/**
 * Needs per page. Pagination is client-side over the already-filtered list —
 * the board fetches every public need anyway (counts and filters need the full
 * set), so paging only limits how many cards render. 12 divides evenly into the
 * 1-, 2- and 3-column grids.
 */
const PAGE_SIZE = 12;

/** `?page=N` from the current URL; anything missing or invalid is page 1. */
function readPageParam(): number {
  if (typeof window === "undefined") return 1;
  const n = Number(new URLSearchParams(window.location.search).get("page"));
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/**
 * Mirror the page into the URL without a Next navigation (no refetch, no
 * scroll reset). Deliberately not `useSearchParams`, which would need a new
 * Suspense boundary on this route. `push` gives Back/Forward per page click;
 * filter resets `replace` so they do not litter history.
 */
function writePageParam(page: number, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  if (page <= 1) url.searchParams.delete("page");
  else url.searchParams.set("page", String(page));
  if (url.href === window.location.href) return;
  if (mode === "push") window.history.pushState(window.history.state, "", url);
  else window.history.replaceState(window.history.state, "", url);
}

export default function PublicRequestsBoard({
  initialRequests = [],
}: {
  /**
   * The board as fetched on the server by src/app/requests/page.tsx.
   *
   * When it arrives non-empty the component renders needs on its very first
   * paint and sends no request of its own — the board used to mount empty and
   * fetch, which could not start until the page had hydrated.
   *
   * Empty means one of two things, and both want the same behaviour: the server
   * fetch failed, or the board genuinely has nothing on it. Fetching once on the
   * client covers the first and costs an empty round trip on the second, which
   * is the cheap way round — the alternative is a visitor staring at "no needs"
   * because the server call timed out.
   */
  initialRequests?: PublicItemRequest[];
} = {}) {
  const [requests, setRequests] = useState<PublicItemRequest[]>(initialRequests);
  const [loading, setLoading] = useState(initialRequests.length === 0);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [urgencies, setUrgencies] = useState<string[]>([]);
  const [sort, setSort] = useState<SortValue>("newest");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    getPublicItemRequests()
      .then(setRequests)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  // Seeded from the server: nothing to fetch. `load` stays wired up for the
  // retry button on the error state, which is why this is not `if (!seeded)`
  // around the callback itself.
  const seeded = initialRequests.length > 0;
  useEffect(() => { if (!seeded) load(); }, [load, seeded]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    requests.forEach(r => { c[r.category] = (c[r.category] || 0) + 1; });
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = requests.filter(r => {
      if (selected.length > 0 && !selected.includes(r.category)) return false;
      // An emergency request satisfies a CRITICAL filter even if its own
      // urgency label is lower — the banner on the card says "Urgent", so
      // filtering it out would contradict what the user can see.
      if (urgencies.length > 0) {
        const matches =
          urgencies.includes(r.urgency ?? "") ||
          (r.emergency && urgencies.includes("CRITICAL"));
        if (!matches) return false;
      }
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });

    // Copy before sorting: `filter` already returned a new array here, but that
    // is an easy invariant to break later and an in-place sort of `requests`
    // would mutate state.
    return [...out].sort((a, b) => {
      if (sort === "quantity") return b.quantity - a.quantity;
      if (sort === "urgent") return urgencyRank(a) - urgencyRank(b);
      // Newest. Missing timestamps sort last rather than being treated as
      // epoch-zero, which would park them at the bottom under a label that
      // claims they are simply the oldest.
      const at = a.createdAt ? Date.parse(a.createdAt) : NaN;
      const bt = b.createdAt ? Date.parse(b.createdAt) : NaN;
      if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
      if (Number.isNaN(at)) return 1;
      if (Number.isNaN(bt)) return -1;
      return bt - at;
    });
  }, [requests, selected, urgencies, query, sort]);

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const resultsRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Read the URL after mount (not in the initializer) so server and client
  // render the same first page; follow Back/Forward afterwards.
  useEffect(() => {
    setPage(readPageParam());
    const onPop = () => setPage(readPageParam());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Any change to what is being listed starts again at page 1. Skips the
  // first run so a shared `?page=3` link is not immediately reset.
  const listKey = `${selected.join("|")}::${urgencies.join("|")}::${query.trim()}::${sort}`;
  const lastListKey = useRef(listKey);
  useEffect(() => {
    if (lastListKey.current === listKey) return;
    lastListKey.current = listKey;
    setPage(1);
    writePageParam(1, "replace");
  }, [listKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamp rather than store: a stale `?page=9` on a shorter list shows the last page.
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const goToPage = (n: number) => {
    const next = Math.min(Math.max(1, n), totalPages);
    setPage(next);
    writePageParam(next, "push");
    resultsRef.current?.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  const toggle = (cat: string) =>
    setSelected(prev => (prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]));

  const toggleUrgency = (u: string) =>
    setUrgencies(prev => (prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]));

  const hasFilters = selected.length > 0 || urgencies.length > 0 || query.trim().length > 0;

  return (
    <div className={`${styles.board} min-h-screen bg-[#f2ede7] dark:bg-zinc-950 text-stone-900 dark:text-stone-100`}>
      <div className={`${styles.content} mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12`}>

        {/* ── Header ── */}
        <header className={styles.header}>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--ck-role-accent)]">
            Open needs
          </p>
          <h1 className="mt-2 text-[clamp(1.6rem,1.3rem+1.5vw,2.5rem)] font-bold leading-tight">
            {/* Phones get the editorial headline; the real title stays in the
                accessibility tree (visually hidden there, not display:none). */}
            <span className={styles.title}>In-Kind Requests</span>
            <span className={styles.mobileTitle} aria-hidden="true">A little help.<br />A new beginning.</span>
          </h1>
          <p className={`${styles.intro} mt-2 max-w-2xl text-[clamp(0.9rem,0.87rem+0.15vw,1rem)] leading-relaxed text-stone-600 dark:text-stone-300`}>
            Real, verified needs posted by people and organisations near you.
            Browse freely — you only need an account when you decide to give.
          </p>
          <p className={styles.mobileIntro}>Browse freely. Log in when you&apos;re ready to help.</p>
        </header>

        {/* ── Sign-in nudge. A note, not a wall: the board below is fully readable. ── */}
        {/* Desktop only — phones get the compact nudge after the results. */}
        <div className={`${styles.nudge} mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--ck-role-accent)]/25 bg-[var(--ck-role-accent)]/[0.06] px-4 py-3`}>
          <LogIn className="w-4 h-4 shrink-0 text-[var(--ck-role-accent)]" aria-hidden="true" />
          {/* States what browsing costs (nothing) before what login adds. The
              previous copy led with what the visitor was missing, which reads
              as a soft wall on a board that is in fact fully open. */}
          <p className="min-w-0 flex-1 text-sm text-stone-700 dark:text-stone-300">
            You can browse open needs without an account. Log in only when
            you&apos;re ready to offer an item.
          </p>
          <Link
            href={loginUrlFor("/requests")}
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--ck-role-accent)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] focus-visible:ring-offset-2"
          >
            Log in
          </Link>
        </div>

        {/* ── Search + category filters ── */}
        <div className={`${styles.searchArea} mt-6 space-y-3`}>
          <div className={`${styles.searchBox} relative max-w-md`}>
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by item, city or category…"
              aria-label="Search open needs"
              // 16px minimum: anything smaller makes iOS Safari zoom the page
              // on focus, which reads as the layout breaking.
              className="min-h-11 w-full rounded-full border border-stone-200 bg-white ps-9 pe-4 text-base text-stone-800 placeholder:text-stone-400 focus:border-[var(--ck-role-accent)] focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-100"
            />
          </div>

          {/* Categories. On desktop this is the existing chip row; below 768px
              the same buttons become a contained horizontal rail. One set of
              controls and one `selected` state serve both widths. */}
          <div className={`${styles.categoryRail} flex flex-wrap gap-2`} role="group" aria-label="Filter by category">
            {/* Phone-only reset. Clears categories only — search and urgency
                are left alone. Hidden (display:none) on desktop, which also
                removes it from the accessibility tree there. */}
            <button
              type="button"
              onClick={() => setSelected([])}
              aria-pressed={selected.length === 0}
              className={styles.allNeeds}
            >
              All needs
            </button>
            {ALL_REQUEST_CATEGORIES.map(cat => {
              const n = counts[cat] ?? 0;
              const on = selected.includes(cat);
              const visual = CATEGORY_VISUALS[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggle(cat)}
                  disabled={n === 0 && !on}
                  aria-pressed={on}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] ${
                    on
                      ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-accent)] text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300"
                  }`}
                >
                  {visual && <visual.Icon className="w-3.5 h-3.5" aria-hidden="true" />}
                  {cat}
                  <span className={on ? "text-white/80" : "text-stone-400"}>{n}</span>
                </button>
              );
            })}
          </div>

          {/* Phone-only: result count and the urgency-filter toggle. The count
              is not a live region — the results container already is. */}
          <div className={styles.mobileToolbar}>
            <span>{loading ? "Loading needs…" : failed ? "Needs unavailable" : `${filtered.length} open ${filtered.length === 1 ? "need" : "needs"}`}</span>
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="guest-needs-urgency"
              onClick={() => setFiltersOpen(open => !open)}
              className="inline-flex items-center gap-2"
            >
              <SlidersHorizontal size={14} aria-hidden="true" />
              {urgencies.length > 0
                ? `Urgency: ${URGENCIES.filter(u => urgencies.includes(u)).map(u => URGENCY_LABELS[u]).join(", ")}`
                : "Filters"}
            </button>
          </div>

          {/* Urgency + sort. One row, wrapping — on a 320px screen the sort
              select drops below the urgency chips rather than squeezing them.
              On phones sort and "Clear filters" stay visible; only the urgency
              group collapses behind the Filters toggle. */}
          <div className={`${styles.filters} flex flex-wrap items-center gap-2`} data-open={filtersOpen}>
            <div id="guest-needs-urgency" className={`${styles.urgencyGroup} flex flex-wrap gap-2`} role="group" aria-label="Filter by urgency">
              {URGENCIES.map(u => {
                const on = urgencies.includes(u);
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => toggleUrgency(u)}
                    aria-pressed={on}
                    className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] ${
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

            <div className={`${styles.sortGroup} ms-auto flex items-center gap-2`}>
              <label
                htmlFor="public-requests-sort"
                className="text-xs font-semibold text-stone-500 dark:text-stone-400"
              >
                Sort
              </label>
              {/* A native <select>: it is keyboard- and screen-reader-correct
                  for free, and on a phone it opens the platform picker rather
                  than a custom menu that has to be re-solved for touch. */}
              <select
                id="public-requests-sort"
                value={sort}
                onChange={e => setSort(e.target.value as SortValue)}
                className="min-h-11 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 focus:border-[var(--ck-role-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-200"
              >
                {SORTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={() => { setSelected([]); setUrgencies([]); setQuery(""); }}
                className="inline-flex min-h-11 items-center rounded px-3 text-sm font-semibold text-stone-500 underline underline-offset-4 hover:text-[var(--ck-role-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)]"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Results ── */}
        <div ref={resultsRef} className={`${styles.results} mt-7 scroll-mt-24`} aria-live="polite">
          {loading ? (
            // Same shape the results land in, so nothing shifts when they do.
            // Two variants, one shown per width; the hidden one is display:none
            // and so never announced.
            <>
              <div className={styles.skeletonDesktop}>
                <CardGridSkeleton count={6} label="Loading open needs" />
              </div>
              <div className={styles.skeletonMobile}>
                <EditorialListSkeleton count={4} label="Loading open needs" />
              </div>
            </>
          ) : failed ? (
            <Shell>
              <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span className="flex-1">Couldn&apos;t load needs right now.</span>
              <button
                type="button"
                onClick={load}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-stone-300 px-3.5 text-sm font-semibold hover:bg-stone-100 dark:border-white/15 dark:hover:bg-white/5"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Retry
              </button>
            </Shell>
          ) : filtered.length === 0 ? (
            // Two distinct empty states. "Nothing matched your filters" and
            // "nothing exists yet" are different facts, and collapsing them
            // would tell someone with an over-narrow filter that the platform
            // is empty. Neither is reachable when the fetch failed — that case
            // is handled above and never falls through to here, so a network
            // error can never be reported as "no requests".
            <Shell>
              <Inbox className="w-4 h-4 shrink-0" aria-hidden="true" />
              {requests.length === 0 ? (
                <span className="flex-1">
                  There are no open public needs at the moment. Check back soon.
                </span>
              ) : (
                <>
                  <span className="flex-1">
                    No open requests match these filters right now. Try another
                    category or check back soon.
                  </span>
                  <button
                    type="button"
                    onClick={() => { setSelected([]); setUrgencies([]); setQuery(""); }}
                    className="inline-flex min-h-11 items-center rounded-full border border-stone-300 px-3.5 text-sm font-semibold hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/15 dark:hover:bg-white/5"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </Shell>
          ) : (
            <>
              <p className={`${styles.resultCount} mb-3 text-xs text-stone-500 dark:text-stone-400`}>
                {filtered.length} open {filtered.length === 1 ? "need" : "needs"}
              </p>
              <ul className={`${styles.list} grid gap-3 sm:grid-cols-2 lg:grid-cols-3`}>
                {visible.map(r => <PublicRequestCard key={r.id} req={r} />)}
              </ul>

              {totalPages > 1 && (
                <nav aria-label="Pages of open needs" className={`${styles.pager} mt-6 flex items-center justify-between gap-3`}>
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="inline-flex min-h-11 items-center gap-1 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-400 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-200"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                  </button>
                  <p className="text-center text-xs text-stone-500 dark:text-stone-400">
                    Page {currentPage} of {totalPages}
                    <span className={styles.pagerRange}>
                      {" "}· {pageStart + 1}–{pageStart + visible.length} of {filtered.length}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="inline-flex min-h-11 items-center gap-1 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-400 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-200"
                  >
                    Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </nav>
              )}
            </>
          )}
        </div>

        {/* Phone-only sign-in nudge, after the list so browsing stays first.
            It is a plain login link: the wording does not pick or change a role. */}
        <div className={styles.mobileNudge}>
          <span>Have something to give?</span>
          <Link href={loginUrlFor("/requests")}>
            Log in as donor <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * A card whose only action is "offer this" — which for a guest means login.
 *
 * This is a real `<Link>`, not a div with an onClick: middle-click, ⌘-click and
 * "copy link address" all have to keep working, and the destination is a genuine
 * URL. The login bounce happens because the href *is* the login URL, so there is
 * no flash of a protected page and nothing to intercept.
 */
function PublicRequestCard({ req }: { req: PublicItemRequest }) {
  const visual = CATEGORY_VISUALS[req.category];
  const urgent = req.urgency === "CRITICAL" || req.emergency;
  // Reduced motion: render in place, never held invisible waiting for a
  // scroll-triggered entrance.
  const reduceMotion = useReducedMotion();

  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={loginUrlFor(`/requests/${req.id}/offer`)}
        className={`${styles.card} group flex h-full flex-col gap-2.5 rounded-2xl border border-stone-200/80 bg-white/80 p-4 transition-colors hover:border-[var(--ck-role-accent)]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]`}
      >
        <span className={styles.cardIcon} aria-hidden="true">{visual ? <visual.Icon /> : <Package />}</span>
        <div className={`${styles.titleRow} flex items-start justify-between gap-2`}>
          <h2 className="min-w-0 text-sm font-semibold line-clamp-2">{req.title}</h2>
          {urgent && (
            <span className="shrink-0 self-start rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              Urgent
            </span>
          )}
        </div>

        {req.description && (
          <p className={`${styles.description} text-xs leading-relaxed text-stone-500 line-clamp-2 dark:text-stone-400`}>
            {req.description}
          </p>
        )}

        <div className={`${styles.metadata} mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-stone-500 dark:text-stone-400`}>
          {/* Category is always rendered, known or not, and carries its own
              class: phones hide it visually (the corner icon stands in) but
              keep it for screen readers. Nothing here is hidden by position,
              which used to drop the city whenever the category was unknown. */}
          {req.category && (
            <span className={visual ? `${styles.metaCategory} inline-flex items-center gap-1 ${visual.text}` : "sr-only"}>
              {visual && <visual.Icon className="w-3 h-3" aria-hidden="true" />}
              {req.category}
            </span>
          )}
          {/* City only — the public payload carries no pincode or coordinates. */}
          {req.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" aria-hidden="true" />
              {req.city}
            </span>
          )}
          <span>Qty {req.quantity}</span>
        </div>

        {/* One action label per width; the other is display:none, so the
            link's accessible name never contains both. */}
        <p className={`${styles.cardAction} text-xs font-semibold text-[var(--ck-role-accent)]`}>
          <span className={styles.actionDesktop}>Log in to offer an item</span>
          <span className={styles.actionMobile}>I can help</span>
          <ArrowRight aria-hidden="true" />
        </p>
      </Link>
    </motion.li>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200/80 bg-white/60 p-6 text-sm text-stone-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-stone-400">
      {children}
    </div>
  );
}
