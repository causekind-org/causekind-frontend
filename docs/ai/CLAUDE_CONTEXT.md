# CauseKind — AI context (read this first)

> Snapshot of the working tree on branch `landingpageredesignvarun`, 2026-09-26.
> Much of the landing page is **uncommitted work in progress** — see "Current state".
> Detailed docs live next to this file in `docs/ai/`.

## Project
CauseKind is a free Indian in-kind giving platform: donors list useful items
(books, clothes, furniture, electronics…) and verified donees / NGOs nearby
(≈10 km) request them; items are handed over in person and confirmed with a
one-time code. Money donations/campaigns exist in code but are switched off
(`FEATURES.money = false`). Initiative of Sahas Charitable Trust.
This repo folder is the **Next.js frontend** (`causekind-frontend/`); the
backend is a separate project (`../causekind-backend/`, Spring, hosted Postgres).

## Tech stack (installed versions)
Next.js 16.3.4 (App Router, Turbopack dev) · React 19.2.6 · TypeScript 5.9 ·
Tailwind CSS 4.3 (CSS-first, `@import "tailwindcss"` in `src/styles.css`, no
tailwind.config) · shadcn/ui on Radix · GSAP 3.15 (+ScrollTrigger, DrawSVG,
CustomEase, CustomWiggle, MotionPath) · Framer Motion 12 · Lenis 1.3 ·
next-intl 4 (14 locales in `messages/`) · lucide-react icons · Vitest 3 + jsdom ·
npm (`package-lock.json`). **Next 16 has breaking changes — read
`node_modules/next/dist/docs/` before using unfamiliar Next APIs (AGENTS.md).**

## Architecture (frontend)
- `src/app/` routes. Home = `src/app/page.tsx` (server, ISR 60 s, fetches public
  data) → `src/app/HomeClient.tsx` (client orchestrator, all landing sections).
- `src/app/layout.tsx` — global shell: fonts, providers, `SiteHeader`/`SiteFooter`
  (`src/components/Navbar.tsx`), `MobileBottomNav` + `FloatingSupportButton`
  (`src/components/MobileUI.tsx`), `ScrollProgress`, trackers, overlays.
- Landing sections: `src/components/home/**`, the film in `src/sections/landing/**`
  + `src/components/cinematic/**`. Mobile primitives: `src/components/home/mobile/primitives.tsx`.
- Global CSS/tokens: `src/styles.css` (4,600 lines). Feature flags: `src/lib/features.ts`.
- Data: `src/lib/api.ts`. Auth: `src/hooks/useAuth.tsx`. Role theming: `data-ck-role-theme` on `<html>`.

## Landing page — current order (desktop ≥1024 / phone)
1. **Hero** (`HeroSection`) — LOCKED. With `FEATURES.cinematicLanding` it is wrapped by `HeroFilm`.
2. **Cinematic film** (Chapter 1 + 2) — hidden under the hero, pinned GSAP scrub, ~13 screens of scroll.
3. **Where does my support go?** (`SupportGallery`) — photo table / phone pile, 6 real photos.
4. **About CauseKind** (`WhoAreWeSection`) — placeholder in the slot planned for "What is CauseKind?" (component not built yet).
5. ~~The problem we solve~~ — removed from the page 2026-09-26 (file kept).
6. **How it works** (`HowItWorksSection`, donor/donee/NGO tabs).
7. **Live needs** (`LiveNeedsSection`, backend data).
8. **Trust & safety** (`TrustSafetySection`).
9. **Founder's note** (`FoundersNoteSection`) — renders `null` in production (placeholder founder).
10. (Money campaigns — off) · (Unclaimed needs — Raksha Bandhan window only)
11. **Final CTA** (`FinalCtaSection`) → footer.
Sections 1–6 render once (responsive); 7–11 render in two trees: `hidden lg:block` (desktop) and `lg:hidden` (mobile/tablet) with `variant` props.

## Current state — read before touching the landing page
- **BLOCKER:** `HomeClient.tsx:65` imports `@/components/home/whatIsCauseKind/WhatIsCauseKind`,
  which does not exist (only `fonts.ts` + `WhatIsCauseKind.module.css` exist). `next dev`
  answers HTTP 500 on every route ("Module not found"); `next build` will fail.
- All landing redesign work since commit `cf02eb3` is uncommitted (26 modified + 16 untracked paths at audit time).
- `WhoAreWeSection.tsx` (reworked ecosystem version) and `SupportJourneySection.tsx` are no longer rendered.

## Design language (details: CAUSEKIND_DESIGN_SYSTEM.md)
Warm cream paper (`#FAF8F5`, `#F7F2EA`, `#FDF5ED`), dark brown ink (`#1C1410`),
burnt-orange accent (`#B5480F` in sections, `#B04A15` global token), teal
`#0F7A6C` (donee), green `#1F6B3F` (NGO), dark-brown CTA card `#1C1410`.
Editorial: small uppercase mono/letter-spaced eyebrows with a short rule,
heavy sans headlines, serif italics for emotional lines, hand-drawn SVG
marks, paper grain, soft shadows, rounded-2xl cards on the older sections.

## Animation (details: ANIMATION_SYSTEM.md)
GSAP ScrollTrigger (film pins/scrubs, desktop section timelines via `gsap.matchMedia`),
Framer Motion (`Reveal`, `useInView` reveals), CSS keyframes (122 in styles.css),
IntersectionObserver-based mobile primitives (`useRevealOnce`, `SnapCarousel`…),
Lenis smooth scroll on fine-pointer devices only. Rules: transform/opacity only,
respect `prefers-reduced-motion`, no scroll listeners on phones where avoidable.

## Important assets (details: ASSET_INVENTORY.md)
Hero: `/images/causekind-hero-handoff.webp`, `/images/causekind-hero-foreground.png`,
`/images/causekind-mobile-hero-v1.webp`. Film cutouts: `/images/cinematic-*-removebg-preview.webp`.
Gallery photos: `/images/WhatsApp Image 2026-09-25 at *.webp` + `/images/dajsldkasldkaskd.webp`.
Logo: inline SVG in `LogoVideo.tsx` (traced), `/logo-filled.webp`.

## Immutable
- **Hero** — see LANDING_PAGE_GUARDRAILS.md "HERO — DO NOT TOUCH" for the file list.
- No other section has been explicitly approved/locked yet.

## Development rules (full list: LANDING_PAGE_GUARDRAILS.md, AI_WORKFLOW.md)
1. Touch only the files of the section you were asked about (boundaries per section in LANDING_PAGE_BLUEPRINT.md).
2. Never modify Hero files, `layout.tsx`, `Navbar.tsx`, `MobileUI.tsx`, `lib/api.ts`, `package.json` or config unless explicitly asked.
3. No new dependencies without approval. Reuse GSAP / Framer / mobile primitives.
4. Animate transform/opacity only; support reduced motion; test at 390px and 1440px.
5. Verify with `npx tsc --noEmit -p .` and `npx vitest run <paths>`; `npm run lint` is not usable (no ESLint installed/configured).
6. Record every change in `docs/ai/AI_CHANGELOG.md`.

## Documentation files (all in `docs/ai/`)
| File | Use it for |
|---|---|
| CODEBASE_AUDIT.md | stack, structure, landing hierarchy, section map, hero map, animation tables |
| CAUSEKIND_DESIGN_SYSTEM.md | colours, type, spacing, radius, shadows, buttons, images, breakpoints, visual language |
| ANIMATION_SYSTEM.md | animation architecture, utilities, patterns to reuse/avoid |
| ASSET_INVENTORY.md | public assets, sizes, dimensions, where used |
| LANDING_PAGE_BLUEPRINT.md | per-section current state, safe/unsafe files, future spec slots |
| LANDING_PAGE_GUARDRAILS.md | locked / under-development sections, global rules |
| PERFORMANCE_NOTES.md | known performance risks (LOW/MEDIUM/HIGH) |
| RESPONSIVE_AUDIT.md | per-section breakpoint behaviour and risks |
| DEPENDENCY_AUDIT.md | dependencies by category, unused/overlapping |
| AI_WORKFLOW.md | before/during/after-coding procedure |
| AI_CHANGELOG.md | append-only change log |
