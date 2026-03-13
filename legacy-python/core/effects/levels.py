"""
bitboylab_boy.core.effects.levels
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Adjust blacks, midtones (gamma), and highlights of an image.
"""
from __future__ import annotations

import numpy as np
from PIL import Image


def apply_levels(
    img: Image.Image,
    mask: np.ndarray,
    black_lift: int = 0,
    mid_point: float = 1.0,
    white_point: int = 255
) -> Image.Image:
    """
    Adjust image levels.
    
    Args:
        img: Source PIL Image.
        mask: NumPy boolean mask.
        black_lift: Input black level (0-255).
        mid_point: Gamma adjustment (0.1 - 5.0, 1.0 is neutral).
        white_point: Input white level (0-255).
    """
    # Working in 0-1 float range for easier math
    arr = np.array(img.convert("RGB")).astype(np.float32) / 255.0
    
    b = black_lift / 255.0
    w = white_point / 255.0
    
    # Avoid division by zero
    if w <= b:
        w = b + 0.01
        
    # 1. Remap black and white points (clipping included)
    arr = (arr - b) / (w - b)
    arr = np.clip(arr, 0.0, 1.0)
    
    # 2. Midpoint (Gamma) adjustment
    # Formula: out = in ^ (1/gamma)
    # The user input mid_point is often treated as gamma directly
    if mid_point != 1.0:
        # Prevent math errors
        safe_mid = max(0.01, mid_point)
        arr = np.power(arr, 1.0 / safe_mid)
        
    # Convert back to uint8
    res_arr = (arr * 255.0).astype(np.uint8)
    res_img = Image.fromarray(res_arr, "RGB")
    
    # Blend with original using mask
    orig_arr = np.array(img.convert("RGB"))
    m3 = np.stack([mask] * 3, axis=-1)
    
    final_arr = np.where(m3, res_arr, orig_arr)
    return Image.fromarray(final_arr, "RGB")
