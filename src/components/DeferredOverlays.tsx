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
 * browser — `localStorage` (`WelcomeOverlay`, `CookieConsent`), a geolocation
 * permission (`LocationGate`), or a timer that deliberately waits before
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

const LocationGate = dynamic(
  () => import("@/components/LocationGate").then((m) => m.LocationGate),
  { ssr: false },
);
const CookieConsent = dynamic(
  () => import("@/components/CookieConsent").then((m) => m.CookieConsent),
  { ssr: false },
);
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
const NgoCampaignPrompt = dynamic(
  () =>
    import("@/components/NgoCampaignPrompt").then((m) => m.NgoCampaignPrompt),
  { ssr: false },
);

export function DeferredOverlays() {
  return (
    <>
      <LocationGate />
      <CookieConsent />
      <WelcomeOverlay />
      <TourController />
      <DonorCategoryModal />
      <DoneeListingPrompt />
      <DonorListingPrompt />
      <DoneeRequestPrompt />
      <NgoCampaignPrompt />
    </>
  );
}
