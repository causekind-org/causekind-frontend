"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useDynamicTranslation, useDynamicTranslations, TranslatedText } from "@/hooks/useDynamicTranslation";
import { getItemListings, requestListing, getMyProfile, type ItemListing, type UserProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import Link from "next/link";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Loader2, MapPin, PackageOpen, Search, SearchX, Package, X,
  SlidersHorizontal, BadgeCheck, ChevronDown, Plus, Gift, Truck, Star, Tag
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const LISTING_CATEGORIES = [
  "Education", "Clothing", "Furniture", "Electronics", "Household", "Sports", "Medical aid",
];

const CONDITIONS = ["Like New", "Good", "Fair", "Used"];

const SORT_OPTIONS = [
  { value: "newest" as const, label: "Newest First" },
  { value: "qty"    as const, label: "High Quantity" },
  { value: "az"     as const, label: "A → Z" },
];
type SortValue = "newest" | "qty" | "az";

function getConditionStyle(condition: string): { badge: string; accent: string } {
  const map: Record<string, { badge: string; accent: string }> = {
    "Like New": { badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400", accent: "border-emerald-300 dark:border-emerald-800" },
    "Good":     { badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",           accent: "border-blue-300 dark:border-blue-800" },
    "Fair":     { badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",       accent: "border-amber-300 dark:border-amber-800" },
    "Used":     { badge: "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-stone-400",           accent: "border-stone-200 dark:border-zinc-700" },
  };
  return map[condition] ?? map["Used"];
}

const CATEGORY_META: Record<string, { emoji: string; img: string }> = {
  "Education":   { emoji: "📚", img: "/images/hero-7.webp" },
  "Clothing":    { emoji: "👕", img: "/images/hero-1.webp" },
  "Furniture":   { emoji: "🪑", img: "/images/hero-2.webp" },
  "Electronics": { emoji: "💻", img: "/images/hero-8.webp" },
  "Household":   { emoji: "🏠", img: "/images/hero-6.webp" },
  "Sports":      { emoji: "⚽", img: "/images/hero-3.webp" },
  "Medical aid": { emoji: "🏥", img: "/images/medical-1.webp" },
};

function getListingImage(item: ItemListing): string {
  return item.imageUrl ?? CATEGORY_META[item.category]?.img ?? "/images/hero-1.webp";
}

// ─── ListingsHero ─────────────────────────────────────────────────────────────

function ListingsHero() {
  return (
    <section
      className="relative overflow-hidden min-h-[220px] sm:min-h-[260px] flex items-center"
      style={{ background: "linear-gradient(135deg, #0f1d30 0%, #1e2d10 45%, #1c0905 100%)" }}
    >
      {/* Animated blobs / rings */}
      <div className="animate-blob-a absolute -top-20 -left-20 w-72 h-72 rounded-full border border-white/5 pointer-events-none" />
      <div className="animate-blob-b absolute -bottom-24 -right-10 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />

      {/* Floating dots */}
      <div className="animate-float-shape-1 absolute top-8  left-[12%]  w-1.5 h-1.5 rounded-full bg-[#e07b3a]/50 pointer-events-none" />
      <div className="animate-float-shape-2 absolute top-16 right-[18%] w-2   h-2   rounded-full bg-[#f0b97a]/30 pointer-events-none" />
      <div className="animate-float-shape-3 absolute bottom-10 left-[35%] w-1   h-1   rounded-full bg-white/20 pointer-events-none" />
      <div className="animate-float-shape-4 absolute top-[40%] right-[8%]  w-1.5 h-1.5 rounded-full bg-[#b04a15]/60 pointer-events-none" />
      <div className="animate-float-shape-5 absolute bottom-6 left-[60%] w-2   h-2   rounded-full bg-[#e07b3a]/20 pointer-events-none" />
      <div className="animate-float-shape-6 absolute top-6   right-[40%] w-1   h-1   rounded-full bg-white/15 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 text-center py-8 sm:py-10">
        {/* Badge pill */}
        <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-5"
          style={{ background: "rgba(176,74,21,0.25)", border: "1px solid rgba(224,123,58,0.3)" }}>
          <Package className="h-3.5 w-3.5 text-[#e07b3a]" />
          <span className="text-xs font-bold tracking-widest uppercase text-[#f0b97a]">Donor Offerings</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
          Community{" "}
          <span className="text-gradient-terra">Listings</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-3 text-sm sm:text-base text-white/60 max-w-xl mx-auto leading-relaxed">
          Browse items donated by generous community members — find what you need, request it, and receive it directly.
        </p>

        {/* Feature pills */}
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-300">
            <BadgeCheck className="h-3 w-3" /> Donor Verified
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0b97a]/15 border border-[#f0b97a]/25 px-3 py-1 text-xs font-semibold text-[#f0b97a]">
            <MapPin className="h-3 w-3" /> Local Pickup
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/25 px-3 py-1 text-xs font-semibold text-rose-300">
            <Gift className="h-3 w-3" /> Zero Fees
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── ListingCardSkeleton ───────────────────────────────────────────────────────

function ListingCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-stone-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse">
      <div className="w-full h-44 bg-stone-100 dark:bg-zinc-800" />
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-stone-100 dark:bg-zinc-800 rounded-full" />
          <div className="h-5 w-16 bg-stone-100 dark:bg-zinc-800 rounded-full ml-auto" />
        </div>
        <div className="h-5 w-4/5 bg-stone-100 dark:bg-zinc-800 rounded" />
        <div className="h-4 w-2/3 bg-stone-100 dark:bg-zinc-800 rounded" />
        <div className="h-10 w-full bg-stone-100 dark:bg-zinc-800 rounded-xl mt-3" />
      </div>
    </div>
  );
}

// ─── ListingCard ──────────────────────────────────────────────────────────────

function ListingCard({
  item,
  index,
  onRequest,
}: {
  item: ItemListing;
  index: number;
  onRequest: (item: ItemListing) => void;
}) {
  const [title] = useDynamicTranslations([item.title]);
  const condStyle = getConditionStyle(item.condition);
  const imgSrc = getListingImage(item);
  const meta = CATEGORY_META[item.category];

  return (
    <Reveal delay={index * 70}>
      <HoverCard openDelay={300}>
        <HoverCardTrigger asChild>
          <div className="group bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-stone-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full cursor-pointer">
        {/* Image section */}
        <Link href={`/items/${item.id}`} className="relative block w-full h-44 overflow-hidden bg-stone-100 dark:bg-zinc-800 shrink-0">
          <Image
            src={imgSrc}
            alt={item.title}
            fill
            sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
            className="object-cover group-hover:scale-[1.06] transition-transform duration-500"
          />
          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
          {/* Condition badge – top left */}
          <span className={`absolute top-2.5 left-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${condStyle.badge}`}>
            {item.condition}
          </span>
          {/* Quantity badge – top right */}
          {item.quantity > 1 && (
            <span className="absolute top-2.5 right-2.5 rounded-full bg-black/60 text-[#f0b97a] px-2 py-0.5 text-[10px] font-bold">
              Qty: {item.quantity}
            </span>
          )}
        </Link>

        {/* Card body */}
        <div className="p-5 flex flex-col flex-1 gap-2">
          {/* Category pill + location */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-stone-400 px-2.5 py-0.5 text-[11px] font-semibold">
              {meta?.emoji && <span>{meta.emoji}</span>}
              <TranslatedText text={item.category} />
            </span>
            <span className="flex items-center gap-1 text-[11px] text-stone-400 dark:text-stone-500">
              <MapPin className="h-3 w-3 shrink-0" />
              <TranslatedText text={item.city} />
            </span>
          </div>

          {/* Title */}
          <h3 className="font-extrabold text-stone-900 dark:text-stone-100 text-sm leading-snug line-clamp-2">
            {title ?? item.title}
          </h3>

          {/* Description or donor attribution */}
          {item.description ? (
            <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          ) : (
            <p className="text-xs text-stone-400 dark:text-stone-500 italic">
              Donated by {item.donorName}
            </p>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Request button */}
          <button
            onClick={() => onRequest(item)}
            className="btn-shine mt-1 w-full rounded-xl bg-[#b04a15] hover:bg-[#943e11] text-white text-sm font-semibold py-2.5 transition-colors active:scale-95"
          >
            Request Item
          </button>
        </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent side="right" align="start" className="w-80 z-50 p-4 shadow-xl">
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight">
              {title ?? item.title}
            </h4>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {item.description ? <TranslatedText text={item.description} /> : `Donated by ${item.donorName}`}
            </p>
            <div className="text-xs text-[#b04a15] dark:text-[#e07b3a] font-bold">Donated by: {item.donorName}</div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </Reveal>
  );
}

// ─── ListingFilterPanel ───────────────────────────────────────────────────────

function ListingFilterPanel({
  categoryCounts,
  filteredCounts,
  selectedCategories,
  toggleCategory,
  selectedConditions,
  toggleCondition,
  sort,
  setSort,
  resetFilters,
}: {
  categoryCounts: Record<string, number>;
  filteredCounts: Record<string, number>;
  selectedCategories: string[];
  toggleCategory: (c: string) => void;
  selectedConditions: string[];
  toggleCondition: (c: string) => void;
  sort: SortValue;
  setSort: (s: SortValue) => void;
  resetFilters: () => void;
}) {
  const conditionDotClass: Record<string, string> = {
    "Like New": "bg-emerald-500",
    "Good":     "bg-blue-500",
    "Fair":     "bg-amber-500",
    "Used":     "bg-stone-400",
  };

  return (
    <div className="space-y-5">
      {/* Category */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2.5">
          Category
        </p>
        <div className="space-y-1.5">
          {LISTING_CATEGORIES.map(cat => {
            const total = categoryCounts[cat] ?? 0;
            const match = filteredCounts[cat] ?? 0;
            const dim = total > 0 && match === 0;
            return (
              <label
                key={cat}
                className={`flex items-center gap-2 cursor-pointer group ${dim ? "opacity-40" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="accent-[#b04a15] w-3.5 h-3.5 rounded"
                />
                <span className="flex-1 text-xs text-stone-700 dark:text-stone-300 group-hover:text-[#b04a15] transition-colors">
                  {cat}
                </span>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">{total}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Condition */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2.5">
          Condition
        </p>
        <div className="space-y-1.5">
          {CONDITIONS.map(cond => (
            <label key={cond} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedConditions.includes(cond)}
                onChange={() => toggleCondition(cond)}
                className="accent-[#b04a15] w-3.5 h-3.5 rounded"
              />
              <span className={`w-2 h-2 rounded-full shrink-0 ${conditionDotClass[cond] ?? "bg-stone-400"}`} />
              <span className="flex-1 text-xs text-stone-700 dark:text-stone-300 group-hover:text-[#b04a15] transition-colors">
                {cond}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-2.5">
          Sort By
        </p>
        <div className="space-y-1.5">
          {SORT_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="sort"
                checked={sort === opt.value}
                onChange={() => setSort(opt.value)}
                className="accent-[#b04a15] w-3.5 h-3.5"
              />
              <span className="text-xs text-stone-700 dark:text-stone-300 group-hover:text-[#b04a15] transition-colors">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={resetFilters}
        className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 text-xs font-semibold text-stone-500 dark:text-stone-400 py-2 hover:border-[#b04a15] hover:text-[#b04a15] transition-colors"
      >
        Reset Filters
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ItemsPage() {
  const t = useTranslations("listings");
  const { user } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<ItemListing[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [sort, setSort] = useState<SortValue>("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Modal state (keep existing)
  const [requestTarget, setRequestTarget] = useState<ItemListing | null>(null);
  const modalTitle = useDynamicTranslation(requestTarget?.title ?? null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetches: Promise<unknown>[] = [
      getItemListings().then(setItems).catch(() => toast.error("Failed to load item listings")),
    ];
    if (user) {
      fetches.push(getMyProfile().then(setMyProfile).catch(() => {}));
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [user]);

  // Counts for filter panel
  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach(i => { c[i.category] = (c[i.category] || 0) + 1; });
    return c;
  }, [items]);

  const filteredCounts = useMemo(() => {
    const q = search.toLowerCase();
    const c: Record<string, number> = {};
    items
      .filter(i => !q || i.title.toLowerCase().includes(q) || i.city.toLowerCase().includes(q))
      .forEach(i => { c[i.category] = (c[i.category] || 0) + 1; });
    return c;
  }, [items, search]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = items.filter(i => {
      const matchQ =
        !q ||
        i.title.toLowerCase().includes(q) ||
        i.city.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q);
      const matchC = selectedCategories.length === 0 || selectedCategories.includes(i.category);
      const matchCond = selectedConditions.length === 0 || selectedConditions.includes(i.condition);
      return matchQ && matchC && matchCond;
    });
    if (sort === "newest") result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sort === "qty") result = [...result].sort((a, b) => b.quantity - a.quantity);
    else if (sort === "az") result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    return result;
  }, [items, search, selectedCategories, selectedConditions, sort]);

  function toggleCategory(cat: string) {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  function toggleCondition(cond: string) {
    setSelectedConditions(prev =>
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  }

  function resetFilters() {
    setSelectedCategories([]);
    setSelectedConditions([]);
    setSort("newest");
    setSearch("");
  }

  const activeFilterCount = selectedCategories.length + selectedConditions.length;

  // Modal handlers (keep existing)
  function openRequestModal(item: ItemListing) {
    if (!user) { router.push("/login"); return; }
    if (!myProfile?.latitude || !myProfile?.longitude) {
      toast.error("Please set your location in your profile before requesting items.", {
        action: { label: "Set location", onClick: () => router.push("/profile") },
      });
      return;
    }
    setRequestTarget(item);
    setReason("");
  }

  function closeRequestModal() {
    setRequestTarget(null);
    setReason("");
  }

  async function handleSubmitRequest() {
    if (!requestTarget) return;
    if (reason.trim().length < 20) {
      toast.error("Please explain in at least 20 characters why you need this item");
      return;
    }
    setSubmitting(true);
    try {
      await requestListing(requestTarget.id, reason.trim());
      toast.success("Request submitted! Admin will review and connect you with the donor if approved.");
      closeRequestModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f4f0] dark:bg-zinc-950">
      <ListingsHero />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-7">

        {/* Mobile: filter toggle + search */}
        <div className="flex gap-3 mb-4 lg:hidden">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 rounded-full border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold text-stone-700 dark:text-stone-300 shadow-sm hover:border-[#b04a15] hover:text-[#b04a15] transition-colors shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-[#b04a15] text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Search items…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-full h-9 border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
            />
          </div>
        </div>

        {/* Mobile collapsible filter panel */}
        {showFilters && (
          <div className="lg:hidden mb-5 bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-stone-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Filters</h3>
              <button onClick={() => setShowFilters(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ListingFilterPanel
              categoryCounts={categoryCounts}
              filteredCounts={filteredCounts}
              selectedCategories={selectedCategories}
              toggleCategory={toggleCategory}
              selectedConditions={selectedConditions}
              toggleCondition={toggleCondition}
              sort={sort}
              setSort={setSort}
              resetFilters={resetFilters}
            />
          </div>
        )}

        <div className="flex gap-6 items-start">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-52 shrink-0 bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-stone-100 dark:border-stone-800 sticky top-20">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-4">Filters</h3>
            <ListingFilterPanel
              categoryCounts={categoryCounts}
              filteredCounts={filteredCounts}
              selectedCategories={selectedCategories}
              toggleCategory={toggleCategory}
              selectedConditions={selectedConditions}
              toggleCondition={toggleCondition}
              sort={sort}
              setSort={setSort}
              resetFilters={resetFilters}
            />
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-100 leading-tight">
                  Available Listings
                </h2>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                  Showing {filtered.length} of {items.length} listings
                </p>
              </div>
              {/* Desktop search */}
              <div className="hidden sm:block relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <Input
                  placeholder="Search items…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 rounded-full h-9 w-52 border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                />
              </div>
              <Link href="/items/new">
                <button className="btn-3d btn-shine flex items-center gap-1.5 rounded-xl bg-[#b04a15] hover:bg-[#943e11] text-white text-sm font-semibold px-4 py-2 transition-colors">
                  <Plus className="h-4 w-4" />
                  List Item
                </button>
              </Link>
            </div>

            {/* Active filter chips */}
            {(selectedCategories.length > 0 || selectedConditions.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#b04a15]/10 border border-[#b04a15]/20 text-[#b04a15] dark:text-[#e07b3a] px-3 py-1 text-xs font-semibold hover:bg-[#b04a15]/20 transition-colors"
                  >
                    {cat}
                    <X className="h-3 w-3" />
                  </button>
                ))}
                {selectedConditions.map(cond => (
                  <button
                    key={cond}
                    onClick={() => toggleCondition(cond)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-stone-200 dark:bg-zinc-800 border border-stone-300 dark:border-zinc-700 text-stone-600 dark:text-stone-400 px-3 py-1 text-xs font-semibold hover:bg-stone-300 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {cond}
                    <X className="h-3 w-3" />
                  </button>
                ))}
                <button
                  onClick={resetFilters}
                  className="text-xs text-stone-400 hover:text-[#b04a15] transition-colors underline underline-offset-2"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Loading */}
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => <ListingCardSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-20 px-8 bg-white dark:bg-zinc-900 rounded-2xl border border-stone-100 dark:border-zinc-800">
                {items.length === 0 ? (
                  <>
                    <div className="mb-4 w-16 h-16 rounded-2xl bg-stone-50 dark:bg-zinc-800 flex items-center justify-center">
                      <PackageOpen className="w-8 h-8 text-[#b04a15]/40" />
                    </div>
                    <p className="font-bold text-stone-700 dark:text-stone-300 text-base">{t("noListings")}</p>
                    <p className="mt-1 text-sm text-stone-400 dark:text-stone-500 font-medium text-center max-w-xs">{t("noListingsSubtext")}</p>
                  </>
                ) : (
                  <>
                    <div className="mb-4 w-16 h-16 rounded-2xl bg-orange-50 dark:bg-zinc-800 flex items-center justify-center">
                      <SearchX className="w-8 h-8 text-stone-300 dark:text-zinc-600" />
                    </div>
                    <p className="font-bold text-stone-700 dark:text-stone-300 text-base">{t("noMatches")}</p>
                    <p className="mt-1 text-sm text-stone-400 dark:text-stone-500 font-medium text-center max-w-xs">{t("noMatchesSubtext")}</p>
                    <button
                      onClick={resetFilters}
                      className="mt-4 text-sm font-semibold text-[#b04a15] hover:underline"
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Card grid */
              <div className="grid gap-5 sm:grid-cols-2">
                {filtered.map((item, i) => (
                  <ListingCard key={item.id} item={item} index={i} onRequest={openRequestModal} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Request Modal (keep exact existing logic + JSX) ─────────────────── */}
      {requestTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-[#faf8f4] dark:bg-zinc-900 shadow-2xl">
            <div className="relative border-b border-stone-100 dark:border-stone-800 bg-gradient-to-r from-[#C17A3A]/10 to-transparent px-5 py-4">
              <div className="pr-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#C17A3A] dark:text-[#e0975a]">{t("requestItem")}</p>
                <h2 className="mt-0.5 text-lg font-extrabold text-[#1c1108] dark:text-white leading-tight">
                  {modalTitle ?? requestTarget.title}
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  <TranslatedText text={requestTarget.category} /> · <TranslatedText text={requestTarget.condition} /> · Qty {requestTarget.quantity} · <TranslatedText text={requestTarget.city} />
                </p>
              </div>
              <button
                onClick={closeRequestModal}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-stone-400 hover:bg-orange-50 dark:hover:bg-zinc-800 hover:text-stone-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <Label htmlFor="reason" className="mb-2 block font-semibold text-stone-700 dark:text-stone-300">
                  Why do you need this item? <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Explain your situation and why this item would help you. E.g. I am a student who recently lost my bag and urgently need a replacement for school…"
                  rows={4}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="rounded-xl border-stone-200 dark:border-stone-700 focus-visible:ring-[#C17A3A]/20 resize-none"
                />
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">{reason.length}/1000 characters (min 20)</p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-[#C17A3A]/20 bg-[#C17A3A]/5 px-4 py-3">
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  Admin will review your reason and approve if valid. Contact details are shared only after approval.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800 bg-stone-50/30 dark:bg-zinc-950/30 px-5 py-4">
              <Button variant="ghost" onClick={closeRequestModal} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="btn-3d btn-shine bg-[#C17A3A] hover:bg-[#a86430] text-white rounded-xl px-6 font-semibold"
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                ) : (
                  "Submit request"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
