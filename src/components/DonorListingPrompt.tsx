"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, PackagePlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";

const FIRST_DELAY_MS  = 800;
const VISIBLE_MS      = 10_000;
const REPEAT_DELAY_MS = 15_000;
const EXIT_MS         = 380;

export function DonorListingPrompt() {
  const { user, isLoading } = useAuth();
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
    if (isLoading || !userEmail || userRole !== "DONOR") return;
    if (dismissed) return;

    function show(delay: number) {
      t1.current = setTimeout(() => {
        if (pathnameRef.current === "/items/new") { show(delay); return; }
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
            show(REPEAT_DELAY_MS);
          }, EXIT_MS);
        }, VISIBLE_MS);
      }, delay);
    }

    show(FIRST_DELAY_MS);
    return () => { [t1, t2, t3, t4].forEach(r => { if (r.current) clearTimeout(r.current); }); };
  }, [isLoading, userEmail, userRole, dismissed]);

  function dismiss() {
    setDismissed(true);
    [t1, t2, t3, t4].forEach(r => { if (r.current) clearTimeout(r.current); });
    setEntered(false);
    t4.current = setTimeout(() => setVisible(false), EXIT_MS);
  }

  if (!visible || userRole !== "DONOR") return null;

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
        <div className="relative flex items-center gap-3 bg-white border border-stone-200 rounded-full pl-2.5 pr-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(176,74,21,0.15)] overflow-hidden">

          {/* Progress bar — pure CSS animation, no JS interval */}
          <div
            key={barKey}
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#b04a15] origin-left"
            style={{ animation: `ck-drain ${VISIBLE_MS}ms linear forwards` }}
          />

          {/* Icon + pulsing dot */}
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#b04a15]/10 border border-[#b04a15]/20 flex items-center justify-center">
              <PackagePlus className="w-4 h-4 text-[#b04a15]" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#b04a15] opacity-40" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#b04a15] border-2 border-white" />
            </span>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-0 min-w-0">
            <span className="text-[13px] font-bold text-stone-900 whitespace-nowrap leading-tight">Got spare items?</span>
            <span className="text-[11px] text-stone-500 whitespace-nowrap leading-tight">Books, clothes, electronics — someone needs them</span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-stone-200 shrink-0" />

          {/* CTA */}
          <Link
            href="/items/new"
            onClick={() => {
              [t1, t2, t3].forEach(r => { if (r.current) clearTimeout(r.current); });
              setVisible(false);
            }}
            className="flex items-center gap-1.5 bg-[#b04a15] hover:bg-[#963c0d] active:scale-95 text-white text-xs font-black uppercase tracking-wide px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap shrink-0"
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
