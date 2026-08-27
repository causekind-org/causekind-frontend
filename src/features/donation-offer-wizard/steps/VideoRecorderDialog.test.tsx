import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { VideoRecorderDialog } from "./VideoRecorderDialog";

/**
 * The in-page recorder.
 *
 * <p>jsdom has neither `getUserMedia` nor `MediaRecorder`, so both are installed
 * as fakes here. That limits what these tests can honestly claim: they do not
 * show that a real browser records anything. What they do hold is the logic this
 * component actually owns and that a real browser would not check for us —
 * which MIME type is chosen, that audio is never requested, that every exit path
 * stops the camera tracks, and that each failure reaches the donor as words
 * rather than a dead preview.
 *
 * <p>The track-stopping assertions are the ones worth keeping. A leaked
 * `getUserMedia` stream leaves the camera light on after the dialog is gone,
 * which anyone would read as being recorded without consent.
 */

type FakeTrack = { stop: ReturnType<typeof vi.fn>; kind: string };

let tracks: FakeTrack[] = [];
let getUserMedia: ReturnType<typeof vi.fn>;
let supported: string[] = [];
let instances: FakeRecorder[] = [];

class FakeRecorder {
  static isTypeSupported = (type: string) => supported.includes(type);

  state: "inactive" | "recording" = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public stream: unknown, public options: { mimeType: string; videoBitsPerSecond?: number }) {
    instances.push(this);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["frames"], { type: this.options.mimeType }) });
    this.onstop?.();
  }
}

function makeStream() {
  tracks = [{ stop: vi.fn(), kind: "video" }];
  return { getTracks: () => tracks } as unknown as MediaStream;
}

beforeEach(() => {
  instances = [];
  supported = ['video/webm;codecs="vp8"', "video/webm"];
  getUserMedia = vi.fn(async () => makeStream());

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  // jsdom does not implement playback; without this every render logs a
  // "not implemented" error that buries real failures.
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderDialog(overrides: { maxSeconds?: number } = {}) {
  const onCancel = vi.fn();
  const onRecorded = vi.fn();
  render(
    <VideoRecorderDialog
      open
      maxSeconds={overrides.maxSeconds ?? 30}
      onCancel={onCancel}
      onRecorded={onRecorded}
    />,
  );
  return { onCancel, onRecorded };
}

const startButton = () => screen.getByRole("button", { name: /start recording/i });

describe("starting the camera", () => {
  it("asks for video only, so the microphone permission is never involved", async () => {
    renderDialog();

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
    expect(getUserMedia.mock.calls[0][0]).toMatchObject({ audio: false });
  });

  it("prefers MP4 when the browser can produce it", async () => {
    supported = ['video/mp4;codecs="avc1.42E01E"', "video/mp4", "video/webm"];
    renderDialog();

    await waitFor(() => expect(startButton()).toBeEnabled());
    await userEvent.click(startButton());

    expect(instances[0].options.mimeType).toBe('video/mp4;codecs="avc1.42E01E"');
  });

  it("falls back to WebM on browsers that cannot record MP4", async () => {
    renderDialog();

    await waitFor(() => expect(startButton()).toBeEnabled());
    await userEvent.click(startButton());

    expect(instances[0].options.mimeType).toBe('video/webm;codecs="vp8"');
    // Unbounded, a phone camera can exceed the server's size cap well inside
    // the allowed duration — and the donor would only learn that at upload.
    expect(instances[0].options.videoBitsPerSecond).toBeGreaterThan(0);
  });
});

describe("producing a file", () => {
  it("hands back a File named for the container it recorded", async () => {
    const { onRecorded } = renderDialog();

    await waitFor(() => expect(startButton()).toBeEnabled());
    await userEvent.click(startButton());
    await userEvent.click(screen.getByRole("button", { name: /stop/i }));

    await waitFor(() => expect(onRecorded).toHaveBeenCalledTimes(1));
    const file = onRecorded.mock.calls[0][0] as File;
    expect(file.name).toMatch(/\.webm$/);
    // The base type, not the codec string: the server allowlists the container
    // and the probe settles the codec.
    expect(file.type).toBe("video/webm");
    expect(file.size).toBeGreaterThan(0);
  });

  it("releases the camera once the recording is handed over", async () => {
    renderDialog();

    await waitFor(() => expect(startButton()).toBeEnabled());
    await userEvent.click(startButton());
    await userEvent.click(screen.getByRole("button", { name: /stop/i }));

    // The parent closes the dialog on the callback; this asserts the tracks are
    // stopped rather than left running behind it.
    await waitFor(() => expect(tracks[0].stop).toHaveBeenCalled());
  });
});

describe("leaving without a recording", () => {
  it("Cancel calls back and stops the camera", async () => {
    const { onCancel, onRecorded } = renderDialog();

    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onRecorded).not.toHaveBeenCalled();
  });

  it("unmounting mid-recording stops the tracks and hands nothing back", async () => {
    const onRecorded = vi.fn();
    const { unmount } = render(
      <VideoRecorderDialog open maxSeconds={30} onCancel={vi.fn()} onRecorded={onRecorded} />,
    );

    await waitFor(() => expect(startButton()).toBeEnabled());
    await userEvent.click(startButton());
    unmount();

    expect(tracks[0].stop).toHaveBeenCalled();
    // A teardown stop is not the donor pressing Stop, and must not be treated
    // as one — otherwise leaving the step uploads a clip nobody asked to keep.
    expect(onRecorded).not.toHaveBeenCalled();
  });
});

describe("when the camera cannot start", () => {
  it("says access was blocked, and points at the file picker", async () => {
    getUserMedia.mockRejectedValueOnce(
      Object.assign(new Error("denied"), { name: "NotAllowedError" }),
    );
    renderDialog();

    expect(await screen.findByText(/camera access was blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/choose a video file/i)).toBeInTheDocument();
  });

  it("distinguishes no camera from a refused one", async () => {
    getUserMedia.mockRejectedValueOnce(
      Object.assign(new Error("none"), { name: "NotFoundError" }),
    );
    renderDialog();

    expect(await screen.findByText(/no camera was found/i)).toBeInTheDocument();
  });

  it("refuses to start at all when no supported MIME type exists", async () => {
    supported = [];
    renderDialog();

    expect(await screen.findByText(/can't record video/i)).toBeInTheDocument();
    // Nothing to release, and nothing should have been requested.
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
