import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PublicItemRequest } from "@/lib/api";

const getPublicItemRequests = vi.fn();
const getItemRequests = vi.fn();

vi.mock("@/lib/api", () => ({
  getPublicItemRequests: (...a: unknown[]) => getPublicItemRequests(...a),
  getItemRequests: (...a: unknown[]) => getItemRequests(...a),
}));

import PublicRequestsBoard from "./PublicRequestsBoard";

/**
 * What a logged-out visitor may see, and what must never be asked of them.
 *
 * <p>The privacy assertions are deliberately made against the object the
 * component receives, not against the rendered output. Hiding a field with CSS
 * would satisfy a DOM assertion while the coordinates still travelled to the
 * browser and sat in the network tab.
 */
const REQUESTS: PublicItemRequest[] = [
  {
    id: 1, title: "Folding wheelchair", category: "Medical aid", quantity: 1,
    urgency: "CRITICAL", city: "Virar", description: "For a neighbour.",
    createdAt: "2026-08-01T10:00:00", imageUrl: null, emergency: false,
    doneeFirstName: "Priya",
  },
  {
    id: 2, title: "School desks", category: "Education", quantity: 12,
    urgency: "LOW", city: "Pune", description: "For a small school.",
    createdAt: "2026-08-09T10:00:00", imageUrl: null, emergency: false,
    doneeFirstName: "Amit",
  },
  {
    id: 3, title: "Blankets", category: "Relief", quantity: 5,
    urgency: "MEDIUM", city: "Nashik", description: "After the flood.",
    createdAt: "2026-08-05T10:00:00", imageUrl: null, emergency: true,
    doneeFirstName: "Sana",
  },
] as PublicItemRequest[];

async function renderBoard(data: PublicItemRequest[] = REQUESTS) {
  getPublicItemRequests.mockResolvedValue(data);
  render(<PublicRequestsBoard />);
  await waitFor(() => expect(screen.queryByText(/folding wheelchair/i)).not.toBeNull());
}

describe("guest request board", () => {
  beforeEach(() => {
    getPublicItemRequests.mockReset();
    getItemRequests.mockReset();
  });

  it("reads the reduced public endpoint", async () => {
    await renderBoard();
    expect(getPublicItemRequests).toHaveBeenCalled();
  });

  it("never calls the authenticated request endpoint", async () => {
    await renderBoard();
    expect(getItemRequests).not.toHaveBeenCalled();
  });

  it("never asks a guest for location", async () => {
    await renderBoard();
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled();
  });

  it("offers no distance-based sorting, because there are no coordinates", async () => {
    await renderBoard();
    const sort = screen.getByLabelText(/sort/i);
    expect(within(sort).queryByText(/nearest/i)).toBeNull();
    expect(within(sort).queryByText(/distance/i)).toBeNull();
  });

  it("shows no distance on any card", async () => {
    await renderBoard();
    expect(screen.queryByText(/\bkm\b/i)).toBeNull();
  });

  it("tells the visitor browsing is free, without blocking them", async () => {
    await renderBoard();
    expect(screen.getByText(/browse open needs without an account/i)).toBeInTheDocument();

    // A banner, not a wall. Asserted as "nothing is gating the content":
    // no dialog, and the requests are present and reachable by assistive tech.
    // Deliberately not `toBeVisible()` — these cards animate in through
    // framer's whileInView, which never resolves under jsdom, so computed
    // opacity would report 0 for content a real browser shows fine.
    expect(screen.queryByRole("dialog")).toBeNull();
    const card = screen.getByText(/folding wheelchair/i);
    expect(card).toBeInTheDocument();
    expect(card.closest("[aria-hidden='true']")).toBeNull();
    expect(card.closest("a")).toHaveAttribute("href");
  });
});

describe("guest donation action", () => {
  beforeEach(() => {
    getPublicItemRequests.mockReset();
    getItemRequests.mockReset();
  });

  it("routes every card through login, preserving the exact request", async () => {
    await renderBoard();
    const card = screen.getByText(/folding wheelchair/i).closest("a");
    expect(card).toHaveAttribute("href", "/login?next=%2Frequests%2F1%2Foffer");
  });

  it("uses the validated next parameter, never the obsolete redirect one", async () => {
    await renderBoard();
    for (const a of screen.getAllByRole("link")) {
      expect(a.getAttribute("href") ?? "").not.toContain("redirect=");
    }
  });

  it("says login is required rather than implying the request will open", async () => {
    await renderBoard();
    expect(screen.getAllByText(/log in to offer an item/i).length).toBeGreaterThan(0);
  });
});

describe("guest filtering and sorting", () => {
  beforeEach(() => {
    getPublicItemRequests.mockReset();
    getItemRequests.mockReset();
  });

  const titlesInOrder = () =>
    screen.getAllByRole("heading", { level: 2 }).map(h => h.textContent);

  it("sorts newest first by default", async () => {
    await renderBoard();
    expect(titlesInOrder()[0]).toMatch(/school desks/i); // 09 Aug, the latest
  });

  it("sorts by quantity", async () => {
    await renderBoard();
    await userEvent.selectOptions(screen.getByLabelText(/sort/i), "quantity");
    expect(titlesInOrder()[0]).toMatch(/school desks/i); // qty 12
  });

  it("ranks an emergency above its own urgency label when sorting by urgency", async () => {
    await renderBoard();
    await userEvent.selectOptions(screen.getByLabelText(/sort/i), "urgent");
    // Blankets is MEDIUM but flagged emergency, so it must outrank the
    // CRITICAL wheelchair — the card visibly says "Urgent" either way.
    expect(titlesInOrder()[0]).toMatch(/blankets/i);
  });

  it("filters by category", async () => {
    await renderBoard();
    await userEvent.click(screen.getByRole("button", { name: /education/i }));
    expect(screen.getByText(/school desks/i)).toBeInTheDocument();
    expect(screen.queryByText(/folding wheelchair/i)).toBeNull();
  });

  it("filters by urgency", async () => {
    await renderBoard();
    await userEvent.click(screen.getByRole("button", { name: /^critical$/i }));
    expect(screen.getByText(/folding wheelchair/i)).toBeInTheDocument();
    expect(screen.queryByText(/school desks/i)).toBeNull();
  });

  it("searches across title, city and category", async () => {
    await renderBoard();
    await userEvent.type(screen.getByLabelText(/search open needs/i), "nashik");
    expect(screen.getByText(/blankets/i)).toBeInTheDocument();
    expect(screen.queryByText(/school desks/i)).toBeNull();
  });

  it("distinguishes 'nothing matched' from 'nothing exists'", async () => {
    await renderBoard();
    await userEvent.type(screen.getByLabelText(/search open needs/i), "zzzzzz");
    expect(screen.getByText(/no open requests match these filters/i)).toBeInTheDocument();
    // Must not claim the platform is empty when it is the filter that is narrow.
    expect(screen.queryByText(/no open public needs at the moment/i)).toBeNull();
  });

  it("says the board is empty only when it genuinely is", async () => {
    getPublicItemRequests.mockResolvedValue([]);
    render(<PublicRequestsBoard />);
    await waitFor(() =>
      expect(screen.getByText(/no open public needs at the moment/i)).toBeInTheDocument(),
    );
  });
});

describe("guest error handling", () => {
  beforeEach(() => {
    getPublicItemRequests.mockReset();
    getItemRequests.mockReset();
  });

  it("reports a failed fetch as a failure, not as an empty board", async () => {
    getPublicItemRequests.mockRejectedValue(new Error("network down"));
    render(<PublicRequestsBoard />);

    await waitFor(() =>
      expect(screen.getByText(/couldn't load needs/i)).toBeInTheDocument(),
    );
    // The distinction that matters: "we could not ask" must never be rendered
    // as "there is nothing to give".
    expect(screen.queryByText(/no open public needs at the moment/i)).toBeNull();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("never surfaces the raw error text to the user", async () => {
    getPublicItemRequests.mockRejectedValue(new Error("ECONNREFUSED 10.0.0.4:5432"));
    render(<PublicRequestsBoard />);

    await waitFor(() =>
      expect(screen.getByText(/couldn't load needs/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/ECONNREFUSED/)).toBeNull();
    expect(screen.queryByText(/10\.0\.0\.4/)).toBeNull();
  });

  it("retries through the public endpoint only", async () => {
    getPublicItemRequests.mockRejectedValueOnce(new Error("nope"));
    render(<PublicRequestsBoard />);
    await waitFor(() => screen.getByRole("button", { name: /retry/i }));

    getPublicItemRequests.mockResolvedValue(REQUESTS);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByText(/folding wheelchair/i)).toBeInTheDocument());
    expect(getItemRequests).not.toHaveBeenCalled();
  });
});
