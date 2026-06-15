"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useDynamicTranslation, TranslatedText } from "@/hooks/useDynamicTranslation";
import { Sparkles, Heart, ShieldCheck, HandCoins, MapPin, Award, Coins, Users, Package, ArrowRight, BookOpen, Shirt } from "lucide-react";

const MOBILE_CATEGORY_IMAGES: Record<string, string[]> = {
  Medical:    ["/images/medical-1.png", "/images/medical-2.png"],
  Education:  ["/images/hero-7.jpg"],
  Livelihood: ["/images/hero-3.jpg"],
  Community:  ["/images/hero-6.jpg"],
};

function getMobileCardImage(category: string, id: number): string {
  const imgs = MOBILE_CATEGORY_IMAGES[category];
  return imgs?.length ? imgs[id % imgs.length] : "/images/hero-1.jpg";
}
import { Reveal } from "@/components/Reveal";
import { LatestActiveCampaignsSection } from "@/components/CampaignCarousel";
import { MockListingsCarousel } from "@/components/MockListingsCarousel";
import { PhoneAnimationSection } from "@/components/PhoneAnimationSection";
import { getCampaigns, getItemRequests, getItemListings, getPlatformStats, getRecentActivity, type Campaign, type ItemRequest, type ItemListing, type PlatformStats, type RecentActivity } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const HERO_IMAGES = [
  "/images/care_nest_hero.png",
  "/images/hero-1.jpg", "/images/hero-2.jpg", "/images/hero-3.jpg",
  "/images/hero-4.jpg", "/images/hero-5.jpg", "/images/hero-6.jpg",
  "/images/hero-7.jpg", "/images/hero-8.jpg", "/images/hero-9.jpg",
];

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

function HeroImageSlider() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % HERO_IMAGES.length), 6000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {HERO_IMAGES.map((src, i) => (
        <div key={src} className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out" style={{ opacity: i === current ? 0.95 : 0 }}>
          <div className={i === current ? (i % 2 === 0 ? "hero-slide-active" : "hero-slide-active-alt") : ""} style={{ position: "absolute", inset: 0 }}>
            <Image src={src} alt="" fill className="object-cover brightness-[0.85] contrast-[1.05]" style={{ objectPosition: "center 30%" }} priority={i === 0} sizes="100vw" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations("landing");
  const tHero = useTranslations("hero");
  const tStats = useTranslations("stats");
  const tCommon = useTranslations("common");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>([]);
  const [itemListings, setItemListings] = useState<ItemListing[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCampaignIndex, setActiveCampaignIndex] = useState(0);

  const currentCampaign = campaigns[activeCampaignIndex] ?? null;
  const translatedCampaignTitle = useDynamicTranslation(currentCampaign?.title ?? null);
  const translatedCampaignDesc = useDynamicTranslation(currentCampaign?.description ?? null);

  useEffect(() => {
    Promise.all([getCampaigns(), getPlatformStats(), getRecentActivity(), getItemRequests(), getItemListings()])
      .then(([c, s, a, ir, il]) => { setCampaigns(c); setStats(s); setActivity(a); setItemRequests(ir); setItemListings(il); })
      .catch(() => setError("Could not load campaigns."))
      .finally(() => setLoading(false));
  }, []);

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

  const provide = [
    { step: "01", icon: ShieldCheck, title: t("provide.verifiedCampaigns"), desc: t("provide.verifiedCampaignsDesc") },
    { step: "02", icon: Heart, title: t("provide.moneyOrItems"), desc: t("provide.moneyOrItemsDesc") },
    { step: "03", icon: Package, title: t("provide.localDropoffs"), desc: t("provide.localDropoffsDesc") },
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
                  <p className="text-white/85 text-sm sm:text-base leading-relaxed max-w-lg font-medium">
                    {tHero("subtext")}
                  </p>
                </div>

                {/* Hero card */}
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
              </div>
            </div>
          </div>
        </section>

        {/* ── Desktop stats bar ── */}
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

        {/* ── Live Ticker ── */}
        {activity.length > 0 && (
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
        <PhoneAnimationSection />

        {/* ── Why raise funds through us ── */}
        <section id="trust" className="mx-auto max-w-7xl px-6 py-16 bg-grid-pattern">
          <Reveal className="mx-auto max-w-2xl text-center space-y-3 mb-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-4xl">{t("why.title")}</h2>
            <p className="text-base text-stone-500 dark:text-stone-400 font-medium">{t("why.subtitle")}</p>
          </Reveal>
          <div className="grid gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 90}>
                <div className="sm:hidden flex items-start gap-4 px-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-orange-100/60 dark:border-zinc-800 shadow-xs">
                  <div className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-xs`}>
                    <f.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">{f.title}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium leading-relaxed mt-0.5">{f.desc}</p>
                  </div>
                </div>
                <Card className="hidden sm:flex card-3d card-shimmer card-glow glass-card border-orange-100/50 rounded-2xl overflow-hidden p-6 flex-col justify-between h-full">
                  <CardContent className="p-0 space-y-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-xs`}>
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{f.title}</h3>
                    <p className="text-sm text-stone-500 dark:text-stone-400 font-medium leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── What we Provide ── */}
        <section id="how" className="bg-orange-50/40 dark:bg-zinc-900/20 border-y border-orange-100/35 dark:border-stone-850/30 py-16">
          <div className="mx-auto max-w-7xl px-6">
            <Reveal className="mx-auto max-w-2xl text-center space-y-3 mb-10">
              <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-4xl">{t("what.title")}</h2>
              <p className="text-base text-stone-500 dark:text-stone-400 font-medium">{t("what.subtitle")}</p>
            </Reveal>
            <div className="grid gap-3 sm:gap-6 md:grid-cols-3">
              {provide.map((s, i) => (
                <Reveal key={s.title} delay={i * 100}>
                  <div className="md:hidden flex items-start gap-4 px-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-orange-100/60 dark:border-zinc-800 shadow-xs relative overflow-hidden">
                    <span className="absolute right-3 top-2 text-3xl font-black text-orange-100 dark:text-zinc-800/50 select-none leading-none">{s.step}</span>
                    <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[#963c0d] text-white shadow-sm shadow-stone-900/20">
                      <s.icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 pr-6">
                      <p className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">{s.title}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-medium leading-relaxed mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                  <Card className="hidden md:block card-3d card-shimmer card-glow glass-card rounded-2xl border-white/80 p-6 relative overflow-hidden h-full">
                    <div className="absolute right-4 top-4 text-4xl font-black text-orange-100 dark:text-zinc-800/60 select-none">{s.step}</div>
                    <CardContent className="p-0 space-y-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#963c0d] text-white shadow-md shadow-stone-900/20">
                        <s.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{s.title}</h3>
                      <p className="text-sm text-stone-500 dark:text-stone-400 font-medium leading-relaxed">{s.desc}</p>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Latest Active Campaigns carousel ── */}
        <LatestActiveCampaignsSection
          campaigns={campaigns}
          loading={loading}
          error={error}
        />

        {/* ── In-Kind Requests Section ── */}
        <section className="bg-white dark:bg-zinc-900 border-b border-orange-100/35 dark:border-stone-850 py-20 text-stone-900 dark:text-stone-100 transition-colors duration-300">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
              <Reveal className="space-y-3 max-w-2xl">
                <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-4xl">
                  {t("inkindSection.title")}
                </h2>
                <p className="text-base text-stone-500 dark:text-stone-400 font-medium">
                  {t("inkindSection.subtitle")}
                </p>
              </Reveal>
              <Reveal delay={105} className="shrink-0">
                <Link href="/requests" className="inline-flex">
                  <Button
                    variant="outline"
                    className="btn-3d border-orange-200 dark:border-stone-850 hover:bg-orange-50 dark:hover:bg-zinc-800 rounded-xl font-bold px-5 py-5 text-sm gap-2 text-stone-700 dark:text-stone-200"
                  >
                    {t("inkindSection.browseAll")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </Reveal>
            </div>

            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
              {(itemRequests.length > 0 ? itemRequests.slice(0, 6) : Array(4).fill(null)).map((req: ItemRequest | null, i) => (
                <Reveal key={req ? req.id : `skel-${i}`} delay={i * 80}>
                  {req ? (
                    <Card className="card-glow bg-white dark:bg-zinc-900 rounded-2xl border border-orange-100 dark:border-zinc-800 overflow-hidden h-full flex flex-col">
                      <div className="relative w-full h-24 sm:h-36 bg-orange-50 dark:bg-zinc-800 shrink-0 overflow-hidden">
                        {req.imageUrl ? (
                          <Image src={req.imageUrl} alt={req.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="h-7 w-7 sm:h-10 sm:w-10 text-orange-200 dark:text-zinc-700" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className={`text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase border ${
                            req.urgency === "CRITICAL"
                              ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                              : req.urgency === "HIGH"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                              : "bg-stone-100 border-stone-200 text-stone-500 dark:text-stone-400"
                          }`}>
                            {tCommon("urgency" + req.urgency.charAt(0) + req.urgency.slice(1).toLowerCase())}
                          </span>
                        </div>
                      </div>
                      <CardContent className="p-3 sm:p-5 flex flex-col flex-1 gap-2">
                        <div>
                          <h3 className="text-xs sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2"><TranslatedText text={req.title} /></h3>
                          <p className="text-[10px] sm:text-xs text-stone-400 font-semibold mt-0.5 truncate">By {req.doneeName} · <TranslatedText text={req.city} /></p>
                        </div>
                        {req.description && (
                          <p className="hidden sm:block text-sm text-stone-500 dark:text-stone-400 font-medium leading-relaxed line-clamp-2"><TranslatedText text={req.description} /></p>
                        )}
                        <div className="mt-auto pt-2 border-t border-orange-50 dark:border-zinc-800 flex justify-between items-center">
                          <span className="text-[10px] sm:text-xs text-stone-400 font-semibold">Qty: <span className="text-stone-700 dark:text-stone-300 font-black">{req.quantity}</span></span>
                          <Link href="/requests" className="inline-flex">
                            <span className="text-[#b04a15] font-extrabold uppercase text-[9px] sm:text-[10px] tracking-wider hover:underline">Give →</span>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="rounded-2xl border border-orange-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-48 animate-pulse" />
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Community Listings Section ── */}
        <section className="bg-orange-50/30 dark:bg-zinc-950 border-b border-orange-100/35 dark:border-stone-900 py-20 text-stone-900 dark:text-stone-100 transition-colors duration-300">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
              <Reveal className="space-y-3 max-w-2xl">
                <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-4xl">
                  {t("listingsSection.title")}
                </h2>
                <p className="text-base text-stone-500 dark:text-stone-400 font-medium">
                  {t("listingsSection.subtitle")}
                </p>
              </Reveal>
              <Reveal delay={105} className="shrink-0">
                <Link href="/items" className="inline-flex">
                  <Button
                    variant="outline"
                    className="btn-3d border-orange-200 dark:border-stone-850 hover:bg-orange-50 dark:hover:bg-zinc-900 rounded-xl font-bold px-5 py-5 text-sm gap-2 text-stone-700 dark:text-stone-200"
                  >
                    {t("listingsSection.browseAll")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </Reveal>
            </div>

            <Reveal delay={200}>
              <MockListingsCarousel listings={itemListings.slice(0, 8)} />
            </Reveal>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-7xl mx-auto px-6 pt-10 sm:pt-14 pb-20">
          <Reveal>
            <div className="relative rounded-3xl overflow-hidden bg-[#120c04] text-white px-8 py-16 text-center border border-stone-800 shadow-2xl">
              <div className="absolute top-0 right-0 h-48 w-48 bg-[#b04a15]/12 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 h-48 w-48 bg-[#1e3a60]/12 rounded-full blur-3xl" />
              <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                <h2 className="text-3xl font-extrabold sm:text-4xl">{t("ctaSection.headline")}</h2>
                <p className="text-stone-400 text-base leading-relaxed font-medium">
                  {t("ctaSection.subtext")}
                </p>
                <div className="flex flex-wrap justify-center gap-4 pt-2">
                  <Link href="/register" className="inline-flex">
                    <Button size="lg" className="btn-3d btn-shine bg-[#b04a15] hover:bg-[#963c0d] text-white shadow-md shadow-orange-900/25 rounded-xl font-bold px-6 py-6">
                      {t("ctaSection.createAccount")}
                    </Button>
                  </Link>
                  <Link href="/campaigns" className="inline-flex">
                    <Button size="lg" variant="outline" className="btn-3d border-stone-700 bg-transparent text-white hover:text-white hover:bg-stone-900/40 rounded-xl font-bold px-6 py-6">
                      {t("ctaSection.browseCampaigns")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </div>

      {/* ── Mobile View (lg:hidden) ── */}
      <div className="lg:hidden min-h-screen pb-24 bg-[#fbf9f4] dark:bg-zinc-950 px-4 pt-2 flex flex-col gap-8">
        {/* Moving stats ticker — above hero image */}
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

        {/* ── Mobile Hero Section ── */}
        <section className="relative w-full aspect-[4/3] min-h-[280px] rounded-[2rem] overflow-hidden shadow-xs mt-2">
          {/* Background Image */}
          <div className="absolute inset-0 w-full h-full">
            <Image
              src="/images/hero-1.jpg"
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
              <Link href="/campaigns" className="inline-block mt-1">
                <button className="bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-orange-950/20">
                  <TranslatedText text="Explore Campaigns" />
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Latest Active Campaigns ── */}
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
                    <div className="relative h-18 w-full rounded-xl overflow-hidden bg-stone-100">
                      <Image
                        src={campaign.imageUrl || getMobileCardImage(campaign.category, campaign.id)}
                        alt={campaign.title}
                        fill
                        className="object-cover"
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

        {/* ── Community Listings ── */}
        <section className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-end justify-between">
              <h2 className="text-base sm:text-lg font-black text-stone-850 dark:text-stone-100 tracking-tight">
                <TranslatedText text={t("listingsSection.title")} />
              </h2>
              <Link href="/items" className="text-[10px] font-extrabold text-[#b04a15] uppercase tracking-wider hover:underline">
                <TranslatedText text="Browse All" /> →
              </Link>
            </div>
            <p className="text-[11px] text-stone-400 dark:text-stone-500 font-bold leading-relaxed">
              <TranslatedText text={t("listingsSection.subtitle")} />
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
            {!loading && !error && itemListings.length === 0 && (
              <p className="text-stone-400 text-xs py-10 px-4 font-medium">No listings available.</p>
            )}
            {!loading && !error && itemListings.slice(0, 5).map((listing) => {
              // Icon selector logic
              const titleLower = listing.title.toLowerCase();
              let ListIcon = Package;
              if (titleLower.includes("book") || titleLower.includes("school") || titleLower.includes("study") || titleLower.includes("bag")) {
                ListIcon = BookOpen;
              } else if (titleLower.includes("clothe") || titleLower.includes("winter") || titleLower.includes("shirt") || titleLower.includes("jacket") || titleLower.includes("uniform")) {
                ListIcon = Shirt;
              }

              return (
                <div
                  key={listing.id}
                  className="bg-white dark:bg-zinc-900 rounded-[1.75rem] p-4 border border-[#e8e2d5]/60 dark:border-zinc-800 flex flex-col justify-between w-[240px] snap-start shrink-0 shadow-xs"
                >
                  <div className="flex gap-3">
                    <div className="bg-[#faf1e1] dark:bg-zinc-850 w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-[#e8e2d5]/20">
                      <ListIcon className="w-5 h-5 text-[#b04a15]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-stone-850 dark:text-stone-100 leading-snug line-clamp-1">
                        <TranslatedText text={listing.title} />
                      </h4>
                      <p className="text-[9px] text-stone-400 font-semibold truncate mt-0.5">
                        In <TranslatedText text={listing.city} /> · {listing.condition}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between">
                    <span className="text-[10px] text-stone-555 dark:text-stone-400 font-black">
                      Qty: <span className="font-extrabold text-stone-800 dark:text-stone-100">{listing.quantity || 1}</span>
                    </span>
                    <Link href="/items">
                      <button className="bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold px-4 py-1.5 rounded-lg text-[10px] tracking-wide uppercase transition-all shadow-sm active:scale-95">
                        <TranslatedText text="Claim" />
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
