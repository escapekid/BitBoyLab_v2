"""
bitboylab_boy.core.effects.dither
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Multiple dithering algorithms: ordered patterns, error diffusion, and random noise.

Available patterns
------------------
Floyd-Steinberg : Classic error-diffusion with 4-neighbour spread.
Atkinson        : Mac-era error diffusion with 1/8 divisor and 6 neighbours.
Random          : Noise-threshold dithering (no error diffusion).
Classic 2x2     : Ordered dithering with a 2×2 Bayer matrix.
Fine Grid       : Ordered dithering with a 4×4 Bayer matrix.

Performance notes
-----------------
- Floyd-Steinberg and Atkinson use Python loops over (W/s × H/s) cells.
  For large images with small ``size``, this can be slow.
  Future optimisation: port to Numba @jit or Cython extension.
- Random and pattern-based methods are fully vectorisable and very fast.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

from utils.color import hex_to_rgb

# Pre-defined ordered dither threshold matrices
DITHER_PATTERNS: dict[str, np.ndarray] = {
    "Classic 2x2": np.array([[0, 128], [192, 64]], dtype=np.uint8),
    "Fine Grid": np.array(
        [
            [0, 192, 48, 240],
            [128, 64, 176, 112],
            [32, 224, 16, 208],
            [160, 96, 144, 80],
        ],
        dtype=np.uint8,
    ),
}

ALL_DITHER_PATTERNS: list[str] = (
    list(DITHER_PATTERNS.keys()) + ["Floyd-Steinberg", "Atkinson", "Random"]
)


def apply_dither(
    img: Image.Image,
    mask: np.ndarray,
    size: int,
    color_hex: str,
    pattern_type: str,
) -> Image.Image:
    """Apply the requested dither algorithm to *img* within *mask*.

    Args:
        img:          Source image (any mode).
        mask:         Boolean NumPy array (H, W).
        size:         Cell / block size in pixels (1–200).
        color_hex:    Hex color for the "on" pixels.
        pattern_type: Algorithm name (see module docstring).

    Returns:
        RGB PIL image with dither applied over a black background.
    """
    rgb = hex_to_rgb(color_hex)
    gray = np.array(img.convert("L"))
    h, w = gray.shape
    out = np.zeros((h, w, 3), dtype=np.uint8)
    s = max(1, int(size))

    if pattern_type == "Floyd-Steinberg":
        _floyd_steinberg(gray, mask, out, rgb, s, h, w)

    elif pattern_type == "Atkinson":
        _atkinson(gray, mask, out, rgb, s, h, w)

    elif pattern_type == "Random":
        _random_dither(gray, mask, out, rgb, s, h, w)

    elif pattern_type in DITHER_PATTERNS:
        _ordered(gray, mask, out, rgb, s, h, w, DITHER_PATTERNS[pattern_type])

    return Image.fromarray(out, "RGB")


# ---------------------------------------------------------------------------
# Private algorithm implementations
# ---------------------------------------------------------------------------

def _floyd_steinberg(
    gray: np.ndarray,
    mask: np.ndarray,
    out: np.ndarray,
    rgb: tuple[int, int, int],
    s: int,
    h: int,
    w: int,
) -> None:
    """Floyd-Steinberg error diffusion — modifies *out* in-place."""
    pixels = gray.astype(np.float32)
    for y in range(0, h, s):
        for x in range(0, w, s):
            my, mx = min(y, h - 1), min(x, w - 1)
            if not mask[my, mx]:
                continue
            old_p = pixels[my, mx]
            new_p = 255.0 if old_p > 127 else 0.0
            pixels[my, mx] = new_p
            out[y : y + s, x : x + s] = rgb if new_p == 255 else (0, 0, 0)
            err = old_p - new_p
            # Distribute quantisation error to 4 neighbours (scaled by s)
            if x + s < w:
                pixels[y, x + s] += err * 7 / 16
            if y + s < h:
                if x - s >= 0:
                    pixels[y + s, x - s] += err * 3 / 16
                pixels[y + s, x] += err * 5 / 16
                if x + s < w:
                    pixels[y + s, x + s] += err * 1 / 16


def _atkinson(
    gray: np.ndarray,
    mask: np.ndarray,
    out: np.ndarray,
    rgb: tuple[int, int, int],
    s: int,
    h: int,
    w: int,
) -> None:
    """Atkinson error diffusion — modifies *out* in-place."""
    pixels = gray.astype(np.float32)
    for y in range(0, h, s):
        for x in range(0, w, s):
            my, mx = min(y, h - 1), min(x, w - 1)
            if not mask[my, mx]:
                continue
            old_p = pixels[my, mx]
            new_p = 255.0 if old_p > 127 else 0.0
            pixels[my, mx] = new_p
            out[y : y + s, x : x + s] = rgb if new_p == 255 else (0, 0, 0)
            err = (old_p - new_p) / 8.0
            # 6 neighbours with equal 1/8 weight
            for ny, nx in [
                (y,       x + s),
                (y,       x + 2 * s),
                (y + s,   x - s),
                (y + s,   x),
                (y + s,   x + s),
                (y + 2*s, x),
            ]:
                if 0 <= ny < h and 0 <= nx < w:
                    pixels[ny, nx] += err


def _random_dither(
    gray: np.ndarray,
    mask: np.ndarray,
    out: np.ndarray,
    rgb: tuple[int, int, int],
    s: int,
    h: int,
    w: int,
) -> None:
    """Noise-threshold dithering — fully vectorised, modifies *out* in-place."""
    rng = np.random.default_rng(42)
    noise = rng.integers(0, 256, size=(h, w), dtype=np.uint8)
    for y in range(0, h, s):
        for x in range(0, w, s):
            my, mx = min(y, h - 1), min(x, w - 1)
            if mask[my, mx] and gray[my, mx] > noise[my, mx]:
                out[y : min(y + s, h), x : min(x + s, w)] = rgb


def _ordered(
    gray: np.ndarray,
    mask: np.ndarray,
    out: np.ndarray,
    rgb: tuple[int, int, int],
    s: int,
    h: int,
    w: int,
    thresholds: np.ndarray,
) -> None:
    """Ordered (Bayer matrix) dithering — modifies *out* in-place."""
    ph, pw = thresholds.shape
    for y in range(0, h, s):
        for x in range(0, w, s):
            if mask[min(y, h - 1), min(x, w - 1)]:
                if gray[y, x] > thresholds[(y // s) % ph, (x // s) % pw]:
                    out[y : min(y + s, h), x : min(x + s, w)] = rgb
