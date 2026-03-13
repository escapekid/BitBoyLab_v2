# Changelog

All notable changes to BitBoy Lab are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-03-03

### Added
- **Core engine** (`core/engine.py`): three-zone render pipeline (Below / Between / Above)
- **Blend modes** (`core/blend.py`): Normal, Multiply, Screen, Overlay, Difference, Exclusion
- **Mask generation** (`core/mask.py`): luminance-threshold boolean masks
- **ASCII art** effect (`core/effects/ascii_art.py`): 5 charsets, brightness/random mapping
- **CRT scanlines** effect (`core/effects/crt.py`): vectorised displacement + color tinting
- **JPEG Glitch** effect (`core/effects/glitch.py`): data-corruption with seeded randomness
- **Dithering** effect (`core/effects/dither.py`): Floyd-Steinberg, Atkinson, Random, Classic 2×2, Fine Grid
- **Edge Detect** effect (`core/effects/edge_detect.py`): Sobel operator, optional dilation
- **Pixel Sort** effect (`core/effects/pixel_sort.py`): row/column sorting by brightness, hue, saturation
- **FastAPI** (`api/main.py`): `POST /api/process`, `GET /api/effects`, CORS for Next.js
- **Pydantic v2 models** (`api/models.py`): typed layer config schema
- **Streamlit UI** (`app.py`): full refactor, all logic imported from `core.*`
- **CLI** (`scripts/cli.py`): argparse interface with 6 named effect presets
- **Test script** (`scripts/test_engine.py`): sanity-checks all 6 effects
- `utils/color.py`: `hex_to_rgb()` — single source of truth for color parsing
- `utils/image.py`: `apply_mosaic()`, `get_font_bytes()` (LRU-cached), `image_to_bytes()`

### Refactored
- Extracted 819-line monolithic `PixelDither2.py` into 17 focused modules
- All effect logic removed from UI layer — `app.py` now only handles rendering controls
- Type hints and docstrings added throughout
