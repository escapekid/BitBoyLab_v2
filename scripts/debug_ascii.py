import sys
import os
import io
import time
from PIL import Image, ImageDraw
import numpy as np

# Add project root to path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, _PROJECT_ROOT)

from core.effects.ascii_art import apply_ascii
from utils.image import get_font_bytes

def debug_ascii():
    print("--- ASCII Debug ---")
    
    # Create test image
    w, h = 400, 300
    img = Image.new("RGB", (w, h), (100, 100, 255))
    draw = ImageDraw.Draw(img)
    draw.ellipse([50, 50, 350, 250], fill=(255, 200, 0))
    
    mask = np.ones((h, w), dtype=bool)
    
    # Test font loading
    font_data = get_font_bytes()
    if font_data:
        print(f"Font loaded successfully ({len(font_data)} bytes)")
    else:
        print("Font loading FAILED. Will use default font.")
    
    # Benchmark ASCII rendering
    start_time = time.time()
    try:
        out = apply_ascii(
            img, mask, size=16, 
            sample="Point", mapping="Brightness", 
            font_color="#ffffff", bg_mode="Fixed Color", bg_color="#000000",
            charset="HRDWRE"
        )
        duration = time.time() - start_time
        print(f"ASCII applied in {duration:.4f}s")
        out.save("debug_ascii_output.png")
        print("Result saved as debug_ascii_output.png")
    except Exception as e:
        print(f"Error applying ASCII: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_ascii()
