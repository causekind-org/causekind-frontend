"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import {
  adminSearchUsers, adminGetUserJourney,
  type UserSearchHit, type UserJourney, type JourneyEvent,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown, Bot, ClipboardList, Coins, FileText, Flag, Gift, Handshake,
  Loader2, MessageSquare, Package, Search, ShieldCheck, UserRound,
} from "lucide-react";

// ── Category styling ─────────────────────────────────────────────────────────

const CAT: Record<string, { color: string; bg: string; icon: typeof UserRound; label: string }> = {
  ACCOUNT:  { color: "#78716c", bg: "bg-stone-100 dark:bg-stone-800/60",     icon: UserRound,     label: "Account" },
  REQUEST:  { color: "#d97706", bg: "bg-amber-100 dark:bg-amber-950/40",     icon: ClipboardList, label: "Requests" },
  LISTING:  { color: "#7c3aed", bg: "bg-violet-100 dark:bg-violet-950/40",   icon: Package,       label: "Listings" },
  OFFER:    { color: "#db2777", bg: "bg-pink-100 dark:bg-pink-950/40",       icon: Gift,          label: "Offers" },
  MATCH:    { color: "#0d9488", bg: "bg-teal-100 dark:bg-teal-950/40",       icon: Handshake,     label: "Matches" },
  DONATION: { color: "#059669", bg: "bg-emerald-100 dark:bg-emerald-950/40", icon: Coins,         label: "Donations" },
  AI:       { color: "#6d28d9", bg: "bg-violet-100 dark:bg-violet-950/40",   icon: Bot,           label: "AI" },
  FLAG:     { color: "#dc2626", bg: "bg-red-100 dark:bg-red-950/40",         icon: Flag,          label: "Flags" },
  DOCUMENT: { color: "#2563eb", bg: "bg-blue-100 dark:bg-blue-950/40",       icon: FileText,      label: "Documents" },
  CHAT:     { color: "#0284c7", bg: "bg-sky-100 dark:bg-sky-950/40",         icon: MessageSquare, label: "Chat" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

// ── Role styling — lets the admin tell donors and donees apart at a glance ───
const ROLE_STYLE: Record<string, { avatarBg: string; avatarText: string; badge: string }> = {
  DONOR: {
    avatarBg: "bg-[#b04a15]/10", avatarText: "text-[#b04a15]",
    badge: "border-transparent bg-[#b04a15]/10 text-[#b04a15] dark:bg-orange-950/30 dark:text-orange-400",
  },
  DONEE: {
    avatarBg: "bg-teal-100 dark:bg-teal-950/40", avatarText: "text-teal-700 dark:text-teal-400",
    badge: "border-transparent bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400",
  },
};
const DEFAULT_ROLE_STYLE = { avatarBg: "bg-stone-100 dark:bg-stone-800/60", avatarText: "text-stone-500 dark:text-stone-400", badge: "" };

function roleStyle(role: string | null) {
  return (role && ROLE_STYLE[role]) || DEFAULT_ROLE_STYLE;
}

const ROLE_FILTERS = ["ALL", "DONOR", "DONEE"] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number];

/**
 * Admin User Journey — search a user, render their complete lifecycle as an
 * animated timeline. Hosted as a tab inside the admin dashboard shell.
 */
export function UserJourneyPanel({ initialUserId }: { initialUserId?: number | null }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<UserSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [journey, setJourney] = useState<UserJourney | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [activeCats, setActiveCats] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedInitial = useRef(false);
  const [allUsers, setAllUsers] = useState<UserSearchHit[]>([]);
  const [allLoading, setAllLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const timelineEndRef = useRef<HTMLDivElement | null>(null);

  // Default view: the full user directory (backend excludes admin/superadmin).
  useEffect(() => {
    adminSearchUsers("")
      .then(setAllUsers)
      .catch(() => setAllUsers([]))
      .finally(() => setAllLoading(false));
  }, []);

  const loadJourney = useCallback((id: number) => {
    setJourneyLoading(true);
    setHits([]);
    setActiveCats(new Set());
    adminGetUserJourney(id)
      .then(setJourney)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load journey"))
      .finally(() => setJourneyLoading(false));
  }, []);

  useEffect(() => {
    if (initialUserId && !loadedInitial.current) {
      loadedInitial.current = true;
      loadJourney(initialUserId);
    }
  }, [initialUserId, loadJourney]);

  function onQueryChange(v: string) {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 2) { setHits([]); return; }
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      adminSearchUsers(v.trim())
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 300);
  }

  function toggleCat(cat: string) {
    setActiveCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  // Backend returns events oldest-first; reverse so the newest update is always
  // on top — with a long-lived journey, scrolling to the bottom to see today's
  // activity is hectic for an admin.
  const visibleEvents = journey
    ? journey.events
        .filter((e) => activeCats.size === 0 || activeCats.has(e.category))
        .slice()
        .reverse()
    : [];

  function scrollToOldest() {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  // Alphabetical by name so a long directory stays scannable, with an
  // optional donor/donee filter for when the admin only wants one side.
  const visibleUsers = allUsers
    .filter((u) => roleFilter === "ALL" || u.role === roleFilter)
    .slice()
    .sort((a, b) => (a.fullName ?? "").localeCompare(b.fullName ?? ""));
  const donorCount = allUsers.filter((u) => u.role === "DONOR").length;
  const doneeCount = allUsers.filter((u) => u.role === "DONEE").length;

  return (
    <div className="max-w-3xl">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search a user by name or email…"
          className="pl-9 h-11 bg-white/90 dark:bg-zinc-900/80"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-400" />}
        {hits.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            {hits.map((h) => {
              const rs = roleStyle(h.role);
              return (
                <button
                  key={h.id}
                  onClick={() => { setQuery(""); setJourney(null); loadJourney(h.id); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#b04a15]/5 transition border-b border-stone-100 dark:border-zinc-800 last:border-0"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${rs.avatarBg} ${rs.avatarText}`}>
                    {h.fullName?.charAt(0)?.toUpperCase() ?? "?"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{h.fullName}</span>
                    <span className="block truncate text-xs text-stone-500">{h.email} · {h.role ?? "—"}{h.city ? ` · ${h.city}` : ""}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {journeyLoading && (
        <div className="flex flex-col items-center gap-3 py-20 text-stone-400">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-sm">Assembling the full journey…</p>
        </div>
      )}

      {!journeyLoading && !journey && (
        allLoading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-stone-400">
            <Loader2 className="size-8 animate-spin" />
            <p className="text-sm">Loading users…</p>
          </div>
        ) : allUsers.length === 0 ? (
          <div className="py-16 text-center text-stone-400">
            <UserRound className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">No users registered yet. New sign-ups will appear here.</p>
          </div>
        ) : (
          <>
            {/* Role filter — lets the admin isolate donors or donees instead of scanning a mixed list */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {ROLE_FILTERS.map((rf) => {
                const label = rf === "ALL" ? `All · ${allUsers.length}` : rf === "DONOR" ? `Donors · ${donorCount}` : `Donees · ${doneeCount}`;
                const active = roleFilter === rf;
                const activeBg = rf === "DONOR" ? "#b04a15" : rf === "DONEE" ? "#0d9488" : "#57534e";
                return (
                  <button
                    key={rf}
                    onClick={() => setRoleFilter(rf)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                      active ? "border-transparent text-white shadow-sm" : "border-stone-300 text-stone-400 dark:border-zinc-700"
                    }`}
                    style={{ background: active ? activeBg : undefined }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <Card className="overflow-hidden border-stone-200/70 bg-white/90 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-900/80">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5 dark:border-zinc-800">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                    {roleFilter === "ALL" ? "All users" : roleFilter === "DONOR" ? "Donors" : "Donees"} · A–Z
                  </p>
                  <p className="text-xs text-stone-400">{visibleUsers.length}</p>
                </div>
                {visibleUsers.length === 0 ? (
                  <p className="py-10 text-center text-sm text-stone-400">No users match this filter.</p>
                ) : (
                  visibleUsers.map((u) => {
                    const rs = roleStyle(u.role);
                    return (
                      <button
                        key={u.id}
                        onClick={() => loadJourney(u.id)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#b04a15]/5 transition border-b border-stone-100 dark:border-zinc-800 last:border-0"
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${rs.avatarBg} ${rs.avatarText}`}>
                          {u.fullName?.charAt(0)?.toUpperCase() ?? "?"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{u.fullName}</span>
                          <span className="block truncate text-xs text-stone-500">{u.email}{u.city ? ` · ${u.city}` : ""}</span>
                        </span>
                        <Badge variant="secondary" className={`shrink-0 ${rs.badge}`}>{u.role ?? "—"}</Badge>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </>
        )
      )}

      {journey && !journeyLoading && (
        <>
          <button
            onClick={() => setJourney(null)}
            className="mb-4 text-xs font-semibold text-[#b04a15] hover:underline"
          >
            ← All users
          </button>
          {/* User summary card */}
          <Card className="journey-event mb-6 overflow-hidden border-stone-200/70 bg-white/90 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-900/80" style={{ animationDelay: "0ms" }}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#b04a15] to-[#d97a3d] text-xl font-black text-white shadow">
                    {journey.user.fullName?.charAt(0)?.toUpperCase() ?? "?"}
                  </span>
                  <div>
                    <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">{journey.user.fullName}</h2>
                    <p className="text-sm text-stone-500">{journey.user.email}{journey.user.phone ? ` · ${journey.user.phone}` : ""}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{journey.user.role ?? "USER"}</Badge>
                      {journey.user.city && <Badge variant="outline">{journey.user.city}</Badge>}
                      {journey.user.aadhaarVerified && (
                        <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <ShieldCheck className="h-3 w-3" /> Aadhaar ····{journey.user.aadhaarLast4}
                        </Badge>
                      )}
                      <span className="text-xs text-stone-400">member since {fmtDate(journey.user.registeredAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(journey.stats).filter(([k]) => k !== "totalEvents").map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-stone-200/70 bg-stone-50 px-3 py-1.5 text-center dark:border-zinc-700/60 dark:bg-zinc-800/60">
                      <p className="text-base font-black leading-none tabular-nums" style={{ color: k === "fraudFlags" && v > 0 ? "#dc2626" : "#b04a15" }}>{v}</p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-400">{k.replace(/([A-Z])/g, " $1")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category filter chips */}
          <div className="journey-event mb-5 flex flex-wrap gap-1.5" style={{ animationDelay: "80ms" }}>
            {Object.entries(CAT).map(([key, c]) => {
              const count = journey.events.filter((e) => e.category === key).length;
              if (count === 0) return null;
              const active = activeCats.size === 0 || activeCats.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleCat(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                    active ? "border-transparent text-white shadow-sm" : "border-stone-300 text-stone-400 dark:border-zinc-700"
                  }`}
                  style={{ background: active ? c.color : undefined }}
                >
                  <c.icon className="h-3 w-3" /> {c.label} · {count}
                </button>
              );
            })}
          </div>

          {/* Timeline */}
          <div className="relative pl-6">
            <div className="journey-rail absolute left-[9px] top-1 bottom-1 w-[2px] rounded bg-gradient-to-b from-[#b04a15]/60 via-stone-300 to-stone-200 dark:via-zinc-700 dark:to-zinc-800" />
            {visibleEvents.map((e, i) => (
              <TimelineEvent
                key={`${e.type}-${e.entityType}-${e.entityId}-${e.at}-${i}`}
                event={e}
                index={i}
                showDay={i === 0 || fmtDay(e.at) !== fmtDay(visibleEvents[i - 1].at)}
              />
            ))}
            {visibleEvents.length === 0 && (
              <p className="py-10 text-sm text-stone-400">No events in the selected categories.</p>
            )}
            <div ref={timelineEndRef} />
          </div>

          {/* Jump to the oldest event — timeline is newest-first, so "bottom" is the start of the journey */}
          {visibleEvents.length > 4 && (
            <button
              onClick={scrollToOldest}
              aria-label="Jump to the start of the journey"
              title="Jump to the start of the journey"
              className="fixed bottom-6 right-6 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-[#b04a15] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#963c0d]"
            >
              <ArrowDown className="h-5 w-5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

function TimelineEvent({ event, index, showDay }: { event: JourneyEvent; index: number; showDay: boolean }) {
  const cat = CAT[event.category] ?? CAT.ACCOUNT;
  const delay = Math.min(120 + index * 55, 1400);
  return (
    <div className="journey-event relative pb-5" style={{ animationDelay: `${delay}ms` }}>
      {showDay && (
        <p className="mb-2 -ml-6 text-[11px] font-black uppercase tracking-widest text-stone-400">{fmtDay(event.at)}</p>
      )}
      <span
        className="journey-dot absolute -left-6 top-[3px] flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-[#faf6f0] dark:ring-zinc-950"
        style={{ background: cat.color, animationDelay: `${delay + 100}ms` }}
      >
        <cat.icon className="h-3 w-3 text-white" />
      </span>
      <div className={`rounded-xl border border-stone-200/70 p-3.5 shadow-sm dark:border-zinc-700/50 ${cat.bg}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{event.title}</p>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-stone-400">{fmtDate(event.at)}</span>
        </div>
        {event.detail && <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">{event.detail}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
          {event.actor && <span className="rounded bg-white/70 px-1.5 py-0.5 dark:bg-zinc-800/70">by {event.actor}</span>}
          {event.entityType && event.entityId && (
            <span className="rounded bg-white/70 px-1.5 py-0.5 dark:bg-zinc-800/70">{event.entityType} #{event.entityId}</span>
          )}
        </div>
      </div>
    </div>
  );
}
