import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { PublicItemRequest } from "@/lib/api";
import { RAKSHA_BANDHAN_QUOTES, WaitingLongestCard } from "./ThreadOfProtection";

/**
 * The hero pieces.
 *
 * <p>What is worth pinning is what this treatment must never do: state a wait
 * it cannot compute, claim someone is waiting when the page cannot know, or leak
 * a field the public projection deliberately withholds.
 */

function need(over: Partial<PublicItemRequest> = {}): PublicItemRequest {
  return {
    id: 42,
    title: "Winter blanket",
    category: "Household",
    quantity: 1,
    urgency: "NORMAL",
    city: "Nagpur",
    description: null,
    // Old enough that the wait is unambiguous whenever the suite runs.
    createdAt: "2020-01-01T00:00:00.000Z",
    imageUrl: null,
    emergency: false,
    doneeFirstName: "Ramesh",
    ...over,
  };
}

describe("WaitingLongestCard", () => {
  it("shows the need, the person and how long they have waited", () => {
    render(<WaitingLongestCard request={need()} />);

    expect(screen.getByText("Winter blanket")).toBeInTheDocument();
    expect(screen.getByText(/Ramesh · Nagpur/)).toBeInTheDocument();
    expect(screen.getByText(/waiting \d+ days/)).toBeInTheDocument();
    expect(screen.getByText(/no one yet/i)).toBeInTheDocument();
  });

  it("renders nothing when there is no request", () => {
    // An empty state here would be a card announcing that nobody is waiting —
    // a claim the page cannot make, since the list can also be empty because
    // the fetch failed.
    const { container } = render(<WaitingLongestCard request={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the wait cannot be computed", () => {
    const { container } = render(<WaitingLongestCard request={need({ createdAt: "" })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("points its action at the offer flow for that specific request", () => {
    render(<WaitingLongestCard request={need({ id: 7 })} />);

    const action = screen.getByRole("link", { name: /tie a thread here/i });
    expect(action).toHaveAttribute("href", "/requests/7/offer");
  });

  it("names the donee by first name only", () => {
    // All the public projection carries, deliberately — it omits coordinates,
    // pincode, donee id and verification state.
    render(<WaitingLongestCard request={need({ doneeFirstName: "Ramesh" })} />);

    expect(screen.getByText(/Ramesh · Nagpur/)).toBeInTheDocument();
    expect(screen.queryByText(/Ramesh [A-Z]/)).not.toBeInTheDocument();
  });
});

describe("RAKSHA_BANDHAN_QUOTES", () => {
  it("attributes every line to the occasion rather than to a person", () => {
    expect(RAKSHA_BANDHAN_QUOTES.length).toBeGreaterThan(0);
    for (const quote of RAKSHA_BANDHAN_QUOTES) {
      expect(quote.author).toBe("Raksha Bandhan");
      expect(quote.text.trim()).not.toBe("");
    }
  });

  it("does not cast donors and donees as siblings", () => {
    // Sentimentality about a relationship this platform does not arrange. The
    // people on the board asked for a blanket, not a sibling.
    const forbidden = /\b(brother|sister|sibling|bhai|behen)\b/i;
    for (const quote of RAKSHA_BANDHAN_QUOTES) {
      expect(quote.text).not.toMatch(forbidden);
    }
  });
});
