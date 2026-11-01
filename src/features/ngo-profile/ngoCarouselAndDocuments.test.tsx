import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { PHOTO_ROTATE_MS } from "./ActivityHeroCarousel";
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

describe("Past activity carousel", () => {
  const twoPhotos = [{ id: 1, title: "Drive 1", activityDate: "2026-01-10", description: long, status: "APPROVED", media: [{ id: 1, url: "https://x.test/1.jpg", mediaType: "IMAGE" }, { id: 2, url: "https://x.test/2.jpg", mediaType: "IMAGE" }] },
    { id: 2, title: "Drive 2", activityDate: "2026-02-10", status: "APPROVED", media: [{ id: 3, url: "https://x.test/3.jpg", mediaType: "IMAGE" }] }] as never;
  const photo = () => screen.getByTestId("activity-slide-photo").getAttribute("src");

  it("shows one activity a slide; arrows, dots, keys and swipe move between them", () => {
    render(<PastWorkSection title="Past activity" activities={twoPhotos} />);
    expect(screen.getByRole("heading", { name: "Past activity" })).toBeInTheDocument();
    expect(screen.getAllByTestId("activity-slide")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Drive 2" })).toBeInTheDocument(); // newest first
    fireEvent.click(screen.getByRole("button", { name: "Next activity" }));
    expect(screen.getByRole("heading", { name: "Drive 1" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous activity" }));
    expect(screen.getByRole("heading", { name: "Drive 2" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Activity 2" }));
    expect(screen.getByRole("heading", { name: "Drive 1" })).toBeInTheDocument();
    const region = screen.getByTestId("activity-carousel");
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: "Drive 2" })).toBeInTheDocument();
    const img = screen.getByTestId("activity-slide-photo");
    fireEvent.touchStart(img, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(img, { changedTouches: [{ clientX: 200 }] });
    expect(screen.getByRole("heading", { name: "Drive 1" })).toBeInTheDocument();
  });

  it("rotates the activity's photos every 3 s and pauses on hover", () => {
    vi.useFakeTimers();
    try {
      render(<PastWorkSection activities={[twoPhotos[0]] as never} />);
      expect(photo()).toBe("https://x.test/1.jpg");
      act(() => { vi.advanceTimersByTime(PHOTO_ROTATE_MS); });
      expect(photo()).toBe("https://x.test/2.jpg");
      fireEvent.mouseEnter(screen.getByTestId("activity-carousel"));
      act(() => { vi.advanceTimersByTime(PHOTO_ROTATE_MS * 2); });
      expect(photo()).toBe("https://x.test/2.jpg");
    } finally {
      vi.useRealTimers();
    }
  });

  it("Read more opens a dialog with gallery, title, Activity date and the full text", async () => {
    render(<PastWorkSection title="Past activity" activities={acts} />);
    fireEvent.click(screen.getByRole("button", { name: "Activity 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Read more about Drive 1" }));
    const dialog = await screen.findByTestId("past-work-detail");
    expect(within(dialog).getByText("Drive 1")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Activity date:");
    expect(dialog).toHaveTextContent(long.trim());
    expect(within(dialog).getByRole("button", { name: "Open photo 1 of Drive 1" })).toBeInTheDocument();
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
