import io, os
from PIL import Image, ImageDraw, ImageFont
import numpy as np

def test_font():
    font_path = "/Users/kimbow/Desktop/Antigravitiy Skills/projects/BitBoyLab/utils/JetBrainsMono-Bold.ttf"
    if not os.path.exists(font_path):
        print(f"Font not found at {font_path}")
        return

    symbols = [' ', '░', '▒', '▓', '█', '▖', '▚', '▜', '▉', '◈', '◇']
    img = Image.new("RGB", (400, 100), (45, 45, 45))
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype(font_path, 24)
        print(f"Loaded font: {font.getname()}")
    except Exception as e:
        print(f"Failed to load font: {e}")
        return

    x = 20
    for char in symbols:
        draw.text((x, 50), char, fill=(255, 255, 255), font=font, anchor="mm")
        x += 35
    
    img.save("/Users/kimbow/Desktop/Antigravitiy Skills/projects/BitBoyLab/font_test_results.png")
    print("Saved test image to font_test_results.png")

if __name__ == "__main__":
    test_font()
