# CauseKind Frontend — Project File Guide

_Last updated: 2026-06-27 (donor flow 1 — spec implementation)_

## Tech Stack
- Next.js 15 (App Router), TypeScript, Tailwind CSS
- Deployed on Vercel → causekind.com
- API base: `NEXT_PUBLIC_API_URL` env var (→ https://api.causekind.com via CloudFront → Elastic Beanstalk)

---

## `src/app/` — Pages

| File | Route | Notes |
|------|-------|-------|
| `layout.tsx` | root | Global layout, Navbar, Sonner toaster |
| `page.tsx` | `/` | Landing page with hero, stats, carousels |
| `login/page.tsx` | `/login` | Auth. Split into `LoginContent` + `LoginPage` with `<Suspense>` wrapper (required for `useSearchParams`) |
| `register/page.tsx` | `/register` | Registration form |
| `forgot-password/page.tsx` | `/forgot-password` | Password reset request |
| `reset-password/page.tsx` | `/reset-password` | Password reset (token from email link) |
| `dashboard/page.tsx` | `/dashboard` | Donor dashboard — listings with spec status journey tracker (DRAFT→SUBMITTED→AI_SCREENING→ELIGIBLE_FOR_MATCHING), admin notes for NEEDS_INFORMATION, matches & handover flow |
| `donee/dashboard/page.tsx` | `/donee/dashboard` | Redirects to `/dashboard` — donee view is the `DoneeDashboard` component inside `dashboard/page.tsx` |
| `profile/page.tsx` | `/profile` | Editable profile (name, phone, city) — friend's design |
| `campaigns/page.tsx` | `/campaigns` | Browse all approved campaigns |
| `campaigns/new/page.tsx` | `/campaigns/new` | Create campaign form with image upload |
| `campaigns/[id]/page.tsx` | `/campaigns/:id` | Campaign detail + Razorpay donate flow |
| `items/page.tsx` | `/items` | Browse item listings; "Request this item" modal (location-gated) |
| `items/new/page.tsx` | `/items/new` | **4-step multi-step donor listing form** — Step 1 Item Details, Step 2 Photos (min 2), Step 3 Location & Delivery (GPS, pickup days/slots, drop-off), Step 4 Declarations (8 mandatory). Auto-saves draft via PATCH on each Next, submits via POST /:id/submit |
| `requests/page.tsx` | `/requests` | Browse item requests; AI photo detection + donate modal |
| `requests/new/page.tsx` | `/requests/new` | Create item request |
| `admin/dashboard/page.tsx` | `/admin/dashboard` | Admin overview |
| `admin/approvals/page.tsx` | `/admin/approvals` | Approve/reject campaigns, items, requests, matches. Items tab fetches SUBMITTED status, shows photos/defect grid, has **Needs Info** action (sends admin note back to donor → NEEDS_INFORMATION). Links to AI Logs and WhatsApp admin pages |
| `admin/whatsapp/page.tsx` | `/admin/whatsapp` | Meta WhatsApp Cloud API admin UI — 4 tabs: Send Message (template + variables), Templates (list/create/delete, submits to Meta for approval), Flows (list/create draft, paste Flow JSON, publish, delete), Message Log (paginated send/receive history) |
| `super-admin/page.tsx` | `/super-admin` | Full-screen "Command Center" SPA (SUPER_ADMIN only) — sidebar-driven sections (Overview, Users, Campaigns, Donations, Requests, Listings, Matches, WhatsApp, SQL Console), custom dark/light theme tokens, no shared Navbar chrome |
| `certificate/page.tsx` | `/certificate` | Donation certificate generator |
| `help/page.tsx` | `/help` | FAQ / help page |
| `thank-you/page.tsx` | `/thank-you` | Post-donation thank you page |

---

## `src/components/` — UI Components

| File | Purpose |
|------|---------|
| `Navbar.tsx` | Top nav — capsule nav with active state dots (friend's design), mobile drawer, dark mode toggle |
| `Reveal.tsx` | Scroll-triggered fade-in animation wrapper |
| `ParticleBackground.tsx` | Animated particle canvas for page backgrounds |
| `CampaignCard.tsx` | Campaign card used in browse/dashboard |
| `CampaignCarousel.tsx` | Horizontal scroll carousel of campaigns |
| `HeroCampaignSlider.tsx` | Hero section full-bleed campaign slider |
| `MockListingsCarousel.tsx` | Animated mock listings for landing page |
| `DonateButton.tsx` | Razorpay donate button wrapper |
| `BoomerangVideoBg.tsx` | Video background section |
| `FaqSection.tsx` | Collapsible FAQ section |
| `PhoneAnimationSection.tsx` | Phone mockup animation section |
| `ScrollProgress.tsx` | Top-of-page scroll progress bar |
| `ui/` | shadcn/ui primitives: badge, button, card, input, label, progress, select, switch, tabs, textarea |
| `super-admin/EntityTable.tsx` | Generic editable table for `/super-admin` entity sections (users, campaigns, donations, requests, listings, matches) |
| `super-admin/SqlConsole.tsx` | Raw SQL console for `/super-admin` (danger-zone gated) |
| `super-admin/WhatsAppPanel.tsx` | WhatsApp management for `/super-admin` — same send/templates/flows/log functionality as `admin/whatsapp/page.tsx`, restyled to match the Command Center's custom dark/light theme tokens instead of shadcn components |

---

## `src/lib/` & `src/hooks/`

| File | Purpose |
|------|---------|
| `lib/api.ts` | All API calls. Types: `UserProfile`, `Campaign`, `ItemListing`, `ItemRequest`, `ItemMatch`, `Donation`, etc. WhatsApp section: `WhatsAppTemplate`, `WhatsAppFlow`, `WhatsAppMessageLog` types + `getWhatsAppTemplates`/`createWhatsAppTemplate`/`deleteWhatsAppTemplate`, `getWhatsAppFlows`/`createWhatsAppFlow`/`updateWhatsAppFlowJson`/`publishWhatsAppFlow`/`deleteWhatsAppFlow`, `sendWhatsAppTemplateMessage`, `getWhatsAppMessages` |
| `lib/utils.ts` | `cn()` utility (clsx + tailwind-merge) |
| `hooks/useAuth.tsx` | Auth context + JWT decode. `user.role` used for role-gating pages |

---

## Key Design Decisions

- **Navbar**: friend's capsule nav with orange active dot + `isLinkActive` check for `/` route
- **Image cards**: `items/page.tsx` and `requests/page.tsx` use `next/image` with `fill` + `Package` fallback
- **AI donate modal** (`requests/page.tsx`): photo upload → `analyzeItemImage` (AWS Rekognition) → auto-fill description → `donateToRequest` (multipart POST). This is our feature, preserved through the friend merge.
- **Request modal** (`items/page.tsx`): requires `myProfile.latitude && myProfile.longitude` — users must set location first
- **`UserProfile` type** has `latitude`, `longitude`, `city | null`, `role` — single merged definition at line 111 of api.ts
