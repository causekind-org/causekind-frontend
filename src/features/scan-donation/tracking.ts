import { tagClarity, trackClarity } from "@/lib/clarityEvents";
import { trackGA } from "@/lib/gaEvents";
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
  trackGA(event, params);
  whenPixelReady(() => trackMetaCustom(event, params));
}

export function trackScanPageView(): void {
  track("scan_page_view");
}

export function trackInitiateCheckout(amount: number): void {
  track("initiate_checkout", { value: amount, currency: "INR" });
  // Meta's standard name as well: ad optimisation reads these, not custom events.
  trackGA("begin_checkout", { value: amount, currency: "INR" });
  whenPixelReady(() => trackMeta("InitiateCheckout", { value: amount, currency: "INR" }));
}

export function trackDonationSuccess(amount: number): void {
  track("donation_success", { amount, value: amount, currency: "INR" });
  trackGA("purchase", { value: amount, currency: "INR", transaction_id: `ck-${Date.now()}` });
  whenPixelReady(() => trackDonate({ value: amount, currency: "INR" }));
}

/**
 * Site-wide analytics for one page (mounted by SiteTracking on every route),
 * to Meta Pixel, GTM, GA4 and Clarity at once: every button/link click with
 * its label, and the time spent on the page when the visitor leaves, switches
 * tab or navigates. Page views themselves come from the Pixel and GA4.
 * No personal details: only path, labels, UTMs and seconds.
 */
export function trackSitePage(path: string): () => void {
  const utm = captureUtm(window.location.search);
  const base: EventParams = { page_path: path };
  const utmParams: EventParams = {
    utm_source: utm.source, utm_medium: utm.medium, utm_campaign: utm.campaign, utm_content: utm.content,
  };
  for (const [k, v] of Object.entries(utmParams)) {
    if (v) { base[k] = v; tagClarity(k, String(v)); }
  }

  let started = Date.now();
  let visibleMs = 0;
  let sent = false;
  const sendTime = () => {
    if (sent) return;
    sent = true;
    if (document.visibilityState === "visible") visibleMs += Date.now() - started;
    const seconds = Math.round(visibleMs / 1000);
    if (seconds > 0) track("time_on_page", { ...base, seconds });
  };
  // Count only time the tab is visible; send once the visitor leaves.
  const onVisibility = () => {
    if (document.visibilityState === "hidden") { visibleMs += Date.now() - started; sendTime(); sent = false; visibleMs = 0; }
    else started = Date.now();
  };

  const onClick = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest?.("a,button,[role=button]");
    if (!el || el.closest("[data-no-track]")) return;
    const label = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);
    const href = (el.getAttribute("href") ?? "").split("?")[0].slice(0, 200);
    track("site_click", { ...base, label, href });
  };

  document.addEventListener("click", onClick, true);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", sendTime);
  return () => {
    sendTime();
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", sendTime);
  };
}

/** Donate form step reached (0 amount, 1 details, 2 tax/pay). */
export function trackSahasDonateStep(slug: string, step: number, amount: number): void {
  track("sahas_donate_step", { campaign_slug: slug, step: step + 1, value: amount, currency: "INR" });
}
