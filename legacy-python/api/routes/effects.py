"""
bitboylab_boy.api.routes.effects
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
GET /api/effects — lists all available effect types and their parameters.
Intended for the Next.js frontend to dynamically render effect controls.
"""
from __future__ import annotations

from fastapi import APIRouter

from api.models import EffectSchema
from core.blend import BLEND_MODES
from core.effects.dither import ALL_DITHER_PATTERNS
from core.effects.ascii_art import CHAR_SETS
from core.effects.tileset_dither import SYMBOL_SETS

router = APIRouter()


@router.get("/effects", response_model=list[EffectSchema])
def list_effects() -> list[EffectSchema]:
    """Return all available effects with their parameter descriptions.

    Returns:
        List of :class:`~bitboylab_boy.api.models.EffectSchema` objects.
    """
    return [
        EffectSchema(
            type="ASCII",
            label="ASCII Art",
            description="Render the image as ASCII characters mapped to luminance.",
            params={
                "size": "int 4–300 — cell size in px",
                "sample": "Point | Area — downsampling method",
                "mapping": "Brightness | Random — character selection",
                "f_col": "str — font color (hex)",
                "bg_mode": "str — background mode: Fixed Color, Sample Image",
                "bg_col": "color — background hex if Fixed Color",
                "set": f"str — charset: {', '.join(CHAR_SETS.keys())}",
                "ox": "int — horizontal character offset",
                "oy": "int — vertical character offset",
                "soft_mask": "bool — smooth edges with pixel mask",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="DITHER",
            label="Dither",
            description="Apply pixel dithering using classic or error-diffusion patterns.",
            params={
                "size": "int 1–200 — dither cell size",
                "col": "str — dither color (hex)",
                "pattern": f"str — pattern: {', '.join(ALL_DITHER_PATTERNS)}",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="CRT",
            label="CRT Scanlines",
            description="Simulate a CRT monitor with scanlines and color tinting.",
            params={
                "col": "str — tint color (hex)",
                "intensity": "int 0–255 — horizontal displacement",
                "freq": "int 1–100 — scanline frequency",
                "oy": "int — vertical scanline offset",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="GLITCH",
            label="JPEG Glitch",
            description="Corrupt JPEG data to create digital glitch artifacts.",
            params={
                "amount": "int 1–250 — corruption passes",
                "quality": "int 1–100 — JPEG encode quality (lower = more artifacts)",
                "seed": "int — random seed for reproducible patterns",
                "ignore_mosaic": "bool — use original source instead of pixelated",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="PIXEL_SORT",
            label="Pixel Sort",
            description="Sort pixels within masked segments by luminance, hue, or saturation.",
            params={
                "direction": "Horizontal | Vertical",
                "sort_by": "Brightness | Hue | Saturation",
                "reverse": "bool — sort descending",
                "min_len": "int 0-2000 — minimum segment length",
                "max_len": "int 0-10000 — maximum segment length",
                "randomness": "float 0.0–1.0 — sort randomness",
                "sort_only": "bool — if true, only pixels in mask are sorted",
                "ignore_mosaic": "bool — use original source instead of pixelated mosaic image",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="EDGE",
            label="Edge Detect",
            description="Detect edges with Sobel operators and render as line art.",
            params={
                "sensitivity": "int 0–100 — edge sensitivity",
                "thickness": "int 1–10 — edge thickness",
                "color": "str — line color hex",
                "ignore_mosaic": "bool — use original source instead of pixelated mosaic image",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="BLOCK_GLITCH",
            label="Block Glitch",
            description="Randomly shifts blocks of the image based on intensity and mask.",
            params={
                "size": "int 1–256 — square block dimensions",
                "amount": "float 0–1 — glitch probability per block",
                "seed": "int — random variation seed",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="NOISE",
            label="Noise / VHS",
            description="Add digital grain or VHS-style analog interference lines.",
            params={
                "amount": "float 0–1 — noise intensity",
                "noise_type": "Uniform | Gaussian | VHS — flavor of noise",
                "seed": "int — random seed",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="TEXTURE",
            label="Source Texture",
            description="Overlay a custom uploaded texture with advanced alignment and styling.",
            params={
                "invert": "bool — invert texture colors",
                "scale": "float 0.1–5.0 — zoom in/out",
                "rotation": "int 0–360 — rotate texture degrees",
                "ox": "int -100–100 — horizontal shift",
                "oy": "int -100–100 — vertical shift",
                "repeat": "bool — tile texture pattern",
                "luma_alpha": "bool — use brightness as transparency (good for B&W textures)",
                "opacity": "float 0.0-1.0 — layer opacity",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="HALFTONE",
            label="Halftone",
            description="Classic print-style dot screen based on luminance.",
            params={
                "size": "int 2–100 — dot spacing",
                "method": "Classic | Floyd-Steinberg | Blue Noise — raster method",
                "col": "str — dot color (hex)",
                "dot_scale": "float 0.1–1.5 — dot size multiplier",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="POSTERIZE",
            label="Posterize",
            description="Reduce color depth for a retro, quantized style.",
            params={
                "levels": "int 1–8 — bit depth (1=extreme 1-bit, 8=original 8-bit)",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="GRADIENT_MAP",
            label="Gradient Map",
            description="Map image luminance to a 2-4 stop color gradient.",
            params={
                "num_colors": "2 | 4 — stop count",
                "col0": "color — stop 0 color",
                "pos0": "int 0–255 — stop 0 position",
                "col1": "color — stop 1 color",
                "pos1": "int 0–255 — stop 1 position",
                "col2": "color — stop 2 color",
                "pos2": "int 0–255 — stop 2 position",
                "col3": "color — stop 3 color",
                "pos3": "int 0–255 — stop 3 position",
                "syncHarmony": "bool — follow global harmony",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="LEVELS",
            label="Levels",
            description="Adjust blacks, midtones (gamma), and highlights.",
            params={
                "black_lift": "int 0–255 — lift black level",
                "mid_point": "float 0.1–5.0 — gamma midpoint",
                "white_point": "int 0–255 — highlight clip level",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="THRESHOLD",
            label="Threshold",
            description="Hard black/white cut at a specific luminance.",
            params={
                "threshold_val": "int 0–255 — luminance threshold",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="TILESET_DITHER",
            label="Tileset Dither",
            description="Premium hardware-style tileset mapping with symbol sets and brand palettes.",
            params={
                "size": "int 4–500 — tile size in px",
                "brightness": "float 0.5–3.0 — brightness factor",
                "contrast": "float 0.5–3.0 — contrast factor",
                "mode": "Source Colors | Harmony — coloring mode",
                "full_bg": "bool — background on/off",
                "symbol_set": f"str — symbols: {', '.join(SYMBOL_SETS.keys())}",
                "col0": "hex — brand color 1",
                "col1": "hex — brand color 2",
                "col2": "hex — brand color 3",
                "col3": "hex — brand color 4",
                "range": "int 0–255 — mask threshold range",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
        EffectSchema(
            type="SOURCE",
            label="Source Image",
            description="Inject the original source image into the layer stack.",
            params={
                "mosaic": "int 1–200 — layer-specific pixelation",
                "opacity": "float 0–1 — layer transparency",
                "blend": f"str — blend mode: {', '.join(BLEND_MODES)}",
            },
        ),
    ]
