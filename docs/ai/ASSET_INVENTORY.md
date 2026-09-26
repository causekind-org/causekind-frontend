# CauseKind — Asset inventory

Generated 2026-09-26 by a read-only script (sharp metadata + literal-path search
over `src/`). `public/` holds 792 files (~75 MB); 779 excluding
`public/blog-translations/`. Only **105** have a literal path reference in
`src/`; some others are referenced by a *computed* path (noted below).
"Refs" = files that contain the path. Nothing was modified.

## 1. Landing-page assets (priority)

### Hero (LOCKED — do not replace or re-encode)
| Name | Path | Type | Dimensions | Size | Used by |
|---|---|---|---|---|---|
| Hero photo (desktop) | `/images/causekind-hero-handoff.webp` | webp | 1672×940 | 188 KB | `HeroSection.tsx` (`HERO_IMAGE`, priority) |
| Hero foreground cut-out | `/images/causekind-hero-foreground.png` | png | 1672×940 | 338 KB | `HeroSection.tsx` (desktop break-out layer) |
| Hero photo (mobile) | `/images/causekind-mobile-hero-v1.webp` | webp | 945×1665 | 90 KB | `HeroSection.tsx` `<source media="(max-width:1023px)">` |
| (source) mobile hero PNG | `/images/causekind-mobile-hero-v1.png` + `.prompt.txt` | png | 945×1665 | 1,715 KB | unreferenced source file |
| Older hero variants | `/images/causekind-hero-child.webp`, `causekind-hero-warm-v2.webp` | webp | 1672×941 | 93 / 106 KB | unreferenced |

### Cinematic film
| Name | Path | Dimensions | Size | Used by |
|---|---|---|---|---|
| Bag cut-out | `/images/cinematic-bag-removebg-preview.webp` | 500×500 | 23 KB | `sections/landing/cinematic/cutouts.ts` |
| Giver cut-out | `/images/cinematic-character-removebg-preview.webp` | 409×610 | 14 KB | cutouts.ts |
| Giver holding bag | `/images/cinematic-character-bag-removebg-preview.webp` | 409×610 | 17 KB | cutouts.ts |
| Source JPGs | `/images/cinematic-{bag,character,character-bag,listing,room}.jpg` and `/images/landing page/*.jpg` (duplicates) | 848–1376 px | 463–669 KB each | unreferenced (source art) |
Everything else in the film (room, student, map, phone) is inline SVG in `RoomScene.tsx`, `Student.tsx`, `Chapter2TheEcosystem.tsx`. **Silhouettes in `cutouts.ts` are traced from these exact images — re-trace if replaced.**

### "Where does my support go?" photographs (real CauseKind drives)
| # | Path | Dimensions | Size | Category in `photos.ts` |
|---|---|---|---|---|
| 1 | `/images/WhatsApp Image 2026-09-25 at 4.41.50 PM.webp` | 1600×1200 | 424 KB | Education (notebooks) |
| 2 | `/images/dajsldkasldkaskd.webp` | 720×1280 | 316 KB | Relief (rations handover) |
| 3 | `/images/WhatsApp Image 2026-09-25 at 4.54.05 PM.webp` | 960×1280 | 398 KB | Relief (family) |
| 4 | `/images/WhatsApp Image 2026-09-25 at 4.41.47 PM.webp` | 1600×1200 | 455 KB | Volunteers (bench) |
| 5 | `/images/WhatsApp Image 2026-09-25 at 4.41.46 PM.webp` | 1600×1200 | 422 KB | Community (group) |
| 6 | `/images/WhatsApp Image 2026-09-25 at 4.56.04 PM.webp` | 1080×810 | 293 KB | Local (team) |
| dup | `/images/sdnkasnd.webp` | 960×1280 | 398 KB | byte-identical to #3; mentioned in a comment in photos.ts, not rendered |
Served through `next/image` (optimised). Filenames contain spaces — keep them URL-safe when referenced.

### Other landing sections
| Asset | Path | Used by |
|---|---|---|
| Founder photo / signature | `FOUNDER.photo`, `FOUNDER.signature` in `lib/landingConstants.ts` — both `null` (placeholder SVG avatar drawn inline) | FoundersNoteSection |
| Category images v3 | `/images/categories/{medical-aid,education,livelihood,relief,household,furniture,clothing,electronics,sports}-v3.webp` (1600×900, 21–60 KB) | `lib/categoryVisuals.ts` `fallbackImage` (not rendered by landing sections; category strip uses icons) |
| Campaign fallbacks | `/images/hero-1,3,6,7.webp`, `/images/medical-1,2.webp` (1520–1600 px, 36–214 KB) | HomeClient `MOBILE_CATEGORY_IMAGES` (money campaigns — off) |
| Icons | lucide-react, react-icons (`FaTruckMedical` etc. in categoryVisuals), inline SVG | all sections |

## 2. Brand assets & logos
| Name | Path | Type | Dims | Size | Usage |
|---|---|---|---|---|---|
| Header logo | inline SVG in `src/components/LogoVideo.tsx` ("traced from logo-outline.png via potrace", viewBox 0 0 747 738) | SVG (code) | — | — | `CauseKindLogo` in Navbar |
| Logo SVG component | `src/components/LogoSVG.tsx` | SVG (code) | — | — | design-system export |
| Filled logo | `/logo-filled.webp` | webp | 652×630 | 20 KB | metadata icon, JSON-LD, about, blog (+5) |
| Outline logo | `/logo-outline.webp` | webp | 747×738 | 14 KB | unreferenced |
| Email logo | `/logo-email.png` | png | 320×309 | 59 KB | unreferenced in src (likely backend emails) |
| Favicon | `/favicon.svg` | svg | 32×32 vb | 1 KB | unreferenced in src (metadata uses logo-filled) |
| Logo animation | `/logo.mp4` | mp4 | — | 2,570 KB | unreferenced |
| Rakhi wordmark | `/brand/causekind-rakhi-static.webp` (442×140), `/brand/causekind-rakhi.webm` | webp/webm | — | 36 / 319 KB | `components/brand/RakshaBandhanWordmark.tsx` (campaign) |
| Sahas logo | `/images/money-donation/sahas-logo-transparent.png` (1254×1254, 520 KB), `sahas-logo.webp` (240×220) | png/webp | | | money donation page |

## 3. Videos
| Path | Size | Usage |
|---|---|---|
| `/rakhi-intro-1080p.mp4`, `/rakhi-intro-720p.mp4` | 4,345 / 1,640 KB | `lib/raksha-bandhan.ts` → `RakshaBandhanIntro` (28 Aug only) |
| `/videos/WhatsApp Video 2026-09-05 at *.mp4` (7 files) | 194–2,308 KB | `components/money-donation/ImpactCarousel.tsx` (donate page) |
| `/videos/posters/impact-1…7.webp` | 240×428, 7–22 KB | `MobileVisualStory.tsx` (not on the page) |
| `/logo.mp4` | 2,570 KB | unreferenced |
The landing page itself currently plays **no video** (the film is SVG + GSAP).

## 4. Fonts
No local font files. All fonts are `next/font/google` (self-hosted at build) or a Google Fonts `@import` (Noto Sans Devanagari) / `<link>` (Material Symbols). See CAUSEKIND_DESIGN_SYSTEM.md §2.1.

## 5. Other directories
| Directory | Files | Size | Status |
|---|---|---|---|
| `/scrolly/desktop/frame_001…598.webp` | 598 | ~15 MB | computed path in `components/home/ItemDonationScrolly.tsx` — component **not rendered** |
| `/images/IMG on Home/` | 13 | 3.0 MB | read by server action `app/actions/getHeroImages.ts` (exported via design-system entry; no page uses it) |
| `/images/stories/` | 10 | 1.7 MB | computed path in `requests/category/[slug]/CategoryPageClient.tsx` |
| `/images/icons/*.jpg` | 4 | 2.4 MB | unreferenced |
| `/images/landing page/` | 3 | 1.6 MB | unreferenced duplicates of cinematic JPGs |
| `/categories/*.webp` | 10 | 0.7 MB | `DonorCategoryModal.tsx` |
| `/certificates/*.webp` | 6 | 0.8 MB | money-donation `TrustCredibility.tsx` |
| `/images/money-donation/` | 7 | 1.5 MB | money donation page |
| Blog images (root `*.webp`, `/80G.avif`) | ~35 | ~7 MB | `src/data/blogData.ts` |
| Auth illustrations `/login-illustration.webp` (3375×4219, 456 KB), `/signup-illustration.webp` | 2 | | `app/(auth)/layout.tsx` |
| Dev/test leftovers `/images/test_*.png`, `mouse-peek.webp`, `garland-corner-*.png/.webp`, `toran-flower-unit.png`, `footer.webp`, `community_donation.webp`, `Item listing Don*.webp` | — | — | unreferenced by literal path |
| `/blog-translations/*.json` | 13 | ~9 MB | blog runtime translations |

## 6. Counts
- Landing-critical assets: **3 hero** + **3 film cut-outs** + **6 gallery photos** (+1 duplicate) = 12 (+1).
- Brand/logo assets: 7 (`logo-filled`, `logo-outline`, `logo-email`, `favicon.svg`, `logo.mp4`, rakhi static + webm) + 2 inline-SVG logo components.
- Total important (landing + brand + category v3 + campaign videos): ≈ 40.
- Unreferenced-by-literal-path files outside computed directories: ≈ 60+ (see §5) — candidates for cleanup **only after verifying** computed/external usage (emails, social previews).
