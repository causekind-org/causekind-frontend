"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
  Languages,
} from "lucide-react";
import { getPlatformStats, type PlatformStats } from "@/lib/api";

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
  return (
    <motion.div
      className="relative group h-full"
      initial={{ opacity: 0, rotateY: -20, y: 24 }}
      whileInView={{ opacity: 1, rotateY: 0, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        type: "spring",
        stiffness: 70,
        damping: 18,
        delay: delay / 1000,
      }}
      whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
    >
      <div
        className={`h-full rounded-2xl border border-[#e5e2d5]/60 dark:border-stone-800
                   bg-white dark:bg-zinc-900 overflow-hidden flex flex-row
                   hover:shadow-xl transition-shadow duration-300 cursor-default`}
      >
        {/* Integrated left accent stripe */}
        <div
          className="w-[3px] shrink-0"
          style={{ background: accent }}
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
    </motion.div>
  );
}

/* ─── Trust signal station ──────────────────────────────────────────── */
function TrustSignalStation({
  icon: Icon,
  value,
  suffix,
  label,
  caption,
  color,
  progress,
  index,
  delay,
  start,
}: {
  icon: React.ElementType;
  value: number;
  suffix?: string;
  label: string;
  caption: string;
  color: string;
  progress: number;
  index: number;
  delay: number;
  start: boolean;
}) {
  const count = useCountUp(value, 1400, start);
  const reduceMotion = useReducedMotion();
  const station = String(index + 1).padStart(2, "0");

  return (
    <motion.div
      className="group relative min-h-[168px] px-1 pb-1 pl-7 sm:pl-1 xl:pr-5"
      initial={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 20 }
      }
      animate={
        start
          ? reduceMotion
            ? { opacity: 1 }
            : { opacity: 1, y: 0 }
          : undefined
      }
      transition={{ type: "spring", stiffness: 110, damping: 20, delay: delay / 1000 }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
    >
      <div
        aria-hidden="true"
        className="absolute bottom-1 left-3 top-6 w-px bg-gradient-to-b from-transparent via-stone-300 to-transparent sm:hidden dark:via-stone-700"
      />
      {index < 3 && (
        <div
          aria-hidden="true"
          className="absolute right-2 top-8 hidden h-24 w-px rotate-6 bg-gradient-to-b from-transparent via-stone-300/80 to-transparent xl:block dark:via-stone-700/80"
        />
      )}

      <div className="relative flex items-center gap-3">
        <div
          className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${color} ${progress * 3.6}deg, ${color}1f 0deg)`,
          }}
        >
          <span className="absolute inset-1 rounded-full bg-[#faf8f5] dark:bg-zinc-950" />
          <span
            className="absolute inset-2.5 rounded-full"
            style={{ background: `${color}12` }}
          />
          <Icon className="relative h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-stone-400 dark:text-stone-500">
            Signal {station}
          </p>
          <p
            className="mt-0.5 text-[11px] font-black uppercase tracking-[0.14em]"
            style={{ color }}
          >
            {label}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <span
          className="font-black tabular-nums leading-none text-4xl lg:text-5xl"
          style={{ color, fontFamily: "var(--font-roboto-mono)" }}
        >
          {count.toLocaleString("en-IN")}
          {suffix}
        </span>
      </div>

      <p className="mt-3 max-w-[17rem] text-xs font-semibold leading-relaxed text-stone-500 dark:text-stone-400">
        {caption}
      </p>

      <div className="mt-4 flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <div className="h-px flex-1 bg-stone-200 dark:bg-stone-800">
          <motion.div
            className="h-px origin-left"
            style={{ background: color }}
            initial={{ scaleX: 0 }}
            animate={start ? { scaleX: progress / 100 } : undefined}
            transition={{ duration: reduceMotion ? 0 : 0.9, delay: (delay + 220) / 1000, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <motion.div
          aria-hidden="true"
          className="grid grid-cols-4 gap-1"
          initial={{ opacity: 0 }}
          animate={start ? { opacity: 1 } : undefined}
          transition={{ delay: (delay + 420) / 1000 }}
        >
          {[0, 1, 2, 3].map((tick) => (
            <span
              key={tick}
              className="block h-2.5 w-px"
              style={{ background: tick < Math.ceil(progress / 25) ? color : `${color}33` }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Category pill with slide-in animation ─────────────────────────── */
function CategoryPill({
  icon: Icon,
  label,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-zinc-900
                 border border-[#e5e2d5]/60 dark:border-stone-800 shadow-sm cursor-default"
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        type: "spring",
        stiffness: 80,
        damping: 18,
        delay: delay / 1000,
      }}
      whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", transition: { duration: 0.15 } }}
    >
      <Icon className="w-4 h-4 text-[#b04a15]" />
      <span className="text-sm font-bold text-stone-700 dark:text-stone-300">{label}</span>
    </motion.div>
  );
}

/* ─── Main exported section ─────────────────────────────────────────── */
export function BeTheChangeSection() {
  const { ref: statsRef, inView: statsInView } = useInView(0.3);
  const { user } = useAuth();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    getPlatformStats().then(setPlatformStats).catch(() => {});
  }, []);

  // Below this combined-activity threshold, real counters would mostly read "0" and
  // undercut the trust message this section is making — show static platform facts
  // instead, then flip to live counters automatically once there's real traction.
  const TRACTION_THRESHOLD = 15;
  const totalActivity =
    (platformStats?.activeCampaigns ?? 0) +
    (platformStats?.totalDonations ?? 0) +
    (platformStats?.uniqueDonors ?? 0);
  const hasTraction = totalActivity >= TRACTION_THRESHOLD;

  const LIVE_STATS = [
    {
      value: platformStats?.activeCampaigns ?? 0,
      suffix: "",
      label: "Active Campaigns",
      caption: "Verified causes currently open for support.",
      color: TERRACOTTA,
      icon: Heart,
      progress: 78,
    },
    {
      value: platformStats?.totalDonations ?? 0,
      suffix: "+",
      label: "Verified Handovers",
      caption: "Completed donations with traceable confirmation.",
      color: INK,
      icon: CheckCircle,
      progress: 68,
    },
    {
      value: platformStats?.uniqueDonors ?? 0,
      suffix: "+",
      label: "Donors Joined",
      caption: "People helping nearby families directly.",
      color: TERRACOTTA,
      icon: Users,
      progress: 74,
    },
    {
      value: 10,
      suffix: " km",
      label: "Local Radius",
      caption: "Nearby matches are prioritized first.",
      color: INK,
      icon: MapPin,
      progress: 82,
    },
  ];

  const PROMISE_STATS = [
    {
      value: 100,
      suffix: "%",
      label: "Admin-Verified",
      caption: "Every public request is reviewed before it reaches donors.",
      color: TERRACOTTA,
      icon: Shield,
      progress: 100,
    },
    {
      value: 10,
      suffix: " km",
      label: "Match Radius",
      caption: "Local donor and donee connections come first.",
      color: INK,
      icon: MapPin,
      progress: 82,
    },
    {
      value: 6,
      suffix: "",
      label: "Cause Categories",
      caption: "Support across medical, education, livelihood, and more.",
      color: TERRACOTTA,
      icon: Package,
      progress: 72,
    },
    {
      value: 14,
      suffix: "",
      label: "Languages Supported",
      caption: "Designed for donors and donees across India.",
      color: INK,
      icon: Languages,
      progress: 88,
    },
  ];

  const STATS = hasTraction ? LIVE_STATS : PROMISE_STATS;

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
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#faf8f5]/75 via-transparent to-[#faf8f5]/85 dark:from-zinc-950/80 dark:via-transparent dark:to-zinc-950/90" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10">

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
        <div className="flex flex-wrap gap-3 mb-16">
          {categories.map((c, i) => (
            <CategoryPill
              key={c.label}
              icon={c.icon}
              label={c.label}
              delay={i * 80}
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

        {/* ── Trust signal rail ── */}
        <div
          ref={statsRef}
          className="relative border-y border-stone-200/80 py-6 dark:border-stone-800"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">
              CauseKind trust signals
            </p>
            <div className="h-px min-w-24 flex-1 bg-gradient-to-r from-stone-200 via-stone-200 to-transparent dark:from-stone-800 dark:via-stone-800" />
          </div>
          <div
            aria-hidden="true"
            className="absolute left-4 right-4 top-[6rem] hidden h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent xl:block dark:via-stone-700"
          />
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
            {STATS.map((s, i) => (
              <TrustSignalStation
                key={s.label}
                icon={s.icon}
                value={s.value}
                suffix={s.suffix}
                label={s.label}
                caption={s.caption}
                color={s.color}
                progress={s.progress}
                index={i}
                delay={i * 120}
                start={statsInView}
              />
            ))}
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
