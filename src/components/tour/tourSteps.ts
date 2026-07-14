// Step definitions for the first-time guided tour. Anchors refer to
// data-tour="..." attributes placed on the actual elements (Navbar, dashboard).
// Steps whose anchor is missing at runtime (mobile, feature-flagged) are skipped.

export type TourStep = {
  anchor: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
  /** Optional CTA rendered instead of "Next" on the final step */
  ctaLabel?: string;
  ctaHref?: string;
};

export type TourRole = "DONOR" | "DONEE";

export const HOME_TOUR: Record<TourRole, TourStep[]> = {
  DONOR: [
    {
      anchor: "nav-requests",
      title: "The Requests board",
      body: "Real, verified needs from people near you. Every request is checked with documents before it goes live — browse here whenever you feel like helping.",
      placement: "bottom",
    },
    {
      anchor: "search",
      title: "Search anything",
      body: "Looking for something specific — wheelchairs, school kits, a blog post? Search works across the whole site.",
      placement: "bottom",
    },
    {
      anchor: "bell",
      title: "Your notifications",
      body: "Matches, approvals, and updates about your donations land here. We keep your latest 10 so nothing important gets lost.",
      placement: "bottom",
    },
    {
      anchor: "menu",
      title: "Your workspace",
      body: "Your Dashboard, Profile, language settings and sign-out live in this menu. Everything about your giving is one tap away.",
      placement: "bottom",
    },
    {
      anchor: "menu",
      title: "Ready to give?",
      body: "Your dashboard is where you list items, track offers, and see your matches. Let's take a quick look.",
      placement: "bottom",
      ctaLabel: "Open my dashboard →",
      ctaHref: "/dashboard",
    },
  ],
  DONEE: [
    {
      anchor: "nav-requests",
      title: "The Requests board",
      body: "This is where verified needs — including yours, once approved — are shown to donors across the platform.",
      placement: "bottom",
    },
    {
      anchor: "search",
      title: "Search anything",
      body: "Find requests, articles, or pages anywhere on the site from here.",
      placement: "bottom",
    },
    {
      anchor: "bell",
      title: "Your notifications",
      body: "Donor offers, verification updates, and match news arrive here — check the bell when something needs your attention.",
      placement: "bottom",
    },
    {
      anchor: "menu",
      title: "Your workspace",
      body: "Your Dashboard, Profile, language settings and sign-out live in this menu.",
      placement: "bottom",
    },
    {
      anchor: "menu",
      title: "Ready to post a need?",
      body: "Your dashboard is where you post requests, follow their journey, and coordinate handovers. Let's take a look.",
      placement: "bottom",
      ctaLabel: "Open my dashboard →",
      ctaHref: "/dashboard",
    },
  ],
};

export const PROFILE_TOUR: Record<TourRole, TourStep[]> = {
  DONOR: [
    {
      anchor: "member-pass",
      title: "Your member pass",
      body: "Your identity on CauseKind — move your cursor over it, it tilts. Tap the avatar area on the pass to set a photo.",
      placement: "right",
    },
    {
      anchor: "profile-ledger",
      title: "Your impact in numbers",
      body: "Items listed, active matches, donations completed — this ledger updates live as your giving moves.",
      placement: "bottom",
    },
    {
      anchor: "story",
      title: "Your story",
      body: "A chronicle of everything you've done here — every listing, match, and completed donation, newest first. It writes itself.",
      placement: "top",
    },
    {
      anchor: "milestones",
      title: "Milestones",
      body: "Earned by doing, never bought. Your first listing, first match, and first completed donation each unlock a stamp.",
      placement: "left",
    },
    {
      anchor: "account-settings",
      title: "Keep your details current",
      body: "Name, phone, city, and location live here — accurate details help us match you with needs truly near you.",
      placement: "bottom",
    },
  ],
  DONEE: [
    {
      anchor: "member-pass",
      title: "Your member pass",
      body: "Your identity on CauseKind — move your cursor over it, it tilts. Tap the avatar area on the pass to set a photo.",
      placement: "right",
    },
    {
      anchor: "profile-ledger",
      title: "Your journey in numbers",
      body: "Needs posted, matches in progress, needs fulfilled — this ledger updates live as things move.",
      placement: "bottom",
    },
    {
      anchor: "story",
      title: "Your story",
      body: "A chronicle of everything on your CauseKind journey — every request, match, and received donation, newest first.",
      placement: "top",
    },
    {
      anchor: "milestones",
      title: "Milestones",
      body: "Earned by doing. Your first need, first match, and first fulfilled need each unlock a stamp.",
      placement: "left",
    },
    {
      anchor: "account-settings",
      title: "Keep your details current",
      body: "Name, phone, city, and location live here — accurate details help donors near you find your requests.",
      placement: "bottom",
    },
  ],
};

export const DASHBOARD_TOUR: Record<TourRole, TourStep[]> = {
  DONOR: [
    {
      anchor: "primary-cta",
      title: "List an item",
      body: "Have something to give? List it here — our matching engine quietly finds verified people who need exactly that.",
      placement: "bottom",
    },
    {
      anchor: "ledger",
      title: "Your giving at a glance",
      body: "Items listed, active matches, donations completed — your impact, always up to date.",
      placement: "bottom",
    },
    {
      anchor: "offers",
      title: "Track your offers",
      body: "When you offer an item to a specific request, follow every step here — from AI screening to the recipient's doorstep.",
      placement: "top",
    },
    {
      anchor: "matches",
      title: "Match opportunities",
      body: "When someone needs what you've listed, the match appears here. Accept it and we'll guide the handover end to end.",
      placement: "top",
    },
  ],
  DONEE: [
    {
      anchor: "primary-cta",
      title: "Post a need",
      body: "Tell us what you need and why. A short verification keeps the platform trustworthy — then donors can find and fulfil your request.",
      placement: "bottom",
    },
    {
      anchor: "ledger",
      title: "Your needs at a glance",
      body: "Requests posted, matches in progress, needs fulfilled — the numbers update as things move.",
      placement: "bottom",
    },
    {
      anchor: "requests-list",
      title: "Follow every request's journey",
      body: "Each request travels the same road: posted → verified → matched → received. The rail shows exactly where yours stands.",
      placement: "top",
    },
    {
      anchor: "matches",
      title: "Matches & handover",
      body: "When a donor is matched to your need, coordinate the handover here — chat, schedule, and confirm receipt safely.",
      placement: "top",
    },
  ],
};
