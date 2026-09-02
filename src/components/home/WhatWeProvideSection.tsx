"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useInView, useReducedMotion } from "framer-motion";

/** Six beats: the whole path a donation takes, one per scroll window. */
const STEP_COUNT = 6;

/* ─── The ring ────────────────────────────────────────────────────────────
   The section is a map of the ten-kilometre rule, drawn once in SVG user
   units and scaled by the viewBox — so every position below is a constant,
   not a percentage of a panel that changes width. The donee sits at the
   centre because the need is what everything else is measured from. */
const VIEW_W = 840;
const VIEW_H = 600;
const CENTRE_X = 420;
const CENTRE_Y = 300;
/** The ten-kilometre limit itself. Everything inside it is reachable. */
const RING_R = 238;
const DONOR_X = 628;
const DONOR_Y = 196;

/**
 * Other handovers, completing quietly somewhere else.
 *
 * <p>Percentages of the panel, chosen to sit clear of the copy column on the
 * left and of the ring on the right, so nothing here ever competes with the
 * beat text or the drawing. Durations and delays are deliberately unequal and
 * share no common factor — equal spacing would let them fall into step and
 * read as a pulse, which is the opposite of "quietly".
 *
 * <p>This is the one idea worth keeping from the background furniture that was
 * stripped out of this section: the crates existed to say "one handover among
 * many, not a diagram of a single parcel". They were freight on a conveyor
 * that no longer exists; a ring on a map of radii says the same thing and
 * belongs to the drawing that is actually here.
 */
const QUIET_HANDOVERS = [
  { left: "8%",  top: "22%", size: 190, dur: 13, delay: 0 },
  { left: "31%", top: "78%", size: 140, dur: 17, delay: 3.5 },
  { left: "63%", top: "12%", size: 165, dur: 11, delay: 7 },
  { left: "88%", top: "62%", size: 210, dur: 16, delay: 1.5 },
  { left: "46%", top: "44%", size: 120, dur: 14, delay: 9.5 },
  { left: "74%", top: "88%", size: 175, dur: 12, delay: 5.5 },
] as const;

/**
 * How much of the parcel's journey, at each end, is spent merging with a node.
 *
 * <p>Unchanged from the conveyor this replaced: the parcel still peels out of
 * one circle and settles into another, it just crosses a map now, not a belt.
 */
const DOCK_SPAN = 0.12;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Smoothstep — the merge should settle, not arrive linearly. */
const ease = (t: number) => {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
};

/**
 * A window of scroll, mapped to 0 → 1.
 *
 * <p>Every beat's reveal is expressed this way so the timings sit together as
 * readable numbers instead of being buried inside each style.
 */
const ramp = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));

/**
 * How far the parcel has merged into each end, from its position on the journey.
 *
 * <p>Split out and exported because it is the one part of this section that
 * can break silently: every other value here is visible the moment you look at
 * the panel, but an off-by-one in these windows just makes the handoff seam
 * slightly wrong in a way that reads as "fine" until someone stares at it.
 * Unit-tested at the boundaries instead.
 */
export function dockFactors(travel: number) {
  // Linear 1 → 0 as the parcel leaves the donor; 0 → 1 as it reaches the donee.
  const donorDock = clamp01(1 - travel / DOCK_SPAN);
  const doneeDock = clamp01((travel - (1 - DOCK_SPAN)) / DOCK_SPAN);
  return { donorDock, doneeDock, docked: Math.max(donorDock, doneeDock) };
}

/** Where the anticipatory approach begins, as a fraction of the journey. */
const ARRIVAL_START = 0.55;
/** How much travel the approach takes to complete. */
const ARRIVAL_SPAN = 0.4;

/**
 * The long approach to the donee end, 0 → 1.
 *
 * <p>Deliberately wider and earlier than `dockFactors`' donee window: this is
 * arrival being *felt* along the way, where the dock is the merge itself. Two
 * things read the same value — the donee node and the certificate — so the
 * proof lands with the parcel instead of on a third timeline.
 *
 * <p>Exported for the same reason `dockFactors` is: get the window wrong and
 * nothing breaks visibly, the proof just drifts out of step with the node.
 */
export function arrivalFactor(travel: number) {
  return clamp01((travel - ARRIVAL_START) / ARRIVAL_SPAN);
}

/* ─── Scroll-linked colour ────────────────────────────────────────────────
   The section warms where the giving starts and cools where it lands:
   terracotta at the donor, ink at the donee. Tying it to scroll gives that
   identity as a gradient rather than a switch.

   The ground shifts with it, warm cream to cool cream, so the whole room
   changes temperature rather than just the accent sitting on top of it. */
const ACCENT_WARM = [176, 74, 21] as const;   // #b04a15, the brand terracotta
const ACCENT_COOL = [30, 58, 96] as const;    // #1e3a60, the brand ink
const GROUND_WARM = [250, 248, 245] as const; // #faf8f5, the site cream
const GROUND_COOL = [241, 244, 248] as const; // a cooler cream
/**
 * An empty node's rim, which warms toward `accent` as the node fills.
 *
 * <p>Dark, because the room is lit. A rim reads by contrasting with the floor
 * it sits on, so on a cream ground it has to be dark or every empty node
 * disappears.
 */
const NODE_RIM = [41, 37, 36] as const;

/** Channel-wise interpolation. Good enough at these low chromas, and it keeps
 *  the whole thing dependency-free and cheap enough to run every frame. */
function mix(a: readonly number[], b: readonly number[], t: number) {
  const k = Math.max(0, Math.min(1, t));
  return a.map((v, i) => Math.round(v + (b[i] - v) * k));
}
// `readonly number[]` so the frozen brand tuples can be passed straight in:
// these used to take only mix() output, and NODE_RIM is now read directly.
const rgb = (c: readonly number[]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
const rgba = (c: readonly number[], alpha: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;

/**
 * "How it works", drawn as the ten-kilometre rule it actually runs on.
 *
 * <p>A sticky panel holding one ring. As you scroll: a need appears at the
 * centre, the space inside the ring is searched quietly, one donor lights up,
 * the item travels in, and a certificate is issued. Six beats, because the
 * product genuinely has six — the version before this spent the same pinned
 * scroll on two feature blurbs, which is what made the mechanism look far
 * bigger than anything it was carrying.
 *
 * <p><b>Everything animates from `progress` through plain inline styles.</b>
 * That is deliberate and worth keeping: an earlier attempt at this section
 * drove the visuals from CSS custom properties and moved the panel's layout
 * into an unlayered rule in `styles.css`, and shipped a white screen whose
 * cause was never found. This pattern is the one that demonstrably works here.
 */
export function WhatWeProvideSection() {
  const t = useTranslations("landing");
  // The section is built almost entirely of motion. Under reduced motion the
  // journey collapses to its settled position: the parcel rests at the centre,
  // nothing sweeps or slides, and the beats still change with scroll — so the
  // information survives and only the movement goes.
  const reduceMotion = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement>(null);
  /* The ambient layer is the only thing in this section that moves without
     being scrolled, so it must stop existing when the section does not. Same
     reasoning as AudiencePathwaysSection: on a long landing page this is the
     difference between a permanent compositor loop and none. */
  const inView = useInView(sectionRef, { amount: 0.05 });
  const [progress, setProgress] = useState(0);

  const steps = [
    { step: "01", title: t("provide.posted"), desc: t("provide.postedDesc") },
    { step: "02", title: t("provide.checked"), desc: t("provide.checkedDesc") },
    { step: "03", title: t("provide.searched"), desc: t("provide.searchedDesc") },
    { step: "04", title: t("provide.asked"), desc: t("provide.askedDesc") },
    { step: "05", title: t("provide.handedOver"), desc: t("provide.handedOverDesc") },
    { step: "06", title: t("provide.certified"), desc: t("provide.certifiedDesc") },
  ];

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    // Coalesced to one update per frame. Calling setProgress straight from the
    // scroll listener reconciled the whole subtree several times per frame.
    let ticking = false;

    function apply() {
      ticking = false;
      const rect = el!.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;
      setProgress(clamp01(-rect.top / scrollable));
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    apply();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const activeStep = Math.min(Math.floor(progress * STEP_COUNT), STEP_COUNT - 1);
  const step = steps[activeStep];

  /* The parcel's journey occupies the last two beats, not the whole section —
     the first four are the need being posted, checked, searched for and
     agreed, none of which move anything across the map. Mapping that window to
     its own 0 → 1 is what lets `dockFactors` and `arrivalFactor` stay exactly
     as they were: they describe a journey, and this is still one. */
  const travel = reduceMotion ? 1 : ramp(progress, 0.58, 0.92);

  const arrival = arrivalFactor(travel);
  const { donorDock, doneeDock, docked } = dockFactors(travel);

  // The node fills AHEAD of the parcel's arrival (the ÷0.75), so both are the
  // same colour by the time they coincide and the handoff cannot be seen.
  const donorFill = ease(clamp01(donorDock / 0.75));
  const doneeFill = ease(clamp01(doneeDock / 0.75));
  const merge = ease(docked);

  // Position converges too, not just size: the parcel is pulled onto whichever
  // node it is merging with, so the merge actually merges instead of two
  // same-coloured discs snapping together on the final frame.
  const lineX = DONOR_X + (CENTRE_X - DONOR_X) * travel;
  const lineY = DONOR_Y + (CENTRE_Y - DONOR_Y) * travel;
  const dockX = doneeDock > 0 ? CENTRE_X : DONOR_X;
  const dockY = doneeDock > 0 ? CENTRE_Y : DONOR_Y;
  const parcelX = lineX + (dockX - lineX) * merge;
  const parcelY = lineY + (dockY - lineY) * merge;

  /* The quiet search. The sweep turns while beat 3 runs and stops on the donor
     it finds — the one moment in the section worth watching, because it is the
     private match, and that is the thing no other platform does. */
  const searching = reduceMotion
    ? 0
    : Math.max(0, ramp(progress, 0.30, 0.38) - ramp(progress, 0.48, 0.56));
  const found = ramp(progress, 0.46, 0.56);
  const sweepAngle = reduceMotion ? -0.46 : -0.9 + progress * 9;
  const sweepX =
    CENTRE_X + RING_R * Math.cos(sweepAngle) * (1 - found) + (DONOR_X - CENTRE_X) * found;
  const sweepY =
    CENTRE_Y + RING_R * Math.sin(sweepAngle) * (1 - found) + (DONOR_Y - CENTRE_Y) * found;

  const pinsIn = ramp(progress, 0.06, 0.16);
  const donorLit = ramp(progress, 0.44, 0.56);
  // The parcel only exists while it is in transit; before beat 5 it is still
  // the donor's, and after the merge it has become the donee's.
  const parcelOut = travel > 0 ? 1 - merge : 0;

  // Colour tracks `progress`, NOT `travel`. Under reduced motion `travel` is
  // pinned to 1 so nothing slides — but a colour shift is not motion and causes
  // nobody any trouble, so it should still follow the scroll.
  const accent = mix(ACCENT_WARM, ACCENT_COOL, progress);
  const ground = mix(GROUND_WARM, GROUND_COOL, progress);

  const donorNode = mix(ground, accent, donorFill);
  const doneeNode = mix(ground, accent, doneeFill);

  return (
    <section ref={sectionRef} id="how" className="relative" style={{ height: "320vh" }}>
      {/* The panel's offset comes from --ck-nav-h, the header's MEASURED height
          (published by SiteHeader via ResizeObserver), not a constant. Inline
          rather than a class in styles.css on purpose: the value stays on the
          element, with no cascade-layer interaction between Tailwind's
          utilities and an unlayered rule. The fallback is the old 4.5rem, so
          before hydration this behaves exactly as it did. */}
      <div
        className="sticky overflow-hidden bg-[#faf8f5]"
        style={{
          top: "var(--ck-nav-h, 4.5rem)",
          height: "calc(100vh - var(--ck-nav-h, 4.5rem))",
          // The bg-[#faf8f5] class stays as the pre-hydration ground; this
          // inline value wins once React runs and carries the warm-to-cool
          // shift.
          backgroundColor: rgb(ground),
          // Same reason as the rule above: an unlayered global would win over
          // a border-colour utility here too.
          borderBottom: "1px solid rgba(28,25,23,0.14)",
        }}
      >
        {/* ── Ambient ground: other handovers, completing elsewhere ──
             Not rendered at all when the section is off screen, and not
             animated under reduced motion — the guards in styles.css are
             scoped to named class lists rather than a global rule, so this
             cannot rely on the stylesheet to stop it.

             Deliberately faint. If it ever reads as something to look at
             rather than texture in the ground, it has become the decoration
             this section had removed. */}
        {inView && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {QUIET_HANDOVERS.map((h, i) => (
              <span
                key={i}
                className="absolute rounded-full"
                style={{
                  left: h.left,
                  top: h.top,
                  width: h.size,
                  height: h.size,
                  marginLeft: -h.size / 2,
                  marginTop: -h.size / 2,
                  // 0.11 at 1.5px, up from 0.05 at 1px: at the original weight
                  // these were subliminal — technically present, not actually
                  // seen. Still under the foreground: the dashed ten-kilometre
                  // ring is 0.16 and the pins 0.18, so the hierarchy holds.
                  border: `1.5px solid ${rgba(NODE_RIM, 0.11)}`,
                  // Under reduced motion they simply sit there, part-grown and
                  // still, so the ground keeps its texture without moving.
                  opacity: reduceMotion ? 0.5 : 0,
                  transform: reduceMotion ? "scale(0.7)" : undefined,
                  animationName: reduceMotion ? undefined : "ck-quiet-handover",
                  animationDuration: `${h.dur}s`,
                  animationDelay: `-${h.delay}s`,
                  animationIterationCount: "infinite",
                  animationTimingFunction: "cubic-bezier(0.33, 0, 0.2, 1)",
                  willChange: reduceMotion ? undefined : "transform, opacity",
                }}
              />
            ))}
          </div>
        )}

        {/* One two-column composition, vertically centred in the panel. The
            section's own title, the beat, the rail and the footnote all live in
            the left column rather than in a full-width header — the beat is the
            thing that changes, so everything that frames it sits with it. */}
        <div className="relative z-10 h-full grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-center gap-8 lg:gap-10 px-6 lg:px-14 py-8">

          <div className="flex flex-col gap-5 min-w-0">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#b04a15]">
                How it works
              </p>
              <h2
                className="mt-1.5 text-stone-900"
                style={{ fontFamily: "var(--font-source-serif-4), Georgia, serif", fontSize: "27px", fontWeight: 600, letterSpacing: "-0.015em" }}
              >
                {t("what.title")}
              </h2>
            </div>

            {/* All six beats share one grid cell, so the column never reflows
                as they change — only the active one is visible. */}
            {/* Rule set inline, not with border-stone-900: styles.css has an
                UNLAYERED `* { border-color: var(--color-border) }` at :209, and
                unlayered CSS beats Tailwind utilities, so every border-colour
                utility in this app silently resolves to the light warm token.
                Verified in the browser — the class was applied and still came
                back as lab(88.3 …). */}
            <div className="grid pt-4" style={{ borderTop: "2px solid #1c1917" }}>
              {steps.map((s, i) => (
                <div
                  key={s.step}
                  style={{
                    gridArea: "1 / 1",
                    visibility: i === activeStep ? "visible" : "hidden",
                    opacity: i === activeStep ? 1 : 0,
                    transition: reduceMotion ? "none" : "opacity 0.4s ease",
                  }}
                >
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-stone-600 mb-2.5 tabular-nums">
                    Beat {s.step} of 0{STEP_COUNT}
                  </p>
                  <h3
                    className="text-stone-900 mb-3"
                    style={{
                      fontFamily: "var(--font-source-serif-4), Georgia, serif",
                      fontSize: "clamp(1.75rem, 1.1rem + 1.6vw, 2.5rem)",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.05,
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="text-stone-700 max-w-[46ch]"
                    style={{ fontFamily: "var(--font-source-serif-4), Georgia, serif", fontSize: "17px", lineHeight: 1.55 }}
                  >
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="h-[3px] bg-stone-900/12">
              <div
                className="h-full origin-left"
                style={{
                  backgroundColor: rgb(accent),
                  transform: `scaleX(${progress})`,
                  willChange: "transform",
                }}
              />
            </div>

            <p className="text-[13px] leading-relaxed text-stone-600 font-medium max-w-[52ch]">
              Ten kilometres is the actual limit the matcher enforces, not a figure of
              speech — a listing further out is refused with the distance in the message.
            </p>
          </div>

          <div className="min-w-0">
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="block w-full h-auto mx-auto"
              style={{ maxHeight: "66vh" }}
              aria-hidden
              focusable="false"
            >
              {/* The limit itself, and a quieter inner ring for depth. */}
              <circle
                cx={CENTRE_X}
                cy={CENTRE_Y}
                r={RING_R}
                fill="none"
                stroke={rgba(NODE_RIM, 0.16)}
                strokeWidth={1.5}
                strokeDasharray="7 7"
              />
              <circle
                cx={CENTRE_X}
                cy={CENTRE_Y}
                r={RING_R}
                fill={rgb(accent)}
                opacity={0.045 * searching}
              />
              <circle
                cx={CENTRE_X}
                cy={CENTRE_Y}
                r={150}
                fill="none"
                stroke={rgba(NODE_RIM, 0.09)}
                strokeWidth={1.5}
              />

              <text
                x={CENTRE_X}
                y={CENTRE_Y - RING_R - 18}
                textAnchor="middle"
                fontSize={13}
                fontWeight={800}
                letterSpacing="2.4"
                // 0.72, not 0.6: at 0.6 this composites to 4.06:1 on the warm
                // cream and 3.99 on the cool one, under AA for 13px text.
                fill={rgba(NODE_RIM, 0.72)}
              >
                10 KM
              </text>

              {/* Other people inside the radius. They never light up: the point
                  is that ONE donor is asked, not that a crowd is notified. */}
              <circle cx={248} cy={392} r={9} fill={rgba(NODE_RIM, 0.18)} opacity={pinsIn} />
              <circle cx={560} cy={430} r={9} fill={rgba(NODE_RIM, 0.18)} opacity={pinsIn} />
              <circle cx={300} cy={188} r={9} fill={rgba(NODE_RIM, 0.18)} opacity={pinsIn} />

              {/* The search: turns while it looks, stops on what it finds. */}
              <line
                x1={CENTRE_X}
                y1={CENTRE_Y}
                x2={sweepX}
                y2={sweepY}
                stroke={rgb(accent)}
                strokeWidth={2}
                opacity={Math.max(searching, found * 0.5)}
              />

              {/* Donor. */}
              <circle
                cx={DONOR_X}
                cy={DONOR_Y}
                r={26}
                fill={rgb(donorNode)}
                stroke={rgba(mix(NODE_RIM, accent, donorFill), 0.25 + 0.75 * donorFill)}
                strokeWidth={2}
                opacity={donorLit}
              />
              <text
                x={DONOR_X}
                y={DONOR_Y + 52}
                textAnchor="middle"
                fontSize={12}
                fontWeight={800}
                letterSpacing="1.6"
                fill={rgba(NODE_RIM, 0.72)}
                opacity={donorLit}
              >
                DONOR
              </text>

              {/* The item, crossing the radius. */}
              <circle cx={parcelX} cy={parcelY} r={13} fill={rgb(accent)} opacity={parcelOut} />

              {/* Donee, at the centre, because the need is what this is
                  measured from. */}
              <circle
                cx={CENTRE_X}
                cy={CENTRE_Y}
                r={26}
                fill={rgb(doneeNode)}
                stroke={rgba(mix(NODE_RIM, accent, doneeFill), 0.25 + 0.75 * doneeFill)}
                strokeWidth={2}
              />
              <text
                x={CENTRE_X}
                y={CENTRE_Y + 52}
                textAnchor="middle"
                fontSize={12}
                fontWeight={800}
                letterSpacing="1.6"
                fill={rgba(NODE_RIM, 0.72)}
              >
                DONEE
              </text>

              {/* The certificate, landing WITH the parcel rather than after it —
                  both read `arrival`, so they sit on one timeline. */}
              <g opacity={arrival}>
                <rect
                  x={CENTRE_X - 134}
                  y={CENTRE_Y + 150}
                  width={268}
                  height={70}
                  fill={rgb(ground)}
                  stroke={rgba(NODE_RIM, 0.85)}
                  strokeWidth={2}
                />
                <text
                  x={CENTRE_X}
                  y={CENTRE_Y + 178}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={800}
                  letterSpacing="2"
                  fill={rgb(accent)}
                >
                  CERTIFICATE ISSUED
                </text>
                <text
                  x={CENTRE_X}
                  y={CENTRE_Y + 205}
                  textAnchor="middle"
                  fontSize={20}
                  fill={rgba(NODE_RIM, 0.92)}
                >
                  CK-IK-2026-0417
                </text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
