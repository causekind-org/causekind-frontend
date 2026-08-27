import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The gate is date-driven; hold it open for the behavioural tests and exercise
// the real IST logic separately against the real module.
let introDay = true;
vi.mock("@/lib/raksha-bandhan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/raksha-bandhan")>();
  return {
    ...actual,
    isRakshaBandhanIntroDay: () => introDay,
    isRakshaBandhanIntroForced: () => false,
  };
});

/**
 * Re-imported fresh for every test.
 *
 * <p>The component tracks "already played" in a module variable, on purpose —
 * that is what makes a refresh replay the intro while a client-side navigation
 * does not. Sharing one module across tests would leak that flag, so each test
 * starts from a fresh one, which is precisely what a page load does.
 */
let Intro: typeof import("./RakshaBandhanIntro").RakshaBandhanIntro;

const {
  istDateString,
  isRakshaBandhanIntroDay,
  isRakshaBandhanIntroForced,
  pickRakshaBandhanIntroSource,
  RAKSHA_BANDHAN_INTRO_VIDEO_1080,
  RAKSHA_BANDHAN_INTRO_VIDEO_720,
} = await vi.importActual<typeof import("@/lib/raksha-bandhan")>(
  "@/lib/raksha-bandhan",
);

/** jsdom implements neither of these; the component calls both. */
function stubMediaAndPlayback({ reducedMotion = false } = {}) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  // jsdom implements neither, and its "not implemented" path writes to the
  // virtual console on every render.
  window.HTMLMediaElement.prototype.load = vi.fn();
}

beforeEach(async () => {
  vi.resetModules();
  ({ RakshaBandhanIntro: Intro } = await import("./RakshaBandhanIntro"));
  introDay = true;
  document.body.style.overflow = "";
  stubMediaAndPlayback();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("pickRakshaBandhanIntroSource", () => {
  const setDisplay = (width: number, dpr = 1) => {
    Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
    Object.defineProperty(window, "devicePixelRatio", { value: dpr, configurable: true });
  };
  const setConnection = (value: unknown) =>
    Object.defineProperty(navigator, "connection", { value, configurable: true });

  afterEach(() => setConnection(undefined));

  it("sends the smaller encode to phones and the larger to desktops", () => {
    setDisplay(390, 3); // a phone, however many device pixels it claims
    expect(pickRakshaBandhanIntroSource()).toBe(RAKSHA_BANDHAN_INTRO_VIDEO_720);

    setDisplay(767, 2);
    expect(pickRakshaBandhanIntroSource()).toBe(RAKSHA_BANDHAN_INTRO_VIDEO_720);

    // A 1440px desktop must not be served an upscaled 720p — the text softens.
    setDisplay(1440, 1);
    expect(pickRakshaBandhanIntroSource()).toBe(RAKSHA_BANDHAN_INTRO_VIDEO_1080);
    setDisplay(768, 1);
    expect(pickRakshaBandhanIntroSource()).toBe(RAKSHA_BANDHAN_INTRO_VIDEO_1080);
  });

  it("respects Data Saver and a slow connection over screen size", () => {
    setDisplay(2560, 2); // a large desktop that would otherwise get 1080p

    setConnection({ saveData: true });
    expect(pickRakshaBandhanIntroSource()).toBe(RAKSHA_BANDHAN_INTRO_VIDEO_720);

    setConnection({ effectiveType: "3g" });
    expect(pickRakshaBandhanIntroSource()).toBe(RAKSHA_BANDHAN_INTRO_VIDEO_720);

    setConnection({ effectiveType: "4g" });
    expect(pickRakshaBandhanIntroSource()).toBe(RAKSHA_BANDHAN_INTRO_VIDEO_1080);
  });
});

describe("IST date gate", () => {
  it("reads the date in India, not in the visitor's timezone", () => {
    // 18:30Z on the 27th is already the 28th in Kolkata, and a visitor in Los
    // Angeles at that instant is still on the 27th locally.
    expect(istDateString(new Date("2026-08-27T18:30:00.000Z"))).toBe("2026-08-28");
    expect(istDateString(new Date("2026-08-28T18:29:59.999Z"))).toBe("2026-08-28");
    // One millisecond later it is the 29th in India.
    expect(istDateString(new Date("2026-08-28T18:30:00.000Z"))).toBe("2026-08-29");
  });

  it("is open for exactly the one IST day and closed forever after", () => {
    expect(isRakshaBandhanIntroDay(new Date("2026-08-27T18:30:00.000Z"))).toBe(true);
    expect(isRakshaBandhanIntroDay(new Date("2026-08-28T09:00:00.000Z"))).toBe(true);
    expect(isRakshaBandhanIntroDay(new Date("2026-08-28T18:29:59.999Z"))).toBe(true);

    expect(isRakshaBandhanIntroDay(new Date("2026-08-27T18:29:59.999Z"))).toBe(false);
    expect(isRakshaBandhanIntroDay(new Date("2026-08-28T18:30:00.000Z"))).toBe(false);
    // It disables itself with no deploy — including a year later.
    expect(isRakshaBandhanIntroDay(new Date("2026-08-29T09:00:00.000Z"))).toBe(false);
    expect(isRakshaBandhanIntroDay(new Date("2027-08-28T09:00:00.000Z"))).toBe(false);
  });

  it("never lets the force flag reach production", () => {
    const original = process.env.NEXT_PUBLIC_FORCE_RAKHI_INTRO;
    process.env.NEXT_PUBLIC_FORCE_RAKHI_INTRO = "true";
    try {
      // In this (test) environment NODE_ENV is not "production", so the escape
      // hatch is live and the override works.
      expect(isRakshaBandhanIntroForced()).toBe(true);
      // And forcing is what makes a non-festival date show the intro.
      expect(isRakshaBandhanIntroDay(new Date("2020-01-01T00:00:00.000Z"), true)).toBe(true);
      expect(isRakshaBandhanIntroDay(new Date("2020-01-01T00:00:00.000Z"), false)).toBe(false);
    } finally {
      process.env.NEXT_PUBLIC_FORCE_RAKHI_INTRO = original;
    }
  });
});

describe("RakshaBandhanIntro", () => {
  it("renders nothing at all — and no <video> — on any other day", () => {
    introDay = false;
    const { container } = render(<Intro />);

    // The point is the 13 MB file is never requested off-campaign.
    expect(container).toBeEmptyDOMElement();
    expect(container.querySelector("video")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("covers the viewport above everything, from a real encode", async () => {
    const { container } = render(<Intro />);
    const overlay = screen.getByTestId("rakhi-intro");
    const video = container.querySelector("video")!;

    expect(overlay.className).toMatch(/fixed/);
    expect(Number(overlay.style.zIndex)).toBeGreaterThan(1000);

    // The src is assigned on the client, once the display is measurable —
    // never rendered into the SSR HTML, where the choice cannot be made.
    await waitFor(() => expect(video.getAttribute("src")).toBeTruthy());
    expect([
      RAKSHA_BANDHAN_INTRO_VIDEO_1080,
      RAKSHA_BANDHAN_INTRO_VIDEO_720,
    ]).toContain(video.getAttribute("src"));
  });

  it("uses the attributes mobile autoplay actually requires", () => {
    const { container } = render(<Intro />);
    const video = container.querySelector("video")!;

    // muted + playsinline are jointly what iOS Safari and Android Chrome
    // demand before they will autoplay without a gesture.
    expect(video.muted).toBe(true);
    expect(video.hasAttribute("playsinline")).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video.controls).toBe(false);
    expect(video.loop).toBe(false);
  });

  it("locks scrolling while playing and restores it after the reveal", () => {
    vi.useFakeTimers();
    const { container } = render(<Intro />);
    expect(document.body.style.overflow).toBe("hidden");

    act(() => {
      container.querySelector("video")!.dispatchEvent(new Event("ended"));
    });
    // Still locked while the rectangle is opening.
    expect(document.body.style.overflow).toBe("hidden");

    act(() => void vi.advanceTimersByTime(2500));
    expect(screen.queryByTestId("rakhi-intro")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("restores the previous overflow rather than blanking it", () => {
    // Another component (a dialog, the mobile menu) may already hold a lock.
    document.body.style.overflow = "clip";
    const { unmount } = render(<Intro />);
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("clip");
  });

  it("opens a rectangle at the end instead of fading, then unmounts", () => {
    vi.useFakeTimers();
    const { container } = render(<Intro />);

    expect(screen.getByTestId("rakhi-intro").className).not.toMatch(/ck-rakhi-intro-reveal/);

    act(() => {
      container.querySelector("video")!.dispatchEvent(new Event("ended"));
    });

    const revealing = screen.getByTestId("rakhi-intro");
    expect(revealing.className).toMatch(/ck-rakhi-intro-reveal/);
    // Fading it at the same time would wash the closing seconds out to grey.
    expect(revealing.style.opacity).toBe("1");
    // The site behind is real by now, so clicks must pass through the hole.
    expect(revealing.style.pointerEvents).toBe("none");
    // Skip would sit on top of the reveal; it has done its job.
    expect(screen.queryByRole("button", { name: /skip/i })).toBeNull();

    act(() => void vi.advanceTimersByTime(2500));
    expect(screen.queryByTestId("rakhi-intro")).toBeNull();
  });

  it("starts the rectangle two seconds before the video ends", () => {
    const { container } = render(<Intro />);
    const video = container.querySelector("video")!;
    Object.defineProperty(video, "duration", { value: 9.15, configurable: true });

    // Mid-video: nothing yet.
    Object.defineProperty(video, "currentTime", { value: 5, configurable: true });
    act(() => void video.dispatchEvent(new Event("timeupdate")));
    expect(screen.getByTestId("rakhi-intro").className).not.toMatch(/ck-rakhi-intro-reveal/);

    // 2s from the end: the reveal begins, while the video is still playing.
    Object.defineProperty(video, "currentTime", { value: 7.15, configurable: true });
    act(() => void video.dispatchEvent(new Event("timeupdate")));
    expect(screen.getByTestId("rakhi-intro").className).toMatch(/ck-rakhi-intro-reveal/);
  });

  it("ignores timeupdate until the duration is actually known", () => {
    const { container } = render(<Intro />);
    const video = container.querySelector("video")!;

    // duration is NaN before metadata lands and Infinity for a live stream;
    // both would otherwise satisfy the "near the end" comparison.
    for (const duration of [NaN, Infinity, 0]) {
      Object.defineProperty(video, "duration", { value: duration, configurable: true });
      Object.defineProperty(video, "currentTime", { value: 0, configurable: true });
      act(() => void video.dispatchEvent(new Event("timeupdate")));
    }

    expect(screen.getByTestId("rakhi-intro").className).not.toMatch(/ck-rakhi-intro-reveal/);
  });

  it("cuts the hole with composited masks, and falls back where it cannot", () => {
    const { container } = render(<Intro />);
    const sheet = Array.from(container.querySelectorAll("style"))
      .map((tag) => tag.textContent ?? "")
      .join("\n");

    expect(sheet).toMatch(/mask-composite:\s*exclude/);
    expect(sheet).toMatch(/-webkit-mask-composite:\s*xor/);
    expect(sheet).toMatch(/@keyframes ck-rakhi-intro-open/);
    // Without a fallback the overlay would sit opaque and then cut abruptly.
    expect(sheet).toMatch(/@supports not/);
    expect(sheet).toMatch(/ck-rakhi-intro-open-fallback/);
  });

  it("skips on the Skip button, and marks the session seen", async () => {
    render(<Intro />);

    const skip = screen.getByRole("button", { name: /skip/i });
    act(() => skip.click());

    await waitFor(() => expect(screen.queryByTestId("rakhi-intro")).toBeNull());
    expect(document.body.style.overflow).toBe("");
  });

  it("replays on a refresh, because the flag lives only in the page load", async () => {
    // A refresh tears the module down and rebuilds it. resetModules is the
    // closest jsdom equivalent of that, and it is exactly what makes the
    // difference from sessionStorage, which would survive a refresh.
    const first = render(<Intro />);
    expect(screen.getByTestId("rakhi-intro")).toBeInTheDocument();
    act(() => {
      first.container.querySelector("video")!.dispatchEvent(new Event("error"));
    });
    await waitFor(() => expect(screen.queryByTestId("rakhi-intro")).toBeNull());
    first.unmount();

    vi.resetModules();
    const { RakshaBandhanIntro: Fresh } = await import("./RakshaBandhanIntro");
    render(<Fresh />);

    expect(screen.getByTestId("rakhi-intro")).toBeInTheDocument();
  });

  it("does not re-run while navigating around within one page load", async () => {
    const first = render(<Intro />);
    act(() => {
      first.container.querySelector("video")!.dispatchEvent(new Event("ended"));
    });
    first.unmount();

    // Home -> About -> Home without a reload remounts the component, but the
    // module is still alive, so the intro must not start over mid-browse.
    const second = render(<Intro />);
    expect(second.container).toBeEmptyDOMElement();
    expect(document.body.style.overflow).toBe("");
  });

  it("skips entirely for reduced motion", () => {
    stubMediaAndPlayback({ reducedMotion: true });
    const { container } = render(<Intro />);

    expect(container).toBeEmptyDOMElement();
    expect(document.body.style.overflow).toBe("");
  });

  it("gets out of the way when the video errors", async () => {
    const { container } = render(<Intro />);

    act(() => {
      container.querySelector("video")!.dispatchEvent(new Event("error"));
    });

    await waitFor(() => expect(screen.queryByTestId("rakhi-intro")).toBeNull());
    expect(document.body.style.overflow).toBe("");
  });

  it("gets out of the way when autoplay is refused", async () => {
    window.HTMLMediaElement.prototype.play = vi
      .fn()
      .mockRejectedValue(new DOMException("NotAllowedError"));

    render(<Intro />);

    await waitFor(() => expect(screen.queryByTestId("rakhi-intro")).toBeNull());
    expect(document.body.style.overflow).toBe("");
  });

  it("gets out of the way when nothing ever starts playing", async () => {
    vi.useFakeTimers();
    // A play() that never resolves is a stalled load, not a rejection.
    window.HTMLMediaElement.prototype.play = vi.fn().mockReturnValue(new Promise(() => {}));

    render(<Intro />);
    expect(screen.getByTestId("rakhi-intro")).toBeInTheDocument();

    // The watchdog fires, then the fade completes.
    act(() => void vi.advanceTimersByTime(7000));
    act(() => void vi.advanceTimersByTime(1000));

    expect(screen.queryByTestId("rakhi-intro")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps Skip keyboard reachable and big enough to tap", () => {
    render(<Intro />);
    const skip = screen.getByRole("button", { name: /skip/i });

    // A real button, so it is tabbable and fires on Enter/Space for free.
    expect(skip.tagName).toBe("BUTTON");
    expect(skip.className).toMatch(/focus-visible:ring-2/);
    // 44px, the minimum comfortable touch target.
    expect(skip.className).toMatch(/min-h-11/);
    expect(skip.className).toMatch(/min-w-11/);
  });

  it("chooses its fit from the viewport shape instead of always cropping", () => {
    const { container } = render(<Intro />);
    const sheet = Array.from(container.querySelectorAll("style"))
      .map((tag) => tag.textContent ?? "")
      .join("\n");

    // The source is 16:9. Cover on a portrait phone would crop away most of
    // the frame, including the animation's text.
    expect(sheet).toMatch(/\.ck-rakhi-intro-video\s*\{\s*object-fit:\s*contain/);
    expect(sheet).toMatch(/min-aspect-ratio:\s*8\/5/);
    expect(sheet.slice(sheet.indexOf("min-aspect-ratio"))).toMatch(/object-fit:\s*cover/);
  });

  it("keeps a 100vh fallback alongside 100dvh", () => {
    const { container } = render(<Intro />);
    const sheet = Array.from(container.querySelectorAll("style"))
      .map((tag) => tag.textContent ?? "")
      .join("\n");

    // A style object cannot hold both — the second key would replace the
    // first — so these must live in CSS, where old browsers ignore the dvh
    // line and keep the vh above it.
    expect(sheet).toMatch(/height:\s*100vh/);
    expect(sheet).toMatch(/height:\s*100dvh/);
  });
});
