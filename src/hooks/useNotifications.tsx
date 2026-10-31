"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getMyNotifications, markAllNotificationsRead, type SavedNotification, getMyMatches, getMyItemRequests, getMyItemListings, getOffersForMyRequests, getMyDonationOffers, markNotificationRead } from "@/lib/api";
import { useTranslations } from "next-intl";
import { useAuth } from "./useAuth";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: "match" | "approved" | "rejected" | "fulfilled" | "info";
  link: string;
  /** When the underlying event happened (entity createdAt) */
  timestamp: number;
  /** When this client first saw it — drives ordering and the 10-item cap */
  receivedAt: number;
};

/** What deriveNotifications/SSE produce — receivedAt is stamped at merge time */
type IncomingNotification = Omit<AppNotification, "receivedAt"> & { receivedAt?: number };

// Read state for DERIVED notices only (worked out from the user's current data on
// each load). Saved notices keep their read state on the server.
const SEEN_KEY  = "ck_notif_seen_v3";
// The old per-email browser copy of the whole tray. No longer written: it outlived
// deleted accounts (a re-created account with the same email inherited it). Purged
// once on load. The bell's saved list now comes from GET /api/v1/notifications.
const STORE_PREFIX = "ck_notif_store_v1_";
const POLL_MS   = 90_000;
// A hidden tab drops its SSE stream after this long. An open stream is an
// in-flight request, so the backend instance is billed and never scales to
// zero; a forgotten background tab used to hold one up all day. The grace
// period keeps quick tab switches from reconnecting.
const SSE_HIDDEN_CLOSE_MS = 5 * 60_000;
const MAX_NOTIFICATIONS = 10;
const SSE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1/notifications/stream`;

type NotificationsContextValue = {
  notifications: AppNotification[];
  unread: number;
  markAllRead: () => void;
  refresh: () => Promise<void>;
  isUnread: (n: AppNotification) => boolean;
  markRead: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function normalizeRole(role: string | null | undefined) {
  return (role ?? "").toUpperCase().replace(/^ROLE_/, "");
}

/** The match's request or listing title, or null (a translated fallback is used then). */
function matchItemTitle(m: { requestTitle?: string | null; listingTitle?: string | null }) {
  return m.requestTitle ?? m.listingTitle ?? null;
}

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function saveSeen(s: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...s])); } catch {}
}

// Newest first (by when the client received it), capped to MAX_NOTIFICATIONS —
// the oldest fall off the bottom as new ones arrive on top.
function sortAndCap(list: AppNotification[]): AppNotification[] {
  return [...list].sort((a, b) => b.receivedAt - a.receivedAt).slice(0, MAX_NOTIFICATIONS);
}

function purgeLegacyStores() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORE_PREFIX)) localStorage.removeItem(key);
    }
  } catch {}
}

const KNOWN_TYPES: AppNotification["type"][] = ["match", "approved", "rejected", "fulfilled", "info"];

function fromSaved(n: SavedNotification): AppNotification {
  const ts = toTimestamp(n.createdAt) || Date.now();
  return {
    id: n.id,
    title: n.title,
    body: n.body ?? "",
    type: KNOWN_TYPES.includes(n.type as AppNotification["type"]) ? (n.type as AppNotification["type"]) : "info",
    link: n.link ?? "/dashboard",
    timestamp: ts,
    receivedAt: ts,
  };
}

function toTimestamp(iso: string | null | undefined): number {
  if (!iso) return 0;
  // The backend sends LocalDateTime with no zone, and the server clock is UTC
  // (Cloud Run). Read zone-less stamps as UTC; parsed as local time they came out
  // 5.5 hours old in India.
  const zoned = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso) || !iso.includes("T");
  const t = new Date(zoned ? iso : iso + "Z").getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * A notice worked out from the user's data, as a catalogue key + values rather than
 * English text (messages/en.json → notif.<key>.title / .body). Translated when the
 * list is built for display (useNotificationState's memo), so polling, SSE and
 * refresh never depend on the language and a language change never refetches.
 * Values are user content or server text (titles, admin/AI reasons) and are
 * inserted as written. A missing title uses a translated fallback (notif.fallback.*).
 */
type DerivedNotification = Omit<IncomingNotification, "title" | "body"> & {
  key: string;
  params?: Record<string, string | number>;
  /** Fallback for a missing {subject}: a notif.fallback.* key. */
  subjectFallback?: "aRequest" | "anItem" | "yourRequest" | "yourRequestCap";
};

function notice(
  id: string, key: string, type: AppNotification["type"], link: string, timestamp: number,
  params?: Record<string, string | number>, subjectFallback?: DerivedNotification["subjectFallback"],
): DerivedNotification {
  return { id, key, type, link, timestamp, params, subjectFallback };
}

/** Same notice with or without an admin/AI reason: picks `<key>` or `<key>Reason`. */
function withReason(
  id: string, key: string, type: AppNotification["type"], link: string, timestamp: number,
  params: Record<string, string | number>, reason: string | null | undefined,
  subjectFallback?: DerivedNotification["subjectFallback"],
): DerivedNotification {
  return reason
    ? notice(id, `${key}Reason`, type, link, timestamp, { ...params, reason }, subjectFallback)
    : notice(id, key, type, link, timestamp, params, subjectFallback);
}

async function deriveNotifications(rawRole: string): Promise<DerivedNotification[]> {
  const role = normalizeRole(rawRole);
  const notifs: DerivedNotification[] = [];

  // ── DONEE notifications ────────────────────────────────────────────────────
  if (role === "DONEE") {
    const [requests, matches, incomingOffers] = await Promise.all([
      getMyItemRequests().catch(() => []),
      getMyMatches().catch(() => []),
      getOffersForMyRequests().catch(() => []),
    ]);

    requests.forEach(r => {
      const ts = toTimestamp(r.createdAt);
      const p = { subject: r.title };
      if (r.status === "PENDING_VERIFICATION") {
        notifs.push(notice(`req-submitted-${r.id}`, "reqSubmitted", "info", "/dashboard#my-requests", ts, p));
      }
      if (r.status === "PUBLIC_REQUEST" || r.status === "VERIFIED_PRIVATE_MATCHING" || r.status === "POTENTIAL_MATCH_FOUND") {
        notifs.push(notice(`req-approved-${r.id}`, "reqApproved", "approved", "/dashboard#my-requests", ts, p));
      }
      // POTENTIAL_MATCH_FOUND must look identical to VERIFIED_PRIVATE_MATCHING
      // for the donee — a separate notification here would reveal that a
      // specific donor has been identified, leaking need-first state.
      if (r.status === "PUBLIC_REQUEST") {
        notifs.push(notice(`req-published-${r.id}`, "reqPublished", "info", "/dashboard#my-requests", ts, p));
      }
      if (r.status === "REJECTED") {
        notifs.push(withReason(`req-rejected-${r.id}`, "reqRejected", "rejected", "/dashboard#my-requests", ts, p, r.rejectionReason));
      }
    });

    // Donor Flow 2 incoming offers
    incomingOffers.forEach(o => {
      const ts = toTimestamp(o.createdAt);
      const p = { subject: o.requestTitle };
      if (o.status === "PENDING_DONEE_REVIEW") {
        notifs.push(notice(`offer-review-${o.id}`, "offerReview", "match", `/donee/offers?offerId=${o.id}`, ts, p));
      }
      if (o.status === "DONOR_RECONFIRMED") {
        notifs.push(notice(`offer-reconfirmed-${o.id}`, "offerReconfirmed", "info", "/donee/offers", ts, p));
      }
      if (o.status === "ADMIN_APPROVED" && o.flowType === "WILL_PURCHASE") {
        notifs.push(notice(`offer-admin-approved-${o.id}`, "offerPurchaseApproved", "approved", `/offers/${o.id}/purchase`, ts, p));
      } else if (o.status === "ADMIN_APPROVED") {
        notifs.push(notice(`offer-admin-approved-${o.id}`, "offerDonationApproved", "approved", `/offers/${o.id}/handover`, ts, p));
      }
      if (o.status === "HANDOVER_IN_PROGRESS") {
        notifs.push(notice(`offer-handover-${o.id}`, "offerHandover", "match", `/offers/${o.id}/handover`, ts, p));
      }
      if (o.status === "COMPLETED") {
        notifs.push(notice(`offer-complete-${o.id}`, "offerReceived", "fulfilled", "/donee/offers", ts, p));
      }
    });

    matches.forEach(m => {
      const ts = toTimestamp(m.createdAt);
      const subject = m.requestTitle ?? null;
      const p: Record<string, string> = subject ? { subject } : {};
      // Need-first privacy: matches in DONOR_REVIEW / PENDING_APPROVAL no longer reach
      // the donee at all (the backend filters them out of /matches/mine until the donor
      // reconfirms and admin approves) — the donee's journey starts at
      // AWAITING_DONEE_CONFIRMATION. PENDING_APPROVAL below only fires for
      // donee-initiated REQUEST_LISTING matches, which they can always see.
      if (m.status === "PENDING_APPROVAL") {
        notifs.push(notice(`donee-match-pending-${m.id}`, "doneeMatchPending", "info", "/dashboard", ts, p, "anItem"));
      }
      if (m.status === "TRANSPORT_DISCUSSION") {
        notifs.push(notice(`contact-shared-${m.id}`, "contactShared", "match", "/dashboard", ts, p, "yourRequest"));
      }
      if (m.status === "AWAITING_DONEE_CONFIRMATION") {
        notifs.push(notice(`donee-action-${m.id}`, "doneeConfirm", "match", "/dashboard", ts, p, "yourRequest"));
      }
      if (m.status === "FULFILLED") {
        notifs.push(notice(`donee-fulfilled-${m.id}`, "doneeFulfilled", "fulfilled", "/dashboard", ts, p, "yourRequestCap"));
      }
      if (m.status === "REJECTED") {
        notifs.push(withReason(`match-rejected-donee-${m.id}`, "matchRejected", "rejected", "/dashboard", ts, p, m.rejectionReason, "yourRequest"));
      }
    });
  }

  // NGO drive notices come from the server only (NgoDriveNotifier stores each event,
  // deduped and grouped); deriving them here as well showed every event twice.

  // ── DONOR notifications ────────────────────────────────────────────────────
  if (role === "DONOR") {
    const [listings, matches, myOffers] = await Promise.all([
      getMyItemListings({ silent401: true }).catch(() => []),
      getMyMatches().catch(() => []),
      getMyDonationOffers().catch(() => []),
    ]);

    // Offers to NGO drives: their notices come from the server only (see the NGO note above).

    // Donor Flow 2 offer status notifications
    myOffers.forEach(o => {
      const ts = toTimestamp(o.createdAt);
      const p = { subject: o.requestTitle };
      if (o.status === "NEEDS_INFORMATION") {
        notifs.push(notice(`offer-needs-info-${o.id}`, "offerNeedsInfo", "info", `/requests/${o.requestId}/offer`, ts, p));
      }
      if (o.status === "DONEE_ACCEPTED" || o.status === "DONOR_RECONFIRMATION_REQUIRED") {
        notifs.push(notice(`offer-reconfirm-${o.id}`, "offerReconfirm", "match", "/offers", ts, p));
      }
      if (o.status === "ADMIN_APPROVED" && o.flowType === "WILL_PURCHASE") {
        // A purchase offer is bought before any handover, so it lands on the purchase hub.
        notifs.push(notice(`offer-approved-${o.id}`, "offerApprovedPurchase", "approved", `/offers/${o.id}/purchase`, ts, p));
      } else if (o.status === "ADMIN_APPROVED") {
        notifs.push(notice(`offer-approved-${o.id}`, "offerApprovedHandover", "approved", `/offers/${o.id}/handover`, ts, p));
      }
      if (o.status === "DONEE_DECLINED") {
        notifs.push(notice(`offer-declined-${o.id}`, "offerDeclined", "info", "/offers", ts, p));
      }
      if (o.status === "COMPLETED") {
        notifs.push(notice(`offer-cert-${o.id}`, "offerComplete", "fulfilled", `/certificate?offerId=${o.id}`, ts, p));
      }
    });

    listings.forEach(l => {
      const ts = toTimestamp(l.submittedAt ?? l.createdAt);
      const p = { subject: l.title };
      if (l.status === "SUBMITTED" || l.status === "AI_SCREENING") {
        notifs.push(notice(`listing-screening-${l.id}`, "listingScreening", "info", "/dashboard", ts, p));
      }
      if (l.status === "ELIGIBLE_FOR_MATCHING" || l.status === "AVAILABLE" || l.status === "PENDING_REVIEW") {
        notifs.push(notice(`listing-approved-${l.id}`, "listingApproved", "approved", "/dashboard", ts, p));
      }
      if (l.status === "REJECTED" && l.rejectedByAi) {
        notifs.push(withReason(`listing-ai-rejected-${l.id}`, "listingAiRejected", "rejected", "/dashboard", ts, p, l.rejectionReason));
      }
      if (l.status === "REJECTED" && !l.rejectedByAi) {
        notifs.push(withReason(`listing-admin-rejected-${l.id}`, "listingRejected", "rejected", "/dashboard", ts, p, l.rejectionReason));
      }
      if (l.status === "NEEDS_INFORMATION") {
        notifs.push(withReason(`listing-needs-info-${l.id}`, "listingNeedsInfo", "info", "/dashboard", ts, p, l.rejectionReason));
      }
      if (l.status === "MANUAL_REVIEW") {
        notifs.push(notice(`listing-manual-review-${l.id}`, "listingManualReview", "info", "/dashboard", ts, p));
      }
      if (l.status === "SOFT_RESERVED" || l.status === "MATCHED" || l.status === "RESERVED") {
        notifs.push(notice(`listing-matched-${l.id}`, "listingMatched", "match", "/dashboard", ts, p));
      }
      if (l.status === "PARTIALLY_DONATED" || l.status === "DONATED" || l.status === "FULFILLED") {
        notifs.push(notice(`listing-fulfilled-${l.id}`, "listingFulfilled", "fulfilled", "/dashboard", ts, p));
      }
    });

    matches.forEach(m => {
      const itemTitle = matchItemTitle(m);
      const ts = toTimestamp(m.createdAt);
      const p: Record<string, string> = itemTitle ? { subject: itemTitle } : {};
      if (m.status === "DONOR_REVIEW") {
        notifs.push(notice(`donor-action-${m.id}`, "donorConfirm", "match", "/dashboard", ts, p, "aRequest"));
      }
      if (m.status === "TRANSPORT_DISCUSSION") {
        notifs.push(notice(`donor-match-${m.id}`, "donorMatch", "match", "/dashboard", ts, p, "aRequest"));
      }
      if (m.status === "PENDING_APPROVAL") {
        notifs.push(notice(`donor-pending-${m.id}`, "donorPending", "info", "/dashboard", ts, p, "aRequest"));
      }
      if (m.status === "AWAITING_DONEE_CONFIRMATION") {
        notifs.push(notice(`donor-awaiting-donee-${m.id}`, "donorAwaitingDonee", "info", "/dashboard", ts, p, "aRequest"));
      }
      if (m.status === "DONEE_ACCEPTED") {
        notifs.push(notice(`donor-final-confirm-${m.id}`, "donorFinalConfirm", "match", "/dashboard", ts, p, "aRequest"));
      }
      if (m.status === "BOTH_PARTIES_ACCEPTED" || m.status === "LOGISTICS_CONFIRMED" || m.status === "ARRANGEMENT_AGREED" || m.status === "PICKUP_SCHEDULED") {
        notifs.push(notice(`donor-logistics-${m.id}`, "donorLogistics", "match", "/dashboard", ts, p, "aRequest"));
      }
      if (m.status === "PICKED_UP" || m.status === "IN_TRANSIT" || m.status === "DELIVERED_PENDING_CONFIRMATION") {
        notifs.push(notice(`donor-in-transit-${m.id}`, "donorInTransit", "info", "/dashboard", ts, p, "aRequest"));
      }
      if (m.status === "FULFILLED" || m.status === "COMPLETED") {
        notifs.push(notice(`donor-fulfilled-${m.id}`, "donorFulfilled", "fulfilled", "/dashboard", ts, p, "aRequest"));
      }
      if (m.status === "REJECTED") {
        const rp: Record<string, string> = m.requestTitle ? { subject: m.requestTitle } : {};
        notifs.push(withReason(`match-rejected-donor-${m.id}`, "matchRejected", "rejected", "/dashboard", ts, rp, m.rejectionReason, "aRequest"));
      }
      if (m.status === "CANCELLED" || m.status === "FAILED") {
        notifs.push(withReason(`match-cancelled-donor-${m.id}`, "matchCancelled", "rejected", "/dashboard", ts, p, m.rejectionReason, "aRequest"));
      }
    });
  }

  return notifs;
}

function useNotificationState(): NotificationsContextValue {
  const { user, isLoading } = useAuth();
  // Two sources, nothing cached in the browser:
  //  - saved: the user's notices from the server (V36), plus live pushes on top.
  //    Deleting a user deletes these, so a re-created account starts empty.
  //  - derived: "action required"-style notices worked out from the user's current
  //    requests/matches/offers on each refresh, replaced wholesale every time.
  const [saved, setSaved] = useState<AppNotification[]>([]);
  const [savedRead, setSavedRead] = useState<Set<string>>(new Set());
  const [derived, setDerived] = useState<(DerivedNotification & { receivedAt: number })[]>([]);
  // Translation happens only here, at display time: a language change re-renders
  // the list, and never touches polling, SSE or refresh (none of them use it).
  // No provider (tests): show the key rather than throw.
  let t: ReturnType<typeof useTranslations> | null;
  try {
    t = useTranslations("notif");
  } catch {
    t = null;
  }
  const [seenVersion, setSeenVersion] = useState(0);

  useEffect(() => { purgeLegacyStores(); }, []);

  // Signed out or switched account: drop everything from the previous user.
  const userKey = user?.email ?? null;
  useEffect(() => {
    setSaved([]);
    setSavedRead(new Set());
    setDerived([]);
  }, [userKey]);

  const notifications = useMemo(() => {
    const shown: AppNotification[] = derived.map(({ key, params, subjectFallback, ...rest }) => {
      if (!t) return { ...rest, title: key, body: "" };
      const values = { ...params };
      if (values.subject == null && subjectFallback) values.subject = t(`fallback.${subjectFallback}`);
      return { ...rest, title: t(`${key}.title`, values), body: t(`${key}.body`, values) };
    });
    const ids = new Set<string>();
    const all = [...saved, ...shown].filter(n => (ids.has(n.id) ? false : (ids.add(n.id), true)));
    return sortAndCap(all);
  }, [saved, derived, t]);

  const unread = useMemo(() => {
    const seen = loadSeen();
    return notifications.filter(n => (n.id.startsWith("n-") ? !savedRead.has(n.id) : !seen.has(n.id))).length;
    // seenVersion: re-read the derived seen set after markAllRead writes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, savedRead, seenVersion]);

  const addNotification = useCallback((n: IncomingNotification) => {
    const now = Date.now();
    // The same id again is a grouped drive notice ("3 new offers") updated on the server:
    // replace it, move it to the top and show it as unread again.
    setSaved(prev => [{ ...n, receivedAt: now }, ...prev.filter(p => p.id !== n.id)]);
    setSavedRead(prev => { if (!prev.has(n.id)) return prev; const next = new Set(prev); next.delete(n.id); return next; });
  }, []);

  const isUnread = useCallback((n: AppNotification) => (n.id.startsWith("n-") ? !savedRead.has(n.id) : !loadSeen().has(n.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedRead, seenVersion]);

  /** One saved notice read (the bottom dock's primary action). */
  const markRead = useCallback((id: string) => {
    if (!id.startsWith("n-")) return;
    setSavedRead(prev => new Set(prev).add(id));
    markNotificationRead(id).catch(() => { /* the bell still shows it; a later refresh corrects it */ });
  }, []);

  const refresh = useCallback(async () => {
    if (!user?.role) return;
    const [server, live] = await Promise.all([
      getMyNotifications().catch(() => null),
      deriveNotifications(user.role).catch(() => null),
    ]);
    if (server) {
      setSaved(server.map(fromSaved));
      setSavedRead(new Set(server.filter(n => n.read).map(n => n.id)));
    }
    if (live) {
      setDerived(live.map(n => ({ ...n, receivedAt: n.receivedAt ?? (n.timestamp || Date.now()) })));
    }
  }, [user?.role]);

  useEffect(() => {
    if (isLoading || !user) return;
    refresh().catch(() => {});
    const interval = setInterval(() => {
      if (!document.hidden) refresh().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [isLoading, user, refresh]);

  // SSE: real-time push notifications
  useEffect(() => {
    if (isLoading || !user) return;

    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    function connect() {
      if (closed || es) return;
      es = new EventSource(SSE_URL, { withCredentials: true });

      es.addEventListener("notification", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as {
            id: string;
            type: AppNotification["type"];
            title: string;
            body: string;
            link: string;
          };
          addNotification({ ...data, timestamp: Date.now() });
        } catch {
          // ignore malformed events
        }
      });

      // Chat messages ride the same single SSE connection — rebroadcast as a window
      // event so any open ChatWindow (for the matching offerId) can append it instantly,
      // without ChatWindow needing to manage its own EventSource.
      es.addEventListener("chat-message", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          window.dispatchEvent(new CustomEvent("ck-chat-message", { detail: data }));
        } catch {
          // ignore malformed events
        }
      });

      // Site-wide real-time data push: any offer/request/listing/match/handover/
      // campaign/donation change rebroadcasts here as a window event carrying just
      // {entityType, entityId, action, timestamp} — pages listen for the entityType(s)
      // they care about and re-run their existing fetch, so every screen reflects
      // changes within a second without a manual refresh.
      es.addEventListener("entity-update", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          window.dispatchEvent(new CustomEvent("ck-entity-update", { detail: data }));
        } catch {
          // ignore malformed events
        }
      });

      es.onerror = () => {
        if (closed) return;
        disconnect();
        if (!retryTimer && !document.hidden) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            connect();
          }, 5_000);
        }
      };
    }

    function disconnect() {
      es?.close();
      es = null;
    }

    function onVisibilityChange() {
      if (document.hidden) {
        if (!hiddenTimer) {
          hiddenTimer = setTimeout(() => {
            hiddenTimer = null;
            if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
            disconnect();
          }, SSE_HIDDEN_CLOSE_MS);
        }
        return;
      }
      if (hiddenTimer) { clearTimeout(hiddenTimer); hiddenTimer = null; }
      if (!es) {
        connect();
        // Pushes sent while the stream was down are gone; catch the bell up.
        refresh().catch(() => {});
      }
    }

    if (!document.hidden) connect();
    else onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      closed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      disconnect();
      if (retryTimer) clearTimeout(retryTimer);
      if (hiddenTimer) clearTimeout(hiddenTimer);
    };
  }, [isLoading, user, addNotification, refresh]);

  useEffect(() => {
    function onListingSubmit() { refresh().catch(() => {}); }
    window.addEventListener("ck-listing-submitted", onListingSubmit);
    return () => window.removeEventListener("ck-listing-submitted", onListingSubmit);
  }, [refresh]);

  const markAllRead = useCallback(() => {
    const seen = loadSeen();
    derived.forEach(n => seen.add(n.id));
    saveSeen(seen);
    setSeenVersion(v => v + 1);
    if (saved.some(n => !savedRead.has(n.id))) {
      setSavedRead(new Set(saved.map(n => n.id)));
      markAllNotificationsRead().catch(() => {});
    }
  }, [derived, saved, savedRead]);

  return useMemo(
    () => ({ notifications, unread, markAllRead, refresh, isUnread, markRead }),
    [notifications, unread, markAllRead, refresh, isUnread, markRead],
  );
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const value = useNotificationState();
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used inside NotificationsProvider");
  }
  return ctx;
}
