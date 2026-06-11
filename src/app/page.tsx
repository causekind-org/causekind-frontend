"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Play, Heart, ShieldCheck, HandCoins, MapPin, Award, Loader2, Coins, Users, Package } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { ParticleBackground } from "@/components/ParticleBackground";
import { LatestActiveCampaignsSection } from "@/components/CampaignCarousel";
import { MockListingsCarousel } from "@/components/MockListingsCarousel";
import { ArrowRight } from "lucide-react";
import { getCampaigns, getPlatformStats, getRecentActivity, type Campaign, type PlatformStats, type RecentActivity } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const HERO_IMAGES = [
  "/images/hero-1.jpg", "/images/hero-2.jpg", "/images/hero-3.jpg",
  "/images/hero-4.jpg", "/images/hero-5.jpg", "/images/hero-6.jpg",
  "/images/hero-7.jpg", "/images/hero-8.jpg", "/images/hero-9.jpg",
];

const features = [
  { icon: ShieldCheck, title: "Admin Verified", desc: "Every campaign, item request, and listing is strictly reviewed before going live to prevent scams.", color: "from-[#b04a15]/10 to-[#e07b3a]/10 text-[#b04a15]" },
  { icon: HandCoins, title: "100% Direct Giving", desc: "Zero platform fees for donors. 100% of your contribution goes directly to the intended cause.", color: "from-[#e07b3a]/10 to-[#f59e0b]/10 text-[#c2660a]" },
  { icon: MapPin, title: "Radius-Based Matches", desc: "In-kind physical donations match local donees within a 10 km radius to ensure easy logistics.", color: "from-[#1e3a60]/10 to-[#2d5a96]/10 text-[#1e3a60]" },
  { icon: Award, title: "Tax Certificates", desc: "Receive verified thank-you and contribution certificates immediately after delivery confirmation.", color: "from-amber-500/10 to-yellow-500/10 text-amber-700" },
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
            <Image src={src} alt="" fill className="object-cover object-center" priority={i === 0} sizes="100vw" />
          </div>
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1c1108]/45 via-[#1c1108]/18 to-[#1c1108]/55 pointer-events-none" />
    </div>
  );
}

export default function HomePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getCampaigns(), getPlatformStats(), getRecentActivity()])
      .then(([c, s, a]) => { setCampaigns(c); setStats(s); setActivity(a); })
      .catch(() => setError("Could not load campaigns."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 min-h-screen overflow-x-hidden transition-colors duration-300">
      {/* particle layer — behind all content */}
      <ParticleBackground className="z-0" />

      <div className="relative z-10">
        {/* ── Hero ── */}
        <section className="relative w-full min-h-screen overflow-hidden flex items-center pt-28 pb-20 px-6 sm:px-12 md:px-16 lg:px-24">
          <HeroImageSlider />

          <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            
            {/* Left side: CauseKind Brand Statement, Title, Description & Actions */}
            <div className="col-span-12 md:col-span-8 lg:col-span-7 flex flex-col items-start gap-6">
              <div className="flex items-center gap-2 text-white/90">
                <Sparkles className="w-5 h-5 text-[#f0b97a] animate-pulse" />
                <span className="text-sm font-bold uppercase tracking-widest">CauseKind<sup className="text-[10px]">TM</sup></span>
              </div>
              
              <h1 className="font-normal leading-[0.95] text-white text-[2.5rem] sm:text-5xl md:text-6xl lg:text-[4.75rem] xl:text-[5.25rem] max-w-4xl"
                style={{ 
                  fontFamily: '"Neue Haas Grotesk Display Pro 55 Roman","Neue Haas Grotesk Text Pro","Helvetica Neue",Helvetica,Arial,sans-serif', 
                  letterSpacing: '-0.035em',
                  textShadow: '0 2px 15px rgba(0,0,0,0.4)'
                }}>
                Close the rift{' '}
                <span className="text-[#f0b97a] block mt-1">linking compassion and action</span>
              </h1>

              <p className="text-white/90 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl font-medium"
                style={{ textShadow: '0 1px 5px rgba(0,0,0,0.3)' }}>
                CauseKind helps you support verified campaigns and donate items directly to people in your area. 100% of your contribution goes directly to the cause with zero platform fees.
              </p>

              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <Link href="/campaigns">
                  <button className="btn-3d btn-shine bg-white hover:bg-white/92 text-[#1c1108] text-sm sm:text-base font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-full shadow-md">
                    Donate Now
                  </button>
                </Link>
                <a href="#how" className="text-white text-sm sm:text-base font-semibold hover:opacity-85 transition-opacity underline underline-offset-4 flex items-center gap-1">
                  How we work <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Right side: Clear/Decorative (Left empty to show background image of children) */}
            <div className="hidden md:col-span-4 lg:col-span-5 md:flex" />

          </div>

          {/* Lower right absolute action button */}
          <div className="absolute right-6 sm:right-12 md:right-16 lg:right-24 bottom-8 sm:bottom-12 z-20 flex items-center gap-2 text-white/90 text-sm">
            <a href="#trust" className="flex items-center gap-2.5 group bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/25 transition-all px-4 py-2.5 rounded-full shadow-sm">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                <Play className="w-2.5 h-2.5 fill-white text-white ml-0.5" />
              </span>
              <span className="font-semibold text-xs uppercase tracking-wider">How we Verify</span>
            </a>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="border-y border-orange-100/50 dark:border-stone-850 bg-white/72 dark:bg-zinc-950/72 backdrop-blur-md shadow-xs">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-2 divide-x divide-orange-50 dark:divide-zinc-800 md:grid-cols-4">
              {[
                { value: stats ? `₹${formatINR(stats.totalRaised)}` : "₹5,652", label: "Total Funds Raised", desc: "Donated directly to donees", icon: Coins, color: "text-[#b04a15]" },
                { value: stats ? stats.activeCampaigns : "3", label: "Active Campaigns", desc: "Verified active fundraisers", icon: Heart, color: "text-[#c2660a]" },
                { value: stats ? stats.totalDonations : "24", label: "Successful Donations", desc: "Money & items matched", icon: Sparkles, color: "text-[#1e3a60]" },
                { value: stats ? stats.uniqueDonors : "18", label: "Verified Donors", desc: "Direct community helpers", icon: Users, color: "text-amber-700" },
              ].map((s, i) => (
                <div key={s.label} className={`px-6 py-6 flex flex-col justify-between anim-up anim-d${i + 1}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{s.label}</span>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-stone-900 dark:text-stone-100 tabular-nums sm:text-3xl">{s.value}</p>
                    <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500 font-semibold leading-none">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Live Ticker ── */}
        {activity.length > 0 && (
          <div className="border-b border-orange-100/40 dark:border-stone-850/40 bg-orange-50/30 dark:bg-zinc-900/10 py-3 overflow-hidden flex items-center gap-3">
            <span className="shrink-0 ml-6 rounded-full bg-[#1c1108] px-3 py-1 text-[10px] font-black tracking-widest text-white z-10 flex items-center gap-1 shadow-sm">
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

        {/* ── Features ── */}
        <section id="trust" className="mx-auto max-w-7xl px-6 py-20 bg-grid-pattern">
          <Reveal className="mx-auto max-w-2xl text-center space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-4xl">How we Verify</h2>
            <p className="text-base text-stone-500 dark:text-stone-400 font-medium">Every transaction, donee verification, and item match is fully transparent and vetted by administrators.</p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 90}>
                <Card className="card-3d card-shimmer card-glow glass-card border-orange-100/50 rounded-2xl overflow-hidden p-6 flex flex-col justify-between h-full">
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

        {/* ── How it works ── */}
        <section id="how" className="bg-orange-50/40 dark:bg-zinc-900/20 border-y border-orange-100/35 dark:border-stone-850/30 py-20">
          <div className="mx-auto max-w-7xl px-6">
            <Reveal className="mx-auto max-w-2xl text-center space-y-3 mb-12">
              <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-4xl">How we work</h2>
              <p className="text-base text-stone-500 dark:text-stone-400 font-medium">Get started in three straightforward steps.</p>
            </Reveal>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { step: "01", icon: ShieldCheck, title: "Vetted Donees", desc: "Donees submit verification details, medical files, or local requests. Administrators review for legitimacy." },
                { step: "02", icon: Heart, title: "Direct Giving Mode", desc: "Choose a financial campaign, or select local donee requests asking for physical clothes, books, and laptops." },
                { step: "03", icon: Package, title: "Local Logistics Match", desc: "In-kind donations match automatically with local families within 10 km, reducing fuel and courier costs." },
              ].map((s, i) => (
                <Reveal key={s.title} delay={i * 100}>
                  <Card className="card-3d card-shimmer card-glow glass-card rounded-2xl border-white/80 p-6 relative overflow-hidden h-full">
                    <div className="absolute right-4 top-4 text-4xl font-black text-orange-100 dark:text-zinc-800/60 select-none">{s.step}</div>
                    <CardContent className="p-0 space-y-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1c1108] text-white shadow-md shadow-stone-900/20">
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
                <Link href="/requests">
                  <Button
                    variant="outline"
                    className="btn-3d border-orange-200 dark:border-stone-850 hover:bg-orange-50 dark:hover:bg-zinc-800 rounded-xl font-bold px-5 py-5 text-sm gap-2 text-stone-700 dark:text-stone-200"
                  >
                    Browse All Requests <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </Reveal>
            </div>

            {/* Placeholder area for further implementation */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "NCERT Class 12 Textbooks", donee: "Ramesh P.", city: "Pune", qty: "2 Sets", urgency: "High Urgency" },
                { title: "Gently Used School Uniforms", donee: "Sneha G.", city: "Mumbai", qty: "3 Pairs", urgency: "Medium Urgency" },
                { title: "Basic Laptop for Online Studies", donee: "Karan K.", city: "Pune", qty: "1 Unit", urgency: "Critical Needs" },
              ].map((req, i) => (
                <Reveal key={req.title} delay={i * 100}>
                  <Card className="card-3d card-glow glass-card dark:bg-zinc-900/60 rounded-2xl border-white/80 dark:border-stone-800 p-6 relative overflow-hidden h-full flex flex-col justify-between">
                    <div className="absolute top-4 right-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
                        req.urgency === "High Urgency" || req.urgency === "Critical Needs"
                          ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                      }`}>
                        {req.urgency}
                      </span>
                    </div>

                    <CardContent className="p-0 space-y-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-zinc-950 text-[#b04a15] shadow-xs">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{req.title}</h3>
                        <p className="text-xs text-stone-400 font-semibold mt-1">Requested by {req.donee} · {req.city}</p>
                      </div>
                      <p className="text-sm text-stone-500 dark:text-stone-400 font-medium leading-relaxed">
                        Quantity needed: <span className="font-extrabold text-stone-800 dark:text-stone-200">{req.qty}</span>. Match logistics matching will verify local dropoff.
                      </p>
                    </CardContent>

                    <div className="mt-6 pt-4 border-t border-orange-50/50 dark:border-stone-800 flex justify-between items-center text-xs">
                      <span className="text-stone-400 dark:text-stone-500 font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> PLACEHOLDER AREA
                      </span>
                      <span className="text-[#b04a15] dark:text-[#ff8a65] font-extrabold uppercase text-[10px] tracking-wider">
                        Matched Soon
                      </span>
                    </div>
                  </Card>
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
                <Link href="/items">
                  <Button
                    variant="outline"
                    className="btn-3d border-orange-200 dark:border-stone-850 hover:bg-orange-50 dark:hover:bg-zinc-900 rounded-xl font-bold px-5 py-5 text-sm gap-2 text-stone-700 dark:text-stone-200"
                  >
                    Browse All Listings <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </Reveal>
            </div>

            {/* Carousel display of listings (rotate speed 3s) */}
            <Reveal delay={200}>
              <MockListingsCarousel />
            </Reveal>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-7xl mx-auto px-6 pb-20">
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
                  <Link href="/register">
                    <Button size="lg" className="btn-3d btn-shine bg-[#b04a15] hover:bg-[#8f3b10] text-white shadow-md shadow-orange-900/25 rounded-xl font-bold px-6 py-6">
                      Create An Account
                    </Button>
                  </Link>
                  <Link href="/campaigns">
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
