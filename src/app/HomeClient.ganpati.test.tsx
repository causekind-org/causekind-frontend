import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import HomeClient from "./HomeClient";
import enMessages from "../../messages/en.json";
import * as isGanpatiActiveModule from "@/lib/isGanpatiActive";

const authState = {
  user: null as { email: string; role: string } | null,
  isLoading: false,
};

// HeroSection pulls Anton from next/font/google, which has no jsdom
// implementation. Same stub heroFrontDoor.test.tsx already uses.
vi.mock("next/font/google", () => ({ Anton: () => ({ style: { fontFamily: "Anton" } }) }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

vi.mock("@/hooks/useNeedProfileGate", () => ({
  useNeedProfileGate: () => ({ requestAccess: async () => true, checking: false }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const resolve = (key: string) => {
      let node: unknown = enMessages;
      for (const segment of `${namespace}.${key}`.split(".")) {
        node = (node as Record<string, unknown>)?.[segment];
      }
      return node;
    };
    const t = (key: string) => {
      const node = resolve(key);
      return typeof node === "string" ? node : `${namespace}.${key}`;
    };
    t.rich = (key: string) => t(key);
    // HeroSection guards an optional message with t.has before reading it.
    t.has = (key: string) => typeof resolve(key) === "string";
    return t;
  },
}));

describe("HomeClient Ganpati Theme Conditional Rendering", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders standard NGO components when isGanpatiActive returns false (default/today)", () => {
    vi.spyOn(isGanpatiActiveModule, "isGanpatiActive").mockReturnValue(false);

    const { container } = render(
      <HomeClient
        initialCampaigns={[]}
        initialStats={null}
        initialActivity={[]}
        initialItemRequests={[]}
        initialPublicRequests={[]}
      />
    );

    // Should NOT have the festive active class
    const pageWrapper = container.querySelector(".ck-home-page");
    expect(pageWrapper?.classList.contains("ck-ganpati-active")).toBe(false);

    // Should NOT render Ganeshotsav specific eyebrow
    expect(screen.queryByText(/Ganeshotsav Giving/i)).toBeNull();

    // Default hero headline exists
    expect(screen.getByText("Find Someone Near You")).toBeDefined();
  }, 15000);

  it("renders festive Ganpati components when isGanpatiActive returns true (14-25 Sept 2026)", () => {
    vi.spyOn(isGanpatiActiveModule, "isGanpatiActive").mockReturnValue(true);

    const { container } = render(
      <HomeClient
        initialCampaigns={[]}
        initialStats={null}
        initialActivity={[]}
        initialItemRequests={[]}
        initialPublicRequests={[]}
      />
    );

    // Should have the festive active class
    const pageWrapper = container.querySelector(".ck-home-page");
    expect(pageWrapper?.classList.contains("ck-ganpati-active")).toBe(true);

    // Should render Ganeshotsav specific eyebrow in hero and live needs
    const festiveEyebrows = screen.getAllByText(/Ganeshotsav Giving/i);
    expect(festiveEyebrows.length).toBeGreaterThanOrEqual(1);

    // Should render festive Toran
    const toran = container.querySelector("svg");
    expect(toran).toBeDefined();

    // Should render bottom CTA festive heading
    expect(screen.getByText(/Remove obstacles for someone today/i)).toBeDefined();
  }, 15000);

  /**
   * The festive hero shares `.ck-showcase-hero` with the plain one for its
   * layout, and that class also carries a `max-width: 1023px` block of CTA
   * styling written for the plain hero's dark photo scrim. This hero's buttons
   * sit on cream, so those rules painted the sign-up CTA at 1.05:1 and "Explore
   * needs near you" at 1.53:1 — invisible, and only in light mode.
   *
   * <p>The opt-out is the `ck-ganpati-hero` marker, which every one of those
   * selectors now excludes. jsdom applies no stylesheet, so this can only check
   * that the marker is still on the element the stylesheet expects it on — but
   * that is the half that gets dropped in a refactor.
   */
  it("marks the festive hero so the plain hero's mobile CTA styling skips it", () => {
    vi.spyOn(isGanpatiActiveModule, "isGanpatiActive").mockReturnValue(true);

    const { container } = render(
      <HomeClient
        initialCampaigns={[]}
        initialStats={null}
        initialActivity={[]}
        initialItemRequests={[]}
        initialPublicRequests={[]}
      />
    );

    const hero = container.querySelector(".ck-showcase-hero");
    expect(hero).toBeTruthy();
    // Both, and in that order of importance: the layout half is why it keeps
    // `ck-showcase-hero` at all, the marker is why the CTA half skips it.
    expect(hero!.classList.contains("ck-ganpati-hero")).toBe(true);

    // The buttons must still be styling themselves rather than inheriting.
    const secondary = container.querySelector(".ck-hero-secondary-cta");
    expect(secondary).toBeTruthy();
    expect(secondary!.className).toContain("text-[#9a3412]");
    expect(secondary!.className).toContain("bg-white/95");
  }, 15000);
});
