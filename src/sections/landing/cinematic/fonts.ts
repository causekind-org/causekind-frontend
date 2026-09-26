import { Big_Shoulders, Fraunces, IBM_Plex_Mono } from "next/font/google";

/**
 * The film's typefaces, scoped to its two stages.
 *
 * Loaded here rather than in the root layout so they ship with the film's own
 * dynamic chunk: nothing on the hero's first paint waits on them.
 *
 * - Display: Big Shoulders (variable, optical size — at title sizes it is the
 *   Display cut) — a condensed film-poster face for the
 *   title slams. The layouts were drawn for a condensed display (the old
 *   `--font-anton` variable, which was never actually loaded, so every title
 *   fell back to Impact / Arial Narrow).
 * - Serif: Fraunces, soft and optical-sized — the subtitles and the italic
 *   "It finds its person" line.
 * - Mono: IBM Plex Mono — the camera HUD and eyebrows.
 */
const display = Big_Shoulders({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  display: "swap",
  variable: "--font-cine-display",
});

const serif = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  display: "swap",
  variable: "--font-cine-serif",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  variable: "--font-cine-mono",
});

/** Put on each stage's root so its copy can use the three variables. */
export const cineFonts = `${display.variable} ${serif.variable} ${mono.variable}`;
