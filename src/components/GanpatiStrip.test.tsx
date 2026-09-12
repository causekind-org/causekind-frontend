import { describe, expect, it } from "vitest";

import {
  GANPATI_START,
  GANPATI_END,
  GANPATI_DISPLAY_START,
  GANPATI_DISPLAY_END,
} from "@/config/theme.config";

/**
 * The strip states the FESTIVAL, the config runs the SKIN, and the two are
 * deliberately different spans.
 *
 * <p>Ganeshotsav is 14 Sept (Ganesh Chaturthi) to 24 Sept (Anant Chaturdashi).
 * The skin is up 12-25 so the site is already dressed when people arrive for
 * the first day and has not stripped itself bare while the last is still being
 * observed. Those wider dates are operational and mean nothing to a visitor.
 *
 * <p>The band originally derived its label from GANPATI_START / GANPATI_END,
 * which was right while the two spans agreed and became wrong the moment the
 * window was widened — it advertised "12-25", which is not the festival. These
 * cases exist so re-pointing the label at the activation constants fails here
 * rather than shipping a banner that misstates a religious observance.
 */
const IST = "Asia/Kolkata";
const istDay = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: IST, day: "numeric" }).format(date);
const istMonth = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: IST, month: "short" }).format(date);

describe("Ganpati strip dates", () => {
  it("displays the festival itself — 14 to 24 Sept", () => {
    expect(istDay(GANPATI_DISPLAY_START)).toBe("14");
    expect(istDay(GANPATI_DISPLAY_END)).toBe("24");
    expect(istMonth(GANPATI_DISPLAY_START)).toBe("Sept");
  });

  it("keeps the skin up wider than the festival it announces", () => {
    expect(GANPATI_START.getTime()).toBeLessThan(GANPATI_DISPLAY_START.getTime());
    expect(GANPATI_END.getTime()).toBeGreaterThan(GANPATI_DISPLAY_END.getTime());
  });

  it("does not let the label fall back to the activation window", () => {
    // 12-25 are operational dates. If these ever match, the band is showing
    // them to visitors.
    expect(istDay(GANPATI_DISPLAY_START)).not.toBe(istDay(GANPATI_START));
    expect(istDay(GANPATI_DISPLAY_END)).not.toBe(istDay(GANPATI_END));
  });

  it("pins formatting to IST so the day does not shift by viewer timezone", () => {
    // Formatted in UTC, 14 Sept 00:00 IST is still the 13th.
    const utcDay = new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      day: "numeric",
    }).format(GANPATI_DISPLAY_START);
    expect(utcDay).toBe("13");
    expect(istDay(GANPATI_DISPLAY_START)).toBe("14");
  });
});
