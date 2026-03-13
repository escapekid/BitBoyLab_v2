"""
bitboylab_boy.core.effects.posterize
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Color depth reduction for a retro, quantized look.
"""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageOps


def apply_posterize(
    img: Image.Image,
    mask: np.ndarray,
    levels: int = 4,
) -> Image.Image:
    """Reduce color depth across the image within the mask."""
    # Ensure levels is within valid PIL range [1, 8]
    # Though 1 is too extreme, 2 is usually the practical minimum.
    lv = max(1, min(8, int(levels)))
    
    # Posterization is best applied to RGB
    working_img = img.convert("RGB")
    posterized = ImageOps.posterize(working_img, lv)
    
    # Combine with original using mask
    p_arr = np.array(posterized)
    s_arr = np.array(working_img)
    
    # Broadcast mask to 3 channels
    m3 = np.stack([mask] * 3, axis=-1)
    
    out_arr = np.where(m3, p_arr, s_arr)
    return Image.fromarray(out_arr, "RGB")
