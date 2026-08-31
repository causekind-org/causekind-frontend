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
  /**
   * The server's screening verdict, for flows whose photos are screened media
   * rows rather than plain uploads.
   *
   * <p>Optional and additive on purpose. {@link PhotoStatus} above describes the
   * *transfer* — picked, sending, sent, failed — and answering "may this photo
   * be used?" with it is what let two files chosen from a picker satisfy a
   * two-photo requirement before either had reached the server. The two are
   * genuinely different questions: a photo can be fully uploaded and rejected.
   *
   * <p>Left undefined by the donation-offer wizard, which shares this type and
   * whose photos are approved on upload. Nothing there reads these.
   */
  moderationStatus?: MediaModerationStatus | null;
  /** Stable reason code behind a non-approved status. Never provider prose. */
  moderationCode?: string | null;
};

/**
 * Server-side media states.
 *
 * <p>Mirrors the backend's `MediaProcessingStatus`. Declared here rather than
 * imported from the API client so the kit does not depend on it, and written
 * out in full rather than as `string` so a status the client does not handle is
 * a compile error instead of a silently unhandled card.
 */
export type MediaModerationStatus =
  | "UPLOADING"
  | "QUARANTINED"
  | "MODERATING_VISUAL"
  | "APPROVED"
  | "REJECTED"
  | "REVIEW_REQUIRED"
  | "FAILED"
  | "DELETED";

/** The uploaded, server-known URLs in display order. */
export function uploadedPhotoUrls(photos: WizardPhoto[]): string[] {
  return photos.filter(p => p.status === "uploaded" && p.remoteUrl).map(p => p.remoteUrl as string);
}
