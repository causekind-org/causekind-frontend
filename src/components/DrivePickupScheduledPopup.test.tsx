import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DrivePickupScheduledPopup } from "./DrivePickupScheduledPopup";
import { getMyNotifications, markNotificationRead } from "@/lib/api";

const live: { fire?: () => void } = {};
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, email: "n@x.test", role: "NGO_PARTNER" } }) }));
vi.mock("@/hooks/useEntityUpdates", () => ({ useEntityUpdates: (_t: string[], cb: () => void) => { live.fire = cb; } }));
vi.mock("@/lib/api", () => ({ getMyNotifications: vi.fn(), markNotificationRead: vi.fn() }));

const note = { id: "n-1", type: "pickup_scheduled", title: "Donor scheduled a pickup", body: "5 Nov 2026, 10:00 AM IST, Andheri, Mumbai",
  link: "/ngo/drives/3/offers/7/handover?assign=1", createdAt: "", read: false };

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(markNotificationRead).mockResolvedValue({ read: true });
});

describe("Donor scheduled a pickup popup", () => {
  it("shows the time and area, links to Assign, and marks it seen on the server", async () => {
    vi.mocked(getMyNotifications).mockResolvedValue([note] as never);
    render(<DrivePickupScheduledPopup />);
    expect(await screen.findByTestId("pickup-scheduled-popup")).toHaveTextContent("5 Nov 2026, 10:00 AM IST, Andheri, Mumbai");
    expect(screen.getByRole("link", { name: "Assign a person" })).toHaveAttribute("href", note.link);
    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith("n-1"));
  });

  it("appears once per offer, even if the same notice comes back live", async () => {
    vi.mocked(getMyNotifications).mockResolvedValue([note] as never);
    render(<DrivePickupScheduledPopup />);
    await screen.findByTestId("pickup-scheduled-popup");
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    await waitFor(() => expect(screen.queryByTestId("pickup-scheduled-popup")).toBeNull());
    live.fire?.();
    await waitFor(() => expect(getMyNotifications).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("pickup-scheduled-popup")).toBeNull();
    expect(markNotificationRead).toHaveBeenCalledTimes(1);
  });

  it("shows live when the notice arrives, and nothing for read notices", async () => {
    vi.mocked(getMyNotifications).mockResolvedValue([{ ...note, read: true }, { ...note, id: "n-2", type: "info" }] as never);
    render(<DrivePickupScheduledPopup />);
    await waitFor(() => expect(getMyNotifications).toHaveBeenCalled());
    expect(screen.queryByTestId("pickup-scheduled-popup")).toBeNull();
    vi.mocked(getMyNotifications).mockResolvedValue([note] as never);
    live.fire?.();
    expect(await screen.findByTestId("pickup-scheduled-popup")).toBeInTheDocument();
  });
});
