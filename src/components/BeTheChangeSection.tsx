"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion, useMotionValue, useMotionTemplate, useAnimationFrame, useScroll, useSpring } from "framer-motion";
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
  Play,
  ChevronDown,
} from "lucide-react";
import { getPlatformStats, type PlatformStats } from "@/lib/api";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
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
const RAIL_AUTOSCROLL_MS = 2500;
const RAIL_RESUME_MS = 4000;
/** Gradient shared with the desktop SVG path, so both tell the same story. */
/** How many category pills to show before collapsing the rest into "+N more". */
const PILL_LIMIT = 6;
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
  /** True while the auto-advance's own smooth scroll is still in flight. */
  const programmatic = useRef(false);

  /**
   * The current leg of the journey — the ONE number the rail's scroll target and
   * the travelling dot both read.
   *
   * <p>The dot used to run its own 4.2s loop with nothing tying it to the 2.5s
   * auto-advance, so it arrived and restarted at arbitrary moments relative to
   * the rail stepping forward. Driving both from `step` makes the dot a genuine
   * countdown for the next advance, and makes drift impossible rather than
   * merely tuned away.
   *
   * <p>Deriving the scroll target from `step` rather than from `scrollLeft` also
   * fixes a latent problem: near the end the rail clamps at `maxLeft` and stops
   * moving, so `scrollLeft` can no longer say which card is current.
   */
  const LEGS = Math.max(1, items.length - 1);        // 6 stations -> 5 legs
  const [step, setStep] = useState(0);               // 0 .. LEGS-1
  /** Mirrors `step` for the interval, which must not depend on it: listing
   *  `step` in the effect's deps would tear down and rebuild the interval every
   *  advance, restarting the 2.5s countdown from zero each time. */
  const stepRef = useRef(0);
  /** Station `i` along the connector, which spans first icon centre -> last. */
  const stationPct = (i: number) => (i / LEGS) * 100;
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
    let settle: number | undefined;
    const id = window.setInterval(() => {
      const el = railRef.current;
      if (!el) return;
      const maxLeft = el.scrollWidth - el.clientWidth;
      if (maxLeft <= 1) return;   // content no longer overflows — nothing to do

      // The dot has just finished its 2.5s run to the next station, so move on.
      // The scroll happens OUT here, not inside a setState updater: React
      // double-invokes updaters in StrictMode, which would fire two scrolls per
      // tick in development.
      const next = (stepRef.current + 1) % LEGS;
      stepRef.current = next;
      setStep(next);

      // Claim the scroll events this is about to emit, so the rail's own
      // `onScroll` does not read them as the user taking over.
      programmatic.current = true;
      if (settle !== undefined) window.clearTimeout(settle);
      settle = window.setTimeout(() => { programmatic.current = false; }, 700);
      el.scrollTo({
        // Smooth rewind on the wrap rather than an instant jump: the connector's
        // fill is bound to scroll position, so a hard jump would snap it too.
        left: Math.min(next * (RAIL_ITEM_W + RAIL_GAP), maxLeft),
        behavior: "smooth",
      });
    }, RAIL_AUTOSCROLL_MS);
    return () => {
      window.clearInterval(id);
      // Must be cleared too — a settle firing after unmount would touch a ref
      // belonging to a dead component.
      if (settle !== undefined) window.clearTimeout(settle);
    };
  }, [reduceMotion, autoPaused, railInView]);

  // The dot holds position whenever the advance itself is not running, so the
  // countdown never keeps ticking against a rail that is standing still.
  const dotPaused = autoPaused || !railInView;

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
          // `scroll`, not `pointerdown`. Pointer-down fired for ANY touch landing
          // on the rail — including a finger merely starting a vertical page
          // scroll — so ordinary browsing kept suppressing the auto-advance.
          // Scroll is the only event that means the rail itself actually moved;
          // the `programmatic` guard is what stops the auto-advance's own scroll
          // from pausing itself forever, which is why this was avoided before.
          onScroll={() => {
            if (programmatic.current) return;
            // Resync, or the next tick would scroll back to a stale `step` and
            // yank the rail out from under the swipe that just happened.
            const el = railRef.current;
            if (el) {
              const at = Math.max(0, Math.min(LEGS - 1,
                Math.round(el.scrollLeft / (RAIL_ITEM_W + RAIL_GAP))));
              stepRef.current = at;
              setStep(at);
            }
            yieldToUser();
          }}
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

              {/* 4 — the travelling dot, which IS the countdown to the next
                  advance: it covers exactly one leg in RAIL_AUTOSCROLL_MS, and
                  the rail steps forward as it lands.

                  `left`, not `x`: a percentage on `x` resolves against the
                  element's OWN width, which would move a 7px dot by 7px.

                  `key={step}` remounts it each leg, so the wrap back to the
                  first station jumps rather than sweeping backwards across the
                  whole line.

                  `linear`, not `easeInOut`: this is elapsed time now, and a
                  timer that slows at both ends does not read as elapsed time. */}
              {!reduceMotion && (
                <motion.span
                  key={step}
                  className="absolute top-1/2 h-[7px] w-[7px] rounded-full"
                  style={{ background: TERRACOTTA, translateX: "-50%", translateY: "-50%" }}
                  initial={{ left: `${stationPct(step)}%` }}
                  animate={{ left: `${dotPaused ? stationPct(step) : stationPct(step + 1)}%` }}
                  transition={{ duration: dotPaused ? 0 : RAIL_AUTOSCROLL_MS / 1000, ease: "linear" }}
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

/* ─── Trust signal matrix ────────────────────────────────────────────────
   The four signals are ONE instrument panel, not four tiles.

   Separation comes from dividers drawn ACROSS the grid — one vertical, one
   horizontal on mobile; three verticals on the desktop rail — never from
   per-item borders. That distinction is the whole design: four bordered cells
   read as four disconnected objects, while shared rules read as one system
   subdivided. Each metric therefore has no border, background, radius or
   shadow of its own.

   The dividers sit at fixed fractions, which is only true while the rows are
   equal height — hence `auto-rows-fr` on the mobile grid. */
function SignalMatrixDividers() {
  const reduceMotion = useReducedMotion();
  const line = "absolute bg-stone-200 dark:bg-stone-800";
  const grow = {
    viewport: { once: true, amount: 0.2 },
    transition: { duration: reduceMotion ? 0 : 0.9, ease: [0.16, 1, 0.3, 1] as const },
  };
  return (
    <>
      {/* Column split: centre on mobile, plus quarter lines on the desktop rail */}
      <motion.span
        aria-hidden="true"
        className={`${line} inset-y-0 left-1/2 w-px origin-top`}
        initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} {...grow}
      />
      <motion.span
        aria-hidden="true"
        className={`${line} inset-y-0 left-1/4 hidden w-px origin-top xl:block`}
        initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} {...grow}
      />
      <motion.span
        aria-hidden="true"
        className={`${line} inset-y-0 left-3/4 hidden w-px origin-top xl:block`}
        initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} {...grow}
      />
      {/* Row split: mobile only — the desktop rail is a single row */}
      <motion.span
        aria-hidden="true"
        className={`${line} inset-x-0 top-1/2 h-px origin-left xl:hidden`}
        initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} {...grow}
      />
    </>
  );
}

function TrustSignalMetric({
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

  /* The dial sweeps to its reading rather than appearing at it. CSS cannot
     interpolate a conic-gradient stop, so the angle is a motion value fed
     through a template — the same technique the mobile nav uses for its mask. */
  const sweep = useSpring(0, { stiffness: 55, damping: 18 });
  useEffect(() => {
    if (!start) return;
    const target = progress * 3.6;
    if (reduceMotion) sweep.jump(target);
    else sweep.set(target);
  }, [start, progress, reduceMotion, sweep]);
  const dial = useMotionTemplate`conic-gradient(${color} ${sweep}deg, ${color}1f 0deg)`;

  return (
    <motion.div
      // Padding, not gap: the dividers run at exact fractions, so the clear
      // space around them has to come from inside each cell.
      className="min-w-0 px-3.5 py-3.5 xl:px-5 xl:py-2"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={start ? (reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }) : undefined}
      transition={{ type: "spring", stiffness: 120, damping: 22, delay: delay / 1000 }}
    >
      <dt className="flex items-center gap-2.5">
        <motion.span
          className="relative grid size-9 shrink-0 place-items-center rounded-full xl:size-11"
          style={{ background: dial }}
        >
          <span className="absolute inset-[3px] rounded-full bg-white dark:bg-zinc-950" />
          <span className="absolute inset-[6px] rounded-full" style={{ background: `${color}12` }} />
          <Icon className="relative size-4 xl:size-[18px]" style={{ color }} aria-hidden />
        </motion.span>
        <span className="min-w-0">
          <span className="block text-4xs font-black uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
            Signal {station}
          </span>
          <span
            className="mt-0.5 block text-2xs font-black uppercase leading-tight tracking-[0.08em]"
            style={{ color }}
          >
            {label}
          </span>
        </span>
      </dt>

      <dd className="mt-2.5">
        <span
          className="block whitespace-nowrap font-black tabular-nums leading-none text-xl xl:text-2xl"
          style={{ color, fontFamily: "var(--font-roboto-mono)" }}
        >
          {count.toLocaleString("en-IN")}
          {suffix}
        </span>

        <p className="mt-1.5 text-xs font-semibold leading-[1.45] text-stone-500 dark:text-stone-400">
          {caption}
        </p>

        {/* Measurement track */}
        <div className="mt-3 flex items-center gap-2">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800">
            <motion.span
              className="block h-px origin-left"
              style={{ background: color }}
              initial={{ scaleX: 0 }}
              animate={start ? { scaleX: progress / 100 } : undefined}
              transition={{ duration: reduceMotion ? 0 : 0.9, delay: (delay + 220) / 1000, ease: [0.16, 1, 0.3, 1] }}
            />
          </span>
        </div>
      </dd>
    </motion.div>
  );
}

/* ─── Category pill ──────────────────────────────────────────────────────
   The `<Link>` is the OUTERMOST element and carries the padding, so the whole
   visible pill is the hit target.

   The previous version had this inverted: `motion.div` held the padding and
   background while the `<Link>` wrapped only the icon and text, so the padded
   ring around the label looked clickable and was not. It also made the link
   optional, which is how six of these ended up as inert `motion.div`s that
   merely resembled the one real link.

   `motion.div` survives purely as an entrance wrapper. It cannot be the
   interactive element, and hover/focus lift lives in CSS rather than
   `whileHover` for two reasons: `whileHover` never fires for a keyboard user,
   and a transform driven by Framer would fight the one the entrance spring is
   still settling. `transition-transform` on the link handles both states at
   once, and `motion-reduce:` opts the whole thing out. */
function CategoryPill({
  icon: Icon,
  label,
  href,
  delay,
  reduceMotion,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  delay: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        type: "spring",
        stiffness: 80,
        damping: 18,
        // Stagger is entrance choreography, not information — it goes with the
        // travel under reduced motion.
        delay: reduceMotion ? 0 : delay / 1000,
      }}
    >
      <Link
        href={href}
        // Announces the destination rather than just the category, since the
        // visible text alone ("Medical aid") does not say it is a link to a
        // board of requests.
        aria-label={`Browse ${label} requests`}
        // min-h-11 is the 44px touch floor. `active:scale-[0.97]` is the press
        // feedback that a touch device gets in place of hover.
        className="group flex min-h-11 items-center gap-1.5 rounded-full border border-[#e5e2d5]/60
                   bg-white px-3 shadow-sm transition-[transform,border-color,box-shadow] duration-150
                   hover:-translate-y-0.5 hover:border-[#b04a15]/50 hover:shadow-[0_4px_16px_rgba(176,74,21,0.14)]
                   focus-visible:-translate-y-0.5 focus-visible:border-[#b04a15]/50 focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-[#b04a15] focus-visible:ring-offset-2
                   active:scale-[0.97]
                   motion-reduce:transition-none motion-reduce:hover:translate-y-0
                   motion-reduce:focus-visible:translate-y-0 motion-reduce:active:scale-100
                   dark:border-stone-800 dark:bg-zinc-900 dark:focus-visible:ring-offset-zinc-950"
      >
        <Icon
          className="h-3.5 w-3.5 shrink-0 text-[#b04a15] transition-transform duration-150
                     group-hover:scale-110 group-focus-visible:scale-110
                     motion-reduce:transition-none motion-reduce:group-hover:scale-100
                     motion-reduce:group-focus-visible:scale-100"
          aria-hidden="true"
        />
        <span className="text-sm font-bold text-stone-700 dark:text-stone-300">{label}</span>
      </Link>
    </motion.div>
  );
}

/* ─── "Show N more" toggle ───────────────────────────────────────────────
   A button, deliberately styled apart from the pills. The old version was a
   pill-shaped `<Link>` to /requests sitting in the same row as the categories,
   so it read as a tenth category that happened to be called "3 more".

   Only rendered below `lg` — the wide layout shows all nine and has nothing to
   toggle, so the control is absent from the DOM there rather than hidden with
   a class that would leave it in the tab order. */
function MoreCategoriesToggle({
  expanded,
  count,
  controls,
  onToggle,
  buttonRef,
}: {
  expanded: boolean;
  count: number;
  controls: string;
  onToggle: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controls}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed
                 border-stone-300 px-3 text-sm font-bold text-stone-500 transition-colors
                 hover:border-[#b04a15]/50 hover:text-[#b04a15]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]
                 focus-visible:ring-offset-2
                 dark:border-stone-700 dark:text-stone-400 dark:focus-visible:ring-offset-zinc-950"
    >
      <ChevronDown
        className={`h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ${
          expanded ? "rotate-180" : ""
        }`}
        aria-hidden="true"
      />
      {expanded ? "Show fewer categories" : `Show ${count} more categories`}
    </button>
  );
}

/* ─── Trust signals + guest CTA ──────────────────────────────────────
   Split out of BeTheChangeSection so the caller can order it independently.
   It was always conceptually separate — on mobile it sits OUTSIDE the white
   panel, on the homepage background — but being welded to the end of the
   section meant the mobile tree could not put the donor/donee pathway cards
   in front of it without also breaking the hero overlap those two share.

   Still rendered inline by BeTheChangeSection by default (`trailing`), so the
   desktop tree is untouched. ── */
export function BeTheChangeTrustSignals({
  /**
   * The stats state and its fetch live here rather than in BeTheChangeSection,
   * because this block is their only consumer — the section never read
   * `platformStats` for anything else.
   */
  initialStats,
  tourAnchors = false,
  /**
   * Mobile passes false: the AudiencePathways cards now sit directly above
   * this block and already offer "Join as a donor", so a second register link
   * one scroll later is the same door twice.
   *
   * <p>Only the register link is suppressed. "Browse Requests" stays — it is
   * not a duplicate, and the Requests board is deliberately public.
   */
  showJoinCta = true,
}: {
  initialStats?: PlatformStats | null;
  tourAnchors?: boolean;
  showJoinCta?: boolean;
} = {}) {
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

  return (
    <>
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
        {/* Open signal matrix: 2x2 on mobile, a four-station rail at xl.
            `minmax(0,1fr)` (not plain `1fr`) so a long label can never push a
            column past its share and overflow the row. */}
        <div className="relative" data-tour={tourAnchors ? "guest-signals" : undefined}>
          <SignalMatrixDividers />
          <dl className="grid auto-rows-fr grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:auto-rows-auto xl:grid-cols-[repeat(4,minmax(0,1fr))]">
          {STATS.map((s, i) => (
            <TrustSignalMetric
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
          </dl>
        </div>
      </div>

      {/* ── CTA row — only shown when NOT logged in ── */}
      {!user && (
        <div className="flex flex-wrap items-center gap-2.5 mt-5">
          {showJoinCta && (
            <Link
              href="/register"
              data-tour={tourAnchors ? "guest-join" : undefined}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-extrabold text-sm text-white
                         shadow-md hover:opacity-90 active:scale-95 transition-all duration-200"
              style={{ background: TERRACOTTA }}
            >
              Join as Donor <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
          <Link
            href="/requests"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-extrabold text-sm
                       border border-[#e5e2d5] dark:border-stone-700
                       text-stone-700 dark:text-stone-300
                       hover:border-[#b04a15]/40 hover:text-[#b04a15]
                       transition-all duration-200"
          >
            Browse Requests <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </>
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
  /**
   * Emit the guest tour's `data-tour` anchors.
   *
   * <p>This component is mounted TWICE by HomeClient — once in the desktop
   * branch, once in the mobile one. Emitting anchors unconditionally would put
   * each `data-tour` in the DOM twice, and `document.querySelector` returns the
   * FIRST match: the desktop copy, which is `hidden lg:block`. A `display: none`
   * element reports a zero rect, so the tour's spotlight would collapse to
   * nothing. Only the mobile instance may pass this.
   */
  tourAnchors = false,
  /**
   * Render the trust signals + CTA inline at the end of this section.
   *
   * <p>Defaults to true so the desktop tree is unchanged. The mobile tree
   * passes false and renders <BeTheChangeTrustSignals> itself, after the
   * AudiencePathways cards — the hero overlap fuses this section to the Hero,
   * so the pathways can only be moved in front of the trust signals by taking
   * the trust signals out, not by reordering siblings.
   */
  trailing = true,
}: {
  initialStats?: PlatformStats | null;
  overlapHero?: boolean;
  tourAnchors?: boolean;
  trailing?: boolean;
} = {}) {
  const { user } = useAuth();

  // Category-pill overflow, below `lg` only. `useId` rather than a literal
  // string because HomeClient mounts this component twice — a hardcoded id
  // would put two of the same `aria-controls` target in the document and the
  // toggle would resolve to whichever came first.
  const pillsReduceMotion = useReducedMotion() ?? false;
  const overflowId = useId();
  const [pillsExpanded, setPillsExpanded] = useState(false);
  // Focus must survive the collapse: the revealed group unmounts, and if focus
  // had moved into it the document would drop focus to <body>.
  const toggleRef = useRef<HTMLButtonElement>(null);


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

  /**
   * Derived from the real category list, never hand-written.
   *
   * <p>These pills used to be six invented labels — "Community", "In-Kind" and
   * "Family" are not categories at all, while six real ones were missing. The
   * same page renders a "Cause Categories" metric from
   * `ALL_REQUEST_CATEGORIES.length`, so it was contradicting itself.
   *
   * <p>`CATEGORY_VISUALS` already calls itself the single source of truth for
   * category icons, so nothing needs mapping by hand: adding a category updates
   * the pills, the overflow count and the metric together.
   *
   * <p>Source is `IN_KIND_CATEGORIES` rather than `ALL_REQUEST_CATEGORIES`
   * because a pill now needs a destination as well as a name, and that file
   * owns the canonical name → slug pairing. Slugifying the label here would be
   * a second mapping free to drift from the routes that actually exist — and
   * `inKindCategories.ts` already throws at import if the two lists disagree,
   * so taking the names from there means a missing editorial entry is a build
   * failure rather than a pill linking to a 404.
   */
  const firstCategories = IN_KIND_CATEGORIES.slice(0, PILL_LIMIT);
  const overflowCategories = IN_KIND_CATEGORIES.slice(PILL_LIMIT);

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
                className="inline-block px-3 py-1 rounded-full text-2xs font-bold uppercase tracking-widest mb-2.5"
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

          {/* ── Category pills — every one links to its own In-Kind page ──
               A <nav> with a list: this is a set of navigation choices, and a
               screen reader user benefits from being told how many there are
               and being able to skip past them. */}
          <nav
            aria-label="Browse in-kind categories"
            className="mb-10"
            data-tour={tourAnchors ? "guest-categories" : undefined}
          >
            <ul className="flex flex-wrap gap-2">
              {firstCategories.map((category, i) => (
                <li key={category.slug}>
                  <CategoryPill
                    icon={CATEGORY_VISUALS[category.name].Icon}
                    label={category.name}
                    href={`/requests/category/${category.slug}`}
                    delay={i * 80}
                    reduceMotion={pillsReduceMotion}
                  />
                </li>
              ))}

              {/*
                The overflow three, in a nested list so `aria-controls` has a
                single element to point at. `<li>` containing `<ul>` is valid;
                `display: contents` stops the nesting from creating a box, so
                the three pills wrap into the same flex row as the first six
                rather than forming a second row of their own.

                All nine are always in the DOM. Below `lg` when collapsed the
                last three are CSS-hidden, which keeps every category link
                crawlable and means no pill is ever rendered twice.
              */}
              {overflowCategories.length > 0 && (
                <li className="contents">
                  <ul id={overflowId} className="contents">
                    {overflowCategories.map((category, i) => (
                      <li
                        key={category.slug}
                        // Hidden, not merely invisible: `display: none` takes
                        // them out of the tab order too, so a keyboard user
                        // cannot land on a pill they cannot see.
                        className={pillsExpanded ? undefined : "max-lg:hidden"}
                      >
                        <CategoryPill
                          icon={CATEGORY_VISUALS[category.name].Icon}
                          label={category.name}
                          href={`/requests/category/${category.slug}`}
                          delay={(PILL_LIMIT + i) * 80}
                          reduceMotion={pillsReduceMotion}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              )}

              {/* Below `lg` only — the wide layout shows all nine, so there is
                  nothing to toggle and the control is absent from the DOM
                  rather than hidden while still focusable. */}
              {overflowCategories.length > 0 && (
                <li className="lg:hidden">
                  <MoreCategoriesToggle
                    expanded={pillsExpanded}
                    count={overflowCategories.length}
                    controls={overflowId}
                    buttonRef={toggleRef}
                    onToggle={() => {
                      setPillsExpanded(v => !v);
                      // Collapsing unmounts nothing here, but focus must stay
                      // on the control either way: without this a click leaves
                      // focus on a button whose label has just changed, and a
                      // screen reader announces the new state against the old
                      // position.
                      toggleRef.current?.focus();
                    }}
                  />
                </li>
              )}
            </ul>
          </nav>

          {/* ── Trust journey — an animated connecting path, no card containers ── */}
          <div data-tour={tourAnchors ? "guest-journey" : undefined}>
            <TrustJourney items={cards} />
          </div>

        </div>{/* ── end elevated surface ── */}

        {/* initialStats must be forwarded: without it the desktop block would
            drop the server-rendered stats and refetch on mount. */}
        {trailing && <BeTheChangeTrustSignals initialStats={initialStats} tourAnchors={tourAnchors} />}
      </div>
    </section>
  );
}
