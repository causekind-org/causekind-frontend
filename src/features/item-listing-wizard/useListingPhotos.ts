"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  deleteListingPhoto, getListingPhotos, retryListingPhoto, uploadListingPhoto,
  type ListingPhoto,
} from "@/lib/api";
import {
  acceptAttr, describeRejectionFor, useWizardPhotos,
  type WizardPhotoLimits,
} from "@/features/wizard-kit/useWizardPhotos";
import type { WizardPhoto } from "./wizardModel";

/**
 * The listing wizard's photos — uploaded to the listing, screened by the server,
 * and polled until each one settles.
 *
 * <p>What changed, and why it mattered: a photo used to be uploaded to a global
 * endpoint that returned a permanent URL, and the wizard then posted those URLs
 * back as the listing's photos. Nothing had screened them, the URL strings were
 * what the submission gate counted, and the client's own rule counted a *picked*
 * file as usable — so two files chosen from a picker could enable Continue
 * before either had reached the server. A photo is now a row the server owns,
 * and only its APPROVED status makes it count.
 *
 * <p>The upload itself resolves as soon as the bytes are quarantined; screening
 * happens afterwards, so this hook polls until every photo reaches a state that
 * cannot change on its own.
 */

/** Mirrors UploadPolicy.ALLOWED_MIME_TYPES — verified against the server, not guessed. */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const MAX_PHOTOS = 5;
export const MIN_PHOTOS = 2;

/**
 * The client's copy of the server's limits.
 *
 * <p>Previously wrong in both directions, with a comment claiming it had been
 * verified: it advertised HEIC/HEIF, which the server rejects outright and has
 * no decoder for, and a 10MB ceiling against a server that stops at 8MB. Both
 * produced a generic upload failure that named no cause, on exactly the files
 * an iPhone produces by default.
 */
const LIMITS: WizardPhotoLimits = {
  maxPhotos: MAX_PHOTOS,
  minPhotos: MIN_PHOTOS,
  acceptedTypes: ACCEPTED_TYPES,
  /** Mirrors UploadPolicy.LISTING_PHOTO.maxBytes. */
  maxBytes: 8 * 1024 * 1024,
  typeLabel: "JPEG, PNG or WebP",
  sizeLabel: "8MB",
};

export const ACCEPT_ATTR = acceptAttr(LIMITS);
export const describeRejection = describeRejectionFor(LIMITS);

/** States that cannot change without the donor doing something. */
const TERMINAL = new Set(["APPROVED", "REJECTED", "REVIEW_REQUIRED", "FAILED", "DELETED"]);

const POLL_INTERVAL_MS = 2500;
/**
 * When to stop asking.
 *
 * <p>A timeout is **not** an approval and must never be rendered as one — the
 * photo simply stays in whatever state it was last seen in, which still blocks
 * submission. Screening a single image is seconds; two minutes means something
 * is wrong on our side, and continuing to poll a dead job just burns the
 * donor's battery.
 */
const POLL_TIMEOUT_MS = 120_000;

export function useListingPhotos(options: {
  photos: WizardPhoto[];
  setPhotos: (updater: (prev: WizardPhoto[]) => WizardPhoto[]) => void;
  /** Resolves the draft id, creating one if this is a fresh listing. */
  ensureListingId: () => Promise<number>;
  /** Called after any change that alters the uploaded-URL set. */
  onUrlsChanged?: () => void;
  onRejected?: (message: string) => void;
}) {
  const { ensureListingId, setPhotos } = options;

  const listingIdRef = useRef<number | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedAtRef = useRef<number>(0);

  const upload = useCallback(
    async (file: File) => {
      const listingId = await ensureListingId();
      listingIdRef.current = listingId;
      const photo = await uploadListingPhoto(listingId, file);
      return {
        // A quarantined photo has no address, and that is the contract working.
        // The card renders the local object URL until an approved url arrives.
        remoteUrl: photo.url ?? "",
        mediaId: photo.id,
        moderationStatus: photo.status,
        moderationCode: photo.moderationCode,
      };
    },
    [ensureListingId],
  );

  const removeRemote = useCallback(async (photo: WizardPhoto) => {
    const listingId = listingIdRef.current;
    if (listingId == null || photo.mediaId == null) return;
    await deleteListingPhoto(listingId, photo.mediaId);
  }, []);

  const kit = useWizardPhotos({
    photos: options.photos,
    setPhotos,
    limits: LIMITS,
    upload,
    removeRemote,
    onUrlsChanged: options.onUrlsChanged,
    onRejected: options.onRejected,
  });

  /**
   * Merges a server snapshot into local state.
   *
   * <p>Matched on `mediaId`, never on position or preview URL. That is what
   * makes a late response harmless: a photo the donor removed and replaced has
   * a different id, so an in-flight result for the old one finds nothing to
   * write to and is dropped rather than overwriting the new photo's status.
   * A stale rejection landing on a replacement is exactly the bug this avoids.
   */
  const mergeServerState = useCallback((server: ListingPhoto[]) => {
    const byId = new Map(server.map(p => [p.id, p]));
    setPhotos(prev => prev.map(p => {
      if (p.mediaId == null) return p;
      const remote = byId.get(p.mediaId);
      if (!remote) return p;
      if (remote.status === p.moderationStatus && remote.url === p.remoteUrl) return p;
      return {
        ...p,
        moderationStatus: remote.status,
        moderationCode: remote.moderationCode,
        // Only an approved photo has a url; anything else keeps whatever local
        // preview it had rather than being blanked mid-screening.
        remoteUrl: remote.url ?? p.remoteUrl,
      };
    }));
  }, [setPhotos]);

  /** Photos whose status can still change on its own. */
  const pending = options.photos.filter(
    p => p.mediaId != null && (p.moderationStatus == null || !TERMINAL.has(p.moderationStatus)),
  );
  const pendingCount = pending.length;

  useEffect(() => {
    const listingId = listingIdRef.current;
    if (pendingCount === 0 || listingId == null) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      pollStartedAtRef.current = 0;
      return;
    }
    if (pollTimerRef.current) return; // already polling

    pollStartedAtRef.current = Date.now();
    pollTimerRef.current = setInterval(() => {
      if (Date.now() - pollStartedAtRef.current > POLL_TIMEOUT_MS) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        return; // the photo keeps its last known state, which still blocks
      }
      getListingPhotos(listingId).then(mergeServerState).catch(() => {
        // A dropped poll is not a verdict. Try again on the next tick.
      });
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
  }, [pendingCount, mergeServerState]);

  /** Stops the interval on unmount even if photos are still pending. */
  useEffect(() => () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = null;
  }, []);

  /** Re-screen a photo that failed for our reasons rather than its content. */
  const retryScreening = useCallback(async (id: string) => {
    const listingId = listingIdRef.current;
    const target = options.photos.find(p => p.id === id);
    if (listingId == null || target?.mediaId == null) return;
    const updated = await retryListingPhoto(listingId, target.mediaId);
    setPhotos(prev => prev.map(p =>
      p.id === id
        ? { ...p, moderationStatus: updated.status, moderationCode: updated.moderationCode }
        : p));
  }, [options.photos, setPhotos]);

  /**
   * Loads the server's photos into an empty wizard — the resume path.
   *
   * <p>Without this a donor returning to a draft saw no photos at all, while the
   * rows carried on existing and the submission gate carried on counting them.
   */
  const hydrate = useCallback(async (listingId: number) => {
    listingIdRef.current = listingId;
    const server = await getListingPhotos(listingId);
    setPhotos(() => server
      .filter(p => p.status !== "DELETED")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(p => ({
        id: `media-${p.id}`,
        status: "uploaded" as const,
        localUrl: null,
        remoteUrl: p.url,
        file: null,
        error: null,
        mediaId: p.id,
        moderationStatus: p.status,
        moderationCode: p.moderationCode,
      })));
  }, [setPhotos]);

  return { ...kit, retryScreening, hydrate };
}
