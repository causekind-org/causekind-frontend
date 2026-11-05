import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PurchaseView } from "@/lib/api";

/** Support's decision panel for a purchase problem. The API is mocked; the server re-checks every number. */

vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const api = vi.hoisted(() => ({ adminResolvePurchaseIssue: vi.fn(() => Promise.resolve()), adminGetPurchase: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<object>()), ...api }));

import { PurchaseIssueResolver } from "./PurchaseIssueResolver";

const issue = {
  id: 7, type: "QUANTITY_MISMATCH", description: "Only 2 of 3 arrived. Third bag missing", affectedQuantity: 1,
  reportedByRole: "DONEE" as const, createdAt: "2026-11-04T10:00:00", response: null, respondedAt: null, resolution: null, resolvedAt: null,
};
const view = (p: Partial<PurchaseView> = {}): PurchaseView => ({
  offerId: 4, method: "DIRECT_DELIVERY", status: "ISSUE_RAISED", readyToBuy: false,
  acceptedAt: null, deadline: null, acceptedQuantity: 3, orderedAt: "2026-11-01T10:00:00", orderedQuantity: 3, receivedQuantity: 2,
  expectedDeliveryAt: null, trackingUrl: null, trackingReference: null, address: null, retailer: "Shop", orderReference: null,
  evidence: [], extensionRequestedUntil: null, extensionDecidedAt: null, issueWindowExpiresAt: null, version: 1,
  deliveryReportedAt: null, deliveryReminderSentAt: null, deliveryEscalatedAt: null, receivedCondition: "PARTIAL",
  receiptRecordedBySupport: false, issues: [issue], ...p,
});
const reason = "Retailer confirmed the third bag was cancelled";

describe("PurchaseIssueResolver", () => {
  beforeEach(() => vi.clearAllMocks());

  it("closes with the recipient's count and previews what is credited", async () => {
    const done = vi.fn();
    render(<PurchaseIssueResolver view={view()} onDone={done} />);
    await userEvent.click(screen.getByRole("radio", { name: /Close and count what arrived/ }));
    expect(screen.getByText(/go back to the request as still needed/)).toBeTruthy();
    await userEvent.type(screen.getByLabelText(/Reason/), reason);
    await userEvent.click(screen.getByRole("button", { name: "Close and count 2" }));
    await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4, { action: "CANCEL_REMAINDER", reason, finalQuantity: 2 }));
    expect(done).toHaveBeenCalled();
  });

  it("lets support correct the count, warns, and caps it at the order", async () => {
    render(<PurchaseIssueResolver view={view()} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /Close and count what arrived/ }));
    const qty = screen.getByLabelText(/Final count/);
    await userEvent.clear(qty);
    await userEvent.type(qty, "4");
    await userEvent.type(screen.getByLabelText(/Reason/), reason);
    expect(screen.queryByRole("button", { name: /Close and count/ })).toBeTruthy();
    expect((screen.getByRole("button", { name: /Close and/ }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.clear(qty);
    await userEvent.type(qty, "1");
    expect(screen.getByText(/changing the recipient's count from 2 to 1/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Close and count 1" }));
    await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4, { action: "CANCEL_REMAINDER", reason, finalQuantity: 1 }));
  });

  it("makes a zero count an explicit cancellation", async () => {
    render(<PurchaseIssueResolver view={view()} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /Close and count what arrived/ }));
    const qty = screen.getByLabelText(/Final count/);
    await userEvent.clear(qty);
    await userEvent.type(qty, "0");
    expect(screen.getByText(/donation is/).textContent).toMatch(/cancelled/);
    expect(screen.getByRole("button", { name: "Close and cancel the donation" })).toBeTruthy();
  });

  it("expects the rest with an optional new date", async () => {
    render(<PurchaseIssueResolver view={view()} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /The rest is coming/ }));
    await userEvent.type(screen.getByLabelText(/Reason/), reason);
    await userEvent.click(screen.getByRole("button", { name: "Expect the rest" }));
    await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4, { action: "RETRY_DELIVERY", reason }));
  });

  it("asks the chosen participant and shows answers that came back", async () => {
    render(<PurchaseIssueResolver view={view({ issues: [{ ...issue, infoRequest: "Send a photo of the label", infoAudience: "BOTH",
      infoRequestedAt: "2026-11-04T11:00:00", infoReplyDonee: "Label attached", infoReplyDonor: null }] })} onDone={() => {}} />);
    expect(screen.getByText(/Label attached/)).toBeTruthy();
    expect(screen.getByText(/Waiting for the donor to answer/)).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: /Ask for more information/ }));
    await userEvent.click(screen.getByLabelText("Donor"));
    await userEvent.type(screen.getByLabelText(/Your question/), "Please share the courier's delivery slip");
    await userEvent.click(screen.getByRole("button", { name: "Send question" }));
    await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4, {
      action: "REQUEST_INFO", reason: "Please share the courier's delivery slip", audience: "DONOR",
    }));
  });

  it("needs a reason before any decision", async () => {
    render(<PurchaseIssueResolver view={view()} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /The rest is coming/ }));
    expect((screen.getByRole("button", { name: "Expect the rest" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
