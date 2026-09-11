/**
 * GanpatiLogoVideo — the supplied animated Ganeshotsav lockup, in the header.
 *
 * <p>The clip is the same artwork `GanpatiWordmark` ships as a still: the
 * heart-and-hands mark, a reclining Ganesha, the "CauseKind" wordmark, the
 * mushak with a modak and a thali of them. It replaces that still for the
 * festival window, and like it, it stands for the whole brand — so nothing else
 * is rendered beside it.
 *
 * <p><b>The clip is opaque, and that decides the whole design here.</b> Its
 * WebM container declares `AlphaMode = 1`, but the content behind it is a solid
 * warm plate — measured at rgb(252, 246, 237) in the corners, and composited
 * over magenta, over the dark header and over cream it comes out identical in
 * all three. So there is no transparency to composite with, and the plate has
 * to be dealt with rather than wished away:
 *
 * <ul>
 *   <li><b>Light ground: `mix-blend-mode: multiply`.</b> Multiply is the exact
 *   inverse of the `screen` trick the peeking-Bappa niche uses — where screen
 *   makes black the identity, multiply makes white the identity. The plate is
 *   within a few points of the header's own #faf8f5, so multiplying drops it
 *   away and leaves the artwork sitting directly on the bar.</li>
 *   <li><b>Dark ground: a chip.</b> There is no blend mode that removes a light
 *   plate while keeping dark artwork, because the artwork's own "Cause" is
 *   near-black — anything that erases the plate erases the word with it. So on
 *   dark the plate is kept deliberately, rounded, as a warm badge. That is a
 *   normal way to put a light lockup on a dark bar, and it is honest about what
 *   the asset is.</li>
 * </ul>
 *
 * <p><b>What a re-export would buy.</b> A VP9 WebM with real transparency would
 * let the chip go and the same element serve both grounds. The same pass should
 * shrink it: at 2.9 MB this is ~45x the still it replaces, on every page load.
 * See the note in the navbar for the exact command.
 *
 * <p><b>The crop is measured, not guessed.</b> A frame decoded at 960x540 has
 * ink from row 24 to row 487; above and below that is bare plate. Cropping it
 * off is what keeps the lockup from floating in the middle of a tall box, and
 * it is why this component sizes a window and pulls the video up inside it
 * rather than just setting a height.
 */

/** The delivered clip, and one frame of it for the poster and the still. */
const CLIP_SRC = "/images/ganpati/ganpati-logo.webm";
const STILL_SRC = "/images/ganpati/ganpati-logo-still.jpg";

/** Frame aspect of the source. */
const FRAME_RATIO = 16 / 9;

/**
 * Where the artwork actually starts and ends in the frame, as fractions of its
 * height — measured off a decoded frame, not eyeballed. Everything below is
 * derived from these two, so a recut clip needs only these re-measured.
 */
const INK_TOP = 24 / 540;
const INK_BOTTOM = 487 / 540;
const INK_HEIGHT = INK_BOTTOM - INK_TOP;

/** Visible aspect after the dead plate is cropped off top and bottom. */
const CROP_RATIO = FRAME_RATIO / INK_HEIGHT;

/**
 * Taller than `GanpatiWordmark`'s 48/68/82. That artwork is a tight 2.69 crop;
 * this one is a 16:9 composition with a lot of air around the lockup, so at the
 * same height its wordmark reads noticeably smaller. These heights put the two
 * at a comparable width in the bar.
 */
const HEIGHTS = { sm: 52, md: 72, lg: 88 } as const;

export type GanpatiLogoVideoSize = keyof typeof HEIGHTS;

/**
 * Reduced motion gets the still, and does not pay for the clip.
 *
 * <p>Same contract as `RakshaBandhanWordmark`: `preload="none"` plus
 * `display: none` is the strongest declarative hint that a viewer who asked for
 * less motion should not also fetch 2.9 MB of animation they will never see.
 * A pulsing logo in a fixed header is exactly the motion that setting is for —
 * it is on screen for the whole visit, not just while a section is in view.
 */
const LOGO_CSS = `
  .ck-glv-still { display: none; }
  @media (prefers-reduced-motion: reduce) {
    .ck-glv-still { display: block; }
    .ck-glv-clip  { display: none; }
  }
`;

export function GanpatiLogoVideo({
  size = "md",
  className = "",
}: {
  size?: GanpatiLogoVideoSize;
  className?: string;
}) {
  const height = HEIGHTS[size];
  const width = Math.round(height * CROP_RATIO);

  // The video is laid out at full frame height and pulled up, so the window
  // shows only the inked band. `overflow-hidden` does the cropping.
  const frameHeight = height / INK_HEIGHT;
  const art = {
    width: "100%",
    height: frameHeight,
    top: -(frameHeight * INK_TOP),
    objectFit: "cover" as const,
  };

  return (
    <span
      // Decorative: the link around this already carries aria-label="CauseKind",
      // so announcing it again would say the brand name twice.
      aria-hidden="true"
      className={`relative block shrink-0 overflow-hidden rounded-lg dark:bg-[#fcf6ed] ${className}`}
      style={{ width, height }}
    >
      <style dangerouslySetInnerHTML={{ __html: LOGO_CSS }} />

      {/* Reduced-motion stand-in. Already cropped to the ink, so it needs no
          offset of its own. */}
      <img
        src={STILL_SRC}
        alt=""
        draggable={false}
        decoding="async"
        className="ck-glv-still absolute inset-0 h-full w-full object-cover"
      />

      {/* `multiply` only where the ground is light. In dark mode the element
          above supplies the chip and the blend is switched off, because
          multiplying this plate against a near-black bar would take the
          artwork down with it. */}
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
        className="ck-glv-clip absolute left-0 max-w-none mix-blend-multiply dark:mix-blend-normal"
        style={art}
      />
    </span>
  );
}

export default GanpatiLogoVideo;
