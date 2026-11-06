import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Diwali runs until 13 Nov 2026 00:00 IST (src/lib/diwali.ts); pinned per case.
const diwaliState = vi.hoisted(() => ({ on: true }));
vi.mock("@/lib/diwali", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/diwali")>()),
  isDiwaliCampaignActive: () => diwaliState.on,
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, isRestoring: false }) }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  fundraisers: { live: () => Promise.resolve([]) },
  sahasCampaigns: { live: () => Promise.resolve([]) },
}));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: { refresh: vi.fn() } }));

import { DiwaliMobileLayer, DiwaliSeam } from "./DiwaliMobileLayer";
import { HomeSahasCampaigns } from "./HomeSahasCampaigns";
import { HomeFundraisers } from "./HomeFundraisers";

beforeEach(() => {
  diwaliState.on = true;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

describe("the Diwali decorations", () => {
  it("show while Diwali is on", () => {
    const { container } = render(<><DiwaliMobileLayer /><DiwaliSeam kind="diya" diyas={3} /></>);
    expect(container.querySelector(".ck-dw-layer")).not.toBeNull();
    expect(container.querySelectorAll(".ck-dw-seam .ck-dw-diya")).toHaveLength(3);
  });

  it("leave once it has ended", () => {
    diwaliState.on = false;
    const { container } = render(<><DiwaliMobileLayer /><DiwaliSeam kind="lotus" lanterns="both" /></>);
    expect(container.innerHTML).toBe("");
  });
});

describe("the campaigns row", () => {
  it("wears the lantern during Diwali", async () => {
    const { container } = render(<HomeSahasCampaigns />);
    expect(await screen.findByText("Explore Sahas Campaigns")).toBeInTheDocument();
    expect(container.querySelector(".ck-dw-campaigns > .ck-dw-hang")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Light a diya for community campaigns" })).toBeInTheDocument();
    expect(screen.queryByText(/Support our/)).toBeNull();
    expect(container.querySelector(".ck-dw-diya")).not.toBeNull();
  });

  it("stays after Diwali, with its headline and without the festive pieces", async () => {
    diwaliState.on = false;
    const { container } = render(<HomeSahasCampaigns />);
    expect(await screen.findByText("Explore Sahas Campaigns")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Support our community campaigns" })).toBeInTheDocument();
    expect(screen.getByText(/Collective relief, education, and community initiatives/)).toBeInTheDocument();
    expect(screen.queryByText(/Light a diya/)).toBeNull();
    expect(container.querySelector(".ck-dw-hang")).toBeNull();
    expect(container.querySelector(".ck-dw-diya")).toBeNull();
  });
});

describe("the fundraisers section", () => {
  it("shows diwali headline during Diwali", async () => {
    const { container } = render(<HomeFundraisers />);
    expect(await screen.findByText("No fundraisers yet")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Light a diya for someone's need" })).toBeInTheDocument();
    expect(screen.queryByText(/a reason to smile again/)).toBeNull();
  });

  it("shows everyday headline after Diwali", async () => {
    diwaliState.on = false;
    render(<HomeFundraisers />);
    expect(await screen.findByText("No fundraisers yet")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Give someone a reason to smile again" })).toBeInTheDocument();
    expect(screen.getByText(/Don't let their hope go quiet\./)).toBeInTheDocument();
  });

  it("points the empty card to a money donation", async () => {
    render(<HomeFundraisers />);
    const card = (await screen.findByText("No fundraisers yet")).closest("a");
    expect(card).toHaveAttribute("href", expect.stringContaining("/donate/money"));
    expect(card).toHaveTextContent("Donate money");
  });
});

describe("the Diwali page styles", () => {
  it("only reach the page through .ck-diwali, so they leave with it", () => {
    for (const file of ["diwaliMobile.css", "diwaliDesktop.css"]) {
      const css = readFileSync(resolve(__dirname, file), "utf8");
      expect(css.match(/\.ck-home-page(?![\w.-])/g), file).toBeNull();
      // The root carries .ck-diwali itself, so a :has() on it must not look for
      // another one inside — that never matches (it hid the desktop hero lights).
      expect(css.match(/\.ck-diwali:has\([^)]*\.ck-diwali/g), file).toBeNull();
      // The fundraisers row is permanent, so only its own rules skip the gate.
      const ungated = css.split("\n").filter((line) => /(?<!ck-diwali |\.ck-diwali:has\()\.ck-dw-web/.test(line));
      expect(ungated.every((line) => /ck-dw-(campaigns|c-|card)/.test(line) && !/ck-dw-hang/.test(line)), file).toBe(true);
    }
  });
});
