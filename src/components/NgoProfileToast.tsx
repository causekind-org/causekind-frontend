"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getMyNgoApplication } from "@/lib/api";

interface NgoProfileToastProps {
  isProfileComplete?: boolean;
  isModalOpen?: boolean;
  userId?: string;
}

const VISIBLE_MS = 5000;
const REPEAT_INTERVAL_MS = 15000;
const EXIT_MS = 380;

export function NgoProfileToast({
  isProfileComplete = false,
  isModalOpen = false,
  userId,
}: NgoProfileToastProps) {
  const { user } = useAuth();

  const userIdentifier =
    userId ??
    user?.id ??
    user?.userId ??
    (user?.email ? user.email.toLowerCase().replace(/[^a-z0-9]/g, "_") : "anonymous");

  const checkStatusFromStorage = useCallback(() => {
    if (typeof window === "undefined") return false;
    try {
      const keysToCheck: string[] = [
        `ngo-demo-application-${userIdentifier}`,
        `ngo-application-${userIdentifier}`,
      ];

      if (user?.email) {
        const emailId = user.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
        if (emailId !== userIdentifier) {
          keysToCheck.push(`ngo-demo-application-${emailId}`);
          keysToCheck.push(`ngo-application-${emailId}`);
        }
      }

      for (const key of keysToCheck) {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          const status = parsed?.status || parsed?.submissionStatus;
          if (
            status === "UNDER_REVIEW" ||
            status === "APPROVED" ||
            status === "PENDING_VERIFICATION" ||
            status === "SUBMITTED"
          ) {
            return true;
          }
        }
      }
    } catch {
      // ignore
    }
    return false;
  }, [userIdentifier, user?.email]);

  const [isApplicationUnderReview, setIsApplicationUnderReview] = useState<boolean>(() => {
    return checkStatusFromStorage();
  });

  const isEffectivelyComplete = isProfileComplete || isApplicationUnderReview;

  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [barKey, setBarKey] = useState(0);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    hideTimerRef.current = null;
    exitTimerRef.current = null;
    loopTimerRef.current = null;
  }, []);

  // Listen for real-time submission events or storage updates
  useEffect(() => {
    const handleUpdate = (e?: Event) => {
      const customEvent = e as CustomEvent;
      const status = customEvent?.detail?.status;
      if (
        status === "UNDER_REVIEW" ||
        status === "APPROVED" ||
        status === "PENDING_VERIFICATION" ||
        status === "SUBMITTED"
      ) {
        setIsApplicationUnderReview(true);
        clearAllTimers();
        setVisible(false);
        setEntered(false);
        return;
      }

      if (checkStatusFromStorage()) {
        setIsApplicationUnderReview(true);
        clearAllTimers();
        setVisible(false);
        setEntered(false);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("ngo-application-submitted", handleUpdate);
      window.addEventListener("storage", handleUpdate);
      return () => {
        window.removeEventListener("ngo-application-submitted", handleUpdate);
        window.removeEventListener("storage", handleUpdate);
      };
    }
  }, [checkStatusFromStorage, clearAllTimers]);

  // Check backend application status if authenticated
  useEffect(() => {
    if (isEffectivelyComplete) return;

    if (checkStatusFromStorage()) {
      setIsApplicationUnderReview(true);
      clearAllTimers();
      setVisible(false);
      setEntered(false);
      return;
    }

    if (user) {
      getMyNgoApplication()
        .then((app) => {
          const status = app?.status || (app as any)?.submissionStatus;
          if (
            status === "UNDER_REVIEW" ||
            status === "APPROVED" ||
            status === "PENDING_VERIFICATION" ||
            status === "SUBMITTED"
          ) {
            setIsApplicationUnderReview(true);
            clearAllTimers();
            setVisible(false);
            setEntered(false);
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }, [user, isEffectivelyComplete, checkStatusFromStorage, clearAllTimers]);

  const showToast = useCallback(() => {
    if (isEffectivelyComplete) return;

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
        loopTimerRef.current = setTimeout(() => {
          showToast();
        }, REPEAT_INTERVAL_MS);
      }, EXIT_MS);
    }, VISIBLE_MS);
  }, [clearAllTimers, isEffectivelyComplete]);

  useEffect(() => {
    if (isEffectivelyComplete) {
      clearAllTimers();
      setVisible(false);
      setEntered(false);
      return;
    }

    if (isModalOpen) {
      clearAllTimers();
      setVisible(false);
      setEntered(false);
      return;
    }

    // Modal is closed (auto-dismissed or manual dismiss) and profile is incomplete:
    // show toast immediately
    showToast();

    return () => {
      clearAllTimers();
    };
  }, [isEffectivelyComplete, isModalOpen, showToast, clearAllTimers]);

  function dismiss() {
    clearAllTimers();
    setEntered(false);
    exitTimerRef.current = setTimeout(() => {
      setVisible(false);
      loopTimerRef.current = setTimeout(() => {
        showToast();
      }, REPEAT_INTERVAL_MS);
    }, EXIT_MS);
  }

  function handleAction() {
    clearAllTimers();
    setVisible(false);
    setEntered(false);
  }

  if (isEffectivelyComplete || !visible) return null;

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
        <div className="relative flex min-w-0 items-center gap-2 sm:gap-3 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-full pl-2 pr-1.5 py-1.5 sm:pl-2.5 sm:pr-2 sm:py-2 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(67,56,202,0.2)] overflow-hidden">
          {/* Progress bar — pure CSS drain animation */}
          <div
            key={barKey}
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#4338CA] origin-left"
            style={{ animation: `ck-drain ${VISIBLE_MS}ms linear forwards` }}
          />

          {/* Icon + pulsing dot */}
          <div className="relative shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EEF2FF] border border-[#6366F1]/25 dark:bg-[#4338CA]/20 dark:border-[#6366F1]/30 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#4338CA] dark:text-[#6366F1]" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6366F1] opacity-40" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4338CA] border-2 border-white dark:border-zinc-900" />
            </span>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-0 min-w-0 flex-1">
            <span className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate leading-tight">
              Complete your profile
            </span>
            <span className="text-3xs sm:text-2xs text-stone-500 dark:text-stone-400 truncate leading-tight">
              Unlock verification and campaigns
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-stone-200 dark:bg-zinc-700 shrink-0" />

          {/* CTA Link to NGO Details page */}
          <Link
            href="/profile/ngo-details"
            onClick={handleAction}
            className="flex items-center gap-1.5 bg-[#4338CA] hover:bg-[#6366F1] active:scale-95 text-white text-2xs sm:text-xs font-black uppercase tracking-wide px-3 py-1.5 sm:px-3.5 rounded-full transition-all whitespace-nowrap shrink-0 shadow-sm"
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
