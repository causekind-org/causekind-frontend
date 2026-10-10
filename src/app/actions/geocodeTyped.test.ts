import { afterEach, describe, expect, it, vi } from "vitest";
import { geocodeAddressFromServer, geocodeFreeTextFromServer } from "./locations";

/** What each Nominatim call asked for, as plain params. */
function calls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.map(([url]) => Object.fromEntries(new URL(String(url)).searchParams));
}

const hit = (lat: number, lon: number) => ({ ok: true, json: async () => [{ lat: String(lat), lon: String(lon) }] });
const miss = { ok: true, json: async () => [] };

/**
 * Typed address → coordinates. Nominatim's structured search needs every
 * field to match, and our city list has names OpenStreetMap doesn't use as
 * cities, so the lookup goes from most to least reliable.
 */
describe("geocodeAddressFromServer", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("PIN code first, on its own (the 'Mumbai Suburban' + 400068 case)", async () => {
    const fetchMock = vi.fn(async () => hit(19.25, 72.86));
    vi.stubGlobal("fetch", fetchMock);
    const r = await geocodeAddressFromServer({ postalcode: "400068", city: "Mumbai Suburban", state: "Maharashtra", countryCode: "IN" });
    expect(r).toEqual({ ok: true, lat: 19.25, lng: 72.86 });
    expect(calls(fetchMock)).toHaveLength(1);
    expect(calls(fetchMock)[0]).toMatchObject({ postalcode: "400068", countrycodes: "in" });
    expect(calls(fetchMock)[0].city).toBeUndefined();
  });

  it("falls back to city + state, then free text", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(miss)            // PIN
      .mockResolvedValueOnce(miss)            // city + state
      .mockResolvedValueOnce(hit(19.1, 72.9)); // "city, state"
    vi.stubGlobal("fetch", fetchMock);
    const r = await geocodeAddressFromServer({ postalcode: "999999", city: "Mumbai Suburban", state: "Maharashtra", countryCode: "IN" });
    expect(r).toEqual({ ok: true, lat: 19.1, lng: 72.9 });
    const c = calls(fetchMock);
    expect(c[1]).toMatchObject({ city: "Mumbai Suburban", state: "Maharashtra" });
    expect(c[2]).toMatchObject({ q: "Mumbai Suburban, Maharashtra" });
  }, 10_000);

  it("stops at once when Nominatim refuses or rate-limits", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 429, statusText: "Too Many Requests" }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await geocodeAddressFromServer({ postalcode: "400068", city: "Mumbai", state: "Maharashtra", countryCode: "IN" });
    expect(r).toEqual({ ok: false, reason: "rate-limited" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  }, 10_000);
});

describe("geocodeFreeTextFromServer (handover address)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("drops the building part on a miss and lands on the street or area", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(miss)              // "Flat 4, Sai Krupa, Link Road, Kandivali East"
      .mockResolvedValueOnce(hit(19.2, 72.86)); // "Sai Krupa, Link Road, Kandivali East"
    vi.stubGlobal("fetch", fetchMock);
    const r = await geocodeFreeTextFromServer("Flat 4, Sai Krupa, Link Road, Kandivali East");
    expect(r).toEqual({ ok: true, lat: 19.2, lng: 72.86 });
    const c = calls(fetchMock);
    expect(c[0]).toMatchObject({ q: "Flat 4, Sai Krupa, Link Road, Kandivali East", countrycodes: "in" });
    expect(c[1]).toMatchObject({ q: "Sai Krupa, Link Road, Kandivali East" });
  }, 10_000);
});
