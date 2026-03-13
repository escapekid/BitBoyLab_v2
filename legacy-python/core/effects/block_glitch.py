import numpy as np
from PIL import Image
import random as _random

def apply_block_glitch(
    img: Image.Image,
    mask: np.ndarray,
    block_size: int = 16,
    amount: float = 0.2,
    seed: int = 42
) -> Image.Image:
    """
    Randomly shifts blocks of the image.
    Only shifts blocks where the mask is active.
    """
    rng = _random.Random(seed)
    w, h = img.size
    
    # Ensure input is RGBA for blending compatibility
    img_rgba = img.convert("RGBA")
    
    # Initialize output as fully transparent
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    
    # Ensure block_size is at least 1
    block_size = max(1, block_size)
    
    # The glitch layer should contribute blocks that are "misplaced"
    for y in range(0, h, block_size):
        for x in range(0, w, block_size):
            # Check mask at center of block
            sample_y = min(y + block_size // 2, h - 1)
            sample_x = min(x + block_size // 2, w - 1)
            
            if not mask[sample_y, sample_x]:
                continue
                
            if rng.random() < amount:
                # Random shift within 2 block radii
                dx = rng.randint(-block_size * 2, block_size * 2)
                dy = rng.randint(-block_size * 2, block_size * 2)
                
                # Boundaries for source sampling
                src_x = max(0, min(x + dx, w - block_size))
                src_y = max(0, min(y + dy, h - block_size))
                
                # Slice from original and paste to transparent output
                box = (src_x, src_y, src_x + block_size, src_y + block_size)
                block = img_rgba.crop(box)
                out.paste(block, (x, y))
            else:
                # Optionally, if not glitched, keep original pixel but only inside mask?
                # Usually a "glitch layer" only contains the glitched parts.
                # However, if we want it to be a standalone replacement, we paste original.
                # But here we want it to be a layer, so we only paste glitched ones.
                pass
                
    return out
