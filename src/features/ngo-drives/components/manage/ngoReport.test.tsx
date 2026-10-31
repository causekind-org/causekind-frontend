import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";

const api = vi.hoisted(() => ({ getNgoDriveReport: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "5" }), useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { email: "ngo@x.test", role: "NGO_PARTNER" }, isLoading: false }) }));

import ReportPage from "@/app/ngo/drives/[id]/report/page";
import { HistoryTab } from "./HistoryTab";

describe("NGO drive report", () => {
  it("shows the tiles, the proof and the received donors by name with a total line", async () => {
    api.getNgoDriveReport.mockResolvedValue({
      driveId: 5, title: "Laptops", status: "FULFILLED", quantityNeeded: 20, quantityReceived: 20, unit: "PIECES", itemName: "Laptops",
      beneficiaryCount: 50, beneficiaryGroup: "Students",
      proof: { id: 5, driveId: 5, uploadedAt: "", status: "FULFILLED", media: [], quantityDistributed: 20, beneficiariesReached: 48, ngoStatement: "Done", location: "Hall", distributedOn: "2026-10-12" },
      donors: [{ offerId: 3, donorName: "Prachi M", quantity: 5, offeredAt: "2026-10-10T10:00:00", receivedAt: "2026-10-12T10:00:00", handoverMethod: "PICKUP", handoverPhotos: ["https://x/h.jpg"] }],
      totalDonors: 1, totalReceived: 5,
    });
    render(<ReportPage />);
    await waitFor(() => expect(screen.getByTestId("report-donors")).toBeInTheDocument());
    expect(screen.getByTestId("report-tiles")).toHaveTextContent("20 of 20");
    expect(screen.getByTestId("drive-proof-card")).toHaveTextContent("Hall");
    const donor = screen.getByTestId("report-donor");
    expect(donor).toHaveTextContent("Prachi M");
    expect(donor).toHaveTextContent("5 pieces · NGO pickup");
    expect(donor).toHaveTextContent("Received 12 Oct 2026");
    expect(within(donor).getByRole("button", { name: /Handover photo 1 from Prachi M/ })).toBeInTheDocument();
    expect(screen.getByTestId("report-total")).toHaveTextContent("1 donor · 5 pieces received");
  });

  it("someone else's drive (403) shows not found", async () => {
    api.getNgoDriveReport.mockRejectedValue(Object.assign(new Error("Forbidden"), { status: 403 }));
    render(<ReportPage />);
    expect(await screen.findByText(/not found/i)).toBeInTheDocument();
  });
});

describe("History > Past offers", () => {
  it("no Past offers: only declined/ended offers under 'Declined offers' (no names, with reason); View proof opens the NGO report", () => {
    const d = { id: 5, title: "Laptops", unit: "PIECES", status: "FULFILLED", quantityReceived: 5, itemName: "Laptop" };
    render(<HistoryTab drives={[d as never]} offers={[
      { id: 1, status: "COMPLETED", quantity: 5, donorDisplayName: "Prachi M", drive: d } as never,
      { id: 2, status: "NGO_DECLINED", quantity: 2, donorDisplayName: "Ravi K", ngoDeclineReason: "Torn", drive: d } as never,
    ]} />);
    expect(screen.queryByText("Past offers")).toBeNull();
    expect(screen.getByText("Declined offers")).toBeInTheDocument();
    const rows = screen.getAllByTestId("history-offer");
    expect(rows).toHaveLength(1);                                  // the completed offer lives in the drive report
    expect(rows[0]).toHaveTextContent("2 Pieces · Laptops · Declined");
    expect(rows[0]).toHaveTextContent("Reason: Torn");
    expect(screen.queryByText(/Prachi M|Ravi K/)).toBeNull();
    expect(screen.getByRole("link", { name: "View proof" })).toHaveAttribute("href", "/ngo/drives/5/report");
    expect(screen.getByTestId("history-search")).toHaveAttribute("placeholder", "Search drives or reasons");
  });
});
