"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getItemRequests, type ItemRequest } from "@/lib/api";
import { CATEGORY_VISUALS, readSelectedDonorCategories } from "@/lib/categoryVisuals";
import { claimPromptLane, releasePromptLane } from "@/lib/promptLane";
import { useIsDesktop } from "@/hooks/useIsDesktop";

const LANE_ID = "donee-request";

// Staggered clear of DonorListingPrompt's 800ms/10s/45s rhythm so the two rarely
// want the screen at the same moment. The guarantee that they never *do* is the
// shared lane in @/lib/promptLane — see the reasoning there for why the offsets
// alone cannot be trusted.
const FIRST_DELAY_MS  = 22_000;
const VISIBLE_MS      = 12_000;
const REPEAT_DELAY_MS = 90_000;
const RETRY_DELAY_MS  = 6_000; // lane busy — the other prompt is on screen
const EXIT_MS         = 380;

export function DoneeRequestPrompt() {
  const { user, isLoading } = useAuth();
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  const [visible,   setVisible]   = useState(false);
  const [entered,   setEntered]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [request,   setRequest]   = useState<ItemRequest | null>(null);
  const [barKey,    setBarKey]    = useState(0);

  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t3 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t4 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userEmail = user?.email;
  const userRole  = user?.role;

  useEffect(() => {
    // Desktop only — gating the effect and not just the render is what stops the
    // getItemRequests() poll below from running for a pill no phone will show.
    if (!isDesktop) return;
    if (isLoading || !userEmail || userRole !== "DONOR") return;
    if (dismissed) return;

    let cancelled = false;

    // Picks one request at random, scoped to the donor's chosen focus areas —
    // or the whole pool if they picked "all" (or never chose at all; a
    // discovery nudge should still have something to show either way).
    async function pickRandomRequest(): Promise<ItemRequest | null> {
      try {
        const all = await getItemRequests();
        if (all.length === 0) return null;
        const selected = readSelectedDonorCategories();
        const pool = selected && selected.length > 0
          ? all.filter(r => selected.includes(r.category))
          : all;
        if (pool.length === 0) return null;
        return pool[Math.floor(Math.random() * pool.length)];
      } catch {
        return null;
      }
    }

    function show(delay: number) {
      t1.current = setTimeout(async () => {
        if (cancelled) return;
        if (pathnameRef.current === "/requests") { show(delay); return; }

        const picked = await pickRandomRequest();
        if (cancelled) return;
        if (!picked) { show(REPEAT_DELAY_MS); return; }
        // Claimed after the fetch, not before, so a slow or empty request never
        // holds the lane shut while DonorListingPrompt is waiting on it.
        if (!claimPromptLane(LANE_ID)) { show(RETRY_DELAY_MS); return; }

        setRequest(picked);
        setVisible(true);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setEntered(true);
            setBarKey(k => k + 1);
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
      cancelled = true;
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

  if (!isDesktop || !visible || userRole !== "DONOR" || !request) return null;

  const visual = CATEGORY_VISUALS[request.category] ?? CATEGORY_VISUALS["Medical aid"];

  return (
    /* Top-left, below the sticky header and the top-center toast lane (see
       DonorListingPrompt for the offset reasoning). The slide-in from the left
       edge reads the same here, so the animation is unchanged. */
    <div className="fixed top-[8.5rem] lg:top-[10rem] left-7 z-[9980] pointer-events-none">
      <div
        className="pointer-events-auto"
        style={{
          transform: entered ? "translateX(0)" : "translateX(-130%)",
          opacity: entered ? 1 : 0,
          transition: entered
            ? "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease"
            : `transform ${EXIT_MS}ms ease-in, opacity ${EXIT_MS}ms ease`,
        }}
      >
        <div className="relative flex items-center gap-3 bg-white border border-stone-200 rounded-2xl pl-2.5 pr-2 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(30,58,96,0.15)] overflow-hidden w-[320px] max-w-[calc(100vw-3.5rem)] sm:w-[360px]">

          {/* Progress bar — pure CSS animation, no JS interval */}
          <div
            key={barKey}
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1e3a60] origin-left"
            style={{ animation: `ck-donee-drain ${VISIBLE_MS}ms linear forwards` }}
          />

          {/* Thumbnail */}
          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-stone-100">
            <Image
              src={request.imageUrl ?? visual.fallbackImage}
              alt={request.title}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>

          {/* Text */}
          <div className="flex flex-col gap-0 min-w-0 flex-1">
            <span className={`text-[10px] font-black uppercase tracking-wide ${visual.text}`}>
              {request.category}
            </span>
            <span className="text-[13px] font-bold text-stone-900 leading-tight truncate">
              {request.title}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-stone-500 leading-tight truncate">
              <MapPin className="w-2.5 h-2.5 shrink-0" /> {request.city}
            </span>
          </div>

          {/* CTA */}
          <Link
            href="/requests"
            onClick={() => {
              [t1, t2, t3].forEach(r => { if (r.current) clearTimeout(r.current); });
              releasePromptLane(LANE_ID);
              setVisible(false);
            }}
            className="flex items-center gap-1 bg-[#1e3a60] hover:bg-[#16304d] active:scale-95 text-white text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full transition-all whitespace-nowrap shrink-0"
          >
            Help →
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
          @keyframes ck-donee-drain {
            from { transform: scaleX(1); }
            to   { transform: scaleX(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
