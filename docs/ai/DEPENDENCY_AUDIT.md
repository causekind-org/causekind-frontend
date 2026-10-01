# CauseKind frontend — Dependency audit

Documented 2026-09-26. Counts = files under `src/` (tests excluded) that import
the package; `scripts/` and root configs were also searched for the zero-count
ones. Nothing was installed, removed or changed.

**Caveat:** `src/design-system-entry.ts` publishes many components as a separate
package (`npm run build:ds`, tsup). A component or dependency unused by the app
may still ship there. Verify before removing anything.

## CORE
| Package | Version (installed) | Importers | Notes |
|---|---|---|---|
| next | 16.3.4 | 151 | App Router; breaking-change version (see AGENTS.md) |
| react / react-dom | 19.2.6 | 244 / 5 | |
| next-intl | 4.13.0 | 52 | i18n |
| tailwindcss (+ `@tailwindcss/postcss`, `@tailwindcss/cli` dev) | 4.3.0 | CSS | CSS-first config in `styles.css` |
| tw-animate-css | — | CSS `@import` | |
| typescript (dev) | 5.9.3 | — | |
| zod | ^3.24 | 2 | validation |
| sonner | ^2.0 | 5 | toasts |
| @react-oauth/google | ^0.13 | 3 | Google sign-in |
| @next/third-parties | ^16.2 | 1 | |

## ANIMATION
| Package | Importers | Notes |
|---|---|---|
| framer-motion | 84 | app-wide micro-interactions, Reveal |
| gsap (incl. ScrollTrigger, DrawSVG, CustomEase, CustomWiggle, MotionPath) | 18 | film + desktop section timelines |
| lenis | 2 | `SmoothScroll.tsx` (global) + `lightswind-pro/ScrollStack.tsx` (untracked, unused) |
| ogl | 1 | `LightRays.tsx` — **component has no importers → effectively unused** |

## UI
| Package | Importers | Notes |
|---|---|---|
| lucide-react | 187 | primary icon set (optimizePackageImports) |
| react-icons | 1 | `lib/categoryVisuals.ts` (Fa* category icons) |
| @radix-ui/react-{alert-dialog, dialog, dropdown-menu, hover-card, label, popover, progress, select, slot, switch, tabs} | 1 each (via `components/ui/*`) | used |
| class-variance-authority, clsx, tailwind-merge | 2 / 1 / 1 | `cn`, button variants |
| vaul | 1 | drawer |
| input-otp | 2 | OTP input |
| react-day-picker | 2 | calendar |
| recharts | 1 | admin charts |
| @vis.gl/react-google-maps | 1 | location picker |

## UTILITY
| Package | Importers | Notes |
|---|---|---|
| html2canvas + jspdf | 1 + 1 | certificate export |
| qrcode | 1 | |
| isomorphic-dompurify | 1 | sanitising HTML |
| country-state-city | 1 | address forms |

## UNUSED / POTENTIALLY UNUSED (0 importers in src/, scripts/, root configs)
`@hookform/resolvers`, `react-hook-form`, `cmdk`, `date-fns`, `embla-carousel-react`,
`react-resizable-panels`, `pg` (Node Postgres client in a frontend package),
`@radix-ui/react-accordion`, `-aspect-ratio`, `-avatar`, `-checkbox`, `-collapsible`,
`-context-menu`, `-menubar`, `-navigation-menu`, `-radio-group`, `-scroll-area`,
`-separator`, `-slider`, `-toggle`, `-toggle-group`, `-tooltip`;
effectively unused: `ogl` (only in an unimported component).
devDependencies in use for tooling: `puppeteer-core` (capture scripts), `sharp` (image scripts), `tsup`, vitest stack.

## DUPLICATE / OVERLAPPING
| Overlap | Notes |
|---|---|
| framer-motion ↔ gsap | Both used on the landing page with different roles (Framer: reveals/hover/tab swaps; GSAP: scroll timelines/pins). Both ship in the home bundle. |
| lucide-react ↔ react-icons | react-icons only for category glyphs. |
| lenis ↔ native smooth scroll | Lenis only on fine pointers. |
| embla-carousel-react ↔ custom carousels | embla unused; landing uses native scroll-snap (`SnapCarousel`) and bespoke carousels. |
| Several near-identical ScrollStack copies | `components/ui-bits/ScrollStack.tsx`, `components/lightswind-pro/ScrollStack.tsx` (untracked, unused). |
| tailwindcss in `dependencies` + `@tailwindcss/cli`/`postcss` in dev | normal for v4 + design-system CSS build. |

## Tooling status
- `npm run lint` → `next lint`, but no ESLint config / `eslint` package is installed: **not usable**.
- `npx tsc --noEmit -p .` — type gate (works).
- `npm test` / `npx vitest run [paths]` — 51 test files; known failing: `src/app/homeAudiencePathways.test.tsx` (11, pre-existing), tracker consent tests (bypass flag).
- `npm run build` — clears `.next/cache` then `next build` (currently fails: missing module).
