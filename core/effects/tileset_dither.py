"""
bitboylab.core.effects.tileset_dither
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Premium hardware-style tileset dither with symbol mapping and brand palette support.
"""
from __future__ import annotations

import io
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from utils.color import hex_to_rgb
from utils.image import get_font_bytes

# Font cache to avoid redundant TTF parsing
_FONT_CACHE: dict[int, ImageFont.FreeTypeFont] = {}

SYMBOL_SETS = {
    "standard": [' ', '·', '×', '▣', '■'],
    "minimal":  [' ', '.', '+', '#', '@'],
    "binary":   ['0', '1'],
    "hardware": ['_', '▖', '▚', '▜', '▉'],
    "organic":  [' ', '░', '▒', '▓', '█'],
    "braille":  [' ', '⠂', '⠒', '⠗', '⣿'],
    "circuit":  [' ', '╎', '╼', '╋', '█'],
    "angles":   [' ', '└', '┴', '┼', '█']
}

BRAND_PALETTE = [
    (45, 45, 45),    # Dunkelgrau
    (138, 43, 226),  # BlueViolet
    (255, 69, 0),    # OrangeRed
    (255, 215, 0)    # Gold
]

def apply_tileset_dither(
    img: Image.Image,
    mask: np.ndarray,
    tile_size: int,
    contrast: float = 1.0,
    brightness: float = 1.0,
    mode: str = "Source Colors",
    symbol_set_name: str = "standard",
    brand_colors: list[str] | None = None,
    full_bg: bool = False
) -> Image.Image:
    """
    Apply a Tileset-Dither effect to the image.
    
    Args:
        img: Source PIL image.
        mask: NumPy boolean mask.
        tile_size: Size of each dither tile.
        contrast: Contrast multiplier.
        brightness: Brightness multiplier.
        mode: "Source Colors" or "Harmony".
        symbol_set_name: Name of the symbol set to use.
        brand_colors: List of brand colors (hex or RGB).
        full_bg: If False, background is transparent (source visible).
    """
    # 1. Image preparation
    img_rgb = img.convert("RGB")
    
    # Apply brightness/contrast to source for symbol selection
    if brightness != 1.0 or contrast != 1.0:
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Brightness(img_rgb)
        img_rgb = enhancer.enhance(brightness)
        enhancer = ImageEnhance.Contrast(img_rgb)
        img_rgb = enhancer.enhance(contrast)

    width, height = img_rgb.size
    data_rgb = np.array(img_rgb)
    data_gray = np.array(img_rgb.convert("L")) / 255.0
    
    # 2. Setup output
    # If full_bg is False, we start with transparent.
    # Note: engine.py blends this onto the previous composite.
    bg_color = (5, 5, 5, 255) if full_bg else (0, 0, 0, 0)
    out = Image.new("RGBA", (width, height), bg_color)
    draw = ImageDraw.Draw(out)
    
    symbols = SYMBOL_SETS.get(symbol_set_name, SYMBOL_SETS["standard"])
    
    # Font handling with cache
    if tile_size not in _FONT_CACHE:
        font_data = get_font_bytes()
        try:
            if font_data:
                _FONT_CACHE[tile_size] = ImageFont.truetype(io.BytesIO(font_data), int(tile_size))
            else:
                _FONT_CACHE[tile_size] = ImageFont.load_default()
        except Exception:
            _FONT_CACHE[tile_size] = ImageFont.load_default()
    font = _FONT_CACHE[tile_size]
    
    tile_size = max(1, int(tile_size))
    
    # 3. Processing loop
    use_palette = mode in ("Brand Palette", "Harmony")
    
    # Use provided brand colors or fallback to default
    palette = [hex_to_rgb(c) if isinstance(c, str) else c for c in brand_colors] if brand_colors else BRAND_PALETTE

    for y in range(0, height, tile_size):
        for x in range(0, width, tile_size):
            # Check if at least one pixel in the tile is masked
            tile_mask = mask[y:y+tile_size, x:x+tile_size]
            if np.mean(tile_mask) < 0.5:
                continue
                
            # Determine brightness
            tile_block = data_gray[y:y+tile_size, x:x+tile_size]
            avg_gray = np.mean(tile_block)
            
            if avg_gray > 0.001:
                # Select symbol
                sym_idx = int(avg_gray * (len(symbols) - 1))
                char = symbols[sym_idx]
                
                # Color selection
                if mode == "Source Colors":
                    rgb_block = data_rgb[y:y+tile_size, x:x+tile_size]
                    avg_color = tuple(np.mean(rgb_block, axis=(0, 1)).astype(int))
                    char_color = (*avg_color, 255)
                else:
                    idx = min(len(palette) - 1, int((avg_gray + 0.1) * len(palette)))
                    char_color = (*palette[idx], 255)
                
                # Draw
                draw.text((x + tile_size//2, y + tile_size//2), char, fill=char_color, font=font, anchor="mm")

    return out

    return out
