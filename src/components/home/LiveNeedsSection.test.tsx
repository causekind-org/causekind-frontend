import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PublicItemRequest } from "@/lib/api";

vi.mock("@/hooks/useDynamicTranslation", () => ({
  useDynamicTranslation: (value: string | null) => value,
  TranslatedText: ({ text }: { text?: string }) => <>{text ?? ""}</>,
}));

import { LiveNeedsSection } from "./LiveNeedsSection";

const SAMPLE_REQUESTS: PublicItemRequest[] = [
  {
    id: 1,
    title: "School Bags for Primary Students",
    category: "Education",
    quantity: 3,
    urgency: "NORMAL",
    city: "Virar, MH",
    description: "Required for municipal school children.",
    createdAt: "2026-08-20T10:00:00.000Z",
    imageUrl: null,
    emergency: false,
    doneeFirstName: "Aarav",
  },
  {
    id: 2,
    title: "Folding Wheelchair",
    category: "Medical aid",
    quantity: 1,
    urgency: "CRITICAL",
    city: "Vasai West, MH",
    description: "For elderly grandmother.",
    createdAt: "2026-08-22T10:00:00.000Z",
    imageUrl: null,
    emergency: true,
    doneeFirstName: "Priya",
  },
  {
    id: 3,
    title: "Sewing Machine",
    category: "Livelihood",
    quantity: 1,
    urgency: "NORMAL",
    city: "Thane, MH",
    description: "For tailoring work.",
    createdAt: "2026-08-25T10:00:00.000Z",
    imageUrl: null,
    emergency: false,
    doneeFirstName: "Meena",
  },
];

describe("LiveNeedsSection", () => {
  it("renders the headline", () => {
    render(<LiveNeedsSection initialRequests={SAMPLE_REQUESTS} />);

    expect(screen.getByText(/Real people\. Real needs\./i)).toBeInTheDocument();
  });

  /**
   * The green "Live Open Needs · N verified needs awaiting items" pill was
   * removed deliberately: it was the only emerald element on a page being
   * brought onto one palette. The count it carried is not lost — when the board
   * holds more than the grid shows, the overflow line under the grid states the
   * remainder (see liveNeedsOverflow.test.tsx).
   */
  it("no longer renders the live indicator pill", () => {
    render(<LiveNeedsSection initialRequests={SAMPLE_REQUESTS} />);

    expect(screen.queryByText(/Live Open Needs/i)).toBeNull();
    expect(screen.queryByText(/verified needs awaiting items/i)).toBeNull();
  });

  it("renders cards with category icons, locations, quantities, and locked CTAs", () => {
    render(<LiveNeedsSection initialRequests={SAMPLE_REQUESTS} />);

    expect(screen.getByText("School Bags for Primary Students")).toBeInTheDocument();
    expect(screen.getByText("Folding Wheelchair")).toBeInTheDocument();
    expect(screen.getByText("Sewing Machine")).toBeInTheDocument();

    expect(screen.getByText(/Virar, MH/i)).toBeInTheDocument();
    expect(screen.getByText(/Vasai West, MH/i)).toBeInTheDocument();

    const lockedCtas = screen.getAllByRole("link", { name: /Log in to offer this item/i });
    expect(lockedCtas.length).toBe(3);

    // Verify href leads to login redirect for the offer
    expect(lockedCtas[0]).toHaveAttribute(
      "href",
      expect.stringContaining("/login?next=")
    );
    expect(lockedCtas[0]).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent("/requests/1/offer"))
    );
  });

  it("displays urgent badge when request has critical urgency or emergency flag", () => {
    render(<LiveNeedsSection initialRequests={SAMPLE_REQUESTS} />);

    const urgentBadges = screen.getAllByText(/Urgent/i);
    expect(urgentBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("filters cards when a category pill is clicked", async () => {
    const user = userEvent.setup();
    render(<LiveNeedsSection initialRequests={SAMPLE_REQUESTS} />);

    const educationPill = screen.getByRole("button", { name: /Education/i });
    await user.click(educationPill);

    expect(screen.getByText("School Bags for Primary Students")).toBeInTheDocument();
  });

  it("renders a real empty state when initialRequests is empty", () => {
    render(<LiveNeedsSection initialRequests={[]} />);

    // The section itself still renders.
    expect(screen.getByText(/Real people\. Real needs\./i)).toBeInTheDocument();

    // It shows an honest empty state rather than sample data.
    //
    // This replaces an assertion that the component "falls back to authentic
    // sample needs". It never did: the render states the rule directly —
    // "whatever the API returns (including an empty array) is what renders.
    // No local fallback/dummy data masking a real empty state." The old case
    // asserted the opposite of its own component and had never passed.
    expect(screen.getByText(/No open requests in All right now/i)).toBeInTheDocument();

    // No cards means no per-card offer links.
    expect(screen.queryByRole("link", { name: /Log in to offer this item/i })).toBeNull();
  });
});
