"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring,
} from "framer-motion";
import { Home, User, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";

/**
 * Mobile bottom navigation — a floating white pill with a circular active button
 * seated in a concave scoop that travels with it.
 *
 * <p><b>The notch is a CSS mask, not an asset.</b> One `radial-gradient`,
 * concentric with the button but ~6px larger, punches a real hole in the bar.
 * The hole's centre sits just below the bar's top edge, so the circle overflows
 * the top and the cut meets the edge as two concave shoulders. Being a mask, the
 * gap is genuinely transparent — the page shows through, exactly like the
 * reference — and being a gradient, it reflows at any width with no fixed asset.
 *
 * <p><b>One spring drives both.</b> The button's `x` transform and the mask's
 * centre read the SAME motion value, so they are the same number on the same
 * frame and cannot drift. This is deliberately not `layoutId`: shared-layout
 * animation moves a DOM node, but it cannot drive a `mask-image`, so a
 * `layoutId` button plus a separately animated mask would be two timelines tuned
 * to resemble one. Tuned-alike timelines drift; one motion value cannot.
 */

// Every dimension below is the original geometry scaled to 90%. They are kept
// in proportion on purpose: the scoop's shape falls out of BTN_CY and NOTCH_R,
// so shrinking one without the others would reshape the cradle, not resize it.
const BAR_H = 56;                       // the pill
const CIRCLE = 41;                      // active button, outer diameter incl. ring
const GAP = 5.5;                        // dark breathing room around the button
const NOTCH_R = CIRCLE / 2 + GAP;       // 26 — concentric, so the gap reads even
const BTN_CY = 7;                       // button centre, px BELOW the bar's top edge
const RAISE = CIRCLE / 2 - BTN_CY;      // 13.5 — how far the button overflows the top
const RING = 3.5;                       // accent ring thickness
const ICON = 21;                        // glyph size
const BORDER = 1;                       // hairline role-accent outline, also rings the scoop
const SIDE = 12;                        // island inset from the screen edges

/** Height the page must reserve: pill + the part of the button above it. */
export const MOBILE_NAV_CLEARANCE = BAR_H + RAISE + 12;

type NavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  label: string;
};

/** Routes that own their own bottom action bar, or must never show chrome. */
function isHiddenRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/super-admin") ||
    // Narrowly /admin/dashboard, matching the previous nav — other /admin
    // routes showed the nav before and this change is not the place to alter that.
    pathname.startsWith("/admin/dashboard") ||
    // The Handover Hub has its own sticky mobile action bar; two stacked bars
    // would bury it and its primary action.
    /\/handover(\/|$)/.test(pathname)
  );
}

export function MobileBottomNav() {
  const t = useTranslations("mobileNav");
  const pathname = usePathname() || "/";
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();

  const navRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // ── Destinations: one ordered array, no per-item markup ──────────────────
  const items = useMemo<NavItem[]>(() => [
    { key: "home", href: "/", icon: Home, label: t("home") },
    {
      key: "profile",
      href: user ? "/profile" : "/login",
      icon: User,
      label: t("profile"),
    },
  ], [user, t]);

  /**
   * Active index by LONGEST matching prefix.
   *
   * <p>That single rule is what makes `/requests/new` activate the primary
   * action rather than "Requests": both prefixes match, `/requests/new` is
   * longer, so it wins. A first-match scan would highlight the wrong item.
   *
   * <p>ONLY the bar's own destinations activate it. There is deliberately no
   * mapping of adjacent routes (`/items`, `/blog`, `/dashboard`, …) onto a
   * destination: on any other page the answer is -1, and the bar renders as a
   * plain pill with no scoop, no raised button and no lifted icon. A bulge
   * pointing at a page the user is not on is worse than no bulge at all.
   */
  const activeIndex = useMemo(() => {
    let best = -1;
    let bestLen = 0;
    items.forEach((item, i) => {
      const p = item.href;
      // "/" must match exactly, or it would claim every route in the app.
      // Everything else also owns its sub-routes (/profile/edit → Profile).
      const hit = p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/");
      if (hit && p.length >= bestLen) { best = i; bestLen = p.length; }
    });
    return best;
  }, [items, pathname]);

  // ── Where the button belongs ────────────────────────────────────────────
  const targetX = useMotionValue(0);
  const springX = useSpring(targetX, { stiffness: 420, damping: 38, mass: 0.9 });
  const x = reduceMotion ? targetX : springX;   // no travel under reduced motion
  const [measured, setMeasured] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const nav = navRef.current;
      const el = itemRefs.current[activeIndex];
      if (!nav || !el) return;
      const centre =
        el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2
        - nav.getBoundingClientRect().left;
      // The very first placement must not animate in from x=0.
      if (!measured) { targetX.set(centre); springX.jump?.(centre); setMeasured(true); }
      else targetX.set(centre);
    };
    measure();

    // Re-measure on anything that moves the slots: width, orientation, count.
    const ro = new ResizeObserver(measure);
    if (navRef.current) ro.observe(navRef.current);
    window.addEventListener("orientationchange", measure);
    return () => { ro.disconnect(); window.removeEventListener("orientationchange", measure); };
  }, [activeIndex, items.length, targetX, springX, measured]);

  /**
   * Slide the bar away once the footer comes into view.
   *
   * <p>Fixed chrome sits on top of whatever scrolls under it, and the footer is
   * the one region that is entirely links — so the bar was covering the policy
   * links and the legal strip. An IntersectionObserver on `#footer` is used
   * rather than a scroll handler comparing offsets: it fires off the main
   * thread, needs no measurement of a footer whose height changes with role and
   * breakpoint, and cannot drift out of sync after a layout shift.
   *
   * <p>The bottom rootMargin grows the viewport downward, so the bar starts
   * leaving slightly BEFORE the footer actually appears — "near the footer",
   * as opposed to reacting only once it has already been covered.
   */
  const [nearFooter, setNearFooter] = useState(false);
  useEffect(() => {
    const footer = document.getElementById("footer");
    // No footer on this route (admin surfaces render none) — stay visible.
    if (!footer) { setNearFooter(false); return; }
    const io = new IntersectionObserver(
      ([entry]) => setNearFooter(entry.isIntersecting),
      { rootMargin: "0px 0px 64px 0px", threshold: 0 },
    );
    io.observe(footer);
    return () => io.disconnect();
  }, [pathname]);

  const hasActive = activeIndex >= 0;

  /**
   * The scoop, cut TWICE.
   *
   * <p>A plain `border` on a masked element does not work: the mask removes the
   * notch from the rendered output, border included, leaving the scoop as a raw
   * cut with no outline. So the bar is two stacked layers — an accent-filled
   * rect underneath, and the white surface inset by BORDER on top — each with
   * its own mask. The inner mask is BORDER larger, so exactly BORDER px of
   * accent survives all the way around the scoop as well as around the pill.
   *
   * <p>The inner layer's box is offset by BORDER, so its mask centre must be
   * shifted by the same amount to stay concentric with the outer one.
   */
  const maskOuter = useMotionTemplate`radial-gradient(${NOTCH_R}px ${NOTCH_R}px at ${x}px ${BTN_CY}px, transparent 0, transparent ${NOTCH_R}px, #000 ${NOTCH_R + 0.5}px)`;

  if (isHiddenRoute(pathname) || user?.role === "SUPER_ADMIN") return null;

  return (
    <motion.nav
      aria-label={t("mobileNavAriaLabel")}
      className="fixed z-50 lg:hidden"
      // `inert` (not aria-hidden) while parked: it removes the links from the
      // tab order too, so keyboard focus cannot land on a bar that is off-screen.
      inert={nearFooter}
      animate={{ y: nearFooter ? MOBILE_NAV_CLEARANCE + 32 : 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 260, damping: 30, mass: 0.8 }
      }
      style={{
        left: SIDE,
        right: SIDE,
        bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        paddingTop: RAISE,   // room for the button to overflow without clipping
      }}
    >
      <div ref={navRef} className="relative" style={{ height: BAR_H }}>
        {/* ── Glow layer: deliberately UNMASKED and behind everything.
             A mask clips to the border-box, so any box-shadow painted on a
             masked layer is thrown away — the previous drop shadow here was
             silently doing nothing. The glow therefore needs its own unmasked
             box. Its background is transparent and box-shadows paint only
             OUTSIDE the box, so nothing of it leaks into the scoop. It carries
             no spread ring for the same reason: a `0 0 0 Npx` shadow would
             trace the rounded rect straight across the notch. ── */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[1.7rem]"
          style={{
            boxShadow:
              "0 8px 22px -10px rgba(0,0,0,0.30), " +
              "0 0 18px -4px color-mix(in srgb, var(--ck-role-accent) 26%, transparent)",
          }}
        />

        {/* ── The bar: ONE layer of white frosted glass.
             Previously this was an accent-filled rect with the glass inset on
             top of it, which is how you get a border that follows the scoop —
             but a filled layer behind TRANSLUCENT glass tints the entire bar,
             which is why it read as orange rather than white. The border is now
             a real `border` on the glass itself, so there is nothing behind the
             glass to bleed through. ── */}
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-[1.7rem] bg-white/65 backdrop-blur-2xl backdrop-saturate-150 dark:bg-zinc-900/60"
          style={{
            borderWidth: BORDER,
            borderStyle: "solid",
            // Inline, not an arbitrary Tailwind class: the class form depends on
            // Tailwind's source scanner emitting it, which fails silently.
            borderColor: "color-mix(in srgb, var(--ck-role-accent) 38%, transparent)",
            ...(hasActive
              ? {
                  WebkitMaskImage: maskOuter, maskImage: maskOuter,
                  WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                }
              : {}),
          }}
        />

        {/* ── The scoop's edge.
             A `border` lives on the border-box, so the mask cuts it away along
             the notch and leaves a raw edge there. The scoop's boundary is just
             a circle concentric with the button at NOTCH_R, so it is drawn as
             one — and the clipping wrapper (same rounded rect as the bar) hides
             the half that would otherwise hang in open air above the bar.
             Result: an outline that follows the cradle, with no filled layer
             behind the glass. ── */}
        {hasActive && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.7rem]"
          >
            <motion.span
              className="absolute rounded-full"
              style={{
                x,
                width: NOTCH_R * 2,
                height: NOTCH_R * 2,
                top: BTN_CY - NOTCH_R,
                translateX: "-50%",
                borderWidth: BORDER,
                borderStyle: "solid",
                borderColor: "color-mix(in srgb, var(--ck-role-accent) 38%, transparent)",
              }}
            />
          </div>
        )}

        {/* ── The raised button. Decoration only — the <a> below is the target. ── */}
        {hasActive && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute rounded-full bg-white/70 backdrop-blur-md backdrop-saturate-150 dark:bg-zinc-900/65"
            style={{
              x,
              width: CIRCLE,
              height: CIRCLE,
              top: BTN_CY - CIRCLE / 2,
              translateX: "-50%",
              // The lighter token for the ring against the stronger one on the
              // icon reproduces the reference's light-ring / dark-glyph pairing,
              // and stays correct in both role palettes.
              boxShadow: `0 0 0 ${RING}px var(--ck-role-highlight), 0 6px 16px -4px color-mix(in srgb, var(--ck-role-accent) 45%, transparent)`,
            }}
          />
        )}

        {/* ── Destinations ─────────────────────────────────────────────── */}
        <ul className="relative z-10 flex h-full items-stretch">
          {items.map((item, i) => {
            const active = i === activeIndex;
            const Icon = item.icon;
            return (
              <li key={item.key} className="flex min-w-0 flex-1">
                <Link
                  ref={(el) => { itemRefs.current[i] = el; }}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  // The bar is icon-only, so this is the ONLY accessible name
                  // each destination has. Never drop it.
                  aria-label={item.label}
                  className="flex min-h-[44px] w-full items-center justify-center rounded-full
                             outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-ring)]"
                >
                  <motion.span
                    className={`grid place-items-center transition-colors duration-200 ${
                      active ? "text-[var(--ck-role-accent)]" : "text-stone-600 dark:text-stone-300"
                    }`}
                    // Rides from the bar's centre up into the button. Same spring
                    // as the scoop, so icon, circle and notch settle together.
                    animate={{ y: active ? BTN_CY - BAR_H / 2 : 0 }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 420, damping: 38, mass: 0.9 }
                    }
                  >
                    <Icon style={{ width: ICON, height: ICON }} strokeWidth={active ? 2.2 : 1.9} />
                  </motion.span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.nav>
  );
}
