/**
 * The Raksha Bandhan CauseKind wordmark — the supplied rakhi animation.
 *
 * <p>The artwork spells CauseKind out of rakhi threads: braided cords, beads, a
 * mirrored rosette, hanging tassels. It replaces the styled-text wordmark for
 * the campaign window only, and it is what made the hand-drawn `RakhiTie`
 * redundant — a real illustrated wordmark says the thing that a small CSS knot
 * tied onto ordinary text was only gesturing at.
 *
 * <p><b>Where the transparency came from.</b> The source is H.264, which has no
 * alpha channel, so the delivered file had a solid white background baked in.
 * The alpha here was *created* by keying that white out
 * (`colorkey=0xFFFFFF:0.22:0.11`) and re-encoding to VP9, which does carry
 * alpha. 0.22 is not arbitrary — it was chosen by compositing candidates over a
 * dark ground and looking: below it a grey halo survives around the braids, and
 * by 0.30 the key starts punching through the light dots *inside* the letters,
 * hollowing the artwork out. The recipe is in
 * `docs/raksha-bandhan-campaign.md` so it can be re-run if the source is
 * redelivered.
 *
 * <p><b>It loops.</b> The animation is a shine-and-sparkle cycle whose first and
 * last frames are identical — verified frame by frame against the source — so
 * the repeat has no visible seam or jump back to the start. The clip is 10s, so
 * the shine passes roughly six times a minute for as long as the page is open.
 *
 * <p>Server component: plain markup, no client JavaScript, so the logo is in the
 * first HTML response rather than after hydration.
 */

/** Native size of the encoded asset. Everything else is derived from it. */
const INTRINSIC = { width: 442, height: 140 } as const;
const RATIO = INTRINSIC.width / INTRINSIC.height;

/**
 * Taller than the text wordmark's 22/28/34, and that is not a preference.
 *
 * <p><b>Only about 45% of this artwork's height is the word.</b> The rest is
 * rosette, tassels and the swirl the animation throws out — measured off the
 * alpha channel, the letters occupy rows 90–216 of the 282-row crop. So a box
 * sized like the text wordmark renders letters roughly *half* the size of the
 * text it replaced, which is exactly how it looked: the logo read as small even
 * though its box was the same height as before.
 *
 * <p>At `md` = 44 the letters land near 20px, which matches the `text-xl`
 * wordmark beside it. Anything derived from these numbers — the widths below —
 * is computed, so the ratio cannot drift from the asset if a height is retuned.
 */
const HEIGHTS = { sm: 34, md: 44, lg: 52 } as const;

export type RakshaBandhanWordmarkSize = keyof typeof HEIGHTS;

export function RakshaBandhanWordmark({
  size = "md",
  className = "",
}: {
  size?: RakshaBandhanWordmarkSize;
  className?: string;
}) {
  const height = HEIGHTS[size];
  const width = Math.round(height * RATIO);

  return (
    <span
      // Decorative: the link around this already carries aria-label="CauseKind",
      // so announcing it again would say the brand name twice.
      aria-hidden="true"
      className={`relative block shrink-0 ${className}`}
      style={{ width, height }}
    >
      {/* The still exists for ONE case: reduced motion. It is hidden by default
          and only revealed by the media query in styles.css.

          It must not be visible alongside the video. The two are stacked in the
          same box, so showing both put a frozen copy of the wordmark underneath
          the moving one — and because the animation shifts the letters as it
          plays, the logo rendered as two offset copies of itself. The video's
          own `poster` already covers every state this img was wrongly being
          used for: before playback starts, and when the codec is unsupported. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/causekind-rakhi-static.webp"
        alt=""
        width={width}
        height={height}
        style={{ width, height, objectFit: "contain" }}
        className="ck-rb-wordmark-static absolute inset-0 select-none"
        draggable={false}
        decoding="async"
      />

      <video
        // `preload="none"` with `display:none` under reduced motion: a viewer who
        // asked for less motion should not pay 320 KB for an animation they will
        // never see. Not a guarantee — engines differ on whether a hidden
        // autoplaying video still fetches — but it is the strongest declarative
        // hint available, and the still already carries the meaning there.
        preload="none"
        poster="/brand/causekind-rakhi-static.webp"
        autoPlay
        muted
        loop
        playsInline
        // `pointer-events-none` so the click lands on the header link this sits
        // inside rather than on the video element.
        className="ck-rb-wordmark-video pointer-events-none absolute inset-0 select-none"
        width={width}
        height={height}
        style={{ width, height, objectFit: "contain" }}
      >
        {/* VP9 in WebM is the only widely supported web format that carries an
            alpha channel. There is deliberately no MP4 fallback: H.264 cannot
            represent transparency at all, so a fallback would be a white box.
            Anything that cannot play this shows the still underneath instead. */}
        <source src="/brand/causekind-rakhi.webm" type="video/webm" />
      </video>
    </span>
  );
}
