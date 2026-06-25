"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { usePathname } from "next/navigation";

// Re-ask after 24 h if user previously declined
const RE_ASK_DELAY_MS = 24 * 60 * 60 * 1000;

export function CookieConsent() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const isAdminPath = !!pathname?.startsWith("/admin/dashboard") || !!pathname?.startsWith("/super-admin");

  useEffect(() => {
    if (isAdminPath) return; // don't run on isolated admin pages

    const stored = localStorage.getItem("ck_cookie_consent");
    if (stored === "accepted") return; // accepted — never ask again

    if (stored !== null) {
      // declined previously — check if enough time has passed
      try {
        const data = JSON.parse(stored);
        if (data.choice === "declined" && typeof data.ts === "number") {
          if (Date.now() - data.ts < RE_ASK_DELAY_MS) return; // too soon
          // Time expired — clear and re-ask below
          localStorage.removeItem("ck_cookie_consent");
        } else {
          return; // unknown format, leave alone
        }
      } catch {
        return; // old plain string, not our JSON — leave alone
      }
    }

    // Show after small delay so entrance animation is visible on first paint
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, [isAdminPath]);

  function dismiss(choice: "accepted" | "declined") {
    if (choice === "accepted") {
      localStorage.setItem("ck_cookie_consent", "accepted");
    } else {
      // Store as JSON with timestamp so we can re-ask after the delay
      localStorage.setItem(
        "ck_cookie_consent",
        JSON.stringify({ choice: "declined", ts: Date.now() })
      );
    }
    setExiting(true);
    // Wait for exit animation before unmounting
    setTimeout(() => setVisible(false), 380);
  }

  if (isAdminPath || !visible) return null;

  return (
    <>
      <style>{`
        @keyframes ck-cookie-slide-up {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes ck-cookie-slide-down {
          from { opacity: 1; transform: translateY(0)    scale(1);    }
          to   { opacity: 0; transform: translateY(20px) scale(0.97); }
        }
        .ck-cookie-enter {
          animation: ck-cookie-slide-up 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .ck-cookie-exit {
          animation: ck-cookie-slide-down 0.36s cubic-bezier(0.4, 0, 1, 1) both;
        }
      `}</style>

      {/* Fixed bottom bar — clears mobile bottom nav on small screens */}
      <div
        className={`
          fixed bottom-[84px] lg:bottom-5 inset-x-0 z-[9998]
          flex justify-center px-4 pointer-events-none
          ${exiting ? "ck-cookie-exit" : "ck-cookie-enter"}
        `}
        role="region"
        aria-label="Cookie consent"
      >
        <div
          className={`
            pointer-events-auto
            w-full max-w-[640px]
            bg-[#faf8f5] dark:bg-zinc-900
            border border-[#e5e2d5] dark:border-zinc-700
            rounded-2xl shadow-xl shadow-stone-900/10 dark:shadow-black/30
            px-5 py-4
            flex flex-col sm:flex-row items-start sm:items-center gap-4
          `}
        >
          {/* Icon */}
          <span className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-[#b04a15]/10 dark:bg-[#b04a15]/20">
            <Cookie className="w-5 h-5 text-[#b04a15] dark:text-orange-400" aria-hidden="true" />
          </span>

          {/* Text */}
          <p className="flex-1 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            We use essential cookies to keep you signed in and remember your
            preferences.{" "}
            <Link
              href="/privacy"
              className="font-semibold text-[#b04a15] dark:text-orange-400 underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Learn more
            </Link>
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => dismiss("accepted")}
              className="
                flex-1 sm:flex-none
                bg-[#b04a15] hover:bg-[#963c0d] active:scale-95
                text-white text-sm font-semibold
                px-5 py-2 rounded-full
                transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/60
              "
            >
              Accept
            </button>
            <button
              onClick={() => dismiss("declined")}
              className="
                flex-1 sm:flex-none
                bg-transparent hover:bg-stone-100 dark:hover:bg-zinc-800 active:scale-95
                text-stone-600 dark:text-stone-400 text-sm font-semibold
                px-5 py-2 rounded-full
                border border-[#e5e2d5] dark:border-zinc-700
                transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/40
              "
            >
              Decline
            </button>
            {/* Compact close on mobile (same as Decline) */}
            <button
              onClick={() => dismiss("declined")}
              aria-label="Close"
              className="
                hidden sm:flex
                items-center justify-center
                w-8 h-8 rounded-full
                text-stone-400 hover:text-stone-600 dark:hover:text-stone-200
                hover:bg-stone-100 dark:hover:bg-zinc-800
                transition-all active:scale-95
              "
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
