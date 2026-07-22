"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getMyMatches, getMyItemRequests, getMyItemListings, getOffersForMyRequests, getMyDonationOffers } from "@/lib/api";
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

const SEEN_KEY  = "ck_notif_seen_v3";
// Per-user persistent tray. Notifications only ever *accumulate* here — a status
// moving on (or an entity disappearing) never removes its notification; the only
// way one leaves the tray is being pushed off the bottom by the 10-item cap.
const STORE_PREFIX = "ck_notif_store_v1_";
const POLL_MS   = 90_000;
const MAX_NOTIFICATIONS = 10;
const SSE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1/notifications/stream`;

type NotificationsContextValue = {
  notifications: AppNotification[];
  unread: number;
  markAllRead: () => void;
  refresh: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function normalizeRole(role: string | null | undefined) {
  return (role ?? "").toUpperCase().replace(/^ROLE_/, "");
}

function matchItemTitle(m: { requestTitle?: string | null; listingTitle?: string | null }) {
  return m.requestTitle ?? m.listingTitle ?? "a request";
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

function loadStore(key: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((n) => n && typeof n.id === "string" && typeof n.receivedAt === "number")
      : [];
  } catch { return []; }
}
function saveStore(key: string, list: AppNotification[]) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
}

function toTimestamp(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

async function deriveNotifications(rawRole: string): Promise<IncomingNotification[]> {
  const role = normalizeRole(rawRole);
  const notifs: IncomingNotification[] = [];

  // ── DONEE notifications ────────────────────────────────────────────────────
  if (role === "DONEE") {
    const [requests, matches, incomingOffers] = await Promise.all([
      getMyItemRequests().catch(() => []),
      getMyMatches().catch(() => []),
      getOffersForMyRequests().catch(() => []),
    ]);

    requests.forEach(r => {
      const ts = toTimestamp(r.createdAt);
      if (r.status === "PENDING_VERIFICATION") {
        notifs.push({ id: `req-submitted-${r.id}`, title: "Request submitted", body: `"${r.title}" has been received and is awaiting review`, type: "info", link: "/dashboard#my-requests", timestamp: ts });
      }
      if (r.status === "PUBLIC_REQUEST" || r.status === "VERIFIED_PRIVATE_MATCHING" || r.status === "POTENTIAL_MATCH_FOUND") {
        notifs.push({ id: `req-approved-${r.id}`, title: "Request approved ✓", body: `"${r.title}" has been verified and is being matched`, type: "approved", link: "/dashboard#my-requests", timestamp: ts });
      }
      if (r.status === "POTENTIAL_MATCH_FOUND") {
        notifs.push({ id: `req-match-${r.id}`, title: "We may have found a donor", body: `We're confirming availability for "${r.title}" — we'll let you know as soon as it's confirmed.`, type: "info", link: "/dashboard#my-requests", timestamp: ts });
      }
      if (r.status === "PUBLIC_REQUEST") {
        notifs.push({ id: `req-published-${r.id}`, title: "Your request is visible to donors", body: `"${r.title}" is now published on the need board so donors can offer to help.`, type: "info", link: "/dashboard#my-requests", timestamp: ts });
      }
      if (r.status === "REJECTED") {
        notifs.push({ id: `req-rejected-${r.id}`, title: "Request not approved", body: `"${r.title}" was not approved${r.rejectionReason ? ": " + r.rejectionReason : ". Contact support if you believe this is an error."}`, type: "rejected", link: "/dashboard#my-requests", timestamp: ts });
      }
    });

    // Donor Flow 2 incoming offers
    incomingOffers.forEach(o => {
      const ts = toTimestamp(o.createdAt);
      if (o.status === "PENDING_DONEE_REVIEW") {
        notifs.push({ id: `offer-review-${o.id}`, title: "Someone wants to donate!", body: `A donor offered to fulfil "${o.requestTitle}" — review their offer now`, type: "match", link: `/donee/offers?offerId=${o.id}`, timestamp: ts });
      }
      if (o.status === "DONOR_RECONFIRMED") {
        notifs.push({ id: `offer-reconfirmed-${o.id}`, title: "Donor confirmed availability", body: `The donor reconfirmed their item for "${o.requestTitle}" — pending admin approval`, type: "info", link: "/donee/offers", timestamp: ts });
      }
      if (o.status === "ADMIN_APPROVED") {
        notifs.push({ id: `offer-admin-approved-${o.id}`, title: "Donation approved!", body: `The donation for "${o.requestTitle}" has been approved. Handover will be scheduled.`, type: "approved", link: `/offers/${o.id}/handover`, timestamp: ts });
      }
      if (o.status === "HANDOVER_IN_PROGRESS") {
        notifs.push({ id: `offer-handover-${o.id}`, title: "Handover scheduled", body: `Your donation for "${o.requestTitle}" has a handover scheduled.`, type: "match", link: `/offers/${o.id}/handover`, timestamp: ts });
      }
      if (o.status === "COMPLETED") {
        notifs.push({ id: `offer-complete-${o.id}`, title: "Item received! 🎉", body: `"${o.requestTitle}" has been successfully donated and delivered.`, type: "fulfilled", link: "/donee/offers", timestamp: ts });
      }
    });

    matches.forEach(m => {
      const ts = toTimestamp(m.createdAt);
      // Need-first privacy: matches in DONOR_REVIEW / PENDING_APPROVAL no longer reach
      // the donee at all (the backend filters them out of /matches/mine until the donor
      // reconfirms and admin approves) — the donee's journey starts at
      // AWAITING_DONEE_CONFIRMATION. PENDING_APPROVAL below only fires for
      // donee-initiated REQUEST_LISTING matches, which they can always see.
      if (m.status === "PENDING_APPROVAL") {
        notifs.push({ id: `donee-match-pending-${m.id}`, title: "Your item request is under review", body: `Your request for "${m.requestTitle ?? "an item"}" is being reviewed by our team`, type: "info", link: "/dashboard", timestamp: ts });
      }
      if (m.status === "TRANSPORT_DISCUSSION") {
        notifs.push({ id: `contact-shared-${m.id}`, title: "Contact details shared", body: `Donor contact was shared for "${m.requestTitle ?? "your request"}" — reach out to arrange pickup`, type: "match", link: "/dashboard", timestamp: ts });
      }
      if (m.status === "AWAITING_DONEE_CONFIRMATION") {
        notifs.push({ id: `donee-action-${m.id}`, title: "Action required — confirm receipt", body: `Your match for "${m.requestTitle ?? "your request"}" was approved — please confirm to proceed`, type: "match", link: "/dashboard", timestamp: ts });
      }
      if (m.status === "FULFILLED") {
        notifs.push({ id: `donee-fulfilled-${m.id}`, title: "Item received! 🎉", body: `"${m.requestTitle ?? "Your request"}" has been fulfilled. Thank you for being part of CauseKind!`, type: "fulfilled", link: "/dashboard", timestamp: ts });
      }
      if (m.status === "REJECTED") {
        notifs.push({ id: `match-rejected-donee-${m.id}`, title: "Match not approved", body: `The match for "${m.requestTitle ?? "your request"}" was not approved${m.rejectionReason ? ": " + m.rejectionReason : "."}`, type: "rejected", link: "/dashboard", timestamp: ts });
      }
    });
  }

  // ── DONOR notifications ────────────────────────────────────────────────────
  if (role === "DONOR") {
    const [listings, matches, myOffers] = await Promise.all([
      getMyItemListings({ silent401: true }).catch(() => []),
      getMyMatches().catch(() => []),
      getMyDonationOffers().catch(() => []),
    ]);

    // Donor Flow 2 offer status notifications
    myOffers.forEach(o => {
      const ts = toTimestamp(o.createdAt);
      if (o.status === "NEEDS_INFORMATION") {
        notifs.push({ id: `offer-needs-info-${o.id}`, title: "Action required", body: `More information is needed for your offer on "${o.requestTitle}"`, type: "info", link: `/requests/${o.requestId}/offer`, timestamp: ts });
      }
      if (o.status === "DONEE_ACCEPTED" || o.status === "DONOR_RECONFIRMATION_REQUIRED") {
        notifs.push({ id: `offer-reconfirm-${o.id}`, title: "Recipient accepted your offer!", body: `Please reconfirm your item is available for "${o.requestTitle}"`, type: "match", link: "/offers", timestamp: ts });
      }
      if (o.status === "ADMIN_APPROVED") {
        notifs.push({ id: `offer-approved-${o.id}`, title: "Offer approved! Schedule handover", body: `Your donation for "${o.requestTitle}" was approved — schedule the handover now`, type: "approved", link: `/offers/${o.id}/handover`, timestamp: ts });
      }
      if (o.status === "DONEE_DECLINED") {
        notifs.push({ id: `offer-declined-${o.id}`, title: "Offer declined", body: `The recipient declined your offer for "${o.requestTitle}"`, type: "info", link: "/offers", timestamp: ts });
      }
      if (o.status === "COMPLETED") {
        notifs.push({ id: `offer-cert-${o.id}`, title: "Donation complete! 🎉", body: `Your donation for "${o.requestTitle}" is done — view your certificate`, type: "fulfilled", link: `/certificate?offerId=${o.id}`, timestamp: ts });
      }
    });

    listings.forEach(l => {
      const ts = toTimestamp(l.submittedAt ?? l.createdAt);
      if (l.status === "SUBMITTED" || l.status === "AI_SCREENING") {
        notifs.push({ id: `listing-screening-${l.id}`, title: "Item submitted for review", body: `"${l.title}" has been received and is being screened by our AI system`, type: "info", link: "/dashboard", timestamp: ts });
      }
      if (l.status === "ELIGIBLE_FOR_MATCHING" || l.status === "AVAILABLE" || l.status === "PENDING_REVIEW") {
        notifs.push({ id: `listing-approved-${l.id}`, title: "Item approved! ✓", body: `"${l.title}" passed screening and is now live — we'll find you a match soon`, type: "approved", link: "/dashboard", timestamp: ts });
      }
      if (l.status === "REJECTED" && l.rejectedByAi) {
        notifs.push({ id: `listing-ai-rejected-${l.id}`, title: "Item flagged by AI screening", body: `Our AI screening could not approve "${l.title}"${l.rejectionReason ? ": " + l.rejectionReason : ""}. You can edit and resubmit, or contact support.`, type: "rejected", link: "/dashboard", timestamp: ts });
      }
      if (l.status === "REJECTED" && !l.rejectedByAi) {
        notifs.push({ id: `listing-admin-rejected-${l.id}`, title: "Item not approved", body: `"${l.title}" was reviewed and not approved${l.rejectionReason ? ": " + l.rejectionReason : ". Contact support for more details."}`, type: "rejected", link: "/dashboard", timestamp: ts });
      }
      if (l.status === "NEEDS_INFORMATION") {
        notifs.push({ id: `listing-needs-info-${l.id}`, title: "More information needed", body: `"${l.title}" requires additional details before it can be approved${l.rejectionReason ? ": " + l.rejectionReason : ""}. Please update your listing.`, type: "info", link: "/dashboard", timestamp: ts });
      }
      if (l.status === "MANUAL_REVIEW") {
        notifs.push({ id: `listing-manual-review-${l.id}`, title: "Item under manual review", body: `"${l.title}" needs a closer look from our team. You'll hear back soon.`, type: "info", link: "/dashboard", timestamp: ts });
      }
      if (l.status === "SOFT_RESERVED" || l.status === "MATCHED" || l.status === "RESERVED") {
        notifs.push({ id: `listing-matched-${l.id}`, title: "Item matched", body: `"${l.title}" has been reserved for a recipient. Check your dashboard for the next step.`, type: "match", link: "/dashboard", timestamp: ts });
      }
      if (l.status === "PARTIALLY_DONATED" || l.status === "DONATED" || l.status === "FULFILLED") {
        notifs.push({ id: `listing-fulfilled-${l.id}`, title: "Donation completed", body: `"${l.title}" has been marked as donated. Thank you for helping through CauseKind!`, type: "fulfilled", link: "/dashboard", timestamp: ts });
      }
    });

    matches.forEach(m => {
      const itemTitle = matchItemTitle(m);
      const ts = toTimestamp(m.createdAt);
      if (m.status === "DONOR_REVIEW") {
        notifs.push({ id: `donor-action-${m.id}`, title: "Action required — confirm donation", body: `Please accept or decline the match for "${itemTitle}"`, type: "match", link: "/dashboard", timestamp: ts });
      }
      if (m.status === "TRANSPORT_DISCUSSION") {
        notifs.push({ id: `donor-match-${m.id}`, title: "New match!", body: `Your item matched with "${itemTitle}" — contact details have been shared`, type: "match", link: "/dashboard", timestamp: ts });
      }
      if (m.status === "PENDING_APPROVAL") {
        notifs.push({ id: `donor-pending-${m.id}`, title: "Match pending review", body: `Your donation to "${itemTitle}" is under admin review`, type: "info", link: "/dashboard", timestamp: ts });
      }
      if (m.status === "AWAITING_DONEE_CONFIRMATION") {
        notifs.push({ id: `donor-awaiting-donee-${m.id}`, title: "Waiting for recipient confirmation", body: `Your match for "${itemTitle}" was approved. The recipient now needs to confirm.`, type: "info", link: "/dashboard", timestamp: ts });
      }
      if (m.status === "DONEE_ACCEPTED") {
        notifs.push({ id: `donor-final-confirm-${m.id}`, title: "Final confirmation needed", body: `The recipient accepted the match for "${itemTitle}" — please give final confirmation`, type: "match", link: "/dashboard", timestamp: ts });
      }
      if (m.status === "BOTH_PARTIES_ACCEPTED" || m.status === "LOGISTICS_CONFIRMED" || m.status === "ARRANGEMENT_AGREED" || m.status === "PICKUP_SCHEDULED") {
        notifs.push({ id: `donor-logistics-${m.id}`, title: "Donation handover is next", body: `Your donation for "${itemTitle}" is ready for logistics and handover.`, type: "match", link: "/dashboard", timestamp: ts });
      }
      if (m.status === "PICKED_UP" || m.status === "IN_TRANSIT" || m.status === "DELIVERED_PENDING_CONFIRMATION") {
        notifs.push({ id: `donor-in-transit-${m.id}`, title: "Donation in progress", body: `"${itemTitle}" is in the delivery flow and awaiting final confirmation.`, type: "info", link: "/dashboard", timestamp: ts });
      }
      if (m.status === "FULFILLED" || m.status === "COMPLETED") {
        notifs.push({ id: `donor-fulfilled-${m.id}`, title: "Donation complete! ✓", body: `"${itemTitle}" was delivered successfully. Thank you!`, type: "fulfilled", link: "/dashboard", timestamp: ts });
      }
      if (m.status === "REJECTED") {
        notifs.push({ id: `match-rejected-donor-${m.id}`, title: "Match not approved", body: `The match for "${m.requestTitle ?? "a request"}" was not approved${m.rejectionReason ? ": " + m.rejectionReason : "."}`, type: "rejected", link: "/dashboard", timestamp: ts });
      }
      if (m.status === "CANCELLED" || m.status === "FAILED") {
        notifs.push({ id: `match-cancelled-donor-${m.id}`, title: "Match cancelled", body: `The match for "${itemTitle}" could not continue${m.rejectionReason ? ": " + m.rejectionReason : "."}`, type: "rejected", link: "/dashboard", timestamp: ts });
      }
    });
  }

  return notifs;
}

function useNotificationState(): NotificationsContextValue {
  const { user, isLoading } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const storeKey = user?.email ? `${STORE_PREFIX}${user.email}` : null;
  const hydratedRef = useRef(false);

  // Hydrate the tray from this user's persistent store (survives reloads/logins)
  useEffect(() => {
    hydratedRef.current = false;
    if (!storeKey) { setNotifications([]); setUnread(0); return; }
    setNotifications(sortAndCap(loadStore(storeKey)));
    hydratedRef.current = true;
  }, [storeKey]);

  // Persist every change and recompute the unread badge
  useEffect(() => {
    if (!hydratedRef.current || !storeKey) return;
    saveStore(storeKey, notifications);
    const seen = loadSeen();
    setUnread(notifications.filter(n => !seen.has(n.id)).length);
  }, [notifications, storeKey]);

  // Merge-only: already-known ids are left untouched (their position/receivedAt is
  // stable), unknown ids are stamped and enter at the top. Nothing is ever removed
  // here — only the sortAndCap 10-item cap drops the oldest from the bottom.
  const merge = useCallback((incoming: IncomingNotification[]) => {
    setNotifications(prev => {
      const known = new Set(prev.map(p => p.id));
      const fresh = incoming.filter(n => !known.has(n.id));
      if (fresh.length === 0) return prev;
      // First fill of an empty tray: stamp with the event's own time so a backlog
      // doesn't all read "just now". After that, new arrivals stamp now → top.
      const stamped = fresh.map(n => ({
        ...n,
        receivedAt: n.receivedAt ?? (prev.length === 0 ? (n.timestamp || Date.now()) : Date.now()),
      }));
      return sortAndCap([...prev, ...stamped]);
    });
  }, []);

  const addNotification = useCallback((n: IncomingNotification) => {
    merge([{ ...n, receivedAt: Date.now() }]);
  }, [merge]);

  const refresh = useCallback(async () => {
    if (!user?.role) return;
    merge(await deriveNotifications(user.role));
  }, [user?.role, merge]);

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
    let closed = false;

    function connect() {
      if (closed) return;
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
        es?.close();
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            connect();
          }, 5_000);
        }
      };
    }

    connect();

    return () => {
      closed = true;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [isLoading, user, addNotification]);

  useEffect(() => {
    function onListingSubmit() { refresh().catch(() => {}); }
    window.addEventListener("ck-listing-submitted", onListingSubmit);
    return () => window.removeEventListener("ck-listing-submitted", onListingSubmit);
  }, [refresh]);

  const markAllRead = useCallback(() => {
    const seen = loadSeen();
    notifications.forEach(n => seen.add(n.id));
    saveSeen(seen);
    setUnread(0);
  }, [notifications]);

  return useMemo(
    () => ({ notifications, unread, markAllRead, refresh }),
    [notifications, unread, markAllRead, refresh],
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
