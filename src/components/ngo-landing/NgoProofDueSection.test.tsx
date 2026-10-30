import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NgoProofDueSection } from "./NgoProofDueSection";

const iso = (ms: number) => new Date(Date.now() + ms).toISOString().slice(0, 19); // UTC, no zone
const d = (id: number, over: Record<string, unknown> = {}) => ({ id, title: `Drive ${id}`, quantityReceived: 5, proofDueAt: iso(2 * 86_400_000), ...over });
const st = (over: Record<string, unknown> = {}) => ({ isLoading: false, error: null, statsUnavailable: false, overview: { proofDueDrives: [] }, ...over }) as never;

describe("NGO landing: Proof due (from useNgoStatus overview)", () => {
  it("shows a skeleton while loading", () => {
    render(<NgoProofDueSection status={st({ isLoading: true, overview: null })} />);
    expect(screen.getByTestId("ngo-proof-due-skeleton")).toBeInTheDocument();
  });

  it("shows up to 3 drives with chips, Submit proof links and See all", () => {
    render(<NgoProofDueSection status={st({ overview: { proofDueDrives: [d(1), d(2, { proofDueAt: iso(-3 * 86_400_000) }), d(3), d(4), d(5, { quantityReceived: 0 })] } })} />);
    const cards = screen.getAllByTestId("ngo-proof-due-card");
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent("Due soon");
    expect(cards[0]).toHaveTextContent("5 received");
    expect(cards[1]).toHaveTextContent("Overdue");
    expect(screen.getAllByRole("link", { name: /Submit proof/ })[0]).toHaveAttribute("href", "/dashboard/ngo?tab=activity&filter=proof&drive=1");
    expect(screen.getByRole("link", { name: /See all/ })).toHaveAttribute("href", "/dashboard/ngo?tab=activity&filter=proof");
  });

  it("is always shown: All caught up when nothing is due, a note on error", () => {
    const { unmount } = render(<NgoProofDueSection status={st({ overview: { proofDueDrives: [d(1, { quantityReceived: 0 })] } })} />);
    expect(screen.getByTestId("ngo-proof-due-empty")).toHaveTextContent("All caught up: no proof due");
    expect(screen.queryByTestId("ngo-proof-due-card")).toBeNull();
    unmount();
    render(<NgoProofDueSection status={st({ error: "x", overview: null })} />);
    expect(screen.getByTestId("ngo-proof-due")).toBeInTheDocument();
    expect(screen.getByTestId("ngo-proof-due-unavailable")).toBeInTheDocument();
  });
});
