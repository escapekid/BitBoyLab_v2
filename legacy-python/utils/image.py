"""
bitboylab_boy.utils.image
~~~~~~~~~~~~~~~~~~~~~~~
Image manipulation helpers: mosaic/pixelation, font loading.
"""
from __future__ import annotations

import io
import os
from functools import lru_cache

import requests
from PIL import Image

# Path to local font file
_LOCAL_FONT = os.path.join(os.path.dirname(__file__), "JetBrainsMono-Bold.ttf")

# JetBrains Mono Bold — contains superior glyph coverage for symbols
_FONT_URL = (
    "https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Bold.ttf"
)


def get_font_bytes() -> bytes | None:
    """Load the Space Mono Bold font from disk or download it.

    Returns:
        Raw font bytes on success, or ``None`` if neither disk nor download works.
    """
    # 1. Try local file first
    print(f"DEBUG: Checking for font at: {_LOCAL_FONT}")
    if os.path.exists(_LOCAL_FONT):
        try:
            with open(_LOCAL_FONT, "rb") as f:
                data = f.read()
                if data:
                    print(f"DEBUG: Loaded {len(data)} bytes from local font file.")
                    return data
                else:
                    print("DEBUG: Local font file exists but is empty.")
        except Exception as e:
            print(f"DEBUG: Failed to read local font file: {e}")

    # 2. Fall back to download
    print(f"DEBUG: Falling back to download from: {_FONT_URL}")
    try:
        r = requests.get(_FONT_URL, allow_redirects=True, timeout=10)
        r.raise_for_status()
        print(f"DEBUG: Downloaded {len(r.content)} bytes of font data.")
        return r.content
    except Exception as e:
        print(f"DEBUG: Font download failed: {e}")
        return None


def apply_mosaic(img: Image.Image, block_size: int) -> Image.Image:
    """Pixelate an image by downscaling then upscaling with nearest-neighbor."""
    if block_size <= 1:
        return img
    w, h = img.size
    small = img.resize(
        (max(1, w // block_size), max(1, h // block_size)),
        Image.NEAREST,
    )
    return small.resize((w, h), Image.NEAREST)


def image_to_bytes(img: Image.Image, fmt: str = "JPEG", quality: int = 95) -> bytes:
    """Serialize a PIL image to raw bytes."""
    buf = io.BytesIO()
    save_img = img.convert("RGB") if fmt == "JPEG" else img
    save_img.save(buf, format=fmt, quality=quality)
    return buf.getvalue()
