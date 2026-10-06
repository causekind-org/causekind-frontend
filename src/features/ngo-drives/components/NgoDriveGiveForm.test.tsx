import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

configure({ asyncUtilTimeout: 5000 });

/**
 * The drive give form after the redesign: four steps (no Pickup & delivery), no
 * progress card, "Take photo" opens a camera (the phone's own, or a webcam window),
 * an optional video, a live "needs only N more" quantity message, and a Review that
 * shows the photos properly.
 */

const api = vi.hoisted(() => ({
  updateNgoDriveOfferItem: vi.fn(),
  submitNgoDriveOffer: vi.fn(),
  uploadNgoDriveOfferMedia: vi.fn(),
  deleteNgoDriveOfferMedia: vi.fn(),
  getNgoDrive: vi.fn(),
  getNgoDriveOfferVideoCapability: vi.fn(),
  createNgoDriveOfferVideoSlot: vi.fn(),
  finalizeNgoDriveOfferVideo: vi.fn(),
  getNgoDriveOfferVideoStatus: vi.fn(),
  getNgoDriveOfferVideoPlayback: vi.fn(),
  deleteNgoDriveOfferVideo: vi.fn(),
  uploadOfferVideoBytes: vi.fn(),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));
vi.mock("@/features/wizard-kit/videoPreflight", () => ({ videoPreflight: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock("@/lib/imageCompression", () => ({ compressDisplayPhoto: vi.fn(async (f: File) => f) }));
vi.mock("@/app/actions/locations", () => ({ detectLocationFromServer: vi.fn() }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (k: string) => k }));
vi.mock("@/lib/toast", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "t"), dismiss: vi.fn() }) }));

import { NgoDriveOfferWizard } from "./NgoDriveOfferWizard";

const photo = (id: number) => ({ id, mediaUrl: `https://cdn.test/ngo-drive-offers/9/${id}.png`, mediaType: "IMAGE", status: "APPROVED", sortOrder: id });
const emptyDraft = { id: 9, driveId: 5, status: "DRAFT", quantity: 1, driveTitle: "Winter blankets", ngoName: "Hope Trust", media: [] };
const withPhotos = { ...emptyDraft, quantity: null, media: [photo(1), photo(2)] };

const heading = () => screen.getAllByRole("heading").map(h => h.textContent).join(" | ");
const field = (c: HTMLElement, name: string) => c.querySelector(`[name="${name}"]`) as HTMLInputElement;
const clickLast = (name: RegExp) => { const b = screen.getAllByRole("button", { name }); fireEvent.click(b[b.length - 1]); };

function renderWizard(offer: unknown = emptyDraft, stillNeeded = 50) {
  return render(
    <NgoDriveOfferWizard offerId={9} offer={offer as never} driveId={5} ngoName="Hope Trust" driveUnit="PIECES"
      initialQuantityReceived={0} initialQuantityPledged={0} requestTitle="Winter blankets" requestedQuantity={50}
      stillNeededQuantity={stillNeeded} adminNote={null} onSubmitted={vi.fn()} onExit={vi.fn()} onSaveExit={vi.fn()} />,
  );
}

/** A draft with photos resumes past Details (quantity defaults to 1); step back to it. */
async function toDetails() {
  await waitFor(() => expect(heading()).toMatch(/Tell us about the item|Condition & fit/));
  if (/Condition & fit/.test(heading())) {
    clickLast(/^back$/i);
    await waitFor(() => expect(heading()).toMatch(/Tell us about the item/));
  }
}

let inputClicks: HTMLInputElement[] = [];
const originalClick = HTMLInputElement.prototype.click;

beforeEach(() => {
  Object.values(api).forEach(fn => fn.mockReset());
  api.updateNgoDriveOfferItem.mockResolvedValue({});
  api.getNgoDrive.mockResolvedValue({ quantityReceived: 0, quantityPledged: 0 });
  api.getNgoDriveOfferVideoCapability.mockResolvedValue({ available: true, maxBytes: 50 * 1024 * 1024, maxSeconds: 30, allowedContainers: ["mp4", "webm"], maxWidth: 1920, maxHeight: 1080 });
  api.uploadNgoDriveOfferMedia.mockImplementation(async () => ({ ...emptyDraft, media: [photo(1)] }));
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as never;
  inputClicks = [];
  HTMLInputElement.prototype.click = function (this: HTMLInputElement) { inputClicks.push(this); };
});
afterEach(() => {
  HTMLInputElement.prototype.click = originalClick;
  vi.unstubAllGlobals();
  // jsdom has no matchMedia by default; tests that add one remove it here.
  delete (window as { matchMedia?: unknown }).matchMedia;
});

describe("drive give form: four steps, no pickup, no progress card", { timeout: 20000 }, () => {
  it("shows four steps and no progress card", async () => {
    renderWizard();
    await waitFor(() => expect(heading()).toMatch(/Show the item/));
    expect(screen.getByText("Four short steps. We save as you go.")).toBeInTheDocument();
    expect(screen.getAllByText("Step 1 of 4").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Pickup & delivery/)).not.toBeInTheDocument();
    expect(screen.queryByText(/still needed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/on the way/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/received/i)).not.toBeInTheDocument();
  });
});

describe("drive give form: photos", { timeout: 20000 }, () => {
  it("'Choose photo' opens the file picker (no camera)", async () => {
    renderWizard();
    await waitFor(() => expect(heading()).toMatch(/Show the item/));
    fireEvent.click(screen.getByRole("button", { name: /Choose photo/ }));
    expect(inputClicks).toHaveLength(1);
    expect(inputClicks[0].hasAttribute("capture")).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("'Take photo' on a phone opens the rear camera input", async () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes("coarse"), media: q, addEventListener() {}, removeEventListener() {} })) as never;
    renderWizard();
    await waitFor(() => expect(heading()).toMatch(/Show the item/));
    fireEvent.click(screen.getByRole("button", { name: /Take photo/ }));
    expect(inputClicks).toHaveLength(1);
    expect(inputClicks[0].getAttribute("capture")).toBe("environment");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("'Take photo' on a laptop opens a webcam window: capture, retake, use", async () => {
    const stop = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, userAgent: "Mozilla/5.0 (Windows NT 10.0)", mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined) as never;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() })) as never;
    HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) { cb(new Blob(["jpeg"], { type: "image/jpeg" })); };
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();

    renderWizard();
    await waitFor(() => expect(heading()).toMatch(/Show the item/));
    fireEvent.click(screen.getByRole("button", { name: /Take photo/ }));
    expect(inputClicks).toHaveLength(0);                            // not the file picker
    const dialog = await screen.findByRole("dialog", { name: "Take a photo" });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Capture/ }));
    expect(within(dialog).getByRole("img", { name: "Captured photo" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /Retake/ }));
    fireEvent.click(await within(dialog).findByRole("button", { name: /Capture/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /Use photo/ }));
    await waitFor(() => expect(api.uploadNgoDriveOfferMedia).toHaveBeenCalled());
    const form = api.uploadNgoDriveOfferMedia.mock.calls[0][1] as FormData;
    const sent = Array.from(form.values()).find(v => v instanceof File) as File;
    expect(sent.name).toMatch(/^camera-\d+\.jpg$/);
    expect(sent.type).toBe("image/jpeg");
    expect(stop).toHaveBeenCalled();                                // camera released
  });

  it.each([
    ["NotAllowedError", /Camera access was blocked/],
    ["NotFoundError", /No camera was found/],
  ])("'Take photo' explains a %s", async (name, message) => {
    vi.stubGlobal("navigator", { ...navigator, userAgent: "Mozilla/5.0 (Windows NT 10.0)", mediaDevices: {
      getUserMedia: vi.fn().mockRejectedValue(Object.assign(new Error("no"), { name })) } });
    renderWizard();
    await waitFor(() => expect(heading()).toMatch(/Show the item/));
    fireEvent.click(screen.getByRole("button", { name: /Take photo/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("an optional video uploads through the drive-offer endpoints", async () => {
    api.createNgoDriveOfferVideoSlot.mockResolvedValue({ mediaId: 77, uploadUrl: "https://s3.test/put", contentType: "video/mp4", maxBytes: 1, expiresAt: "" });
    api.uploadOfferVideoBytes.mockResolvedValue(undefined);
    api.finalizeNgoDriveOfferVideo.mockResolvedValue({ mediaId: 77, status: "QUARANTINED", moderationCode: null, durationMs: null, playbackUrl: null, available: true });
    api.getNgoDriveOfferVideoStatus.mockResolvedValue({ mediaId: 77, status: "APPROVED", moderationCode: null, durationMs: 9000, playbackUrl: null, available: true });
    const { container } = renderWizard();
    await waitFor(() => expect(screen.getByRole("button", { name: /Choose video/ })).toBeInTheDocument());
    const input = container.querySelector('input[type="file"][accept*="video"], input[type="file"][accept*="mp4"]') as HTMLInputElement;
    const clip = new File([new Uint8Array(2048)], "item.mp4", { type: "video/mp4" });
    await act(async () => { fireEvent.change(input, { target: { files: [clip] } }); });
    await waitFor(() => expect(api.createNgoDriveOfferVideoSlot).toHaveBeenCalledWith(9, 2048, "video/mp4"));
    await waitFor(() => expect(api.finalizeNgoDriveOfferVideo).toHaveBeenCalledWith(9, 77));
    expect(api.uploadOfferVideoBytes).toHaveBeenCalled();
  });
});

describe("drive give form: quantity", { timeout: 20000 }, () => {
  it("over what the drive still needs: red message as you type, and Continue stays put", async () => {
    const { container } = renderWizard(withPhotos, 5);
    await toDetails();
    fireEvent.change(field(container, "quantity"), { target: { value: "7" } });
    expect((await screen.findAllByText("This drive needs only 5 more pieces.")).length).toBeGreaterThan(0);
    expect(field(container, "quantity").getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(field(container, "approximateAge"), { target: { value: "1 year" } });
    clickLast(/^continue$/i);
    await new Promise(r => setTimeout(r, 300));
    expect(heading()).toMatch(/Tell us about the item/);
    fireEvent.change(field(container, "quantity"), { target: { value: "5" } });
    await waitFor(() => expect(screen.queryByText("This drive needs only 5 more pieces.")).not.toBeInTheDocument());
    clickLast(/^continue$/i);
    await waitFor(() => expect(heading()).toMatch(/Condition & fit/));
  });
});

describe("drive give form: review", { timeout: 20000 }, () => {
  async function toReview(offer: unknown) {
    const { container } = renderWizard(offer);
    await toDetails();
    fireEvent.change(field(container, "quantity"), { target: { value: "3" } });
    fireEvent.change(field(container, "approximateAge"), { target: { value: "1 year" } });
    clickLast(/^continue$/i);
    await waitFor(() => expect(heading()).toMatch(/Condition & fit/));
    fireEvent.change(field(container, "condition"), { target: { value: "Like New" } });
    clickLast(/^continue$/i);
    await waitFor(() => expect(heading()).toMatch(/Review your offer/));
    return container;
  }

  it("shows the photos as a grid, uncropped, and enlarges one on click; no pickup section", async () => {
    await toReview(withPhotos);
    const grid = await screen.findByRole("list", { name: "Your photos" });
    const imgs = within(grid).getAllByRole("img");
    expect(imgs).toHaveLength(2);
    imgs.forEach(img => expect(img.className).toContain("object-contain"));
    expect(screen.queryByText(/Pickup & delivery/)).not.toBeInTheDocument();
    fireEvent.click(within(grid).getByRole("button", { name: "Enlarge photo 2" }));
    const dlg = screen.getByRole("dialog", { name: "Photo" });
    expect(within(dlg).getByRole("img")).toHaveAttribute("src", photo(2).mediaUrl);
    fireEvent.click(within(dlg).getByRole("button", { name: "Close photo" }));
    expect(screen.queryByRole("dialog", { name: "Photo" })).not.toBeInTheDocument();
  });

  it("shows the video when one was added", async () => {
    const offer = { ...withPhotos, media: [...withPhotos.media,
      { id: 50, mediaUrl: "", mediaType: "VIDEO", status: "APPROVED", sortOrder: 999, playbackUrl: "https://s3.test/clean.mp4", durationMs: 9000 }] };
    await toReview(offer);
    const video = (await screen.findByTestId("review-video")).querySelector("video")!;
    expect(video).toHaveAttribute("src", "https://s3.test/clean.mp4");
  });
});
