import { LayerConfig } from "@/types";
import { hexToRgb } from "../color";

export function applyCRT(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: LayerConfig
): void {
    const intensity = config.intensity !== undefined ? Number(config.intensity) : 10;
    const frequency = config.freq !== undefined ? Number(config.freq) : 50;
    const colorHex = config.col ?? "#00ff00";
    const offsetY = config.oy !== undefined ? Number(config.oy) : 0;
    // top: 0 = no vignette, 100 = strong top-screen darkening (CRT phosphor burn)
    const topVignette = config.top !== undefined ? Number(config.top) / 100 : 0;

    const rgb = hexToRgb(colorHex);

    // Read original image
    const imageData = ctx.getImageData(0, 0, width, height);
    const src = new Uint8ClampedArray(imageData.data); // snapshot for clean reads
    const dst = imageData.data;

    // freq: 1 = very thick (period ~100px), 100 = thin (period ~2px)
    // Using exponential so low freq values give thick blocks
    const period = 2 + Math.pow((101 - frequency) / 10, 2);
    const freqFactor = (Math.PI * 2) / period;

    // prominence: how dark are the scanline gaps (0..1)
    const prominence = Math.min(1, intensity / 255 * 1.5);

    // OY: wave amplitude in pixels
    const waveAmplitude = offsetY; // direct pixel shift, 0 = no wave

    for (let y = 0; y < height; y++) {
        // --- Wave displacement (applies to ALL rows, regardless of scanline) ---
        // sin wave scrolls diagonally → creates wavy scanlines
        const waveX = waveAmplitude > 0
            ? Math.round(Math.sin(y / 30) * waveAmplitude)
            : 0;

        // --- Scanline pattern ---
        // sinVal in [-1, 1]. Values near -1 are the "dark gap" rows.
        const sinVal = Math.sin(y * freqFactor);
        // Map to darkness: sin=-1 → dark gap (lineDarkness=prominence), sin=+1 → no darkening
        const lineDarkness = prominence * Math.max(0, -(sinVal)); // 0..prominence

        for (let x = 0; x < width; x++) {
            // Source pixel (with wave shift)
            let sx = x + waveX;
            if (sx < 0) sx += width;
            if (sx >= width) sx -= width;

            const si = (y * width + sx) * 4;
            const di = (y * width + x) * 4;

            const r = src[si];
            const g = src[si + 1];
            const b = src[si + 2];

            // Mix original color with tint, then darken by lineDarkness
            const tr = r * 0.75 + rgb[0] * 0.25;
            const tg = g * 0.75 + rgb[1] * 0.25;
            const tb = b * 0.75 + rgb[2] * 0.25;

            // --- Top + bottom vignette (CRT phosphor edge darkening) ---
            let vignetteMultiplier = 1.0;
            if (topVignette > 0) {
                // Top falloff: top 30% of pixels fade, strength controlled by topVignette
                const topZone = height * 0.30;
                if (y < topZone) {
                    const t = 1 - (y / topZone); // 1 at very top, 0 at edge of zone
                    vignetteMultiplier *= 1 - (t * t * topVignette * 0.85);
                }
                // Subtle bottom falloff (half of top strength)
                const bottomZone = height * 0.15;
                const fromBottom = height - 1 - y;
                if (fromBottom < bottomZone) {
                    const b = 1 - (fromBottom / bottomZone);
                    vignetteMultiplier *= 1 - (b * b * topVignette * 0.45);
                }
            }

            dst[di]     = tr * (1 - lineDarkness) * vignetteMultiplier;
            dst[di + 1] = tg * (1 - lineDarkness) * vignetteMultiplier;
            dst[di + 2] = tb * (1 - lineDarkness) * vignetteMultiplier;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}
