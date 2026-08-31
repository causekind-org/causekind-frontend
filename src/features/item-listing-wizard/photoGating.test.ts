import { describe, expect, it } from "vitest";

import { validateStep } from "./wizardSchema";
import { photoStatusCopy, approvedCount, unresolvedPhotos, photoView } from "./photoStatusCopy";
import enMessages from "../../../messages/en.json";
import type { WizardValues } from "./wizardSchema";

/**
 * What decides whether Step 1's Continue is available.
 *
 * <p>The rule that used to be here counted a photo as usable if it was
 * `uploaded`, `uploading` **or** `pending` — so two files chosen from a picker
 * satisfied a two-photo requirement before either had reached the server, let
 * alone been screened. Upload state and screening verdict are different
 * questions, and a photo can be fully uploaded and rejected.
 *
 * <p>These are client-side assertions about what the donor is *told*. The
 * server enforces the same invariant independently and is the authority; that
 * half is covered by `ListingPhotoInvariantTest` on the backend.
 */

type PhotoInput = WizardValues["photos"][number];

function photo(over: Partial<PhotoInput> = {}): PhotoInput {
  return {
    id: crypto.randomUUID(),
    localUrl: null,
    remoteUrl: "https://example.invalid/p.jpg",
    status: "uploaded",
    file: null,
    error: null,
    mediaId: 1,
    moderationStatus: "APPROVED",
    moderationCode: null,
    ...over,
  };
}

/** Only the photo rules matter here; every other field is filled so they pass. */
function values(photos: PhotoInput[]): WizardValues {
  return {
    photos,
    category: "Furniture",
    subcategory: "Chairs",
    title: "A chair",
    quantity: 1,
    brand: "",
    model: "",
    approximateAge: "1-3 years",
    condition: "Good",
    workingStatus: "",
    noDefects: true,
    knownDefects: "",
    accessoriesIncluded: "",
    dimensions: "",
    approximateWeight: "",
    description: "A perfectly ordinary chair in good condition, ready to use.",
    countryIso: "IN",
    stateIso: "MH",
    city: "Pune",
    locality: "",
    pincode: "411001",
    declarationsConfirmed: false,
  } as WizardValues;
}

const photoError = (photos: PhotoInput[]) => validateStep("photos", values(photos)).photos;

describe("only approved photos unlock Continue", () => {
  it("passes with two distinct approved photos", () => {
    expect(photoError([photo(), photo()])).toBeUndefined();
  });

  it("blocks with one approved photo", () => {
    expect(photoError([photo()])).toMatch(/at least 2/i);
  });

  it("blocks with no photos", () => {
    expect(photoError([])).toMatch(/at least 2/i);
  });

  it("does not count a picked-but-not-uploaded file", () => {
    // The exact regression: two files chosen from the picker used to satisfy
    // the rule before either had left the browser.
    const picked = photo({ status: "pending", mediaId: null, moderationStatus: null, remoteUrl: null });
    expect(photoError([picked, picked])).toBeTruthy();
  });

  it("does not count a photo that is still uploading", () => {
    const uploading = photo({ status: "uploading", mediaId: null, moderationStatus: null });
    expect(photoError([uploading, uploading])).toBeTruthy();
  });

  it("does not count a photo that is uploaded but still being screened", () => {
    // Uploaded is not approved. This is the state a donor sees for a second or
    // two after every successful upload.
    const screening = photo({ moderationStatus: "QUARANTINED" });
    expect(photoError([screening, screening])).toBeTruthy();
  });

  it.each(["REJECTED", "REVIEW_REQUIRED", "FAILED", "UPLOADING", "MODERATING_VISUAL"] as const)(
    "does not count a %s photo",
    status => {
      expect(photoError([photo(), photo({ moderationStatus: status })])).toBeTruthy();
    },
  );
});

describe("every attached photo must be resolved", () => {
  it("blocks when a third photo was rejected, even though two passed", () => {
    const error = photoError([photo(), photo(), photo({ moderationStatus: "REJECTED", moderationCode: "IMAGE_WEAPONS" })]);
    expect(error).toMatch(/finish checking|can't be used/i);
  });

  it("stops blocking once the offending photo is removed", () => {
    expect(photoError([photo(), photo()])).toBeUndefined();
  });

  it("a DELETED row does not block — it is a tombstone, not an attachment", () => {
    expect(photoError([photo(), photo(), photo({ moderationStatus: "DELETED" })])).toBeUndefined();
  });

  it("blocks above the maximum", () => {
    expect(photoError(Array.from({ length: 6 }, () => photo()))).toMatch(/up to 5/i);
  });
});

describe("counting helpers agree with the schema", () => {
  it("counts only approved", () => {
    expect(approvedCount([
      { status: "APPROVED" }, { status: "APPROVED" },
      { status: "QUARANTINED" }, { status: "REJECTED" },
    ])).toBe(2);
  });

  it("lists everything the donor still has to deal with", () => {
    const unresolved = unresolvedPhotos([
      { status: "APPROVED", moderationCode: null },
      { status: "REJECTED", moderationCode: "IMAGE_FOOD" },
      { status: "REVIEW_REQUIRED", moderationCode: null },
      { status: "DELETED", moderationCode: null },
    ]);
    expect(unresolved.map(p => p.status)).toEqual(["REJECTED", "REVIEW_REQUIRED"]);
  });

  it("treats a photo with no verdict yet as not counting", () => {
    expect(photoView({}).status).toBe("UPLOADING");
    expect(photoStatusCopy(photoView({})).counts).toBe(false);
  });
});

describe("reason codes become copy a donor can act on", () => {
  const messages = enMessages as Record<string, unknown>;

  function resolve(key: string): string | undefined {
    let node: unknown = messages;
    for (const part of key.split(".")) node = (node as Record<string, unknown>)?.[part];
    return typeof node === "string" ? node : undefined;
  }

  const CODES = [
    "IMAGE_ADULT_CONTENT", "IMAGE_WEAPONS", "IMAGE_DRUGS", "IMAGE_MEDICINES",
    "IMAGE_FOOD", "IMAGE_VULGAR_CONTENT", "IMAGE_UNREADABLE",
    "IMAGE_SCREENING_UNAVAILABLE", "IMAGE_REVIEW_REQUIRED", "IMAGE_PROCESSING_FAILED",
  ];

  it.each(CODES)("%s resolves to a real English sentence", code => {
    const copy = photoStatusCopy({ status: "REJECTED", moderationCode: code });
    expect(copy.detailKey).toBeTruthy();
    const text = resolve(copy.detailKey as string);
    expect(text, `${code} has no message in en.json`).toBeTruthy();
    // The raw code must never be what the donor reads.
    expect(text).not.toContain(code);
  });

  it("an unknown code falls back to a safe generic line, never the code itself", () => {
    // A deployed client is always older than the server it talks to, so a code
    // added server-side has to degrade rather than render as a crash.
    const copy = photoStatusCopy({ status: "REJECTED", moderationCode: "IMAGE_SOMETHING_NEW" });
    const text = resolve(copy.detailKey as string);
    expect(text).toBeTruthy();
    expect(text).not.toContain("IMAGE_SOMETHING_NEW");
    expect(text).toMatch(/replace/i);
  });

  it("a missing code still produces copy", () => {
    expect(resolve(photoStatusCopy({ status: "FAILED", moderationCode: null }).detailKey as string)).toBeTruthy();
  });

  it("every state label resolves", () => {
    const states = ["UPLOADING", "QUARANTINED", "MODERATING_VISUAL", "APPROVED",
      "REJECTED", "REVIEW_REQUIRED", "FAILED", "DELETED"] as const;
    for (const status of states) {
      expect(resolve(photoStatusCopy({ status, moderationCode: null }).labelKey)).toBeTruthy();
    }
  });
});

describe("the actions offered match what can actually help", () => {
  it("a rejection offers replace and remove, but not retry", () => {
    // Retrying a rejection spends another screening call to reach the same
    // answer — it is a judgement about the picture, not a transient failure.
    const copy = photoStatusCopy({ status: "REJECTED", moderationCode: "IMAGE_WEAPONS" });
    expect(copy.actions).toContain("replace");
    expect(copy.actions).toContain("remove");
    expect(copy.actions).not.toContain("retry");
  });

  it("an outage offers retry, because it is our side that failed", () => {
    const copy = photoStatusCopy({ status: "FAILED", moderationCode: "IMAGE_SCREENING_UNAVAILABLE" });
    expect(copy.actions).toContain("retry");
  });

  it("an approved photo blocks nothing and counts", () => {
    const copy = photoStatusCopy({ status: "APPROVED", moderationCode: null });
    expect(copy.counts).toBe(true);
    expect(copy.blocks).toBe(false);
  });
});
