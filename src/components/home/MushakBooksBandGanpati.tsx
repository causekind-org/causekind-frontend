"use client";

import { useState } from "react";

/**
 * MushakBooksBandGanpati — the mushak hauling a tied stack of books across the
 * top of the mobile column, between the hero and the doors spine.
 *
 * <p><b>What it replaces.</b> A toran: `MobileToran` plus `FestiveLights`, hung
 * from the top of the column. The garland still exists and still hangs — it was
 * moved to the foot of the doors section, where `MobileGarlandStrip` closes the
 * spine — so the page keeps exactly one of it rather than opening and closing
 * with the same motif.
 *
 * <p><b>It is a band, not a peek.</b> The two `Peeking*` components are pinned
 * to a card's top edge and every number in them exists to land that seam. This
 * one is a full-bleed strip with nothing under it, so it needs none of that:
 * the clip's own 1280x360 frame is the box, and the walk carries the eye
 * left to right across the column into the question below it.
 *
 * <p><b>Alpha, so no matte and no blend mode.</b> The delivered clip is VP9 in
 * WebM with a real alpha channel — unlike `bappa-peek.webm`, whose key is
 * flattened on to black and has to be screened back out over a dark niche. This
 * one composites straight on to the column's cream, and on to its dark-mode
 * ground, with nothing behind it. `docs/ganpati-mushak-asset.md` records why
 * that distinction decides so much about how one of these clips can be placed.
 *
 * <p><b>He finishes the walk, and that took a re-encode.</b> The delivered clip
 * runs out from under him: at its last frame his tail is still on screen at
 * x=1132..1279 of 1280, so the loop cut while he was mid-exit and snapped him
 * back to the left. The shipped file appends 20 frames that carry the last one
 * on rightward at 12px — his own stride near the end measures ~11.5px/frame —
 * so he walks clear at t=10.5s and the loop holds ~0.3s of empty band before it
 * restarts. `mushak-books-source.webm` is the delivered original, kept
 * unmodified.
 *
 * <p><b>Why that holds at any screen width.</b> Two things together. The band
 * carries the clip's own 1280:360 aspect and `object-contain`, so the whole
 * frame is on screen at every width and no crop can eat the exit — `cover`
 * would have made the disappearance width-dependent. And the band is bled to
 * the true screen edges, which is what the missing `w-full` below is about: he
 * has to leave at the edge of the screen, not 40px short of it. Measured at 320,
 * 360, 390, 412, 430, 540, 768 and 1023px — the band is exactly viewport-wide
 * at each, and nothing of him is painted from t=10.55s to the loop point.
 */

const CLIP_SRC = "/images/ganpati/mushak-books.webm";

/** Frame 0 of the clip: the mushak entering from the left, books already in
 *  hand. Poster, reduced-motion stand-in, and what is left if the clip will not
 *  load — all three want the same picture, so they share one file. Frame 0
 *  rather than a prettier middle frame, so playback begins on exactly the
 *  picture the poster was already showing and nothing jumps. */
const STILL_SRC = "/images/ganpati/mushak-books-still.webp";

/** Frame size, used only for the width:height ratio. */
const CLIP_W = 1280;
const CLIP_H = 360;

const ART_CLASS = "absolute inset-0 block h-full w-full object-contain";

/**
 * Under `prefers-reduced-motion` the clip is swapped for the still frame.
 *
 * <p>Pausing a `<video>` needs JavaScript, but *not loading* it does not:
 * `preload="none"` plus `display: none` is the strongest declarative hint that
 * a viewer who asked for less motion should not also pay 1.4 MB for a walk
 * cycle they will never see. Engines differ on whether a hidden autoplaying
 * element still fetches, so this is a hint rather than a guarantee — but the
 * still already carries the meaning there, which is the part that has to be
 * right.
 */
const BAND_CSS = `
  .ckm-books-still { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .ckm-books-still { display: block; }
    .ckm-books-clip  { display: none; }
  }
`;

export function MushakBooksBandGanpati({ className = "" }: { className?: string }) {
  // If the clip 404s, or the browser decodes VP9 but ignores WebM alpha, the
  // still takes over rather than the column wearing a box. It is the same frame
  // the poster would have shown, so nothing about the layout moves.
  const [clipFailed, setClipFailed] = useState(false);

  return (
    // No `w-full` here, deliberately. This is stretched by the mobile column's
    // `flex flex-col`, and a caller bleeds it past the column's gutter with
    // `-mx-5`. Those two cooperate only while the width stays `auto`: an
    // explicit `width: 100%` is resolved against the column's *content* box, so
    // the negative margins then shift the band left without widening it and it
    // stops 40px short of the right screen edge — which is where the mushak
    // would appear to vanish, in mid-air, rather than at the edge.
    <div
      aria-hidden="true"
      className={`pointer-events-none relative select-none ${className}`}
      style={{ aspectRatio: `${CLIP_W} / ${CLIP_H}` }}
    >
      <style dangerouslySetInnerHTML={{ __html: BAND_CSS }} />

      <img
        src={STILL_SRC}
        alt=""
        draggable={false}
        decoding="async"
        className={`${ART_CLASS} ${clipFailed ? "" : "ckm-books-still"}`}
      />

      {/* `muted` is not decoration — it is the condition under which a phone
          will autoplay at all, and the clip is encoded with no audio track
          besides. React puts it in the server HTML, so the parse-time autoplay
          attempt already sees it; a refusal (iOS in Low Power Mode) simply
          leaves the poster up, which is the still above. */}
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
          className={`${ART_CLASS} ckm-books-clip`}
          onError={() => setClipFailed(true)}
        />
      )}
    </div>
  );
}

export default MushakBooksBandGanpati;
