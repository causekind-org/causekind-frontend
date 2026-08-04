"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, PackagePlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import { claimPromptLane, releasePromptLane } from "@/lib/promptLane";
import { useIsDesktop } from "@/hooks/useIsDesktop";

const LANE_ID = "donor-listing";

const FIRST_DELAY_MS  = 800;
const VISIBLE_MS      = 10_000;
const REPEAT_DELAY_MS = 45_000;
const RETRY_DELAY_MS  = 6_000; // lane busy — the other prompt is on screen
const EXIT_MS         = 380;

export function DonorListingPrompt() {
  const { user, isLoading } = useAuth();
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  const [visible,   setVisible]   = useState(false);
  const [entered,   setEntered]   = useState(false);
  const [barKey,    setBarKey]    = useState(0); // increment to restart CSS animation
  const [dismissed, setDismissed] = useState(false);

  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t3 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t4 = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  const userEmail = user?.email;
  const userRole  = user?.role;

  useEffect(() => {
    // Desktop only — on a phone there is no vertical band clear of the header,
    // the toast lane and the dock at once, so the prompt is dropped entirely.
    if (!isDesktop) return;
    if (isLoading || !userEmail || userRole !== "DONOR") return;
    if (dismissed) return;

    function show(delay: number) {
      t1.current = setTimeout(() => {
        if (pathnameRef.current === "/items/new") { show(delay); return; }
        // Never open on top of DoneeRequestPrompt — wait for the lane instead.
        if (!claimPromptLane(LANE_ID)) { show(RETRY_DELAY_MS); return; }
        setVisible(true);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setEntered(true);
            setBarKey(k => k + 1); // restart the CSS drain animation
          })
        );
        t2.current = setTimeout(() => {
          setEntered(false);
          t3.current = setTimeout(() => {
            setVisible(false);
            releasePromptLane(LANE_ID);
            show(REPEAT_DELAY_MS);
          }, EXIT_MS);
        }, VISIBLE_MS);
      }, delay);
    }

    show(FIRST_DELAY_MS);
    return () => {
      [t1, t2, t3, t4].forEach(r => { if (r.current) clearTimeout(r.current); });
      releasePromptLane(LANE_ID);
    };
  }, [isDesktop, isLoading, userEmail, userRole, dismissed]);

  function dismiss() {
    setDismissed(true);
    [t1, t2, t3, t4].forEach(r => { if (r.current) clearTimeout(r.current); });
    setEntered(false);
    releasePromptLane(LANE_ID);
    t4.current = setTimeout(() => setVisible(false), EXIT_MS);
  }

  if (!isDesktop || !visible || userRole !== "DONOR") return null;

  return (
    /* max-w is what stops this bleeding off both edges: the pill is centred with
       -translate-x-1/2, and its children were all nowrap/shrink-0, so its
       intrinsic width (~500px) simply overflowed a 390px screen symmetrically. */
    /* Sits just above the bottom dock. --ck-bottom-chrome (styles.css) is the
       single source of truth for the dock's total height — nav float + safe-area
       inset + nav height — and computes to 0 at lg:, where there is no dock, so
       the pill simply rests near the bottom edge on desktop. The extra 1.75rem
       is the visual gap between pill and dock. */
    <div className="fixed bottom-[calc(var(--ck-bottom-chrome)+1.75rem)] left-1/2 -translate-x-1/2 z-[9980] pointer-events-none w-max max-w-[calc(100vw-1.5rem)]">
      <div
        className="pointer-events-auto"
        style={{
          // Positive: it rises into place from below, matching where it lives.
          transform: entered ? "translateY(0) scale(1)" : "translateY(18px) scale(0.94)",
          opacity: entered ? 1 : 0,
          transition: entered
            ? "transform 0.48s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease"
            : `transform ${EXIT_MS}ms ease-in, opacity ${EXIT_MS}ms ease`,
        }}
      >
        {/* Pill */}
        <div className="relative flex min-w-0 items-center gap-2 sm:gap-3 bg-white border border-stone-200 rounded-full pl-2 pr-1.5 py-1.5 sm:pl-2.5 sm:pr-2 sm:py-2 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(176,74,21,0.15)] overflow-hidden">

          {/* Progress bar — pure CSS animation, no JS interval */}
          <div
            key={barKey}
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#b04a15] origin-left"
            style={{ animation: `ck-drain ${VISIBLE_MS}ms linear forwards` }}
          />

          {/* Icon + pulsing dot */}
          <div className="relative shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#b04a15]/10 border border-[#b04a15]/20 flex items-center justify-center">
              <PackagePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#b04a15]" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#b04a15] opacity-40" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#b04a15] border-2 border-white" />
            </span>
          </div>

          {/* Text */}
          {/* truncate, not whitespace-nowrap: nowrap gave this block an intrinsic
              width no flex shrink could reduce, which is what pushed the pill
              past the screen. Truncating lets it absorb whatever space the
              fixed-size icon and CTA leave. */}
          <div className="flex flex-col gap-0 min-w-0 flex-1">
            <span className="text-[13px] font-bold text-stone-900 truncate leading-tight">Got spare items?</span>
            <span className="text-[10px] sm:text-[11px] text-stone-500 truncate leading-tight">Books, clothes, electronics — someone needs them</span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-stone-200 shrink-0" />

          {/* CTA */}
          <Link
            href="/items/new"
            onClick={() => {
              [t1, t2, t3].forEach(r => { if (r.current) clearTimeout(r.current); });
              releasePromptLane(LANE_ID);
              setVisible(false);
            }}
            className="flex items-center gap-1.5 bg-[#b04a15] hover:bg-[#963c0d] active:scale-95 text-white text-[11px] sm:text-xs font-black uppercase tracking-wide px-3 py-1.5 sm:px-3.5 rounded-full transition-all whitespace-nowrap shrink-0"
          >
            List an Item →
          </Link>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="w-6 h-6 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all shrink-0"
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
