import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NotifItem, proofOfferId } from "./NotificationBell";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useNotifications", () => ({ useNotifications: () => ({ unread: 0, notifications: [], markAllRead: vi.fn() }) }));
vi.mock("@/hooks/useTilt", () => ({ useTilt: () => ({}) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({}), usePathname: () => "/" }));

describe("bell: Your donation was distributed", () => {
  const n = { id: "n-1", type: "proof_published" as const, title: "Your donation was distributed",
    body: "Hope Trust distributed the items from \"Winter blankets\": you gave twice, 80 people reached.",
    link: "/dashboard?tab=history&offer=20", receivedAt: Date.now(), timestamp: Date.now() };

  it("the card opens History at the offer, with See the proof and Certificate under the text", () => {
    render(<NotifItem n={n} />);
    const card = screen.getByTestId("notification-proof-published");
    expect(card).toHaveTextContent("you gave twice, 80 people reached");
    expect(screen.getByTestId("notification-proof-main")).toHaveAttribute("href", "/dashboard?tab=history&offer=20");
    expect(within(card).getByRole("link", { name: /See the proof/ })).toHaveAttribute("href", "/dashboard?tab=history&offer=20");
    expect(within(card).getByRole("link", { name: "Certificate" })).toHaveAttribute("href", "/certificate?offerId=20&type=ngo_drive");
  });

  it("reads the offer id from the link", () => {
    expect(proofOfferId("/dashboard?tab=history&offer=7")).toBe(7);
    expect(proofOfferId(null)).toBeNull();
  });
});
