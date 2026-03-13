"""
bitboylab_boy.core.effects.glitch
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
JPEG data-corruption glitch effect.

The effect works by:
1. Saving the source image as a JPEG byte buffer at a low quality.
2. Randomly overwriting bytes *after* the JPEG header with arbitrary values.
3. Re-parsing the corrupted buffer — PIL tolerates most JPEG errors and
   produces visually glitched RGB output.
4. Masking the result so the glitch only appears where ``mask`` is True.
"""
from __future__ import annotations

import io
import random

import numpy as np
from PIL import Image


def apply_glitch(
    img: Image.Image,
    mask: np.ndarray,
    amount: int,
    quality: int,
    seed: int,
) -> Image.Image:
    """Apply JPEG data-corruption glitch within *mask* and return RGBA.

    The returned image is fully transparent outside the mask so it
    composites cleanly on top of any base layer.

    Args:
        img:     Source image (any mode).
        mask:    Boolean NumPy array (H, W).
        amount:  Number of corruption passes (1–250).
                 Higher values = more extreme glitch artifacts.
        quality: JPEG encode quality (1–100).
                 Lower values = more compression artifacts.
        seed:    Random seed for reproducible glitch patterns.

    Returns:
        RGBA image — glitched inside mask, transparent outside.
    """
    random.seed(seed)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=int(quality))
    data = bytearray(buf.getvalue())

    # Locate end of JPEG header (SOS marker) to avoid corrupting metadata
    header_end = data.find(b"\xff\xda") + 2
    if header_end < 2:
        header_end = 100

    num_corruptions = int(amount / 5) + 1
    for _ in range(num_corruptions):
        pos = random.randint(header_end, max(header_end, len(data) - 10))
        data[pos] = random.randint(0, 255)

    try:
        glitched = Image.open(io.BytesIO(data)).convert("RGB")
        # JPEG corruption can alter image dimensions — normalize back
        if glitched.size != img.size:
            glitched = glitched.resize(img.size, Image.NEAREST)
        glitched_rgba = glitched.convert("RGBA")
        glitched_rgba.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))
        return glitched_rgba
    except Exception:
        # Fallback: return original image fully opaque if decode fails
        return img.convert("RGBA")
