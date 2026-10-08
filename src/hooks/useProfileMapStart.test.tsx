import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useProfileMapStart } from "./useProfileMapStart";

const cityCenter = vi.fn();
vi.mock("@/app/actions/locations", () => ({ profileCityCenterFromServer: (raw: string | null) => cityCenter(raw) }));

/**
 * Where "List an item" step 4 and "Request Support" open their map when the
 * listing / request has no pin yet (a saved pin always wins, in the picker).
 */
describe("useProfileMapStart", () => {
  it("uses saved profile coordinates at street level, without looking up the city", () => {
    cityCenter.mockReset();
    const coords = { lat: 19.38, lng: 72.83 };
    const { result } = renderHook(() => useProfileMapStart(coords, "Pune, MH, IN"));
    expect(result.current).toEqual({ center: coords, zoom: 16 });
    expect(cityCenter).not.toHaveBeenCalled();
  });

  it("no coordinates: the centre of the profile City, at town level", async () => {
    cityCenter.mockReset().mockResolvedValue({ lat: 18.52, lng: 73.86, level: "city" });
    const { result } = renderHook(() => useProfileMapStart(null, "Pune, MH, IN"));
    await waitFor(() => expect(result.current).toEqual({ center: { lat: 18.52, lng: 73.86 }, zoom: 12 }));
    expect(cityCenter).toHaveBeenCalledWith("Pune, MH, IN");
  });

  it("nothing known: null, so the picker shows India", async () => {
    cityCenter.mockReset().mockResolvedValue(null);
    const { result } = renderHook(() => useProfileMapStart(null, "Atlantis"));
    await waitFor(() => expect(cityCenter).toHaveBeenCalled());
    expect(result.current).toBeNull();
    const { result: noCity } = renderHook(() => useProfileMapStart(null, null));
    expect(noCity.current).toBeNull();
  });
});
