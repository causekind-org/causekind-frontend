import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, isLoading: false }) }));
vi.mock("@/lib/api", () => ({ getPlatformStats: vi.fn().mockResolvedValue(null) }));

import { BeTheChangeSection } from "./BeTheChangeSection";

/**
 * The category pills on the landing page.
 *
 * <p>Six of these were `motion.div`s with no link at all, and the one that did
 * link put its padding on an outer wrapper so only the icon and text were
 * clickable. Both states type-check and both build, which is exactly why they
 * survived — the assertions here are about the rendered anchor, not the source.
 */
describe("category pills", () => {
  beforeEach(() => {
    render(<BeTheChangeSection />);
  });

  function pillFor(name: string) {
    return screen.getByRole("link", { name: `Browse ${name} requests` });
  }

  it("renders one link per canonical category, and no more", () => {
    const nav = screen.getByRole("navigation", { name: /browse in-kind categories/i });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(IN_KIND_CATEGORIES.length);
  });

  it.each(IN_KIND_CATEGORIES)(
    "points $name at its real category route",
    category => {
      expect(pillFor(category.name)).toHaveAttribute(
        "href",
        `/requests/category/${category.slug}`,
      );
    },
  );

  it("never invents a slug by lowercasing the label", () => {
    // "Medical aid" would slugify to "medical-aid" by luck, but the guard that
    // matters is that every href comes from the category list rather than from
    // string manipulation of the display name.
    const hrefs = screen
      .getAllByRole("link", { name: /^Browse .+ requests$/ })
      .map(a => a.getAttribute("href"));
    const expected = IN_KIND_CATEGORIES.map(c => `/requests/category/${c.slug}`);
    expect(hrefs.sort()).toEqual(expected.sort());
  });

  it("makes the whole pill the hit target, not a span inside it", () => {
    const pill = pillFor("Medical aid");
    // The anchor itself carries the padding and the touch-height floor. When
    // these sat on a wrapper div, the visible pill was larger than the link.
    expect(pill.className).toMatch(/px-3/);
    expect(pill.className).toMatch(/min-h-11/);
  });

  it("has no nested interactive element inside a pill", () => {
    const pill = pillFor("Education");
    expect(pill.querySelector("a, button")).toBeNull();
  });

  it("gives every pill a visible focus ring", () => {
    for (const c of IN_KIND_CATEGORIES) {
      expect(pillFor(c.name).className).toMatch(/focus-visible:ring-2/);
    }
  });
});

describe("the show-more toggle", () => {
  beforeEach(() => {
    render(<BeTheChangeSection />);
  });

  const toggle = () => screen.getByRole("button", { name: /show \d+ more categories|show fewer/i });

  it("starts collapsed and says how many are hidden", () => {
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveTextContent(/show 3 more categories/i);
  });

  it("points aria-controls at an element that exists", () => {
    const id = toggle().getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).not.toBeNull();
  });

  it("expands and collapses, updating aria-expanded and the label", async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(toggle()).toHaveTextContent(/show fewer categories/i);

    await user.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveTextContent(/show 3 more categories/i);
  });

  it("keeps focus on the toggle across expansion", async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    // Otherwise a screen reader announces the new state against whatever the
    // browser fell back to, usually <body>.
    expect(toggle()).toHaveFocus();
  });

  it("is a button, not a link dressed as a category", () => {
    expect(toggle().tagName).toBe("BUTTON");
    expect(toggle()).not.toHaveAttribute("href");
  });

  it("hides the overflow pills from the small-screen layout while collapsed", () => {
    const overflow = IN_KIND_CATEGORIES.slice(6);
    for (const c of overflow) {
      const li = screen.getByRole("link", { name: `Browse ${c.name} requests` }).closest("li");
      // display:none below lg — which also removes them from the tab order, so
      // a keyboard user cannot land on a pill they cannot see.
      expect(li?.className ?? "").toMatch(/max-lg:hidden/);
    }
  });

  it("reveals the overflow pills when expanded", async () => {
    const user = userEvent.setup();
    await user.click(toggle());
    for (const c of IN_KIND_CATEGORIES.slice(6)) {
      const li = screen.getByRole("link", { name: `Browse ${c.name} requests` }).closest("li");
      expect(li?.className ?? "").not.toMatch(/max-lg:hidden/);
    }
  });

  it("leaves the first six visible at every width", () => {
    for (const c of IN_KIND_CATEGORIES.slice(0, 6)) {
      const li = screen.getByRole("link", { name: `Browse ${c.name} requests` }).closest("li");
      expect(li?.className ?? "").not.toMatch(/hidden/);
    }
  });
});
