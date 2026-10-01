# How AI agents should work on CauseKind

Goal: **less repeated discovery, not less thinking.** The docs in `docs/ai/`
already hold the architecture; spend the saved effort on design and verification.

## BEFORE CODING
1. Read `docs/ai/CLAUDE_CONTEXT.md` (1–3 pages). Check its "Current state" — the tree may be mid-change.
2. Open `docs/ai/LANDING_PAGE_BLUEPRINT.md` and read **only your section's entry**: current state, SAFE files, DO-NOT-TOUCH files, and its FUTURE DESIGN SPECIFICATION.
3. Read the relevant parts of `CAUSEKIND_DESIGN_SYSTEM.md` (colours, type, spacing for your section) and `ANIMATION_SYSTEM.md` (utilities to reuse, patterns to avoid).
4. Check `LANDING_PAGE_GUARDRAILS.md` (locked Hero list, under-development areas) and the latest entries in `AI_CHANGELOG.md`.
5. Run `git status --short` so you know which changes are pre-existing.
6. Then read the actual section file(s) you will edit. Do **not** scan the whole repository unless the docs are missing something — and if they are, add it to the docs afterwards.
7. For Next.js APIs you are unsure about, read `node_modules/next/dist/docs/` (Next 16 differs from older versions).

## DURING CODING
- Modify the minimum set of files; stay inside the section's SAFE list.
- Preserve completed/locked sections; never touch Hero files.
- Reuse existing utilities: `home/mobile/primitives.tsx`, `Reveal`, `rig.ts` helpers, `useImmersiveNav`, existing CSS tokens.
- Prefer a CSS module inside the section folder over adding to `styles.css`; if you must add global CSS, append a clearly headed block at the end.
- Don't add dependencies (ask first). Don't edit `package.json`, lockfile or configs.
- Don't refactor unrelated code, rename files, or delete "unused" components/assets.
- Don't change APIs (`lib/api.ts`), data models, auth, feature flags, or `page.tsx` data fetching unless requested.
- Motion: transform/opacity only; `will-change` only while animating; reduced-motion path; IntersectionObserver instead of layout-reading scroll listeners; `gsap.matchMedia` for breakpoint-scoped timelines; `ScrollTrigger.sort()/refresh()` after late mounts.
- Responsive: design phone (<768) and desktop (≥1024) explicitly; remember the tablet band and both HomeClient trees.
- Copy: no invented statistics or impact claims.
- Keep section ids stable.

## AFTER CODING
1. `npx tsc --noEmit -p .` — must be clean for touched files.
2. `npx vitest run src/components/home src/app` (plus tests near your change). Known pre-existing failure: `src/app/homeAudiencePathways.test.tsx`. If a test imports a component that uses `next/font`, mock that component (fonts don't run under Vitest).
3. `npm run lint` is not usable (no ESLint). Don't rely on it.
4. Run the app (`npm run dev`, port 3000; if the user's dev server is already running, use it) and check:
   - desktop 1440×900 and phone 390×844 (optionally 360, 768, 1024);
   - animation start/end states, reduced motion (`prefers-reduced-motion: reduce`), no horizontal overflow (`scrollWidth === innerWidth`), no console errors;
   - the Hero is visually unchanged.
   `puppeteer-core` + local Chrome are available; `scripts/capture-*.cjs` are existing capture scripts.
5. For animation-heavy work, profile a production build on a 4× CPU-throttled phone viewport (see PERFORMANCE_NOTES.md "How to measure").
6. Report: files changed, what was verified (and what was not), known issues, decisions needing the user.
7. Append an entry to `docs/ai/AI_CHANGELOG.md`; update the blueprint/guardrails if a section's state changed (e.g. user approves → move to COMPLETED/LOCKED).
8. Don't commit or push unless asked.
