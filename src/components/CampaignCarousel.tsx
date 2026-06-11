"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  Music,
  Play,
  MapPin,
} from "lucide-react";
import type { Campaign } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const INTERVAL = 3000; // ms between auto-slides

const CATEGORY_IMAGES: Record<string, string[]> = {
  Medical:    ["/images/medical-1.png", "/images/medical-2.png"],
  Education:  ["/images/hero-7.jpg"],
  Livelihood: ["/images/hero-3.jpg"],
  Community:  ["/images/hero-6.jpg"],
};

function getCardImage(category: string, id: number): string {
  const imgs = CATEGORY_IMAGES[category];
  return imgs?.length ? imgs[id % imgs.length] : "/images/hero-1.jpg";
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}


/* ── Horizontal Single Card with Simulated Instagram Reel ── */
function HorizontalCampaignCard({
  campaign,
  idx,
  className = "",
  peek = false,
}: {
  campaign: Campaign;
  idx: number;
  className?: string;
  peek?: boolean;
}) {
  const pct = Math.min(
    100,
    Math.round((campaign.amountRaised / campaign.targetAmount) * 100)
  );

  // Engagement stats
  const likes = ((campaign.id * 143 + 342) % 950) + 100;
  const comments = ((campaign.id * 47 + 89) % 200) + 15;
  const shares = ((campaign.id * 23 + 45) % 120) + 8;
  const doneeUsername = `@${campaign.doneeName
    .toLowerCase()
    .replace(/\s+/g, "_")}`;

  return (
    <div
      aria-hidden={peek || undefined}
      className={[
        "border border-orange-100 dark:border-zinc-800 p-5 md:p-6 lg:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row gap-6 md:gap-8 items-stretch w-full h-full bg-white dark:bg-zinc-900 transition-shadow duration-300 hover:shadow-2xl",
        peek ? "select-none" : "",
        className,
      ].join(" ")}
    >
      {/* Left side: Simulated Instagram Reel (9:16 vertical ratio) */}
      <div className="w-full md:w-[240px] lg:w-[260px] aspect-[9/16] shrink-0 relative overflow-hidden bg-zinc-950 rounded-2xl shadow-lg border border-stone-200/20 dark:border-zinc-800/50 group select-none">
        {/* Reel Background Cover Image */}
        <Image
          src={campaign.imageUrl || getCardImage(campaign.category, campaign.id)}
          alt={campaign.title}
          fill
          sizes="(max-width: 768px) 100vw, 260px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Video simulation dark filters */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/35 pointer-events-none" />

        {/* Pulsating Play Button overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110">
            <Play className="w-6 h-6 fill-white ml-0.5 text-white" />
          </div>
        </div>

        {/* Floating Right Engagement Icons Panel */}
        <div className="absolute right-3 bottom-16 flex flex-col items-center gap-4 z-10 text-white">
          <div className="flex flex-col items-center cursor-pointer group/icon">
            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-[#b04a15] transition-colors border border-white/10 group-hover/icon:scale-110 duration-200">
              <Heart className="w-5 h-5 fill-white text-white" />
            </div>
            <span className="text-[10px] font-bold mt-1 text-white/90 drop-shadow-md">
              {likes}
            </span>
          </div>

          <div className="flex flex-col items-center cursor-pointer group/icon">
            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-[#1e3a60] transition-colors border border-white/10 group-hover/icon:scale-110 duration-200">
              <MessageCircle className="w-5 h-5 fill-white text-white" />
            </div>
            <span className="text-[10px] font-bold mt-1 text-white/90 drop-shadow-md">
              {comments}
            </span>
          </div>

          <div className="flex flex-col items-center cursor-pointer group/icon">
            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-orange-600 transition-colors border border-white/10 group-hover/icon:scale-110 duration-200">
              <Share2 className="w-5 h-5 fill-white text-white" />
            </div>
            <span className="text-[10px] font-bold mt-1 text-white/90 drop-shadow-md">
              {shares}
            </span>
          </div>

          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10 cursor-pointer">
            <MoreVertical className="w-5 h-5" />
          </div>
        </div>

        {/* Floating Bottom Left Info & Audio Spinning Disc */}
        <div className="absolute bottom-4 left-3 right-3 flex items-end justify-between z-10 text-white">
          <div className="space-y-1 max-w-[70%]">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] flex items-center justify-center font-bold text-[10px] border border-white/20 uppercase">
                {campaign.doneeName[0]}
              </div>
              <span className="text-xs font-black drop-shadow-md truncate">
                {doneeUsername}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-white/80 line-clamp-1 drop-shadow-sm">
              #{campaign.category.toLowerCase()} #causekind #directgiving
            </p>
          </div>

          {/* Spin disk mockup */}
          <div className="w-8 h-8 rounded-full bg-zinc-900/80 border border-white/20 flex items-center justify-center animate-reel-disc shrink-0 shadow-md">
            <Music className="w-3.5 h-3.5 text-[#f0b97a]" />
          </div>
        </div>

        {/* Sync seek tracker bar at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div
            className="h-full bg-gradient-to-r from-[#b04a15] to-[#e07b3a]"
            style={{ animation: "timer-bar-fill 3000ms linear forwards" }}
          />
        </div>
      </div>

      {/* Right side: Detailed Campaign content */}
      <div className="flex-1 flex flex-col justify-between py-2 md:py-4 px-1">
        <div>
          {/* Category & City badges */}
          <div className="flex items-center gap-3 text-xs mb-4">
            <Badge className="bg-[#b04a15]/10 dark:bg-[#b04a15]/20 text-[#b04a15] dark:text-[#e07b3a] border-0 font-extrabold uppercase tracking-wider text-[10px] px-3 py-1 rounded-full">
              {campaign.category}
            </Badge>
            <span className="flex items-center gap-1 text-stone-400 dark:text-stone-500 font-bold">
              <MapPin className="h-3.5 w-3.5 text-[#b04a15] dark:text-[#e07b3a]" />
              {campaign.city}
            </span>
          </div>

          {/* Heading (Campaign Title) */}
          <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-stone-900 dark:text-white leading-tight mb-3 hover:text-[#b04a15] dark:hover:text-[#e07b3a] transition-colors duration-200">
            {campaign.title}
          </h3>

          {/* Description of the campaign */}
          <p className="text-sm md:text-base text-stone-500 dark:text-stone-400 line-clamp-3 md:line-clamp-4 leading-relaxed font-medium mb-6">
            {campaign.description}
          </p>
        </div>

        {/* Progress & Fundraising Status Details */}
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              <span>Fundraising Progress</span>
              <span className="text-[#b04a15] dark:text-[#e07b3a] font-extrabold">
                {pct}%
              </span>
            </div>
            {/* Thick Progress Bar track */}
            <div className="w-full bg-stone-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden border border-stone-200/40 dark:border-zinc-800/40 shadow-inner">
              <div
                className="bg-gradient-to-r from-[#b04a15] via-[#e07b3a] to-[#f59e0b] h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-xs border-y border-stone-100 dark:border-zinc-800/50 py-3.5">
            <div className="flex flex-col">
              <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider mb-0.5">
                Amount Raised
              </span>
              <span className="font-extrabold text-[#b04a15] dark:text-[#e07b3a] text-lg tabular-nums">
                {formatINR(campaign.amountRaised)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#b04a15]/10 dark:bg-[#e07b3a]/10 text-[#b04a15] dark:text-[#e07b3a] font-black px-3 py-1 rounded-full text-[10px] tracking-wider uppercase border border-[#b04a15]/20 dark:border-[#e07b3a]/20">
              {pct}% Funded
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider mb-0.5">
                Campaign Goal
              </span>
              <span className="font-bold text-stone-700 dark:text-stone-300 text-base tabular-nums">
                {formatINR(campaign.targetAmount)}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              className="btn-3d btn-donate-interactive w-full bg-[#b04a15] hover:bg-[#963c0d] text-white rounded-xl py-6 font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
              asChild
            >
              <Link href={`/campaigns/${campaign.id}`}>
                Donate Now <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main carousel ─────────────────────────────────────────── */
export function CampaignCarousel({ campaigns }: { campaigns: Campaign[] }) {
  const [idx, setIdx] = useState(0);
  const [exitingCampaign, setExitingCampaign] = useState<Campaign | null>(null);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [paused, setPaused] = useState(false);
  const timerKey = useRef(0); // incremented to force timer reset on manual nav

  const maxIdx = campaigns.length - 1;

  /* navigation helpers */
  const go = useCallback((nextIdx: number, dir?: "left" | "right") => {
    timerKey.current += 1;
    const resolvedDir = dir || (nextIdx > idx ? "right" : "left");
    setDirection(resolvedDir);
    setExitingCampaign(campaigns[idx]);
    setIdx(nextIdx);
  }, [idx, campaigns]);

  const prev = useCallback(() => {
    go(idx <= 0 ? maxIdx : idx - 1, "left");
  }, [idx, maxIdx, go]);

  const next = useCallback(() => {
    go(idx >= maxIdx ? 0 : idx + 1, "right");
  }, [idx, maxIdx, go]);

  // Clean up the exiting campaign after slide animation completes (500ms)
  useEffect(() => {
    if (!exitingCampaign) return;
    const t = setTimeout(() => {
      setExitingCampaign(null);
    }, 500);
    return () => clearTimeout(t);
  }, [exitingCampaign]);

  /* auto-rotate interval matching 3s */
  useEffect(() => {
    if (paused || campaigns.length <= 1 || exitingCampaign) return;
    const t = setInterval(next, INTERVAL);
    return () => clearInterval(t);
  }, [paused, next, campaigns.length, exitingCampaign]);

  if (!campaigns.length) return null;

  const campaign = campaigns[idx];
  const hasPeek = campaigns.length > 1;
  const prevIdx = idx <= 0 ? maxIdx : idx - 1;
  const nextIdx = idx >= maxIdx ? 0 : idx + 1;

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Active card (normal flow — sets container height) ── */}
      <div
        className="relative z-20 mx-auto w-[82%] max-w-[1100px] py-6 overflow-hidden min-h-[580px] sm:min-h-[460px] md:min-h-[380px] lg:min-h-[480px]"
      >
        {exitingCampaign && (
          <div className={`absolute inset-x-0 top-6 w-full ${
            direction === "right" ? "animate-slide-out-left" : "animate-slide-out-right"
          }`}>
            <HorizontalCampaignCard campaign={exitingCampaign} idx={prevIdx} peek />
          </div>
        )}
        <div className={`w-full ${
          exitingCampaign
            ? (direction === "right" ? "animate-slide-in-right" : "animate-slide-in-left")
            : ""
        }`}>
          <HorizontalCampaignCard campaign={campaign} idx={idx} />
        </div>
      </div>

      {/* ── Peek prev: centered at left screen edge → right half visible ── */}
      {hasPeek && (
        <div
          role="button"
          tabIndex={-1}
          aria-label="Previous campaign"
          onClick={prev}
          className="absolute inset-y-0 left-0 -translate-x-1/2 z-10
                     w-[82%] max-w-[1100px] py-6
                     hidden md:block cursor-pointer
                     opacity-40 blur-[1.5px]
                     hover:opacity-65 hover:blur-0
                     transition-[opacity,filter] duration-300"
        >
          <HorizontalCampaignCard
            campaign={campaigns[prevIdx]}
            idx={prevIdx}
            peek
            className="pointer-events-none h-full"
          />
        </div>
      )}

      {/* ── Peek next: centered at right screen edge → left half visible ── */}
      {hasPeek && (
        <div
          role="button"
          tabIndex={-1}
          aria-label="Next campaign"
          onClick={next}
          className="absolute inset-y-0 right-0 translate-x-1/2 z-10
                     w-[82%] max-w-[1100px] py-6
                     hidden md:block cursor-pointer
                     opacity-40 blur-[1.5px]
                     hover:opacity-65 hover:blur-0
                     transition-[opacity,filter] duration-300"
        >
          <HorizontalCampaignCard
            campaign={campaigns[nextIdx]}
            idx={nextIdx}
            peek
            className="pointer-events-none h-full"
          />
        </div>
      )}

      {/* ── Nav arrows — float at active-card edges ── */}
      {hasPeek && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-[96%] max-w-[1240px] z-30 flex items-center justify-between px-2 sm:px-4">
          <button
            onClick={prev}
            aria-label="Previous"
            className="pointer-events-auto flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full
                       bg-white/25 dark:bg-zinc-900/25 backdrop-blur-xl backdrop-saturate-150
                       border border-white/40 dark:border-white/15 ring-1 ring-inset ring-white/30 dark:ring-white/5
                       shadow-[0_8px_32px_-8px_rgba(176, 74, 21,0.35),inset_0_1px_1px_rgba(255,255,255,0.5)]
                       text-[#b04a15] dark:text-[#e07b3a]
                       hover:bg-[#b04a15]/90 hover:text-white hover:border-[#b04a15]/50 hover:scale-110
                       hover:shadow-[0_12px_40px_-6px_rgba(176, 74, 21,0.5)]
                       active:scale-95 transition-all duration-300 ease-out"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={next}
            aria-label="Next"
            className="pointer-events-auto flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full
                       bg-white/25 dark:bg-zinc-900/25 backdrop-blur-xl backdrop-saturate-150
                       border border-white/40 dark:border-white/15 ring-1 ring-inset ring-white/30 dark:ring-white/5
                       shadow-[0_8px_32px_-8px_rgba(176, 74, 21,0.35),inset_0_1px_1px_rgba(255,255,255,0.5)]
                       text-[#b04a15] dark:text-[#e07b3a]
                       hover:bg-[#b04a15]/90 hover:text-white hover:border-[#b04a15]/50 hover:scale-110
                       hover:shadow-[0_12px_40px_-6px_rgba(176, 74, 21,0.5)]
                       active:scale-95 transition-all duration-300 ease-out"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* ── Dot indicators ── */}
      {campaigns.length > 1 && (
        <div className="pb-6 flex justify-center items-center gap-2">
          {campaigns.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i, i > idx ? "right" : "left")}
              aria-label={`Slide ${i + 1}`}
              className={[
                "rounded-full transition-all duration-300",
                i === idx
                  ? "w-8 h-2 bg-[#b04a15]"
                  : "w-2 h-2 bg-stone-300 dark:bg-zinc-700 hover:bg-[#e07b3a]",
              ].join(" ")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Section wrapper (used in page.tsx) ────────────────────── */
export function LatestActiveCampaignsSection({
  campaigns,
  loading,
  error,
}: {
  campaigns: Campaign[];
  loading: boolean;
  error: string;
}) {
  const latestCampaigns = campaigns.slice(0, 5);

  return (
    <section className="w-full py-20 bg-[#faf8f5] dark:bg-zinc-950 text-stone-900 dark:text-stone-100">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 px-6 sm:px-10 max-w-7xl mx-auto">
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
            Latest active campaigns
          </h2>
          <p className="text-base text-stone-500 dark:text-stone-400 font-medium">
            Support the latest vetted fundraising efforts across India.
          </p>
        </div>
        <Link href="/campaigns" className="shrink-0">
          <Button
            variant="outline"
            className="btn-3d border-orange-200 dark:border-stone-850 hover:bg-orange-50 dark:hover:bg-zinc-900 rounded-xl font-bold px-5 py-5 text-sm gap-2 text-stone-700 dark:text-stone-200"
          >
            Browse All Campaigns <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="flex justify-center py-20 px-10">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#b04a15]/20 border-t-[#b04a15]" />
        </div>
      )}
      {error && (
        <p className="text-center text-red-500 py-20 px-10 font-semibold">{error}</p>
      )}
      {!loading && !error && latestCampaigns.length === 0 && (
        <p className="text-center text-stone-400 py-20 mx-10 font-medium bg-white dark:bg-zinc-900 rounded-2xl border border-orange-100 dark:border-stone-850 shadow-xs">
          No approved campaigns yet — check back soon!
        </p>
      )}
      {!loading && !error && latestCampaigns.length > 0 && (
        <CampaignCarousel campaigns={latestCampaigns} />
      )}
    </section>
  );
}
