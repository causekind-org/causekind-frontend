# CauseKind landing page — Performance notes

Documented 2026-09-26. Nothing was changed. Measurements quoted are from a
production build profiled on 2026-09-25 (390×844, 4× CPU throttle, headless
Chrome; the machine was busy, so single runs varied up to ~2× — numbers are
medians of repeated, interleaved runs). They predate the missing-component
breakage and the new photo/typography sections.

Legend: **HIGH** = user-visible jank or blocking · **MEDIUM** = measurable cost / risk · **LOW** = hygiene.

## HIGH
| Issue | Where | Detail |
|---|---|---|
| Page does not compile | `HomeClient.tsx:65` → missing `whatIsCauseKind/WhatIsCauseKind.tsx` | Dev: HTTP 500 on every route. Production build will fail. Blocks any measurement. |
| Cinematic film cost on phones | `sections/landing/Chapter1TheUnusedThing.tsx`, `Chapter2TheEcosystem.tsx` | ≈13 viewport-heights of pinned scrub. Measured median frame ≈28 ms in Chapter 1 (≈36% of frames > 33 ms) with trackers; ≈20 ms without Microsoft Clarity. Large inline SVG DOM (room, student, map). Mitigations already in place: lite mode on touch, path LUTs, idle timeline warm-up, loop windows. |
| Third-party trackers on every scroll/pointer event | `ClarityAnalytics.tsx`, `GoogleTagManagerGated.tsx`, `MetaPixel.tsx` (layout.tsx) | Clarity calls `caretPositionFromPoint` on pointer/scroll activity; blocking it cut hero frames ≈20→12 ms and film ≈29→20 ms. All three load **without consent** (`TESTING_BYPASS = true`). |

## MEDIUM
| Issue | Where | Detail |
|---|---|---|
| Duplicated section DOM | `HomeClient.tsx` desktop tree + mobile tree; `variant="mobile"` renders phone + tablet components | LiveNeeds ×2; Trust, Founders, FinalCta ×3 each (one visible, others `display:none`). Extra DOM, React work and effect setup on every device (GSAP work is gated by `matchMedia`). |
| Per-frame React state | `TrustSafetySection.tsx` (`setStat1/2/3` in a GSAP `onUpdate`, `setInterval` typewriter) | re-renders the section on every tween frame (desktop/tablet only). |
| Per-mousemove React state | `FinalCtaSection.tsx` `setMousePos` | whole CTA section re-renders on every mouse move (desktop). |
| Animated large blurs | `FinalCtaSection.tsx` aurora blobs (`blur-3xl`, 260–340 px) tweened x/y/scale forever | repaint-heavy (desktop + tablet; phone version is static). |
| Clip-path animation | `FoundersNoteSection.tsx` desktop photo wipe | paint per frame during the reveal (section is null in production today). |
| Render-blocking third-party CSS | `styles.css` line 1 `@import url(fonts.googleapis.com … Noto Sans Devanagari)` | extra blocking request on every page. |
| Many font families | layout (6), Hero (Anton), film (Big Shoulders, Fraunces, IBM Plex Mono), gallery (Fraunces, Caveat, Plex), planned section (Archivo) | only Plus Jakarta preloads; the others download on use. Film/gallery fonts ship with their components. |
| Framer Motion in the main landing bundle | Reveal + 6 landing sections + HeroSection (`MotionConfig`) | Framer + GSAP both load for the home page; only the film is code-split (`next/dynamic`, `ssr:false`). |
| Global ScrollTrigger refreshes | `HomeClient.tsx` (`setTimeout(refresh,150)` on data/state changes), `LiveNeedsSection` (refresh on filter), `CinematicOrchestrator` (sort + refresh) | each refresh re-measures every trigger incl. pins — layout thrash on slower phones. |
| DashedJourneyRoad | `home/DashedJourneyRoad.tsx` (≥1280) | full-page SVG path scrubbed + recomputed on resize/refresh via layout reads. |
| Planned sticky scroll section | `whatIsCauseKind/WhatIsCauseKind.module.css` (250svh) | another scroll-driven section right after the film; measure on a throttled phone when implemented. |

## LOW
| Issue | Where | Detail |
|---|---|---|
| Gallery image `sizes` over-fetch | `SupportGallery.tsx` `sizes="(min-width: 768px) 60vw, 80vw"` | prints render at 12–24% of the stage but request 60vw candidates (sized for the lifted state). 6 photos of 290–455 KB source. |
| Per-character motion nodes | `ProblemSolutionSection.tsx` eyebrow (one `motion.span` per letter) | ~20 Framer nodes for one label. |
| Unused imports / dead code on the home page | `HomeClient.tsx` (`DesktopStatsBar`, `LiveTicker`, `{false && …}` in-kind grid) | bundle/readability. |
| Idle CSS loops | `animate-ping` (10 km badge, road), `animate-spin-slow`, HowItWorks icon bounce/pulse, Donate CTA idle breathe/sheen | compositor-only mostly; stop when hidden. |
| Site-wide click-spark canvas | `RoleClickSpark` / `ClickSpark.jsx` | short canvas animation per click. |
| Heavy unused public assets | `public/scrolly/desktop` (598 frames, ~15 MB), `logo.mp4` 2.5 MB, `causekind-mobile-hero-v1.png` 1.7 MB, `images/icons/*.jpg` 2.4 MB, test PNGs | no runtime cost; deploy/repo weight. |
| Unused heavy deps installed | `ogl`, `html2canvas`/`jspdf` only on certificate pages, see DEPENDENCY_AUDIT.md | not in the landing bundle unless imported. |

## Already optimised (don't regress)
- Mobile (<768) sections use IO reveals + native scroll-snap, no GSAP timelines.
- Lenis disabled on touch; GlassSurface SVG displacement + backdrop blur disabled on touch; FAB ripple off on phones.
- Former Framer infinite loops (category icon, hero pins, About heart) moved to CSS keyframes.
- Navbar hero detection via IntersectionObserver (no layout reads per scroll); `scrolled` setState only on change.
- Film: path lookup tables instead of `getPointAtLength`, idle `warmTimeline`, lite mode, loops windowed.
- Gallery parallax: rAF-batched CSS-variable writes, scroll listener only while on screen.

## How to measure (reproducible)
Production build (`npm run build && npx next start -p 3055`), headless Chrome via `puppeteer-core` (installed as a devDependency; Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`), 390×844 `isMobile`, `Emulation.setCPUThrottlingRate 4`, scroll in 14 px rAF steps and record frame deltas per section; compare with Clarity blocked via request interception. Run A/B interleaved — the dev machine runs other browsers. Stop the server afterwards by the port's owning PID (never by a command-line match, which also kills `next dev`).
