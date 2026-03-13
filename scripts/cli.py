#!/usr/bin/env python3
"""
scripts/cli.py
~~~~~~~~~~~~~~
Command-line interface for batch-processing images through a layer stack.

Usage examples:
    # Apply dither + CRT effects to an image:
    python3 scripts/cli.py \\
        --input photo.jpg \\
        --output result.jpg \\
        --effects dither crt

    # Mosaic + glitch + edge, with custom mosaic size:
    python3 scripts/cli.py \\
        --input photo.jpg \\
        --output result.jpg \\
        --effects glitch edge \\
        --mosaic 8

    # List all available effects:
    python3 scripts/cli.py --list-effects
"""
from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from PIL import Image

from core.engine import Engine
from utils.image import apply_mosaic, image_to_bytes


# ── Effect presets ─────────────────────────────────────────────────────────
_PRESETS: dict[str, dict] = {
    "dither": {
        "type": "DITHER", "enabled": True, "mode": "Above",
        "range": (0, 255), "blend": "Screen",
        "size": 4, "col": "#00ff41", "pattern": "Classic 2x2",
    },
    "crt": {
        "type": "CRT", "enabled": True, "mode": "Above",
        "range": (0, 255), "blend": "Screen",
        "intensity": 80, "freq": 30, "col": "#00ff41",
    },
    "glitch": {
        "type": "GLITCH", "enabled": True, "mode": "Above",
        "range": (0, 255), "blend": "Normal",
        "amount": 100, "quality": 30, "seed": 42, "ignore_mosaic": False,
    },
    "edge": {
        "type": "EDGE", "enabled": True, "mode": "Above",
        "range": (0, 255), "blend": "Normal",
        "sensitivity": 50, "thickness": 1, "color": "#ffffff",
    },
    "sort": {
        "type": "PIXEL_SORT", "enabled": True, "mode": "Between",
        "range": (100, 255), "blend": "Normal",
        "direction": "Horizontal", "sort_by": "Brightness",
        "reverse": False, "min_len": 1, "max_len": 10000,
        "randomness": 0.0, "sort_only": False,
    },
    "ascii": {
        "type": "ASCII", "enabled": True, "mode": "Above",
        "range": (0, 255), "blend": "Normal",
        "size": 16, "sample": "Point", "mapping": "Brightness",
        "f_col": "#ffffff", "bg_mode": "Fixed Color", "bg_col": "#000000",
        "set": "HRDWRE", "ox": 0, "oy": 0,
    },
}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="bitboylab_boy",
        description="BitBoy Lab CLI — apply effect layers to an image.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--input",  "-i", metavar="FILE", help="Input image path (JPEG/PNG).")
    parser.add_argument("--output", "-o", metavar="FILE", help="Output image path (JPEG/PNG).")
    parser.add_argument(
        "--effects", "-e", nargs="+", metavar="EFFECT",
        choices=list(_PRESETS.keys()),
        help=f"One or more effects to apply: {', '.join(_PRESETS.keys())}",
    )
    parser.add_argument(
        "--mosaic", "-m", type=int, default=1, metavar="N",
        help="Mosaic block size applied to source (1 = off, default: 1).",
    )
    parser.add_argument(
        "--bg-alpha", type=float, default=1.0, metavar="A",
        help="Source image opacity (0.0–1.0, default: 1.0).",
    )
    parser.add_argument(
        "--list-effects", action="store_true",
        help="List all available effect presets and exit.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)

    if args.list_effects:
        print("Available effects:")
        for name in _PRESETS:
            print(f"  {name}")
        return

    if not args.input or not args.output or not args.effects:
        print("Error: --input, --output, and --effects are required.", file=sys.stderr)
        sys.exit(1)

    src = Image.open(args.input).convert("RGB")
    orig = src.copy()
    processed = apply_mosaic(src, args.mosaic) if args.mosaic > 1 else src

    layers = [_PRESETS[name] for name in args.effects]

    print(f"Processing '{args.input}' with effects: {', '.join(args.effects)} ...")
    result = Engine.render(
        source=processed,
        layers=layers,
        bg_alpha=args.bg_alpha,
        orig_source=orig,
    )

    fmt = "PNG" if args.output.lower().endswith(".png") else "JPEG"
    data = image_to_bytes(result, fmt=fmt, quality=95)
    with open(args.output, "wb") as f:
        f.write(data)
    print(f"Saved → {args.output}")


if __name__ == "__main__":
    main()
