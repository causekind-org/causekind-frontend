"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useDynamicTranslation, useDynamicTranslations, TranslatedText } from "@/hooks/useDynamicTranslation";
import { getItemRequests, donateToRequest, getMyProfile, analyzeItemImage, type ItemRequest, type UserProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Reveal } from "@/components/Reveal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";
import {
  ImagePlus, Loader2, MapPin, PackageOpen, Search, SearchX,
  Sparkles, X, HandCoins, Package, CheckCircle2, Plus, ChevronDown,
  ShieldCheck, Heart, SlidersHorizontal, AlertTriangle, ArrowRight,
  BookOpen, Stethoscope, Sprout, Users, Home, Activity,
} from "lucide-react";
import Link from "next/link";
import { DoneeRequestsPage } from "./donee-view";
import { ShareButton } from "@/components/ShareButton";

// ── Constants ──────────────────────────────────────────────────────────────────

const ITEM_REQ_CATEGORIES = ["Medical aid", "Education", "Livelihood", "Relief", "Household"];

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
};

const CAT_COLOR: Record<string, { pill: string; bar: string; dot: string; gradient: string }> = {
  "Medical aid": {
    pill:     "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800/60",
    bar:      "bg-sky-500",
    dot:      "bg-sky-500",
    gradient: "from-sky-600/80",
  },
  "Education": {
    pill:     "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/60",
    bar:      "bg-amber-500",
    dot:      "bg-amber-500",
    gradient: "from-amber-600/80",
  },
  "Livelihood": {
    pill:     "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/60",
    bar:      "bg-emerald-500",
    dot:      "bg-emerald-500",
    gradient: "from-emerald-600/80",
  },
  "Relief": {
    pill:     "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800/60",
    bar:      "bg-violet-500",
    dot:      "bg-violet-500",
    gradient: "from-violet-600/80",
  },
  "Household": {
    pill:     "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/60",
    bar:      "bg-rose-500",
    dot:      "bg-rose-500",
    gradient: "from-rose-600/80",
  },
};

const CAT_FALLBACK: Record<string, string> = {
  "Medical aid": "/images/medical-1.webp",
  "Education":   "/images/hero-7.webp",
  "Livelihood":  "/images/hero-3.webp",
  "Relief":      "/images/hero-5.webp",
  "Household":   "/images/hero-6.webp",
};

function getCardImage(r: ItemRequest): string {
  return r.imageUrl ?? CAT_FALLBACK[r.category] ?? "/images/hero-1.webp";
}

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
}: {
  total: number;
  critical: number;
  catCounts: Record<string, number>;
}) {
  const [mouse, setMouse] = useState({ x: 50, y: 40 });
  const [active, setActive] = useState(false);

  const cats = ITEM_REQ_CATEGORIES.map(cat => ({
    cat,
    Icon: CAT_ICON[cat] ?? Package,
    count: catCounts[cat] ?? 0,
    col: CAT_COLOR[cat] ?? CAT_COLOR["Medical aid"],
  }));

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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 items-center">

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

          {/* ── Right: category need-board ── */}
          <div className="hidden lg:grid grid-cols-2 gap-3 need-board-float">
            {/* Top: "Needs Board" label */}
            <div className="col-span-2 flex items-center gap-2 mb-1">
              <Activity className="h-3.5 w-3.5 text-[#f0b97a]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#f0b97a]/70">Needs by Category</span>
            </div>

            {cats.map(({ cat, Icon, count, col }, idx) => (
              <div
                key={cat}
                className="relative bg-white/6 backdrop-blur-sm border border-white/10 rounded-2xl p-4
                           hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-default group overflow-hidden"
                style={{ transitionDelay: `${idx * 40}ms` }}
              >
                {/* Subtle bottom-left tinted corner */}
                <div className={`absolute bottom-0 left-0 w-20 h-20 rounded-tr-3xl ${col.bar} opacity-[0.08] pointer-events-none`} />

                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-white/10 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-4.5 h-4.5 text-white/70`} />
                </div>
                <p className="text-white/85 text-sm font-extrabold leading-tight">{cat}</p>
                <div className="flex items-end gap-1.5 mt-1">
                  <span className="text-2xl font-black text-white tabular-nums leading-none">{count}</span>
                  <span className="text-white/35 text-[10px] font-bold uppercase tracking-wide pb-0.5">needs</span>
                </div>
                {count > 0 && (
                  <div className={`mt-2 h-0.5 rounded-full ${col.bar} opacity-40`} style={{ width: `${Math.min(100, count * 10)}%` }} />
                )}
              </div>
            ))}
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
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-stone-100 dark:border-zinc-800 sticky top-[57px] z-40 shadow-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-3">

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

// ── Request card (full redesign) ──────────────────────────────────────────────

function RequestCard({
  r,
  index,
  onGive,
}: {
  r: ItemRequest;
  index: number;
  onGive: (r: ItemRequest) => void;
}) {
  const [title] = useDynamicTranslations([r.title]);
  const isCritical = r.urgency === "CRITICAL";
  const isHigh     = r.urgency === "HIGH";
  const col        = CAT_COLOR[r.category] ?? CAT_COLOR["Medical aid"];
  const Icon       = CAT_ICON[r.category] ?? Package;
  const imgSrc     = getCardImage(r);
  const initial    = (r.doneeName?.[0] ?? "?").toUpperCase();

  return (
    <Reveal delay={index * 60}>
      <div
        className={`group relative bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden
                   transition-all duration-300 ease-out cursor-default
                   hover:shadow-2xl hover:-translate-y-1.5
                   ${isCritical
                     ? "border-2 border-red-400/60 dark:border-red-700/60 shadow-sm ring-urgent"
                     : "border border-stone-100 dark:border-zinc-800/80 shadow-sm"
                   }`}
      >
        {/* ── Image zone ── */}
        <div className="relative h-52 overflow-hidden">
          <Image
            src={imgSrc}
            alt={r.title}
            fill
            className="object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Bottom-up gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/20 pointer-events-none" />

          {/* Verified badge — top left */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-500 text-white rounded-full px-2.5 py-1 text-[10px] font-black shadow-lg">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            Verified
          </div>

          {/* Urgency badge — top right */}
          {(isCritical || isHigh) && (
            <div className="absolute top-3 right-3">
              <span className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full backdrop-blur-sm border ${
                isCritical
                  ? "bg-red-500/30 border-red-400/60 text-red-100 shadow-lg shadow-red-900/30"
                  : "bg-amber-500/25 border-amber-400/50 text-amber-100"
              }`}>
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {isCritical ? "Urgent" : "High Priority"}
              </span>
            </div>
          )}

          {/* Overlaid bottom row: quantity + category */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10 flex items-end justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl font-black text-white leading-none drop-shadow-lg tabular-nums">{r.quantity}</span>
              <span className="text-white/65 text-[11px] font-bold pb-1">needed</span>
            </div>
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold border backdrop-blur-sm ${col.pill}`}>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <TranslatedText text={r.category} />
            </div>
          </div>
        </div>

        {/* ── Card body ── */}
        <div className="p-5 space-y-3.5">

          {/* City */}
          <div className="flex items-center gap-1.5 text-[11px] text-stone-400 dark:text-stone-500 font-medium">
            <MapPin className="w-3 h-3 shrink-0" />
            <TranslatedText text={r.city} />
          </div>

          {/* Title */}
          <h3 className="text-[15px] font-extrabold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2
                         group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a] transition-colors duration-200">
            {title ?? r.title}
          </h3>

          {/* Description */}
          {r.description && (
            <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed line-clamp-2 font-medium">
              <TranslatedText text={r.description} />
            </p>
          )}

          {/* Requester */}
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[#b04a15]/12 dark:bg-[#b04a15]/20 text-[#b04a15]
                           flex items-center justify-center text-[10px] font-black shrink-0 border border-[#b04a15]/20">
              {initial}
            </div>
            <span className="text-[11px] text-stone-400 dark:text-stone-500 font-medium truncate">
              requested by {r.doneeName}
            </span>
          </div>

          {/* Share + CTA row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onGive(r)}
              className="flex-1 bg-[#b04a15] hover:bg-[#963c0d] active:scale-[0.98]
                       text-white font-bold py-3 rounded-2xl text-sm
                       flex items-center justify-center gap-2 transition-all duration-150
                       shadow-sm shadow-orange-900/15 btn-shine group/btn"
          >
            <Heart className="w-4 h-4 group-hover/btn:fill-white/60 transition-all duration-200 shrink-0" />
              Give this item
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform duration-200 shrink-0" />
            </button>
            <ShareButton title={r.title} path="/requests" className="flex-none border border-stone-200 dark:border-zinc-700 rounded-2xl p-3 hover:border-[#b04a15]/40" />
          </div>
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAllowed = !!user && (user.role === "DONOR" || user.role === "ADMIN");

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
    }
    return [];
  });
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

  // Load data
  useEffect(() => {
    const fetches: Promise<unknown>[] = [
      getItemRequests()
        .then(setRequests)
        .catch(() => toast.error("Failed to load item requests")),
    ];
    if (user) fetches.push(getMyProfile().then(setMyProfile).catch(() => {}));
    Promise.all(fetches).finally(() => setLoading(false));
  }, [user]);

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
      if (lat && lon) {
        out = [...out].sort((a, b) => {
          const dA = a.latitude && a.longitude ? haversineKm(lat, lon, a.latitude, a.longitude) : 99999;
          const dB = b.latitude && b.longitude ? haversineKm(lat, lon, b.latitude, b.longitude) : 99999;
          return dA - dB;
        });
      } else {
        const ord: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2 };
        out = [...out].sort((a, b) => (ord[a.urgency] ?? 2) - (ord[b.urgency] ?? 2));
      }
    } else if (sort === "urgent") {
      const ord: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2 };
      out = [...out].sort((a, b) => (ord[a.urgency] ?? 2) - (ord[b.urgency] ?? 2));
    } else if (sort === "newest") {
      out = [...out].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === "qty") {
      out = [...out].sort((a, b) => b.quantity - a.quantity);
    }
    return out;
  }, [requests, search, selectedCategories, selectedUrgencies, sort, myProfile]);

  const toggleCategory = (cat: string) =>
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  const toggleUrgency  = (u: string) =>
    setSelectedUrgencies(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);
  const resetFilters   = () => {
    setSelectedCategories([]);
    setSelectedUrgencies([]);
    setSort("nearest");
    setSearch("");
  };

  const advancedFilterCount = selectedUrgencies.length + (sort !== "nearest" ? 1 : 0);
  const hasActiveFilters    = selectedCategories.length > 0 || advancedFilterCount > 0 || search.length > 0;

  // ── Donate modal handlers ─────────────────────────────────────────────────

  function openDonateModal(req: ItemRequest) {
    if (!user) { router.push("/login"); return; }
    if (!myProfile?.latitude || !myProfile?.longitude) {
      toast.error("Please set your location in your profile before donating.", {
        action: { label: "Set location", onClick: () => router.push("/profile") },
      });
      return;
    }
    setDonateTarget(req);
    setDescription(""); setImages([]); setImagePreviews([]); setAnalyzing(false); setAiGenerated(false);
  }

  function closeDonateModal() {
    setDonateTarget(null);
    setDescription(""); setImages([]); setImagePreviews([]); setAnalyzing(false); setAiGenerated(false);
  }

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
    setImagePreviews(next.map(f => URL.createObjectURL(f)));
    if (next.length > 0) runAnalysis(next[0]);
  }

  function removeImage(i: number) {
    const next = images.filter((_, idx) => idx !== i);
    setImages(next);
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f2ede7] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">

      {/* ── Hero ── */}
      <RequestsHero total={requests.length} critical={criticalCount} catCounts={catCounts} />

      {/* ── Category quick-filter bar ── */}
      <CategoryBar
        catCounts={catCounts}
        selected={selectedCategories}
        onToggle={toggleCategory}
        onClearAll={() => setSelectedCategories([])}
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
          <aside className="hidden lg:block sticky top-[calc(57px+53px)] bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-stone-100 dark:border-zinc-800 shrink-0">
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
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <RequestCardSkeleton key={i} />)}
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
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 pb-20">
                {filtered.map((r, i) => (
                  <RequestCard key={r.id} r={r} index={i} onGive={openDonateModal} />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Donate modal ── */}
      {donateTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          style={{ animation: "fadeIn 0.2s ease forwards" }}
        >
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl flex flex-col md:flex-row h-auto md:max-h-[88vh]">

            {/* Left visual panel */}
            <div
              className="relative hidden md:flex md:w-[42%] flex-col justify-between p-8 text-white select-none overflow-hidden"
              style={{ backgroundImage: "url('/images/kindness_banner.png')", backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30 pointer-events-none" />

              <div className="relative z-10 space-y-4">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-[#f0b97a] bg-white/10 backdrop-blur-md border border-white/20 py-1.5 px-3.5 rounded-full uppercase tracking-wider">
                  <Heart className="w-3 h-3 fill-[#f0b97a]" />
                  Give Back
                </span>
                <h2 className="text-2xl font-extrabold leading-snug tracking-tight">
                  You&apos;re giving<br />
                  <span className="text-[#f0b97a]">{modalTitle ?? donateTarget.title}</span>
                </h2>
                <p className="text-white/70 text-xs leading-relaxed max-w-[220px]">
                  Upload photos of your item and a short description. Our admin will verify and connect you with the recipient.
                </p>
              </div>

              {/* Stats card */}
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

            {/* Right form panel */}
            <div className="w-full md:w-[58%] p-6 sm:p-8 flex flex-col overflow-y-auto max-h-[90vh] md:max-h-[88vh] relative">
              <button
                onClick={closeDonateModal}
                className="absolute right-4 top-4 rounded-full p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 hover:text-stone-600 transition z-10"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex-1 flex flex-col justify-center max-w-[380px] mx-auto w-full space-y-5">

                <div>
                  <h3 className="text-2xl font-extrabold text-stone-900 dark:text-white">Give your item</h3>
                  <p className="text-xs text-stone-400 mt-1">Show us what you&apos;re giving so we can find it a perfect home.</p>
                </div>

                {/* Upload */}
                <div>
                  <Label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 block">
                    Photos of item
                  </Label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-orange-200 dark:border-zinc-700 hover:border-[#b04a15] rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-orange-50/20 dark:bg-zinc-800/20 hover:bg-orange-50/40"
                  >
                    {imagePreviews.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 w-full mb-1" onClick={e => e.stopPropagation()}>
                        {imagePreviews.map((src, i) => (
                          <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-orange-100 dark:border-zinc-700 shadow-sm bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" className="h-full w-full object-cover" />
                            <button
                              onClick={() => removeImage(i)}
                              className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white hover:bg-black transition"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                            {i === 0 && (
                              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[8px] text-white">AI scans</span>
                            )}
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

                {/* AI toggle */}
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
                  <Switch
                    checked={aiGenerated || analyzing}
                    onCheckedChange={val => {
                      if (val && images.length > 0) runAnalysis(images[0]);
                      else if (!val) setAiGenerated(false);
                    }}
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="desc" className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
                    Item description
                  </Label>
                  <div className="relative">
                    {analyzing && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs">
                        <Loader2 className="h-4 w-4 text-[#b04a15] animate-spin" />
                        <p className="text-[11px] font-bold text-stone-700 dark:text-stone-300">Analysing your photo…</p>
                      </div>
                    )}
                    <Textarea
                      id="desc"
                      rows={3}
                      value={description}
                      onChange={e => { setDescription(e.target.value); setAiGenerated(false); }}
                      placeholder="Describe the item, its condition, and any notes…"
                      className="rounded-xl border-stone-200 dark:border-zinc-700 focus-visible:ring-[#b04a15]/20 text-sm resize-none"
                      disabled={analyzing}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-stone-400 font-semibold">
                    <span>{description.length >= 20 ? "✓ Minimum met" : `${description.length}/20 min`}</span>
                    <span>{description.length}/1000</span>
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmitDonate}
                  disabled={submitting || analyzing || images.length === 0 || description.trim().length < 20}
                  className="w-full bg-[#b04a15] hover:bg-[#963c0d] disabled:bg-stone-200 dark:disabled:bg-zinc-800 disabled:text-stone-400 disabled:cursor-not-allowed text-white py-3.5 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-orange-900/15 btn-shine"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                  ) : (
                    <><Heart className="h-4 w-4" /> Complete Donation <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>

                <div className="flex justify-between text-[10px] text-stone-400 font-bold border-t border-stone-100 dark:border-zinc-800 pt-4">
                  <div className="flex gap-3">
                    <Link href="/help"    className="hover:text-[#b04a15] transition-colors">Help</Link>
                    <Link href="/privacy" className="hover:text-[#b04a15] transition-colors">Privacy</Link>
                  </div>
                  <span>© 2026 CauseKind</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
