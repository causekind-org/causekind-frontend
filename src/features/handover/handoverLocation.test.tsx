import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { HandoverLocationField, formatPinAddress } from "./HandoverLocationField";
import { HandoverScheduleSummary } from "./HandoverScheduleSummary";
import type { HandoverViewModel } from "./model";

const geo = vi.hoisted(() => ({ reverse: vi.fn(), forward: vi.fn() }));
vi.mock("@/app/actions/locations", () => ({
  detectLocationFromServer: geo.reverse,
  geocodeFreeTextFromServer: geo.forward,
}));

// The map is mocked: one button taps it, one picks a search result.
vi.mock("next/dynamic", () => ({
  default: () => (props: { onPick: (lat: number, lng: number, meta?: { label?: string }) => void }) => (
    <div>
      <button type="button" onClick={() => props.onPick(19.25, 72.86)}>tap map</button>
      <button type="button" onClick={() => props.onPick(19.06, 72.83, { label: "Bandra West, Mumbai" })}>pick search</button>
    </div>
  ),
}));

function Harness({ onBusy }: { onBusy?: (b: boolean) => void }) {
  const [address, setAddress] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  return (
    <>
      <HandoverLocationField
        address={address} lat={pin?.lat ?? null} lng={pin?.lng ?? null}
        onAddressChange={setAddress} onPinChange={(lat, lng) => setPin({ lat, lng })} onBusyChange={onBusy}
      />
      <output data-testid="pin">{pin ? `${pin.lat},${pin.lng}` : "none"}</output>
    </>
  );
}

const box = () => screen.getByRole("textbox", { name: /handover address/i }) as HTMLTextAreaElement;

describe("Schedule handover: map and address stay in sync", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it("a tap on the map fills the address from the spot", async () => {
    geo.reverse.mockResolvedValue({ ok: true, address: { road: "Link Road", suburb: "Kandivali East", city: "Mumbai", state: "Maharashtra", postcode: "400068" } });
    render(<Harness />);
    await act(async () => { fireEvent.click(screen.getByText("tap map")); });
    expect(screen.getByTestId("pin").textContent).toBe("19.25,72.86");
    expect(box().value).toBe("Link Road, Kandivali East, Mumbai, Maharashtra, 400068");
  });

  it("a search uses the place's own name, without a lookup", async () => {
    render(<Harness />);
    await act(async () => { fireEvent.click(screen.getByText("pick search")); });
    expect(box().value).toBe("Bandra West, Mumbai");
    expect(geo.reverse).not.toHaveBeenCalled();
  });

  it("a spot with no address clears the old one", async () => {
    geo.reverse.mockResolvedValueOnce({ ok: true, address: { suburb: "Kandivali East", city: "Mumbai" } })
      .mockResolvedValueOnce({ ok: false, reason: "no-address" });
    render(<Harness />);
    await act(async () => { fireEvent.click(screen.getByText("tap map")); });
    expect(box().value).not.toBe("");
    await act(async () => { fireEvent.click(screen.getByText("tap map")); });
    expect(box().value).toBe("");
  });

  it("typing moves the pin after a pause, and is busy until then", async () => {
    geo.forward.mockResolvedValue({ ok: true, lat: 19.1, lng: 72.9 });
    const onBusy = vi.fn();
    render(<Harness onBusy={onBusy} />);
    fireEvent.change(box(), { target: { value: "Andheri East, Mumbai" } });
    expect(onBusy).toHaveBeenLastCalledWith(true);
    expect(geo.forward).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
    expect(geo.forward).toHaveBeenCalledWith("Andheri East, Mumbai");
    expect(screen.getByTestId("pin").textContent).toBe("19.1,72.9");
    // Typing is never overwritten by a lookup.
    expect(box().value).toBe("Andheri East, Mumbai");
    expect(onBusy).toHaveBeenLastCalledWith(false);
  });

  it("formats a reverse result without repeated names", () => {
    expect(formatPinAddress({ house_number: "12", road: "MG Road", suburb: "Pune", city: "Pune", postcode: "411001" }))
      .toBe("12 MG Road, Pune, 411001");
  });
});

describe("Schedule card: what the donee sees", () => {
  function vm(schedule: Partial<NonNullable<HandoverViewModel["schedule"]>>): HandoverViewModel {
    return {
      role: "DONEE", closed: false,
      schedule: {
        method: "IN_PERSON", methodLabel: "In person", scheduledAt: "2026-10-10T10:00:00Z",
        address: null, latitude: null, longitude: null, notes: null,
        rescheduleCount: 0, maxReschedules: 3, atRisk: false, ...schedule,
      },
    } as unknown as HandoverViewModel;
  }

  it("shows the address, directions and a map link to the pin", () => {
    render(<HandoverScheduleSummary vm={vm({ address: "Link Road, Kandivali East, Mumbai", latitude: 19.25, longitude: 72.86 })} />);
    expect(screen.getByText("Link Road, Kandivali East, Mumbai")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /directions/i }))
      .toHaveAttribute("href", "https://www.google.com/maps/dir/?api=1&destination=19.25,72.86");
    expect(screen.getByRole("link", { name: /open in google maps/i })).toHaveAttribute("href", "https://www.google.com/maps?q=19.25,72.86");
    expect(screen.getByRole("button", { name: /copy address/i })).toBeInTheDocument();
  });

  it("without a pin: the address only, no map buttons", () => {
    render(<HandoverScheduleSummary vm={vm({ address: "Andheri East, Mumbai" })} />);
    expect(screen.getByText("Andheri East, Mumbai")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /directions/i })).toBeNull();
  });
});
