import { describe, expect, it, vi, afterEach } from "vitest";

import { videoPreflight, type VideoLimits } from "./videoPreflight";
import { knownCodes, VIDEO_COPY } from "./mediaStatusCopy";

/**
 * The browser half of video screening.
 *
 * <p>The rule these pin: a pre-check may only ever say what the server would
 * have said. It exists to answer sooner, never to decide — so it must use the
 * server's own codes, and must stay silent whenever it cannot be sure.
 */

const LIMITS: VideoLimits = {
  maxBytes: 25 * 1024 * 1024,
  maxSeconds: 30,
  allowedContainers: ["mp4", "mov", "webm"],
  maxWidth: 1920,
  maxHeight: 1080,
};

function file(name: string, type: string, size: number): File {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

/** Stubs the metadata probe, which jsdom cannot do — it has no video decoder. */
function stubProbe(result: { seconds: number; width: number; height: number } | null) {
  vi.spyOn(HTMLMediaElement.prototype, "src", "set").mockImplementation(function (this: HTMLVideoElement) {
    queueMicrotask(() => {
      if (result === null) { this.onerror?.(new Event("error")); return; }
      Object.defineProperty(this, "duration", { value: result.seconds, configurable: true });
      Object.defineProperty(this, "videoWidth", { value: result.width, configurable: true });
      Object.defineProperty(this, "videoHeight", { value: result.height, configurable: true });
      this.onloadedmetadata?.(new Event("loadedmetadata"));
    });
  });
}

// jsdom implements neither of these; the module only needs them to round-trip.
URL.createObjectURL = vi.fn(() => "blob:stub");
URL.revokeObjectURL = vi.fn();

afterEach(() => vi.restoreAllMocks());

describe("videoPreflight", () => {
  it("passes a video inside every limit", async () => {
    stubProbe({ seconds: 20, width: 1280, height: 720 });
    expect(await videoPreflight(file("a.mp4", "video/mp4", 5_000_000), LIMITS)).toEqual({ ok: true });
  });

  it("rejects an unsupported container with the server's own code", async () => {
    stubProbe({ seconds: 5, width: 640, height: 480 });
    const r = await videoPreflight(file("a.avi", "video/x-msvideo", 1000), LIMITS);
    expect(r).toEqual({ ok: false, code: "VIDEO_FORMAT_NOT_SUPPORTED" });
  });

  it("rejects an over-long video with the server's own code", async () => {
    stubProbe({ seconds: 45, width: 1280, height: 720 });
    const r = await videoPreflight(file("a.mp4", "video/mp4", 1000), LIMITS);
    expect(r).toEqual({ ok: false, code: "VIDEO_TOO_LONG" });
  });

  it("allows a hair over the limit, because a recorder is not frame-exact", async () => {
    // Recorded in this very app at a 30s cap, reported by the browser as 30.02.
    stubProbe({ seconds: 30.02, width: 1280, height: 720 });
    expect(await videoPreflight(file("a.mp4", "video/mp4", 1000), LIMITS)).toEqual({ ok: true });
  });

  it("rejects an over-large resolution with the server's own code", async () => {
    stubProbe({ seconds: 10, width: 3840, height: 2160 });
    const r = await videoPreflight(file("a.mp4", "video/mp4", 1000), LIMITS);
    expect(r).toEqual({ ok: false, code: "VIDEO_RESOLUTION_TOO_HIGH" });
  });

  it("reports oversize through a preflight key, not an invented code", async () => {
    stubProbe({ seconds: 5, width: 640, height: 480 });
    const r = await videoPreflight(file("a.mp4", "video/mp4", 99_000_000), LIMITS);
    // The server treats oversize as a validation failure, not a moderation
    // verdict, so there is no code to borrow and inventing one would be a lie.
    expect(r).toEqual({ ok: false, messageKey: "media.video.preflight.tooLarge" });
  });

  it("stays silent when the browser cannot decode it — that is not a verdict", async () => {
    // The browser's decoder is not ffmpeg's. Refusing something the server would
    // have accepted would be the courtesy check overruling the real gate.
    stubProbe(null);
    expect(await videoPreflight(file("a.mp4", "video/mp4", 1000), LIMITS)).toEqual({ ok: true });
  });

  it("skips checks an older server did not describe", async () => {
    stubProbe({ seconds: 10, width: 3840, height: 2160 });
    const partial: VideoLimits = { maxBytes: 25 * 1024 * 1024, maxSeconds: 30 };
    // No containers and no dimensions sent → no guess imposed.
    expect(await videoPreflight(file("a.avi", "video/x-msvideo", 1000), partial)).toEqual({ ok: true });
  });

  it("only ever emits codes the copy table can describe", async () => {
    stubProbe({ seconds: 45, width: 3840, height: 2160 });
    const results = [
      await videoPreflight(file("a.avi", "video/x-msvideo", 1000), LIMITS),
      await videoPreflight(file("a.mp4", "video/mp4", 1000), LIMITS),
    ];
    for (const r of results) {
      if (!r.ok && "code" in r) expect(knownCodes(VIDEO_COPY)).toContain(r.code);
    }
  });
});
