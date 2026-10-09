import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRef, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { LocationStep, type LocationStepHandle } from "./steps/LocationStep";
import { emptyModel, type WizardModel } from "./wizardModel";

/** Holds the model like the wizard does, so typed values reach the step. */
function Harness(props: {
  onGeocodeTyped: (q: { postalcode: string; city: string; state: string; countryCode: string }, fb: boolean) => Promise<boolean> | void;
  onPin?: (lat: number, lng: number) => void;
  controlRef?: React.Ref<LocationStepHandle>;
}) {
  const [model, setModel] = useState<WizardModel>({ ...emptyModel, countryIso: "IN", stateIso: "MH" });
  return (
    <LocationStep
      model={model} errors={{}} lookup={{ running: false, error: null, whenIdle: async () => {} }} profileCenter={null}
      onChange={(k, v) => setModel(m => ({ ...m, [k]: v }))} onPin={props.onPin ?? (() => {})}
      onGeocodeTyped={props.onGeocodeTyped} controlRef={props.controlRef}
    />
  );
}

vi.mock("@/hooks/useLocations", () => ({
  useLocations: () => ({ countries: [{ value: "IN", label: "India" }], states: [{ value: "MH", label: "Maharashtra" }], cities: [] }),
}));

// The map is not under test here: a button stands in for a tap on it.
vi.mock("@/components/LocationPinPicker", () => ({
  LocationPinPicker: ({ onPick }: { onPick: (lat: number, lng: number) => void }) => (
    <button type="button" onClick={() => onPick(19.07, 72.87)}>tap map</button>
  ),
}));

/**
 * Typing the address moves the pin; the pin moving (and the lookup filling the
 * fields) must not send a geocode back, or the two would chase each other.
 */
describe("List an item step 4: typed address and pin", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup() {
    const onGeocodeTyped = vi.fn();
    const onPin = vi.fn();
    render(<Harness onGeocodeTyped={onGeocodeTyped} onPin={onPin} />);
    return { onGeocodeTyped, onPin };
  }

  it("geocodes once the donor stops typing an address field", () => {
    const { onGeocodeTyped } = setup();
    fireEvent.change(screen.getByRole("textbox", { name: /pin code/i }), { target: { value: "400050" } });
    expect(onGeocodeTyped).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1300); });
    expect(onGeocodeTyped).toHaveBeenCalledTimes(1);
    // With a map, an address that can't be placed must not jump to the profile.
    expect(onGeocodeTyped.mock.calls[0][1]).toBe(false);
  });

  it("a pin from the map is not geocoded back", () => {
    const { onGeocodeTyped, onPin } = setup();
    fireEvent.click(screen.getByText("tap map"));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onPin).toHaveBeenCalledWith(19.07, 72.87);
    expect(onGeocodeTyped).not.toHaveBeenCalled();
  });

  it("drops no pin on arrival when there is none (the map only opens on the profile location)", () => {
    const { onPin } = setup();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onPin).not.toHaveBeenCalled();
  });

  it("Continue: flush() runs a typed address at once, and reports when it can't be placed", async () => {
    const handle = createRef<LocationStepHandle>();
    const onGeocodeTyped = vi.fn(async () => false);
    render(<Harness onGeocodeTyped={onGeocodeTyped} controlRef={handle} />);
    fireEvent.change(document.querySelector("input[name=city]")!, { target: { value: "Bandra" } });
    let ok: boolean | undefined;
    await act(async () => { ok = await handle.current!.flush(); });
    // Ran now, not after the 1.2 s debounce, and only once.
    expect(onGeocodeTyped).toHaveBeenCalledTimes(1);
    expect(ok).toBe(false);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onGeocodeTyped).toHaveBeenCalledTimes(1);
  });
});
