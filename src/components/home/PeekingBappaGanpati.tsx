"use client";

import { useState } from "react";

/**
 * PeekingBappaGanpati — Bappa playing peek-a-boo over the top edge of a card.
 *
 * <p><b>What it is.</b> A dark arched niche that rises out of the card directly
 * below it, with the chroma-keyed festival clip inside it. The clip already has
 * the gesture baked in: the figure is cut flat across the bottom and his
 * fingers curl over that cut, so all this component has to do is put the cut
 * exactly on the card's top edge. Everything below is the arithmetic that makes
 * that one seam land, at any phone width.
 *
 * <p><b>Phone tree only.</b> Its one caller is `MobileDoorsGanpati`, which is
 * itself mounted only inside `HomeClient`'s `lg:hidden` branch and only when
 * `isGanpatiActive()` is true. Nothing here is responsive because nothing here
 * is ever painted above `lg`.
 *
 * <p><b>Why `mix-blend-mode: screen`.</b> The clip carries no alpha — its key
 * was flattened to a black ground — so it has to be composited back out.
 * That is a fact about the artwork and not about the container: the clip was
 * H.264 and is now VP9 in WebM, and the delivered WebM is the same flattened
 * matte, not a keyed one. (Compare `mushak-peek.webm`, which does carry alpha
 * and therefore needs none of this.) Screen is the exact
 * composite for a black matte, not an approximation: `screen(base, black) = base`, so
 * every black pixel is the identity and disappears over *any* ground — the
 * cream page outside the niche included — while the rim light composites the
 * way light does. Runtime chroma-keying would mean a canvas readback of a
 * 914x720 frame thirty times a second on a phone, to solve a problem the blend
 * mode solves for free.
 *
 * <p>The one rule screen imposes is that the subject must only ever overlap a
 * dark ground, since it blows a light subject out over a light one. That is
 * what the niche is for, and why `NICHE_INSET` is the one horizontal number not
 * derived: the figure's whole travel has to stay inside it. It does, with about
 * 21% of the niche's width spare on each side — see `SUBJECT_X_MIN/MAX`.
 *
 * <p><b>Screen also makes the black floor matter.</b> The matte has to reach the
 * compositor at 0, not at TV-range 16, or the blend stops being an identity and
 * lifts the whole niche a visible step. Both encodes of this clip are tagged
 * limited-range and decode to 0; it was re-checked after the swap to WebM by
 * sampling the decoded corners, which is the thing to redo if the clip is ever
 * re-encoded. The still was pulled out by a decoder that does *not* expand the
 * range, so it was re-levelled to a true black floor before being saved.
 *
 * <p><b>It must not be given a stacking context.</b> The clip carries `z-10` so
 * the fingers paint over the card, which is the next sibling. That works only
 * while this component's own root stays `position: relative` with `z-index:
 * auto` — adding a `z-*`, a `transform`, an `opacity` or a `filter` to the root
 * would both trap the clip behind the card and cut the card out of the blend's
 * backdrop, and the fingers would vanish into a black rectangle.
 */

const CLIP_SRC = "/images/ganpati/bappa-peek.webm";

/** One frame of the clip, at rest: fully up, eyes open, hands on the edge.
 *  Poster, reduced-motion stand-in, and what is left if the clip will not
 *  load — all three want the same picture, so they share one file. */
const STILL_SRC = "/images/ganpati/bappa-peek-still.jpg";

/* ────────────────────────────────────────────────────────────────────────────
   Measured from the clip

   Sampled across fourteen frames spanning the ten-second loop. These are the
   only facts about the artwork in this file; re-measure them if the clip is
   ever recut and everything below re-derives itself.
   ────────────────────────────────────────────────────────────────────────── */

/** Frame size, used only for the width:height ratio. */
const CLIP_W = 914;
const CLIP_H = 720;

/**
 * Where the figure is cut flat, as a fraction of frame height (row 589 of 720).
 * This is the alignment seam — the card's top edge goes exactly here, which is
 * the whole trick. Below it the fingers curl on to row 620 (0.861), so about 4%
 * of the clip's height hangs over on to the card face.
 */
const LEDGE_RATIO = 589 / CLIP_H;

/**
 * Horizontal envelope of the figure across the whole loop — he leans side to
 * side, so this is the union of every frame, not one of them. It sits left of
 * the frame's centre, which is why the clip is nudged right rather than simply
 * centred.
 */
const SUBJECT_X_MIN = 86 / CLIP_W;
const SUBJECT_X_MAX = 732 / CLIP_W;
const SUBJECT_MID = (SUBJECT_X_MIN + SUBJECT_X_MAX) / 2;

/* ────────────────────────────────────────────────────────────────────────────
   Chosen, then derived
   ────────────────────────────────────────────────────────────────────────── */

/** The clip's painted width as a fraction of the niche's — the only size knob
 *  here. The figure fills ~71% of his frame, so he lands at ~57% of the niche. */
const CLIP_SCALE = 0.8;

/** How far the niche is held in from the card's sides. Matches the card's own
 *  1.375rem corner radius, so the niche's square base sits on the straight run
 *  of the card's top edge and no corner notches against it. */
const NICHE_INSET = "1.375rem";

/**
 * The niche's aspect ratio, so its height follows its width at every phone size
 * and the seam stays put. Its height *is* the ledge's depth into the clip —
 * that identity is what lands the hands on the card's edge rather than near it.
 */
const NICHE_ASPECT = 1 / (LEDGE_RATIO * CLIP_SCALE * (CLIP_H / CLIP_W));

/** Rightward nudge, as a percentage of the niche's width, that centres the
 *  *figure* in the niche rather than the frame he is drawn in. */
const CLIP_NUDGE_PCT = (0.5 - SUBJECT_MID) * CLIP_SCALE * 100;

/**
 * Where the clip and the still both hang. `top: 0` against the niche's derived
 * height is what puts the flat cut on the card's edge; `z-10` puts the fingers
 * that hang past it over the card; `screen` drops the black ground away on both
 * sides of that seam.
 */
const ART_STYLE = {
  top: 0,
  left: `calc(50% + ${CLIP_NUDGE_PCT.toFixed(3)}%)`,
  width: `${CLIP_SCALE * 100}%`,
  aspectRatio: CLIP_W / CLIP_H,
  mixBlendMode: "screen",
} as const;

const ART_CLASS = "absolute z-10 max-w-none -translate-x-1/2";

/**
 * The halo breathes, and under `prefers-reduced-motion` the clip is swapped for
 * the still frame.
 *
 * <p><b>Why the swap is CSS and not an effect.</b> Pausing a `<video>` needs
 * JavaScript, but *not loading* it does not: `preload="none"` plus
 * `display: none` is the strongest declarative hint that a viewer who asked for
 * less motion should not also pay 2.5 MB for an animation they will never see.
 * Engines differ on whether a hidden autoplaying element still fetches, so this
 * is a hint rather than a guarantee — but the still already carries the meaning
 * there, which is the part that has to be right.
 *
 * <p><b>The halo animates `transform` and must not touch the centring.</b>
 * Tailwind v4 compiles `-translate-x-1/2` to the standalone `translate`
 * property, not to `transform`, and the browser applies `translate` before
 * `transform` — so `transform: scale()` composes with the centring, while
 * re-declaring a `translateX(-50%)` in these keyframes would shift the halo
 * twice and throw it a full width off to the left.
 */
const PEEK_CSS = `
  @keyframes ckmBappaHalo {
    0%, 100% { opacity: 0.72; transform: scale(1); }
    50%      { opacity: 1;    transform: scale(1.05); }
  }
  .ckm-bappa-halo {
    animation: ckmBappaHalo 5.5s ease-in-out infinite;
    will-change: opacity, transform;
  }
  .ckm-bappa-still { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .ckm-bappa-halo  { animation: none !important; }
    .ckm-bappa-still { display: block; }
    .ckm-bappa-clip  { display: none; }
  }
`;

export function PeekingBappaGanpati({ className = "" }: { className?: string }) {
  // If the clip 404s or the codec is refused, the still takes over rather than
  // the niche going empty. It is the same frame the poster would have shown, so
  // nothing about the layout moves.
  const [clipFailed, setClipFailed] = useState(false);

  return (
    // In flow, not absolute: the niche has to reserve its own height or it lands
    // across the paragraph above the card. Only the art overflows, and only
    // downward — which is the hand that grips the card.
    <div
      aria-hidden="true"
      className={`pointer-events-none relative select-none ${className}`}
      style={{ marginInline: NICHE_INSET, aspectRatio: NICHE_ASPECT }}
    >
      <style dangerouslySetInnerHTML={{ __html: PEEK_CSS }} />

      {/* 1. The halo. Painted first, so the niche sits inside it and the card —
             a later sibling — covers the part that hangs below the seam. */}
      <div
        className="ckm-bappa-halo absolute bottom-[-14%] left-1/2 h-[132%] w-[126%] -translate-x-1/2 rounded-[50%]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(251,191,36,0.32), rgba(234,88,12,0.13) 58%, transparent 78%)",
        }}
      />

      {/* 2. The niche: a gold hairline ring, drawn as 1.5px of padding rather
             than a border, so the gradient runs unbroken around the dome
             instead of mitring at the corners. Its ground warms downward into
             the donor card's own `#240c04`, so the two read as one shrine and
             not as a box stacked on a card. */}
      <div className="absolute inset-0 rounded-t-[1.75rem] bg-gradient-to-b from-[#fbd784] via-[#c98a2e] to-[#8a5a1a] p-[1.5px] pb-0 shadow-[0_-8px_28px_rgba(217,119,6,0.26)]">
        <div className="relative h-full w-full overflow-hidden rounded-t-[1.65rem] bg-gradient-to-b from-[#070200] via-[#150702] to-[#240c04]">
          {/* The same saffron wash, falling from the same corner, as the donor
              card's own glow — otherwise the niche lights from nowhere. */}
          <div className="absolute inset-0 bg-[radial-gradient(125%_70%_at_80%_8%,rgba(234,88,12,0.36),transparent_62%)]" />
        </div>
      </div>

      {/* 3a. Bappa, still. Hidden by default; shown when the viewer asked for
              less motion, or when the clip did not arrive. */}
      <img
        src={STILL_SRC}
        alt=""
        draggable={false}
        decoding="async"
        className={`${ART_CLASS} ${clipFailed ? "" : "ckm-bappa-still"}`}
        style={ART_STYLE}
      />

      {/* 3b. Bappa, moving. `muted` is not decoration — the clip carries an
              audio track, and it is also the condition under which a phone will
              autoplay at all. React puts it in the server HTML, so the parse-
              time autoplay attempt already sees it; a refusal (iOS in Low Power
              Mode) simply leaves the poster up, which is the still above. */}
      {!clipFailed && (
        <video
          src={CLIP_SRC}
          poster={STILL_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          tabIndex={-1}
          className={`${ART_CLASS} ckm-bappa-clip`}
          style={ART_STYLE}
          onError={() => setClipFailed(true)}
        />
      )}
    </div>
  );
}

export default PeekingBappaGanpati;
