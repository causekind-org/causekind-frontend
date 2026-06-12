"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Megaphone, Package, LayoutList, MessageCircle, X, Mail, Phone } from "lucide-react";
import { useState, useEffect } from "react";

/* ─── Mobile bottom nav ─────────────────────────────────────────── */
export function MobileBottomNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const tabs = [
    { href: "/",         icon: Home,        label: "Home" },
    { href: "/campaigns",icon: Megaphone,   label: "Campaigns" },
    { href: "/requests", icon: Package,     label: "Requests" },
    { href: "/items",    icon: LayoutList,  label: "Listings" },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      className={`fixed z-50 lg:hidden
                 bg-white/70 dark:bg-zinc-950/70
                 backdrop-blur-xl backdrop-saturate-150
                 border-stone-200/70 dark:border-zinc-800
                 transition-all duration-300 ease-in-out
                 ${scrolled
                   ? "left-4 right-4 rounded-[2rem] border shadow-lg shadow-stone-900/10 dark:shadow-black/40 py-2"
                   : "left-0 right-0 border-t safe-bottom pt-2 pb-3"
                 }`}
      style={{
        bottom: scrolled ? "calc(1rem + env(safe-area-inset-bottom, 0px))" : "0px",
      }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-end justify-around px-2">

        {/* Home */}
        <Link href={tabs[0].href} className="flex flex-col items-center gap-0.5 min-w-[3rem] group">
          <span className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200
            ${isActive(tabs[0].href)
              ? "bg-[#b04a15]/10 text-[#b04a15]"
              : "text-stone-400 dark:text-zinc-500 group-hover:text-stone-700 dark:group-hover:text-zinc-300"}`}>
            <Home className="w-5 h-5" />
          </span>
          <span className={`text-[10px] font-bold transition-colors duration-200
            ${isActive(tabs[0].href) ? "text-[#b04a15]" : "text-stone-400 dark:text-zinc-500"}`}>
            Home
          </span>
        </Link>

        {/* Campaigns */}
        <Link href={tabs[1].href} className="flex flex-col items-center gap-0.5 min-w-[3rem] group">
          <span className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200
            ${isActive(tabs[1].href)
              ? "bg-[#b04a15]/10 text-[#b04a15]"
              : "text-stone-400 dark:text-zinc-500 group-hover:text-stone-700 dark:group-hover:text-zinc-300"}`}>
            <Megaphone className="w-5 h-5" />
          </span>
          <span className={`text-[10px] font-bold transition-colors duration-200
            ${isActive(tabs[1].href) ? "text-[#b04a15]" : "text-stone-400 dark:text-zinc-500"}`}>
            Campaigns
          </span>
        </Link>

        {/* Centre — Donate CTA pill */}
        <Link
          href="/donate"
          aria-label="Donate now"
          className="relative -mt-5 flex items-center justify-center w-14 h-14 rounded-full
                     bg-gradient-to-br from-[#e07b3a] to-[#b04a15]
                     shadow-[0_6px_24px_-4px_rgba(176,74,21,0.65)]
                     border-4 border-white dark:border-zinc-950
                     active:scale-95 transition-transform duration-150
                     mobile-donate-pulse"
        >
          {/* glassmorphic inner ring */}
          <span className="absolute inset-[3px] rounded-full bg-white/15 pointer-events-none" />
          {/* Plus icon */}
          <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white relative z-10" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" />
          </svg>
        </Link>

        {/* In-Kind Requests */}
        <Link href={tabs[2].href} className="flex flex-col items-center gap-0.5 min-w-[3rem] group">
          <span className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200
            ${isActive(tabs[2].href)
              ? "bg-[#b04a15]/10 text-[#b04a15]"
              : "text-stone-400 dark:text-zinc-500 group-hover:text-stone-700 dark:group-hover:text-zinc-300"}`}>
            <Package className="w-5 h-5" />
          </span>
          <span className={`text-[10px] font-bold transition-colors duration-200
            ${isActive(tabs[2].href) ? "text-[#b04a15]" : "text-stone-400 dark:text-zinc-500"}`}>
            Requests
          </span>
        </Link>

        {/* Listings */}
        <Link href={tabs[3].href} className="flex flex-col items-center gap-0.5 min-w-[3rem] group">
          <span className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200
            ${isActive(tabs[3].href)
              ? "bg-[#b04a15]/10 text-[#b04a15]"
              : "text-stone-400 dark:text-zinc-500 group-hover:text-stone-700 dark:group-hover:text-zinc-300"}`}>
            <LayoutList className="w-5 h-5" />
          </span>
          <span className={`text-[10px] font-bold transition-colors duration-200
            ${isActive(tabs[3].href) ? "text-[#b04a15]" : "text-stone-400 dark:text-zinc-500"}`}>
            Listings
          </span>
        </Link>

      </div>
    </nav>
  );
}

/* ─── Floating support / chat button (mobile + desktop) ─────────── */
export function FloatingSupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Popover panel */}
      <div
        className={`fixed bottom-[9.5rem] right-5 lg:bottom-24 z-50 w-60
          bg-white dark:bg-zinc-900
          rounded-2xl shadow-2xl border border-stone-100 dark:border-zinc-800
          transition-all duration-300 origin-bottom-right
          ${open ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none"}`}
      >
        <div className="p-4 space-y-3">
          <p className="text-xs font-black text-stone-500 dark:text-zinc-400 uppercase tracking-widest">Get Support</p>
          <a
            href="mailto:support@causekind.org"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-zinc-800 transition-colors group"
          >
            <span className="w-8 h-8 rounded-full bg-[#b04a15]/10 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-[#b04a15]" />
            </span>
            <div>
              <p className="text-xs font-bold text-stone-800 dark:text-stone-100">Email us</p>
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
              <p className="text-xs font-bold text-stone-800 dark:text-stone-100">Help & FAQ</p>
              <p className="text-[10px] text-stone-400 font-medium">Common questions answered</p>
            </div>
          </a>
        </div>
      </div>

      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? "Close support" : "Open support"}
        className="fixed bottom-[7.25rem] right-5 lg:bottom-8 z-50
                   w-13 h-13 rounded-full
                   bg-gradient-to-br from-[#1e3a60] to-[#243f6a]
                   shadow-[0_8px_28px_-4px_rgba(30,58,96,0.55)]
                   border-2 border-white/20 dark:border-zinc-700/40
                   flex items-center justify-center
                   active:scale-95 transition-all duration-200
                   support-btn-ripple"
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
