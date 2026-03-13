"""
bitboylab_boy.core.effects.pixel_sort
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Pixel-sorting effect: sort pixel columns or rows by luminance, hue, or saturation.

Algorithm
---------
1. For each row (or column after transpose for vertical), find contiguous
   segments of True pixels in the mask.
2. Compute a sort key (brightness / hue / saturation) for each segment.
3. Sort pixels in the segment by the key and write back.

Performance
-----------
- Operations are per-row, so the outer loop is O(H).
- Each row uses vectorised NumPy operations for key computation and argsort.
- Bottleneck: segment finding + argsort for very wide images with many segments.
  Future optimisation: Numba @jit on the inner loop.
"""
from __future__ import annotations

import numpy as np
from PIL import Image


def apply_pixel_sort(
    img: Image.Image,
    mask: np.ndarray,
    direction: str = "Horizontal",
    sort_by: str = "Brightness",
    reverse: bool = False,
    min_len: int = 10,
    max_len: int = 10000,
    randomness: float = 0.0,
    sort_only: bool = False,
) -> Image.Image:
    """Sort pixels within masked segments along rows or columns.

    Args:
        img:        Source image (any mode).
        mask:       Boolean NumPy array (H, W).
        direction:  ``"Horizontal"`` (row-wise) or ``"Vertical"`` (column-wise).
        sort_by:    Sort key: ``"Brightness"``, ``"Hue"``, or ``"Saturation"``.
        reverse:    If ``True``, sort descending.
        min_len:    Minimum segment length to sort (segments shorter skipped).
        max_len:    Maximum segment length to sort (segments longer skipped).
        randomness: 0–100. Probability (%) of skipping a segment randomly.
        sort_only:  If ``True``, non-sorted pixels become transparent.

    Returns:
        RGBA image with sorted pixels in mask, original (or transparent) outside.
    """
    arr = np.array(img.convert("RGBA"))
    h, w, _ = arr.shape
    out = np.zeros_like(arr) if sort_only else arr.copy()
    mask_arr = mask.astype(bool)

    # Treat vertical as horizontal on a transposed array
    if direction == "Vertical":
        arr = np.transpose(arr, (1, 0, 2))
        out = np.transpose(out, (1, 0, 2))
        mask_arr = mask_arr.T
        h, w = w, h

    for y in range(h):
        row = arr[y]
        row_mask = mask_arr[y]
        if not np.any(row_mask):
            continue

        # Find start/end indices of contiguous True segments
        padded = np.concatenate([[False], row_mask, [False]])
        starts = np.where(~padded[:-1] & padded[1:])[0]
        ends = np.where(padded[:-1] & ~padded[1:])[0]

        for start, end in zip(starts, ends):
            length = end - start
            if length < 2 or length < min_len or length > max_len:
                continue
            # Stable randomness: use position hash for reproducibility
            if randomness > 0:
                import zlib
                seg_seed = zlib.adler32(f"{y}_{start}_{length}".encode()) % 100
                if seg_seed < randomness:
                    continue

            segment = row[start:end]
            sort_vals = _compute_sort_values(segment, sort_by)
            indices = np.argsort(sort_vals)
            if reverse:
                indices = indices[::-1]
            out[y, start:end] = segment[indices]

    if direction == "Vertical":
        out = np.transpose(out, (1, 0, 2))

    return Image.fromarray(out, "RGBA")


def _compute_sort_values(segment: np.ndarray, sort_by: str) -> np.ndarray:
    """Compute a 1-D sort key array for an RGBA pixel segment.

    Args:
        segment: NumPy array of shape (N, 4) with RGBA values.
        sort_by: One of ``"Brightness"``, ``"Hue"``, ``"Saturation"``.

    Returns:
        Float32 array of shape (N,) to pass to ``np.argsort``.
    """
    rgb = segment[:, :3].astype(np.float32)

    if sort_by == "Brightness":
        # Standard luminance weights (BT.601)
        return 0.299 * rgb[:, 0] + 0.587 * rgb[:, 1] + 0.114 * rgb[:, 2]

    elif sort_by == "Hue":
        # Vectorised hue computation (0–6 range)
        r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
        mx = np.max(rgb, axis=1)
        mn = np.min(rgb, axis=1)
        diff = mx - mn
        h_vals = np.zeros(len(segment), dtype=np.float32)
        nonzero = diff != 0
        mask_r = nonzero & (mx == r)
        mask_g = nonzero & (mx == g) & ~mask_r
        mask_b = nonzero & (mx == b) & ~(mask_r | mask_g)
        h_vals[mask_r] = (g[mask_r] - b[mask_r]) / (diff[mask_r] + 1e-5)
        h_vals[mask_g] = 2.0 + (b[mask_g] - r[mask_g]) / (diff[mask_g] + 1e-5)
        h_vals[mask_b] = 4.0 + (r[mask_b] - g[mask_b]) / (diff[mask_b] + 1e-5)
        return h_vals % 6.0

    elif sort_by == "Saturation":
        mx = np.max(rgb, axis=1)
        mn = np.min(rgb, axis=1)
        return (mx - mn) / (mx + 1e-5)

    return np.zeros(len(segment), dtype=np.float32)
