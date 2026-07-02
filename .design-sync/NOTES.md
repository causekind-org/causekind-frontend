# design-sync NOTES

Repo-specific gotchas for `/design-sync` on causekind-frontend. Read this before syncing.

## next/image previews — KNOWN LIMITATION, do not feed real image URLs

`import Image from "next/image"` crashes with `Element type is invalid: expected a string ... but got: object` whenever a component actually renders an `<Image>` (i.e. is given a real, truthy image URL). `next/link`'s `<Link>` uses the byte-for-byte identical CJS wrapper pattern and works fine, so this isn't the obvious "esbuild can't see `__esModule` through a runtime `module.exports = require(...)` reassignment" explanation it first looks like — that was tested (aliasing straight past the wrapper to `next/dist/shared/lib/image-external`) and did NOT fix it. Root cause not isolated after real investigation (see `tsup.config.ts` for the fuller trace of what was tried).

**When authoring any preview for a component that uses `next/image` internally** (grep the component source for `from "next/image"` — known instances so far: `MockListingsCarousel`, and likely `CampaignCard`, `HeroCampaignSlider`, `ListingDetailPanel`, `CampaignCarousel`, `PhoneAnimationSection`, `Interactive3dHero` — check each before authoring):
- Pass `null`/`undefined`/omit the image prop so the component's own "no image" fallback renders instead of the `<Image>` branch. This is a real, legitimate state — not a fabricated one — so it's a fine preview on its own, just incomplete (no populated-image state).
- If a component's ENTIRE value proposition IS showing an image (nothing meaningful to preview without one), leave it as a floor card rather than authoring a broken or misleadingly-empty preview, and note it in the "Known render warns" section below.
- Don't spend time re-debugging this per-component — it's a global bundler issue, not a per-component one.

**Re-sync risk**: if a future session actually fixes the root cause (see the TODO in `tsup.config.ts`), every preview authored under this workaround should be revisited to add the real image state back in — they're currently all missing their most realistic variant.

## Known render warns

- `LogoSVG`: `[RENDER_THIN]` "mounts have no text and paint nothing". The logo is drawn via a continuous looping stroke-dashoffset animation (`LOOP_MS`/`GRAD_MS` in the component source) with no static "finished" state — a screenshot mid-animation shows a partial stroke. Not fixed; genuinely can't render statically. Left un-authored (floor card) rather than shipping a misleading partial-logo preview. Confirmed benign — don't re-chase on re-sync.
- `LogoVideo`: `[RENDER_THIN]` even though `.design-sync/previews/LogoVideo.tsx` IS authored and visually confirmed correct (full heart+family logo mark, styled, complete — checked the actual screenshot at `_screenshots/review/general__LogoVideo.png`). The validator's own height-measurement heuristic false-positives here, per its own hint text ("portals/fixed positioning can collapse measured output"). Confirmed benign — don't re-chase on re-sync; re-check the screenshot only if the component's own layout changes.

## Config decisions worth knowing

- `cfg.provider` is set to `NextIntlClientProvider` (from `next-intl`, re-exported in `src/design-system-entry.ts` for this purpose) with `{locale: "en", messages: {}}`. Needed because `TranslatedText`/`useDynamicTranslation` (and presumably `LanguageSwitcher`, `useTranslations` call sites) throw without it. `NextIntlClientProvider` itself shows up as an extra discovered "component" — excluded via `componentSrcMap: {"NextIntlClientProvider": null}` in config.json.
- `cfg.overrides.Card = {"cardMode": "column"}` — Card's authored `CampaignSummary` story renders wider than the product's grid cell.
- `HeroSection`/`HeroImageSlider`/`HeroQuoteSlider` and `LocationGate` are permanently excluded from `src/design-system-entry.ts` (commented out, not deleted) — both call real Next.js Server Actions (`"use server"`, filesystem/Node-only) that cannot run in a browser bundle under any amount of config. See `project-brain/Decisions and Gotchas.md` for the fuller writeup.
