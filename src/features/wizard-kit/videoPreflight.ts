import type { OfferVideoCapability } from "@/lib/api";

/**
 * The checks a browser can make before a single byte is uploaded.
 *
 * <p>Three of the server's rejection reasons — container, duration and
 * resolution — are knowable locally. Finding them here turns a 25 MB upload
 * followed by a wait and a refusal into an instant, specific answer, and costs
 * no screening call.
 *
 * <p><b>This is a courtesy, never a gate.</b> Every server-side check stays
 * exactly as it is, and a client that skips this must be refused identically. It
 * exists to explain a doomed upload sooner, not to decide anything. Treating it
 * as the gate would put the rule in the one place an attacker controls.
 *
 * <p><b>The limits come from the server that enforces them</b>, via
 * `/video/capability` — they are `@ConfigurationProperties` and deployment
 * -tunable, so a hardcoded copy here would be a hand-maintained pair that drifts
 * the first time someone changes a property. The listing photo-limits endpoint
 * states the same principle for the same reason.
 *
 * <p>The codes returned are the server's own, so one copy table serves both the
 * pre-check and the polled verdict and the user reads identical wording either
 * way. The single exception is size, which the server treats as a validation
 * failure rather than a moderation verdict; it gets its own preflight key rather
 * than an invented code.
 */

export type VideoPreflightResult =
  | { ok: true }
  /** A server moderation code — same wording as if the server had said it. */
  | { ok: false; code: string }
  /** Not a moderation verdict; the server rejects this as a validation error. */
  | { ok: false; messageKey: string };

/** Limits a pre-check needs. A superset of what /video/capability sends today. */
export type VideoLimits = Pick<OfferVideoCapability, "maxBytes" | "maxSeconds"> & {
  allowedContainers?: readonly string[];
  maxWidth?: number;
  maxHeight?: number;
};

/**
 * Reads duration and dimensions without decoding the whole file.
 *
 * <p>`loadedmetadata` fires as soon as the header is parsed, so this costs a
 * read of the first few KB rather than the whole video. A file the browser
 * cannot parse at all resolves to null and is NOT treated as a failure — the
 * browser's decoder is not the server's, and refusing something ffmpeg would
 * have accepted would be the pre-check overruling the real gate.
 */
export function probeVideo(file: Blob): Promise<{ seconds: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    let settled = false;

    const done = (value: { seconds: number; width: number; height: number } | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };

    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const seconds = Number.isFinite(el.duration) ? el.duration : NaN;
      done(Number.isFinite(seconds) && el.videoWidth > 0
        ? { seconds, width: el.videoWidth, height: el.videoHeight }
        : null);
    };
    el.onerror = () => done(null);

    // A file that never fires either event must not hang the picker.
    setTimeout(() => done(null), 5000);

    el.src = url;
  });
}

/** Container from the file's MIME type, falling back to its extension. */
/** A recorded Blob has a type but no name; a picked File has both. */
function containerOf(file: Blob & { name?: string }): string | null {
  const fromType = /^video\/(.+)$/.exec(file.type)?.[1]?.toLowerCase();
  if (fromType) return fromType === "quicktime" ? "mov" : fromType;
  const ext = file.name?.split(".").pop()?.toLowerCase();
  return ext ? ext : null;
}

export async function videoPreflight(file: Blob & { name?: string }, limits: VideoLimits): Promise<VideoPreflightResult> {
  // Size first: it is free, and it is the check that saves the most bandwidth.
  if (limits.maxBytes > 0 && file.size > limits.maxBytes) {
    return { ok: false, messageKey: "media.video.preflight.tooLarge" };
  }

  // Container next, still free. Only enforced when the server told us its list —
  // an older server that does not send one must not have a guess imposed on it.
  const allowed = limits.allowedContainers;
  if (allowed && allowed.length > 0) {
    const container = containerOf(file);
    if (container && !allowed.includes(container)) {
      return { ok: false, code: "VIDEO_FORMAT_NOT_SUPPORTED" };
    }
  }

  const probe = await probeVideo(file);
  if (!probe) return { ok: true }; // Undecodable here is not a verdict — let the server decide.

  if (limits.maxSeconds > 0 && probe.seconds > limits.maxSeconds + 0.5) {
    // Half a second of slack: browsers report duration to more precision than a
    // recorder targets, and refusing a 30.02s clip against a 30s limit reads as
    // a bug to someone who recorded it in this very app.
    return { ok: false, code: "VIDEO_TOO_LONG" };
  }

  if (limits.maxWidth && limits.maxHeight
      && (probe.width > limits.maxWidth || probe.height > limits.maxHeight)) {
    return { ok: false, code: "VIDEO_RESOLUTION_TOO_HIGH" };
  }

  return { ok: true };
}
