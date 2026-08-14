import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/independence-day", () => ({
  INDEPENDENCE_DAY_CAMPAIGN: {
    ctaHref: "/requests",
  },
  isIndependenceDayCampaignActive: () => true,
}));

import { IndependenceDayStrip } from "./IndependenceDayStrip";

describe("IndependenceDayStrip", () => {
  it("keeps balanced Browse Needs and List an Item actions in the desktop composition", () => {
    render(<IndependenceDayStrip />);

    const browseAction = screen.getByRole("link", { name: /browse needs/i });
    const listAction = screen.getByRole("link", { name: /list an item/i });
    const actionArea = browseAction.parentElement;

    expect(browseAction).toHaveAttribute("href", "/requests");
    expect(listAction).toHaveAttribute("href", "/items/new");
    expect(actionArea?.className).toMatch(/min-\[720px\]:flex/);
    expect(browseAction.className).toMatch(/focus-visible:ring-2/);
    expect(listAction.className).toMatch(/border-white/);
    expect(browseAction.className).toMatch(/motion-reduce:transition-none/);
    expect(listAction.className).toMatch(/motion-reduce:transition-none/);
  });

  it("renders one clean ticker track with a location-based contrast treatment", () => {
    const { container } = render(<IndependenceDayStrip />);
    const tracks = container.querySelectorAll(".ck-independence-marquee");
    const runs = tracks[0]?.querySelectorAll("span");

    expect(tracks).toHaveLength(1);
    expect(runs).toHaveLength(2);
    expect(runs?.[0]?.textContent).toBe(runs?.[1]?.textContent);
    expect(runs?.[0]?.textContent).toMatch(/HAPPY INDEPENDENCE DAY/);
    expect(runs?.[0]?.className).toMatch(/text-\[#111827\]/);
    expect(runs?.[0]?.className).not.toMatch(/ck-independence-ticker-text/);
    expect(container.querySelector(".ck-independence-flag-ink")).toBeNull();
  });

  it("uses a complete saffron-white-green field with a chakra detail on the left", () => {
    const { container } = render(<IndependenceDayStrip />);
    const flagField = container.querySelector('[class*="bg-[linear-gradient"]');

    expect(flagField?.className).toMatch(/#ff9933.*#ffffff.*#138808/);
    expect(flagField?.querySelector('[class*="border-[#123f75]"]')).not.toBeNull();
  });

  it("keeps the narrow-screen strip compact while retaining an accessible message", () => {
    render(<IndependenceDayStrip />);

    const region = screen.getByLabelText(/causekind independence day announcement/i);
    const stripLayout = region.querySelector("div.relative.flex");

    expect(region.className).toMatch(/w-full/);
    expect(stripLayout?.className).toMatch(/w-full/);
    expect(stripLayout?.className).not.toMatch(/max-w|mx-auto/);
    expect(region.querySelector(".ck-independence-marquee")).not.toBeNull();
    expect(screen.getByText(/happy independence day\. give with purpose/i)).toHaveClass(
      "sr-only",
    );
  });
});
