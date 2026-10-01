# CauseKind landing page — Responsive audit

Documented 2026-09-26 from source. Last runtime check (2026-09-25, before
`WhatIsCauseKind` was wired in): no horizontal overflow at 360 / 390 / 800 / 1280 px.
The page currently cannot render (missing component), so nothing below was
re-verified in a browser today.

## Breakpoint model
Tailwind defaults: `sm 640` · `md 768` · `lg 1024` · `xl 1280`.
- **Desktop ≥1024:** `hidden lg:block` tree in HomeClient; GSAP desktop timelines; Lenis (fine pointer).
- **Tablet 768–1023:** `lg:hidden` mobile tree, but sections render their older full layouts (`variant="mobile"` → tablet component, GSAP range `(min-width:768px) and (max-width:1023px)`); mobile dock + 48px support bubble.
- **Phone <768:** phone-specific components / `md:hidden` blocks, `.ck-m-section` (no 100svh min-height, dock clearance at the bottom), scroll-snap carousels, IO reveals.
- Hero switches layout at **1024** (not 768). Film switches by aspect ratio (portrait/landscape) and pointer type, not by breakpoint.
- Header height `--ck-nav-h` ≈ 56 px mobile / ≈ 88 px desktop; bottom chrome `--ck-bottom-chrome` (dock 5rem + float 0.75rem + safe-area), 0 at ≥1024.

## Per section
| Section | Layout changes | Typography | Animation changes | Images | Overflow / h-scroll risk | Touch concerns |
|---|---|---|---|---|---|---|
| Hero (locked) | ≥1024 two-column stage + pins + rails; <1024 full-bleed photo ground, bottom copy, trust band inside | Anton condensed on mobile; desktop `.ck-hero-headline` | CSS only | `<picture>` portrait image <1024 | low (single tree, overflow hidden) | header is transparent over it on mobile (Navbar IO) |
| Film | same at all widths; shorter pins in portrait | fluid clamp() display sizes; phone title `max-md:` size tweak | lite mode on touch/portrait (no ink, no blur, no grain); reduced motion = still frames stacked | SVG + cut-outs | stage `overflow:hidden`; pin spacers are full width | ≈13 screens of pinned scroll on phones; nav hides during it |
| Support gallery | ≥768 16:10 table (container units); <768 pile | Fraunces headline 8.6cqw (desktop) / clamp 2.7–3.6rem (phone) | desktop: arrival + cursor/scroll parallax + lift; phone: pile transitions | 6 photos via next/image | prints extend past the stage by design; section `overflow-x: clip` | pile: horizontal swipe (`touch-action: pan-y`, 40 px threshold); hover effects wrapped in `@media (hover:hover)` |
| What is CauseKind (incomplete) | CSS: desktop horizontal EXTRA ↔ NEED; phone vertical composition | container-unit type (13cqw desktop, 21–23cqw phone) | sticky 250svh / 240svh | none | stage `overflow:hidden` | long sticky scroll on phones; not verifiable yet |
| Problem / Solution | ≥1024 3-col grid; 768–1023 stacked; <768 segmented card | xl→3xl headings | GSAP ≥1024 only; phone IO + tabs | inline SVG | low | segmented tab touch-target height not measured (`py-2` + `text-xs`) |
| How it works | ≥768 grid (2 cols md, 4 cols lg); <768 snap carousel | — | desktop tilt + Framer; phone CSS stagger per tab | icons | carousel bleeds `-mx-1.25rem` intentionally | native swipe; tabs above |
| Live needs | md 2 / lg 3 col grid; <768 `.ck-snap-m` row | 2xl→5xl heading | Framer fade-up | none | filter pill row scrolls horizontally (`overflow-x-auto`) | pills and cards both swipe horizontally — nested horizontal scrollers |
| Trust & safety | ≥768 full layout (3 cards md+); <768 swipe cards + 4-up stats | — | GSAP ≥768; phone IO | none | 4-up stats with 10px labels at 360 px — tight | — |
| Founder's note | ≥1024 two columns; 768–1023 stacked full; <768 letterhead | — | GSAP ≥768; phone IO | placeholder avatar | low | — (null in production) |
| Final CTA | ≥640 buttons in a row (full component); <768 compact card, 3 buttons in one row | 2xl→4xl | GSAP ≥768 (blobs, reveal); phone static | none | blobs clipped by card | WhatsApp buttons are external links |
| Footer / dock | dock + bubble below 1024; home page puts dock clearance under the footer | — | dock parks near footer and during the film | — | — | support bubble is draggable (`touch-none`) and can cover content if dragged |

## Global responsive risks
1. **Two trees for sections 7–11** — a change made in only one tree (desktop `hidden lg:block` vs mobile `lg:hidden`) silently diverges tablet/phone from desktop.
2. **Tablet band (768–1023)** gets the older full layouts and the mobile dock; it receives the least testing.
3. **Nested horizontal scrollers** (LiveNeeds pills + card row) can compete for swipes on phones.
4. **Long pinned/sticky scrolls** (film, planned typographic section) dominate phone scroll length.
5. **`100svh` sections** above 768 px can be taller than content on short landscape tablets.
6. **Dark mode** is supported by the older sections (`dark:` classes) and module CSS (`:global(.dark)`), but the new sections were not visually verified in dark mode.
