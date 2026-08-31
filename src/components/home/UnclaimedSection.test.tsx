import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { PublicItemRequest } from "@/lib/api";
import { UnclaimedSection } from "./UnclaimedSection";

function need(over: Partial<PublicItemRequest> = {}): PublicItemRequest {
  return {
    id: 1,
    title: "Winter blanket",
    category: "Household",
    quantity: 1,
    urgency: "NORMAL",
    city: "Nagpur",
    description: null,
    createdAt: "2020-01-01T00:00:00.000Z",
    imageUrl: null,
    emergency: false,
    doneeFirstName: "Ramesh",
    ...over,
  };
}

describe("UnclaimedSection", () => {
  it("leads with the request that has waited longest", () => {
    // The inversion is the whole point of the section: every other list on the
    // site leads with the newest, which is the one least in need of a champion.
    render(
      <UnclaimedSection
        requests={[
          need({ id: 1, title: "Newest", createdAt: "2026-08-27T00:00:00.000Z" }),
          need({ id: 2, title: "Oldest", createdAt: "2020-01-01T00:00:00.000Z" }),
          need({ id: 3, title: "Middle", createdAt: "2024-01-01T00:00:00.000Z" }),
        ]}
      />,
    );

    const titles = screen.getAllByRole("listitem").map(li => li.textContent);
    expect(titles[0]).toMatch(/Oldest/);
    expect(titles[2]).toMatch(/Newest/);
  });

  it("does not repeat the request already shown in the hero", () => {
    render(
      <UnclaimedSection
        requests={[need({ id: 1, title: "In the hero" }), need({ id: 2, title: "Not in the hero" })]}
        excludeId={1}
      />,
    );

    expect(screen.queryByText("In the hero")).not.toBeInTheDocument();
    expect(screen.getByText("Not in the hero")).toBeInTheDocument();
  });

  it("shows at most six, so the list stays readable", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      need({ id: i + 1, title: `Need ${i + 1}`, createdAt: `2026-0${(i % 8) + 1}-01T00:00:00.000Z` }),
    );

    render(<UnclaimedSection requests={many} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });

  it("renders nothing at all rather than an empty state", () => {
    // "Nothing is waiting" is a claim this page cannot make: the list can be
    // empty because the board is empty, because the fetch failed, or because
    // the hero took the only row. A heading over nothing invites the first
    // reading, and the other two are just as likely.
    expect(render(<UnclaimedSection requests={[]} />).container).toBeEmptyDOMElement();
    expect(render(<UnclaimedSection requests={null} />).container).toBeEmptyDOMElement();
  });

  it("renders nothing when the hero's request was the only one", () => {
    const { container } = render(
      <UnclaimedSection requests={[need({ id: 1 })]} excludeId={1} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("links each card to the offer flow for that request", () => {
    render(<UnclaimedSection requests={[need({ id: 9, title: "Study table" })]} />);

    const link = screen.getByRole("link", { name: /study table/i });
    expect(link).toHaveAttribute("href", "/requests/9/offer");
  });

  it("states each wait, and never as '1 days'", () => {
    const oneDayAgo = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();

    render(<UnclaimedSection requests={[need({ createdAt: oneDayAgo })]} />);

    expect(screen.getByText("waiting 1 day")).toBeInTheDocument();
  });

  it("gives the section a heading its label points at", () => {
    render(<UnclaimedSection requests={[need()]} />);

    const region = screen.getByRole("region", { name: /no one has tied a thread here yet/i });
    expect(region).toBeInTheDocument();
  });
});
