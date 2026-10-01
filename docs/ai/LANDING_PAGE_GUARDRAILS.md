# CauseKind — Landing page guardrails

## IMMUTABLE

**The Hero must not be modified unless the user explicitly requests a Hero change.**
This includes its layout, copy, images, CTAs, category rail, trust band,
animations, responsive behaviour and the CSS it depends on.

## HERO — DO NOT TOUCH

| File | Why it is Hero |
|---|---|
| `src/components/home/HeroSection.tsx` | the Hero component (photo stage, pins, CTAs, Anton mobile font) |
| `src/components/home/CategoryStrip.tsx` | category rail rendered inside the Hero |
| `src/components/home/TrustBand.tsx` | trust items rendered inside the Hero (desktop rail + mobile hero footer) |
| `src/components/donate/DonateNowButton.tsx` | Hero Donate CTA (also navbar/footer) |
| `src/components/NewRequestLink.tsx` | Hero primary CTA link |
| `src/styles.css` ≈ lines 2162–2776 | `.ck-showcase-hero`, `.ck-hero-*`, `.ck-mobile-hero-*`, `.ck-lead-hero-stage`, hero CTA keyframes (`ck-hero-image-drift`, `-route-flow`, `-cta-sheen`, `-cta-icon-lift`), Be-the-Change underlap rules |
| `src/styles.css` ≈ lines 3976–4254 | `.ck-donate-*` Donate Now system (Hero placement) |
| `src/styles.css` `.ck-hero-callout-float` (≈4590) | Hero pin float loop |
| `messages/*.json` → `"hero"` block | Hero copy in 14 locales |
| `public/images/causekind-hero-handoff.webp`, `causekind-hero-foreground.png`, `causekind-mobile-hero-v1.webp` | Hero images |
| `src/hooks/useAuth.tsx`, `src/lib/postAuthDestination.ts`, `src/hooks/useNeedProfileGate.tsx` | Hero CTA logic depends on them (shared app-wide — never change for a landing task) |

Hero-adjacent (change only for film tasks, and re-verify the Hero at rest is unchanged):
`src/components/cinematic/HeroFilm.tsx`, `.ck-hero-film*` in styles.css (≈4541–4575).
External code that reads Hero markup — keep these selectors stable:
`Navbar.tsx` (`.ck-lead-hero-stage`), `tour/TourController.tsx` + `tourSteps.ts` (`[data-tour="guest-hero"]`),
tests `components/home/heroFrontDoor.test.tsx`, `app/homeAudiencePathways.test.tsx`.

## LOCKED SECTIONS
- Hero

## COMPLETED SECTIONS
None yet. (No section has been explicitly approved/locked by the user. Add a section here only when the user says so.)

## CURRENTLY UNDER DEVELOPMENT (from the working tree, 2026-09-26 — all uncommitted)
| Area | State |
|---|---|
| What is CauseKind? (`home/whatIsCauseKind/`) | **Incomplete: component file missing; breaks compile.** CSS + fonts exist. |
| Where does my support go? (`home/supportGallery/`) | New; implemented, untracked. |
| Cinematic film under the hero (`cinematic/HeroFilm.tsx`, Chapter 1/2) | Enabled (`FEATURES.cinematicLanding = true`), fonts, nav hide, perf work — uncommitted. |
| Mobile (<768) landing redesign (`home/mobile/primitives.tsx`, phone views in ProblemSolution, HowItWorks, LiveNeeds, Trust, Founders, FinalCta; `ck-m-section`) | Implemented, uncommitted. |
| `WhoAreWeSection.tsx` + `WhoAreWeSection.module.css` | Reworked ("Living Ecosystem") but **not rendered** after being replaced by WhatIsCauseKind. |
| Performance changes (GlassSurface touch fallback, SmoothScroll off on touch, CSS loops, Navbar IO) | Uncommitted. |

## GLOBAL RULES
- Don't modify unrelated sections.
- Don't refactor unrelated components.
- Don't install dependencies without explicit approval (and never edit `package.json`/lockfile/config without it).
- Reuse existing animation libraries (GSAP, Framer Motion) and utilities (`primitives.tsx`, `Reveal`, `rig.ts` helpers) when possible.
- Preserve existing API/data behaviour (`lib/api.ts`, `page.tsx` fetches, ISR, auth logic).
- Preserve responsive behaviour unless the task specifically concerns it; keep both HomeClient trees (`hidden lg:block` / `lg:hidden`) consistent.
- Modify the minimum necessary files; stay inside the section's SAFE list (LANDING_PAGE_BLUEPRINT.md).
- Don't change completed visual concepts without explicit instruction.
- Keep the Hero pixel-identical at rest.
- Keep copy honest: no invented statistics or impact claims (enforced in part by `landingHonesty.test.tsx`).
- Animate transform/opacity; provide a reduced-motion path; no new scroll listeners that read layout.
- Keep section ids stable (`where-support-goes`, `problem-solution-section`, `how-it-works`, `live-needs-section`, `trust`, `founders-note`, `join`, `about-causekind`) — they are anchors/test hooks.
- Don't commit, push or delete files unless asked.
- Log every change in `docs/ai/AI_CHANGELOG.md`.
