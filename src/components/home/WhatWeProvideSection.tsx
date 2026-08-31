"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "framer-motion";
import { Package, User, Home } from "lucide-react";

const STEP_COUNT = 2;

/** Where the parcel sits on the belt, as a percentage of the panel width. */
const BELT_START = 13;
const BELT_END = 87;

/* ─── The merge at each end ───────────────────────────────────────────────
   BELT_START and BELT_END are the *same* percentages the donor and donee
   circles are placed at, so at rest the parcel is centred dead-on a node and
   hides it completely. Rather than nudge it aside, the arrival is made to
   mean something: the parcel rounds off, settles into the circle, and the
   circle fills with the accent of that moment — warm at the donor, cool at
   the donee. The item then reads as coming FROM someone and going TO someone,
   which is the whole point of the Conveyor direction. */

/** How much of the belt, at each end, the parcel spends merging with a node. */
const DOCK_SPAN = 0.12;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Smoothstep — the merge should settle, not arrive linearly. */
const ease = (t: number) => {
  const k = clamp01(t);
  return k * k * (3 - 2 * k);
};

/**
 * How far the parcel has merged into each end, from its position on the belt.
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

/** Where the anticipatory approach begins, as a fraction of belt travel. */
const ARRIVAL_START = 0.55;
/** How much travel the approach takes to complete. */
const ARRIVAL_SPAN = 0.4;

/**
 * The long approach to the donee end, 0 → 1.
 *
 * <p>Deliberately wider and earlier than `dockFactors`' donee window: this is
 * arrival being *felt* along the belt, where the dock is the merge itself. Two
 * things read the same value — the donee node and the handover proof card — so
 * that the proof lands with the parcel instead of on a third timeline.
 *
 * <p>Exported for the same reason `dockFactors` is: get the window wrong and
 * nothing breaks visibly, the proof just drifts out of step with the node.
 */
export function arrivalFactor(travel: number) {
  return clamp01((travel - ARRIVAL_START) / ARRIVAL_SPAN);
}

/* ─── Scroll-linked colour ────────────────────────────────────────────────
   The section warms at the donor end and cools at the donee end: terracotta
   where the giving starts, ink where it lands. This is not decoration — the
   old design gave step 01 terracotta and step 02 ink, and rebuilding as a
   single travelling parcel had flattened that identity away. Tying it to
   scroll gives it back as a gradient rather than a switch.

   The ground shifts with it, warm-black to cool-black, so the whole room
   changes temperature rather than just the accent sitting on top of it. */
const ACCENT_WARM = [176, 74, 21] as const;   // #b04a15, the brand terracotta
const ACCENT_COOL = [30, 58, 96] as const;    // #1e3a60, the brand ink
const GROUND_WARM = [18, 16, 14] as const;    // #12100e
const GROUND_COOL = [12, 16, 22] as const;    // a cooler near-black
/** An empty node's rim, which warms toward `accent` as the node fills. */
const NODE_RIM = [255, 255, 255] as const;

/**
 * The proof card's QR, as a fixed 9x9 bitmap.
 *
 * <p><b>This encodes nothing and must never be replaced by a real encoder.</b>
 * It is a drawing of a QR code, sized and shaped to read as one at a glance —
 * three finder squares in the corners, plausible noise between them. A real
 * code here would be a scannable link on a decorative homepage graphic, which
 * is either dead (pointing nowhere) or a genuine certificate URL sitting in
 * marketing copy. Neither is wanted.
 *
 * <p>Same reasoning governs the certificate number beside it — see the card.
 */
export const PROOF_QR = [
  "111010111",
  "101100101",
  "111011111",
  "000110010",
  "011101100",
  "010011010",
  "111010011",
  "101110101",
  "111001110",
] as const;

/** Channel-wise interpolation. Good enough at these low chromas, and it keeps
 *  the whole thing dependency-free and cheap enough to run every frame. */
function mix(a: readonly number[], b: readonly number[], t: number) {
  const k = Math.max(0, Math.min(1, t));
  return a.map((v, i) => Math.round(v + (b[i] - v) * k));
}
const rgb = (c: number[]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
const rgba = (c: number[], alpha: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;

/**
 * "How it works", built in the Conveyor direction: the item itself travels.
 *
 * <p>A sticky panel with a belt running across it. As you scroll, the parcel
 * moves from the donor end to the donee end and the copy changes around it —
 * the scroll is not paging through slides, it is carrying the thing being
 * given. That is the whole idea of the direction, so the parcel's position is
 * the one value everything else is timed against.
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
  // travel collapses to its settled position: the parcel rests at the end of
  // the belt, nothing slides, and the steps still change with scroll — so the
  // information survives and only the movement goes.
  const reduceMotion = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      step: "01",
      title: t("provide.moneyOrItems"),
      desc: t("provide.moneyOrItemsDesc"),
    },
    {
      step: "02",
      title: t("provide.localDropoffs"),
      desc: t("provide.localDropoffsDesc"),
    },
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

  // The parcel's journey. Under reduced motion it rests at the far end rather
  // than jumping about as the step changes.
  const travel = reduceMotion ? 1 : progress;
  // The donee end lights up as the parcel approaches, so arrival is felt
  // rather than announced. This is the *anticipation*, spanning most of the
  // belt; the merge below is the arrival itself, and the two own different
  // properties so nothing is driven twice.
  const arrival = arrivalFactor(travel);

  // The merge at each end. Under reduced motion `travel` is pinned to 1, which
  // falls out of this as donorDock 0 / doneeDock 1 — the parcel rests fully
  // absorbed into the donee, which is exactly the settled end state that path
  // has always shown. No special-casing needed.
  const { donorDock, doneeDock, docked } = dockFactors(travel);

  // The node fills AHEAD of the parcel's arrival (the ÷0.75), so both are the
  // same colour by the time they coincide and the handoff cannot be seen.
  const donorFill = ease(clamp01(donorDock / 0.75));
  const doneeFill = ease(clamp01(doneeDock / 0.75));
  const merge = ease(docked);

  // Position has to converge too, not just size. Travelling linearly, the parcel
  // is still ~3% of the panel short of the node for most of the dock — so the
  // shrunken disc and the node sat side by side as a same-coloured peanut and
  // only snapped together on the last frame. Pulling the parcel onto the node it
  // is merging with is what makes the merge actually merge; it also means the
  // parcel visibly peels out of the donor rather than starting to slide before
  // it has cleared it.
  const beltLeft = BELT_START + (BELT_END - BELT_START) * travel;
  const dockTarget = doneeDock > 0 ? BELT_END : BELT_START;
  const parcelLeft = beltLeft + (dockTarget - beltLeft) * merge;

  // Colour tracks `progress`, NOT `travel`. Under reduced motion `travel` is
  // pinned to 1 so nothing slides — but a colour shift is not motion and causes
  // nobody any trouble, so it should still follow the scroll rather than jump
  // straight to the end state.
  const accent = mix(ACCENT_WARM, ACCENT_COOL, progress);
  const ground = mix(GROUND_WARM, GROUND_COOL, progress);

  return (
    <section ref={sectionRef} id="how" className="relative" style={{ height: "180vh" }}>
      {/* The panel's offset comes from --ck-nav-h, the header's MEASURED height
          (published by SiteHeader via ResizeObserver), not a constant. The old
          4.5rem assumed a 72px bar against a desktop header that measures
          ~118px, so roughly 46px of this panel sat behind it.

          Inline rather than a class in styles.css on purpose: the value stays
          on the element, with no cascade-layer interaction between Tailwind's
          utilities and an unlayered rule. The fallback is the old 4.5rem, so
          before hydration this behaves exactly as it did. */}
      <div
        className="sticky overflow-hidden bg-[#12100e] border-b border-stone-800/60 flex flex-col"
        style={{
          top: "var(--ck-nav-h, 4.5rem)",
          height: "calc(100vh - var(--ck-nav-h, 4.5rem))",
          // The bg-[#12100e] class stays as the pre-hydration ground; this
          // inline value wins once React runs and carries the warm-to-cool
          // shift.
          backgroundColor: rgb(ground),
        }}
      >

        {/* Warm floor light, following the parcel down the belt. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 46% 40% at ${parcelLeft}% 62%, ${rgba(accent, 0.2)} 0%, transparent 64%)`,
          }}
        />

        {/* ── Background, three planes deep, all driven by the same scroll ──
             The section is a conveyor, so the background is the room it runs
             in: a floor grid, other crates further back, and a belt texture
             that makes the line read as actually running rather than drawn.

             Each plane moves at its own rate — that difference is the depth.
             Transform-only, so it composites; opacity stays low enough that the
             copy never competes with it. All of it sits below the `z-10`
             content and is hidden from assistive tech. ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>

          {/* Floor grid — the furthest plane, barely moving. */}
          <div
            className="absolute inset-y-0 -left-[20%] -right-[20%]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 88px)",
              transform: reduceMotion ? "none" : `translate3d(${-progress * 120}px, 0, 0)`,
              willChange: "transform",
            }}
          />

          {/* Other crates, further back and out of focus — the sense that this
              is one handover among many, not a diagram of a single parcel. */}
          {[
            { top: "16%", size: 120, rate: 300, tilt: -8, alpha: 0.05 },
            { top: "72%", size: 172, rate: 520, tilt: 6, alpha: 0.04 },
            { top: "34%", size: 84, rate: 680, tilt: 14, alpha: 0.055 },
            { top: "84%", size: 108, rate: 420, tilt: -12, alpha: 0.035 },
          ].map((c, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                top: c.top,
                // Spread across the width, then carried leftward by scroll at
                // their own rate — nearer crates move faster.
                left: `${12 + i * 26}%`,
                width: c.size,
                height: c.size,
                border: `2px solid rgba(255,255,255,${c.alpha})`,
                borderRadius: 18,
                transform: reduceMotion
                  ? `rotate(${c.tilt}deg)`
                  : `translate3d(${-progress * c.rate}px, 0, 0) rotate(${c.tilt}deg)`,
                willChange: "transform",
              }}
            />
          ))}

        </div>

        {/* ── The passing numeral. A large outlined step number that drifts up
             through the frame as its step completes, so scrolling feels like
             moving past something rather than watching a slideshow.

             Restored after the Conveyor rebuild dropped it, but NOT at its
             original placement. It used to be vertically centred at the right
             edge, which in the pre-rebuild layout was empty space — the
             conveyor now puts the DONEE node exactly there, so centred it sat
             behind the circle and its label. It is pinned to the upper band
             instead, and its drift is halved to ±12vh so that even at the
             extremes of travel it stays above the belt at 62%.

             It also takes a lighter stroke than the marquee's — two stroked
             layers on one panel only work if one is plainly subordinate.

             No z-index: the content below is `relative z-10`, so this stays
             behind it. Desktop only — at phone widths it would crowd the copy
             rather than sit behind it. Outline rather than fill: a solid glyph
             this size competes with the headline instead of framing it. ── */}
        <div
          className="absolute inset-0 pointer-events-none select-none hidden lg:flex items-start justify-end pt-[6vh] pr-[6vw] overflow-hidden"
          aria-hidden
        >
          <span
            className="font-black leading-none"
            style={{
              fontSize: "32vh",
              color: "transparent",
              WebkitTextStroke: `1px ${rgba(accent, 0.18)}`,
              transform: reduceMotion
                ? "none"
                : `translate3d(0, ${12 - progress * 24}vh, 0)`,
              willChange: "transform",
            }}
          >
            {step.step}
          </span>
        </div>

        {/*
          ── HEADER ──

          The section's own name and standfirst, restored after the Conveyor
          rebuild dropped them: for a while this read only "How it works", and
          `what.title` / `what.subtitle` sat unused in all fourteen message
          catalogues while the page no longer said anywhere what the section was.

          Sized deliberately below the step title. That title is the thing that
          changes as you scroll and is the reason to keep scrolling, so a header
          at the old 4xl would have two large headings arguing on one screen.
          This one stays a quiet label for the panel; the step stays the event.

          It is also the section's only `h2` — the step titles are `h3`, so
          without it the panel jumped a heading level.
        */}
        <div className="relative z-10 flex-shrink-0 flex items-end justify-between gap-6 px-6 lg:px-12 pt-7 pb-5 border-b border-white/10">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#e07b3a]">
              How it works
            </p>
            <h2 className="mt-1 text-lg lg:text-xl font-extrabold tracking-tight text-white leading-tight">
              {t("what.title")}
            </h2>
          </div>

          <div className="text-right">
            {/* Hidden below lg exactly as it was before the rebuild — at phone
                width it wrapped to three lines and pushed the step counter off
                its baseline. */}
            <p className="hidden lg:block max-w-xs text-xs leading-relaxed text-white/40">
              {t("what.subtitle")}
            </p>
            <p className="mt-1 text-xs text-white/40 tabular-nums">
              Step {step.step} of 0{STEP_COUNT}
            </p>
          </div>
        </div>

        {/* ── STAGE ── */}
        <div className="relative z-10 flex-1">

          {/* Copy rides above the belt and swaps with the step. */}
          <div className="absolute left-6 right-6 lg:left-12 lg:right-12 top-[6%] max-w-[560px]">
            {steps.map((s, i) => (
              <div
                key={s.step}
                className="absolute inset-x-0 top-0"
                style={{
                  opacity: i === activeStep ? 1 : 0,
                  transform: i === activeStep || reduceMotion ? "none" : "translateY(14px)",
                  transition: reduceMotion
                    ? "opacity 0.2s linear"
                    : "opacity 0.45s ease, transform 0.45s ease",
                  pointerEvents: i === activeStep ? "auto" : "none",
                }}
              >
                <h3
                  className="font-extrabold text-white leading-[1.02] tracking-[-0.035em] mb-3"
                  style={{ fontSize: "clamp(2rem, 1.2rem + 3.4vw, 3.4rem)" }}
                >
                  {s.title}
                </h3>
                <p className="text-sm lg:text-[17px] leading-relaxed text-white/55 max-w-[460px]">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          {/*
            ── The handover proof ──

            The right half of the stage was empty: the copy block ends at ~40%
            of the width and the step numeral starts at ~78%, leaving a band
            with nothing in it above the belt. More to the point, the belt had
            no payoff — the parcel arrived, the donee node lit up, and the
            section never said what either side actually ends up with.

            This is that payoff, and it is the real mechanism rather than a
            decorative flourish: a handover is confirmed by BOTH parties with an
            OTP, and only then does a QR-verifiable certificate exist.

            It resolves on `arrival` — the same value the donee node uses — so
            the proof appears as the parcel lands rather than on a third
            timeline of its own. Bounded to stay inside the empty band: its
            bottom stays above the belt stencil at 62%, and its right edge stays
            inboard of the numeral.

            Desktop only. At narrow widths this column does not exist — the copy
            uses the full width — which is the same reason the numeral is
            `hidden lg:flex`.
          */}
          <div
            className="hidden lg:block absolute"
            style={{
              left: "44%",
              right: "24%",
              top: "8%",
              opacity: arrival,
              transform: reduceMotion ? "none" : `translateY(${(1 - arrival) * 12}px)`,
              willChange: "opacity, transform",
            }}
          >
            <div
              className="rounded-2xl px-5 py-4 flex items-center gap-4"
              style={{
                border: `1px solid ${rgba(mix(NODE_RIM, accent, doneeFill), 0.14 + 0.26 * doneeFill)}`,
                background: `linear-gradient(180deg, ${rgba(accent, 0.06)}, transparent)`,
              }}
            >
              {/* Decorative only — see PROOF_QR. Never announced. */}
              <svg
                viewBox="0 0 9 9"
                className="w-12 h-12 shrink-0"
                aria-hidden
                focusable="false"
              >
                {PROOF_QR.map((row, y) =>
                  row.split("").map((cell, x) =>
                    cell === "1" ? (
                      <rect
                        key={`${x}-${y}`}
                        x={x}
                        y={y}
                        width={1}
                        height={1}
                        fill={rgba(mix(NODE_RIM, accent, doneeFill), 0.32 + 0.5 * doneeFill)}
                      />
                    ) : null,
                  ),
                )}
              </svg>

              <div className="min-w-0">
                <p
                  className="text-[11px] font-extrabold uppercase tracking-[0.18em]"
                  style={{ color: `rgba(255, 255, 255, ${0.4 + 0.45 * doneeFill})` }}
                >
                  Handover confirmed
                </p>
                {/* Deliberately incomplete. A real number is CK-IK-{year}-{seq}
                    plus an HMAC suffix, and the HMAC exists precisely to stop
                    people guessing valid numbers — so this shows the shape and
                    withholds the rest rather than printing a plausible one. */}
                <p
                  className="text-sm font-extrabold tabular-nums tracking-tight mt-0.5"
                  style={{ color: `rgba(255, 255, 255, ${0.55 + 0.4 * doneeFill})` }}
                >
                  CK-IK-2026-••••
                </p>
                <p className="text-xs leading-relaxed text-white/40 mt-1">
                  Both sides confirm with a one-time code. Only then is the
                  certificate issued — and anyone can verify it.
                </p>
              </div>
            </div>
          </div>

          {/*
            ── Belt stencil ──

            The platform's promise, printed on the belt the way a real conveyor
            carries its own markings. It runs leftward as you scroll — the same
            direction as the floor grid and the crates, and the opposite of the
            parcel, so the belt reads as moving *under* the item rather than
            carrying it along passively.

            It lives inside the STAGE and above this comment's belt block only
            in source order, which is what puts it behind the belt line, the
            parcel and the nodes: everything in here is absolutely positioned,
            so DOM order is the stacking order. Same reason the belt texture
            itself is in here rather than in the panel's background layer — 62%
            is a percentage of the stage, and at 62% of the panel it would miss
            the line entirely.

            Outlined rather than filled. Filled glyphs at a legible size start
            competing with the step copy; a hairline stroke reads as something
            stamped into the surface, which is what it is meant to be. The
            stroke takes the scroll-linked `accent`, so the wording warms at the
            donor end and cools at the donee end with everything else.

            English, and not translated — as with DONOR/DONEE, "How it works"
            and "Keep scrolling", this is chrome rather than content. Worth
            revisiting if the section's chrome is ever localised as a whole.
          */}
          <div
            className="absolute inset-x-0 overflow-hidden pointer-events-none"
            style={{ top: "62%", transform: "translateY(-50%)" }}
            aria-hidden
          >
            <div
              className="flex whitespace-nowrap"
              style={{
                // Repeated far wider than the panel, so the strip never runs
                // out of text before the scroll runs out of travel — cheaper
                // and steadier than a modulo loop, which visibly jumps at the
                // wrap and would have to be re-tuned for every panel width.
                transform: reduceMotion ? "none" : `translate3d(${-progress * 760}px, 0, 0)`,
                willChange: "transform",
                marginLeft: "-30%",
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  className="font-black uppercase leading-none"
                  style={{
                    fontSize: "clamp(1.5rem, 1rem + 1.6vw, 2.6rem)",
                    letterSpacing: "0.22em",
                    paddingInlineEnd: "0.22em",
                    color: "transparent",
                    WebkitTextStroke: `1px ${rgba(accent, 0.38)}`,
                  }}
                >
                  Verified · Tracked · Handed over in person ·{" "}
                </span>
              ))}
            </div>
          </div>

          {/* ── The belt ── */}
          <div className="absolute inset-x-0" style={{ top: "62%" }}>
            {/* Belt texture: dashes sliding along the line, so it reads as a
                belt that is running rather than a rule that was drawn. Lives
                here, inside the stage, because the belt's 62% is a percentage
                of the STAGE — putting this in the panel's background layer
                would sit it at 62% of the panel and miss the line entirely. */}
            <div
              className="absolute inset-x-0 h-[3px] pointer-events-none overflow-hidden"
              style={{ top: -1 }}
              aria-hidden
            >
              <div
                className="absolute inset-y-0 -left-[10%] -right-[10%]"
                style={{
                  backgroundImage:
                    `repeating-linear-gradient(90deg, ${rgba(accent, 0.5)} 0 18px, transparent 18px 46px)`,
                  transform: reduceMotion ? "none" : `translate3d(${-progress * 240}px, 0, 0)`,
                  willChange: "transform",
                }}
              />
            </div>
            <div className="relative h-px bg-white/10">
              {/* The travelled part, drawn behind the parcel. */}
              <div
                className="absolute left-0 top-0 h-px"
                style={{
                  width: `${parcelLeft}%`,
                  background: `linear-gradient(90deg, ${rgba(accent, 0.15)}, ${rgb(accent)})`,
                }}
              />
            </div>
            <div
              className="h-16 pointer-events-none"
              style={{ background: `linear-gradient(180deg, ${rgba(accent, 0.1)}, transparent)` }}
            />
          </div>

          {/* Donor end — holds the item at rest, and empties as it gives.

              The fill is the mirror of the donee's: full at progress 0, gone by
              the time the parcel has cleared the dock. The empty state is
              rgb(ground) rather than the old hardcoded #12100e, which also
              fixes a real (if quiet) bug — the node did not follow the panel's
              warm-to-cool ground shift, so at high progress it sat warm-black
              against a cool-black panel. */}
          <div
            className="absolute flex flex-col items-center gap-2.5"
            style={{ left: `${BELT_START}%`, top: "62%", transform: "translate(-50%, -50%)" }}
          >
            <span
              className="w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: rgb(mix(ground, accent, donorFill)),
                // Lerps colour AND alpha together, so it is continuous: at
                // fill 0 this is exactly the old border-white/25.
                border: `2px solid ${rgba(mix(NODE_RIM, accent, donorFill), 0.25 + 0.75 * donorFill)}`,
                // A small receiving pulse. Goes on this span, not the wrapper —
                // the wrapper's translate(-50%,-50%) is doing the centring.
                transform: `scale(${1 + 0.06 * donorFill})`,
                boxShadow: `0 0 0 ${6 * donorFill}px ${rgba(accent, 0.1)}, 0 14px 34px ${rgba(accent, 0.45 * donorFill)}`,
              }}
            >
              <User
                className="w-5 h-5 lg:w-6 lg:h-6"
                strokeWidth={1.7}
                style={{ color: `rgba(255,255,255,${0.55 + 0.45 * donorFill})` }}
              />
            </span>
            <span
              className="text-[11px] font-extrabold uppercase tracking-[0.18em]"
              style={{ color: `rgba(255,255,255,${0.35 + 0.5 * donorFill})` }}
            >
              Donor
            </span>
          </div>

          {/* Donee end — resolves from dashed outline to solid as the parcel
              nears, then fills as it lands.

              Two effects, deliberately kept on separate properties so nothing
              is driven twice: `arrival` (the long anticipatory approach, from
              mid-belt) owns the border STYLE and the label, while `doneeFill`
              (the merge itself, only the last stretch) owns the fill, the
              border COLOUR, the icon and the glow. */}
          <div
            className="absolute flex flex-col items-center gap-2.5"
            style={{ left: `${BELT_END}%`, top: "62%", transform: "translate(-50%, -50%)" }}
          >
            <span
              className="w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: rgb(mix(ground, accent, doneeFill)),
                border: `2px ${arrival > 0.9 ? "solid" : "dashed"} ${rgba(mix(NODE_RIM, accent, doneeFill), 0.18 + arrival * 0.5 + 0.32 * doneeFill)}`,
                transform: `scale(${1 + 0.06 * doneeFill})`,
                boxShadow: `0 0 0 ${6 * doneeFill}px ${rgba(accent, 0.1)}, 0 14px 34px ${rgba(accent, 0.45 * doneeFill)}`,
              }}
            >
              <Home
                className="w-5 h-5 lg:w-6 lg:h-6"
                strokeWidth={1.7}
                style={{ color: `rgba(255,255,255,${Math.min(1, 0.3 + arrival * 0.6 + 0.4 * doneeFill)})` }}
              />
            </span>
            <span
              className="text-[11px] font-extrabold uppercase tracking-[0.18em]"
              style={{ color: `rgba(255,255,255,${0.35 + arrival * 0.5})` }}
            >
              Donee
            </span>
          </div>

          {/* The parcel — the thing actually being given, mid-journey.

              At each end it merges into the node rather than sitting on top of
              it: it rounds off to a circle, shrinks to the node's diameter, and
              drops its shadow as it settles into the socket. The fade is the
              trick — it runs only over the last stretch of the merge, by which
              point the circle underneath is already `rgb(accent)` too and the
              same apparent size. Two coincident discs of one colour cross-
              fading cannot be seen, so it reads as the box having *become* the
              circle rather than having vanished behind it. */}
          <div
            className="absolute"
            style={{
              left: `${parcelLeft}%`,
              top: "62%",
              // 76px × 0.72 ≈ 55px, against a 56px node — they coincide almost
              // exactly at the moment of the handoff, which is what makes it
              // invisible.
              transform: `translate(-50%, -50%) scale(${1 - 0.28 * merge})`,
              opacity: 1 - clamp01((docked - 0.72) / 0.28),
              willChange: "left",
            }}
          >
            <span
              className="flex w-[68px] h-[68px] lg:w-[76px] lg:h-[76px] items-center justify-center"
              style={{
                background: rgb(accent),
                // 18px → 38px. That is half of the 76px desktop box, so it
                // lands exactly on a circle; CSS clamps an over-large radius
                // proportionally, so the 68px mobile box is a circle too.
                borderRadius: `${18 + 20 * merge}px`,
                boxShadow: `0 18px 44px ${rgba(accent, 0.55 * (1 - merge))}`,
              }}
            >
              <Package className="w-8 h-8 lg:w-9 lg:h-9 text-white" strokeWidth={1.7} />
            </span>
          </div>

        </div>

        {/* ── BOTTOM ── */}
        <div className="relative z-10 flex-shrink-0 flex items-center gap-4 px-6 lg:px-12 pb-7">
          <div className="flex-1 h-[2px] bg-white/10">
            <div
              className="h-full origin-left"
              style={{
                backgroundColor: rgb(accent),
                transform: `scaleX(${progress})`,
                willChange: "transform",
              }}
            />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/30 whitespace-nowrap">
            {progress > 0.92 ? "That’s how it works" : "Keep scrolling"}
          </span>
        </div>

      </div>
    </section>
  );
}
