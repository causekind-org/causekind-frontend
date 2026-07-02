"use client";

import { useState, useEffect, useCallback } from "react";
import { getMyMatches, getMyItemRequests, getMyItemListings, getOffersForMyRequests, getMyDonationOffers } from "@/lib/api";
import { useAuth } from "./useAuth";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: "match" | "approved" | "fulfilled" | "info";
  link: string;
  timestamp: number;
};

const SEEN_KEY  = "ck_notif_seen_v2";
const POLL_MS   = 360_000; // 6 min — longer than Neon's 5-min autosuspend so DB can actually sleep

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function saveSeen(s: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...s])); } catch {}
}

async function deriveNotifications(role: string): Promise<AppNotification[]> {
  const notifs: AppNotification[] = [];

  if (role === "DONEE") {
    const [requests, matches, incomingOffers] = await Promise.all([
      getMyItemRequests().catch(() => []),
      getMyMatches().catch(() => []),
      getOffersForMyRequests().catch(() => []),
    ]);

    requests.forEach(r => {
      if (r.status === "POTENTIAL_MATCH_FOUND" || r.status === "VERIFIED_PRIVATE_MATCHING") {
        notifs.push({ id: `match-req-${r.id}`, title: "Match found!", body: `A donor was matched to "${r.title}"`, type: "match", link: "/donee/offers", timestamp: Date.now() });
      }
      if (r.status === "PUBLIC_REQUEST") {
        notifs.push({ id: `approved-req-${r.id}`, title: "Request approved", body: `"${r.title}" is now live — donors can offer to fulfil it`, type: "approved", link: "/dashboard", timestamp: Date.now() });
      }
    });

    // Donor Flow 2 incoming offers
    incomingOffers.forEach(o => {
      if (o.status === "PENDING_DONEE_REVIEW") {
        notifs.push({ id: `offer-review-${o.id}`, title: "Someone wants to donate!", body: `A donor offered to fulfil "${o.requestTitle}" — review their offer now`, type: "match", link: "/donee/offers", timestamp: Date.now() });
      }
      if (o.status === "DONOR_RECONFIRMED") {
        notifs.push({ id: `offer-reconfirmed-${o.id}`, title: "Donor confirmed availability", body: `The donor reconfirmed their item for "${o.requestTitle}" — pending admin approval`, type: "info", link: "/donee/offers", timestamp: Date.now() });
      }
      if (o.status === "ADMIN_APPROVED") {
        notifs.push({ id: `offer-admin-approved-${o.id}`, title: "Donation approved!", body: `The donation for "${o.requestTitle}" has been approved. Handover will be scheduled.`, type: "approved", link: `/offers/${o.id}/handover`, timestamp: Date.now() });
      }
      if (o.status === "HANDOVER_IN_PROGRESS") {
        notifs.push({ id: `offer-handover-${o.id}`, title: "Handover scheduled", body: `Your donation for "${o.requestTitle}" has a handover scheduled.`, type: "match", link: `/offers/${o.id}/handover`, timestamp: Date.now() });
      }
      if (o.status === "COMPLETED") {
        notifs.push({ id: `offer-complete-${o.id}`, title: "Item received! 🎉", body: `"${o.requestTitle}" has been successfully donated and delivered.`, type: "fulfilled", link: "/donee/offers", timestamp: Date.now() });
      }
    });

    matches.forEach(m => {
      if (m.status === "TRANSPORT_DISCUSSION") {
        notifs.push({ id: `contact-shared-${m.id}`, title: "Contact details shared", body: `Donor contact shared for "${m.requestTitle ?? "your request"}"`, type: "match", link: "/dashboard", timestamp: Date.now() });
      }
      if (m.status === "PENDING_APPROVAL") {
        notifs.push({ id: `donee-donor-accepted-${m.id}`, title: "Donor confirmed your match! 🎉", body: `A donor accepted "${m.requestTitle ?? "your request"}" — under admin review now`, type: "match", link: "/dashboard", timestamp: Date.now() });
      }
      if (m.status === "FULFILLED") {
        notifs.push({ id: `fulfilled-${m.id}`, title: "Item received! 🎉", body: `"${m.requestTitle ?? "Your request"}" has been fulfilled`, type: "fulfilled", link: "/dashboard", timestamp: Date.now() });
      }
    });
  }

  if (role === "DONOR") {
    const [matches, listings, myOffers] = await Promise.all([
      getMyMatches().catch(() => []),
      getMyItemListings().catch(() => []),
      getMyDonationOffers().catch(() => []),
    ]);

    // Donor Flow 2 offer status notifications
    myOffers.forEach(o => {
      if (o.status === "NEEDS_INFORMATION") {
        notifs.push({ id: `offer-needs-info-${o.id}`, title: "Action required", body: `More information is needed for your offer on "${o.requestTitle}"`, type: "info", link: `/requests/${o.requestId}/offer`, timestamp: Date.now() });
      }
      if (o.status === "DONEE_ACCEPTED" || o.status === "DONOR_RECONFIRMATION_REQUIRED") {
        notifs.push({ id: `offer-reconfirm-${o.id}`, title: "Recipient accepted your offer!", body: `Please reconfirm your item is available for "${o.requestTitle}"`, type: "match", link: "/offers", timestamp: Date.now() });
      }
      if (o.status === "ADMIN_APPROVED") {
        notifs.push({ id: `offer-approved-${o.id}`, title: "Offer approved! Schedule handover", body: `Your donation for "${o.requestTitle}" was approved — schedule the handover now`, type: "approved", link: `/offers/${o.id}/handover`, timestamp: Date.now() });
      }
      if (o.status === "DONEE_DECLINED") {
        notifs.push({ id: `offer-declined-${o.id}`, title: "Offer declined", body: `The recipient declined your offer for "${o.requestTitle}"`, type: "info", link: "/offers", timestamp: Date.now() });
      }
      if (o.status === "COMPLETED") {
        notifs.push({ id: `offer-cert-${o.id}`, title: "Donation complete! 🎉", body: `Your donation for "${o.requestTitle}" is done — view your certificate`, type: "fulfilled", link: `/certificate?offerId=${o.id}`, timestamp: Date.now() });
      }
    });

    listings.forEach(l => {
      if (l.status === "PENDING_REVIEW") {
        notifs.push({ id: `listing-review-${l.id}`, title: "Item under review", body: `"${l.title}" is being reviewed by our team`, type: "info", link: "/dashboard", timestamp: Date.now() });
      }
      if (l.status === "AVAILABLE") {
        notifs.push({ id: `listing-approved-${l.id}`, title: "Item approved! ✓", body: `"${l.title}" is now live and can be matched with donors`, type: "approved", link: "/dashboard", timestamp: Date.now() });
      }
      if (l.status === "REJECTED") {
        notifs.push({ id: `listing-rejected-${l.id}`, title: "Item not approved", body: `"${l.title}" was not approved${l.rejectionReason ? ": " + l.rejectionReason : ""}`, type: "info", link: "/dashboard", timestamp: Date.now() });
      }
    });

    matches.forEach(m => {
      if (m.status === "DONOR_REVIEW") {
        notifs.push({ id: `donor-review-${m.id}`, title: "Action required — confirm donation", body: `Please accept or decline the match for "${m.requestTitle ?? "a request"}"`, type: "match", link: "/dashboard", timestamp: Date.now() });
      }
      if (m.status === "TRANSPORT_DISCUSSION") {
        notifs.push({ id: `donor-match-${m.id}`, title: "New match!", body: `Your item matched with "${m.requestTitle ?? "a request"}"`, type: "match", link: "/dashboard", timestamp: Date.now() });
      }
      if (m.status === "PENDING_APPROVAL") {
        notifs.push({ id: `donor-pending-${m.id}`, title: "Match pending review", body: `Your donation to "${m.requestTitle ?? "a request"}" is being reviewed by admin`, type: "info", link: "/dashboard", timestamp: Date.now() });
      }
      if (m.status === "FULFILLED") {
        notifs.push({ id: `donor-fulfilled-${m.id}`, title: "Donation complete! ✓", body: `"${m.requestTitle ?? "Your donation"}" was delivered successfully`, type: "fulfilled", link: "/dashboard", timestamp: Date.now() });
      }
    });
  }

  return notifs;
}

export function useNotifications() {
  const { user, isLoading } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!user?.role) return;
    const fresh  = await deriveNotifications(user.role);
    const seen   = loadSeen();
    const unseen = fresh.filter(n => !seen.has(n.id));
    setNotifications(fresh);
    setUnread(unseen.length);
  }, [user?.role]);

  useEffect(() => {
    if (isLoading || !user) return;
    refresh().catch(() => {});
    const interval = setInterval(() => {
      if (!document.hidden) refresh().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [isLoading, user, refresh]);

  // Immediately re-derive when a listing is submitted (fired from /items/new)
  useEffect(() => {
    function onListingSubmit() { refresh(); }
    window.addEventListener("ck-listing-submitted", onListingSubmit);
    return () => window.removeEventListener("ck-listing-submitted", onListingSubmit);
  }, [refresh]);

  function markAllRead() {
    const seen = loadSeen();
    notifications.forEach(n => seen.add(n.id));
    saveSeen(seen);
    setUnread(0);
  }

  return { notifications, unread, markAllRead, refresh };
}
