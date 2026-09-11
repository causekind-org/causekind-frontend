/**
 * The Ganeshotsav CauseKind wordmark — the supplied festive artwork.
 *
 * <p>The artwork spells the whole brand: the heart-and-hands mark, a reclining
 * Ganesha, the mushak with a modak, a brass thali and drifting petals. It
 * replaces the styled-text wordmark *and* the LogoVideo mark beside it for the
 * festival window only, because it already contains both.
 *
 * <p><b>Where the transparency came from.</b> The source is RGB with no alpha —
 * the artwork sat on a warm cream ground (247,239,227). Dropped in as
 * delivered it renders a cream box, which is invisible against the light
 * header and glaring against the dark one. The alpha here was *created* by
 * keying that cream out on a smooth ramp (fully clear below a difference of
 * 14, fully opaque above 48; the border ring never deviates by more than 11,
 * so background can't survive and the artwork can't be eaten). Partially
 * transparent edge pixels are then un-premultiplied — without that step the
 * cream the edge was blended with shows as a pale fringe on the dark header.
 *
 * <p><b>Why there are two files.</b> "Cause" is near-black in the artwork, so
 * on the dark header it reads as a hole between the gold mark and the orange
 * "Kind". The dark file lifts *only* that word to warm cream, confined to the
 * wordmark's box: a global "lighten anything dark" pass also caught Ganesha's
 * eye lines and the mushak, which left white smudges on his face. Both files
 * share an identical alpha channel, which is what lets one mask drive the
 * shine over either of them.
 *
 * <p><b>The animation is CSS, not video.</b> The Raksha Bandhan wordmark ships
 * a 327 KB VP9 clip because it was delivered as an animation. This was
 * delivered as a still, so a gold shine is swept across it instead — the same
 * gesture LogoVideo already makes with its animated gradient, for ~67 KB per
 * theme rather than a video encode. The sweep runs once per cycle and then
 * rests: a header that re-runs its animation continuously pulls the eye off
 * the page for the whole visit.
 *
 * <p>Server component: plain markup, no client JavaScript, so the logo is in
 * the first HTML response rather than after hydration.
 */

const LIGHT_SRC = "/brand/causekind-ganpati.webp";
const DARK_SRC = "/brand/causekind-ganpati-dark.webp";

/** Native size of the delivered assets. Everything else derives from it. */
const INTRINSIC = { width: 560, height: 208 } as const;
const RATIO = INTRINSIC.width / INTRINSIC.height;

/**
 * Taller than the text wordmark's 22/28/34, for the same reason the rakhi one
 * is: only ~38% of this artwork's height is the word — the rest is Ganesha,
 * the thali and the petals. Measured off the alpha, the letters occupy rows
 * 163–290 of the 335-row crop. At `md` = 48 they land near 18px, which sits
 * with the `text-xl` wordmark it replaces. The widths are computed, so the
 * ratio cannot drift from the asset if a height is retuned.
 */
const HEIGHTS = { sm: 48, md: 68, lg: 82 } as const;

export type GanpatiWordmarkSize = keyof typeof HEIGHTS;

export function GanpatiWordmark({
  size = "md",
  className = "",
}: {
  size?: GanpatiWordmarkSize;
  className?: string;
}) {
  const height = HEIGHTS[size];
  const width = Math.round(height * RATIO);

  return (
    <span
      // Decorative: the link around this already carries aria-label="CauseKind",
      // so announcing it again would say the brand name twice.
      aria-hidden="true"
      className={`ck-gw relative block shrink-0 ${className}`}
      style={{ width, height }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
      @keyframes ckGwShine {
        0%   { background-position: 165% 0; }
        42%  { background-position: -65% 0; }
        100% { background-position: -65% 0; }
      }
      @keyframes ckGwGlow {
        0%, 100% { opacity: 0.30; transform: scale(0.97); }
        50%      { opacity: 0.60; transform: scale(1.04); }
      }
      .ck-gw-shine { animation: ckGwShine 7s ease-in-out infinite; }
      .ck-gw-glow  { animation: ckGwGlow 7s ease-in-out infinite; }
      /* The artwork must still be fully visible when motion is off — only the
         moving parts stop. The shine is a pure overlay, so hiding it costs
         nothing but the sparkle. */
      @media (prefers-reduced-motion: reduce) {
        .ck-gw-shine { animation: none; opacity: 0; }
        .ck-gw-glow  { animation: none; opacity: 0.36; }
      }
    `,
        }}
      />

      {/* Warm glow behind the artwork. Sized past the box so the falloff clears
          the crown and the tail rather than ringing them. */}
      <span
        className="ck-gw-glow pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.55)_0%,rgba(249,115,22,0.22)_45%,transparent_72%)] blur-lg"
        style={{ width: width * 1.08, height: height * 1.35 }}
      />

      {/* Light and dark artwork. Both are in the markup and swapped by the
          `dark` class on <html> — the theme is class-driven here (see the
          toggle in Navbar), so a `prefers-color-scheme` <picture> would ignore
          a viewer who picked a theme that isn't their system's. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LIGHT_SRC}
        alt=""
        width={INTRINSIC.width}
        height={INTRINSIC.height}
        style={{ width, height, objectFit: "contain" }}
        className="relative block select-none dark:hidden"
        draggable={false}
        decoding="async"
        fetchPriority="high"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={DARK_SRC}
        alt=""
        width={INTRINSIC.width}
        height={INTRINSIC.height}
        style={{ width, height, objectFit: "contain" }}
        className="relative hidden select-none dark:block"
        draggable={false}
        decoding="async"
        fetchPriority="high"
      />

      {/* The shine. A narrow light band swept across the artwork, clipped to
          the artwork's own alpha so it travels over Ganesha and the letters
          rather than across a rectangle. The two files share an alpha channel,
          so the light mask drives the sweep in both themes.
          `screen` keeps it additive — a plain white overlay greys the artwork
          down instead of lighting it. */}
      <span
        className="ck-gw-shine pointer-events-none absolute inset-0 mix-blend-screen"
        style={{
          backgroundImage:
            "linear-gradient(105deg, transparent 38%, rgba(255,248,230,0.15) 46%, rgba(255,252,245,0.75) 50%, rgba(255,248,230,0.15) 54%, transparent 62%)",
          backgroundSize: "260% 100%",
          backgroundRepeat: "no-repeat",
          maskImage: `url("${LIGHT_SRC}")`,
          WebkitMaskImage: `url("${LIGHT_SRC}")`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
    </span>
  );
}
