/**
 * GanpatiLogoVideo — the animated Ganeshotsav lockup in the header.
 *
 * <p>The clip is the Ganesha pulsing-golden animation with real VP9 alpha
 * transparency, so it composites cleanly over both light and dark grounds
 * without blend-mode hacks or chip workarounds.
 *
 * <p>Reduced-motion viewers get a static poster frame and never fetch the clip.
 */

/** The delivered clip with VP9 alpha transparency. */
const CLIP_SRC = "/images/ganpati/CauseKind_Ganesha_logo_transparent_web.webm";
/** Poster / reduced-motion still (reused from the previous cut). */
const STILL_SRC = "/images/ganpati/ganpati-logo-still.jpg";

/**
 * Height tokens per size. Slightly taller than `GanpatiWordmark`'s 48/68/82
 * so the animation's wordmark reads at a comparable width in the bar.
 */
const HEIGHTS = { sm: 52, md: 72, lg: 88 } as const;

export type GanpatiLogoVideoSize = keyof typeof HEIGHTS;

/**
 * Reduced motion gets the still, and does not pay for the clip.
 *
 * <p>Same contract as `RakshaBandhanWordmark`: `preload="none"` plus
 * `display: none` is the strongest declarative hint that a viewer who asked for
 * less motion should not also fetch the animation they will never see.
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

  return (
    <span
      // Decorative: the link around this already carries aria-label="CauseKind",
      // so announcing it again would say the brand name twice.
      aria-hidden="true"
      className={`relative block shrink-0 overflow-hidden ${className}`}
      style={{ height }}
    >
      <style dangerouslySetInnerHTML={{ __html: LOGO_CSS }} />

      {/* Reduced-motion stand-in. */}
      <img
        src={STILL_SRC}
        alt=""
        draggable={false}
        decoding="async"
        className="ck-glv-still h-full w-auto object-contain"
      />

      {/* Alpha-transparent clip — no blend-mode needed. */}
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
        className="ck-glv-clip h-full w-auto object-contain"
      />
    </span>
  );
}

export default GanpatiLogoVideo;
