import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { InKindStats, PublicItemRequest } from "@/lib/api";

vi.mock("@/hooks/useDynamicTranslation", () => ({
  useDynamicTranslation: (value: string | null) => value,
  TranslatedText: ({ text }: { text?: string }) => <>{text ?? ""}</>,
}));

import { TheGapSection } from "./TheGapSection";
import { InKindProof } from "./InKindProof";
import { HandoverJourney } from "./HandoverJourney";

/**
 * The landing page makes factual claims about a real platform, and the sections
 * added in the 2026-09-24 redesign are built so those claims degrade to silence
 * rather than to a plausible-looking number when the data behind them is
 * missing.
 *
 * <p>That property is invisible in the happy path and very easy to remove by
 * accident — a `?? 0` added to quieten a type error is all it takes for the
 * homepage to start telling visitors there have been zero handovers when the
 * truth is that the stats endpoint timed out. These tests exist to make that
 * change fail loudly.
 */

function requestAt(id: number, createdAt: string): PublicItemRequest {
  return {
    id,
    title: `Need ${id}`,
    category: "Education",
    quantity: 2,
    urgency: "NORMAL",
    city: "Virar, MH",
    description: null,
    createdAt,
    imageUrl: null,
    emergency: false,
    doneeFirstName: "Aarav",
  };
}

describe("The gap section", () => {
  it("renders nothing at all when the board is empty", () => {
    const { container } = render(<TheGapSection requests={[]} />);

    // An empty board is the one state in which "needs are going unclaimed" is
    // not true. Showing the section with a placeholder would be the most
    // dishonest thing on the page.
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when every request has an unusable timestamp", () => {
    const undated = [{ ...requestAt(1, ""), createdAt: "not-a-date" }];

    // The section's whole claim is "this has been waiting N days". With no
    // parsable date there is no N, so there is nothing to say.
    const { container } = render(<TheGapSection requests={undated} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("leads with the longest-waiting need, not the newest", () => {
    const now = new Date();
    const daysAgo = (n: number) =>
      new Date(now.getTime() - n * 86_400_000).toISOString();

    render(
      <TheGapSection
        requests={[
          { ...requestAt(1, daysAgo(2)), title: "Newest need" },
          { ...requestAt(2, daysAgo(40)), title: "Oldest need" },
          { ...requestAt(3, daysAgo(9)), title: "Middle need" },
        ]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    // Every other surface on the site shows this board newest-first, which is
    // exactly what hides the needs this section is about. Reversing it is the
    // entire point of the section, so the order is asserted, not assumed.
    expect(items[0]).toHaveTextContent("Oldest need");
    expect(items[items.length - 1]).toHaveTextContent("Newest need");
  });

  it("states the wait in days and never invents a fulfilment figure", () => {
    const twelveDaysAgo = new Date(Date.now() - 12 * 86_400_000).toISOString();

    render(<TheGapSection requests={[requestAt(1, twelveDaysAgo)]} />);

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/waiting 12 days/i)).toBeInTheDocument();

    // `PublicItemRequest` carries no fulfilled count, so any progress figure
    // here would be fabricated. Guard the absence explicitly.
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/fulfilled/i)).not.toBeInTheDocument();
  });
});

describe("In-kind proof", () => {
  it("renders nothing when the stats call failed", () => {
    const { container } = render(<InKindProof stats={null} />);

    // Null means "we could not ask", which is not the same as "it is zero".
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a genuine zero rather than hiding it", () => {
    const fresh: InKindStats = { itemsListed: 0, needsPosted: 0, verifiedHandovers: 0 };

    render(<InKindProof stats={fresh} />);

    // A young platform saying "0 verified handovers" is worth more than a young
    // platform hiding the section until the number flatters it.
    expect(screen.getByText("verified handovers")).toBeInTheDocument();
  });

  it("gives a screen reader the true figure, never a mid-count value", () => {
    const stats: InKindStats = { itemsListed: 412, needsPosted: 96, verifiedHandovers: 38 };

    render(<InKindProof stats={stats} />);

    // The visible digits animate up from zero; the accessible name must not.
    // Indian digit grouping, because the audience is Indian.
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(screen.getByText("412")).toBeInTheDocument();
    expect(screen.getByText("96")).toBeInTheDocument();
  });
});

describe("Handover journey", () => {
  it("exposes the stages as a keyboard-operable tablist", async () => {
    const user = userEvent.setup();
    render(<HandoverJourney />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(6);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    // Roving tabindex: exactly one stage is in the tab order at a time.
    expect(tabs.filter((t) => t.getAttribute("tabindex") === "0")).toHaveLength(1);

    await user.click(tabs[0]);
    await user.keyboard("{ArrowRight}");

    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName(/verified/i);
  });

  it("wraps at both ends so the rail cannot trap focus", async () => {
    const user = userEvent.setup();
    render(<HandoverJourney />);

    const tabs = screen.getAllByRole("tab");
    await user.click(tabs[0]);
    await user.keyboard("{ArrowLeft}");

    expect(tabs[tabs.length - 1]).toHaveAttribute("aria-selected", "true");
  });

  it("describes the route without quoting a percentage or a fee", () => {
    render(<HandoverJourney />);

    // The section's argument is that there is no pool to take a cut from. If a
    // percentage ever appears here it is either a fabricated allocation or a
    // real fee that belongs in a different, more careful section.
    expect(screen.queryByText(/\d+\s?%/)).not.toBeInTheDocument();
  });
});
