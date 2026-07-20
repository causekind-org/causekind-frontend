"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { LogoVideo } from "@/components/LogoVideo";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Menu, X, LogIn, UserPlus, Shield, Sun, Moon, User, LayoutGrid, LogOut, Globe, ChevronRight, ChevronDown, Heart, HandHeart, Compass } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTilt } from "@/hooks/useTilt";
import { getMyProfile, getMyMatches, type UserProfile, type ItemMatch } from "@/lib/api";
import { FEATURES } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch, SearchTrigger } from "@/components/GlobalSearch";
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
            className="absolute z-50 text-[11px] text-orange-300 pointer-events-none select-none"
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
          className="donate-navbar-3d relative bg-[#b04a15] text-white font-bold px-[18px] py-[6px] rounded-full text-xs sm:text-sm"
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
      className={`relative group rounded-2xl border border-stone-200 dark:border-zinc-800/80 p-4 transition-all duration-200 cursor-pointer bg-white dark:bg-zinc-900/60 hover:bg-[#b04a15]/5 dark:hover:bg-orange-950/10 hover:border-[#b04a15]/30 dark:hover:border-orange-500/20 shadow-xs ${className}`}
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
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  // Elevate-on-scroll: flat at the top of the page, soft shadow fades in once
  // content scrolls beneath the bar (same pattern as the admin panel header).
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
    if (isSidebarOpen) {
      html.classList.add("mobile-menu-open");
      body.classList.add("mobile-menu-open");
    } else {
      html.classList.remove("mobile-menu-open");
      body.classList.remove("mobile-menu-open");
    }
    window.dispatchEvent(new CustomEvent("ck-mobile-menu-toggle", { detail: { open: isSidebarOpen } }));
    return () => {
      html.classList.remove("mobile-menu-open");
      body.classList.remove("mobile-menu-open");
    };
  }, [isSidebarOpen]);

  const toggleTheme = () => setTheme(prev => (prev === "light" ? "dark" : "light"));

  const dashHref = user?.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";

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
              className="bg-[#b04a15] hover:bg-[#963c0d] text-white border-0"
            >
              {t("logout.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className={`sticky top-0 z-50 w-full bg-[#faf8f5]/75 dark:bg-zinc-950/75 backdrop-blur-md border-b border-[#e5e2d5]/60 dark:border-stone-850/30 transition-shadow duration-300 ease-out ${
        scrolled
          ? "shadow-[0_10px_30px_-8px_rgba(28,25,23,0.18)] dark:shadow-[0_10px_30px_-8px_rgba(0,0,0,0.55)]"
          : "shadow-[0_6px_18px_-6px_rgba(28,25,23,0.10)] dark:shadow-[0_6px_18px_-6px_rgba(0,0,0,0.40)]"
      }`}>
        {/* Mobile Header (lg:hidden) */}
        <div className="lg:hidden w-full flex items-center justify-between px-6 py-3 bg-transparent">
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
            className="flex items-center justify-center w-8 h-8 rounded-full text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="flex items-center justify-center">
            <CareNestLogo size="md" hideIcon={true} />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
              href={user ? "/profile" : "/login"}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-[#b04a15]/30 text-[#b04a15] active:scale-95 hover:bg-[#b04a15]/5 transition-all"
              aria-label="Profile"
            >
              <User className="w-4.5 h-4.5" />
            </Link>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex w-full max-w-[1440px] mx-auto items-center justify-between px-10 py-5">
          <Link href="/" className="flex items-center gap-2">
            <CareNestLogo />
          </Link>

          {/* Center navigation capsule */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/55 dark:bg-zinc-900/55 backdrop-blur-xl border border-white/60 dark:border-white/10 ring-1 ring-[#e5e2d5]/50 dark:ring-stone-800/60 rounded-full p-1 shadow-[0_4px_20px_-6px_rgba(28,25,23,0.12),inset_0_1px_0_rgba(255,255,255,0.55)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]">
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
                  <DropdownMenu key="about-dropdown">
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`group relative text-sm px-4 py-2 transition-colors duration-300 rounded-full flex items-center gap-1.5 font-semibold outline-none ${groupActive
                            ? "text-[#b04a15] dark:text-orange-400"
                            : "text-stone-500 hover:text-[#b04a15] dark:text-stone-400 dark:hover:text-orange-400"
                          }`}
                      >
                        {groupActive && (
                          <motion.span
                            layoutId="nav-glass-pill"
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            className="glass-pill absolute inset-0 rounded-full"
                          />
                        )}
                        {groupActive && <span className="relative z-10 w-2.5 h-2.5 rounded-full bg-[#f0b97a] shrink-0" />}
                        <span className="relative z-10">{triggerLabel}</span>
                        <ChevronDown className="relative z-10 w-3.5 h-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="min-w-[11rem]">
                      {aboutMenuItems.map((item) => (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link
                            href={item.href}
                            className={isActive(item.href) ? "text-[#b04a15] dark:text-orange-400" : ""}
                          >
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              const active = isActive(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  data-tour={link.href === "/requests" ? "nav-requests" : undefined}
                  className={`relative text-sm px-4 py-2 transition-colors duration-300 rounded-full flex items-center gap-2 font-semibold ${active
                      ? "text-[#b04a15] dark:text-orange-400"
                      : "text-stone-500 hover:text-[#b04a15] dark:text-stone-400 dark:hover:text-orange-400"
                    }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-glass-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="glass-pill absolute inset-0 rounded-full"
                    />
                  )}
                  {active && <span className="relative z-10 w-2.5 h-2.5 rounded-full bg-[#f0b97a] shrink-0" />}
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
          </div>
        </div>

      </header>

      {/* ── Unified Side Drawer — outside <header> to avoid backdrop-filter stacking context clipping ── */}
      <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 z-[9990] bg-stone-950/40 dark:bg-black/60 backdrop-blur-xs"
              />

              {/* Sidebar Container */}
              <motion.div
                initial={{ x: "100%", rotateY: 15, opacity: 0.9, transformOrigin: "right center" }}
                animate={{ x: 0, rotateY: 0, opacity: 1 }}
                exit={{ x: "100%", rotateY: 15, opacity: 0.9 }}
                transition={{ type: "spring", damping: 26, stiffness: 210 }}
                style={{ perspective: "1200px" }}
                className="fixed right-0 top-0 bottom-0 z-[9995] w-[88%] max-w-[390px] bg-gradient-to-b from-[#f0f6fa] via-[#faf8f5] to-[#edf4f9] dark:from-zinc-950 dark:via-zinc-950 dark:to-[#0e1726] border-l border-[#e5e2d5]/40 dark:border-zinc-850 shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto scrollbar-hide"
              >
                {/* Close Button on top right */}
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  aria-label="Close menu"
                  className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full text-stone-400 hover:bg-[#f0eee6] dark:hover:bg-zinc-900 transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col flex-1 items-center w-full">
                  {/* 1. Profile Block */}
                  {user && (
                    <div className="flex flex-col items-center mt-6 w-full text-center">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden border border-stone-200 dark:border-zinc-800 shadow-md">
                          {avatarDataUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={avatarDataUrl}
                              alt="Profile Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#b04a15]/10 flex items-center justify-center text-2xl font-black text-[#b04a15] dark:text-orange-400 uppercase">
                              {user.email[0]}
                            </div>
                          )}
                        </div>
                        {/* Green checkmark badge */}
                        <div className="absolute bottom-0 right-1 w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 flex items-center justify-center shadow-xs">
                          <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mt-4 flex flex-col items-center">
                        <h3 className="text-xl font-bold text-stone-850 dark:text-white leading-tight">
                          {profile?.fullName || user.email.split("@")[0]}
                        </h3>
                        
                        <div className="inline-flex items-center gap-1 bg-[#fbeee9] dark:bg-orange-950/20 text-[#8d4332] dark:text-orange-400 text-xs font-bold px-3 py-1 rounded-full">
                          <Heart className="w-3 h-3 fill-current text-[#8d4332] dark:text-orange-400 shrink-0" />
                          <span>{roleLabel[user.role] ?? user.role}</span>
                        </div>

                        <p className="text-[14px] sm:text-base font-semibold text-stone-500 dark:text-stone-400 mt-2">
                          Lives Touched: <span className="font-bold text-[#b04a15] dark:text-orange-400">{livesTouched}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Spacer between profile and nav links */}
                  <div className="w-full mt-10" />

                  {/* 2. Menu Navigation List */}
                  <div className="w-full flex flex-col gap-6">
                    {/* Mobile Navigation Links */}
                    <div className="lg:hidden flex flex-col gap-2 w-full pb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 px-1 mb-1">Navigation</span>
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`text-sm font-bold py-2 px-1 rounded-xl transition-all duration-200 ${
                            isActive(link.href)
                              ? "text-[#b04a15] dark:text-orange-400"
                              : "text-stone-500 dark:text-stone-400 hover:text-[#b04a15] dark:hover:text-orange-400"
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>

                    <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 px-1">Workspace</span>

                    {user ? (
                      <>
                        {/* Dashboard Link */}
                        <button
                          onClick={() => {
                            setIsSidebarOpen(false);
                            router.push(dashHref);
                          }}
                          className={`group relative w-full flex items-center gap-3.5 py-2.5 px-3 rounded-xl overflow-hidden transition-all duration-200 bg-transparent ${
                            isActive(dashHref)
                              ? "text-[#b04a15] dark:text-orange-400 font-bold"
                              : "text-stone-500 dark:text-stone-400 hover:text-stone-850 dark:hover:text-white font-medium"
                          }`}
                        >
                          {/* Slide-in background */}
                          <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#b04a15]/10 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />
                          <LayoutGrid className={`relative z-10 w-5.5 h-5.5 shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:text-[#b04a15] dark:group-hover:text-orange-400 ${isActive(dashHref) ? "text-[#b04a15] dark:text-orange-400" : "text-stone-400"}`} />
                          <span className="relative z-10 text-[15px] transition-transform duration-200 group-hover:translate-x-0.5">Dashboard</span>
                          {!isActive(dashHref) && (
                            <ChevronRight className="relative z-10 ml-auto w-3.5 h-3.5 text-[#b04a15] dark:text-orange-400 opacity-0 translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                          )}
                          {isActive(dashHref) && (
                            <svg className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-8 text-[#b04a15] dark:text-orange-400" viewBox="0 0 10 30" fill="none">
                              <path d="M2 2 C 8 8, 8 22, 2 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                          )}
                        </button>

                        {/* My Profile Link */}
                        <button
                          onClick={() => {
                            setIsSidebarOpen(false);
                            router.push("/profile");
                          }}
                          className={`group relative w-full flex items-center gap-3.5 py-2.5 px-3 rounded-xl overflow-hidden transition-all duration-200 bg-transparent ${
                            isActive("/profile")
                              ? "text-[#b04a15] dark:text-orange-400 font-bold"
                              : "text-stone-500 dark:text-stone-400 hover:text-stone-850 dark:hover:text-white font-medium"
                          }`}
                        >
                          {/* Slide-in background */}
                          <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#b04a15]/10 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />
                          <User className={`relative z-10 w-5.5 h-5.5 shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:text-[#b04a15] dark:group-hover:text-orange-400 ${isActive("/profile") ? "text-[#b04a15] dark:text-orange-400" : "text-stone-400"}`} />
                          <span className="relative z-10 text-[15px] transition-transform duration-200 group-hover:translate-x-0.5">My Profile</span>
                          {!isActive("/profile") && (
                            <ChevronRight className="relative z-10 ml-auto w-3.5 h-3.5 text-[#b04a15] dark:text-orange-400 opacity-0 translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                          )}
                          {isActive("/profile") && (
                            <svg className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-8 text-[#b04a15] dark:text-orange-400" viewBox="0 0 10 30" fill="none">
                              <path d="M2 2 C 8 8, 8 22, 2 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                          )}
                        </button>

                        {/* Take the tour again — replays the first-time guided tour */}
                        {(user.role === "DONOR" || user.role === "DONEE") && (
                          <button
                            onClick={() => {
                              setIsSidebarOpen(false);
                              setTimeout(() => window.dispatchEvent(new Event("ck-start-tour")), 350);
                            }}
                            className="group relative w-full flex items-center gap-3.5 py-2.5 px-3 rounded-xl overflow-hidden transition-all duration-200 bg-transparent text-stone-500 dark:text-stone-400 hover:text-stone-850 dark:hover:text-white font-medium"
                          >
                            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#b04a15]/10 to-transparent -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out pointer-events-none" />
                            <Compass className="relative z-10 w-5.5 h-5.5 shrink-0 text-stone-400 transition-all duration-200 group-hover:scale-110 group-hover:text-[#b04a15] dark:group-hover:text-orange-400" />
                            <span className="relative z-10 text-[15px] transition-transform duration-200 group-hover:translate-x-0.5">Take the tour</span>
                            <ChevronRight className="relative z-10 ml-auto w-3.5 h-3.5 text-[#b04a15] dark:text-orange-400 opacity-0 translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Log In */}
                        <button
                          onClick={() => { setIsSidebarOpen(false); router.push("/login"); }}
                          className="group relative w-full flex items-center gap-3.5 py-3 px-3 rounded-2xl transition-all duration-200 hover:bg-stone-100 dark:hover:bg-zinc-800/70 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white font-semibold overflow-hidden"
                        >
                          {/* left accent bar that grows in on hover */}
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#b04a15] scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-center" />
                          <span className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-[#b04a15]/10 transition-colors duration-200">
                            <LogIn className="w-4.5 h-4.5 text-stone-400 group-hover:text-[#b04a15] group-hover:translate-x-0.5 transition-all duration-200" />
                          </span>
                          <span className="text-[15px] group-hover:translate-x-0.5 transition-transform duration-200">{t("nav.logIn")}</span>
                          <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 text-[#b04a15] -translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
                        </button>

                        {/* Sign Up */}
                        <button
                          onClick={() => { setIsSidebarOpen(false); router.push("/register"); }}
                          className="group relative w-full flex items-center gap-3.5 py-3 px-3 rounded-2xl overflow-hidden font-bold text-white transition-all duration-200 active:scale-[0.98]"
                          style={{ background: "linear-gradient(135deg, #b04a15 0%, #e07b3a 100%)", boxShadow: "0 4px 14px rgba(176,74,21,0.35)" }}
                        >
                          {/* shimmer sweep on hover */}
                          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 ease-in-out pointer-events-none" />
                          <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition-colors duration-200">
                            <UserPlus className="w-4.5 h-4.5 text-white" />
                          </span>
                          <span className="text-[15px] relative z-10">{t("nav.signUp")}</span>
                          <ChevronRight className="w-4 h-4 ml-auto relative z-10 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                        </button>
                      </>
                    )}

                    {/* Language Switcher row */}
                    <div className="relative w-full flex items-center justify-between py-2 px-1">
                      <div className="flex items-center gap-3.5">
                        <Globe className="w-5.5 h-5.5 shrink-0 text-stone-400" />
                        <span className="text-[15px] text-stone-500 dark:text-stone-400 font-medium">Language</span>
                      </div>
                      <div onClick={e => e.stopPropagation()}>
                        <LanguageSwitcher />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Bottom Cards Section */}
                <div className="w-full mt-8 space-y-6">
                  {/* Daily Kindness Goal Card */}
                  {user && (
                    <div className="bg-[#eaeaea]/45 dark:bg-zinc-900/50 rounded-[24px] p-5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-[13px] font-bold text-stone-800 dark:text-stone-200">Profile Completion</p>
                          <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 font-semibold mt-1">{profileCompletion}% complete</p>
                          {missingProfileFields.length > 0 && (
                            <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
                              Missing: {missingProfileFields.join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" className="text-stone-250/20 dark:text-zinc-800/40" fill="transparent" />
                            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3.5" className="text-[#b04a15]" strokeDasharray="125.6" strokeDashoffset={125.6 * (1 - profileCompletion / 100)} fill="transparent" strokeLinecap="round" />
                          </svg>
                          <Heart className="absolute w-3.5 h-3.5 text-[#b04a15] fill-[#b04a15]" />
                        </div>
                      </div>
                      {profileCompletion < 100 && (
                        <button
                          onClick={() => { setIsSidebarOpen(false); router.push("/profile"); }}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#b04a15] dark:text-orange-400 bg-[#b04a15]/8 dark:bg-orange-950/20 hover:bg-[#b04a15]/15 dark:hover:bg-orange-950/40 rounded-xl py-2 transition-colors duration-200"
                        >
                          Complete Profile
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Latest Impact Card */}
                  {user && (
                    <div className="flex items-start gap-3.5 mt-6 px-1">
                      <div className="h-9 w-9 rounded-full bg-[#e3efe9] dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <HandHeart className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-[13px] font-bold text-[#1b8a5a] dark:text-emerald-400">Latest Impact</p>
                        <p className="text-xs sm:text-[13px] text-stone-550 dark:text-stone-400 font-medium leading-relaxed mt-1">
                          {impactText}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Footer Signout and Mobile Theme Toggle */}
                  <div className="pt-2 space-y-4">
                    {/* Mobile Theme switcher */}
                    <div className="lg:hidden flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">Theme</span>
                      <button
                        onClick={toggleTheme}
                        className="relative flex items-center justify-center w-9 h-9 rounded-full border border-[#e5e2d5] dark:border-zinc-800 text-stone-755 dark:text-stone-300 hover:bg-[#f0eee6] dark:hover:bg-zinc-900 transition-all active:scale-95 bg-white dark:bg-zinc-900"
                        aria-label="Toggle theme"
                      >
                        <div className="relative w-4 h-4 flex items-center justify-center">
                          <Sun className={`w-3.5 h-3.5 absolute text-amber-500 transition-all duration-500 transform ${theme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"}`} />
                          <Moon className={`w-3.5 h-3.5 absolute text-stone-600 dark:text-stone-400 transition-all duration-500 transform ${theme === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`} />
                        </div>
                      </button>
                    </div>

                    {user && (
                      <button
                        onClick={() => { setIsSidebarOpen(false); requestLogout(); }}
                        className="flex items-center justify-center gap-2 text-stone-500 hover:text-stone-850 dark:text-stone-400 dark:hover:text-white text-sm font-semibold transition-all py-3 w-full"
                      >
                        <LogOut className="w-4 h-4 shrink-0" /> {t("nav.signOut")}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
      </AnimatePresence>
    </>
  );
}

export function SiteFooter() {
  const t = useTranslations("footer");
  const pathname = usePathname();
  const { user } = useAuth();
  if (
    pathname?.startsWith("/super-admin") ||
    pathname?.startsWith("/admin/dashboard") ||
    user?.role === "SUPER_ADMIN"
  ) return null;
  return (
    <footer className="bg-[#120c04] text-stone-250 border-t border-stone-850" id="footer">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 text-sm sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-4">
          <div className="inline-block bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-2xl shadow-sm border border-stone-200/10 dark:border-zinc-800">
            <CareNestLogo size="lg" />
          </div>
          <p className="text-stone-400 leading-relaxed font-medium">{t("tagline")}</p>
          <div className="text-stone-400 font-medium text-xs">
            <span className="text-white font-semibold">{t("contact")}:</span> +91 7719938619
          </div>
          <div className="flex gap-3 pt-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-full text-white">
              <Shield className="h-3.5 w-3.5 text-[#b04a15]" /> {t("adminVerified")}
            </span>
            <span className="flex items-center gap-1.5 text-xs bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-full text-white">
              <Shield className="h-3.5 w-3.5 text-[#4a7fba]" /> {t("razorpaySecured")}
            </span>
          </div>
        </div>
        <div className="space-y-4">
          <p className="font-semibold text-white tracking-wider uppercase text-xs">{t("giveBack")}</p>
          <ul className="space-y-3 text-stone-400 font-medium">
            {[
              ...(FEATURES.money ? [{ href: "/campaigns", l: t("moneyDrives") }] : []),
              { href: "/requests", l: t("inkindRequests") },
            ].map(({ href, l }) => (
              <li key={href}><Link href={href} className="hover:text-white hover:underline underline-offset-4 transition duration-200">{l}</Link></li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <p className="font-semibold text-white tracking-wider uppercase text-xs">{t("getSupport")}</p>
          <ul className="space-y-3 text-stone-400 font-medium">
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
        <div className="space-y-4">
          <p className="font-semibold text-white tracking-wider uppercase text-xs">{t("trust")}</p>
          <ul className="space-y-3 text-stone-400 font-medium">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#b04a15]" /> {t("adminVerifiedFull")}</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#b04a15]" /> {t("zeroFees")}</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#4a7fba]" /> {t("certificates")}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-900 py-6 text-center text-xs text-stone-500 font-medium px-4">
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-3">
          <span className="w-full sm:w-auto mb-2 sm:mb-0">
            © {new Date().getFullYear()} <span className="font-bold text-[#b04a15]">Cause</span><span className="font-bold text-stone-300">Kind</span>. {t("rights")}
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
