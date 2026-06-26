"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getInKindStats, type InKindStats } from "@/lib/api";
import { locales } from "@/i18n/config";
import {
  Shield,
  Heart,
  MapPin,
  Users,
  Package,
  CheckCircle,
  Handshake,
  GraduationCap,
  Stethoscope,
  Home,
  ArrowRight,
  Languages,
} from "lucide-react";

/* ─── Brand tokens ─────────────────────────────────────────────────── */
const TERRACOTTA = "#b04a15";
const INK = "#1e3a60";

/* ─── Counter animation hook ─────────────────────────────────────────── */
function useCountUp(target: number, duration = 1600, start = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setValue(Math.round(eased * target));
      if (elapsed < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, start]);

  return value;
}

/* ─── Intersection Observer helper ──────────────────────────────────── */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── Flip-in card animation ─────────────────────────────────────────── */
function FlipCard({
  icon: Icon,
  title,
  desc,
  accent,
  delay = 0,
  size = "normal",
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  accent: string;
  delay?: number;
  size?: "normal" | "large";
}) {
  const { ref, inView } = useInView(0.15);

  return (
    <div
      ref={ref}
      className="relative group h-full"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "rotateY(0deg) translateY(0)" : "rotateY(-25deg) translateY(20px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
      }}
    >
      <div
        className={`h-full rounded-2xl border border-[#e5e2d5]/60 dark:border-stone-800
                   bg-white dark:bg-zinc-900 overflow-hidden flex flex-row
                   hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default`}
      >
        {/* Integrated left accent stripe */}
        <div
          className="w-[3px] shrink-0 card-stripe-pop"
          style={{
            background: accent,
            animationDelay: `${delay + 280}ms`,
            animationDuration: "0.5s",
          }}
        />
        {/* Card content */}
        <div className={`flex-1 p-6 flex flex-col gap-4 ${size === "large" ? "justify-between" : ""}`}>
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${size === "large" ? "w-14 h-14 rounded-2xl" : ""}`}
            style={{ background: `${accent}18`, color: accent }}
          >
            <Icon className={size === "large" ? "w-7 h-7" : "w-5 h-5"} />
          </div>
          <div className="flex-1">
            <h3 className={`font-extrabold text-stone-900 dark:text-white leading-snug mb-2 ${size === "large" ? "text-lg" : "text-sm"}`}>
              {title}
            </h3>
            <p className={`text-stone-500 dark:text-stone-400 leading-relaxed font-medium ${size === "large" ? "text-sm" : "text-xs"}`}>
              {desc}
            </p>
          </div>
          <span
            className="w-2 h-2 rounded-full self-end"
            style={{ background: accent, opacity: 0.4 }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Animated number — counts up once data + viewport are ready ─────── */
function StatValue({
  value,
  suffix,
  start,
  className,
}: {
  value: number;
  suffix?: string;
  start: boolean;
  className?: string;
}) {
  const count = useCountUp(value, 1800, start);
  return (
    <span className={`tabular-nums ${className ?? ""}`}>
      {count.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

/* ─── Loading shimmer shown until the live counts arrive ────────────── */
function StatSkeleton({ className }: { className?: string }) {
  return (
    <span className={`inline-block rounded-lg bg-current opacity-10 animate-pulse ${className ?? ""}`} />
  );
}

/* ─── Supporting bento stat tile ────────────────────────────────────── */
function StatTile({
  icon: Icon,
  accent,
  label,
  value,
  loading,
  start,
}: {
  icon: React.ElementType;
  accent: string;
  label: string;
  value: number;
  loading: boolean;
  start: boolean;
}) {
  return (
    <div className="rounded-3xl border border-[#e5e2d5]/60 dark:border-stone-800 bg-white dark:bg-zinc-900 shadow-lg shadow-stone-900/5 p-6 flex flex-col justify-between min-h-[110px]">
      <span
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}18`, color: accent }}
      >
        <Icon className="w-5 h-5" />
      </span>
      <div className="mt-4">
        <div className="text-4xl lg:text-5xl font-black leading-none" style={{ color: accent }}>
          {loading
            ? <StatSkeleton className="h-9 w-20 align-middle" />
            : <StatValue value={value} start={start} />}
        </div>
        <p className="mt-2 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
          {label}
        </p>
      </div>
    </div>
  );
}

/* ─── Category pill with slide-in animation ─────────────────────────── */
function CategoryPill({
  icon: Icon,
  label,
  delay,
  inView,
}: {
  icon: React.ElementType;
  label: string;
  delay: number;
  inView: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-zinc-900
                 border border-[#e5e2d5]/60 dark:border-stone-800 shadow-sm
                 hover:border-[#b04a15]/40 hover:shadow-md hover:-translate-y-0.5
                 transition-all duration-300 cursor-default"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateX(0)" : "translateX(-20px)",
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
      }}
    >
      <Icon className="w-4 h-4 text-[#b04a15]" />
      <span className="text-sm font-bold text-stone-700 dark:text-stone-300">{label}</span>
    </div>
  );
}

/* ─── Main exported section ─────────────────────────────────────────── */
export function BeTheChangeSection() {
  const { ref: statsRef, inView: statsInView } = useInView(0.3);
  const { ref: pillsRef, inView: pillsInView } = useInView(0.2);
  const { user } = useAuth();

  // ── Live in-kind impact numbers (real data, never hardcoded) ──────────
  const [stats, setStats] = useState<InKindStats | null>(null);
  useEffect(() => {
    let alive = true;
    getInKindStats()
      .then((s) => { if (alive) setStats(s); })
      .catch(() => {}); // section still renders; counters just stay in skeleton
    return () => { alive = false; };
  }, []);

  // Languages is a real platform fact derived from the configured locales.
  const languageCount = locales.length;
  const countersReady = statsInView && stats !== null;

  const cards = [
    {
      icon: Shield,
      title: "Every listing is admin-verified",
      desc: "No unvetted requests reach donors. Our team manually reviews each campaign, item request, and donee profile before it goes live.",
      accent: TERRACOTTA,
      delay: 0,
      size: "large" as const,
    },
    {
      icon: MapPin,
      title: "Hyper-local matching engine",
      desc: "Donors and donees within 10 km are matched first — ensuring your donation reaches the closest family in need.",
      accent: INK,
      delay: 100,
      size: "normal" as const,
    },
    {
      icon: Handshake,
      title: "Direct person-to-person handover",
      desc: "We cut out middlemen. Items and aid move directly from donor to donee — fully traceable and confirmed with handover certificates.",
      accent: TERRACOTTA,
      delay: 200,
      size: "normal" as const,
    },
    {
      icon: Users,
      title: "Community-first approach",
      desc: "CauseKind is built around local communities — neighbourhoods, districts, cities — growing a trusted network of giving across India.",
      accent: INK,
      delay: 300,
      size: "large" as const,
    },
    {
      icon: Package,
      title: "In-kind donations that matter",
      desc: "From school supplies and warm clothing to medical equipment — real items for real needs, not just cash that loses touch with impact.",
      accent: TERRACOTTA,
      delay: 400,
      size: "normal" as const,
    },
    {
      icon: CheckCircle,
      title: "Impact certificates issued",
      desc: "Every completed handover generates a digital impact certificate — proof of your generosity for tax, audit, or simply your own pride.",
      accent: INK,
      delay: 500,
      size: "normal" as const,
    },
  ];

  const categories = [
    { icon: GraduationCap, label: "Education" },
    { icon: Stethoscope,   label: "Medical"   },
    { icon: Home,          label: "Livelihood" },
    { icon: Heart,         label: "Community"  },
    { icon: Package,       label: "In-Kind"   },
    { icon: Users,         label: "Family"    },
  ];

  return (
    <section
      className="relative w-full bg-[#faf8f5] dark:bg-zinc-950 overflow-hidden py-24"
    >
      {/* ── Faint decorative blobs — off-center ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-16 w-[500px] h-[500px] rounded-full"
        style={{ background: `radial-gradient(circle, ${TERRACOTTA}0d 0%, transparent 70%)` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-[5%] w-[400px] h-[400px] rounded-full"
        style={{ background: `radial-gradient(circle, ${INK}0d 0%, transparent 70%)` }}
      />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-10">

        {/* ── Section header — LEFT flush, asymmetric ── */}
        <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-end mb-14">
          <div>
            <span
              className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: `${TERRACOTTA}18`, color: TERRACOTTA }}
            >
              Be the change
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-[1.05]">
              Making giving{" "}
              <span style={{ color: TERRACOTTA }}>safe, local</span>
              {" "}and{" "}
              <span style={{ color: INK }}>verified</span>
            </h2>
          </div>
          <p className="text-base text-stone-500 dark:text-stone-400 font-medium leading-relaxed max-w-xs lg:text-right lg:pb-1">
            CauseKind connects donors with verified local donees across India — every handover is traceable and meaningful.
          </p>
        </div>

        {/* ── Category pills (slide-in from left) ── */}
        <div ref={pillsRef} className="flex flex-wrap gap-3 mb-16">
          {categories.map((c, i) => (
            <CategoryPill
              key={c.label}
              icon={c.icon}
              label={c.label}
              delay={i * 80}
              inView={pillsInView}
            />
          ))}
        </div>

        {/* ── Feature cards — ASYMMETRIC: [2fr 1fr 1fr] row 1, [1fr 1fr 2fr] row 2 ── */}
        <div className="grid gap-4 mb-16">
          {/* Row 1: large | normal | normal */}
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
            {cards.slice(0, 3).map((card) => (
              <FlipCard key={card.title} {...card} />
            ))}
          </div>
          {/* Row 2: normal | normal | large */}
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_2fr]">
            {cards.slice(3, 6).map((card) => (
              <FlipCard key={card.title} {...card} />
            ))}
          </div>
        </div>

        {/* ── Live impact stats — ASYMMETRIC BENTO, all real data ── */}
        <div
          ref={statsRef}
          className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr] lg:grid-rows-2"
        >
          {/* HERO tile (tall, spans both rows) — Verified Handovers */}
          <div
            className="relative lg:row-span-2 rounded-3xl p-8 flex flex-col justify-between overflow-hidden text-white min-h-[230px]"
            style={{ background: `linear-gradient(150deg, ${INK} 0%, #16273f 55%, #0f1d30 100%)` }}
          >
            <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full" style={{ background: `radial-gradient(circle, ${TERRACOTTA}40 0%, transparent 70%)` }} />
            <div className="relative flex items-center justify-between">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}>
                <Handshake className="w-6 h-6 text-[#f0b97a]" />
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Live
              </span>
            </div>
            <div className="relative mt-8">
              <div className="text-6xl lg:text-7xl font-black leading-none">
                {stats === null
                  ? <StatSkeleton className="h-14 w-28 align-middle text-white" />
                  : <StatValue value={stats.verifiedHandovers} start={countersReady} />}
              </div>
              <p className="mt-3 text-sm font-bold text-white/80">Verified Handovers</p>
              <p className="mt-1 text-xs text-white/45 leading-relaxed max-w-[15rem]">
                Completed donor-to-donee deliveries, each confirmed with a digital handover certificate.
              </p>
            </div>
          </div>

          {/* In-Kind Items Listed */}
          <StatTile
            icon={Package}
            accent={TERRACOTTA}
            label="In-Kind Items Listed"
            loading={stats === null}
            value={stats?.itemsListed ?? 0}
            start={countersReady}
          />

          {/* Community Needs Posted */}
          <StatTile
            icon={Heart}
            accent={INK}
            label="Community Needs"
            loading={stats === null}
            value={stats?.needsPosted ?? 0}
            start={countersReady}
          />

          {/* Languages Supported — real, derived from configured locales (wide) */}
          <div className="lg:col-span-2 rounded-3xl border border-[#e5e2d5]/60 dark:border-stone-800 bg-white dark:bg-zinc-900 shadow-lg shadow-stone-900/5 p-6 flex items-center gap-5">
            <span className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center" style={{ background: `${TERRACOTTA}18`, color: TERRACOTTA }}>
              <Languages className="w-6 h-6" />
            </span>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-4xl lg:text-5xl font-black leading-none" style={{ color: TERRACOTTA }}>
                <StatValue value={languageCount} suffix="+" start={statsInView} />
              </span>
              <div>
                <p className="text-sm font-extrabold text-stone-900 dark:text-stone-100">Languages Supported</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">Give and receive in your own language.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── CTA row — only shown when NOT logged in ── */}
        {!user && (
          <div className="flex flex-wrap items-center gap-4 mt-12">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-extrabold text-sm text-white
                         shadow-md hover:opacity-90 active:scale-95 transition-all duration-200"
              style={{ background: TERRACOTTA }}
            >
              Join as Donor <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/requests"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-extrabold text-sm
                         border border-[#e5e2d5] dark:border-stone-700
                         text-stone-700 dark:text-stone-300
                         hover:border-[#b04a15]/40 hover:text-[#b04a15]
                         transition-all duration-200"
            >
              Browse Requests <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
