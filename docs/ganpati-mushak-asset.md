# The Ganpati mushak asset

How `public/images/ganpati/mushak-peek.webm` was made, and why it is not simply the delivered master re-encoded.

The component that uses it is `src/components/home/PeekingMushakGanpati.tsx`, mounted above the donee card in `MobileDoorsGanpati`. Its sibling one card up is `PeekingBappaGanpati`, which uses a different technique for a reason recorded below.

## Why this one needed alpha and Bappa's did not

Both clips are delivered the same way: subject cut flat across the bottom with hands or paws curling over the cut, and the key **flattened on to a solid black ground** with no alpha channel. (They arrived as H.264, which cannot carry alpha at all; they are VP9/WebM masters now, which can, but the delivered files still carry the matte rather than transparency.) So in both cases the transparency has to be either recreated or worked around.

Bappa works around it. `mix-blend-mode: screen` is the exact composite for a black-flattened key — `screen(base, black) = base`, so the matte is the identity and disappears — and it costs nothing at runtime. The catch is that screen blows a light subject out over a light ground, so it only works over something dark. That is what the arched niche in `PeekingBappaGanpati` is for, and it reads as intentional because the donor card under it is a near-black sanctum.

The donee card is warm parchment (`#fffaf3`). Screening the mushak straight on to it would leave a ghost, and giving him the same dark niche would put a black box on cream — which is exactly what "no background" ruled out. So his transparency was **recreated** rather than worked around, the same call `docs/raksha-bandhan-campaign.md` records for the rakhi wordmark: **VP9 in WebM is the only widely supported web video format that carries an alpha channel.**

Consequence, same as the rakhi asset: **there is no MP4 fallback and there cannot be a useful one.** Anything that cannot play VP9-with-alpha falls through to the still underneath, which is a correct picture rather than a broken one.

## Why the key is not `colorkey`

This is the part worth recording, because the obvious command does not work.

`ffmpeg -vf colorkey=0x000000:...` keys on colour distance, and **the mushak's pupils measure a true `0,0,0`** — the same value as the matte. Sampled over the eye region of the delivered clip:

| region | min max-channel |
| --- | --- |
| matte (all four corners) | 0 |
| left pupil | **0** |
| right pupil | 5 |
| darkest fur / outline | 0 |

So any tolerance that removes the background also punches two holes through his eyes, and any tolerance that spares the eyes leaves the background. There is no usable threshold.

`scripts/key-black-matte-to-alpha.mjs` keys by **reachability** instead: flood-fill the matte inward from the frame border, and treat only what the fill reaches as background. Black that the fill cannot reach is enclosed by the subject, so the pupils stay fully opaque no matter how dark they are.

Three things ride along in the same pass, each fixing something visible:

- **Rim ramp + un-premultiply.** Edge pixels get `alpha = maxChannel / 45`, and their colour is divided back through that alpha. Flattening on to black *is* premultiplication, so without the divide every antialiased edge pixel composites dark and the subject wears a thin black outline.
- **Despill.** The original key left a green fringe on the silhouette (~1% of pixels). Green above the red/blue mean is pulled back to it.
- **Colour bleed under the transparency.** `yuva420p` subsamples chroma, so whatever sits under a *transparent* pixel still tints the *visible* pixel beside it — a black fill drags the edge dark. The subject's own colour is bled 3px outward and the rest of the region flooded with the card's parchment, which also makes the ignored-alpha case benign.

## The commands

`ffmpeg` is not a project dependency. It was fetched for this conversion only — `npm i ffmpeg-static` in a scratch directory, or `winget install Gyan.FFmpeg` as the rakhi conversion did.

```sh
# 1. Delivered master -> PNG sequence (240 frames, 820x720, 24fps, 10s).
# `-c:v libvpx-vp9` matters on any WebM source: ffmpeg's default VP9 decoder
# silently drops a WebM alpha layer. Harmless here (this master has none), but
# it is what cost a first attempt at the books still its transparency.
ffmpeg -y -an -c:v libvpx-vp9 -i public/images/ganpati/mushak.webm -vsync 0 frames/f%04d.png

# 2. Key the black matte to alpha, and crop to the subject's own envelope.
#    The crop is the union of the mouse's bounding box across all 240 frames
#    plus a 4px margin; cropping to it is what makes the frame's centre and his
#    the same point, so the component needs no horizontal nudge.
node scripts/key-black-matte-to-alpha.mjs frames keyed '{"left":18,"top":103,"width":774,"height":518}'

# 3. Encode to VP9 with alpha, and pull one frame as the still.
ffmpeg -y -an -framerate 24 -i keyed/f%04d.png \
  -vf "scale=448:-2:flags=lanczos" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 42 -row-mt 1 \
  -metadata:s:v:0 alpha_mode="1" \
  public/images/ganpati/mushak-peek.webm

ffmpeg -y -i keyed/f0001.png -vf "scale=448:-2:flags=lanczos" \
  -c:v libwebp -pix_fmt yuva420p -q:v 88 \
  public/images/ganpati/mushak-peek-still.webp
```

Every number chosen against something:

- **`-auto-alt-ref 0`** — **required.** libvpx-vp9's alt-ref frames and alpha are mutually exclusive; leave it on and the alpha channel is silently dropped.
- **`scale=448`** — he renders at ~46% of a phone card, so ~150 CSS px; 448 is a shade under 3×, which is where the rakhi asset landed too.
- **`-crf 42`** — 440 KB. At crf 34 it is 759 KB for no visible gain at 150 px wide. The jump from the pre-bleed 455 KB is the bleed region now carrying moving detail where it used to be flat black.
- **`-an`** — the delivered master carries an audio track. Decoration must never make noise, and a phone will not autoplay an unmuted clip at all.
- **`f0001.png`** is frame 0, so the poster is the frame playback starts on and there is no jump.

## Measurements the component depends on

Taken from the keyed master (774×518, before the scale to 448×300). Re-measure and update `PeekingMushakGanpati.tsx` if the clip is ever recut.

| fact | value |
| --- | --- |
| flat cut (the seam — the card's top edge goes here) | row 488 → `488 / 518` |
| paws hang to | row 512 → 4.6% of clip height lapping on to the card |
| subject's horizontal mid | 0.50 of frame width, by construction of the crop |

The source is kept in `public/images/ganpati/` as `mushak.webm` — same 820x720 black-matte clip, no alpha — and is not referenced by any component. It was `mushak.mp4` until every MP4 in that folder was replaced by a WebM of the same clip; `bappa-peek.mp4` went the same way, and `PeekingBappaGanpati` now points at `bappa-peek.webm`. That swap changed the container only: the Bappa clip is still a flattened black matte with no alpha, still 914x720, and its flat cut is still row 590, so every measurement in that component survived it unchanged.

## The books band: finishing the walk

`mushak-books.webm` is a second, separate clip — the mushak hauling a tied stack of books across the top of the mobile column, used by `src/components/home/MushakBooksBandGanpati.tsx`. It is **delivered with real alpha**, so none of the keying above applies to it. It needed one adjustment all the same.

**The delivered clip runs out from under him.** Measured over all 240 frames, his alpha bounding box travels like this:

| t | x range of 1280 | visible px |
| --- | --- | --- |
| 0.00s | 0..431 | 95832 |
| 5.00s | 201..707 | 105605 |
| 9.00s | 824..1279 | 70246 |
| 9.50s | 985..1279 | 33028 |
| 9.96s (last) | **1132..1279** | **2718** |

So the loop cut with his tail still on screen and snapped him back to the left. Nothing about that is width-dependent — the band carries the clip's own aspect — it was simply the last ~0.5s of the walk missing.

**The fix is 20 appended frames**, each the final frame carried further right:

```sh
# 1. Delivered clip -> PNG sequence, alpha intact.
ffmpeg -y -an -c:v libvpx-vp9 -i public/images/ganpati/mushak-books-source.webm \
  -vf "format=rgba" -vsync 0 frames/f%04d.png

# 2. Append 20 frames, sliding the last one out at 12px/frame.
node scripts/extend-walk-offscreen.mjs frames frames-ext 12 20

# 3. Re-encode.
ffmpeg -y -an -framerate 24 -i frames-ext/f%04d.png \
  -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 36 -row-mt 1 \
  -metadata:s:v:0 alpha_mode="1" \
  public/images/ganpati/mushak-books.webm
```

- **12px/frame** is not a guess: his own stride over the last three delivered frames measures ~11.5px/frame, so the appended motion continues at the speed he was already walking. His legs are frozen across those frames, which is invisible because only his tail is still in shot by then.
- **20 frames** puts him fully clear at t=10.5s and leaves ~0.3s of empty band before the loop restarts.
- **crf 36** — 648 KB, against 1425 KB delivered, with no visible difference at the ~110px-tall band this renders in.

**What still is not seamless:** the *entrance*. The delivered clip's first frame already has him a third of the way across (x=0..431), so the loop restart pops him into existence rather than walking him in. That cannot be fixed by re-encoding — the frames of him approaching from off-screen left do not exist in the source. Fixing it properly needs a clip that starts empty.

The delivered original is kept beside it as `mushak-books-source.webm`, unmodified.
