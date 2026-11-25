"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";

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
const NgoProfileToast = dynamic(
  () =>
    import("@/components/NgoProfileToast").then((m) => m.NgoProfileToast),
  { ssr: false },
);
const DrivePickupScheduledPopup = dynamic(
  () =>
    import("@/components/DrivePickupScheduledPopup").then((m) => m.DrivePickupScheduledPopup),
  { ssr: false },
);
const DriveProofPublishedPopup = dynamic(
  () =>
    import("@/components/DriveProofPublishedPopup").then((m) => m.DriveProofPublishedPopup),
  { ssr: false },
);
const NgoCampaignPrompt = dynamic(
  () =>
    import("@/components/NgoCampaignPrompt").then((m) => m.NgoCampaignPrompt),
  { ssr: false },
);

// The reading-progress bar starts at scaleX(0) (invisible), so loading it after
// hydration changes nothing on first paint and keeps it out of the shared chunk.
const ScrollProgress = dynamic(
  () => import("@/components/ScrollProgress").then((m) => m.ScrollProgress),
  { ssr: false },
);

// Lighthouse 24 Nov 2026: these were static imports in the root layout, so
// their code (vaul drawer, dialogs, framer-motion via HandoverCelebration) was
// in the bundle every page hydrates. None paints on first load: the donate
// choices open on a click (links fall through to their href until this loads;
// openDonateChoice() calls are remembered), the docks and the celebration
// appear only after a signed-in user's data arrives.
const DonateChoice = dynamic(
  () => import("@/components/donate/DonateChoice").then((m) => m.DonateChoice),
  { ssr: false },
);
const DonateItemsChoiceModal = dynamic(
  () => import("@/components/donate/DonateItemsChoiceModal").then((m) => m.DonateItemsChoiceModal),
  { ssr: false },
);
const MatchActionDock = dynamic(
  () => import("@/components/matches/MatchActionDock").then((m) => m.MatchActionDock),
  { ssr: false },
);
const DriveNotificationDock = dynamic(
  () => import("@/components/notifications/DriveNotificationDock").then((m) => m.DriveNotificationDock),
  { ssr: false },
);
const CompletionCelebrationWatcher = dynamic(
  () => import("@/components/handover/CompletionCelebrationWatcher").then((m) => m.CompletionCelebrationWatcher),
  { ssr: false },
);

export function DeferredDonateChoice() {
  return <DonateChoice />;
}
export function DeferredDonateItemsChoice() {
  return <DonateItemsChoiceModal />;
}
export function DeferredMatchActionDock() {
  return <MatchActionDock />;
}
export function DeferredDriveNotificationDock() {
  return <DriveNotificationDock />;
}
export function DeferredCompletionCelebration() {
  return <CompletionCelebrationWatcher />;
}

export function DeferredScrollProgress() {
  return <ScrollProgress />;
}

export function DeferredOverlays() {
  const { user } = useAuth();
  const role = user?.role?.replace(/^ROLE_/, "");
  return (
    <>
      {/* Cookie banner switched off — see the note on the import below. */}
      {user && <WelcomeOverlay />}
      <TourController />
      {role === "DONOR" && <><DonorCategoryModal /><DonorListingPrompt /><DoneeRequestPrompt /></>}
      {role === "DONEE" && <DoneeListingPrompt />}
      {(role === "NGO" || role === "NGO_PARTNER") && <><NgoProfileToast /><NgoCampaignPrompt /></>}
      {user && <><DriveProofPublishedPopup /><DrivePickupScheduledPopup /></>}
    </>
  );
}


/** Keep authenticated handover/match modules out of anonymous page startup. */
export function DeferredMemberDocks() {
  const { user } = useAuth();
  if (!user) return null;
  return <><MatchActionDock /><DriveNotificationDock /><CompletionCelebrationWatcher /></>;
}
