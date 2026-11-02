import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DriveProofPublishedPopup } from "./DriveProofPublishedPopup";
import { getMyNgoDriveOffers, getMyNotifications, markNotificationRead } from "@/lib/api";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, email: "d@x.test", role: "DONOR" } }) }));
vi.mock("@/hooks/useEntityUpdates", () => ({ useEntityUpdates: () => {} }));
vi.mock("@/lib/api", () => ({ getMyNotifications: vi.fn(), getMyNgoDriveOffers: vi.fn(), markNotificationRead: vi.fn() }));

const note = (id: number, over = {}) => ({ id: `n-${id}`, type: "proof_published", title: "Your donation was distributed", body: "b", link: `/dashboard?tab=history&offer=${id}`, createdAt: "", read: false, ...over });
const offer = (id: number) => ({ id, driveTitle: `Drive ${id}`, ngoName: "Hope Trust", driveBeneficiariesReached: 50, proofPhotoUrls: [`https://s.test/${id}.jpg`] });

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(markNotificationRead).mockResolvedValue({ read: true });
  vi.mocked(getMyNgoDriveOffers).mockResolvedValue([offer(7), offer(8), offer(9), offer(10), offer(11)] as never);
});

describe("Your donation was distributed popup", () => {
  it("shows the details, links to the entry, and marks it seen on the server", async () => {
    vi.mocked(getMyNotifications).mockResolvedValue([note(7)] as never);
    render(<DriveProofPublishedPopup />);
    const popup = await screen.findByTestId("drive-proof-popup");
    expect(popup).toHaveTextContent("Your donation was distributed");
    expect(popup).toHaveTextContent("Drive 7");
    expect(popup).toHaveTextContent("Hope Trust");
    expect(popup).toHaveTextContent("50 people reached");
    expect(popup.querySelector("img")).toHaveAttribute("src", "https://s.test/7.jpg");
    expect(screen.getByRole("link", { name: "See the proof" })).toHaveAttribute("href", "/dashboard?tab=history&offer=7");
    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith("n-7"));
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    await waitFor(() => expect(screen.queryByTestId("drive-proof-popup")).toBeNull());
  });

  it("several together: one popup, 3 rows and 'and N more'; all are marked seen", async () => {
    vi.mocked(getMyNotifications).mockResolvedValue([7, 8, 9, 10, 11].map((i) => note(i)) as never);
    render(<DriveProofPublishedPopup />);
    expect(await screen.findAllByTestId("drive-proof-popup-row")).toHaveLength(3);
    expect(screen.getByText("and 2 more")).toBeInTheDocument();
    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledTimes(5));
  });

  it("nothing for read notices or other types", async () => {
    vi.mocked(getMyNotifications).mockResolvedValue([note(7, { read: true }), note(8, { type: "info" })] as never);
    render(<DriveProofPublishedPopup />);
    await waitFor(() => expect(getMyNotifications).toHaveBeenCalled());
    expect(screen.queryByTestId("drive-proof-popup")).toBeNull();
    expect(markNotificationRead).not.toHaveBeenCalled();
  });
});
