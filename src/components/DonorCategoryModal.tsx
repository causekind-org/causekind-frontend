"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Stethoscope, BookOpen, Sprout, Users, Home, Package, X, Sparkles } from "lucide-react";

export const DONOR_CATEGORY_EVENT = "ck-category-changed";
const STORAGE_KEY = "causekind_donor_category";

const CATEGORIES = [
  { name: "Medical aid", Icon: Stethoscope, col: "text-sky-300",     iconBg: "bg-sky-500/20",      border: "border-sky-400/40",    ring: "ring-sky-400/50"     },
  { name: "Education",   Icon: BookOpen,    col: "text-amber-300",   iconBg: "bg-amber-500/20",    border: "border-amber-400/40",  ring: "ring-amber-400/50"   },
  { name: "Livelihood",  Icon: Sprout,      col: "text-emerald-300", iconBg: "bg-emerald-500/20",  border: "border-emerald-400/40",ring: "ring-emerald-400/50" },
  { name: "Relief",      Icon: Users,       col: "text-violet-300",  iconBg: "bg-violet-500/20",   border: "border-violet-400/40", ring: "ring-violet-400/50"  },
  { name: "Household",   Icon: Home,        col: "text-rose-300",    iconBg: "bg-rose-500/20",     border: "border-rose-400/40",   ring: "ring-rose-400/50"    },
  { name: "List Item",   Icon: Package,     col: "text-orange-300",  iconBg: "bg-orange-500/20",   border: "border-orange-400/40", ring: "ring-orange-400/50"  },
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
        .ck-glow-a          { animation: ck-glow-breathe 4.5s ease-in-out infinite; }
        .ck-glow-b          { animation: ck-glow-breathe 5.5s ease-in-out infinite 2s; }
        .ck-shimmer-btn:hover .ck-shimmer-inner {
          animation: ck-shimmer-slide 0.65s ease forwards;
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
            {CATEGORIES.map(({ name, Icon, col, iconBg, border, ring }, idx) => {
              const isSelected = tempSelected.includes(name);
              return (
                <button
                  key={name}
                  onClick={() => {
                    if (name === "List Item") {
                      setShow(false);
                      router.push("/items/new");
                      return;
                    }
                    setTempSelected(prev =>
                      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
                    );
                  }}
                  className={`ck-cat-item-el relative flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border transition-all duration-200 active:scale-95 group
                    ${isSelected
                      ? `${border} ring-1 ${ring}`
                      : "border-white/[0.08] hover:border-white/20"}`}
                  style={{
                    animationDelay: `${0.2 + idx * 0.07}s`,
                    background: isSelected ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                    transition: "background 0.2s ease, border-color 0.2s ease, transform 0.15s ease",
                  }}
                >
                  {/* Selected dot */}
                  {isSelected && (
                    <span
                      className={`absolute top-2 right-2 w-2 h-2 rounded-full ${col.replace("text-", "bg-")}`}
                      style={{ boxShadow: "0 0 6px 2px currentColor" }}
                    />
                  )}

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
