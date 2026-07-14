"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import GuidedTour from "./GuidedTour";
import { DASHBOARD_TOUR, HOME_TOUR, PROFILE_TOUR, type TourRole, type TourStep } from "./tourSteps";

// Orchestrates WHEN the first-time tour shows. Show-once state follows the
// LocationGate pattern: a per-user localStorage flag, set on finish OR skip.
// Two independent parts: home/navbar (after the WelcomeOverlay closes) and
// dashboard (on first /dashboard visit once its content has rendered).

const homeKey = (email: string) => `ck_tour_home_${email}`;
const dashKey = (email: string) => `ck_tour_dash_${email}`;
const profileKey = (email: string) => `ck_tour_profile_${email}`;

// Which route each tour part belongs to — leaving the route closes the tour.
const KEY_ROUTE: [prefix: string, route: string][] = [
  ["ck_tour_home_", "/"],
  ["ck_tour_dash_", "/dashboard"],
  ["ck_tour_profile_", "/profile"],
];

// True when no other load-time overlay (welcome, donor category picker) is on
// screen — the tour must never spotlight through another modal.
function gatesClear(): boolean {
  return (
    !document.querySelector(".ck-cat-backdrop-el") &&
    sessionStorage.getItem("ck_welcome_pending") !== "1"
  );
}

export default function TourController() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [active, setActive] = useState<{ steps: TourStep[]; key: string } | null>(null);

  const role: TourRole | null =
    user?.role === "DONOR" ? "DONOR" : user?.role === "DONEE" ? "DONEE" : null;

  // ── Auto-trigger: home part ────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || !user || !role || pathname !== "/") return;
    if (localStorage.getItem(homeKey(user.email))) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // If another gate modal (donor category picker, location gate) is still on
    // screen, wait for it to close rather than spotlighting behind/over it.
    const start = () => {
      if (cancelled || localStorage.getItem(homeKey(user.email))) return;
      if (!gatesClear()) { timer = setTimeout(start, 800); return; }
      setActive({ steps: HOME_TOUR[role], key: homeKey(user.email) });
    };

    if (sessionStorage.getItem("ck_welcome_pending") === "1") {
      // WelcomeOverlay is about to show — wait for it to close, then start.
      const onDismissed = () => { timer = setTimeout(start, 700); };
      window.addEventListener("ck-welcome-dismissed", onDismissed, { once: true });
      return () => {
        cancelled = true;
        window.removeEventListener("ck-welcome-dismissed", onDismissed);
        if (timer) clearTimeout(timer);
      };
    }
    // No welcome pending (e.g. page reload mid-session) — start after the other
    // load-time gates (cookie/location, 1200ms delays) have had their moment.
    timer = setTimeout(start, 2000);
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [isLoading, user, role, pathname]);

  // ── Auto-trigger: dashboard part ──────────────────────────────────────────
  useEffect(() => {
    if (isLoading || !user || !role || pathname !== "/dashboard") return;
    if (localStorage.getItem(dashKey(user.email))) return;

    // Wait for the dashboard's data to render (anchors only exist then).
    let tries = 0;
    const poll = setInterval(() => {
      tries += 1;
      if (document.querySelector('[data-tour="primary-cta"]') && gatesClear()) {
        clearInterval(poll);
        setTimeout(() => {
          if (!localStorage.getItem(dashKey(user.email)) && gatesClear()) {
            setActive({ steps: DASHBOARD_TOUR[role], key: dashKey(user.email) });
          }
        }, 600);
      } else if (tries > 60) {
        clearInterval(poll); // never rendered (error state etc.) — try next visit
      }
    }, 250);
    return () => clearInterval(poll);
  }, [isLoading, user, role, pathname]);

  // ── Auto-trigger: profile part ────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || !user || !role || pathname !== "/profile") return;
    if (localStorage.getItem(profileKey(user.email))) return;

    let tries = 0;
    const poll = setInterval(() => {
      tries += 1;
      if (document.querySelector('[data-tour="member-pass"]') && gatesClear()) {
        clearInterval(poll);
        setTimeout(() => {
          if (!localStorage.getItem(profileKey(user.email)) && gatesClear()) {
            setActive({ steps: PROFILE_TOUR[role], key: profileKey(user.email) });
          }
        }, 600);
      } else if (tries > 60) {
        clearInterval(poll);
      }
    }, 250);
    return () => clearInterval(poll);
  }, [isLoading, user, role, pathname]);

  // ── Manual replay ("Take the tour again" in the workspace drawer) ─────────
  useEffect(() => {
    function onReplay() {
      if (!user || !role) return;
      localStorage.removeItem(homeKey(user.email));
      localStorage.removeItem(dashKey(user.email));
      localStorage.removeItem(profileKey(user.email));
      if (pathname === "/dashboard") {
        setActive({ steps: DASHBOARD_TOUR[role], key: dashKey(user.email) });
      } else if (pathname === "/profile") {
        setActive({ steps: PROFILE_TOUR[role], key: profileKey(user.email) });
      } else {
        setActive({ steps: HOME_TOUR[role], key: homeKey(user.email) });
      }
    }
    window.addEventListener("ck-start-tour", onReplay);
    return () => window.removeEventListener("ck-start-tour", onReplay);
  }, [user, role, pathname]);

  // Leaving the page mid-tour closes it without marking as seen (except via
  // the final CTA, which marks before navigating).
  useEffect(() => {
    setActive(prev => {
      if (!prev) return prev;
      const owner = KEY_ROUTE.find(([prefix]) => prev.key.startsWith(prefix));
      if (owner && pathname !== owner[1]) return null;
      return prev;
    });
  }, [pathname]);

  if (!active || !role) return null;

  return (
    <GuidedTour
      steps={active.steps}
      onFinish={() => {
        localStorage.setItem(active.key, "1");
        setActive(null);
      }}
    />
  );
}
