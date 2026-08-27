import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { RakshaBandhanWordmark } from "./RakshaBandhanWordmark";

describe("RakshaBandhanWordmark", () => {
  it("offers WebM only — an MP4 fallback could not be transparent", () => {
    // H.264 has no alpha channel, so a fallback source would render a white
    // box over the navbar. Anything that cannot play VP9 gets the still.
    const { container } = render(<RakshaBandhanWordmark />);
    const sources = container.querySelectorAll("source");

    expect(sources).toHaveLength(1);
    expect(sources[0].getAttribute("type")).toBe("video/webm");
    expect(sources[0].getAttribute("src")).toBe("/brand/causekind-rakhi.webm");
  });

  it("loops, and starts on its own", () => {
    // The first and last frames of the source are identical, so the repeat has
    // no visible seam — the clip can run continuously without a jump back.
    const { container } = render(<RakshaBandhanWordmark />);
    const video = container.querySelector("video");

    expect(video?.hasAttribute("loop")).toBe(true);
    expect(video?.hasAttribute("autoplay")).toBe(true);
  });

  it("is muted, so a logo can never make noise", () => {
    const { container } = render(<RakshaBandhanWordmark />);
    // React reflects `muted` as a property rather than an attribute.
    expect(container.querySelector("video")?.muted).toBe(true);
  });

  it("never shows the still and the video at the same time", () => {
    // The regression this exists for: both were visible, so a frozen copy of
    // the wordmark sat under the moving one, and because the animation shifts
    // the letters as it plays the logo rendered as two offset copies.
    //
    // jsdom does not apply the stylesheet, so this asserts the contract the CSS
    // depends on — one layer carries the "hide by default" class, the other the
    // "show by default" one, and they are never the same class.
    const { container } = render(<RakshaBandhanWordmark />);
    const img = container.querySelector("img");
    const video = container.querySelector("video");

    expect(img?.className).toMatch(/ck-rb-wordmark-static/);
    expect(video?.className).toMatch(/ck-rb-wordmark-video/);
    expect(img?.className).not.toMatch(/ck-rb-wordmark-video/);
    expect(video?.className).not.toMatch(/ck-rb-wordmark-static/);
  });

  it("stacks both layers in the same box at the same size", () => {
    // If the two ever differ in size or fit, swapping between them on a
    // reduced-motion change would jump the header.
    const { container } = render(<RakshaBandhanWordmark />);
    const img = container.querySelector("img");
    const video = container.querySelector("video");

    expect(img?.getAttribute("width")).toBe(video?.getAttribute("width"));
    expect(img?.getAttribute("height")).toBe(video?.getAttribute("height"));
    for (const el of [img, video]) {
      expect(el?.getAttribute("class")).toMatch(/absolute inset-0/);
      expect((el as HTMLElement)?.style.objectFit).toBe("contain");
    }
  });

  it("carries a still that is also the video's poster", () => {
    // The still is the whole logo under reduced motion, and the first paint
    // before the webm arrives.
    const { container } = render(<RakshaBandhanWordmark />);
    const img = container.querySelector("img.ck-rb-wordmark-static");
    const video = container.querySelector("video");

    expect(img?.getAttribute("src")).toBe("/brand/causekind-rakhi-static.webp");
    expect(video?.getAttribute("poster")).toBe("/brand/causekind-rakhi-static.webp");
    expect(video?.getAttribute("preload")).toBe("none");
  });

  it("is decorative and lets the click reach the header link", () => {
    const { container } = render(<RakshaBandhanWordmark />);
    const root = container.firstElementChild;

    expect(root?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(container.querySelector("video")?.getAttribute("class")).toMatch(/pointer-events-none/);
  });

  it("reserves the box at every size, so the header never reflows", () => {
    // Widths are derived from the asset ratio rather than typed in, so they
    // cannot drift from the encode if a height is retuned.
    for (const [size, height] of [["sm", 34], ["md", 44], ["lg", 52]] as const) {
      const { container } = render(<RakshaBandhanWordmark size={size} />);
      const video = container.querySelector("video");

      expect(video?.getAttribute("height")).toBe(String(height));
      expect(video?.getAttribute("width")).toBe(String(Math.round(height * (442 / 140))));
    }
  });

  it("is rendered taller than the text wordmark it replaces", () => {
    // Only ~45% of this artwork's height is the word itself — the rest is
    // rosette, tassels and swirl. Sized like the text wordmark (22/28/34) the
    // letters come out about half the size of the text they replaced, which is
    // how it shipped and how it read: small.
    const { container } = render(<RakshaBandhanWordmark size="md" />);
    const height = Number(container.querySelector("video")?.getAttribute("height"));

    expect(height).toBeGreaterThan(28);
  });
});
