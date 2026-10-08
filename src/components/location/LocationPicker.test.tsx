import { describe, expect, it, vi } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { createRef, useState } from "react";

import { LocationPicker, type LocationPickerHandle, type PickedLocation } from "./LocationPicker";

// jsdom has no layout: the picker scrolls the map into view on failure.
Element.prototype.scrollIntoView = vi.fn();

const geocode = vi.fn();
vi.mock("@/app/actions/locations", () => ({
  geocodeAddressFromServer: (q: unknown) => geocode(q),
  searchPlaceFromServer: vi.fn(),
  detectLocationFromServer: vi.fn(),
  resolveLocationFromGPS: vi.fn(),
}));
vi.mock("@/hooks/useLocations", () => ({ useLocations: () => ({ countries: [], states: [], cities: [] }) }));
vi.mock("@/components/LocationPinPicker", () => ({ LocationPinPicker: () => <div data-testid="map" /> }));

const EMPTY: PickedLocation = { countryIso: "IN", stateIso: "", city: "", locality: "", pincode: "", lat: null, lng: null };

function Harness({ handle, onValue }: { handle: React.Ref<LocationPickerHandle>; onValue: (v: PickedLocation) => void }) {
  const [v, setV] = useState(EMPTY);
  return <LocationPicker tone="donee" value={v} mapStart={null} controlRef={handle} onChange={(n) => { setV(n); onValue(n); }} />;
}

/** Continue / Save & exit await flush() so a just-typed address can't save a stale pin. */
describe("LocationPicker flush()", () => {
  it("runs the pending typed lookup now and resolves once the pin has moved", async () => {
    geocode.mockReset().mockResolvedValue({ ok: true, lat: 21.15, lng: 79.09 });
    const handle = createRef<LocationPickerHandle>();
    let last = EMPTY;
    render(<Harness handle={handle} onValue={(v) => { last = v; }} />);
    fireEvent.change(document.querySelector("input[name=city]")!, { target: { value: "Nagpur" } });
    let ok = false;
    await act(async () => { ok = await handle.current!.flush(); });
    expect(ok).toBe(true);
    expect(geocode).toHaveBeenCalledTimes(1);
    expect(last).toMatchObject({ city: "Nagpur", lat: 21.15, lng: 79.09 });
  });

  it("returns false (stay on the step) when the typed address can't be placed", async () => {
    geocode.mockReset().mockResolvedValue({ ok: false, reason: "no-address" });
    const handle = createRef<LocationPickerHandle>();
    render(<Harness handle={handle} onValue={() => {}} />);
    fireEvent.change(document.querySelector("input[name=city]")!, { target: { value: "Nowhereville" } });
    let ok = true;
    await act(async () => { ok = await handle.current!.flush(); });
    expect(ok).toBe(false);
    expect(screen.getByText(/Drop the pin on the map to continue/)).toBeTruthy();
  });

  it("nothing pending: resolves true straight away (no pin is the step's own validation)", async () => {
    const handle = createRef<LocationPickerHandle>();
    render(<Harness handle={handle} onValue={() => {}} />);
    let ok = false;
    await act(async () => { ok = await handle.current!.flush(); });
    expect(ok).toBe(true);
  });
});
