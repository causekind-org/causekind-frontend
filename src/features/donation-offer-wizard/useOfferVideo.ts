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
  finalizeListingVideo,
  getListingVideoCapability,
  getListingVideoPlayback,
  getListingVideoStatus,
  OFFER_VIDEO_TERMINAL,
  type OfferVideoCapability,
  type OfferVideoStatus,
} from "@/lib/api";

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
  slot: (ownerId: number, contentLength: number) => Promise<import("@/lib/api").OfferVideoSlot>;
  finalize: (ownerId: number, mediaId: number) => Promise<OfferVideoStatus>;
  status: (ownerId: number, mediaId: number) => Promise<OfferVideoStatus>;
  playback: (ownerId: number, mediaId: number) => Promise<{ url: string }>;
  remove: (ownerId: number, mediaId: number) => Promise<void>;
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
        if (!cancelled && alive.current) setState(s => ({ ...s, capability: cap }));
      })
      .catch(() => {
        // Treat an unreachable capability check as "not available". Hiding the
        // control is the safe failure: the donor loses an optional extra rather
        // than meeting an error they can do nothing about.
        if (!cancelled && alive.current) {
          setState(s => ({ ...s, capability: { available: false, maxBytes: 0, maxSeconds: 0 } }));
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

  const upload = useCallback(async (file: Blob) => {
    setState(s => ({ ...s, busy: true, phase: "uploading", error: null, playbackUrl: null }));
    try {
      const ownerId = await resolveOwnerId();
      ownerIdRef.current = ownerId;
      const slot = await api.slot(ownerId, file.size);
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

  return { ...state, upload, remove };
}
