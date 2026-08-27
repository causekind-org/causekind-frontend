import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ReviewSubmitStep } from "./steps/ReviewSubmitStep";
import { emptyModel, type WizardModel } from "./wizardModel";
import enMessages from "../../../messages/en.json";

/**
 * What the review summary says about media.
 *
 * <p>The bug this pins: the summary rendered `uploadedUrls(model.photos)` —
 * every photo that had finished *transferring*, with no notion of whether any
 * had been cleared. A donor doing their final read-through saw a rejected photo
 * sitting there looking exactly like an approved one, and the first they heard
 * of it was Submit failing.
 *
 * <p>Rendered rather than source-scanned, because the assertion is about what a
 * donor reads. next-intl is resolved against the real `en.json`, so a message
 * key that does not exist fails here rather than shipping as a blank.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => {
      let node: unknown = enMessages;
      for (const part of key.split(".")) node = (node as Record<string, unknown>)?.[part];
      if (typeof node !== "string") return key;
      return node.replace(/\{(\w+)\}/g, (_, name) => String(values?.[name] ?? `{${name}}`));
    };
    return t;
  },
}));

type Photo = WizardModel["photos"][number];

function photo(over: Partial<Photo> = {}): Photo {
  return {
    id: Math.random().toString(36).slice(2),
    localUrl: null,
    remoteUrl: "https://example.invalid/p.jpg",
    status: "uploaded",
    file: null,
    error: null,
    mediaId: 1,
    moderationStatus: "APPROVED",
    moderationCode: null,
    ...over,
  } as Photo;
}

function renderReview(photos: Photo[], video?: unknown) {
  return render(
    <ReviewSubmitStep
      model={{ ...emptyModel, photos } as WizardModel}
      errors={{}}
      groupTitles={{ ownership: "Ownership", safety: "Safety", screening: "Screening" }}
      declarationsInvalidated={false}
      onJump={() => {}}
      onChange={() => {}}
      resubmit={false}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      video={video as any}
    />,
  );
}

describe("photos in the review summary", () => {
  it("shows an approved photo as an image", () => {
    renderReview([photo(), photo()]);
    expect(screen.getAllByAltText(/Item photo/)).toHaveLength(2);
    expect(screen.getByText(/2 of 2 required photos approved/i)).toBeInTheDocument();
  });

  it("does not render an unapproved photo as an image", () => {
    // It has no URL — the server does not issue one for unapproved media — so
    // rendering an <img> would be a broken tile at best.
    renderReview([photo(), photo({ moderationStatus: "REJECTED", moderationCode: "IMAGE_WEAPONS", remoteUrl: null })]);
    expect(screen.getAllByAltText(/Item photo/)).toHaveLength(1);
  });

  it("labels a rejected photo instead of hiding it", () => {
    // Hiding it would be worse than showing it: the donor has to know it is
    // still attached and still blocking.
    renderReview([photo(), photo({ moderationStatus: "REJECTED", moderationCode: "IMAGE_FOOD", remoteUrl: null })]);
    expect(screen.getByText(/needs replacing/i)).toBeInTheDocument();
  });

  it("labels a photo that is still being checked", () => {
    renderReview([photo(), photo({ moderationStatus: "QUARANTINED", remoteUrl: null })]);
    expect(screen.getByText(/checking/i)).toBeInTheDocument();
  });

  it("counts only approved photos in the summary line", () => {
    renderReview([photo(), photo({ moderationStatus: "REVIEW_REQUIRED", remoteUrl: null })]);
    expect(screen.getByText(/1 of 2 required photos approved/i)).toBeInTheDocument();
  });

  it("says so when there are no photos at all", () => {
    renderReview([]);
    expect(screen.getByText(/no photos uploaded yet/i)).toBeInTheDocument();
  });
});

describe("the optional video in the review summary", () => {
  it("is absent entirely when there is no video", () => {
    // Zero videos is a valid listing; a row saying "no video" would imply it was
    // something the donor had failed to do.
    renderReview([photo(), photo()], { video: null });
    expect(screen.queryByText(/short video/i)).not.toBeInTheDocument();
  });

  it("says an approved video is ready", () => {
    renderReview([photo(), photo()], { video: { mediaId: 5, status: "APPROVED" } });
    expect(screen.getByText(/checked and ready/i)).toBeInTheDocument();
  });

  it("tells the donor a rejected video must go before submitting", () => {
    renderReview([photo(), photo()], { video: { mediaId: 5, status: "REJECTED" } });
    expect(screen.getByText(/can't be accepted/i)).toBeInTheDocument();
  });

  it("offers removal as the way past a video stuck in review", () => {
    // The donor must never be trapped waiting on a human for something optional.
    renderReview([photo(), photo()], { video: { mediaId: 5, status: "REVIEW_REQUIRED" } });
    expect(screen.getByText(/submit without one/i)).toBeInTheDocument();
  });

  it("shows in-progress screening rather than nothing", () => {
    renderReview([photo(), photo()], { video: { mediaId: 5, status: "MODERATING_VISUAL" } });
    expect(screen.getByText(/still being checked/i)).toBeInTheDocument();
  });
});
