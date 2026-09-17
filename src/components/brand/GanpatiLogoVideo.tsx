/**
 * GanpatiLogoVideo — the animated Ganeshotsav lockup in the header.
 *
 * <p>The clip is the Ganesha pulsing-golden animation with real VP9 alpha
 * transparency, so it composites cleanly over both light and dark grounds
 * without blend-mode hacks or chip workarounds.
 *
 * <p>Reduced-motion viewers get a static still in place of the clip.
 */

/** The delivered clip with VP9 alpha transparency. */
const CLIP_SRC = "/images/ganpati/CauseKind_Ganesha_logo_transparent_web.webm";
/** Intrinsic size of `CLIP_SRC`, so its box is reserved before it loads. */
const CLIP_ASPECT = "392 / 220";
/** Reduced-motion still (reused from the previous cut). */
const STILL_SRC = "/images/ganpati/ganpati-logo-still.jpg";

/**
 * Height tokens per size. Slightly taller than `GanpatiWordmark`'s 48/68/82
 * so the animation's wordmark reads at a comparable width in the bar.
 */
const HEIGHTS = { sm: 52, md: 72, lg: 88 } as const;

export type GanpatiLogoVideoSize = keyof typeof HEIGHTS;

/**
 * Reduced motion gets the still instead of the clip.
 *
 * <p>A pulsing logo in a fixed header is exactly the motion that setting is for —
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

      {/* Alpha-transparent clip — no blend-mode needed.
          No `poster`: the still is an opaque JPG, so on every load it sat in the
          header for the second or two the clip took to arrive, reading as a
          frozen logo. The slot stays empty until the first frame instead, and
          `aspectRatio` (the clip's own 392×220) holds its width meanwhile so
          the bar does not shift when it appears. `preload="auto"` starts the
          fetch as early as the element exists. */}
      <video
        src={CLIP_SRC}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        tabIndex={-1}
        className="ck-glv-clip h-full w-auto object-contain"
        style={{ aspectRatio: CLIP_ASPECT }}
      />
    </span>
  );
}

export default GanpatiLogoVideo;
