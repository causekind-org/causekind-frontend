/**
 * Theme and seasonal configuration for CauseKind.
 *
 * Ganpati / Ganesh Chaturthi promotional skin:
 * Runs for 11 days, starting 14th September 2026 00:00 IST
 * and ending 24th September 2026 23:59:59 IST (Anant Chaturdashi).
 *
 * IST is UTC+5:30:
 * 14 Sept 2026 00:00:00 IST = 13 Sept 2026 18:30:00.000Z
 * 24 Sept 2026 23:59:59.999 IST = 24 Sept 2026 18:29:59.999Z
 */

export type GanpatiThemeOverride = "on" | "off" | undefined;

// 14 Sept 2026 00:00:00 IST in UTC
export const GANPATI_START = new Date("2026-09-13T18:30:00.000Z");

// 24 Sept 2026 23:59:59.999 IST in UTC (end of 11th day)
export const GANPATI_END = new Date("2026-09-24T18:29:59.999Z");

export const GANPATI_CONFIG = {
  override: process.env.NEXT_PUBLIC_GANPATI_THEME as GanpatiThemeOverride,
  startDate: GANPATI_START,
  endDate: GANPATI_END,
  title: "Ganeshotsav 2026",
  greeting: "Shree Ganeshay Namah",
  tagline: "Celebrate the remover of obstacles by giving with purpose",
  colors: {
    saffron: "#f97316",       // vibrant festive saffron
    saffronDeep: "#c2410c",   // rich vermilion
    marigold: "#eab308",      // auspicious golden marigold
    marigoldLight: "#fef08a", // soft marigold glow
    maroon: "#7f1d1d",        // sacred royal maroon
    maroonDeep: "#450a0a",    // deep traditional maroon
    gold: "#d97706",          // temple gold
    cream: "#fffbf5",         // warm festive parchment
    leafGreen: "#15803d",     // banana leaf green accent
  },
} as const;
