# API Reference

## Base URL

```
http://localhost:8000
```

## Endpoints

---

### `GET /`

Health check.

**Response:**
```json
{ "status": "ok", "service": "BitBoy Lab API" }
```

---

### `GET /api/effects`

Returns all available effects with their parameter schemas.
Use this to dynamically generate form controls in your Next.js frontend.

**Response:** `200 OK` — array of effect descriptors

```json
[
  {
    "type": "DITHER",
    "label": "Dither",
    "description": "Apply pixel dithering using classic or error-diffusion patterns.",
    "params": {
      "size": "int 1–200 — dither cell size",
      "col": "str — dither color (hex)",
      "pattern": "str — pattern: Classic 2x2, Fine Grid, Floyd-Steinberg, Atkinson, Random",
      "blend": "str — blend mode: Normal, Overlay, Screen, Multiply, Difference, Exclusion"
    }
  },
  ...
]
```

---

### `POST /api/process`

Apply a layer stack to an uploaded image.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `image` | file | ✅ | JPEG or PNG image |
| `layers` | string (JSON) | ✅ | Array of layer config objects |
| `mosaic_size` | int | — | Mosaic block size (default: 1 = off) |
| `bg_alpha` | float | — | Source opacity 0.0–1.0 (default: 1.0) |

**`layers` JSON example:**
```json
[
  {
    "type": "DITHER",
    "enabled": true,
    "mode": "Above",
    "range": [0, 255],
    "blend": "Screen",
    "size": 4,
    "col": "#00ff41",
    "pattern": "Floyd-Steinberg"
  },
  {
    "type": "CRT",
    "enabled": true,
    "mode": "Above",
    "range": [0, 255],
    "blend": "Screen",
    "intensity": 80,
    "freq": 30,
    "col": "#00ff41"
  }
]
```

**Response:** `200 OK` — `image/jpeg` binary

**Error responses:**
- `400` — Image cannot be opened
- `400` — Invalid layers JSON

---

## Next.js Integration Example

```typescript
// lib/bitboy-lab.ts

export interface Layer {
  type: string
  enabled: boolean
  mode: 'Below' | 'Between' | 'Above'
  range: [number, number]
  blend: string
  [key: string]: unknown
}

export async function processImage(
  file: File,
  layers: Layer[],
  mosaicSize = 1,
  bgAlpha = 1.0,
): Promise<string> {
  const form = new FormData()
  form.append('image', file)
  form.append('layers', JSON.stringify(layers))
  form.append('mosaic_size', String(mosaicSize))
  form.append('bg_alpha', String(bgAlpha))

  const res = await fetch('http://localhost:8000/api/process', {
    method: 'POST',
    body: form,
  })

  if (!res.ok) throw new Error(await res.text())
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export async function getEffects() {
  const res = await fetch('http://localhost:8000/api/effects')
  return res.json()
}
```
