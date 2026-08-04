"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { overlayGatesClear, tourIsOpen } from "@/lib/overlayGates";

// A small bubble tethered to the Requests tab of the mobile dock.
//
// It renders *inside* the dock's track (see MobileBottomNav) rather than as its
// own fixed element. That is the whole design: it inherits the dock's width, its
// lg:hidden, and its slide-away-near-footer behaviour, so there is no new
// geometry to maintain and nothing new that can collide with the header, the
// toast lane or the dock itself.

const FIRST_DELAY_MS = 7_000;
const VISIBLE_MS     = 9_000;
const EXIT_MS        = 300;
const POLL_MS        = 250;
/** 480 × 250ms = 120s, matching TourController's gate budget. */
const MAX_TRIES      = 480;

const SEEN_KEY = "ck_request_nudge_seen";

export function RequestNudge({
  leftPercent,
  role,
}: {
  /** Caret position across the dock, 0-100. Already visual (RTL-adjusted). */
  leftPercent: number;
  role?: string;
}) {
  const t = useTranslations("mobileNav");
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  // Mount-time only, reading the path through a ref rather than depending on it.
  // Depending on `pathname` would tear down and restart the timers on every
  // navigation, so a nudge already on screen would be left visible with its
  // auto-hide timer cleared.
  useEffect(() => {
    if (sessionStorage.getItem(SEEN_KEY) === "1") return;

    let cancelled = false;
    let tries = 0;

    function attempt() {
      if (cancelled) return;

      // Wait, don't give up: the user may simply be reading the cookie banner or
      // taking the tour. Pointless on /requests — they are already there.
      const blocked =
        !overlayGatesClear() ||
        tourIsOpen() ||
        pathnameRef.current.startsWith("/requests");

      if (blocked) {
        if (++tries > MAX_TRIES) return;
        timers.current.push(setTimeout(attempt, POLL_MS));
        return;
      }

      // Claim the session before painting, so a second mount (route change
      // remounting the dock) can't queue up a duplicate.
      sessionStorage.setItem(SEEN_KEY, "1");
      setVisible(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setEntered(true))
      );

      timers.current.push(setTimeout(() => {
        setEntered(false);
        timers.current.push(setTimeout(() => setVisible(false), EXIT_MS));
      }, VISIBLE_MS));
    }

    timers.current.push(setTimeout(attempt, FIRST_DELAY_MS));

    const pending = timers.current;
    return () => {
      cancelled = true;
      pending.forEach(clearTimeout);
      pending.length = 0;
    };
  }, []);

  function hide() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setEntered(false);
    setTimeout(() => setVisible(false), EXIT_MS);
  }

  if (!visible) return null;

  const label = role === "DONEE" ? t("nudgeDonee") : t("nudgeDonor");

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-full z-20 mb-2.5"
      style={{
        opacity: entered ? 1 : 0,
        transform: entered ? "translateY(0)" : "translateY(6px)",
        transition: `opacity ${EXIT_MS}ms ease, transform ${EXIT_MS}ms cubic-bezier(0.22,1,0.36,1)`,
      }}
    >
      {/* Spans the dock's own width — only the caret marks the tab. A fixed-width
          bubble centred on the tab overflows the track once Campaigns is enabled
          and Requests sits at 62.5% rather than dead centre. */}
      <div className="pointer-events-auto relative">
        <Link
          href="/requests"
          onClick={hide}
          className="ck-request-nudge flex h-9 items-center gap-2 rounded-full border border-[var(--ck-role-accent)]/25 bg-white/95 pl-2 pr-8 shadow-[0_10px_24px_-12px_rgba(28,25,23,0.5)] backdrop-blur-sm dark:border-[var(--ck-role-accent)]/35 dark:bg-zinc-900/95"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--ck-role-accent)]/12">
            <ClipboardList className="h-3 w-3 text-[var(--ck-role-accent)]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-bold leading-tight text-stone-800 dark:text-stone-100">
            {label}
          </span>
        </Link>

        {/* Sibling, not a child of the Link — a button inside an anchor is
            invalid HTML and swallows the navigation on some browsers. */}
        <button
          type="button"
          onClick={hide}
          aria-label={t("nudgeDismiss")}
          className="absolute end-1 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-zinc-800"
        >
          <X className="h-3 w-3" />
        </button>

        <span
          aria-hidden
          className="absolute top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1px] border-b border-e border-[var(--ck-role-accent)]/25 bg-white/95 dark:border-[var(--ck-role-accent)]/35 dark:bg-zinc-900/95"
          style={{ left: `${leftPercent}%` }}
        />
      </div>
    </div>
  );
}
