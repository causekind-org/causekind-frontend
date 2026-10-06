"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNgoStatus } from "@/components/ngo-landing/useNgoStatus";

interface NgoProfileToastProps {
  isProfileComplete?: boolean;
  isModalOpen?: boolean;
  userId?: string;
}

const VISIBLE_MS = 5000;
const EXIT_MS = 380;

export function NgoProfileToast(props: NgoProfileToastProps) {
  const { user, isLoading, isRestoring } = useAuth();
  const role = user?.role?.toUpperCase().replace(/^ROLE_/, "");

  // Do not mount timers, storage listeners or NGO API calls for other visitors.
  if (isLoading || isRestoring || !user || (role !== "NGO" && role !== "NGO_PARTNER")) {
    return null;
  }

  return (
    <AuthenticatedNgoProfileToast
      key={String(user.id ?? user.userId ?? user.email)}
      {...props}
    />
  );
}

function AuthenticatedNgoProfileToast({
  isProfileComplete = false,
  isModalOpen = false,
}: NgoProfileToastProps) {
  const pathname = usePathname();
  const { status, stepNumber, totalSteps, isLoading: isStatusLoading } = useNgoStatus();

  // Track if we've already shown it during this login session
  const [hasShownThisSession] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("ck_ngo_profile_toast_shown") === "true";
  });

  // Track if the Welcome Overlay has finished (or if it wasn't pending)
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem("ck_welcome_pending") !== "1";
  });

  useEffect(() => {
    const handler = () => setWelcomeDismissed(true);
    window.addEventListener("ck-welcome-dismissed", handler);
    // Double check just in case it was dismissed right before this mounted
    if (sessionStorage.getItem("ck_welcome_pending") !== "1") {
      setWelcomeDismissed(true);
    }
    return () => window.removeEventListener("ck-welcome-dismissed", handler);
  }, []);

  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [barKey, setBarKey] = useState(0);
  const [scrolledPastHero, setScrolledPastHero] = useState(() => pathname !== "/");

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    hideTimerRef.current = null;
    exitTimerRef.current = null;
  }, []);

  // Track hero visibility on landing page
  useEffect(() => {
    if (pathname !== "/") {
      setScrolledPastHero(true);
      return;
    }

    const checkScroll = () => {
      const hero = document.getElementById("ngo-hero");
      if (hero) {
        const rect = hero.getBoundingClientRect();
        if (rect.bottom < 200 || window.scrollY > 450) {
          setScrolledPastHero(true);
        } else {
          setScrolledPastHero(false);
        }
      } else if (window.scrollY > 450) {
        setScrolledPastHero(true);
      } else {
        setScrolledPastHero(false);
      }
    };

    checkScroll();
    window.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [pathname]);

  // Determine completeness
  // Approved, under review, or 6/6 steps completed means it's effectively complete.
  const isCompleteByApp = status !== "incomplete" || stepNumber >= totalSteps;
  // Submitting the application hides the toast at once; the status reload that follows
  // can take a moment to report UNDER_REVIEW.
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    const onSubmitted = () => setSubmitted(true);
    window.addEventListener("ngo-application-submitted", onSubmitted);
    return () => window.removeEventListener("ngo-application-submitted", onSubmitted);
  }, []);
  const isEffectivelyComplete = isProfileComplete || isCompleteByApp || hasShownThisSession || submitted;

  useEffect(() => {
    if (isStatusLoading || isEffectivelyComplete || isModalOpen || !welcomeDismissed) return;
    if (pathname === "/" && !scrolledPastHero) return;

    // Show it once, and record that it was shown in this session
    if (typeof window !== "undefined") {
      sessionStorage.setItem("ck_ngo_profile_toast_shown", "true");
    }

    clearAllTimers();
    setVisible(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setEntered(true);
        setBarKey((k) => k + 1);
      });
    });

    hideTimerRef.current = setTimeout(() => {
      setEntered(false);
      exitTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, EXIT_MS);
    }, VISIBLE_MS);

    return () => {
      clearAllTimers();
    };
  }, [isStatusLoading, isEffectivelyComplete, isModalOpen, welcomeDismissed, pathname, scrolledPastHero, clearAllTimers]);

  function dismiss() {
    clearAllTimers();
    setEntered(false);
    exitTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, EXIT_MS);
  }

  function handleAction() {
    clearAllTimers();
    setVisible(false);
    setEntered(false);
  }

  if (isEffectivelyComplete || !visible || (pathname === "/" && !scrolledPastHero)) return null;

  return (
    <div className="fixed bottom-[calc(var(--ck-bottom-chrome)+1.75rem)] left-1/2 -translate-x-1/2 z-[9980] pointer-events-none w-max max-w-[calc(100vw-1.5rem)]">
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
        {/* Pill matching site's prompt pattern */}
        <div className="relative flex min-w-0 items-center gap-2 sm:gap-3 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-full pl-2 pr-1.5 py-1.5 sm:pl-2.5 sm:pr-2 sm:py-2 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(30,107,79,0.2)] overflow-hidden">
          {/* Progress bar — pure CSS drain animation */}
          <div
            key={barKey}
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-ngo-700 origin-left"
            style={{ animation: `ck-drain ${VISIBLE_MS}ms linear forwards` }}
          />

          {/* Icon + pulsing dot */}
          <div className="relative shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-ngo-50 border border-ngo-300 dark:bg-ngo-900/30 dark:border-ngo-700/40 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ngo-700 dark:text-ngo-300" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ngo-600 opacity-40" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ngo-700 border-2 border-white dark:border-zinc-900" />
            </span>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-0 min-w-0 flex-1">
            <span className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate leading-tight">
              Complete your profile
            </span>
            <span className="text-3xs sm:text-2xs text-stone-500 dark:text-stone-400 truncate leading-tight">
              Unlock verification and drives
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-stone-200 dark:bg-zinc-700 shrink-0" />

          {/* CTA Link to NGO Details page */}
          <Link
            href="/profile/ngo-details"
            onClick={handleAction}
            className="flex items-center gap-1.5 bg-ngo-700 hover:bg-ngo-600 active:scale-95 text-white text-2xs sm:text-xs font-black uppercase tracking-wide px-3 py-1.5 sm:px-3.5 rounded-full transition-all whitespace-nowrap shrink-0 shadow-sm"
          >
            Complete Now →
          </Link>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-zinc-800 dark:hover:text-stone-200 transition-all shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        <style>{`
          @keyframes ck-drain {
            from { transform: scaleX(1); }
            to   { transform: scaleX(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
