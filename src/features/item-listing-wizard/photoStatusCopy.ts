import type { ListingPhoto } from "@/lib/api";

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
export type PhotoStatusCopy = {
  /** Short label for the card's badge. */
  labelKey: string;
  /** One sentence explaining the state, or null when the label says it all. */
  detailKey: string | null;
  /** How the donor gets out of this state. */
  actions: ReadonlyArray<"retry" | "replace" | "remove">;
  /** Whether this photo counts toward the two required. */
  counts: boolean;
  /** Whether this photo must be dealt with before submitting. */
  blocks: boolean;
};

const REJECTION_DETAIL: Record<string, string> = {
  IMAGE_ADULT_CONTENT: "listingWizard.photo.reason.adult",
  IMAGE_WEAPONS: "listingWizard.photo.reason.weapons",
  IMAGE_DRUGS: "listingWizard.photo.reason.drugs",
  IMAGE_MEDICINES: "listingWizard.photo.reason.medicines",
  IMAGE_FOOD: "listingWizard.photo.reason.food",
  IMAGE_VULGAR_CONTENT: "listingWizard.photo.reason.vulgar",
  IMAGE_UNREADABLE: "listingWizard.photo.reason.unreadable",
  IMAGE_SCREENING_UNAVAILABLE: "listingWizard.photo.reason.unavailable",
  IMAGE_REVIEW_REQUIRED: "listingWizard.photo.reason.review",
  IMAGE_PROCESSING_FAILED: "listingWizard.photo.reason.failed",
};

/** The line shown for a code this build has never heard of. */
const UNKNOWN_REASON = "listingWizard.photo.reason.generic";

export function photoStatusCopy(photo: Pick<ListingPhoto, "status" | "moderationCode">): PhotoStatusCopy {
  switch (photo.status) {
    case "UPLOADING":
      return { labelKey: "listingWizard.photo.state.uploading", detailKey: null, actions: [], counts: false, blocks: true };

    case "QUARANTINED":
    case "MODERATING_VISUAL":
      // One donor-facing state for both. The distinction between "stored, not
      // yet read" and "being read" is real on the server and means nothing to
      // the person waiting.
      return { labelKey: "listingWizard.photo.state.screening", detailKey: null, actions: ["remove"], counts: false, blocks: true };

    case "APPROVED":
      return { labelKey: "listingWizard.photo.state.approved", detailKey: null, actions: ["replace", "remove"], counts: true, blocks: false };

    case "REJECTED":
      return {
        labelKey: "listingWizard.photo.state.rejected",
        detailKey: reasonKey(photo.moderationCode),
        // No retry: a rejection is a judgement about the picture, and asking
        // again spends another screening call to reach the same answer.
        actions: ["replace", "remove"],
        counts: false,
        blocks: true,
      };

    case "REVIEW_REQUIRED":
      return {
        labelKey: "listingWizard.photo.state.review",
        detailKey: reasonKey(photo.moderationCode),
        // Retry is offered because most of what lands here is our side being
        // unsure or unavailable, not the photo being wrong.
        actions: ["retry", "replace", "remove"],
        counts: false,
        blocks: true,
      };

    case "FAILED":
      return {
        labelKey: "listingWizard.photo.state.failed",
        detailKey: reasonKey(photo.moderationCode),
        actions: ["retry", "replace", "remove"],
        counts: false,
        blocks: true,
      };

    case "DELETED":
      // Should not reach a card; the list excludes it. Handled so a future
      // server change cannot render an empty badge.
      return { labelKey: "listingWizard.photo.state.removed", detailKey: null, actions: [], counts: false, blocks: false };
  }
}

function reasonKey(code: string | null): string {
  if (!code) return UNKNOWN_REASON;
  return REJECTION_DETAIL[code] ?? UNKNOWN_REASON;
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
