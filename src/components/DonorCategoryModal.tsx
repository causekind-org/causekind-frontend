"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Package, X, Sparkles, Check } from "lucide-react";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS } from "@/lib/categoryVisuals";

export const DONOR_CATEGORY_EVENT = "ck-category-changed";
const STORAGE_KEY = "causekind_donor_category";

// Derived from the shared category source — no hardcoded copy here. Adding a
// category to ALL_REQUEST_CATEGORIES/CATEGORY_VISUALS updates this grid too.
const CATEGORIES = [
  ...ALL_REQUEST_CATEGORIES.map(name => {
    const v = CATEGORY_VISUALS[name];
    return { name, Icon: v.Icon, col: v.col, iconBg: v.iconBg, border: v.border, ring: v.ring, badge: v.badge, blurb: v.blurb };
  }),
  // Action tile, not a category — jumps straight to listing an item.
  { name: "List Item", Icon: Package, col: "text-orange-300", iconBg: "bg-orange-500/20", border: "border-orange-400/40", ring: "ring-orange-400/50", badge: "bg-orange-400",
    blurb: "Skip choosing — go straight to listing an item you want to give." },
];

export function DonorCategoryModal() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [show, setShow]               = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && user?.role === "DONOR") setShow(true);
  }, [isLoading, user?.role]);

  function apply(cats: string[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
    window.dispatchEvent(new CustomEvent(DONOR_CATEGORY_EVENT, { detail: cats }));
    setShow(false);
  }

  if (!show || !user || user.role !== "DONOR") return null;

  return (
    <>
      <style>{`
        @keyframes ck-cat-backdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ck-cat-card {
          from { opacity: 0; transform: translateY(56px) scale(0.93); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes ck-cat-item {
          from { opacity: 0; transform: translateY(18px) scale(0.87); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes ck-glow-breathe {
          0%, 100% { opacity: 0.35; transform: scale(1);    }
          50%      { opacity: 0.6;  transform: scale(1.12); }
        }
        @keyframes ck-shimmer-slide {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%);  }
        }
        .ck-cat-backdrop-el { animation: ck-cat-backdrop 0.38s ease both; }
        .ck-cat-card-el     { animation: ck-cat-card 0.62s cubic-bezier(0.16,1,0.3,1) 0.07s both; }
        .ck-cat-item-el     { animation: ck-cat-item 0.48s cubic-bezier(0.16,1,0.3,1) both; }
        .ck-glow-a          { animation: ck-glow-breathe 4.5s ease-in-out infinite, ck-cat-drift 26s ease-in-out infinite alternate; }
        .ck-glow-b          { animation: ck-glow-breathe 5.5s ease-in-out infinite 2s, ck-cat-drift 32s ease-in-out infinite alternate-reverse; }
        .ck-shimmer-btn:hover .ck-shimmer-inner {
          animation: ck-shimmer-slide 0.65s ease forwards;
        }

        /* Faint ambient motion — same treatment as the welcome overlay */
        @keyframes ck-cat-drift {
          from { translate: 0 0; }
          to   { translate: 7vmax 5vmax; }
        }
        .ck-cat-ember {
          position: absolute; bottom: -6px; border-radius: 9999px;
          background: #f0b97a; opacity: 0; pointer-events: none;
          animation: ck-cat-ember-rise linear infinite;
        }
        @keyframes ck-cat-ember-rise {
          0%   { opacity: 0;    transform: translateY(0) translateX(0); }
          12%  { opacity: 0.4;  }
          70%  { opacity: 0.18; }
          100% { opacity: 0;    transform: translateY(-78vh) translateX(3vw); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ck-glow-a, .ck-glow-b { animation: none; }
          .ck-cat-ember { animation: none; display: none; }
        }

        /* Hover tooltip — springy pop in the category's own theme color */
        @keyframes ck-tip-pop {
          0%   { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.86); }
          60%  { opacity: 1; transform: translateX(-50%) translateY(-3px) scale(1.04); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        .ck-cat-tip {
          animation: ck-tip-pop 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          box-shadow: 0 10px 32px -6px color-mix(in srgb, currentColor 45%, transparent),
                      inset 0 1px 0 rgba(255,255,255,0.12);
        }
        @media (prefers-reduced-motion: reduce) {
          .ck-cat-tip { animation: none; }
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-4 sm:p-6 ck-cat-backdrop-el"
        style={{
          background: "linear-gradient(135deg, rgba(176,74,21,0.14) 0%, rgba(8,5,2,0.82) 55%, rgba(30,58,96,0.14) 100%)",
          backdropFilter: "blur(22px) saturate(1.3)",
        }}
        onClick={() => setShow(false)}
      >
        {/* Ambient glows */}
        <div
          className="ck-glow-a absolute top-[20%] left-[30%] w-[440px] h-[440px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(176,74,21,0.22) 0%, transparent 65%)" }}
        />
        <div
          className="ck-glow-b absolute bottom-[15%] right-[28%] w-[360px] h-[360px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(30,58,96,0.22) 0%, transparent 65%)" }}
        />

        {/* Rising embers — same faint treatment as the welcome overlay */}
        {[
          { left: "10%", size: 4, delay: "0s",   dur: "11s" },
          { left: "26%", size: 3, delay: "3.5s", dur: "13s" },
          { left: "44%", size: 5, delay: "1.2s", dur: "10s" },
          { left: "63%", size: 3, delay: "5s",   dur: "14s" },
          { left: "79%", size: 4, delay: "2.2s", dur: "12s" },
          { left: "91%", size: 3, delay: "6.5s", dur: "13s" },
        ].map((e, i) => (
          <span
            key={i}
            className="ck-cat-ember"
            style={{ left: e.left, width: e.size, height: e.size, animationDelay: e.delay, animationDuration: e.dur }}
          />
        ))}

        {/* ── Glass card ── */}
        <div
          className="ck-cat-card-el relative w-full max-w-md flex flex-col gap-5 rounded-[2rem] p-6"
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(36px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.13)",
            boxShadow: [
              "0 48px 100px rgba(0,0,0,0.6)",
              "inset 0 1px 0 rgba(255,255,255,0.16)",
              "inset 0 0 0 1px rgba(255,255,255,0.05)",
            ].join(", "),
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setShow(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/35 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>

          {/* ── Header ── */}
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #b04a15, #e07b3a)",
                  boxShadow: "0 10px 28px rgba(176,74,21,0.5), inset 0 1px 0 rgba(255,255,255,0.22)",
                }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#f0b97a] mb-1.5">
              Where will you make an impact?
            </p>
            <h2 className="text-xl font-extrabold text-white leading-snug tracking-tight">
              Choose your focus areas
            </h2>
            <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">
              We&apos;ll show you the most urgent local needs in your area.
            </p>
          </div>

          <div className="h-px" style={{ background: "rgba(255,255,255,0.08)" }} />

          {/* ── Category grid ── */}
          <div className="grid grid-cols-3 gap-2.5">
            {CATEGORIES.map(({ name, Icon, col, iconBg, border, ring, badge, blurb }, idx) => {
              const isSelected = tempSelected.includes(name);
              const isAction = name === "List Item";
              return (
                <button
                  key={name}
                  onClick={() => {
                    if (isAction) {
                      setShow(false);
                      router.push("/items/new");
                      return;
                    }
                    setTempSelected(prev =>
                      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
                    );
                  }}
                  className={`ck-cat-item-el relative border transition-all duration-200 active:scale-95 group
                    ${isAction
                      ? "col-span-3 flex flex-row items-center justify-center gap-2.5 py-3 px-2 rounded-2xl"
                      : "flex flex-col items-center gap-2 py-4 px-2 rounded-2xl"}
                    ${isSelected
                      ? `${border} ring-2 ${ring} ${iconBg} scale-[1.03]`
                      : "border-white/[0.08] hover:border-white/20"}`}
                  style={{
                    animationDelay: `${0.2 + idx * 0.06}s`,
                    ...(isSelected ? {} : { background: "rgba(255,255,255,0.03)" }),
                    transition: "background 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                >
                  {/* Selected check badge — unmistakable vs. the old faint dot */}
                  {isSelected && (
                    <span className={`absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full ${badge} shadow-lg z-10`}>
                      <Check className="h-3 w-3 text-stone-950" strokeWidth={3.5} />
                    </span>
                  )}

                  {/* Hover tooltip — themed sticky card explaining the category */}
                  <span
                    className={`ck-cat-tip pointer-events-none absolute bottom-full left-1/2 z-30 mb-2.5 hidden w-48 flex-col items-center rounded-xl border px-3 py-2.5 text-center group-hover:flex ${border} ${col}`}
                    style={{ background: "rgba(15, 10, 5, 0.92)", backdropFilter: "blur(8px)" }}
                    role="tooltip"
                  >
                    <span className={`mb-1 flex h-6 w-6 items-center justify-center rounded-lg ${iconBg}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[11px] font-extrabold leading-tight">{name}</span>
                    <span className="mt-1 text-[10px] font-medium leading-snug text-stone-300">{blurb}</span>
                    {/* Arrow */}
                    <span
                      className={`absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r ${border}`}
                      style={{ background: "rgba(15, 10, 5, 0.92)" }}
                    />
                  </span>

                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg} transition-transform duration-200 ${isSelected ? "scale-110" : "group-hover:scale-105"}`}>
                    <Icon className={`w-5 h-5 ${col}`} />
                  </div>

                  {/* Label */}
                  <span className={`text-[11px] font-bold text-center leading-tight transition-colors duration-200 ${isSelected ? col : "text-stone-400 group-hover:text-stone-200"}`}>
                    {name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="h-px" style={{ background: "rgba(255,255,255,0.08)" }} />

          {/* ── Actions ── */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => apply(tempSelected)}
              className="ck-shimmer-btn group relative w-full py-3.5 rounded-2xl text-sm font-extrabold text-white overflow-hidden transition-all duration-200 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #b04a15 0%, #e07b3a 100%)",
                boxShadow: "0 10px 32px rgba(176,74,21,0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              <span className="ck-shimmer-inner absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full pointer-events-none" />
              <span className="relative z-10">
                {tempSelected.length > 0
                  ? `Apply Selection (${tempSelected.length}) →`
                  : "Apply Selection (All) →"}
              </span>
            </button>

            <button
              onClick={() => apply([])}
              className="text-stone-500 hover:text-stone-300 text-xs font-semibold text-center transition-colors py-1.5"
            >
              Show all needs instead
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
