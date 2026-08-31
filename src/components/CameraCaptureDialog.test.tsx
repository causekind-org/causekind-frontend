import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { CameraCaptureDialog } from "./CameraCaptureDialog";

/**
 * The shared capture dialog, which serves two opposite jobs.
 *
 * <p>The bug these pin: mirroring was unconditional. A selfie *should* be
 * mirrored — it matches the bathroom mirror everyone expects. A rear-camera
 * photo must not be, and both rear-camera callers (the item-listing wizard and
 * the tasks card) were getting the selfie treatment, so every item photo, and
 * every document photographed for a task, was saved back to front — labels,
 * model numbers and serials reversed with them.
 *
 * <p>What these tests can honestly claim is narrow. jsdom has no camera, so
 * `getUserMedia` is a fake and nothing here proves a real device works; that is
 * what the real-browser pass is for. What they do hold is the decision this
 * component owns — whether the flip is applied, and to *both* the preview and
 * the saved frame, which are two separate code paths that were mirrored by two
 * separate mechanisms and could drift apart in either direction.
 */

type FakeTrack = { stop: ReturnType<typeof vi.fn>; kind: string };

let tracks: FakeTrack[] = [];
let getUserMedia: ReturnType<typeof vi.fn>;

beforeEach(() => {
  tracks = [{ stop: vi.fn(), kind: "video" }];
  getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => tracks });

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });

  // jsdom's HTMLMediaElement throws on play(); the dialog calls it on the preview.
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function preview() {
  return screen.getByTestId("camera-preview");
}

describe("mirroring follows the camera, not the caller", () => {
  it("mirrors the preview for the front camera (the selfie default)", async () => {
    render(
      <CameraCaptureDialog open onOpenChange={() => {}} onCapture={() => {}} onChoosePhoto={() => {}} />,
    );
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    expect(preview().className).toContain("scaleX(-1)");
  });

  it("does not mirror the preview for the rear camera", async () => {
    render(
      <CameraCaptureDialog
        open
        facingMode="environment"
        onOpenChange={() => {}}
        onCapture={() => {}}
        onChoosePhoto={() => {}}
      />,
    );
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    expect(preview().className).not.toContain("scaleX(-1)");
  });

  it("lets a caller override the flip independently of the camera", async () => {
    // "Which camera" and "mirror it" are separate questions; the default ties
    // them only because that is right for every caller today.
    render(
      <CameraCaptureDialog
        open
        facingMode="environment"
        mirrored
        onOpenChange={() => {}}
        onCapture={() => {}}
        onChoosePhoto={() => {}}
      />,
    );
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    expect(preview().className).toContain("scaleX(-1)");
  });

  it("asks for the requested camera as ideal, never exact", async () => {
    // `exact` fails outright on a device with only one camera.
    render(
      <CameraCaptureDialog
        open
        facingMode="environment"
        onOpenChange={() => {}}
        onCapture={() => {}}
        onChoosePhoto={() => {}}
      />,
    );
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    const constraints = getUserMedia.mock.calls[0][0] as { video: { facingMode: unknown } };
    expect(constraints.video.facingMode).toEqual({ ideal: "environment" });
  });
});

describe("caller-supplied copy and filenames", () => {
  it("defaults to the selfie wording it always had", async () => {
    render(
      <CameraCaptureDialog open onOpenChange={() => {}} onCapture={() => {}} onChoosePhoto={() => {}} />,
    );
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    expect(screen.getByText(/keep your face clearly visible/i)).toBeInTheDocument();
  });

  it("uses the caller's title and instructions when given", async () => {
    // The item wizard told donors to keep their face visible while photographing
    // a chair, because the copy was baked into the shared dialog.
    render(
      <CameraCaptureDialog
        open
        facingMode="environment"
        title="Photograph the item"
        instructions="Fill the frame with the item."
        onOpenChange={() => {}}
        onCapture={() => {}}
        onChoosePhoto={() => {}}
      />,
    );
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: "Photograph the item" })).toBeInTheDocument();
    expect(screen.getByText("Fill the frame with the item.")).toBeInTheDocument();
    expect(screen.queryByText(/keep your face clearly visible/i)).not.toBeInTheDocument();
  });
});

describe("the camera is released", () => {
  it("stops every track when the dialog closes", async () => {
    const { rerender } = render(
      <CameraCaptureDialog open onOpenChange={() => {}} onCapture={() => {}} onChoosePhoto={() => {}} />,
    );
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());

    rerender(
      <CameraCaptureDialog
        open={false}
        onOpenChange={() => {}}
        onCapture={() => {}}
        onChoosePhoto={() => {}}
      />,
    );
    await waitFor(() => expect(tracks[0].stop).toHaveBeenCalled());
  });

  it("stops every track on unmount", async () => {
    // A leaked stream leaves the camera light on after the dialog is gone, which
    // anyone would reasonably read as being recorded without consent.
    const { unmount } = render(
      <CameraCaptureDialog open onOpenChange={() => {}} onCapture={() => {}} onChoosePhoto={() => {}} />,
    );
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    unmount();
    await waitFor(() => expect(tracks[0].stop).toHaveBeenCalled());
  });
});
