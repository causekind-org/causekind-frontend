import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The strip is date-gated, so a plain render outside the window produces
// nothing. Hold the gate open for the composition tests and exercise the real
// gate separately, against the real module.
let gateOpen = true;
vi.mock("@/lib/raksha-bandhan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/raksha-bandhan")>();
  return { ...actual, isRakshaBandhanCampaignActive: () => gateOpen };
});

import { RakshaBandhanStrip } from "./RakshaBandhanStrip";
import { RAKSHA_BANDHAN_CAMPAIGN } from "@/lib/raksha-bandhan";

const { isRakshaBandhanCampaignActive } = await vi.importActual<
  typeof import("@/lib/raksha-bandhan")
>("@/lib/raksha-bandhan");

const DURING = new Date("2026-08-28T06:00:00.000Z");

describe("isRakshaBandhanCampaignActive", () => {
  // This window was widened from one IST day to six when the two independently
  // built Raksha Bandhan treatments were merged: 27 August through the end of
  // 1 September, which is the run that was asked for. The strip therefore shows
  // for the whole campaign, not only on the festival day.
  //
  // The full-screen intro is the one surface that kept a single-day gate — see
  // isRakshaBandhanIntroDay, tested in RakshaBandhanIntro.test.tsx.

  it("covers the whole campaign window, not just the festival day", () => {
    // 18:30Z on the 26th is midnight IST on the 27th — the first instant.
    expect(isRakshaBandhanCampaignActive(new Date("2026-08-26T18:30:00.000Z"), undefined)).toBe(true);
    // Raksha Bandhan itself.
    expect(isRakshaBandhanCampaignActive(DURING, undefined)).toBe(true);
    // The day after the festival is still in, which the one-day window excluded.
    expect(isRakshaBandhanCampaignActive(new Date("2026-08-29T06:00:00.000Z"), undefined)).toBe(true);
    // One millisecond before IST midnight on the 2nd is the last instant.
    expect(isRakshaBandhanCampaignActive(new Date("2026-09-01T18:29:59.999Z"), undefined)).toBe(true);
  });

  it("is closed on either side of the window", () => {
    expect(isRakshaBandhanCampaignActive(new Date("2026-08-26T18:29:59.999Z"), undefined)).toBe(false);
    expect(isRakshaBandhanCampaignActive(new Date("2026-09-01T18:30:00.000Z"), undefined)).toBe(false);
    expect(isRakshaBandhanCampaignActive(new Date("2026-09-05T06:00:00.000Z"), undefined)).toBe(false);
  });

  it("lets the env override win in both directions", () => {
    const outside = new Date("2026-09-05T06:00:00.000Z");
    expect(isRakshaBandhanCampaignActive(outside, "on")).toBe(true);
    expect(isRakshaBandhanCampaignActive(DURING, "off")).toBe(false);
  });
});

describe("RakshaBandhanStrip", () => {
  it("renders nothing when the gate is closed", () => {
    gateOpen = false;
    const { container } = render(<RakshaBandhanStrip />);
    expect(container).toBeEmptyDOMElement();
    gateOpen = true;
  });

  it("offers the same balanced action pair as the Independence strip", () => {
    render(<RakshaBandhanStrip />);

    const browse = screen.getByRole("link", { name: /browse verified needs/i });
    const list = screen.getByRole("link", { name: /list an item/i });

    expect(browse).toHaveAttribute("href", "/requests");
    expect(list).toHaveAttribute("href", "/items/new");
    expect(browse.parentElement?.className).toMatch(/min-\[720px\]:flex/);
    expect(browse.className).toMatch(/focus-visible:ring-2/);
    expect(list.className).toMatch(/focus-visible:ring-2/);
    expect(browse.className).toMatch(/motion-reduce:transition-none/);
    expect(list.className).toMatch(/motion-reduce:transition-none/);
  });

  it("carries the message to screen readers, not just as decoration", () => {
    render(<RakshaBandhanStrip />);

    const region = screen.getByLabelText(/causekind raksha bandhan announcement/i);
    const spoken = screen.getByText(RAKSHA_BANDHAN_CAMPAIGN.spokenMessage);

    expect(spoken).toHaveClass("sr-only");
    // The visible copy is aria-hidden so the sentence is not announced twice.
    expect(region.querySelector("p")).toHaveAttribute("aria-hidden", "true");
  });

  it("states the message once, without a marquee", () => {
    const { container } = render(<RakshaBandhanStrip />);

    expect(container.querySelector(".ck-independence-marquee")).toBeNull();
    expect(screen.getByText(RAKSHA_BANDHAN_CAMPAIGN.headline)).toBeInTheDocument();
    expect(screen.getByText(RAKSHA_BANDHAN_CAMPAIGN.subhead)).toBeInTheDocument();
  });

  it("keeps the festive field decorative and dark-mode aware", () => {
    const { container } = render(<RakshaBandhanStrip />);
    const region = screen.getByLabelText(/causekind raksha bandhan announcement/i);
    const field = container.querySelector('[class*="bg-[linear-gradient(100deg"]');

    expect(region.className).toMatch(/w-full/);
    expect(region.className).toMatch(/bg-\[#4a1526\]/);
    expect(field).toHaveAttribute("aria-hidden", "true");
    expect(field?.className).toMatch(/dark:bg-\[linear-gradient/);
  });

  it("stays inside one colour family instead of jumping to orange", () => {
    const { container } = render(<RakshaBandhanStrip />);
    const field = container.querySelector('[class*="bg-[linear-gradient(100deg"]');

    // The orange-to-maroon version read as a discount ribbon. Every stop is now
    // a value of the same plum.
    for (const plum of ["#58182f", "#4a1526", "#3b0f1e"]) {
      expect(field?.className).toContain(plum);
    }
    expect(field?.className).not.toMatch(/#b3300f|#c2410c|#ff9933/);
  });

  it("never draws a line across the lettering", () => {
    const { container } = render(<RakshaBandhanStrip />);

    // A full-width gold hairline through the vertical middle of the band ran
    // straight through the copy and read as strikethrough text. The texture
    // that replaced it is diagonal and sits behind the message.
    expect(container.querySelector(".ck-rakhi-thread")).toBeNull();
    expect(container.querySelectorAll('[class*="top-1/2"][class*="h-px"]')).toHaveLength(0);
    // The diagonal texture that replaced the hairline is gone too — at band
    // height it read as moiré noise rather than as woven thread.
    expect(container.querySelector('[class*="repeating-linear-gradient"]')).toBeNull();
  });

  it("uses one crisp rakhi as an ornament, not oversized faint watermarks", () => {
    const { container } = render(<RakshaBandhanStrip />);
    const rakhis = Array.from(container.querySelectorAll(".ck-rakhi-petals")).map(
      (g) => g.closest("svg")!,
    );

    // Two bled-off watermarks at ~12% opacity read as smudges at band height.
    expect(rakhis).toHaveLength(1);
    expect(rakhis[0]).toHaveAttribute("aria-hidden", "true");
    expect(rakhis[0].getAttribute("class")).toMatch(/h-\[18px\]/);
    expect(rakhis[0].getAttribute("class")).not.toMatch(/opacity-\[0\.[01]/);
  });

  it("sets the headline in the site's serif against a sans supporting line", () => {
    const { container } = render(<RakshaBandhanStrip />);
    const headline = screen.getByText(RAKSHA_BANDHAN_CAMPAIGN.headline);
    const subhead = screen.getByText(RAKSHA_BANDHAN_CAMPAIGN.subhead);

    // Generic bold sans in neon yellow was what made this read as retail
    // signage. The serif/sans pairing is the fix, and it matches the site.
    expect(headline.getAttribute("style")).toMatch(/--font-source-serif-4/);
    expect(headline.className).toMatch(/italic/);
    expect(subhead.getAttribute("style") ?? "").not.toMatch(/source-serif/);

    // Ivory, not yellow — gold survives only as an accent.
    expect(headline.className).toMatch(/text-\[#f7f0e4\]/);
    // Scoped to the copy: the rakhi ornament keeps a bright gold collar of its
    // own, which is correct — it is the lettering that must not be neon.
    const copy = headline.parentElement?.outerHTML ?? "";
    expect(copy).not.toContain("#fde047");
    expect(subhead.className).toMatch(/text-\[#f7f0e4\]\/70/);
  });
});
