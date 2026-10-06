import { beforeEach, describe, expect, it, vi } from "vitest";
import { configure, fireEvent, render, screen, waitFor } from "@testing-library/react";

// Each step change waits out a card exit animation; 1s is too tight under a parallel run.
configure({ asyncUtilTimeout: 5000 });

/**
 * The drive give wizard, run through to submit. Asserts the exact request bodies match
 * the drive DTO (UpdateDriveOfferItemRequest; the submit body), that Back goes to the
 * previous step (and scrolls up), that Save & exit saves and leaves, and that server
 * field errors appear next to their fields.
 */

const api = vi.hoisted(() => ({
  updateNgoDriveOfferItem: vi.fn(),
  submitNgoDriveOffer: vi.fn(),
  uploadNgoDriveOfferMedia: vi.fn(),
  deleteNgoDriveOfferMedia: vi.fn(),
  getNgoDrive: vi.fn(),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));
vi.mock("@/app/actions/locations", () => ({ detectLocationFromServer: vi.fn() }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (k: string) => k }));
vi.mock("@/lib/toast", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "t"), dismiss: vi.fn() }) }));

import { NgoDriveOfferWizard } from "./NgoDriveOfferWizard";
import { driveOfferModelFrom, serializeDriveOffer } from "../driveOfferSerializer";

/** The exact JSON the wizard sends for the form filled below (also used by the backend test and walk.py). */
export const WIZARD_ITEM_DETAILS = {
  quantity: 3, condition: "Like New", approximateAge: "1 year", knownDefects: "None", notesForNgo: "Washed and folded",
  matchesRequirements: true, handoverMethod: "DROP_OFF", pickupCity: "Pune", pickupLocality: "Kothrud", pickupPincode: "411038",
};
const DTO_KEYS = ["quantity", "condition", "approximateAge", "knownDefects", "notesForNgo", "matchesRequirements",
  "handoverMethod", "pickupCity", "pickupLocality", "pickupPincode"].sort();

const draftOffer = {
  id: 9, driveId: 5, status: "DRAFT", quantity: 1, driveTitle: "Winter blankets", ngoName: "Hope Trust",
  media: [
    { id: 1, mediaUrl: "https://cdn.test/ngo-drive-offers/9/a.png", mediaType: "IMAGE", status: "APPROVED", sortOrder: 0 },
    { id: 2, mediaUrl: "https://cdn.test/ngo-drive-offers/9/b.png", mediaType: "IMAGE", status: "APPROVED", sortOrder: 1 },
  ],
};

const heading = () => screen.getAllByRole("heading").map(h => h.textContent).join(" | ");
const field = (c: HTMLElement, name: string) => c.querySelector(`[name="${name}"]`) as HTMLInputElement;
const clickLast = (name: RegExp) => { const b = screen.getAllByRole("button", { name }); fireEvent.click(b[b.length - 1]); };

function renderWizard(onSaveExit = vi.fn(), onSubmitted = vi.fn()) {
  const r = render(
    <NgoDriveOfferWizard offerId={9} offer={draftOffer as never} driveId={5} ngoName="Hope Trust" driveUnit="PIECES"
      initialQuantityReceived={0} initialQuantityPledged={0} requestTitle="Winter blankets" requestedQuantity={50}
      stillNeededQuantity={50} adminNote={null} onSubmitted={onSubmitted} onExit={vi.fn()} onSaveExit={onSaveExit} />,
  );
  return { ...r, onSaveExit, onSubmitted };
}

/** Goes Back (if needed) to Details: the wizard opens on the first incomplete step. */
const ORDER = [/Add photos|Photos/i, /Tell us about the item/, /Condition & fit/, /Pickup & delivery/];
async function toDetails() {
  await waitFor(() => expect(heading()).toMatch(/Tell us about the item|Condition & fit|Pickup & delivery/));
  while (!/Tell us about the item/.test(heading())) {
    const at = ORDER.findIndex(re => re.test(heading()));
    clickLast(/^back$/i);
    await waitFor(() => expect(heading()).toMatch(ORDER[at - 1]));   // one step at a time
  }
}

/** Fill every step from Details to Review. */
async function fillToReview(c: HTMLElement) {
  await toDetails();
  fireEvent.change(field(c, "quantity"), { target: { value: "3" } });
  fireEvent.change(field(c, "approximateAge"), { target: { value: "1 year" } });
  fireEvent.change(field(c, "accessoriesIncluded"), { target: { value: "Washed and folded" } });
  clickLast(/^continue$/i);
  await waitFor(() => expect(heading()).toMatch(/Condition & fit/));
  fireEvent.change(field(c, "condition"), { target: { value: "Like New" } });
  clickLast(/^continue$/i);
  await waitFor(() => expect(heading()).toMatch(/Pickup & delivery/));
  fireEvent.change(field(c, "pickupCity"), { target: { value: "Pune" } });
  fireEvent.change(field(c, "pickupPincode"), { target: { value: "411038" } });
  fireEvent.change(field(c, "pickupLocality"), { target: { value: "Kothrud" } });
  fireEvent.click(field(c, "donorDropOffAvailable"));
  clickLast(/^continue$/i);
  await waitFor(() => expect(screen.getByRole("button", { name: /Send offer to the NGO/ })).toBeInTheDocument());
  // The Review card mounts after the previous card's exit animation.
  await waitFor(() => expect(c.querySelector('input[name="declarationsConfirmed"]')).not.toBeNull());
}

beforeEach(() => {
  Object.values(api).forEach(fn => fn.mockReset());
  api.updateNgoDriveOfferItem.mockResolvedValue({});
  api.getNgoDrive.mockResolvedValue({ quantityReceived: 0, quantityPledged: 0 });
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as never;
});

// These walk five animated steps; the 5s default is too tight under a parallel run.
describe("NgoDriveOfferWizard request bodies", { timeout: 20000 }, () => {
  it("sends exactly the drive DTO on every save and the declarations on submit, then shows success", async () => {
    const { container, onSubmitted } = renderWizard();
    await fillToReview(container);
    // Every PATCH body has exactly the DTO's fields, no donation-only ones.
    for (const [, body] of api.updateNgoDriveOfferItem.mock.calls) {
      expect(Object.keys(body).filter(k => k !== "quantity").sort()).toEqual(DTO_KEYS.filter(k => k !== "quantity"));
      expect(body).not.toHaveProperty("accessoriesIncluded");
      expect(body).not.toHaveProperty("donorDropOffAvailable");
    }
    fireEvent.click(container.querySelector('input[name="declarationsConfirmed"]')!);
    api.submitNgoDriveOffer.mockResolvedValue({ id: 9, quantity: 3, status: "SUBMITTED" });
    fireEvent.click(screen.getByRole("button", { name: /Send offer to the NGO/ }));
    await waitFor(() => expect(api.submitNgoDriveOffer).toHaveBeenCalledWith(9));
    // The last save before submit carries the declaration as matchesRequirements=true.
    const last = api.updateNgoDriveOfferItem.mock.calls.at(-1)!;
    expect(last).toEqual([9, WIZARD_ITEM_DETAILS]);
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(expect.objectContaining({ quantity: 3 })));
  });

  it("Back goes to the previous step and scrolls up; Save & exit saves and leaves", async () => {
    const { container, onSaveExit } = renderWizard();
    await fillToReview(container);
    clickLast(/^back$/i);
    await waitFor(() => expect(heading()).toMatch(/Pickup & delivery/));
    expect(window.scrollTo).toHaveBeenCalled();
    await waitFor(() => expect(field(container, "pickupLocality")).not.toBeNull());
    api.updateNgoDriveOfferItem.mockClear();
    fireEvent.change(field(container, "pickupLocality"), { target: { value: "Kothrud East" } });
    clickLast(/save & exit/i);
    await waitFor(() => expect(onSaveExit).toHaveBeenCalled());
    expect(api.updateNgoDriveOfferItem).toHaveBeenLastCalledWith(9, { ...WIZARD_ITEM_DETAILS, pickupLocality: "Kothrud East", matchesRequirements: false });
  });

  it("Save & exit leaves even when nothing changed", async () => {
    const { onSaveExit } = renderWizard();
    await toDetails();
    clickLast(/save & exit/i);
    await waitFor(() => expect(onSaveExit).toHaveBeenCalled());
  });

  it("server field errors from submit are shown next to their fields, not a generic message", async () => {
    const { ApiError } = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
    const { container } = renderWizard();
    await fillToReview(container);
    fireEvent.click(container.querySelector('input[name="declarationsConfirmed"]')!);
    api.submitNgoDriveOffer.mockRejectedValue(new ApiError(400, "Some details need fixing. Check the highlighted fields.",
      { fieldErrors: [{ field: "declarationsConfirmed", message: "Confirm the item matches what the drive asks for" }] }));
    fireEvent.click(screen.getByRole("button", { name: /Send offer to the NGO/ }));
    expect((await screen.findAllByText(/Confirm the item matches what the drive asks for/)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/We couldn't read that request/)).toBeNull();
  });

  it("a failed save on Save & exit shows the real error and stays", async () => {
    const { ApiError } = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
    const { toast } = await import("@/lib/toast");
    const { container, onSaveExit } = renderWizard();
    await toDetails();
    api.updateNgoDriveOfferItem.mockRejectedValue(new ApiError(409, "That change conflicts with the current state.",
      { fieldErrors: [{ field: "quantity", message: "Only 2 still needed" }] }));
    fireEvent.change(field(container, "quantity"), { target: { value: "3" } });
    clickLast(/save & exit/i);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Only 2 still needed"));
    expect(onSaveExit).not.toHaveBeenCalled();
    expect((await screen.findAllByText("Only 2 still needed")).length).toBeGreaterThan(0); // next to the field
  });
});

describe("drive offer mapping", () => {
  it("a saved draft reopens with all its data and serializes back to the same body", () => {
    const saved = { ...draftOffer, ...WIZARD_ITEM_DETAILS, matchesRequirements: undefined } as never;
    const model = driveOfferModelFrom(saved);
    expect(model).toMatchObject({ quantity: "3", condition: "Like New", approximateAge: "1 year", hasKnownDefects: false,
      accessoriesIncluded: "Washed and folded", pickupCity: "Pune", pickupLocality: "Kothrud", pickupPincode: "411038", donorDropOffAvailable: true });
    expect(model.photos).toHaveLength(2);
    expect(serializeDriveOffer({ ...model, declarationsConfirmed: true }, { maxQuantity: 50 })).toEqual(WIZARD_ITEM_DETAILS);
  });

  it("NGO pickup maps to NGO_PICKUP and back", () => {
    const model = driveOfferModelFrom({ ...draftOffer, handoverMethod: "NGO_PICKUP" } as never);
    expect(model.donorDropOffAvailable).toBe(false);
    expect(serializeDriveOffer(model, { maxQuantity: 50 }).handoverMethod).toBe("NGO_PICKUP");
  });
});
