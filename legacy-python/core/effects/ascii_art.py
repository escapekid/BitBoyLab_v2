"""
bitboylab_boy.core.effects.ascii_art
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ASCII art effect: renders each image cell as a character on a coloured background.
"""
from __future__ import annotations

import io
import random as _random

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from utils.image import get_font_bytes

# Available character sets used for ASCII rendering
CHAR_SETS: dict[str, str] = {
    "HRDWRE":   "H R D W R E",
    "HACKER":   "[ ] < > / \\ | _ - +",
    "Standard": "@ % # * + = - : . ",
    "Blocky":   "█ ▓ ▒ ░ ",
    "Matrix":   "0 1",
}


# Font cache to avoid redundant TTF parsing
_FONT_CACHE: dict[int, ImageFont.FreeTypeFont] = {}


def apply_ascii(
    img: Image.Image,
    mask: np.ndarray,
    size: int = 16,
    sample: str = "Point",
    mapping: str = "Brightness",
    font_color: str = "#ffffff",
    bg_mode: str = "Fixed Color",
    bg_color: str = "#000000",
    charset: str = "HRDWRE",
    soft_mask: bool = True,
    offset_x: int = 0,
    offset_y: int = 0,
) -> Image.Image:
    """Render the source image as ASCII art within *mask*."""
    w, h = img.size
    sw, sh = max(1, w // size), max(1, h // size)

    resample = Image.BILINEAR if sample == "Area" else Image.NEAREST

    # Pre-compute downscaled grey values once
    gray_down = img.convert("L").resize((sw, sh), resample)
    gray_arr = np.array(gray_down)

    color_arr: np.ndarray | None = None
    if bg_mode == "Sample Image":
        color_down = img.resize((sw, sh), resample)
        color_arr = np.array(color_down)

    # Resolve charset
    raw = CHAR_SETS.get(charset, CHAR_SETS["HRDWRE"])
    chars = raw.split()

    # Font handling with cache
    if size not in _FONT_CACHE:
        font_data = get_font_bytes()
        try:
            if font_data:
                _FONT_CACHE[size] = ImageFont.truetype(io.BytesIO(font_data), int(size))
            else:
                _FONT_CACHE[size] = ImageFont.load_default()
        except Exception:
            _FONT_CACHE[size] = ImageFont.load_default()
    font = _FONT_CACHE[size]

    # Pre-render character set
    char_masks = []
    for c in chars:
        m = Image.new("L", (size, size), 0)
        d = ImageDraw.Draw(m)
        try:
            # Try to center the character in the cell
            bbox = d.textbbox((0, 0), c, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            tx = (size - tw) // 2 - bbox[0]
            ty = (size - th) // 2 - bbox[1]
        except Exception:
            tx = ty = 0
            
        d.text((tx, ty), c, fill=255, font=font)
        char_masks.append(m)

    bg_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw_bg = ImageDraw.Draw(bg_layer)

    if bg_mode == "Fixed Color":
        try:
            bg_rgb = tuple(int(bg_color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
        except Exception:
            bg_rgb = (0, 0, 0)
    
    # Background tiles
    for y_idx in range(sh):
        cy0 = int(y_idx * h / sh)
        cy1 = int((y_idx + 1) * h / sh)
        for x_idx in range(sw):
            cx0 = int(x_idx * w / sw)
            cx1 = int((x_idx + 1) * w / sw)
            
            src_y_idx = (y_idx + offset_y) % sh
            src_x_idx = (x_idx + offset_x) % sw

            sample_y = min(max(0, (cy0 + cy1) // 2), h - 1)
            sample_x = min(max(0, (cx0 + cx1) // 2), w - 1)

            if not mask[sample_y, sample_x]:
                continue
            
            rgb = tuple(color_arr[src_y_idx, src_x_idx]) if (bg_mode == "Sample Image" and color_arr is not None) else bg_rgb
            draw_bg.rectangle([cx0, cy0, cx1, cy1], fill=(*rgb, 255))

    if soft_mask:
        bg_layer.putalpha(Image.fromarray(mask.astype(np.uint8) * 255))

    try:
        f_rgb = tuple(int(font_color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
    except Exception:
        f_rgb = (255, 255, 255)
    
    char_layer = Image.new("L", (w, h), 0)
    char_src = Image.new("RGBA", (w, h), (*f_rgb, 255))

    # Render characters
    for y_idx in range(sh):
        cy0 = int(y_idx * h / sh)
        cy1 = int((y_idx + 1) * h / sh)
        src_y_idx = (y_idx + offset_y) % sh
        for x_idx in range(sw):
            cx0 = int(x_idx * w / sw)
            cx1 = int((x_idx + 1) * w / sw)
            src_x_idx = (x_idx + offset_x) % sw
            
            sample_y = min(max(0, (cy0 + cy1) // 2), h - 1)
            sample_x = min(max(0, (cx0 + cx1) // 2), w - 1)
            if not mask[sample_y, sample_x]: continue
            
            if mapping == "Random":
                c_idx = _random.randrange(len(char_masks))
            else:
                brightness = gray_arr[src_y_idx, src_x_idx]
                c_idx = int((brightness / 255.1) * (len(char_masks) - 1))
            
            # Center character mask in the grid cell
            cell_w, cell_h = cx1 - cx0, cy1 - cy0
            px = cx0 + (cell_w - size) // 2
            py = cy0 + (cell_h - size) // 2
            char_layer.paste(255, (px, py), mask=char_masks[c_idx])

    bg_layer.paste(char_src, (0, 0), mask=char_layer)
    return bg_layer
