import { trackClarity } from "@/lib/clarityEvents";
import { trackDonate, trackMeta, trackMetaCustom } from "@/lib/metaEvents";

export type Utm = { source: string; medium: string; campaign: string; content: string };

const UTM_KEY = "ck_scan_utm";
const MAX_UTM_LENGTH = 200;
const EMPTY_UTM: Utm = { source: "", medium: "", campaign: "", content: "" };

/** UTMs from the URL, else from earlier in this tab: they survive a reload without the query string. */
export function captureUtm(search: string): Utm {
  const params = new URLSearchParams(search);
  const fromUrl: Utm = {
    source: (params.get("utm_source") ?? "").slice(0, MAX_UTM_LENGTH),
    medium: (params.get("utm_medium") ?? "").slice(0, MAX_UTM_LENGTH),
    campaign: (params.get("utm_campaign") ?? "").slice(0, MAX_UTM_LENGTH),
    content: (params.get("utm_content") ?? "").slice(0, MAX_UTM_LENGTH),
  };
  try {
    if (Object.values(fromUrl).some(Boolean)) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const stored = sessionStorage.getItem(UTM_KEY);
    return stored ? { ...EMPTY_UTM, ...(JSON.parse(stored) as Partial<Utm>) } : fromUrl;
  } catch {
    return fromUrl; // Storage blocked or a corrupt value: attribution is not worth failing over.
  }
}

/** The pixel loads after hydration, so an event fired on page load would otherwise be dropped. */
function whenPixelReady(send: () => void, triesLeft = 25): void {
  if (typeof (window as unknown as { fbq?: unknown }).fbq === "function") send();
  else if (triesLeft > 0) window.setTimeout(() => whenPixelReady(send, triesLeft - 1), 200);
}

type EventParams = Record<string, string | number>;

/** Never pass donor details here: only event names and amounts go to analytics. */
function track(event: string, params?: EventParams): void {
  const w = window as unknown as { dataLayer?: unknown[] };
  (w.dataLayer ??= []).push({ event, ...params });
  trackClarity(event);
  whenPixelReady(() => trackMetaCustom(event, params));
}

export function trackScanPageView(): void {
  track("scan_page_view");
}

export function trackInitiateCheckout(amount: number): void {
  track("initiate_checkout", { value: amount, currency: "INR" });
  // Meta's standard name as well: ad optimisation reads these, not custom events.
  whenPixelReady(() => trackMeta("InitiateCheckout", { value: amount, currency: "INR" }));
}

export function trackDonationSuccess(amount: number): void {
  track("donation_success", { amount, value: amount, currency: "INR" });
  whenPixelReady(() => trackDonate({ value: amount, currency: "INR" }));
}
