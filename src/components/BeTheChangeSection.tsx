"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useMotionValue, useAnimationFrame } from "framer-motion";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
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
import { ALL_REQUEST_CATEGORIES } from "@/lib/categoryVisuals";
import { locales } from "@/i18n/config";
import { MATCH_RADIUS_KM } from "@/lib/constants";

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

/* ─── Trust journey — an animated connecting path instead of a card grid ── */
type JourneyItem = { icon: React.ElementType; title: string; desc: string; accent: string; delay: number };

const JOURNEY_PATH_D =
  "M100,100 C200,100 200,320 300,320 C400,320 400,100 500,100 C600,100 600,320 700,320 C800,320 800,100 900,100 C1000,100 1000,320 1100,320";

const NODE_LAYOUT: { xPct: number; yPct: number; label: "above" | "below" }[] = [
  { xPct: 8.33,  yPct: 23.8, label: "below" },
  { xPct: 25,    yPct: 76.2, label: "above" },
  { xPct: 41.67, yPct: 23.8, label: "below" },
  { xPct: 58.33, yPct: 76.2, label: "above" },
  { xPct: 75,    yPct: 23.8, label: "below" },
  { xPct: 91.67, yPct: 76.2, label: "above" },
];

function JourneyNode({
  icon: Icon, title, desc, accent, index, xPct, yPct, label,
}: JourneyItem & { index: number; xPct: number; yPct: number; label: "above" | "below" }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: `${xPct}%`, top: `${yPct}%` }}
      initial={{ opacity: 0, scale: 0.7 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ type: "spring", stiffness: 120, damping: 16, delay: index * 0.12 }}
    >
      {/* Marker is pinned exactly to the path point, independent of text length */}
      <span
        className="absolute grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-white dark:bg-zinc-900 shadow-sm"
        style={{ borderColor: accent, color: accent }}
      >
        <Icon className="h-5 w-5" />
      </span>
      {/* Text hangs off the marker and always grows toward the container's vertical center,
          so it can never push past the top/bottom edge of the journey block */}
      <div
        className={`absolute w-48 -translate-x-1/2 rounded-xl bg-[#faf8f5]/95 dark:bg-zinc-950/95 backdrop-blur-[2px] px-3 py-2 text-center ${
          label === "below" ? "top-9" : "bottom-9"
        }`}
      >
        <h3 className="text-sm font-extrabold text-stone-900 dark:text-white leading-snug">{title}</h3>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

function JourneyNodeMobile({ icon: Icon, title, desc, accent, index }: JourneyItem & { index: number }) {
  return (
    <Reveal delay={index * 90} className="relative pl-9">
      <span
        className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full border-2 bg-white dark:bg-zinc-900"
        style={{ borderColor: accent, color: accent }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="text-sm font-extrabold text-stone-900 dark:text-white leading-snug">{title}</h3>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">{desc}</p>
    </Reveal>
  );
}

function TrustJourney({ items }: { items: JourneyItem[] }) {
  const pathRef = useRef<SVGPathElement>(null);
  const reduceMotion = useReducedMotion();

  // Drives the traveling dot exactly along the curve (getPointAtLength), not a straight-line
  // interpolation between node coordinates — otherwise it visibly cuts corners off the wave.
  const dotCx = useMotionValue(0);
  const dotCy = useMotionValue(0);
  const dotProgress = useRef(0);
  const totalLen = useRef<number | null>(null);

  useAnimationFrame((_, delta) => {
    if (reduceMotion || !pathRef.current) return;
    if (totalLen.current == null) totalLen.current = pathRef.current.getTotalLength();
    const total = totalLen.current;
    dotProgress.current = (dotProgress.current + delta * (total / 9000)) % total;
    const pt = pathRef.current.getPointAtLength(dotProgress.current);
    dotCx.set(pt.x);
    dotCy.set(pt.y);
  });

  return (
    <div className="relative mb-16">
      {/* Desktop — same width as the header/pills above, so it lines up exactly */}
      <div className="relative hidden h-[420px] w-full lg:block">
        <svg viewBox="0 0 1200 420" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="journey-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={TERRACOTTA} />
              <stop offset="50%" stopColor={INK} />
              <stop offset="100%" stopColor={TERRACOTTA} />
            </linearGradient>
          </defs>
          <path ref={pathRef} d={JOURNEY_PATH_D} fill="none" strokeWidth={2} className="stroke-stone-200 dark:stroke-stone-800" />
          <motion.path
            d={JOURNEY_PATH_D}
            fill="none"
            stroke="url(#journey-gradient)"
            strokeWidth={2.5}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: reduceMotion ? 0 : 1.8, ease: "easeInOut" }}
          />
          {!reduceMotion && (
            <motion.circle r={5} fill="url(#journey-gradient)" style={{ cx: dotCx, cy: dotCy }} />
          )}
        </svg>
        {items.map((item, i) => (
          <JourneyNode key={item.title} {...item} index={i} xPct={NODE_LAYOUT[i].xPct} yPct={NODE_LAYOUT[i].yPct} label={NODE_LAYOUT[i].label} />
        ))}
      </div>

      {/* Mobile — vertical stack, same idea without the horizontal path */}
      <div className="relative lg:hidden">
        <div aria-hidden="true" className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-stone-200 via-stone-300 to-transparent dark:from-stone-800 dark:via-stone-700" />
        <div className="space-y-8">
          {items.map((item, i) => (
            <JourneyNodeMobile key={item.title} {...item} index={i} />
          ))}
        </div>
      </div>
    </div>
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

  // Derived from real sources, not hardcoded: categories from the shared
  // category list, languages from the i18n locale registry, radius from the
  // shared matching constant. "100% admin-verified" is a policy statement.
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
      value: MATCH_RADIUS_KM,
      suffix: " km",
      label: "Match Radius",
      caption: "Local donor and donee connections come first.",
      color: INK,
      icon: MapPin,
      progress: 82,
    },
    {
      value: ALL_REQUEST_CATEGORIES.length,
      suffix: "",
      label: "Cause Categories",
      caption: "Support across medical, education, livelihood, and more.",
      color: TERRACOTTA,
      icon: Package,
      progress: 72,
    },
    {
      value: locales.length,
      suffix: "",
      label: "Languages Supported",
      caption: "Designed for donors and donees across India.",
      color: INK,
      icon: Languages,
      progress: 88,
    },
  ];

  const STATS = hasTraction ? LIVE_STATS : PROMISE_STATS;

  const cards: JourneyItem[] = [
    {
      icon: Shield,
      title: "Every listing is admin-verified",
      desc: "No unvetted requests reach donors. Each campaign, item request, and donee profile is reviewed before it goes live.",
      accent: TERRACOTTA,
      delay: 0,
    },
    {
      icon: MapPin,
      title: "Hyper-local matching engine",
      desc: "Donors and donees within 10 km are matched first, so your donation reaches the closest family in need.",
      accent: INK,
      delay: 100,
    },
    {
      icon: Handshake,
      title: "Direct person-to-person handover",
      desc: "No middlemen. Items and aid move directly from donor to donee, fully traceable with handover certificates.",
      accent: TERRACOTTA,
      delay: 200,
    },
    {
      icon: Users,
      title: "Community-first approach",
      desc: "Built around local communities, growing a trusted network of giving across India.",
      accent: INK,
      delay: 300,
    },
    {
      icon: Package,
      title: "In-kind donations that matter",
      desc: "From school supplies to medical equipment, real items for real needs, not just cash that loses touch with impact.",
      accent: TERRACOTTA,
      delay: 400,
    },
    {
      icon: CheckCircle,
      title: "Impact certificates issued",
      desc: "Every completed handover generates a digital certificate, proof of your generosity for tax, audit, or your own pride.",
      accent: INK,
      delay: 500,
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

        {/* ── Trust journey — an animated connecting path, no card containers ── */}
        <TrustJourney items={cards} />

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
