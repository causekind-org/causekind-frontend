"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useRouter } from "next/navigation";
import { getCampaigns, type Campaign } from "@/lib/api";
import { Reveal } from "@/components/Reveal";
import { Input } from "@/components/ui/input";
import {
  MapPin, Search, BadgeCheck, ArrowRight,
  HeartHandshake, SearchX, SlidersHorizontal, X, ChevronDown,
} from "lucide-react";
import { useTranslations } from "next-intl";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_IMAGES: Record<string, string[]> = {
  Medical:         ["/images/medical-1.webp", "/images/medical-2.webp"],
  Education:       ["/images/hero-7.webp"],
  Livelihood:      ["/images/hero-3.webp"],
  Community:       ["/images/hero-6.webp"],
  "Animal Welfare":["/images/hero-5.webp"],
  Environment:     ["/images/hero-8.webp"],
};

const ALL_CATEGORIES = [
  "Medical", "Education", "Disaster Relief",
  "Animal Welfare", "Environment", "Community", "Other",
];

const SORT_OPTIONS = [
  { value: "urgent"  as const, label: "Urgent Needs"  },
  { value: "newest"  as const, label: "Just Started"  },
  { value: "funded"  as const, label: "Most Funded"   },
];

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function cardImage(c: Campaign, i: number): string {
  if (c.imageUrl) return c.imageUrl;
  const imgs = CATEGORY_IMAGES[c.category];
  if (imgs) return imgs[c.id % imgs.length];
  return `/images/hero-${(i % 9) + 1}.webp`;
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AnimatedBar({ pct, delay = 0 }: { pct: number; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 150 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="w-full bg-white/20 rounded-full h-[3px] overflow-hidden">
      <div
        className="bg-gradient-to-r from-[#e07b3a] to-[#f0b97a] h-full rounded-full"
        style={{ width: `${width}%`, transition: "width 900ms cubic-bezier(0.16,1,0.3,1)" }}
      />
    </div>
  );
}

function CampaignCard({ c, i, featured = false }: { c: Campaign; i: number; featured?: boolean }) {
  const pct = Math.min(100, Math.round((c.amountRaised / c.targetAmount) * 100));
  const img = cardImage(c, i);
  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <Link
          href={`/campaigns/${c.id}`}
          className={`group relative overflow-hidden rounded-2xl block shadow-md h-full ${
            featured ? "min-h-[400px] sm:min-h-[460px]" : "min-h-[200px] sm:min-h-[225px]"
          }`}
        >
      <div className="absolute inset-0">
        <Image src={img} alt={c.title} fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width:768px) 100vw, 50vw" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute top-3 left-3 flex items-center gap-1.5">
        <span className="bg-[#e07b3a] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
          {c.category}
        </span>
        <span className="bg-white/20 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <BadgeCheck className="h-3 w-3" /> Verified
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 pt-10">
        <h3 className={`text-white font-bold leading-tight mb-1 ${featured ? "text-lg" : "text-sm"}`}>
          {c.title}
        </h3>
        <p className={`text-white/65 mb-3 flex items-center gap-1 ${featured ? "text-sm" : "text-xs"}`}>
          <MapPin className="h-3 w-3 shrink-0" />{c.doneeName} · {c.city}
        </p>
        <AnimatedBar pct={pct} delay={i * 70} />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-white font-semibold text-sm">
            ₹{formatINR(c.amountRaised)}{" "}
            <span className="text-white/55 font-normal text-xs">raised</span>
          </span>
          <span className="text-[#f0b97a] text-xs font-semibold">{pct}%</span>
        </div>
      </div>
      </Link>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-80 z-50 p-4 shadow-xl">
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight">
            {c.title}
          </h4>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {c.description}
          </p>
          <div className="text-xs text-[#b04a15] dark:text-[#e07b3a] font-bold">Organized by: {c.doneeName}</div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function CampaignCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div className={`rounded-2xl bg-stone-200 dark:bg-zinc-800 animate-pulse ${
      featured ? "min-h-[400px] sm:min-h-[460px]" : "min-h-[200px] sm:min-h-[225px]"
    }`} />
  );
}

// ── SearchWithSuggestions ─────────────────────────────────────────────────────

function SearchWithSuggestions({
  value,
  onChange,
  campaigns,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  campaigns: Campaign[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const suggestions = useMemo(() => {
    if (value.trim().length < 2) return [];
    const s = value.toLowerCase();
    return campaigns
      .filter(
        (c) =>
          c.title.toLowerCase().includes(s) ||
          c.city.toLowerCase().includes(s) ||
          c.category.toLowerCase().includes(s) ||
          c.doneeName.toLowerCase().includes(s)
      )
      .slice(0, 6);
  }, [value, campaigns]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlighted(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter" && highlighted >= 0 && suggestions[highlighted]) {
      e.preventDefault();
      router.push(`/campaigns/${suggestions[highlighted].id}`);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlighted(-1);
    }
  };

  const showDropdown = open && value.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full sm:w-64">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <Input
          className="pl-9 pr-8 rounded-full border-stone-200 dark:border-stone-700 bg-white dark:bg-zinc-900 shadow-sm h-9 text-sm"
          placeholder={placeholder}
          value={value}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlighted(-1);
          }}
          onFocus={() => { if (value.trim().length >= 2) setOpen(true); }}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button
            onClick={() => { onChange(""); setOpen(false); setHighlighted(-1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-stone-100 dark:border-stone-800 overflow-hidden">
          {suggestions.length === 0 ? (
            <div className="px-4 py-3 flex items-center gap-2 text-sm text-stone-400">
              <SearchX className="h-4 w-4 shrink-0" />
              No campaigns match &ldquo;{value}&rdquo;
            </div>
          ) : (
            <>
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                Suggestions
              </p>
              {suggestions.map((c, idx) => {
                const img = cardImage(c, idx);
                const pct = Math.min(100, Math.round((c.amountRaised / c.targetAmount) * 100));
                return (
                  <Link
                    key={c.id}
                    href={`/campaigns/${c.id}`}
                    onClick={() => { onChange(c.title); setOpen(false); setHighlighted(-1); }}
                    onMouseEnter={() => setHighlighted(idx)}
                    className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                      idx === highlighted
                        ? "bg-orange-50 dark:bg-zinc-800"
                        : "hover:bg-stone-50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-100 dark:bg-zinc-700 shrink-0">
                      <Image src={img} alt={c.title} fill className="object-cover" sizes="40px" />
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate leading-tight">
                        {c.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold bg-orange-100 dark:bg-orange-900/30 text-[#b04a15] dark:text-orange-400 px-1.5 py-0.5 rounded-full">
                          {c.category}
                        </span>
                        <span className="text-[11px] text-stone-400 flex items-center gap-0.5 truncate">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />{c.city}
                        </span>
                      </div>
                    </div>
                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                        ₹{formatINR(c.amountRaised)}
                      </p>
                      <p className="text-[10px] text-stone-400">{pct}% funded</p>
                    </div>
                  </Link>
                );
              })}
              <div className="border-t border-stone-100 dark:border-stone-800 px-3 py-2">
                <p className="text-[11px] text-stone-400">
                  {suggestions.length} result{suggestions.length !== 1 ? "s" : ""} —{" "}
                  <kbd className="bg-stone-100 dark:bg-zinc-800 text-stone-500 px-1 py-0.5 rounded text-[10px]">↑↓</kbd>{" "}
                  navigate,{" "}
                  <kbd className="bg-stone-100 dark:bg-zinc-800 text-stone-500 px-1 py-0.5 rounded text-[10px]">↵</kbd>{" "}
                  open,{" "}
                  <kbd className="bg-stone-100 dark:bg-zinc-800 text-stone-500 px-1 py-0.5 rounded text-[10px]">Esc</kbd>{" "}
                  close
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── SortDropdown ──────────────────────────────────────────────────────────────

function SortDropdown({ sort, setSort, sortByLabel, sortLabel }: { sort: SortValue; setSort: (s: SortValue) => void; sortByLabel: string; sortLabel: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
      >
        <span>{sortByLabel}</span>
        <span className="font-semibold text-stone-700 dark:text-stone-200 ml-0.5">{sortLabel}</span>
        <ChevronDown
          className={`h-3 w-3 ml-0.5 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-40 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-stone-100 dark:border-stone-800 overflow-hidden z-50">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => { setSort(option.value); setOpen(false); }}
              className={`w-full text-left text-sm px-4 py-2.5 transition-colors flex items-center gap-2 ${
                sort === option.value
                  ? "bg-orange-50 dark:bg-orange-900/20 text-[#b04a15] dark:text-orange-400 font-semibold"
                  : "text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800"
              }`}
            >
              {sort === option.value && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#b04a15] dark:bg-orange-400 shrink-0" />
              )}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── FilterPanel ───────────────────────────────────────────────────────────────

function FilterPanel({
  categoryCounts,
  filteredCounts,
  selectedCategories,
  toggleCategory,
  sort,
  setSort,
  resetFilters,
  impactAreaLabel,
  statusLabel,
  resetFiltersLabel,
  emergencyReliefLabel,
}: {
  categoryCounts:  Record<string, number>;
  filteredCounts:  Record<string, number>;
  selectedCategories: string[];
  toggleCategory: (cat: string) => void;
  sort:    SortValue;
  setSort: (s: SortValue) => void;
  resetFilters: () => void;
  impactAreaLabel: string;
  statusLabel: string;
  resetFiltersLabel: string;
  emergencyReliefLabel: string;
}) {
  return (
    <>
      <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3">
        {impactAreaLabel}
      </p>
      <div className="space-y-2.5 mb-5">
        {ALL_CATEGORIES.map((cat) => {
          const total    = categoryCounts[cat] ?? 0;
          const matched  = filteredCounts[cat] ?? 0;
          const active   = selectedCategories.includes(cat);
          const dimmed   = selectedCategories.length > 0 && !active && matched === 0;
          return (
            <label
              key={cat}
              className={`flex items-center gap-2.5 cursor-pointer group transition-opacity ${dimmed ? "opacity-40" : ""}`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggleCategory(cat)}
                className="accent-[#b04a15] w-4 h-4 rounded cursor-pointer shrink-0"
              />
              <span
                className={`text-sm flex-1 leading-none transition-colors ${
                  active
                    ? "text-[#b04a15] dark:text-[#e07b3a] font-semibold"
                    : "text-stone-700 dark:text-stone-300 group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a]"
                }`}
              >
                {cat === "Disaster Relief" ? emergencyReliefLabel : cat}
              </span>
              <span className="text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
                {selectedCategories.length > 0 ? `${matched}/${total}` : `(${total})`}
              </span>
            </label>
          );
        })}
      </div>

      <div className="border-t border-stone-100 dark:border-stone-800 mb-5" />

      <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3">
        {statusLabel}
      </p>
      <div className="space-y-2.5 mb-5">
        {SORT_OPTIONS.map((option) => (
          <label key={option.value} className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="radio"
              name="campaign-sort"
              value={option.value}
              checked={sort === option.value}
              onChange={() => setSort(option.value)}
              className="accent-[#b04a15] w-4 h-4 cursor-pointer shrink-0"
            />
            <span
              className={`text-sm transition-colors ${
                sort === option.value
                  ? "text-[#b04a15] dark:text-[#e07b3a] font-semibold"
                  : "text-stone-700 dark:text-stone-300 group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a]"
              }`}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>

      <div className="border-t border-stone-100 dark:border-stone-800 mb-4" />

      <button
        onClick={resetFilters}
        className="w-full border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 text-sm font-medium py-2 rounded-xl hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
      >
        {resetFiltersLabel}
      </button>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const t = useTranslations("campaigns_page");
  const [campaigns, setCampaigns]               = useState<Campaign[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState("");
  const [search, setSearch]                     = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sort, setSort]                         = useState<SortValue>("urgent");
  const [showFilters, setShowFilters]           = useState(false);

  useEffect(() => {
    getCampaigns()
      .then(setCampaigns)
      .catch(() => setError(t("couldNotLoad")))
      .finally(() => setLoading(false));
  }, [t]);

  // Total counts (all campaigns, ignores current filters — for sidebar reference)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    campaigns.forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });
    return counts;
  }, [campaigns]);

  // Full filtered+sorted list
  const filtered = useMemo(() => {
    let result = campaigns.filter((c) => {
      const s = search.toLowerCase();
      const matchesSearch =
        !s ||
        c.title.toLowerCase().includes(s) ||
        c.city.toLowerCase().includes(s) ||
        c.doneeName.toLowerCase().includes(s);
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(c.category);
      return matchesSearch && matchesCategory;
    });

    if (sort === "urgent") {
      result = [...result].sort(
        (a, b) => a.amountRaised / a.targetAmount - b.amountRaised / b.targetAmount
      );
    } else if (sort === "newest") {
      result = [...result].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sort === "funded") {
      result = [...result].sort(
        (a, b) => b.amountRaised / b.targetAmount - a.amountRaised / a.targetAmount
      );
    }
    return result;
  }, [campaigns, search, selectedCategories, sort]);

  // Per-category count within the current SEARCH+SORT context (ignoring category filter)
  // so sidebar dims categories that would yield 0 extra results
  const filteredCounts = useMemo(() => {
    const s = search.toLowerCase();
    const counts: Record<string, number> = {};
    campaigns
      .filter((c) => {
        const matchesSearch =
          !s ||
          c.title.toLowerCase().includes(s) ||
          c.city.toLowerCase().includes(s) ||
          c.doneeName.toLowerCase().includes(s);
        return matchesSearch;
      })
      .forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });
    return counts;
  }, [campaigns, search]);

  const toggleCategory = (cat: string) =>
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const resetFilters = () => {
    setSelectedCategories([]);
    setSort("urgent");
    setSearch("");
  };

  const activeFilterCount = selectedCategories.length + (sort !== "urgent" ? 1 : 0);
  const hasActiveFilters  = activeFilterCount > 0 || search.length > 0;

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? t("sortBy");

  return (
    <div className="min-h-screen bg-[#f7f4f0] dark:bg-zinc-950 text-stone-900 dark:text-stone-100">

      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div className="relative h-[240px] sm:h-[300px] overflow-hidden">
        <Image src="/images/hero-4.webp" alt="Campaign stories" fill
          className="object-cover object-center" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/75" />
        <div className="relative z-10 flex h-full flex-col justify-end px-5 pb-8 sm:px-10 md:px-14 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-2">
            {t("heroHeading")}
          </h1>
          <p className="text-white/70 text-sm max-w-md mb-4 leading-relaxed">
            {t("heroSubtitle")}
          </p>
          <a
            href="#campaigns"
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/25 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-white/20 transition-colors w-fit"
          >
            {t("readTheirStories")} <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────────────── */}
      <div id="campaigns" className="mx-auto max-w-6xl px-4 sm:px-6 py-7">

        {/* Mobile: filter toggle */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-700 dark:text-stone-300 shadow-sm"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t("filtersMobile")}
            {activeFilterCount > 0 && (
              <span className="bg-[#b04a15] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <SearchWithSuggestions value={search} onChange={setSearch} campaigns={campaigns} placeholder={t("searchCampaigns")} />
        </div>

        {/* Mobile: collapsible filter panel */}
        {showFilters && (
          <div className="lg:hidden mb-5 bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-stone-100 dark:border-stone-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-stone-900 dark:text-white text-base">{t("filtersHeading")}</h3>
              <button onClick={() => setShowFilters(false)} className="text-stone-400 hover:text-stone-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <FilterPanel
              categoryCounts={categoryCounts}
              filteredCounts={filteredCounts}
              selectedCategories={selectedCategories}
              toggleCategory={toggleCategory}
              sort={sort}
              setSort={setSort}
              resetFilters={resetFilters}
              impactAreaLabel={t("impactArea")}
              statusLabel={t("statusHeading")}
              resetFiltersLabel={t("resetFilters")}
              emergencyReliefLabel={t("emergencyRelief")}
            />
          </div>
        )}

        <div className="flex gap-6 items-start">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-52 shrink-0 bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-stone-100 dark:border-stone-800 sticky top-20">
            <h3 className="font-bold text-stone-900 dark:text-white text-base mb-5">{t("filtersHeading")}</h3>
            <FilterPanel
              categoryCounts={categoryCounts}
              filteredCounts={filteredCounts}
              selectedCategories={selectedCategories}
              toggleCategory={toggleCategory}
              sort={sort}
              setSort={setSort}
              resetFilters={resetFilters}
              impactAreaLabel={t("impactArea")}
              statusLabel={t("statusHeading")}
              resetFiltersLabel={t("resetFilters")}
              emergencyReliefLabel={t("emergencyRelief")}
            />
          </aside>

          {/* Right pane */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Header row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900 dark:text-white tracking-tight">
                  {t("activeCampaigns")}
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                  {loading
                    ? t("loadingCampaigns")
                    : campaigns.length !== 1
                      ? t("showingCountPlural", { filtered: filtered.length, total: campaigns.length })
                      : t("showingCount", { filtered: filtered.length, total: campaigns.length })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Search — desktop only (mobile is in toggle bar) */}
                <div className="hidden sm:block">
                  <SearchWithSuggestions value={search} onChange={setSearch} campaigns={campaigns} placeholder={t("searchCampaigns")} />
                </div>
                <SortDropdown sort={sort} setSort={setSort} sortByLabel={t("sortBy")} sortLabel={currentSortLabel} />
                <Link
                  href="/campaigns/new"
                  className="shrink-0 bg-[#b04a15] hover:bg-[#963c0d] text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  {t("addCampaign")}
                </Link>
              </div>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                {search && (
                  <span className="flex items-center gap-1 bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                    &ldquo;{search}&rdquo;
                    <button onClick={() => setSearch("")} className="ml-0.5 hover:text-stone-900 dark:hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-[#b04a15] dark:text-orange-400 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                  >
                    {cat === "Disaster Relief" ? t("emergencyRelief") : cat}
                    <X className="h-3 w-3 ml-0.5" />
                  </button>
                ))}
                {sort !== "urgent" && (
                  <button
                    onClick={() => setSort("urgent")}
                    className="flex items-center gap-1 bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {SORT_OPTIONS.find((o) => o.value === sort)?.label}
                    <X className="h-3 w-3 ml-0.5" />
                  </button>
                )}
                <button
                  onClick={resetFilters}
                  className="text-xs text-stone-400 hover:text-[#b04a15] transition-colors underline underline-offset-2"
                >
                  {t("clearAll")}
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CampaignCardSkeleton featured />
                  <div className="flex flex-col gap-4">
                    <CampaignCardSkeleton />
                    <CampaignCardSkeleton />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <CampaignCardSkeleton />
                  <CampaignCardSkeleton />
                </div>
              </div>
            )}

            {error && <p className="text-center text-red-500 py-20 font-medium">{error}</p>}

            {/* Empty state */}
            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-8 bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-stone-800">
                <div className="mb-4 w-16 h-16 rounded-2xl bg-orange-50 dark:bg-zinc-800 flex items-center justify-center">
                  {campaigns.length === 0
                    ? <HeartHandshake className="w-8 h-8 text-[#b04a15]/40" />
                    : <SearchX className="w-8 h-8 text-stone-300 dark:text-zinc-600" />}
                </div>
                <p className="font-bold text-stone-700 dark:text-stone-300 text-base">
                  {campaigns.length === 0 ? t("noCampaignsYet") : t("noCampaignsMatch")}
                </p>
                <p className="mt-1 text-sm text-stone-400 text-center max-w-xs">
                  {campaigns.length === 0
                    ? t("noCampaignsYetSubtext")
                    : t("noCampaignsMatchSubtext")}
                </p>
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="mt-4 text-sm text-[#b04a15] font-semibold hover:underline">
                    {t("resetAllFilters")}
                  </button>
                )}
              </div>
            )}

            {/* Campaign grid */}
            {!loading && !error && filtered.length > 0 && (
              <Reveal>
                {/* Featured row: 1 tall left + 2 stacked right */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <CampaignCard c={filtered[0]} i={0} featured />
                  <div className="flex flex-col gap-4">
                    {filtered[1] && <CampaignCard c={filtered[1]} i={1} />}
                    {filtered[2] && <CampaignCard c={filtered[2]} i={2} />}
                    {filtered.length === 2 && (
                      <Link
                        href="/campaigns/new"
                        className="flex items-center justify-center gap-2 min-h-[200px] rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-700 text-stone-400 hover:border-[#e07b3a] hover:text-[#e07b3a] transition-colors text-sm font-semibold"
                      >
                        <HeartHandshake className="h-5 w-5" /> {t("startACampaign")}
                      </Link>
                    )}
                  </div>
                </div>

                {/* Remaining — 2-col grid */}
                {filtered.length > 3 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filtered.slice(3).map((c, i) => (
                      <CampaignCard key={c.id} c={c} i={i + 3} />
                    ))}
                  </div>
                )}
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
