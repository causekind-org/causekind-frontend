"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Megaphone, Sparkles, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsDesktop } from "@/hooks/useIsDesktop";

const FIRST_DELAY_MS = 10_000;
const VISIBLE_MS = 10_000;
const REPEAT_DELAY_MS = 10_000;
const EXIT_MS = 500;

export function NgoCampaignPrompt() {
  const { user, isLoading } = useAuth();
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [barKey, setBarKey] = useState(0);

  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t3 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t4 = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const userEmail = user?.email;
  const userRole = user?.role;
  const isNgo = userRole === "NGO" || userRole === "NGO_PARTNER";

  function clearTimers() {
    [t1, t2, t3, t4].forEach((timer) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    });
  }

  useEffect(() => {
    if (!isDesktop) return;
    if (isLoading || !userEmail || !isNgo || dismissed) return;

    let cancelled = false;

    function hideThenQueue() {
      setEntered(false);
      t3.current = setTimeout(() => {
        setVisible(false);
        show(REPEAT_DELAY_MS);
      }, EXIT_MS);
    }

    function show(delay: number) {
      t1.current = setTimeout(() => {
        if (cancelled) return;
        if (pathnameRef.current === "/requests/new") {
          show(REPEAT_DELAY_MS);
          return;
        }

        setVisible(true);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setEntered(true);
            setBarKey((key) => key + 1);
          })
        );

        t2.current = setTimeout(hideThenQueue, VISIBLE_MS);
      }, delay);
    }

    show(FIRST_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [isDesktop, dismissed, isLoading, userEmail, isNgo]);

  function dismiss() {
    clearTimers();
    setEntered(false);
    t4.current = setTimeout(() => {
      setDismissed(true);
      setVisible(false);
    }, EXIT_MS);
  }

  function handleAction() {
    setDismissed(true);
    clearTimers();
    setVisible(false);
  }

  if (!isDesktop || !visible || !isNgo) return null;

  return (
    <div className="fixed top-[8.5rem] lg:top-[10rem] left-0 z-[9980] pointer-events-none">
      <div
        aria-live="polite"
        aria-label="Post a campaign prompt"
        className="pointer-events-auto w-[calc(100vw-2rem)] max-w-[300px] sm:max-w-[320px]"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered
            ? "translateX(12px)"
            : "translateX(calc(-100% - 20px))",
          transition: entered
            ? "transform 0.82s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease-out"
            : `transform ${EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1), opacity ${EXIT_MS}ms ease`,
        }}
      >
        <div className="ck-ngo-campaign-toast relative overflow-hidden rounded-r-xl border border-l-0 border-indigo-100 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.16),0_0_0_1px_rgba(99,102,241,0.12)] dark:bg-stone-900 dark:border-stone-800">
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 via-sky-500 to-emerald-500" />
          <div
            key={barKey}
            className="absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500"
            style={{ animation: `ck-ngo-campaign-drain ${VISIBLE_MS}ms linear forwards` }}
          />
          <div className="ck-ngo-campaign-sheen pointer-events-none absolute inset-y-0 -left-16 w-12 rotate-12 bg-gradient-to-r from-transparent via-white/75 to-transparent" />

          <div className="relative flex items-center gap-2.5 py-2 pl-3 pr-2">
            <div className="relative shrink-0">
              <div className="ck-ngo-campaign-icon grid h-9 w-9 place-items-center rounded-xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-800">
                <Megaphone className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
              </div>
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-white dark:border-stone-900 bg-indigo-600 shadow-sm">
                <Sparkles className="h-2.5 w-2.5 text-white" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-4xs font-black uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-400">
                NGO Portal
              </p>
              <p className="mt-0.5 truncate text-sm font-black leading-tight text-stone-950 dark:text-stone-100">
                Post a campaign / request
              </p>
              <p className="mt-0.5 truncate text-2xs font-semibold leading-snug text-stone-600 dark:text-stone-400">
                Tell donors what you need.
              </p>
            </div>

            <Link
              href="/requests/new"
              onClick={handleAction}
              className="group flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#1e3a60] px-2.5 text-2xs font-black uppercase text-white shadow-[0_7px_14px_rgba(30,58,96,0.23)] transition-all hover:bg-[#16304d] active:scale-95"
            >
              Post
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-stone-400 transition-all hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        <style>{`
          @keyframes ck-ngo-campaign-drain {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
          }

          @keyframes ck-ngo-campaign-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }

          @keyframes ck-ngo-campaign-sheen {
            0% { transform: translateX(-50px) rotate(12deg); opacity: 0; }
            18% { opacity: 0.75; }
            42%, 100% { transform: translateX(360px) rotate(12deg); opacity: 0; }
          }

          .ck-ngo-campaign-toast {
            animation: ck-ngo-campaign-float 4.8s ease-in-out infinite;
          }

          .ck-ngo-campaign-sheen {
            animation: ck-ngo-campaign-sheen 3.8s ease-in-out infinite 0.6s;
          }

          .ck-ngo-campaign-icon {
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.7), 0 10px 26px rgba(99,102,241,0.2);
          }

          @media (prefers-reduced-motion: reduce) {
            .ck-ngo-campaign-toast,
            .ck-ngo-campaign-sheen {
              animation: none;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
export default NgoCampaignPrompt;
