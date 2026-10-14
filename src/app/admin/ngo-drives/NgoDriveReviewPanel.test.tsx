import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const api = vi.hoisted(() => ({
  adminGetNgoDrives: vi.fn(),
  adminGetNgoDrive: vi.fn(),
  adminGetNgoDriveNgo: vi.fn(),
  adminApproveNgoDrive: vi.fn(),
  adminRequestNgoDriveChanges: vi.fn(),
  adminRejectNgoDrive: vi.fn(),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));

import { NgoDriveReviewPanel } from "./NgoDriveAdminPanels";

const drive = {
  id: 5, title: "Winter blankets for the shelter", status: "PENDING_REVIEW", category: "Household", itemName: "Blankets",
  quantityNeeded: 40, unit: "PIECES", itemCondition: "ANY_USABLE", urgency: "NORMAL", beneficiaryCount: 30,
  beneficiaryGroup: "Elderly", neededBy: "2030-01-01", availableDays: "MON,TUE", availableFrom: "10:00", availableTo: "17:00",
  contactName: "Rep", contactPhone: "9999999999", description: "Cold nights are here.", details: "Any size",
  ngoUser: { fullName: "Hope Trust" },
};

async function openDrive() {
  render(<NgoDriveReviewPanel />);
  fireEvent.click(await screen.findByRole("button", { name: /Winter blankets for the shelter/ }));
  await screen.findByRole("heading", { name: "Winter blankets for the shelter" });
}

beforeEach(() => {
  Object.values(api).forEach(fn => fn.mockReset());
  api.adminGetNgoDrives.mockResolvedValue([drive]);
  api.adminGetNgoDrive.mockResolvedValue(drive);
  api.adminGetNgoDriveNgo.mockResolvedValue({ ngoName: "Hope Trust" });
  api.adminApproveNgoDrive.mockResolvedValue({});
  api.adminRequestNgoDriveChanges.mockResolvedValue({});
  api.adminRejectNgoDrive.mockResolvedValue({});
});

describe("admin drive decision", () => {
  it("shows the condition rule and the renamed beneficiaries field", async () => {
    await openDrive();
    expect(screen.getByText("Any usable condition (minor repairs OK) · Accepts: Unused, Like New, Good, Fair, Needs Minor Repair")).toBeInTheDocument();
    expect(screen.getByText("People who will benefit")).toBeInTheDocument();
  });

  it("asks for a decision first: no box and no confirm button until one is picked", async () => {
    await openDrive();
    expect(screen.getAllByRole("radio").map(r => (r as HTMLInputElement).value)).toEqual(["approve", "changes", "reject"]);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Approve drive|Request changes|Reject drive/ })).not.toBeInTheDocument();
  });

  it("approve has no reason box, just a confirm button", async () => {
    await openDrive();
    fireEvent.click(screen.getByRole("radio", { name: "Approve" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Approve drive" });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(api.adminApproveNgoDrive).toHaveBeenCalledWith(5));
    expect(api.adminRejectNgoDrive).not.toHaveBeenCalled();
  });

  it("request changes shows only 'What needs to change *' and stays disabled until filled", async () => {
    await openDrive();
    fireEvent.click(screen.getByRole("radio", { name: "Request changes" }));
    const box = screen.getByRole("textbox", { name: /What needs to change/ });
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.queryByText(/Reason for rejection/)).not.toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Request changes" });
    expect(confirm).toBeDisabled();
    fireEvent.change(box, { target: { value: "   " } });
    expect(confirm).toBeDisabled();
    fireEvent.change(box, { target: { value: "Add the blanket sizes" } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(api.adminRequestNgoDriveChanges).toHaveBeenCalledWith(5, "Add the blanket sizes"));
  });

  it("reject shows only 'Reason for rejection *' and stays disabled until filled", async () => {
    await openDrive();
    fireEvent.click(screen.getByRole("radio", { name: "Reject" }));
    const box = screen.getByRole("textbox", { name: /Reason for rejection/ });
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.queryByText(/What needs to change/)).not.toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Reject drive" });
    expect(confirm).toBeDisabled();
    fireEvent.change(box, { target: { value: "Duplicate of an earlier drive" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(api.adminRejectNgoDrive).toHaveBeenCalledWith(5, "Duplicate of an earlier drive"));
  });

  it("switching decision clears the typed reason", async () => {
    await openDrive();
    fireEvent.click(screen.getByRole("radio", { name: "Reject" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Reason for rejection/ }), { target: { value: "No" } });
    fireEvent.click(screen.getByRole("radio", { name: "Request changes" }));
    expect(screen.getByRole("textbox", { name: /What needs to change/ })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Request changes" })).toBeDisabled();
  });
});
