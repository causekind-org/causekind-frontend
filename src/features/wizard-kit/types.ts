/**
 * Types shared by every wizard built on this kit.
 *
 * <p>These lived inside the listing wizard's own hooks, which meant a purely
 * presentational component like `DraftSaveStatus` had to import from
 * `useListingDraft` just to name a union of four strings. A second wizard would
 * then have imported the listing wizard's hook to render its own save chip.
 */

/** Autosave lifecycle, as shown to the user by `DraftSaveStatus`. */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * A photo's upload lifecycle.
 *
 * <p>`failed` deliberately keeps the original `File`, so Retry costs no re-pick.
 */
export type PhotoStatus = "pending" | "uploading" | "uploaded" | "failed";

export type WizardPhoto = {
  /** Stable across the whole lifecycle — never the URL, which changes on upload. */
  id: string;
  status: PhotoStatus;
  /** Object URL for the local preview. Revoked and nulled once uploaded. */
  localUrl: string | null;
  /** Set only once the server has the file. */
  remoteUrl: string | null;
  /** Retained while `failed` so a retry needs no re-pick. */
  file: File | null;
  error: string | null;
  /**
   * Server-side id, for media that is deleted through its own endpoint rather
   * than by rewriting a URL list. The listing flow leaves this null; donation
   * offers set it, because their photos are rows with a DELETE endpoint.
   */
  mediaId?: number | null;
};

/** The uploaded, server-known URLs in display order. */
export function uploadedPhotoUrls(photos: WizardPhoto[]): string[] {
  return photos.filter(p => p.status === "uploaded" && p.remoteUrl).map(p => p.remoteUrl as string);
}
