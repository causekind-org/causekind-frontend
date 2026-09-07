/**
 * What a user is told about one piece of uploaded media — photo or video.
 *
 * <p>The server sends a status and a stable code; it never sends prose. This is
 * the only place either becomes words. Keeping the mapping here rather than
 * inline in a card means the listing wizard, the offer wizard, the review step
 * and any future surface cannot describe the same code differently.
 *
 * <p>Generalised from `item-listing-wizard/photoStatusCopy`, which remains the
 * model. Photos and videos share the server's `MediaProcessingStatus` and its
 * `moderationCode` field, so they share one state machine here; only the message
 * prefix and the code table differ per kind.
 *
 * <p>Three rules the copy obeys, all of them deliberate and carried over intact:
 *
 * <p><b>No detail that helps someone get round the check.</b> "Appears to show a
 * weapon" is enough for someone to understand and act. Explaining what
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

/** Every processing state either kind of media can be in, server-side. */
export type MediaStatusName =
  | "UPLOADING"
  | "QUARANTINED"
  | "VALIDATING"
  | "TRANSCODING"
  | "MALWARE_SCANNING"
  | "MODERATING_VISUAL"
  | "MODERATING_AUDIO"
  | "REVIEW_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "FAILED"
  | "DELETED";

export type MediaAction = "retry" | "replace" | "remove";

export type MediaStatusCopy = {
  /** Short label for the card's badge. */
  labelKey: string;
  /** One sentence explaining the state, or null when the label says it all. */
  detailKey: string | null;
  /** How the user gets out of this state. */
  actions: ReadonlyArray<MediaAction>;
  /** Whether this item counts toward any required minimum. */
  counts: boolean;
  /** Whether this item must be dealt with before submitting. */
  blocks: boolean;
};

/**
 * The per-kind half: where the message keys live, and what each code means.
 *
 * <p>Photo keys keep their original `listingWizard.photo.*` names. They are
 * already translated into every locale, and renaming them to something tidier
 * would silently drop thirteen files back to English for no user-visible gain.
 */
export type MediaCopySpec = {
  state: (name: string) => string;
  reasons: Readonly<Record<string, string>>;
  genericReason: string;
};

export const PHOTO_COPY: MediaCopySpec = {
  state: (n) => `listingWizard.photo.state.${n}`,
  reasons: {
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
  },
  genericReason: "listingWizard.photo.reason.generic",
};

export const VIDEO_COPY: MediaCopySpec = {
  state: (n) => `media.video.state.${n}`,
  reasons: {
    VIDEO_PROHIBITED_CONTENT: "media.video.reason.prohibited",
    VIDEO_MALWARE_DETECTED: "media.video.reason.malware",
    VIDEO_FORMAT_NOT_SUPPORTED: "media.video.reason.format",
    VIDEO_TOO_LONG: "media.video.reason.tooLong",
    VIDEO_RESOLUTION_TOO_HIGH: "media.video.reason.resolution",
    // NOTE: there is deliberately no size code. The server rejects an oversized
    // video as a validation failure at slot creation, not as a moderation
    // verdict, so a VIDEO_TOO_LARGE code here would be one this client invents
    // and the server can never send. The pre-check reports size through its own
    // preflight key instead.
    VIDEO_UNREADABLE: "media.video.reason.unreadable",
    VIDEO_AWAITING_REVIEW: "media.video.reason.review",
    VIDEO_PROCESSING_FAILED: "media.video.reason.failed",
  },
  genericReason: "media.video.reason.generic",
};

/** Every code this build knows how to describe. Used by the coverage test. */
export function knownCodes(spec: MediaCopySpec): string[] {
  return Object.keys(spec.reasons);
}

function reasonKey(code: string | null | undefined, spec: MediaCopySpec): string {
  if (!code) return spec.genericReason;
  return spec.reasons[code] ?? spec.genericReason;
}

export function mediaStatusCopy(
  media: { status: MediaStatusName; moderationCode?: string | null },
  spec: MediaCopySpec,
): MediaStatusCopy {
  switch (media.status) {
    case "UPLOADING":
      return { labelKey: spec.state("uploading"), detailKey: null, actions: [], counts: false, blocks: true };

    case "QUARANTINED":
    case "VALIDATING":
    case "TRANSCODING":
    case "MALWARE_SCANNING":
    case "MODERATING_VISUAL":
    case "MODERATING_AUDIO":
      // One user-facing state for all of them. The difference between "stored,
      // not yet read", "being transcoded" and "being read" is real on the server
      // and means nothing to the person waiting. Naming each one would also leak
      // the pipeline's shape, and invite "why is it scanning for malware?".
      return { labelKey: spec.state("screening"), detailKey: null, actions: ["remove"], counts: false, blocks: true };

    case "APPROVED":
      return { labelKey: spec.state("approved"), detailKey: null, actions: ["replace", "remove"], counts: true, blocks: false };

    case "REJECTED":
      return {
        labelKey: spec.state("rejected"),
        detailKey: reasonKey(media.moderationCode, spec),
        // No retry: a rejection is a judgement about the content, and asking
        // again spends another screening call to reach the same answer.
        actions: ["replace", "remove"],
        counts: false,
        blocks: true,
      };

    case "REVIEW_REQUIRED":
      return {
        labelKey: spec.state("review"),
        detailKey: reasonKey(media.moderationCode, spec),
        // Retry is offered because most of what lands here is our side being
        // unsure or unavailable, not the upload being wrong.
        actions: ["retry", "replace", "remove"],
        counts: false,
        blocks: true,
      };

    case "FAILED":
      return {
        labelKey: spec.state("failed"),
        detailKey: reasonKey(media.moderationCode, spec),
        actions: ["retry", "replace", "remove"],
        counts: false,
        blocks: true,
      };

    case "DELETED":
      // Should not reach a card; the list excludes it. Handled so a future
      // server change cannot render an empty badge.
      return { labelKey: spec.state("removed"), detailKey: null, actions: [], counts: false, blocks: false };
  }
}
