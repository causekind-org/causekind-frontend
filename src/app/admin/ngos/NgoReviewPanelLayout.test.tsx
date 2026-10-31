import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NgoReviewPanel, APPLICATION_STATUS_OPTIONS } from "./NgoReviewPanel";
import { adminGetNgoApplications, adminGetNgoApplication, adminGetNgoEvidenceLink } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => ({
  ApiError: (await orig<typeof import("@/lib/api")>()).ApiError,
  adminGetNgoApplications: vi.fn(),
  adminGetNgoApplication: vi.fn(),
  adminDecideNgoApplication: vi.fn(),
  adminGetNgoEvidenceLink: vi.fn(),
}));

const app = (n: number, extra: Record<string, unknown> = {}) => ({
  id: n, userId: n, applicationId: `CK-NGO-${n}`, organizationName: `Org ${n}`, status: "UNDER_REVIEW",
  legalStructure: "TRUST", registrationNumber: "R", registeredOfficeAddress: "A", yearOfEstablishment: "2019",
  representativeName: "R", designation: "D", mobileNumber: "+919876543210", officialEmail: `o${n}@x.test`,
  verifiedAt: null, submittedAt: null, updatedAt: null, reviewedAt: null, rejectionReason: null,
  needsInformationDetails: null, aiScreeningVerdict: null, aiScreeningNotes: null, ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/admin/dashboard?tab=ngo-applications");
  vi.mocked(adminGetNgoApplications).mockResolvedValue({ content: [app(1, { resubmitted: true }), app(2)], totalPages: 1, totalElements: 2 } as never);
  vi.mocked(adminGetNgoApplication).mockImplementation(async (id) => {
    const a = id === "CK-NGO-1" ? app(1, { resubmitted: true }) : app(2);
    return {
      application: a, files: [], submissions: [a], decisions: [], current: true, corrections: null,
      correctionHistory: id === "CK-NGO-1" ? [{ roundNumber: 1, overallNote: "Fix reg", status: "RESUBMITTED",
        createdAt: "2026-10-20T04:30:00Z", resubmittedAt: "2026-10-21T04:30:00Z",
        flaggedItems: [{ field: "registrationNumber", note: "Wrong" }], previousValues: { registrationNumber: "OLD" }, newValues: { registrationNumber: "NEW" } }] : [],
    } as never;
  });
  vi.mocked(adminGetNgoEvidenceLink).mockResolvedValue({ url: "https://x" });
});

const card = (name: string) => within(screen.getByTestId("application-cards")).getByRole("button", { name: new RegExp(name) });
const details = () => screen.queryByRole("region", { name: "Application details" });

describe("NGO Applications: tabs, search and layout", { timeout: 15000 }, () => {
  it("replaces the dropdown with the same options as tabs and writes ?status=", async () => {
    render(<NgoReviewPanel />);
    const tabs = await screen.findAllByRole("tab");
    expect(tabs.map(t => t.textContent)).toEqual(APPLICATION_STATUS_OPTIONS.map(o => o.label));
    expect(tabs.map(t => t.textContent)).toEqual(["Awaiting review", "Pending verification", "Corrections requested", "Approved", "Rejected", "Email verification pending", "All current applications"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("combobox")).toBeNull();
    fireEvent.click(tabs[3]);
    await waitFor(() => expect(adminGetNgoApplications).toHaveBeenLastCalledWith("APPROVED", 0, ""));
    expect(window.location.search).toContain("status=APPROVED");
    expect(window.location.search).toContain("tab=ngo-applications");
  });

  it("passes q to the server AND with the status, and shows the search empty state", async () => {
    render(<NgoReviewPanel />);
    await screen.findByText("Org 1");
    vi.mocked(adminGetNgoApplications).mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 } as never);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    await waitFor(() => expect(adminGetNgoApplications).toHaveBeenLastCalledWith("UNDER_REVIEW", 0, "zzz"));
    expect(await screen.findByText("No results for \"zzz\"")).toBeInTheDocument();
    expect(window.location.search).toContain("q=zzz");
    const clears = screen.getAllByRole("button", { name: "Clear search" });
    fireEvent.click(clears[clears.length - 1]);
    await waitFor(() => expect(adminGetNgoApplications).toHaveBeenLastCalledWith("UNDER_REVIEW", 0, ""));
  });

  it("cards fill the width until one is selected; clicking it again, x or Escape closes; ?app= in URL", async () => {
    render(<NgoReviewPanel />);
    await screen.findByText("Org 1");
    expect(screen.getByTestId("application-cards").className).toContain("lg:grid-cols-3");
    expect(details()).toBeNull();

    fireEvent.click(card("Org 1"));
    expect(await screen.findByRole("region", { name: "Application details" })).toBeInTheDocument();
    expect(window.location.search).toContain("app=CK-NGO-1");
    expect(screen.getByTestId("application-cards").className).not.toContain("grid-cols-3");
    fireEvent.click(card("Org 1"));
    expect(details()).toBeNull();
    expect(window.location.search).not.toContain("app=");

    fireEvent.click(card("Org 2"));
    await screen.findByRole("region", { name: "Application details" });
    fireEvent.click(screen.getByRole("button", { name: "Close application" }));
    expect(details()).toBeNull();

    fireEvent.click(card("Org 2"));
    await screen.findByRole("region", { name: "Application details" });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(details()).toBeNull();
  });

  it("asks before discarding unsaved Request-corrections ticks", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<NgoReviewPanel />);
    await screen.findByText("Org 2");
    fireEvent.click(card("Org 2"));
    const checks = await screen.findAllByRole("checkbox");
    fireEvent.click(checks[0]);
    fireEvent.click(card("Org 1"));
    expect(confirm).toHaveBeenCalledWith("Discard your unsaved decision?");
    expect(screen.getByRole("heading", { name: "Org 2" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close application" }));
    expect(details()).toBeInTheDocument();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Close application" }));
    expect(details()).toBeNull();
    confirm.mockRestore();
  });

  it("marks a resubmitted application and shows earlier notes beside new values and the round history", async () => {
    render(<NgoReviewPanel />);
    await screen.findByText("Org 1");
    expect(screen.getAllByTestId("resubmitted-badge")).toHaveLength(1);
    fireEvent.click(card("Org 1"));
    const section = await screen.findByTestId("resubmission-section");
    expect(section).toHaveTextContent("Previously flagged items");
    expect(section).toHaveTextContent("Note: Wrong");
    expect(section).toHaveTextContent("OLD");
    expect(section).toHaveTextContent("→ NEW");
    expect(within(section).getByTestId("correction-round")).toHaveTextContent(/Round 1/);
    expect(within(section).getByTestId("correction-round")).toHaveTextContent(/IST/);
  });
});
