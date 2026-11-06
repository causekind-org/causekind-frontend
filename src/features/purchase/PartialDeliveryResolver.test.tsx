import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AdminPurchaseCase } from "@/lib/api";

vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const api = vi.hoisted(() => ({
  adminResolvePurchaseIssue: vi.fn((): Promise<unknown> => Promise.resolve({ applied: 2, capped: false, message: null })),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<object>()), ...api }));

import { PartialDeliveryResolver } from "./PartialDeliveryResolver";

/** The spec's example: 20 requested, 15 from others, donor X pledged 5, 3 arrived. */
const purchase = (p: Partial<AdminPurchaseCase> = {}): AdminPurchaseCase => ({
  offerId: 4, requestId: 3, requestTitle: "I need 20 laptops", issueStatus: "OPEN", deliveryOutcome: "PARTIAL", partialDelivery: true,
  requested: 20, pledged: 5, received: 3, shortfall: 2, redelivered: 0, stillNeededOnRequest: 2, openOnRequest: 2, redeliveryCap: 2,
  expectedDeliveryAt: null, donor: null, donee: null, links: [], deliveryUpdates: [], chat: [], steps: [], ...p,
});
const note = "Called the donor on 6 Nov about the missing laptops";

describe("PartialDeliveryResolver", () => {
  beforeEach(() => vi.clearAllMocks());

  it("links the donor to the request when they will donate again", async () => {
    render(<PartialDeliveryResolver purchase={purchase()} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /Donor will donate again/ }));
    const go = screen.getByRole("button", { name: "Link donor to the request" }) as HTMLButtonElement;
    expect(go.disabled).toBe(true); // a note is required
    await userEvent.type(screen.getByLabelText(/Admin note/), note);
    await userEvent.click(go);
    await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4, { action: "DONOR_REDONATE", reason: note }));
  });

  it("counts remaining items that arrived", async () => {
    render(<PartialDeliveryResolver purchase={purchase()} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /remaining items delivered/ }));
    await userEvent.type(screen.getByLabelText(/How many more items arrived/), "2");
    expect(screen.getByText(/5\/5 received/)).toBeTruthy();
    await userEvent.type(screen.getByLabelText(/Admin note/), note);
    await userEvent.click(screen.getByRole("button", { name: /Count 2 more and resolve/ }));
    await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4, { action: "REDELIVERED", reason: note, additionalQuantity: 2 }));
  });

  it("warns and caps when another donor filled part of the gap meanwhile", async () => {
    render(<PartialDeliveryResolver purchase={purchase({ stillNeededOnRequest: 1, openOnRequest: 1, redeliveryCap: 1 })} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /remaining items delivered/ }));
    await userEvent.type(screen.getByLabelText(/How many more items arrived/), "2");
    expect(screen.getByRole("alert").textContent).toMatch(/Other donors have filled part of the gap.*1 of the 2 will be counted/);
    expect(screen.getByText(/4\/5 received/)).toBeTruthy();
  });

  it("refuses more than is outstanding, and anything once the gap is filled", async () => {
    const { unmount } = render(<PartialDeliveryResolver purchase={purchase()} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /remaining items delivered/ }));
    await userEvent.type(screen.getByLabelText(/How many more items arrived/), "3");
    await userEvent.type(screen.getByLabelText(/Admin note/), note);
    expect(screen.getByText(/1 to 2/)).toBeTruthy();
    unmount();
    render(<PartialDeliveryResolver purchase={purchase({ redeliveryCap: 0, openOnRequest: 0, stillNeededOnRequest: 0 })} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /remaining items delivered/ }));
    expect(screen.getByText(/nothing more can be counted/)).toBeTruthy();
  });

  it("closes as unreachable only after the received count is confirmed", async () => {
    render(<PartialDeliveryResolver purchase={purchase()} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: /donor unreachable/ }));
    expect(screen.getByText(/We tried to reach the donor.*remaining 2 items are still open for other donors/)).toBeTruthy();
    await userEvent.type(screen.getByLabelText(/Admin note/), note);
    const go = screen.getByRole("button", { name: "Close the issue" }) as HTMLButtonElement;
    await userEvent.type(screen.getByLabelText(/Confirm the final quantity/), "4");
    expect(go.disabled).toBe(true);
    await userEvent.clear(screen.getByLabelText(/Confirm the final quantity/));
    await userEvent.type(screen.getByLabelText(/Confirm the final quantity/), "3");
    await userEvent.click(go);
    await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4, { action: "CLOSE_UNREACHABLE", reason: note, finalQuantity: 3 }));
  });

  it("offers a manual close while the donor is re-donating", async () => {
    render(<PartialDeliveryResolver purchase={purchase({ issueStatus: "DONOR_REDONATING" })} onDone={() => {}} />);
    expect(screen.queryByRole("radio", { name: /Donor will donate again/ })).toBeNull();
    await userEvent.click(screen.getByRole("radio", { name: /Close without waiting/ }));
    await userEvent.type(screen.getByLabelText(/Admin note/), note);
    await userEvent.click(screen.getByRole("button", { name: "Close the issue" }));
    await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4, { action: "CLOSE_REDONATION", reason: note }));
  });

  describe("damage reports", () => {
    const damage = (p: Partial<NonNullable<AdminPurchaseCase["damage"]>> = {}) => ({
      arrived: 5, good: 2, minorDamage: 1, unusable: 2, missing: 0, reclassified: 0, verifiedAt: null, verifiedBy: null,
      returnPickupStatus: null, returnPickupNote: null, infoRequest: null, infoReply: null, gallery: [], ...p,
    });

    it("asks for a review before any resolution", async () => {
      render(<PartialDeliveryResolver purchase={purchase({ damage: damage() })} onDone={() => {}} />);
      expect(screen.getByText(/Step 1 · Review the damage proof/)).toBeTruthy();
      expect(screen.queryByRole("radio", { name: /replacement delivered/ })).toBeNull();
      await userEvent.click(screen.getByRole("radio", { name: /Need more info/ }));
      await userEvent.type(screen.getByLabelText(/Your question/), "Please add a close-up of each screen");
      await userEvent.click(screen.getByRole("button", { name: "Send question" }));
      await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4,
        { action: "REQUEST_INFO", reason: "Please add a close-up of each screen", audience: "DONEE" }));
    });

    it("reclassifies, warning and capping when another donor filled the gap", async () => {
      render(<PartialDeliveryResolver purchase={purchase({ damage: damage(), openOnRequest: 1 })} onDone={() => {}} />);
      await userEvent.click(screen.getByRole("radio", { name: /Reclassify/ }));
      await userEvent.type(screen.getByLabelText(/actually usable/), "2");
      expect(screen.getByRole("alert").textContent).toMatch(/needs only 1 more, so 1 of the 2 will be counted/);
      await userEvent.type(screen.getByLabelText(/Admin note/), note);
      await userEvent.click(screen.getByRole("button", { name: "Count 1 as usable" }));
      await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4, { action: "RECLASSIFY", reason: note, additionalQuantity: 2 }));
    });

    it("records a replacement capped at what's still needed, with a scheduled return pickup", async () => {
      render(<PartialDeliveryResolver purchase={purchase({ damage: damage({ verifiedAt: "2026-11-06T10:00:00" }), redeliveryCap: 1, openOnRequest: 1 })} onDone={() => {}} />);
      await userEvent.click(screen.getByRole("radio", { name: /replacement delivered/ }));
      await userEvent.type(screen.getByLabelText(/Replacement quantity received/), "2");
      expect(screen.getByRole("alert").textContent).toMatch(/1 of the 2 will be counted/);
      await userEvent.selectOptions(screen.getByLabelText(/Return pickup/), "SCHEDULED");
      await userEvent.type(screen.getByLabelText(/Admin note/), note);
      expect(screen.getByText(/when and how the pickup happens/)).toBeTruthy();
      await userEvent.type(screen.getByLabelText(/Pickup details for the donee/), "Courier collects on Friday 10am to 1pm");
      await userEvent.click(screen.getByRole("button", { name: /Count 1 more and resolve/ }));
      await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4, {
        action: "REDELIVERED", reason: note, additionalQuantity: 2, pickupStatus: "SCHEDULED", pickupNote: "Courier collects on Friday 10am to 1pm",
      }));
    });

    it("tells the donee they may keep the damaged items when closing as unreachable", async () => {
      render(<PartialDeliveryResolver purchase={purchase({ damage: damage({ verifiedAt: "2026-11-06T10:00:00" }) })} onDone={() => {}} />);
      await userEvent.click(screen.getByRole("radio", { name: /donor unreachable/ }));
      expect(screen.getByText(/You may keep the damaged items/)).toBeTruthy();
      expect(screen.getByRole("button", { name: /Mark it in progress/ })).toBeTruthy();
    });
  });

  describe("nothing arrived", () => {
    const nd = (p = {}) => ({
      checkedNeighbours: true, checkedFamily: true, checkedTracking: true, declaredAt: "2026-11-06T10:00:00", declarationNote: null,
      deliveryProofSubmitted: true, notReceivedYetAt: null, stillNothingArrived: true, confirmationGeneratedAt: null, confirmationGeneratedBy: null,
      lateArrivalQuantity: null, lateArrivalCondition: null, lateArrivalNote: null, lateArrivalReportedAt: null, ...p,
    });
    const base = { received: 0, shortfall: 5, pledged: 5, stillNeededOnRequest: 5, openOnRequest: 5, redeliveryCap: 5 };

    it("offers all six actions", () => {
      render(<PartialDeliveryResolver purchase={purchase({ ...base, nonDelivery: nd() })} onDone={() => {}} />);
      for (const n of [/Package found later/, /redelivery\/replacement arrived/, /Donor will donate again/, /donor unreachable/, /Close as disputed/]) {
        expect(screen.getByRole("radio", { name: n })).toBeTruthy();
      }
      expect(screen.getByRole("button", { name: /Redelivery on its way/ })).toBeTruthy();
    });

    it("records a found package with damage, warning when the listing was refilled", async () => {
      render(<PartialDeliveryResolver purchase={purchase({ ...base, openOnRequest: 2, nonDelivery: nd() })} onDone={() => {}} />);
      await userEvent.click(screen.getByRole("radio", { name: /Package found later/ }));
      await userEvent.type(screen.getByLabelText("How many arrived?"), "5");
      await userEvent.type(screen.getByLabelText("Unusable"), "1");
      expect(screen.getByRole("alert").textContent).toMatch(/needs only 2 more, so 2 of the 4 usable/);
      await userEvent.type(screen.getByLabelText(/Admin note/), note);
      await userEvent.click(screen.getByRole("button", { name: "Count 2 and continue" }));
      await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4,
        { action: "PACKAGE_FOUND", reason: note, additionalQuantity: 5, minorDamageQuantity: 0, unusableQuantity: 1 }));
    });

    it("closes as disputed with the neutral message", async () => {
      render(<PartialDeliveryResolver purchase={purchase({ ...base, nonDelivery: nd() })} onDone={() => {}} />);
      await userEvent.click(screen.getByRole("radio", { name: /Close as disputed/ }));
      expect(screen.getByText(/closed it based on the available delivery evidence/)).toBeTruthy();
      await userEvent.type(screen.getByLabelText(/Admin note/), note);
      await userEvent.click(screen.getByRole("button", { name: "Close as disputed" }));
      await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4, { action: "CLOSE_DISPUTED", reason: note }));
    });

    it("confirms a late arrival, capped", async () => {
      render(<PartialDeliveryResolver purchase={purchase({ ...base, issueStatus: "LATE_ARRIVAL_REPORTED", openOnRequest: 3,
        nonDelivery: nd({ stillNothingArrived: true, lateArrivalQuantity: 4, lateArrivalCondition: "GOOD", lateArrivalReportedAt: "2026-11-07T10:00:00" }) })} onDone={() => {}} />);
      expect(screen.queryByRole("radio", { name: /Close as disputed/ })).toBeNull();
      await userEvent.click(screen.getByRole("radio", { name: /Confirm the late arrival/ }));
      await userEvent.type(screen.getByLabelText(/How many to count/), "4");
      expect(screen.getByRole("alert").textContent).toMatch(/3 of the 4 will be counted/);
      await userEvent.type(screen.getByLabelText(/Admin note/), note);
      await userEvent.click(screen.getByRole("button", { name: "Count 3 and resolve" }));
      await waitFor(() => expect(api.adminResolvePurchaseIssue).toHaveBeenCalledWith(4, { action: "LATE_ARRIVAL_CONFIRM", reason: note, additionalQuantity: 4 }));
    });
  });
});
