"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useDynamicTranslation, useDynamicTranslations, TranslatedText } from "@/hooks/useDynamicTranslation";
import { getItemRequests, donateToRequest, getMyProfile, analyzeItemImage, type ItemRequest, type UserProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Reveal } from "@/components/Reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import {
  ImagePlus, Loader2, MapPin, PackageOpen, RefreshCw, Search,
  SearchX, Sparkles, Upload, X, HandCoins, Package, CheckCircle2,
  Plus, ChevronDown, ShieldCheck, Heart, SlidersHorizontal, BadgeCheck,
} from "lucide-react";
import Link from "next/link";

// ── Constants ──────────────────────────────────────────────────────────────────

const ITEM_REQ_CATEGORIES = ["Medical aid", "Education", "Livelihood", "Relief", "Household"];

const URGENCY_LEVELS = [
  { value: "CRITICAL", label: "Critical", color: "text-red-600 dark:text-red-400" },
  { value: "HIGH",     label: "High",     color: "text-amber-600 dark:text-amber-400" },
  { value: "NORMAL",   label: "Normal",   color: "text-stone-600 dark:text-stone-400" },
];

const REQ_SORT_OPTIONS = [
  { value: "urgent"  as const, label: "Most Urgent"   },
  { value: "newest"  as const, label: "Just Added"    },
  { value: "qty"     as const, label: "High Quantity" },
];

type ReqSortValue = "urgent" | "newest" | "qty";

const CATEGORY_ICONS: Record<string, string> = {
  "Medical aid": "🏥",
  "Education": "📚",
  "Livelihood": "🌱",
  "Relief": "🤝",
  "Household": "🏠",
};

function getCategoryStyle(category: string): { pill: string; border: string } {
  const map: Record<string, { pill: string; border: string }> = {
    "Medical aid": { pill: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400", border: "border-blue-100 dark:border-blue-900/50" },
    "Education":   { pill: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400", border: "border-amber-100 dark:border-amber-900/50" },
    "Livelihood":  { pill: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400", border: "border-green-100 dark:border-green-900/50" },
    "Relief":      { pill: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400", border: "border-violet-100 dark:border-violet-900/50" },
    "Household":   { pill: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400", border: "border-rose-100 dark:border-rose-900/50" },
  };
  return map[category] ?? { pill: "bg-stone-50 text-stone-600 dark:bg-zinc-800 dark:text-stone-400", border: "border-stone-100 dark:border-zinc-700" };
}

const CATEGORY_FALLBACKS: Record<string, string> = {
  "Medical aid": "/images/medical-1.webp",
  "Education": "/images/hero-7.webp",
  "Livelihood": "/images/hero-3.webp",
  "Relief": "/images/hero-5.webp",
  "Household": "/images/hero-6.webp",
};

function getCardImage(r: ItemRequest): string {
  return r.imageUrl ?? CATEGORY_FALLBACKS[r.category] ?? "/images/hero-1.webp";
}

function urgencyVariant(u: string) {
  return (u === "CRITICAL" || u === "HIGH") ? "destructive" as const : "outline" as const;
}

// ── Animated progress bar ──────────────────────────────────────────────────────

function AnimatedBar({ met, total }: { met: number; total: number }) {
  const [width, setWidth] = useState(0);
  const pct = total > 0 ? Math.min(100, Math.round((met / total) * 100)) : 0;

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 350);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
          {met} of {total} met
        </span>
        <span className="text-xs font-bold text-[#b04a15] dark:text-[#e07b3a]">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#b04a15] to-[#e07b3a] transition-all duration-[1100ms] ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function RequestCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm animate-pulse">
      <div className="w-full h-52 bg-stone-100 dark:bg-zinc-800" />
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-stone-100 dark:bg-zinc-800 rounded-full" />
          <div className="h-6 w-16 bg-stone-100 dark:bg-zinc-800 rounded-full ml-auto" />
        </div>
        <div className="h-5 w-4/5 bg-stone-100 dark:bg-zinc-800 rounded" />
        <div className="h-4 w-full bg-stone-100 dark:bg-zinc-800 rounded" />
        <div className="h-4 w-2/3 bg-stone-100 dark:bg-zinc-800 rounded" />
        <div className="h-1.5 w-full bg-stone-100 dark:bg-zinc-800 rounded-full mt-4" />
        <div className="h-11 w-full bg-stone-100 dark:bg-zinc-800 rounded-xl mt-2" />
      </div>
    </div>
  );
}

// ── Interactive In-Kind Hero ──────────────────────────────────────────────────

function InKindHero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 50, y: 40 });
  const [active, setActive] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  const INFO_PILLS = [
    { icon: ShieldCheck, label: "Admin Verified Needs", color: "text-emerald-400" },
    { icon: MapPin,      label: "Local 10 km Matching", color: "text-[#f0b97a]" },
    { icon: Sparkles,    label: "AI Photo Analysis",    color: "text-blue-400" },
    { icon: Heart,       label: "Zero Platform Fees",   color: "text-rose-400" },
  ];

  return (
    <div
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className="relative w-full min-h-[260px] sm:min-h-[300px] overflow-hidden select-none"
      style={{ background: "linear-gradient(135deg, #1c0905 0%, #2d1008 42%, #0f1d30 100%)" }}
    >
      {/* Mouse-tracking warm glow — follows cursor */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-200 ease-out"
        style={{
          background: `radial-gradient(circle at ${mouse.x}% ${mouse.y}%, rgba(176,74,21,${active ? 0.32 : 0.18}) 0%, transparent 52%)`,
        }}
      />

      {/* Opposing cool glow — anti-tracks */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500 ease-out"
        style={{
          background: `radial-gradient(circle at ${100 - mouse.x * 0.6}% ${100 - mouse.y * 0.6}%, rgba(30,58,96,0.22) 0%, transparent 45%)`,
        }}
      />

      {/* Dot-grid texture */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.18] pointer-events-none" />

      {/* Floating decorative rings */}
      <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full border border-[#b04a15]/12 animate-blob-a pointer-events-none" />
      <div className="absolute -top-8 -right-8 w-52 h-52 rounded-full border border-[#e07b3a]/10 animate-blob-b pointer-events-none" />
      <div className="absolute bottom-0 -left-20 w-64 h-64 rounded-full border border-[#1e3a60]/15 animate-blob-b pointer-events-none" />

      {/* Floating dots */}
      <div className="absolute top-[22%] left-[12%] w-2 h-2 rounded-full bg-[#f0b97a]/35 animate-float-shape-1 pointer-events-none" />
      <div className="absolute top-[35%] right-[18%] w-1.5 h-1.5 rounded-full bg-[#e07b3a]/45 animate-float-shape-2 pointer-events-none" />
      <div className="absolute bottom-[28%] left-[30%] w-2 h-2 rounded-full bg-[#b04a15]/40 animate-float-shape-3 pointer-events-none" />
      <div className="absolute top-[55%] right-[10%] w-1 h-1 rounded-full bg-white/25 animate-float-shape-4 pointer-events-none" />
      <div className="absolute top-[15%] right-[35%] w-1.5 h-1.5 rounded-full bg-[#f0b97a]/30 animate-float-shape-5 pointer-events-none" />

      {/* Large ghost icon — bottom-right accent */}
      <div className="absolute bottom-6 right-8 opacity-[0.06] animate-blob-a pointer-events-none">
        <Package className="h-36 w-36 text-white" />
      </div>
      {/* Small ghost icon — top-left accent */}
      <div className="absolute top-8 left-8 opacity-[0.05] animate-blob-b pointer-events-none">
        <HandCoins className="h-20 w-20 text-white" />
      </div>

      {/* ── Main content (centred) ── */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center h-full min-h-[260px] sm:min-h-[300px] px-5 py-8 sm:py-10">

        {/* Label badge */}
        <div className="inline-flex items-center gap-2 bg-[#b04a15]/20 border border-[#b04a15]/35 rounded-full px-4 py-1.5 mb-6 anim-up anim-d1">
          <HandCoins className="h-3.5 w-3.5 text-[#f0b97a]" />
          <span className="text-[#f0b97a] text-[11px] font-black uppercase tracking-widest">In-Kind Giving</span>
        </div>

        {/* Headline */}
        <h1 className="text-white text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-tight tracking-tight mb-4 anim-up anim-d2">
          In-Kind{" "}
          <span className="text-gradient-terra">Requests</span>
        </h1>

        {/* Subtitle */}
        <p className="text-white/70 text-sm sm:text-base lg:text-lg leading-relaxed mb-3 max-w-xl anim-up anim-d3">
          Real people. Real needs. Donate physical items directly to community members — no cash, no middlemen, zero platform fees.
        </p>

        {/* How it works — one-liner */}
        <p className="text-white/45 text-xs sm:text-sm mb-8 anim-up anim-d3">
          Browse a verified need below → offer to give → admin connects you both.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10 anim-up anim-d4">
          {INFO_PILLS.map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="flex items-center gap-2 bg-white/8 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2"
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
              <span className="text-white/75 text-xs font-semibold whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>

        {/* Scroll cue */}
        <div className="flex flex-col items-center gap-1.5 anim-up anim-d5">
          <span className="text-white/30 text-[11px] font-medium uppercase tracking-widest">Browse needs</span>
          <ChevronDown className="h-4 w-4 text-white/30 animate-bounce-slow" />
        </div>
      </div>
    </div>
  );
}

// ── Filter Panel ──────────────────────────────────────────────────────────────

function RequestFilterPanel({
  categoryCounts,
  filteredCounts,
  selectedCategories,
  toggleCategory,
  selectedUrgencies,
  toggleUrgency,
  sort,
  setSort,
  resetFilters,
}: {
  categoryCounts: Record<string, number>;
  filteredCounts: Record<string, number>;
  selectedCategories: string[];
  toggleCategory: (c: string) => void;
  selectedUrgencies: string[];
  toggleUrgency: (u: string) => void;
  sort: ReqSortValue;
  setSort: (s: ReqSortValue) => void;
  resetFilters: () => void;
}) {
  return (
    <div className="space-y-6">

      {/* Category */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">Category</p>
        <div className="space-y-1.5">
          {ITEM_REQ_CATEGORIES.map(cat => {
            const total = categoryCounts[cat] ?? 0;
            const filtered = filteredCounts[cat] ?? 0;
            const dimmed = total > 0 && filtered === 0;
            const active = selectedCategories.includes(cat);
            return (
              <label
                key={cat}
                className={`flex items-center justify-between gap-2 cursor-pointer group rounded-lg px-2 py-1.5 transition-colors ${
                  active ? "bg-[#b04a15]/8" : "hover:bg-stone-50 dark:hover:bg-zinc-800"
                } ${dimmed ? "opacity-40" : ""}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleCategory(cat)}
                    className="accent-[#b04a15] shrink-0"
                  />
                  <span className={`text-sm font-medium truncate transition-colors ${
                    active
                      ? "text-[#b04a15] dark:text-[#e07b3a]"
                      : "text-stone-700 dark:text-stone-300 group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a]"
                  }`}>
                    {cat}
                  </span>
                </div>
                <span className="text-[11px] text-stone-400 shrink-0 font-medium tabular-nums">{total}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Urgency */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">Urgency</p>
        <div className="space-y-1.5">
          {URGENCY_LEVELS.map(({ value, label, color }) => {
            const active = selectedUrgencies.includes(value);
            return (
              <label
                key={value}
                className={`flex items-center gap-2 cursor-pointer group rounded-lg px-2 py-1.5 transition-colors ${
                  active ? "bg-[#b04a15]/8" : "hover:bg-stone-50 dark:hover:bg-zinc-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleUrgency(value)}
                  className="accent-[#b04a15] shrink-0"
                />
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  value === "CRITICAL" ? "bg-red-500" : value === "HIGH" ? "bg-amber-500" : "bg-stone-400"
                }`} />
                <span className={`text-sm font-medium transition-colors ${
                  active
                    ? color
                    : "text-stone-700 dark:text-stone-300 group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a]"
                }`}>
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Sort By */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">Sort By</p>
        <div className="space-y-1.5">
          {REQ_SORT_OPTIONS.map(opt => {
            const active = sort === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-2 cursor-pointer group rounded-lg px-2 py-1.5 transition-colors ${
                  active ? "bg-[#b04a15]/8" : "hover:bg-stone-50 dark:hover:bg-zinc-800"
                }`}
              >
                <input
                  type="radio"
                  name="req-sort"
                  checked={active}
                  onChange={() => setSort(opt.value)}
                  className="accent-[#b04a15] shrink-0"
                />
                <span className={`text-sm font-medium transition-colors ${
                  active
                    ? "text-[#b04a15] dark:text-[#e07b3a]"
                    : "text-stone-700 dark:text-stone-300 group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a]"
                }`}>
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={resetFilters}
        className="w-full text-xs font-semibold text-stone-400 hover:text-[#b04a15] dark:hover:text-[#e07b3a] transition-colors py-1.5 border border-stone-200 dark:border-stone-700 rounded-lg hover:border-[#b04a15]/40"
      >
        Reset Filters
      </button>
    </div>
  );
}

// ── Request card ──────────────────────────────────────────────────────────────

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
  const catStyle = getCategoryStyle(r.category);
  const imgSrc = getCardImage(r);

  return (
    <Reveal delay={index * 70}>
      <div className="group bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-stone-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 ease-out flex flex-col h-full">

        {/* Image */}
        <div className="relative w-full h-44 sm:h-52 overflow-hidden shrink-0 bg-orange-50 dark:bg-zinc-800">
          <Image
            src={imgSrc}
            alt={r.title}
            fill
            className="object-contain object-center bg-stone-100 dark:bg-zinc-950 group-hover:scale-[1.06] transition-transform duration-500 ease-out"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Subtle bottom fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />

          {/* Verified Need badge — top-left */}
          <div className="absolute top-3 left-3">
            <div className="flex items-center gap-1.5 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md shadow-emerald-900/20">
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              Verified Need
            </div>
          </div>

          {/* Urgency overlay — top-right */}
          {r.urgency !== "NORMAL" && (
            <div className="absolute top-3 right-3">
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase border backdrop-blur-sm shadow-sm ${
                r.urgency === "CRITICAL"
                  ? "bg-red-500/20 border-red-400/50 text-red-100"
                  : "bg-amber-500/20 border-amber-400/50 text-amber-100"
              }`}>
                {r.urgency === "CRITICAL" ? "Urgent" : "High Priority"}
              </span>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-5 flex flex-col flex-1 gap-3">

          {/* Category + location */}
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${catStyle.pill} ${catStyle.border}`}>
              <span className="text-sm leading-none">{CATEGORY_ICONS[r.category] ?? "📦"}</span>
              <TranslatedText text={r.category} />
            </span>
            <span className="flex items-center gap-1 text-[11px] text-stone-400 dark:text-stone-500 font-medium shrink-0">
              <MapPin className="h-3 w-3 shrink-0" />
              <TranslatedText text={r.city} />
            </span>
          </div>

          {/* Title */}
          <h3 className="text-[15px] font-extrabold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2">
            {title ?? r.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-2 font-medium flex-1">
            {r.description ? (
              <TranslatedText text={r.description} />
            ) : (
              `Requested by ${r.doneeName}. ${r.quantity} item${r.quantity !== 1 ? "s" : ""} needed.`
            )}
          </p>

          {/* Progress bar */}
          <div className="pt-1">
            <AnimatedBar met={0} total={r.quantity} />
          </div>

          {/* CTA */}
          <button
            onClick={() => onGive(r)}
            className="w-full mt-1 bg-[#b04a15] hover:bg-[#963c0d] active:bg-[#7d3209] text-white font-bold py-3 rounded-xl text-sm transition-all duration-150 active:scale-[0.98] shadow-sm shadow-orange-900/15 btn-shine"
          >
            Give this item
          </button>
        </div>
      </div>
    </Reveal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const t = useTranslations("requests");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedUrgencies, setSelectedUrgencies] = useState<string[]>([]);
  const [sort, setSort] = useState<ReqSortValue>("urgent");
  const [showFilters, setShowFilters] = useState(false);

  // Donate modal state
  const [donateTarget, setDonateTarget] = useState<ItemRequest | null>(null);
  const modalTitle = useDynamicTranslation(donateTarget?.title ?? null);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  // Load data
  useEffect(() => {
    const fetches: Promise<unknown>[] = [
      getItemRequests().then(setRequests).catch(() => toast.error("Failed to load item requests")),
    ];
    if (user) {
      fetches.push(getMyProfile().then(setMyProfile).catch(() => {}));
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [user]);

  // ── Filtering with useMemo ────────────────────────────────────────────────

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1; });
    return counts;
  }, [requests]);

  const filteredCounts = useMemo(() => {
    const q = search.toLowerCase();
    const counts: Record<string, number> = {};
    requests
      .filter(r => !q || r.title.toLowerCase().includes(q) || r.city.toLowerCase().includes(q))
      .forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1; });
    return counts;
  }, [requests, search]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = requests.filter(r => {
      const matchQ = !q || r.title.toLowerCase().includes(q) || r.city.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
      const matchC = selectedCategories.length === 0 || selectedCategories.includes(r.category);
      const matchU = selectedUrgencies.length === 0 || selectedUrgencies.includes(r.urgency);
      return matchQ && matchC && matchU;
    });
    if (sort === "urgent") {
      const ord: Record<string, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2 };
      result = [...result].sort((a, b) => (ord[a.urgency] ?? 2) - (ord[b.urgency] ?? 2));
    } else if (sort === "newest") {
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === "qty") {
      result = [...result].sort((a, b) => b.quantity - a.quantity);
    }
    return result;
  }, [requests, search, selectedCategories, selectedUrgencies, sort]);

  const toggleCategory = (cat: string) =>
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  const toggleUrgency = (u: string) =>
    setSelectedUrgencies(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);
  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedUrgencies([]);
    setSort("urgent");
    setSearch("");
  };
  const activeFilterCount = selectedCategories.length + selectedUrgencies.length + (sort !== "urgent" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || search.length > 0;

  // ── Donate modal handlers ─────────────────────────────────────────────────

  function openDonateModal(request: ItemRequest) {
    if (!user) { router.push("/login"); return; }
    if (!myProfile?.latitude || !myProfile?.longitude) {
      toast.error("Please set your location in your profile before donating.", {
        action: { label: "Set location", onClick: () => router.push("/profile") },
      });
      return;
    }
    setDonateTarget(request);
    setDescription("");
    setImages([]);
    setImagePreviews([]);
    setAnalyzing(false);
    setAiGenerated(false);
  }

  function closeDonateModal() {
    setDonateTarget(null);
    setDescription("");
    setImages([]);
    setImagePreviews([]);
    setAnalyzing(false);
    setAiGenerated(false);
  }

  async function runAnalysis(file: File) {
    setAnalyzing(true);
    setAiGenerated(false);
    setDescription("");
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
    const newImages = [...images, ...files];
    setImages(newImages);
    setImagePreviews(newImages.map(f => URL.createObjectURL(f)));
    if (newImages.length > 0) runAnalysis(newImages[0]);
  }

  function removeImage(index: number) {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newImages.map(f => URL.createObjectURL(f)));
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f7f4f0] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">

      {/* ── Interactive hero ───────────────────────────────────────────────── */}
      <InKindHero />

      {/* ── Community Needs section ────────────────────────────────────────── */}
      <div className="bg-[#f7f4f0] dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-7">

          {/* ── Mobile: filter toggle + search row ── */}
          <div className="flex items-center justify-between gap-3 mb-4 lg:hidden">
            <button
              onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-900 text-sm font-semibold text-stone-700 dark:text-stone-300 hover:border-[#b04a15]/50 hover:text-[#b04a15] transition-colors shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#b04a15] text-white text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <Input
                className="pl-9 h-9 rounded-full border-stone-200 dark:border-stone-700 focus-visible:ring-[#b04a15]/20 bg-white dark:bg-zinc-900 text-sm"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* ── Mobile: collapsible filter panel ── */}
          {showFilters && (
            <div className="lg:hidden mb-5 rounded-2xl bg-white dark:bg-zinc-900 p-5 border border-stone-100 dark:border-stone-800 shadow-sm">
              <RequestFilterPanel
                categoryCounts={categoryCounts}
                filteredCounts={filteredCounts}
                selectedCategories={selectedCategories}
                toggleCategory={toggleCategory}
                selectedUrgencies={selectedUrgencies}
                toggleUrgency={toggleUrgency}
                sort={sort}
                setSort={setSort}
                resetFilters={() => { resetFilters(); setShowFilters(false); }}
              />
            </div>
          )}

          {/* ── Main flex layout: sidebar + right pane ── */}
          <div className="flex gap-6 items-start">

            {/* Desktop sidebar */}
            <aside className="hidden lg:block w-52 sticky top-20 bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-stone-100 dark:border-stone-800 shrink-0">
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 mb-5">Filters</h3>
              <RequestFilterPanel
                categoryCounts={categoryCounts}
                filteredCounts={filteredCounts}
                selectedCategories={selectedCategories}
                toggleCategory={toggleCategory}
                selectedUrgencies={selectedUrgencies}
                toggleUrgency={toggleUrgency}
                sort={sort}
                setSort={setSort}
                resetFilters={resetFilters}
              />
            </aside>

            {/* Right pane */}
            <div className="flex-1 min-w-0 space-y-4">

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
                <div className="flex items-center gap-3">
                  {/* Desktop search */}
                  <div className="relative hidden lg:block w-56">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                    <Input
                      className="pl-9 h-9 rounded-full border-stone-200 dark:border-stone-700 focus-visible:ring-[#b04a15]/20 bg-white dark:bg-zinc-900 text-sm"
                      placeholder="Search requests…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <Reveal delay={80}>
                    <Link href="/requests/new">
                      <Button className="bg-[#b04a15] hover:bg-[#963c0d] text-white font-bold rounded-xl px-4 py-2 h-auto gap-1.5 text-sm btn-shine shadow-sm shadow-orange-900/20 shrink-0">
                        <Plus className="h-4 w-4" />
                        Post a Need
                      </Button>
                    </Link>
                  </Reveal>
                </div>
              </div>

              {/* Active filter chips */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  {search && (
                    <span className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 rounded-full px-3 py-1 text-xs font-semibold">
                      &ldquo;{search}&rdquo;
                      <button onClick={() => setSearch("")} className="hover:text-[#b04a15] transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className="inline-flex items-center gap-1.5 bg-[#b04a15]/10 border border-[#b04a15]/25 text-[#b04a15] dark:text-[#e07b3a] rounded-full px-3 py-1 text-xs font-semibold hover:bg-[#b04a15]/20 transition-colors"
                    >
                      {cat}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                  {selectedUrgencies.map(u => {
                    const level = URGENCY_LEVELS.find(l => l.value === u);
                    return (
                      <button
                        key={u}
                        onClick={() => toggleUrgency(u)}
                        className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 rounded-full px-3 py-1 text-xs font-semibold hover:border-[#b04a15]/40 hover:text-[#b04a15] transition-colors"
                      >
                        {level?.label ?? u}
                        <X className="h-3 w-3" />
                      </button>
                    );
                  })}
                  {sort !== "urgent" && (
                    <button
                      onClick={() => setSort("urgent")}
                      className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 rounded-full px-3 py-1 text-xs font-semibold hover:border-[#b04a15]/40 hover:text-[#b04a15] transition-colors"
                    >
                      {REQ_SORT_OPTIONS.find(o => o.value === sort)?.label}
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={resetFilters}
                    className="text-xs font-semibold text-stone-400 hover:text-[#b04a15] dark:hover:text-[#e07b3a] transition-colors underline underline-offset-2"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Card grid / skeletons / empty state */}
              {loading ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <RequestCardSkeleton key={i} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-8 bg-white dark:bg-zinc-900 rounded-2xl border border-orange-100 dark:border-stone-800">
                  {requests.length === 0 ? (
                    <>
                      <div className="mb-4 w-16 h-16 rounded-2xl bg-orange-50 dark:bg-zinc-800 flex items-center justify-center">
                        <PackageOpen className="w-8 h-8 text-[#b04a15]/40 dark:text-orange-400/30" />
                      </div>
                      <p className="font-bold text-stone-700 dark:text-stone-300 text-base">No requests yet</p>
                      <p className="mt-1 text-sm text-stone-400 dark:text-stone-500 font-medium text-center max-w-xs">
                        Community members haven&apos;t posted any needs yet. Be the first to help!
                      </p>
                      <Link href="/requests/new" className="mt-6">
                        <Button className="bg-[#b04a15] hover:bg-[#963c0d] text-white font-bold rounded-xl px-6">
                          Post a Need
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="mb-4 w-16 h-16 rounded-2xl bg-orange-50 dark:bg-zinc-800 flex items-center justify-center">
                        <SearchX className="w-8 h-8 text-stone-300 dark:text-zinc-600" />
                      </div>
                      <p className="font-bold text-stone-700 dark:text-stone-300 text-base">No matches found</p>
                      <p className="mt-1 text-sm text-stone-400 dark:text-stone-500 font-medium text-center max-w-xs">
                        Try a different category, urgency, or search term.
                      </p>
                      <button
                        onClick={resetFilters}
                        className="mt-4 text-sm font-semibold text-[#b04a15] dark:text-[#e07b3a] hover:underline"
                      >
                        Clear filters
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 pb-20">
                  {filtered.map((r, i) => (
                    <RequestCard key={r.id} r={r} index={i} onGive={openDonateModal} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Donate modal ──────────────────────────────────────────────────── */}
      {donateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-[#faf8f4] dark:bg-zinc-900 shadow-2xl">

            {/* Header */}
            <div className="relative border-b border-orange-100 dark:border-stone-800 bg-gradient-to-r from-[#b04a15]/10 to-transparent px-5 py-4">
              <div className="pr-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#b04a15] dark:text-[#ff8a65]">Donating to</p>
                <h2 className="mt-0.5 text-lg font-extrabold text-[#1c1108] dark:text-white leading-tight">
                  {modalTitle ?? donateTarget.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-stone-500">
                    <MapPin className="h-3 w-3" />
                    <TranslatedText text={donateTarget.city} />
                  </span>
                  <Badge className="bg-orange-100 dark:bg-zinc-800 text-[#b04a15] dark:text-[#ff8a65] border-0 text-xs">
                    <TranslatedText text={donateTarget.category} />
                  </Badge>
                  <Badge variant={urgencyVariant(donateTarget.urgency)} className="text-xs">
                    {tCommon("urgency" + donateTarget.urgency.charAt(0) + donateTarget.urgency.slice(1).toLowerCase())}
                  </Badge>
                </div>
              </div>
              <button
                onClick={closeDonateModal}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-stone-400 hover:bg-orange-50 dark:hover:bg-zinc-800 hover:text-stone-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {/* Step 1 — Photos */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#b04a15] text-xs font-bold text-white">1</span>
                  <Label className="font-semibold text-stone-700 dark:text-stone-300">
                    Upload item photos <span className="text-red-500">*</span>
                  </Label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-xl border-2 border-orange-100 dark:border-stone-700 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white hover:bg-black transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          AI scans this
                        </span>
                      )}
                    </div>
                  ))}
                  {images.length < 3 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-200 dark:border-stone-700 text-stone-400 transition hover:border-[#b04a15] hover:bg-orange-50/50 dark:hover:bg-zinc-800 hover:text-[#b04a15]"
                    >
                      <ImagePlus className="h-7 w-7" />
                      <span className="text-xs font-medium">Add photo</span>
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
                  Up to 3 photos · AI analyses the first photo to generate the description below
                </p>
              </div>

              {/* Step 2 — AI Description */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#b04a15] text-xs font-bold text-white">2</span>
                    <Label htmlFor="desc" className="font-semibold text-stone-700 dark:text-stone-300">
                      Item description <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiGenerated && !analyzing && (
                      <span className="flex items-center gap-1 rounded-full bg-[#b04a15]/10 px-2 py-0.5 text-xs font-medium text-[#b04a15] dark:text-[#ff8a65]">
                        <Sparkles className="h-3 w-3" /> AI generated
                      </span>
                    )}
                    {images.length > 0 && !analyzing && (
                      <button
                        onClick={() => runAnalysis(images[0])}
                        className="flex items-center gap-1 text-xs text-stone-400 transition hover:text-[#b04a15]"
                      >
                        <RefreshCw className="h-3 w-3" /> Re-analyse
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  {analyzing && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-[#faf8f4]/90 dark:bg-zinc-900/90 backdrop-blur-sm">
                      <div className="flex items-center gap-2 font-medium text-[#b04a15]">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        <span className="text-sm">AI is reading your photo…</span>
                      </div>
                      <p className="text-xs text-stone-400">Detecting item type, condition &amp; material</p>
                    </div>
                  )}
                  <Textarea
                    id="desc"
                    rows={6}
                    value={description}
                    onChange={e => { setDescription(e.target.value); setAiGenerated(false); }}
                    disabled={analyzing}
                    placeholder={
                      images.length === 0
                        ? "Add a photo above — AI will auto-generate a full description instantly"
                        : "Waiting for photo analysis…"
                    }
                    className={`resize-none rounded-xl transition border-orange-200 dark:border-stone-700 focus-visible:ring-[#b04a15]/20 ${aiGenerated ? "border-[#b04a15]/40 bg-[#b04a15]/5" : ""}`}
                  />
                </div>

                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    {aiGenerated
                      ? "✨ Auto-filled from photo — edit anything you'd like to change"
                      : `${description.length} characters (min 20)`}
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">{description.length}/1000</p>
                </div>
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-3 rounded-xl border border-[#b04a15]/20 bg-[#b04a15]/5 px-4 py-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#b04a15]" />
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  AI analyses your photo for item type, condition, and material. Admin reviews before sharing contact details with both parties.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-orange-100 dark:border-stone-800 bg-orange-50/30 dark:bg-zinc-950/30 px-5 py-4">
              <Button variant="ghost" onClick={closeDonateModal} disabled={submitting || analyzing}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitDonate}
                disabled={submitting || analyzing}
                className="btn-3d btn-shine bg-[#1c1108] hover:bg-[#2d1f0a] dark:bg-[#b04a15] dark:hover:bg-[#8f3b10] text-white rounded-xl px-6 font-semibold gap-2"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                ) : (
                  <><Upload className="h-4 w-4" /> Submit donation</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
