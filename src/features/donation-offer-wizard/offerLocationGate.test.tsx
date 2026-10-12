import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OfferLocationGate, offerLocationKey, readPassedOfferLocation } from "./OfferLocationGate";

const api = vi.hoisted(() => ({ checkDonorDistance: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));
vi.mock("@/app/actions/locations", () => ({
  detectLocationFromServer: vi.fn(async () => ({ ok: true, address: { country_code: "in", state: "Maharashtra", city: "Mumbai", suburb: "Andheri East", postcode: "400069" } })),
  resolveLocationFromGPS: vi.fn(async () => ({ stateIso: "MH", cityValue: "Mumbai" })),
  geocodeAddressFromServer: vi.fn(),
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

/** "Offer this item" opens with the location check; passing it hands the location to the form. */
describe("offer location gate", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(navigator.geolocation, "getCurrentPosition").mockImplementation((ok: PositionCallback) =>
      ok({ coords: { latitude: 19.11, longitude: 72.87 } } as GeolocationPosition));
  });
  afterEach(() => vi.clearAllMocks());

  it("within 10 km: Continue passes the location on and remembers it for the session", async () => {
    api.checkDonorDistance.mockResolvedValue({ located: true, distanceKm: 3, radiusKm: 10, withinRadius: true, area: "Andheri East, Mumbai", approxLatitude: 19.1, approxLongitude: 72.9 });
    const onPass = vi.fn();
    render(<OfferLocationGate requestId={7} requestTitle="Wheelchair" onPass={onPass} onDecline={vi.fn()} />);
    const go = screen.getByRole("button", { name: /continue to offer/i });
    expect(go).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /use my current location/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /continue to offer/i })).toBeEnabled(), { timeout: 4000 });
    fireEvent.click(screen.getByRole("button", { name: /continue to offer/i }));

    expect(onPass).toHaveBeenCalledWith(expect.objectContaining({
      latitude: 19.11, longitude: 72.87, pickupCity: "Mumbai", donorDropOffAvailable: false,
    }));
    expect(readPassedOfferLocation(7)?.pickupCity).toBe("Mumbai");
    expect(sessionStorage.getItem(offerLocationKey(7))).not.toBeNull();
  });

  it("outside 10 km: Continue stays off until the donor says yes; no leaves", async () => {
    api.checkDonorDistance.mockResolvedValue({ located: true, distanceKm: 24, radiusKm: 10, withinRadius: false, area: "Kandivali East, Mumbai", approxLatitude: 19.2, approxLongitude: 72.86 });
    const onPass = vi.fn();
    const onDecline = vi.fn();
    render(<OfferLocationGate requestId={7} requestTitle="Wheelchair" onPass={onPass} onDecline={onDecline} />);
    fireEvent.click(screen.getByRole("button", { name: /use my current location/i }));
    await screen.findByText(/Do you want to donate outside your 10 km area\?/);
    // Settled (lookup and check done), and still held: the question is unanswered.
    await waitFor(() => expect(screen.getByRole("button", { name: /continue to offer/i })).toBeDisabled(), { timeout: 4000 });

    fireEvent.click(screen.getByRole("button", { name: /yes, i'll take it there/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /continue to offer/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /continue to offer/i }));
    expect(onPass).toHaveBeenCalledWith(expect.objectContaining({ donorDropOffAvailable: true }));

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(onDecline).toHaveBeenCalled();
  });
});
