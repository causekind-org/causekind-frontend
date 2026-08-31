import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Date-gated like the strip, so hold the gate open for the composition tests.
let gateOpen = true;
vi.mock("@/lib/raksha-bandhan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/raksha-bandhan")>();
  return { ...actual, isRakshaBandhanCampaignActive: () => gateOpen };
});

import { RakshaBandhanNavAdornment } from "./RakshaBandhanNavAdornment";

describe("RakshaBandhanNavAdornment", () => {
  it("leaves the header untouched on every other day", () => {
    gateOpen = false;
    const { container } = render(<RakshaBandhanNavAdornment />);
    expect(container).toBeEmptyDOMElement();
    gateOpen = true;
  });

  it("is purely decorative — never announced, never clickable", () => {
    render(<RakshaBandhanNavAdornment />);
    const layer = screen.getByTestId("rakhi-nav-adornment");

    // The message itself lives in RakshaBandhanStrip, which is where a screen
    // reader should meet it. This layer must not duplicate or intercept.
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer.className).toMatch(/pointer-events-none/);
    expect(layer.querySelectorAll("a, button")).toHaveLength(0);
  });

  it("sits behind the header content rather than over it", () => {
    render(<RakshaBandhanNavAdornment />);
    const layer = screen.getByTestId("rakhi-nav-adornment");

    // Navbar lifts its two content rows to z-[1]; this must stay at z-0 or the
    // wash would paint over the wordmark and the nav pills.
    expect(layer.className).toMatch(/absolute/);
    expect(layer.className).toMatch(/z-0/);
    expect(layer.className).toMatch(/inset-0/);
  });

  it("ties the thread from the centre outward, in two halves", () => {
    const { container } = render(<RakshaBandhanNavAdornment />);

    const left = container.querySelector(".ck-rakhi-thread-left");
    const right = container.querySelector(".ck-rakhi-thread-right");

    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
    // Drawing outward from the middle is what reads as *tying*; end-to-end
    // would read as a loading bar.
    expect(left?.className).toMatch(/origin-right/);
    expect(right?.className).toMatch(/origin-left/);
    expect(left?.className).toMatch(/right-1\/2/);
    expect(right?.className).toMatch(/left-1\/2/);
  });

  it("blooms a two-ring rakhi with tassels at the tie point", () => {
    const { container } = render(<RakshaBandhanNavAdornment />);
    const knot = container.querySelector(".ck-rakhi-knot");

    expect(knot).not.toBeNull();
    // Twelve outer petals plus eight offset inner ones.
    expect(knot?.querySelectorAll(".ck-rakhi-petals ellipse")).toHaveLength(21);
    expect(knot?.querySelectorAll(".ck-rakhi-tassels path")).toHaveLength(3);
  });

  it("hangs the rakhi below the header instead of clipping it", () => {
    const { container } = render(<RakshaBandhanNavAdornment />);
    const layer = screen.getByTestId("rakhi-nav-adornment");
    const svg = container.querySelector(".ck-rakhi-knot svg");

    // Clipping the layer was what made the rakhi look like a small cut-off
    // flower rather than something tied on.
    expect(layer.className).not.toMatch(/overflow-hidden/);
    expect(svg?.getAttribute("class")).toMatch(/h-\[46px\]/);
  });

  it("turns the rakhi as the page scrolls, and only the flower", () => {
    const { container } = render(<RakshaBandhanNavAdornment />);
    const petals = container.querySelector(".ck-rakhi-petals") as HTMLElement | null;
    const before = petals?.style.transform;

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 900, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    });

    return waitFor(() => {
      const after = (
        container.querySelector(".ck-rakhi-petals") as HTMLElement | null
      )?.style.transform;
      expect(after).not.toBe(before);
      // 900px at 0.04 deg/px. Slow on purpose: a full turn takes ~9000px.
      expect(after).toMatch(/rotate\(36deg\)/);
      // The tassels hang — spinning them with the rosette would turn the whole
      // thing into a loading spinner.
      const tassels = container.querySelector(".ck-rakhi-tassels") as HTMLElement | null;
      expect(tassels?.style.transform ?? "").not.toMatch(/rotate\(36deg\)/);
    });
  });

  it("never eases the rotation itself, which is what caused the lag", () => {
    const { container } = render(<RakshaBandhanNavAdornment />);
    const petals = container.querySelector(".ck-rakhi-petals") as HTMLElement | null;

    // A transitioned transform kept turning after the page had stopped, which
    // read as delay. The rotation is applied the instant it changes.
    expect(petals?.style.transition ?? "").toBe("");
    expect(petals?.style.filter ?? "").toBe("");
  });


  it("keeps the logo area clear of the festive wash", () => {
    const { container } = render(<RakshaBandhanNavAdornment />);
    const wash = container.querySelector(".ck-rakhi-nav-wash");

    // The wash used to open at 14% burnt orange over the far left, which put a
    // peach panel behind the CauseKind wordmark and altered the brand colours.
    expect(wash?.className).toMatch(/rgba\(255,255,255,0\)_0%/);
    expect(wash?.className).toMatch(/rgba\(255,255,255,0\)_20%/);
    expect(wash?.className).not.toMatch(/rgba\(194,65,12,0\.14\)_0%/);
  });

  it("gives reduced-motion users the tied rakhi, not a blank header", () => {
    const { container } = render(<RakshaBandhanNavAdornment />);
    // Two style blocks: the scoped styled-jsx one, plus a global block for the
    // tassels, which live inside RakhiMotif and carry no styled-jsx scope.
    const css = Array.from(container.querySelectorAll("style"))
      .map((tag) => tag.textContent ?? "")
      .join("\n");

    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    // Inside that block every animated class is stopped and made visible.
    const reduced = css.slice(css.indexOf("prefers-reduced-motion"));
    for (const cls of [
      "ck-rakhi-nav-wash",
      "ck-rakhi-thread-left",
      "ck-rakhi-thread-right",
      "ck-rakhi-knot",
      "ck-rakhi-tassels",
    ]) {
      expect(reduced).toContain(cls);
    }
    expect(reduced).toMatch(/animation:\s*none/);
  });

  it("plays the tie once instead of looping — only the tassels keep moving", () => {
    const { container } = render(<RakshaBandhanNavAdornment />);
    // Two style blocks: the scoped styled-jsx one, plus a global block for the
    // tassels, which live inside RakhiMotif and carry no styled-jsx scope.
    const css = Array.from(container.querySelectorAll("style"))
      .map((tag) => tag.textContent ?? "")
      .join("\n");

    // A header that re-runs its animation every few seconds pulls the eye away
    // for the whole visit. Exactly one rule may be infinite: the tassel sway.
    const infinites = css.match(/animation:[^;]*infinite/g) ?? [];
    expect(infinites).toHaveLength(1);
    expect(infinites[0]).toContain("ck-rakhi-sway");
  });
});
