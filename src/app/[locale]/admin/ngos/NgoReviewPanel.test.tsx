import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NgoReviewPanel } from "./NgoReviewPanel";
import {
  adminGetNgoApplications, adminGetNgoApplication, adminDecideNgoApplication, adminGetNgoEvidenceLink,
} from "@/lib/api";

vi.mock("@/lib/api", async (orig) => ({
  ApiError: (await orig<typeof import("@/lib/api")>()).ApiError,
  adminGetNgoApplications: vi.fn(),
  adminGetNgoApplication: vi.fn(),
  adminDecideNgoApplication: vi.fn(),
  adminGetNgoEvidenceLink: vi.fn(),
}));

const application = {
  id: 10, userId: 7, applicationId: "CK-NGO-2026-AAAA0001", organizationName: "Hope Welfare Trust", status: "UNDER_REVIEW",
  legalStructure: "TRUST", registrationNumber: "TR/2026/1001", registeredOfficeAddress: "12 Shanti Nagar, Pune",
  yearOfEstablishment: "2019", representativeName: "Ananya Sharma", designation: "Secretary", mobileNumber: "+919876543210",
  officialEmail: "contact@hope.test", verifiedAt: "2026-10-05T10:00:00", submittedAt: null, updatedAt: null, reviewedAt: null,
  rejectionReason: null, needsInformationDetails: null, aiScreeningVerdict: null, aiScreeningNotes: null,
};
const files = [
  { id: 1, kind: "document", type: "TRUST_DEED", name: "deed.pdf", ownershipRecorded: true, moderationVerdict: null, field: "documents.trust-deed", mimeType: "application/pdf" },
  { id: 2, kind: "document", type: "PAN", name: "pan.jpg", ownershipRecorded: true, moderationVerdict: null, field: "documents.trust-pan", mimeType: "image/jpeg" },
  { id: 3, kind: "photo", type: "LOGO", name: "logo.png", ownershipRecorded: true, moderationVerdict: "SAFE", field: "logo", mimeType: "image/png" },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminGetNgoApplications).mockResolvedValue({ content: [application], totalPages: 1, totalElements: 1 } as never);
  vi.mocked(adminGetNgoApplication).mockResolvedValue({ application, files, submissions: [application], decisions: [], current: true, corrections: null } as never);
  vi.mocked(adminGetNgoEvidenceLink).mockImplementation(async (_id, file) => ({ url: `https://signed.example/${file.kind}-${file.id}?v=${Math.random()}` }));
  vi.mocked(adminDecideNgoApplication).mockResolvedValue(application as never);
});

describe("admin NGO review: evidence previews (point 8)", { timeout: 15000 }, () => {
  it("loads secure links automatically: image thumbnails that enlarge, PDFs as Open PDF", async () => {
    render(<NgoReviewPanel initialApplicationId="CK-NGO-2026-AAAA0001" />);
    await waitFor(() => expect(adminGetNgoEvidenceLink).toHaveBeenCalledTimes(3));
    expect(screen.queryByRole("button", { name: /Generate secure link/i })).not.toBeInTheDocument();

    const logo = await screen.findByRole("img", { name: "logo.png" });
    expect(logo.getAttribute("src")).toMatch(/^https:\/\/signed\.example\/photo-3/);
    expect(screen.getByRole("img", { name: "pan.jpg" })).toBeInTheDocument(); // an image document previews too
    const pdf = screen.getByRole("link", { name: "Open PDF" });
    expect(pdf.getAttribute("href")).toMatch(/document-1/);
    expect(pdf).toHaveAttribute("target", "_blank");

    fireEvent.click(screen.getByRole("button", { name: "Enlarge logo.png" }));
    const dialog = screen.getByRole("dialog", { name: "logo.png" });
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", logo.getAttribute("src"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renews an expired link when an image fails to load", async () => {
    render(<NgoReviewPanel initialApplicationId="CK-NGO-2026-AAAA0001" />);
    const logo = await screen.findByRole("img", { name: "logo.png" });
    const firstSrc = logo.getAttribute("src");
    fireEvent.error(logo);
    await waitFor(() => expect(adminGetNgoEvidenceLink).toHaveBeenCalledTimes(4));
    await waitFor(() => expect(screen.getByRole("img", { name: "logo.png" }).getAttribute("src")).not.toBe(firstSrc));
  });

  it("refreshes all links before the five-minute expiry", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<NgoReviewPanel initialApplicationId="CK-NGO-2026-AAAA0001" />);
      await waitFor(() => expect(adminGetNgoEvidenceLink).toHaveBeenCalledTimes(3));
      await vi.advanceTimersByTimeAsync(4 * 60 * 1000 + 10);
      await waitFor(() => expect(adminGetNgoEvidenceLink).toHaveBeenCalledTimes(6));
    } finally {
      vi.useRealTimers();
    }
  });
});

// These tests type through the checklist; the 5s default is tight under a parallel run.
describe("admin NGO review: request changes per item (point 9)", { timeout: 15000 }, () => {
  it("lists every wizard field and uploaded file, and can't save without an item and a note", async () => {
    const user = userEvent.setup();
    render(<NgoReviewPanel initialApplicationId="CK-NGO-2026-AAAA0001" />);
    const checklist = await screen.findByRole("group", { name: /Items that need changes/i });
    for (const name of ["Organization name", "Legal structure", "Registration number", "Registered office address",
      "Year of establishment", "Representative name", "Designation", "Mobile number", "Official email",
      "Registered Trust Deed", "Trust PAN Card", "Organization logo"]) {
      expect(within(checklist).getByRole("checkbox", { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
    const save = screen.getByRole("button", { name: "Save decision" });
    expect(save).toBeDisabled();

    await user.click(within(checklist).getByRole("checkbox", { name: /^Registration number/ }));
    expect(save).toBeDisabled(); // picked but no note yet
    await user.type(screen.getByRole("textbox", { name: /What is wrong with Registration number/ }), "Does not match the certificate");
    expect(save).toBeEnabled();
    await user.click(within(checklist).getByRole("checkbox", { name: /^Registered Trust Deed/ }));
    expect(save).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: /What is wrong with Registered Trust Deed/ }), "The deed scan is cut off");

    await user.click(save);
    await waitFor(() => expect(adminDecideNgoApplication).toHaveBeenCalledWith("CK-NGO-2026-AAAA0001", "NEEDS_INFORMATION", "", [
      { field: "registrationNumber", note: "Does not match the certificate" },
      { field: "documents.trust-deed", note: "The deed scan is cut off" },
    ]));
    expect(await screen.findByText(/Corrections requested\. The NGO will see everything else filled in/)).toBeInTheDocument();
  });

  it("unticking an item drops it, and approval sends no items", async () => {
    const user = userEvent.setup();
    render(<NgoReviewPanel initialApplicationId="CK-NGO-2026-AAAA0001" />);
    const checklist = await screen.findByRole("group", { name: /Items that need changes/i });
    await user.click(within(checklist).getByRole("checkbox", { name: /^Designation/ }));
    await user.click(within(checklist).getByRole("checkbox", { name: /^Designation/ }));
    expect(screen.queryByRole("textbox", { name: /What is wrong with Designation/ })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: /^Decision/ }), "APPROVED");
    expect(screen.queryByRole("group", { name: /Items that need changes/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save decision" }));
    await waitFor(() => expect(adminDecideNgoApplication).toHaveBeenCalledWith("CK-NGO-2026-AAAA0001", "APPROVED", "", undefined));
  });

  it("shows the requested corrections on an application returned to the NGO", async () => {
    vi.mocked(adminGetNgoApplication).mockResolvedValue({
      application: { ...application, status: "NEEDS_INFORMATION" }, files, submissions: [application], decisions: [], current: true,
      corrections: { summary: "", items: [{ field: "logo", note: "Logo is blurry" }] },
    } as never);
    render(<NgoReviewPanel initialApplicationId="CK-NGO-2026-AAAA0001" />);
    expect(await screen.findByText("Corrections requested")).toBeInTheDocument();
    expect(screen.getByText(/Logo is blurry/)).toBeInTheDocument();
  });
});
