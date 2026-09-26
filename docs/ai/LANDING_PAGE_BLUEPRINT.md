# CauseKind — Landing page blueprint

Current state of every landing section (2026-09-26) plus a slot for its future
design specification. Future agents: find your section, read its entry, and
touch only its SAFE files. Specs are added by the user; do not invent them.

**Global DO-NOT-TOUCH for every section below** (unless the task explicitly names them):
`src/components/home/HeroSection.tsx`, `CategoryStrip.tsx`, `TrustBand.tsx`,
`src/components/donate/DonateNowButton.tsx`, `src/components/NewRequestLink.tsx`,
hero ranges in `src/styles.css` (≈2162–2776, 3976–4254), `src/app/layout.tsx`,
`src/app/page.tsx`, `src/components/Navbar.tsx` (header + footer),
`src/components/MobileUI.tsx`, `src/lib/api.ts`, `src/lib/features.ts`,
`messages/*.json` "hero", `package.json`, `next.config.ts`, `tsconfig.json`.

**Shared files — edit additively and minimally:**
`src/app/HomeClient.tsx` (only the line that renders your section),
`src/styles.css` (append section-scoped rules at the end; prefer a CSS module),
`src/components/home/mobile/primitives.tsx` (used by 7 sections — never change existing behaviour).

Section order below = render order in `HomeClient.tsx`.

---

## 0. Global chrome (reference only)
- **Header** `SiteHeader` (`Navbar.tsx`): sticky, publishes `--ck-nav-h`, transparent over the mobile hero (`data-home-hero`), hides on `ck:immersive-nav`.
- **Footer** `SiteFooter` (`Navbar.tsx` ≈1435). On the home page the dock clearance sits under the footer (styles.css `.ck-main-bottom-pad:has(.ck-home-page)`).
- **Mobile dock** `MobileBottomNav` + **support bubble** `FloatingSupportButton` (`MobileUI.tsx`, below lg).
- Date-gated campaign strips: `RakshaBandhanIntro`, `IndependenceDayStrip`, `RakshaBandhanStrip`.
- `DashedJourneyRoad` (≥1280 decorative road), `SmoothScroll` (Lenis).

---

## 1. Hero — LOCKED
- **Current purpose:** front door — "Find Someone Near You / Who Needs What You Have", sign-up / explore / donate CTAs, category rail, trust band.
- **Component / file:** `HeroSection` — `src/components/home/HeroSection.tsx`.
- **Assets:** `/images/causekind-hero-handoff.webp`, `/images/causekind-hero-foreground.png`, `/images/causekind-mobile-hero-v1.webp`; Anton font.
- **Animations:** CSS only (route line flow, CTA sheen/icon lift, image drift, callout float); `MotionConfig reducedMotion="user"`.
- **Data:** `useAuth` (role-dependent primary CTA), next-intl `hero.*`.
- **Responsive:** one DOM tree; ≥1024 two-column stage with photo + pins + category rail + trust rail; <1024 photo becomes full-bleed ground with a dark scrim, copy at the bottom, trust band inside the hero, header transparent over it.
- **SAFE files:** none.
- **DO NOT TOUCH:** see LANDING_PAGE_GUARDRAILS.md "HERO — DO NOT TOUCH".
- **FUTURE DESIGN SPECIFICATION:** Not specified yet. (Locked — requires explicit request.)

## 2. Cinematic film — "One small thing can become a big thing" / "It finds its person"
- **Current purpose:** emotional scroll-driven story: an unused school bag in a home → "You don't need it. But someone might." → a listing → a 10 km night map → handed to a verified student.
- **Components / files:** `src/components/cinematic/HeroFilm.tsx` (wrapper, dynamic `ssr:false`), `CinematicOrchestrator.tsx`, `src/sections/landing/Chapter1TheUnusedThing.tsx`, `Chapter2TheEcosystem.tsx`, `src/sections/landing/cinematic/{RoomScene,Student,cutouts,rig,palette,fonts}.ts(x)`, `cinematic.module.css`, `README.md`; styles.css `.ck-hero-film*` (≈4541–4575).
- **Assets:** 3 cut-out WebPs (see ASSET_INVENTORY §1); inline SVG art.
- **Animations:** GSAP pin + scrub (Ch1 `innerHeight×5.6|7.2` after hero lead-in; Ch2 `+=520%|640%`), DrawSVG ink, CustomWiggle shake, path LUTs, idle warm-up, loop windows, `ck:immersive-nav` (header + dock hide).
- **Data:** none. Flag: `FEATURES.cinematicLanding` (true).
- **Responsive:** same film all widths; portrait = shorter scroll; phones/touch = "lite" (no ink pass, no motion blur, no grain); reduced motion = still frames stacked after the hero.
- **SAFE files:** everything listed under "Components / files" except `HeroFilm.tsx` layering (changing `.ck-hero-film-hero` affects the hero at rest — verify hero pixel-identical).
- **DO NOT TOUCH:** Hero files; `Navbar.tsx`/`MobileUI.tsx` (nav hiding already works through `useImmersiveNav`).
- **Notes:** always keep `ScrollTrigger.sort(); ScrollTrigger.refresh()` in the orchestrator; never delete DOM nodes in GSAP setup (Strict Mode re-runs); retrace `cutouts.ts` if images change; heaviest part of the page on phones.
- **FUTURE DESIGN SPECIFICATION:** Not specified yet.

## 3. Where does my support go? (photo table)
- **Current purpose:** visual breathing space after the film; real photos from CauseKind drives as prints on a table.
- **Component / file:** `SupportGallery` — `src/components/home/supportGallery/{SupportGallery.tsx, SupportGallery.module.css, photos.ts, fonts.ts}`. Section id `where-support-goes`.
- **Assets:** 6 drive photos (ASSET_INVENTORY §1); Fraunces, Caveat, IBM Plex Mono.
- **Animations:** IO-triggered one-time "photo drop" (per-print enter styles, 90 ms stagger), cursor + scroll parallax via CSS vars (depth: back/mid/front), hover straighten/lift, click-to-lift to centre with note card, others step aside (covered prints slide to gutters), index 01–06, "moments to explore" counter, Esc to put back.
- **Data:** static `PHOTOS` + `SLOTS` in `photos.ts` (7 slots, 6 photos). Captions describe only what is visible.
- **Responsive:** ≥768 table (16:10 stage, container-query units); <768 "pile" — top print + peeks, swipe / tap / index, caption block, counter.
- **SAFE files:** the four files in `supportGallery/`; the `<SupportGallery />` line in HomeClient.
- **DO NOT TOUCH:** global list; other sections; `photos.ts` captions must not gain impact claims.
- **FUTURE DESIGN SPECIFICATION:** Not specified yet.

## 4. What is CauseKind? — UNDER DEVELOPMENT (BROKEN)
- **Current purpose (intended):** typographic installation explaining CauseKind (EXTRA + NEED → CAUSEKIND), per a user brief given in chat on 2026-09-25 (brief text is not stored in the repo).
- **Component / file:** `WhatIsCauseKind` expected at `src/components/home/whatIsCauseKind/WhatIsCauseKind.tsx` — **file does not exist**. Present: `fonts.ts` (Archivo wdth + gallery fonts), `WhatIsCauseKind.module.css` (sticky stage 250svh/240svh, carriers, thread, concept words, phone layout, reduced-motion static mode; last edited 2026-09-26 10:27).
- **Imported by:** `HomeClient.tsx:65` → page does not compile.
- **Replaced on the page:** `WhoAreWeSection` ("About CauseKind — The Living Ecosystem", 747 lines + `WhoAreWeSection.module.css`, id `about-causekind`) — still in the repo, not rendered.
- **SAFE files:** `src/components/home/whatIsCauseKind/*`; the `<WhatIsCauseKind />` line in HomeClient.
- **DO NOT TOUCH:** global list; `supportGallery/fonts.ts` is imported by `whatIsCauseKind/fonts.ts` — change it only additively.
- **FUTURE DESIGN SPECIFICATION:** Not specified yet.

## 5. The problem we solve — REMOVED FROM THE PAGE (2026-09-26)
- Removed at the user's request from all breakpoints. `ProblemSolutionSection.tsx` is kept in the repo, not rendered. Do not re-add without instruction.
- **Current purpose:** "Good things sit unused. People nearby go without." — problem points vs solution points, 10 km handover.
- **Component / file:** `ProblemSolutionSection` — `src/components/home/ProblemSolutionSection.tsx` (id `problem-solution-section`).
- **Assets:** inline SVG item illustrations (book, shirt, fan, chair, teddy).
- **Animations:** ≥1024 GSAP timeline (once, `top 60%`): items fly from "Unused at home" to "Needed nearby", dust→colour crossfade, "Received with Joy", smiles, closing line; per-character eyebrow (Framer); ping + slow-spin ring on the 10 km badge. <768: `SegmentedTabs` + `StackedPanels` with `useRevealOnce`.
- **Data:** static copy.
- **Responsive:** ≥1024 3-column grid; 768–1023 stacked problem card / badge / solution card; <768 one card with Problem/Solution switch.
- **SAFE files:** `ProblemSolutionSection.tsx`.
- **DO NOT TOUCH:** global list; primitives behaviour.
- **FUTURE DESIGN SPECIFICATION:** Not specified yet.

## 6. How it works
- **Current purpose:** "Simple steps. Whoever you are." — 4 steps for each role tab: "I want to give" (#B5480F), "I need help" (#0F7A6C), "I'm an NGO" (#1F6B3F), role CTA to register.
- **Component / file:** `HowItWorksSection` — `src/components/home/HowItWorksSection.tsx` (ids `how-it-works`, `how-it-works-heading`).
- **Animations:** Framer tab swap (`AnimatePresence`), `useInView`, StepCard pointer tilt, looping icon bounce/pulse (desktop); phone **scroll stack** — sticky cards pinned under the header with 14 px offsets, earlier cards scale to 0.94 + shade via CSS scroll-driven animations (next card's view timeline); plain sticky stack where unsupported; keyed by tab with a staggered rise.
- **Data:** static steps; `LANDING_ROUTES` for CTAs.
- **Responsive:** ≥768 grid (2 cols md, 4 cols lg); <768 scroll stack (section uses `overflow: clip visible` below md so `sticky` works).
- **SAFE files:** `HowItWorksSection.tsx`, `HowItWorksStack.module.css`.
- **DO NOT TOUCH:** global list; `lib/landingConstants.ts` routes (shared).
- **Unrelated leftover:** `src/sections/landing/HowCauseKindWorks.tsx` (+ `howItWorksData.ts`, `SlotNumber.tsx`, `StepMotifIcon.tsx`) — not rendered.
- **FUTURE DESIGN SPECIFICATION:** Not specified yet.

## 7. Live needs
- **Current purpose:** "Real people. Real needs. Right now." — a sample (6) of public verified needs, category filter pills with counts, offer links, honest "N more" link, footer CTA to `/requests`.
- **Component / file:** `LiveNeedsSection` — `src/components/home/LiveNeedsSection.tsx` (ids `live-needs-section`, `live-needs-heading`). Rendered twice (desktop tree + mobile tree).
- **Data:** `initialPublicRequests` from `getPublicItemRequests()` (server, ISR 60 s); `useAuth` for empty-state CTA; `loginUrlFor`.
- **Animations:** Framer card fade-up (`useInView`), `AnimatedCategoryIcon`, optional `LetterSwap` heading, urgent pulse dot.
- **Responsive:** md 2-col / lg 3-col grid; <768 `.ck-snap-m` swipe row + `CarouselDots`.
- **Tests:** `LiveNeedsSection.test.tsx`, `liveNeedsOverflow.test.tsx`, `landingHonesty.test.tsx`.
- **SAFE files:** `LiveNeedsSection.tsx` (+ its tests).
- **DO NOT TOUCH:** global list; `lib/api.ts` types; keep `NEEDS_SHOWN`, overflow honesty and role logic unless asked.
- **FUTURE DESIGN SPECIFICATION:** Not specified yet.

## 8. Trust & safety
- **Current purpose:** "Built on trust, for everyone." — for donors / donees / NGOs, stats (100% admin-verified listings, 10 km, ₹0 fees, zero middlemen), one-time-code handover note.
- **Component / file:** `TrustSafetySection` (`variant` desktop|mobile) — `src/components/home/TrustSafetySection.tsx` (id `trust`); phone view `TrustSafetyMobile` inside the same file.
- **Animations:** desktop/tablet GSAP (shield assembly, cards dealt, check pops, counters via React state, "Zero" typewriter); phone: IO reveal, `SnapCarousel`, static stats.
- **Responsive:** ≥768 3-column cards (md) + 4-stat row; <768 swipe cards + 4-up stat row.
- **SAFE files:** `TrustSafetySection.tsx`.
- **DO NOT TOUCH:** global list. Stats are product facts — do not change numbers without the user.
- **FUTURE DESIGN SPECIFICATION:** Not specified yet.

## 9. Founder's note
- **Current purpose:** "Why we built CauseKind — Neighbours helping neighbours." Founder letter.
- **Component / file:** `FoundersNoteSection` (`variant`) — `src/components/home/FoundersNoteSection.tsx` (id `founders-note`); data in `FOUNDER` (`lib/landingConstants.ts`).
- **Status:** `FOUNDER.isPlaceholder = true` → **renders null in production**, shows with a "PLACEHOLDER" badge in development.
- **Animations:** desktop/tablet GSAP clip-path photo wipe, quote pop, text stagger, SVG signature draw; phone IO reveal (letterhead layout).
- **SAFE files:** `FoundersNoteSection.tsx`; `FOUNDER` values only when the user supplies real details.
- **DO NOT TOUCH:** global list.
- **FUTURE DESIGN SPECIFICATION:** Not specified yet.

## 10. Conditional blocks
- **Money campaigns** (`LatestActiveCampaignsSection`, mobile inline carousel, stats ticker) — `FEATURES.money = false`.
- **In-kind requests grid** — wrapped in `{false && …}` in HomeClient (dead).
- **Unclaimed needs** `UnclaimedSection` (`src/components/home/UnclaimedSection.tsx`) — only while `isRakshaBandhanCampaignActive()`.
- **FUTURE DESIGN SPECIFICATION:** Not specified yet.

## 11. Final CTA
- **Current purpose:** "Someone nearby is waiting for what you already have." — Join as Donor / Donee / Register NGO, WhatsApp tell-a-friend, "coming soon" strip with WhatsApp updates link.
- **Component / file:** `FinalCtaSection` (`variant`) — `src/components/home/FinalCtaSection.tsx` (id `join`); phone view `FinalCtaMobile`; `WhatsAppTellAFriend.tsx`.
- **Animations:** desktop/tablet GSAP aurora blob drift (infinite), card entrance, word reveal, button stagger, mouse parallax floating items (lg); phone static blobs + IO reveal.
- **Data:** `LANDING_ROUTES`, WhatsApp number in the component.
- **Responsive:** ≥640 3 buttons in a row (desktop component); <768 compact dark card, 3 buttons in one row.
- **SAFE files:** `FinalCtaSection.tsx`, `WhatsAppTellAFriend.tsx` (shared only here).
- **DO NOT TOUCH:** global list; `LANDING_ROUTES`.
- **FUTURE DESIGN SPECIFICATION:** Not specified yet.

---

## Components in the repo that are NOT on the page
`WhoAreWeSection.tsx` (+module.css), `SupportJourneySection.tsx`, `sections/landing/HowCauseKindWorks.tsx`,
`ItemDonationScrolly.tsx`, `MobileVisualStory.tsx`, `HandoverJourney.tsx`, `InKindProof.tsx`, `TheGapSection.tsx`,
`ThreadOfProtection.tsx`, `NearbyNeedsPanel.tsx`, `HeroGiveCTA.tsx`, `IndependenceHero.tsx`, `FaqSection.tsx`,
`CTASection.tsx`/`WhatWeProvideSection.tsx`/`StatsBars.tsx` (exported by the design-system package only),
`components/audience-pathways/*`, `components/cinematic/Chapter1TheHome.tsx`, `components/ui-bits/ScrollStack.tsx`,
`components/lightswind-pro/ScrollStack.tsx`, `PageSection.tsx`. Do not revive or delete without instruction.
