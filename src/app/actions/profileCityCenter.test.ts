import { afterEach, describe, expect, it, vi } from "vitest";

import { profileCityCenterFromServer } from "./locations";

/**
 * Where a location map starts for a user with no saved coordinates: the centre
 * of the City on their profile. Listed cities resolve from the bundled city
 * list (no network); others go through Nominatim; failing that, the state.
 */
afterEach(() => vi.unstubAllGlobals());

describe("profileCityCenterFromServer", () => {
  it("finds a listed city from the profile's 'City, StateIso, CountryIso' without a network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const c = await profileCityCenterFromServer("Pune, MH, IN");
    expect(c?.level).toBe("city");
    expect(c!.lat).toBeCloseTo(18.52, 0);
    expect(c!.lng).toBeCloseTo(73.86, 0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reads old free-text profiles ('Pune') as an Indian city", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const c = await profileCityCenterFromServer("Pune");
    expect(c?.level).toBe("city");
    expect(c!.lat).toBeCloseTo(18.52, 0);
  });

  it("geocodes a city missing from the list", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ lat: "19.1", lon: "72.9" }] });
    vi.stubGlobal("fetch", fetchSpy);
    const c = await profileCityCenterFromServer("Nowhereville, MH, IN");
    expect(c).toEqual({ lat: 19.1, lng: 72.9, level: "city" });
    expect(String(fetchSpy.mock.calls[0][0])).toContain("state=Maharashtra");
  });

  it("falls back to the state's centre when the city cannot be placed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    const c = await profileCityCenterFromServer("Nowhereville, MH, IN");
    expect(c?.level).toBe("state");
  });

  it("returns null when the profile has no city", async () => {
    expect(await profileCityCenterFromServer(null)).toBeNull();
    expect(await profileCityCenterFromServer("")).toBeNull();
  });
});
