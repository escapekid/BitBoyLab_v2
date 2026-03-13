"""
bitboylab_boy.core.effects.threshold
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Simple binary thresholding to pure black and white.
"""
from __future__ import annotations

import numpy as np
from PIL import Image


def apply_threshold(
    img: Image.Image,
    mask: np.ndarray,
    threshold: int = 128
) -> Image.Image:
    """
    Apply binary thresholding.
    
    Args:
        img: Source PIL Image.
        mask: NumPy boolean mask.
        threshold: Luminance threshold (0-255).
    """
    # Convert to grayscale for luminance detection
    luma = img.convert("L")
    luma_arr = np.array(luma)
    
    # Create binary mask (255 for >= threshold, 0 otherwise)
    binary = np.where(luma_arr >= threshold, 255, 0).astype(np.uint8)
    
    # Create RGB version
    res_arr = np.stack([binary] * 3, axis=-1)
    
    # Combine with original using the input mask
    orig_arr = np.array(img.convert("RGB"))
    m3 = np.stack([mask] * 3, axis=-1)
    
    final_arr = np.where(m3, res_arr, orig_arr)
    return Image.fromarray(final_arr, "RGB")
