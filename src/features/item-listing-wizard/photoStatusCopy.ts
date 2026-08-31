import type { ListingPhoto } from "@/lib/api";
import {
  mediaStatusCopy,
  PHOTO_COPY,
  type MediaStatusCopy,
} from "@/features/wizard-kit/mediaStatusCopy";

/**
 * What a donor is told about one photo.
 *
 * <p>The server sends a status and a stable code; it never sends prose. This is
 * the only place either becomes words. Keeping the mapping here rather than
 * inline in the card means the wizard, the review step and any future surface
 * cannot describe the same code differently.
 *
 * <p>Three rules the copy obeys, all of them deliberate:
 *
 * <p><b>No detail that helps someone get round the check.</b> "Appears to show a
 * weapon" is enough for a donor to understand and act. Explaining what
 * specifically was detected, or how confident the model was, teaches the next
 * attempt what to hide.
 *
 * <p><b>No graphic restatement.</b> A rejection for adult content says the
 * category and nothing else. Repeating a description of what was in the picture
 * serves nobody.
 *
 * <p><b>An unknown code is not a blank.</b> Codes are added server-side and a
 * deployed client is always older than the server it talks to, so anything
 * unrecognised falls back to a line that is still true and still actionable —
 * never the raw code, which reads as a crash.
 */

/**
 * A wizard photo seen as the server sees it.
 *
 * <p>The wizard's own `status` describes the *transfer* and the server's
 * describes the *verdict*; this picks the second. A photo with no moderation
 * status yet — picked but not uploaded — reads as UPLOADING, which is the
 * honest answer and, crucially, one that does not count.
 */
export function photoView(p: {
  moderationStatus?: ListingPhoto["status"] | null;
  moderationCode?: string | null;
}): Pick<ListingPhoto, "status" | "moderationCode"> {
  return {
    status: p.moderationStatus ?? "UPLOADING",
    moderationCode: p.moderationCode ?? null,
  };
}

/** i18n message keys. English lives in `messages/en.json` under `listingWizard.photo`. */
export type PhotoStatusCopy = MediaStatusCopy;

/**
 * The photo table and state machine now live in the shared media contract, so
 * a video and a photo cannot describe the same situation differently. The key
 * names are unchanged — they are already translated in every locale, and
 * renaming them for tidiness would drop thirteen files back to English.
 */
export function photoStatusCopy(photo: Pick<ListingPhoto, "status" | "moderationCode">): PhotoStatusCopy {
  return mediaStatusCopy(photo, PHOTO_COPY);
}


/**
 * How many of the photos on screen actually satisfy the requirement.
 *
 * <p>Counts APPROVED and nothing else — the client's old rule counted anything
 * picked or uploading, so two files chosen from a picker could enable Continue
 * before either had been stored, let alone screened. The server enforces this
 * independently; this exists so the donor is told the truth before they press
 * a button that would fail.
 */
export function approvedCount(photos: ReadonlyArray<Pick<ListingPhoto, "status">>): number {
  return photos.filter(p => p.status === "APPROVED").length;
}

/** Photos still needing the donor's attention before the listing can be submitted. */
export function unresolvedPhotos<T extends Pick<ListingPhoto, "status" | "moderationCode">>(
  photos: ReadonlyArray<T>,
): T[] {
  return photos.filter(p => photoStatusCopy(p).blocks);
}
