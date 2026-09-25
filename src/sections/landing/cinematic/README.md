# The landing film (parked)

A two-chapter, scroll-scrubbed film for the space under the home hero:

1. **Chapter 1 — "One small thing can become a big thing."**
   (`../Chapter1TheUnusedThing.tsx`) An SVG apartment sketches itself in ink and
   fills with colour; the giver comes through the door, notices the bag, picks it
   up; the bag floats to camera ("YOU DON'T NEED IT." → "BUT SOMEONE MIGHT.") and
   launches out through the bottom edge on a glowing line.
2. **Chapter 2 — "It finds its person."** (`../Chapter2TheEcosystem.tsx`) The line
   enters at the same pixel, traces a phone listing, pulls back to a night map
   (10 km ring, needs, a route the bag rides) and opens into a window on the
   student who receives it.

`src/components/cinematic/CinematicOrchestrator.tsx` mounts both, back to back.

## Status: switched off

`FEATURES.cinematicLanding` in `src/lib/features.ts` is `false`. `HomeClient`
loads the orchestrator with `next/dynamic`, so while the flag is off none of this
code, SVG or imagery is downloaded.

- **Preview in development:** open `http://localhost:3000/?cinematic`.
- **Turn it on:** set `cinematicLanding: true`.

## Files

| File | What it holds |
| --- | --- |
| `RoomScene.tsx` | The apartment, drawn in SVG. Every piece is wrapped in `Obj`, which renders it twice: `paint`, and an `ink` copy the CSS turns into orange line art for the sketch-in effect. |
| `Student.tsx` | The student in Chapter 2's portal (two expressions, straps, petals). |
| `cutouts.ts` | Geometry for the three raster cutouts: silhouettes traced from each image's alpha channel, the bag's seams, and the hand clips that let her hold the right bag. **Re-trace if an image is replaced.** |
| `rig.ts` | Stage metrics (one viewBox shared by every layer), the camera, `seamX` — where Chapter 1's line meets Chapter 2's. |
| `palette.ts` | One palette for every drawing. |
| `cinematic.module.css` | Ink styles, grain, vignette, HUD. |

Images: `public/images/cinematic-{bag,character,character-bag}-removebg-preview.webp`.
They are preview-resolution (≈500 px) exports; full-resolution exports would be
sharper on retina screens.

## Performance rules it follows

Keep these if you change it — each one was a measured cost:

- **No SVG blur filters on anything that moves.** Glows are layered wide strokes.
  The one filter left (the bag's motion blur on launch) only runs on desktop with
  a mouse.
- **Screen-space effects are a separate SVG from the room.** The spotlight and
  aura follow the floating bag every frame; in the room's SVG that repainted the
  whole room every frame.
- **Loops only run in their window.** Fan, steam, motes and birds play only
  during the room phase; rays and pulses only while visible (`windows` in each
  chapter). A running loop repaints the SVG it lives in.
- **Hidden means `visibility: hidden`**, not just `opacity: 0` (`autoAlpha`), and
  layers that are fully covered (the room after it goes black, the map once the
  portal fills the screen) are switched off.
- **The ticker only applies** while something moves on its own (idle float,
  sparks); scrubbing already applies on every change.
- No `backdrop-filter`; no grain on phones or touch screens;
  `ScrollTrigger.config({ ignoreMobileResize: true })`.
