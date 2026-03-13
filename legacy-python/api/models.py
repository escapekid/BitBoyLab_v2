"""
bitboylab_boy.api.models
~~~~~~~~~~~~~~~~~~~~~~
Pydantic v2 request and response models for the BitBoy Lab REST API.
"""
from __future__ import annotations

from typing import Optional, Union
from pydantic import BaseModel, Field


class LayerConfig(BaseModel):
    """Configuration for a single effect layer."""

    type: str = Field(
        ...,
        description="Effect type: ASCII | DITHER | CRT | GLITCH | PIXEL_SORT | EDGE | TEXTURE | SOURCE | HALFTONE | POSTERIZE",
    )
    enabled: bool = Field(True, description="Whether this layer is active.")
    range: tuple[int, int] = Field(
        (0, 255),
        description="Luminance threshold range [low, high] in [0, 255].",
    )
    blend: str = Field(
        "Normal",
        description="Blend mode: Normal | Multiply | Screen | Overlay | Difference | Exclusion | Soft Light | Subtractive",
    )

    # ASCII params
    size: int | None = None
    sample: str | None = None
    mapping: str | None = None
    f_col: str | None = None
    bg_mode: str | None = None
    bg_col: str | None = None
    set: str | None = None
    ox: int | None = None
    oy: int | None = None
    soft_mask: bool | None = None

    # Dither / Halftone params
    col: str | None = None
    pattern: str | None = None
    dot_scale: float | None = None
    method: str | None = None

    # CRT params
    intensity: int | None = None
    freq: int | None = None

    # Glitch/Noise/Texture params
    amount: float | None = None
    quality: int | None = None
    seed: int | None = None
    noise_type: str | None = None
    invert: bool | None = None
    opacity: float | None = None
    scale: float | None = None
    rotation: int | None = None
    repeat: bool | None = None
    luma_alpha: bool | None = None
    ignore_mosaic: bool | None = None
    mosaic: int | None = None
    clipped: bool | None = False

    # Posterize params
    levels: int | None = None

    # Edge params
    sensitivity: int | None = None
    thickness: int | None = None
    color: str | None = None

    # Gradient Map params
    col0: str | None = None
    pos0: int | None = None
    col1: str | None = None
    pos1: int | None = None
    col2: str | None = None
    pos2: int | None = None
    col3: str | None = None
    pos3: int | None = None
    syncHarmony: bool | None = True
    num_colors: int | None = 4
    
    # Levels & Threshold
    black_lift: int | None = 0
    mid_point: float | None = 1.0
    white_point: int | None = 255
    threshold_val: int | None = 128

    # Pixel sort params
    direction: str | None = None
    sort_by: str | None = None
    reverse: bool | None = None
    min_len: int | None = None
    max_len: int | None = None
    randomness: float | None = None
    sort_only: bool | None = None

    model_config = {"extra": "allow"}


class EffectSchema(BaseModel):
    """Describes an available effect and its parameters."""

    type: str
    label: str
    description: str
    params: dict[str, str]
