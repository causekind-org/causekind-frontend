import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LocationPinPicker } from "./LocationPinPicker";

/**
 * The one map pin picker shared by "List an item", "Request Support" and the
 * profile "Set on map". Google Maps itself is mocked: a tap on the map and a
 * marker drag are reduced to buttons that fire the same callbacks.
 */
vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  APILoadingStatus: { AUTH_FAILURE: "AUTH_FAILURE", FAILED: "FAILED", LOADED: "LOADED" },
  useApiLoadingStatus: () => "LOADED",
  useMap: () => null,
  Map: ({ children, onClick }: { children: React.ReactNode; onClick: (e: unknown) => void }) => (
    <div data-testid="map">
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

  it("without a key: no map, a note instead, and the caller is told", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
    const onUnavailable = vi.fn();
    render(<LocationPinPicker pin={null} onPick={() => {}} onUnavailable={onUnavailable} unavailableNote="Custom note" />);
    expect(screen.queryByTestId("map")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Custom note");
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });
});
