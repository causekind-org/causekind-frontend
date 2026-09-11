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
    const t = (key: string) => {
      const path = `${namespace}.${key}`.split(".");
      let node: unknown = enMessages;
      for (const segment of path) {
        node = (node as Record<string, unknown>)?.[segment];
      }
      return typeof node === "string" ? node : path.join(".");
    };
    t.rich = (key: string) => t(key);
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

  it("renders festive Ganpati components when isGanpatiActive returns true (14-24 Sept 2026)", () => {
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
});
