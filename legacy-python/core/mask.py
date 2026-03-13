"""
bitboylab_boy.core.mask
~~~~~~~~~~~~~~~~~~~~~
Mask generation from a source image.

The mask determines *which pixels* a given effect layer will touch,
based on luminance threshold ranges.

Modes
-----
Below   : pixels whose luminance is within [low, high] — rendered *behind* the source.
Between : pixels within [low, high] — composited at the same level as the source.
Above   : pixels within [low, high] — rendered *above* everything else.

Note: All three modes use the same threshold logic. The spatial compositing
order (below / between / above) is controlled by the Engine render pipeline.
"""
from __future__ import annotations

import numpy as np
from PIL import Image


def get_mask(
    img: Image.Image,
    r_range: tuple[int, int],
    gray_arr: np.ndarray | None = None,
) -> np.ndarray:
    """Return a boolean mask for pixels within a luminance threshold range.

    Args:
        img:      Source image (converted to grayscale if gray_arr is None).
        r_range:  (low, high) thresholds.
        gray_arr: Optional pre-calculated grayscale NumPy array (uint8).

    Returns:
        Boolean NumPy array (H, W).
    """
    if gray_arr is None:
        gray_arr = np.array(img.convert("L"))

    low, high = r_range
    return (gray_arr >= low) & (gray_arr <= high)
