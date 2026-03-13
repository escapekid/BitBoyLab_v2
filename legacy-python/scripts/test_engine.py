#!/usr/bin/env python3
"""
scripts/test_engine.py
~~~~~~~~~~~~~~~~~~~~~~~
Sanity-check script: runs all 6 effects through the Engine
without requiring a real image upload.

Usage:
    python3 scripts/test_engine.py

Expected output:
    All 6 effects passed.
"""
from __future__ import annotations

import sys
import os

# Ensure the project root is on sys.path so that 'core', 'utils', 'api' are importable
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

import numpy as np
from PIL import Image

from core.engine import Engine
from core.effects.dither import ALL_DITHER_PATTERNS

# ── Create a small test image (100×100 RGB gradient) ─────────────────────────
W, H = 100, 100
arr = np.zeros((H, W, 3), dtype=np.uint8)
for y in range(H):
    for x in range(W):
        arr[y, x] = [int(x * 255 / W), int(y * 255 / H), 128]
TEST_IMAGE = Image.fromarray(arr, "RGB")


def make_layer(t: str, extra: dict) -> dict:
    base = {
        "type": t, "enabled": True, "mode": "Above",
        "range": (0, 255), "blend": "Normal",
    }
    base.update(extra)
    return base


LAYERS = [
    make_layer("DITHER", {"size": 4, "col": "#00ff41", "pattern": "Classic 2x2"}),
    make_layer("CRT",    {"intensity": 80, "freq": 30, "col": "#00ff41"}),
    make_layer("GLITCH", {"amount": 50, "quality": 30, "seed": 42, "ignore_mosaic": False}),
    make_layer("EDGE",   {"sensitivity": 50, "thickness": 1, "color": "#ffffff"}),
    make_layer("PIXEL_SORT", {
        "direction": "Horizontal", "sort_by": "Brightness",
        "reverse": False, "min_len": 1, "max_len": 10000,
        "randomness": 0.0, "sort_only": False,
    }),
    make_layer("ASCII", {
        "size": 16, "sample": "Point", "mapping": "Brightness",
        "f_col": "#ffffff", "bg_mode": "Fixed Color", "bg_col": "#000000",
        "set": "HRDWRE", "ox": 0, "oy": 0,
    }),
]

EFFECT_NAMES = ["DITHER", "CRT", "GLITCH", "EDGE", "PIXEL_SORT", "ASCII"]

passed = 0
failed = 0

for layer, name in zip(LAYERS, EFFECT_NAMES):
    try:
        result = Engine.render(TEST_IMAGE, [layer], bg_alpha=1.0)
        assert result.size == TEST_IMAGE.size, f"Size mismatch: {result.size}"
        assert result.mode == "RGBA", f"Mode mismatch: {result.mode}"
        print(f"  ✅  {name:<12} passed  (output: {result.size} {result.mode})")
        passed += 1
    except Exception as exc:
        print(f"  ❌  {name:<12} FAILED  → {exc}")
        failed += 1

print()
if failed == 0:
    print(f"All {passed} effects passed.")
else:
    print(f"{passed} passed, {failed} FAILED.")
    sys.exit(1)
