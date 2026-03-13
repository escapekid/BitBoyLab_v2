"""
bitboylab_boy.core.engine
~~~~~~~~~~~~~~~~~~~~~~~~
High-level layer stack orchestrator.

The Engine is the single entry point for rendering a full layer stack
onto a source image. It delegates all pixel-level work to the effect
modules in ``core.effects`` and handles composition order.

Composition pipeline
--------------------
Layers are processed in their order in the stack (bottom to top).
Each layer is rendered based on its luminance threshold range and
then blended onto the current canvas result.

Each layer dict must contain:
    ``type``    : str — one of ``"ASCII"``, ``"DITHER"``, ``"CRT"``,
                  ``"GLITCH"``, ``"PIXEL_SORT"``, ``"EDGE"``.
    ``enabled`` : bool — skipped if False.
    ``range``   : tuple[int, int] — luminance threshold (low, high).
    ``blend``   : str — blend mode name (see ``core.blend.BLEND_MODES``).
    + effect-specific parameters (see individual effect modules).
"""
from __future__ import annotations

import numpy as np
from PIL import Image

from core.blend import apply_blending
from core.mask import get_mask
from core.effects.ascii_art import apply_ascii
from core.effects.crt import apply_crt
from core.effects.dither import apply_dither
from core.effects.edge_detect import apply_edge_detect
from core.effects.glitch import apply_glitch
from core.effects.pixel_sort import apply_pixel_sort
from core.effects.block_glitch import apply_block_glitch
from core.effects.noise import apply_noise
from core.effects.texture import apply_texture
from core.effects.halftone import apply_halftone
from core.effects.posterize import apply_posterize
from core.effects.gradient_map import apply_gradient_map
from core.effects.levels import apply_levels
from core.effects.threshold import apply_threshold
from core.effects.tileset_dither import apply_tileset_dither
from utils.image import apply_mosaic


class Engine:
    """Stateless rendering engine for the BitBoy Lab layer stack."""

    @staticmethod
    def render(
        source: Image.Image,
        layers: list[dict],
        bg_alpha: float = 1.0,
        orig_source: Image.Image | None = None,
        texture_img: Image.Image | None = None,
    ) -> Image.Image:
        """Render a full layer stack onto *source* and return the result."""
        if orig_source is None:
            orig_source = source

        enabled = [l for l in layers if l.get("enabled", True)]

        canvas = Image.new("RGBA", source.size, (0, 0, 0, 255))

        # Optimization: Pre-calculate gray arrays for masking
        gray_source = np.array(source.convert("L"))
        gray_orig = np.array(orig_source.convert("L")) if orig_source is not source else gray_source

        # Process layers in order (bottom to top)
        composite = source.copy()
        active_gray = gray_source
        prev_mask = None

        for layer in reversed(enabled):
            # Each layer now processes the current composite result of layers below
            rgba, current_mask = Engine._render_layer(
                layer, 
                composite, 
                composite,          # src_img for masking is also the current look
                orig_source, 
                active_gray, 
                gray_orig, 
                texture_img,
                prev_mask=prev_mask
            )
            
            # Blend onto canvas
            canvas = apply_blending(canvas, rgba, layer["blend"])
            
            # Update composite for the next layer in the stack
            composite = canvas.convert("RGB")
            active_gray = np.array(composite.convert("L"))
            prev_mask = current_mask

        return canvas

    @staticmethod
    def _render_layer(
        layer: dict,
        base_img: Image.Image,
        src_img: Image.Image,
        orig_src_img: Image.Image,
        gray_src: np.ndarray,
        gray_orig: np.ndarray,
        texture_img: Image.Image | None = None,
        prev_mask: np.ndarray | None = None,
    ) -> tuple[Image.Image, np.ndarray]:
        """Dispatch a single layer dict to the appropriate effect function."""
        layer_type = layer["type"]
        active_gray = gray_src

        # Effects that can bypass the mosaic and use the original source
        can_ignore = layer_type in ("GLITCH", "PIXEL_SORT", "EDGE")
        if can_ignore and layer.get("ignore_mosaic") and orig_src_img:
            base_img = orig_src_img
            src_img = orig_src_img
            active_gray = gray_orig

        mask = get_mask(
            src_img,
            layer.get("range", (0, 255)),
            gray_arr=active_gray,
        )
        
        # Clipping logic: restrict to the previous layer's mask
        if layer.get("clipped") and prev_mask is not None:
            mask = mask & prev_mask

        out = Image.new("RGBA", src_img.size, (0, 0, 0, 0))

        if layer_type == "GLITCH":
            out = apply_glitch(
                base_img,
                mask,
                amount=int(layer.get("amount", 50)),
                quality=int(layer.get("quality", 30)),
                seed=int(layer.get("seed", 42)),
            )

        elif layer_type == "CRT":
            out = apply_crt(
                base_img,
                mask,
                intensity=int(layer.get("intensity", 80)),
                frequency=int(layer.get("freq", 30)),
                color_hex=str(layer.get("col", "#00ff41")),
                offset_y=int(layer.get("oy", 0)),
            )

        elif layer_type == "DITHER":
            d = apply_dither(
                base_img,
                mask,
                size=int(layer.get("size", 4)),
                color_hex=str(layer.get("col", "#00ff41")),
                pattern_type=str(layer.get("pattern", "Classic 2x2")),
            )
            out = d.convert("RGBA")
            out.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))

        elif layer_type == "EDGE":
            out = apply_edge_detect(
                base_img,
                mask,
                sensitivity=int(layer.get("sensitivity", 50)),
                thickness=int(layer.get("thickness", 1)),
                color_hex=str(layer.get("color", "#ffffff")),
            )

        elif layer_type == "ASCII":
            out = apply_ascii(
                base_img,
                mask,
                size=int(layer.get("size", 16)),
                sample=str(layer.get("sample", "Point")),
                mapping=str(layer.get("mapping", "Brightness")),
                font_color=str(layer.get("f_col", "#ffffff")),
                bg_mode=str(layer.get("bg_mode", "Fixed Color")),
                bg_color=str(layer.get("bg_col", "#000000")),
                charset=str(layer.get("set", "HRDWRE")),
                offset_x=int(layer.get("ox", 0)),
                offset_y=int(layer.get("oy", 0)),
                full_bg=bool(layer.get("full_bg", False)),
                soft_mask=bool(layer.get("soft_mask", True)),
            )

        elif layer_type == "BLOCK_GLITCH":
            out = apply_block_glitch(
                base_img,
                mask,
                block_size=int(layer.get("size", 16)),
                amount=float(layer.get("amount", 0.2)),
                seed=int(layer.get("seed", 42))
            )

        elif layer_type == "PIXEL_SORT":
            out = apply_pixel_sort(
                base_img,
                mask,
                direction=str(layer.get("direction", "Horizontal")),
                sort_by=str(layer.get("sort_by", "Brightness")),
                reverse=bool(layer.get("reverse", False)),
                min_len=int(layer.get("min_len", 1)),
                max_len=int(layer.get("max_len", 10000)),
                randomness=float(layer.get("randomness", 0.0)),
                sort_only=bool(layer.get("sort_only", False)),
            )

        elif layer_type == "NOISE":
            out = apply_noise(
                base_img,
                mask,
                amount=float(layer.get("amount", 0.2)),
                noise_type=str(layer.get("noise_type", "Uniform")),
                seed=int(layer.get("seed", 42)),
            )

        elif layer_type == "TEXTURE":
            out = apply_texture(
                base_img,
                texture_img,
                mask=mask,
                invert=bool(layer.get("invert", False)),
                scale=float(layer.get("scale", 1.0)),
                rotation=int(layer.get("rotation", 0)),
                ox=int(layer.get("ox", 0)),
                oy=int(layer.get("oy", 0)),
                repeat=bool(layer.get("repeat", False)),
                luma_alpha=bool(layer.get("luma_alpha", False)),
            )

        elif layer_type == "HALFTONE":
            out = apply_halftone(
                base_img,
                mask,
                size=int(layer.get("size", 8)),
                method=str(layer.get("method", "Classic")),
                color_hex=str(layer.get("col", "#ffffff")),
                dot_scale=float(layer.get("dot_scale", 0.9)),
            )

        elif layer_type == "POSTERIZE":
            out = apply_posterize(
                base_img,
                mask,
                levels=int(layer.get("levels", 4)),
            )
            # Adjustments must be transparent outside their mask for correct blending
            out = out.convert("RGBA")
            out.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))

        elif layer_type == "GRADIENT_MAP":
            out = apply_gradient_map(
                base_img,
                mask,
                col0=str(layer.get("col0", "#000000")),
                pos0=int(layer.get("pos0", 0)),
                col1=str(layer.get("col1", "#555555")),
                pos1=int(layer.get("pos1", 85)),
                col2=str(layer.get("col2", "#aaaaaa")),
                pos2=int(layer.get("pos2", 170)),
                col3=str(layer.get("col3", "#ffffff")),
                pos3=int(layer.get("pos3", 255)),
                num_colors=int(layer.get("num_colors", 4)),
            )
            out = out.convert("RGBA")
            out.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))

        elif layer_type == "LEVELS":
            out = apply_levels(
                base_img,
                mask,
                black_lift=int(layer.get("black_lift", 0)),
                mid_point=float(layer.get("mid_point", 1.0)),
                white_point=int(layer.get("white_point", 255)),
            )
            out = out.convert("RGBA")
            out.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))

        elif layer_type == "THRESHOLD":
            out = apply_threshold(
                base_img,
                mask,
                threshold=int(layer.get("threshold_val", 128)),
            )
            out = out.convert("RGBA")
            out.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))

        elif layer_type == "TILESET_DITHER":
            brand_colors = [
                str(layer.get("col0", "#000000")),
                str(layer.get("col1", "#555555")),
                str(layer.get("col2", "#aaaaaa")),
                str(layer.get("col3", "#ffffff")),
            ][:int(layer.get("num_colors", 4))]
            
            out = apply_tileset_dither(
                base_img,
                mask,
                tile_size=int(layer.get("size", 12)),
                contrast=float(layer.get("contrast", 1.0)),
                brightness=float(layer.get("brightness", 1.0)),
                mode=str(layer.get("mode", "Source Colors")),
                symbol_set_name=str(layer.get("symbol_set", "standard")),
                brand_colors=brand_colors,
                full_bg=bool(layer.get("full_bg", False))
            )
            out = out.convert("RGBA")
            out.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))

        elif layer_type == "SOURCE":
            # For source layer, we apply its own mosaic
            m = int(layer.get("mosaic", 1))
            img = apply_mosaic(orig_src_img or src_img, m) if m > 1 else (orig_src_img or src_img).copy()
            out = img.convert("RGBA")
            out.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))

        # 1. Global Opacity Handling for ALL layers
        opacity = float(layer.get("opacity", 1.0))
        if opacity < 1.0:
            if out.mode != "RGBA":
                out = out.convert("RGBA")
            alpha = out.getchannel("A")
            alpha = alpha.point(lambda p: int(p * opacity))
            out.putalpha(alpha)

        # 2. Safety: Ensure all effects return RGBA for blending
        if out.mode != "RGBA":
            out = out.convert("RGBA")

        return out, mask
