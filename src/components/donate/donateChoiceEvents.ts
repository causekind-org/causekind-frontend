/**
 * Opening the "How would you like to give?" choice without importing it.
 *
 * <p>DonateChoice (and the vaul drawer it pulls in) now loads after hydration
 * via DeferredOverlays, so it is not in the bundle every page needs before it
 * can respond (Lighthouse, 24 Nov 2026). Callers such as the mobile menu import
 * this tiny module instead. A request made before the popup's chunk has
 * arrived is remembered and honoured when it mounts.
 */
export const OPEN_DONATE_CHOICE_EVENT = "ck:open-donate-choice";

type PendingWindow = Window & { __ckDonateChoicePending?: boolean };

export function openDonateChoice() {
  (window as PendingWindow).__ckDonateChoicePending = true;
  window.dispatchEvent(new Event(OPEN_DONATE_CHOICE_EVENT));
}

/** True once if a request arrived before the popup mounted; clears it. */
export function takePendingDonateChoice(): boolean {
  const w = window as PendingWindow;
  const pending = !!w.__ckDonateChoicePending;
  w.__ckDonateChoicePending = false;
  return pending;
}
