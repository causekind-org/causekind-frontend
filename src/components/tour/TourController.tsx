"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { overlayGatesClear } from "@/lib/overlayGates";
import GuidedTour from "./GuidedTour";
import { DASHBOARD_TOUR, GUEST_HOME_TOUR, HOME_TOUR, PROFILE_TOUR, type TourRole, type TourStep } from "./tourSteps";

// Orchestrates WHEN the first-time tour shows. Show-once state follows the
// LocationGate pattern: a per-user localStorage flag, set on finish OR skip.
// Two independent parts: home/navbar (after the WelcomeOverlay closes) and
// dashboard (on first /dashboard visit once its content has rendered).

const homeKey = (email: string) => `ck_tour_home_${email}`;
const dashKey = (email: string) => `ck_tour_dash_${email}`;
const profileKey = (email: string) => `ck_tour_profile_${email}`;
/** No email to key on for a visitor with no account. */
const GUEST_HOME_KEY = "ck_tour_guest_home";

/** The guest tour's anchors only exist in the mobile tree (`lg:hidden`). */
const isMobileViewport = () => window.matchMedia("(max-width: 1023px)").matches;

// Which route each tour part belongs to — leaving the route closes the tour.
const KEY_ROUTE: [prefix: string, route: string][] = [
  ["ck_tour_home_", "/"],
  ["ck_tour_dash_", "/dashboard"],
  ["ck_tour_profile_", "/profile"],
  [GUEST_HOME_KEY, "/"],
];

// True when no other load-time overlay (welcome, donor category picker,
// location gate) is on screen — the tour must never spotlight through another
// modal. GuidedTour sits at z-[9995], above all of them, so a missed check here
// is visible as the tour painting straight over the other modal.
// Shared with the dock's request nudge — see src/lib/overlayGates.ts.
const gatesClear = overlayGatesClear;

// Anchor polling gives up after ~15s (the page never rendered them). Waiting on
// a gate is different — a visitor answering a cookie banner and a location
// prompt can easily take longer than that, and burning the anchor budget while
// they read would silently skip the tour. Gate waits get their own, longer cap.
const ANCHOR_TRIES = 60;    // 60 × 250ms  = 15s
const GATE_TRIES = 480;     // 480 × 250ms = 120s

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
    // If another gate modal (donor category picker, location gate, cookie
    // banner) is still on screen, wait for it to close rather than spotlighting
    // over it. No cap here — this branch retries until the stage is clear.
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
    let anchorTries = 0;
    let gateTries = 0;
    const poll = setInterval(() => {
      const anchor = document.querySelector('[data-tour="primary-cta"]');
      if (anchor && gatesClear()) {
        clearInterval(poll);
        setTimeout(() => {
          if (!localStorage.getItem(dashKey(user.email)) && gatesClear()) {
            setActive({ steps: DASHBOARD_TOUR[role], key: dashKey(user.email) });
          }
        }, 600);
        return;
      }
      // Whichever half is missing spends its own budget — a slow gate must not
      // exhaust the anchor allowance.
      if (!anchor) {
        if (++anchorTries > ANCHOR_TRIES) clearInterval(poll); // never rendered — try next visit
      } else if (++gateTries > GATE_TRIES) {
        clearInterval(poll); // modal left open — try next visit
      }
    }, 250);
    return () => clearInterval(poll);
  }, [isLoading, user, role, pathname]);

  // ── Auto-trigger: profile part ────────────────────────────────────────────
  useEffect(() => {
    if (isLoading || !user || !role || pathname !== "/profile") return;
    if (localStorage.getItem(profileKey(user.email))) return;

    let anchorTries = 0;
    let gateTries = 0;
    const poll = setInterval(() => {
      const anchor = document.querySelector('[data-tour="member-pass"]');
      if (anchor && gatesClear()) {
        clearInterval(poll);
        setTimeout(() => {
          if (!localStorage.getItem(profileKey(user.email)) && gatesClear()) {
            setActive({ steps: PROFILE_TOUR[role], key: profileKey(user.email) });
          }
        }, 600);
        return;
      }
      if (!anchor) {
        if (++anchorTries > ANCHOR_TRIES) clearInterval(poll);
      } else if (++gateTries > GATE_TRIES) {
        clearInterval(poll);
      }
    }, 250);
    return () => clearInterval(poll);
  }, [isLoading, user, role, pathname]);

  // ── Auto-trigger: logged-out landing page, mobile only ────────────────────
  useEffect(() => {
    if (isLoading || user || pathname !== "/") return;
    if (!isMobileViewport()) return;
    if (localStorage.getItem(GUEST_HOME_KEY)) return;

    // Poll for the anchors rather than guessing a delay: the landing page's
    // sections mount progressively, and the cookie banner and location gate both
    // have to be dealt with first. Same shape as the dashboard branch above.
    let anchorTries = 0;
    let gateTries = 0;
    const poll = setInterval(() => {
      const anchor = document.querySelector('[data-tour="guest-hero"]');
      if (anchor && gatesClear()) {
        clearInterval(poll);
        setTimeout(() => {
          if (!localStorage.getItem(GUEST_HOME_KEY) && gatesClear()) {
            setActive({ steps: GUEST_HOME_TOUR, key: GUEST_HOME_KEY });
          }
        }, 600);
        return;
      }
      if (!anchor) {
        if (++anchorTries > ANCHOR_TRIES) clearInterval(poll); // never rendered — try next visit
      } else if (++gateTries > GATE_TRIES) {
        clearInterval(poll);   // gates never cleared — try next visit
      }
    }, 250);
    return () => clearInterval(poll);
  }, [isLoading, user, pathname]);

  // ── Manual replay ("Take the tour again" in the workspace drawer) ─────────
  useEffect(() => {
    function onReplay() {
      if (!user || !role) {
        // Guest: only the landing tour exists, and only on mobile.
        if (!user && pathname === "/" && isMobileViewport()) {
          localStorage.removeItem(GUEST_HOME_KEY);
          setActive({ steps: GUEST_HOME_TOUR, key: GUEST_HOME_KEY });
        }
        return;
      }
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

  if (!active) return null;

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
