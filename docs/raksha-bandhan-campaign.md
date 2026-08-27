# Raksha Bandhan Campaign Control

A **temporary, reversible Raksha Bandhan presentation**. It does not change donation, listing, verification, matching, or navigation logic.

> **This is a merge of two independently built treatments.** Two people built a Raksha Bandhan campaign at the same time without knowing about each other, and both landed on 27 August 2026. Neither was discarded — the surfaces did not overlap much, and where they did the collision is recorded below. The one hard conflict was `src/lib/raksha-bandhan.ts`, which both created from scratch with different APIs; it is now a single module holding both.

Six surfaces:

| Surface | From | Runs |
|---|---|---|
| **Full-screen intro** — a nine-second rakhi film on arrival | staging | **28 Aug only** |
| **Announcement strip** — the festival's line, with both CTAs | staging | whole window |
| **Header dressing** — a rakhi pendant that turns as you scroll | staging | whole window |
| **Wordmark** — the supplied rakhi artwork replaces the logo | this branch | whole window |
| **Hero right column** — the need that has waited **longest** with nobody behind it | this branch | whole window |
| **"The Unclaimed"** — the next six, oldest first | this branch | whole window |

### What the merge had to decide

**The window: six days, not one.** The staging version was scoped to the festival day itself; this one ran 27 August to the end of Tuesday 1 September. **The week won**, because that is the run that was asked for. Every campaign surface now shares that window.

**The intro keeps its own gate**, and that exception is deliberate. `isRakshaBandhanIntroDay()` still restricts the full-screen film to 28 August. An intro that took over the screen every day for a week would stop being an arrival and become an obstacle.

**One environment variable, `NEXT_PUBLIC_RAKSHA_BANDHAN`** — staging's name, kept because more code referenced it and it may already be set in the deployment environment. The `_CAMPAIGN` suffix used on this branch is gone. `NEXT_PUBLIC_FORCE_RAKHI_INTRO` remains a separate dev-only switch for the intro.

**One test had to change.** `RakshaBandhanStrip.test.tsx` asserted the one-day boundary; it now asserts the six-day one. That was the *only* test to break across both implementations, which is a fair sign the surfaces were genuinely independent.

**The header now carries two rakhi motifs** — the pendant behind the header content, and the rakhi wordmark as the logo. They do not technically conflict: the pendant is a decorative background layer at `z-0`, the wordmark is the logo itself. **This is the one surface where the two designs stack, and it is the thing to look at first.** Dropping either is a one-line change.

## The logo, and the bug it was hiding

**The shipped wordmark asset was Independence Day artwork, and it was still live on 27 August.** `public/brand/causekind-wordmark-*.webp` is "Cause" in saffron and "Kind" in green with a flag-cloth ripple, introduced by *"animate Causekind wordmark like a flag in wind"* on 14 August. The colours are baked into the image, so nothing in CSS could neutralise them.

The reason it outlived its occasion is worth recording, because it is the general failure and not a one-off: **the asset swap was never wired to the campaign's own on/off switch.** `isIndependenceDayCampaignActive()` gated the strip and the hero, both of which correctly disappeared on 18 August — but the logo was swapped unconditionally in `Navbar.tsx`, so it kept flying a flag for ten days after the campaign it belonged to had ended. A seasonal change that is not gated on the season does not end.

The fix restores the year-round styled-text wordmark — "Cause" with its letter stagger, "Kind" with the `ck-logo-kind-shimmer` brand gradient — which puts the logo back under the stylesheet's control. `CauseKindWordmark.tsx` and its three assets are **kept**, with a docblock explaining what they are and instructing that they be re-wired *behind* `isIndependenceDayCampaignActive()` for 15 August 2027.

**During the window the wordmark is the supplied rakhi artwork** — `RakshaBandhanWordmark`, which spells CauseKind out of braided cords, beads, a mirrored rosette and hanging tassels. It replaces the styled text outright rather than decorating it. It is gated on `isRakshaBandhanCampaignActive()`, so it cannot outlive its own window the way the flag did.

### Rebuilding the wordmark asset from source

Worth recording exactly, because the delivered file could not be used as-is and the fix is not obvious.

**The source has no transparency and could not have any.** `i_dont_want_the_background_and.mp4` is H.264, and **H.264 has no alpha channel** — whatever background removal produced it, the file that came out has solid white baked in. So the alpha was not *preserved*, it was **created**, by keying the white out and re-encoding to VP9, which does carry alpha.

```
ffmpeg -y -an -i SOURCE.mp4 \
  -vf "format=rgba,colorkey=0xFFFFFF:0.22:0.11,crop=888:282:180:204,scale=442:140:flags=lanczos" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 42 -row-mt 1 \
  public/brand/causekind-rakhi.webm

ffmpeg -y -an -i SOURCE.mp4 \
  -vf "format=rgba,colorkey=0xFFFFFF:0.22:0.11,crop=888:282:180:204,scale=442:140:flags=lanczos,select='eq(n\,0)'" \
  -frames:v 1 -c:v libwebp -pix_fmt yuva420p -q:v 88 \
  public/brand/causekind-rakhi-static.webp
```

Every number in that command was chosen against something:

- **`0.22:0.11`** — picked by compositing candidates over a dark ground and looking, not by taste. Below it a grey halo survives around the braids; by `0.30` the key punches through the light dots *inside* the letters and starts hollowing the artwork out. The corners of the source measure `#FEFEFE`, so white is the right key colour.
- **`crop=888:282:180:204`** — the tight content box, and it was **retuned once**. `cropdetect` first gave 920×360, but a row-by-row read of the keyed alpha showed 18 empty rows at the top and 66 at the bottom — 23% of the height was nothing at all. Trimming it raised the letters from 35% to ~45% of the box, which is most of why the logo stopped looking small.
- **`scale=442:140`** — the navbar renders it 44 px tall, so this is ~3.2×: enough for a 3× display, and no more. Native size was 1.8 MB; this is **320 KB**.
- **`-auto-alt-ref 0`** — **required.** libvpx-vp9's alt-ref frames and alpha are mutually exclusive; leave it on and the alpha channel is silently dropped.
- **`format=rgba` first** — `colorkey` and `alphaextract` refuse to pick a format on their own and the graph fails to build without it.
- **`-an`** — the source carries an audio track. A logo must never make noise.

`ffmpeg` is not a project dependency; it was installed via `winget install Gyan.FFmpeg` for this one conversion.

### Why there is no MP4 fallback

Because there cannot be a useful one. H.264 has no alpha, so an MP4 fallback would render a white box over the navbar — worse than no fallback. **VP9 in WebM is the only widely supported web format that carries an alpha channel.** Anything that cannot play it falls through to the still image underneath, which is a correct logo rather than a broken one.

### Playback choices

**It loops.** The animation is a shine-and-sparkle cycle whose first and last frames are identical — checked frame by frame against the source — so the repeat has no visible seam or jump back to the start. The clip is 10 s, so the shine passes roughly six times a minute for as long as the page is open.

Reduced motion is unaffected by this: those viewers get the still and no playback at all, which is the case that matters most for a continuously animating element.

**Exactly one of the still and the video is ever shown, and that is a hard rule.** They are stacked in the same box. The first version showed *both* — the still had no `display: none` default, only the video was hidden under reduced motion — so a frozen copy of the wordmark sat underneath the moving one, and because the animation shifts the letters as it plays, the logo rendered on the live header as **two offset copies of itself**. The video needs no companion: its `poster` already covers both states the still was wrongly helping with, namely before playback begins and when the codec cannot be decoded at all, where the poster simply stays put.

Neither element carries a Tailwind `block` utility, deliberately — a display utility on the same element would be competing with these rules on equal specificity and the winner would come down to stylesheet order.

**Reduced motion is decided in CSS, not by a hook.** `@media (prefers-reduced-motion: reduce)` swaps which of the two is shown. A `useReducedMotion()` hook resolves after the first paint, which would flash the wrong one on every page load. `preload="none"` plus `display: none` is the strongest declarative hint available that a viewer who asked for less motion should not pay 320 KB for an animation they will never see — engines differ on whether a hidden autoplaying video still fetches, so it is a hint rather than a guarantee.

### Sizing: why it is taller than the wordmark it replaces

`HEIGHTS` here is `34 / 44 / 52`, against the text wordmark's `22 / 28 / 34`. That is not a preference — **only about 45% of this artwork's height is the word.** The rest is the rosette, the tassels and the swirl the animation throws out. Measured off the alpha, the letters occupy rows 90–216 of the 282-row crop.

Sized like the text wordmark, the letters therefore render at roughly *half* the size of the text they replaced — which is exactly how it first shipped, and exactly how it read. At `md` = 44 the letters land near 20 px, matching the `text-xl` wordmark beside them.

The consequence to know: the header grows with it, from about 68 px to about 84 px on desktop (`py-5` plus the logo). If that is too tall, lower `HEIGHTS` — the widths are computed from the asset ratio, so they follow on their own.

**A note on verifying the alpha.** `ffprobe` reports this file as `pix_fmt=yuv420p`, which looks alarming, but the stream also carries `TAG:alpha_mode=1`. VP9 stores alpha in a **separate side-channel** that browsers decode natively and ffmpeg's own decoder ignores by default. So `alphaextract` on the encoded webm returns fully opaque and proves nothing. Check `alpha_mode`, or measure the alpha off the *source* with the key applied live.

## The idea, and why it is not the Independence Day treatment

The 15 August campaign washes coloured light across the hero and runs a full-width tricolour strip. That is right for what it marks: a national occasion is **broadcast**, it addresses everyone at once, and it has no particular recipient.

Raksha Bandhan is the opposite shape. It is **one thread, tied by one person, to one person, as a promise of protection** — which is structurally the same thing as a match on this platform, one donor to one donee. A colour wash cannot say that. Naming one real person who asked for something and has not been answered can.

So the treatment is deliberately **not** a recoloured version of the August one:

| | Independence Day | Raksha Bandhan |
|---|---|---|
| Hero device | Colour wash across the photo | *(none — see below)* |
| Right column | Platform-wide handover count | **One real, named, waiting need** |
| Announcement | Full-width strip | Full-width strip (from staging) |
| Homepage | *(none)* | A section of real unclaimed needs |
| Palette | Full tricolour | A single gold on the page; the wordmark art carries its own |
| Wordmark | Baked-in flag colours, **ungated** | Illustrated rakhi art, **gated on the window** |

The hero stops *describing* a bond and points at a missing one.

### The thread that was drawn across the hero, and why it went

The first build drew a literal gold thread across the hero: two curved lengths from the headline to the card, tying a knot where they met, animated with `stroke-dashoffset`. On paper it was the strongest version of the idea — the bond made visible, connecting the reader to one real person.

**It did not survive being looked at.** At real hero proportions the line ran straight through the headline and across the photograph rather than reading as a connection between them, so it landed as a stray rule ruled through the copy. It was removed at the user's direction, and the judgement was right.

What is worth keeping from it: the argument never depended on the line. The card at its end was always the substance — a named person, a real request, a real wait — and it carries the idea unaided. The only thread motif left in the hero is the short dashed rule on the card itself, which reads as the tie that need has *not* been given yet.

Removed with it: `ProtectionThread`, the `ck-thread-draw` / `ck-thread-knot-in` keyframes, and their tests. `ck-thread-card` stays — it is the card's entrance, not the thread's.

## Activation

By default the campaign renders from **27 August 2026, 00:00 IST** through **2 September 2026, 00:00 IST** — up before Raksha Bandhan on the 28th, and staying up for the whole of Tuesday 1 September. The window is stored in UTC in `src/lib/raksha-bandhan.ts`: IST is UTC+5:30, so a window opening at midnight IST opens at 18:30 UTC the day before.

| Requirement | Configuration | Result |
| --- | --- | --- |
| Use the scheduled period | Leave `NEXT_PUBLIC_RAKSHA_BANDHAN` unset | Renders only during the date window. |
| Launch early or extend | `NEXT_PUBLIC_RAKSHA_BANDHAN=on` | Always renders after a rebuild and deploy. |
| Remove immediately | `NEXT_PUBLIC_RAKSHA_BANDHAN=off` | Hidden after a rebuild and deploy. |

`NEXT_PUBLIC_` values are compiled into the bundle, so **neither `on` nor `off` takes effect without a rebuild and deploy.**

## Where the data comes from, and why it is honest

Everything shown is real. Nothing is generated, padded, or illustrative.

**"Unclaimed" is a fact, not an inference.** Under the need-first architecture a request is matched privately first and only reaches `PUBLIC_REQUEST` status once that has failed. `GET /api/v1/item-requests/public` returns exactly that status and no other. So *"it is on the public board"* and *"nobody has taken it"* are the same statement, and no extra field, flag or endpoint was needed to establish it.

**The wait is computed from `createdAt`** in whole UTC days. Differencing local calendar dates was the alternative and is wrong here: the same request would read "12 days" in Mumbai and "11 days" in London. The number is a duration, not a date, so it must not move with where it is read.

**`page.tsx` calls `getPublicItemRequests()`, not `getItemRequests()`.** The authenticated board 401s on every server render — there is no session cookie in SSR, a known issue in the backend guide — so it returns `[]` for a logged-out visitor and the campaign would have silently rendered nothing for exactly the audience it is aimed at. The public projection carries everything these surfaces need: title, category, city, `createdAt`, and the donee's **first name only**.

## Failure modes are silence, never a placeholder

Every surface renders **nothing** rather than an empty state:

- No request to show → the hero card does not render, **and the thread is not drawn**. A thread tying the headline to an empty column would be decoration claiming to be a connection, which is the one thing this treatment exists not to be.
- Board empty, fetch failed, or the hero took the only row → the homepage section does not render at all.
- A row whose `createdAt` will not parse → dropped, not sorted to one end. Its wait cannot be stated, and stating waits is the list's entire purpose.

"Nothing is waiting" is a claim this page cannot make — an empty list can mean an empty board, a failed fetch, or a single row consumed by the hero. A heading over nothing invites the first reading, and the other two are just as likely.

## Files

| File | Responsibility |
| --- | --- |
| `src/lib/raksha-bandhan.ts` | Date window, override, `daysWaiting`, `waitingLabel`, `longestWaiting`. |
| `src/components/home/ThreadOfProtection.tsx` | `WaitingLongestCard` and `RAKSHA_BANDHAN_QUOTES`. |
| `src/components/home/UnclaimedSection.tsx` | The homepage section. |
| `src/components/brand/RakshaBandhanWordmark.tsx` | The rakhi wordmark: VP9-alpha video with a still fallback. |
| `public/brand/causekind-rakhi.webm` / `-static.webp` | 320 KB VP9+alpha video and its 36 KB still. |
| `src/components/Navbar.tsx` | Restores the styled-text wordmark; renders the tie during the window. |
| `src/app/page.tsx` | Fetches the public board server-side. |
| `src/app/HomeClient.tsx` | Picks the longest-waiting request; renders the section in **both** trees. |
| `src/components/home/HeroSection.tsx` | Fills the right column, swaps the quote set. |
| `src/styles.css` | `ck-thread-card` entrance and the `ck-rb-wordmark-*` layer swap. |
| `*.test.ts(x)` | 40 tests across the campaign units. |

### Three things that will not fail loudly if broken

**The section is rendered twice, once per tree.** `HomeClient` keeps separate `hidden lg:block` and `lg:hidden` trees, and a component placed in one is simply absent from the other. The audience-pathways section in that same file records having made exactly this mistake.

**The `-auto-alt-ref 0` flag on the webm encode is load-bearing.** libvpx-vp9 drops the alpha channel silently if alt-ref frames are enabled, producing a valid file with a black background and no error anywhere.

**The card's entrance is CSS, not Framer.** It has a delayed rise in `styles.css` (`ck-thread-card`). Wrapping it in a `motion.div` with its own opacity animation multiplies the two and the card sits nearly invisible while it is supposed to be arriving — the same mistake the Independence Day headline made and documented.

## Accessibility

The thread is `aria-hidden` and `pointer-events-none`: the card at its end carries the meaning in text, so nothing is lost by not announcing a line, and it cannot intercept a click meant for the content above it. The section uses a real `<ul>`/`<li>` list with an `aria-labelledby` heading, and every card is a single link — the whole card is the hit target, not a span inside it. Focus rings are visible on every interactive element.

Under `prefers-reduced-motion` **the thread stays drawn and the knot stays tied** — it is content, not flourish — it simply does not animate into place. The card's rise and the arrow nudge are disabled.

## Validation Completed

`tsc --noEmit` clean, production `next build` succeeds (43/43 static pages). Full suite **281 tests across 22 files**, all passing after the merge.
