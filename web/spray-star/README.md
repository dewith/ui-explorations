# Cendero spray-star study

JavaScript/Canvas only. No Swift files are changed by this study.

Run from the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs/spray-star
```

Open `http://127.0.0.1:8765/`. Add `?test` for browser rendering checks.
Use **Split comparison** to compare the Canvas output (left) against the exact
Figma export (right) at the same dimensions. Comparison only affects the large
stage; the lower strip always shows independent Canvas renderings.

## Approved preset

The screenshot-approved material is stored in `preset.js`, and **Reset** returns
to it exactly:

| Setting | Value |
| --- | ---: |
| Finish | Airbrush · layered paint |
| Blur amount | 2.60× |
| Overspray | 1.25× |
| Color-dodge grain | 1.10× |
| Core size | 1.00× |
| Core blur | 2.60× |
| Backdrop | Charcoal |

Seed `1424` preserves a deterministic spray pattern. The backdrop is preview
only; transparent PNG export never bakes it into the image.

## Renderer

`paint.js` exports `renderPaint(canvas, cssSize, options)` and `recipe(cssSize)`.
The silhouette comes from the exact exported Figma paths of node 275:352;
`assets/` keeps the two original exports for visual comparison. The procedural
finish does not depend on those images or any remote assets at runtime.

1. Draw the authored silhouette to an alpha mask.
2. Build a softly blurred pigment core plus a wider bleed mask at size-specific radii.
3. Displace the core gently with three-octave noise.
4. Gate the wide bleed with a fine noise stencil and merge it behind the core.
5. Stamp a smaller, independently blurred copy of the same silhouette into the
   pigment as the vermilion core; its color transition follows all five arms.
6. Apply fine bright grain using the color-dodge equation, `base / (1 - blend)`.

Optical recipes are authored for 24, 32, 48, 64, 96, 144, and 360 CSS pixels,
with interpolation between sizes. Render each output at its intended size:
do not downscale a single hero bitmap. At least 2× raster resolution keeps the
spray fine even on 1× screens. Canvas outputs have transparent backgrounds.

Controls are multipliers around the tuned recipes. Export produces a 360px
optical rendering at 3× resolution, not a different 1080px optical recipe.
The seed is deterministic. No live animation or background render loop is used.

**Blur amount** multiplies both size-aware paint layers while preserving their
relationship: the dense pigment core uses `0.72×` of the recipe blur and the
grainy halo uses `1.85×`. At `0×` both are sharp; `1×` is the recipe baseline.
**Core size** scales a second star-shaped red paint impression around the same
center. **Core blur** controls only that inner impression's color transition.

The default **Airbrush** finish borrows the two-layer construction of
`src/components/Headline.jsx` (`graffiti-spray`) from
`usworks/cendero-website`, branch `react-port`, verified commit
`56819fc3bfc13ec0d32a889691426e6c6c165c1b`: grainy Gaussian bleed behind a
displaced core. The constants are optically adapted, not copied at hero size.
The previous scattered finish remains available in the Finish selector.

## Later shader translation

Keep the mask/noise/color stages and point-to-pixel conversion separate. Port
the optical table, not just the large-size constants. The browser uses straight
RGBA image data; a Metal port must account for premultiplied alpha explicitly.
Check output on dark, light, and checkerboard backgrounds at each target size.
