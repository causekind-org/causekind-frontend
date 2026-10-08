import { describe, expect, it } from "vitest";
import { encodeRequestCity, parseRequestCity } from "./requestLocation";

describe("request city text", () => {
  it("round-trips locality, city, state and country", () => {
    const loc = { locality: "Kothrud", city: "Pune", stateIso: "MH", countryIso: "IN" };
    expect(encodeRequestCity(loc)).toBe("Kothrud, Pune, MH, IN");
    expect(parseRequestCity("Kothrud, Pune, MH, IN")).toEqual(loc);
  });

  it("without a locality it is the format older requests already use", () => {
    expect(encodeRequestCity({ locality: " ", city: "Pune", stateIso: "MH", countryIso: "IN" })).toBe("Pune, MH, IN");
    expect(parseRequestCity("Pune, MH, IN")).toEqual({ locality: "", city: "Pune", stateIso: "MH", countryIso: "IN" });
  });

  it("old free text stays the city", () => {
    expect(parseRequestCity("Pune")).toEqual({ locality: "", city: "Pune", stateIso: "", countryIso: "" });
    expect(parseRequestCity(null)).toEqual({ locality: "", city: "", stateIso: "", countryIso: "" });
  });
});
