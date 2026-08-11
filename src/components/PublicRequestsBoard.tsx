"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, AlertTriangle, Loader2, Inbox, RefreshCw, LogIn, Search } from "lucide-react";
import { getPublicItemRequests, type PublicItemRequest } from "@/lib/api";
import { CardGridSkeleton } from "@/components/skeletons";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS } from "@/lib/categoryVisuals";
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
export default function PublicRequestsBoard() {
  const [requests, setRequests] = useState<PublicItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    getPublicItemRequests()
      .then(setRequests)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    requests.forEach(r => { c[r.category] = (c[r.category] || 0) + 1; });
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter(r => {
      if (selected.length > 0 && !selected.includes(r.category)) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [requests, selected, query]);

  const toggle = (cat: string) =>
    setSelected(prev => (prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]));

  return (
    <div className="min-h-screen bg-[#f2ede7] dark:bg-zinc-950 text-stone-900 dark:text-stone-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">

        {/* ── Header ── */}
        <header>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--ck-role-accent)]">
            Open needs
          </p>
          <h1 className="mt-2 text-[clamp(1.6rem,1.3rem+1.5vw,2.5rem)] font-bold leading-tight">
            In-Kind Requests
          </h1>
          <p className="mt-2 max-w-2xl text-[clamp(0.9rem,0.87rem+0.15vw,1rem)] leading-relaxed text-stone-600 dark:text-stone-300">
            Real, verified needs posted by people and organisations near you.
            Browse freely — you only need an account when you decide to give.
          </p>
        </header>

        {/* ── Sign-in nudge. A note, not a wall: the board below is fully readable. ── */}
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--ck-role-accent)]/25 bg-[var(--ck-role-accent)]/[0.06] px-4 py-3">
          <LogIn className="w-4 h-4 shrink-0 text-[var(--ck-role-accent)]" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm text-stone-700 dark:text-stone-300">
            Sign in to see needs sorted by distance from you, and to offer an item.
          </p>
          <Link
            href={loginUrlFor("/requests")}
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--ck-role-accent)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] focus-visible:ring-offset-2"
          >
            Log in
          </Link>
        </div>

        {/* ── Search + category filters ── */}
        <div className="mt-6 space-y-3">
          <div className="relative max-w-md">
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

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
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
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => setSelected([])}
                className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-stone-500 underline underline-offset-4 hover:text-[var(--ck-role-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] rounded"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Results ── */}
        <div className="mt-7" aria-live="polite">
          {loading ? (
            // Same grid the results land in, so nothing shifts when they do.
            <CardGridSkeleton count={6} label="Loading open needs" />
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
            <Shell>
              <Inbox className="w-4 h-4" aria-hidden="true" />
              {requests.length === 0
                ? "There are no open public needs at the moment. Check back soon."
                : "No needs match these filters."}
            </Shell>
          ) : (
            <>
              <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
                {filtered.length} open {filtered.length === 1 ? "need" : "needs"}
              </p>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(r => <PublicRequestCard key={r.id} req={r} />)}
              </ul>
            </>
          )}
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

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={loginUrlFor(`/requests/${req.id}/offer`)}
        className="group flex h-full flex-col gap-2.5 rounded-2xl border border-stone-200/80 bg-white/80 p-4 transition-colors hover:border-[var(--ck-role-accent)]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 text-sm font-semibold line-clamp-2">{req.title}</h2>
          {urgent && (
            <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              Urgent
            </span>
          )}
        </div>

        {req.description && (
          <p className="text-xs leading-relaxed text-stone-500 line-clamp-2 dark:text-stone-400">
            {req.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-stone-500 dark:text-stone-400">
          {visual && (
            <span className={`inline-flex items-center gap-1 ${visual.text}`}>
              <visual.Icon className="w-3 h-3" aria-hidden="true" />
              {req.category}
            </span>
          )}
          {/* City only — the public payload carries no pincode or coordinates. */}
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" aria-hidden="true" />
            {req.city}
          </span>
          <span>Qty {req.quantity}</span>
        </div>

        <p className="text-xs font-semibold text-[var(--ck-role-accent)]">
          Log in to offer an item
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
