import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { PastWorkSection } from "@/features/ngo-drives/components/PastWorkSection";
import { NgoDocumentsSection, expiryStatus } from "./NgoDocumentsSection";
import { NgoProfileChangesPanel } from "@/app/admin/ngos/NgoProfileChangesPanel";
import {
  adminApproveNgoProfileChange, adminGetNgoProfileChanges, getMyNgoProfileDocuments, requestNgoProfileChange, uploadNgoDocument,
} from "@/lib/api";

vi.mock("@/hooks/useEntityUpdates", () => ({ useEntityUpdates: () => {} }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  getMyNgoProfileDocuments: vi.fn(), requestNgoProfileChange: vi.fn(), uploadNgoDocument: vi.fn(),
  adminGetNgoProfileChanges: vi.fn(), adminApproveNgoProfileChange: vi.fn(), adminRejectNgoProfileChange: vi.fn(),
}));

const long = "We distributed blankets to families. ".repeat(12);
const acts = [1, 2, 3].map((id) => ({ id, title: `Drive ${id}`, activityDate: `2026-0${id}-10`, description: id === 1 ? long : "Short.",
  media: [{ id, url: `https://x.test/${id}.jpg`, mediaType: "IMAGE" }], status: "APPROVED" })) as never;

function setScroll(el: HTMLElement, left: number, client = 600, width = 1800) {
  Object.defineProperty(el, "clientWidth", { configurable: true, value: client });
  Object.defineProperty(el, "scrollWidth", { configurable: true, value: width });
  el.scrollLeft = left;
  fireEvent.scroll(el);
}

describe("Past activity carousel", () => {
  it("has < and > buttons disabled at the ends and keyboard arrows", () => {
    render(<PastWorkSection title="Past activity" activities={acts} />);
    expect(screen.getByRole("heading", { name: "Past activity" })).toBeInTheDocument();
    const region = screen.getByTestId("activity-carousel");
    const track = within(region).getAllByRole("listitem")[0].parentElement!;
    setScroll(track, 0);
    expect(screen.getByRole("button", { name: "Previous activities" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next activities" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Next activities" }));
    setScroll(track, 1200);
    expect(screen.getByRole("button", { name: "Next activities" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous activities" })).toBeEnabled();
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    setScroll(track, 600);
    expect(screen.getByRole("button", { name: "Previous activities" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next activities" })).toBeEnabled();
  });

  it("Read more opens a dialog with gallery, title, Activity date and the full text", async () => {
    render(<PastWorkSection title="Past activity" activities={acts} />);
    fireEvent.click(screen.getByRole("button", { name: "Read more about Drive 1" }));
    const dialog = await screen.findByTestId("past-work-detail");
    expect(within(dialog).getByText("Drive 1")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Activity date:");
    expect(dialog).toHaveTextContent(long.trim());
    expect(within(dialog).getByRole("button", { name: "Open photo 1 of Drive 1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Read more about Drive 2" })).toBeNull();
  });
});

describe("/profile Documents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
  });

  it("lists documents with chips, and Update uploads then sends a change request", async () => {
    vi.mocked(getMyNgoProfileDocuments).mockResolvedValue([
      { id: 7, type: "cert-80g", category: "SUPPORTING", fileName: "80g.pdf", mimeType: "application/pdf", uploadedAt: "2026-01-02T10:00:00", url: "https://s/80g", expiresAt: "2020-01-01" },
      { id: 8, type: "pan", category: "MUST_HAVE", fileName: "pan.png", mimeType: "image/png", uploadedAt: "2026-01-02T10:00:00", url: "https://s/pan", pendingRequestId: 3, pendingFileName: "pan-new.png" },
    ]);
    vi.mocked(uploadNgoDocument).mockResolvedValue({ documentId: 55 } as never);
    vi.mocked(requestNgoProfileChange).mockResolvedValue({} as never);
    render(<NgoDocumentsSection />);
    const rows = await screen.findAllByTestId("ngo-document");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("80G certificate");
    expect(rows[0]).toHaveTextContent("Expired");
    expect(within(rows[1]).getByTestId("doc-pending")).toHaveTextContent("Pending review");
    expect(within(rows[1]).queryByRole("button", { name: /^Update/ })).toBeNull();

    const file = new File(["%PDF"], "80g-new.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByTestId("doc-input-cert-80g"), { target: { files: [file] } });
    await waitFor(() => expect(uploadNgoDocument).toHaveBeenCalledWith(file, "cert-80g", "supporting"));
    fireEvent.click(await screen.findByRole("button", { name: "Send for review" }));
    await waitFor(() => expect(requestNgoProfileChange).toHaveBeenCalledWith("documents.cert-80g", "55"));
    await waitFor(() => expect(getMyNgoProfileDocuments).toHaveBeenCalledTimes(2));
  });

  it("refuses a wrong file type like the wizard", async () => {
    vi.mocked(getMyNgoProfileDocuments).mockResolvedValue([{ id: 7, type: "cert-80g", fileName: "80g.pdf" }]);
    render(<NgoDocumentsSection />);
    await screen.findByTestId("ngo-document");
    fireEvent.change(screen.getByTestId("doc-input-cert-80g"), { target: { files: [new File(["x"], "a.exe", { type: "application/x-msdownload" })] } });
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(uploadNgoDocument).not.toHaveBeenCalled();
  });

  it("expiry chip", () => {
    const now = Date.parse("2026-10-30T00:00:00Z");
    expect(expiryStatus(null, now)).toBeNull();
    expect(expiryStatus("2026-11-10", now)?.label).toBe("Expiring soon");
    expect(expiryStatus("2027-06-01", now)?.label).toBe("Valid");
    expect(expiryStatus("2026-10-01", now)?.label).toBe("Expired");
  });

  it("admin sees old vs new file and approves", async () => {
    vi.mocked(adminGetNgoProfileChanges).mockResolvedValue([{ request: { id: 3, field: "documents.cert-80g", oldValue: "7", newValue: "55", status: "PENDING" },
      organizationName: "Hope", slug: "hope", idProofUrls: { "7": "https://s/old", "55": "https://s/new" } }] as never);
    vi.mocked(adminApproveNgoProfileChange).mockResolvedValue({} as never);
    render(<NgoProfileChangesPanel />);
    const row = await screen.findByTestId("admin-profile-change");
    expect(row).toHaveTextContent("Document: 80G certificate");
    const links = within(row).getAllByTestId("admin-doc-file");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["https://s/old", "https://s/new"]);
    fireEvent.click(within(row).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(adminApproveNgoProfileChange).toHaveBeenCalledWith(3));
  });
});
