"""
bitboylab_boy.core.effects.gradient_map
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Map pixel luminance to a color gradient defined by multiple color stops.
"""
from __future__ import annotations

import numpy as np
from PIL import Image


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def apply_gradient_map(
    img: Image.Image,
    mask: np.ndarray,
    col0: str = "#000000",
    pos0: int = 0,
    col1: str = "#555555",
    pos1: int = 85,
    col2: str = "#aaaaaa",
    pos2: int = 170,
    col3: str = "#ffffff",
    pos3: int = 255,
    num_colors: int = 4
) -> Image.Image:
    """
    Apply a gradient map with 2, 3, or 4 adjustable stops.
    """
    luma = img.convert("L")
    luma_arr = np.array(luma)
    
    # Collect valid stops based on num_colors
    raw_stops = [
        (pos0, _hex_to_rgb(col0)),
        (pos1, _hex_to_rgb(col1)),
        (pos2, _hex_to_rgb(col2)),
        (pos3, _hex_to_rgb(col3)),
    ]
    
    if num_colors == 2:
        stops = [raw_stops[0], raw_stops[3]]
    elif num_colors == 3:
        stops = [raw_stops[0], raw_stops[1], raw_stops[3]]
    else:
        stops = raw_stops
        
    # Sort by position to ensure clean interpolation
    stops.sort(key=lambda x: x[0])
    
    lut = np.zeros((256, 3), dtype=np.uint8)
    
    # Fill gaps before the first stop and after the last stop
    lut[:stops[0][0]] = stops[0][1]
    lut[stops[-1][0]:] = stops[-1][1]
    
    # Interpolate between consecutive stops
    for i in range(len(stops) - 1):
        p_start, c_start = stops[i]
        p_end, c_end = stops[i+1]
        
        if p_start == p_end:
            continue
            
        for p in range(p_start, p_end + 1):
            f = (p - p_start) / (p_end - p_start)
            lut[p] = [
                int(c_start[j] + (c_end[j] - c_start[j]) * f)
                for j in range(3)
            ]
        
    mapped_arr = lut[luma_arr]
    mapped_img = Image.fromarray(mapped_arr, "RGB")
    
    orig_arr = np.array(img.convert("RGB"))
    m3 = np.stack([mask] * 3, axis=-1)
    
    final_arr = np.where(m3, mapped_arr, orig_arr)
    return Image.fromarray(final_arr, "RGB")
