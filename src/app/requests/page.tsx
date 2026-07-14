"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import { useDynamicTranslation, TranslatedText } from "@/hooks/useDynamicTranslation";
import { getItemRequests, donateToRequest, getMyProfile, updateLocation, analyzeItemImage, type ItemRequest, type UserProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { Reveal } from "@/components/Reveal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  ImagePlus, Loader2, MapPin, PackageOpen, Search, SearchX,
  Sparkles, X, HandCoins, Package, Plus, ChevronDown,
  ShieldCheck, Heart, SlidersHorizontal, AlertTriangle, ArrowRight,
  BookOpen, Stethoscope, Sprout, Users, Home, Activity,
  Armchair, Shirt, Smartphone, Dumbbell,
} from "lucide-react";
import Link from "next/link";
import { DoneeRequestsPage } from "./donee-view";

// ── Constants ──────────────────────────────────────────────────────────────────

// Kept symmetric with donor listing categories — see src/lib/categoryVisuals.ts.
const ITEM_REQ_CATEGORIES = [
  "Medical aid", "Education", "Livelihood", "Relief", "Household",
  "Furniture", "Clothing", "Electronics", "Sports",
];

const URGENCY_LEVELS = [
  { value: "CRITICAL", label: "Critical",  dot: "bg-red-500"    },
  { value: "HIGH",     label: "High",      dot: "bg-amber-500"  },
  { value: "NORMAL",   label: "Normal",    dot: "bg-stone-400"  },
];

const REQ_SORT_OPTIONS = [
  { value: "nearest" as const, label: "Nearest First" },
  { value: "urgent"  as const, label: "Most Urgent"   },
  { value: "newest"  as const, label: "Just Added"    },
  { value: "qty"     as const, label: "High Quantity" },
];

type ReqSortValue = "nearest" | "urgent" | "newest" | "qty";

// ── Category design tokens ────────────────────────────────────────────────────

const CAT_ICON: Record<string, React.ElementType> = {
  "Medical aid": Stethoscope,
  "Education":   BookOpen,
  "Livelihood":  Sprout,
  "Relief":      Users,
  "Household":   Home,
  "Furniture":   Armchair,
  "Clothing":    Shirt,
  "Electronics": Smartphone,
  "Sports":      Dumbbell,
};

const CAT_COLOR: Record<string, { pill: string; bar: string; dot: string; text: string; border: string }> = {
  "Medical aid": {
    pill:   "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800/60",
    bar:    "bg-sky-500",
    dot:    "bg-sky-500",
    text:   "text-sky-700 dark:text-sky-400",
    border: "border-sky-500",
  },
  "Education": {
    pill:   "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/60",
    bar:    "bg-amber-500",
    dot:    "bg-amber-500",
    text:   "text-amber-700 dark:text-amber-400",
    border: "border-amber-500",
  },
  "Livelihood": {
    pill:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/60",
    bar:    "bg-emerald-500",
    dot:    "bg-emerald-500",
    text:   "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500",
  },
  "Relief": {
    pill:   "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800/60",
    bar:    "bg-violet-500",
    dot:    "bg-violet-500",
    text:   "text-violet-700 dark:text-violet-400",
    border: "border-violet-500",
  },
  "Household": {
    pill:   "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/60",
    bar:    "bg-rose-500",
    dot:    "bg-rose-500",
    text:   "text-rose-700 dark:text-rose-400",
    border: "border-rose-500",
  },
  "Furniture": {
    pill:   "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/60",
    bar:    "bg-indigo-500",
    dot:    "bg-indigo-500",
    text:   "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-500",
  },
  "Clothing": {
    pill:   "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800/60",
    bar:    "bg-teal-500",
    dot:    "bg-teal-500",
    text:   "text-teal-700 dark:text-teal-400",
    border: "border-teal-500",
  },
  "Electronics": {
    pill:   "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/60",
    bar:    "bg-orange-500",
    dot:    "bg-orange-500",
    text:   "text-orange-700 dark:text-orange-400",
    border: "border-orange-500",
  },
  "Sports": {
    pill:   "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-800/60",
    bar:    "bg-cyan-500",
    dot:    "bg-cyan-500",
    text:   "text-cyan-700 dark:text-cyan-400",
    border: "border-cyan-500",
  },
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function RequestCardSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden border border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm animate-pulse">
      <div className="w-full h-52 bg-stone-100 dark:bg-zinc-800" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-24 bg-stone-100 dark:bg-zinc-800 rounded-full" />
        <div className="h-5 w-4/5 bg-stone-100 dark:bg-zinc-800 rounded" />
        <div className="h-4 w-full bg-stone-100 dark:bg-zinc-800 rounded" />
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-stone-100 dark:bg-zinc-800" />
          <div className="h-3 w-28 bg-stone-100 dark:bg-zinc-800 rounded" />
        </div>
        <div className="h-11 w-full bg-stone-100 dark:bg-zinc-800 rounded-2xl" />
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function RequestsHero({
  total,
  critical,
  catCounts,
  selected,
  onToggle,
}: {
  total: number;
  critical: number;
  catCounts: Record<string, number>;
  selected: string[];
  onToggle: (c: string) => void;
}) {
  const [mouse, setMouse] = useState({ x: 50, y: 40 });
  const [active, setActive] = useState(false);

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
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full border border-[#b04a15]/10 animate-blob-a pointer-events-none" />
      <div className="absolute -top-24 right-8  w-80 h-80 rounded-full border border-[#1e3a60]/12 animate-blob-b pointer-events-none" />
      <div className="absolute bottom-8 right-32 w-48 h-48 rounded-full border border-[#e07b3a]/08 animate-blob-b pointer-events-none" />

      {/* Floating ambient dots */}
      <div className="absolute top-[22%] left-[10%] w-2 h-2 rounded-full bg-[#f0b97a]/30 animate-float-shape-1 pointer-events-none" />
      <div className="absolute top-[60%] right-[12%] w-1.5 h-1.5 rounded-full bg-[#e07b3a]/40 animate-float-shape-3 pointer-events-none" />
      <div className="absolute top-[35%] right-[38%] w-1.5 h-1.5 rounded-full bg-white/15 animate-float-shape-2 pointer-events-none" />
      <div className="absolute bottom-[20%] left-[45%] w-1 h-1 rounded-full bg-[#b04a15]/40 animate-float-shape-4 pointer-events-none" />

      {/* Ghost large icon */}
      <div className="absolute bottom-4 right-6 opacity-[0.05] animate-blob-a pointer-events-none">
        <HandCoins className="h-40 w-40 text-white" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-14 lg:py-20">
        <div className="max-w-2xl">

          {/* ── Left: headline ── */}
          <div className="space-y-7">

            {/* Live badge */}
            <div className="inline-flex items-center gap-2.5 bg-[#b04a15]/20 border border-[#b04a15]/35 rounded-full px-4 py-1.5 anim-up anim-d1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f0b97a] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f0b97a]" />
              </span>
              <span className="text-[#f0b97a] text-[10px] font-black uppercase tracking-widest">Live Community Needs</span>
            </div>

            {/* Headline */}
            <div className="anim-up anim-d2">
              <h1 className="text-white text-4xl sm:text-5xl lg:text-[3.6rem] font-extrabold leading-[1.04] tracking-tight">
                Give items.{" "}
                <span className="text-gradient-terra">Change lives.</span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-white/60 text-sm sm:text-base leading-relaxed max-w-md anim-up anim-d3">
              Real people nearby need specific items — not cash. Browse verified requests and donate directly, no shipping fees, no middlemen.
            </p>

            {/* Live stats */}
            <div className="flex flex-wrap items-center gap-8 anim-up anim-d4">
              <div>
                <p className="text-3xl font-black text-white tabular-nums">{total}</p>
                <p className="text-[10px] font-bold text-white/35 uppercase tracking-wider mt-0.5">Active Needs</p>
              </div>
              {critical > 0 && (
                <>
                  <div className="w-px h-10 bg-white/10" />
                  <div>
                    <p className="text-3xl font-black text-red-400 tabular-nums">{critical}</p>
                    <p className="text-[10px] font-bold text-white/35 uppercase tracking-wider mt-0.5">Urgent</p>
                  </div>
                </>
              )}
              <div className="hidden sm:block w-px h-10 bg-white/10" />
              <div className="hidden sm:block">
                <p className="text-3xl font-black text-[#f0b97a]">0%</p>
                <p className="text-[10px] font-bold text-white/35 uppercase tracking-wider mt-0.5">Platform Fees</p>
              </div>
            </div>

            {/* Scroll cue */}
            <div className="flex items-center gap-2 anim-up anim-d5">
              <span className="text-white/25 text-[10px] font-bold uppercase tracking-widest">Browse needs below</span>
              <ChevronDown className="h-4 w-4 text-white/25 animate-bounce-slow" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Category quick-filter bar ────────────────────────────────────────────────

function CategoryBar({
  catCounts,
  selected,
  onToggle,
  onClearAll,
  total,
}: {
  catCounts: Record<string, number>;
  selected: string[];
  onToggle: (c: string) => void;
  onClearAll: () => void;
  total: number;
}) {
  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-stone-100 dark:border-zinc-800 sticky top-14 lg:top-[88px] z-40 shadow-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center gap-2">

        {/* Scrollable pill row */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-3 flex-1 min-w-0">

          {/* All */}
          <button
            onClick={onClearAll}
            className={`flex items-center gap-1.5 shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
              selected.length === 0
                ? "bg-[#b04a15] text-white shadow-sm shadow-orange-900/25"
                : "bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-zinc-700"
            }`}
          >
            All
            <span className={`tabular-nums text-[10px] font-black ${selected.length === 0 ? "text-white/60" : "text-stone-400"}`}>{total}</span>
          </button>

          <div className="w-px h-5 bg-stone-200 dark:bg-zinc-700 shrink-0 mx-0.5" />

          {ITEM_REQ_CATEGORIES.map(cat => {
            const Icon  = CAT_ICON[cat] ?? Package;
            const count = catCounts[cat] ?? 0;
            const act   = selected.includes(cat);
            const col   = CAT_COLOR[cat];

            return (
              <button
                key={cat}
                onClick={() => onToggle(cat)}
                disabled={count === 0}
                className={`flex items-center gap-2 shrink-0 rounded-full px-4 py-2 text-xs font-bold border transition-all duration-200
                            disabled:opacity-35 disabled:cursor-not-allowed
                            ${act
                              ? "bg-[#b04a15] text-white border-transparent shadow-sm shadow-orange-900/20"
                              : `${col.pill} hover:opacity-80`
                            }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{cat}</span>
                <span className={`tabular-nums text-[10px] font-black ${act ? "text-white/60" : ""}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Pinned CTA — doesn't scroll with the pills */}
        <div className="shrink-0 pl-2 border-l border-stone-200 dark:border-zinc-700">
          <Link
            href="/items/new"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold border-2 border-[#b04a15] text-[#b04a15] hover:bg-[#b04a15] hover:text-white transition-all duration-200 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">List an Item</span>
          </Link>
        </div>

      </div>
    </div>
  );
}

// ── Filter sidebar panel (urgency + sort only) ────────────────────────────────

function RequestFilterPanel({
  selectedUrgencies,
  toggleUrgency,
  sort,
  setSort,
  resetFilters,
}: {
  selectedUrgencies: string[];
  toggleUrgency: (u: string) => void;
  sort: ReqSortValue;
  setSort: (s: ReqSortValue) => void;
  resetFilters: () => void;
}) {
  const active = (val: string) => selectedUrgencies.includes(val);
  const activeSort = (val: string) => sort === val;

  return (
    <div className="space-y-7">

      {/* Urgency */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Urgency</p>
        <div className="space-y-1">
          {URGENCY_LEVELS.map(({ value, label, dot }) => (
            <label
              key={value}
              className={`flex items-center gap-3 cursor-pointer rounded-xl px-3 py-2.5 transition-colors ${
                active(value) ? "bg-[#b04a15]/8 dark:bg-[#b04a15]/12" : "hover:bg-stone-50 dark:hover:bg-zinc-800"
              }`}
            >
              <input
                type="checkbox"
                checked={active(value)}
                onChange={() => toggleUrgency(value)}
                className="accent-[#b04a15] shrink-0"
              />
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
              <span className={`text-sm font-semibold transition-colors ${
                active(value) ? "text-[#b04a15] dark:text-[#e07b3a]" : "text-stone-700 dark:text-stone-300"
              }`}>
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Sort By</p>
        <div className="space-y-1">
          {REQ_SORT_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 cursor-pointer rounded-xl px-3 py-2.5 transition-colors ${
                activeSort(opt.value) ? "bg-[#b04a15]/8 dark:bg-[#b04a15]/12" : "hover:bg-stone-50 dark:hover:bg-zinc-800"
              }`}
            >
              <input
                type="radio"
                name="req-sort"
                checked={activeSort(opt.value)}
                onChange={() => setSort(opt.value)}
                className="accent-[#b04a15] shrink-0"
              />
              <span className={`text-sm font-semibold transition-colors ${
                activeSort(opt.value) ? "text-[#b04a15] dark:text-[#e07b3a]" : "text-stone-700 dark:text-stone-300"
              }`}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={resetFilters}
        className="w-full text-xs font-bold text-stone-400 hover:text-[#b04a15] dark:hover:text-[#e07b3a] transition-colors py-2 border border-stone-200 dark:border-zinc-700 rounded-xl hover:border-[#b04a15]/40"
      >
        Reset Filters
      </button>
    </div>
  );
}

// ── Request listing block ─────────────────────────────────────────────────────
// No card container — a category-colored top rule plus typography. Urgent requests
// get a bigger type scale instead of a different "skin", so the masonry's natural
// height variety is driven by real data (urgency, description length), not decoration.

function RequestBlock({ r, onGive }: { r: ItemRequest; onGive: (r: ItemRequest) => void }) {
  const col      = CAT_COLOR[r.category] ?? CAT_COLOR["Medical aid"];
  const Icon     = CAT_ICON[r.category] ?? Package;
  const isCrit   = r.urgency === "CRITICAL";
  const isHigh   = r.urgency === "HIGH";
  const featured = isCrit;

  return (
    <Reveal>
      <div
        onClick={() => onGive(r)}
        className={`group cursor-pointer border-t-2 pt-4 ${col.border}`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide ${col.text}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> <TranslatedText text={r.category} />
          </span>
          {r.isEmergency ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-wide text-white bg-red-600 px-1.5 py-0.5 rounded">
              <AlertTriangle className="h-3 w-3 shrink-0" /> Emergency
            </span>
          ) : (isCrit || isHigh) && (
            <span className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-wide ${isCrit ? "text-[#b04a15]" : "text-amber-600 dark:text-amber-400"}`}>
              <AlertTriangle className="h-3 w-3 shrink-0" /> {isCrit ? "Urgent" : "High"}
            </span>
          )}
        </div>

        <h3
          className={`mt-2.5 font-extrabold leading-snug text-stone-900 transition-colors dark:text-stone-100 group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a] ${
            featured ? "text-2xl line-clamp-2" : "text-base line-clamp-2"
          }`}
        >
          <TranslatedText text={r.title} />
        </h3>

        {r.description && (
          <p className={`mt-1.5 text-stone-500 dark:text-stone-400 leading-relaxed ${featured ? "text-sm line-clamp-4" : "text-xs line-clamp-2"}`}>
            <TranslatedText text={r.description} />
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-stone-100 pt-3 dark:border-zinc-800">
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-stone-400 dark:text-stone-500">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate"><TranslatedText text={r.city} /></span>
            <span className="shrink-0 text-stone-300 dark:text-stone-700">·</span>
            <span className="shrink-0 tabular-nums">{r.quantity} needed</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onGive(r); }}
            className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-[#b04a15] dark:text-[#e07b3a] hover:underline"
          >
            Give <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </Reveal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const t        = useTranslations("requests");
  const { user, isLoading: authLoading } = useAuth();
  const router   = useRouter();

  useEntityUpdates(["REQUEST"], () => {
    if (!user || user.role === "DONEE" || !gpsCoords) return;
    getItemRequests(undefined, gpsCoords.lat, gpsCoords.lng)
      .then(setRequests)
      .catch(() => {});
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login?redirect=/requests"); }
    // DONEEs now get their own view — no redirect
  }, [user, authLoading, router]);

  const [requests,  setRequests]  = useState<ItemRequest[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const cat = new URLSearchParams(window.location.search).get("category");
      if (cat) return [cat];
      const saved = localStorage.getItem("causekind_donor_category");
      if (saved) {
        if (saved === "ALL") return [];
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (e) {
          return [saved];
        }
      }
    }
    return [];
  });

  // Sync with the global DonorCategoryModal when it fires while this page is open
  useEffect(() => {
    function onCategoryChanged(e: Event) {
      setSelectedCategories((e as CustomEvent<string[]>).detail);
    }
    window.addEventListener("ck-category-changed", onCategoryChanged);
    return () => window.removeEventListener("ck-category-changed", onCategoryChanged);
  }, []);

  const [selectedUrgencies,  setSelectedUrgencies]  = useState<string[]>([]);
  const [sort, setSort]           = useState<ReqSortValue>("nearest");
  const [showFilters, setShowFilters] = useState(false);

  // Donate modal state
  const [donateTarget,  setDonateTarget]  = useState<ItemRequest | null>(null);
  const modalTitle                         = useDynamicTranslation(donateTarget?.title ?? null);
  const [description,   setDescription]   = useState("");
  const [images,        setImages]        = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting,    setSubmitting]    = useState(false);
  const [analyzing,     setAnalyzing]     = useState(false);
  const [aiGenerated,   setAiGenerated]   = useState(false);

  // ── GPS and Profile load ───────────────────────────────────────────────────
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBlocked, setGpsBlocked] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);

  const requestGps = () => {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support GPS location");
      setGpsBlocked(true);
      setGpsLoading(false);
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGpsCoords({ lat, lng });
        setGpsBlocked(false);
        setGpsLoading(false);
        if (user && user.role !== "DONEE") {
          try {
            await updateLocation(lat, lng);
            const p = await getMyProfile();
            setMyProfile(p);
          } catch (e) {
            console.warn("Failed to update profile location:", e);
          }
        }
      },
      (err) => {
        console.warn("GPS retrieval error — code:", err.code, "| message:", err.message);
        setGpsBlocked(true);
        setGpsLoading(false);
        const msg =
          err.code === 1 ? "Location access denied. Please allow GPS in browser settings." :
          err.code === 2 ? "Location unavailable. Check your device GPS." :
          err.code === 3 ? "Location request timed out. Please retry." :
          "Location access denied. You must allow GPS access to view nearby requests.";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (!authLoading && user && user.role !== "DONEE") {
      requestGps();
    }
  }, [user, authLoading]);

  // Load profile details separately
  useEffect(() => {
    if (user && user.role !== "DONEE") {
      getMyProfile().then(setMyProfile).catch(() => {});
    }
  }, [user]);

  // Load requests based on GPS. Categories are deliberately NOT sent to the server —
  // category filtering happens entirely client-side below (`filtered`), so `requests`
  // always holds the full GPS-scoped set. Sending selectedCategories here used to make
  // the server return only the selected categories, which shrank `requests` itself and
  // broke `catCounts` (every unselected category read as 0 and got disabled, blocking
  // multiselect — you could never add a second category once one was picked).
  useEffect(() => {
    if (!user || user.role === "DONEE" || !gpsCoords) return;
    setLoading(true);
    getItemRequests(undefined, gpsCoords.lat, gpsCoords.lng)
      .then(setRequests)
      .catch(() => toast.error("Failed to load item requests"))
      .finally(() => setLoading(false));
  }, [user, gpsCoords]);

  // ── Derived counts ────────────────────────────────────────────────────────

  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    requests.forEach(r => { c[r.category] = (c[r.category] || 0) + 1; });
    return c;
  }, [requests]);

  const criticalCount = useMemo(() => requests.filter(r => r.urgency === "CRITICAL").length, [requests]);

  // ── Filtered + sorted requests ────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let out = requests.filter(r => {
      const mQ = !q || r.title.toLowerCase().includes(q) || r.city.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
      const mC = selectedCategories.length === 0 || selectedCategories.includes(r.category);
      const mU = selectedUrgencies.length  === 0 || selectedUrgencies.includes(r.urgency);
      return mQ && mC && mU;
    });
    if (sort === "nearest") {
      const lat = myProfile?.latitude, lon = myProfile?.longitude;
      if (lat != null && lon != null) {
        out = [...out].sort((a, b) => {
          const dA = a.latitude != null && a.longitude != null ? haversineKm(lat, lon, a.latitude, a.longitude) : 99999;
          const dB = b.latitude != null && b.longitude != null ? haversineKm(lat, lon, b.latitude, b.longitude) : 99999;
          return dA - dB;
        });
      } else {
        const ord: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2 };
        out = [...out].sort((a, b) => (ord[a.urgency] ?? 2) - (ord[b.urgency] ?? 2));
      }
    } else if (sort === "urgent") {
      const ord: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2 };
      out = [...out].sort((a, b) => (a.isEmergency === b.isEmergency ? 0 : a.isEmergency ? -1 : 1) || (ord[a.urgency] ?? 2) - (ord[b.urgency] ?? 2));
    } else if (sort === "newest") {
      out = [...out].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === "qty") {
      out = [...out].sort((a, b) => b.quantity - a.quantity);
    }
    return out;
  }, [requests, search, selectedCategories, selectedUrgencies, sort, myProfile]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      const next = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat];
      if (typeof window !== "undefined") {
        localStorage.setItem("causekind_donor_category", JSON.stringify(next));
      }
      return next;
    });
  };
  const toggleUrgency  = (u: string) =>
    setSelectedUrgencies(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);
  const resetFilters   = () => {
    setSelectedCategories([]);
    if (typeof window !== "undefined") {
      localStorage.setItem("causekind_donor_category", JSON.stringify([]));
    }
    setSelectedUrgencies([]);
    setSort("nearest");
    setSearch("");
  };

  const advancedFilterCount = selectedUrgencies.length + (sort !== "nearest" ? 1 : 0);
  const hasActiveFilters    = selectedCategories.length > 0 || advancedFilterCount > 0 || search.length > 0;

  // ── Donate modal handlers ─────────────────────────────────────────────────

  function openDonateModal(req: ItemRequest) {
    if (!user) { router.push("/login"); return; }
    router.push(`/requests/${req.id}/offer`);
  }

  function closeDonateModal() {
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setDonateTarget(null);
    setDescription(""); setImages([]); setImagePreviews([]); setAnalyzing(false); setAiGenerated(false);
  }

  useEffect(() => {
    if (!donateTarget) return;
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [donateTarget]);

  async function runAnalysis(file: File) {
    setAnalyzing(true); setAiGenerated(false); setDescription("");
    try {
      const { description: aiDesc } = await analyzeItemImage(file);
      if (aiDesc) { setDescription(aiDesc); setAiGenerated(true); }
    } catch {
      toast.error("AI analysis failed — please describe the item manually.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (images.length + files.length > 3) { toast.error("Maximum 3 images allowed"); return; }
    const next = [...images, ...files];
    setImages(next);
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews(next.map(f => URL.createObjectURL(f)));
    if (files.length > 0) runAnalysis(files[0]);
  }

  function removeImage(i: number) {
    const next = images.filter((_, idx) => idx !== i);
    setImages(next);
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImagePreviews(next.map(f => URL.createObjectURL(f)));
  }

  async function handleSubmitDonate() {
    if (!donateTarget) return;
    if (images.length === 0) { toast.error("Please upload at least one photo of the item"); return; }
    if (description.trim().length < 20) { toast.error("Please describe your item in at least 20 characters"); return; }
    setSubmitting(true);
    try {
      await donateToRequest(donateTarget.id, images, description.trim());
      toast.success("Donation request sent! Admin will review and share contact details if approved.");
      closeDonateModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit donation");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f4f0] dark:bg-zinc-950">
        <Loader2 className="w-6 h-6 animate-spin text-[#b04a15]" />
      </div>
    );
  }

  // Dedicated donee portal
  if (user.role === "DONEE") return <DoneeRequestsPage />;

  if (gpsBlocked) {
    return (
      <div className="min-h-screen bg-[#f2ede7] dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-stone-250 dark:border-zinc-800 shadow-xl">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-500">
            <MapPin className="w-8 h-8 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-white">Location Access Required</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Causekind requires your GPS location to display the closest in-kind needs from your community. Please enable location permissions in your browser to proceed.
            </p>
          </div>
          <button
            onClick={requestGps}
            disabled={gpsLoading}
            className="w-full bg-[#b04a15] hover:bg-[#963c0d] disabled:opacity-50 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {gpsLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Detecting...</> : "Retry Location Detection 🎯"}
          </button>
          <div className="text-xs text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-zinc-800 rounded-xl p-3 text-left space-y-1">
            <p className="font-semibold text-stone-600 dark:text-stone-300">If retry doesn&apos;t work:</p>
            <p>🔒 Click the <strong>lock icon</strong> in your browser&apos;s address bar</p>
            <p>📍 Set <strong>Location</strong> to <strong>Allow</strong></p>
            <p>🔄 Then reload this page</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f2ede7] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">

      {/* ── Hero ── */}
      <RequestsHero
        total={requests.length}
        critical={criticalCount}
        catCounts={catCounts}
        selected={selectedCategories}
        onToggle={toggleCategory}
      />

      {/* ── Category quick-filter bar ── */}
      <CategoryBar
        catCounts={catCounts}
        selected={selectedCategories}
        onToggle={toggleCategory}
        onClearAll={() => {
          setSelectedCategories([]);
          if (typeof window !== "undefined") {
            localStorage.setItem("causekind_donor_category", JSON.stringify([]));
          }
        }}
        total={requests.length}
      />

      {/* ── Main content ── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">

        {/* Mobile: advanced filter toggle + search */}
        <div className="flex items-center gap-3 mb-5 lg:hidden">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold text-stone-700 dark:text-stone-300 hover:border-[#b04a15]/50 hover:text-[#b04a15] transition-all shrink-0 shadow-xs"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {advancedFilterCount > 0 && (
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#b04a15] text-white text-[10px] font-black">
                {advancedFilterCount}
              </span>
            )}
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <Input
              className="pl-9 h-10 rounded-full border-stone-200 dark:border-zinc-700 focus-visible:ring-[#b04a15]/20 bg-white dark:bg-zinc-900 text-sm shadow-xs"
              placeholder="Search needs…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Mobile: collapsible filter panel */}
        {showFilters && (
          <div className="lg:hidden mb-6 rounded-2xl bg-white dark:bg-zinc-900 p-5 border border-stone-100 dark:border-zinc-800 shadow-sm">
            <RequestFilterPanel
              selectedUrgencies={selectedUrgencies}
              toggleUrgency={toggleUrgency}
              sort={sort}
              setSort={setSort}
              resetFilters={() => { resetFilters(); setShowFilters(false); }}
            />
          </div>
        )}

        {/* Main asymmetric grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 items-start">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block sticky top-[146px] bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-stone-100 dark:border-zinc-800 shrink-0">
            <h3 className="text-sm font-black text-stone-800 dark:text-stone-200 mb-5 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-stone-400" />
              Filters
            </h3>
            <RequestFilterPanel
              selectedUrgencies={selectedUrgencies}
              toggleUrgency={toggleUrgency}
              sort={sort}
              setSort={setSort}
              resetFilters={resetFilters}
            />
          </aside>

          {/* Right pane */}
          <div className="min-w-0 space-y-5">

            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Reveal>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-white">
                    Community Needs
                  </h2>
                  {!loading && (
                    <span className="text-sm font-semibold text-stone-400 dark:text-stone-500">
                      {filtered.length} {filtered.length === 1 ? "request" : "requests"}
                    </span>
                  )}
                </div>
              </Reveal>

              {/* Desktop search */}
              <div className="hidden lg:flex items-center gap-3">
                <div className="relative w-60">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                  <Input
                    className="pl-9 h-9 rounded-full border-stone-200 dark:border-zinc-700 focus-visible:ring-[#b04a15]/20 bg-white dark:bg-zinc-900 text-sm"
                    placeholder="Search requests…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                {search && (
                  <span className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-stone-400 rounded-full px-3 py-1 text-xs font-semibold">
                    &ldquo;{search}&rdquo;
                    <button onClick={() => setSearch("")} className="hover:text-[#b04a15] transition-colors"><X className="h-3 w-3" /></button>
                  </span>
                )}
                {selectedCategories.map(cat => {
                  const col = CAT_COLOR[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border transition-colors ${col?.pill ?? "bg-stone-100 text-stone-600 border-stone-200"}`}
                    >
                      {cat} <X className="h-3 w-3" />
                    </button>
                  );
                })}
                {selectedUrgencies.map(u => (
                  <button
                    key={u}
                    onClick={() => toggleUrgency(u)}
                    className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-stone-400 rounded-full px-3 py-1 text-xs font-bold hover:border-[#b04a15]/40 hover:text-[#b04a15] transition-colors"
                  >
                    {URGENCY_LEVELS.find(l => l.value === u)?.label ?? u}
                    <X className="h-3 w-3" />
                  </button>
                ))}
                <button onClick={resetFilters} className="text-xs font-semibold text-stone-400 hover:text-[#b04a15] transition-colors underline underline-offset-2">
                  Clear all
                </button>
              </div>
            )}

            {/* Grid / skeletons / empty state */}
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => <RequestCardSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 px-8 bg-white dark:bg-zinc-900 rounded-3xl border border-stone-100 dark:border-zinc-800 shadow-sm">
                {requests.length === 0 ? (
                  <>
                    <div className="mb-5 w-20 h-20 rounded-3xl bg-orange-50 dark:bg-zinc-800 flex items-center justify-center">
                      <PackageOpen className="w-9 h-9 text-[#b04a15]/35" />
                    </div>
                    <p className="font-extrabold text-stone-700 dark:text-stone-300 text-lg">No needs posted yet</p>
                    <p className="mt-2 text-sm text-stone-400 dark:text-stone-500 font-medium text-center max-w-xs">
                      Community members haven&apos;t posted any needs yet. Check back soon.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mb-5 w-20 h-20 rounded-3xl bg-stone-50 dark:bg-zinc-800 flex items-center justify-center">
                      <SearchX className="w-9 h-9 text-stone-300 dark:text-zinc-600" />
                    </div>
                    <p className="font-extrabold text-stone-700 dark:text-stone-300 text-lg">No matches found</p>
                    <p className="mt-2 text-sm text-stone-400 font-medium text-center max-w-xs">
                      Try a different category, urgency, or search term.
                    </p>
                    <button onClick={resetFilters} className="mt-5 text-sm font-bold text-[#b04a15] hover:underline dark:text-[#e07b3a]">
                      Clear all filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="pb-20">
                {/* True masonry: each block keeps its own natural height and packs
                    tightly against its neighbours — no forced equal-height stretching. */}
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
                  {filtered.map((r) => (
                    <div key={r.id} className="mb-5 break-inside-avoid">
                      <RequestBlock r={r} onGive={openDonateModal} />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Donate modal ── */}
      {donateTarget && createPortal((
        <div
          className="fixed inset-0 z-[9990] bg-black/65 backdrop-blur-sm"
          style={{ animation: "fadeIn 0.2s ease forwards" }}
          onClick={closeDonateModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="give-item-title"
            className="fixed left-1/2 top-1/2 flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/35 dark:bg-zinc-900 md:max-h-[calc(100dvh-96px)] md:w-[calc(100vw-48px)] md:max-w-[860px] md:flex-row"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="relative hidden select-none flex-col justify-between overflow-hidden p-8 text-white md:flex md:min-h-[560px] md:w-[40%]"
              style={{ backgroundImage: "url('/images/kindness_banner.png')", backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30 pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-[#f0b97a] bg-white/10 backdrop-blur-md border border-white/20 py-1.5 px-3.5 rounded-full uppercase tracking-wider">
                  <Heart className="w-3 h-3 fill-[#f0b97a]" /> Give Back
                </span>
                <h2 className="text-2xl font-extrabold leading-snug tracking-tight">
                  You&apos;re giving<br />
                  <span className="text-[#f0b97a]">{modalTitle ?? donateTarget.title}</span>
                </h2>
                <p className="text-white/70 text-xs leading-relaxed max-w-[220px]">
                  Upload photos of your item and a short description. Our admin will verify and connect you with the recipient.
                </p>
              </div>
              <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 mt-8 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-white/80 font-semibold">Admin-verified before contact is shared</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#f0b97a] shrink-0" />
                  <span className="text-[11px] text-white/80 font-semibold">Local 10 km radius matching</span>
                </div>
              </div>
            </div>

            <div className="relative flex max-h-[calc(100dvh-32px)] min-h-0 w-full flex-col overflow-y-auto p-5 sm:p-7 md:max-h-[calc(100dvh-96px)] md:w-[60%] md:p-8">
              <button onClick={closeDonateModal} className="absolute right-4 top-4 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-600 transition z-10">
                <X className="h-4 w-4" />
              </button>
              <div className="mx-auto flex min-h-full w-full max-w-[380px] flex-col justify-center space-y-5 py-2">
                <div>
                  <h3 id="give-item-title" className="text-2xl font-extrabold text-stone-900 dark:text-white">Give your item</h3>
                  <p className="text-xs text-stone-400 mt-1">Show us what you&apos;re giving so we can find it a perfect home.</p>
                </div>
                <div>
                  <Label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 block">Photos of item</Label>
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-orange-200 dark:border-zinc-700 hover:border-[#b04a15] rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-orange-50/20 dark:bg-zinc-800/20 hover:bg-orange-50/40">
                    {imagePreviews.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 w-full mb-1" onClick={e => e.stopPropagation()}>
                        {imagePreviews.map((src, i) => (
                          <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-orange-100 dark:border-zinc-700 shadow-sm bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" className="h-full w-full object-cover" />
                            <button onClick={() => removeImage(i)} className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white hover:bg-black transition">
                              <X className="h-2.5 w-2.5" />
                            </button>
                            {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[8px] text-white">AI scans</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-10 w-10 bg-orange-100 dark:bg-zinc-700 text-[#b04a15] rounded-full flex items-center justify-center mb-2.5">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                    )}
                    <p className="text-xs font-extrabold text-stone-800 dark:text-stone-200">Click to upload photos</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">JPG, PNG — up to 10 MB each</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 dark:bg-zinc-800/40 border border-stone-150 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-800 dark:text-stone-200">AI auto-describe</p>
                      <p className="text-[10px] text-stone-400">We&apos;ll generate a description from your photo</p>
                    </div>
                  </div>
                  <Switch checked={aiGenerated || analyzing} onCheckedChange={val => { if (val && images.length > 0) runAnalysis(images[0]); else if (!val) setAiGenerated(false); }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="desc" className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">Item description</Label>
                  <div className="relative">
                    {analyzing && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs">
                        <Loader2 className="h-4 w-4 text-[#b04a15] animate-spin" />
                        <p className="text-[11px] font-bold text-stone-700 dark:text-stone-300">Analysing your photo…</p>
                      </div>
                    )}
                    <Textarea id="desc" rows={3} value={description} onChange={e => { setDescription(e.target.value); setAiGenerated(false); }} placeholder="Describe the item, its condition, and any notes…" className="rounded-xl border-stone-200 dark:border-zinc-700 focus-visible:ring-[#b04a15]/20 text-sm resize-none" disabled={analyzing} />
                  </div>
                  <div className="flex justify-between text-[10px] text-stone-400 font-semibold">
                    <span>{description.length >= 20 ? "✓ Minimum met" : `${description.length}/20 min`}</span>
                    <span>{description.length}/1000</span>
                  </div>
                </div>
                <button onClick={handleSubmitDonate} disabled={submitting || analyzing || images.length === 0 || description.trim().length < 20} className="w-full bg-[#b04a15] hover:bg-[#963c0d] disabled:bg-stone-200 dark:disabled:bg-zinc-800 disabled:text-stone-400 disabled:cursor-not-allowed text-white py-3.5 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-orange-900/15 btn-shine">
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <><Heart className="h-4 w-4" /> Complete Donation <ArrowRight className="h-4 w-4" /></>}
                </button>
                <div className="flex justify-between text-[10px] text-stone-400 font-bold border-t border-stone-100 dark:border-zinc-800 pt-4">
                  <div className="flex gap-3">
                    <Link href="/faq" className="hover:text-[#b04a15] transition-colors">Help</Link>
                    <Link href="/privacy" className="hover:text-[#b04a15] transition-colors">Privacy</Link>
                  </div>
                  <span>© 2026 CauseKind</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
