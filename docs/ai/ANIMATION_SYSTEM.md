# CauseKind — Animation system (as implemented)

Documented 2026-09-26 from source. Nothing here is aspirational; missing
capabilities are stated as missing.

## Animation libraries
| Library | Version | Where it is the right tool today |
|---|---|---|
| **GSAP** + ScrollTrigger | 3.15.0 | pinned/scrubbed storytelling (film), one-shot desktop timelines triggered on scroll, `gsap.matchMedia` breakpoint scoping |
| GSAP DrawSVGPlugin / CustomEase / CustomWiggle / MotionPathPlugin | bundled with gsap 3.15 | line drawing, custom easing, shake; MotionPath only in the unused SupportJourneySection |
| **Framer Motion** | 12.42.0 | `Reveal` component, `useInView`, `AnimatePresence` tab swaps, springs, `MotionConfig reducedMotion="user"` (hero) |
| **Lenis** | 1.3.26 | global smooth wheel scrolling (`SmoothScroll.tsx`) |
| CSS keyframes/transitions | — | 122 `@keyframes` in `styles.css`; module CSS in film, gallery, WhoAreWe, planned WhatIsCauseKind |
| `ogl` (WebGL) | 1.0.11 | only `LightRays.tsx`, which is not imported anywhere |
| Three.js, Lottie, `motion` (standalone), react-spring | — | **not installed** |

## Existing utilities
| Utility | File | What it gives you |
|---|---|---|
| `Reveal` | `src/components/Reveal.tsx` | Framer `whileInView` fade/slide (`direction` up/down/left/right/none, `delay` ms), spring; reduced motion renders a plain div |
| `useRevealOnce`, `stagger(i)` | `src/components/home/mobile/primitives.tsx` | IntersectionObserver (threshold 0.2) reveal of `[data-reveal-item]` children, once; CSS in styles.css "Reveal once"; 500 ms `cubic-bezier(0.22,1,0.36,1)`, 70 ms stagger capped at 6 |
| `SnapCarousel`, `CarouselDots` | primitives.tsx | native scroll-snap row (85% slides, peek), IO-synced dots, tap-to-slide |
| `SegmentedTabs`, `StackedPanels` | primitives.tsx | transform-only sliding thumb; panels in one grid cell (no height jump); ARIA tabs |
| `FlipCard` | primitives.tsx | rotateY flip, `will-change` only while turning |
| `.ck-snap-m` | styles.css | turns any grid into a snap row below 768px (used by LiveNeeds) |
| `lib/animations.ts` | Framer `Variants`: `pageSlideIn`, `pageFadeUp`, `fadeUp`, `fadeIn`, `scaleIn`, `staggerContainer(Fast)`, `cardReveal`, `listItem`, `modalOverlay/Content`, `slideInLeft/Right`, `popIn`, `counterSpring`, `respectReducedMotion()` | **0 importers** — available but unused |
| `rig.ts` (film) | `src/sections/landing/cinematic/rig.ts` | `measureStage`, `cameraTransform`, `toScreen`, `setT` (write-if-changed), `samplePath`/`pointAt` (path lookup tables — avoid `getPointAtLength` per frame), `warmTimeline` (initialise a scrubbed timeline's tweens during idle time) |
| `LetterSwap` | `src/components/LetterSwap.tsx` | per-character flip text |
| `AnimatedCategoryIcon` | `src/components/AnimatedCategoryIcon.tsx` | hover/focus spring on fine pointers; CSS loop (`.ck-cat-icon-loop`) on touch while in view |
| CSS loops | styles.css "Compositor-only loops" | `.ck-cat-icon-loop`, `.ck-hero-callout-float`, `.ck-heartbeat` (replace former Framer infinite loops) |

## Existing hooks
| Hook | File | Purpose |
|---|---|---|
| `useImmersiveNav` | `src/hooks/useImmersiveNav.ts` | listens for `ck:immersive-nav` (CustomEvent, boolean detail); header + mobile dock hide while true |
| `useNearFooter` | `src/hooks/useNearFooter.ts` | dock + bottom blur park near the footer |
| `useTilt` | `src/hooks/useTilt.ts` | pointer-driven 3D tilt for glass icon buttons (navbar) |
| `useIsDesktop` | `src/hooks/useIsDesktop.ts` | media-query boolean |
| `useDraggableBubble` | `src/hooks/useDraggableBubble.ts` | draggable support bubble with persisted position |
| Framer `useInView`, `useReducedMotion` | — | used directly in sections |
No shared parallax, magnetic, or scroll-progress hook exists.

## Scroll architecture
- **Native document scroll** everywhere. Lenis wraps wheel scrolling on fine-pointer devices only (`SmoothScroll.tsx` exits on `pointer: coarse` and reduced motion); it drives `ScrollTrigger.update` through `gsap.ticker`.
- **Film (HeroFilm):** `.ck-hero-film` grid puts the hero over the film. Chapter 1 pins from the first scroll (`ScrollTrigger.create({pin:true})` for lead-in + film), the hero scrolls off natively, Chapter 1's scrubbed timeline starts after the hero has cleared the header (`leadInRef`). Chapter 1 film length `innerHeight × 5.6` (portrait) / `× 7.2`; Chapter 2 pins `+=520%` / `+=640%` after an entry scrub. Everything is one timeline of plain numbers → one `apply()` that writes SVG attributes/transforms.
- `CinematicOrchestrator` calls `ScrollTrigger.sort(); ScrollTrigger.refresh()` after mount (the film mounts client-only after other triggers exist) and dispatches `ck:immersive-nav` while the film owns the screen.
- **Desktop section timelines** (ProblemSolution ≥1024, Trust/Founders/FinalCta desktop ≥1024 and tablet 768–1023) are `gsap.timeline({scrollTrigger:{start:"top 60–85%", once}})` — play once, not scrubbed.
- **HomeClient** calls `ScrollTrigger.refresh()` 150 ms after data/state changes; LiveNeeds refreshes on filter change.
- **Sticky CSS** (no GSAP pin) is the approach specified for the in-progress WhatIsCauseKind (`.sticky` in its CSS module).
- `ScrollTrigger.config({ ignoreMobileResize: true })` is set in Chapter 1.

## Mouse interaction
- SupportGallery: `pointermove` (mouse only) → `--px/--py` CSS vars once per rAF; depth multipliers in CSS.
- HowItWorks `StepCard`: `onMouseMove` tilt (desktop grid only).
- FinalCta desktop: `onMouseMove` → `setMousePos` state → floating SVG items translate (re-renders on every mouse move).
- `useTilt` glass buttons; `RoleClickSpark` canvas sparks on click (site-wide).
- Hover states: CSS (`@media (hover:hover)` in gallery), Framer `whileHover` (WhoAreWe, unused).

## Page transitions
NO ACTIVE PAGE-TRANSITION SYSTEM. `lib/animations.ts` defines page variants but nothing uses them. `RouteProgressBar` (top progress bar) is the only navigation feedback.

## Performance considerations (see PERFORMANCE_NOTES.md for severities)
- Film on phones is the heaviest part of the page (measured 2026-09-25 on a 4×-throttled 390px prod build: ≈20–28 ms median frames during the film, ≈12–15 ms elsewhere; Microsoft Clarity accounted for a large share).
- Film rules (cinematic/README.md): no SVG blur filters on moving things, screen-space effects in a separate SVG, loops only inside their window, `autoAlpha` (visibility) for hidden layers, ticker only while something self-animates, no grain/backdrop-filter on touch, phones skip the ink pass ("lite").
- Never animate width/height/top/left/box-shadow/filter on moving elements; the codebase fades a second shadow layer instead of animating `box-shadow`.
- Avoid React state updates per animation frame (Trust counters and FinalCta mouse parallax still do this on desktop).

## Mobile animation strategy
- Phones get dedicated compositions (`*Mobile` components / `md:hidden` blocks) with IO reveals and native scroll-snap instead of GSAP timelines.
- GSAP desktop timelines are scoped with `gsap.matchMedia` so they never run < 768 (or < 1024).
- Lenis off, backdrop-filter off, glass SVG displacement off on `pointer: coarse`.
- Infinite loops are CSS (compositor) and pause when hidden.
- The film is the exception: it runs on phones in "lite" mode (no ink pass, no motion blur, no grain).

## Reduced motion
- CSS: `@media (prefers-reduced-motion: reduce)` blocks in styles.css (global list at ≈1896, mobile primitives, hero, donate CTA, loops) and module CSS.
- `Reveal` renders static; `useRevealOnce` marks content done immediately; GSAP sections check `matchMedia("(prefers-reduced-motion: reduce)")` and set final states.
- Film: still frame, no pin; HeroFilm stacks the film under the hero instead of hiding it; nav is not hidden.
- Hero: `MotionConfig reducedMotion="user"`.

## Reusable patterns
1. **IO reveal once** — `useRevealOnce` + `data-reveal-item` + `stagger(i)`.
2. **Framer reveal** — `<Reveal>` for simple blocks where a spring is fine.
3. **Native carousel** — `SnapCarousel` / `.ck-snap-m` + `CarouselDots`.
4. **Tabs without layout shift** — `SegmentedTabs` + `StackedPanels`.
5. **Scrubbed story** — film pattern: numbers on an object, one `apply()`, `setT`, `samplePath`, `warmTimeline`, `gsap.matchMedia` with a reduced-motion branch.
6. **CSS-var parallax** — gallery pattern (rAF-batched writes, gated by IO).
7. **Immersive section** — dispatch `ck:immersive-nav` true/false.
8. **One-shot desktop timeline** — `gsap.matchMedia("(min-width:1024px)")` + `scrollTrigger:{start:"top 80%", once:true}`.

## Patterns to avoid (each was found and removed or flagged here)
- Scroll listeners that read layout (`getBoundingClientRect`) every event — use IntersectionObserver.
- Framer `repeat: Infinity` loops — use CSS keyframes.
- Per-frame `setState` (counters, mouse position).
- `getPointAtLength` / `getComputedStyle` in per-frame code — sample once (`samplePath`), warm timelines.
- Animated blur (`blur-3xl` blobs moving), `backdrop-filter` over scrolling content on phones, SVG filters on moving elements.
- Deleting DOM nodes inside a GSAP setup (breaks re-runs under React Strict Mode — Chapter 1 ink bug, fixed 2026-09-25); hide with `display:none`/`autoAlpha` instead.
- New GSAP pins without `ScrollTrigger.sort()/refresh()` after late mounts.
- Scroll-jacking outside the film.
