import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PublicItemRequest } from "@/lib/api";

/**
 * The homepage grid is a sample of an uncapped list.
 *
 * `getPublicApproved` returns every PUBLIC_REQUEST and the section renders six,
 * while the eyebrow and the category pills count the whole array. Without a
 * line saying how many are left over, a visitor is told "23 verified needs
 * awaiting items", shown six, and given nothing that admits the difference.
 */

const authState = vi.hoisted(() => ({
  user: null as { email: string; role: string } | null,
  isLoading: false,
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => authState }));
vi.mock("@/hooks/useNeedProfileGate", () => ({
  useNeedProfileGate: () => ({ requestAccess: async () => true, checking: false }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/useDynamicTranslation", () => ({
  TranslatedText: ({ text }: { text: string }) => <>{text}</>,
}));

const { LiveNeedsSection } = await import("./LiveNeedsSection");

function needs(count: number, category = "Medical aid"): PublicItemRequest[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Need ${i + 1}`,
    description: "",
    category,
    quantity: 1,
    city: "Virar, MH",
    urgency: "NORMAL",
    emergency: false,
  })) as unknown as PublicItemRequest[];
}

beforeEach(() => { authState.user = null; authState.isLoading = false; });

describe("live needs overflow", () => {
  it("says how many are left over when the list is longer than the grid", () => {
    render(<LiveNeedsSection initialRequests={needs(23)} />);
    expect(screen.getByText("17 more open needs")).toBeInTheDocument();
    expect(screen.getByText("See them all").closest("a")).toHaveAttribute("href", "/requests");
  });

  it("renders no overflow line when the grid already shows everything", () => {
    render(<LiveNeedsSection initialRequests={needs(6)} />);
    expect(screen.queryByText(/more open need/)).toBeNull();
  });

  it("says 'need', not 'needs', when exactly one is left over", () => {
    render(<LiveNeedsSection initialRequests={needs(7)} />);
    expect(screen.getByText("1 more open need")).toBeInTheDocument();
  });

  /** The denominator has to follow the filter, or the line contradicts the pills. */
  it("counts within the selected category", async () => {
    render(
      <LiveNeedsSection initialRequests={[...needs(9, "Medical aid"), ...needs(4, "Education")]} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Medical aid/ }));
    expect(screen.getByText("3 more open needs")).toBeInTheDocument();
    expect(screen.getByText("in Medical aid")).toBeInTheDocument();
  });
});
