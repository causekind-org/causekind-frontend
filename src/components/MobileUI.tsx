"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Megaphone, ClipboardList, User, MessageCircle, X, Mail, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";

/* ─── Mobile bottom nav ─────────────────────────────────────────── */
export function MobileBottomNav() {
  const t = useTranslations("mobileNav");
  const pathname = usePathname();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const dashHref = user?.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";

  const tabs = [
    { href: "/",          icon: Home,          label: t("home") },
    { href: "/campaigns", icon: Megaphone,     label: t("campaigns") },
    { href: "/requests",  icon: ClipboardList, label: t("requests") },
    { href: user ? "/profile" : "/login", icon: User, label: t("profile") },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/profile" || href === "/dashboard" || href === "/admin/dashboard") {
      return pathname.startsWith("/profile") || pathname.startsWith("/dashboard") || pathname.startsWith("/admin/dashboard");
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={`fixed z-50 lg:hidden transition-all duration-300 ease-in-out
        ${scrolled
          ? "left-4 right-4 rounded-[2rem] border border-stone-200/70 dark:border-zinc-700/60 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl backdrop-saturate-200 shadow-xl py-2"
          : "left-0 right-0 border-t border-[#e5e2d5] dark:border-zinc-800 bg-[#faf8f3] dark:bg-zinc-950 pb-safe-bottom pt-2 pb-3 shadow-md"
        }`}
      style={{
        bottom: scrolled ? "calc(1rem + env(safe-area-inset-bottom, 0px))" : "0px",
      }}
      aria-label={t("mobileNavAriaLabel")}
    >
      <div className="flex items-center justify-around px-2">

        {/* Home */}
        <Link href={tabs[0].href} className="flex flex-col items-center gap-1 min-w-[3.5rem] group">
          <span className={`flex items-center justify-center transition-all duration-200
            ${isActive(tabs[0].href) ? "text-[#C17A3A]" : "text-stone-500 dark:text-stone-300"}`}>
            <Home className="w-5.5 h-5.5" />
          </span>
          <span className={`text-[10px] font-black tracking-wide transition-colors duration-200
            ${isActive(tabs[0].href) ? "text-[#C17A3A]" : "text-stone-500 dark:text-stone-300"}`}>
            Home
          </span>
        </Link>

        {/* Campaigns */}
        <Link href={tabs[1].href} className="flex flex-col items-center gap-1 min-w-[3.5rem] group">
          <span className={`flex items-center justify-center transition-all duration-200
            ${isActive(tabs[1].href) ? "text-[#C17A3A]" : "text-stone-500 dark:text-stone-300"}`}>
            <Megaphone className="w-5.5 h-5.5" />
          </span>
          <span className={`text-[10px] font-black tracking-wide transition-colors duration-200
            ${isActive(tabs[1].href) ? "text-[#C17A3A]" : "text-stone-500 dark:text-stone-300"}`}>
            Campaigns
          </span>
        </Link>

        {/* Centre — Donate CTA Plus Circle */}
        <Link
          href="/donate"
          aria-label={t("donateNow")}
          className={`relative -mt-4 flex items-center justify-center w-12 h-12 rounded-full
                     bg-[#C17A3A] hover:bg-[#a86430]
                     shadow-[0_6px_20px_-3px_rgba(193,122,58,0.5)]
                     border-2 active:scale-95 transition-transform duration-150 shrink-0
                     ${scrolled ? "border-[#faf8f3]/50 dark:border-zinc-950/50" : "border-[#faf8f3] dark:border-zinc-950"}`}
        >
          {/* Plus icon */}
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" strokeWidth={3}>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" />
          </svg>
        </Link>

        {/* Requests */}
        <Link href={tabs[2].href} className="flex flex-col items-center gap-1 min-w-[3.5rem] group">
          <span className={`flex items-center justify-center transition-all duration-200
            ${isActive(tabs[2].href) ? "text-[#C17A3A]" : "text-stone-500 dark:text-stone-300"}`}>
            <ClipboardList className="w-5.5 h-5.5" />
          </span>
          <span className={`text-[10px] font-black tracking-wide transition-colors duration-200
            ${isActive(tabs[2].href) ? "text-[#C17A3A]" : "text-stone-500 dark:text-stone-300"}`}>
            Requests
          </span>
        </Link>

        {/* Profile */}
        <Link href={tabs[3].href} className="flex flex-col items-center gap-1 min-w-[3.5rem] group">
          <span className={`flex items-center justify-center transition-all duration-200
            ${isActive(tabs[3].href) ? "text-[#C17A3A]" : "text-stone-500 dark:text-stone-300"}`}>
            <User className="w-5.5 h-5.5" />
          </span>
          <span className={`text-[10px] font-black tracking-wide transition-colors duration-200
            ${isActive(tabs[3].href) ? "text-[#C17A3A]" : "text-stone-500 dark:text-stone-300"}`}>
            Profile
          </span>
        </Link>

      </div>
    </nav>
  );
}

/* ─── Floating support / chat button (mobile + desktop) ─────────── */
export function FloatingSupportButton() {
  const t = useTranslations("mobileNav");
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
          bg-white dark:bg-zinc-900
          rounded-2xl shadow-2xl border border-stone-150 dark:border-zinc-800
          transition-all duration-300 origin-bottom-right
          ${open ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none"}
          ${menuOpen ? "menu-open" : ""}`}
      >
        <div className="p-4 space-y-3">
          <p className="text-xs font-black text-stone-500 dark:text-zinc-400 uppercase tracking-widest">{t("getSupport")}</p>
          <a
            href="mailto:support@causekind.org"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-zinc-800 transition-colors group"
          >
            <span className="w-8 h-8 rounded-full bg-[#b04a15]/10 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-[#b04a15]" />
            </span>
            <div>
              <p className="text-xs font-bold text-stone-850 dark:text-stone-100">{t("emailUs")}</p>
              <p className="text-[10px] text-stone-400 font-medium">support@causekind.org</p>
            </div>
          </a>
          <a
            href="/help"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-zinc-800 transition-colors group"
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
                   bg-gradient-to-br from-[#1e3a60] to-[#243f6a]
                   shadow-[0_8px_28px_-4px_rgba(30,58,96,0.55)]
                   border-2 border-white/20 dark:border-zinc-700/40
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
