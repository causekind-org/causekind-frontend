"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Megaphone, ClipboardList, User, MessageCircle, X, Mail, Phone, Plus, type LucideIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocale, useTranslations } from "next-intl";
import { FEATURES } from "@/lib/features";
import { buildSupportGmailUrl, DEFAULT_SUPPORT_GMAIL_URL } from "@/lib/utils";
import { useNearFooter } from "@/hooks/useNearFooter";
import { RequestNudge } from "@/components/RequestNudge";
import GlassSurface from "@/components/GlassSurface";

/* ─── Mobile bottom nav ─────────────────────────────────────────── */
type MobileNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export function MobileBottomNav() {
  const t = useTranslations("mobileNav");
  const navT = useTranslations("nav");
  const dashboardT = useTranslations("dashboard");
  const locale = useLocale();
  const isRtl = locale === "ar" || locale === "ur";
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragPointerId = useRef<number | null>(null);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Shared with SiteBottomBlur, so the two bottom-anchored elements agree about
  // when the footer is near and leave/return together instead of drifting.
  const nearFooter = useNearFooter();

  // Centre + button — smart routing based on feature flag + role
  const centerHref = FEATURES.money
    ? "/donate"
    : user?.role === "DONOR"
      ? "/items/new"
      : user?.role === "DONEE"
        ? "/requests/new"
        : "/register";
  const centerLabel = FEATURES.money
    ? t("donateNow")
    : user?.role === "DONOR"
      ? dashboardT("listItem")
      : user?.role === "DONEE"
        ? dashboardT("requestItem")
        : navT("signUp");

  const items: MobileNavItem[] = [
    { href: "/", icon: Home, label: t("home") },
    ...(FEATURES.money
      ? [{ href: "/campaigns", icon: Megaphone, label: t("campaigns") }]
      : []),
    // Signed-in donors and donees don't get the centre "+". For a donee it pointed
    // at /requests/new, which the Requests tab already covers (isActive() treats
    // /requests/* as Requests, so both entries lit the same tab). Removed for
    // donors too on request, leaving Home / Requests / Profile for both roles.
    // Logged-out visitors keep it — there it is the sign-up call to action.
    ...(user?.role === "DONEE" || user?.role === "DONOR"
      ? []
      : [{ href: centerHref, icon: Plus, label: centerLabel }]),
    ...(user
      ? [{ href: "/requests", icon: ClipboardList, label: t("requests") }]
      : []),
    { href: user ? "/profile" : "/login", icon: User, label: t("profile") },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/profile" || href === "/dashboard" || href === "/admin/dashboard") {
      return pathname.startsWith("/profile") || pathname.startsWith("/dashboard") || pathname.startsWith("/admin/dashboard");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const routeActiveIndex = items.findIndex((item) => isActive(item.href));
  const activeIndex = dragIndex ?? pendingIndex ?? routeActiveIndex;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;
  const visualActiveIndex = isRtl ? items.length - 1 - Math.max(activeIndex, 0) : Math.max(activeIndex, 0);
  // Requests tab is only ever in `items` for a signed-in user, so >= 0 doubles
  // as the auth check for the nudge below.
  const requestsIndex = items.findIndex((item) => item.href === "/requests");
  const visualRequestsIndex = isRtl ? items.length - 1 - requestsIndex : requestsIndex;
  const indicatorLeft = dragPosition === null
    ? `${((visualActiveIndex + 0.5) / items.length) * 100}%`
    : `${dragPosition}px`;

  useEffect(() => {
    setPendingIndex(null);
    setDragPosition(null);
    setDragIndex(null);
    setIsDragging(false);
    dragPointerId.current = null;
  }, [pathname, user?.role]);

  function pointOnTrack(clientX: number) {
    const track = trackRef.current;
    if (!track || items.length === 0) return null;

    const rect = track.getBoundingClientRect();
    const slotWidth = rect.width / items.length;
    const x = Math.min(
      rect.width - slotWidth / 2,
      Math.max(slotWidth / 2, clientX - rect.left),
    );
    const visualIndex = Math.min(
      items.length - 1,
      Math.max(0, Math.round(x / slotWidth - 0.5)),
    );
    const index = isRtl ? items.length - 1 - visualIndex : visualIndex;

    return { x, index };
  }

  // Hidden inside the super-admin command center and admin dashboard (by path or role).
  if (
    pathname?.startsWith("/super-admin") ||
    pathname?.startsWith("/admin/dashboard") ||
    user?.role === "SUPER_ADMIN"
  ) return null;

  return (
    <nav
      // `inert` while parked: the links leave the tab order too, so keyboard
      // focus cannot land on a bar that is off-screen.
      inert={nearFooter}
      className="ck-mobile-dock fixed left-1/2 z-50 h-[3.75rem] w-[calc(100%-2rem)] max-w-[27rem] lg:hidden"
      style={{
        bottom: "calc(var(--ck-nav-float) + var(--ck-bottom-inset))",
        // Travel derived from --ck-bottom-chrome (float + safe-area inset + bar
        // height) rather than a guessed pixel value, so the bar clears itself
        // exactly on a notched phone and on a plain one alike.
        transform: nearFooter
          ? "translate(-50%, calc(var(--ck-bottom-chrome) + 1.5rem))"
          : "translate(-50%, 0)",
        opacity: nearFooter ? 0 : 1,
        pointerEvents: nearFooter ? "none" : "auto",
      }}
      aria-label={t("mobileNavAriaLabel")}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Decorative liquid-glass shell. A LAYER behind the track, never a
          wrapper around it: GlassSurface clips to its own box, which would cut
          off the raised bead, the socket, the glow and the RequestNudge bubble —
          all of which deliberately extend past the dock. pointer-events are off
          so it can never intercept a tap, drag or focus. */}
      <div aria-hidden="true" className="ck-mobile-dock-glass-layer">
        <GlassSurface
          width="100%"
          height="100%"
          borderRadius={22}
          mixBlendMode="screen"
          borderWidth={0.05}
          brightness={60}
          opacity={0.84}
          blur={10}
          displace={0.5}
          // Frost tint (--ck-glass-frost). Started at 0.22, where page content
          // read straight through the capsule and competed with the icons.
          // The dark rule adds a further +0.28 on top of this.
          backgroundOpacity={0.75}
          saturation={1.28}
          distortionScale={-75}
          redOffset={0}
          greenOffset={4}
          blueOffset={9}
        />
      </div>

      <div
        ref={trackRef}
        className="ck-mobile-dock-track mx-2 grid h-full"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden
          className={`ck-mobile-dock-socket ${activeIndex < 0 ? "opacity-0" : "opacity-100"} ${isDragging ? "is-dragging" : ""}`}
          style={{ left: indicatorLeft }}
        />
        <span
          aria-hidden
          className={`ck-mobile-dock-glow ${activeIndex < 0 ? "opacity-0" : "opacity-100"} ${isDragging ? "is-dragging" : ""}`}
          style={{ left: indicatorLeft }}
        />

        {items.map((item, index) => {
          const Icon = item.icon;
          const selected = index === activeIndex;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={index === routeActiveIndex ? "page" : undefined}
              aria-label={item.label}
              onClick={(event) => {
                if (
                  event.defaultPrevented ||
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) return;
                setPendingIndex(index);
              }}
              className="group relative z-10 flex min-w-0 items-center justify-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f5] dark:focus-visible:ring-offset-zinc-950"
            >
              <Icon
                aria-hidden
                className={`h-[1.15rem] w-[1.15rem] transition-all duration-300 ${selected
                  ? "-translate-y-1 scale-75 opacity-0"
                  : "translate-y-0 scale-100 text-stone-500 opacity-100 dark:text-stone-300 group-active:scale-90"
                }`}
                strokeWidth={2.1}
              />
              <span
                className={`pointer-events-none absolute inset-x-1 bottom-1.5 truncate text-center text-[9px] font-black tracking-[0.025em] text-[var(--ck-role-accent)] transition-all duration-300 ${selected
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {activeItem && (
          <span
            aria-hidden
            className={`ck-mobile-dock-bead ${isDragging ? "is-dragging" : ""}`}
            style={{ left: indicatorLeft }}
            onPointerDown={(event) => {
              const point = pointOnTrack(event.clientX);
              if (!point) return;
              dragPointerId.current = event.pointerId;
              setIsDragging(true);
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragPosition(point.x);
              setDragIndex(point.index);
            }}
            onPointerMove={(event) => {
              if (dragPointerId.current !== event.pointerId) return;
              const point = pointOnTrack(event.clientX);
              if (!point) return;
              setDragPosition(point.x);
              setDragIndex(point.index);
            }}
            onPointerUp={(event) => {
              if (dragPointerId.current !== event.pointerId) return;
              const point = pointOnTrack(event.clientX);
              dragPointerId.current = null;
              setIsDragging(false);
              setDragPosition(null);
              setDragIndex(null);
              if (!point) return;
              setPendingIndex(point.index);
              router.push(items[point.index].href);
            }}
            onPointerCancel={() => {
              dragPointerId.current = null;
              setIsDragging(false);
              setDragPosition(null);
              setDragIndex(null);
            }}
            onLostPointerCapture={() => {
              if (dragPointerId.current === null) return;
              dragPointerId.current = null;
              setIsDragging(false);
              setDragPosition(null);
              setDragIndex(null);
            }}
          >
            {(() => {
              const ActiveIcon = activeItem.icon;
              return <ActiveIcon className="relative z-10 h-5 w-5" strokeWidth={2.25} />;
            })()}
          </span>
        )}

        {requestsIndex >= 0 && (
          <RequestNudge
            leftPercent={((visualRequestsIndex + 0.5) / items.length) * 100}
            role={user?.role}
          />
        )}
      </div>
    </nav>
  );
}

/* ─── Floating support / chat button (mobile + desktop) ─────────── */
export function FloatingSupportButton() {
  const t = useTranslations("mobileNav");
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mailHref, setMailHref] = useState(DEFAULT_SUPPORT_GMAIL_URL);

  // The Handover Hub puts its own Messages button in this exact spot. Two
  // near-identical chat bubbles stacked on one edge reads as a bug, and the hub's
  // chat is the more relevant of the two there, so this one stands down. Both
  // routes that render the hub end in /handover (app/matches/[id]/handover,
  // app/offers/[id]/handover).
  const onHandover = !!pathname?.endsWith("/handover");

  useEffect(() => {
    // Client-only, post-mount — window.location isn't available during
    // server render, so computing this at render time (instead of here)
    // causes a server/client href mismatch and a hydration error.
    setMailHref(buildSupportGmailUrl());
  }, [pathname]);

  useEffect(() => {
    // Sync initial state if menu is already open
    if (typeof document !== "undefined") {
      setMenuOpen(
        document.documentElement.classList.contains("mobile-menu-open") ||
        document.body.classList.contains("mobile-menu-open")
      );
    }

    function handleMenuToggle(e: Event) {
      const customEvent = e as CustomEvent;
      const isMenuOpen = !!customEvent.detail?.open;
      setMenuOpen(isMenuOpen);
      if (isMenuOpen) {
        setOpen(false);
      }
    }
    window.addEventListener("ck-mobile-menu-toggle", handleMenuToggle);
    return () => {
      window.removeEventListener("ck-mobile-menu-toggle", handleMenuToggle);
    };
  }, []);

  // Hidden inside the super-admin command center and admin dashboard (by path or
  // role), and on the Handover Hub, which has its own Messages button here.
  if (
    pathname?.startsWith("/super-admin") ||
    pathname?.startsWith("/admin/dashboard") ||
    onHandover ||
    user?.role === "SUPER_ADMIN"
  ) return null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-45 bg-black/10 dark:bg-black/40 backdrop-blur-xs"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Popover panel */}
      <div
        className={`floating-support-item fixed bottom-[9.5rem] right-5 lg:bottom-24 z-50 w-60
          bg-white/75 dark:bg-zinc-900/70 backdrop-blur-md
          rounded-2xl shadow-2xl border border-white/50 dark:border-white/10
          transition-all duration-300 origin-bottom-right
          ${open ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none"}
          ${menuOpen ? "menu-open" : ""}`}
      >
        <div className="p-4 space-y-3">
          <p className="text-xs font-black text-stone-500 dark:text-zinc-400 uppercase tracking-widest">{t("getSupport")}</p>
          <a
            href={mailHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--ck-role-soft)] dark:hover:bg-zinc-800 transition-colors group"
          >
            <span className="w-8 h-8 rounded-full bg-[var(--ck-role-accent)]/10 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-[var(--ck-role-accent)]" />
            </span>
            <div>
              <p className="text-xs font-bold text-stone-850 dark:text-stone-100">{t("emailUs")}</p>
              <p className="text-[10px] text-stone-400 font-medium">support@causekind.com</p>
            </div>
          </a>
          <a
            href="/faq"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--ck-role-soft)] dark:hover:bg-zinc-800 transition-colors group"
          >
            <span className="w-8 h-8 rounded-full bg-[#1e3a60]/10 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-[#1e3a60]" />
            </span>
            <div>
              <p className="text-xs font-bold text-stone-850 dark:text-stone-100">{t("helpFaq")}</p>
              <p className="text-[10px] text-stone-400 font-medium">{t("helpFaqSub")}</p>
            </div>
          </a>
        </div>
      </div>

      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? t("closeSupport") : t("openSupport")}
        className={`floating-support-item fixed bottom-[7.25rem] right-5 lg:bottom-8 z-50
                   w-13 h-13 rounded-full
                   bg-[#1e3a60]/65 backdrop-blur-md
                   shadow-[0_8px_32px_-4px_rgba(30,58,96,0.55),inset_0_1px_0_rgba(255,255,255,0.18)]
                   border border-white/20 dark:border-white/12
                   flex items-center justify-center
                   active:scale-95 transition-all duration-200
                   support-btn-ripple
                   ${menuOpen ? "menu-open" : ""}`}
      >
        <span className={`transition-all duration-200 ${open ? "rotate-90 scale-90" : ""}`}>
          {open
            ? <X className="w-5 h-5 text-white" />
            : <MessageCircle className="w-5 h-5 text-white" />
          }
        </span>
      </button>
    </>
  );
}
