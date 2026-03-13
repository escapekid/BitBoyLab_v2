# Architecture Overview

## Composition Model

BitBoy Lab processes images through a **three-zone layer stack**:

```
┌─────────────────────────────┐
│     ABOVE layers            │  ← composited over everything (full image)
├─────────────────────────────┤
│     Source image            │  ← at configured bg_alpha opacity
├─────────────────────────────┤
│     BETWEEN layers          │  ← same composite level as source
├─────────────────────────────┤
│     BELOW layers            │  ← behind source on black canvas
└─────────────────────────────┘
```

Each layer has a **mask** — a boolean array derived from the source image's
luminance. Only masked pixels are affected by the effect.

## Data Flow

```
Image File
    │
    ▼
apply_mosaic()          ← utils/image.py (optional source pixelation)
    │
    ▼
Engine.render()         ← core/engine.py
    │
    ├─ get_mask()       ← core/mask.py      (luminance threshold → bool array)
    │
    ├─ apply_*()        ← core/effects/*    (one per layer type)
    │
    └─ apply_blending() ← core/blend.py     (Normal, Multiply, Screen, ...)
    │
    ▼
RGBA Output Image
```

## Module Responsibilities

| Module | Responsibility |
|---|---|
| `core/engine.py` | Orchestrates layer rendering, manages below/between/above dispatch |
| `core/mask.py` | Converts luminance range → boolean NumPy mask |
| `core/blend.py` | All 6 blend modes; returns RGBA image |
| `core/effects/` | One file per effect; pure functions, no state |
| `utils/color.py` | `hex_to_rgb()` — single source of truth for color parsing |
| `utils/image.py` | Mosaic, font loading (cached), image serialisation |
| `api/main.py` | FastAPI app, CORS middleware, route registration |
| `api/routes/process.py` | Multipart upload → Engine.render() → JPEG response |
| `api/routes/effects.py` | Introspective metadata for frontend dynamic UI |
| `api/models.py` | Pydantic v2 schemas for all 6 effect configs |
| `app.py` | Streamlit UI — reads from `core.*`, renders controls |
| `scripts/cli.py` | Argparse CLI for batch processing |

## Extension Guide

### Adding a new effect

1. Create `core/effects/my_effect.py` with:
   ```python
   def apply_my_effect(img, mask, **params) -> Image.Image:
       ...  # returns RGBA
   ```
2. Add to `core/effects/__init__.py`
3. Add dispatch branch in `Engine._render_layer()` in `core/engine.py`
4. Add `EffectSchema` entry in `api/routes/effects.py`
5. Add default config in `app.py` (EFF_DEFS) and `scripts/cli.py` (_PRESETS)

### GPU Acceleration

The engine is CuPy-compatible. In hot loops, replace:
```python
import numpy as np
arr = np.array(img)
```
with:
```python
import cupy as np          # drop-in replacement
arr = np.array(img.tobytes()).reshape(h, w, c)
```
The `hex_to_rgb` and mask functions will work unchanged.
