import sys
import os
import time
from PIL import Image
import numpy as np

# Add project root to path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, _PROJECT_ROOT)

from core.engine import Engine

def benchmark():
    print("--- Rendering Benchmark ---")
    
    # Create a 1080p test image
    w, h = 1920, 1080
    arr = np.random.randint(0, 255, (h, w, 3), dtype=np.uint8)
    img = Image.fromarray(arr, "RGB")
    
    layers = [
        {
            "type": "ASCII", "enabled": True, "mode": "Above", "range": (0, 255),
            "size": 16, "sample": "Point", "mapping": "Brightness",
            "f_col": "#ffffff", "bg_mode": "Fixed Color", "bg_col": "#000000",
            "set": "HRDWRE", "ox": 0, "oy": 0, "blend": "Normal"
        },
        {
            "type": "DITHER", "enabled": True, "mode": "Between", "range": (50, 200),
            "size": 4, "col": "#00ff41", "pattern": "Classic 2x2", "blend": "Screen"
        },
        {
            "type": "CRT", "enabled": True, "mode": "Below", "range": (0, 100),
            "intensity": 80, "freq": 30, "col": "#00ff41", "blend": "Normal"
        }
    ]
    
    print(f"Processing {w}x{h} image with {len(layers)} layers...")
    
    # Warm up
    Engine.render(img, layers)
    
    start_time = time.time()
    iterations = 3
    for i in range(iterations):
        t1 = time.time()
        Engine.render(img, layers)
        print(f"  Iteration {i+1}: {time.time() - t1:.4f}s")
        
    duration = (time.time() - start_time) / iterations
    print(f"\nAverage duration: {duration:.4f}s")

if __name__ == "__main__":
    benchmark()
