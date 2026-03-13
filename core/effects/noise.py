import numpy as np
from PIL import Image
import random as _random

def apply_noise(
    img: Image.Image,
    mask: np.ndarray,
    amount: float = 0.2,
    noise_type: str = "Uniform",
    seed: int = 42
) -> Image.Image:
    """
    Adds digital noise or VHS-style interference to the image.
    Only applies where the mask is active.
    """
    rng = np.random.default_rng(seed)
    w, h = img.size
    
    # Ensure input is RGBA for blending
    img_rgba = img.convert("RGBA")
    arr = np.array(img_rgba).astype(np.float32)
    
    # Create the noise overlay (fully transparent by default)
    noise_overlay = np.zeros_like(arr)
    
    # Map amount 0-1 to something visible: 0-255 impact
    intensity = amount * 255
    
    if noise_type == "Uniform":
        noise = rng.uniform(-intensity, intensity, (h, w, 3))
        noise_overlay[..., :3] = noise
        
    elif noise_type == "Gaussian":
        noise = rng.standard_normal((h, w, 3)) * intensity
        noise_overlay[..., :3] = noise

    elif noise_type == "VHS":
        # 1. Base Grain & Salt-and-Pepper Snow (Sparkles)
        grain_intensity = intensity * 0.3
        # Apply base greyscale grain
        grain = rng.uniform(-grain_intensity, grain_intensity, (h, w, 1))
        noise_overlay[..., :3] = grain
        
        # Salt & Pepper Sparkles (Increased density)
        sparkle_mask = rng.random((h, w)) < (amount * 0.05)
        if np.any(sparkle_mask):
            sparkle_vals = rng.choice([0.0, 255.0], size=np.count_nonzero(sparkle_mask))
            for c in range(3):
                noise_overlay[sparkle_mask, c] = sparkle_vals

        # 2. Aggressive Tracking Bands (Thick horizontal static bands like Bild 3)
        num_bands = int(amount * 3) + 1
        for _ in range(num_bands):
            # Target a thicker region (5-15% of screen height)
            band_h = int(h * (0.05 + rng.random() * 0.1) * amount) + 5
            band_y = rng.integers(0, max(1, h - band_h))
            e_y = min(h, band_y + band_h)
            
            # High density white/black static
            snow_density = 0.5 + rng.random() * 0.4
            band_mask = rng.random((e_y - band_y, w)) < snow_density
            if np.any(band_mask):
                # Favor white over black for snow
                snow_vals = rng.choice([0.0, 255.0], size=np.count_nonzero(band_mask), p=[0.3, 0.7])
                band_area = noise_overlay[band_y:e_y, :, :3]
                for c in range(3):
                    band_area[band_mask, c] = snow_vals
        
        # 3. Horizontal Signal Tears (Jitter)
        num_tears = int(intensity / 10) + 1
        for _ in range(num_tears):
            y = rng.integers(0, h)
            tear_h = rng.integers(1, 4)
            color_bias = np.array([155.0 * amount, 0.0, 0.0]) if rng.random() > 0.5 else np.array([0.0, 0.0, 155.0 * amount])
            
            e_y = min(h, y + tear_h)
            noise_overlay[y:e_y, :, :3] += color_bias

    # Apply mask: only show noise where mask is True
    # We set alpha based on whether the mask is true
    noise_overlay[..., 3] = (mask * 255).astype(np.uint8)
    
    # Add noise to original array (clipping is handled by blending or final convert)
    # Actually, for a layer, it's better if we just return the noise variation
    # But often "noise" is additive to the base. 
    # To keep it consistent with our layer system, we return the NEW image:
    final_arr = arr.copy()
    final_arr[..., :3] += noise_overlay[..., :3]
    final_arr = np.clip(final_arr, 0, 255).astype(np.uint8)
    
    # We return the whole image masked by the threshold
    out = Image.fromarray(final_arr, "RGBA")
    # Apply alpha mask
    alpha = Image.fromarray((mask * 255).astype(np.uint8), "L")
    out.putalpha(alpha)
    
    return out
