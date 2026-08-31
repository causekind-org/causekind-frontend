import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("./VideoRecorderDialog", () => ({
  // A stand-in with the two exits that matter, so the field's own wiring is
  // what gets exercised rather than jsdom's absent media stack.
  VideoRecorderDialog: ({ maxSeconds, onCancel, onRecorded }: {
    maxSeconds: number;
    onCancel: () => void;
    onRecorded: (file: File) => void;
  }) => (
    <div data-testid="recorder-dialog" data-max-seconds={maxSeconds}>
      <button type="button" onClick={() => onRecorded(recorded())}>stub-finish</button>
      <button type="button" onClick={onCancel}>stub-cancel</button>
    </div>
  ),
}));

import { OfferVideoField } from "./OfferVideoField";
import type { OfferVideoState } from "../useOfferVideo";

/**
 * The optional item video control.
 *
 * <p>What these pin is the split into two actions with different machinery
 * behind them. Record opens the in-page recorder; Choose opens the file picker.
 * The pairing is asserted directly — pressing Record must not touch the file
 * input, and pressing Choose must not start a camera — because a regression that
 * crossed them would still render two plausible-looking buttons.
 *
 * <p>The recorder itself is stubbed here. Driving `getUserMedia` and
 * `MediaRecorder` under jsdom would test the stubs rather than the component;
 * what this file is responsible for is that the dialog opens, that a recorded
 * file reaches `onPick`, and that cancelling hands over nothing.
 *
 * <p>The other invariant worth holding is the input reset. Re-selecting the same
 * file is the common case after a rejection or a removal, and a browser fires no
 * `change` when the value is unchanged; without the reset the donor's second
 * attempt silently does nothing. jsdom will not reproduce that on its own, so
 * the reset is asserted on the element.
 */

const CAPABLE: OfferVideoState = {
  capability: { available: true, maxBytes: 25 * 1024 * 1024, maxSeconds: 30 },
  video: null,
  playbackUrl: null,
  busy: false,
  phase: "idle",
  error: null,
};

function renderField(overrides: Partial<OfferVideoState> = {}, handlers: {
  onPick?: (f: File) => void;
  onRemove?: () => void;
} = {}) {
  const onPick = handlers.onPick ?? vi.fn();
  const onRemove = handlers.onRemove ?? vi.fn();
  render(
    <OfferVideoField
      state={{ ...CAPABLE, ...overrides }}
      onPick={onPick}
      onRemove={onRemove}
    />,
  );
  return { onPick, onRemove };
}

const chooseInput = () => screen.getByTestId("video-choose-input") as HTMLInputElement;

const mov = () => new File(["x"], "clip.mov", { type: "video/quicktime" });
/** What the stubbed recorder hands back: WebM, as Chrome and Firefox produce. */
const recorded = () => new File(["x"], "recording-1.webm", { type: "video/webm" });

describe("capability gating", () => {
  it("renders nothing when the server says video is unavailable", () => {
    const { container } = render(
      <OfferVideoField
        state={{ ...CAPABLE, capability: { available: false, maxBytes: 0, maxSeconds: 0 } }}
        onPick={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while capability is still unknown", () => {
    // null is "not heard back yet" — showing a control we may have to withdraw
    // is worse than showing it a moment late.
    const { container } = render(
      <OfferVideoField
        state={{ ...CAPABLE, capability: null }}
        onPick={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("the two actions", () => {
  it("offers both Record video and Choose video when nothing is uploaded", () => {
    renderField();
    expect(screen.getByRole("button", { name: /record video/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose video/i })).toBeInTheDocument();
  });

  it("the recorder stays closed until Record is pressed", () => {
    renderField();
    expect(screen.queryByTestId("recorder-dialog")).not.toBeInTheDocument();
  });

  it("accepts WebM as well as MP4 and MOV, because that is what browsers record", () => {
    renderField();
    expect(chooseInput()).toHaveAttribute("accept", "video/mp4,video/quicktime,video/webm");
  });

  it("takes one file at a time, not many", () => {
    renderField();
    expect(chooseInput()).not.toHaveAttribute("multiple");
  });

  it("both controls are real buttons, so they cannot submit the wizard form", () => {
    renderField();
    expect(screen.getByRole("button", { name: /record video/i })).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: /choose video/i })).toHaveAttribute("type", "button");
  });
});

describe("routing a click to the right machinery", () => {
  it("Record video opens the recorder and never the file picker", async () => {
    renderField();
    const chooseClick = vi.spyOn(chooseInput(), "click");

    await userEvent.click(screen.getByRole("button", { name: /record video/i }));

    expect(screen.getByTestId("recorder-dialog")).toBeInTheDocument();
    expect(chooseClick).not.toHaveBeenCalled();
  });

  it("Choose video opens the file picker and never the recorder", async () => {
    renderField();
    const chooseClick = vi.spyOn(chooseInput(), "click");

    await userEvent.click(screen.getByRole("button", { name: /choose video/i }));

    expect(chooseClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("recorder-dialog")).not.toBeInTheDocument();
  });

  it("gives the recorder the server's duration limit rather than a local guess", async () => {
    renderField();
    await userEvent.click(screen.getByRole("button", { name: /record video/i }));
    expect(screen.getByTestId("recorder-dialog")).toHaveAttribute("data-max-seconds", "30");
  });
});

describe("handing the file over", () => {
  it("a recorded WebM reaches onPick exactly once and closes the recorder", async () => {
    const { onPick } = renderField();

    await userEvent.click(screen.getByRole("button", { name: /record video/i }));
    await userEvent.click(screen.getByRole("button", { name: "stub-finish" }));

    expect(onPick).toHaveBeenCalledTimes(1);
    expect((vi.mocked(onPick).mock.calls[0][0] as File).type).toBe("video/webm");
    // Closing releases the camera. Leaving the dialog mounted would hold the
    // light on for the whole upload.
    expect(screen.queryByTestId("recorder-dialog")).not.toBeInTheDocument();
  });

  it("cancelling the recorder hands over nothing", async () => {
    const { onPick } = renderField();

    await userEvent.click(screen.getByRole("button", { name: /record video/i }));
    await userEvent.click(screen.getByRole("button", { name: "stub-cancel" }));

    expect(onPick).not.toHaveBeenCalled();
    expect(screen.queryByTestId("recorder-dialog")).not.toBeInTheDocument();
  });

  it("a chosen MOV reaches onPick exactly once", async () => {
    const { onPick } = renderField();
    const file = mov();

    await userEvent.upload(chooseInput(), file);

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(file);
  });

  it("cancelling a picker does nothing", () => {
    const { onPick } = renderField();
    // A cancelled picker fires change with an empty list.
    fireEvent.change(chooseInput(), { target: { files: [] } });
    expect(onPick).not.toHaveBeenCalled();
  });

  it("clears the input it used, so the same file can be picked again", async () => {
    const { onPick } = renderField();

    await userEvent.upload(chooseInput(), mov());

    // Without this the browser fires no change on a repeat selection and the
    // donor's second attempt appears to do nothing.
    expect(chooseInput().value).toBe("");
    expect(onPick).toHaveBeenCalledTimes(1);
  });
});

describe("while an upload is in flight", () => {
  it("replaces both actions with one accessible progress line during upload", () => {
    renderField({ busy: true, phase: "uploading" });

    expect(screen.queryByRole("button", { name: /record video/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /choose video/i })).not.toBeInTheDocument();

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/uploading/i);
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("says Checking while screening rather than Uploading", () => {
    renderField({ busy: true, phase: "screening" });
    expect(screen.getByRole("status")).toHaveTextContent(/checking/i);
  });
});

describe("an existing video", () => {
  const approved: Partial<OfferVideoState> = {
    video: {
      mediaId: 7,
      status: "APPROVED",
      moderationCode: null,
      durationMs: 8000,
      playbackUrl: null,
      available: true,
    },
    playbackUrl: "https://example.invalid/clip.mp4",
  };

  it("shows the approved state and hides the pickers", () => {
    renderField(approved);
    expect(screen.getByText(/video added/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /record video/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /choose video/i })).not.toBeInTheDocument();
  });

  it("Remove calls back", async () => {
    const onRemove = vi.fn();
    renderField(approved, { onRemove });

    await userEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("review-required reads as a normal outcome, not an error", () => {
    renderField({
      video: {
        mediaId: 7, status: "REVIEW_REQUIRED", moderationCode: "VIDEO_AWAITING_REVIEW",
        durationMs: 8000, playbackUrl: null, available: true,
      },
    });
    // A human looking at it is expected here; calling it a failure would tell
    // the donor something untrue about their own video.
    expect(screen.getByText(/will check this video/i)).toBeInTheDocument();
  });

  it("a freshly uploaded video reads as in progress, not as a refusal", () => {
    // QUARANTINED is what finalize returns on every successful upload: the bytes
    // arrived and screening has not started. It was grouped with REJECTED, so
    // every accepted video told the donor it had been refused.
    renderField({
      video: {
        mediaId: 7, status: "QUARANTINED", moderationCode: null,
        durationMs: 8000, playbackUrl: null, available: true,
      },
    });

    expect(screen.queryByText(/can.t accept this video/i)).not.toBeInTheDocument();
    expect(screen.getByText(/still being checked/i)).toBeInTheDocument();
  });

  it("surfaces an upload error", () => {
    renderField({ error: "We couldn't upload that video. Please try again." });
    expect(screen.getByText(/couldn't upload that video/i)).toBeInTheDocument();
  });
});
