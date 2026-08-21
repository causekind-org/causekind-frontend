"use client";

import { useState, useEffect, useRef } from "react";
// @ts-expect-error — StaggeredMenu is the JS/CSS React Bits variant (no types shipped)
import StaggeredMenu from "@/components/StaggeredMenu";
// @ts-expect-error — SpecularButton is the JS/CSS React Bits variant (no types shipped)
import SpecularButton from "@/components/SpecularButton";
import Link from "next/link";
import { LogoVideo } from "@/components/LogoVideo";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Menu, X, LogIn, UserPlus, Shield, Sun, Moon, User, LayoutGrid, LogOut, Globe, ChevronRight, ChevronDown, Heart, HandHeart, Compass, HeartHandshake, HelpCircle, Mail, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { useAuth, type AuthUser } from "@/hooks/useAuth";
import { useRoleColors } from "@/hooks/useRoleColors";
import { useTilt } from "@/hooks/useTilt";
import { getMyProfile, getMyMatches, type UserProfile, type ItemMatch } from "@/lib/api";
import { FEATURES } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch, SearchTrigger } from "@/components/GlobalSearch";
import InKindMegaMenu from "@/components/InKindMegaMenu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const logoLetterVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
};
const logoStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.15 } },
};

export function CauseKindLogo({ size = "md", hideIcon = false }: { size?: "sm" | "md" | "lg"; hideIcon?: boolean }) {
  const sizes = { sm: "text-base", md: "text-xl", lg: "text-2xl" };
  const dimensions = { sm: { w: 24, h: 24 }, md: { w: 32, h: 32 }, lg: { w: 40, h: 40 } };
  return (
    <motion.span
      className={`font-extrabold tracking-tight ${sizes[size]} flex items-center gap-2`}
      aria-label="CauseKind"
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {!hideIcon && (
        <motion.div
          className="shrink-0"
          initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.05 }}
        >
          <LogoVideo size={dimensions[size].w} />
        </motion.div>
      )}

      <span className="flex items-center font-extrabold text-base sm:text-xl" aria-hidden="true">
        {/* "Cause" — stagger letter reveal */}
        <motion.span
          className="text-stone-900 dark:text-stone-100 tracking-tight flex"
          variants={logoStagger}
          initial="hidden"
          animate="visible"
        >
          {"Cause".split("").map((l, i) => (
            <motion.span
              key={i}
              variants={logoLetterVariants}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {l}
            </motion.span>
          ))}
        </motion.span>

        {/* "Kind" — slides in as one word after "Cause", then shimmers */}
        <motion.span
          className="ck-logo-kind-shimmer"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.44 }}
        >
          Kind
        </motion.span>
      </span>
    </motion.span>
  );
}

// Keep CareNestLogo exported and map it to CauseKindLogo to prevent any broken imports in other files
export function CareNestLogo({ size = "md", hideIcon = false }: { size?: "sm" | "md" | "lg"; hideIcon?: boolean }) {
  return <CauseKindLogo size={size} hideIcon={hideIcon} />;
}

function Donate3DButton() {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const heartIdRef = useRef(0);

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setTilt({
      x: ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -14,
      y: ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 14,
    });
  }

  function spawnHeart() {
    const id = ++heartIdRef.current;
    setHearts(h => [...h, { id, x: Math.random() * 60 + 20 }]);
    setTimeout(() => setHearts(h => h.filter(ht => ht.id !== id)), 800);
  }

  return (
    <Link href="/donate">
      <div style={{ perspective: "600px", display: "inline-block", position: "relative" }}>
        {hearts.map(({ id, x }) => (
          <span
            key={id}
            className="absolute z-50 text-2xs text-[var(--ck-role-highlight)] pointer-events-none select-none"
            style={{
              left: `${x}%`,
              bottom: "110%",
              animation: "donate-navbar-heart-float 0.8s ease-out forwards",
            }}
          >
            ♥
          </span>
        ))}
        <button
          ref={btnRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => { setHovered(true); spawnHeart(); }}
          onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); }}
          style={{
            transform: hovered
              ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.1) translateZ(10px)`
              : "rotateX(0deg) rotateY(0deg) scale(1) translateZ(0px)",
            transition: hovered
              ? "transform 0.08s ease-out"
              : "transform 0.55s cubic-bezier(0.34,1.56,0.64,1)",
            transformStyle: "preserve-3d",
            boxShadow: hovered
              ? "0 0 0 2px rgba(240,185,122,0.5), 0 10px 36px rgba(176,74,21,0.65), 0 4px 14px rgba(0,0,0,0.18)"
              : undefined,
          }}
          className="donate-navbar-3d relative bg-[var(--ck-role-accent)] text-white font-bold px-[18px] py-[6px] rounded-full text-xs sm:text-sm"
          aria-label="Donate"
        >
          <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
            <span className="donate-navbar-shimmer" />
          </span>
          {hovered && <span className="donate-navbar-ring" />}
          <span className="relative z-10 flex items-center gap-1.5">
            <span
              style={{
                display: "inline-block",
                transform: hovered ? "scale(1.35) rotate(-15deg)" : "scale(1) rotate(0deg)",
                transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                fontSize: "0.72em",
                lineHeight: 1,
              }}
            >
              ♥
            </span>
            Donate
          </span>
        </button>
      </div>
    </Link>
  );
}

// ── Login nudge — a speech-bubble popover anchored to the navbar's Login
// button (SpecularButton) itself, not a separate floating element. Shows
// once per session, ~15s after load, only for logged-out visitors — and
// only where the button it points at actually renders (desktop).
const LOGIN_NUDGE_DELAY_MS     = 15_000;
const LOGIN_NUDGE_VISIBLE_MS   = 12_000;
const LOGIN_NUDGE_EXIT_MS      = 300;
const LOGIN_NUDGE_SESSION_KEY  = "ck_login_nudge_shown";
const LOGIN_NUDGE_SKIP_PATHS   = ["/login", "/register"];

function LoginNudgeBubble({ user }: { user: AuthUser | null }) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t3 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t4 = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  useEffect(() => {
    if (user) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(LOGIN_NUDGE_SESSION_KEY) === "1") return;

    t1.current = setTimeout(() => {
      if (LOGIN_NUDGE_SKIP_PATHS.includes(pathnameRef.current ?? "")) return;
      sessionStorage.setItem(LOGIN_NUDGE_SESSION_KEY, "1");
      setVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
      t2.current = setTimeout(() => {
        setEntered(false);
        t3.current = setTimeout(() => setVisible(false), LOGIN_NUDGE_EXIT_MS);
      }, LOGIN_NUDGE_VISIBLE_MS);
    }, LOGIN_NUDGE_DELAY_MS);

    return () => { [t1, t2, t3, t4].forEach(r => { if (r.current) clearTimeout(r.current); }); };
  }, [user]);

  function dismiss() {
    [t1, t2, t3].forEach(r => { if (r.current) clearTimeout(r.current); });
    setEntered(false);
    t4.current = setTimeout(() => setVisible(false), LOGIN_NUDGE_EXIT_MS);
  }

  if (!visible || user) return null;

  return (
    <div
      className="absolute top-full right-0 mt-3 z-50 w-64"
      style={{
        transformOrigin: "top right",
        transform: entered ? "scale(1) translateY(0)" : "scale(0.85) translateY(-6px)",
        opacity: entered ? 1 : 0,
        transition: entered
          ? "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease"
          : `transform ${LOGIN_NUDGE_EXIT_MS}ms ease-in, opacity ${LOGIN_NUDGE_EXIT_MS}ms ease`,
      }}
    >
      {/* Pointer tip, aimed up at the button */}
      <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white dark:bg-zinc-900 border-t border-l border-stone-200 dark:border-zinc-700 rotate-45" />

      <div className="relative rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 shadow-[0_12px_36px_rgba(0,0,0,0.16)] p-4">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
        <p className="text-sm font-bold text-stone-900 dark:text-stone-100 pr-5">New here?</p>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
          Log in to donate items or request help — it only takes a moment.
        </p>
      </div>
    </div>
  );
}

function Sidebar3DItem({
  children,
  onClick,
  href,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 10;
    const y = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -10;
    setTilt({ x, y });
  }

  const content = (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); }}
      style={{
        perspective: "600px",
        transform: hovered
          ? `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(1.02) translateZ(8px)`
          : "rotateX(0deg) rotateY(0deg) scale(1) translateZ(0px)",
        transition: hovered ? "transform 0.08s ease-out" : "transform 0.45s cubic-bezier(0.25, 0.8, 0.25, 1)",
        transformStyle: "preserve-3d",
      }}
      className={`relative group rounded-2xl border border-stone-200 dark:border-zinc-800/80 p-4 transition-all duration-200 cursor-pointer bg-white dark:bg-zinc-900/60 hover:bg-[var(--ck-role-accent)]/5 dark:hover:bg-[var(--ck-role-accent)]/10 hover:border-[var(--ck-role-accent)]/30 dark:hover:border-[var(--ck-role-accent)]/25 shadow-xs ${className}`}
    >
      <div className="relative z-10 flex items-center gap-3">
        {children}
      </div>
      {hovered && (
        <span className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0">
          <span className="donate-navbar-shimmer" />
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} onClick={onClick} className="block">{content}</Link>;
  }
  return <div onClick={onClick}>{content}</div>;
}

export function SiteHeader() {
  const { user, logout } = useAuth();
  // Resolved literals for GSAP/canvas colour props — see useRoleColors.
  const roleColors = useRoleColors();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Closing the menu makes it inert, which pushes focus out to <body>. Without
  // this a keyboard user loses their place entirely, so send focus back to the
  // control they opened it with.
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const wasSidebarOpen = useRef(false);
  useEffect(() => {
    if (wasSidebarOpen.current && !isSidebarOpen) menuTriggerRef.current?.focus();
    wasSidebarOpen.current = isSidebarOpen;
  }, [isSidebarOpen]);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  // Desktop mega-menu hover state and timers.
  //
  // One controller, not one boolean per panel: "About Us" and "In-Kind" sit next
  // to each other in the capsule, and with independent flags a fast horizontal
  // sweep leaves the first still inside its 200ms grace while the second opens —
  // two panels animating in at once. A single `openMegaMenu` makes that
  // impossible by construction.
  type MegaMenu = "about" | "inkind";
  const [openMegaMenu, setOpenMegaMenu] = useState<MegaMenu | null>(null);

  // Which capsule link the pointer or keyboard focus is currently on, so the
  // hover pill knows where to travel to. Keyed by href rather than index so
  // it survives the conditional entries in `navLinks` (campaigns, requests).
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const megaLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openMega = (menu: MegaMenu) => {
    if (megaLeaveTimeoutRef.current) {
      clearTimeout(megaLeaveTimeoutRef.current);
      megaLeaveTimeoutRef.current = null;
    }
    setOpenMegaMenu(menu);
  };

  // The grace period forgives a diagonal mouse path from the trigger down to the
  // panel, which would otherwise cross dead space and snap it shut.
  const closeMegaSoon = () => {
    if (megaLeaveTimeoutRef.current) clearTimeout(megaLeaveTimeoutRef.current);
    megaLeaveTimeoutRef.current = setTimeout(() => setOpenMegaMenu(null), 200);
  };

  const isAboutMegaMenuOpen = openMegaMenu === "about";
  const isInKindMegaMenuOpen = openMegaMenu === "inkind";
  const handleAboutMouseEnter = () => openMega("about");
  const handleAboutMouseLeave = closeMegaSoon;
  const handleInKindMouseEnter = () => openMega("inkind");
  const handleInKindMouseLeave = closeMegaSoon;

  useEffect(() => {
    setOpenMegaMenu(null);
    // Navigating away from under the cursor otherwise leaves the hover pill
    // parked on a link the pointer is no longer on.
    setHoveredHref(null);
  }, [pathname]);

  // Escape closes whichever panel is open, and hover-opened menus otherwise have
  // no keyboard way out.
  useEffect(() => {
    if (!openMegaMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMegaMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openMegaMenu]);

  useEffect(() => {
    return () => {
      if (megaLeaveTimeoutRef.current) clearTimeout(megaLeaveTimeoutRef.current);
    };
  }, []);

  // Elevate-on-scroll: flat at the top of the page, soft shadow fades in once
  // content scrolls beneath the bar (same pattern as the admin panel header).
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Publish the header's real height as --ck-nav-h so full-viewport sections can
  // size themselves against it. It has to be measured, not assumed: the mobile
  // bar and the lg: bar have different padding, and layout.tsx's 3.5rem is only
  // right for the mobile one. Measuring also survives browser zoom and the bar
  // wrapping to two lines, which a hardcoded value does not.
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty("--ck-nav-h", `${el.getBoundingClientRect().height}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--ck-nav-h");
    };
  }, []);

  useEffect(() => {
    if (user && isSidebarOpen) {
      const savedAvatar = localStorage.getItem(`ck_profile_image_${user.email}`);
      setAvatarDataUrl(savedAvatar);

      getMyProfile()
        .then(setProfile)
        .catch(() => {});

      getMyMatches()
        .then(setMatches)
        .catch(() => {});
    }
  }, [user, isSidebarOpen]);

  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("ck_theme") as "light" | "dark" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("ck_theme", theme);
  }, [theme]);

  useEffect(() => {
    const html = window.document.documentElement;
    const body = window.document.body;
    window.dispatchEvent(new CustomEvent("ck-mobile-menu-toggle", { detail: { open: isSidebarOpen } }));

    if (!isSidebarOpen) return;

    // Plain `overflow: hidden` doesn't stop touch-drag scrolling on iOS Safari —
    // pinning the body with `position: fixed` (and restoring the exact scroll
    // offset on close) is the reliable cross-browser lock. Scroll position is
    // captured in this closure so the cleanup below always restores the right
    // spot, regardless of what happened to body.style in between.
    const scrollY = window.scrollY;
    html.classList.add("mobile-menu-open");
    body.classList.add("mobile-menu-open");
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      html.classList.remove("mobile-menu-open");
      body.classList.remove("mobile-menu-open");
      body.style.position = "";
      body.style.top = "";
      body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [isSidebarOpen]);

  const toggleTheme = () => setTheme(prev => (prev === "light" ? "dark" : "light"));

  const dashHref = user?.role === "SUPER_ADMIN" ? "/super-admin"
    : user?.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";

  /** Opens the confirmation dialog — actual logout happens only on confirm. */
  function requestLogout() { setLogoutDialogOpen(true); }

  /** Called by the AlertDialogAction (confirm button). */
  function confirmLogout() {
    logout();
    router.push("/");
    setIsSidebarOpen(false);
  }

  const t = useTranslations();

  // ── Derived panel data (all real, no hardcoded values) ────────────────────
  const livesTouched = matches.filter(
    m => m.status === "COMPLETED" || m.status === "FULFILLED"
  ).length;

  const profileCompletion = (() => {
    let score = 0;
    if (profile?.fullName) score += 25;
    if (profile?.phone) score += 25;
    if (profile?.city) score += 25;
    if (avatarDataUrl) score += 25;
    return score;
  })();

  const missingProfileFields = profile
    ? [
        ...(!profile.fullName ? ["name"] : []),
        ...(!profile.phone ? ["phone"] : []),
        ...(!profile.city ? ["city"] : []),
        ...(!avatarDataUrl ? ["photo"] : []),
      ]
    : [];

  const roleLabel: Record<string, string> = {
    DONOR: "Donor",
    DONEE: "Donee",
    ADMIN: "Administrator",
    SUPER_ADMIN: "Super Admin",
    REPRESENTATIVE: "Representative",
    NGO_PARTNER: "NGO Partner",
  };

  const latestMatch = matches.length > 0
    ? [...matches].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]
    : null;

  const impactText = (() => {
    if (!latestMatch) {
      return user?.role === "DONOR"
        ? "Make your first donation to start helping!"
        : "Create a request to receive support from donors!";
    }
    const isDonor = user?.role === "DONOR";
    const item = latestMatch.listingTitle ?? latestMatch.requestTitle ?? "an item";
    const other = isDonor ? latestMatch.doneeName : latestMatch.donorName;
    if (latestMatch.status === "COMPLETED" || latestMatch.status === "FULFILLED") {
      return isDonor
        ? `You donated "${item}" to ${other}. Great work!`
        : `You received "${item}" from ${other}. Thank you!`;
    }
    return isDonor
      ? `Your donation of "${item}" is currently in progress.`
      : `Your request for "${item}" is being processed.`;
  })();

  // Super-admin command center is full-screen & self-contained — hide public chrome.
  // Hide by path AND by role so there's no flash before the redirect kicks in.
  const hideChrome =
    pathname?.startsWith("/super-admin") ||
    pathname?.startsWith("/admin/dashboard") ||
    user?.role === "SUPER_ADMIN";

  // Mobile drawer lists everything flat; desktop groups these three under
  // an "About Us" dropdown instead of three separate pills (see render below).
  const aboutMenuItems = [
    { href: "/about", label: t("nav.about") },
    { href: "/faq", label: t("nav.faq") },
    { href: "/contact", label: t("nav.contact") },
  ];

  const navLinks = [
    { href: "/", label: t("nav.home") },
    ...(FEATURES.money ? [{ href: "/campaigns", label: t("nav.campaigns") }] : []),
    // Visible to everyone, including guests: the board itself is public
    // (reduced-field endpoint, no GPS) and only the act of offering needs an
    // account. Hiding it from logged-out visitors meant nobody could see what
    // CauseKind is actually for before signing up.
    { href: "/requests", label: t("nav.requests") },
    { href: "/blog", label: t("nav.blog") },
    ...aboutMenuItems,
  ];

  /** Whether a nav link is active, keyed by href for exactness. */
  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Hooks must run unconditionally — keep this above the hideChrome early return.
  const tilt = useTilt();

  if (hideChrome) return null;

  // Shared icon-button class (matches the theme toggle button exactly)
  const iconBtnCls =
    "glass-pill glass-3d relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-stone-700 dark:text-stone-300";

  return (
    <>
      {/* ── Logout confirmation dialog ── */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("logout.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("logout.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("logout.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLogout}
              className="bg-[var(--ck-role-accent)] hover:bg-[var(--ck-role-hover)] text-white border-0"
            >
              {t("logout.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header ref={headerRef} className={`sticky top-0 z-50 w-full bg-[#faf8f5] dark:bg-zinc-950 lg:bg-[#faf8f5]/80 lg:dark:bg-zinc-950/80 backdrop-blur-none lg:backdrop-blur-md border-b border-[#e5e2d5] dark:border-stone-850 transition-shadow duration-300 ease-out ${
        scrolled
          ? "shadow-[0_10px_30px_-8px_rgba(28,25,23,0.18)] dark:shadow-[0_10px_30px_-8px_rgba(0,0,0,0.55)]"
          : "shadow-[0_6px_18px_-6px_rgba(28,25,23,0.10)] dark:shadow-[0_6px_18px_-6px_rgba(0,0,0,0.40)]"
      }`}>
        {/* Mobile Header (lg:hidden) - Strict 100% opaque background */}
        <div className="lg:hidden w-full flex items-center justify-between px-6 py-3 bg-[#faf8f5] dark:bg-zinc-950">
          <button
            ref={menuTriggerRef}
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
            aria-expanded={isSidebarOpen}
            aria-controls="staggered-menu-panel"
            className="flex items-center justify-center w-8 h-8 rounded-full text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="flex items-center justify-center">
            <CareNestLogo size="md" hideIcon={true} />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex w-full max-w-[1440px] mx-auto items-center justify-between px-10 py-5">
          <Link href="/" className="flex items-center gap-2">
            <CareNestLogo />
          </Link>

          {/* Center navigation capsule */}
          <nav className="glass-liquid hidden lg:flex items-center gap-1 bg-white/55 dark:bg-zinc-900/55 backdrop-blur-xl border border-white/60 dark:border-white/10 ring-1 ring-[#e5e2d5]/50 dark:ring-stone-800/60 rounded-full p-1 shadow-[0_4px_20px_-6px_rgba(28,25,23,0.12),inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]">
            {navLinks.map((link) => {
              // FAQ and Contact live inside the "About Us" dropdown on desktop
              // instead of as separate pills — skip them here.
              if (link.href === "/faq" || link.href === "/contact") return null;

              if (link.href === "/about") {
                // Trigger reflects wherever you actually are — "About Us" by
                // default, but swaps to "FAQ" / "Contact" on those pages so
                // the top nav visibly acknowledges the current page too.
                const activeAboutItem = aboutMenuItems.find((item) => isActive(item.href));
                const groupActive = !!activeAboutItem;
                const triggerLabel = activeAboutItem ? activeAboutItem.label : t("nav.about");
                return (
                  <div
                    key="about-mega-trigger"
                    className="relative"
                    onMouseEnter={handleAboutMouseEnter}
                    onMouseLeave={handleAboutMouseLeave}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenMegaMenu((prev) => (prev === "about" ? null : "about"))}
                      aria-expanded={isAboutMegaMenuOpen}
                      className={`group relative text-sm px-4 py-2 transition-all duration-300 rounded-full flex items-center gap-1.5 font-semibold outline-none cursor-pointer ${
                        groupActive || isAboutMegaMenuOpen
                          ? "text-[var(--ck-role-accent)]"
                          : "text-stone-500 hover:text-[var(--ck-role-accent)] dark:text-stone-400 dark:hover:text-[var(--ck-role-accent)]"
                      }`}
                    >
                      {/* Releases the pill while a plain link is hovered, so
                          exactly one element ever claims `nav-glass-pill`. Two
                          claimants at once make Framer pick a winner and the
                          slide stutters. */}
                      {(isAboutMegaMenuOpen || (groupActive && !hoveredHref)) && (
                        <motion.span
                          layoutId="nav-glass-pill"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          className="glass-pill absolute inset-0 rounded-full"
                        />
                      )}
                      {groupActive && <span className="relative z-10 w-2.5 h-2.5 rounded-full bg-[var(--ck-role-highlight)] shrink-0" />}
                      <span className="relative z-10">{triggerLabel}</span>
                      <ChevronDown
                        className={`relative z-10 w-3.5 h-3.5 transition-transform duration-300 ${
                          isAboutMegaMenuOpen ? "rotate-180 text-[var(--ck-role-accent)]" : ""
                        }`}
                      />
                    </button>
                  </div>
                );
              }

              const active = isActive(link.href);

              // "In-Kind Requests" is both a destination and the category
              // mega-menu trigger — one pill, not two. Clicking still goes to
              // the hub; hover or keyboard focus opens the nine categories
              // beneath it.
              //
              // Open to donors and to guests. A guest browsing categories is
              // exactly the person this menu is for, and every page behind it is
              // public. Only a donee is excluded — they post needs rather than
              // fill them, so "what should I donate" is noise on their nav.
              const isInKindTrigger = link.href === "/requests" && user?.role !== "DONEE";
              if (isInKindTrigger) {
                return (
                  <div
                    key={link.label}
                    className="relative"
                    onMouseEnter={handleInKindMouseEnter}
                    onMouseLeave={handleInKindMouseLeave}
                  >
                    <Link
                      href={link.href}
                      data-tour="nav-requests"
                      onFocus={handleInKindMouseEnter}
                      aria-expanded={isInKindMegaMenuOpen}
                      className={`relative text-sm px-4 py-2 transition-colors duration-300 rounded-full flex items-center gap-1.5 font-semibold ${
                        active || isInKindMegaMenuOpen
                          ? "text-[var(--ck-role-accent)]"
                          : "text-stone-500 hover:text-[var(--ck-role-accent)] dark:text-stone-400 dark:hover:text-[var(--ck-role-accent)]"
                      }`}
                    >
                      {(isInKindMegaMenuOpen || (active && !hoveredHref)) && (
                        <motion.span
                          layoutId="nav-glass-pill"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          className="glass-pill absolute inset-0 rounded-full"
                        />
                      )}
                      {active && <span className="relative z-10 w-2.5 h-2.5 rounded-full bg-[var(--ck-role-highlight)] shrink-0" />}
                      <span className="relative z-10">{link.label}</span>
                      <ChevronDown
                        className={`relative z-10 w-3.5 h-3.5 transition-transform duration-300 ${
                          isInKindMegaMenuOpen ? "rotate-180 text-[var(--ck-role-accent)]" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                );
              }

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  data-tour={link.href === "/requests" ? "nav-requests" : undefined}
                  // Landing on a plain link also dismisses any open mega panel.
                  // Without this, sweeping from "About Us" to "Blog" inside the
                  // 200ms leave grace leaves the panel open while Blog is
                  // hovered — two elements claiming `nav-glass-pill` at once,
                  // which is exactly the stutter the single-owner rule prevents.
                  onMouseEnter={() => { setHoveredHref(link.href); setOpenMegaMenu(null); }}
                  onMouseLeave={() => setHoveredHref(null)}
                  onFocus={() => { setHoveredHref(link.href); setOpenMegaMenu(null); }}
                  onBlur={() => setHoveredHref(null)}
                  className={`relative text-sm px-4 py-2 transition-colors duration-300 rounded-full flex items-center gap-2 font-semibold ${active
                      ? "text-[var(--ck-role-accent)]"
                      : "text-stone-500 hover:text-[var(--ck-role-accent)] dark:text-stone-400 dark:hover:text-[var(--ck-role-accent)]"
                    }`}
                >
                  {/* The one travelling glass pill, shared with both dropdown
                      triggers through `layoutId="nav-glass-pill"`. Hovering any
                      of them slides it off the current page and onto whatever
                      you are pointing at, then back when you leave.

                      Blog used to be the only item in the capsule the pill would
                      not travel to: the dropdown triggers render it on
                      `groupActive || isOpen`, and hovering opens the menu, so
                      they got the slide for free. A plain link has no open state,
                      so it needs `hoveredHref` to say the same thing. */}
                  {(hoveredHref === link.href || (active && !hoveredHref)) && (
                    <motion.span
                      layoutId="nav-glass-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="glass-pill absolute inset-0 rounded-full"
                    />
                  )}
                  {active && <span className="relative z-10 w-2.5 h-2.5 rounded-full bg-[var(--ck-role-highlight)] shrink-0" />}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}

          </nav>

          {/* Right buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <GlobalSearch />
            {user && <span data-tour="search" className="inline-flex"><SearchTrigger /></span>}
            <span data-tour="bell" className="inline-flex"><NotificationBell /></span>

            {/* Sleek Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={iconBtnCls}
              aria-label={t("nav.toggleTheme")}
              suppressHydrationWarning
              {...tilt}
            >
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Sun className={`w-4 h-4 sm:w-5 sm:h-5 absolute text-amber-500 transition-all duration-500 transform ${theme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"}`} />
                <Moon className={`w-4 h-4 sm:w-5 sm:h-5 absolute text-stone-600 dark:text-stone-400 transition-all duration-500 transform ${theme === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`} />
              </div>
            </button>

            {/* Hamburger menu trigger */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className={iconBtnCls}
              aria-label="Open workspace menu"
              data-tour="menu"
              {...tilt}
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-stone-700 dark:text-stone-300" />
            </button>

            {FEATURES.money && <Donate3DButton />}

            {/* Auth action — login/logout, top-right */}
            <div className="relative">
              <SpecularButton
                size="sm"
                radius={999}
                tint={roleColors.accent}
                tintOpacity={1}
                textColor="#ffffff"
                lineColor={roleColors.highlight}
                baseColor={roleColors.deep}
                intensity={1}
                shineSize={14}
                shineFade={35}
                thickness={1.2}
                followMouse
                proximity={220}
                onClick={() => (user ? requestLogout() : router.push("/login"))}
                className="font-bold"
              >
                <span className="inline-flex items-center gap-1.5">
                  {user ? <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  {user ? t("nav.signOut") : t("nav.logIn")}
                </span>
              </SpecularButton>
              <LoginNudgeBubble user={user} />
            </div>
          </div>
        </div>

        {/* Animated Desktop Mega Menu for "In-Kind" — mirrors the About panel's
            chrome, positioning and timing exactly; only the body differs. */}
        <AnimatePresence>
          {isInKindMegaMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={handleInKindMouseEnter}
              onMouseLeave={handleInKindMouseLeave}
              className="hidden lg:block absolute top-full left-0 right-0 w-full bg-[#faf8f5]/98 dark:bg-stone-900/98 backdrop-blur-2xl border-b border-[#e5e2d5] dark:border-stone-800 shadow-[0_25px_60px_-15px_rgba(28,25,23,0.16)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.65)] z-50 pointer-events-auto"
            >
              <div className="w-full max-w-[1440px] mx-auto px-8 pt-7 pb-6">
                <InKindMegaMenu onNavigate={() => setOpenMegaMenu(null)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated Desktop Mega Menu for "About Us" - Full Screen Width & Rich Design */}
        <AnimatePresence>
          {isAboutMegaMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={handleAboutMouseEnter}
              onMouseLeave={handleAboutMouseLeave}
              className="hidden lg:block absolute top-full left-0 right-0 w-full bg-[#faf8f5]/98 dark:bg-stone-900/98 backdrop-blur-2xl border-b border-[#e5e2d5] dark:border-stone-800 shadow-[0_25px_60px_-15px_rgba(28,25,23,0.16)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.65)] z-50 pointer-events-auto"
            >
              <div className="w-full max-w-[1440px] mx-auto px-8 pt-7 pb-6">
                <div className="grid grid-cols-12 gap-6">
                  {/* Left Column: 3 Rich Navigation Cards (8 cols) */}
                  <div className="col-span-8 grid grid-cols-2 gap-4">
                    {/* 1. About Us */}
                    <Link
                      href="/about"
                      onClick={() => setOpenMegaMenu(null)}
                      className="group flex flex-col justify-between p-5 rounded-2xl bg-white/70 dark:bg-black/55 hover:bg-white dark:hover:bg-black/75 border border-stone-200/70 dark:border-stone-800 hover:border-[var(--ck-role-accent)]/40 dark:hover:border-[var(--ck-role-accent)]/40 transition-all duration-300 shadow-2xs hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-400/15 flex items-center justify-center text-[var(--ck-role-accent)] group-hover:scale-110 transition-transform duration-200">
                            <HeartHandshake className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-orange-500/10 text-[var(--ck-role-accent)] border border-orange-500/20">
                            Story
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-[var(--ck-role-accent)] transition-colors mb-1.5 flex items-center gap-1.5">
                          {t("nav.about")}
                        </h4>
                        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                          Our story, mission, and transparent model for direct peer-to-peer giving.
                        </p>
                      </div>
                      <div className="mt-4 flex items-center text-xs font-semibold text-[var(--ck-role-accent)] opacity-80 group-hover:opacity-100 transition-opacity">
                        <span>Read our story</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1 -translate-x-1 group-hover:translate-x-0.5 transition-transform duration-200" />
                      </div>
                    </Link>

                    {/* 2. FAQ */}
                    <Link
                      href="/faq"
                      onClick={() => setOpenMegaMenu(null)}
                      className="group flex flex-col justify-between p-5 rounded-2xl bg-white/70 dark:bg-black/55 hover:bg-white dark:hover:bg-black/75 border border-stone-200/70 dark:border-stone-800 hover:border-emerald-500/40 dark:hover:border-emerald-400/40 transition-all duration-300 shadow-2xs hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-200">
                            <HelpCircle className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            Help & Safety
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mb-1.5 flex items-center gap-1.5">
                          {t("nav.faq")}
                        </h4>
                        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                          Clear answers on item matching, verification rules, and donor safety.
                        </p>
                      </div>
                      <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity">
                        <span>Browse answers</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1 -translate-x-1 group-hover:translate-x-0.5 transition-transform duration-200" />
                      </div>
                    </Link>

                    {/* 3. Contact (Wide Card) */}
                    <Link
                      href="/contact"
                      onClick={() => setOpenMegaMenu(null)}
                      className="col-span-2 group flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-black/55 hover:bg-white dark:hover:bg-black/75 border border-stone-200/70 dark:border-stone-800 hover:border-blue-500/40 dark:hover:border-blue-400/40 transition-all duration-300 shadow-2xs hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-400/15 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform duration-200">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {t("nav.contact")}
                            </h4>
                            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                              Support
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 dark:text-stone-400">
                            Need help, partnership inquiries, or donor support? Talk directly to our team.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0 pl-4 opacity-80 group-hover:opacity-100 transition-opacity">
                        <span>Get in touch</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1 -translate-x-1 group-hover:translate-x-0.5 transition-transform duration-200" />
                      </div>
                    </Link>
                  </div>

                  {/* Right Column: Featured Direct-Giving Impact Card (4 cols) */}
                  <div className="col-span-4 relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-[#b04a15]/10 via-amber-500/5 to-stone-100/50 dark:from-orange-500/15 dark:via-stone-850 dark:to-stone-900 border border-[#b04a15]/20 dark:border-orange-500/20 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-[var(--ck-role-accent)] text-white shadow-2xs">
                          <Heart className="w-3 h-3 fill-current" />
                          100% Direct Giving
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-stone-900 dark:text-stone-100 leading-snug mb-2">
                        Giving Directly to People in Need.
                      </h4>
                      <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-4">
                        Zero platform fees on in-kind donations. Every request is vetted to ensure your generosity makes an immediate impact.
                      </p>
                    </div>

                    <Link
                      href="/requests"
                      onClick={() => setOpenMegaMenu(null)}
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[var(--ck-role-accent)] hover:brightness-110 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <span>Explore Community Needs</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Bottom Trust & Verification Footer Strip */}
                <div className="mt-6 pt-4 border-t border-[#e5e2d5]/80 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-medium">Verified Beneficiaries</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-[var(--ck-role-accent)]" />
                      <span className="font-medium">100% Free Peer Giving</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span className="font-medium">Smart AI Matching</span>
                    </div>
                  </div>
                  <Link
                    href="/about"
                    onClick={() => setOpenMegaMenu(null)}
                    className="flex items-center gap-1 font-semibold text-[var(--ck-role-accent)] hover:underline"
                  >
                    <span>Learn about CauseKind verification</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Mobile menu — StaggeredMenu (replaces the former rich side drawer).
          Nav + auth destinations become the staggered items; theme / language /
          sign-out live in the footer slot; a compact profile line is the header.
          The decorative profile-completion & latest-impact cards were dropped
          in favour of StaggeredMenu's cleaner list. ── */}
      <StaggeredMenu
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        position="right"
        accentColor={roleColors.accent}
        colors={[roleColors.highlight, roleColors.accent]}
        displayItemNumbering
        onNavigate={(link: string) => router.push(link)}
        items={[
          ...navLinks.map((l) => ({ label: l.label, link: l.href, ariaLabel: l.label, active: isActive(l.href) })),
          ...(user
            ? [
                { label: "Dashboard", link: dashHref, ariaLabel: "Go to dashboard" },
                { label: "My Profile", link: "/profile", ariaLabel: "View profile" },
              ]
            : [
                { label: t("nav.logIn"), link: "/login", ariaLabel: "Log in" },
                { label: t("nav.signUp"), link: "/register", ariaLabel: "Sign up" },
              ]),
        ]}
        header={
          user ? (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden border border-stone-200 dark:border-zinc-800 shrink-0">
                {avatarDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarDataUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[var(--ck-role-accent)]/10 flex items-center justify-center text-lg font-black text-[var(--ck-role-accent)] uppercase">
                    {user.email[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-850 dark:text-white truncate">
                  {profile?.fullName || user.email.split("@")[0]}
                </p>
                <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                  {(roleLabel[user.role] ?? user.role)} · {livesTouched} lives touched
                </p>
              </div>
            </div>
          ) : null
        }
        footer={
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-3xs font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">Theme</span>
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="relative flex items-center justify-center w-9 h-9 rounded-full border border-[#e5e2d5] dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-[#f0eee6] dark:hover:bg-zinc-800 transition-all active:scale-95"
              >
                <Sun className={`w-3.5 h-3.5 absolute text-amber-500 transition-all duration-500 ${theme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"}`} />
                <Moon className={`w-3.5 h-3.5 absolute text-stone-600 dark:text-stone-400 transition-all duration-500 ${theme === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-3xs font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">Language</span>
              <LanguageSwitcher dropUp />
            </div>
            {user && (
              <button
                onClick={() => { setIsSidebarOpen(false); requestLogout(); }}
                className="flex items-center justify-center gap-2 text-stone-500 hover:text-stone-850 dark:text-stone-400 dark:hover:text-white text-sm font-semibold transition-all py-2.5 w-full border-t border-stone-200/60 dark:border-zinc-800 mt-1"
              >
                <LogOut className="w-4 h-4" /> {t("nav.signOut")}
              </button>
            )}
          </div>
        }
      />
    </>
  );
}

export function SiteFooter() {
  const t = useTranslations("footer");
  const pathname = usePathname();
  const { user } = useAuth();
  const isWizard =
    pathname === "/items/new" ||
    (pathname?.startsWith("/items/") && pathname?.endsWith("/edit")) ||
    (pathname?.startsWith("/requests/") && pathname?.endsWith("/offer")) ||
    pathname === "/donations/offer";

  if (
    pathname?.startsWith("/super-admin") ||
    pathname?.startsWith("/admin/dashboard") ||
    isWizard ||
    user?.role === "SUPER_ADMIN"
  ) return null;
  const giveBackLinks = [
    ...(FEATURES.money ? [{ href: "/campaigns", l: t("moneyDrives") }] : []),
    ...(user ? [{ href: "/requests", l: t("inkindRequests") }] : []),
  ];
  return (
    <footer className="bg-[#120c04] text-stone-250 border-t border-stone-850" id="footer">
      {/* items-start stops the short columns stretching; the row-span on Get
          support (below) is what actually compacts this on mobile. */}
      <div className={`mx-auto grid max-w-7xl items-start gap-x-4 gap-y-5 sm:gap-y-6 px-4 py-6 sm:px-6 sm:py-8 text-sm grid-cols-2 ${giveBackLinks.length > 0 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        <div className="col-span-2 space-y-2 sm:space-y-2.5 md:col-span-1">
          <div className="inline-block bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl shadow-sm border border-stone-200/10 dark:border-zinc-800">
            <CareNestLogo size="md" />
          </div>
          <p className="text-stone-400 leading-relaxed font-medium">{t("tagline")}</p>
          <div className="text-stone-400 font-medium text-xs">
            <span className="text-white font-semibold">{t("contact")}:</span> +91 7719938619
          </div>
          <div className="flex gap-1.5 sm:gap-2 pt-0.5 sm:pt-1 flex-wrap">
            <span className="flex items-center gap-1 sm:gap-1.5 text-3xs sm:text-2xs bg-stone-900 border border-stone-800 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-white">
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[var(--ck-role-accent)]" /> {t("adminVerified")}
            </span>
            <span className="flex items-center gap-1 sm:gap-1.5 text-3xs sm:text-2xs bg-stone-900 border border-stone-800 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-white">
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#4a7fba]" /> {t("razorpaySecured")}
            </span>
          </div>
        </div>
        {giveBackLinks.length > 0 && (
          <div className="space-y-2 sm:space-y-2.5">
            <p className="font-semibold text-white tracking-wider uppercase text-xs">{t("giveBack")}</p>
            <ul className="space-y-1 sm:space-y-1.5 text-stone-400 font-medium">
              {giveBackLinks.map(({ href, l }) => (
                <li key={href}><Link href={href} className="hover:text-white hover:underline underline-offset-4 transition duration-200">{l}</Link></li>
              ))}
            </ul>
          </div>
        )}
        {/* Get support carries 4-5 links while Give back carries 1, so on the
            2-column mobile grid it spans two rows and Trust promise tucks into
            the cell under Give back instead of starting a third row with an
            empty cell beside it. Reverts to a normal cell from md: up, where
            all four columns sit side by side. */}
        <div className="row-span-2 md:row-span-1 space-y-2 sm:space-y-2.5">
          <p className="font-semibold text-white tracking-wider uppercase text-xs">{t("getSupport")}</p>
          <ul className="space-y-1 sm:space-y-1.5 text-stone-400 font-medium">
            {[
              { href: "/register", l: t("createAccount") },
              { href: user ? "/dashboard" : "/login", l: t("myDashboard") },
              ...(FEATURES.money ? [{ href: "/campaigns/new", l: t("startCampaign") }] : []),
              { href: "/faq", l: t("helpFaq") },
              { href: "/blog", l: t("blog") },
            ].map(({ href, l }) => (
              <li key={href}><Link href={href} className="hover:text-white hover:underline underline-offset-4 transition duration-200">{l}</Link></li>
            ))}
          </ul>
        </div>
        <div className="space-y-2 sm:space-y-2.5">
          <p className="font-semibold text-white tracking-wider uppercase text-xs">{t("trust")}</p>
          {/* items-start, not items-center: these labels wrap to two lines on a
              narrow column and a centred dot then floats beside the gap. */}
          <ul className="space-y-1 sm:space-y-1.5 text-stone-400 font-medium">
            <li className="flex items-start gap-1.5 sm:gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ck-role-accent)]" /> {t("adminVerifiedFull")}</li>
            <li className="flex items-start gap-1.5 sm:gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ck-role-accent)]" /> {t("zeroFees")}</li>
            <li className="flex items-start gap-1.5 sm:gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4a7fba]" /> {t("certificates")}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-900 py-2.5 sm:py-3 text-center text-2xs sm:text-xs text-stone-500 font-medium px-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3 gap-y-1 sm:gap-y-1.5">
          <span className="w-full sm:w-auto">
            © {new Date().getFullYear()} <span className="font-bold text-[var(--ck-role-accent)]">Cause</span><span className="font-bold text-stone-300">Kind</span>. {t("rights")}
          </span>
          <Link href="/privacy" className="font-semibold text-stone-400 transition-colors hover:text-white hover:underline underline-offset-4">
            Privacy Policy
          </Link>
          <span className="hidden h-3 w-px bg-stone-700 sm:inline-block" />
          <Link href="/terms" className="font-semibold text-stone-400 transition-colors hover:text-white hover:underline underline-offset-4">
            Terms &amp; Conditions
          </Link>
          <span className="hidden h-3 w-px bg-stone-700 sm:inline-block" />
          <Link href="/refund" className="font-semibold text-stone-400 transition-colors hover:text-white hover:underline underline-offset-4">
            Refund &amp; Cancellation Policy
          </Link>
          <span className="hidden h-3 w-px bg-stone-700 sm:inline-block" />
          <Link href="/razorpay" className="font-semibold text-stone-400 transition-colors hover:text-white hover:underline underline-offset-4">
            Razorpay Policies
          </Link>
          <span className="hidden h-3 w-px bg-stone-700 sm:inline-block" />
          <Link href="/terms#payments" className="font-semibold text-stone-400 transition-colors hover:text-white hover:underline underline-offset-4">
            Donation Policy
          </Link>
          <span className="hidden h-3 w-px bg-stone-700 sm:inline-block" />
          <Link href="/terms#campaigns" className="font-semibold text-stone-400 transition-colors hover:text-white hover:underline underline-offset-4">
            Campaign Policy (Coming Soon)
          </Link>
          <span className="hidden h-3 w-px bg-stone-700 sm:inline-block" />
          <Link href="/contact" className="font-semibold text-stone-400 transition-colors hover:text-white hover:underline underline-offset-4">
            Contact Us
          </Link>
        </div>
      </div>
    </footer>
  );
}
