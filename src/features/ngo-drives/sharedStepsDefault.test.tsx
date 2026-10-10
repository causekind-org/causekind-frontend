import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OfferPhotosStep } from "@/features/donation-offer-wizard/steps/OfferPhotosStep";
import { OfferReviewStep } from "@/features/donation-offer-wizard/steps/OfferReviewStep";
import { emptyOfferModel } from "@/features/donation-offer-wizard/offerModel";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

/**
 * The drive give form added optional props to these shared steps. Without them, the
 * donor↔donee offer wizard must behave exactly as before: "Take photo" opens the
 * device camera input directly, and Review keeps its thumbnail strip and its
 * Pickup & delivery section.
 */
const originalClick = HTMLInputElement.prototype.click;
afterEach(() => { HTMLInputElement.prototype.click = originalClick; });

describe("shared offer steps without the drive-only props (donor↔donee flow)", () => {
  it("OfferPhotosStep: Take photo clicks the capture input, Choose photo the plain one", () => {
    const clicks: HTMLInputElement[] = [];
    HTMLInputElement.prototype.click = function (this: HTMLInputElement) { clicks.push(this); };
    render(<OfferPhotosStep photos={[]} screening={{ kind: "idle" }} onAddFiles={vi.fn()} onRetryPhoto={vi.fn()}
      onRemovePhoto={vi.fn()} onRescreen={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Take photo/ }));
    fireEvent.click(screen.getByRole("button", { name: /Choose photo/ }));
    expect(clicks.map(i => i.getAttribute("capture"))).toEqual(["environment", null]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("OfferReviewStep: small cropped thumbnail strip and the Pickup & delivery section", () => {
    const model = {
      ...emptyOfferModel, quantity: "2", pickupCity: "Pune", pickupLocality: "Kothrud", pickupPincode: "411038",
      photos: [{ id: "a", status: "uploaded", remoteUrl: "https://cdn.test/a.png" }, { id: "b", status: "uploaded", remoteUrl: "https://cdn.test/b.png" }],
    } as never;
    render(<OfferReviewStep model={model} errors={{}} requestTitle="School bags" compat={null}
      declarationsInvalidated={false} onChange={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText("Pickup & delivery")).toBeInTheDocument();
    expect(screen.getByText("Pune")).toBeInTheDocument();
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(2);
    imgs.forEach(img => expect(img.className).toContain("object-cover"));
    expect(screen.queryByRole("list", { name: "Your photos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Enlarge photo/ })).not.toBeInTheDocument();
  });
});
