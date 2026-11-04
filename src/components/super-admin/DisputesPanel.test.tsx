import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PostDeliveryIssue } from "@/lib/api";

/** Purchase delivery problems resolve with purchase outcomes, never a bare note. */

vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const api = vi.hoisted(() => ({
  superAdminListDisputes: vi.fn(),
  superAdminResolveDispute: vi.fn(() => Promise.resolve()),
  adminResolvePurchaseIssue: vi.fn(() => Promise.resolve()),
  adminGetPurchase: vi.fn(),
}));
vi.mock("@/lib/api", () => api);

import { DisputesPanel } from "./DisputesPanel";

const purchaseView = {
  offerId: 4, method: "DIRECT_DELIVERY", status: "ISSUE_RAISED", readyToBuy: false, acceptedAt: null, deadline: null,
  acceptedQuantity: 3, orderedAt: "2026-10-11T10:00:00", orderedQuantity: 3, receivedQuantity: 0, expectedDeliveryAt: null,
  trackingUrl: null, trackingReference: null, address: null, retailer: "Shop", orderReference: null, evidence: [],
  extensionRequestedUntil: null, extensionDecidedAt: null, issueWindowExpiresAt: null, version: 1, deliveryReportedAt: null,
  deliveryReminderSentAt: null, deliveryEscalatedAt: null, receivedCondition: null, receiptRecordedBySupport: false,
  issues: [{ id: 7, type: "ITEM_NOT_RECEIVED", description: "Nothing arrived", affectedQuantity: 3, reportedByRole: "DONEE",
    createdAt: "2026-10-16T10:00:00", response: null, respondedAt: null, resolution: null, resolvedAt: null }],
};

const dispute = (p: Partial<PostDeliveryIssue>): PostDeliveryIssue => ({
  id: 7, offerId: 4, itemTitle: "School bags", donorName: "Ravi", doneeName: "Asha", reportedByName: "Asha",
  reportedByIsDonor: false, issueType: "ITEM_NOT_RECEIVED", description: "Nothing arrived", windowCategory: "GENERAL",
  windowExpiresAt: null, evidenceUrls: [], adminResolution: null, resolvedAt: null, createdAt: "2026-10-16T10:00:00",
  purchase: false, affectedQuantity: null, counterpartyResponse: null, ...p,
});

describe("DisputesPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("decides a purchase problem through the purchase lifecycle", async () => {
    api.superAdminListDisputes.mockResolvedValue([dispute({ purchase: true, affectedQuantity: 3, counterpartyResponse: "Courier photo shows the gate" })]);
    api.adminGetPurchase.mockResolvedValue(purchaseView);
    render(<DisputesPanel isDark={false} />);
    await screen.findByText(/Courier photo shows the gate/);
    expect(screen.queryByRole("button", { name: "Resolve" })).toBeNull();
    await userEvent.click(await screen.findByRole("radio", { name: /The rest is coming/ }));
    await userEvent.type(screen.getByLabelText(/Reason/), "Donor will reship via a new courier");
    await userEvent.click(screen.getByRole("button", { name: "Expect the rest" }));
    await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4, {
      action: "RETRY_DELIVERY", reason: "Donor will reship via a new courier",
    }));
    expect(api.superAdminResolveDispute).not.toHaveBeenCalled();
  });

  it("keeps the plain resolve note for handover disputes", async () => {
    api.superAdminListDisputes.mockResolvedValue([dispute({ purchase: false })]);
    render(<DisputesPanel isDark={false} />);
    expect(await screen.findByRole("button", { name: "Resolve" })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: /The rest is coming/ })).toBeNull();
  });
});
