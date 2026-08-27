export type RakshaBandhanCampaignOverride = "on" | "off" | undefined;

/**
 * Temporary presentation controls for Causekind's Raksha Bandhan moment.
 *
 * Set NEXT_PUBLIC_RAKSHA_BANDHAN to `on` to force the strip on, `off` to turn
 * it off immediately, or leave it unset to use the date window.
 *
 * <p>Unlike the Independence Day campaign, which runs for a week, this is a
 * **single day**: Raksha Bandhan 2026 falls on Friday 28 August. The window is
 * expressed in UTC so that it lines up exactly with midnight-to-midnight IST —
 * 18:30Z on the 27th is 00:00 IST on the 28th. The strip therefore appears and
 * disappears on its own, with no deploy needed at either end.
 */
export const RAKSHA_BANDHAN_CAMPAIGN = {
  override: process.env
    .NEXT_PUBLIC_RAKSHA_BANDHAN as RakshaBandhanCampaignOverride,
  startsAt: new Date("2026-08-27T18:30:00.000Z"),
  endsAt: new Date("2026-08-28T18:30:00.000Z"),
  label: "Raksha Bandhan",
  dateDay: "28",
  dateMonth: "Aug",
  /** The one line that carries the moment. Kept here so the JSX stays layout. */
  headline: "A thread is a promise.",
  /** Completes the thought. Shown beside the headline, or under it when narrow. */
  subhead: "This Raksha Bandhan, tie one to someone you have never met.",
  /** What a screen reader hears in place of the decorative band. */
  spokenMessage:
    "Happy Raksha Bandhan. A thread is a promise. This Raksha Bandhan, tie one to someone you have never met.",
  ctaLabel: "Browse verified needs",
  ctaHref: "/requests",
  secondaryCtaLabel: "List an item",
  secondaryCtaHref: "/items/new",
} as const;

export function isRakshaBandhanCampaignActive(
  now = new Date(),
  override = RAKSHA_BANDHAN_CAMPAIGN.override,
): boolean {
  if (override === "on") return true;
  if (override === "off") return false;

  return (
    now.getTime() >= RAKSHA_BANDHAN_CAMPAIGN.startsAt.getTime() &&
    now.getTime() < RAKSHA_BANDHAN_CAMPAIGN.endsAt.getTime()
  );
}

// ─── Full-screen intro (28 August 2026 only) ─────────────────────────────────

/**
 * The intro video, at two sizes.
 *
 * <p>Both are derived from the 4K master in `video-master/`, which is NOT in
 * `public/` and so is never deployed or downloadable. The master is 3840x2160
 * at 46 Mbps in H.264 *Baseline* — a profile with no B-frames, which is why it
 * weighs 53 MB for nine seconds. Re-encoded to High profile these are visually
 * indistinguishable at 4.4 MB and 1.7 MB. The audio track was dropped: the
 * element is muted with no controls, so not one visitor could ever hear it.
 *
 * <p>Browsers ignore the `media` attribute on `<source>` inside `<video>` —
 * unlike `<picture>`, it was dropped from the spec — so the choice is made in
 * script by {@link pickRakshaBandhanIntroSource}.
 */
export const RAKSHA_BANDHAN_INTRO_VIDEO_1080 = "/rakhi-intro-1080p.mp4";
export const RAKSHA_BANDHAN_INTRO_VIDEO_720 = "/rakhi-intro-720p.mp4";

/**
 * Which encode to fetch. Smaller is the right default: this is a decorative
 * nine-second intro, and a stalled download is a worse outcome than a softer
 * picture.
 *
 * <p>Honours Data Saver and a slow effective connection where the browser
 * reports them, and otherwise decides on the real pixel width of the display.
 */
export function pickRakshaBandhanIntroSource(): string {
  if (typeof window === "undefined") return RAKSHA_BANDHAN_INTRO_VIDEO_720;

  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;

  if (connection?.saveData) return RAKSHA_BANDHAN_INTRO_VIDEO_720;
  if (connection?.effectiveType && /^(slow-2g|2g|3g)$/.test(connection.effectiveType)) {
    return RAKSHA_BANDHAN_INTRO_VIDEO_720;
  }

  // Viewport class, not raw device pixels. A phone has plenty of pixels once
  // its 3x density is counted, but it is the connection paying for them, and
  // 720p across a six-inch screen is already past what the eye resolves. A
  // desktop is both wider and usually on better bandwidth, so it gets 1080p —
  // scaling 720p up across a 1440px window would visibly soften the text.
  return window.innerWidth >= 768
    ? RAKSHA_BANDHAN_INTRO_VIDEO_1080
    : RAKSHA_BANDHAN_INTRO_VIDEO_720;
}

/**
 * The single IST calendar date the intro runs on, as `YYYY-MM-DD`.
 *
 * <p>Raksha Bandhan 2026 is Friday 28 August.
 */
export const RAKSHA_BANDHAN_INTRO_DATE_IST = "2026-08-28";

/**
 * Backdrop shown while the video buffers, and behind the letterboxing on
 * portrait screens.
 *
 * <p>Sampled from the video's own opening frame rather than guessed: it is a
 * warm cream field (centre #ffffe2) vignetting to amber at the corners
 * (#ffc268). Reproducing that as a gradient means the load state and the first
 * frame are the same picture, so there is no visible moment of hand-off. An
 * earlier guess of deep plum flashed dark and then jumped to cream.
 */
export const RAKSHA_BANDHAN_INTRO_BACKDROP =
  "radial-gradient(ellipse at center, #ffffe2 0%, #fff5c2 55%, #ffc268 100%)";

/** How long the overlay takes to fade away when skipped or when playback fails. */
export const RAKSHA_BANDHAN_INTRO_FADE_MS = 550;

/**
 * How long the rectangle takes to open across the screen at the end.
 *
 * <p>It begins {@link RAKSHA_BANDHAN_INTRO_REVEAL_LEAD_S} seconds before the
 * video finishes, so the reveal and the closing beat of the animation happen
 * together rather than one after the other — the site is already arriving as
 * the video plays out.
 */
export const RAKSHA_BANDHAN_INTRO_REVEAL_MS = 2000;

/** Seconds before the end of the video at which the rectangle starts opening. */
export const RAKSHA_BANDHAN_INTRO_REVEAL_LEAD_S = 2;

/**
 * Today's date **in India**, as `YYYY-MM-DD`.
 *
 * <p>`new Date().getDate()` reads the visitor's own timezone, so a donor in
 * California would see the campaign a day late and one in Sydney a day early.
 * The festival has one date, decided in India, so the date is formatted in
 * `Asia/Kolkata` regardless of where the browser is. `en-CA` is used purely
 * because it is the locale whose numeric format is already `YYYY-MM-DD`.
 */
export function istDateString(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Whether the full-screen intro should run at all.
 *
 * <p>True only while it is 28 August 2026 in India — from 00:00:00 to 23:59:59
 * IST. The date is a fixed constant, so this returns false for the whole of the
 * rest of time with no deploy needed to switch it off.
 *
 * <p>`forced` is the development escape hatch and is IGNORED in production, so
 * a stray environment variable on the live site can never resurrect the intro.
 * Callers pass `isRakshaBandhanIntroForced()`.
 */
export function isRakshaBandhanIntroDay(
  now = new Date(),
  forced = false,
): boolean {
  if (forced) return true;
  return istDateString(now) === RAKSHA_BANDHAN_INTRO_DATE_IST;
}

/**
 * Development-only override, for testing the intro before 28 August.
 *
 * <p>Set `NEXT_PUBLIC_FORCE_RAKHI_INTRO=true` in `.env.local`. The
 * `NODE_ENV` guard is what makes this safe: Next.js inlines `NODE_ENV` at build
 * time, so in a production build this function is statically false and the
 * force path is dead code the bundler drops.
 */
export function isRakshaBandhanIntroForced(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_FORCE_RAKHI_INTRO === "true";
}
