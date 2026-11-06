import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AdminIssueDetail, AdminIssuePage, AdminIssueSummary } from "@/lib/api";

/**
 * Admin → Issues: one read-only list of every report and support case, and
 * each issue's whole story. No resolution controls in this section.
 */

const api = vi.hoisted(() => ({ adminListIssues: vi.fn(), adminGetIssue: vi.fn(), adminGetPurchase: vi.fn(), adminResolvePurchaseIssue: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<object>()), ...api }));
vi.mock("@/features/donation-offer-wizard/steps/OfferVideoField", () => ({ OfferVideoField: () => null }));
vi.mock("@/features/donation-offer-wizard/useOfferVideo", () => ({ useOfferVideo: () => ({ upload: vi.fn(), remove: vi.fn() }) }));
const notes = vi.hoisted(() => ({ list: [] as { link: string; receivedAt: number }[] }));
const purchaseView = {
  offerId: 4, method: "DIRECT_DELIVERY", status: "ISSUE_RAISED", readyToBuy: false, acceptedAt: null, deadline: null,
  acceptedQuantity: 3, orderedAt: "2026-10-11T10:00:00", orderedQuantity: 3, receivedQuantity: 0, expectedDeliveryAt: null,
  trackingUrl: null, trackingReference: null, address: null, retailer: "Shop", orderReference: null, evidence: [],
  extensionRequestedUntil: null, extensionDecidedAt: null, issueWindowExpiresAt: null, version: 1, deliveryReportedAt: null,
  deliveryReminderSentAt: null, deliveryEscalatedAt: null, receivedCondition: null, receiptRecordedBySupport: false,
  issues: [{ id: 7, type: "ITEM_NOT_RECEIVED", description: "Nothing arrived", affectedQuantity: 3, reportedByRole: "DONEE",
    createdAt: "2026-10-16T10:00:00", response: null, respondedAt: null, resolution: null, resolvedAt: null }],
};
vi.mock("@/hooks/useNotifications", () => ({ useNotifications: () => ({ notifications: notes.list }) }));
const params = vi.hoisted(() => ({ value: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => params.value }));

import { IssueLinkWatcher, IssuesPanel } from "./IssuesPanel";

const summary = (p: Partial<AdminIssueSummary> = {}): AdminIssueSummary => ({
  key: "pdi-7", source: "PURCHASE", title: "Winter blankets", issueType: "ITEM_NOT_RECEIVED",
  description: "Nothing arrived even though tracking says delivered",
  reportedBy: { userId: 2, name: "Asha", email: "asha@test.com", role: "DONEE" },
  against: { userId: 1, name: "Ravi", email: "ravi@test.com", role: "DONOR" },
  open: true, caseNumber: "CK-2026-0042", caseStatus: "NEW", casePriority: "NORMAL",
  entityType: "offer", entityId: 4, createdAt: "2026-10-16T10:00:00", resolvedAt: null, lastActivityAt: "2026-10-16T12:00:00", ...p,
});
const page = (items: AdminIssueSummary[], openCount = items.length): AdminIssuePage => ({
  items, total: items.length, page: 0, size: 25, openCount, openBySource: { PURCHASE: openCount },
});
const detail: AdminIssueDetail = {
  summary: summary(), affectedQuantity: 3, response: "Courier photo shows it at the gate", respondedAt: "2026-10-16T11:00:00",
  resolution: null, windowExpiresAt: "2026-10-18T10:00:00",
  sections: [{ title: "Purchase and delivery", facts: [
    { label: "Retailer", value: "Shop" }, { label: "Tracking link", value: "https://courier.example/t/1" }] }],
  evidence: [
    { label: "DELIVERY_PROOF", url: "https://signed.example/proof", uploadedBy: "Donor", uploadedAt: "2026-10-16T09:00:00" },
    { label: "RECEIVED_PHOTO", url: null, uploadedBy: "Recipient", uploadedAt: null }],
  supportCase: { id: 9, caseNumber: "CK-2026-0042", subject: "Handover issue", description: null, category: "DISPUTE",
    status: "NEW", priority: "NORMAL", assignedTo: null, dueAt: "2026-10-17T10:00:00", resolvedAt: null,
    resolutionSummary: null, linkedRecords: ["post-delivery-issue #7", "offer #4"] },
  timeline: [
    { at: "2026-10-15T08:00:00", kind: "STATUS", actor: "ravi@test.com", text: "Purchase: Order placed — Purchase recorded", internal: false },
    { at: "2026-10-16T10:00:00", kind: "ISSUE", actor: "Asha", text: "Reported: Item not received — Nothing arrived", internal: false },
    { at: "2026-10-16T10:00:01", kind: "CASE", actor: "system", text: "Case CK-2026-0042 · Created — Opened automatically", internal: true },
  ],
};

describe("IssuesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notes.list = [];
    api.adminListIssues.mockResolvedValue(page([summary(), summary({ key: "case-3", source: "SUPPORT", title: "Cannot log in", issueType: "ACCOUNT_ACCESS", open: true })]));
    api.adminGetIssue.mockResolvedValue(detail);
  });

  it("lists every issue with where it came from, who reported it and the open count", async () => {
    const onOpenCount = vi.fn();
    render(<IssuesPanel onOpenCount={onOpenCount} />);
    const card = await screen.findByRole("button", { name: /Open issue: Winter blankets/ });
    expect(within(card).getByText("Purchase")).toBeTruthy();
    expect(within(card).getByText("Issue: Item not received")).toBeTruthy();
    expect(within(card).getByText("Request: Winter blankets")).toBeTruthy();
    expect(within(card).getByText(/Reported by Donee: Asha · about Donor: Ravi/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Open issue: Cannot log in/ })).toBeTruthy();
    expect(onOpenCount).toHaveBeenCalledWith(2);
    expect(api.adminListIssues).toHaveBeenCalledWith({ status: "open", source: "", q: "", page: 0, size: 25 });
  });

  it("filters by source and status", async () => {
    render(<IssuesPanel />);
    await screen.findByRole("button", { name: /Open issue: Winter blankets/ });
    await userEvent.click(screen.getByRole("button", { name: /^Drive offer/ }));
    await waitFor(() => expect(api.adminListIssues).toHaveBeenLastCalledWith(expect.objectContaining({ source: "DRIVE_OFFER" })));
    await userEvent.click(screen.getByRole("button", { name: "Resolved" }));
    await waitFor(() => expect(api.adminListIssues).toHaveBeenLastCalledWith(expect.objectContaining({ status: "resolved" })));
  });

  it("opens the whole story, with the decision only for an open purchase problem", async () => {
    api.adminGetPurchase.mockResolvedValue(purchaseView);
    render(<IssuesPanel />);
    await userEvent.click(await screen.findByRole("button", { name: /Open issue: Winter blankets/ }));
    const story = await screen.findByRole("article", { name: "Issue CK-2026-0042" });

    expect(within(story).getByText("Nothing arrived even though tracking says delivered")).toBeTruthy();
    expect(within(story).getByText("Courier photo shows it at the gate")).toBeTruthy();
    const reported = within(story).getByRole("heading", { name: "What was reported" }).closest("section") as HTMLElement;
    expect(within(reported).getByText("3")).toBeTruthy(); // units affected
    expect(within(story).getByText("Purchase and delivery")).toBeTruthy();
    expect(within(story).getByText("Shop")).toBeTruthy();
    expect(within(story).getByText("Delivery proof")).toBeTruthy();
    expect(within(story).getByText("Link unavailable")).toBeTruthy();
    expect(within(story).getByText("post-delivery-issue #7, offer #4")).toBeTruthy();
    expect(within(story).getByText("Internal")).toBeTruthy();
    const steps = within(story).getAllByRole("listitem").map(li => li.textContent ?? "");
    expect(steps.findIndex(t => t.includes("Order placed"))).toBeLessThan(steps.findIndex(t => t.includes("Reported: Item not received")));

    // An open purchase problem is decided here, through the purchase lifecycle.
    expect(within(story).getByRole("heading", { name: "Decide this problem" })).toBeTruthy();
    expect(await within(story).findByRole("radio", { name: /Close and count what arrived/ })).toBeTruthy();
    expect(api.adminGetPurchase).toHaveBeenCalledWith(4);
  });

  it("lays out a partial delivery as labelled cards with contacts, quantity tiles, link chips and the three actions", async () => {
    const partial: AdminIssueDetail = {
      ...detail,
      summary: summary({ issueType: "QUANTITY_MISMATCH", title: "I need 20 laptops", description: "Only 3 of 5 arrived.", issueStatus: "OPEN" }),
      purchase: {
        offerId: 4, requestId: 3, requestTitle: "I need 20 laptops", issueStatus: "OPEN", deliveryOutcome: "PARTIAL", partialDelivery: true,
        requested: 20, pledged: 5, received: 3, shortfall: 2, redelivered: 0, stillNeededOnRequest: 2, openOnRequest: 2, redeliveryCap: 2,
        expectedDeliveryAt: "2026-10-20T23:59:00",
        donor: { role: "DONOR", userId: 1, name: "Ravi", email: "ravi@test.com", phone: "9000000001", city: "Pune" },
        donee: { role: "DONEE", userId: 2, name: "Asha", email: "asha@test.com", phone: null, city: "Mumbai" },
        links: [
          { kind: "REQUEST", label: "Request page", url: "/requests/3" },
          { kind: "DELIVERY_PROOF", label: "Delivery proof · Donor", url: "https://signed.example/a-very-long-presigned-url?x=1" },
        ],
        deliveryUpdates: [{ at: "2026-10-17T10:00:00", senderRole: "DONOR", senderName: "Ravi", type: "DELIVERY_UPDATE", text: "Running late, new date 20 Oct" }],
        chat: [{ at: "2026-10-17T10:00:00", senderRole: "DONOR", senderName: "Ravi", type: "SYSTEM", text: "Donor marked the order as delivered. Please confirm what arrived." }],
        steps: [{ at: "2026-10-18T10:00:00", actor: "asha@test.com", action: "OPENED", note: "Only 3 of 5 arrived." }],
      },
    };
    api.adminGetIssue.mockResolvedValue(partial);
    render(<IssuesPanel issueKey="pdi-7" />);
    const story = await screen.findByRole("article", { name: "Issue CK-2026-0042" });
    expect(within(story).getByRole("heading", { name: "Request: I need 20 laptops" })).toBeTruthy();
    expect(within(story).getByText("Donor: Ravi")).toBeTruthy();
    expect(within(story).getByText("Donee: Asha")).toBeTruthy();
    expect(within(story).getByRole("link", { name: "9000000001" }).getAttribute("href")).toBe("tel:9000000001");
    for (const label of ["Requested", "Pledged", "Received", "Shortfall", "Still needed on request"]) expect(within(story).getByText(label)).toBeTruthy();
    // Links are chips with labels; the raw URL is never printed.
    expect(within(story).getByRole("link", { name: /Delivery proof · Donor/ })).toBeTruthy();
    expect(within(story).queryByText(/a-very-long-presigned-url/)).toBeNull();
    for (const action of [/Donor will donate again/, /remaining items delivered/, /donor unreachable/]) {
      expect(within(story).getByRole("radio", { name: action })).toBeTruthy();
    }
    expect(within(story).getAllByText("Open").length).toBeGreaterThan(0);
  });

  it("shows a damage report with coloured breakdown tiles, the gallery and the review step", async () => {
    const base = detail;
    api.adminGetIssue.mockResolvedValue({
      ...base,
      summary: summary({ issueType: "ITEM_DAMAGED", title: "I need 5 laptops", issueStatus: "AWAITING_DONEE_INFO" }),
      purchase: {
        offerId: 4, requestId: 3, requestTitle: "I need 5 laptops", issueStatus: "AWAITING_DONEE_INFO", deliveryOutcome: "DAMAGED", partialDelivery: false,
        requested: 5, pledged: 5, received: 3, shortfall: 2, redelivered: 0, stillNeededOnRequest: 2, openOnRequest: 2, redeliveryCap: 2,
        expectedDeliveryAt: null, donor: null, donee: null, links: [], deliveryUpdates: [], chat: [], steps: [],
        damage: { arrived: 5, good: 2, minorDamage: 1, unusable: 2, missing: 0, reclassified: 0, verifiedAt: null, verifiedBy: null,
          returnPickupStatus: null, returnPickupNote: null, infoRequest: "Close-ups please", infoReply: null,
          gallery: [{ kind: "PHOTO", label: "Damage photo", url: "https://signed/1", status: null, uploadedAt: null },
                    { kind: "VIDEO", label: "Damage video", url: null, status: "TRANSCODING", uploadedAt: null }] },
      },
    } as AdminIssueDetail);
    render(<IssuesPanel issueKey="pdi-7" />);
    const story = await screen.findByRole("article", { name: "Issue CK-2026-0042" });
    expect(within(story).getByRole("heading", { name: "Request: I need 5 laptops" })).toBeTruthy();
    for (const label of ["Pledged", "Arrived", "Good", "Minor damage (usable)", "Unusable", "Missing", "Still needed on request"]) {
      expect(within(story).getByText(label)).toBeTruthy();
    }
    expect(within(story).getAllByText("Awaiting donee info").length).toBeGreaterThan(0);
    expect(within(story).getByRole("button", { name: /Open Damage photo 1/ })).toBeTruthy();
    expect(within(story).getByText("Video being screened")).toBeTruthy();
    expect(within(story).getByText(/Step 1 · Review the damage proof/)).toBeTruthy();
    expect(within(story).getByText(/Return pickup: Not set/)).toBeTruthy();
  });

  it("opens straight to an issue from a deep link and goes back to the list", async () => {
    api.adminGetPurchase.mockResolvedValue(purchaseView);
    render(<IssuesPanel issueKey="pdi-7" />);
    await screen.findByRole("article", { name: "Issue CK-2026-0042" });
    expect(api.adminGetIssue).toHaveBeenCalledWith("pdi-7");
    await userEvent.click(screen.getByRole("button", { name: "All issues" }));
    expect(await screen.findByRole("button", { name: /Open issue: Winter blankets/ })).toBeTruthy();
  });

  it("refreshes when a new issue notification arrives", async () => {
    const { rerender } = render(<IssuesPanel />);
    await screen.findByRole("button", { name: /Open issue: Winter blankets/ });
    const before = api.adminListIssues.mock.calls.length;
    notes.list = [{ link: "/admin/dashboard?tab=issues&issue=pdi-8", receivedAt: Date.now() + 1000 }];
    await act(async () => { rerender(<IssuesPanel />); });
    await waitFor(() => expect(api.adminListIssues.mock.calls.length).toBeGreaterThan(before));
  });

  it("shows a retry when the list fails to load", async () => {
    api.adminListIssues.mockRejectedValueOnce(new Error("Offline"));
    render(<IssuesPanel />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/Offline/);
  });
});

describe("IssueLinkWatcher", () => {
  it("opens the linked issue and ignores malformed keys", () => {
    const onOpen = vi.fn();
    params.value = new URLSearchParams("tab=issues&issue=doi-12");
    const { rerender } = render(<IssueLinkWatcher onOpen={onOpen} />);
    expect(onOpen).toHaveBeenLastCalledWith("doi-12");
    params.value = new URLSearchParams("tab=issues&issue=<script>");
    rerender(<IssueLinkWatcher onOpen={onOpen} />);
    expect(onOpen).toHaveBeenLastCalledWith(null);
    params.value = new URLSearchParams("tab=offers");
    rerender(<IssueLinkWatcher onOpen={onOpen} />);
    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});
