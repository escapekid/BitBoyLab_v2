"""
bitboylab_boy.core.blend
~~~~~~~~~~~~~~~~~~~~~~
Pixel-level blending modes between a base RGBA image and an overlay RGBA image.

Supported modes
---------------
Normal      : Standard alpha-composite (Porter-Duff over).
Multiply    : Darkens by multiplying RGB channels.
Screen      : Lightens by inverting → multiply → invert.
Overlay     : Contrast-enhancing combination of Multiply and Screen.
Difference  : Absolute difference yields neon/invert look.
Exclusion   : Softer version of Difference.
Soft Light  : Subtle, natural-looking contrast overlay.
Subtractive : Subtracts overlay from base (retro/analog feel).
"""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageChops


def apply_blending(
    base: Image.Image,
    overlay: Image.Image,
    mode: str,
) -> Image.Image:
    """Composite *overlay* onto *base* using the specified blend mode.

    Both images must be RGBA. The overlay's alpha channel is used as
    the composition mask so that transparent pixels are never written.

    Args:
        base:    Background RGBA image.
        overlay: Foreground RGBA image (same size as *base*).
        mode:    Blend mode name (see module docstring for options).

    Returns:
        Blended RGBA image at the same dimensions as *base*.
    """
    if mode == "Normal":
        return Image.alpha_composite(base, overlay)

    base_rgb = base.convert("RGB")
    overlay_rgb = overlay.convert("RGB")
    # Extract overlay alpha as the composition mask
    mask = overlay.getchannel("A")

    if mode == "Multiply":
        blended = ImageChops.multiply(base_rgb, overlay_rgb)

    elif mode == "Screen":
        blended = ImageChops.screen(base_rgb, overlay_rgb)

    elif mode == "Overlay":
        blended = ImageChops.overlay(base_rgb, overlay_rgb)

    elif mode == "Difference":
        blended = ImageChops.difference(base_rgb, overlay_rgb)

    elif mode == "Exclusion":
        # Performance: vectorized NumPy formula — b + o – 2·b·o
        b = np.array(base_rgb, dtype=np.float32) / 255.0
        o = np.array(overlay_rgb, dtype=np.float32) / 255.0
        result = b + o - 2.0 * b * o
        blended = Image.fromarray((np.clip(result, 0, 1) * 255).astype(np.uint8))

    elif mode == "Soft Light":
        blended = ImageChops.soft_light(base_rgb, overlay_rgb)

    elif mode == "Subtractive":
        # Retro analog vibe: base - overlay
        b = np.array(base_rgb, dtype=np.int16)
        o = np.array(overlay_rgb, dtype=np.int16)
        result = np.clip(b - o, 0, 255).astype(np.uint8)
        blended = Image.fromarray(result)

    elif mode == "Hard Mix":
        b = np.array(base_rgb, dtype=np.float32) / 255.0
        o = np.array(overlay_rgb, dtype=np.float32) / 255.0
        # Photoshop Hard Mix primitive: 1 if sum >= 1 else 0
        result = np.where(b + o >= 1.0, 1.0, 0.0)
        blended = Image.fromarray((result * 255).astype(np.uint8))

    elif mode == "Hue":
        base_hsv = base_rgb.convert("HSV")
        overlay_hsv = overlay_rgb.convert("HSV")
        bh, bs, bv = base_hsv.split()
        oh, os, ov = overlay_hsv.split()
        # Hue from overlay, Sat/Val from base
        result_hsv = Image.merge("HSV", (oh, bs, bv))
        blended = result_hsv.convert("RGB")

    else:
        # Unknown mode — fall back to Normal
        return Image.alpha_composite(base, overlay)

    # Re-composite the blended RGB against the base using the overlay mask,
    # then restore the base alpha channel to preserve transparency.
    result_rgb = Image.composite(blended, base_rgb, mask)
    result_rgba = result_rgb.convert("RGBA")
    result_rgba.putalpha(base.getchannel("A"))
    return result_rgba


BLEND_MODES: list[str] = [
    "Normal",
    "Overlay",
    "Screen",
    "Multiply",
    "Difference",
    "Exclusion",
    "Soft Light",
    "Hard Mix",
    "Hue",
    "Subtractive",
]
