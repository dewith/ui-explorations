# Cendero inverted-vignette study

HTML/CSS/SVG only. A single self-contained `index.html`; no build step, no
runtime dependencies beyond two Google Fonts.

Run from the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory web/inverted-vignette
```

Open `http://127.0.0.1:8765/`.

The screen models the Cendero chat surface in its two states: **model's turn**
(electric blue) and **resting** (black). Use the toggle under the phone, or
**Cycle** to watch the transition loop. The **stage backdrop** switch
(dark / mid / light) exists because a true black cannot be judged against a
near-black page.

## What an inverted vignette is

A normal vignette darkens the edges. This one darkens the *centre* and lights
the perimeter, and it is built from stacked `inset` box-shadows rather than a
radial gradient. Inset shadows are drawn from the element's own outline, so the
bands stay parallel to the corner radius all the way around the arcs — a radial
gradient is an ellipse and cuts through the corners at an angle. Drag **Corner
radius** to see the ramp re-wrap the new outline.

Shadow colours are interpolated Edge → Mid → Core in **OKLab**. In sRGB the
midpoint of a blue-to-lavender ramp sags through a dead grey-violet; OKLab holds
the chroma across the whole traverse.

## Layer order

Bottom to top, inside a `overflow: hidden` screen that clips to the device radius:

1. **`.base`** — a flat plate of the Edge colour.
2. **`.knock`** — the two gradient layers, grouped so one mask cuts both:
   - **`.field`** — the inset-shadow ramp, warped by `feDisplacementMap`. It
     bleeds past the clip by ~1.4× the displacement amount so the warp never
     pulls in empty pixels at the edge; the parent crops it back.
   - **`.veil`** — a linear gradient from the veil colour to *zero alpha of its
     own colour*, never the `transparent` keyword. `transparent` is transparent
     **black**, and fading to it drags a saturated blue through a dirty navy.
3. **`.starwrap`** — the painted star (hidden in knockout mode; see below).
4. **`.grain`** — a full-screen `feTurbulence` layer.

## The star, two ways

**Painted** draws the star over the stack with its own gradient. **Knockout**
— the shipped default — instead cuts the star out of `.knock` with an SVG
`<mask>`, so the Edge colour shows through from underneath. The colour then
cannot drift from the vignette, because it is the same paint. *Fill opacity*
becomes how deep the cut goes.

The mask reuses the star's own filter chain, so the hole keeps the eroded,
grainy edge of the painted version.

`mask-image: url(#svgMask)` on an HTML element is solid in Chrome and Firefox
and has historically been unreliable in Safari. The SwiftUI equivalent —
`.mask()`, or `.blendMode(.destinationOut)` inside a `.compositingGroup()` — has
no such caveat, so knockout is the *more* robust construction on the real target.

## Noise: three tones, one function

All three are the same `feTurbulence`; only the tail of the chain differs.

| Tone | Chain |
| --- | --- |
| Mono | luminance → alpha, then `feFlood` one colour through it |
| Duo | desaturate, then a two-entry `tableValues` per channel |
| Multi | raw RGB turbulence, alpha flattened |

The two screens need different answers here. `color-dodge` computes
`B / (1 - S)`, so against a black backdrop it returns black regardless of the
grain — on the resting screen it contributes literally nothing. Resting uses
mono on `overlay` instead.

Separately, **texture** and **noise** are the same function at different
frequencies: low-frequency `soft-light` mottling gives the bloom internal
structure, high-frequency `overlay` grain dithers the ramp and kills banding.

## The state transition

Two complete stacks, one per screen. Layer A sits underneath at full opacity and
layer B fades in over it, so the crossfade never dips through a midpoint darker
than either end — which is what fading a single stack out over black would do.

An earlier version drained the blues with `saturate(0) contrast(1.3)`. That works
(the blue's luminance is ~0.09, so a little contrast pushes it to hard black
while the lavender edge lifts to grey) but it only ever yields the greys the
source colours happen to produce. Two palettes give you the greys you choose.

## Shipped defaults

Shared geometry:

| Setting | Value |
| --- | ---: |
| Reach | 300px |
| Bands | 7 |
| Falloff | 0.80 |
| Veil clear-by | 70% |
| Displacement amount · frequency | 20 · 0.4000 |
| Displacement octaves · seed · type | 3 · 7 · fractal |
| Grain size | 1.0px |
| Star size · X · Y · rotation | 84% · 27% · 22% · −4° |
| Star texture warp · grain | 220 · 0.33 |
| Corner radius | 61px |
| Duration · easing | 900ms · overshoot |
| Star lag · collapse | 0ms · 0.83 |

Per-screen:

| Setting | Model's turn | Resting |
| --- | ---: | ---: |
| Edge | `#C9BEFF` | `#484851` |
| Mid | `#9E73F8` | `#232329` |
| Core | `#1500FF` | `#000000` |
| Rim intensity | 0.58 | 0.58 |
| Veil colour · strength | `#1500FF` · 1.00 | `#000000` · 1.00 |
| Star mode · fill opacity | knockout · 0.20 | knockout · 0.20 |
| Noise tone | multi | mono |
| Noise density · contrast | 0.66 · 4.00 | 0.66 · 2.60 |
| Noise opacity · blend | 0.15 · color-dodge | 0.07 · overlay |

## Known limitation

With **Star collapse** below 1.00, the knockout star's grain resamples during
the transition — the texture visibly swims. Chrome generates `feTurbulence` at
the current rasterisation scale rather than once in user space, so animating a
scale on filtered content regenerates the noise field every frame.

`will-change: transform` fixes this for the *painted* star by freezing one
raster and letting the compositor scale the bitmap. SVG mask content is not
composited that way, so the same hint is applied to the mask group but is
probably a no-op there.

Two deterministic workarounds:

- **Star collapse `1.00`** — no scale change, so the filter output is identical
  throughout. Removes the artifact entirely, at the cost of the collapse motion.
- **Star grain `0`** — keeps the motion, drops the second, most scale-sensitive
  `feTurbulence` pass (`baseFrequency 1.4286`). The star's speckle then comes
  from the screen-wide grain layer, which never scales.

## Two traps worth remembering

**A custom property that encodes state must be owned by the stylesheet.** An
inline `--lit` written on every render outranks `[data-state="rest"]`, and the
transition silently never fires.

**Anything you animate must be an element you update, never one you rebuild.**
Regenerating the mask's `innerHTML` each render handed the transition a
brand-new node with no start value, so the star snapped instead of easing. It
reads as an easing bug and is a DOM one.

## Notes for the SwiftUI port

- The inset ramp is `.fill(base.shadow(.inner(color:radius:)))`, chainable per
  band. Use `.continuous` corners on fill and stroke alike or they drift apart
  at the arcs.
- Generate the grain tiles once with `CIRandomGenerator` (or ship PNGs) and tile
  them; do not regenerate per frame.
- Animate opacity, not gradient colour stops — interpolating stops
  re-rasterises a full-screen gradient every frame.
- iOS 17's `.colorEffect` / `.distortionEffect` are the direct equivalents of
  `feTurbulence` and `feDisplacementMap`, and collapse the whole background into
  one shader with a single `progress` uniform.
