import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NgoActivityModerationPanel } from "./NgoActivityModerationPanel";
import { NgoProfileChangesPanel } from "./NgoProfileChangesPanel";
import { NgoDriveProofsPanel } from "../ngo-drives/NgoDriveAdminPanels";
import { adminGetNgoDriveProofs, adminGetNgoProfileChanges, getPendingNgoActivities } from "@/lib/api";

vi.mock("@/lib/toast", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  getPendingNgoActivities: vi.fn(), approveNgoActivity: vi.fn(), rejectNgoActivity: vi.fn(),
  adminGetNgoProfileChanges: vi.fn(), adminApproveNgoProfileChange: vi.fn(), adminRejectNgoProfileChange: vi.fn(),
  adminGetNgoDriveProofs: vi.fn(), adminApproveNgoDriveProof: vi.fn(), adminRejectNgoDriveProof: vi.fn(),
}));

const tabs = () => screen.getAllByRole("tab").map(t => t.textContent);
const tab = (name: RegExp) => screen.getByRole("tab", { name });

beforeEach(() => { vi.clearAllMocks(); window.history.replaceState(null, "", "/admin/dashboard?tab=ngo-activities"); });

describe("Past activity tabs", () => {
  const act = (id: number, status: string, title: string, org: string, extra = {}) =>
    ({ activity: { id, title, status, activityDate: "2026-01-02", media: [], consentGiven: true, sortOrder: 0, ...extra }, ngoUserId: id, organizationName: org });
  beforeEach(() => vi.mocked(getPendingNgoActivities).mockResolvedValue([
    act(1, "PENDING", "Meal drive", "Hope Trust"), act(2, "PENDING", "Book drive", "Asha Trust"),
    { ...act(3, "APPROVED", "Blanket drive", "Hope Trust"), decidedBy: "admin@ck.test", decidedAt: "2026-11-01T06:30:00Z" },
    { ...act(4, "REJECTED", "Toy drive", "Hope Trust", { rejectionReason: "Blur faces" }), decidedBy: "admin@ck.test", decidedAt: "2026-11-02T06:30:00Z" },
  ] as never));

  it("each tab lists only its status, with counts that match, and search ANDs with the tab", async () => {
    render(<NgoActivityModerationPanel />);
    expect(await screen.findAllByTestId("admin-activity")).toHaveLength(2);
    expect(getPendingNgoActivities).toHaveBeenCalledWith("ALL");
    expect(tabs()).toEqual(["Waiting for review (2)", "Approved (1)", "Not approved (1)", "All (4)"]);
    expect(screen.getAllByRole("button", { name: "Approve" })).toHaveLength(2);

    fireEvent.click(tab(/^Approved/));
    const approved = screen.getAllByTestId("admin-activity");
    expect(approved).toHaveLength(1);
    expect(approved[0]).toHaveTextContent("Blanket drive");
    expect(within(approved[0]).getByTestId("decision-line")).toHaveTextContent(/Approved by admin@ck\.test · /);
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(window.location.search).toContain("status=APPROVED");

    fireEvent.click(tab(/^Not approved/));
    expect(screen.getByTestId("decision-line")).toHaveTextContent("Reason: Blur faces");

    fireEvent.click(tab(/^Waiting/));
    fireEvent.change(screen.getByLabelText("Search past activity"), { target: { value: "Asha" } });
    await waitFor(() => expect(screen.getAllByTestId("admin-activity").map(n => n.textContent)).toEqual([expect.stringContaining("Book drive")]));
    fireEvent.click(tab(/^All/));
    expect(screen.getAllByTestId("admin-activity")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Search past activity"), { target: { value: "Hope" } });
    await waitFor(() => expect(screen.getAllByTestId("admin-activity")).toHaveLength(3));
  });
});

describe("Past activity: decided edits of live activities", () => {
  it("a refused edit is in Not approved as 'Edit not approved' with who, when and why; an approved edit is in Approved", async () => {
    const row = (id: number, status: string, title: string, extra = {}) => ({ activity: { id, title, status, activityDate: "2026-01-02", media: [], consentGiven: true, sortOrder: 0, ...extra }, ngoUserId: 1, organizationName: "Hope Trust", editOfLive: true });
    vi.mocked(getPendingNgoActivities).mockResolvedValue([
      row(5, "PENDING", "Waiting edit"),
      { ...row(6, "REJECTED", "Refused edit", { rejectionReason: "Wrong date" }), decidedBy: "admin@ck.test", decidedAt: "2026-11-02T06:30:00Z" },
      { ...row(7, "APPROVED", "Approved edit"), decidedBy: "admin@ck.test", decidedAt: "2026-11-03T06:30:00Z" },
    ] as never);
    render(<NgoActivityModerationPanel />);
    expect(await screen.findAllByTestId("admin-activity")).toHaveLength(1);
    expect(tabs()).toEqual(["Waiting for review (1)", "Approved (1)", "Not approved (1)", "All (3)"]);
    fireEvent.click(tab(/^Not approved/));
    const refused = screen.getAllByTestId("admin-activity");
    expect(refused).toHaveLength(1);
    expect(within(refused[0]).getByTestId("activity-edit-label")).toHaveTextContent("Edit not approved");
    expect(within(refused[0]).getByTestId("decision-line")).toHaveTextContent(/Edit not approved by admin@ck\.test · .*Reason: Wrong date/);
    expect(within(refused[0]).queryByRole("button", { name: "Approve" })).toBeNull();
    fireEvent.click(tab(/^Approved/));
    const approved = screen.getAllByTestId("admin-activity");
    expect(approved).toHaveLength(1);
    expect(within(approved[0]).getByTestId("activity-edit-label")).toHaveTextContent("Edit approved");
  });
});

describe("Profile changes tabs", () => {
  const change = (id: number, status: string, org: string, extra = {}) =>
    ({ request: { id, field: "registrationNumber", oldValue: "A", newValue: `NEW-${id}`, status, createdAt: "2026-11-01T06:30:00Z", ...extra }, ngoUserId: id, organizationName: org });
  it("replaces the chips with the shared tabs; each lists only its status; search ANDs", async () => {
    vi.mocked(adminGetNgoProfileChanges).mockResolvedValue([
      change(1, "PENDING", "Hope Trust"),
      { ...change(2, "APPROVED", "Hope Trust", { decidedAt: "2026-11-02T06:30:00Z" }), decidedBy: "admin@ck.test" },
      { ...change(3, "REJECTED", "Asha Trust", { decidedAt: "2026-11-02T06:30:00Z", adminReason: "Wrong number" }), decidedBy: "admin@ck.test" },
    ] as never);
    render(<NgoProfileChangesPanel />);
    expect(await screen.findAllByTestId("admin-profile-change")).toHaveLength(1);
    expect(adminGetNgoProfileChanges).toHaveBeenCalledWith("ALL");
    expect(tabs()).toEqual(["Waiting (1)", "Approved (1)", "Not approved (1)", "All (3)"]);
    expect(screen.queryByRole("button", { pressed: true })).toBeNull();
    fireEvent.click(tab(/^Not approved/));
    const rows = screen.getAllByTestId("admin-profile-change");
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByTestId("decision-line")).toHaveTextContent(/Not approved by admin@ck\.test · .*Reason: Wrong number/);
    expect(within(rows[0]).queryByRole("button", { name: "Approve" })).toBeNull();
    fireEvent.click(tab(/^All/));
    fireEvent.change(screen.getByLabelText("Search profile changes"), { target: { value: "Hope" } });
    await waitFor(() => expect(screen.getAllByTestId("admin-profile-change")).toHaveLength(2));
  });
});

describe("Distribution proofs tabs", () => {
  const proof = (id: number, title: string, extra = {}) => ({ id, title, ngoName: "Hope Trust", status: "PROOF_SUBMITTED", proofPhotoUrls: [], ...extra });
  it("each tab lists only its status; decided ones show who, when and why, without buttons", async () => {
    vi.mocked(adminGetNgoDriveProofs).mockResolvedValue([
      proof(1, "Winter clothes"), proof(2, "School bags"),
      proof(3, "Blankets", { proofDecision: "APPROVED", proofDecidedBy: "admin@ck.test", proofDecidedAt: "2026-11-01T06:30:00Z" }),
      proof(4, "Books", { proofDecision: "REJECTED", proofDecidedBy: "admin@ck.test", proofDecidedAt: "2026-11-01T06:30:00Z", proofDecisionReason: "Photos are blurry" }),
    ] as never);
    render(<NgoDriveProofsPanel />);
    expect(await screen.findAllByTestId("proof-card")).toHaveLength(2);
    expect(adminGetNgoDriveProofs).toHaveBeenCalledWith("ALL");
    expect(tabs()).toEqual(["Waiting for review (2)", "Approved (1)", "Rejected (1)", "All (4)"]);
    fireEvent.click(tab(/^Rejected/));
    const cards = screen.getAllByTestId("proof-card");
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByTestId("decision-line")).toHaveTextContent(/Rejected by admin@ck\.test · .*Reason: Photos are blurry/);
    expect(within(cards[0]).queryByRole("button", { name: "Approve" })).toBeNull();
    fireEvent.click(tab(/^All/));
    fireEvent.change(screen.getByLabelText("Search distribution proofs"), { target: { value: "bags" } });
    await waitFor(() => expect(screen.getAllByTestId("proof-card")).toHaveLength(1));
  });
});

describe("Admin sidebar", () => {
  it("Issues sits above the NGO group; the other entries keep their order", () => {
    const src = readFileSync(resolve(__dirname, "../dashboard/page.tsx"), "utf8");
    const sidebar = src.slice(src.indexOf("{TABS.map("), src.indexOf('<AdminFundraisingNav variant="sidebar"'));
    expect(sidebar.indexOf('selectTab("issues")')).toBeGreaterThan(0);
    expect(sidebar.indexOf('selectTab("issues")')).toBeLessThan(sidebar.indexOf('aria-controls="admin-ngo-group"'));
  });
});
