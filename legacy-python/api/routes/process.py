"""
bitboylab_boy.api.routes.process
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
POST /api/process — apply a layer stack to an uploaded image.

Request (multipart/form-data):
    image  : image file (JPEG / PNG)
    layers : JSON array of LayerConfig objects
    mosaic_size : int (optional, default 1 = off)
    bg_alpha    : float (optional, default 1.0)

Response:
    JPEG bytes (Content-Type: image/jpeg)
"""
from __future__ import annotations

import io
import json

from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image

from api.models import LayerConfig
from core.engine import Engine
from utils.image import apply_mosaic, image_to_bytes

router = APIRouter()


@router.post("/process")
async def process_image(
    image: UploadFile = File(...),
    texture: Optional[UploadFile] = File(None),
    layers: str = Form(default="[]"),
    mosaic_size: int = Form(default=1),
    bg_alpha: float = Form(default=1.0),
    global_scale: float = Form(default=1.0),
) -> Response:
    """Apply a layer stack to an uploaded image and return the result as JPEG.

    Args:
        image:       Uploaded image file (JPEG or PNG).
        layers:      JSON string representing a list of layer configs.
        mosaic_size: Mosaic block size applied to source before effects (1 = off).
        bg_alpha:    Source image opacity (0.0–1.0).

    Returns:
        JPEG-encoded processed image with Content-Type ``image/jpeg``.

    Raises:
        HTTPException 400: If the image cannot be opened or layers JSON is invalid.
    """
    # --- Parse image ---
    try:
        raw = await image.read()
        src = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cannot open image: {exc}") from exc

    # --- Parse texture (optional) ---
    tex_src: Optional[Image.Image] = None
    if texture:
        try:
            tex_raw = await texture.read()
            if tex_raw:
                tex_src = Image.open(io.BytesIO(tex_raw)).convert("RGBA")
                print(f"DEBUG: Texture loaded successfully: {tex_src.size} {tex_src.mode}")
            else:
                print("DEBUG: Texture part present but empty.")
        except Exception as exc:
            print(f"Texture load failed (skipping): {exc}")

    # --- Parse layer configs ---
    try:
        raw_layers: list[dict] = json.loads(layers)
        layer_dicts = [
            LayerConfig(**l).model_dump(exclude_none=True) for l in raw_layers
        ]
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid layers JSON: {exc}") from exc

    orig_src = src.copy()

    # --- Apply source mosaic ---
    processed_src = apply_mosaic(src, mosaic_size) if mosaic_size > 1 else src

    # --- Apply global scale to size-related params ---
    if global_scale != 1.0:
        size_keys = ("size", "freq", "thickness", "intensity", "min_len", "max_len", "ox", "oy", "tile_size", "block_size")
        for ld in layer_dicts:
            for k in size_keys:
                if k in ld and isinstance(ld[k], (int, float)):
                    ld[k] = max(1, int(round(ld[k] * global_scale)))

    # --- Render ---
    try:
        result = Engine.render(
            source=processed_src,
            layers=layer_dicts,
            orig_source=orig_src,
            texture_img=tex_src,
        )
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Rendering failed: {exc}") from exc

    # --- Encode and return ---
    output_bytes = image_to_bytes(result, fmt="JPEG", quality=95)
    return Response(
        content=output_bytes,
        media_type="image/jpeg",
        headers={"Content-Disposition": "attachment; filename=processed_image.jpg"},
    )
