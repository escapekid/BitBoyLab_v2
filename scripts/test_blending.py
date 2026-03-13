import sys
import os
import numpy as np
from PIL import Image

# Add project root to path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, _PROJECT_ROOT)

from core.engine import Engine

def test_blending_crash():
    print("--- Blending Crash Test ---")
    
    # Create test images
    img = Image.new("RGB", (100, 100), (255, 0, 0))
    
    modes = ["Normal", "Multiply", "Screen", "Overlay", "Difference", "Exclusion"]
    effects = ["DITHER", "CRT", "GLITCH", "EDGE", "PIXEL_SORT", "ASCII"]
    
    for blend in modes:
        for effect in effects:
            print(f"Testing {effect} with {blend} blend mode...")
            layer = {
                "type": effect, "enabled": True, "mode": "Above",
                "range": (0, 255), "blend": blend
            }
            # Add required params for effects
            if effect == "DITHER": layer.update({"size": 4, "col": "#00ff41", "pattern": "Classic 2x2"})
            elif effect == "CRT": layer.update({"intensity": 80, "freq": 30, "col": "#00ff41"})
            elif effect == "GLITCH": layer.update({"amount": 50, "quality": 30, "seed": 42})
            elif effect == "EDGE": layer.update({"sensitivity": 50, "thickness": 1, "color": "#ffffff"})
            elif effect == "PIXEL_SORT": layer.update({"direction": "Horizontal", "sort_by": "Brightness"})
            elif effect == "ASCII": layer.update({"size": 16, "set": "HRDWRE"})
            
            try:
                Engine.render(img, [layer])
                print(f"  ✅ OK")
            except Exception as e:
                print(f"  ❌ FAILED: {e}")
                import traceback
                traceback.print_exc()
                return

if __name__ == "__main__":
    test_blending_crash()
