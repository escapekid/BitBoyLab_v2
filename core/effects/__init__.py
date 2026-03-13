"""
bitboylab_boy.core.effects
~~~~~~~~~~~~~~~~~~~~~~~~
Individual image effect implementations.
"""
from .ascii_art import apply_ascii, CHAR_SETS
from .crt import apply_crt
from .dither import apply_dither, ALL_DITHER_PATTERNS, DITHER_PATTERNS
from .edge_detect import apply_edge_detect
from .glitch import apply_glitch
from .pixel_sort import apply_pixel_sort

__all__ = [
    "apply_ascii", "CHAR_SETS",
    "apply_crt",
    "apply_dither", "ALL_DITHER_PATTERNS", "DITHER_PATTERNS",
    "apply_edge_detect",
    "apply_glitch",
    "apply_pixel_sort",
]
