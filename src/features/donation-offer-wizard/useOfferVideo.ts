"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createOfferVideoSlot,
  deleteOfferVideo,
  finalizeOfferVideo,
  getOfferVideoCapability,
  getOfferVideoPlayback,
  getOfferVideoStatus,
  uploadOfferVideoBytes,
  createListingVideoSlot,
  deleteListingVideo,
  getCurrentListingVideo,
  finalizeListingVideo,
  getListingVideoCapability,
  getListingVideoPlayback,
  getListingVideoStatus,
  OFFER_VIDEO_TERMINAL,
  type OfferVideoCapability,
  type OfferVideoStatus,
} from "@/lib/api";

/** Sizes as the donor sees them next to the button: whole megabytes. */
function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

/** How often to ask the server how screening is going. */
const POLL_MS = 2500;

/**
 * Stop asking after this long.
 *
 * <p>Screening is transcode plus a malware scan plus visual moderation, so it is
 * seconds-to-a-minute work — but a stuck pipeline must not leave a tab polling
 * forever. Timing out surfaces "still processing" rather than pretending the
 * result is terminal: the video is not lost, and reopening the step picks the
 * status up again.
 */
const POLL_CEILING_MS = 3 * 60 * 1000;

/**
 * The six calls the state machine needs, per owner.
 *
 * <p>Injected rather than branched on an owner-type string: the machine below is
 * genuinely owner-agnostic, and passing it the functions keeps it that way
 * instead of growing an if-offer-else-listing at every call site.
 *
 * <p><b>Pass a stable reference.</b> The two constants below are module-level
 * and so are stable for free. An inline object literal would be a new value on
 * every render, and the capability effect would refetch on each one — use one of
 * these, or memoise.
 */
export type VideoEndpoints = {
  capability: () => Promise<OfferVideoCapability>;
  slot: (
    ownerId: number,
    contentLength: number,
    contentType?: string,
  ) => Promise<import("@/lib/api").OfferVideoSlot>;
  finalize: (ownerId: number, mediaId: number) => Promise<OfferVideoStatus>;
  status: (ownerId: number, mediaId: number) => Promise<OfferVideoStatus>;
  playback: (ownerId: number, mediaId: number) => Promise<{ url: string }>;
  remove: (ownerId: number, mediaId: number) => Promise<void>;
  /**
   * The owner's current video, without needing a media id.
   *
   * <p>Optional because only the listing side has a route for it. Every other
   * read here is keyed on a media id the client is assumed to still hold, which
   * a page reload destroys — so without this a donor who refreshed lost sight of
   * a video that was still being screened while it carried on existing on the
   * server.
   */
  current?: (ownerId: number) => Promise<OfferVideoStatus | null>;
};

export const OFFER_VIDEO_ENDPOINTS: VideoEndpoints = {
  capability: getOfferVideoCapability,
  slot: createOfferVideoSlot,
  finalize: finalizeOfferVideo,
  status: getOfferVideoStatus,
  playback: getOfferVideoPlayback,
  remove: deleteOfferVideo,
};

export const LISTING_VIDEO_ENDPOINTS: VideoEndpoints = {
  capability: getListingVideoCapability,
  slot: createListingVideoSlot,
  finalize: finalizeListingVideo,
  status: getListingVideoStatus,
  playback: getListingVideoPlayback,
  remove: deleteListingVideo,
  current: getCurrentListingVideo,
};

export type OfferVideoState = {
  /** null while we have not asked the server yet. */
  capability: OfferVideoCapability | null;
  video: OfferVideoStatus | null;
  /** A short-lived URL, fetched only once the video is approved. */
  playbackUrl: string | null;
  busy: boolean;
  /** Upload progress is not reported by fetch, so this is a coarse phase label. */
  phase: "idle" | "uploading" | "screening";
  error: string | null;
};

/**
 * Owns the optional item video: capability, upload, screening, removal.
 *
 * <p>Split from {@link useOfferPhotos} rather than folded into it because the
 * two are different shapes of operation. Photos are a synchronous multipart
 * upload that either succeeds or fails; video is a presigned direct-to-S3 PUT
 * followed by asynchronous screening whose verdict arrives later and can be
 * "a human will look at this". Sharing one hook would mean one of the two
 * getting a state machine it does not need.
 */
export function useOfferVideo(
  resolveOwnerId: () => Promise<number>,
  api: VideoEndpoints = OFFER_VIDEO_ENDPOINTS,
) {
  const [state, setState] = useState<OfferVideoState>({
    capability: null,
    video: null,
    playbackUrl: null,
    busy: false,
    phase: "idle",
    error: null,
  });

  // Guards every async continuation. Without it, an upload or a poll that
  // resolves after the donor has left the step calls setState on a dead
  // component and, worse, keeps a timer alive.
  const alive = useRef(true);
  const pollTimer = useRef<number | null>(null);

  // Resolved when the donor first picks a video, then reused for polling,
  // playback and removal.
  //
  // A resolver rather than a plain id because the listing wizard creates its
  // draft lazily — on the first photo — so at mount there is no id to give.
  // Taking a number here meant the field had to be hidden until a photo existed,
  // which made the video option invisible on a fresh listing. Resolving on
  // demand lets picking a video create the draft, exactly as picking a photo
  // does.
  const ownerIdRef = useRef<number | null>(null);

  // Mirrors state.capability. Read through a ref so the size guard in upload()
  // does not add state to that callback's dependencies, which would rebuild it
  // on every poll tick.
  const capabilityRef = useRef<OfferVideoCapability | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (pollTimer.current !== null) window.clearTimeout(pollTimer.current);
    };
  }, []);

  // Ask once whether this deployment takes video at all. A deployment without
  // ffmpeg must never be offered the control, rather than be offered it and
  // fail at the slot request.
  useEffect(() => {
    let cancelled = false;
    api.capability()
      .then(cap => {
        if (!cancelled && alive.current) {
          capabilityRef.current = cap;
          setState(s => ({ ...s, capability: cap }));
        }
      })
      .catch(() => {
        // Treat an unreachable capability check as "not available". Hiding the
        // control is the safe failure: the donor loses an optional extra rather
        // than meeting an error they can do nothing about.
        if (!cancelled && alive.current) {
          const none = { available: false, maxBytes: 0, maxSeconds: 0 };
          capabilityRef.current = none;
          setState(s => ({ ...s, capability: none }));
        }
      });
    return () => { cancelled = true; };
  }, []);

  const fetchPlayback = useCallback(async (mediaId: number) => {
    try {
      const { url } = await api.playback(ownerIdRef.current!, mediaId);
      if (alive.current) setState(s => ({ ...s, playbackUrl: url }));
    } catch {
      // A missing playback URL is not an error worth showing: the status line
      // already tells the donor where the video stands.
    }
  }, [api]);

  /** Polls until the status settles, the ceiling is hit, or the step unmounts. */
  const poll = useCallback((mediaId: number, startedAt: number) => {
    pollTimer.current = window.setTimeout(async () => {
      if (!alive.current) return;
      try {
        const next = await api.status(ownerIdRef.current!, mediaId);
        if (!alive.current) return;
        setState(s => ({ ...s, video: next }));

        if (OFFER_VIDEO_TERMINAL.includes(next.status)) {
          setState(s => ({ ...s, busy: false, phase: "idle" }));
          if (next.status === "APPROVED") void fetchPlayback(mediaId);
          return;
        }
        if (Date.now() - startedAt > POLL_CEILING_MS) {
          setState(s => ({ ...s, busy: false, phase: "idle" }));
          return;
        }
        poll(mediaId, startedAt);
      } catch {
        // A dropped poll is not a failed upload. Stop asking, keep the last
        // known status, and let reopening the step pick it back up.
        if (alive.current) setState(s => ({ ...s, busy: false, phase: "idle" }));
      }
    }, POLL_MS);
  }, [api, fetchPlayback]);

  /**
   * Restores the owner's existing video when the wizard opens.
   *
   * <p>The resume path. Without it a donor returning to a draft saw an empty
   * video block while the media row carried on existing on the server — and,
   * because the server refuses a second active video, "Record video" would then
   * fail with "this listing already has a video" about one they could not see.
   *
   * <p>A no-op where the endpoint set has no `current` route, so the offer
   * wizard is unaffected.
   */
  const hydrate = useCallback(async (ownerId: number) => {
    if (!api.current) return;
    ownerIdRef.current = ownerId;
    try {
      const existing = await api.current(ownerId);
      if (!alive.current || !existing) return;
      setState(s => ({ ...s, video: existing }));

      if (existing.status === "APPROVED") {
        void fetchPlayback(existing.mediaId);
        return;
      }
      // Still moving. Pick the poll back up rather than leaving a video frozen
      // at whatever state it happened to be in when the page was closed.
      if (!OFFER_VIDEO_TERMINAL.includes(existing.status)) {
        setState(s => ({ ...s, phase: "screening" }));
        poll(existing.mediaId, Date.now());
      }
    } catch {
      // No video, or the read failed. Neither is worth interrupting the wizard
      // for — the block simply shows nothing, which is its empty state anyway.
    }
  }, [api, fetchPlayback, poll]);

  const upload = useCallback(async (file: Blob) => {
    // Checked here, before a slot is requested.
    //
    // The server enforces the same cap and answers 400 VALIDATION_FAILED, whose
    // copy is "Some details need fixing. Check the highlighted fields." — which
    // names no field, never mentions size, and is the only thing an oversized
    // upload used to produce. The limit is already on screen next to the button,
    // so the client has everything it needs to say something true instead.
    const maxBytes = capabilityRef.current?.maxBytes ?? 0;
    if (maxBytes > 0 && file.size > maxBytes) {
      setState(s => ({
        ...s,
        busy: false,
        phase: "idle",
        error: `That video is ${formatMb(file.size)}. The limit is ${formatMb(maxBytes)} — `
          + "try a shorter clip, or one recorded at a lower quality.",
      }));
      return;
    }

    setState(s => ({ ...s, busy: true, phase: "uploading", error: null, playbackUrl: null }));
    try {
      const ownerId = await resolveOwnerId();
      ownerIdRef.current = ownerId;
      // A recorded Blob carries the MIME type MediaRecorder chose, which is WebM
      // on Chrome and Firefox. It is passed through because the server signs it
      // into the presigned PUT — defaulting to MP4 here would make S3 reject every
      // recording. A picked File carries its own type for the same reason.
      const slot = await api.slot(ownerId, file.size, file.type || undefined);
      await uploadOfferVideoBytes(slot, file);
      if (!alive.current) return;

      setState(s => ({ ...s, phase: "screening" }));
      const status = await api.finalize(ownerId, slot.mediaId);
      if (!alive.current) return;

      setState(s => ({ ...s, video: status }));
      if (OFFER_VIDEO_TERMINAL.includes(status.status)) {
        setState(s => ({ ...s, busy: false, phase: "idle" }));
        if (status.status === "APPROVED") void fetchPlayback(status.mediaId);
        return;
      }
      poll(status.mediaId, Date.now());
    } catch (e) {
      if (!alive.current) return;
      setState(s => ({
        ...s,
        busy: false,
        phase: "idle",
        error: e instanceof Error ? e.message : "We couldn't upload that video. Please try again.",
      }));
    }
  }, [resolveOwnerId, api, poll, fetchPlayback]);

  const remove = useCallback(async () => {
    const mediaId = state.video?.mediaId;
    if (mediaId == null) return;
    setState(s => ({ ...s, busy: true, error: null }));
    try {
      await api.remove(ownerIdRef.current!, mediaId);
      if (!alive.current) return;
      if (pollTimer.current !== null) window.clearTimeout(pollTimer.current);
      setState(s => ({ ...s, video: null, playbackUrl: null, busy: false, phase: "idle" }));
    } catch (e) {
      if (!alive.current) return;
      setState(s => ({
        ...s,
        busy: false,
        error: e instanceof Error ? e.message : "We couldn't remove that video. Please try again.",
      }));
    }
  }, [api, state.video?.mediaId]);

  return { ...state, upload, remove, hydrate };
}
