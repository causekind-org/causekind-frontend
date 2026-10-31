import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AdminIssueDetail, AdminIssuePage, AdminIssueSummary } from "@/lib/api";

/**
 * Admin → Issues: one read-only list of every report and support case, and
 * each issue's whole story. No resolution controls in this section.
 */

const api = vi.hoisted(() => ({ adminListIssues: vi.fn(), adminGetIssue: vi.fn() }));
vi.mock("@/lib/api", () => api);
const notes = vi.hoisted(() => ({ list: [] as { link: string; receivedAt: number }[] }));
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
    expect(within(card).getByText("Item not received")).toBeTruthy();
    expect(within(card).getByText(/Reported by Asha \(Recipient\)/)).toBeTruthy();
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

  it("opens the whole story, read-only", async () => {
    render(<IssuesPanel />);
    await userEvent.click(await screen.findByRole("button", { name: /Open issue: Winter blankets/ }));
    const story = await screen.findByRole("article", { name: "Issue CK-2026-0042" });

    expect(within(story).getByText("Nothing arrived even though tracking says delivered")).toBeTruthy();
    expect(within(story).getByText("Courier photo shows it at the gate")).toBeTruthy();
    expect(within(story).getByText("3")).toBeTruthy(); // units affected
    expect(within(story).getByText("Purchase and delivery")).toBeTruthy();
    expect(within(story).getByText("Shop")).toBeTruthy();
    expect(within(story).getByText("Delivery proof")).toBeTruthy();
    expect(within(story).getByText("Link unavailable")).toBeTruthy();
    expect(within(story).getByText("post-delivery-issue #7, offer #4")).toBeTruthy();
    expect(within(story).getByText("Internal")).toBeTruthy();
    const steps = within(story).getAllByRole("listitem").map(li => li.textContent ?? "");
    expect(steps.findIndex(t => t.includes("Order placed"))).toBeLessThan(steps.findIndex(t => t.includes("Reported: Item not received")));

    // No resolution controls anywhere in this section.
    const buttons = within(story).queryAllByRole("button").map(b => (b.textContent ?? "").trim());
    expect(buttons).toEqual(["All issues"]);
  });

  it("opens straight to an issue from a deep link and goes back to the list", async () => {
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
