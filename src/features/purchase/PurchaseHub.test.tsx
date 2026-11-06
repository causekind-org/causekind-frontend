import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
// The video field needs next-intl and the network; the damage form works without it.
vi.mock("@/features/donation-offer-wizard/steps/OfferVideoField", () => ({ OfferVideoField: () => null }));
vi.mock("@/features/donation-offer-wizard/useOfferVideo", () => ({ useOfferVideo: () => ({ upload: vi.fn(), remove: vi.fn() }) }));
vi.mock("@/components/ChatWindow", () => ({
  default: ({ locked, quickActions }: { locked?: boolean; quickActions?: React.ReactNode }) =>
    <div data-testid="purchase-chat" data-locked={locked ? "true" : "false"}>{quickActions}</div>,
}));
const api = vi.hoisted(() => ({
  confirmPurchaseReceipt: vi.fn(() => Promise.resolve()),
  reportPurchaseIssue: vi.fn(() => Promise.resolve()),
  respondToPurchaseIssue: vi.fn(() => Promise.resolve()),
  replyToPurchaseInfoRequest: vi.fn(() => Promise.resolve()),
  reconfirmOfferAvailability: vi.fn(() => Promise.resolve()),
  uploadFlowBProof: vi.fn(() => Promise.resolve()),
  uploadPurchaseRecipientEvidence: vi.fn(() => Promise.resolve()),
  notifyPurchaseDelivered: vi.fn(() => Promise.resolve()),
  reportPurchaseNotReceived: vi.fn(() => Promise.resolve()),
  reportPurchaseLateArrival: vi.fn(() => Promise.resolve()),
  updatePurchaseDeliveryDate: vi.fn(() => Promise.resolve()),
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
    for (const label of ["I received everything", "Only part of it arrived", "Some or all items damaged", "Nothing arrived"])
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

  const tickChecklist = async () => {
    for (const l of [/neighbours/, /family members/, /courier tracking/]) await userEvent.click(screen.getByLabelText(l));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
  };

  it("asks for the checklist first, then offers the 48-hour 'not received yet'", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view()} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /Nothing arrived/ }));
    expect((screen.getByRole("button", { name: /Continue/ }) as HTMLButtonElement).disabled).toBe(true);
    await tickChecklist();
    // No delivery proof yet: only the soft state is offered, with when the final report opens.
    expect(screen.queryByRole("radio", { name: /Confirm nothing arrived/ })).toBeNull();
    expect(screen.getByText(/once the donor adds delivery proof/)).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: /Not received yet/ }));
    await userEvent.click(screen.getByRole("button", { name: /Tell the donor/ }));
    await waitFor(() => expect(api.reportPurchaseNotReceived).toHaveBeenCalledWith(4, {
      checkedNeighbours: true, checkedFamily: true, checkedTracking: true, mode: "NOT_YET", declaration: false,
    }));
    expect(api.uploadPurchaseRecipientEvidence).not.toHaveBeenCalled();
  });

  it("confirms nothing arrived with the declaration once there is delivery proof", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view({ nothingArrivedConfirmable: true, notReceivedYetAt: "2026-10-16T10:00:00" })} onChanged={() => {}} />);
    expect(screen.getByTestId("not-received-yet").textContent).toMatch(/Not received yet/);
    await userEvent.click(screen.getByRole("radio", { name: /Nothing arrived/ }));
    await tickChecklist();
    expect(screen.queryByRole("radio", { name: /Not received yet/ })).toBeNull(); // already marked
    await userEvent.click(screen.getByRole("radio", { name: /Confirm nothing arrived/ }));
    const go = screen.getByRole("button", { name: "Report nothing arrived" }) as HTMLButtonElement;
    expect(go.disabled).toBe(true);
    await userEvent.click(screen.getByLabelText(/I confirm I have not received/));
    await userEvent.click(go);
    await waitFor(() => expect(api.reportPurchaseNotReceived).toHaveBeenCalledWith(4, expect.objectContaining({ mode: "CONFIRM", declaration: true })));
  });

  it("offers 'no update from donor' when the server opens it", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view({ noUpdateOptionOpen: true })} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /Nothing arrived/ }));
    await tickChecklist();
    expect(screen.getByRole("radio", { name: /no update from donor/ })).toBeTruthy();
  });

  it("never asks how many arrived when everything did", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view()} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /I received everything/ }));
    expect(screen.queryByLabelText(/How many/)).toBeNull();
  });

  it("takes a partial count below the order, with no reason needed, and says the purchase closes", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view()} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /Only part of it arrived/ }));
    const count = screen.getByLabelText(/How many have arrived in total/);
    await userEvent.type(count, "3");
    await attach(photo());
    // 3 of 3 is not partial.
    expect((screen.getByRole("button", { name: "Confirm what arrived" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/I received everything/);
    await userEvent.clear(count);
    await userEvent.type(count, "1");
    expect(screen.getByText(/closes for you both, and our team follows up on the remaining 2/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Confirm what arrived" }));
    await waitFor(() => expect(api.confirmPurchaseReceipt).toHaveBeenCalledWith(4, {
      cumulativeQuantity: 1, condition: "PARTIAL", closeRemainder: true,
    }));
  });

  it("never lets a partial count exceed what the request still needs", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view({ orderedQuantity: 5, acceptedQuantity: 5, receivableMax: 2 })} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /Only part of it arrived/ }));
    await userEvent.type(screen.getByLabelText(/How many have arrived in total/), "3");
    await attach(photo());
    expect(screen.getByRole("alert").textContent).toMatch(/only needs 2 more/);
    expect((screen.getByRole("button", { name: "Confirm what arrived" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("gives the donor 'shows delivered' and delivery-date updates next to the proof upload", async () => {
    render(<PurchaseHub offer={offer} role="DONOR" view={view({ deliveryReportedAt: null, status: "ORDER_PLACED" })} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /It shows Delivered on my end/ }));
    await waitFor(() => expect(api.notifyPurchaseDelivered).toHaveBeenCalledWith(4));

    const panel = screen.getByText("Delivery date update").closest("div")!.parentElement!;
    await userEvent.click(within(panel).getByRole("button", { name: "Delivery is delayed" }));
    const message = within(panel).getByLabelText("Message to the recipient") as HTMLTextAreaElement;
    expect(message.value).toMatch(/running late.*Thu, 16 Oct|running late/);
    await userEvent.click(within(panel).getByRole("button", { name: "Send update" }));
    await waitFor(() => expect(api.updatePurchaseDeliveryDate).toHaveBeenCalledWith(4, expect.objectContaining({ kind: "DELAYED" })));
  });

  it("shows the chat, read-only once the purchase is closed", () => {
    const { unmount } = render(<PurchaseHub offer={offer} role="DONEE" view={view()} onChanged={() => {}} />);
    expect(screen.getByTestId("purchase-chat").dataset.locked).toBe("false");
    unmount();
    render(<PurchaseHub offer={{ ...offer, status: "COMPLETED" } as DonationOffer} role="DONEE" view={view({ completedAt: "2026-10-17T10:00:00" })} onChanged={() => {}} />);
    expect(screen.getByTestId("purchase-chat").dataset.locked).toBe("true");
  });

  it("closes a partial delivery for the donor with a hopeful note and nothing to do", () => {
    const issue = { id: 1, type: "QUANTITY_MISMATCH", description: "Only 3 of 5 arrived.", affectedQuantity: 2, reportedByRole: "DONEE" as const,
      createdAt: "2026-10-17T10:00:00", response: null, respondedAt: null, resolution: null, resolvedAt: null,
      status: "OPEN" as const, shortfallQuantity: 2, redeliveredQuantity: null };
    render(<PurchaseHub offer={{ ...offer, status: "COMPLETED" } as DonationOffer} role="DONOR"
      view={view({ orderedQuantity: 5, acceptedQuantity: 5, receivedQuantity: 3, deliveryOutcome: "PARTIAL", issues: [issue], completedAt: "2026-10-17T10:00:00" })}
      onChanged={() => {}} />);
    expect(screen.getByText("3/5 items received · Issue raised for 2 items")).toBeTruthy();
    expect(screen.getByText("Our team is looking into this. Thank you for your support!")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /It shows Delivered/ })).toBeNull();
  });

  const damagePhoto = () => new File(["x"], "crack.jpg", { type: "image/jpeg" });
  const pickDamagePhoto = (f: File) => userEvent.upload(screen.getByTestId("damage-photo-input") as HTMLInputElement, f);

  it("reports 2 good, 1 usable with minor damage and 2 unusable, photos first", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view({ orderedQuantity: 5, acceptedQuantity: 5 })} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /Some or all items damaged/ }));
    await userEvent.click(screen.getByRole("button", { name: "More: How many are damaged?" }));
    await userEvent.click(screen.getByRole("button", { name: "More: How many are damaged?" }));
    await userEvent.click(screen.getByRole("button", { name: "More: Of those, how many are unusable?" }));
    expect(screen.getByTestId("damage-summary").textContent).toMatch(/Pledged 5.*Arrived 5.*Good 2.*Usable with minor damage 1.*Unusable 2.*Missing 0/);
    expect(screen.getByTestId("damage-summary").textContent).toMatch(/3 will count as received \(1 with minor damage\)\. 2 go back on your request/);
    const report = screen.getByRole("button", { name: "Report damage" }) as HTMLButtonElement;
    await userEvent.type(screen.getByLabelText(/Describe the damage/), "Two screens cracked, one box dented");
    expect(report.disabled).toBe(true); // a photo is required
    const f = damagePhoto();
    await pickDamagePhoto(f);
    await userEvent.click(report);
    await waitFor(() => expect(api.confirmPurchaseReceipt).toHaveBeenCalledWith(4, {
      cumulativeQuantity: 0, condition: "DAMAGED", closeRemainder: true, note: "Two screens cracked, one box dented",
      arrivedQuantity: 5, minorDamageQuantity: 1, unusableQuantity: 2,
    }));
    expect(api.uploadPurchaseRecipientEvidence).toHaveBeenCalledWith(4, "DAMAGE_PHOTO", f);
    expect(api.uploadPurchaseRecipientEvidence.mock.invocationCallOrder[0]).toBeLessThan(api.confirmPurchaseReceipt.mock.invocationCallOrder[0]);
  });

  it("puts missing units in the same report and keeps damaged within what arrived", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view({ orderedQuantity: 5, acceptedQuantity: 5 })} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /Some or all items damaged/ }));
    await userEvent.click(screen.getByRole("button", { name: "Fewer: How many arrived?" }));
    expect(screen.getByTestId("damage-summary").textContent).toMatch(/Arrived 4.*Unusable 1.*Missing 1/);
    expect(screen.getByTestId("damage-summary").textContent).toMatch(/3 will count as received\. 2 go back/);
    // Arrived can't go above pledged, damaged can't go above arrived.
    expect((screen.getByRole("button", { name: "More: How many arrived?" }) as HTMLButtonElement).disabled).toBe(false);
    const damaged = screen.getByLabelText("How many are damaged?") as HTMLInputElement;
    await userEvent.clear(damaged); await userEvent.type(damaged, "9");
    expect(damaged.value).toBe("4");
  });

  it("refuses files that aren't photos and photos over 8 MB", async () => {
    render(<PurchaseHub offer={offer} role="DONEE" view={view()} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /Some or all items damaged/ }));
    const pdf = new File(["x"], "invoice.pdf", { type: "application/pdf" });
    const huge = new File([new Uint8Array(9 * 1024 * 1024)], "huge.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByTestId("damage-photo-input") as HTMLInputElement, [pdf, huge], { applyAccept: false });
    const problems = screen.getAllByRole("alert").map(a => a.textContent).join(" ");
    expect(problems).toMatch(/invoice\.pdf: use a JPG/);
    expect(problems).toMatch(/huge\.jpg: photos can be up to 8 MB/);
    expect(screen.getByText("0/10 added")).toBeTruthy();
  });

  it("shows the donor the damage photos after closure, with what they can use them for", () => {
    const issue = { id: 3, type: "ITEM_DAMAGED", description: "Pledged 5 · Arrived 5", affectedQuantity: 2, reportedByRole: "DONEE" as const,
      createdAt: "2026-10-17T10:00:00", response: null, respondedAt: null, resolution: null, resolvedAt: null, status: "OPEN" as const,
      shortfallQuantity: 2, arrivedQuantity: 5, minorDamageQuantity: 1, unusableQuantity: 2, missingQuantity: 0 };
    render(<PurchaseHub offer={{ ...offer, status: "COMPLETED" } as DonationOffer} role="DONOR" onChanged={() => {}}
      view={view({ orderedQuantity: 5, acceptedQuantity: 5, receivedQuantity: 3, deliveryOutcome: "DAMAGED", issues: [issue], completedAt: "2026-10-17T10:00:00",
        evidence: [{ id: 1, type: "DAMAGE_PHOTO", url: "https://signed/1", uploadedAt: "2026-10-17T09:00:00", screeningAvailable: null, prohibited: null, uploadedByRole: "DONEE" }] })} />);
    expect(screen.getByText("3/5 usable items received (1 received with minor damage) · 2 reported damaged")).toBeTruthy();
    expect(screen.getByText("Our team is looking into this. Thank you for your support!")).toBeTruthy();
    expect(screen.getByText(/raise a return or replacement with the seller/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Open Damage photo 1/ })).toBeTruthy();
  });

  it("lets the recipient add more photos while our team waits on them", async () => {
    const issue = { id: 3, type: "ITEM_DAMAGED", description: "Pledged 5", affectedQuantity: 2, reportedByRole: "DONEE" as const,
      createdAt: "2026-10-17T10:00:00", response: null, respondedAt: null, resolution: null, resolvedAt: null, status: "AWAITING_DONEE_INFO" as const,
      infoRequest: "Please add a close-up of each screen", infoAudience: "DONEE" as const, infoRequestedAt: "2026-10-18T10:00:00",
      arrivedQuantity: 5, minorDamageQuantity: 1, unusableQuantity: 2, missingQuantity: 0 };
    render(<PurchaseHub offer={{ ...offer, status: "COMPLETED" } as DonationOffer} role="DONEE" onChanged={() => {}}
      view={view({ receivedQuantity: 3, issues: [issue], completedAt: "2026-10-17T10:00:00", evidenceOpen: true })} />);
    expect(screen.getAllByText(/Please add a close-up of each screen/).length).toBeGreaterThan(0);
    const f = damagePhoto();
    await pickDamagePhoto(f);
    await userEvent.click(screen.getByRole("button", { name: "Send 1 photo" }));
    await waitFor(() => expect(api.uploadPurchaseRecipientEvidence).toHaveBeenCalledWith(4, "DAMAGE_PHOTO", f));
  });

  it("lets the recipient report a late arrival after closure, photos first when damaged", async () => {
    render(<PurchaseHub offer={{ ...offer, status: "COMPLETED" } as DonationOffer} role="DONEE" onChanged={() => {}}
      view={view({ receivedQuantity: 0, completedAt: "2026-10-17T10:00:00", lateArrivalOpen: true, evidenceOpen: true })} />);
    const form = screen.getByTestId("late-arrival-form");
    await userEvent.click(within(form).getByRole("button", { name: "Damaged" }));
    expect((within(form).getByRole("button", { name: /Tell our team/ }) as HTMLButtonElement).disabled).toBe(true);
    const f = new File(["x"], "box.jpg", { type: "image/jpeg" });
    await userEvent.upload(within(form).getByTestId("damage-photo-input") as HTMLInputElement, f);
    await userEvent.click(within(form).getByRole("button", { name: /Tell our team/ }));
    await waitFor(() => expect(api.reportPurchaseLateArrival).toHaveBeenCalledWith(4, { quantity: 1, condition: "DAMAGED" }));
    expect(api.uploadPurchaseRecipientEvidence).toHaveBeenCalledWith(4, "DAMAGE_PHOTO", f);
  });

  it("does not show reported problems panel to the donor on the purchase hub", () => {
    const issue = { id: 9, type: "ITEM_NOT_RECEIVED", description: "Nothing came", affectedQuantity: null, reportedByRole: "DONEE" as const,
      createdAt: "2026-10-16T12:00:00", response: null, respondedAt: null, resolution: null, resolvedAt: null };
    render(<PurchaseHub offer={{ ...offer, status: "ISSUE_RAISED" } as DonationOffer} role="DONOR" onChanged={() => {}}
      view={view({ status: "ISSUE_RAISED", deliveryReportedAt: null, issues: [issue] })} />);
    expect(screen.queryByText("Reported problems")).toBeNull();
    expect(screen.queryByLabelText(/Your side of the story/)).toBeNull();
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
    expect(screen.getByText("2/3 items received")).toBeTruthy();
    expect(screen.getByRole("link", { name: /View certificate/ }).getAttribute("href")).toBe("/certificate?offerId=4");
  });

  it("never shows the recipient a certificate link", () => {
    render(<PurchaseHub offer={{ ...offer, status: "COMPLETED" } as DonationOffer} role="DONEE" onChanged={() => {}}
      view={view({ status: "RECEIPT_CONFIRMED", deliveryReportedAt: null, receivedQuantity: 2 })} />);
    expect(screen.getByText("2/3 items received")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /View certificate/ })).toBeNull();
  });
});
