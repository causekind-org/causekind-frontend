"use client";

import dynamic from "next/dynamic";

/**
 * Client boundary that owns every deferred, client-only overlay in the root
 * layout.
 *
 * <p>Why this file exists at all: `next/dynamic` with `ssr: false` is rejected
 * inside a Server Component, and `app/layout.tsx` is one (it is `async` and
 * awaits `getMessages()`). Declaring the same `dynamic()` calls there fails the
 * build with "`ssr: false` is not allowed with `next/dynamic` in Server
 * Components". Hoisting them behind this `"use client"` boundary is the
 * supported way to get the same deferral.
 *
 * <p>What it buys: none of these components render anything on first paint.
 * Each decides whether to show itself from state that only exists in the
 * browser — `localStorage` (`WelcomeOverlay`, `CookieConsent`), or a timer that deliberately waits before
 * appearing (`DonorListingPrompt` waits 800ms). They were previously imported
 * statically into the root layout, which put their JS — and their transitive
 * deps, framer-motion included — into the bundle every route had to load before
 * it could hydrate.
 *
 * <p>`ssr: false` is correct here rather than merely convenient: each one reads
 * a browser-only API in its mount effect, so the server has nothing meaningful
 * to render for them anyway.
 *
 * <p>Deliberately NOT moved here: `SiteHeader`, `SiteFooter`, `ScrollProgress`,
 * `MobileBottomNav`, `FloatingSupportButton`, `SiteBottomBlur`,
 * `RoleClickSpark`, `RoleThemeBridge`, and the two redirect guards. Those are
 * above the fold, wrap `children`, or must run before first paint to avoid a
 * visible flash — deferring them would trade a bundle win for a layout shift.
 *
 * <p>Ordering is preserved from the original layout. `promptLane` serialises
 * which prompt is allowed on screen, and the prompts claim the lane in mount
 * order, so reordering these would silently change which prompt wins a contest.
 */

/*
  The cookie banner is switched off at its only mount point, not deleted.

  Turning it off has a second effect that is easy to miss: `MetaPixel` and
  `GoogleTagManagerGated` both render nothing until `useCookieConsent()` returns
  "accepted", and the banner is what writes that answer. With no banner the
  answer stays unset for ever, so neither tracker ever loads. That is the
  privacy-safe direction — nothing is collected without consent — but it does
  mean analytics and the Meta pixel are now off site-wide.

  Left as a commented import rather than removed so turning it back on is one
  line. `CookieConsent.tsx`, `useCookieConsent` and both gated trackers are all
  untouched and still tested.
*/
// const CookieConsent = dynamic(
//   () => import("@/components/CookieConsent").then((m) => m.CookieConsent),
//   { ssr: false },
// );
const WelcomeOverlay = dynamic(
  () => import("@/components/WelcomeOverlay").then((m) => m.WelcomeOverlay),
  { ssr: false },
);
const TourController = dynamic(
  () => import("@/components/tour/TourController"),
  { ssr: false },
);
const DonorCategoryModal = dynamic(
  () =>
    import("@/components/DonorCategoryModal").then((m) => m.DonorCategoryModal),
  { ssr: false },
);
const DoneeListingPrompt = dynamic(
  () =>
    import("@/components/DoneeListingPrompt").then((m) => m.DoneeListingPrompt),
  { ssr: false },
);
const DonorListingPrompt = dynamic(
  () =>
    import("@/components/DonorListingPrompt").then((m) => m.DonorListingPrompt),
  { ssr: false },
);
const DoneeRequestPrompt = dynamic(
  () =>
    import("@/components/DoneeRequestPrompt").then((m) => m.DoneeRequestPrompt),
  { ssr: false },
);

export function DeferredOverlays() {
  return (
    <>
      {/* Cookie banner switched off — see the note on the import below. */}
      <WelcomeOverlay />
      <TourController />
      <DonorCategoryModal />
      <DoneeListingPrompt />
      <DonorListingPrompt />
      <DoneeRequestPrompt />
    </>
  );
}
