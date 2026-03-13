import numpy as np
from PIL import Image
import sys
import os

# Add project root to path to import core/utils
sys.path.append(os.getcwd())

from core.effects.tileset_dither import apply_tileset_dither

def test_tileset_dither():
    # Create a simple test image (gradient)
    img = Image.new("RGB", (100, 100))
    for x in range(100):
        for y in range(100):
            img.putpixel((x, y), (x * 2, y * 2, 128))
    
    # Create a full mask
    mask = np.ones((100, 100), dtype=bool)
    
    brand_colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00"]
    
    # Test 1: Harmony mode with full_bg=True
    print("Testing Harmony mode with full_bg=True...")
    out1 = apply_tileset_dither(
        img, mask, tile_size=10, mode="Harmony", 
        brand_colors=brand_colors, full_bg=True
    )
    out1.save("test_harmony_fullbg.png")
    
    # Test 2: Harmony mode with full_bg=False
    print("Testing Harmony mode with full_bg=False...")
    out2 = apply_tileset_dither(
        img, mask, tile_size=10, mode="Harmony", 
        brand_colors=brand_colors, full_bg=False
    )
    out2.save("test_harmony_transparent.png")
    
    print("Verification images saved as test_harmony_fullbg.png and test_harmony_transparent.png")

if __name__ == "__main__":
    test_tileset_dither()
