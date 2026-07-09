import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

const SUPPORT_EMAIL = "support@causekind.com";

function buildGmailComposeUrl(pageUrl: string): string {
  const subject = "CauseKind Support Request";
  const body = [
    "Hi CauseKind team,",
    "",
    "[Describe your query here]",
    "",
    "---",
    `Page: ${pageUrl}`,
    "CauseKind — Give With Purpose",
    "https://causekind.com",
  ].join("\n");
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: SUPPORT_EMAIL,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/**
 * Deterministic — same output on server and client, so it's safe to use as
 * the initial/SSR render value for an "email us" href with zero hydration
 * risk. Swap in the real page URL from buildSupportGmailUrl() in a
 * useEffect (client-only, post-mount) once the component has hydrated.
 */
export const DEFAULT_SUPPORT_GMAIL_URL = buildGmailComposeUrl("https://causekind.com");

/**
 * Common format for "email us" support links: opens Gmail's web compose
 * (not a plain mailto:) with the subject and body pre-filled — subject
 * names the site, body carries the current page link + a CauseKind blurb.
 * Reads window.location, so it's client-only — call it from a useEffect,
 * never directly during render (the server has no `window`, so a value
 * computed at render time differs between server and client output and
 * React's hydration check fails: "tree hydrated but attributes didn't
 * match"). Use DEFAULT_SUPPORT_GMAIL_URL for the initial render instead.
 */
export function buildSupportGmailUrl(): string {
  const pageUrl = typeof window !== "undefined" ? window.location.href : "https://causekind.com";
  return buildGmailComposeUrl(pageUrl);
}
