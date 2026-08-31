"use client";

import { GoogleTagManager } from "@next/third-parties/google";
import { useCookieConsent } from "@/hooks/useCookieConsent";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-P7693M56";

/**
 * The Google Tag Manager container, which loads only after the visitor accepts
 * cookies.
 *
 * <p>It used to load unconditionally from the layout, while `MetaPixel` mounted
 * beside it was carefully deny-by-default. So the site had one non-essential
 * tracker gated and one not — and GTM is the more consequential of the two,
 * because it is a loader for tags that do not exist yet. A GTM Custom HTML tag
 * runs arbitrary JavaScript, so "the container may load" really means "whatever
 * is later published into the container may run".
 *
 * <p>That is why the gate lives here rather than in the container. Consent is
 * enforced in the app, so it does not depend on every tag published into GTM
 * being configured to respect it. Google Consent Mode is the alternative, but
 * it only constrains tags that opt in — a Custom HTML tag with no consent
 * settings fires regardless. This does not.
 *
 * <p>Gating rules mirror `MetaPixel` exactly, deliberately; the two must not
 * drift:
 * <ul>
 *   <li><b>Deny by default.</b> Anything other than an explicit "accepted" —
 *       unanswered, declined, expired, unreadable, storage disabled, or simply
 *       not yet read on the first paint — renders nothing.</li>
 *   <li><b>No teardown on withdrawal.</b> Returning null stops us adding the
 *       script, but a container already loaded earlier in the session survives,
 *       as do any cookies its tags set. Withdrawal takes effect on the next
 *       page load.</li>
 *   <li><b>Admin routes never ask</b>, because `CookieConsent` skips
 *       `/admin/dashboard` and `/super-admin` — so consent stays "unset" there
 *       and the container correctly never loads.</li>
 * </ul>
 *
 * <p>`@next/third-parties` emits no `<noscript>` iframe, only two `next/script`
 * tags, so there is no second injection path this gate misses.
 */
export default function GoogleTagManagerGated() {
  const consent = useCookieConsent();
  if (consent !== "accepted") return null;

  return <GoogleTagManager gtmId={GTM_ID} />;
}
