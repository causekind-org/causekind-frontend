"use client";

import { useState } from "react";

/**
 * PeekingMushakGanpati — Bappa's mushak peering over the top edge of a card.
 *
 * <p><b>What it is.</b> The donee door's answer to {@link PeekingBappaGanpati}
 * on the donor door: the same gesture, the same seam, one card lower. The clip
 * has the pose baked in — the mouse is cut flat across the bottom and his paws
 * curl over that cut — so this component only has to land the cut on the card's
 * top edge. Everything below is the arithmetic that does it, at any phone width.
 *
 * <p><b>Phone tree only.</b> Its one caller is `MobileDoorsGanpati`, mounted
 * only inside `HomeClient`'s `lg:hidden` branch and only when
 * `isGanpatiActive()` is true. Nothing here is responsive because nothing here
 * is ever painted above `lg`.
 *
 * <p><b>No niche, and that is the whole difference from Bappa.</b> His clip is
 * H.264, which carries no alpha, so his key was flattened on to black and is
 * composited back out with `mix-blend-mode: screen`. Screen is exact over a
 * dark ground and ruinous over a light one — it blows a light subject out — so
 * he needs the dark arched niche he sits in, and the niche needs the near-black
 * donor card under it to read as one shrine.
 *
 * <p>The donee card is warm parchment. Dropping that same dark niche on to it
 * would have been a black box on cream, and screening the clip straight on to
 * the parchment would have left a ghost. So the mushak was given real alpha
 * instead, and composites with no ground of its own at all: no niche, no halo,
 * no blend mode, nothing behind him but the card.
 *
 * <p><b>How the alpha was made.</b> `mushak.webm` is delivered the same way
 * Bappa is — key flattened on to black, no alpha — and `public/images/ganpati/`
 * keeps it as the source. The shipped `mushak-peek.webm` is VP9 with
 * `yuva420p`, which is the only widely supported web video format that carries
 * an alpha channel; `docs/raksha-bandhan-campaign.md` records the same decision
 * for the rakhi wordmark and is worth reading before touching this.
 *
 * <p>The key itself could not be a colour key, which is the part worth
 * recording. The mouse's pupils measure a true 0,0,0 — the same value as the
 * matte — so `colorkey=0x000000` at any usable tolerance punches two holes
 * through his eyes. It was keyed by flood-filling the matte inward from the
 * frame border instead: black that the fill can reach is background, black it
 * cannot reach is enclosed by the subject and stays opaque. The rim then gets
 * an alpha ramp and is un-premultiplied (flattening on to black *is*
 * premultiplication), the green spill left by the original key is pulled back
 * to the red/blue mean, and the transparent region is filled by bleeding the
 * subject's own colour three pixels outward and then flooding the rest with the
 * card's parchment — because `yuva420p` subsamples chroma, so whatever sits
 * under a transparent pixel still tints the visible pixel beside it.
 *
 * <p><b>It may carry a `z-index`, unlike Bappa.</b> His root must stay
 * `z-index: auto` or the blend loses the card from its backdrop. Nothing here
 * blends, so the whole wrapper simply sits above the card — which is what puts
 * the paws on the card face rather than behind it.
 */

const CLIP_SRC = "/images/ganpati/mushak-peek.webm";

/** One frame of the clip, at rest: both paws on the edge, looking straight out.
 *  Poster, reduced-motion stand-in, and what is left if the clip will not load
 *  — all three want the same picture, so they share one file. It is frame 0, so
 *  playback starts on the picture the poster was already showing. */
const STILL_SRC = "/images/ganpati/mushak-peek-still.webp";

/* ────────────────────────────────────────────────────────────────────────────
   Measured from the shipped clip

   Re-measure these if it is ever recut; everything below re-derives itself.
   ────────────────────────────────────────────────────────────────────────── */

/** Frame size, used only for the width:height ratio. */
const CLIP_W = 448;
const CLIP_H = 300;

/**
 * Where the mouse is cut flat, as a fraction of frame height (row 488 of 518 in
 * the keyed master, before it was scaled). This is the alignment seam — the
 * card's top edge goes exactly here. Below it the paws hang on to row 512
 * (0.988), so about 4.6% of the clip's height laps on to the card face.
 */
const LEDGE_RATIO = 488 / 518;

/**
 * The clip's painted width as a fraction of the card's — the only size knob
 * here. He is a mouse standing next to an elephant-headed god one card up, and
 * the pair only reads if he stays the smaller of the two: Bappa lands at ~70%
 * of his card, this at 46%.
 *
 * <p>No horizontal nudge accompanies it, unlike Bappa's. His frame has the
 * figure sitting left of its centre, so the clip has to be pushed right to
 * centre *him*. This clip was cropped to the union of the mouse's own envelope
 * across all 240 frames, so the frame's centre and his are already the same
 * point and centring the box centres him.
 */
const CLIP_SCALE = 0.46;

/**
 * The wrapper's aspect ratio, so its height follows the card's width at every
 * phone size and the seam stays put. Its height *is* the ledge's depth into the
 * clip — that identity is what lands the paws on the card's edge rather than
 * near it.
 */
const WRAP_ASPECT = 1 / (CLIP_SCALE * (CLIP_H / CLIP_W) * LEDGE_RATIO);

/**
 * Where the clip and the still both hang. `top: 0` against the derived wrapper
 * height is what puts the flat cut on the card's edge.
 */
const ART_STYLE = {
  top: 0,
  left: "50%",
  width: `${CLIP_SCALE * 100}%`,
  aspectRatio: CLIP_W / CLIP_H,
} as const;

const ART_CLASS = "absolute max-w-none -translate-x-1/2";

/**
 * Under `prefers-reduced-motion` the clip is swapped for the still frame.
 *
 * <p><b>Why the swap is CSS and not an effect.</b> Pausing a `<video>` needs
 * JavaScript, but *not loading* it does not: `preload="none"` plus
 * `display: none` is the strongest declarative hint that a viewer who asked for
 * less motion should not also pay 430 KB for an animation they will never see.
 * Engines differ on whether a hidden autoplaying element still fetches, so this
 * is a hint rather than a guarantee — but the still already carries the meaning
 * there, which is the part that has to be right.
 */
const PEEK_CSS = `
  .ckm-mushak-still { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .ckm-mushak-still { display: block; }
    .ckm-mushak-clip  { display: none; }
  }
`;

export function PeekingMushakGanpati({ className = "" }: { className?: string }) {
  // If the clip 404s, or the browser decodes VP9 but ignores WebM alpha, the
  // still takes over rather than the card wearing a box. It is the same frame
  // the poster would have shown, so nothing about the layout moves.
  const [clipFailed, setClipFailed] = useState(false);

  return (
    // In flow, not absolute: the wrapper has to reserve its own height or the
    // mouse lands across the card above. Only the art overflows, and only
    // downward — which is the paws on the card's edge.
    //
    // `z-10` is on the wrapper rather than on the art because nothing here
    // blends; see the note on the component above.
    <div
      aria-hidden="true"
      className={`pointer-events-none relative z-10 select-none ${className}`}
      style={{ aspectRatio: WRAP_ASPECT }}
    >
      <style dangerouslySetInnerHTML={{ __html: PEEK_CSS }} />

      {/* The mushak, still. Hidden by default; shown when the viewer asked for
          less motion, or when the clip did not arrive. */}
      <img
        src={STILL_SRC}
        alt=""
        draggable={false}
        decoding="async"
        className={`${ART_CLASS} ${clipFailed ? "" : "ckm-mushak-still"}`}
        style={ART_STYLE}
      />

      {/* The mushak, moving. `muted` is not decoration — it is the condition
          under which a phone will autoplay at all, and the clip is encoded with
          no audio track besides. React puts it in the server HTML, so the
          parse-time autoplay attempt already sees it; a refusal (iOS in Low
          Power Mode) simply leaves the poster up, which is the still above. */}
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
          className={`${ART_CLASS} ckm-mushak-clip`}
          style={ART_STYLE}
          onError={() => setClipFailed(true)}
        />
      )}
    </div>
  );
}

export default PeekingMushakGanpati;
