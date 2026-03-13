"""
bitboylab_boy.utils.color
~~~~~~~~~~~~~~~~~~~~~~~
Color conversion utilities used across all effect modules.
"""


def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    """Convert a hex color string to an (R, G, B) integer tuple.

    Args:
        hex_str: A hex color string, with or without leading '#'.
                 e.g. ``"#00ff41"`` or ``"00ff41"``.

    Returns:
        A tuple of three ints in range [0, 255].

    Example:
        >>> hex_to_rgb("#00ff41")
        (0, 255, 65)
    """
    h = hex_str.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
