"""
bitboylab_boy.core.effects.halftone
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Retro halftone / punktraster effects.
Includes classic screen dots, error-diffusion dots, and blue-noise patterns.
"""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageDraw

from utils.color import hex_to_rgb


def apply_halftone(
    img: Image.Image,
    mask: np.ndarray,
    size: int = 8,
    method: str = "Classic",
    color_hex: str = "#ffffff",
    dot_scale: float = 0.9,
) -> Image.Image:
    """Apply a halftone screen effect."""
    rgb = hex_to_rgb(color_hex)
    gray = np.array(img.convert("L"))
    h, w = gray.shape
    out = np.zeros((h, w, 3), dtype=np.uint8)
    s = max(2, int(size))

    if method == "Classic":
        _classic_halftone(gray, mask, out, rgb, s, dot_scale)
    elif method == "Floyd-Steinberg":
        _fs_halftone(gray, mask, out, rgb, s)
    elif method == "Blue Noise":
        _blue_noise_halftone(gray, mask, out, rgb, s)

    return Image.fromarray(out, "RGB")


def _classic_halftone(gray, mask, out, rgb, s, dot_scale):
    """Classic circular halftone screen."""
    h, w = gray.shape
    # Draw logic is easier with PIL for circles
    canvas = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(canvas)

    for y in range(0, h, s):
        for x in range(0, w, s):
            # Sample luminance in the cell
            cell_gray = gray[y : y + s, x : x + s]
            luma = np.mean(cell_gray) / 255.0
            
            # Dot radius proportional to luminance
            # 0.0 luma = 0 radius, 1.0 luma = full cell
            radius = (s / 2) * luma * dot_scale
            
            if radius > 0.5:
                cx, cy = x + s // 2, y + s // 2
                draw.ellipse(
                    [cx - radius, cy - radius, cx + radius, cy + radius],
                    fill=255
                )

    dot_mask = np.array(canvas) > 0
    effective_mask = dot_mask & mask
    out[effective_mask] = rgb


def _fs_halftone(gray, mask, out, rgb, s):
    """Floyd-Steinberg error diffusion with dots."""
    h, w = gray.shape
    pixels = gray.astype(np.float32)
    
    for y in range(0, h, s):
        for x in range(0, w, s):
            my, mx = min(y, h - 1), min(x, w - 1)
            if not mask[my, mx]:
                continue
            
            old_p = pixels[my, mx]
            new_p = 255.0 if old_p > 127 else 0.0
            pixels[my, mx] = new_p
            
            if new_p == 255:
                # Draw a dot instead of a square
                radius = s // 2
                for dy in range(s):
                    for dx in range(s):
                        if (dx - radius)**2 + (dy - radius)**2 <= radius**2:
                            if y + dy < h and x + dx < w:
                                out[y + dy, x + dx] = rgb
            
            err = old_p - new_p
            if x + s < w:
                pixels[y, x + s] += err * 7 / 16
            if y + s < h:
                if x - s >= 0:
                    pixels[y + s, x - s] += err * 3 / 16
                pixels[y + s, x] += err * 5 / 16
                if x + s < w:
                    pixels[y + s, x + s] += err * 1 / 16


def _blue_noise_halftone(gray, mask, out, rgb, s):
    """Halftone using a generated blue noise threshold."""
    h, w = gray.shape
    # Generate high-frequency noise and blur it slightly for 'blue' feel
    rng = np.random.default_rng(42)
    noise = rng.integers(0, 256, size=(h // s + 1, w // s + 1), dtype=np.uint8)
    # Upscale noise to full resolution
    full_noise = Image.fromarray(noise).resize((w, h), Image.Resampling.BICUBIC)
    noise_arr = np.array(full_noise)
    
    effective_mask = (gray > noise_arr) & mask
    out[effective_mask] = rgb
