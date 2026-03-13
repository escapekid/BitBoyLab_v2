# Effects Parameter Reference

All effects share these **common parameters**:

| Parameter | Type | Values | Description |
|---|---|---|---|
| `type` | str | See below | Effect identifier |
| `enabled` | bool | true/false | Skip layer if false |
| `mode` | str | Below / Between / Above | Compositing zone |
| `range` | [int, int] | [0–255, 0–255] | Luminance threshold for mask |
| `blend` | str | Normal, Multiply, Screen, Overlay, Difference, Exclusion | Blend mode |

---

## ASCII Art — `"ASCII"`

| Param | Type | Default | Description |
|---|---|---|---|
| `size` | int | 16 | Cell size in pixels (4–100) |
| `sample` | str | "Point" | Downsampling: `"Point"` or `"Area"` |
| `mapping` | str | "Brightness" | Char assignment: `"Brightness"` or `"Random"` |
| `f_col` | str | "#ffffff" | Font color (hex) |
| `bg_mode` | str | "Fixed Color" | `"Fixed Color"` or `"Sample Image"` |
| `bg_col` | str | "#000000" | Background fill color (when Fixed Color) |
| `set` | str | "HRDWRE" | Charset: HRDWRE, HACKER, Standard, Blocky, Matrix |
| `ox` | int | 0 | Horizontal character nudge (px) |
| `oy` | int | 0 | Vertical character nudge (px) |

---

## Dither — `"DITHER"`

| Param | Type | Default | Description |
|---|---|---|---|
| `size` | int | 4 | Cell/block size in pixels (1–200) |
| `col` | str | "#00ff41" | Dither color for active pixels (hex) |
| `pattern` | str | "Classic 2x2" | Algorithm: Classic 2x2, Fine Grid, Floyd-Steinberg, Atkinson, Random |

**Algorithm notes:**
- **Classic 2x2 / Fine Grid** — Ordered Bayer matrix, fastest, no error diffusion
- **Floyd-Steinberg** — 4-neighbour error diffusion, classic halftone look
- **Atkinson** — 6-neighbour 1/8 error diffusion, crisp Mac-era style
- **Random** — Noise-threshold, fully vectorised, fast

---

## CRT Scanlines — `"CRT"`

| Param | Type | Default | Description |
|---|---|---|---|
| `intensity` | int | 80 | Horizontal row displacement strength (0–255) |
| `freq` | int | 30 | Scanline and displacement frequency (1–100) |
| `col` | str | "#00ff41" | Tint color applied via Multiply (hex) |

---

## JPEG Glitch — `"GLITCH"`

| Param | Type | Default | Description |
|---|---|---|---|
| `amount` | int | 100 | Number of byte corruption passes (1–250) |
| `quality` | int | 30 | JPEG encode quality — lower = more artifacts (1–100) |
| `seed` | int | 42 | Random seed for reproducible glitch patterns |
| `ignore_mosaic` | bool | false | Use original (pre-mosaic) source for this layer |

---

## Pixel Sort — `"PIXEL_SORT"`

| Param | Type | Default | Description |
|---|---|---|---|
| `direction` | str | "Horizontal" | `"Horizontal"` or `"Vertical"` |
| `sort_by` | str | "Brightness" | Sort key: `"Brightness"`, `"Hue"`, `"Saturation"` |
| `reverse` | bool | false | Sort descending |
| `min_len` | int | 1 | Minimum segment length to sort |
| `max_len` | int | 10000 | Maximum segment length to sort |
| `randomness` | float | 0 | 0–100: probability (%) to skip a segment |
| `sort_only` | bool | false | Make non-sorted pixels transparent |

---

## Edge Detect — `"EDGE"`

| Param | Type | Default | Description |
|---|---|---|---|
| `sensitivity` | int | 50 | Edge detection threshold 0–100 (higher = more edges) |
| `thickness` | int | 1 | Line thickness in pixels (1–10, via boolean dilation) |
| `color` | str | "#ffffff" | Edge line color (hex) |

**Algorithm:** Sobel operator via vectorised NumPy slicing.
Gradient magnitude is normalised to 0–255 then thresholded.
