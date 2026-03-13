"""
bitboylab_boy
~~~~~~~~~~
Layered image-processing engine with 6 GPU-ready effects.

Quick start:
    from core.engine import Engine
    from PIL import Image

    img = Image.open("photo.jpg")
    result = Engine.render(img, layers=[
        {"type": "DITHER", "enabled": True, "mode": "Above",
         "range": (0, 255), "blend": "Screen",
         "size": 4, "col": "#00ff41", "pattern": "Classic 2x2"},
    ])
    result.save("out.jpg")
"""
__version__ = "1.0.0"
__author__  = "HRDWRE"
