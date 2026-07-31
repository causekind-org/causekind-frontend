"use client";

import { usePathname } from "next/navigation";
import { MessageCircle, X, Mail, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";
import { buildSupportGmailUrl, DEFAULT_SUPPORT_GMAIL_URL } from "@/lib/utils";
import { MOBILE_NAV_CLEARANCE } from "./MobileBottomNav";

/* ─── Mobile bottom nav ─────────────────────────────────────────────
   Moved to ./MobileBottomNav so the moving-cradle geometry, the ordered
   destination array and the route matcher live in one focused file. Re-exported
   here so existing import sites keep working. ── */
export { MobileBottomNav, MOBILE_NAV_CLEARANCE } from "./MobileBottomNav";

/* ─── Floating support / chat button (mobile + desktop) ─────────── */
export function FloatingSupportButton() {
  const t = useTranslations("mobileNav");
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mailHref, setMailHref] = useState(DEFAULT_SUPPORT_GMAIL_URL);

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

  // Hidden inside the super-admin command center and admin dashboard (by path or role).
  if (
    pathname?.startsWith("/super-admin") ||
    pathname?.startsWith("/admin/dashboard") ||
    user?.role === "SUPER_ADMIN"
  ) return null;

  /**
   * Sit above whatever bottom bar this route actually has.
   *
   * <p>Derived from MOBILE_NAV_CLEARANCE rather than a hardcoded rem value, so
   * changing the nav's height moves this button with it instead of silently
   * overlapping. Handover routes hide the global nav and show their own shorter
   * action bar, so the button drops closer to the edge there.
   */
  const onHandover = /\/handover(\/|$)/.test(pathname ?? "");
  const supportOffset = (onHandover ? 64 : MOBILE_NAV_CLEARANCE) + 20;

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
        style={{ bottom: `calc(${supportOffset}px + 3.75rem)` }}
        className={`floating-support-item fixed right-5 lg:!bottom-24 z-50 w-60
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
        style={{ bottom: `${supportOffset}px` }}
        className={`floating-support-item fixed right-5 lg:!bottom-8 z-50
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
