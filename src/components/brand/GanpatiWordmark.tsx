/**
 * The Ganeshotsav CauseKind wordmark — the supplied festive artwork,
 * now as an animated WebM.
 *
 * <p>The artwork spells the whole brand: the heart-and-hands mark, a reclining
 * Ganesha, the mushak with a modak, a brass thali and drifting petals. It
 * replaces the styled-text wordmark *and* the LogoVideo mark beside it for the
 * festival window only, because it already contains both.
 *
 * <p><b>Video, not stills.</b> This previously shipped two keyed WebP stills
 * (light and dark) with a CSS gold shine swept across them, because the
 * artwork was delivered as a still. It is now delivered as an animated WebM,
 * so the video carries the motion itself and the CSS shine is retired — a
 * second animation layered on top of an already-animated clip reads as noise.
 * The light still is retained as the `poster`, so something correct paints
 * immediately while the clip loads and there is no layout shift.
 *
 * <p><b>Transparency.</b> The clip must be encoded VP9 with an alpha channel
 * (`yuva420p`). Without alpha it renders as an opaque box — cream against the
 * light header, and glaring against the dark one. The warm radial glow behind
 * it is kept regardless: it gives the mark a seat on both themes and stands in
 * for the dark-specific asset that the two-file setup used to provide.
 *
 * <p><b>Sizing.</b> Everything still derives from INTRINSIC and HEIGHTS, so the
 * sm/md/lg contract is unchanged for every caller (desktop header, mobile
 * header, footer). If the WebM's pixel dimensions differ from the stills',
 * update INTRINSIC or the mark will render squashed.
 *
 * <p>Server component: plain markup, no client JavaScript, so the logo is in
 * the first HTML response rather than after hydration. `autoplay` + `muted` +
 * `playsinline` are the three attributes browsers require to start a clip
 * without a user gesture; dropping `muted` silently blocks playback.
 */

const VIDEO_SRC = "/images/CauseKind_Ganesha_logo.webm";
const POSTER_SRC = "/brand/causekind-ganpati.webp";

/** Native size of the delivered asset. Everything else derives from it. */
const INTRINSIC = { width: 560, height: 208 } as const;
const RATIO = INTRINSIC.width / INTRINSIC.height;

/**
 * Taller than the text wordmark's 22/28/34, for the same reason the rakhi one
 * is: only ~38% of this artwork's height is the word — the rest is Ganesha,
 * the thali and the petals. Measured off the alpha, the letters occupy rows
 * 163–290 of the 335-row crop. At `md` = 68 they land near 18px, which sits
 * with the `text-xl` wordmark it replaces. The widths are computed, so the
 * ratio cannot drift from the asset if a height is retuned.
 */
const HEIGHTS = { sm: 69, md: 84, lg: 82 } as const;

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
      @keyframes ckGwGlow {
        0%, 100% { opacity: 0.30; transform: scale(0.97); }
        50%      { opacity: 0.60; transform: scale(1.04); }
      }
      .ck-gw-glow { animation: ckGwGlow 7s ease-in-out infinite; }
      /* The artwork must still be fully visible when motion is off — only the
         moving parts stop. The clip is paused via the media query below and
         falls back to its poster frame, which is the full still artwork. */
      @media (prefers-reduced-motion: reduce) {
        .ck-gw-glow  { animation: none; opacity: 0.36; }
        .ck-gw-video { animation-play-state: paused; }
      }
    `,
        }}
      />

      {/* Warm glow behind the artwork. Sized past the box so the falloff clears
          the crown and the tail rather than ringing them. This also carries the
          mark on the dark header, which the retired dark-specific still used to
          do. */}
      <span
        className="ck-gw-glow pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.55)_0%,rgba(249,115,22,0.22)_45%,transparent_72%)] blur-lg"
        style={{ width: width * 1.08, height: height * 1.35 }}
      />

      {/* The animated wordmark. `poster` is the original still, so the correct
          artwork paints on the first frame rather than a blank box, and the
          explicit width/height mean the header never reflows when the clip
          arrives. pointer-events-none keeps clicks on the <Link> wrapping this. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        className="ck-gw-video pointer-events-none relative block select-none"
        src={VIDEO_SRC}
        poster={POSTER_SRC}
        width={INTRINSIC.width}
        height={INTRINSIC.height}
        style={{ width, height, objectFit: "contain" }}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        draggable={false}
      >
        {/* Shown only where WebM cannot play at all. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={POSTER_SRC}
          alt=""
          width={INTRINSIC.width}
          height={INTRINSIC.height}
          style={{ width, height, objectFit: "contain" }}
          className="relative block select-none"
          draggable={false}
          decoding="async"
        />
      </video>
    </span>
  );
}