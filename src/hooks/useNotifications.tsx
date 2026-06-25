"use client";

import { useState, useEffect, useCallback } from "react";
import { getMyMatches, getMyItemRequests, getMyItemListings } from "@/lib/api";
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
const POLL_MS   = 90_000;

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
    const [requests, matches] = await Promise.all([
      getMyItemRequests().catch(() => []),
      getMyMatches().catch(() => []),
    ]);

    requests.forEach(r => {
      if (r.status === "POTENTIAL_MATCH_FOUND" || r.status === "VERIFIED_PRIVATE_MATCHING") {
        notifs.push({ id: `match-req-${r.id}`, title: "Match found!", body: `A donor was matched to "${r.title}"`, type: "match", link: "/dashboard#my-requests", timestamp: Date.now() });
      }
      if (r.status === "PUBLIC_REQUEST") {
        notifs.push({ id: `approved-req-${r.id}`, title: "Request approved", body: `"${r.title}" is now live on the platform`, type: "approved", link: "/dashboard#my-requests", timestamp: Date.now() });
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
    const matches = await getMyMatches().catch(() => []);

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
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [isLoading, user, refresh]);

  function markAllRead() {
    const seen = loadSeen();
    notifications.forEach(n => seen.add(n.id));
    saveSeen(seen);
    setUnread(0);
  }

  return { notifications, unread, markAllRead, refresh };
}
