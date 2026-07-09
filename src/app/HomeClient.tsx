"use client";

/**
 * HomeClient — landing page orchestrator.
 *
 * WHY SPLIT?
 * The original file was 900+ lines — one giant component mixing hero images,
 * stats bars, in-kind cards, "how it works", mobile views, and CTAs. That made
 * it hard to find bugs, add features, or understand what any section does.
 *
 * HOW IT'S NOW STRUCTURED:
 *   src/components/home/
 *     HeroSection.tsx         — desktop hero: cycling images + quote slider + campaign card
 *     StatsBars.tsx           — desktop stats row + live activity ticker
 *     WhyCauseKindSection.tsx — "Why CauseKind" 4-feature asymmetric grid
 *     WhatWeProvideSection.tsx — "How it works" 2-step dark section
 *     CTASection.tsx          — bottom "Get started" CTA (hidden when logged in)
 *
 * This file keeps only:
 *   1. State (campaigns, stats, requests, listings, activity)
 *   2. Desktop layout wrapper (imports the sections above)
 *   3. Mobile layout (still inline — ~200 lines — a future task can extract it too)
 */

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useDynamicTranslation, TranslatedText } from "@/hooks/useDynamicTranslation";
import { Reveal } from "@/components/Reveal";
import { LatestActiveCampaignsSection } from "@/components/CampaignCarousel";
import { BeTheChangeSection } from "@/components/BeTheChangeSection";
import { DoneeRequestsSection } from "@/components/home/DoneeRequestsSection";
import { ComingSoonMagnets } from "@/components/ComingSoonMagnets";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Sparkles, Heart, HandCoins, MapPin, Coins, Users, Package, ArrowRight, BookOpen, Shirt } from "lucide-react";
import { FEATURES } from "@/lib/features";
import type { Campaign, ItemRequest, ItemListing, PlatformStats, RecentActivity } from "@/lib/api";
import { getMyProfile, getItemRequests, type UserProfile } from "@/lib/api";

// ── Extracted section components ─────────────────────────────────────────────
import { HeroSection }           from "@/components/home/HeroSection";
import { DesktopStatsBar, LiveTicker } from "@/components/home/StatsBars";
import { WhyCauseKindSection }   from "@/components/home/WhyCauseKindSection";
import { WhatWeProvideSection }  from "@/components/home/WhatWeProvideSection";
import { CTASection }            from "@/components/home/CTASection";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

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

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Mobile hero — cycling background images (same 6s rhythm as desktop) ──────

const MOBILE_HERO_IMAGES = [
  "/images/hero-1.webp",
  "/images/hero-2.webp",
  "/images/hero-3.webp",
  "/images/hero-5.webp",
  "/images/hero-6.webp",
  "/images/hero-7.webp",
];

function MobileHeroSlider() {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx(i => (i + 1) % MOBILE_HERO_IMAGES.length);
        setFading(false);
      }, 500);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative w-full aspect-[4/3] min-h-[280px] rounded-[2rem] overflow-hidden shadow-xs mt-2">
      <div className="absolute inset-0 w-full h-full">
        <Image
          key={idx}
          src={MOBILE_HERO_IMAGES[idx]}
          alt="Together We Support"
          fill
          className="object-cover brightness-[0.75] contrast-[1.05] transition-opacity duration-500"
          style={{ objectPosition: "center 25%", opacity: fading ? 0 : 1 }}
          priority={idx === 0}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/25 pointer-events-none" />
      </div>
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
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HomeClient({
  initialCampaigns,
  initialStats,
  initialActivity,
  initialItemRequests,
  initialItemListings,
}: {
  initialCampaigns:    Campaign[];
  initialStats:        PlatformStats | null;
  initialActivity:     RecentActivity[];
  initialItemRequests: ItemRequest[];
  initialItemListings: ItemListing[];
}) {
  const t       = useTranslations("landing");
  const tCommon = useTranslations("common");
  const { user } = useAuth();

  const [campaigns,    setCampaigns]    = useState<Campaign[]>(initialCampaigns);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>(initialItemRequests);
  const [stats,        setStats]        = useState<PlatformStats | null>(initialStats);
  const [activity,     setActivity]     = useState<RecentActivity[]>(initialActivity);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [activeCampaignIndex, setActiveCampaignIndex] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);

  const currentCampaign      = campaigns[activeCampaignIndex] ?? null;
  const translatedCampaignTitle = useDynamicTranslation(currentCampaign?.title ?? null);
  const translatedCampaignDesc  = useDynamicTranslation(currentCampaign?.description ?? null);

  // Auto-advance campaign card every 5 s
  useEffect(() => {
    if (campaigns.length <= 1) return;
    const id = setInterval(() => setActiveCampaignIndex(p => (p + 1) % campaigns.length), 5000);
    return () => clearInterval(id);
  }, [campaigns.length]);

  // Item requests are private inventory (auth required) — the server-side render
  // above can't attach the httpOnly cookie, so `initialItemRequests` is always
  // empty. Re-fetch client-side once a logged-in user's cookie is available.
  useEffect(() => {
    if (!user) return;
    getItemRequests().then(setItemRequests).catch(() => {});
  }, [user]);

  useEffect(() => {
    const handleFilter = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.category) {
        setSelectedCategory(detail.category);
        try {
          const profile = await getMyProfile();
          setMyProfile(profile);
        } catch (err) {}
        
        // Scroll slightly after state updates
        setTimeout(() => {
          document.getElementById("inkind-requests-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    };
    window.addEventListener("filter-home-requests", handleFilter);
    return () => window.removeEventListener("filter-home-requests", handleFilter);
  }, []);

  const displayedRequests = useMemo(() => {
    let out = itemRequests;
    if (selectedCategory) {
      out = out.filter(r => r.category === selectedCategory);
      if (myProfile?.latitude && myProfile?.longitude) {
        const lat = myProfile.latitude;
        const lon = myProfile.longitude;
        out = [...out].sort((a, b) => {
          const dA = a.latitude && a.longitude ? haversineKm(lat, lon, a.latitude, a.longitude) : 99999;
          const dB = b.latitude && b.longitude ? haversineKm(lat, lon, b.latitude, b.longitude) : 99999;
          return dA - dB;
        });
      }
    }
    return out;
  }, [itemRequests, selectedCategory, myProfile]);

  const statItems = [
    { value: stats ? `₹${formatINR(stats.totalRaised)}` : "—", label: useTranslations("stats")("totalRaised"),    icon: Coins,    color: "text-[#b04a15]" },
    { value: stats ? stats.activeCampaigns               : "—", label: useTranslations("stats")("activeCampaigns"), icon: Heart,    color: "text-[#b04a15]" },
    { value: stats ? stats.totalDonations                : "—", label: useTranslations("stats")("donations"),       icon: Sparkles, color: "text-[#b04a15]" },
    { value: stats ? stats.uniqueDonors                  : "—", label: useTranslations("stats")("donors"),          icon: Users,    color: "text-[#b04a15]" },
  ];

  return (
    <div className="bg-[#fbf9f4] dark:bg-[#09090b] text-stone-900 dark:text-stone-100 min-h-[100svh] overflow-x-clip transition-colors duration-300">

      {/* ════════════════════════════════════════════════════════════
          DESKTOP VIEW  (lg:block)
          Each section is its own extracted component — edit the
          file in src/components/home/ to change that section.
      ════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block bg-white dark:bg-zinc-950 relative z-10">

        {/* Mobile stats strip (inside desktop wrapper but sm:hidden) */}
        {FEATURES.money && (
          <div className="sm:hidden overflow-hidden border-b border-orange-100 bg-white dark:bg-zinc-950">
            <div className="stats-ticker-track py-3.5">
              {[0, 1].map(copy => (
                <div key={copy} className="flex items-center shrink-0">
                  {statItems.map(s => (
                    <div key={s.label} className="flex items-center gap-2 px-5">
                      <s.icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                      <span className="text-stone-900 dark:text-stone-100 font-black text-sm tabular-nums">{s.value}</span>
                      <span className="text-stone-500 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">{s.label}</span>
                      <span className="text-stone-200 dark:text-zinc-700 ml-3 select-none">·</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hero — cycling background images + quote slider */}
        <HeroSection
          currentCampaign={currentCampaign}
          translatedTitle={translatedCampaignTitle ?? null}
          translatedDesc={translatedCampaignDesc ?? null}
        />

        {/* Stats bar + live ticker — only when money feature enabled */}
        {FEATURES.money && (
          <>
            <DesktopStatsBar stats={stats} />
            <LiveTicker activity={activity} />
          </>
        )}

        {/* "Why CauseKind" — 4-feature asymmetric grid */}
        <WhyCauseKindSection />

        {/* "What We Provide" — 2-step dark section */}
        <WhatWeProvideSection />

        {/* Latest campaigns carousel */}
        {FEATURES.money && (
          <LatestActiveCampaignsSection campaigns={campaigns} loading={loading} error={error} />
        )}

        {/* In-Kind Requests section — hidden from landing page; shown only via WelcomeOverlay filter */}
        {false && (loading || itemRequests.length > 0) && (
          <section id="inkind-requests-section" className="bg-white dark:bg-zinc-900 border-b border-orange-100/35 dark:border-stone-850 py-20">
            <div className="mx-auto max-w-7xl px-6">
              <Reveal className="mb-14">
                <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-end">
                  <div>
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15]">In-Kind Giving</span>
                      <span className="h-px flex-1 bg-[#b04a15]/20" />
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-white leading-[1.05]">
                      {selectedCategory ? `${selectedCategory} Needs Near You` : t("inkindSection.title")}
                    </h2>
                    <p className="text-base text-stone-500 dark:text-stone-400 font-medium mt-3 max-w-xl">
                      {selectedCategory ? `Showing ${(selectedCategory ?? "").toLowerCase()} requests sorted by distance.` : t("inkindSection.subtitle")}
                    </p>
                  </div>
                  <Link href="/requests" className="inline-flex shrink-0">
                    <Button variant="outline" className="btn-3d border-orange-200 dark:border-stone-850 hover:bg-orange-50 dark:hover:bg-zinc-800 rounded-xl font-bold px-5 py-5 text-sm gap-2 text-stone-700 dark:text-stone-200">
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
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
                  {displayedRequests.slice(0, 6).map((req, i) => {
                    const isFeatured = i === 0;
                    const isTall     = i === 0 || i === 3;
                    return (
                      <Reveal key={req.id} delay={i * 90} className={isFeatured ? "col-span-2 lg:col-span-1 row-span-2 lg:row-span-1" : ""}>
                        <HoverCard openDelay={300}>
                          <HoverCardTrigger asChild>
                            <Card className={`card-glow inkind-card-featured bg-white dark:bg-zinc-900 rounded-2xl border border-orange-100 dark:border-zinc-800 overflow-hidden flex flex-col cursor-pointer group transition-all duration-300 ${isFeatured ? "lg:min-h-[320px]" : isTall ? "min-h-[280px]" : "min-h-[220px]"}`}>
                              <div className={`relative w-full bg-stone-100 dark:bg-zinc-950 shrink-0 overflow-hidden ${isFeatured ? "h-40 sm:h-52" : "h-28 sm:h-36"}`}>
                                <Image src={req.imageUrl || getMobileCardImage(req.category, req.id)} alt={req.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 640px) 50vw, 33vw" />
                                {isFeatured && <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />}
                                <div className="absolute top-2 right-2">
                                  <span className={`text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase border ${req.urgency === "CRITICAL" ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400" : req.urgency === "HIGH" ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" : "bg-stone-100/90 dark:bg-zinc-800/90 border-stone-200 dark:border-zinc-700 text-stone-500 dark:text-stone-400"}`}>
                                    {tCommon("urgency" + req.urgency.charAt(0) + req.urgency.slice(1).toLowerCase())}
                                  </span>
                                </div>
                                {isFeatured && (
                                  <div className="absolute bottom-3 left-3">
                                    <span className="text-[10px] font-black text-white/80 uppercase tracking-wider bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">{req.category}</span>
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
                                    <span className="text-[#b04a15] font-extrabold uppercase text-[9px] sm:text-[10px] tracking-wider hover:underline">Give →</span>
                                  </Link>
                                </div>
                              </CardContent>
                            </Card>
                          </HoverCardTrigger>
                          <HoverCardContent side="top" align="center" className="w-80 z-50 p-4 shadow-xl">
                            <div className="space-y-2">
                              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight"><TranslatedText text={req.title} /></h4>
                              <p className="text-sm text-stone-500 dark:text-stone-400">{req.description ? <TranslatedText text={req.description} /> : `Requested by ${req.doneeName}. Qty ${req.quantity} needed.`}</p>
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

        {/* "Be the Change" feature cards */}
        <BeTheChangeSection />

        {/* Donee requests, filtered by the donor's chosen focus areas — hidden for donees themselves */}
        {user?.role !== "DONEE" && <DoneeRequestsSection itemRequests={itemRequests} />}

        {/* Coming soon magnets */}
        <ComingSoonMagnets />

        {/* Bottom CTA — hidden when logged in */}
        <CTASection />
      </div>

      {/* ════════════════════════════════════════════════════════════
          MOBILE VIEW  (lg:hidden)
          Still inline here — can be extracted to MobileView.tsx
          in a future session if it grows.
      ════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen pb-24 bg-[#fbf9f4] dark:bg-zinc-950 px-4 pt-2 flex flex-col gap-8">

        {/* Mobile stats ticker — Dark mode fix: bg stays terracotta, text white */}
        {FEATURES.money && (
          <div className="overflow-hidden bg-[#b04a15] -mx-4">
            <div className="animate-stats-ticker flex gap-0 whitespace-nowrap py-2">
              {[0, 1].map(copy => (
                <div key={copy} className="flex items-center gap-8 px-4 shrink-0">
                  {statItems.map(item => (
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

        {/* Mobile Hero — cycling images every 6s */}
        <MobileHeroSlider />

        {/* Mobile Campaigns horizontal scroll */}
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
              {loading && <div className="flex justify-center py-10 w-full"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#b04a15]/20 border-t-[#b04a15]" /></div>}
              {!loading && campaigns.slice(0, 5).map(campaign => {
                const pct = Math.min(100, Math.round((campaign.amountRaised / campaign.targetAmount) * 100));
                return (
                  <div key={campaign.id} className="bg-white dark:bg-zinc-900 rounded-[1.75rem] p-3.5 border border-[#e8e2d5]/60 dark:border-zinc-800 flex gap-3.5 w-[310px] sm:w-[325px] snap-start shrink-0 shadow-xs">
                    <div className="w-[100px] flex-shrink-0 flex flex-col justify-start">
                      <div className="relative h-18 w-full rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-950">
                        <Image src={campaign.imageUrl || getMobileCardImage(campaign.category, campaign.id)} alt={campaign.title} fill className="object-contain object-center" sizes="100px" />
                      </div>
                      <p className="text-[10px] font-black text-stone-800 dark:text-stone-100 mt-2 line-clamp-2 leading-snug"><TranslatedText text={campaign.title} /></p>
                    </div>
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <h4 className="text-[11px] font-black text-stone-850 dark:text-stone-100 leading-snug truncate"><TranslatedText text={campaign.title} /></h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[campaign.city, campaign.category].map(t => (
                          <span key={t} className="bg-[#faf1e1] dark:bg-zinc-850 text-[#b04a15] dark:text-orange-400 font-extrabold text-[8px] px-1.5 py-0.5 rounded tracking-wider uppercase"><TranslatedText text={t} /></span>
                        ))}
                      </div>
                      <div className="mt-2.5 space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-extrabold text-stone-400 uppercase">
                          <span>Progress</span><span className="text-[#b04a15]">{pct}% Funded</span>
                        </div>
                        <div className="w-full bg-stone-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                          <div className="bg-[#b04a15] h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[9px] text-stone-500 dark:text-stone-400 font-extrabold mt-1">₹{formatINR(campaign.amountRaised)} of ₹{formatINR(campaign.targetAmount)}</p>
                      </div>
                      <Link href={`/campaigns/${campaign.id}`} className="block w-full mt-2.5">
                        <button className="w-full bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold py-2 rounded-lg text-[9px] tracking-wide uppercase transition-all shadow-sm active:scale-95"><TranslatedText text="Donate Now" /></button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Mobile In-Kind Requests */}
        <section id="inkind-requests-section-mobile" className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-base sm:text-lg font-black text-stone-850 dark:text-stone-100 tracking-tight">
              <TranslatedText text="In-Kind Requests" />
            </h2>
            <Link href="/requests" className="text-[10px] font-extrabold text-[#b04a15] uppercase tracking-wider hover:underline">
              <TranslatedText text="Browse All" /> →
            </Link>
          </div>
          <p className="text-[11px] text-stone-400 dark:text-stone-500 font-bold leading-relaxed -mt-2">
            <TranslatedText text="Donees request physical items they need..." />
          </p>
          <div className="flex gap-4 overflow-x-auto pb-4 px-1 -mx-5 scrollbar-none snap-x snap-mandatory">
            {loading && <div className="flex justify-center py-10 w-full"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#b04a15]/20 border-t-[#b04a15]" /></div>}
            {!loading && displayedRequests.slice(0, 5).map(req => {
              const title  = req.title.toLowerCase();
              let ReqIcon  = Package;
              if (title.includes("book") || title.includes("school")) ReqIcon = BookOpen;
              else if (title.includes("cloth") || title.includes("shirt") || title.includes("jacket")) ReqIcon = Shirt;
              return (
                <div key={req.id} className="bg-white dark:bg-zinc-900 rounded-[1.75rem] p-4 border border-[#e8e2d5]/60 dark:border-zinc-800 flex flex-col justify-between w-[240px] snap-start shrink-0 shadow-xs">
                  <div className="flex gap-3">
                    <div className="bg-[#faf1e1] dark:bg-zinc-850 w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-[#e8e2d5]/20">
                      <ReqIcon className="w-5 h-5 text-[#b04a15]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-stone-850 dark:text-stone-100 leading-snug line-clamp-1"><TranslatedText text={req.title} /></h4>
                      <p className="text-[9px] text-stone-400 font-semibold truncate mt-0.5">By {req.doneeName}, <TranslatedText text={req.city} /></p>
                    </div>
                  </div>
                  <div className="mt-3.5 flex items-center justify-between">
                    <span className="text-[10px] text-stone-550 dark:text-stone-400 font-black">Qty: <span className="font-extrabold text-stone-800 dark:text-stone-100">{req.quantity}</span></span>
                    <Link href="/requests">
                      <button className="bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold px-4 py-1.5 rounded-lg text-[10px] tracking-wide uppercase transition-all shadow-sm active:scale-95"><TranslatedText text="Give" /></button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Be the Change */}
        <BeTheChangeSection />
      </div>
    </div>
  );
}
