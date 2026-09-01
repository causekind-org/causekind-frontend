import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import enMessages from "../../../messages/en.json";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import type { PublicItemRequest } from "@/lib/api";

/**
 * The homepage front door.
 *
 * <p>The hero had no call to action at all — not one `href` — while every route
 * into the need board sat further down the page. These pin the two properties
 * that make the fix worth having, and the one that stops it doing harm.
 */

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    let node: unknown = enMessages;
    for (const part of `${namespace}.${key}`.split(".")) {
      node = (node as Record<string, unknown>)?.[part];
    }
    return typeof node === "string" ? node : key;
  },
}));

const { HeroGiveCTA } = await import("./HeroGiveCTA");
const { NearbyNeedsPanel } = await import("./NearbyNeedsPanel");

function need(over: Partial<PublicItemRequest> = {}): PublicItemRequest {
  return {
    id: 1,
    title: "School bag for a Class 6 student",
    category: "Education",
    quantity: 1,
    urgency: "NORMAL",
    city: "Pune",
    description: null,
    createdAt: "2026-08-01T00:00:00Z",
    imageUrl: null,
    emergency: false,
    doneeFirstName: "A",
    ...over,
  };
}

describe("hero give CTA", () => {
  it("routes every category into its own public page", () => {
    render(<HeroGiveCTA />);
    for (const cat of IN_KIND_CATEGORIES) {
      expect(screen.getByRole("link", { name: cat.name }))
        .toHaveAttribute("href", `/requests/category/${cat.slug}`);
    }
  });

  it("offers a way in without choosing a category", () => {
    // The chips are a shortcut, not a gate.
    render(<HeroGiveCTA />);
    expect(screen.getByRole("link", { name: enMessages.heroGive.seeAll }))
      .toHaveAttribute("href", "/requests");
  });

  it("asks for nothing", () => {
    // The whole argument against a downloadable magnet here is that someone can
    // see the real thing in one click. A form in the hero would undo that.
    const { container } = render(<HeroGiveCTA />);
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
  });
});

describe("nearby needs panel", () => {
  it("shows real requests from the public board", () => {
    render(<NearbyNeedsPanel requests={[need()]} />);
    expect(screen.getByText("School bag for a Class 6 student")).toBeInTheDocument();
    expect(screen.getByText(/Pune/)).toBeInTheDocument();
  });

  it("renders nothing when the board is empty", () => {
    // An empty frame is worse than the gap it was filling.
    const { container } = render(<NearbyNeedsPanel requests={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("states no impact figure", () => {
    // The marketing deck proposed "you could help 3-5 people". That is a claim
    // nobody can stand behind, and this is where it would get added.
    const { container } = render(<NearbyNeedsPanel requests={[need(), need({ id: 2 })]} />);
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).not.toMatch(/could help/);
    expect(text).not.toMatch(/\d+\s*[-–]\s*\d+\s*people/);
  });

  it("never shows finer location than the city", () => {
    // PublicItemRequestResponse: "City only. Never the pincode, and never the
    // coordinates." This panel must not become the place that leaks it.
    const { container } = render(<NearbyNeedsPanel requests={[need({ city: "Pune" })]} />);
    const text = container.textContent ?? "";
    expect(text).toContain("Pune");
    expect(text).not.toMatch(/\b\d{6}\b/);      // an Indian PIN code
    expect(text).not.toMatch(/\d+\.\d{4,}/);    // a coordinate
  });

  it("caps how much of the board it shows", () => {
    const many = Array.from({ length: 9 }, (_, i) => need({ id: i + 1, title: `Need ${i + 1}` }));
    render(<NearbyNeedsPanel requests={many} />);
    expect(screen.queryByText("Need 4")).toBeNull();
  });
});
