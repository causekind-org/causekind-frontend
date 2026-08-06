"use client";

import { useCallback, useRef } from "react";
import { deleteOfferMedia, uploadOfferMedia } from "@/lib/api";
import {
  acceptAttr, describeRejectionFor, useWizardPhotos,
  type WizardPhotoLimits,
} from "@/features/wizard-kit/useWizardPhotos";
import type { WizardPhoto } from "@/features/wizard-kit/types";
import { MAX_OFFER_PHOTOS, MIN_OFFER_PHOTOS } from "./offerModel";

/**
 * Offer photos — the kit's lifecycle bound to the offer media endpoints.
 *
 * <p>Two things differ from listing photos, and both are why this adapter
 * exists rather than a shared uploader:
 *
 * <p>**An offer photo is a server row, not a URL in a string.** Deleting it
 * needs `DELETE /offers/{id}/media/{mediaId}`, so uploads must come back with a
 * `mediaId`. `uploadOfferMedia` returns the whole offer rather than the created
 * row, so the new media is identified by diffing against the ids already known.
 *
 * <p>**That diff cannot run concurrently.** Two parallel uploads would each see
 * the other's row as "new" and could claim the same id. Uploads are therefore
 * serialized through a promise chain — the one place this flow gives up
 * parallelism, and it is a correctness requirement, not caution. Everything else
 * (immediate preview, independent status, retry without re-pick, object-URL
 * revocation) is the kit's unchanged behaviour.
 */

/** Mirrors S3Service.ALLOWED_IMAGE_TYPES. The backend rejects video outright —
 *  DonationOfferService's "VIDEO" branch is unreachable dead code — so the
 *  picker must not offer it. */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const LIMITS: WizardPhotoLimits = {
  maxPhotos: MAX_OFFER_PHOTOS,
  minPhotos: MIN_OFFER_PHOTOS,
  acceptedTypes: ACCEPTED_TYPES,
  /** Mirrors spring.servlet.multipart.max-file-size=10MB. */
  maxBytes: 10 * 1024 * 1024,
  typeLabel: "JPEG, PNG, WebP or HEIC",
  sizeLabel: "10MB",
};

export const OFFER_ACCEPT_ATTR = acceptAttr(LIMITS);
export const describeOfferRejection = describeRejectionFor(LIMITS);
export { LIMITS as OFFER_PHOTO_LIMITS };

export function useOfferPhotos(options: {
  offerId: number | null;
  photos: WizardPhoto[];
  setPhotos: (updater: (prev: WizardPhoto[]) => WizardPhoto[]) => void;
  onUrlsChanged?: () => void;
  onRejected?: (message: string) => void;
}) {
  const { offerId, photos, setPhotos, onUrlsChanged, onRejected } = options;

  /** Media ids the client already accounts for, so a diff can spot the new one. */
  const knownIdsRef = useRef<Set<number>>(new Set());
  photos.forEach(p => { if (p.mediaId != null) knownIdsRef.current.add(p.mediaId); });

  /** Serializes uploads — see the note above on why the diff cannot race. */
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());

  const upload = useCallback(async (file: File) => {
    if (offerId == null) throw new Error("No offer draft yet");

    const run = async () => {
      const updated = await uploadOfferMedia(offerId, [file]);
      const media = updated.media ?? [];
      const created = media.find(m => !knownIdsRef.current.has(m.id));
      // Fall back to the newest row, but never mark a photo uploaded without a
      // real server URL/id: validation must count server-known media only.
      const picked = created ?? media[media.length - 1];
      if (!picked?.mediaUrl) throw new Error("The uploaded photo was not returned by the server");
      if (picked) knownIdsRef.current.add(picked.id);
      return { remoteUrl: picked.mediaUrl, mediaId: picked.id };
    };

    const next = chainRef.current.then(run, run);
    chainRef.current = next.catch(() => undefined);
    return next;
  }, [offerId]);

  const removeRemote = useCallback(async (photo: WizardPhoto) => {
    if (offerId == null || photo.mediaId == null) return;
    await deleteOfferMedia(offerId, photo.mediaId);
    knownIdsRef.current.delete(photo.mediaId);
  }, [offerId]);

  return useWizardPhotos({
    photos, setPhotos, limits: LIMITS, upload, removeRemote,
    onUrlsChanged, onRejected,
  });
}
