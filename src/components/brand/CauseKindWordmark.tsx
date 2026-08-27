/**
 * The CauseKind wordmark, as a picture element.
 *
 * <p><b>Currently unused — kept deliberately, not abandoned.</b> The three files
 * in `public/brand/` are the **Independence Day** artwork: "Cause" in saffron,
 * "Kind" in green, with the flag-cloth ripple they were built for. The colours
 * are baked into the images, so there is no way to neutralise them in CSS.
 *
 * <p>Because the asset swap was never tied to the campaign's own on/off switch,
 * it stayed live for ten days after that window closed on 18 August, and the
 * site was still flying a flag on 27 August. `Navbar.tsx` therefore renders the
 * styled-text wordmark again, which the stylesheet can theme per season.
 *
 * <p>This component and its assets are correct and ready for 15 August 2027.
 * Wire them back in **behind `isIndependenceDayCampaignActive()`**, not
 * unconditionally, or the same thing happens again.
 *
 * <p>One component owns the asset choice so nothing else in the app has to know
 * which file to load, what the aspect ratio is, or how to behave under reduced
 * motion. It is a server component on purpose — plain markup, no client
 * JavaScript, so the logo is in the first HTML response rather than after
 * hydration.
 *
 * <p><b>Reduced motion is handled by the markup, not by a hook.</b> A
 * `<source media="(prefers-reduced-motion: reduce)">` is evaluated by the
 * browser before the image is fetched, so a user who has asked for less motion
 * never downloads the animation at all — and there is no hydration mismatch,
 * because no JavaScript is involved in the decision. A `useReducedMotion()`
 * hook could not do either of those things: it resolves after the first paint,
 * by which point the animated file is already on the wire.
 *
 * <p>Source order is the selection order. The browser takes the first source it
 * both matches and can decode:
 * <ol>
 *   <li>reduced motion → the static frame (18 KB)</li>
 *   <li>otherwise, animated WebP (230 KB) where WebP is supported</li>
 *   <li>the GIF, for anything that cannot decode animated WebP</li>
 * </ol>
 */

/** Intrinsic size of the shipped assets. Everything else is derived from it. */
const INTRINSIC = { width: 448, height: 95 } as const;
const RATIO = INTRINSIC.width / INTRINSIC.height;

/**
 * Rendered heights, chosen against the type scale the text logo used
 * (text-base / text-xl / text-2xl). Widths are computed rather than typed in,
 * so the aspect ratio cannot drift from the asset if a height is retuned.
 */
const HEIGHTS = { sm: 22, md: 28, lg: 34 } as const;

export type WordmarkSize = keyof typeof HEIGHTS;

export function CauseKindWordmark({
  size = "md",
  className = "",
  alt = "CauseKind",
  priority = false,
}: {
  size?: WordmarkSize;
  className?: string;
  /**
   * Empty string marks the image decorative — use it wherever an ancestor
   * already names the logo, so a screen reader hears "CauseKind" once rather
   * than twice.
   */
  alt?: string;
  /** Set on the header instance: it is above the fold on every route. */
  priority?: boolean;
}) {
  const height = HEIGHTS[size];
  const width = Math.round(height * RATIO);
  const decorative = alt === "";

  return (
    <picture>
      <source
        media="(prefers-reduced-motion: reduce)"
        srcSet="/brand/causekind-wordmark-static.webp"
        type="image/webp"
      />
      <source srcSet="/brand/causekind-wordmark-animated.webp" type="image/webp" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/causekind-wordmark.gif"
        alt={alt}
        aria-hidden={decorative || undefined}
        // Explicit intrinsic dimensions, so the box is reserved before the
        // bytes arrive and the header never reflows around a loading logo.
        width={width}
        height={height}
        // Both set: width/height above give the browser the ratio, and the
        // style pins the rendered size independently of any inherited img rule.
        style={{ width, height }}
        className={`block max-w-full select-none ${className}`}
        draggable={false}
        decoding="async"
        // The header logo is in the first viewport on every route, so it is
        // worth the early fetch. Everything else stays lazy.
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
      />
    </picture>
  );
}
