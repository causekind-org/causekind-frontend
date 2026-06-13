"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useDynamicTranslations } from "@/hooks/useDynamicTranslation";
import { getCampaigns, type Campaign } from "@/lib/api";
import { Reveal } from "@/components/Reveal";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, Search, HandCoins, HeartHandshake, SearchX } from "lucide-react";

const CATEGORY_IMAGES: Record<string, string[]> = {
  Medical: ["/images/medical-1.png", "/images/medical-2.png"],
  Education: ["/images/hero-7.jpg"],
  Livelihood: ["/images/hero-3.jpg"],
  Community: ["/images/hero-6.jpg"],
};
function cardImage(category: string, id: number) {
  const imgs = CATEGORY_IMAGES[category];
  return imgs ? imgs[id % imgs.length] : null;
}

const CATEGORIES = ["All","Medical","Education","Disaster Relief","Animal Welfare","Environment","Community","Other"];

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

function AnimatedBar({ pct, delay = 0 }: { pct: number; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 150 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="w-full bg-orange-50 dark:bg-zinc-950 rounded-full h-2 overflow-hidden">
      <div
        className="bg-gradient-to-r from-[#b04a15] to-[#e07b3a] h-full rounded-full"
        style={{ width: `${width}%`, transition: "width 900ms cubic-bezier(0.16,1,0.3,1)" }}
      />
    </div>
  );
}

function CampaignCardSkeleton() {
  return (
    <div className="rounded-2xl border border-orange-100/50 dark:border-stone-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      <div className="aspect-video bg-stone-100 dark:bg-zinc-800 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-20 bg-stone-100 dark:bg-zinc-800 rounded-full animate-pulse" />
          <div className="h-4 w-14 bg-stone-100 dark:bg-zinc-800 rounded-full animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 w-full bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="space-y-2 pt-1">
          <div className="h-2 w-full bg-stone-100 dark:bg-zinc-800 rounded-full animate-pulse" />
          <div className="flex justify-between">
            <div className="h-3.5 w-20 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-3.5 w-24 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-9 w-full bg-stone-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

function CampaignItem({ c, i }: { c: Campaign; i: number }) {
  const t = useTranslations("campaigns_page");
  const [title] = useDynamicTranslations([c.title]);
  const pct = Math.min(100, Math.round((c.amountRaised / c.targetAmount) * 100));
  return (
    <Reveal delay={i * 70}>
      <Card className="card-3d card-shimmer card-glow overflow-hidden rounded-2xl border-orange-100/50 dark:border-stone-850/50 bg-white dark:bg-zinc-900 shadow-sm h-full">
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-[#b04a15]/12 via-orange-50 dark:via-zinc-950 to-[#1e3a60]/10">
          {cardImage(c.category, c.id) && (
            <Image src={cardImage(c.category, c.id)!} alt={c.category} fill
              sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
              className="object-cover object-center" />
          )}
        </div>
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-xs">
            <Badge className="bg-orange-100 dark:bg-zinc-800 text-[#b04a15] dark:text-[#e07b3a] border-0 font-semibold">{c.category}</Badge>
            <span className="flex items-center gap-1 text-stone-400 dark:text-stone-500"><MapPin className="h-3 w-3 text-[#b04a15] dark:text-[#e07b3a]" /> {c.city}</span>
          </div>
          <h3 className="mt-3 font-bold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2">{title ?? c.title}</h3>
          <div className="mt-4 space-y-2">
            <AnimatedBar pct={pct} delay={i * 70} />
            <div className="flex justify-between text-xs text-stone-400">
              <span className="font-semibold text-stone-700 dark:text-stone-300">₹{formatINR(c.amountRaised)}</span>
              <span>{t("of")} ₹{formatINR(c.targetAmount)}</span>
            </div>
          </div>
          <Link href={`/campaigns/${c.id}`}>
            <Button size="sm" className="btn-3d btn-shine mt-4 w-full bg-[#963c0d] hover:bg-[#963c0d] dark:bg-[#b04a15] dark:hover:bg-[#963c0d] text-white rounded-xl font-semibold">
              {t("viewDonate")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </Reveal>
  );
}

export default function CampaignsPage() {
  const t = useTranslations("campaigns_page");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    getCampaigns().then(setCampaigns).catch(() => setError(t("error") || "Could not load campaigns.")).finally(() => setLoading(false));
  }, [t]);

  const filtered = useMemo(() => campaigns.filter(c => {
    const s = search.toLowerCase();
    return (!s || c.title.toLowerCase().includes(s) || c.city.toLowerCase().includes(s) || c.doneeName.toLowerCase().includes(s))
      && (category === "All" || c.category === category);
  }), [campaigns, search, category]);

  return (
    <div className="relative bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 min-h-screen overflow-hidden transition-colors duration-300">
      <ParticleBackground className="z-0" />
      <div className="relative z-10">
      {/* Header */}
      <div className="border-b border-orange-100/50 dark:border-stone-850/50 bg-gradient-to-b from-orange-50/60 dark:from-zinc-900/10 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
          <Reveal>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-xl bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] flex items-center justify-center shadow-sm">
                <HandCoins className="h-3.5 w-3.5 text-white" />
              </span>
              <span className="text-xs font-bold text-[#b04a15] dark:text-[#e07b3a] uppercase tracking-widest">{t("verifiedFundraisers")}</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#963c0d] dark:text-white sm:text-3xl">{t("heading")}</h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 font-medium">{t("subtitle")}</p>
          </Reveal>
          <Link href="/campaigns/new">
            <Button className="btn-3d btn-shine bg-[#963c0d] hover:bg-[#963c0d] dark:bg-[#b04a15] dark:hover:bg-[#963c0d] text-white rounded-xl font-semibold px-5 py-5">
              {t("startCampaign")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        {/* Search + filter */}
        <Reveal>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
              <Input
                className="pl-9 rounded-xl border-orange-100 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 bg-white dark:bg-zinc-900 dark:text-stone-100"
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                    category === c
                      ? "bg-[#b04a15] border-[#b04a15] text-white shadow-sm shadow-orange-900/20"
                      : "border-orange-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-[#b04a15] dark:hover:border-[#e07b3a] hover:text-[#b04a15] dark:hover:text-[#e07b3a] bg-white dark:bg-zinc-900"
                  }`}>{c}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <CampaignCardSkeleton key={i} />)}
          </div>
        )}
        {error && <p className="text-center text-red-500 py-20 font-medium">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-8 bg-white dark:bg-zinc-900 rounded-2xl border border-orange-100 dark:border-stone-800">
            {campaigns.length === 0 ? (
              <>
                <div className="mb-4 w-16 h-16 rounded-2xl bg-orange-50 dark:bg-zinc-800 flex items-center justify-center">
                  <HeartHandshake className="w-8 h-8 text-[#b04a15]/40 dark:text-orange-400/30" />
                </div>
                <p className="font-bold text-stone-700 dark:text-stone-300 text-base">{t("noCampaigns")}</p>
                <p className="mt-1 text-sm text-stone-400 dark:text-stone-500 font-medium text-center max-w-xs">{t("noCampaignsSubtext")}</p>
              </>
            ) : (
              <>
                <div className="mb-4 w-16 h-16 rounded-2xl bg-orange-50 dark:bg-zinc-800 flex items-center justify-center">
                  <SearchX className="w-8 h-8 text-stone-300 dark:text-zinc-600" />
                </div>
                <p className="font-bold text-stone-700 dark:text-stone-300 text-base">{t("noMatches")}</p>
                <p className="mt-1 text-sm text-stone-400 dark:text-stone-500 font-medium text-center max-w-xs">{t("noMatchesSubtext")}</p>
              </>
            )}
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c, i) => (
              <CampaignItem key={c.id} c={c} i={i} />
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

