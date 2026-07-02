"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getMyMatches, getMyItemRequests, getMyItemListings } from "@/lib/api";
import { useAuth } from "./useAuth";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: "match" | "approved" | "rejected" | "fulfilled" | "info";
  link: string;
  timestamp: number;
};

const SEEN_KEY  = "ck_notif_seen_v3";
const POLL_MS   = 90_000;
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

async function deriveNotifications(rawRole: string): Promise<AppNotification[]> {
  const role = normalizeRole(rawRole);
  const notifs: AppNotification[] = [];

  // ── DONEE notifications ────────────────────────────────────────────────────
  if (role === "DONEE") {
    const [requests, matches] = await Promise.all([
      getMyItemRequests().catch(() => []),
      getMyMatches().catch(() => []),
    ]);

    requests.forEach(r => {
      // Just submitted, awaiting admin review
      if (r.status === "PENDING_VERIFICATION") {
        notifs.push({
          id: `req-submitted-${r.id}`,
          title: "Request submitted",
          body: `"${r.title}" has been received and is awaiting review`,
          type: "info",
          link: "/dashboard#my-requests",
          timestamp: Date.now(),
        });
      }

      // Request approved / gone live
      if (r.status === "PUBLIC_REQUEST" || r.status === "VERIFIED_PRIVATE_MATCHING") {
        notifs.push({
          id: `req-approved-${r.id}`,
          title: "Request approved ✓",
          body: `"${r.title}" is now live on the platform and being matched`,
          type: "approved",
          link: "/dashboard#my-requests",
          timestamp: Date.now(),
        });
      }

      // Match found
      if (r.status === "POTENTIAL_MATCH_FOUND") {
        notifs.push({
          id: `req-match-${r.id}`,
          title: "Match found!",
          body: `A donor was matched to your request "${r.title}"`,
          type: "match",
          link: "/dashboard#my-requests",
          timestamp: Date.now(),
        });
      }

      // Admin / platform rejected the request
      if (r.status === "REJECTED") {
        notifs.push({
          id: `req-rejected-${r.id}`,
          title: "Request not approved",
          body: `"${r.title}" was not approved${r.rejectionReason ? ": " + r.rejectionReason : ". Contact support if you believe this is an error."}`,
          type: "rejected",
          link: "/dashboard#my-requests",
          timestamp: Date.now(),
        });
      }
    });

    matches.forEach(m => {
      // Donor confirmed, pending admin check
      if (m.status === "PENDING_APPROVAL") {
        notifs.push({
          id: `donee-match-pending-${m.id}`,
          title: "Donor confirmed your match!",
          body: `A donor accepted "${m.requestTitle ?? "your request"}" — under admin review now`,
          type: "match",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
      // Contact shared
      if (m.status === "TRANSPORT_DISCUSSION") {
        notifs.push({
          id: `contact-shared-${m.id}`,
          title: "Contact details shared",
          body: `Donor contact was shared for "${m.requestTitle ?? "your request"}" — reach out to arrange pickup`,
          type: "match",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
      // Admin approved — donee's turn to confirm
      if (m.status === "AWAITING_DONEE_CONFIRMATION") {
        notifs.push({
          id: `donee-action-${m.id}`,
          title: "Action required — confirm receipt",
          body: `Your match for "${m.requestTitle ?? "your request"}" was approved — please confirm to proceed`,
          type: "match",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
      // Fulfilled
      if (m.status === "FULFILLED") {
        notifs.push({
          id: `donee-fulfilled-${m.id}`,
          title: "Item received! 🎉",
          body: `"${m.requestTitle ?? "Your request"}" has been fulfilled. Thank you for being part of CauseKind!`,
          type: "fulfilled",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
      // Match rejected by admin
      if (m.status === "REJECTED") {
        notifs.push({
          id: `match-rejected-donee-${m.id}`,
          title: "Match not approved",
          body: `The match for "${m.requestTitle ?? "your request"}" was not approved${m.rejectionReason ? ": " + m.rejectionReason : "."}`,
          type: "rejected",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
    });
  }

  // ── DONOR notifications ────────────────────────────────────────────────────
  if (role === "DONOR") {
    const [listings, matches] = await Promise.all([
      getMyItemListings({ silent401: true }).catch(() => []),
      getMyMatches().catch(() => []),
    ]);

    listings.forEach(l => {
      // Submitted / AI is screening
      if (l.status === "SUBMITTED" || l.status === "AI_SCREENING") {
        notifs.push({
          id: `listing-screening-${l.id}`,
          title: "Item submitted for review",
          body: `"${l.title}" has been received and is being screened by our AI system`,
          type: "info",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }

      // Approved (primary status: ELIGIBLE_FOR_MATCHING; legacy: AVAILABLE, PENDING_REVIEW)
      if (
        l.status === "ELIGIBLE_FOR_MATCHING" ||
        l.status === "AVAILABLE" ||
        l.status === "PENDING_REVIEW"
      ) {
        notifs.push({
          id: `listing-approved-${l.id}`,
          title: "Item approved! ✓",
          body: `"${l.title}" passed screening and is now live — we'll find you a match soon`,
          type: "approved",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }

      // AI rejected
      if (l.status === "REJECTED" && l.rejectedByAi) {
        notifs.push({
          id: `listing-ai-rejected-${l.id}`,
          title: "Item flagged by AI screening",
          body: `Our AI screening could not approve "${l.title}"${l.rejectionReason ? ": " + l.rejectionReason : ""}. You can edit and resubmit, or contact support.`,
          type: "rejected",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }

      // Admin rejected
      if (l.status === "REJECTED" && !l.rejectedByAi) {
        notifs.push({
          id: `listing-admin-rejected-${l.id}`,
          title: "Item not approved",
          body: `"${l.title}" was reviewed and not approved${l.rejectionReason ? ": " + l.rejectionReason : ". Contact support for more details."}`,
          type: "rejected",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }

      // Needs more information from donor
      if (l.status === "NEEDS_INFORMATION") {
        notifs.push({
          id: `listing-needs-info-${l.id}`,
          title: "More information needed",
          body: `"${l.title}" requires additional details before it can be approved${l.rejectionReason ? ": " + l.rejectionReason : ""}. Please update your listing.`,
          type: "info",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }

      // AI flagged for manual human review
      if (l.status === "MANUAL_REVIEW") {
        notifs.push({
          id: `listing-manual-review-${l.id}`,
          title: "Item under manual review",
          body: `"${l.title}" needs a closer look from our team. You'll hear back soon.`,
          type: "info",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }

      if (l.status === "SOFT_RESERVED" || l.status === "MATCHED" || l.status === "RESERVED") {
        notifs.push({
          id: `listing-matched-${l.id}`,
          title: "Item matched",
          body: `"${l.title}" has been reserved for a recipient. Check your dashboard for the next step.`,
          type: "match",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }

      if (l.status === "PARTIALLY_DONATED" || l.status === "DONATED" || l.status === "FULFILLED") {
        notifs.push({
          id: `listing-fulfilled-${l.id}`,
          title: "Donation completed",
          body: `"${l.title}" has been marked as donated. Thank you for helping through CauseKind!`,
          type: "fulfilled",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
    });

    matches.forEach(m => {
      const itemTitle = matchItemTitle(m);

      // Action required: donor needs to confirm or decline
      if (m.status === "DONOR_REVIEW") {
        notifs.push({
          id: `donor-action-${m.id}`,
          title: "Action required — confirm donation",
          body: `Please accept or decline the match for "${itemTitle}"`,
          type: "match",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
      // New match
      if (m.status === "TRANSPORT_DISCUSSION") {
        notifs.push({
          id: `donor-match-${m.id}`,
          title: "New match!",
          body: `Your item matched with "${itemTitle}" — contact details have been shared`,
          type: "match",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
      // Pending admin approval
      if (m.status === "PENDING_APPROVAL") {
        notifs.push({
          id: `donor-pending-${m.id}`,
          title: "Match pending review",
          body: `Your donation to "${itemTitle}" is under admin review`,
          type: "info",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
      // Admin approved; waiting for donee
      if (m.status === "AWAITING_DONEE_CONFIRMATION") {
        notifs.push({
          id: `donor-awaiting-donee-${m.id}`,
          title: "Waiting for recipient confirmation",
          body: `Your match for "${itemTitle}" was approved. The recipient now needs to confirm.`,
          type: "info",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
      // Donee accepted — donor's turn to give final confirmation
      if (m.status === "DONEE_ACCEPTED") {
        notifs.push({
          id: `donor-final-confirm-${m.id}`,
          title: "Final confirmation needed",
          body: `The recipient accepted the match for "${itemTitle}" — please give final confirmation`,
          type: "match",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
      // Both sides confirmed / logistics is moving
      if (
        m.status === "BOTH_PARTIES_ACCEPTED" ||
        m.status === "LOGISTICS_CONFIRMED" ||
        m.status === "ARRANGEMENT_AGREED" ||
        m.status === "PICKUP_SCHEDULED"
      ) {
        notifs.push({
          id: `donor-logistics-${m.id}`,
          title: "Donation handover is next",
          body: `Your donation for "${itemTitle}" is ready for logistics and handover.`,
          type: "match",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
      if (
        m.status === "PICKED_UP" ||
        m.status === "IN_TRANSIT" ||
        m.status === "DELIVERED_PENDING_CONFIRMATION"
      ) {
        notifs.push({
          id: `donor-in-transit-${m.id}`,
          title: "Donation in progress",
          body: `"${itemTitle}" is in the delivery flow and awaiting final confirmation.`,
          type: "info",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
      // Completed
      if (m.status === "FULFILLED" || m.status === "COMPLETED") {
        notifs.push({
          id: `donor-fulfilled-${m.id}`,
          title: "Donation complete! ✓",
          body: `"${itemTitle}" was delivered successfully. Thank you!`,
          type: "fulfilled",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
      // Match rejected by admin
      if (m.status === "REJECTED") {
        notifs.push({
          id: `match-rejected-donor-${m.id}`,
          title: "Match not approved",
          body: `The match for "${m.requestTitle ?? "a request"}" was not approved${m.rejectionReason ? ": " + m.rejectionReason : "."}`,
          type: "rejected",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
      if (m.status === "CANCELLED" || m.status === "FAILED") {
        notifs.push({
          id: `match-cancelled-donor-${m.id}`,
          title: "Match cancelled",
          body: `The match for "${itemTitle}" could not continue${m.rejectionReason ? ": " + m.rejectionReason : "."}`,
          type: "rejected",
          link: "/dashboard",
          timestamp: Date.now(),
        });
      }
    });
  }

  return notifs;
}

function useNotificationState(): NotificationsContextValue {
  const { user, isLoading } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  // ── Merge helper: add a new notification without duplicating by id ─────────
  const addNotification = useCallback((n: AppNotification) => {
    setNotifications(prev => {
      if (prev.some(p => p.id === n.id)) return prev;
      return [n, ...prev];
    });
    setUnread(u => {
      const seen = loadSeen();
      return seen.has(n.id) ? u : u + 1;
    });
  }, []);

  // ── Polling: initial load + periodic catchup for offline gaps ─────────────
  const refresh = useCallback(async () => {
    if (!user?.role) return;
    const fresh = await deriveNotifications(user.role);
    const seen  = loadSeen();
    setNotifications(fresh);
    setUnread(fresh.filter(n => !seen.has(n.id)).length);
  }, [user?.role]);

  useEffect(() => {
    if (isLoading || !user) return;
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [isLoading, user, refresh]);

  // ── SSE: real-time push notifications ─────────────────────────────────────
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
          addNotification({
            ...data,
            timestamp: Date.now(),
          });
        } catch {
          // ignore malformed events
        }
      });

      // Suppress spurious error noise — EventSource auto-reconnects after onerror
      es.onerror = () => {
        if (closed) return;
        es?.close();
        // Back off 5 s before reconnecting so we don't hammer the server
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

  // ── Re-poll immediately on listing submit (fired from /items/new) ──────────
  useEffect(() => {
    function onListingSubmit() { refresh(); }
    window.addEventListener("ck-listing-submitted", onListingSubmit);
    return () => window.removeEventListener("ck-listing-submitted", onListingSubmit);
  }, [refresh]);

  // ── Mark all read ─────────────────────────────────────────────────────────
  function markAllRead() {
    const seen = loadSeen();
    notifications.forEach(n => seen.add(n.id));
    saveSeen(seen);
    setUnread(0);
  }

  return { notifications, unread, markAllRead, refresh };
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
