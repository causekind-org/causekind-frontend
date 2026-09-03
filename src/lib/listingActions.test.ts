import { describe, it, expect, beforeEach } from "vitest";
import {
  canWithdrawListing,
  canDeleteListing,
  canPauseListing,
  canResumeListing,
  canEditListing,
  getHiddenListingIds,
  hideListingLocally,
  filterVisibleListings,
  HIDDEN_LISTINGS_KEY,
} from "./listingActions";

describe("listingActions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("canWithdrawListing", () => {
    it("returns false for DRAFT and terminal statuses", () => {
      expect(canWithdrawListing("DRAFT")).toBe(false);
      expect(canWithdrawListing("REJECTED")).toBe(false);
      expect(canWithdrawListing("WITHDRAWN")).toBe(false);
      expect(canWithdrawListing("EXPIRED")).toBe(false);
      expect(canWithdrawListing("DONATED")).toBe(false);
      expect(canWithdrawListing("FULFILLED")).toBe(false);
    });

    it("returns true for live/pending statuses", () => {
      expect(canWithdrawListing("SUBMITTED")).toBe(true);
      expect(canWithdrawListing("AI_SCREENING")).toBe(true);
      expect(canWithdrawListing("MANUAL_REVIEW")).toBe(true);
      expect(canWithdrawListing("NEEDS_INFORMATION")).toBe(true);
      expect(canWithdrawListing("AVAILABLE")).toBe(true);
      expect(canWithdrawListing("ELIGIBLE_FOR_MATCHING")).toBe(true);
      expect(canWithdrawListing("PAUSED")).toBe(true);
    });
  });

  describe("canDeleteListing", () => {
    it("returns true for drafts and terminal/rejected statuses", () => {
      expect(canDeleteListing("DRAFT")).toBe(true);
      expect(canDeleteListing("REJECTED")).toBe(true);
      expect(canDeleteListing("WITHDRAWN")).toBe(true);
      expect(canDeleteListing("EXPIRED")).toBe(true);
      expect(canDeleteListing("CANCELLED")).toBe(true);
    });

    it("returns false for active submitted statuses", () => {
      expect(canDeleteListing("SUBMITTED")).toBe(false);
      expect(canDeleteListing("AVAILABLE")).toBe(false);
      expect(canDeleteListing("PAUSED")).toBe(false);
      expect(canDeleteListing("NEEDS_INFORMATION")).toBe(false);
    });
  });

  describe("canPauseListing and canResumeListing", () => {
    it("pauses only active matching items", () => {
      expect(canPauseListing("AVAILABLE")).toBe(true);
      expect(canPauseListing("ELIGIBLE_FOR_MATCHING")).toBe(true);
      expect(canPauseListing("PAUSED")).toBe(false);
    });

    it("resumes only paused items", () => {
      expect(canResumeListing("PAUSED")).toBe(true);
      expect(canResumeListing("AVAILABLE")).toBe(false);
    });
  });

  describe("local hidden listings storage", () => {
    it("persists hidden IDs and filters them from list", () => {
      expect(getHiddenListingIds()).toEqual([]);
      hideListingLocally(42);
      expect(getHiddenListingIds()).toEqual([42]);
      hideListingLocally(42); // deduplicated
      expect(getHiddenListingIds()).toEqual([42]);
      hideListingLocally(108);
      expect(getHiddenListingIds()).toEqual([42, 108]);

      const items = [
        { id: 42, title: "Rejected item" },
        { id: 99, title: "Active item" },
        { id: 108, title: "Another deleted item" },
      ];
      const filtered = filterVisibleListings(items);
      expect(filtered).toEqual([{ id: 99, title: "Active item" }]);
    });
  });
});
