import { describe, expect, it, vi, beforeEach } from "vitest";
import { useState } from "react";
import { configure, fireEvent, render, screen, waitFor } from "@testing-library/react";

configure({ asyncUtilTimeout: 5000 });

/**
 * Drive location and pickup radius: the NGO's "Where is this drive?" step, the
 * donor's "Where are the items?" step (inside the radius → continue; outside →
 * dialog → drop-off), the handover hiding NGO pickup, and the green give form.
 */

const api = vi.hoisted(() => ({
  saveNgoDriveOfferLocation: vi.fn(),
  updateNgoDriveOfferItem: vi.fn(),
  submitNgoDriveOffer: vi.fn(),
  getNgoDriveOfferVideoCapability: vi.fn().mockResolvedValue({ enabled: false }),
  scheduleNgoDriveOfferHandover: vi.fn(),
  rescheduleNgoDriveOfferHandover: vi.fn(),
}));
const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "t"), dismiss: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));
vi.mock("@/lib/toast", () => ({ toast: toastMock }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (k: string) => k }));
vi.mock("@/app/actions/locations", () => ({ detectLocationFromServer: vi.fn() }));
vi.mock("@/hooks/useLocations", () => ({
  useLocations: () => ({ countries: [{ value: "IN", label: "India" }], states: [{ value: "MH", label: "Maharashtra" }], cities: [] }),
}));
// The map stands in as a button; the pin lookup answers with Kothrud, Pune.
vi.mock("@/components/LocationPinPicker", () => ({
  LocationPinPicker: ({ onPick, tone }: { onPick: (lat: number, lng: number) => void; tone?: string }) => (
    <button type="button" data-tone={tone} onClick={() => onPick(18.5074, 73.8077)}>tap map</button>
  ),
}));
vi.mock("@/hooks/usePinAddress", () => ({
  usePinAddress: () => ({
    running: false, error: null, whenIdle: async () => {},
    geocodeTyped: async () => null,
    lookup: (_lat: number, _lng: number, onFound: (a: Record<string, string>) => void) =>
      onFound({ countryIso: "IN", stateIso: "MH", city: "Pune", locality: "Kothrud", pincode: "411038" }),
  }),
}));

import { DriveLocationStep, radiusKm } from "./DriveLocationStep";
import { NgoDriveOfferWizard } from "./NgoDriveOfferWizard";
import { LocationStep } from "@/features/item-listing-wizard/steps/LocationStep";
import type { LocationFields } from "@/hooks/useLocationPinHandlers";

beforeEach(() => { vi.clearAllMocks(); });

describe("NGO drive form step 1: where is this drive?", () => {
  function Harness() {
    const [choice, setChoice] = useState("10");
    const [custom, setCustom] = useState("");
    const model: LocationFields = { countryIso: "IN", stateIso: "MH", city: "Pune", locality: "", pincode: "411005" };
    return (
      <>
        <DriveLocationStep model={model} errors={{}} lookup={{ running: false, error: null }} profileCenter={null}
          onChange={vi.fn()} onPin={vi.fn()} onGeocodeTyped={vi.fn()}
          radiusChoice={choice} customRadius={custom} onRadiusChoice={setChoice} onCustomRadius={setCustom} />
        <output data-testid="radius">{String(radiusKm(choice, custom))}</output>
      </>
    );
  }

  it("offers 10/20/30/50/100 km or a custom distance from 1 to 500 km", () => {
    render(<Harness />);
    expect(screen.getByText("Where is this drive?")).toBeInTheDocument();
    expect(screen.getByText("Donors near this place will see that you can pick up their items.")).toBeInTheDocument();
    expect(screen.getByText(/You will pick up items from donors within this distance/)).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map(r => r.textContent)).toEqual(["10 km", "20 km", "30 km", "50 km", "100 km", "Custom"]);
    fireEvent.click(screen.getByRole("radio", { name: "50 km" }));
    expect(screen.getByRole("radio", { name: "50 km" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("radius").textContent).toBe("50");
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    const input = screen.getByLabelText("Custom pickup distance in km");
    fireEvent.change(input, { target: { value: "75" } });
    expect(screen.getByTestId("radius").textContent).toBe("75");
    fireEvent.change(input, { target: { value: "501" } });
    expect(screen.getByTestId("radius").textContent).toBe("null");
    expect(radiusKm("custom", "0")).toBeNull();
    expect(radiusKm("custom", "2.5")).toBeNull();
  });
});

describe("donor give form step 1: where are the items?", { timeout: 20000 }, () => {
  const draft = {
    id: 9, driveId: 5, status: "DRAFT", quantity: 1, driveTitle: "Winter blankets", ngoName: "Hope Trust", media: [],
    pickupRadiusKm: 10, driveLocationArea: "Shivajinagar", driveLocationCity: "Pune",
  };
  const renderWizard = (extra: Record<string, unknown> = {}) => render(
    <NgoDriveOfferWizard {...extra} offerId={9} offer={draft as never} driveId={5} ngoName="Hope Trust" driveUnit="PIECES"
      initialQuantityReceived={0} initialQuantityPledged={0} requestTitle="Winter blankets" requestedQuantity={50}
      stillNeededQuantity={50} adminNote={null} onSubmitted={vi.fn()} onExit={vi.fn()} onSaveExit={vi.fn()} />,
  );
  const heading = () => screen.getAllByRole("heading", { level: 1 }).map(h => h.textContent).join(" ");
  const clickContinue = () => fireEvent.click(screen.getAllByRole("button", { name: /^continue/i }).at(-1)!);

  it("is step 1 of 5 and the form is NGO green", () => {
    renderWizard();
    expect(heading()).toMatch(/Where are the items\?/);
    expect(screen.getAllByText("Step 1 of 5").length).toBeGreaterThan(0);
    expect(screen.getByTestId("drive-give-wizard")).toHaveAttribute("data-ck-role-theme", "ngo");
  });

  it("inside the radius: saves the location and continues to the photos", async () => {
    api.saveNgoDriveOfferLocation.mockResolvedValue({ ...draft, distanceKm: 4.6, dropOffOnly: false });
    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "tap map" }));
    clickContinue();
    await waitFor(() => expect(heading()).toMatch(/Show the item/));
    expect(api.saveNgoDriveOfferLocation).toHaveBeenCalledWith(9, expect.objectContaining({
      country: "IN", state: "MH", city: "Pune", locality: "Kothrud", pincode: "411038", latitude: 18.5074, longitude: 73.8077,
    }));
    expect(toastMock.success).toHaveBeenCalledWith("You're within the NGO's pickup area. You can choose pickup or drop-off later.");
    expect(screen.queryByTestId("drive-outside-dialog")).not.toBeInTheDocument();
  });

  it("outside the radius (server check): asks whether to still give; Yes continues with drop-off", async () => {
    api.saveNgoDriveOfferLocation.mockResolvedValue({ ...draft, distanceKm: 120.4, dropOffOnly: true, handoverMethod: "DROP_OFF" });
    const onDecline = vi.fn();
    renderWizard({ onDeclineOutside: onDecline });
    fireEvent.click(screen.getByRole("button", { name: "tap map" }));
    clickContinue();
    const dialog = await screen.findByTestId("drive-outside-dialog");
    expect(dialog).toHaveTextContent("You are 120 km away, outside this NGO's pickup radius of 10 km.");
    expect(dialog).toHaveTextContent("Do you still want to give to this drive?");
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    clickContinue();
    fireEvent.click(await screen.findByRole("button", { name: "Yes, continue with drop-off" }));
    await waitFor(() => expect(heading()).toMatch(/Show the item/));
    expect(api.saveNgoDriveOfferLocation).toHaveBeenCalledTimes(1); // unchanged location is not saved again
  });

  it("instant radius check: inside shows the green message", async () => {
    renderWizard({ drivePin: { lat: 18.53, lng: 73.85 }, drivePickupRadiusKm: 10 });
    fireEvent.click(screen.getByRole("button", { name: "tap map" }));
    expect(await screen.findByTestId("drive-radius-inside")).toHaveTextContent(/You are within the NGO's pickup radius \(\d+(\.\d)? km away\)\. The NGO can pick up your items\./);
    expect(screen.queryByTestId("drive-radius-outside")).not.toBeInTheDocument();
  });

  it("instant radius check: outside forces drop-off and asks; No leaves, Yes continues", async () => {
    api.saveNgoDriveOfferLocation.mockResolvedValue({ ...draft, distanceKm: 120, dropOffOnly: true });
    const onDecline = vi.fn();
    renderWizard({ drivePin: { lat: 19.076, lng: 72.8777 }, drivePickupRadiusKm: 10, onDeclineOutside: onDecline });
    fireEvent.click(screen.getByRole("button", { name: "tap map" }));
    const box = await screen.findByTestId("drive-radius-outside");
    expect(box).toHaveTextContent(/You are \d+ km away, outside this NGO's pickup radius of 10 km\. You will need to drop the items off at the NGO's address yourself\. The NGO will not pick them up\./);
    expect(box).toHaveTextContent("Drop-off only");
    expect(box).toHaveTextContent("Do you still want to give to this drive?");
    fireEvent.click(screen.getByTestId("drive-radius-no"));
    expect(onDecline).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("drive-radius-yes"));
    clickContinue();
    await waitFor(() => expect(heading()).toMatch(/Show the item/));
    expect(screen.queryByTestId("drive-outside-dialog")).not.toBeInTheDocument();
  });

  it("no location yet, or a drive without a pin: no radius message and no crash", () => {
    renderWizard({ drivePin: null, drivePickupRadiusKm: 10 });
    expect(screen.queryByTestId("drive-radius-inside")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "tap map" }));
    expect(screen.queryByTestId("drive-radius-inside")).not.toBeInTheDocument();
    expect(screen.queryByTestId("drive-radius-outside")).not.toBeInTheDocument();
  });
});

describe("the shared location step keeps the listing wizard's orange", () => {
  it("without a tone the pin is the donor (orange) tone; the give form uses NGO green", () => {
    const model: LocationFields = { countryIso: "IN", stateIso: "MH", city: "", locality: "", pincode: "" };
    const { unmount } = render(<LocationStep model={model} errors={{}} lookup={{ running: false, error: null }} profileCenter={null}
      onChange={vi.fn()} onPin={vi.fn()} onGeocodeTyped={vi.fn()} />);
    expect(screen.getByRole("button", { name: "tap map" })).toHaveAttribute("data-tone", "donor");
    unmount();
    render(<NgoDriveOfferWizard offerId={9} offer={{ id: 9, driveId: 5, status: "DRAFT", media: [] } as never} driveId={5}
      ngoName="Hope Trust" driveUnit="PIECES" initialQuantityReceived={0} initialQuantityPledged={0} requestTitle={null}
      requestedQuantity={50} onSubmitted={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "tap map" })).toHaveAttribute("data-tone", "ngo");
  });
});

describe("handover: drop-off only hides NGO pickup", () => {
  const base = {
    id: 99, driveId: 5, status: "NGO_ACCEPTED", quantity: 5, driveTitle: "Warm Winter Wear", driveUnit: "PIECES",
    driveAvailableDays: ["MON"], driveAvailableFrom: "10:00", driveAvailableTo: "17:00",
    donorCity: "Pune", donorLocality: "Kothrud", donorPincode: "411038",
  };
  it("outside the radius only drop-off is offered", async () => {
    const { DriveHandover } = await import("./DriveHandover");
    render(<DriveHandover role="DONOR" offer={{ ...base, dropOffOnly: true } as never} handover={null} onChanged={vi.fn()} />);
    expect(screen.getByText("I'll drop them off")).toBeInTheDocument();
    expect(screen.queryByText("The NGO picks them up")).not.toBeInTheDocument();
  });
  it("inside the radius both are offered and pickup is prefilled from step 1", async () => {
    const { DriveHandover } = await import("./DriveHandover");
    render(<DriveHandover role="DONOR" offer={{ ...base, dropOffOnly: false } as never} handover={null} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByText("The NGO picks them up"));
    expect(screen.getByDisplayValue("Kothrud, Pune, 411038")).toBeInTheDocument();
  });
});
