import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DonationOffer, PurchaseView } from "@/lib/api";

/**
 * The post-order part of the purchase hub: the donor's delivery proof, the
 * recipient's four answers, and problem responses. The API is mocked; the
 * server re-checks every action, so this only covers what is shown and sent.
 */

vi.mock("@/features/handover/HandoverMapPinField", () => ({ HandoverMapPinField: () => <div /> }));
vi.mock("@/app/[locale]/actions/locations", () => ({ detectLocationFromServer: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const api = vi.hoisted(() => ({
  confirmPurchaseReceipt: vi.fn(() => Promise.resolve()),
  reportPurchaseIssue: vi.fn(() => Promise.resolve()),
  respondToPurchaseIssue: vi.fn(() => Promise.resolve()),
  replyToPurchaseInfoRequest: vi.fn(() => Promise.resolve()),
  reconfirmOfferAvailability: vi.fn(() => Promise.resolve()),
  uploadFlowBProof: vi.fn(() => Promise.resolve()),
  uploadPurchaseRecipientEvidence: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<object>()), ...api }));

import { PurchaseHub } from "./PurchaseHub";

const photo = () => new File(["x"], "parcel.jpg", { type: "image/jpeg" });
const attach = (f: File) => userEvent.upload(document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement, f);

const offer = { id: 4, status: "ADMIN_APPROVED", requestTitle: "School bags", purchaseCommitment: null } as unknown as DonationOffer;
const view = (p: Partial<PurchaseView> = {}): PurchaseView => ({
  offerId: 4, method: "DIRECT_DELIVERY", status: "AWAITING_RECEIPT", readyToBuy: false,
  acceptedAt: "2026-10-10T10:00:00", deadline: "2026-10-20T10:00:00", acceptedQuantity: 3,
  orderedAt: "2026-10-11T10:00:00", orderedQuantity: 3, receivedQuantity: null,
  expectedDeliveryAt: "2026-10-15T18:00:00", trackingUrl: "https://courier.example/t/1", trackingReference: "AWB1",
  address: null, retailer: "Shop", orderReference: null, evidence: [],
  extensionRequestedUntil: null, extensionDecidedAt: null, issueWindowExpiresAt: null, version: 1,
  deliveryReportedAt: "2026-10-16T10:00:00", deliveryReminderSentAt: null, deliveryEscalatedAt: null,
  receivedCondition: null, receiptRecordedBySupport: false, issues: [], ...p,
});

describe("PurchaseHub after the order", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets the donor confirm they'll buy it right in the hub after the recipient accepts", async () => {
    render(<PurchaseHub offer={{ ...offer, status: "DONOR_RECONFIRMATION_REQUIRED" } as DonationOffer} role="DONOR" onChanged={() => {}}
      view={view({ status: "INTENT_DECLARED", orderedAt: null, orderedQuantity: null, deliveryReportedAt: null,
        address: { address: "12 Station Road", contactName: "Asha", contactPhone: "9999999999", latitude: null, longitude: null, consentVersion: "purchase-delivery-v1", consentedAt: "x" } })} />);
    expect(screen.getByText("Your turn: confirm you'll buy it")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Yes, I'll buy it/ }));
    await waitFor(() => expect(api.reconfirmOfferAvailability).toHaveBeenCalledWith(4));
  });

  it("never asks the recipient to reconfirm", () => {
    render(<PurchaseHub offer={{ ...offer, status: "DONOR_RECONFIRMATION_REQUIRED" } as DonationOffer} role="DONEE" onChanged={() => {}}
      view={view({ status: "INTENT_DECLARED", orderedAt: null, orderedQuantity: null, deliveryReportedAt: null })} />);
    expect(screen.queryByRole("button", { name: /Yes, I'll buy it/ })).toBeNull();
  });

  it("gives the donor a delivery proof upload as soon as the order is on its way", () => {
    render(<PurchaseHub offer={offer} role="DONOR" onChanged={() => {}}
      view={view({ status: "SHIPPED", deliveryReportedAt: null })} />);
    expect(screen.getByRole("heading", { name: /Upload delivery proof/ })).toBeTruthy();
  });

  it("acknowledges the donor's delivery proof without implying completion", () => {
    render(<PurchaseHub offer={offer} role="DONOR" onChanged={() => {}}
      view={view({ evidence: [{ id: 1, type: "DELIVERY_PROOF", url: "u", uploadedAt: "2026-10-16T10:00:00", screeningAvailable: null, prohibited: null, uploadedByRole: "DONOR" }] })} />);
    expect(screen.getAllByText("Delivery proof submitted — awaiting recipient confirmation.").length).toBeGreaterThan(0);
    expect(screen.queryByText(/View certificate/)).toBeNull();
  });

  it("offers the recipient four outcomes and sends a full receipt", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view()} onChanged={() => {}} />);
    for (const label of ["I received everything", "Only part of it arrived", "Damaged or wrong items", "I didn't receive it"])
      expect(screen.getByRole("radio", { name: new RegExp(label) })).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: /I received everything/ }));
    // No photo yet: confirming is blocked.
    expect((screen.getByRole("button", { name: "Confirm receipt" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/photo/i);
    const f = photo();
    await attach(f);
    await userEvent.click(screen.getByRole("button", { name: "Confirm receipt" }));
    await waitFor(() => expect(api.confirmPurchaseReceipt).toHaveBeenCalledWith(4, { cumulativeQuantity: 3, condition: "GOOD", closeRemainder: false }));
    // The photo goes up first, so the server sees it when the receipt arrives.
    expect(api.uploadPurchaseRecipientEvidence).toHaveBeenCalledWith(4, "RECEIVED_PHOTO", f);
    expect(api.uploadPurchaseRecipientEvidence.mock.invocationCallOrder[0]).toBeLessThan(api.confirmPurchaseReceipt.mock.invocationCallOrder[0]);
  });

  it("does not confirm when the photo upload fails", async () => {
    api.uploadPurchaseRecipientEvidence.mockImplementationOnce(() => Promise.reject(new Error("Upload failed")));
    render(<PurchaseHub offer={offer} role="DONEE" view={view()} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /I received everything/ }));
    await attach(photo());
    await userEvent.click(screen.getByRole("button", { name: "Confirm receipt" }));
    await waitFor(() => expect(api.uploadPurchaseRecipientEvidence).toHaveBeenCalled());
    expect(api.confirmPurchaseReceipt).not.toHaveBeenCalled();
  });

  it("reports non-receipt without requiring evidence", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view()} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /I didn't receive it/ }));
    await userEvent.click(screen.getByRole("button", { name: "Report not received" }));
    await waitFor(() => expect(api.reportPurchaseIssue).toHaveBeenCalledWith(4, {
      type: "ITEM_NOT_RECEIVED", description: "Tracking says delivered, but nothing arrived", affectedQuantity: 3,
    }));
    expect(api.uploadPurchaseRecipientEvidence).not.toHaveBeenCalled();
  });

  it("never asks how many arrived when everything did", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view()} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /I received everything/ }));
    expect(screen.queryByLabelText(/How many/)).toBeNull();
  });

  it("caps a partial delivery below the order and always raises it for review", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view()} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /Only part of it arrived/ }));
    expect(screen.queryByText(/What about the rest/)).toBeNull();
    const count = screen.getByLabelText(/How many have arrived in total/);
    await userEvent.type(count, "3");
    await userEvent.type(screen.getByLabelText(/What happened\?/), "Parcel had one bag instead of three");
    await attach(photo());
    // 3 of 3 is not partial.
    expect((screen.getByRole("button", { name: "Raise issue" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/1 to 2/);
    await userEvent.clear(count);
    await userEvent.type(count, "1");
    await userEvent.click(screen.getByRole("button", { name: "Raise issue" }));
    await waitFor(() => expect(api.confirmPurchaseReceipt).toHaveBeenCalledWith(4, {
      cumulativeQuantity: 1, condition: "PARTIAL", closeRemainder: true, note: "Parcel had one bag instead of three",
    }));
  });

  it("credits nothing when every item that arrived is damaged", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view()} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /Damaged or wrong items/ }));
    await userEvent.type(screen.getByLabelText(/What's damaged/), "Zips torn on all three");
    // A photo of the damage is required.
    expect((screen.getByRole("button", { name: "Raise issue" }) as HTMLButtonElement).disabled).toBe(true);
    const f = photo();
    await attach(f);
    await userEvent.click(screen.getByRole("button", { name: "Raise issue" }));
    await waitFor(() => expect(api.confirmPurchaseReceipt).toHaveBeenCalledWith(4, {
      cumulativeQuantity: 0, condition: "DAMAGED", closeRemainder: false, affectedQuantity: 3,
      note: "3 of 3 arrived; 3 damaged, 0 usable. Zips torn on all three",
    }));
    // Problem photos attach to the issue, after it opens.
    expect(api.uploadPurchaseRecipientEvidence).toHaveBeenCalledWith(4, "ISSUE_EVIDENCE", f);
  });

  it("credits the usable items when only some are damaged and some never came", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view()} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /Damaged or wrong items/ }));
    const arrived = screen.getByLabelText(/How many items arrived in total/);
    await userEvent.clear(arrived);
    await userEvent.type(arrived, "2");
    await userEvent.click(screen.getByRole("radio", { name: /Only some/ }));
    await userEvent.type(screen.getByLabelText(/How many are damaged/), "1");
    await userEvent.type(screen.getByLabelText(/What's damaged/), "One bag has a torn strap");
    await attach(photo());
    await userEvent.click(screen.getByRole("button", { name: "Raise issue" }));
    await waitFor(() => expect(api.confirmPurchaseReceipt).toHaveBeenCalledWith(4, {
      cumulativeQuantity: 1, condition: "DAMAGED", closeRemainder: false, affectedQuantity: 1,
      note: "2 of 3 arrived; 1 damaged, 1 usable; 1 didn't arrive. One bag has a torn strap",
    }));
  });

  it("lets the donor answer the recipient's open problem once", async () => {
    const issue = { id: 9, type: "ITEM_NOT_RECEIVED", description: "Nothing came", affectedQuantity: null, reportedByRole: "DONEE" as const,
      createdAt: "2026-10-16T12:00:00", response: null, respondedAt: null, resolution: null, resolvedAt: null };
    render(<PurchaseHub offer={{ ...offer, status: "ISSUE_RAISED" } as DonationOffer} role="DONOR" onChanged={() => {}}
      view={view({ status: "ISSUE_RAISED", deliveryReportedAt: null, issues: [issue] })} />);
    await userEvent.type(screen.getByLabelText(/Your side of the story/), "Courier photo shows it at the gate");
    await userEvent.click(screen.getByRole("button", { name: "Send response" }));
    await waitFor(() => expect(api.respondToPurchaseIssue).toHaveBeenCalledWith(4, "Courier photo shows it at the gate"));
  });

  it("lets the recipient answer our team's question once", async () => {
    const issue = { id: 9, type: "QUANTITY_MISMATCH", description: "Only 2 of 3 arrived", affectedQuantity: 1, reportedByRole: "DONEE" as const,
      createdAt: "2026-10-16T12:00:00", response: null, respondedAt: null, resolution: null, resolvedAt: null,
      infoRequest: "Please photograph the parcel label", infoAudience: "DONEE" as const, infoRequestedAt: "2026-10-17T09:00:00",
      infoReplyDonor: null, infoReplyDonee: null, infoRepliedAt: null };
    render(<PurchaseHub offer={{ ...offer, status: "ISSUE_RAISED" } as DonationOffer} role="DONEE" onChanged={() => {}}
      view={view({ status: "ISSUE_RAISED", deliveryReportedAt: null, issues: [issue] })} />);
    expect(screen.getByText(/Please photograph the parcel label/)).toBeTruthy();
    await userEvent.type(screen.getByLabelText(/Your answer/), "Label photo added below");
    await userEvent.click(screen.getByRole("button", { name: "Send answer" }));
    await waitFor(() => expect(api.replyToPurchaseInfoRequest).toHaveBeenCalledWith(4, "Label photo added below"));
  });

  it("shows the certificate to the donor once the donation is complete", () => {
    render(<PurchaseHub offer={{ ...offer, status: "COMPLETED" } as DonationOffer} role="DONOR" onChanged={() => {}}
      view={view({ status: "RECEIPT_CONFIRMED", deliveryReportedAt: null, receivedQuantity: 2 })} />);
    expect(screen.getByText(/2 of 3 received/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /View certificate/ }).getAttribute("href")).toBe("/certificate?offerId=4");
  });

  it("never shows the recipient a certificate link", () => {
    render(<PurchaseHub offer={{ ...offer, status: "COMPLETED" } as DonationOffer} role="DONEE" onChanged={() => {}}
      view={view({ status: "RECEIPT_CONFIRMED", deliveryReportedAt: null, receivedQuantity: 2 })} />);
    expect(screen.getByText(/2 of 3 received/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /View certificate/ })).toBeNull();
  });
});
