import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

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

const authState = vi.hoisted(() => ({
  user: null as { email: string; role: string } | null,
  isLoading: false,
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    let node: unknown = enMessages;
    for (const part of `${namespace}.${key}`.split(".")) {
      node = (node as Record<string, unknown>)?.[part];
    }
    return typeof node === "string" ? node : key;
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

const { CategoryStrip } = await import("./CategoryStrip");
const { HeroSection } = await import("./HeroSection");
const { NearbyNeedsPanel } = await import("./NearbyNeedsPanel");

beforeEach(() => {
  authState.user = null;
  authState.isLoading = false;
});

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

describe("category strip", () => {
  it("routes every category into its own public page", () => {
    render(<CategoryStrip />);

    const categoryNav = screen.getByRole("navigation", {
      name: enMessages.categoryStrip.ariaLabel,
    });

    expect(IN_KIND_CATEGORIES).toHaveLength(9);
    expect(within(categoryNav).getAllByRole("link")).toHaveLength(9);

    // The anti-drift guard. A category added to the registry must also appear
    // in this discoverable public rail with its canonical destination.
    for (const cat of IN_KIND_CATEGORIES) {
      expect(within(categoryNav).getByRole("link", { name: cat.name }))
        .toHaveAttribute("href", `/requests/category/${cat.slug}`);
    }

    expect(
      within(categoryNav).getAllByRole("link").map((link) => link.getAttribute("aria-label")),
    ).toEqual([
      "Medical aid",
      "Education",
      "Livelihood",
      "Clothing",
      "Household",
      "Relief",
      "Electronics",
      "Furniture",
      "Sports",
    ]);
  });

  it("asks for nothing", () => {
    // Someone can see the real thing in one click. A form here would undo that.
    const { container } = render(<CategoryStrip />);
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
  });
});

describe("hero", () => {
  it("uses the dedicated donation handoff photograph", () => {
    render(<HeroSection />);
    expect(screen.getByRole("img", { name: enMessages.hero.photoAlt }))
      .toHaveAttribute("src", expect.stringContaining("causekind-hero-handoff.webp"));
  });

  it("opens the verified public board without requiring a category choice", () => {
    // The category strip is a shortcut, not a gate.
    render(<HeroSection />);
    expect(screen.getByRole("link", { name: enMessages.hero.ctaBrowse }))
      .toHaveAttribute("href", "/requests");
  });

  it("carries a guest into donor registration without losing the listing intent", () => {
    render(<HeroSection />);
    expect(screen.getByRole("link", { name: enMessages.hero.ctaStartGiving }))
      .toHaveAttribute("href", "/register?role=DONOR&next=%2Fitems%2Fnew");
  });

  it("takes a signed-in donor straight to item listing", () => {
    authState.user = { email: "donor@example.com", role: "ROLE_DONOR" };

    render(<HeroSection />);

    expect(screen.getByRole("link", { name: enMessages.hero.ctaListItem }))
      .toHaveAttribute("href", "/items/new");
    expect(screen.queryByRole("link", { name: enMessages.hero.ctaStartGiving }))
      .not.toBeInTheDocument();
  });

  it("takes a signed-in donee straight to a new request", () => {
    authState.user = { email: "donee@example.com", role: "DONEE" };

    render(<HeroSection />);

    expect(screen.getByRole("link", { name: enMessages.hero.ctaRequestItem }))
      .toHaveAttribute("href", "/requests/new");
    expect(screen.queryByRole("link", { name: enMessages.hero.ctaStartGiving }))
      .not.toBeInTheDocument();
  });

  it("keeps the auth-aware action inert while auth is resolving", () => {
    authState.isLoading = true;

    render(<HeroSection />);

    expect(screen.queryByRole("link", { name: enMessages.hero.ctaStartGiving }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: enMessages.hero.ctaBrowse }))
      .toHaveAttribute("href", "/requests");
  });

  it.each([
    ["ROLE_ADMIN", "/admin/dashboard"],
    ["SUPER_ADMIN", "/super-admin"],
  ])("takes %s to its own dashboard", (role, href) => {
    authState.user = { email: "staff@example.com", role };

    render(<HeroSection />);

    expect(screen.getByRole("link", { name: enMessages.hero.ctaOpenDashboard }))
      .toHaveAttribute("href", href);
  });

  it("asks for nothing", () => {
    const { container } = render(<HeroSection />);
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
