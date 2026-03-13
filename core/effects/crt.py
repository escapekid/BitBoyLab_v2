"""
bitboylab_boy.core.effects.crt
~~~~~~~~~~~~~~~~~~~~~~~~~~~~
CRT scanline effect: horizontal displacement + color tinting + scanline dimming.

Effect pipeline
---------------
1. Compute sinusoidal row displacement based on ``frequency``.
2. Shift each row horizontally by the computed amount (np.roll).
3. Apply a scanline pattern — alternating rows are dimmed.
4. Tint the result with a configurable RGB color via Multiply blend.
5. Composite the CRT result onto the source using the boolean mask.
"""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageChops
import random as _random

from utils.color import hex_to_rgb


def apply_crt(
    img: Image.Image,
    mask: np.ndarray,
    intensity: int,
    frequency: int,
    color_hex: str,
    offset_y: int = 0,
) -> Image.Image:
    """Apply a CRT monitor scanline effect.
    
    Non-destructively darkens rows using a sinusoidal scanline pattern,
    blended with a tint color. Mirrors the frontend crt.ts logic.
    """
    rgb_tint = hex_to_rgb(color_hex)
    w, h = img.size

    img_rgba = img.convert("RGBA")
    img_array = np.array(img_rgba).astype(np.float32)
    result_array = np.copy(img_array)

    # freq 100 -> thin lines (period ~2)
    # freq 1   -> thick blocks (period ~60)
    period = 2.0 + ((101.0 - float(frequency)) / 10.0) ** 2
    freq_factor = (np.pi * 2.0) / period
    prominence = intensity / 255.0

    for y in range(h):
        sin_val = np.sin(float(y) * freq_factor)
        line_darkness = max(0.0, 1.0 - (sin_val + 1.0) * 0.5 * prominence)

        if line_darkness < 0.05:
            continue

        shift = int(np.sin(float(y) / 15.0 + float(offset_y) / 5.0) * (float(offset_y) / 4.0))

        row = img_array[y].copy()
        if shift != 0:
            row = np.roll(row, shift, axis=0)

        tint = np.array([rgb_tint[0], rgb_tint[1], rgb_tint[2], 255.0], dtype=np.float32)
        blended = row * 0.7 + tint * 0.3
        darkened = blended * (1.0 - line_darkness)
        darkened[:, 3] = row[:, 3]

        row_mask = mask[y]
        result_array[y, row_mask] = np.clip(darkened[row_mask], 0, 255)

    return Image.fromarray(result_array.astype(np.uint8), "RGBA")
