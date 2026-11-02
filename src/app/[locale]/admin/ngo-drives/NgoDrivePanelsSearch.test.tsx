import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NgoDriveReviewPanel, NgoDriveOffersPanel, NgoDriveProofsPanel } from "./NgoDriveAdminPanels";
import { adminGetNgoDrives, adminGetNgoDriveOffers, adminGetNgoDriveProofs } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => ({
  ApiError: (await orig<typeof import("@/lib/api")>()).ApiError,
  adminGetNgoDrives: vi.fn(), adminGetNgoDrive: vi.fn(), adminGetNgoDriveNgo: vi.fn(), adminApproveNgoDrive: vi.fn(),
  adminRequestNgoDriveChanges: vi.fn(), adminRejectNgoDrive: vi.fn(), adminGetNgoDriveProofs: vi.fn(),
  adminApproveNgoDriveProof: vi.fn(), adminRejectNgoDriveProof: vi.fn(), adminGetNgoDriveOffers: vi.fn(), adminGetNgoDriveOffer: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/admin/dashboard?tab=ngo-drives");
});

async function search(text: string) {
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: text } });
  await act(async () => { await new Promise(r => setTimeout(r, 350)); });
}

describe("NGO Drives tabs and search", { timeout: 15000 }, () => {
  it("shows the earlier dropdown options as tabs, filters client-side, and writes ?status=", async () => {
    vi.mocked(adminGetNgoDrives).mockResolvedValue([
      { id: 11, title: "Winter blankets", status: "PENDING_REVIEW", itemName: "Blanket", ngoUser: { fullName: "Hope Trust" } },
      { id: 12, title: "School bags", status: "PENDING_REVIEW", itemName: "Bag", ngoUser: { fullName: "Asha" } },
    ] as never);
    render(<NgoDriveReviewPanel />);
    await screen.findByText("Winter blankets");
    expect(screen.getAllByRole("tab").map(t => t.textContent)).toEqual(["Pending", "Changes requested", "Live", "Fully pledged",
      "Collection complete", "Proof submitted", "Fulfilled", "Closed", "Cancelled", "Rejected"]);
    await search("hope");
    expect(screen.queryByText("School bags")).toBeNull();
    expect(screen.getByText("Winter blankets")).toBeInTheDocument();
    await search("nothing");
    expect(screen.getByText("No results for \"nothing\"")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("tab")[2]);
    await waitFor(() => expect(adminGetNgoDrives).toHaveBeenLastCalledWith("LIVE"));
    expect(window.location.search).toContain("status=LIVE");
  });
});

describe("Drive offers tabs", { timeout: 15000 }, () => {
  it("keeps In handover as the default and the same labels", async () => {
    vi.mocked(adminGetNgoDriveOffers).mockResolvedValue([
      { id: 5, status: "IN_HANDOVER", driveId: 1, driveTitle: "Blankets", donorName: "Ravi", ngoName: "Hope" },
    ] as never);
    render(<NgoDriveOffersPanel />);
    await screen.findByText(/Ravi/);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map(t => t.textContent)).toEqual(["Waiting for the NGO", "Accepted by the NGO", "In handover", "Completed", "Rejected or declined", "Cancelled or withdrawn"]);
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    expect(adminGetNgoDriveOffers).toHaveBeenCalledWith("IN_HANDOVER");
    await search("zz");
    expect(screen.getByText("No results for \"zz\"")).toBeInTheDocument();
  });
});

describe("Distribution proof review", { timeout: 15000 }, () => {
  it("renders every proof field, photos that enlarge, and the donors", async () => {
    vi.mocked(adminGetNgoDriveProofs).mockResolvedValue([{
      id: 31, title: "Winter blankets", ngoUser: { fullName: "Hope Trust" }, unit: "PIECES", quantityNeeded: 50, quantityReceived: 40,
      beneficiariesReached: 35, beneficiaryGroup: "FAMILIES", beneficiaryCount: 40, proofQuantityDistributed: 38,
      proofDistributedOn: "2026-10-18", proofLocation: "Shanti Nagar hall", proofNote: "Handed out at noon", proofConsentConfirmed: true,
      distributionProofSubmittedAt: "2026-10-19T04:30:00Z", createdAt: "2026-09-01", collectionCompletedAt: "2026-10-10",
      previousRejectionReason: "Photos were blurry", distributionProofUrls: "https://s/1.jpg|https://s/2.jpg",
      donors: [{ offerId: 1, donorName: "Ravi", quantity: 10, offeredAt: null, receivedAt: "2026-10-05", handoverMethod: null, handoverPhotos: [] }],
    }] as never);
    render(<NgoDriveProofsPanel />);
    const fields = await screen.findByTestId("proof-fields");
    for (const text of ["Winter blankets", "Hope Trust", "Sep", "50 / 40 pieces", "35 families", "38 pieces", "18 Oct 2026",
      "Shanti Nagar hall", "Handed out at noon", "Yes", "19 Oct 2026", "IST"]) {
      expect(fields.textContent).toContain(text);
    }
    expect(screen.getByText(/Photos were blurry/)).toBeInTheDocument();
    expect(within(screen.getByTestId("proof-donors")).getByText("Ravi")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enlarge proof photo 2" }));
    expect(screen.getByRole("dialog", { name: "Proof photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    await search("asha");
    expect(screen.getByText("No results for \"asha\"")).toBeInTheDocument();
  });
});
