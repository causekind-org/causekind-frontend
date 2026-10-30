import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const push = vi.fn();
const markRead = vi.fn();
const state = vi.hoisted(() => ({ notifications: [] as unknown[], unread: new Set<string>() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { email: "ngo@x.test", role: "NGO_PARTNER" } }) }));
vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: state.notifications,
    isUnread: (n: { id: string }) => state.unread.has(n.id),
    markRead,
  }),
}));

import { DriveNotificationDock, primaryLabel } from "./DriveNotificationDock";

const n = (id: string, title: string, link: string, timestamp = 1) => ({ id, title, body: `${title} body`, link, type: "info", timestamp, receivedAt: timestamp });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  state.notifications = [
    n("n-1", "3 new offers on \"School bags\"", "/dashboard/ngo?tab=activity&filter=offers&drive=8"),
    n("n-2", "Handover planned", "/dashboard/ngo?tab=activity&filter=handovers&drive=8"),
    n("n-3", "Your item matched", "/dashboard"),                // donor↔donee notice: never in this dock
    n("n-4", "Old read one", "/dashboard/ngo?tab=drives"),
  ];
  state.unread = new Set(["n-1", "n-2", "n-3"]);
});

describe("drive notification dock", () => {
  it("shows unread drive notices one at a time with one count; never donee/donor-match notices", () => {
    render(<DriveNotificationDock />);
    const dock = screen.getByTestId("drive-notification-dock");
    expect(dock).toHaveTextContent("3 new offers on \"School bags\"");
    expect(screen.getByLabelText("2 unread")).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: "Review offer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View details" })).toBeInTheDocument();
  });

  it("the primary action marks it read and deep-links", () => {
    render(<DriveNotificationDock />);
    fireEvent.click(screen.getByRole("button", { name: "Review offer" }));
    expect(markRead).toHaveBeenCalledWith("n-1");
    expect(push).toHaveBeenCalledWith("/dashboard/ngo?tab=activity&filter=offers&drive=8");
  });

  it("X hides it here but keeps it unread; the next one shows", () => {
    const { rerender } = render(<DriveNotificationDock />);
    fireEvent.click(screen.getByRole("button", { name: /Close/ }));
    expect(markRead).not.toHaveBeenCalled();
    rerender(<DriveNotificationDock />);
    expect(screen.getByTestId("drive-notification-dock")).toHaveTextContent("Handover planned");
    expect(screen.getByRole("button", { name: "View handover" })).toBeInTheDocument();
  });

  it("a grouped notice merged again (fresh timestamp) shows again after X", () => {
    const { rerender } = render(<DriveNotificationDock />);
    fireEvent.click(screen.getByRole("button", { name: /Close/ }));
    state.notifications = [n("n-1", "4 new offers on \"School bags\"", "/dashboard/ngo?tab=activity&filter=offers&drive=8", 2)];
    rerender(<DriveNotificationDock />);
    expect(screen.getByTestId("drive-notification-dock")).toHaveTextContent("4 new offers");
  });

  it("primary labels follow the agreed actions", () => {
    expect(primaryLabel({ title: "x", link: "/dashboard/ngo?tab=activity&filter=proof&drive=1" })).toBe("Upload proof");
    expect(primaryLabel({ title: "x", link: "/ngo/drives/1" })).toBe("View drive");
    expect(primaryLabel({ title: "x", link: "/ngo-drive-offers/5/handover" })).toBe("Arrange handover");
    expect(primaryLabel({ title: "x", link: "/drives/1/proof" })).toBe("View proof");
    expect(primaryLabel({ title: "A donor withdrew an offer", link: "/dashboard/ngo?tab=activity&filter=handovers&drive=1" })).toBe("View details");
    expect(primaryLabel({ title: "x", link: "/dashboard/history?type=drive" })).toBe("View details");
  });
});
