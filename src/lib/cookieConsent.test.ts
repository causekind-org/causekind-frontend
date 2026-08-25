import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CONSENT_KEY,
  RE_ASK_DELAY_MS,
  clearConsent,
  hasConsent,
  readConsent,
  subscribeConsent,
  writeConsent,
} from "./cookieConsent";

/**
 * The point of this suite.
 *
 * The Meta pixel fired on every page load regardless of what the visitor clicked,
 * because the banner wrote an answer nothing read. `hasConsent()` is now the only
 * thing standing between a visitor and a third-party tracker, so the cases that
 * matter here are the ones where it must return false: not just "declined", but
 * every unreadable, expired, corrupted and unavailable state. A gate that fails
 * open under any of those is the original bug wearing a function name.
 */
describe("cookie consent", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  describe("hasConsent — the gate that must fail closed", () => {
    it("is true only after an explicit accept", () => {
      writeConsent("accepted");
      expect(hasConsent()).toBe(true);
    });

    it("is false when the visitor has never been asked", () => {
      expect(hasConsent()).toBe(false);
    });

    it("is false after a decline", () => {
      writeConsent("declined");
      expect(hasConsent()).toBe(false);
    });

    it.each([
      ["an old plain string", "yes"],
      ["a truthy-looking word", "true"],
      ["JSON without our shape", '{"consent":true}'],
      ["a decline missing its timestamp", '{"choice":"declined"}'],
      ["an accept spelled as JSON", '{"choice":"accepted","ts":123}'],
      ["malformed JSON", "{oops"],
      ["an empty string", ""],
    ])("is false for %s", (_label, stored) => {
      localStorage.setItem(CONSENT_KEY, stored);
      expect(hasConsent()).toBe(false);
    });

    it("is false when localStorage throws, rather than crashing the page", () => {
      const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("storage disabled");
      });
      expect(hasConsent()).toBe(false);
      spy.mockRestore();
    });
  });

  describe("expiry", () => {
    it("keeps a decline for the re-ask window, then reverts to unset", () => {
      vi.useFakeTimers();
      writeConsent("declined");
      expect(readConsent()).toBe("declined");

      vi.advanceTimersByTime(RE_ASK_DELAY_MS + 1);
      // Unset, so the banner asks again — and NOT "accepted", because an answer
      // going stale is never the visitor agreeing to anything.
      expect(readConsent()).toBe("unset");
      expect(hasConsent()).toBe(false);
    });

    it("never expires an accept", () => {
      vi.useFakeTimers();
      writeConsent("accepted");
      vi.advanceTimersByTime(RE_ASK_DELAY_MS * 365);
      expect(hasConsent()).toBe(true);
    });
  });

  describe("storage format", () => {
    it("writes accept as the bare string older builds already wrote", () => {
      // Changing this shape would silently un-consent everyone who accepted
      // before this module existed.
      writeConsent("accepted");
      expect(localStorage.getItem(CONSENT_KEY)).toBe("accepted");
    });

    it("writes decline as timestamped JSON so it can expire", () => {
      writeConsent("declined");
      const stored = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "{}");
      expect(stored.choice).toBe("declined");
      expect(typeof stored.ts).toBe("number");
    });
  });

  describe("subscribeConsent", () => {
    it("notifies the same tab, so accepting starts tracking without a reload", () => {
      const onChange = vi.fn();
      const unsubscribe = subscribeConsent(onChange);

      writeConsent("accepted");
      expect(onChange).toHaveBeenCalledTimes(1);

      unsubscribe();
      writeConsent("declined");
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("notifies on a clear, so the banner can re-show", () => {
      writeConsent("declined");
      const onChange = vi.fn();
      const unsubscribe = subscribeConsent(onChange);

      clearConsent();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(readConsent()).toBe("unset");

      unsubscribe();
    });

    it("reacts to another tab answering the banner", () => {
      const onChange = vi.fn();
      const unsubscribe = subscribeConsent(onChange);

      window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_KEY }));
      expect(onChange).toHaveBeenCalledTimes(1);

      // An unrelated key must not churn every gated component.
      window.dispatchEvent(new StorageEvent("storage", { key: "ck_theme" }));
      expect(onChange).toHaveBeenCalledTimes(1);

      unsubscribe();
    });
  });
});
