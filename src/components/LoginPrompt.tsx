"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";

// Shown once per session to logged-out visitors, well after they've had time
// to look around (not on page load, which would feel like a paywall). Mirrors
// DonorListingPrompt's bottom-center pill pattern, but fires only once — no
// repeat loop — since nagging a logged-out visitor repeatedly is more likely
// to annoy than convert.
const FIRST_DELAY_MS = 15_000; // within the requested 10-20s window
const VISIBLE_MS     = 12_000;
const EXIT_MS        = 380;
const SESSION_KEY     = "ck_login_prompt_shown";
const SKIP_PATHS      = ["/login", "/register"]; // don't nag them where they're already headed

export function LoginPrompt() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [barKey,  setBarKey]  = useState(0); // increment to restart the CSS drain animation

  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t3 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t4 = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  useEffect(() => {
    if (isLoading || user) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;

    t1.current = setTimeout(() => {
      if (SKIP_PATHS.includes(pathnameRef.current ?? "")) return;
      sessionStorage.setItem(SESSION_KEY, "1");
      setVisible(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setEntered(true);
          setBarKey(k => k + 1);
        })
      );
      t2.current = setTimeout(() => {
        setEntered(false);
        t3.current = setTimeout(() => setVisible(false), EXIT_MS);
      }, VISIBLE_MS);
    }, FIRST_DELAY_MS);

    return () => { [t1, t2, t3, t4].forEach(r => { if (r.current) clearTimeout(r.current); }); };
  }, [isLoading, user]);

  function dismiss() {
    [t1, t2, t3].forEach(r => { if (r.current) clearTimeout(r.current); });
    setEntered(false);
    t4.current = setTimeout(() => setVisible(false), EXIT_MS);
  }

  if (!visible || user) return null;

  return (
    <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-[9980] pointer-events-none">
      <div
        className="pointer-events-auto"
        style={{
          transform: entered ? "translateY(0) scale(1)" : "translateY(18px) scale(0.94)",
          opacity: entered ? 1 : 0,
          transition: entered
            ? "transform 0.48s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease"
            : `transform ${EXIT_MS}ms ease-in, opacity ${EXIT_MS}ms ease`,
        }}
      >
        {/* Pill */}
        <div className="relative flex items-center gap-3 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-full pl-2.5 pr-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.14),0_0_0_1px_rgba(176,74,21,0.15)] overflow-hidden">

          {/* Progress bar — pure CSS animation, no JS interval */}
          <div
            key={barKey}
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#b04a15] origin-left"
            style={{ animation: `ck-login-prompt-drain ${VISIBLE_MS}ms linear forwards` }}
          />

          {/* Icon + pulsing dot */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#b04a15]/10 border border-[#b04a15]/20 flex items-center justify-center">
              <LogIn className="w-4 h-4 text-[#b04a15]" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#b04a15] opacity-40" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#b04a15] border-2 border-white dark:border-zinc-900" />
            </span>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-0 min-w-0">
            <span className="text-[13px] font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap leading-tight">New here?</span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400 whitespace-nowrap leading-tight">Log in to donate or request an item</span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-stone-200 dark:bg-zinc-700 shrink-0" />

          {/* CTA */}
          <Link
            href="/login"
            onClick={() => {
              [t1, t2, t3].forEach(r => { if (r.current) clearTimeout(r.current); });
              setVisible(false);
            }}
            className="flex items-center gap-1.5 bg-[#b04a15] hover:bg-[#963c0d] active:scale-95 text-white text-xs font-black uppercase tracking-wide px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap shrink-0"
          >
            Log in →
          </Link>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-all shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        <style>{`
          @keyframes ck-login-prompt-drain {
            from { transform: scaleX(1); }
            to   { transform: scaleX(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
