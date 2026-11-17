import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { PastActivitySection } from "./PastActivity";
import { OwnerEditDialog } from "./NgoProfileOwnerEdit";
import { ReviewSubmit } from "@/features/ngo-registration/steps/ReviewSubmit";
import { INITIAL_NGO_FORM } from "@/features/ngo-registration/ngoRegistrationModel";
import { NgoActivityModerationPanel } from "@/app/[locale]/admin/ngos/NgoActivityModerationPanel";
import {
  approveNgoActivity, deleteNgoActivity, dismissNgoActivityEditNote, getMyNgoActivities, getPendingNgoActivities, removeNgoActivityMedia, removeNgoProfilePhoto, updateNgoActivity,
  uploadNgoProfilePhoto,
} from "@/lib/api";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: "NGO_PARTNER" } }) }));
vi.mock("@/lib/imageCompression", () => ({ compressImageIfNeeded: (f: File) => Promise.resolve(f) }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  dismissNgoActivityEditNote: vi.fn(), deleteNgoActivity: vi.fn(), getMyNgoActivities: vi.fn(), updateNgoActivity: vi.fn(), removeNgoActivityMedia: vi.fn(), uploadNgoActivityPhoto: vi.fn(), createNgoActivity: vi.fn(),
  getPendingNgoActivities: vi.fn(), approveNgoActivity: vi.fn(), rejectNgoActivity: vi.fn(),
  uploadNgoProfilePhoto: vi.fn(), removeNgoProfilePhoto: vi.fn(), updateNgoProfileCosmetic: vi.fn(), requestNgoProfileChange: vi.fn(),
}));

const media = (id: number) => ({ id, mediaType: "IMAGE", url: `https://x.test/${id}.jpg`, status: "APPROVED" });
const activity = (over = {}) => ({ id: 3, title: "Blanket drive", activityDate: "2026-01-02", description: "We gave blankets.", status: "PENDING", sortOrder: 0, media: [media(9), media(10)], ...over });

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
});

describe("Review: past activity", () => {
  it("clicking the title or a photo opens the Read more modal", async () => {
    vi.mocked(getMyNgoActivities).mockResolvedValue([activity()] as never);
    render(<ReviewSubmit data={INITIAL_NGO_FORM} onChange={() => {}} onBack={() => {}} onEditStep={() => {}} onSubmit={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: "Blanket drive" }));
    expect(await screen.findByTestId("past-work-detail")).toHaveTextContent("We gave blankets.");
  });
});

describe("Editing an activity", () => {
  it("is prefilled; save updates, removes the taken-out photo and shows what the server says", async () => {
    vi.mocked(getMyNgoActivities).mockResolvedValue([activity({ status: "APPROVED" })] as never);
    vi.mocked(updateNgoActivity).mockResolvedValue(activity({ title: "Blanket drive 2", status: "PENDING" }) as never);
    vi.mocked(removeNgoActivityMedia).mockResolvedValue(activity({ title: "Blanket drive 2", status: "PENDING", media: [media(10)] }) as never);
    render(<PastActivitySection />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit Blanket drive" }));
    const form = screen.getByTestId("past-activity-form");
    expect(screen.getByText(/live activity stays as it is/)).toBeInTheDocument();
    const name = within(form).getByLabelText(/Activity name/);
    expect(name).toHaveValue("Blanket drive");
    expect(within(form).getByLabelText(/Activity date/)).toHaveValue("2026-01-02");
    expect(within(form).getByLabelText(/What work/)).toHaveValue("We gave blankets.");
    fireEvent.change(name, { target: { value: "Blanket drive 2" } });
    fireEvent.click(within(form).getAllByRole("button", { name: /Remove/i })[0]);
    fireEvent.click(within(form).getByRole("button", { name: "Yes, remove" }));
    fireEvent.click(within(form).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updateNgoActivity).toHaveBeenCalledWith(3, { title: "Blanket drive 2", activityDate: "2026-01-02", description: "We gave blankets." }));
    expect(removeNgoActivityMedia).toHaveBeenCalledWith(3, 9);
    const card = await screen.findByTestId("past-activity-card");
    expect(card).toHaveTextContent("Blanket drive 2");
    expect(card).toHaveTextContent("Under review");
  });
});

describe("/profile carousel", () => {
  it("shows why an edit was refused until dismissed", async () => {
    const refused = activity({ status: "APPROVED", rejectionReason: "Blurry" });
    vi.mocked(getMyNgoActivities).mockResolvedValue([refused] as never);
    vi.mocked(dismissNgoActivityEditNote).mockResolvedValue(activity({ status: "APPROVED" }) as never);
    render(<PastActivitySection carousel />);
    expect(await screen.findByTestId("activity-edit-note")).toHaveTextContent("Edit not approved: Blurry");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByTestId("activity-edit-note")).toBeNull());
    expect(dismissNgoActivityEditNote).toHaveBeenCalledWith(3);
  });

  it("Delete asks in the app's dialog, not the browser's", async () => {
    const browserConfirm = vi.spyOn(window, "confirm");
    vi.mocked(getMyNgoActivities).mockResolvedValue([activity()] as never);
    vi.mocked(deleteNgoActivity).mockResolvedValue(undefined as never);
    render(<PastActivitySection carousel />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete Blanket drive" }));
    expect(deleteNgoActivity).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Yes, delete" }));
    await waitFor(() => expect(deleteNgoActivity).toHaveBeenCalledWith(3));
    expect(browserConfirm).not.toHaveBeenCalled();
  });
});

describe("Admin Past activity tab", () => {
  it("labels an application's activities and approves individually", async () => {
    vi.mocked(getPendingNgoActivities).mockResolvedValue([{ activity: activity(), ngoUserId: 1, organizationName: "Hope", applicationUnderReview: true }] as never);
    vi.mocked(approveNgoActivity).mockResolvedValue(activity({ status: "APPROVED" }) as never);
    render(<NgoActivityModerationPanel />);
    expect(await screen.findByTestId("activity-application-label")).toHaveTextContent("NGO application under review");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(approveNgoActivity).toHaveBeenCalledWith(3));
  });
});

describe("Cover, logo and photos", () => {
  const manage = { slug: "hope", links: [], representatives: [], requests: [], photos: [{ id: 5, type: "COVER", url: "https://x.test/cover.jpg" }] } as never;
  const png = new File(["x"], "new.png", { type: "image/png" });

  it("stages a replacement; only Save changes uploads it, then the page reloads", async () => {
    const saved = { ...(manage as object), photos: [{ id: 6, type: "COVER", url: "https://x.test/new.jpg" }] };
    vi.mocked(uploadNgoProfilePhoto).mockResolvedValue(saved as never);
    const onSaved = vi.fn(); const onClose = vi.fn();
    render(<OwnerEditDialog kind="photos" manage={manage} onSaved={onSaved} onClose={onClose} />);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Add organisation photo/ }));
    fireEvent.change(screen.getByTestId("owner-photo-input"), { target: { files: [png] } });
    expect(uploadNgoProfilePhoto).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(uploadNgoProfilePhoto).toHaveBeenCalledWith("office_photo", png));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved, true));
    expect(onClose).toHaveBeenCalled();
    expect(removeNgoProfilePhoto).not.toHaveBeenCalled();
  });

  it("closing with unsaved changes asks first", () => {
    const onClose = vi.fn();
    render(<OwnerEditDialog kind="photos" manage={manage} onSaved={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /Add organisation photo/ }));
    fireEvent.change(screen.getByTestId("owner-photo-input"), { target: { files: [png] } });
    fireEvent.click(screen.getAllByRole("button", { name: "Close" }).at(-1)!);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("Discard changes?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalled();
    expect(uploadNgoProfilePhoto).not.toHaveBeenCalled();
  });
});

describe("A past activity the admin refused", () => {
  const refused = () => activity({ status: "REJECTED", rejectionReason: "Blur the children's faces" });

  it("is amber with the reason and Edit and resubmit, in the wizard grid and on /profile", async () => {
    vi.mocked(getMyNgoActivities).mockResolvedValue([refused()] as never);
    vi.mocked(updateNgoActivity).mockResolvedValue(activity({ status: "PENDING", rejectionReason: "Blur the children's faces", title: "Blanket drive, blurred" }) as never);
    render(<PastActivitySection required />);
    const card = await screen.findByTestId("past-activity-card");
    expect(card).toHaveAttribute("data-rejected", "true");
    expect(within(card).getByTestId("activity-rejected")).toHaveTextContent("Not approved: Blur the children's faces");
    fireEvent.click(within(card).getByRole("button", { name: "Edit and resubmit Blanket drive" }));
    const form = screen.getByTestId("past-activity-form");
    expect(within(form).getByLabelText(/Activity name/)).toHaveValue("Blanket drive");
    fireEvent.change(within(form).getByLabelText(/Activity name/), { target: { value: "Blanket drive, blurred" } });
    fireEvent.click(within(form).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updateNgoActivity).toHaveBeenCalledWith(3, expect.objectContaining({ title: "Blanket drive, blurred" })));
    expect(await screen.findByText("Under review")).toBeInTheDocument();
    expect(screen.queryByTestId("activity-rejected")).toBeNull();
  });

  it("the notification link (?activity=<id>) opens that activity's edit form", async () => {
    window.history.replaceState(null, "", "/profile?activity=3");
    vi.mocked(getMyNgoActivities).mockResolvedValue([refused()] as never);
    render(<PastActivitySection carousel />);
    expect(await screen.findByTestId("past-activity-form")).toBeInTheDocument();
    expect(screen.getAllByTestId("activity-rejected").length).toBeGreaterThan(0);
    window.history.replaceState(null, "", "/");
  });

  it("the admin queue labels a fixed one Resubmitted", async () => {
    vi.mocked(getPendingNgoActivities).mockResolvedValue([{ activity: activity({ rejectionReason: "Blur" }), ngoUserId: 1, organizationName: "Hope", resubmitted: true }] as never);
    render(<NgoActivityModerationPanel />);
    expect(await screen.findByTestId("activity-resubmitted")).toHaveTextContent("Resubmitted");
  });
});
