"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Menu, X, LogIn, UserPlus, Shield, Sun, Moon, User, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
  return (
    <span
      className={`font-extrabold tracking-tight ${sizes[size]} flex items-center gap-2 hover:opacity-95 transition-all duration-200`}
    >
      {!hideIcon && (
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 sm:h-8 sm:w-8 text-[#b04a15] dark:text-orange-400 shrink-0" xmlns="http://www.w3.org/2000/svg">
          {/* Heart/hands outer cradle */}
          <path d="M12 21.5C7.5 18 4.5 14.5 4.5 10.5C4.5 7.5 6.5 5.5 9.5 5.5C10.8 5.5 11.6 6 12 6.5C12.4 6 13.2 5.5 14.5 5.5C17.5 5.5 19.5 7.5 19.5 10.5C19.5 14.5 16.5 18 12 21.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          {/* Plant sprout */}
          <path d="M12 18V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 12C12 12 9.5 11 9 9.5C8.5 8 9.5 7 11 8.5C12 9.5 12 11 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
          <path d="M12 14C12 14 14.5 13 15 11.5C15.5 10 14.5 9 13 10.5C12 11.5 12 13 12 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
        </svg>
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
      x: ((e.clientY - rect.top  - rect.height / 2) / (rect.height / 2)) * -14,
      y: ((e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2)) *  14,
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

export function SiteHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

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
    if (open) {
      html.classList.add("mobile-menu-open");
      body.classList.add("mobile-menu-open");
    } else {
      html.classList.remove("mobile-menu-open");
      body.classList.remove("mobile-menu-open");
    }
    window.dispatchEvent(new CustomEvent("ck-mobile-menu-toggle", { detail: { open } }));
    return () => {
      html.classList.remove("mobile-menu-open");
      body.classList.remove("mobile-menu-open");
    };
  }, [open]);

  const toggleTheme = () => setTheme(prev => (prev === "light" ? "dark" : "light"));

  const dashHref = user?.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";

  /** Opens the confirmation dialog — actual logout happens only on confirm. */
  function requestLogout() { setLogoutDialogOpen(true); }

  /** Called by the AlertDialogAction (confirm button). */
  function confirmLogout() {
    logout();
    router.push("/");
    setOpen(false);
  }

  const t = useTranslations();

  const navLinks = [
    { href: "/",          label: t("nav.home") },
    { href: "/campaigns", label: t("nav.campaigns") },
    { href: "/requests",  label: t("nav.requests") },
    { href: "/items",     label: t("nav.listings") },
  ];

  /** Whether a nav link is active, keyed by href for exactness. */
  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

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

      <header className="sticky top-0 z-50 w-full bg-[#faf8f5] dark:bg-zinc-950 border-b border-[#e5e2d5]/60 dark:border-stone-850/30 transition-all duration-200">
        {/* Mobile Header (lg:hidden) */}
        <div className="lg:hidden w-full flex items-center justify-between px-6 py-3 bg-[#faf8f5] dark:bg-zinc-950 border-b border-[#e5e2d5]/60 dark:border-stone-850/30">
          <button
            onClick={() => setOpen(true)}
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
                  className={`text-sm px-4 py-2 transition-all duration-200 rounded-full flex items-center gap-2 font-semibold ${
                    active
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
            {/* Animated Sleek Theme Toggle */}
            <LanguageSwitcher />

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

            {user ? (
              <div className="hidden sm:flex items-center gap-3">
                <Link href={dashHref} className="text-sm font-semibold text-stone-600 hover:text-[#b04a15] dark:text-stone-405 dark:hover:text-orange-400 transition-colors">
                  {t("nav.dashboard")}
                </Link>
                <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
                <Link href="/profile" className="text-sm font-semibold text-stone-600 hover:text-[#b04a15] dark:text-stone-405 dark:hover:text-orange-400 transition-colors">
                  {t("nav.profile")}
                </Link>
                <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
                <span className="text-sm font-semibold text-[#b04a15] dark:text-orange-400 max-w-[120px] truncate" title={user.email}>
                  {user.email.split("@")[0]}
                </span>
                <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
                <button
                  onClick={requestLogout}
                  className="text-sm font-semibold text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400 transition-colors"
                >
                  {t("nav.signOut")}
                </button>
                <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
                <Donate3DButton />
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-4">
                <Link href="/login" className="text-sm font-semibold text-stone-600 hover:text-[#b04a15] dark:text-stone-400 dark:hover:text-orange-400 transition-colors">
                  {t("nav.logIn")}
                </Link>
                <Link href="/register" className="text-sm font-semibold text-stone-600 hover:text-[#b04a15] dark:text-stone-400 dark:hover:text-orange-400 transition-colors">
                  {t("nav.signUp")}
                </Link>
                <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
                <Donate3DButton />
              </div>
            )}
          </div>
        </div>

        {/* Mobile overlay */}
        <div className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-xs" />
        </div>

        {/* Mobile drawer */}
        <div className={`lg:hidden fixed top-0 right-0 bottom-0 z-50 w-[85%] max-w-sm bg-[#faf8f5] dark:bg-zinc-950 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex flex-col h-full p-6">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#e5e2d5]/60 dark:border-stone-850/30">
              <Link href="/" onClick={() => setOpen(false)}>
                <CareNestLogo size="md" />
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex items-center justify-center w-9 h-9 rounded-full text-stone-750 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation links */}
            <div className="flex flex-col gap-1 py-4 overflow-y-auto flex-1">
              {navLinks.map((link, i) => (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                  className={`text-xl font-bold py-3 px-2 rounded-xl transition-all duration-200 ${
                    isActive(link.href)
                      ? "text-[#b04a15] dark:text-orange-400 bg-[#f0eee6]/50 dark:bg-zinc-900"
                      : "text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-zinc-900/40"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Divider & Preferences */}
            <div className="border-t border-[#e5e2d5]/60 dark:border-stone-850/30 pt-4 mt-auto space-y-4">
              {/* Preferences */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Preferences</span>
                <div className="flex items-center gap-2">
                  <LanguageSwitcher />
                  <button
                    onClick={toggleTheme}
                    className="relative flex items-center justify-center w-8 h-8 rounded-full border border-[#e5e2d5] dark:border-zinc-800 text-stone-750 dark:text-stone-300 hover:bg-[#f0eee6] dark:hover:bg-zinc-900 transition-all active:scale-95 bg-white dark:bg-zinc-900"
                    aria-label="Toggle theme"
                  >
                    <div className="relative w-4 h-4 flex items-center justify-center">
                      <Sun className={`w-3.5 h-3.5 absolute text-amber-500 transition-all duration-500 transform ${theme === "dark" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"}`} />
                      <Moon className={`w-3.5 h-3.5 absolute text-stone-600 dark:text-stone-400 transition-all duration-500 transform ${theme === "light" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`} />
                    </div>
                  </button>
                </div>
              </div>

              {/* Profile or Auth actions */}
              <div className="flex flex-col gap-2 pt-2">
                {user ? (
                  <>
                    <div className="text-xs font-bold text-stone-400 truncate mb-1 px-1">{user.email}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href={dashHref} onClick={() => setOpen(false)} className="flex items-center justify-center gap-1 text-xs font-bold py-2 border rounded-xl bg-white dark:bg-zinc-900 text-stone-750 dark:text-stone-200 hover:bg-stone-50"><Shield className="w-3.5 h-3.5" /> Dashboard</Link>
                      <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1 text-xs font-bold py-2 border rounded-xl bg-white dark:bg-zinc-900 text-stone-750 dark:text-stone-200 hover:bg-stone-50"><User className="w-3.5 h-3.5" /> Profile</Link>
                    </div>
                    <button
                      onClick={() => { setOpen(false); requestLogout(); }}
                      className="flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 w-full"
                    >
                      <LogOut className="w-3.5 h-3.5" /> {t("nav.signOut")}
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/login" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1 text-xs font-bold py-2.5 border rounded-xl bg-white dark:bg-zinc-900 text-stone-750 dark:text-stone-250 hover:bg-stone-50"><LogIn className="w-3.5 h-3.5" /> {t("nav.logIn")}</Link>
                    <Link href="/register" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1 text-xs font-bold py-2.5 border rounded-xl bg-[#b04a15] text-white hover:bg-[#963c0d]"><UserPlus className="w-3.5 h-3.5" /> {t("nav.signUp")}</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  const t = useTranslations("footer");
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
              { href: "/campaigns", l: t("moneyDrives") },
              { href: "/items",     l: t("itemListings") },
              { href: "/requests",  l: t("inkindRequests") },
            ].map(({ href, l }) => (
              <li key={href}><Link href={href} className="hover:text-white hover:underline underline-offset-4 transition duration-200">{l}</Link></li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <p className="font-semibold text-white tracking-wider uppercase text-xs">{t("getSupport")}</p>
          <ul className="space-y-3 text-stone-400 font-medium">
            {[
              { href: "/register",       l: t("createAccount") },
              { href: "/dashboard",      l: t("myDashboard") },
              { href: "/campaigns/new",  l: t("startCampaign") },
              { href: "/help",           l: t("helpFaq") },
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
      <div className="border-t border-stone-900 py-6 text-center text-xs text-stone-500 font-medium">
        © {new Date().getFullYear()} <span className="font-bold text-[#b04a15]">Cause</span><span className="font-bold text-stone-300">Kind</span>. {t("rights")}
      </div>
    </footer>
  );
}
