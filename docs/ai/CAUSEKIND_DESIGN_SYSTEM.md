# CauseKind — Design system (as implemented)

Documented from source on 2026-09-26. Values are the ones actually in code;
where the code is inconsistent, every variant in use is listed. This is a
description of the current system, not a redesign.

Sources: `src/styles.css` (tokens, theme, hero, mobile primitives), section
files in `src/components/home/**`, `src/sections/landing/**`, CSS modules.

---

## 1. Colours

### 1.1 Global tokens (`src/styles.css` `:root`, `.dark`)
| Token | Light | Dark | Notes |
|---|---|---|---|
| `--brand-terra` / `--primary` / `--ring` / `--rust-action` | `#b04a15` | primary `oklch(0.62 0.18 50)`, rust `#e07b3a` | the global brand orange |
| `--brand-copper` | `#e07b3a` | — | secondary orange |
| `--brand-ink` | `#1e3a60` | — | navy (donee role accent) |
| `--background` | `oklch(0.98 0.012 60)` (warm off-white) | `oklch(0.10 0.03 50)` | body bg |
| `--foreground` | `oklch(0.12 0.04 50)` (near-black brown) | `oklch(0.96 0.005 50)` | body text |
| `--surface-cream` | `#faf8f5` | `#1c1917` | "the page paper" |
| `--surface-dim` | `#ede9e4` | `#292524` | |
| `--secondary` / `--muted` / `--accent` | `oklch(0.95 0.02 55)` / `oklch(0.96 0.01 55)` / `oklch(0.96 0.04 55)` | `oklch(0.22–0.24 …)` | shadcn tokens; `--accent` is a hover tint — **never re-theme it** |
| `--muted-foreground` | `oklch(0.50 0.03 50)` | `oklch(0.62 0.02 50)` | |
| `--border` / `--input` | `oklch(0.90 0.03 55)` | `oklch(1 0 0 / 10–15%)` | |
| `--destructive` | `oklch(0.58 0.22 27)` | `oklch(0.65 0.22 27)` | |
| `--color-brand-50…900` | `#f7ebe4 … #451b06` (500 = `#b04a15`) | — | Tailwind `bg-brand-500` etc. |
| `--radius` | `0.75rem` (sm −4px, md −2px, lg = r, xl +4px) | | shadcn radius |

### 1.2 Role theme (`data-ck-role-theme` on `<html>`, set pre-paint by `lib/roleTheme.ts`)
| Token | public / donor | donee | dark donor | dark donee |
|---|---|---|---|---|
| `--ck-role-accent` | `#b04a15` | `#1e3a60` | `#e07b3a` | `#7fb0e8` |
| `--ck-role-hover` | `#c45520` | `#2d5a96` | `#f0955a` | `#a3c8f2` |
| `--ck-role-deep` | `#7a3410` | `#12253f` | `#8a4715` | `#3f6c9e` |
| `--ck-role-secondary` / `-highlight` | `#e07b3a` / `#f0b97a` | `#4a7fc1` / `#7fb0e8` | | |
| `--ck-role-gradient` | `135deg #b04a15→#e07b3a` | `#1e3a60→#4a7fc1` | | |
Donee role also re-points `--primary`/`--ring` to navy. Not role-themed on purpose: success green, warning amber, destructive red, category colours, logo.

### 1.3 Landing-page palette (literal hex in section files — most frequent first)
| Colour | Uses | Role |
|---|---|---|
| `#B5480F` | 126 | **section accent orange** (eyebrows, rules, highlights, donor) — note: differs from global `#B04A15` (62 uses) |
| `#0F7A6C` | 49 | teal — donee / "needed nearby" / solution |
| `#C54805` | 38 | hero orange (`var(--ck-home-accent,#c54805)` in hero) |
| `#F4A25B` | 34 | peach highlight (dark-mode accent, CTA heading accent) |
| `#1F6B3F` | 34 | green — NGO |
| `#FAF8F5` / `#FAF7F2` / `#FBF9F4` / `#FDF5ED` / `#F8F6F2` / `#F7F2EA` / `#F4EEE4` | 21/7/7/10/…| cream section backgrounds (several near-identical creams in use) |
| `#FBEDE3`, `#E3F2EF`, `#E5F1E9` | 15/9/6 | soft tints of orange / teal / green (badges, icon tiles) |
| `#1C1410` | 11 | dark-brown ink; **Final CTA card background** |
| `#0E0C0A`, `#120C04`, `#140E0B`, `#15100C`, `#0F0A07` | — | dark-mode section backgrounds / film night |
| `#1E3A60` | 8 | navy (donee role, support bubble `#1e3a60/65`) |
| Stone/zinc Tailwind greys | many | body copy `text-stone-600`, borders `stone-200/80` |

`--ck-home-*` (`-accent`, `-ink`, `-hover`, `-deep`, `-highlight`, `-soft`, `-surface`, `-shadow-rgb`) are **only defined for the donee theme** (styles.css ≈3940); in other contexts the inline fallback in each `var(--ck-home-x, #fallback)` is what renders.

Brand gradient/aurora: Final CTA uses blurred blobs `#B5480F/25`, `#F4A25B/20`, `#0F7A6C/15` on `#1C1410`.

### 1.4 Semantic usage summary
- Primary action: orange (`#b04a15`/`#B5480F`) fill, white text.
- Secondary action: outline in orange / cream fill on dark.
- Dark sections: Final CTA card (`#1C1410`), film night (`#0f0a07`), stats ticker (money, off).
- Light sections: everything else, on cream.
- Hover: orange darkens (`#963c0d`, `#c45520`, `#C95413`) or lifts (translate/shadow).

## 2. Typography

### 2.1 Loaded fonts
| Family | Loaded in | CSS variable | Used for |
|---|---|---|---|
| Plus Jakarta Sans | `app/layout.tsx` (preloaded) | `--font-plus-jakarta-sans` | `.font-hero-display`, inline styles in film chapter 2, blog |
| Nunito 700–900 | layout (preload false) | `--font-nunito` | room scene sign text |
| Source Serif 4 | layout | `--font-source-serif-4` | blog reading |
| Inter, Lora, Roboto Mono | layout (preload false) | `--font-inter`, `--font-lora`, `--font-roboto-mono` | blog reading modes |
| Anton | `HeroSection.tsx` | `--font-hero-mobile` | mobile hero headline |
| Big Shoulders (opsz variable) | `sections/landing/cinematic/fonts.ts` | `--font-cine-display` | film title slams |
| Fraunces (SOFT, opsz, italic) | cinematic/fonts.ts, supportGallery/fonts.ts | `--font-cine-serif`, `--font-sg-serif` | film subtitles, gallery headline/captions |
| IBM Plex Mono 500 | cinematic + gallery fonts | `--font-cine-mono`, `--font-sg-mono` | HUD labels, index, counter |
| Caveat 500/600 | supportGallery/fonts.ts | `--font-sg-hand` | handwritten notes |
| Archivo (wdth axis) | whatIsCauseKind/fonts.ts | `--font-wk-grotesk` | planned giant words (section incomplete) |
| Noto Sans Devanagari | `@import url(...)` at top of styles.css | — | Indic text fallback |
| Material Symbols Outlined | layout `<link>` | — | blog only |

**Body text** has no explicit family (no `font-family` on html/body, `--font-sans` not overridden) → Tailwind's default system UI stack **(source only — confirm in browser)**.

### 2.2 Scale
Tailwind `--text-*` are redefined as fluid `clamp()` values (320 → 1280 px), e.g.
`text-xs` 11→13px, `text-sm` 13→15px, `text-base` 16→17px (floored at 16px for iOS),
`text-2xl` 20→26px, `text-4xl` 27→39px, `text-5xl` 32→52px, `text-9xl` 64→140px.
Sub-xs tokens: `text-5xs` 7.5→9px, `text-4xs` 8.5→10px, `text-3xs` 9.5→11px, `text-2xs` 10.5→12px.

### 2.3 Recurring patterns
| Element | Implementation |
|---|---|
| Eyebrow | `text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] text-[#B5480F]` + `h-0.5 w-6 rounded-full bg-[#B5480F]` rule (often letter-by-letter reveal) |
| Section H2 | `text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight` (ProblemSolution/Support), `text-2xl sm:text-3xl lg:text-4xl` (Trust/Founders/CTA), LiveNeeds `text-2xl lg:text-5xl font-black` |
| Accent word | same heading, `text-[#B5480F]` (dark `#F4A25B`), sometimes wavy underline |
| Body | `text-sm sm:text-base text-stone-600 leading-relaxed`; small copy `text-xs`/`text-3xs` |
| Editorial (new sections) | Fraunces 650 uppercase `letter-spacing -0.035em`, italic accent word in orange; mono labels `letter-spacing .18em`; Caveat notes |
| Hero | Anton/Impact condensed on mobile, `.ck-hero-headline` on desktop |
| Line heights | headings `leading-[1.05]`–`leading-snug`; body `leading-relaxed` |

## 3. Spacing & layout
| Pattern | Values in use |
|---|---|
| Section container | `max-w-6xl mx-auto px-5 sm:px-8` (most sections), `max-w-7xl px-4 sm:px-6 lg:px-8` (LiveNeeds, gallery `max-w-[1440px]`) |
| Section height (desktop) | many sections: `min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)]`, `py-6 sm:py-8 lg:py-6` (content centred in a screen) |
| Phone sections (<768) | `.ck-m-section`: `min-height:0`, `padding-top:1.5rem`, `padding-bottom: calc(var(--ck-dock-h) + var(--ck-bottom-inset))` |
| Mobile column | HomeClient mobile tree `px-5 gap-11 pt-11` (≥768) / `gap-0 pt-0` (<768) |
| Card padding | `p-3`–`p-5` (`p-4` most common); gaps `gap-3`/`gap-4`, `space-y-2` lists |
| Bottom chrome | `--ck-bottom-chrome = --ck-nav-float (0.75rem) + safe-area + --ck-dock-h (5rem)`; `.ck-main-bottom-pad` |
| Header height | published by Navbar as `--ck-nav-h` (≈3.5rem mobile, ≈88px desktop measured) |
| `PageSection.tsx` | documents a `py-16 sm:py-24 max-w-7xl` rhythm but is **not imported anywhere** |

## 4. Border radius
`rounded-full` (141 — pills, badges, dots, icon circles) · `rounded-2xl` (49 — cards) ·
`rounded-xl` (45 — buttons, icon tiles) · `rounded-lg` (11) · `rounded-3xl` (7 — CTA card, founder photo) ·
arbitrary `rounded-[1.25rem]`, `[0.9rem]`, `[0.8rem]`, `[2rem]`. Hero photo clip `1.25rem` (0 on mobile).
New editorial sections (gallery, planned WhatIsCauseKind) deliberately use square/print edges.

## 5. Shadows
- Cards: `shadow-xs` / `shadow-sm` + `border border-stone-200/80`.
- Raised: `shadow-md` (buttons), `shadow-xl`/`shadow-2xl` (certificate, CTA card).
- Coloured: `shadow-[0_6px_24px_rgba(181,72,15,0.22)]`, `shadow-[var(--ck-home-deep)]/20`.
- `.btn-3d`: `0 6px 0 rgba(28,16,8,.32), 0 8px 18px rgba(176,74,21,.14)`, pressed on hover.
- Gallery prints: `0 10px 22px -12px rgb(40 25 10/.45)` (front: `0 22px 40px -18px …/.55`), lifted shadow as a fading `::after` layer.
- Text: `.printed` letterpress text-shadow (planned typographic section).

## 6. Buttons
| Type | Implementation |
|---|---|
| shadcn `Button` (`components/ui/button.tsx`) | cva variants `default` (bg-primary), `destructive`, `outline`, `secondary`, `ghost`, `link`; sizes `default h-9`, `sm h-8`, `lg h-10`, `icon size-9`; `rounded-md`; disabled `opacity-50 pointer-events-none`; focus ring 3px `ring-ring/50` |
| Landing primary | `rounded-xl bg-[#B5480F]/[var(--ck-home-accent)] text-white font-extrabold uppercase tracking-wider text-xs px-5 py-2.5 shadow-md active:scale-95 hover:bg-[#963c0d]` (LiveNeeds footer, CTAs) |
| Hero CTAs | `.ck-hero-primary-cta`, `.ck-hero-secondary-cta` (hero-only styles, sheen + icon lift) — locked |
| Donate Now | `DonateNowButton` + `.ck-donate-*` (idle breathe/sheen/heartbeat, role-tinted) |
| Final CTA joins | colour per role: donor `#B5480F`, donee `#0F7A6C`, NGO `#1F6B3F`; `rounded-xl`, shimmer sweep on hover |
| Outline pill | LiveNeeds offer button: cream fill, orange text, fills orange on hover |
| Segmented control | `.ck-seg` pill track, sliding orange thumb (phone) |
| Text link | `text-3xs font-extrabold uppercase tracking-wider text-[#b04a15] hover:underline` + `→` |
Active state: `active:scale-95`/`[0.97]`; hover lift `hover:-translate-y-0.5`. Responsive: CTAs stack full-width on phones, inline on desktop.

## 7. Images
| Where | Treatment |
|---|---|
| Hero | `next/image fill priority object-cover`, `<picture>` swaps a portrait mobile image < 1024; clip radius 1.25rem desktop, full-bleed + dark gradient scrim on mobile; foreground cut-out breaks out of the frame on desktop |
| Gallery | real photos as physical prints: white print border (deep bottom lip), tape strip, black photo corners or bare; paper grain + warm multiply overlay; slight rotation; background prints blurred 0.6px; hover straightens/scales |
| Founders | 4:5 portrait, `rounded-2xl sm:rounded-3xl`, dashed orange outer ring, peach offset backplate |
| Live needs | text cards, no images (category icon pills) |
| Film | SVG illustration + three transparent WebP cut-outs (bag, character) |
| Crop | `object-cover` everywhere; aspect ratios from intrinsic size (`aspectRatio: w / h`) in the gallery |

## 8. Responsive design
Tailwind v4 default breakpoints: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536
(usage on landing: `lg:` 249, `sm:` 236, `md:` 57, `max-md:` 7, `xl:` 3).

| Band | Behaviour |
|---|---|
| ≥ 1280 | desktop + `DashedJourneyRoad` |
| ≥ 1024 (desktop) | `hidden lg:block` desktop tree; GSAP desktop timelines; Lenis if fine pointer |
| 768–1023 (tablet) | mobile tree (`lg:hidden`) using the older full layouts (`variant="mobile"` sections render their full component with tablet GSAP range) |
| < 768 (phone) | phone-specific components (`*Mobile`, `md:hidden` blocks), `.ck-m-section`, scroll-snap carousels, dock + support bubble |
Special mobile components: `MobileBottomNav` (dock, `lg:hidden`), `FloatingSupportButton` (48px `.ck-support-fab` below lg), `home/mobile/primitives.tsx`, Pile view in SupportGallery.

---

## 9. Visual language (Phase 2 — description of what exists)

**What makes CauseKind recognisable**
- **Warm paper, not white.** Every surface is a cream (`#FAF8F5`-family) with occasional paper grain; dark surfaces are warm browns, never cold greys.
- **One confident orange.** Burnt orange carries emphasis: eyebrow rules, highlighted words, primary buttons, the film's glowing line. Teal and green appear only as the donee/NGO role colours.
- **Editorial type rhythm.** Tiny uppercase letter-spaced eyebrow with a short rule → heavy headline with one accented phrase → calm grey body. Newer sections add serif italics (Fraunces), mono labels and handwritten Caveat notes.
- **Human, local photography.** Real drive photos (banner, volunteers, children, rations) — candid, outdoor, Indian neighbourhoods; hero is a warm handover photo.
- **Illustrated storytelling.** The film is a hand-illustrated apartment (ink sketch → paint), a glowing orange thread, a night map with a 10 km ring.
- **Organic marks.** Dashed paths, hand-drawn arrows/squiggles, wavy underlines, map pins, heart logo.
- **Rounded-soft older UI** (rounded-2xl cards, pills) coexisting with **square, tactile editorial** new sections (prints, tape).
- **Motion as meaning.** Things travel from giver to receiver (items flying across, the bag riding a route, a line connecting two pins).
- **Density.** Desktop sections are "one screen" compositions; phones are compact with horizontal swipes.
- **Section transitions.** Hairline borders (`border-stone-200/80`) or background shifts between creams; the dark film/CTA are the only deliberate breaks.
- **CTA style.** Solid orange, bold, often uppercase, with a small arrow; role-coloured joins at the end.

**What future designers should preserve**
- Cream + dark-brown + single-orange palette and the role colour mapping (orange donor, teal donee, green NGO).
- The eyebrow/rule → headline → accent-word pattern.
- Real photography and honest copy (no invented statistics — see `landingHonesty.test.tsx`).
- The giver → receiver "travel" metaphor and the orange connection line.
- The hero exactly as it is.
- Accessibility work: reduced-motion paths, focus rings, 16px floor on inputs, fluid type scale.

**What future designers should avoid** (patterns the code has explicitly removed or guards against)
- Cold whites/greys, neon, tech gradients, glassmorphism on moving elements (backdrop-filter was removed from the phone dock for performance).
- Multiple different creams per section (PageSection documents the goal of one paper).
- Invented impact numbers or zero-value counters (see LiveNeeds and landingHonesty comments).
- Full-screen 100svh sections on phones (`.ck-m-section` exists to undo them).
- Hover-only affordances on touch devices.
