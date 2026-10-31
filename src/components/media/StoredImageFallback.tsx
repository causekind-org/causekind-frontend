"use client";

import { useEffect } from "react";

/** A neutral "image unavailable" tile, inline so it can never fail to load itself. */
export const STORED_IMAGE_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#e7e5e4"/>' +
      '<path d="M18 44l10-12 8 9 6-7 8 10z" fill="#a8a29e"/><circle cx="24" cy="24" r="5" fill="#a8a29e"/></svg>',
  );

/** Our stored files: the S3 bucket (signed or not) or local storage. Other images are left alone. */
export function isStoredFileUrl(src: string): boolean {
  return /\.amazonaws\.com\//.test(src) || src.includes("/local-uploads/");
}

/**
 * One place for every page: when a stored image fails (an expired or missing link), it shows
 * the placeholder instead of the browser's broken-image icon. Listens in the capture phase,
 * because image error events don't bubble.
 */
export function StoredImageFallback() {
  useEffect(() => {
    const onError = (e: Event) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;
      const src = img.currentSrc || img.src;
      if (!src || src.startsWith("data:") || !isStoredFileUrl(src)) return;
      img.srcset = "";
      img.src = STORED_IMAGE_PLACEHOLDER;
    };
    document.addEventListener("error", onError, true);
    return () => document.removeEventListener("error", onError, true);
  }, []);
  return null;
}
