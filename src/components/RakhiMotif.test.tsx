import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RakhiMotif } from "./RakhiMotif";

describe("RakhiMotif", () => {
  it("emits coordinates that survive hydration", () => {
    const { container } = render(<RakhiMotif idPrefix="t" />);

    // Math.cos/Math.sin are not required by the spec to be correctly rounded,
    // so Node and the browser disagreed in the final bits and React reported a
    // hydration mismatch: the server wrote cx="17.851470842750402" where
    // Chrome produced "17.8514708427504". Every emitted number is rounded, so
    // no attribute can carry that much precision any more.
    const numeric = Array.from(container.querySelectorAll("circle, ellipse"))
      .flatMap((el) => ["cx", "cy", "rx", "ry", "r"].map((a) => el.getAttribute(a)))
      .filter((v): v is string => v !== null);

    expect(numeric.length).toBeGreaterThan(0);
    for (const value of numeric) {
      const decimals = value.split(".")[1] ?? "";
      expect(decimals.length).toBeLessThanOrEqual(3);
    }
  });

  it("keeps gradient ids unique per instance", () => {
    const { container } = render(
      <>
        <RakhiMotif idPrefix="one" />
        <RakhiMotif idPrefix="two" />
      </>,
    );

    // Two instances sharing an id would make the second silently adopt the
    // first's fill.
    const ids = Array.from(container.querySelectorAll("linearGradient, radialGradient"))
      .map((el) => el.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("omits the tassels when asked", () => {
    const { container } = render(<RakhiMotif idPrefix="t" withTassels={false} />);
    expect(container.querySelector(".ck-rakhi-tassels")).toBeNull();
  });
});
