"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const CATEGORY_IMAGES: Record<string, string[]> = {
  Medical: ["/images/medical-1.png", "/images/medical-2.png"],
  Education: ["/images/hero-7.jpg"],
  Livelihood: ["/images/hero-3.jpg"],
  Community: ["/images/hero-6.jpg"],
};

function cardImage(category: string, id: number): string | null {
  const imgs = CATEGORY_IMAGES[category];
  return imgs ? imgs[id % imgs.length] : null;
}
import { getCampaigns, getItemRequests, getItemListings, type Campaign } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  HandCoins,
  Heart,
  Loader2,
  MapPin,
  Package,
  ShieldCheck,
} from "lucide-react";

const HERO_SLIDES = [
  { src: "/images/hero-1.jpg", alt: "Giving food to children" },
  { src: "/images/hero-2.jpg", alt: "Farmer smiling" },
  { src: "/images/hero-3.jpg", alt: "Woman with sewing machine" },
  { src: "/images/hero-4.jpg", alt: "Medical care" },
  { src: "/images/hero-5.jpg", alt: "Mother and child" },
  { src: "/images/hero-6.jpg", alt: "Happy children" },
  { src: "/images/hero-7.jpg", alt: "Children studying" },
  { src: "/images/hero-8.jpg", alt: "Children smiling" },
  { src: "/images/hero-9.jpg", alt: "Food sharing" },
];

const features = [
  { icon: ShieldCheck, title: "Admin verified", desc: "Every campaign, item request and listing is reviewed before going live." },
  { icon: HandCoins, title: "Zero fees for donors", desc: "100% of your donation reaches the cause. A small 5% is deducted only from donee settlement." },
  { icon: MapPin, title: "Radius-based matching", desc: "In-kind donations match within a 10 km radius by default." },
  { icon: Award, title: "Thank-you certificates", desc: "Donors get a verified certificate after delivery is confirmed." },
];

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}


function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* ── Full-bleed image slider ── */}
      <section className="relative h-[calc(100vh-56px)] min-h-[500px] overflow-hidden">

        {/* Slides — Ken Burns zoom on active */}
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={slide.src}
            className="absolute inset-0"
            style={{
              opacity: i === current ? 1 : 0,
              transition: "opacity 1.2s ease-in-out",
            }}
          >
            <div
              className={i === current ? (i % 2 === 0 ? "hero-slide-active" : "hero-slide-active-alt") : ""}
              style={{ position: "absolute", inset: 0 }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                className="object-cover object-center"
                priority={i === 0}
              />
            </div>
          </div>
        ))}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/15" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent" />

        {/* ── Content — absolutely centered, never overflows ── */}
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="max-w-xl space-y-4">

              {/* Badge */}
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                Verified giving, India-wide
              </span>

              {/* Headline */}
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Give money or things you own.{" "}
                <span className="text-primary-foreground opacity-90">Help people who truly need it.</span>
              </h1>

              {/* Description */}
              <p className="max-w-md text-sm text-white/75 sm:text-base leading-relaxed">
                CauseKind connects verified donees with donors across India.
                Donate via Razorpay or share items you own — matched within 10 km.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 pt-1">
                <Link href="/campaigns">
                  <Button size="lg" className="gap-2 hover:scale-105 shadow-lg transition-all duration-200">
                    Donate Now <Heart className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="lg" variant="outline" className="gap-2 border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:border-white/70 hover:text-white transition-all duration-200">
                    Share Your Vision <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-white/60">
                {[
                  { icon: CheckCircle2, label: "Razorpay secured" },
                  { icon: ShieldCheck, label: "Admin reviewed" },
                  { icon: Award, label: "Zero fees for donors" },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1">
                    <Icon className="h-3 w-3 text-white/80" /> {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Dots — absolutely positioned, never pushes content */}
        <div className="absolute bottom-4 left-6 z-10 flex items-center gap-3">
          <span className="text-xs text-white/40 tabular-nums">
            {String(current + 1).padStart(2, "0")}/{String(HERO_SLIDES.length).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-1.5">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Slide ${i + 1}`}
                className={`rounded-full transition-all duration-500 ${
                  i === current ? "w-7 h-[3px] bg-white" : "w-[5px] h-[5px] bg-white/30 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </div>
      </section>
  </>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const pct = Math.min(100, Math.round((campaign.amountRaised / campaign.targetAmount) * 100));
  const img = cardImage(campaign.category, campaign.id);
  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 via-accent to-secondary">
        {img && (
          <Image
            src={img}
            alt={campaign.category}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover object-center"
          />
        )}
      </div>
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-xs">
          <Badge variant="secondary">{campaign.category}</Badge>
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" /> {campaign.city}
          </span>
        </div>
        <h3 className="mt-3 font-semibold leading-snug line-clamp-2">{campaign.title}</h3>
        <div className="mt-4 space-y-2">
          <Progress value={pct} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">₹{formatINR(campaign.amountRaised)}</span>
            <span>of ₹{formatINR(campaign.targetAmount)}</span>
          </div>
        </div>
        <Link href={`/campaigns/${campaign.id}`}>
          <Button size="sm" className="mt-4 w-full">Donate now</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [itemRequestCount, setItemRequestCount] = useState(0);
  const [itemListingCount, setItemListingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getCampaigns(), getItemRequests(), getItemListings()])
      .then(([c, r, l]) => {
        setCampaigns(c);
        setItemRequestCount(r.length);
        setItemListingCount(l.length);
      })
      .catch(() => setError("Could not load campaigns. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero Image Slider */}
      <HeroSlider />

      {/* ── Stats strip — real live data ── */}
      <div className="border-b bg-background shadow-sm">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 divide-x divide-border md:grid-cols-4">
            {[
              { value: campaigns.length.toString(), label: "Active campaigns" },
              { value: `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(campaigns.reduce((s, c) => s + c.amountRaised, 0))}`, label: "Raised for verified causes" },
              { value: itemRequestCount.toString(), label: "People needing items" },
              { value: itemListingCount.toString(), label: "Items offered by donors" },
            ].map((s) => (
              <div key={s.label} className="px-6 py-5 text-center">
                <p className="text-2xl font-extrabold text-primary sm:text-3xl">{s.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Built around trust</h2>
          <p className="mt-3 text-muted-foreground">
            Every campaign on CauseKind is verified. So your help reaches the right hands.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="border-accent/60">
              <CardContent className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-accent/30">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="text-3xl font-bold tracking-tight">How CauseKind works</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              { icon: HandCoins, title: "1. Donee verifies", desc: "Individuals create a money campaign or item request. Admin reviews and approves." },
              { icon: Heart, title: "2. Donor gives", desc: "Donate money via Razorpay, sponsor an item, or list an item you already own." },
              { icon: Package, title: "3. Match & deliver", desc: "In-kind donations are matched within 10 km. Contact details unlock after admin approval." },
            ].map((s) => (
              <Card key={s.title}>
                <CardContent className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured campaigns */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Featured campaigns</h2>
            <p className="mt-2 text-muted-foreground">Verified causes across India.</p>
          </div>
          <Link href="/campaigns" className="hidden sm:block">
            <Button variant="outline" className="gap-2">See all <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>

        <div className="mt-8">
          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && <p className="text-center text-destructive py-20">{error}</p>}
          {!loading && !error && campaigns.length === 0 && (
            <p className="text-center text-muted-foreground py-20">No approved campaigns yet — check back soon!</p>
          )}
          {!loading && !error && campaigns.length > 0 && (
            <div className="grid gap-5 md:grid-cols-3">
              {campaigns.slice(0, 3).map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-12 text-center">
          <h2 className="text-3xl font-bold">Be part of someone&apos;s turning point.</h2>
          <p className="max-w-xl opacity-90">
            Whether it&apos;s ₹100 or a school bag your child outgrew — every act counts on CauseKind.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link href="/register">
              <Button size="lg" variant="secondary">Create an account</Button>
            </Link>
            <Link href="/campaigns">
              <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                Browse campaigns
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
