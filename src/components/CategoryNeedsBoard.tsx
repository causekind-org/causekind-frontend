"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, AlertTriangle, LocateFixed, Loader2, Inbox, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { getItemRequests, getPublicItemRequests, type ItemRequest, type PublicItemRequest } from "@/lib/api";
import { loginUrlFor } from "@/lib/safeRedirect";
import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import AnimatedCategoryIcon from "./AnimatedCategoryIcon";

/**
 * Live needs for one category, GPS-scoped.
 *
 * Mirrors the fetch shape used on /requests deliberately: request the full
 * GPS-scoped set with no `categories` argument and narrow client-side. The
 * server-side category filter exists but shrinks the response, which is what
 * broke the counts on the hub page — see the comment in
 * src/app/requests/page.tsx. Here the practical point is simpler: whatever we
 * send, we still only trust `r.category === categoryName` on the way out.
 *
 * `categoryName` is always the canonical name resolved through
 * `categoryBySlug`. A URL slug never reaches this component, let alone the API.
 */
export default function CategoryNeedsBoard({ categoryName }: { categoryName: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBlocked, setGpsBlocked] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const isDonor = !!user && user.role !== "DONEE";

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) { setGpsBlocked(true); return; }
    setGpsLoading(true);
    setGpsBlocked(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => { setGpsBlocked(true); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Guests never reach this. The gate is the `isDonor` check, not the API's 401 —
  // an unauthenticated call would still leave a failed request in the network
  // log and a flash of an error state for someone who is simply reading.
  useEffect(() => {
    if (!authLoading && isDonor) requestGps();
  }, [authLoading, isDonor, requestGps]);

  const load = useCallback(() => {
    if (!isDonor || !coords) return;
    setLoading(true);
    setFailed(false);
    getItemRequests(undefined, coords.lat, coords.lng)
      .then((all) => setRequests(all.filter((r) => r.category === categoryName)))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [isDonor, coords, categoryName]);

  useEffect(() => { load(); }, [load]);

  useEntityUpdates(["REQUEST"], () => { load(); });

  // Only a signed-in donor whose GPS actually resolved is looking at a
  // distance-scoped list. Everyone else — guests, donees, and donors still
  // waiting on or denied location — is seeing unscoped results, so the heading
  // must not claim otherwise.
  const scopedToDistance = isDonor && !!coords;

  // The heading lives here rather than on the page because it makes a claim
  // that depends on the viewer. `renderBody` keeps the existing early-return
  // state chain intact below; function declarations hoist, so it can be defined
  // after this return.
  return (
    <>
      <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">
        Open {categoryName} needs{scopedToDistance ? " near you" : ""}
      </h2>
      {renderBody()}
    </>
  );

  // ── States ───────────────────────────────────────────────────────────────

  function renderBody() {
  if (authLoading) return <BoardShell><Spinner label="Checking your session…" /></BoardShell>;

  // Guests read the same needs from the reduced-field public endpoint — no
  // coordinates, no GPS prompt, no distance sorting. They are told what login
  // adds rather than being blocked from seeing anything.
  if (!user) return <GuestCategoryNeeds categoryName={categoryName} />;

  if (user.role === "DONEE") {
    return (
      <BoardShell>
        <Empty
          icon={<Inbox className="w-5 h-5" />}
          title="You're signed in as a donee"
          body={`If you need something in ${categoryName}, post it as a request and nearby donors will see it.`}
          action={<PrimaryLink href="/requests/new">Post a need</PrimaryLink>}
        />
      </BoardShell>
    );
  }

  if (gpsLoading) return <BoardShell><Spinner label="Finding needs near you…" /></BoardShell>;

  if (gpsBlocked) {
    return (
      <BoardShell>
        <Empty
          icon={<LocateFixed className="w-5 h-5" />}
          title="Location needed"
          body="Requests are matched by distance, so we need your location to show which ones you could realistically reach."
          action={<PrimaryButton onClick={requestGps}>Allow location</PrimaryButton>}
        />
      </BoardShell>
    );
  }

  if (loading) return <BoardShell><Spinner label="Loading needs…" /></BoardShell>;

  if (failed) {
    return (
      <BoardShell>
        <Empty
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Couldn't load needs"
          body="Something went wrong reaching the server. Your connection may have dropped."
          action={
            <PrimaryButton onClick={load}>
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </PrimaryButton>
          }
        />
      </BoardShell>
    );
  }

  if (requests.length === 0) {
    return (
      <BoardShell>
        <Empty
          icon={<AnimatedCategoryIcon category={categoryName} />}
          title={`No open ${categoryName} needs near you right now`}
          body="This changes often. You can list an item anyway — it stays visible and gets matched as soon as someone nearby asks."
          action={<PrimaryLink href="/items/new">List an item</PrimaryLink>}
        />
      </BoardShell>
    );
  }

  return (
    // The donor path is the one that genuinely is distance-scoped: it reached
    // here only after GPS resolved and the fetch was made with coordinates.
    <BoardShell count={requests.length} near>
      <ul className="grid gap-3 sm:grid-cols-2">
        {requests.map((r) => {
          const visual = CATEGORY_VISUALS[r.category];
          const urgent = r.urgency === "CRITICAL";
          return (
            <li key={r.id}>
              <Link
                // There is no /requests/[id] detail page — `requests/[id]` holds
                // only `offer/`. The hub navigates here too (see the card click
                // handler in src/app/requests/page.tsx).
                href={`/requests/${r.id}/offer`}
                className="group flex h-full flex-col gap-2 rounded-2xl border border-stone-200/80 bg-white/70 p-4 transition-colors hover:border-[var(--ck-role-accent)]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 text-sm font-semibold text-stone-800 dark:text-stone-100 line-clamp-2">
                    {r.title}
                  </h3>
                  {urgent && (
                    <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                      Urgent
                    </span>
                  )}
                </div>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" aria-hidden="true" />
                    {r.city}
                  </span>
                  <span>Qty {r.quantity}</span>
                  {visual && <span className={visual.text}>{r.category}</span>}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </BoardShell>
  );
  }
}

/**
 * The same category board for a logged-out visitor.
 *
 * Split out rather than branched inline because it reads a different endpoint
 * returning a different type — `PublicItemRequest` has no `latitude`, so there
 * is deliberately no code path here that could ask for it.
 */
function GuestCategoryNeeds({ categoryName }: { categoryName: string }) {
  const [requests, setRequests] = useState<PublicItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    getPublicItemRequests()
      .then((all) => setRequests(all.filter((r) => r.category === categoryName)))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [categoryName]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <BoardShell><Spinner label="Loading open needs…" /></BoardShell>;

  if (failed) {
    return (
      <BoardShell>
        <Empty
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Couldn't load needs"
          body="Something went wrong reaching the server."
          action={<PrimaryButton onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Try again</PrimaryButton>}
        />
      </BoardShell>
    );
  }

  if (requests.length === 0) {
    return (
      <BoardShell>
        <Empty
          icon={<AnimatedCategoryIcon category={categoryName} />}
          title={`No open ${categoryName} needs right now`}
          body="This changes often — it's worth checking back."
          action={<PrimaryLink href={loginUrlFor("/requests")}>Log in to offer an item</PrimaryLink>}
        />
      </BoardShell>
    );
  }

  return (
    <BoardShell count={requests.length}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {requests.map((r) => {
          const visual = CATEGORY_VISUALS[r.category];
          const urgent = r.urgency === "CRITICAL" || r.emergency;
          return (
            <li key={r.id}>
              <Link
                href={loginUrlFor(`/requests/${r.id}/offer`)}
                className="group flex h-full flex-col gap-2 rounded-2xl border border-stone-200/80 bg-white/70 p-4 transition-colors hover:border-[var(--ck-role-accent)]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 text-sm font-semibold text-stone-800 dark:text-stone-100 line-clamp-2">
                    {r.title}
                  </h3>
                  {urgent && (
                    <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                      Urgent
                    </span>
                  )}
                </div>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" aria-hidden="true" />
                    {r.city}
                  </span>
                  <span>Qty {r.quantity}</span>
                  {visual && <span className={visual.text}>{r.category}</span>}
                </p>
                <p className="mt-auto pt-1 text-xs font-semibold text-[var(--ck-role-accent)]">
                  Log in to offer an item
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </BoardShell>
  );
}

// ── Small presentational helpers ───────────────────────────────────────────

/**
 * `near` must be passed explicitly rather than defaulting to true.
 *
 * <p>"near you" was previously unconditional, so the guest board — which reads
 * the public projection, has no coordinates and never asks for GPS — told
 * visitors their results were filtered by distance. They were not: a guest sees
 * every open need in the country. Claiming otherwise makes an empty category
 * look like "nothing near me" when it is actually "nothing anywhere", which is
 * the opposite conclusion.
 */
function BoardShell({ children, count, near = false }: {
  children: React.ReactNode; count?: number; near?: boolean;
}) {
  return (
    <section aria-live="polite" className="mt-4">
      {count !== undefined && (
        <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
          {count} open {count === 1 ? "need" : "needs"}{near ? " near you" : ""}
        </p>
      )}
      {children}
    </section>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-stone-200/80 bg-white/50 p-6 text-sm text-stone-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-stone-400">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

function Empty({ icon, title, body, action }: {
  icon: React.ReactNode; title: string; body: string; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/50 p-6 text-center dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-500 dark:bg-white/5 dark:text-stone-400">
        {icon}
      </div>
      <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

const CTA_CLS =
  "inline-flex items-center gap-1.5 rounded-full bg-[var(--ck-role-accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] focus-visible:ring-offset-2";

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className={CTA_CLS}>{children}</Link>;
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={CTA_CLS}>{children}</button>;
}
