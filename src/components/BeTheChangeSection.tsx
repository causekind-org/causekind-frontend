"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
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
      {/* Left accent stripe — animates separately after card flips in */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl card-stripe-pop"
        style={{
          background: accent,
          animationDelay: `${delay + 280}ms`,
          animationDuration: "0.5s",
        }}
      />

      <div
        className={`h-full rounded-2xl border p-6 flex flex-col gap-4 bg-white dark:bg-zinc-900
                   border-[#e5e2d5]/60 dark:border-stone-800 pl-7
                   hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default
                   ${size === "large" ? "justify-between" : ""}`}
      >
        {/* Icon */}
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
        {/* Accent dot */}
        <span
          className="w-2 h-2 rounded-full self-end"
          style={{ background: accent, opacity: 0.4 }}
        />
      </div>
    </div>
  );
}

/* ─── Animated stat counter ─────────────────────────────────────────── */
function StatCounter({
  value,
  suffix,
  label,
  color,
  start,
}: {
  value: number;
  suffix?: string;
  label: string;
  color: string;
  start: boolean;
}) {
  const count = useCountUp(value, 1800, start);
  return (
    <div className="flex flex-col">
      <span className="text-4xl lg:text-5xl font-black tabular-nums leading-none" style={{ color }}>
        {count.toLocaleString("en-IN")}
        {suffix}
      </span>
      <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mt-2">
        {label}
      </span>
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
      desc: "Donors and donees within 10–25 km are matched first — ensuring your donation reaches the closest family in need.",
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

        {/* ── Animated counters — LEFT-BORDER OFFSET STRIP ── */}
        <div
          ref={statsRef}
          className="rounded-3xl border border-[#e5e2d5]/60 dark:border-stone-800
                     bg-white dark:bg-zinc-900
                     shadow-lg shadow-stone-900/5 overflow-hidden
                     grid lg:grid-cols-[auto_1fr] items-stretch"
        >
          {/* Thick left terracotta accent bar */}
          <div className="hidden lg:block w-2 bg-[#b04a15]" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-[#e5e2d5]/60 dark:divide-stone-800">
            <div className="px-8 py-10">
              <StatCounter value={14}   suffix="+"  label="Languages Supported"   color={TERRACOTTA} start={statsInView} />
            </div>
            <div className="px-8 py-10">
              <StatCounter value={500}  suffix="+"  label="In-Kind Items Listed"   color={INK}        start={statsInView} />
            </div>
            <div className="px-8 py-10">
              <StatCounter value={25}         label="KM Local Radius"             color={TERRACOTTA} start={statsInView} />
            </div>
            <div className="px-8 py-10">
              <StatCounter value={100} suffix="%" label="Verified Handovers"      color={INK}        start={statsInView} />
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
