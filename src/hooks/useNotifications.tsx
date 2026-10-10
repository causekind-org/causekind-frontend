"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getMyNotifications, markAllNotificationsRead, type SavedNotification, getMyMatches, getMyItemRequests, getMyItemListings, getOffersForMyRequests, getMyDonationOffers, getMyNgoDrives, getNgoDriveOffersForNgo, getMyNgoDriveOffers } from "@/lib/api";
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
      // POTENTIAL_MATCH_FOUND must look identical to VERIFIED_PRIVATE_MATCHING
      // for the donee — a separate notification here would reveal that a
      // specific donor has been identified, leaking need-first state.
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

  // ── NGO notifications (drives only) ────────────────────────────────────────
  if (role === "NGO_PARTNER") {
    const drives = await getMyNgoDrives().catch(() => []);
    for (const d of drives) {
      const ts = toTimestamp(d.reviewedAt ?? d.submittedAt ?? d.createdAt);
      const page = `/ngo/drives/${d.id}`;
      if (d.status === "PENDING_REVIEW") {
        notifs.push({ id: `ngo-drive-review-${d.id}`, title: "Drive submitted for review", body: `"${d.title}" is with our team. We'll let you know once it's reviewed.`, type: "info", link: page, timestamp: ts });
      } else if (d.status === "CHANGES_REQUESTED") {
        notifs.push({ id: `ngo-drive-changes-${d.id}`, title: "Changes requested", body: `"${d.title}" needs changes${d.adminReason ? ": " + d.adminReason : "."}`, type: "rejected", link: page, timestamp: ts });
      } else if (d.status === "REJECTED") {
        notifs.push({ id: `ngo-drive-rejected-${d.id}`, title: "Drive not approved", body: `"${d.title}" was not approved${d.adminReason ? ": " + d.adminReason : "."}`, type: "rejected", link: page, timestamp: ts });
      } else if (d.status === "LIVE" || d.status === "FULLY_PLEDGED") {
        notifs.push({ id: `ngo-drive-live-${d.id}`, title: d.status === "LIVE" ? "Your drive is live" : "Your drive is fully pledged", body: `"${d.title}" is visible to donors near you.`, type: "approved", link: page, timestamp: ts });
        const offers = await getNgoDriveOffersForNgo(d.id, "PENDING_NGO_REVIEW").catch(() => []);
        offers.forEach(o => notifs.push({ id: `ngo-drive-offer-${o.id}`, title: "New offer to review", body: `${o.donorDisplayName || "A donor"} offered ${o.quantity ?? ""} for "${d.title}". Accept or decline it.`, type: "match", link: page, timestamp: toTimestamp(o.submittedAt) }));
      } else if (d.status === "COLLECTION_COMPLETE") {
        notifs.push({ id: `ngo-drive-collected-${d.id}`, title: "Upload your distribution proof", body: `Collection for "${d.title}" is complete. Distribute the items and upload your proof.`, type: "info", link: `${page}?tab=proof`, timestamp: ts });
      } else if (d.status === "PROOF_SUBMITTED") {
        notifs.push({ id: `ngo-drive-proof-${d.id}`, title: "Proof under review", body: `We're reviewing your distribution proof for "${d.title}".`, type: "info", link: page, timestamp: ts });
      } else if (d.status === "FULFILLED") {
        notifs.push({ id: `ngo-drive-fulfilled-${d.id}`, title: "Drive fulfilled", body: `"${d.title}" is complete. You can start a new drive.`, type: "fulfilled", link: "/dashboard/ngo", timestamp: ts });
      } else if (d.status === "CLOSED") {
        notifs.push({ id: `ngo-drive-closed-${d.id}`, title: "Drive closed", body: `"${d.title}" closed with nothing received. You can start a new drive.`, type: "info", link: "/dashboard/ngo", timestamp: ts });
      }
    }
  }

  // ── DONOR notifications ────────────────────────────────────────────────────
  if (role === "DONOR") {
    const [listings, matches, myOffers, driveOffers] = await Promise.all([
      getMyItemListings({ silent401: true }).catch(() => []),
      getMyMatches().catch(() => []),
      getMyDonationOffers().catch(() => []),
      getMyNgoDriveOffers().catch(() => []),
    ]);

    // Offers to NGO drives: the NGO reviews; the handover starts as soon as it accepts.
    driveOffers.forEach(o => {
      const ts = toTimestamp(o.submittedAt);
      const hub = `/ngo-drive-offers/${o.id}/handover`;
      if (o.status === "NGO_ACCEPTED") {
        notifs.push({ id: `drive-offer-accepted-${o.id}`, title: "The NGO accepted your offer", body: `Plan the handover for "${o.driveTitle}" now.`, type: "approved", link: hub, timestamp: ts });
      } else if (o.status === "NGO_DECLINED") {
        notifs.push({ id: `drive-offer-declined-${o.id}`, title: "The NGO declined your offer", body: `"${o.driveTitle}"${o.ngoDeclineReason ? ": " + o.ngoDeclineReason : ""}`, type: "rejected", link: "/dashboard", timestamp: ts });
      } else if (o.status === "NEEDS_INFORMATION") {
        notifs.push({ id: `drive-offer-info-${o.id}`, title: "Update your drive offer", body: `The NGO needs a change to your offer for "${o.driveTitle}".`, type: "info", link: `/drives/${o.driveId}/give`, timestamp: ts });
      } else if (o.status === "HANDOVER_IN_PROGRESS" || o.status === "HANDOVER_AT_RISK") {
        notifs.push({ id: `drive-offer-handover-${o.id}`, title: "Handover planned", body: `Show the OTP to the NGO when you hand over your items for "${o.driveTitle}".`, type: "match", link: hub, timestamp: ts });
      } else if (o.status === "ISSUE_WINDOW_OPEN") {
        notifs.push({ id: `drive-offer-received-${o.id}`, title: "The NGO received your items", body: `Thank you for giving to "${o.driveTitle}".`, type: "fulfilled", link: hub, timestamp: ts });
      } else if (o.status === "COMPLETED") {
        notifs.push({ id: `drive-offer-complete-${o.id}`, title: "See how your items were used", body: `"${o.driveTitle}" is fulfilled. View the distribution proof.`, type: "fulfilled", link: `/drives/${o.driveId}/proof`, timestamp: ts });
      } else if (o.status === "ENDED") {
        notifs.push({ id: `drive-offer-ended-${o.id}`, title: "Drive ended", body: `"${o.driveTitle}" closed before your offer was handed over.`, type: "info", link: "/dashboard", timestamp: ts });
      }
    });

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
  // Two sources, nothing cached in the browser:
  //  - saved: the user's notices from the server (V36), plus live pushes on top.
  //    Deleting a user deletes these, so a re-created account starts empty.
  //  - derived: "action required"-style notices worked out from the user's current
  //    requests/matches/offers on each refresh, replaced wholesale every time.
  const [saved, setSaved] = useState<AppNotification[]>([]);
  const [savedRead, setSavedRead] = useState<Set<string>>(new Set());
  const [derived, setDerived] = useState<AppNotification[]>([]);
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
    const ids = new Set<string>();
    const all = [...saved, ...derived].filter(n => (ids.has(n.id) ? false : (ids.add(n.id), true)));
    return sortAndCap(all);
  }, [saved, derived]);

  const unread = useMemo(() => {
    const seen = loadSeen();
    return notifications.filter(n => (n.id.startsWith("n-") ? !savedRead.has(n.id) : !seen.has(n.id))).length;
    // seenVersion: re-read the derived seen set after markAllRead writes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, savedRead, seenVersion]);

  const addNotification = useCallback((n: IncomingNotification) => {
    const now = Date.now();
    setSaved(prev => (prev.some(p => p.id === n.id) ? prev : [{ ...n, receivedAt: now }, ...prev]));
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
