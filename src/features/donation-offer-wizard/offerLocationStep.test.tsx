import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { OfferLocationStep, type OfferLocationStatus } from "./steps/OfferLocationStep";
import { emptyOfferModel, type OfferModel } from "./offerModel";
import { validateOfferStep } from "./offerSchema";

const api = vi.hoisted(() => ({ checkDonorDistance: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));
vi.mock("@/app/actions/locations", () => ({
  detectLocationFromServer: vi.fn(async () => ({ ok: true, address: { country_code: "in", state: "Maharashtra", city: "Mumbai", suburb: "Andheri East", postcode: "400069" } })),
  resolveLocationFromGPS: vi.fn(async () => ({ stateIso: "MH", cityValue: "Mumbai" })),
  geocodeAddressFromServer: vi.fn(),
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

function Harness({ onDecline, onStatus }: { onDecline: () => void; onStatus: (s: OfferLocationStatus) => void }) {
  const [model, setModel] = useState<OfferModel>(emptyOfferModel);
  return (
    <>
      <OfferLocationStep
        requestId={7} model={model} errors={{}}
        onChange={(k, v) => setModel((m) => ({ ...m, [k]: v }))}
        onDecline={onDecline} onStatusChange={onStatus}
      />
      <output data-testid="dropoff">{String(model.donorDropOffAvailable)}</output>
    </>
  );
}

/** Offer wizard step 1: the donor's distance to the request decides what happens next. */
describe("offer step 1: check your location", () => {
  beforeEach(() => {
    vi.spyOn(navigator.geolocation, "getCurrentPosition").mockImplementation((ok: PositionCallback) =>
      ok({ coords: { latitude: 19.11, longitude: 72.87 } } as GeolocationPosition));
  });
  afterEach(() => vi.clearAllMocks());

  it("within 10 km: says so and lets the donor continue", async () => {
    api.checkDonorDistance.mockResolvedValue({ located: true, distanceKm: 3, radiusKm: 10, withinRadius: true, area: "Andheri East, Mumbai", approxLatitude: 19.1, approxLongitude: 72.9 });
    const onStatus = vi.fn();
    render(<Harness onDecline={vi.fn()} onStatus={onStatus} />);
    fireEvent.click(screen.getByRole("button", { name: /use my current location/i }));
    expect(await screen.findByText(/within the 10 km donation radius/)).toBeInTheDocument();
    expect(api.checkDonorDistance).toHaveBeenCalledWith(7, 19.11, 72.87);
    await waitFor(() => expect(onStatus).toHaveBeenLastCalledWith({ busy: false, needsConsent: false, ready: true }), { timeout: 3000 });
  });

  it("outside 10 km: shows the area and asks; yes records the promise to travel", async () => {
    api.checkDonorDistance.mockResolvedValue({ located: true, distanceKm: 24, radiusKm: 10, withinRadius: false, area: "Kandivali East, Mumbai", approxLatitude: 19.2, approxLongitude: 72.86 });
    const onStatus = vi.fn();
    render(<Harness onDecline={vi.fn()} onStatus={onStatus} />);
    fireEvent.click(screen.getByRole("button", { name: /use my current location/i }));
    expect(await screen.findByText(/Do you want to donate outside your 10 km area\?/)).toBeInTheDocument();
    expect(screen.getByText(/be ready to travel to Kandivali East, Mumbai/)).toBeInTheDocument();
    await waitFor(() => expect(onStatus).toHaveBeenLastCalledWith(expect.objectContaining({ needsConsent: true, ready: false })), { timeout: 3000 });

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /yes, i'll take it there/i })); });
    expect(screen.getByTestId("dropoff").textContent).toBe("true");
    expect(screen.getByText(/You've agreed to take the item to Kandivali East, Mumbai/)).toBeInTheDocument();
  });

  it("outside 10 km: no takes the donor back", async () => {
    api.checkDonorDistance.mockResolvedValue({ located: true, distanceKm: 24, radiusKm: 10, withinRadius: false, area: "Kandivali East, Mumbai", approxLatitude: 19.2, approxLongitude: 72.86 });
    const onDecline = vi.fn();
    render(<Harness onDecline={onDecline} onStatus={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /use my current location/i }));
    fireEvent.click(await screen.findByRole("button", { name: /no, go back/i }));
    expect(onDecline).toHaveBeenCalled();
  });
});

describe("offer details: how old is the item", () => {
  it("is required when the donor already owns the item, not for a purchase or an NGO drive", () => {
    const model = { ...emptyOfferModel, approximateAge: "" };
    expect(validateOfferStep("details", model, "ALREADY_OWN").approximateAge).toBeTruthy();
    expect(validateOfferStep("details", model, "WILL_PURCHASE").approximateAge).toBeUndefined();
    expect(validateOfferStep("details", model, null).approximateAge).toBeUndefined();
    expect(validateOfferStep("details", { ...model, approximateAge: "2 years" }, "ALREADY_OWN").approximateAge).toBeUndefined();
  });
});
