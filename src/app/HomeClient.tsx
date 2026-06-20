"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getHeroImages } from "@/app/actions/getHeroImages";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useDynamicTranslation, TranslatedText } from "@/hooks/useDynamicTranslation";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Heart, ShieldCheck, HandCoins, MapPin, Award, Coins, Users, Package, ArrowRight, BookOpen, Shirt } from "lucide-react";

const MOBILE_CATEGORY_IMAGES: Record<string, string[]> = {
  Medical:    ["/images/medical-1.webp", "/images/medical-2.webp"],
  Education:  ["/images/hero-7.webp"],
  Livelihood: ["/images/hero-3.webp"],
  Community:  ["/images/hero-6.webp"],
};

function getMobileCardImage(category: string, id: number): string {
  const imgs = MOBILE_CATEGORY_IMAGES[category];
  return imgs?.length ? imgs[id % imgs.length] : "/images/hero-1.webp";
}
import { Reveal } from "@/components/Reveal";
import { LatestActiveCampaignsSection } from "@/components/CampaignCarousel";
import { MockListingsCarousel } from "@/components/MockListingsCarousel";
import { PhoneAnimationSection } from "@/components/PhoneAnimationSection";
import { BeTheChangeSection } from "@/components/BeTheChangeSection";
import { getCampaigns, getItemRequests, getItemListings, getPlatformStats, getRecentActivity, type Campaign, type ItemRequest, type ItemListing, type PlatformStats, type RecentActivity } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { FEATURES } from "@/lib/features";
import { ComingSoonMagnets } from "@/components/ComingSoonMagnets";

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

const HERO_QUOTES = [
  { text: "The smallest act of kindness is worth more than the grandest intention.", author: "Oscar Wilde" },
  { text: "We make a living by what we get, but we make a life by what we give.", author: "Winston Churchill" },
  { text: "No one has ever become poor by giving.", author: "Anne Frank" },
  { text: "Give, but give until it hurts.", author: "Mother Teresa" },
  { text: "The purpose of life is not to be happy — it is to be useful.", author: "Ralph Waldo Emerson" },
  { text: "Alone we can do so little; together we can do so much.", author: "Helen Keller" },
];

function HeroQuoteSlider() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");

  useEffect(() => {
    // enter → visible (after 850ms animation)
    const enterTimer = setTimeout(() => setPhase("visible"), 900);
    return () => clearTimeout(enterTimer);
  }, [idx]);

  useEffect(() => {
    if (phase !== "visible") return;
    // stay visible 5 s then exit
    const visibleTimer = setTimeout(() => setPhase("exit"), 5000);
    return () => clearTimeout(visibleTimer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "exit") return;
    // exit animation 550ms then advance
    const exitTimer = setTimeout(() => {
      setIdx(i => (i + 1) % HERO_QUOTES.length);
      setPhase("enter");
    }, 600);
    return () => clearTimeout(exitTimer);
  }, [phase]);

  const quote = HERO_QUOTES[idx];
  const cls = phase === "enter" ? "hero-quote-enter" : phase === "exit" ? "hero-quote-exit" : "";

  return (
    <div className="relative h-[72px] sm:h-[60px] overflow-hidden">
      <div key={idx} className={`absolute inset-0 flex flex-col justify-center ${cls}`}>
        <p className="text-white/70 text-sm sm:text-base leading-relaxed font-medium italic line-clamp-2">
          &ldquo;{quote.text}&rdquo;
        </p>
        <span className="mt-1 flex items-center gap-2 text-[#f0b97a] text-[11px] font-black uppercase tracking-wider">
          <span className="block h-px w-5 bg-[#e07b3a]" />
          {quote.author}
        </span>
      </div>
    </div>
  );
}

function HeroImageSlider() {
  const [images, setImages] = useState<string[]>(["/images/hero-4.webp"]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    getHeroImages().then((imgs) => {
      if (imgs && imgs.length > 0) {
        // Ensure hero-4 is at the front so it doesn't flicker if it was currently showing
        const otherImgs = imgs.filter(i => !i.includes("hero-4.webp"));
        setImages(["/images/hero-4.webp", ...otherImgs]);
      }
    });
  }, []);

  useEffect(() => {
    if (images.length === 0) return;
    const t = setInterval(() => setCurrent(p => (p + 1) % images.length), 6000);
    return () => clearInterval(t);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {images.map((src, i) => (
        <div key={src} className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out" style={{ opacity: i === current ? 0.95 : 0 }}>
          <div className={i === current ? (i % 2 === 0 ? "hero-slide-active" : "hero-slide-active-alt") : ""} style={{ position: "absolute", inset: 0 }}>
            <Image src={src} alt="" fill className="object-cover brightness-[0.85] contrast-[1.05]" style={{ objectPosition: "center 30%" }} priority={i === 0} sizes="100vw" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomeClient({
  initialCampaigns,
  initialStats,
  initialActivity,
  initialItemRequests,
  initialItemListings
}: {
  initialCampaigns: Campaign[];
  initialStats: PlatformStats | null;
  initialActivity: RecentActivity[];
  initialItemRequests: ItemRequest[];
  initialItemListings: ItemListing[];
}) {
  const t = useTranslations("landing");
  const tHero = useTranslations("hero");
  const tStats = useTranslations("stats");
  const tCommon = useTranslations("common");
  const { user } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>(initialItemRequests);
  const [itemListings, setItemListings] = useState<ItemListing[]>(initialItemListings);
  const [stats, setStats] = useState<PlatformStats | null>(initialStats);
  const [activity, setActivity] = useState<RecentActivity[]>(initialActivity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCampaignIndex, setActiveCampaignIndex] = useState(0);

  const currentCampaign = campaigns[activeCampaignIndex] ?? null;
  const translatedCampaignTitle = useDynamicTranslation(currentCampaign?.title ?? null);
  const translatedCampaignDesc = useDynamicTranslation(currentCampaign?.description ?? null);


  useEffect(() => {
    if (campaigns.length <= 1) return;
    const interval = setInterval(() => {
      setActiveCampaignIndex(prev => (prev + 1) % campaigns.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [campaigns.length]);

  const features = [
    { icon: ShieldCheck, title: t("features.adminVerified"), desc: t("features.adminVerifiedDesc"), color: "from-[#b04a15]/10 to-[#e07b3a]/10 text-[#b04a15]" },
    { icon: HandCoins, title: t("features.zeroFees"), desc: t("features.zeroFeesDesc"), color: "from-[#e07b3a]/10 to-[#f59e0b]/10 text-[#c2660a]" },
    { icon: MapPin, title: t("features.localMatching"), desc: t("features.localMatchingDesc"), color: "from-[#1e3a60]/10 to-[#2d5a96]/10 text-[#1e3a60]" },
    { icon: Award, title: t("features.impactCertificates"), desc: t("features.impactCertificatesDesc"), color: "from-amber-500/10 to-yellow-500/10 text-amber-700" },
  ];

  // Step 01 (Verified Campaigns) removed — monetary campaigns are coming soon
  const provide = [
    { step: "01", icon: Heart, title: t("provide.moneyOrItems"), desc: t("provide.moneyOrItemsDesc") },
    { step: "02", icon: Package, title: t("provide.localDropoffs"), desc: t("provide.localDropoffsDesc") },
  ];

  const statItems = [
    { value: stats ? `₹${formatINR(stats.totalRaised)}` : "₹5,652", label: tStats("totalRaised"), icon: Coins, color: "text-[#b04a15]" },
    { value: stats ? stats.activeCampaigns : "3", label: tStats("activeCampaigns"), icon: Heart, color: "text-[#b04a15]" },
    { value: stats ? stats.totalDonations : "24", label: tStats("donations"), icon: Sparkles, color: "text-[#b04a15]" },
    { value: stats ? stats.uniqueDonors : "18", label: tStats("donors"), icon: Users, color: "text-[#b04a15]" },
  ];

  return (
    <div className="bg-[#fbf9f4] dark:bg-[#09090b] text-stone-900 dark:text-stone-100 min-h-[100svh] overflow-x-clip transition-colors duration-300">
      {/* ── Desktop View (lg:block) ── */}
      <div className="hidden lg:block bg-white dark:bg-zinc-950 relative z-10">
        {/* ── Mobile stats strip ── */}
        {FEATURES.money && (
        <div className="sm:hidden overflow-hidden border-b border-orange-100 bg-white">
          <div className="stats-ticker-track py-3.5">
            {[0, 1].map(copy => (
              <div key={copy} className="flex items-center shrink-0">
                {statItems.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 px-5">
                    <s.icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                    <span className="text-stone-900 font-black text-sm tabular-nums">{s.value}</span>
                    <span className="text-stone-500 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">{s.label}</span>
                    <span className="text-stone-200 ml-3 select-none">·</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        )}

        {/* ── Hero Section ── */}
        <section className="relative w-full max-w-[1440px] mx-auto px-0 sm:px-10 pt-0 sm:pt-8 pb-0">
          <div className="relative w-full min-h-[520px] sm:min-h-[640px] lg:min-h-[720px] rounded-t-[3rem] rounded-b-none overflow-hidden bg-stone-900 shadow-xl border-x border-t border-[#e5e2d5]/60 animate-scale anim-d1">
            <div className="absolute inset-0 w-full h-full pointer-events-none">
              <HeroImageSlider />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
            </div>

            <div className="relative z-10 w-full h-full min-h-[520px] sm:min-h-[640px] lg:min-h-[720px] px-6 sm:px-12 py-10 sm:py-16 flex flex-col justify-between">

              <div className="w-full flex items-start justify-between gap-4 lg:gap-6">
                <div className="self-start inline-flex items-center gap-2 bg-white rounded-full px-5 py-2 border border-[#e2e0d5]">
                  <span className="w-2 h-2 rounded-full bg-[#f0b97a] animate-pulse shrink-0" />
                  <span className="text-[#b04a15] text-xs font-extrabold uppercase tracking-wider">{tHero("badge")}</span>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="hidden lg:flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 bg-black/35 backdrop-blur-md border border-white/15 rounded-full px-4 py-2 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-[#f0b97a]" />
                      <span className="text-white text-sm font-semibold">{tHero("transparent")}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-black/35 backdrop-blur-md border border-white/15 rounded-full px-4 py-2 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-[#f0b97a]" />
                      <span className="text-white text-sm font-semibold">{tHero("fastDistribution")}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mt-auto">
                <div className="lg:col-span-7 flex flex-col items-start gap-5 relative">
                  <h1 className="text-white font-extrabold leading-[1.08] tracking-tight text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] max-w-2xl font-jakarta">
                    {tHero("headline")}
                  </h1>
                  {/* Motivational quote slideshow — clip-reveal animation */}
                  <div className="max-w-lg w-full">
                    <HeroQuoteSlider />
                  </div>
                </div>

                {/* Hero card */}
                {FEATURES.money && (
                <div className="lg:col-span-5 flex justify-end">
                  {(() => {
                    const urgency = currentCampaign?.urgency ?? "NORMAL";
                    const urgencyConfig = {
                      CRITICAL: { label: "Critical — Urgent Action Needed", dot: "urgency-dot-critical", badge: "bg-red-500/15 border-red-400/40 text-red-300" },
                      HIGH:     { label: "High Priority", dot: "urgency-dot-high", badge: "bg-amber-500/15 border-amber-400/40 text-amber-300" },
                      NORMAL:   { label: "Active Campaign", dot: "", badge: "bg-white/10 border-white/20 text-white/70" },
                    }[urgency] ?? { label: "Active Campaign", dot: "", badge: "bg-white/10 border-white/20 text-white/70" };
                    return (
                      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 shadow-2xl w-full max-w-[320px] border border-[#e5e2d5]/65 dark:border-zinc-800 animate-card-3d-enter sm:min-h-[350px] flex flex-col justify-between transition-all duration-500">
                        <div>
                          <div className="mb-0 lg:mb-4">
                            <div className={`lg:hidden inline-flex items-center gap-1.5 rounded-full border px-3 py-1 mb-3 ${urgencyConfig.badge}`}>
                              {urgencyConfig.dot && (
                                <span className={`w-1.5 h-1.5 rounded-full bg-current ${urgencyConfig.dot}`} />
                              )}
                              <span className="text-[10px] font-black uppercase tracking-wider">{urgencyConfig.label}</span>
                            </div>
                            <div className="hidden lg:flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] flex items-center justify-center shadow-sm shrink-0">
                                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 21.5C7.5 18 4.5 14.5 4.5 10.5C4.5 7.5 6.5 5.5 9.5 5.5C10.8 5.5 11.6 6 12 6.5C12.4 6 13.2 5.5 14.5 5.5C17.5 5.5 19.5 7.5 19.5 10.5C19.5 14.5 16.5 18 12 21.5Z" stroke="white" strokeWidth="1.8" />
                                  </svg>
                                </div>
                                <span className="text-sm font-extrabold text-stone-900 dark:text-stone-100">CauseKind</span>
                              </div>
                              <span className="text-xs text-stone-400 font-bold">· {currentCampaign ? <TranslatedText text={currentCampaign.city} /> : "2026"}</span>
                            </div>
                          </div>

                          <p className="lg:hidden text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                            {currentCampaign ? <><TranslatedText text={currentCampaign.city} /> · <TranslatedText text={currentCampaign.category} /></> : tHero("localCampaign")}
                          </p>

                          <h3 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white leading-snug mb-2 font-jakarta line-clamp-2 transition-all duration-300">
                            {translatedCampaignTitle ?? "Make an Immediate Impact"}
                          </h3>
                          <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 leading-relaxed font-medium line-clamp-2 transition-all duration-300">
                            {translatedCampaignDesc ?? "Every donation directly supports frontline community programs."}
                          </p>
                        </div>
                        <Link href={currentCampaign ? `/campaigns/${currentCampaign.id}` : "/campaigns"} className="block w-full">
                          <button className="w-full bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold py-3.5 rounded-xl text-xs tracking-wide uppercase transition-all duration-300 shadow-md shadow-orange-900/20 active:scale-95">
                            {tHero("donateNow")}
                          </button>
                        </Link>
                      </div>
                    );
                  })()}
                </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Desktop stats bar ── */}
        {FEATURES.money && (
        <div className="hidden sm:block border-y border-orange-100/50 dark:border-stone-850 bg-white dark:bg-zinc-950 shadow-xs">
          <div className="flex items-stretch divide-x divide-orange-50 dark:divide-zinc-800 justify-around py-5">
            {[
              { value: stats ? `₹${formatINR(stats.totalRaised)}` : "₹5,652", label: tStats("totalRaised"), icon: Coins, color: "text-[#b04a15]" },
              { value: stats ? stats.activeCampaigns : "3", label: tStats("activeCampaigns"), icon: Heart, color: "text-[#c2660a]" },
              { value: stats ? stats.totalDonations : "24", label: tStats("donations"), icon: Sparkles, color: "text-[#1e3a60]" },
              { value: stats ? stats.uniqueDonors : "18", label: tStats("donors"), icon: Users, color: "text-amber-700" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 px-10">
                <s.icon className={`h-6 w-6 shrink-0 ${s.color}`} />
                <div>
                  <p className="text-2xl font-black text-stone-900 dark:text-stone-100 tabular-nums leading-none">{s.value}</p>
                  <p className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* ── Live Ticker ── */}
        {FEATURES.money && activity.length > 0 && (
          <div className="border-b border-orange-100/40 dark:border-stone-850/40 bg-orange-50/30 dark:bg-zinc-900/10 py-3 overflow-hidden flex items-center gap-3">
            <span className="shrink-0 ml-6 rounded-full bg-[#963c0d] px-3 py-1 text-[10px] font-black tracking-widest text-white z-10 flex items-center gap-1 shadow-sm">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#f0b97a]" />
              LIVE
            </span>
            <div className="overflow-hidden flex-1">
              <div className="ticker-track">
                {[...activity, ...activity].map((a, i) => (
                  <span key={i} className="flex items-center gap-2 text-xs text-stone-500 font-bold whitespace-nowrap px-8">
                    {a.type === "DONATION" ? (
                      <><span className="inline-block h-2 w-2 rounded-full bg-[#b04a15]" /><span className="text-[#b04a15] font-extrabold">₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(a.amount ?? 0)}</span> donated to <span className="font-extrabold text-stone-800 dark:text-stone-200"><TranslatedText text={a.campaignTitle} /></span><span className="text-stone-400">· <TranslatedText text={a.city} /></span></>
                    ) : (
                      <><span className="inline-block h-2 w-2 rounded-full bg-[#1e3a60]" /><span className="text-[#1e3a60] font-extrabold">New Campaign</span><span className="font-extrabold text-stone-800 dark:text-stone-200"><TranslatedText text={a.campaignTitle} /></span><span className="text-stone-400">· <TranslatedText text={a.category} /> · <TranslatedText text={a.city} /></span></>
                    )}
                    <span className="text-stone-200 dark:text-stone-800 mx-4">|</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Phone Animation Section ── */}
        {/* <PhoneAnimationSection /> */}

        {/* ── Why raise funds through us — ASYMMETRIC STAGGERED GRID ── */}
        <section id="trust" className="mx-auto max-w-7xl px-6 py-20">
          {/* Left-flush heading, no centering */}
          <Reveal className="mb-14">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15] mb-2 block">Why CauseKind</span>
                <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-white leading-[1.05]">{t("why.title")}</h2>
              </div>
              <p className="text-base text-stone-500 dark:text-stone-400 font-medium max-w-sm lg:text-right">{t("why.subtitle")}</p>
            </div>
          </Reveal>

          {/* Mobile: simple list */}
          <div className="sm:hidden flex flex-col gap-3">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4 px-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-orange-100/60 dark:border-zinc-800 shadow-xs">
                <div className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-xs`}>
                  <f.icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">{f.title}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium leading-relaxed mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: asymmetric col widths — tall | short | short | tall */}
          <div className="hidden sm:grid grid-cols-4 gap-4 items-start">
            {features.map((f, i) => {
              const isTall = i === 0 || i === 3;
              return (
                <Reveal key={f.title} delay={i * 90}>
                  <div
                    className={`relative rounded-3xl border bg-white dark:bg-zinc-900 border-[#e5e2d5]/60 dark:border-stone-800 p-7 flex flex-col gap-5 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
                      isTall ? "min-h-[340px]" : "min-h-[240px]"
                    }`}
                  >
                    {/* Left accent stripe */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl" style={{ background: i % 2 === 0 ? '#b04a15' : '#1e3a60' }} />
                    {/* Giant background step number */}
                    <span className="absolute right-3 bottom-3 text-[5rem] font-black leading-none select-none pointer-events-none opacity-[0.04] dark:opacity-[0.06]">
                      0{i + 1}
                    </span>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} shadow-sm`}>
                      <f.icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100 leading-snug">{f.title}</h3>
                      <p className="text-sm text-stone-500 dark:text-stone-400 font-medium leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ── What we Provide — ASYMMETRIC: large left + stacked right ── */}
        <section id="how" className="relative bg-[#120c04] border-y border-stone-800/60 py-20 overflow-hidden">
          {/* Decorative off-center glow */}
          <div className="pointer-events-none absolute -top-32 left-[10%] w-[500px] h-[500px] rounded-full bg-[#b04a15]/8 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-[5%] w-[380px] h-[380px] rounded-full bg-[#1e3a60]/10 blur-3xl" />

          <div className="mx-auto max-w-7xl px-6">
            {/* Heading — right-flush on desktop */}
            <Reveal className="mb-14">
              <div className="flex flex-col lg:flex-row-reverse lg:items-end lg:justify-between gap-4">
                <div className="lg:text-right">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#f0b97a] mb-2 block">How it works</span>
                  <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.05]">{t("what.title")}</h2>
                </div>
                <p className="text-base text-stone-400 font-medium max-w-sm">{t("what.subtitle")}</p>
              </div>
            </Reveal>

            {/* Desktop: two equal cards side by side (Step 01 removed) */}
            <div className="hidden md:grid md:grid-cols-2 gap-6 items-stretch">
              {provide.map((s, i) => (
                <Reveal key={s.title} delay={i * 140}>
                  <div className="relative rounded-3xl bg-white/5 border border-white/10 p-10 flex flex-col justify-between min-h-[340px] overflow-hidden group hover:bg-white/8 transition-all duration-300">
                    <div className="absolute -right-8 -bottom-8 text-[9rem] font-black text-white/[0.03] leading-none select-none">{s.step}</div>
                    <div className="space-y-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${i === 0 ? "bg-[#b04a15] shadow-[#b04a15]/30" : "bg-[#1e3a60] shadow-[#1e3a60]/30"}`}>
                        <s.icon className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-extrabold text-white mb-3">{s.title}</h3>
                        <p className="text-stone-400 font-medium leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/10 text-xs font-bold text-[#f0b97a] uppercase tracking-widest">Step {s.step}</div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Mobile: simple vertical */}
            <div className="md:hidden flex flex-col gap-4">
              {provide.map((s) => (
                <div key={s.title} className="flex items-start gap-4 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
                  <span className="absolute right-3 top-2 text-3xl font-black text-white/10 select-none leading-none">{s.step}</span>
                  <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[#b04a15] text-white shadow-sm">
                    <s.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 pr-6">
                    <p className="text-sm font-bold text-white leading-snug">{s.title}</p>
                    <p className="text-xs text-stone-400 font-medium leading-relaxed mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Latest Active Campaigns carousel ── */}
        {FEATURES.money && (
        <LatestActiveCampaignsSection
          campaigns={campaigns}
          loading={loading}
          error={error}
        />
        )}

        {/* ── In-Kind Requests Section — ASYMMETRIC HEADER ── */}
        {(loading || itemRequests.length > 0) && (
        <section className="bg-white dark:bg-zinc-900 border-b border-orange-100/35 dark:border-stone-850 py-20 text-stone-900 dark:text-stone-100 transition-colors duration-300">
          <div className="mx-auto max-w-7xl px-6">
            {/* Asymmetric header: large left-flush title with offset right link */}
            <Reveal className="mb-14">
              <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-end">
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15]">In-Kind Giving</span>
                    <span className="h-px flex-1 bg-[#b04a15]/20" />
                  </div>
                  <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-white leading-[1.05]">
                    {t("inkindSection.title")}
                  </h2>
                  <p className="text-base text-stone-500 dark:text-stone-400 font-medium mt-3 max-w-xl">
                    {t("inkindSection.subtitle")}
                  </p>
                </div>
                <Link href="/requests" className="inline-flex shrink-0">
                  <Button
                    variant="outline"
                    className="btn-3d border-orange-200 dark:border-stone-850 hover:bg-orange-50 dark:hover:bg-zinc-800 rounded-xl font-bold px-5 py-5 text-sm gap-2 text-stone-700 dark:text-stone-200"
                  >
                    {t("inkindSection.browseAll")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Reveal>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#b04a15]/20 border-t-[#b04a15]" />
              </div>
            ) : (
              /* Asymmetric masonry: featured large + staggered heights */
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
                {itemRequests.slice(0, 6).map((req, i) => {
                  const isFeatured = i === 0;
                  const isTall = i === 0 || i === 3;
                  return (
                    <Reveal key={req.id} delay={i * 90} className={isFeatured ? "col-span-2 lg:col-span-1 row-span-2 lg:row-span-1" : ""}>
                      <HoverCard openDelay={300}>
                        <HoverCardTrigger asChild>
                          <Card className={`card-glow inkind-card-featured bg-white dark:bg-zinc-900 rounded-2xl border border-orange-100 dark:border-zinc-800 overflow-hidden flex flex-col cursor-pointer group transition-all duration-300 ${isFeatured ? "lg:min-h-[320px]" : isTall ? "min-h-[280px]" : "min-h-[220px]"}`}>
                            <div className={`relative w-full bg-stone-100 dark:bg-zinc-950 shrink-0 overflow-hidden ${isFeatured ? "h-40 sm:h-52" : "h-28 sm:h-36"}`}>
                              <Image
                                src={req.imageUrl || getMobileCardImage(req.category, req.id)}
                                alt={req.title}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                sizes="(max-width: 640px) 50vw, 33vw"
                              />
                              {/* Gradient overlay on featured */}
                              {isFeatured && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                              )}
                              <div className="absolute top-2 right-2">
                                <span className={`text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase border ${
                                  req.urgency === "CRITICAL"
                                    ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                                    : req.urgency === "HIGH"
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                    : "bg-stone-100/90 border-stone-200 text-stone-500 dark:text-stone-400"
                                }`}>
                                  {tCommon("urgency" + req.urgency.charAt(0) + req.urgency.slice(1).toLowerCase())}
                                </span>
                              </div>
                              {/* Category dot */}
                              {isFeatured && (
                                <div className="absolute bottom-3 left-3">
                                  <span className="text-[10px] font-black text-white/80 uppercase tracking-wider bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
                                    {req.category}
                                  </span>
                                </div>
                              )}
                            </div>
                            <CardContent className={`flex flex-col flex-1 gap-2 ${isFeatured ? "p-4 sm:p-5" : "p-3 sm:p-4"}`}>
                              <div>
                                <h3 className={`font-bold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2 ${isFeatured ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>
                                  <TranslatedText text={req.title} />
                                </h3>
                                <p className="text-[10px] sm:text-xs text-stone-400 font-semibold mt-0.5 truncate">
                                  By {req.doneeName} · <TranslatedText text={req.city} />
                                </p>
                              </div>
                              {req.description && isFeatured && (
                                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-medium leading-relaxed line-clamp-2">
                                  <TranslatedText text={req.description} />
                                </p>
                              )}
                              <div className="mt-auto pt-2 border-t border-orange-50 dark:border-zinc-800 flex justify-between items-center">
                                <span className="text-[10px] sm:text-xs text-stone-400 font-semibold">
                                  Qty: <span className="text-stone-700 dark:text-stone-300 font-black">{req.quantity}</span>
                                </span>
                                <Link href="/requests" className="inline-flex">
                                  <span className="text-[#b04a15] font-extrabold uppercase text-[9px] sm:text-[10px] tracking-wider hover:underline">
                                    Give →
                                  </span>
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        </HoverCardTrigger>
                        <HoverCardContent side="top" align="center" className="w-80 z-50 p-4 shadow-xl">
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight">
                              <TranslatedText text={req.title} />
                            </h4>
                            <p className="text-sm text-stone-500 dark:text-stone-400">
                              {req.description ? <TranslatedText text={req.description} /> : `Requested by ${req.doneeName}. Qty ${req.quantity} needed.`}
                            </p>
                            <div className="text-xs text-[#b04a15] dark:text-[#e07b3a] font-bold">Requested by: {req.doneeName}</div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </Reveal>
                  );
                })}
              </div>
            )}
          </div>
        </section>
        )}

        {/* ── Community Listings Section ── HIDDEN: re-enable when listings go live */}
        {/* itemListings.length > 0 && <section ...>...</section> */}

        {/* ── Be the Change Section ── */}
        <BeTheChangeSection />

        {/* ── Coming Soon Magnets ── */}
        <ComingSoonMagnets />

        {/* ── CTA — ASYMMETRIC DIAGONAL SPLIT, hidden when logged in ── */}
        {!user && (
        <section className="max-w-7xl mx-auto px-6 pt-10 sm:pt-14 pb-20">
          <Reveal>
            <div className="relative rounded-3xl overflow-hidden border border-stone-800 shadow-2xl grid lg:grid-cols-[3fr_2fr] min-h-[280px]">
              {/* Left panel — headline */}
              <div className="relative bg-[#120c04] px-10 py-14 flex flex-col justify-between z-10">
                <div className="pointer-events-none absolute -top-20 -left-20 w-[320px] h-[320px] rounded-full bg-[#b04a15]/10 blur-3xl" />
                <div className="relative">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#f0b97a] mb-4 block">Get started</span>
                  <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-4">{t("ctaSection.headline")}</h2>
                  <p className="text-stone-400 text-sm leading-relaxed font-medium max-w-sm">{t("ctaSection.subtext")}</p>
                </div>
                <div className="flex flex-wrap gap-3 mt-8">
                  <Link href="/register">
                    <Button size="lg" className="btn-3d btn-shine bg-[#b04a15] hover:bg-[#963c0d] text-white shadow-md shadow-orange-900/25 rounded-xl font-bold px-6">
                      {t("ctaSection.createAccount")}
                    </Button>
                  </Link>
                  {FEATURES.money && (
                    <Link href="/campaigns">
                      <Button size="lg" variant="outline" className="btn-3d border-stone-700 bg-transparent text-white hover:text-white hover:bg-stone-900/40 rounded-xl font-bold px-6">
                        {t("ctaSection.browseCampaigns")}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Right panel — visual accent */}
              <div className="relative bg-[#b04a15]/90 hidden lg:flex items-center justify-center overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#e07b3a]/30 to-[#120c04]/60" />
                <div className="relative z-10 text-center px-8">
                  <span className="text-7xl font-black text-white/10 leading-none block">♥</span>
                  <p className="text-white font-extrabold text-lg mt-2 leading-tight">Join thousands<br/>making a difference</p>
                  <p className="text-white/70 text-sm mt-2 font-medium">100% verified · local · direct</p>
                </div>
                {/* Decorative circles */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-black/20" />
              </div>
            </div>
          </Reveal>
        </section>
        )}
      </div>

      {/* ── Mobile View (lg:hidden) ── */}
      <div className="lg:hidden min-h-screen pb-24 bg-[#fbf9f4] dark:bg-zinc-950 px-4 pt-2 flex flex-col gap-8">
        {/* Moving stats ticker — above hero image */}
        {FEATURES.money && (
        <div className="overflow-hidden bg-[#C17A3A] -mx-4 lg:hidden">
          <div className="animate-stats-ticker flex gap-0 whitespace-nowrap py-2">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center gap-8 px-4 shrink-0">
                {statItems.map((item) => (
                  <span key={item.label + copy} className="flex items-center gap-2 text-white">
                    <item.icon className="w-3.5 h-3.5 opacity-80" />
                    <span className="text-xs font-bold">{item.value}</span>
                    <span className="text-[10px] opacity-75 font-medium">{item.label}</span>
                    <span className="opacity-40 mx-2">·</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        )}

        {/* ── Mobile Hero Section ── */}
        <section className="relative w-full aspect-[4/3] min-h-[280px] rounded-[2rem] overflow-hidden shadow-xs mt-2">
          {/* Background Image */}
          <div className="absolute inset-0 w-full h-full">
            <Image
              src="/images/hero-1.webp"
              alt="Together We Support"
              fill
              className="object-cover brightness-[0.75] contrast-[1.05]"
              style={{ objectPosition: "center 25%" }}
              priority
              sizes="100vw"
            />
            {/* Dark translucent overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/25 pointer-events-none" />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 w-full h-full p-6 flex flex-col justify-between items-start">
            <div className="bg-[#faf8f3]/85 dark:bg-zinc-900/85 backdrop-blur-xs border border-[#e5e2d5]/30 rounded-full px-3.5 py-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#b04a15] animate-pulse" />
              <span className="text-[#b04a15] text-[10px] font-extrabold uppercase tracking-wider">
                <TranslatedText text="Making Lives Better" />
              </span>
            </div>

            <div className="space-y-2.5 max-w-sm">
              <h1 className="text-white text-xl sm:text-2xl font-black leading-tight tracking-tight">
                <TranslatedText text="Together We Support, Educate and Heal" />
              </h1>
              <p className="text-white/80 text-[11px] sm:text-xs font-semibold leading-relaxed">
                <TranslatedText text="Every donation helps a family grow stronger, healthier, and more secure." />
              </p>
              {FEATURES.money && (
              <Link href="/campaigns" className="inline-block mt-1">
                <button className="bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-orange-950/20">
                  <TranslatedText text="Explore Campaigns" />
                </button>
              </Link>
              )}
            </div>
          </div>
        </section>

        {/* ── Latest Active Campaigns ── */}
        {FEATURES.money && (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-base sm:text-lg font-black text-stone-850 dark:text-stone-100 tracking-tight">
              <TranslatedText text="Latest Active Campaigns" />
            </h2>
            <Link href="/campaigns" className="text-[10px] font-extrabold text-[#b04a15] uppercase tracking-wider hover:underline">
              <TranslatedText text="Browse All" /> →
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 px-1 -mx-5 scrollbar-none snap-x snap-mandatory">
            {loading && (
              <div className="flex justify-center py-10 w-full">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#b04a15]/20 border-t-[#b04a15]" />
              </div>
            )}
            {error && (
              <p className="text-stone-500 text-xs py-10 px-4 font-semibold">{error}</p>
            )}
            {!loading && !error && campaigns.length === 0 && (
              <p className="text-stone-400 text-xs py-10 px-4 font-medium">No active campaigns.</p>
            )}
            {!loading && !error && campaigns.slice(0, 5).map((campaign) => {
              const pct = Math.min(100, Math.round((campaign.amountRaised / campaign.targetAmount) * 100));
              return (
                <div
                  key={campaign.id}
                  className="bg-white dark:bg-zinc-900 rounded-[1.75rem] p-3.5 border border-[#e8e2d5]/60 dark:border-zinc-800 flex gap-3.5 w-[310px] sm:w-[325px] snap-start shrink-0 shadow-xs"
                >
                  {/* Left Column */}
                  <div className="w-[100px] flex-shrink-0 flex flex-col justify-start">
                    <div className="relative h-18 w-full rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-950">
                      <Image
                        src={campaign.imageUrl || getMobileCardImage(campaign.category, campaign.id)}
                        alt={campaign.title}
                        fill
                        className="object-contain object-center"
                        sizes="100px"
                      />
                    </div>
                    <p className="text-[10px] font-black text-stone-800 dark:text-stone-100 mt-2 line-clamp-2 leading-snug">
                      <TranslatedText text={campaign.title} />
                    </p>
                  </div>

                  {/* Right Column */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h4 className="text-[11px] font-black text-stone-850 dark:text-stone-100 leading-snug truncate">
                        <TranslatedText text={campaign.title} />
                      </h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="bg-[#faf1e1] dark:bg-zinc-850 text-[#b04a15] dark:text-orange-400 font-extrabold text-[8px] px-1.5 py-0.5 rounded tracking-wider uppercase">
                          <TranslatedText text={campaign.city} />
                        </span>
                        <span className="bg-[#faf1e1] dark:bg-zinc-850 text-[#b04a15] dark:text-orange-400 font-extrabold text-[8px] px-1.5 py-0.5 rounded tracking-wider uppercase">
                          <TranslatedText text={campaign.category} />
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-extrabold text-stone-400 uppercase">
                        <span>Progress</span>
                        <span className="text-[#b04a15]">{pct}% Funded</span>
                      </div>
                      <div className="w-full bg-stone-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                        <div className="bg-[#b04a15] h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[9px] text-stone-500 dark:text-stone-400 font-extrabold mt-1">
                        ₹{formatINR(campaign.amountRaised)} raised of ₹{formatINR(campaign.targetAmount)}
                      </p>
                    </div>

                    <Link href={`/campaigns/${campaign.id}`} className="block w-full mt-2.5">
                      <button className="w-full bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold py-2 rounded-lg text-[9px] tracking-wide uppercase transition-all shadow-sm active:scale-95">
                        <TranslatedText text="Donate Now" />
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* ── In-Kind Requests ── */}
        <section className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-end justify-between">
              <h2 className="text-base sm:text-lg font-black text-stone-850 dark:text-stone-100 tracking-tight">
                <TranslatedText text="In-Kind Requests" />
              </h2>
              <Link href="/requests" className="text-[10px] font-extrabold text-[#b04a15] uppercase tracking-wider hover:underline">
                <TranslatedText text="Browse All" /> →
              </Link>
            </div>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 font-bold leading-relaxed">
              <TranslatedText text="Donees request physical items they need..." />
            </p>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 px-1 -mx-5 scrollbar-none snap-x snap-mandatory">
            {loading && (
              <div className="flex justify-center py-10 w-full">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#b04a15]/20 border-t-[#b04a15]" />
              </div>
            )}
            {error && (
              <p className="text-stone-500 text-xs py-10 px-4 font-semibold">{error}</p>
            )}
            {!loading && !error && itemRequests.length === 0 && (
              <p className="text-stone-400 text-xs py-10 px-4 font-medium">No in-kind requests.</p>
            )}
            {!loading && !error && itemRequests.slice(0, 5).map((req) => {
              // Icon selector logic
              const titleLower = req.title.toLowerCase();
              let ReqIcon = Package;
              if (titleLower.includes("book") || titleLower.includes("school") || titleLower.includes("study")) {
                ReqIcon = BookOpen;
              } else if (titleLower.includes("clothe") || titleLower.includes("winter") || titleLower.includes("shirt") || titleLower.includes("jacket")) {
                ReqIcon = Shirt;
              }

              return (
                <div
                  key={req.id}
                  className="bg-white dark:bg-zinc-900 rounded-[1.75rem] p-4 border border-[#e8e2d5]/60 dark:border-zinc-800 flex flex-col justify-between w-[240px] snap-start shrink-0 shadow-xs"
                >
                  <div className="flex gap-3">
                    <div className="bg-[#faf1e1] dark:bg-zinc-850 w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-[#e8e2d5]/20">
                      <ReqIcon className="w-5 h-5 text-[#b04a15]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-stone-850 dark:text-stone-100 leading-snug line-clamp-1">
                        <TranslatedText text={req.title} />
                      </h4>
                      <p className="text-[9px] text-stone-400 font-semibold truncate mt-0.5">
                        By {req.doneeName}, <TranslatedText text={req.city} />
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between">
                    <span className="text-[10px] text-stone-550 dark:text-stone-400 font-black">
                      Qty: <span className="font-extrabold text-stone-800 dark:text-stone-100">{req.quantity}</span>
                    </span>
                    <Link href="/requests">
                      <button className="bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold px-4 py-1.5 rounded-lg text-[10px] tracking-wide uppercase transition-all shadow-sm active:scale-95">
                        <TranslatedText text="Give" />
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Community Listings ── HIDDEN: re-enable when listings go live */}
        {/* <section className="space-y-4">...</section> */}

        {/* ── Be the Change ── */}
        <BeTheChangeSection />
      </div>
    </div>
  );
}
