"""
bitboylab_boy.core.effects.edge_detect
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Sobel-based edge detection rendered as single-color line art.

Algorithm
---------
1. Convert image to grayscale.
2. Compute X and Y gradients via vectorized NumPy slicing (Sobel-like).
3. Compute gradient magnitude: √(Gx² + Gy²), normalized to [0, 255].
4. Threshold the magnitude map to boolean edge mask.
5. Optionally dilate the edge mask for thicker lines.
6. Return an RGBA image — edge pixels fully opaque, others transparent.

Performance
-----------
Steps 2–4 are fully vectorized using NumPy advanced slicing — no Python
loops over pixels. Dilation in step 5 uses a simple boolean OR shift
loop (O(thickness × W × H)) — acceptable for thickness ≤ 10.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

from utils.color import hex_to_rgb


def apply_edge_detect(
    img: Image.Image,
    mask: np.ndarray,
    sensitivity: int = 50,
    thickness: int = 1,
    color_hex: str = "#ffffff",
) -> Image.Image:
    """Detect edges via Sobel operators and render them as line art.

    Args:
        img:         Source image (any mode).
        mask:        Boolean NumPy array (H, W) — edges only drawn here.
        sensitivity: 0–100. Higher = more edges detected.
                     Internally mapped as threshold = (101 - sensitivity) × 2.55.
        thickness:   Line thickness in pixels (1–10).
                     Implemented via iterative boolean dilation.
        color_hex:   Hex color string for the edge lines.

    Returns:
        RGBA image — edges in *color_hex* fully opaque, background transparent.
    """
    rgb_color = np.array(hex_to_rgb(color_hex), dtype=np.uint8)
    arr = np.array(img.convert("L")).astype(np.float32)
    h, w = arr.shape

    # --- Vectorized Sobel gradient (no per-pixel loop) ---
    gx = np.zeros_like(arr)
    gy = np.zeros_like(arr)
    gx[:, 1:-1] = arr[:, 2:] - arr[:, :-2]    # horizontal gradient
    gy[1:-1, :] = arr[2:, :] - arr[:-2, :]    # vertical gradient

    mag = np.hypot(gx, gy)  # equivalent to sqrt(gx² + gy²)
    if mag.max() > 0:
        mag = mag / mag.max() * 255.0

    # Map sensitivity [0, 100] → threshold [255, 0]
    threshold = (101 - sensitivity) * 2.55
    edges: np.ndarray = (mag > threshold) & mask

    # --- Dilation for thicker lines (iterative boolean OR shift) ---
    if thickness > 1:
        for _ in range(thickness - 1):
            dilated = edges.copy()
            dilated[1:] |= edges[:-1]    # shift down
            dilated[:-1] |= edges[1:]   # shift up
            dilated[:, 1:] |= edges[:, :-1]  # shift right
            dilated[:, :-1] |= edges[:, 1:]  # shift left
            edges = dilated

    # --- Build RGBA output ---
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[edges] = [*rgb_color, 255]  # edge pixels: color + fully opaque
    return Image.fromarray(out, "RGBA")
