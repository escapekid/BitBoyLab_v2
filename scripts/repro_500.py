import sys
import os
import io
import json
from PIL import Image
import numpy as np

# Add project root to path
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, _PROJECT_ROOT)

from core.engine import Engine
from api.models import LayerConfig

def repro():
    print("--- Repro ASCII 500 ---")
    
    # Create test image
    img = Image.new("RGB", (100, 100), (255, 0, 0))
    
    # Simulate a bare ASCII layer as might come from the frontend
    # If the frontend skips some fields, Pydantic fills them with None
    raw_layer = {"type": "ASCII", "enabled": True, "mode": "Above"}
    
    try:
        # This is what process.py does:
        config = LayerConfig(**raw_layer)
        dump = config.model_dump(exclude_none=True)
        print(f"Dumped layer: {dump}")
        
        # This is what Engine.render calls:
        result = Engine.render(img, [dump])
        print("  ✅ Engine.render passed")
        
        # Try with some common params
        raw_layer_2 = {
            "type": "ASCII", 
            "enabled": True, 
            "mode": "Above",
            "set": "Matrix",
            "size": 8
        }
        config2 = LayerConfig(**raw_layer_2)
        dump2 = config2.model_dump(exclude_none=True)
        print(f"Dumped layer 2: {dump2}")
        result2 = Engine.render(img, [dump2])
        print("  ✅ Engine.render (params) passed")

    except Exception as e:
        print(f"  ❌ FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    repro()
