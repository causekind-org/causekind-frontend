# AI CHANGELOG

## Current State

Documentation/audit phase completed (2026-09-26).

Application code has NOT been modified during this audit. The only files added
are the documentation files in `docs/ai/`.

Pre-existing state recorded by the audit (uncommitted on branch
`landingpageredesignvarun`, on top of commit `cf02eb3`):
- Mobile (<768) landing redesign, cinematic film under the hero, font/nav/perf
  work, and the new "Where does my support go?" photo table.
- "What is CauseKind?" is incomplete: `HomeClient.tsx` imports
  `src/components/home/whatIsCauseKind/WhatIsCauseKind.tsx`, which does not
  exist → the app does not compile.

---

## Entry format (append newest at the bottom)

## YYYY-MM-DD — SECTION NAME

### Files Changed
-

### New Dependencies
-

### Animation Changes
-

### Responsive Changes
-

### Important Decisions
-

### Known Issues
-

### Status
-

## 2026-09-26 — Landing page build error (What is CauseKind? slot)

### Files Changed
- `src/app/HomeClient.tsx` — replaced the import/render of the missing `whatIsCauseKind/WhatIsCauseKind` with `WhoAreWeSection`.

### New Dependencies
- None

### Animation Changes
- None (WhoAreWeSection renders with its existing animations).

### Responsive Changes
- None

### Important Decisions
- Minimal fix: restore the existing About section instead of writing the unbuilt typographic section. `components/home/whatIsCauseKind/` (CSS + fonts) is kept for when that section is built.

### Known Issues
- "What is CauseKind?" typographic installation still not implemented.

### Status
- Dev server renders `/` and `/about` (HTTP 200); type-check clean.

## 2026-09-26 — Cinematic film: map framing, thought cloud, phone framing, nav

### Files Changed
- `src/sections/landing/Chapter2TheEcosystem.tsx` — map camera: new whole-ring key (ring + "10 KM" label fit above the captions on phones / right of them on desktop), new route push-in key (cam 3 at t=46.5), close-up moved to cam 4.
- `src/sections/landing/Chapter1TheUnusedThing.tsx` — thought cloud is one scalloped path (`cloudPath`, arc-length-spaced bumps) with two-line text in Fraunces; separate landscape/portrait clouds (`CLOUD_L`, `CLOUD_P`, visibility set in `measure()`); portrait camera keys re-centred on the girl; portrait establishing shot tighter; "You don't need it / But someone might" sized and tracked to fit phones.
- `src/components/cinematic/CinematicOrchestrator.tsx` — nav-hide trigger `refreshPriority: -1` (it was measured before Chapter 2's pin after `ScrollTrigger.sort()`, so the header/dock returned mid-film).

### New Dependencies
- None

### Animation Changes
- Cloud: single DrawSVG stroke instead of 12 circle strokes; cloud scale uses `transformOrigin: 50% 50%`.
- Map: ring first, then zoom along the route, then the portal close-up (both breakpoints).

### Responsive Changes
- Portrait-only camera, cloud position and headline sizing (`max-md:` classes).

### Important Decisions
- Two cloud variants instead of re-computing one path at runtime, so DrawSVG lengths stay fixed.

### Known Issues
- Not re-profiled for frame time after these changes.

### Status
- Verified by headless screenshots at 390×844 and 1878×854; header/dock hidden through both chapters; type-check clean.

## 2026-09-26 — How it works (phone): scroll stack + card typography

### Files Changed
- `src/components/home/HowItWorksSection.tsx` — phone view: `SnapCarousel` replaced by a sticky scroll stack (`<ol>` of cards keyed by tab); new `MobileStepCard` (mono "STEP 01 / 04" folio, 1.45rem 800-weight title, 0.95rem description, large faint italic serif numeral, role colour via `--role`/`--soft`); section `max-md:[overflow:clip_visible]`.
- `src/components/home/HowItWorksStack.module.css` — new.
- `src/styles.css` — removed the now-unused `.ck-hiw-m*` carousel rules and `ck-m-rise` keyframes.

### New Dependencies
- None

### Animation Changes
- Sticky stacking (no JS). Depth via `animation-timeline` on the next card's `view-timeline` (scale 0.94 + shade layer; card stays opaque). Reduced motion: no animations.

### Responsive Changes
- < 768 only. Desktop/tablet grid unchanged.

### Important Decisions
- Global fonts only (Roboto Mono, Source Serif 4) so the section needs no `next/font` import (keeps Vitest imports working).

### Known Issues
- Browsers without scroll-driven animations get the stack without the sink/shade.

### Status
- Verified with headless screenshots at 390×844; no horizontal overflow; type-check clean.

## 2026-09-26 — The problem we solve: removed

### Files Changed
- `src/app/HomeClient.tsx` — removed `ProblemSolutionSection` import and render (all breakpoints).
- `src/components/home/DashedJourneyRoad.tsx` — removed its `problem-solution-section` stop.

### New Dependencies
- None

### Animation Changes
- Section's GSAP timeline no longer runs.

### Responsive Changes
- None beyond the removal.

### Important Decisions
- Component file `ProblemSolutionSection.tsx` kept (not rendered), consistent with other retired sections.

### Known Issues
- None

### Status
- Home page renders (HTTP 200) without the section; type-check clean.
