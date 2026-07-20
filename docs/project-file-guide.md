# CauseKind Frontend — Project File Guide

_Last updated: 2026-07-20 — admin dashboard consolidation (9 pages → 1), super-admin new sections, User Journey polish, homepage UX pass all merged to `main`; new default push target is the `staging` branch (see bottom)._

## What's new (2026-07-20)

- **Admin dashboard consolidated**: `/admin/approvals`, `/admin/ai-logs`, `/admin/matches`, `/admin/offers`, `/admin/verifications`, and the standalone `/admin/whatsapp` page are **gone** — all deleted. Everything now lives as tabs inside `/admin/dashboard` (Campaigns, Requests, Listings, Matches, Offers, Match History, AI Logs, Analytics, WhatsApp, User Journey). Tab visibility is now **permission-aware**: a tab hides itself if the admin's own effective permissions (from `adminGetMyPermissions`) don't grant that capability.
- **`/admin/layout.tsx` and `/super-admin/layout.tsx`** now guard every route under those paths — replaces the ~9 copy-pasted inline `useEffect` role checks that used to live in each page.
- **WhatsApp admin UI deduplicated**: the old raw-HTML `super-admin/WhatsAppPanel.tsx` is deleted; both `/admin/dashboard`'s WhatsApp tab and `/super-admin`'s WhatsApp section now share one component, `components/admin/WhatsAppPanel.tsx`.
- **Super-admin gained 3 new sections**: Admin Access (`AdminPermissionsPanel` — per-resource toggles per admin), Disputes (`DisputesPanel` — resolve post-delivery issues), Audit Log (`AuditLogPanel` — paginated trail of every admin/super-admin action).
- **User Journey** (`components/admin/UserJourneyPanel.tsx`, built by Hardeix + extended by us): search-or-browse any user, see their full chronological lifecycle as an animated timeline, with a donor/donee role filter, colored avatars, jump-to-oldest scroll button, **and** a Suspend/Unsuspend action in the user-summary card. Deep-linkable via `/admin/dashboard?journeyUser=<id>` — the super-admin Users table's new "view" (eye) icon uses this instead of a separate profile page.
- **Navbar fix**: `dashHref` now correctly routes SUPER_ADMIN to `/super-admin` instead of the donor `/dashboard` — was a dead link before. Also fixed a hooks-order violation (`useTilt()` was being called after an early `return null`).
- Branch workflow changed: **default push target is now `staging`, not `main`**, in both repos — `main` only gets updated via a verified merge from `staging`.

---

## Tech Stack
- Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui + Radix primitives
- Deployed on Vercel → causekind.com
- API base: `NEXT_PUBLIC_API_URL` env var (→ https://api.causekind.com via CloudFront → Elastic Beanstalk)
- i18n via `next-intl` (11 languages under `messages/`)

---

## `src/app/` — Pages

| File | Route | Notes |
|------|-------|-------|
| `layout.tsx` | root | Global layout, Navbar, Sonner toaster |
| `page.tsx` | `/` | Landing page — hero, stats, carousels, dynamic categories |
| `login/page.tsx`, `register/page.tsx` | `/login`, `/register` | Auth |
| `forgot-password/page.tsx`, `reset-password/page.tsx` | — | Password reset flow |
| `dashboard/page.tsx` | `/dashboard` | Donor/donee dashboard — listings/requests journey tracker, matches, offers, handover entry points |
| `donee/dashboard/page.tsx`, `donee/offers/page.tsx` | `/donee/*` | Donee-specific views |
| `profile/page.tsx` | `/profile` | Editable profile |
| `campaigns/**` | `/campaigns[/new][/:id]` | Browse, create, detail + Razorpay donate (feature-flagged off — `FEATURES.money`) |
| `items/**` | `/items[/new][/:id][/:id/edit]` | Donor item-listing multi-step form, browse, detail, edit |
| `requests/**` | `/requests[/new][/:id/offer]` | Browse item requests, create, make an offer |
| `offers/**` | `/offers[/:id/handover][/:id/issues]` | Donation-offer Handover Hub (OTP dual-confirm), post-delivery issue reporting |
| `matches/[id]/handover/page.tsx` | `/matches/:id/handover` | Item-listing-match Handover Hub (the *other* handover flow — see Known Duplication below) |
| `admin/layout.tsx` | — | **New** — guards every `/admin/**` route (ADMIN or SUPER_ADMIN) |
| `admin/dashboard/page.tsx` | `/admin/dashboard` | **The** admin surface — tab-based (see "What's new" above). 1800+ lines. |
| `admin/users/page.tsx` | `/admin/users` | Legacy redirect shim → `/admin/dashboard?journeyUser=<id>` (kept so old bookmarked links don't break) |
| `super-admin/layout.tsx` | — | **New** — guards `/super-admin` (SUPER_ADMIN only) |
| `super-admin/page.tsx` | `/super-admin` | Full-screen "Command Center" SPA — sidebar sections: Overview, Users, Campaigns, Donations, Requests, Listings, Matches, WhatsApp, **Admin Access, Disputes, Audit Log** (new), SQL Console |
| `certificate/page.tsx` | `/certificate` | Donation certificate generator |
| `blog/**`, `about/page.tsx`, `faq/page.tsx`, `contact/page.tsx`, `help/page.tsx` | — | Public content pages |
| `privacy/page.tsx`, `terms/page.tsx`, `refund/page.tsx` | — | Legal pages |
| `donate/page.tsx`, `razorpay/page.tsx`, `thank-you/page.tsx` | — | Money-donation flow (feature-flagged off) |

**Known duplication (still unresolved)**: two separate Handover Hub implementations — `/matches/[id]/handover` (backed by `ItemMatchService`) vs `/offers/[id]/handover` (backed by `HandoverService`). Not consolidated as part of the 2026-07-20 admin work; that work only touched the `/admin/**` surface.

---

## `src/components/` — UI Components

| File | Purpose |
|------|---------|
| `Navbar.tsx` | Top nav — glass-pill capsule nav, mobile drawer, dark mode toggle, `hideChrome` for admin/super-admin routes |
| `MatchChatWindow.tsx` / `MatchChatPopup.tsx` | Match-side chat (two variants — popup is the newer floating one on dashboards) |
| `ChatWindow.tsx` | Offer-side chat |
| `CookieConsent.tsx` / `MetaPixel.tsx` | Consent banner + pixel — **known gap**: MetaPixel still fires unconditionally, not gated on consent state |
| `GlobalSearch.tsx`, `NotificationBell.tsx` | Header utilities |
| `DonorCategoryModal.tsx`, `LocationGate.tsx`, `DoneeListingPrompt.tsx`, `DoneeRequestPrompt.tsx`, `DonorListingPrompt.tsx` | Onboarding/guided flows |
| `CompatibilityIndicator.tsx`, `ListingDetailPanel.tsx` | Match/listing detail UI |
| `WelcomeOverlay.tsx` | Role-based welcome overlay + ambience |
| `AdminRedirect.tsx` / `SuperAdminRedirect.tsx` | Legacy path shims |
| `home/*.tsx` | Landing-page sections (Hero, Stats, WhyCauseKind, WhatWeProvide, DoneeRequests, CTA) |
| `ui/*` | shadcn/ui primitives (badge, button, card, input, select, switch, tabs, textarea, dropdown-menu, alert-dialog, popover, hover-card, progress, label) |

### `components/admin/` — shared panels used by `/admin/dashboard`
| File | Purpose |
|------|---------|
| `AiReviewPanel.tsx` | Structured AI-review card (recommendation/risk/confidence), shared by listing + request review |
| `AnalyticsPanel.tsx` | **New** — donation analytics/charts, extracted from the old standalone `/admin/analytics` page |
| `WhatsAppPanel.tsx` | **New shared location** — extracted from the old standalone `/admin/whatsapp` page; now used by both `/admin/dashboard` and `/super-admin` |
| `UserJourneyPanel.tsx` | Search-or-browse a user, render their full lifecycle timeline; role filter, jump-to-oldest button, Suspend/Unsuspend action |
| `PhotoStrip.tsx` | Shared lightbox photo strip (click a thumbnail for full-size in-app preview, replaces old `target=_blank` links) |

`app/admin/offers/OffersQueuePanel.tsx` and `app/admin/verifications/VerificationQueuePanel.tsx` are co-located shared components (not under `components/admin/`) — both embedded directly as dashboard tabs; their old standalone wrapper *pages* (`/admin/offers`, `/admin/verifications`) were deleted since they were pure route duplicates.

### `components/super-admin/`
| File | Purpose |
|------|---------|
| `EntityTable.tsx` | Generic editable table for Users/Campaigns/Donations/Requests/Listings/Matches sections — now has an optional `onView` prop (eye icon) used by the Users section to deep-link into User Journey |
| `SqlConsole.tsx` | Raw SQL console (danger-zone gated) |
| `AdminPermissionsPanel.tsx` | **New** — per-admin, per-resource capability toggles |
| `DisputesPanel.tsx` | **New** — list + resolve post-delivery issues |
| `AuditLogPanel.tsx` | **New** — paginated, filterable audit trail |

---

## `src/lib/` & `src/hooks/`

| File | Purpose |
|------|---------|
| `lib/api.ts` | All API calls (2000+ lines). New (2026-07-20): `adminSuspendUser`/`adminUnsuspendUser`, `adminListDisputes`/`adminResolveDispute`, `adminGetPermissions`/`superAdminSetAdminPermissions`/`superAdminListAdmins`, `superAdminAuditLog`, `adminGetMyPermissions`, `adminSearchUsers`/`adminGetUserJourney` (User Journey) |
| `lib/utils.ts` | `cn()` utility |
| `lib/toast.ts` | Toast helper |
| `lib/features.ts` | `FEATURES.money` — feature flag hiding all campaign/donation UI |
| `hooks/useAuth.tsx` | Auth context — `{email, role}` hydrated from `ck_user` localStorage + revalidated against `/api/v1/users/me` |
| `hooks/useEntityUpdates.ts` | SSE-based change-notification hook (not a cache — triggers a page's own re-fetch) |
| `hooks/useTilt.ts` | Cursor-tracking 3D tilt effect for `.glass-3d` elements — **must be called unconditionally**, before any early `return null` (see the hooks-order bug fixed 2026-07-20) |
| `hooks/useDynamicTranslation.ts`, `hooks/useLocations.ts`, `hooks/useNotifications.tsx` | Supporting hooks |

---

## Known Loose Ends (unchanged by the 2026-07-20 work, still true)
- `react-hook-form` + `zod` in `package.json`, zero imports anywhere — dead dependencies.
- `src/data/demoListings.ts` / `MockListingsCarousel.tsx` — dead, only referenced by an unrelated design-system build.
- Two Handover Hub implementations still unconsolidated (see above).
- MetaPixel/GoogleTagManager still not gated on cookie consent.
- i18n coverage gap on newer components (Guided Tour, blog detail, `MatchChatPopup`).

---

## Branch workflow (updated 2026-07-20)
**Push to `staging`, not `main`.** `staging` is the shared integration branch — teammates push/pull from there to test combined work before it lands on `main`. `main` only advances via a verified merge from `staging`. Always use `--no-ff` when merging so individual merge commits stay visible.
