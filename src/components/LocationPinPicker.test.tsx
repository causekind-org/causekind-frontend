import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LocationPinPicker } from "./LocationPinPicker";

// A stand-in for the Places library: one suggestion, which resolves to Bandra.
const places = vi.hoisted(() => {
  const p = {
  fetch: vi.fn(async () => ({
    suggestions: [{
      placePrediction: {
        placeId: "p1",
        text: { text: "Bandra West, Mumbai" },
        mainText: { text: "Bandra West" },
        secondaryText: { text: "Mumbai, Maharashtra" },
        toPlace: () => ({ fetchFields: async () => {}, location: { lat: () => 19.06, lng: () => 72.83 } }),
      },
    }],
  })),
  lib: {} as Record<string, unknown>,
  };
  // One object for the whole run, like the real hook: a fresh object per
  // render would re-run the search effect forever.
  p.lib = { AutocompleteSessionToken: class {}, AutocompleteSuggestion: { fetchAutocompleteSuggestions: p.fetch } };
  return p;
});

/**
 * The one map pin picker shared by "List an item", "Request Support" and the
 * handover pin. Google Maps itself is mocked: a tap on the map and a
 * marker drag are reduced to buttons that fire the same callbacks.
 */
vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  APILoadingStatus: { AUTH_FAILURE: "AUTH_FAILURE", FAILED: "FAILED", LOADED: "LOADED" },
  useApiLoadingStatus: () => "LOADED",
  useMap: () => null,
  useMapsLibrary: () => places.lib,
  Map: ({ children, onClick, defaultCenter, defaultZoom }: {
    children: React.ReactNode; onClick: (e: unknown) => void;
    defaultCenter: { lat: number; lng: number }; defaultZoom: number;
  }) => (
    <div data-testid="map" data-start={`${defaultCenter.lat},${defaultCenter.lng}@${defaultZoom}`}>
      <button type="button" onClick={() => onClick({ detail: { latLng: { lat: 18.52, lng: 73.85 } } })}>tap map</button>
      {children}
    </div>
  ),
  AdvancedMarker: ({ children, position, onDragEnd }: {
    children: React.ReactNode; position: { lat: number; lng: number }; onDragEnd: (e: unknown) => void;
  }) => (
    <div data-testid="marker" data-pos={`${position.lat},${position.lng}`}>
      <button type="button" onClick={() => onDragEnd({ latLng: { lat: () => 18.6, lng: () => 73.9 } })}>drag pin</button>
      {children}
    </div>
  ),
  Pin: ({ background }: { background: string }) => <span data-testid="pin" data-bg={background} />,
}));

afterEach(() => vi.unstubAllEnvs());

describe("LocationPinPicker", () => {
  it("places the pin where the map is tapped, and moves it on drag", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
    const onPick = vi.fn();
    const { rerender } = render(<LocationPinPicker pin={null} onPick={onPick} tone="donee" />);
    expect(screen.queryByTestId("marker")).toBeNull();

    await userEvent.click(screen.getByText("tap map"));
    expect(onPick).toHaveBeenLastCalledWith(18.52, 73.85);

    rerender(<LocationPinPicker pin={{ lat: 18.52, lng: 73.85 }} onPick={onPick} tone="donee" />);
    await userEvent.click(screen.getByText("drag pin"));
    expect(onPick).toHaveBeenLastCalledWith(18.6, 73.9);
  });

  it("colours the pin by role: donor orange, donee navy", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
    const pin = { lat: 1, lng: 2 };
    const { rerender } = render(<LocationPinPicker pin={pin} onPick={() => {}} tone="donor" />);
    expect(screen.getByTestId("pin").dataset.bg).toBe("#b04a15");
    rerender(<LocationPinPicker pin={pin} onPick={() => {}} tone="donee" />);
    expect(screen.getByTestId("pin").dataset.bg).toBe("#1e3a60");
  });

  it("starts at the pin, else the given start (at its zoom), else the whole of India", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
    const start = () => screen.getByTestId("map").dataset.start;
    const { unmount } = render(<LocationPinPicker pin={{ lat: 18.6, lng: 73.9 }} fallbackCenter={{ lat: 1, lng: 2 }} onPick={() => {}} />);
    expect(start()).toBe("18.6,73.9@16");
    unmount();
    const r2 = render(<LocationPinPicker pin={null} fallbackCenter={{ lat: 18.52, lng: 73.86 }} fallbackZoom={12} onPick={() => {}} />);
    expect(start()).toBe("18.52,73.86@12");
    r2.unmount();
    render(<LocationPinPicker pin={null} onPick={() => {}} />);
    expect(start()).toBe("22.5,79.5@4");
  });

  it("without a key: no map, a note instead, and the caller is told", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
    const onUnavailable = vi.fn();
    render(<LocationPinPicker pin={null} onPick={() => {}} onUnavailable={onUnavailable} />);
    expect(screen.queryByTestId("map")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("The map couldn't load");
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });

  it("search: picking a suggestion places the pin there", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
    const onPick = vi.fn();
    render(<LocationPinPicker pin={null} onPick={onPick} tone="donee" showSearch />);
    await userEvent.type(screen.getByRole("combobox", { name: /search for a place/i }), "Bandra");
    const option = await screen.findByRole("option", { name: /Bandra West/ });
    await userEvent.click(option);
    await vi.waitFor(() => expect(onPick).toHaveBeenLastCalledWith(19.06, 72.83));
    expect(places.fetch).toHaveBeenCalledWith(expect.objectContaining({ input: "Bandra" }));
  });

  it("\"Use my current location\" places the pin at the device position", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
    vi.spyOn(navigator.geolocation, "getCurrentPosition").mockImplementation((ok: PositionCallback) =>
      ok({ coords: { latitude: 28.61, longitude: 77.21 } } as GeolocationPosition));
    const onPick = vi.fn();
    render(<LocationPinPicker pin={null} onPick={onPick} tone="donor" showSearch showLocateButton />);
    await userEvent.click(screen.getByRole("button", { name: /use my current location/i }));
    expect(onPick).toHaveBeenLastCalledWith(28.61, 77.21);
  });

  it("reports busy while finding the current location", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
    let finish: ((p: GeolocationPosition) => void) | null = null;
    vi.spyOn(navigator.geolocation, "getCurrentPosition").mockImplementation((ok: PositionCallback) => { finish = ok; });
    const onBusyChange = vi.fn();
    const onPick = vi.fn();
    render(<LocationPinPicker pin={null} onPick={onPick} tone="donee" showSearch showLocateButton onBusyChange={onBusyChange} />);
    await userEvent.click(screen.getByRole("button", { name: /use my current location/i }));
    expect(onBusyChange).toHaveBeenLastCalledWith(true);
    act(() => finish!({ coords: { latitude: 1, longitude: 2 } } as GeolocationPosition));
    expect(onPick).toHaveBeenLastCalledWith(1, 2);
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });
});
