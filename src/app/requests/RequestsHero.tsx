"use client";

import { useEffect, useState } from "react";
import Link from "@/components/AppLink";
import { HandCoins, Plus, X, ChevronDown } from "lucide-react";

export function RequestsHero({ total, critical }: { total: number; critical: number }) {
  const [mouse, setMouse] = useState({ x: 50, y: 40 });
  const [active, setActive] = useState(false);

  // "List from here" hint — appears next to the CTA ~10s after landing, stays
  // until dismissed.
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 10_000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        setMouse({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className="relative w-full min-h-[380px] sm:min-h-[460px] overflow-hidden select-none"
      style={{ background: "linear-gradient(135deg, #1c0905 0%, #2a0f07 45%, #0f1d30 100%)" }}
    >
      {/* Mouse-tracking warm glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-200 ease-out"
        style={{ background: `radial-gradient(ellipse at ${mouse.x}% ${mouse.y}%, rgba(176,74,21,${active ? 0.38 : 0.2}) 0%, transparent 55%)` }}
      />
      {/* Static cool-side glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 85% 15%, rgba(30,58,96,0.28) 0%, transparent 50%)" }} />

      {/* Dot grid texture */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.15] pointer-events-none" />

      {/* Decorative rings */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full border border-[var(--ck-role-accent)]/10 animate-blob-a pointer-events-none" />
      <div className="absolute -top-24 right-8  w-80 h-80 rounded-full border border-[#1e3a60]/12 animate-blob-b pointer-events-none" />
      <div className="absolute bottom-8 right-32 w-48 h-48 rounded-full border border-[var(--ck-role-secondary)]/08 animate-blob-b pointer-events-none" />

      {/* Floating ambient dots */}
      <div className="absolute top-[22%] left-[10%] w-2 h-2 rounded-full bg-[var(--ck-role-highlight)]/30 animate-float-shape-1 pointer-events-none" />
      <div className="absolute top-[60%] right-[12%] w-1.5 h-1.5 rounded-full bg-[var(--ck-role-secondary)]/40 animate-float-shape-3 pointer-events-none" />
      <div className="absolute top-[35%] right-[38%] w-1.5 h-1.5 rounded-full bg-white/15 animate-float-shape-2 pointer-events-none" />
      <div className="absolute bottom-[20%] left-[45%] w-1 h-1 rounded-full bg-[var(--ck-role-accent)]/40 animate-float-shape-4 pointer-events-none" />

      {/* Ghost large icon */}
      <div className="absolute bottom-4 right-6 opacity-[0.05] animate-blob-a pointer-events-none">
        <HandCoins className="h-40 w-40 text-white" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-14 lg:py-20">
        <div className="max-w-2xl">

          {/* ── Left: headline ── */}
          <div className="space-y-7">

            {/* Live badge */}
            <div className="inline-flex items-center gap-2.5 bg-[var(--ck-role-accent)]/20 border border-[var(--ck-role-accent)]/35 rounded-full px-4 py-1.5 anim-up anim-d1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--ck-role-highlight)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ck-role-highlight)]" />
              </span>
              <span className="text-[var(--ck-role-highlight)] text-3xs font-black uppercase tracking-widest">Live Community Needs</span>
            </div>

            {/* Headline */}
            <div className="anim-up anim-d2">
              <h1 className="text-white text-2xl sm:text-5xl lg:text-[3.6rem] font-extrabold leading-[1.04] tracking-tight">
                Give items.{" "}
                <span className="text-gradient-terra">Change lives.</span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-white/60 text-sm sm:text-base leading-relaxed max-w-md anim-up anim-d3">
              Real people nearby need specific items — not cash. Browse verified requests and donate directly, no shipping fees, no middlemen.
            </p>

            {/* Live stats */}
            <div className="flex flex-wrap items-center gap-5 sm:gap-8 anim-up anim-d4">
              <div>
                <p className="text-xl sm:text-3xl font-black text-white tabular-nums">{total}</p>
                <p className="text-3xs font-bold text-white/35 uppercase tracking-wider mt-0.5">Active Needs</p>
              </div>
              {critical > 0 && (
                <>
                  <div className="w-px h-10 bg-white/10" />
                  <div>
                    <p className="text-xl sm:text-3xl font-black text-red-400 tabular-nums">{critical}</p>
                    <p className="text-3xs font-bold text-white/35 uppercase tracking-wider mt-0.5">Urgent</p>
                  </div>
                </>
              )}
              <div className="hidden sm:block w-px h-10 bg-white/10" />
              <div className="hidden sm:block">
                <p className="text-xl sm:text-3xl font-black text-[var(--ck-role-highlight)]">0%</p>
                <p className="text-3xs font-bold text-white/35 uppercase tracking-wider mt-0.5">Platform Fees</p>
              </div>
            </div>

            {/* Primary CTA — moved here from the category bar, with attention pulse */}
            <div className="relative inline-block anim-up anim-d5">
              <style>{`
                @keyframes ck-cta-pulse {
                  0%, 100% { box-shadow: 0 8px 28px rgba(176,74,21,0.45), 0 0 0 0 rgba(240,185,122,0.45); }
                  50%      { box-shadow: 0 8px 28px rgba(176,74,21,0.45), 0 0 0 12px rgba(240,185,122,0); }
                }
                .ck-cta-list { animation: ck-cta-pulse 2.4s ease-out infinite; }
                @keyframes ck-hint-pop {
                  0%   { opacity: 0; transform: translateY(8px) scale(0.88); }
                  60%  { opacity: 1; transform: translateY(-3px) scale(1.03); }
                  100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                .ck-cta-hint { animation: ck-hint-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
                @media (prefers-reduced-motion: reduce) {
                  .ck-cta-list, .ck-cta-hint { animation: none; }
                }
              `}</style>

              <Link
                href="/items/new"
                className="ck-cta-list inline-flex items-center gap-2 rounded-xl sm:rounded-2xl px-4 sm:px-7 py-3.5 text-sm font-extrabold text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg, var(--ck-role-accent) 0%, var(--ck-role-secondary) 100%)" }}
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
                List an Item
              </Link>

              {/* Sticky hint — pops in beside the button after 10s, dismissible */}
              {showHint && (
                /* Mobile places this ABOVE the button, not below it. The hero root
                   is `overflow-hidden` (for the decorative w-96 blobs, which would
                   otherwise cause horizontal scroll), so a hint hanging off the
                   bottom edge on `top-full` was clipped mid-sentence and the
                   sticky CategoryBar covered what was left. Above the button it
                   stays inside the hero, so nothing can clip it. Desktop is
                   unchanged — it sits beside the button, already well inside. */
                <div className="ck-cta-hint absolute left-0 bottom-full mb-3 sm:bottom-auto sm:left-full sm:top-1/2 sm:mb-0 sm:ml-4 sm:-translate-y-1/2 z-20 w-60">
                  <div className="relative rounded-xl sm:rounded-2xl border border-[var(--ck-role-highlight)]/40 bg-[#1c0905]/95 backdrop-blur-md px-4 py-3 shadow-xl shadow-black/40">
                    {/* Arrow — points down at the button on mobile, left on desktop */}
                    {/* Rotated square: the outlined corner is the one that points.
                        Mobile shows bottom+right → the bottom corner points down at
                        the button. Desktop drops the right edge for the left one →
                        bottom+left, the corner that protrudes toward the button. */}
                    <span className="absolute -bottom-1 left-8 h-2.5 w-2.5 rotate-45 border-b border-r border-[var(--ck-role-highlight)]/40 bg-[#1c0905] sm:bottom-auto sm:top-1/2 sm:-left-1.5 sm:-mt-1.5 sm:border-r-0 sm:border-l" />
                    <button
                      onClick={() => setShowHint(false)}
                      aria-label="Dismiss hint"
                      className="absolute top-2 right-2 text-white/30 hover:text-white/70 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <p className="text-[var(--ck-role-highlight)] text-3xs font-black uppercase tracking-widest mb-1">Got spare items?</p>
                    <p className="text-white/80 text-xs leading-relaxed pr-3">
                      List your item from here — books, clothes, electronics. Someone nearby needs it.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Scroll cue */}
            <div className="flex items-center gap-2 anim-up anim-d6">
              <span className="text-white/25 text-3xs font-bold uppercase tracking-widest">Browse needs below</span>
              <ChevronDown className="h-4 w-4 text-white/25 animate-bounce-slow" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
