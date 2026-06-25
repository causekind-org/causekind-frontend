"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Menu, X, LogIn, UserPlus, Shield, Sun, Moon, User, LayoutDashboard, LogOut, Globe, ChevronRight, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getMyProfile, getMyMatches, type UserProfile } from "@/lib/api";
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

export function CauseKindLogo({ size = "md", hideIcon = false }: { size?: "sm" | "md" | "lg"; hideIcon?: boolean }) {
  const sizes = { sm: "text-base", md: "text-xl", lg: "text-2xl" };
  const dimensions = { sm: { w: 24, h: 24 }, md: { w: 32, h: 32 }, lg: { w: 40, h: 40 } };
  return (
    <span
      className={`font-extrabold tracking-tight ${sizes[size]} flex items-center gap-2 hover:opacity-95 transition-all duration-200`}
    >
      {!hideIcon && (
        <Image
          src="/logo-outline.png"
          alt="CauseKind Logo"
          width={dimensions[size].w}
          height={dimensions[size].h}
          className="shrink-0"
        />
      )}
      <span className="flex items-center text-stone-900 dark:text-stone-100 font-extrabold text-base sm:text-xl">
        <span className="tracking-tight">Cause</span>
        <span className="text-[#b04a15] dark:text-orange-400">Kind</span>
      </span>
    </span>
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
  const [inKindCount, setInKindCount] = useState(0);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user && isSidebarOpen) {
      const savedAvatar = localStorage.getItem(`ck_profile_image_${user.email}`);
      setAvatarDataUrl(savedAvatar);

      getMyProfile()
        .then(setProfile)
        .catch(() => {});

      getMyMatches()
        .then(matches => setInKindCount(matches.length))
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

  // Super-admin command center is full-screen & self-contained — hide public chrome.
  // Hide by path AND by role so there's no flash before the redirect kicks in.
  const hideChrome =
    pathname?.startsWith("/super-admin") ||
    pathname?.startsWith("/admin/dashboard") ||
    user?.role === "SUPER_ADMIN";

  const navLinks = [
    { href: "/", label: t("nav.home") },
    ...(FEATURES.money ? [{ href: "/campaigns", label: t("nav.campaigns") }] : []),
    { href: "/requests", label: t("nav.requests") },
    { href: "/about", label: t("nav.about") },
    { href: "/blog", label: t("nav.blog") },
  ];

  /** Whether a nav link is active, keyed by href for exactness. */
  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  if (hideChrome) return null;

  // Shared icon-button class (matches the theme toggle button exactly)
  const iconBtnCls =
    "relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#e5e2d5] dark:border-zinc-800 text-stone-700 dark:text-stone-300 hover:bg-[#f0eee6] dark:hover:bg-zinc-900 transition-all duration-300 active:scale-95 overflow-hidden shadow-xs bg-white dark:bg-zinc-900";

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

      <header className="sticky top-0 z-50 w-full bg-[#faf8f5] dark:bg-zinc-950 border-b border-[#e5e2d5]/60 dark:border-stone-850/30 shadow-[0_2px_20px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_20px_rgba(0,0,0,0.35)] transition-all duration-200">
        {/* Mobile Header (lg:hidden) */}
        <div className="lg:hidden w-full flex items-center justify-between px-6 py-3 bg-[#faf8f5] dark:bg-zinc-950">
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
          <Link
            href={user ? "/profile" : "/login"}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-[#b04a15]/30 text-[#b04a15] active:scale-95 hover:bg-[#b04a15]/5 transition-all"
            aria-label="Profile"
          >
            <User className="w-4.5 h-4.5" />
          </Link>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex w-full max-w-[1440px] mx-auto items-center justify-between px-10 py-5">
          <Link href="/" className="flex items-center gap-2">
            <CareNestLogo />
          </Link>

          {/* Center navigation capsule */}
          <nav className="hidden lg:flex items-center gap-1 bg-white dark:bg-zinc-900 border border-[#e5e2d5] dark:border-stone-800 rounded-full p-1 shadow-sm">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-sm px-4 py-2 transition-all duration-200 rounded-full flex items-center gap-2 font-semibold ${active
                      ? "text-[#b04a15] dark:text-orange-400 bg-[#f0eee6] dark:bg-zinc-800 border border-[#e5e2d5] dark:border-zinc-700 shadow-2xs"
                      : "text-stone-500 hover:text-[#b04a15] dark:text-stone-400 dark:hover:text-orange-400"
                    }`}
                >
                  {active && <span className="w-2.5 h-2.5 rounded-full bg-[#f0b97a] shrink-0" />}
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <GlobalSearch />
            <SearchTrigger />
            <NotificationBell />

            {/* Sleek Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={iconBtnCls}
              aria-label={t("nav.toggleTheme")}
              suppressHydrationWarning
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
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-stone-700 dark:text-stone-300" />
            </button>

            {FEATURES.money && <Donate3DButton />}
          </div>
        </div>

        {/* ── Unified Side Drawer with 3D Animations ── */}
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
                className="fixed right-0 top-0 bottom-0 z-[9995] w-[88%] max-w-[390px] bg-gradient-to-b from-[#faf8f5] via-[#faf8f5] to-[#edf4f9] dark:from-zinc-950 dark:via-zinc-950 dark:to-[#0e1726] border-l border-[#e5e2d5]/60 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto scrollbar-hide"
              >
                {/* Close Button on top right */}
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  aria-label="Close menu"
                  className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full text-stone-450 hover:bg-[#f0eee6] dark:hover:bg-zinc-900 transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col flex-1 items-center">
                  {/* 1. Profile Block */}
                  {user && (
                    <div className="flex flex-col items-center mt-6 w-full text-center">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden border border-stone-200 dark:border-zinc-850 shadow-md">
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

                      <div className="space-y-1.5 mt-4">
                        <h3 className="text-xl font-extrabold text-stone-900 dark:text-white leading-tight">
                          {profile?.fullName || user.email.split("@")[0]}
                        </h3>
                        
                        <div className="inline-flex items-center gap-1 bg-[#b04a15]/10 dark:bg-orange-950/20 text-[#b04a15] dark:text-orange-400 text-[10px] sm:text-xs font-black px-4.5 py-1.5 rounded-full">
                          <span className="text-[10px] text-[#b04a15] dark:text-orange-400">♥</span>
                          <span>{user.role === "DONOR" ? "Community Hero" : user.role === "ADMIN" ? "Administrator" : "Community Member"}</span>
                        </div>

                        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 mt-1">
                          Lives Touched: <span className="font-extrabold text-[#b04a15] dark:text-orange-400">{inKindCount > 0 ? (inKindCount * 12 + 5) : 0}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="w-full h-px bg-stone-200/50 dark:bg-zinc-800/50 my-6" />

                  {/* 2. Menu Navigation List */}
                  <div className="w-full flex flex-col gap-2">
                    {/* Mobile Navigation Links */}
                    <div className="lg:hidden flex flex-col gap-1 w-full pb-4 border-b border-stone-200/50 dark:border-zinc-800/50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 px-1 mb-2">Navigation</span>
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`text-sm font-bold py-2.5 px-3 rounded-xl transition-all duration-200 ${
                            isActive(link.href)
                              ? "text-[#b04a15] dark:text-orange-400 bg-stone-150/40 dark:bg-zinc-900/40"
                              : "text-stone-500 dark:text-stone-400 hover:text-[#b04a15] dark:hover:text-orange-400"
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>

                    <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500 px-1 mb-2">Workspace</span>

                    {user ? (
                      <>
                        {/* Dashboard Link */}
                        <button
                          onClick={() => {
                            setIsSidebarOpen(false);
                            router.push(dashHref);
                          }}
                          className={`relative w-full flex items-center gap-3.5 py-3.5 px-2.5 rounded-xl transition-all duration-200 ${
                            isActive(dashHref)
                              ? "text-[#b04a15] dark:text-orange-400 font-extrabold"
                              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-250 font-medium"
                          }`}
                        >
                          <LayoutDashboard className={`w-5 h-5 shrink-0 ${isActive(dashHref) ? "text-[#b04a15] dark:text-orange-400" : "text-stone-400"}`} />
                          <span className="text-sm">Dashboard</span>
                          
                          {isActive(dashHref) && (
                            <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-8 text-[#b04a15] dark:text-orange-400" viewBox="0 0 10 30" fill="none">
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
                          className={`relative w-full flex items-center gap-3.5 py-3.5 px-2.5 rounded-xl transition-all duration-200 ${
                            isActive("/profile")
                              ? "text-[#b04a15] dark:text-orange-400 font-extrabold"
                              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-250 font-medium"
                          }`}
                        >
                          <User className={`w-5 h-5 shrink-0 ${isActive("/profile") ? "text-[#b04a15] dark:text-orange-400" : "text-stone-400"}`} />
                          <span className="text-sm">My Profile</span>
                          
                          {isActive("/profile") && (
                            <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-8 text-[#b04a15] dark:text-orange-400" viewBox="0 0 10 30" fill="none">
                              <path d="M2 2 C 8 8, 8 22, 2 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Log In Link */}
                        <button
                          onClick={() => {
                            setIsSidebarOpen(false);
                            router.push("/login");
                          }}
                          className={`relative w-full flex items-center gap-3.5 py-3.5 px-2.5 rounded-xl transition-all duration-200 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-250 font-medium`}
                        >
                          <LogIn className="w-5 h-5 shrink-0 text-stone-400" />
                          <span className="text-sm">{t("nav.logIn")}</span>
                        </button>

                        {/* Sign Up Link */}
                        <button
                          onClick={() => {
                            setIsSidebarOpen(false);
                            router.push("/register");
                          }}
                          className={`relative w-full flex items-center gap-3.5 py-3.5 px-2.5 rounded-xl transition-all duration-200 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-250 font-medium`}
                        >
                          <UserPlus className="w-5 h-5 shrink-0 text-stone-400" />
                          <span className="text-sm">{t("nav.signUp")}</span>
                        </button>
                      </>
                    )}

                    {/* Language Link switcher row */}
                    <div className="relative w-full flex items-center justify-between py-3.5 px-2.5">
                      <div className="flex items-center gap-3.5">
                        <Globe className="w-5 h-5 shrink-0 text-stone-400" />
                        <span className="text-sm text-stone-600 dark:text-stone-400 font-medium">Language</span>
                      </div>
                      <div onClick={e => e.stopPropagation()}>
                        <LanguageSwitcher />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Bottom Cards Section */}
                <div className="w-full mt-8 space-y-5">
                  {/* Daily Kindness Goal Card */}
                  {user && (
                    <div className="bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xs rounded-3xl p-4 flex items-center justify-between border border-stone-200/60 dark:border-zinc-800 shadow-xs">
                      <div>
                        <p className="text-xs font-black text-stone-800 dark:text-stone-250">Daily Kindness Goal</p>
                        <p className="text-[10px] text-stone-400 dark:text-stone-500 font-bold mt-1">80% complete</p>
                      </div>
                      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" className="text-stone-100 dark:text-zinc-800" fill="transparent" />
                          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" className="text-[#b04a15]" strokeDasharray="125.6" strokeDashoffset="25.12" fill="transparent" strokeLinecap="round" />
                        </svg>
                        <Heart className="absolute w-4 h-4 text-[#b04a15] fill-[#b04a15]" />
                      </div>
                    </div>
                  )}

                  {/* Latest Impact Card */}
                  {user && (
                    <div className="flex items-start gap-3 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/30 dark:border-emerald-900/20 rounded-2xl p-4">
                      <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">Latest Impact</p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold leading-relaxed mt-1">
                          {user.role === "DONOR"
                            ? "You helped 3 families yesterday with essential supplies."
                            : "Your request was matched with a donor in your neighborhood!"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Footer Signout and Mobile Theme Toggle */}
                  <div className="border-t border-[#e5e2d5]/60 dark:border-zinc-800/80 pt-4 space-y-4">
                    {/* Mobile Theme switcher */}
                    <div className="lg:hidden flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">Theme</span>
                      <button
                        onClick={toggleTheme}
                        className="relative flex items-center justify-center w-9 h-9 rounded-full border border-[#e5e2d5] dark:border-zinc-800 text-stone-750 dark:text-stone-300 hover:bg-[#f0eee6] dark:hover:bg-zinc-900 transition-all active:scale-95 bg-white dark:bg-zinc-900"
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
                        className="flex items-center justify-center gap-2 text-stone-500 hover:text-red-500 dark:text-stone-400 dark:hover:text-red-400 text-sm font-semibold transition-all py-3 w-full"
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
      </header>
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
              { href: "/dashboard", l: t("myDashboard") },
              ...(FEATURES.money ? [{ href: "/campaigns/new", l: t("startCampaign") }] : []),
              { href: "/help", l: t("helpFaq") },
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
          <Link href="/privacy#contact" className="font-semibold text-stone-400 transition-colors hover:text-white hover:underline underline-offset-4">
            Contact Us
          </Link>
        </div>
      </div>
    </footer>
  );
}
