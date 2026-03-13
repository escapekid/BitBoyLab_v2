"""
bitboylab_boy.core.effects.texture
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Applies an uploaded grunge/texture image over the base image.
Supports scaling, rotation, offsets, and tiling.
"""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageOps


def apply_texture(
    base_img: Image.Image,
    texture_img: Image.Image | None,
    mask: np.ndarray | None = None,
    invert: bool = False,
    scale: float = 1.0,
    rotation: int = 0,
    ox: int = 0,
    oy: int = 0,
    repeat: bool = False,
    luma_alpha: bool = False,
) -> Image.Image:
    """Apply a texture overlay with advanced transformations."""
    bw, bh = base_img.size

    if texture_img is None:
        return Image.new("RGBA", (bw, bh), (0, 0, 0, 0))

    # 1. Prepare Texture
    tex = texture_img.convert("RGBA")
    
    # Apply Inversion early if requested
    if invert:
        r, g, b, a = tex.split()
        rgb = Image.merge("RGB", (r, g, b))
        inv_rgb = ImageOps.invert(rgb)
        ir, ig, ib = inv_rgb.split()
        tex = Image.merge("RGBA", (ir, ig, ib, a))

    # 2. Luma to Alpha
    # This turns brightness into transparency. White = Opaque, Black = Transparent.
    if luma_alpha:
        luma = tex.convert("L")
        luma_arr = np.array(luma).astype(float) / 255.0
        
        r, g, b, a = tex.split()
        a_arr = np.array(a).astype(float) / 255.0
        
        # Multiply existing alpha by luma
        combined_a = (a_arr * luma_arr * 255.0).clip(0, 255).astype(np.uint8)
        tex.putalpha(Image.fromarray(combined_a))

    # 3. Transformations
    tw, th = tex.size

    # Scale
    if scale != 1.0:
        new_w, new_h = max(1, int(tw * scale)), max(1, int(th * scale))
        tex = tex.resize((new_w, new_h), Image.Resampling.LANCZOS)
        tw, th = tex.size

    # Rotate
    if rotation != 0:
        # Use expand=True to keep full texture visible after rotation
        # Use fillcolor=(0, 0, 0, 0) to ensure corners are transparent
        tex = tex.rotate(rotation, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=(0, 0, 0, 0))
        tw, th = tex.size

    # 4. Composition Canvas
    canvas = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    
    # Calculate screen-space offsets
    move_x = int((ox / 100.0) * bw)
    move_y = int((oy / 100.0) * bh)

    if repeat:
        # Tiling logic: Wrap the starting point
        off_x = move_x % tw
        off_y = move_y % th
        
        for y in range(off_y - th, bh, th):
            for x in range(off_x - tw, bw, tw):
                canvas.paste(tex, (x, y), tex)
    else:
        # Centered placement + offset
        px = move_x + (bw - tw) // 2
        py = move_y + (bh - th) // 2
        canvas.paste(tex, (px, py), tex)

    # 5. Mask Application
    if mask is not None:
        # Ensure mask is uint8 [0, 255] for PIL
        m_uint8 = (mask.astype(np.uint8) * 255)
        m_img = Image.fromarray(m_uint8).convert("L")
        
        # If mask size doesn't match canvas, resize it
        if m_img.size != (bw, bh):
            m_img = m_img.resize((bw, bh), Image.Resampling.NEAREST)
        
        # Use Image.composite to apply the mask to the alpha channel
        # This is more robust than manual numpy math
        c_r, c_g, c_b, c_a = canvas.split()
        new_a = Image.composite(c_a, Image.new("L", (bw, bh), 0), m_img)
        canvas.putalpha(new_a)
    
    return canvas
