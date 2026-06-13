"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Heart, ShieldCheck, HandCoins, MapPin, Award, Coins, Users, Package, ArrowRight } from "lucide-react";
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

const features = [
  { icon: ShieldCheck, title: "Admin Verified", desc: "Every campaign and item request is reviewed by our team before it goes live. Nothing gets through without a real check.", color: "from-[#b04a15]/10 to-[#e07b3a]/10 text-[#b04a15]" },
  { icon: HandCoins, title: "Zero Platform Fees", desc: "We charge nothing. Every rupee you donate or every item you give reaches the person who needs it.", color: "from-[#e07b3a]/10 to-[#f59e0b]/10 text-[#c2660a]" },
  { icon: MapPin, title: "Local Matching", desc: "Item donations are matched with people within 10 km of you, making drop-offs simple and quick.", color: "from-[#1e3a60]/10 to-[#2d5a96]/10 text-[#1e3a60]" },
  { icon: Award, title: "Impact Certificates", desc: "After your donation is delivered, you receive a verified certificate you can keep or share.", color: "from-amber-500/10 to-yellow-500/10 text-amber-700" },
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>([]);
  const [itemListings, setItemListings] = useState<ItemListing[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCampaignIndex, setActiveCampaignIndex] = useState(0);

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

  return (
    <div className="bg-white dark:bg-zinc-950 text-stone-900 dark:text-stone-100 min-h-[100svh] overflow-x-clip transition-colors duration-300">
      <div className="relative z-10">
        
        {/* ── Mobile-only scrolling stats strip — above hero image ── */}
        <div className="sm:hidden overflow-hidden border-b border-orange-100 bg-white">
          <div className="stats-ticker-track py-3.5">
            {[0, 1].map(copy => (
              <div key={copy} className="flex items-center shrink-0">
                {[
                  { value: stats ? `₹${formatINR(stats.totalRaised)}` : "₹5,652", label: "Total Funds Raised", icon: Coins, color: "text-[#b04a15]" },
                  { value: stats ? stats.activeCampaigns : "3", label: "Active Campaigns", icon: Heart, color: "text-[#b04a15]" },
                  { value: stats ? stats.totalDonations : "24", label: "Donations Made", icon: Sparkles, color: "text-[#b04a15]" },
                  { value: stats ? stats.uniqueDonors : "18", label: "Verified Donors", icon: Users, color: "text-[#b04a15]" },
                ].map((s) => (
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
            {/* Background Image Slideshow */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
              <HeroImageSlider />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full h-full min-h-[520px] sm:min-h-[640px] lg:min-h-[720px] px-6 sm:px-12 py-10 sm:py-16 flex flex-col justify-between">

              {/* Top: badge + donate button + desktop pills */}
              <div className="w-full flex items-start justify-between gap-4 lg:gap-6">
                <div className="self-start inline-flex items-center gap-2 bg-white rounded-full px-5 py-2 border border-[#e2e0d5]">
                  <span className="w-2 h-2 rounded-full bg-[#f0b97a] animate-pulse shrink-0" />
                  <span className="text-[#b04a15] text-xs font-extrabold uppercase tracking-wider">MAKING LIVES BETTER</span>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="hidden lg:flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 bg-black/35 backdrop-blur-md border border-white/15 rounded-full px-4 py-2 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-[#f0b97a]" />
                      <span className="text-white text-sm font-semibold">100% transparent donations</span>
                    </div>
                    <div className="flex items-center gap-2 bg-black/35 backdrop-blur-md border border-white/15 rounded-full px-4 py-2 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-[#f0b97a]" />
                      <span className="text-white text-sm font-semibold">Fast, effective distribution</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom: headline + card */}
              <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mt-auto">
                {/* Headline */}
                <div className="lg:col-span-7 flex flex-col items-start gap-5 relative">
                  <h1 className="text-white font-extrabold leading-[1.08] tracking-tight text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] max-w-2xl font-jakarta">
                    Together We Support <br />Educate and Heal
                  </h1>
                  <p className="text-white/85 text-sm sm:text-base leading-relaxed max-w-lg font-medium">
                    Every donation helps a family grow stronger, healthier, and more secure. Together, we build a future full of possibilities.
                  </p>
                </div>

                {/* Hero card — mobile: urgency-first, desktop: logo+icon+full */}
                <div className="lg:col-span-5 flex justify-end">
                  {(() => {
                    const currentCampaign = campaigns[activeCampaignIndex];
                    const urgency = currentCampaign?.urgency ?? "NORMAL";
                    const urgencyConfig = {
                      CRITICAL: { label: "Critical — Urgent Action Needed", dot: "urgency-dot-critical", badge: "bg-red-500/15 border-red-400/40 text-red-300" },
                      HIGH:     { label: "High Priority", dot: "urgency-dot-high", badge: "bg-amber-500/15 border-amber-400/40 text-amber-300" },
                      NORMAL:   { label: "Active Campaign", dot: "", badge: "bg-white/10 border-white/20 text-white/70" },
                    }[urgency] ?? { label: "Active Campaign", dot: "", badge: "bg-white/10 border-white/20 text-white/70" };
                    return (
                      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 shadow-2xl w-full max-w-[320px] border border-[#e5e2d5]/65 dark:border-zinc-800 animate-card-3d-enter sm:min-h-[350px] flex flex-col justify-between transition-all duration-500">
                        <div>
                          {/* Mobile: urgency badge. Desktop: logo row */}
                          <div className="mb-0 lg:mb-4">
                            {/* Urgency badge — always visible on mobile, hidden on lg */}
                            <div className={`lg:hidden inline-flex items-center gap-1.5 rounded-full border px-3 py-1 mb-3 ${urgencyConfig.badge}`}>
                              {urgencyConfig.dot && (
                                <span className={`w-1.5 h-1.5 rounded-full bg-current ${urgencyConfig.dot}`} />
                              )}
                              <span className="text-[10px] font-black uppercase tracking-wider">{urgencyConfig.label}</span>
                            </div>
                            {/* Logo row — desktop only */}
                            <div className="hidden lg:flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] flex items-center justify-center shadow-sm shrink-0">
                                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 21.5C7.5 18 4.5 14.5 4.5 10.5C4.5 7.5 6.5 5.5 9.5 5.5C10.8 5.5 11.6 6 12 6.5C12.4 6 13.2 5.5 14.5 5.5C17.5 5.5 19.5 7.5 19.5 10.5C19.5 14.5 16.5 18 12 21.5Z" stroke="white" strokeWidth="1.8" />
                                  </svg>
                                </div>
                                <span className="text-sm font-extrabold text-stone-900 dark:text-stone-100">CauseKind</span>
                              </div>
                              <span className="text-xs text-stone-400 font-bold">· {currentCampaign ? currentCampaign.city : "2026"}</span>
                            </div>
                          </div>

                          {/* City badge on mobile */}
                          <p className="lg:hidden text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                            {currentCampaign ? `${currentCampaign.city} · ${currentCampaign.category}` : "Local Campaign"}
                          </p>

                          <h3 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white leading-snug mb-2 font-jakarta line-clamp-2 transition-all duration-300">
                            {currentCampaign ? currentCampaign.title : "Make an Immediate Impact"}
                          </h3>
                          <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 leading-relaxed font-medium line-clamp-2 transition-all duration-300">
                            {currentCampaign ? currentCampaign.description : "Every donation directly supports frontline community programs."}
                          </p>
                        </div>
                        <Link href={currentCampaign ? `/campaigns/${currentCampaign.id}` : "/campaigns"} className="block w-full">
                          <button className="w-full bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold py-3.5 rounded-xl text-xs tracking-wide uppercase transition-all duration-300 shadow-md shadow-orange-900/20 active:scale-95">
                            Donate Now
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

        {/* ── Stats bar — desktop only (mobile has the scrolling strip inside the hero) ── */}
        <div className="hidden sm:block border-y border-orange-100/50 dark:border-stone-850 bg-white dark:bg-zinc-950 shadow-xs">
          <div className="flex items-stretch divide-x divide-orange-50 dark:divide-zinc-800 justify-around py-5">
            {[
              { value: stats ? `₹${formatINR(stats.totalRaised)}` : "₹5,652", label: "Total Funds Raised", icon: Coins, color: "text-[#b04a15]" },
              { value: stats ? stats.activeCampaigns : "3", label: "Active Campaigns", icon: Heart, color: "text-[#c2660a]" },
              { value: stats ? stats.totalDonations : "24", label: "Donations Made", icon: Sparkles, color: "text-[#1e3a60]" },
              { value: stats ? stats.uniqueDonors : "18", label: "Verified Donors", icon: Users, color: "text-amber-700" },
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
                      <><span className="inline-block h-2 w-2 rounded-full bg-[#b04a15]" /><span className="text-[#b04a15] font-extrabold">₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(a.amount ?? 0)}</span> donated to <span className="font-extrabold text-stone-800 dark:text-stone-200">{a.campaignTitle}</span><span className="text-stone-400">· {a.city}</span></>
                    ) : (
                      <><span className="inline-block h-2 w-2 rounded-full bg-[#1e3a60]" /><span className="text-[#1e3a60] font-extrabold">New Campaign</span><span className="font-extrabold text-stone-800 dark:text-stone-200">{a.campaignTitle}</span><span className="text-stone-400">· {a.category} · {a.city}</span></>
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

        {/* ── Features / How we Process ── */}
        <section id="trust" className="mx-auto max-w-7xl px-6 py-16 bg-grid-pattern">
          <Reveal className="mx-auto max-w-2xl text-center space-y-3 mb-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-4xl">Why raise funds through us</h2>
            <p className="text-base text-stone-500 dark:text-stone-400 font-medium">Every donation is verified, zero-fee, and delivered directly to someone who truly needs it.</p>
          </Reveal>
          {/* Mobile: compact icon+text rows. Desktop: card grid */}
          <div className="grid gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 90}>
                {/* Mobile row */}
                <div className="sm:hidden flex items-start gap-4 px-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-orange-100/60 dark:border-zinc-800 shadow-xs">
                  <div className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-xs`}>
                    <f.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">{f.title}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium leading-relaxed mt-0.5">{f.desc}</p>
                  </div>
                </div>
                {/* Desktop card */}
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
              <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-4xl">What we Provide</h2>
              <p className="text-base text-stone-500 dark:text-stone-400 font-medium">Three ways to give, all under one roof.</p>
            </Reveal>
            <div className="grid gap-3 sm:gap-6 md:grid-cols-3">
              {[
                { step: "01", icon: ShieldCheck, title: "Verified Campaigns", desc: "Every person who posts a campaign is checked by our team first. You know your money is going somewhere real." },
                { step: "02", icon: Heart, title: "Money or Items", desc: "Donate cash to a campaign, or give physical items like books, clothes, or a laptop to someone nearby." },
                { step: "03", icon: Package, title: "Local Drop-offs", desc: "Item donations are matched within 10 km. No couriers, no shipping fees — just direct giving to a neighbour." },
              ].map((s, i) => (
                <Reveal key={s.title} delay={i * 100}>
                  {/* Mobile: compact icon+text row */}
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
                  {/* Desktop: card */}
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
                  In-Kind Requests
                </h2>
                <p className="text-base text-stone-500 dark:text-stone-400 font-medium">
                  Donees request physical items they need. You can match their requests and donate items directly, bypassing shipping fees through local radius matches.
                </p>
              </Reveal>
              <Reveal delay={100} className="shrink-0">
                <Link href="/requests" className="inline-flex">
                  <Button
                    variant="outline"
                    className="btn-3d border-orange-200 dark:border-stone-850 hover:bg-orange-50 dark:hover:bg-zinc-800 rounded-xl font-bold px-5 py-5 text-sm gap-2 text-stone-700 dark:text-stone-200"
                  >
                    Browse All Requests <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </Reveal>
            </div>

            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
              {(itemRequests.length > 0 ? itemRequests.slice(0, 6) : Array(4).fill(null)).map((req: ItemRequest | null, i) => (
                <Reveal key={req ? req.id : `skel-${i}`} delay={i * 80}>
                  {req ? (
                    <Card className="card-glow bg-white dark:bg-zinc-900 rounded-2xl border border-orange-100 dark:border-zinc-800 overflow-hidden h-full flex flex-col">
                      {/* Image — shorter on mobile */}
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
                            {req.urgency === "CRITICAL" ? "Critical" : req.urgency === "HIGH" ? "High" : "Normal"}
                          </span>
                        </div>
                      </div>
                      <CardContent className="p-3 sm:p-5 flex flex-col flex-1 gap-2">
                        <div>
                          <h3 className="text-xs sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2">{req.title}</h3>
                          <p className="text-[10px] sm:text-xs text-stone-400 font-semibold mt-0.5 truncate">By {req.doneeName} · {req.city}</p>
                        </div>
                        {req.description && (
                          <p className="hidden sm:block text-sm text-stone-500 dark:text-stone-400 font-medium leading-relaxed line-clamp-2">{req.description}</p>
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
                  Community Listings
                </h2>
                <p className="text-base text-stone-500 dark:text-stone-400 font-medium">
                  Browse physical items listed by donors in your neighborhood offering school bags, books, uniforms, and toys for free pickup.
                </p>
              </Reveal>
              <Reveal delay={100} className="shrink-0">
                <Link href="/items" className="inline-flex">
                  <Button
                    variant="outline"
                    className="btn-3d border-orange-200 dark:border-stone-850 hover:bg-orange-50 dark:hover:bg-zinc-900 rounded-xl font-bold px-5 py-5 text-sm gap-2 text-stone-700 dark:text-stone-200"
                  >
                    Browse All Listings <ArrowRight className="h-4 w-4" />
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
                <h2 className="text-3xl font-extrabold sm:text-4xl">Be the change in someone&apos;s story.</h2>
                <p className="text-stone-400 text-base leading-relaxed font-medium">
                  Whether it&apos;s a micro-donation of ₹100 or spare textbooks, notebooks, and clothes — your act of giving makes an immediate difference.
                </p>
                <div className="flex flex-wrap justify-center gap-4 pt-2">
                  <Link href="/register" className="inline-flex">
                    <Button size="lg" className="btn-3d btn-shine bg-[#b04a15] hover:bg-[#963c0d] text-white shadow-md shadow-orange-900/25 rounded-xl font-bold px-6 py-6">
                      Create An Account
                    </Button>
                  </Link>
                  <Link href="/campaigns" className="inline-flex">
                    <Button size="lg" variant="outline" className="btn-3d border-stone-700 bg-transparent text-white hover:text-white hover:bg-stone-900/40 rounded-xl font-bold px-6 py-6">
                      Browse Active Campaigns
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </div>{/* end z-10 */}
    </div>
  );
}
