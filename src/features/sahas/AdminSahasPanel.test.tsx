import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { SahasAdminDetail } from "@/lib/api";

/**
 * Sahas admin panel, phase D2. Worth defending: publishing stays blocked while the
 * server's checklist names anything missing, and an admin reaches a campaign from the list.
 */

const list = vi.fn();
const get = vi.fn();
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, sahasAdmin: { list: () => list(), get: (id: number) => get(id), items: () => Promise.resolve([]), offers: () => Promise.resolve([]) } };
});

import { AdminSahasPanel } from "./AdminSahasPanel";

const detail = (missing: string[]): SahasAdminDetail => ({
  id: 4, version: 2, status: "DRAFT", slug: "kits", title: "School kits", summary: null, description: null, category: null,
  city: null, state: null, imageUrl: null, coverAltText: null, coverConsent: null, collectsItems: true, collectsMoney: false,
  targetAmount: null, amountRaised: null, startDate: null, endDate: null, featured: false, hidden: false, publishAt: null,
  pauseReason: null, missingForPublish: missing,
});

beforeEach(() => {
  list.mockResolvedValue([{ id: 4, slug: "kits", title: "School kits", status: "DRAFT", phase: "OPEN", collectsItems: true,
    collectsMoney: false, targetAmount: null, amountRaised: null, endDate: null, featured: false, publishAt: null, updatedAt: "" }]);
  get.mockReset();
});

describe("Sahas admin panel", () => {
  it("opens a campaign from the list and blocks publishing while something is missing", async () => {
    get.mockResolvedValue(detail(["cover photo", "add at least one item"]));
    render(<AdminSahasPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "School kits" }));
    expect(await screen.findByText("• cover photo")).toBeTruthy();
    const publish = screen.getByRole("button", { name: /Publish · fix 2 first/ }) as HTMLButtonElement;
    expect(publish.disabled).toBe(true);
  });

  it("allows publishing once the checklist is clear", async () => {
    get.mockResolvedValue(detail([]));
    render(<AdminSahasPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "School kits" }));
    const publish = await screen.findByRole("button", { name: "Publish" }) as HTMLButtonElement;
    expect(publish.disabled).toBe(false);
  });
});
