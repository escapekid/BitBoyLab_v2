# BitBoy Lab

> **Layered image-processing engine** — ASCII art, Dithering, CRT scanlines, JPEG Glitch, Pixel Sort, Edge Detect.
> Built for Streamlit UI and Next.js frontend integration via FastAPI.

---

## Architecture

```
bitboy-lab/
├── core/
│   ├── engine.py          # Layer orchestration & render pipeline
│   ├── blend.py           # Blending modes (Normal, Multiply, Screen, Overlay, Difference, Exclusion)
│   ├── mask.py            # Luminance-threshold mask generation
│   └── effects/
│       ├── ascii_art.py   # ASCII art renderer (5 charsets, brightness/random mapping)
│       ├── crt.py         # CRT scanline + displacement + tint
│       ├── dither.py      # Floyd-Steinberg, Atkinson, Random, Classic 2×2, Fine Grid
│       ├── edge_detect.py # Sobel edge detection with dilation
│       ├── glitch.py      # JPEG data-corruption glitch
│       └── pixel_sort.py  # Row/column pixel sorting by brightness, hue, saturation
├── utils/
│   ├── color.py           # hex_to_rgb() utility
│   └── image.py           # apply_mosaic(), get_font_bytes(), image_to_bytes()
├── api/
│   ├── main.py            # FastAPI app (CORS-ready for Next.js)
│   ├── models.py          # Pydantic v2 request/response schemas
│   └── routes/
│       ├── process.py     # POST /api/process
│       └── effects.py     # GET  /api/effects
├── scripts/
│   ├── cli.py             # Command-line interface
│   └── test_engine.py     # Sanity-check all 6 effects
├── docs/                  # Detailed documentation
├── app.py                 # Streamlit UI
├── requirements.txt
└── pyproject.toml
```

---

## Installation

```bash
git clone https://github.com/hrdwre/bitboy-lab.git
cd bitboy-lab

python3 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

pip3 install -r requirements.txt
```

---

## Usage

### Streamlit UI

```bash
streamlit run app.py
```

Open [http://localhost:8501](http://localhost:8501) — upload an image, click effect buttons, adjust sliders, export.

### Python API

```python
from PIL import Image
from bitboy-lab.core.engine import Engine

img = Image.open("photo.jpg")

layers = [
    {
        "type": "DITHER", "enabled": True, "mode": "Above",
        "range": (0, 255), "blend": "Screen",
        "size": 4, "col": "#00ff41", "pattern": "Floyd-Steinberg",
    },
    {
        "type": "CRT", "enabled": True, "mode": "Above",
        "range": (0, 255), "blend": "Screen",
        "intensity": 80, "freq": 30, "col": "#00ff41",
    },
]

result = Engine.render(img, layers=layers, bg_alpha=1.0)
result.save("output.jpg")
```

### FastAPI (for Next.js)

```bash
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Health check |
| `/api/effects` | GET | List all effects + params (for dynamic UI) |
| `/api/process` | POST | Apply layer stack to uploaded image → JPEG |
| `/docs` | GET | Interactive Swagger UI |

**Next.js fetch example:**
```typescript
const form = new FormData()
form.append("image", file)
form.append("layers", JSON.stringify(layers))
form.append("mosaic_size", "1")
form.append("bg_alpha", "1.0")

const res = await fetch("http://localhost:8000/api/process", {
  method: "POST",
  body: form,
})
const blob = await res.blob()
```

### CLI

```bash
# Apply dither + CRT
python3 scripts/cli.py --input photo.jpg --output result.jpg --effects dither crt

# Mosaic + glitch + edge
python3 scripts/cli.py -i photo.jpg -o out.jpg --effects glitch edge --mosaic 8

# List effects
python3 scripts/cli.py --list-effects
```

---

## Effects Reference

| Effect | Key param | Notes |
|---|---|---|
| **ASCII** | `size`, `charset`, `mapping` | 5 charsets, brightness or random mapping |
| **Dither** | `pattern`, `size`, `col` | 5 algorithms incl. Floyd-Steinberg, Atkinson |
| **CRT** | `intensity`, `freq`, `col` | Scanlines + row displacement + tint |
| **Glitch** | `amount`, `quality`, `seed` | JPEG data corruption |
| **Pixel Sort** | `direction`, `sort_by` | Row/col sort by brightness/hue/saturation |
| **Edge Detect** | `sensitivity`, `thickness` | Sobel operator, vectorised |

See [`docs/effects.md`](docs/effects.md) for full parameter reference.

---

## Tests

```bash
python3 scripts/test_engine.py
```

Expected output:
```
  ✅  DITHER       passed  (output: (100, 100) RGBA)
  ✅  CRT          passed  (output: (100, 100) RGBA)
  ...
All 6 effects passed.
```

---

## Performance Notes

- Edge detect and CRT displacement are **fully vectorised** (NumPy).
- Pixel Sort and dithering use **row-level NumPy** — bottleneck on large images.
- Future: annotate hot loops with **Numba `@jit`** for 10–50× speed-up.
- GPU: swap NumPy arrays for **CuPy** arrays — API is fully compatible.

---

## License

MIT © HRDWRE
