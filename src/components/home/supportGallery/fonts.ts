import { Caveat, Fraunces, IBM_Plex_Mono } from "next/font/google";

/**
 * Faces for the "Where does my support go?" photo table.
 *
 * - Fraunces — the editorial headline and captions (same instance options as
 *   the film's serif, so the browser shares the files).
 * - Caveat — the handwritten margin notes beside the photographs.
 * - IBM Plex Mono — the index, counter and category labels.
 */
const serif = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  display: "swap",
  variable: "--font-sg-serif",
});

const hand = Caveat({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-sg-hand",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  variable: "--font-sg-mono",
});

export const galleryFonts = `${serif.variable} ${hand.variable} ${mono.variable}`;
