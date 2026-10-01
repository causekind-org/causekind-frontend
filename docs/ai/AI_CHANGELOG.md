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

## 2026-09-26 — Film: sticky tracks, title hold, phone line placement

### Files Changed
- `src/components/cinematic/CinematicOrchestrator.tsx` — server-rendered now (HeroFilm imports it statically); each chapter sits in a CSS-height track (`.track1` / `.track2`); chapters load via `next/dynamic` (`ssr:false`) with server-rendered stand-ins (`Chapter1Poster` = the title card, `Chapter2Poster` = night stage); `<noscript>` collapses the tracks; the `ScrollTrigger.sort()/refresh()` effect is gone.
- `src/components/cinematic/HeroFilm.tsx` — static import of the orchestrator.
- `src/sections/landing/Chapter1TheUnusedThing.tsx` — GSAP pin removed; triggers measure the track (`root.parentElement`); film starts after the hero lead-in **plus a title hold** (0.6 x stage height) so the title card is always read; portrait-only: "YOU DON'T NEED IT." sits below the bag (`--c1-line-y: 63%`, bag eases up/shrinks at 48.4). Desktop layout unchanged.
- `src/sections/landing/Chapter2TheEcosystem.tsx` — pin removed; entry scrub and main timeline measured on the track.
- `src/sections/landing/cinematic/cinematic.module.css` — `.track`, `.track > .stage { position: sticky; top: 0 }`, `.track1` / `.track2` heights (portrait shorter); reduced motion: tracks auto height, stage static.
- `src/sections/landing/cinematic/rig.ts` — `warmTimeline` warms each step forward-and-back inside one task (never leaves the timeline mid-film).
- `src/sections/landing/cinematic/fonts.ts` — `preload: false`.

### New Dependencies
- None

### Animation Changes
- Same timelines; they now scrub over sticky stages instead of GSAP pins.

### Responsive Changes
- Portrait: line placement under the bag. Landscape/desktop untouched.

### Important Decisions
- The film's scroll length must exist in the server HTML. Late-mounted pins grew the page from ~7k to ~18k px after load, so a quick early scroll went straight past the film and a refresh restored into the film instead of the section the reader was on.
- Triggers must measure the track, never the sticky stage.

### Known Issues
- None known.

### Status
- Verified in headless Chrome (390x844 at 4x CPU slowdown, and 1440x900): title card present on a fast early flick; "YOU DON'T NEED IT." below the bag on phone; a refresh at Trust stays at Trust (phone and desktop).

## 2026-09-26 — How it works (phone): horizontal auto-advancing carousel

### Files Changed
- `src/components/home/HowItWorksSection.tsx` — phone scroll stack removed. The three role panels share one grid cell; the active panel is centred, the next waits off to the right and the previous off to the left, so a switch slides the steps horizontally, card by card. Roles auto-advance every `AUTO_ADVANCE_MS` (2000 ms) on phones (`max-width: 767.98px`) while the section is at least 35% on screen; tapping a tab, arrow keys or a horizontal swipe hands control to the reader (auto-advance stops). New compact `MobileStepCard` row (italic serif numeral, title, description, role icon). Progress segments under the tabs. Section back to `overflow-hidden`.
- `src/components/home/HowItWorksMobile.module.css` — new.
- `src/components/home/HowItWorksStack.module.css` — deleted.

### New Dependencies
- None

### Animation Changes
- CSS transitions only (transform/opacity); segment fill is a CSS keyframe keyed per role. Reduced motion: no auto-advance, no transitions.

### Responsive Changes
- < 768 only. Desktop/tablet grid unchanged.

### Important Decisions
- All panels are always mounted in one grid cell so the block keeps the tallest role's height and the CTA never jumps on a switch.

### Known Issues
- 2 s per role is shorter than it takes to read four steps; it is the requested timing (change `AUTO_ADVANCE_MS`).

### Status
- Verified at 390x844: donor -> donee -> NGO -> donor every ~2 s, block height constant (365 px), a tab tap stops auto-advance; type-check clean.

## 2026-09-26 — Trust & safety / Founder's note: removals

### Files Changed
- `src/components/home/TrustSafetySection.tsx` — removed the shield graphic (phone SVG; desktop/tablet assembled shield and its GSAP steps), the `ShieldCheck` icon in the "TRUST & SAFETY" pill, and the one-time-code / public-place note (both views). Unused `ShieldCheck`/`KeyRound` imports and refs removed.
- `src/components/home/FoundersNoteSection.tsx` — removed the dev-only "PLACEHOLDER (Hidden in Production)" badge (both views). The section still renders `null` in production while `FOUNDER.isPlaceholder` is true.

### New Dependencies
- None

### Animation Changes
- Desktop Trust timeline now starts with the card deal.

### Responsive Changes
- None

### Important Decisions
- The one-time-code wording in the FAQ, HandoverJourney and InKindProof is untouched (only the Trust banner was asked for).

### Known Issues
- None

### Status
- Type-check clean; text and shield absent in the rendered page.

## 2026-09-26 — Film title card: never hidden

### Files Changed
- `src/sections/landing/Chapter1TheUnusedThing.tsx` — removed the scroll-scrubbed word reveal and the title/eyebrow exit tweens from the film timeline. New `syncTitle`: on every scroll (rAF-throttled), resize and ScrollTrigger refresh it measures the page live and sets `data-state` on `.c1-title`: `before` (hero bottom below 92% of the viewport, so the hero still covers the stage), `in`, or `after` (past the film start = lead + hold + 2vh). Coming back from `after` snaps the film's scrub tween (`getTween().progress(1)`) so the film is on its first frame behind the returning title. Words carry `--i` for stagger.
- `src/sections/landing/cinematic/cinematic.module.css` — `.titleCard` / `.titleEyebrow` state rules: `before` = words below their masks (no transition), `in` = words rise (0.75s, 55ms stagger), `after` = masks lift and fade (0.55s); back to `in` from `after` in about 0.3s. No state = visible.

### New Dependencies
- None

### Animation Changes
- Title rise/exit are CSS transitions (compositor) keyed off scroll position instead of scrubbed GSAP tweens.

### Responsive Changes
- None (same on all widths).

### Important Decisions
- Root cause: the reveal was scrubbed (`scrub: 0.6`). On phones GSAP lag smoothing is on (SmoothScroll turns it off only for fine pointers), so during a busy load the scrub advanced ~33ms per long frame and the words sat half-risen inside their masks. Title visibility must never depend on the GSAP clock or cached trigger positions.

### Known Issues
- In the dev build, a refresh far down the page can take several seconds (15s at 4x CPU) to hydrate before the real chapter mounts; the server-rendered title stand-in is shown (fully visible) meanwhile.

### Status
- Stress-tested at 4x CPU on 390x844 and 1440x900 (fast flick after refresh, refresh on the title, fast scroll up from inside the film, refresh at Trust then scroll up, top-and-back replay, 40px slow pass both ways): the title is fully visible in every settled sample; the only non-visible samples are the first frames of the intended rise/return transitions.

## 2026-09-26 — About CauseKind (phone): "Good things shouldn't sit unused" journey

### Files Changed
- `src/components/home/AboutJourneyMobile.tsx` — new. SVG illustration (viewBox 360x440): a shelf "At home · unused" with a book, school bag, shirt and laptop (dimmed, dust drifting); one at a time each lifts off (dashed outline marks the freed space), travels into the CauseKind heart ("Matched" + pulse), then on to a verified person or an NGO on a "Nearby · within 10 km" map; each destination has a NEEDS bubble showing the item it needs, which turns into GOT IT + tick on arrival. Caption under it names the item and where it went. Loops (~19 s).
- `src/components/home/WhoAreWeSection.tsx` — the broken `MobileEcosystem` (characters and hub inside zero-size absolute wrappers, so they piled into the top-left corner and left the space empty) replaced by `<AboutJourneyMobile items={JOURNEY_ITEMS} Person={DoneeSvg} Ngo={NgoSvg} />`; `useRevealOnce`/`stagger` import removed.
- `src/components/home/WhoAreWeSection.module.css` — `.journey` / `.j*` styles (light + dark).

### New Dependencies
- None

### Animation Changes
- One rAF loop, only while >= 30% on screen and the tab is visible, writing one transform per frame (the travelling item); phase changes (5 per item) are data attributes animated with CSS transitions/keyframes. Reduced motion: a still frame (bag matched in CauseKind), no loop.

### Responsive Changes
- < 768 only (`md:hidden`). Desktop/tablet ecosystem unchanged.

### Important Decisions
- Captions state only what the product does (from a shelf at home to a verified person / an NGO nearby); no invented people, distances or counts beyond the existing "within 10 km" fact.

### Known Issues
- None

### Status
- Verified at 390x844 (light + dark): frames for wake, travel, match, delivery and all-delivered; no horizontal overflow; type-check clean.

## 2026-09-26 — Chapter 2: captions never stuck; radar sweeps from the centre; How it works phone carousel hidden on PC

### Files Changed
- `src/sections/landing/Chapter2TheEcosystem.tsx` — caption word rises/fades (cap 1–3, final line) removed from the scrubbed timeline; `syncCaps` sets `data-on` from the live trigger position (windows in timeline units: 8–21.8, 30–54, 63–81, 89.5+). Radar: user-space radial gradient centred on the hub + bright leading edge + three-step trail (`SWEEP_TRAIL`); rotated with SVG `rotate(a HUB.x HUB.y)` (GSAP `svgOrigin` is root-SVG coordinates and, inside the moving camera, put the pivot on the ring).
- `src/sections/landing/cinematic/cinematic.module.css` — `.cap` states.
- `src/components/home/HowItWorksMobile.module.css` — `.viewport` / `.segs` display only below 768px (their `display` overrode Tailwind `md:hidden`, so the phone step list showed on PC).

### Status
- 4x CPU, 1440x900 and 390x844: parked 0.6 units into each caption window → words fully visible; outside a window → hidden. Radar screenshots show the beam from the hub. How it works: 1440/1024/800 show only the desktop grid, 390 only the carousel. Type-check clean.
