/**
 * Theme and seasonal configuration for CauseKind.
 *
 * Ganpati / Ganesh Chaturthi promotional skin:
 * Runs for 14 days, starting 12th September 2026 00:00 IST
 * and ending 25th September 2026 23:59:59 IST (one day past Anant Chaturdashi, by request).
 *
 * IST is UTC+5:30:
 * 12 Sept 2026 00:00:00 IST = 11 Sept 2026 18:30:00.000Z
 * 25 Sept 2026 23:59:59.999 IST = 25 Sept 2026 18:29:59.999Z
 */

export type GanpatiThemeOverride = "on" | "off" | undefined;

// 12 Sept 2026 00:00:00 IST in UTC — brought forward from the 14th on request,
// so the skin is live immediately. The end date is unchanged.
export const GANPATI_START = new Date("2026-09-11T18:30:00.000Z");

// 25 Sept 2026 23:59:59.999 IST in UTC (end of 14th day)
export const GANPATI_END = new Date("2026-09-25T18:29:59.999Z");

/**
 * The dates the BAND SHOWS, which are deliberately NOT the activation window
 * above.
 *
 * Ganeshotsav itself runs 14 Sept (Ganesh Chaturthi) to 24 Sept (Anant
 * Chaturdashi) — that is what the festival is, and what the strip must state.
 * GANPATI_START / GANPATI_END are wider on purpose: the skin goes up two days
 * early and comes down a day late, so the site is already dressed when people
 * arrive for the first day and has not stripped itself bare while the last day
 * is still being observed.
 *
 * Keep these two pairs separate. Pointing the label back at the activation
 * constants would advertise 12-25, which are operational dates that mean
 * nothing to a visitor and misstate the festival.
 */
// 14 Sept 2026 00:00:00 IST in UTC — Ganesh Chaturthi
export const GANPATI_DISPLAY_START = new Date("2026-09-13T18:30:00.000Z");

// 24 Sept 2026 23:59:59.999 IST in UTC — Anant Chaturdashi
export const GANPATI_DISPLAY_END = new Date("2026-09-24T18:29:59.999Z");

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
