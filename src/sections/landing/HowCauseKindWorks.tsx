"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { StepMotifIcon } from "./StepMotifIcon";
import { SlotNumber } from "./SlotNumber";
import {
  JOURNEYS,
  NODES,
  STAGE_PATH,
  STAGE_VIEWBOX,
  STEP_THRESHOLDS,
  type Audience,
} from "./howItWorksData";

/**
 * "How CauseKind Works" — the fast, interactive answer, directly below the hero.
 *
 * <p><b>How it relates to the film.</b> `ItemDonationScrolly` further down the
 * page is the same story told slowly and emotionally, over six screen-heights
 * of scrubbed footage. This section is the opposite and comes first: four steps,
 * answered in the time it takes to scroll past. A visitor who reads only this
 * already knows what the platform does; the film is then a reward rather than a
 * prerequisite.
 *
 * <p><b>Motion design.</b> One idea drives everything — a line is drawn, and
 * each step comes alive as the line reaches it. The line is the hero's dotted
 * connection arc, continued: same dash vocabulary, same accent. Nothing here
 * animates because it can; the draw is literally the passage of an object from
 * one person to another, which is the thing the section is explaining.
 *
 * <p><b>Performance contract.</b> GSAP owns exactly two properties on the
 * scrubbed path — `strokeDashoffset` and `opacity` — and writes them straight to
 * the SVG, never through React. React state changes only when the *active step
 * index* changes, which is at most four times per scroll pass, so cards animate
 * off a boolean rather than off scroll position. Everything else is transform
 * and opacity. `will-change` is set on the four cards only while the section is
 * pinned, and cleared by `ctx.revert()`.
 *
 * <p><b>Responsive and reduced-motion.</b> `gsap.matchMedia()` builds three
 * mutually exclusive worlds: desktop pins and scrubs; mobile (&lt;768px) does not
 * pin at all and draws a vertical timeline as the section scrolls past;
 * reduced-motion builds no ScrollTrigger whatsoever and renders every step in
 * its final, fully-readable state. The third is not a degraded version of the
 * first — it is a different, complete layout.
 */

const AUDIENCES: Audience[] = ["donor", "donee"];

export function HowCauseKindWorks() {
  const reduceMotion = useReducedMotion();
  const [audience, setAudience] = useState<Audience>("donor");
  /** How far the connecting line has been drawn, 0–1. Desktop + mobile alike. */
  const [activeIndex, setActiveIndex] = useState(reduceMotion ? 3 : -1);

  const rootRef = useRef<HTMLElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const railRef = useRef<SVGLineElement>(null);
  const activeRef = useRef(-1);
  const baseId = useId();

  const journey = JOURNEYS[audience];

  /** Only re-render when the *step* changes, not on every scroll tick. */
  const publishIndex = useCallback((next: number) => {
    if (activeRef.current === next) return;
    activeRef.current = next;
    setActiveIndex(next);
  }, []);

  useLayoutEffect(() => {
    if (reduceMotion) {
      // Everything lit, nothing observed. No ScrollTrigger is created at all,
      // so there is no pin to fight and no scroll listener to run.
      publishIndex(STEP_THRESHOLDS.length - 1);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      /** Maps a 0–1 draw progress onto the highest step it has reached. */
      const indexFor = (p: number) => {
        let i = -1;
        for (let s = 0; s < STEP_THRESHOLDS.length; s++) if (p >= STEP_THRESHOLDS[s]) i = s;
        return i;
      };

      // ── Desktop: pin and scrub the snaking path ──────────────────────────
      mm.add("(min-width: 768px)", () => {
        const path = pathRef.current;
        if (!path) return;

        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });

        const st = ScrollTrigger.create({
          trigger: rootRef.current,
          start: "top top",
          // Three-and-a-half screens of scroll to cross four steps: enough that
          // each card holds long enough to be read, short enough that the page
          // does not feel hijacked.
          end: "+=350%",
          pin: true,
          pinSpacing: true,
          scrub: 0.6,
          // Snap gently to each step so the section never rests mid-transition
          // between two cards. `delay` keeps it from fighting an active flick.
          snap: { snapTo: STEP_THRESHOLDS, duration: 0.25, delay: 0.12, ease: "power1.inOut" },
          onUpdate: (self) => {
            const p = self.progress;
            // Written directly to the element — this is the one value that
            // changes every frame, and routing it through React state would
            // re-render the whole section 60 times a second.
            path.style.strokeDashoffset = String(len * (1 - p));
            publishIndex(indexFor(p));
          },
          onRefreshInit: () => {
            path.style.strokeDashoffset = String(len);
          },
        });

        return () => st.kill();
      });

      // ── Mobile: no pin. A vertical rail draws as the section passes. ─────
      mm.add("(max-width: 767px)", () => {
        const rail = railRef.current;
        if (!rail) return;

        const st = ScrollTrigger.create({
          trigger: rootRef.current,
          // Begins when the section's top is most of the way up the viewport
          // and completes as its bottom leaves — so the rail tracks the reading
          // position rather than an arbitrary pinned distance.
          start: "top 72%",
          end: "bottom 65%",
          scrub: 0.5,
          onUpdate: (self) => {
            rail.style.transform = `scaleY(${self.progress})`;
            publishIndex(indexFor(self.progress));
          },
        });

        return () => st.kill();
      });

      return () => mm.revert();
    }, rootRef);

    return () => ctx.revert();
  }, [reduceMotion, publishIndex]);

  /*
   * Switching audience re-draws the line from the beginning.
   *
   * Without this the new cards would inherit whichever steps the old journey
   * had already lit, so flipping to "I need something" mid-section would show
   * step 3 of a story the reader has not started. Desktop resets the dash and
   * lets the next scroll tick refill it; the step state resets either way.
   */
  useEffect(() => {
    if (reduceMotion) return;
    const path = pathRef.current;
    if (path) {
      const len = path.getTotalLength();
      gsap.fromTo(
        path,
        { strokeDashoffset: len },
        { strokeDashoffset: len * (1 - Math.max(0, progressFloorFor(activeRef.current))), duration: 0.7, ease: "power2.out" },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience, reduceMotion]);

  return (
    <section
      ref={rootRef}
      aria-labelledby={`${baseId}-heading`}
      className="ck-hiw relative isolate overflow-hidden bg-[var(--ck-hiw-bg,#fbf7f2)] py-16 md:py-0 dark:bg-zinc-950"
    >
      {/*
        A single hairline grid, fixed to the section. Not a gradient wash and
        not floating blobs — it gives the drawn line a surface to travel over,
        which is the only reason it is here.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(176,74,21,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(176,74,21,0.055) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 45%, #000 40%, transparent 100%)",
        }}
      />

      {/*
        `pt-16` on the pinned branch clears the sticky header.

        The pin starts at `top top`, so the section's own top edge sits at
        viewport 0 — directly underneath the 3.5rem sticky header, which was
        slicing the "HOW IT WORKS" eyebrow in half for the entire pinned
        duration. Padding rather than a `start: "top 56px"` offset, because
        moving the start leaves a 56px strip of the previous section visible
        above the pinned content for the whole scroll.
      */}
      <div className="relative mx-auto flex min-h-0 w-full max-w-7xl flex-col px-4 sm:px-6 md:min-h-[100svh] md:justify-center md:pt-16 md:pb-14">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-3xs font-extrabold uppercase tracking-[0.2em] text-[var(--ck-home-ink,#b04a15)]">
            <TranslatedText text="How it works" />
          </p>
          <h2
            id={`${baseId}-heading`}
            className="mt-4 text-balance text-3xl font-black leading-[1.08] tracking-tight text-stone-900 sm:text-4xl lg:text-[3.1rem] dark:text-stone-50"
          >
            <TranslatedText text="From your shelf to someone's life —" />{" "}
            <span className="text-[var(--ck-home-accent,#c54805)]">
              <TranslatedText text="in 4 steps." />
            </span>
          </h2>
        </header>

        {/* ── Audience toggle ─────────────────────────────────────────────── */}
        <AudienceToggle audience={audience} onChange={setAudience} baseId={baseId} />

        {/* ── Desktop stage: the snaking path ─────────────────────────────── */}
        <div className="relative mt-14 hidden md:block" aria-hidden>
          <div className="relative mx-auto w-full" style={{ aspectRatio: `${STAGE_VIEWBOX.width} / ${STAGE_VIEWBOX.height}` }}>
            <svg
              viewBox={`0 0 ${STAGE_VIEWBOX.width} ${STAGE_VIEWBOX.height}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              {/* The route, unwalked. */}
              <path
                d={STAGE_PATH}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeDasharray="7 9"
                className="text-[var(--ck-home-accent,#c54805)] opacity-40 dark:opacity-30"
                vectorEffect="non-scaling-stroke"
              />
              {/* The route, walked. Drawn by the ScrollTrigger above. */}
              <path
                ref={pathRef}
                d={STAGE_PATH}
                fill="none"
                stroke="currentColor"
                strokeWidth={4}
                strokeLinecap="round"
                className="text-[var(--ck-home-accent,#c54805)]"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Cards, anchored to the same node table the path is built from. */}
            {journey.steps.map((step, i) => (
              <div
                key={`${audience}-${step.key}`}
                className="absolute"
                style={{
                  left: `${(NODES[i].x / STAGE_VIEWBOX.width) * 100}%`,
                  top: `${(NODES[i].y / STAGE_VIEWBOX.height) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: "min(15.5rem, 21vw)",
                }}
              >
                <StepCard
                  step={step}
                  index={i}
                  active={i <= activeIndex}
                  audience={audience}
                  reduceMotion={!!reduceMotion}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Mobile stage: a vertical timeline ───────────────────────────── */}
        <div className="relative mt-10 md:hidden">
          <svg
            aria-hidden
            className="absolute left-[1.4rem] top-2 h-[calc(100%-1rem)] w-1 overflow-visible"
            viewBox="0 0 2 100"
            preserveAspectRatio="none"
          >
            <line x1={1} y1={0} x2={1} y2={100} stroke="currentColor" strokeWidth={2}
              strokeDasharray="4 5" vectorEffect="non-scaling-stroke"
              className="text-[var(--ck-home-accent,#c54805)] opacity-20" />
            <line
              ref={railRef}
              x1={1} y1={0} x2={1} y2={100}
              stroke="currentColor" strokeWidth={3} strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="text-[var(--ck-home-accent,#c54805)]"
              style={{ transformOrigin: "0 0", transform: reduceMotion ? "scaleY(1)" : "scaleY(0)" }}
            />
          </svg>

          <ol className="relative space-y-4">
            {journey.steps.map((step, i) => (
              <li key={`${audience}-${step.key}`} className="pl-14">
                <StepCard
                  step={step}
                  index={i}
                  active={i <= activeIndex}
                  audience={audience}
                  reduceMotion={!!reduceMotion}
                  compact
                />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Progress value at which `index` was lit, for redraw-on-toggle. */
function progressFloorFor(index: number) {
  if (index < 0) return 0;
  return STEP_THRESHOLDS[Math.min(index, STEP_THRESHOLDS.length - 1)];
}

/* ─────────────────────────────────────────────────────────────────────────── */

function AudienceToggle({
  audience,
  onChange,
  baseId,
}: {
  audience: Audience;
  onChange: (a: Audience) => void;
  baseId: string;
}) {
  return (
    <div className="mt-8 flex justify-center">
      {/*
        A real radiogroup, not two styled divs. Arrow keys move between the
        options and the selected state is announced — which matters because
        this control changes every card below it.
      */}
      <LayoutGroup id={`${baseId}-toggle`}>
        <div
          role="radiogroup"
          aria-label="Choose which side you're on"
          className="relative inline-flex rounded-full border border-[var(--ck-home-soft,#fed7aa)] bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900"
        >
          {AUDIENCES.map((a) => {
            const selected = a === audience;
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(a)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                    onChange(a === "donor" ? "donee" : "donor");
                  }
                }}
                className={[
                  // 44px min height — the touch-target floor.
                  "relative z-10 min-h-11 cursor-pointer rounded-full px-5 text-sm font-bold transition-colors duration-200 sm:px-7",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-home-accent,#c54805)] focus-visible:ring-offset-2",
                  selected ? "text-white" : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100",
                ].join(" ")}
              >
                {selected && (
                  <motion.span
                    // The pill is one element that moves between the two
                    // buttons, so the motion reads as "the same thing slid"
                    // rather than "one faded out and another faded in".
                    layoutId={`${baseId}-toggle-pill`}
                    className="absolute inset-0 -z-10 rounded-full bg-[var(--ck-home-accent,#c54805)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <TranslatedText text={JOURNEYS[a].toggleLabel} />
              </button>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function StepCard({
  step,
  index,
  active,
  audience,
  reduceMotion,
  compact = false,
}: {
  step: { key: string; title: string; body: string; motif: Parameters<typeof StepMotifIcon>[0]["motif"] };
  index: number;
  active: boolean;
  audience: Audience;
  reduceMotion: boolean;
  compact?: boolean;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={audience}
        /*
         * The 3D flip on audience change.
         *
         * Staggered by index so the four cards turn in sequence rather than as
         * one slab, and `transformPerspective` is per-card so each turns about
         * its own centre — a shared parent perspective would make the outer
         * cards swing through an arc and read as a carousel.
         */
        initial={reduceMotion ? false : { rotateY: -75, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { rotateY: 75, opacity: 0 }}
        transition={
          reduceMotion
            ? { duration: 0.15 }
            : { type: "spring", stiffness: 210, damping: 22, delay: index * 0.07 }
        }
        style={{ transformPerspective: 900 }}
        className="relative"
      >
        {/* The glow pulse. A separate, purely decorative layer so the card
            itself never animates a shadow — box-shadow is not compositable and
            pulsing it on four cards is a reliable way to lose 60fps. */}
        {!reduceMotion && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -inset-3 -z-10 rounded-[1.75rem] bg-[var(--ck-home-accent,#c54805)]"
            initial={false}
            animate={active ? { opacity: [0, 0.22, 0.09], scale: [0.86, 1.04, 1] } : { opacity: 0, scale: 0.86 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            style={{ filter: "blur(22px)" }}
          />
        )}

        <motion.div
          initial={false}
          // The pop-in when the line arrives. Transform and opacity only.
          animate={
            reduceMotion
              ? { opacity: 1, scale: 1, y: 0 }
              : active
                ? { opacity: 1, scale: 1, y: 0 }
                : { opacity: 0.38, scale: 0.93, y: 10 }
          }
          transition={{ type: "spring", stiffness: 280, damping: 20, mass: 0.8 }}
          className={[
            "rounded-3xl border bg-white transition-colors duration-300 dark:bg-zinc-900",
            compact ? "p-4" : "p-5",
            active
              ? "border-[var(--ck-home-accent,#c54805)] shadow-[0_18px_40px_-26px_rgba(176,74,21,0.65)]"
              : "border-stone-200 dark:border-zinc-800",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <span
              className={[
                "grid shrink-0 place-items-center rounded-2xl transition-colors duration-300",
                compact ? "h-11 w-11" : "h-12 w-12",
                active
                  ? "bg-[var(--ck-home-surface,#fff7ed)] text-[var(--ck-home-accent,#c54805)] dark:bg-zinc-800"
                  : "bg-stone-100 text-stone-400 dark:bg-zinc-800 dark:text-zinc-600",
              ].join(" ")}
            >
              <StepMotifIcon motif={step.motif} active={active} className="h-7 w-7" />
            </span>

            <SlotNumber
              value={index + 1}
              active={active}
              className={[
                "ml-auto font-black tabular-nums leading-none transition-colors duration-300",
                compact ? "text-2xl" : "text-3xl",
                active ? "text-[var(--ck-home-accent,#c54805)]" : "text-stone-200 dark:text-zinc-700",
              ].join(" ")}
            />
          </div>

          <h3
            className={[
              "mt-4 font-extrabold leading-snug tracking-tight text-stone-900 dark:text-stone-50",
              compact ? "text-base" : "text-[1.0625rem]",
            ].join(" ")}
          >
            <TranslatedText text={step.title} />
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            <TranslatedText text={step.body} />
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
