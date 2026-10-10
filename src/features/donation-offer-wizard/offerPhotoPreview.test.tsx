import { describe, expect, it, vi } from "vitest";
import { configure, fireEvent, render, waitFor } from "@testing-library/react";

configure({ asyncUtilTimeout: 5000 });

/**
 * A photo picked on a fresh offer (no draft yet) must stay on screen as a
 * thumbnail while the lazy draft is created and the upload runs (2026-10-08:
 * the list emptied itself and no preview ever showed).
 */
const api = vi.hoisted(() => ({
  updateOfferItemDetails: vi.fn(),
  uploadOfferMedia: vi.fn(),
  deleteOfferMedia: vi.fn(),
  analyzeOfferImages: vi.fn(),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));
vi.mock("@/app/actions/locations", () => ({ detectLocationFromServer: vi.fn() }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (k: string) => k }));
vi.mock("@/lib/toast", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "t"), dismiss: vi.fn() }) }));
vi.mock("@/lib/imageCompression", () => ({ compressDisplayPhoto: async (f: File) => f }));

import { DonationOfferWizard } from "./DonationOfferWizard";

const created = { id: 41, requestId: 7, flowType: "DIRECT_DONATION", status: "DRAFT", media: [] };

describe("offer photo preview", () => {
  it("keeps the picked photo visible while the lazy draft is created", async () => {
    globalThis.URL.createObjectURL = vi.fn(() => "blob:preview");
    globalThis.URL.revokeObjectURL = vi.fn();
    api.updateOfferItemDetails.mockResolvedValue(created);
    api.uploadOfferMedia.mockResolvedValue({ ...created, media: [{ id: 3, mediaUrl: "https://cdn.test/a.jpg", mediaType: "IMAGE", status: "PENDING", sortOrder: 0 }] });
    api.analyzeOfferImages.mockResolvedValue({ aiAvailable: false });
    const createOffer = vi.fn(async () => created as never);

    const { container } = render(
      <DonationOfferWizard offerId={null} offer={null} flowType={"DIRECT_DONATION" as never} createOffer={createOffer}
        requestTitle="Pens" requestedQuantity={2} stillNeededQuantity={2} adminNote={null}
        onSubmitted={vi.fn()} onExit={vi.fn()} onSaveExit={vi.fn()} />,
    );

    const inputs = container.querySelectorAll('input[type="file"]');
    const gallery = inputs[1] as HTMLInputElement;
    const file = new File([new Uint8Array([255, 216, 255])], "a.jpg", { type: "image/jpeg" });
    fireEvent.change(gallery, { target: { files: [file] } });

    await waitFor(() => expect(createOffer).toHaveBeenCalled());
    await waitFor(() => expect(api.uploadOfferMedia).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 300));
    expect(container.querySelectorAll("li.aspect-square").length).toBeGreaterThan(0);
  });
  it("keeps the picked photo visible on a resumed draft", async () => {
    globalThis.URL.createObjectURL = vi.fn(() => "blob:preview");
    globalThis.URL.revokeObjectURL = vi.fn();
    const resumed = { ...created, itemDetails: { title: "Pens", description: "Blue pens", quantity: 2, category: "EDUCATION" } };
    api.updateOfferItemDetails.mockResolvedValue(resumed);
    api.uploadOfferMedia.mockResolvedValue({ ...resumed, media: [{ id: 3, mediaUrl: "https://cdn.test/a.jpg", mediaType: "IMAGE", status: "PENDING", sortOrder: 0 }] });
    api.analyzeOfferImages.mockResolvedValue({ aiAvailable: false });
    const { container } = render(
      <DonationOfferWizard offerId={41} offer={resumed as never} createOffer={vi.fn(async () => resumed as never)}
        requestTitle="Pens" requestedQuantity={2} stillNeededQuantity={2} adminNote={null}
        onSubmitted={vi.fn()} onExit={vi.fn()} onSaveExit={vi.fn()} />,
    );
    await waitFor(() => expect(container.querySelectorAll('input[type="file"]').length).toBeGreaterThan(1));
    const gallery = container.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    fireEvent.change(gallery, { target: { files: [new File([new Uint8Array([255, 216, 255])], "a.jpg", { type: "image/jpeg" })] } });
    await waitFor(() => expect(api.uploadOfferMedia).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 300));
    expect(container.querySelectorAll("li.aspect-square").length).toBeGreaterThan(0);
  });
  it("adds a new tile next to photos already on the offer", async () => {
    globalThis.URL.createObjectURL = vi.fn(() => "blob:preview2");
    globalThis.URL.revokeObjectURL = vi.fn();
    const m1 = { id: 1, mediaUrl: "https://cdn.test/1.jpg", mediaType: "IMAGE", status: "APPROVED", sortOrder: 0 };
    const resumed = { ...created, media: [m1], itemDetails: { title: "Pens", description: "Blue pens", quantity: 2, category: "EDUCATION" } };
    api.updateOfferItemDetails.mockResolvedValue(resumed);
    api.uploadOfferMedia.mockResolvedValue({ ...resumed, media: [m1, { id: 2, mediaUrl: "https://cdn.test/2.jpg", mediaType: "IMAGE", status: "PENDING", sortOrder: 1 }] });
    api.analyzeOfferImages.mockResolvedValue({ aiAvailable: false });
    const { container } = render(
      <DonationOfferWizard offerId={41} offer={resumed as never} createOffer={vi.fn(async () => resumed as never)}
        requestTitle="Pens" requestedQuantity={2} stillNeededQuantity={2} adminNote={null}
        onSubmitted={vi.fn()} onExit={vi.fn()} onSaveExit={vi.fn()} />,
    );
    await waitFor(() => expect(container.querySelectorAll("li.aspect-square").length).toBe(1));
    const gallery = container.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
    fireEvent.change(gallery, { target: { files: [new File([new Uint8Array([255, 216, 255])], "b.jpg", { type: "image/jpeg" })] } });
    await waitFor(() => expect(api.uploadOfferMedia).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 300));
    expect(container.querySelectorAll("li.aspect-square").length).toBe(2);
  });
});
