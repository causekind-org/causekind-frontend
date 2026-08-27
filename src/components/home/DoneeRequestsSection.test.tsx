import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";

import { DoneeRequestsSection } from "./DoneeRequestsSection";
import { DONOR_CATEGORY_EVENT, DONOR_CATEGORY_OPEN_EVENT } from "@/components/DonorCategoryModal";
import type { ItemRequest } from "@/lib/api";

/**
 * The "Watching for you" band.
 *
 * <p>Everything a visitor sees here is decided by two inputs that never appear
 * in the markup: a localStorage watchlist, and a count derived from the request
 * list. Three of those combinations render *nothing at all*, and the difference
 * between "you follow nothing" and "you follow nine quiet categories" is the
 * difference between an absent section and a full grid. That is what these
 * tests pin.
 *
 * <p><b>Rendered, not source-scanned.</b> The subject is the real component;
 * only `useAuth` and `Reveal` are stubbed — the former because the Edit control
 * is gated on role, the latter because its `whileInView` never fires in jsdom
 * and would leave the whole tree at `opacity: 0`.
 *
 * <p>The counting and ordering assertions matter more than they look. Tile size
 * is derived from rank, so an ordering regression silently demotes the busiest
 * category to a single cell while every count on screen stays correct.
 */

const authState = {
  user: null as { email: string; role: string } | null,
  isLoading: false,
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

// `Reveal` and the inner motion.div both animate on scroll, which jsdom never
// reports. Passing the children straight through keeps the subject visible.
vi.mock("@/components/Reveal", () => ({
  Reveal: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

const STORAGE_KEY = "causekind_donor_category";

function requests(counts: Record<string, number>): ItemRequest[] {
  const out: ItemRequest[] = [];
  for (const [category, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) {
      out.push({ id: `${category}-${i}`, category } as unknown as ItemRequest);
    }
  }
  return out;
}

beforeEach(() => {
  authState.user = null;
  authState.isLoading = false;
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("watchlist resolution", () => {
  it("renders nothing when the donor has never chosen (no stored key)", () => {
    const { container } = render(<DoneeRequestsSection itemRequests={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows every category when the donor explicitly chose 'all' (stored empty array)", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    render(<DoneeRequestsSection itemRequests={[]} />);

    expect(screen.getByText("Medical aid")).toBeInTheDocument();
    expect(screen.getByText("Sports")).toBeInTheDocument();
    expect(screen.getAllByText("Quiet")).toHaveLength(9);
  });

  it("shows only the chosen categories", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["Education", "Sports"]));
    render(<DoneeRequestsSection itemRequests={[]} />);

    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.getByText("Sports")).toBeInTheDocument();
    expect(screen.queryByText("Medical aid")).not.toBeInTheDocument();
  });

  it("drops a stored category that is no longer a real one", () => {
    // A category removed from ALL_REQUEST_CATEGORIES lives on in the browsers of
    // everyone who picked it. It must not reach CATEGORY_VISUALS as a lookup.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["Education", "Sorcery"]));
    render(<DoneeRequestsSection itemRequests={[]} />);

    expect(screen.getByText("Education")).toBeInTheDocument();
    expect(screen.queryByText("Sorcery")).not.toBeInTheDocument();
  });

  it("renders nothing when every stored category is unrecognised", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["Sorcery"]));
    const { container } = render(<DoneeRequestsSection itemRequests={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("counts and hierarchy", () => {
  it("shows a count for an active category and 'Quiet' for an empty one", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["Education", "Sports"]));
    render(<DoneeRequestsSection itemRequests={requests({ Education: 3 })} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getAllByText("Quiet")).toHaveLength(1);
  });

  it("counts only requests in a followed category", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["Education"]));
    render(<DoneeRequestsSection itemRequests={requests({ Education: 2, Sports: 5 })} />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.queryByText("5")).not.toBeInTheDocument();
  });

  it("orders active categories by count, busiest first, ahead of the quiet ones", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    render(
      <DoneeRequestsSection
        itemRequests={requests({ Sports: 2, "Medical aid": 7, Education: 4 })}
      />,
    );

    // Tile size is assigned by rank, so the order here is what decides which
    // category gets the 2x2 tile — not something only a screenshot would catch.
    const names = screen
      .getAllByText(/^(Medical aid|Education|Livelihood|Relief|Household|Furniture|Clothing|Electronics|Sports)$/)
      .map(el => el.textContent);

    expect(names.slice(0, 3)).toEqual(["Medical aid", "Education", "Sports"]);
  });

  it("gives the busiest category the 2x2 tile and the runner-up a wide one", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const { container } = render(
      <DoneeRequestsSection itemRequests={requests({ "Medical aid": 7, Education: 4 })} />,
    );

    const tiles = container.querySelectorAll("a[href^='/requests/category/']");
    expect(tiles[0].className).toContain("col-span-2 row-span-2");
    expect(tiles[1].className).toContain("col-span-2");
    expect(tiles[1].className).not.toContain("row-span-2");
    expect(tiles[2].className).not.toContain("col-span-2");
  });
});

describe("links", () => {
  it("links each tile to its category board by slug", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["Medical aid"]));
    render(<DoneeRequestsSection itemRequests={[]} />);

    // The slug is resolved through inKindCategories, not derived at the call
    // site — "Medical aid" becoming "medical-aid" is exactly the case a naive
    // lowercase-and-hyphen would get right by luck.
    expect(screen.getByRole("link")).toHaveAttribute("href", "/requests/category/medical-aid");
  });
});

describe("the edit control", () => {
  it("is offered to a donor and dispatches the reopen event", () => {
    authState.user = { email: "d@example.com", role: "DONOR" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const onOpen = vi.fn();
    window.addEventListener(DONOR_CATEGORY_OPEN_EVENT, onOpen);

    render(<DoneeRequestsSection itemRequests={[]} />);
    screen.getByRole("button", { name: /edit watchlist/i }).click();

    expect(onOpen).toHaveBeenCalledTimes(1);
    window.removeEventListener(DONOR_CATEGORY_OPEN_EVENT, onOpen);
  });

  it("is hidden from a guest", () => {
    // DonorCategoryModal renders null for anyone who is not a DONOR, so for a
    // guest this button would be a control that visibly does nothing.
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    render(<DoneeRequestsSection itemRequests={[]} />);

    expect(screen.queryByRole("button", { name: /edit watchlist/i })).not.toBeInTheDocument();
  });

  it("is hidden from an admin, who also sees the section", () => {
    authState.user = { email: "a@example.com", role: "ADMIN" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    render(<DoneeRequestsSection itemRequests={[]} />);

    expect(screen.getByText("Medical aid")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit watchlist/i })).not.toBeInTheDocument();
  });
});

describe("live updates", () => {
  it("re-renders when the picker applies a new selection", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["Education"]));
    render(<DoneeRequestsSection itemRequests={[]} />);
    expect(screen.queryByText("Sports")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(DONOR_CATEGORY_EVENT, { detail: ["Education", "Sports"] }),
      );
    });

    expect(screen.getByText("Sports")).toBeInTheDocument();
  });

  it("treats an applied empty selection as 'all', not as 'nothing'", () => {
    // The distinction the storage layer draws: null means never chose, [] means
    // chose everything. Collapsing them would blank the section on an apply.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["Education"]));
    render(<DoneeRequestsSection itemRequests={[]} />);

    act(() => {
      window.dispatchEvent(new CustomEvent(DONOR_CATEGORY_EVENT, { detail: [] }));
    });

    expect(screen.getByText("Medical aid")).toBeInTheDocument();
    expect(screen.getByText("Sports")).toBeInTheDocument();
  });
});

describe("the all-quiet state", () => {
  it("renders a full grid with no counts rather than an empty section", () => {
    // The state the section is actually in most of the time. It must read as
    // calm, not as broken.
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const { container } = render(<DoneeRequestsSection itemRequests={[]} />);

    expect(container.querySelectorAll("a[href^='/requests/category/']")).toHaveLength(9);
    expect(screen.getAllByText("Quiet")).toHaveLength(9);
    expect(screen.queryByText("open")).not.toBeInTheDocument();
  });

  it("keeps the promise line", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    const { container } = render(<DoneeRequestsSection itemRequests={[]} />);
    expect(within(container).getByText(/first to know/i)).toBeInTheDocument();
  });
});
