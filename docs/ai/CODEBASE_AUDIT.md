# CauseKind frontend — Codebase audit

Audit date: 2026-09-26 · branch `landingpageredesignvarun` · HEAD `cf02eb3` + uncommitted work.
Scope: `causekind-frontend/` only. Everything here was read from source; items
that could not be verified at runtime are marked **(source only)**.

---

## 1. Project overview

| Aspect | Found |
|---|---|
| Framework | Next.js **16.3.4** (package.json `^16.2.11`), App Router (`src/app`). Dev: `next dev -H 0.0.0.0` (Turbopack). `AGENTS.md`: "This is NOT the Next.js you know" — read `node_modules/next/dist/docs/` before using Next APIs. |
| React | **19.2.6** (`react`, `react-dom`) |
| Language | TypeScript **5.9.3** (`tsconfig.json`, path alias `@/* → src/*`). A few `.jsx` components (ClickSpark, DotGrid, GradualBlur, MagicBento, SpecularButton, StaggeredMenu, CardGlow). |
| Styling | Tailwind CSS **4.3.0**, CSS-first config: `src/styles.css` (`@import "tailwindcss"`, `@theme inline`, `@custom-variant dark`), PostCSS via `@tailwindcss/postcss`. No `tailwind.config.*`. `tw-animate-css` imported. CSS Modules used by newer sections (`*.module.css`). Plain CSS files for some React-Bits style components. |
| Animation | GSAP **3.15.0** (ScrollTrigger, DrawSVGPlugin, CustomEase, CustomWiggle, MotionPathPlugin), Framer Motion **12.42.0**, Lenis **1.3.26**, CSS keyframes, IntersectionObserver utilities. `ogl` (WebGL) installed, used only by an unused component. No Three.js, no Lottie, no `motion` package. |
| UI libraries | shadcn/ui pattern (`components.json`, `src/components/ui/*` — 19 files) over Radix primitives; `vaul` drawer, `sonner` toasts, `input-otp`, `react-day-picker`, `recharts`, `@vis.gl/react-google-maps`. |
| Icons | `lucide-react` 0.575 (187 importing files), `react-icons` 5.7 (1 file: `lib/categoryVisuals.ts`), inline SVG throughout the landing page. |
| Utilities | `clsx` + `tailwind-merge` (`lib/utils.ts` `cn`), `class-variance-authority`, `zod`, `isomorphic-dompurify`, `html2canvas` + `jspdf` (certificates), `qrcode`, `country-state-city`. |
| i18n | `next-intl` 4.13 — `src/i18n/{config,request}.ts`, 14 message files in `messages/` (en, hi, mr, bn, gu, kn, ml, pa, ta, te, ur, ar, es, fr). `TranslatedText` / `useDynamicTranslation` for runtime text. |
| Build tooling | `next build` (preceded by `scripts/clear-build-cache.mjs`, deletes `.next/cache`), `tsup` + `@tailwindcss/cli` for a separate design-system package (`src/design-system-entry.ts` → `dist/`). |
| Testing | Vitest 3 + jsdom + Testing Library (`vitest.config.ts`, `vitest.setup.ts`), 51 test files under `src/**`. |
| Lint | `npm run lint` = `next lint`, but **no ESLint config and no `eslint` binary** are present → not a usable gate. |
| Package manager | npm (`package-lock.json`). `overrides` for sharp/postcss/esbuild. |
| Routing | App Router file routes; `src/proxy.ts` (middleware, "Proxy" in build output); redirects in `next.config.ts`. |
| Hosting hints | `vercel.json`; `metadataBase` `https://www.causekind.com`. |
| Analytics | Microsoft Clarity, GTM, Meta Pixel mounted in `layout.tsx` with `TESTING_BYPASS = true` (load **without** cookie consent). |

## 2. Project structure

```
causekind-frontend/
├── AGENTS.md / CLAUDE.md      Next-generated agent notice (CLAUDE.md just imports AGENTS.md)
├── docs/                      older audits, campaign docs; docs/ai/ = this system
├── messages/                  next-intl JSON per locale (hero copy under "hero")
├── public/                    static assets (see ASSET_INVENTORY.md) — 792 files, ~75 MB
├── scripts/                   capture/screenshot scripts, translation + image conversion tools
├── ck-*.mjs, scratch/, temp_styles.css, designs/   ad-hoc dev artefacts (not part of the app)
└── src/
    ├── app/                   routes (page.tsx per route), layout.tsx, HomeClient.tsx, server actions
    │   ├── page.tsx           HOME server component (ISR 60s, data fetch)
    │   ├── HomeClient.tsx     HOME client orchestrator (all landing sections)
    │   └── (auth)/ about/ blog/ campaigns/ dashboard/ donate/ requests/ items/ matches/ offers/ admin/ super-admin/ …
    ├── components/
    │   ├── home/              landing sections + helpers (40 files) ← main landing work area
    │   │   ├── mobile/primitives.tsx      phone reveal/carousel/tabs/flip primitives
    │   │   ├── supportGallery/            "Where does my support go?" (new)
    │   │   └── whatIsCauseKind/           "What is CauseKind?" (INCOMPLETE — no component file)
    │   ├── cinematic/         HeroFilm, CinematicOrchestrator, (unused) Chapter1TheHome
    │   ├── ui/                shadcn primitives (button, card, dialog, tabs, …)
    │   ├── audience-pathways/ door/pathway components (not on the page today)
    │   ├── donate/, money-donation/   Donate Now button + money donation page
    │   ├── Navbar.tsx         SiteHeader + SiteFooter (+ CauseKindLogo)
    │   ├── MobileUI.tsx       MobileBottomNav (dock) + FloatingSupportButton
    │   ├── Reveal.tsx, SmoothScroll.tsx, ScrollProgress.tsx, GlassSurface.tsx, …  shared effects
    │   └── ui-bits/, lightswind-pro/     untracked third-party ScrollStack copies (unused)
    ├── sections/landing/      the cinematic film: Chapter1TheUnusedThing, Chapter2TheEcosystem,
    │   │                      (unused) HowCauseKindWorks, SlotNumber, StepMotifIcon, howItWorksData
    │   └── cinematic/         RoomScene, Student, cutouts, rig, palette, fonts, cinematic.module.css, README.md
    ├── features/              multi-step wizards (item listing, donee request, donation offer, handover, auth validation)
    ├── hooks/                 useAuth, useNearFooter, useImmersiveNav, useTilt, useIsDesktop, useDraggableBubble, …
    ├── lib/                   api.ts (all backend calls), features.ts (flags), categoryVisuals, landingConstants, roleTheme, …
    ├── data/                  blog data + translations
    ├── design-system/         entry.css, fonts.css for the tsup design-system package
    ├── i18n/                  next-intl config
    ├── design-system-entry.ts public exports of the design-system package
    ├── proxy.ts               middleware
    └── styles.css             global CSS: tokens, Tailwind theme, 122 keyframes, hero, mobile primitives
```

## 3. Landing-page architecture

**Entry:** `src/app/page.tsx` (server) → `<HomeClient …/>` (`src/app/HomeClient.tsx`, `"use client"`).
`page.tsx` fetches in parallel (each failure → empty fallback): `getCampaigns`, `getPlatformStats`,
`getRecentActivity`, `getPublicItemRequests`, `getFulfilledNeedSummaries`; emits Organization/WebSite JSON-LD; `revalidate = 60`.

**Global shell (layout.tsx, every route):** `ScrollProgress` → `SiteHeader` → `<main class="ck-main-bottom-pad">` → `SiteFooter` → `MobileBottomNav` → `FloatingSupportButton` → `SiteBottomBlur` (off via `FEATURES.bottomBlur`) → `Toaster` → `DeferredOverlays` (welcome overlay, tour, listing prompts; dynamic) — all inside `RoleClickSpark`.

**HomeClient render tree (current):**
```
div.ck-home-page
├── RakshaBandhanIntro          (date-gated, renders null except 28 Aug)
├── IndependenceDayStrip        (date-gated)
├── RakshaBandhanStrip          (date-gated)
├── SmoothScroll                (Lenis, fine pointer only; renders null)
├── DashedJourneyRoad           (desktop ≥1280 decorative road)
├── FEATURES.cinematicLanding ? <HeroFilm hero={<HeroSection/>}/> : <HeroSection/>
│     HeroFilm → [HeroSection] over [CinematicOrchestrator → Chapter1TheUnusedThing, Chapter2TheEcosystem]
├── SupportGallery              (both breakpoints)
├── WhatIsCauseKind             ← file missing: compile error
├── ProblemSolutionSection      (both)
├── HowItWorksSection           (both)
├── div.hidden.lg:block  LiveNeedsSection
├── div.hidden.lg:block  TrustSafetySection variant="desktop"
├── div.hidden.lg:block  FoundersNoteSection variant="desktop"
├── div.hidden.lg:block  [money campaigns (off)] [in-kind grid `{false && …}` dead] [UnclaimedSection (raksha)] FinalCtaSection variant="desktop"
└── div.lg:hidden (mobile/tablet column, px-5; max-md: gap-0 pt-0)
      [stats ticker (money, off)] LiveNeedsSection · TrustSafetySection variant="mobile" · FoundersNoteSection variant="mobile"
      [money campaigns (off)] [UnclaimedSection (raksha)] FinalCtaSection variant="mobile"
```
Unused imports still in HomeClient: `DesktopStatsBar`, `LiveTicker`, `Reveal` (used only inside the dead block), etc.

| # | SECTION | COMPONENT | FILE | PURPOSE | DEPENDENCIES | SAFE TO MODIFY? |
|---|---|---|---|---|---|---|
| — | Navbar | `SiteHeader` | `src/components/Navbar.tsx` | sticky header, publishes `--ck-nav-h`, hides on `ck:immersive-nav` | useAuth, useImmersiveNav-event, LogoVideo | **No** (global) |
| 1 | Hero | `HeroSection` | `src/components/home/HeroSection.tsx` | front door, CTAs, category rail | CategoryStrip, TrustBand, DonateNowButton, NewRequestLink, useAuth, next-intl `hero` | **NO — LOCKED** |
| 2 | Cinematic film | `HeroFilm` → `CinematicOrchestrator` → `Chapter1TheUnusedThing`, `Chapter2TheEcosystem` | `src/components/cinematic/*`, `src/sections/landing/*` | scroll-scrubbed story under the hero | GSAP+plugins, `cinematic/*` | Yes, with care (wraps hero) |
| 3 | Where does my support go? | `SupportGallery` | `src/components/home/supportGallery/SupportGallery.tsx` | real-photo table | next/image, own CSS/fonts/photos | Yes |
| 4 | What is CauseKind? | `WhatIsCauseKind` (missing) | `src/components/home/whatIsCauseKind/` | typographic installation | Archivo + gallery fonts | Yes — must be completed |
| 5 | The problem we solve | `ProblemSolutionSection` | `src/components/home/ProblemSolutionSection.tsx` | problem vs solution | GSAP (≥1024), framer, mobile primitives | Yes |
| 6 | How it works | `HowItWorksSection` | `src/components/home/HowItWorksSection.tsx` | 4 steps per role tab | framer, mobile primitives, LANDING_ROUTES | Yes |
| 7 | Live needs | `LiveNeedsSection` | `src/components/home/LiveNeedsSection.tsx` | public need board sample (6) | `PublicItemRequest` data, useAuth, AnimatedCategoryIcon, LetterSwap | Yes (keep data behaviour + tests) |
| 8 | Trust & safety | `TrustSafetySection` | `src/components/home/TrustSafetySection.tsx` | verification/privacy promises | GSAP (≥768), mobile primitives | Yes |
| 9 | Founder's note | `FoundersNoteSection` | `src/components/home/FoundersNoteSection.tsx` | founder letter (null in prod) | `FOUNDER` in landingConstants | Yes |
| 10 | Unclaimed needs | `UnclaimedSection` | `src/components/home/UnclaimedSection.tsx` | Raksha Bandhan campaign only | raksha-bandhan lib | Campaign-only |
| 11 | Final CTA | `FinalCtaSection` | `src/components/home/FinalCtaSection.tsx` | join as donor/donee/NGO, WhatsApp | GSAP, framer, WhatsAppTellAFriend, LANDING_ROUTES | Yes |
| — | Footer | `SiteFooter` | `src/components/Navbar.tsx` (≈line 1435) | site footer | — | **No** (global) |
| — | Mobile dock + support bubble | `MobileBottomNav`, `FloatingSupportButton` | `src/components/MobileUI.tsx` | phone nav, support | GlassSurface, useNearFooter, useImmersiveNav | **No** (global) |
| — | Decorative road | `DashedJourneyRoad` | `src/components/home/DashedJourneyRoad.tsx` | ≥1280 dashed road | GSAP | Only if asked |

## 4. Landing-page section map

Per-section detail (assets, animation, data, desktop/mobile behaviour, do-not-break
items and safe/unsafe files) is in **LANDING_PAGE_BLUEPRINT.md** — one entry per
section, kept there so it can be extended with future specs. Summary of what
must not be accidentally modified in each:

- **Hero** — everything; see §5.
- **Film** — `leadInRef` contract with HeroFilm; `ScrollTrigger.sort()+refresh()` in the orchestrator; seam between chapters (`measureStage().seamX`); `warmTimeline` / `samplePath` helpers in `rig.ts`; reduced-motion still frame; `ck:immersive-nav` dispatch.
- **SupportGallery** — `#where-support-goes` id (used by perf scripts / anchors); photo captions make no impact claims (keep it that way).
- **LiveNeeds** — `NEEDS_SHOWN = 6`, honest overflow count, empty-state CTA role logic, `loginUrlFor` offer links; covered by 3 test files.
- **Trust / Founders / FinalCta** — `variant` prop contract (desktop tree vs mobile tree), GSAP `matchMedia` ranges (desktop ≥1024, tablet 768–1023; phones use `*Mobile` components).
- **All phone sections** — `ck-m-section` class (drops 100svh min-heights, adds dock clearance under 768px).

## 5. Hero immutability map

See **LANDING_PAGE_GUARDRAILS.md → "HERO — DO NOT TOUCH"** for the authoritative
list. Summary of Hero-specific logic:

| File | Hero-specific content |
|---|---|
| `src/components/home/HeroSection.tsx` | the whole hero: `usePrimaryAction`, `ConnectionPins`, `HeroSection`; Anton font for mobile display (`--font-hero-mobile`) |
| `src/components/home/CategoryStrip.tsx` | category rail under the hero (uses `IN_KIND_CATEGORIES`, `CATEGORY_VISUALS`) |
| `src/components/home/TrustBand.tsx` | three trust items (desktop rail + mobile hero footer) |
| `src/components/donate/DonateNowButton.tsx` | Donate Now CTA (shared with navbar/footer) |
| `src/components/NewRequestLink.tsx` | primary CTA link (need-profile gate) |
| `src/styles.css` ≈ lines 2162–2776 | `.ck-showcase-hero`, `.ck-hero-*`, `.ck-mobile-hero-*`, `.ck-lead-hero-stage`, hero CTA animations, "Be the Change underlaps the Hero" rules |
| `src/styles.css` ≈ lines 3976–4254 | `.ck-donate-*` Donate Now styling (hero + navbar + footer placements) |
| `src/styles.css` ≈ lines 4541–4575 | `.ck-hero-film*` — layering of hero over film (film-owned, affects hero) |
| `messages/*.json` → `"hero"` | all hero copy |
| `public/images/causekind-hero-handoff.webp`, `causekind-hero-foreground.png`, `causekind-mobile-hero-v1.webp` | hero photos |
| External couplings | `Navbar.tsx:378` queries `.ck-lead-hero-stage` (transparent mobile header over hero); `tour/TourController.tsx` + `tourSteps.ts` anchor `[data-tour="guest-hero"]`; `HeroFilm.tsx` wraps the hero; tests `components/home/heroFrontDoor.test.tsx`, `app/homeAudiencePathways.test.tsx` (mocks HeroSection) |

Hero animation: CSS only (`ck-hero-route-flow`, `ck-hero-cta-sheen`, `ck-hero-cta-icon-lift`, `ck-hero-image-drift`, `.ck-hero-callout-float`), plus `MotionConfig reducedMotion="user"` wrapper. No hero-specific hooks beyond `useAuth`.

## 6. Existing animation system (inventory)

| Library / utility | Location | Current usage | Reusable? | Performance notes |
|---|---|---|---|---|
| GSAP core + ScrollTrigger | 18 files; landing: Chapter1/2, CinematicOrchestrator, ProblemSolution, Trust, Founders, FinalCta, DashedJourneyRoad, HomeClient (refresh) | pinned scrubs (film), one-shot timelines on scroll (desktop), `gsap.matchMedia` per breakpoint | Yes | Pinning adds spacers → always `ScrollTrigger.sort()`/`refresh()` after late mounts; `ignoreMobileResize: true` set in Chapter 1 |
| GSAP DrawSVGPlugin | Chapter1, Chapter2 | ink sketch / line draw | Yes | expensive on many paths; phones skip ink ("lite") |
| GSAP CustomEase, CustomWiggle | Chapter1 | shake, custom easing | Yes | — |
| GSAP MotionPathPlugin | SupportJourneySection (not rendered) | — | Yes | — |
| Framer Motion | 84 files; landing: Reveal, HowItWorks, ProblemSolution, LiveNeeds, FinalCta, WhoAreWe (unused), HeroSection (MotionConfig only) | `whileInView` reveals, `useInView`, AnimatePresence tab swaps, spring hover | Yes | per-character `motion.span` eyebrows create many motion nodes |
| Lenis | `src/components/SmoothScroll.tsx` | smooth wheel scroll, synced to ScrollTrigger via gsap.ticker | global only | disabled on `pointer: coarse` and reduced motion |
| CSS keyframes | `src/styles.css` (122), module CSS files, a few inline `<style>` | hero, donate CTA, loops, mobile primitives | Yes | prefer these for infinite loops (compositor) |
| IntersectionObserver | `home/mobile/primitives.tsx` (6), SupportGallery (5), TrustSafety, Navbar, useNearFooter | reveal-once, carousel dots, parallax gating, header state | Yes | preferred over scroll listeners |
| requestAnimationFrame | CinematicOrchestrator, SupportGallery, DashedJourneyRoad, WhoAreWe (unused), Navbar | batching writes | pattern | — |
| Scroll listeners | ScrollProgress (passive), Navbar `scrolled` (flip-only setState), SupportGallery (only while on screen), useNearFooter | — | — | keep passive, write-only |
| Mouse interaction | SupportGallery (pointermove → CSS vars), HowItWorks StepCard tilt (onMouseMove), FinalCta parallax (setState per mousemove), ImpactCertificate tilt (SupportJourney, unused), useTilt hook (navbar icons) | — | useTilt yes | FinalCta re-renders per mousemove |
| Canvas | `RoleClickSpark` / `ClickSpark.jsx` (site-wide click sparks) | — | — | per click |
| WebGL (`ogl`) | `LightRays.tsx` | **not imported anywhere** | — | — |
| Three.js / Lottie | — | **not present** | — | — |
| Page transitions | `lib/animations.ts` exports `pageSlideIn`/`pageFadeUp` variants | **lib/animations.ts has 0 importers** | — | NO ACTIVE PAGE-TRANSITION SYSTEM; `RouteProgressBar` shows a top progress bar on navigation |

## 7. Animation reusability map

Full "how to reuse" notes in **ANIMATION_SYSTEM.md → Reusable patterns**.

| Name | File | How it works | How to reuse | Known limitations |
|---|---|---|---|---|
| Reveal (fade-up) | `src/components/Reveal.tsx` | Framer `whileInView`, spring, `once`, `amount 0.08`; reduced motion → plain div | `<Reveal delay={ms} direction="up">…</Reveal>` | spring (not the 300–600 ms cubic rule); JS per element |
| Reveal-once (CSS) | `home/mobile/primitives.tsx` `useRevealOnce` + `stagger(i)` + styles.css "Reveal once" | IO threshold 0.2 sets `data-reveal` armed→in→done; CSS transitions, `will-change` only while running | `const ref = useRevealOnce<HTMLDivElement>()`; children `data-reveal-item` (`""`/`"scale"`/`"left"`) + `style={stagger(i)}` | not armed if already on screen at mount (by design) |
| Scroll-snap carousel | `SnapCarousel`, `CarouselDots` (primitives) + `.ck-snap` / `.ck-snap-m` CSS | native `scroll-snap`, 85% slides, IO-synced dots | `<SnapCarousel label="…">{cards}</SnapCarousel>`; or `.ck-snap-m` + `CarouselDots` for a grid that becomes a row < 768 | slides must be direct children |
| Segmented tabs + stacked panels | `SegmentedTabs`, `StackedPanels` (primitives) | thumb on `translateX(idx*100%)`; panels share one grid cell (no height jump) | see ProblemSolution phone view | ARIA tabs with arrow keys included |
| Flip card | `FlipCard` (primitives) | rotateY, `will-change` only while turning | front/back nodes + labels | both faces sized by the larger |
| Stagger | `stagger(i)` (CSS var `--i`, 70 ms, capped at 6) · Framer variants in `lib/animations.ts` (unused) | — | — | — |
| Parallax (cursor + scroll) | `SupportGallery.tsx` Table effect | writes `--px/--py/--sy` once per rAF; CSS multiplies by depth | copy pattern; no shared hook | NO EXISTING REUSABLE UTILITY FOUND (pattern only) |
| Hover tilt | `src/hooks/useTilt.ts` | pointer → rotate via CSS vars (glass icon buttons) | `const ref = useTilt(16)` | desktop-oriented |
| Magnetic button | — | — | — | NO EXISTING REUSABLE UTILITY FOUND |
| Text animation | `LetterSwap.tsx` (char flip), per-char `motion.span` eyebrows (inline in sections) | — | `<LetterSwap text="…"/>` | per-char React nodes |
| Image reveal | Founders desktop clip-path wipe (inline GSAP) | — | — | NO EXISTING REUSABLE UTILITY FOUND; clip-path animation is paint-heavy |
| Pinned section / scrub | Chapter1/2 (GSAP pin), `rig.ts` helpers | pin + scrub timeline; numbers → single `apply()` | follow film pattern | heavy; see PERFORMANCE_NOTES |
| Smooth scrolling | `SmoothScroll.tsx` | Lenis global | already global | desktop only |
| Scroll progress | `ScrollProgress.tsx` | passive scroll → `scaleX` | global | — |
| Page transition | `lib/animations.ts` | Framer variants | not wired | NO ACTIVE SYSTEM |
| Nav hide during immersive section | `useImmersiveNav` + `ck:immersive-nav` event | window CustomEvent with boolean detail; header + dock listen | dispatch from any full-screen section | — |

## 8. Implementation boundaries

Per-section SAFE / DO-NOT-TOUCH file lists: **LANDING_PAGE_BLUEPRINT.md** (each section entry).
Global locks and rules: **LANDING_PAGE_GUARDRAILS.md**.

## 9. Findings that affect every future task

1. **Build is broken** — missing `src/components/home/whatIsCauseKind/WhatIsCauseKind.tsx` (imported by `HomeClient.tsx:65`). Dev server returns 500 "Module not found" on all routes (verified 2026-09-26).
2. Large uncommitted diff on the branch (landing redesign, film, gallery, mobile primitives, perf work). Commit or stash deliberately; do not assume `git diff` shows only your change.
3. `--ck-home-*` tokens are only *defined* under `[data-ck-role-theme="donee"]`; elsewhere components rely on their inline fallbacks (e.g. `var(--ck-home-accent,#b04a15)`). Always keep a fallback when using them.
4. Body font: no `font-family` is set on `html`/`body` and `--font-sans` is not overridden, so text falls back to Tailwind's default system stack; Plus Jakarta Sans is loaded (preloaded) but applied only via `.font-hero-display` and inline styles **(source only — confirm in browser)**.
5. Trackers load without consent (`TESTING_BYPASS = true` in ClarityAnalytics, GoogleTagManagerGated, MetaPixel); their consent tests fail because of it.
6. Pre-existing failing test file: `src/app/homeAudiencePathways.test.tsx` (11 tests) — asserts on an audience-pathways section HomeClient no longer renders.
