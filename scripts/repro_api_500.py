import requests
import json
import io
from PIL import Image

def test_api():
    print("--- API Repro 500 ---")
    url = "http://127.0.0.1:8000/api/process"
    
    # Create a 1080p test image
    img = Image.new("RGB", (1920, 1080), (255, 0, 0))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr = img_byte_arr.getvalue()

    # Test cases: tuples of (Label, Params)
    test_cases = [
        ("ASCII (HRDWRE)", {"type": "ASCII", "set": "HRDWRE", "size": 16}),
        ("ASCII (HACKER)", {"type": "ASCII", "set": "HACKER", "size": 32}),
        ("ASCII (Standard)", {"type": "ASCII", "set": "Standard"}),
        ("ASCII (Blocky)", {"type": "ASCII", "set": "Blocky"}),
        ("ASCII (Matrix)", {"type": "ASCII", "set": "Matrix"}),
        ("DITHER (default)", {"type": "DITHER"}),
        ("CRT (default)", {"type": "CRT"}),
        ("GLITCH (default)", {"type": "GLITCH"}),
        ("PIXEL_SORT (default)", {"type": "PIXEL_SORT"}),
        ("PIXEL_SORT (ranged)", {"type": "PIXEL_SORT", "range": [100, 200], "direction": "Vertical"}),
        ("EDGE (default)", {"type": "EDGE"}),
    ]

    for label, params in test_cases:
        print(f"Testing {label}...")
        payload = {
            "layers": json.dumps([params]),
            "mosaic_size": 1,
            "bg_alpha": 1.0
        }
        files = {"image": ("test.jpg", img_byte_arr, "image/jpeg")}
        
        try:
            response = requests.post(url, data=payload, files=files)
            if response.status_code == 200:
                print("  ✅ Success")
            else:
                print(f"  ❌ Failed with {response.status_code}: {response.text}")
        except Exception as e:
            print(f"  🔥 Request Error: {e}")

    # Test 11: Null parameters (Crash check)
    print("Testing NULL parameters...")
    payload = {
        "layers": json.dumps([
            {
                "type": "ASCII",
                "size": None,  # This might crash Engine._render_layer with int(None)
                "set": "HRDWRE"
            }
        ]),
        "mosaic_size": 1,
        "bg_alpha": 1.0
    }
    files = {"image": ("test.jpg", img_byte_arr, "image/jpeg")}
    response = requests.post(url, data=payload, files=files)
    if response.status_code == 200:
        print("  ✅ Success (Handled null)")
    else:
        print(f"  ❌ Failed with {response.status_code}: {response.text}")

    print("\n--- Done ---")

if __name__ == "__main__":
    test_api()
