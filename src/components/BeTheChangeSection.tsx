"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useMotionValue, useAnimationFrame, useScroll, useSpring } from "framer-motion";
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

/* ─── Mobile rail geometry ───────────────────────────────────────────────
   The connector line must begin and end exactly at the FIRST and LAST icon
   centres, so its width is derived from these — never re-typed. With `w-max`
   on the rail, 100% is the full content width; the last item starts at
   (content − RAIL_ITEM_W) and its icon centre is +RAIL_ICON/2 from there, so
   first-centre → last-centre is precisely 100% − RAIL_ITEM_W. */
const RAIL_ITEM_W = 236;   // px — mobile rail item width
const RAIL_ICON = 32;      // px — the h-8 w-8 icon circle
/** Flex gap, applied inline rather than as `gap-6` so the auto-scroll step
 *  (RAIL_ITEM_W + RAIL_GAP) provably lands on a snap point. A Tailwind class
 *  here would be a second copy of the same number, free to drift. */
const RAIL_GAP = 24;       // px
/** Auto-advance cadence, and how long a user's own swipe suppresses it. */
const RAIL_AUTOSCROLL_MS = 5000;
const RAIL_RESUME_MS = 9000;
/** Gradient shared with the desktop SVG path, so both tell the same story. */
const RAIL_GRADIENT = `linear-gradient(90deg, ${TERRACOTTA}, ${INK}, ${TERRACOTTA})`;

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
        className={`absolute w-48 -translate-x-1/2 rounded-xl bg-white/95 dark:bg-zinc-950/95 backdrop-blur-[2px] px-3 py-2 text-center ${
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
    <div className="shrink-0 snap-start" style={{ width: RAIL_ITEM_W }}>
      {/* `direction="none"` keeps the fade but drops Reveal's 28px vertical
          travel: the connector is static, so a rising icon would visibly cross
          empty space before landing on the line. */}
      <Reveal delay={index * 60} className="relative pl-9" direction="none">
        <span
          className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full border-2 bg-white dark:bg-zinc-900"
          style={{ borderColor: accent, color: accent }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-extrabold text-stone-900 dark:text-white leading-snug">{title}</h3>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">{desc}</p>
      </Reveal>
    </div>
  );
}

function TrustJourney({ items }: { items: JourneyItem[] }) {
  const pathRef = useRef<SVGPathElement>(null);
  const reduceMotion = useReducedMotion();

  // Mobile rail: the connector's bright layer tracks how far through the rail
  // the user has swiped. Sits at 0 until they move, and degrades harmlessly to
  // a permanent 0 if the content ever stops overflowing.
  const railRef = useRef<HTMLDivElement>(null);
  const { scrollXProgress } = useScroll({ container: railRef, axis: "x" });
  const fill = useSpring(scrollXProgress, { stiffness: 220, damping: 34 });

  /* ── Auto-advance the mobile rail ──────────────────────────────────────
     Driven by scrolling the real container, NOT by converting the rail into
     an index-based carousel. Everything else here depends on it staying a
     genuine scroll container: the connector's bright layer is bound to
     `scrollXProgress`, and scroll-snap is what makes a swipe feel right. */

  // A user's own swipe wins. Their scroll suppresses auto-advance, and the
  // timer restarts only after they have been idle — so it can never yank the
  // rail out from under someone mid-read.
  const [autoPaused, setAutoPaused] = useState(false);
  const resumeTimer = useRef<number | null>(null);
  const yieldToUser = useCallback(() => {
    setAutoPaused(true);
    if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setAutoPaused(false), RAIL_RESUME_MS);
  }, []);
  useEffect(() => () => {
    if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
  }, []);

  // Off-screen it must not run at all: otherwise the rail quietly scrolls to
  // its end while nobody is looking, and the user arrives at a carousel that
  // has already played.
  const [railInView, setRailInView] = useState(false);
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setRailInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // An auto-playing carousel is precisely what this setting asks us not to do.
    if (reduceMotion || autoPaused || !railInView) return;
    const id = window.setInterval(() => {
      const el = railRef.current;
      if (!el) return;
      const maxLeft = el.scrollWidth - el.clientWidth;
      if (maxLeft <= 1) return;   // content no longer overflows — nothing to do
      const atEnd = el.scrollLeft >= maxLeft - 1;
      el.scrollTo({
        // Smooth rewind rather than an instant jump: the connector's fill is
        // bound to scroll position, so a hard jump would snap it too.
        left: atEnd ? 0 : Math.min(el.scrollLeft + RAIL_ITEM_W + RAIL_GAP, maxLeft),
        behavior: "smooth",
      });
    }, RAIL_AUTOSCROLL_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, autoPaused, railInView]);

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
    <div className="relative mb-0 lg:mb-8">
      {/* Desktop — same width as the header/pills above, so it lines up exactly */}
      <div className="relative hidden h-[255px] w-full lg:block">
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

      {/* Mobile — ONE horizontal rail instead of six stacked rows.
           Six full-width rows ran to roughly 700px of scroll; as a swipeable
           rail the same content costs one row's height. The negative margins
           cancel the section's px-6 / sm:px-10 so the rail bleeds to the screen
           edge and reads as scrollable, while the matching padding keeps the
           first card aligned with the heading above it.
           The vertical connector line is gone with the stack — a rule down the
           left of a horizontal rail would point at nothing. */}
      <div className="lg:hidden -mx-6 px-6 sm:-mx-10 sm:px-10">
        {/* Scroll CONTAINER. Snap properties belong here, on the element that
            actually scrolls — moving them inward silently disables snapping. */}
        <div
          ref={railRef}
          className="snap-x snap-mandatory overflow-x-auto pb-2 scrollbar-hide"
          // Pointer covers touch and mouse; `onFocusCapture` catches a keyboard
          // user tabbing into a card. Deliberately NOT onScroll — the
          // auto-advance scrolls too, and would pause itself forever.
          onPointerDown={yieldToUser}
          onFocusCapture={yieldToUser}
        >
          {/* Scroll CONTENT. The connector lives here, not on the container:
              absolute positioning inside an `overflow` element anchors to its
              padding box, so the line would hang still while the items slid
              underneath it. `w-max` makes 100% mean the full content width. */}
          <div className="relative flex w-max items-start" style={{ gap: RAIL_GAP }}>
            {/* Connector — first child, so each item's bg-white icon circle
                paints OVER it and the points read as stations on a line. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute h-px"
              style={{
                left: RAIL_ICON / 2,
                top: RAIL_ICON / 2,
                width: `calc(100% - ${RAIL_ITEM_W}px)`,
              }}
            >
              {/* 1 — the track always exists */}
              <span className="absolute inset-0 bg-stone-200 dark:bg-stone-800" />

              {/* 2 — "here is the path": draws in once when scrolled into view */}
              <motion.span
                className="absolute inset-0 origin-left opacity-35"
                style={{ background: RAIL_GRADIENT }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.05 }}
                transition={{ duration: reduceMotion ? 0 : 1.4, ease: "easeInOut" }}
              />

              {/* 3 — "how far you've come": bound to the rail's own scroll.
                  This is a response to user input, not an animation played at
                  the user, so it survives prefers-reduced-motion. */}
              <motion.span
                className="absolute inset-0 origin-left"
                style={{ background: RAIL_GRADIENT, scaleX: fill }}
              />

              {/* 4 — the travelling dot. `left`, not `x`: a percentage on `x`
                  resolves against the element's OWN width, which would move a
                  7px dot by 7px. */}
              {!reduceMotion && (
                <motion.span
                  className="absolute top-1/2 h-[7px] w-[7px] rounded-full"
                  style={{ background: TERRACOTTA, translateX: "-50%", translateY: "-50%" }}
                  animate={{ left: ["0%", "100%"] }}
                  transition={{ duration: 4.2, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6, delay: 1.2 }}
                />
              )}
            </div>

            {items.map((item, i) => (
              <JourneyNodeMobile key={item.title} {...item} index={i} />
            ))}
          </div>
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
      className="group relative min-h-[128px] rounded-2xl border border-stone-200/70 bg-white/70 p-3
                 dark:border-stone-800 dark:bg-zinc-900/40
                 xl:min-h-[105px] xl:rounded-none xl:border-0 xl:bg-transparent xl:px-1 xl:pb-1 xl:pl-1 xl:pr-5"
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
      {index < 3 && (
        <div
          aria-hidden="true"
          className="absolute right-2 top-8 hidden h-24 w-px rotate-6 bg-gradient-to-b from-transparent via-stone-300/80 to-transparent xl:block dark:via-stone-700/80"
        />
      )}

      <div className="relative flex items-center gap-2 xl:gap-3">
        <div
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full xl:h-12 xl:w-12"
          style={{
            background: `conic-gradient(${color} ${progress * 3.6}deg, ${color}1f 0deg)`,
          }}
        >
          <span className="absolute inset-1 rounded-full bg-white dark:bg-zinc-950" />
          <span
            className="absolute inset-2 rounded-full xl:inset-2.5"
            style={{ background: `${color}12` }}
          />
          <Icon className="relative h-4 w-4 xl:h-5 xl:w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-stone-400 xl:tracking-[0.28em] dark:text-stone-500">
            Signal {station}
          </p>
          <p
            className="mt-0.5 line-clamp-2 text-[10px] font-black uppercase leading-tight tracking-[0.06em] xl:line-clamp-none xl:text-[11px] xl:tracking-[0.14em]"
            style={{ color }}
          >
            {label}
          </p>
        </div>
      </div>

      <div className="mt-2 xl:mt-3">
        <span
          className="block whitespace-nowrap font-black tabular-nums leading-none text-[20px] xl:text-3xl"
          style={{ color, fontFamily: "var(--font-roboto-mono)" }}
        >
          {count.toLocaleString("en-IN")}
          {suffix}
        </span>
      </div>

      <p className="mt-1.5 line-clamp-3 text-[10.5px] font-semibold leading-[1.3] text-stone-500 xl:mt-3 xl:line-clamp-none xl:max-w-[17rem] xl:text-xs xl:leading-relaxed dark:text-stone-400">
        {caption}
      </p>

      <div className="mt-2.5 flex items-center gap-2 xl:mt-4 xl:gap-2.5">
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
          className="hidden grid-cols-4 gap-1 xl:grid"
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
      className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-zinc-900
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
      <Icon className="w-3.5 h-3.5 text-[#b04a15]" />
      <span className="text-[13px] font-bold text-stone-700 dark:text-stone-300">{label}</span>
    </motion.div>
  );
}

/* ─── Main exported section ─────────────────────────────────────────── */
export function BeTheChangeSection({
  initialStats,
  /**
   * Mobile only: tuck the white panel under the Hero's rounded lower edge.
   * Passed by the caller ONLY when the two are direct visual neighbours — it is
   * never inferred from sibling order, so enabling FEATURES.money (which puts
   * the Campaigns rail between them) cannot silently produce a bad overlap.
   */
  overlapHero = false,
}: { initialStats?: PlatformStats | null; overlapHero?: boolean } = {}) {
  const { ref: statsRef, inView: statsInView } = useInView(0.3);
  const { user } = useAuth();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(initialStats ?? null);

  useEffect(() => {
    if (!initialStats) {
      getPlatformStats().then(setPlatformStats).catch(() => {});
    }
  }, [initialStats]);

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
      // `isolate` is load-bearing, not decoration. This section's inner
      // container carries `relative z-10`; without a stacking context here that
      // inner value escapes into the composition wrapper, ties with the Hero,
      // and — being later in the DOM — paints the white panel OVER the image.
      // Isolating traps every inner z-index below the Hero's z-20.
      className={`relative w-full overflow-hidden pb-6 lg:bg-white lg:py-9 dark:lg:bg-zinc-950 ${
        overlapHero ? "ck-hero-overlap isolate z-10" : "pt-6"
      }`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block bg-gradient-to-b from-white/75 via-transparent to-white/85 dark:from-zinc-950/80 dark:via-transparent dark:to-zinc-950/90" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10">

        {/* ── Elevated content surface (MOBILE ONLY).
             Holds the heading, pills and Trust Journey, and ends deliberately
             right after them. Trust Signals and the CTA fall outside it and sit
             on the homepage background from HomeClient.
             Full-bleed via -mx/px rather than an inset card: TrustJourney's rail
             cancels `px-6` to reach the screen edge, so an extra layer of
             horizontal padding here would leave it short of the edge.
             Every property is reset at `lg`, where the section itself is the
             white surface again. ── */}
        <div
          className={`-mx-6 rounded-b-[1.75rem] bg-white px-6 pb-6 sm:-mx-10 sm:px-10
                     dark:bg-zinc-900
                     lg:mx-0 lg:rounded-none lg:bg-transparent lg:px-0 lg:pb-0 dark:lg:bg-transparent ${
                       // Square top on purpose. A rounded cap reads as a panel
                       // sitting ON the image; underlapping, the top edge is
                       // hidden behind the Hero and must never draw a curve
                       // across it.
                       overlapHero ? "ck-hero-overlap-panel" : ""
                     }`}
        >

          {/* ── Section header — LEFT flush, asymmetric ── */}
          <div className="grid lg:grid-cols-[1fr_auto] gap-5 items-end mb-6">
            <div>
              <span
                className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-2.5"
                style={{ background: `${TERRACOTTA}18`, color: TERRACOTTA }}
              >
                Be the change
              </span>
              <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-[1.05]">
                Making giving{" "}
                <span style={{ color: TERRACOTTA }}>safe, local</span>
                {" "}and{" "}
                <span style={{ color: INK }}>verified</span>
              </h2>
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400 font-medium leading-relaxed max-w-xs lg:text-right lg:pb-1">
              CauseKind connects donors with verified local donees across India — every handover is traceable and meaningful.
            </p>
          </div>

          {/* ── Category pills (slide-in from left) ── */}
          <div className="flex flex-wrap gap-2 mb-10">
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

        </div>{/* ── end elevated surface ── */}

        {/* ── Trust signal rail — outside the surface on mobile, on the page bg.
             `mt-5` is the controlled 20px gap below the white surface. ── */}
        <div
          ref={statsRef}
          className="relative mt-5 py-0 lg:mt-0 lg:border-y lg:border-stone-200/80 lg:py-4 dark:lg:border-stone-800"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500">
              CauseKind trust signals
            </p>
            <div className="h-px min-w-24 flex-1 bg-gradient-to-r from-stone-200 via-stone-200 to-transparent dark:from-stone-800 dark:via-stone-800" />
          </div>
          <div
            aria-hidden="true"
            className="absolute left-4 right-4 top-[6rem] hidden h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent xl:block dark:via-stone-700"
          />
          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4 xl:gap-x-3.5 xl:gap-y-5">
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
          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-extrabold text-[13px] text-white
                         shadow-md hover:opacity-90 active:scale-95 transition-all duration-200"
              style={{ background: TERRACOTTA }}
            >
              Join as Donor <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/requests"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-extrabold text-[13px]
                         border border-[#e5e2d5] dark:border-stone-700
                         text-stone-700 dark:text-stone-300
                         hover:border-[#b04a15]/40 hover:text-[#b04a15]
                         transition-all duration-200"
            >
              Browse Requests <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
