"use client";

import { useCallback } from "react";
import { uploadListingImage } from "@/lib/api";
import {
  acceptAttr, describeRejectionFor, useWizardPhotos,
  type WizardPhotoLimits,
} from "@/features/wizard-kit/useWizardPhotos";
import type { WizardPhoto } from "./wizardModel";

/**
 * The listing wizard's photo hook — the listing's limits and uploader bound onto
 * {@link useWizardPhotos}.
 *
 * <p>The lifecycle itself (immediate object-URL preview, independent per-file
 * uploads that settle independently, retry without re-picking, and revoking
 * every object URL on remove/upload/unmount) moved into the kit unchanged when
 * the donation-offer wizard needed the same behaviour. The exported names and
 * signatures here are unchanged, so no caller in this feature was touched.
 */

/** Mirrors S3Service.ALLOWED_IMAGE_TYPES — verified, not guessed. */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export const MAX_PHOTOS = 5;
export const MIN_PHOTOS = 2;

const LIMITS: WizardPhotoLimits = {
  maxPhotos: MAX_PHOTOS,
  minPhotos: MIN_PHOTOS,
  acceptedTypes: ACCEPTED_TYPES,
  /** Mirrors spring.servlet.multipart.max-file-size=10MB. */
  maxBytes: 10 * 1024 * 1024,
  typeLabel: "JPEG, PNG, WebP or HEIC",
  sizeLabel: "10MB",
};

export const ACCEPT_ATTR = acceptAttr(LIMITS);
export const describeRejection = describeRejectionFor(LIMITS);

export function useListingPhotos(options: {
  photos: WizardPhoto[];
  setPhotos: (updater: (prev: WizardPhoto[]) => WizardPhoto[]) => void;
  /** Called after any change that alters the uploaded-URL set. */
  onUrlsChanged?: () => void;
  onRejected?: (message: string) => void;
}) {
  const upload = useCallback(
    async (file: File) => ({ remoteUrl: await uploadListingImage(file) }),
    [],
  );

  return useWizardPhotos({
    photos: options.photos,
    setPhotos: options.setPhotos,
    limits: LIMITS,
    upload,
    onUrlsChanged: options.onUrlsChanged,
    onRejected: options.onRejected,
  });
}
