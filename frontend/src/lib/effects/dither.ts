import { LayerConfig } from "../../types";
import { hexToRgb } from "../color";
import { getLuminance } from "../mask";

const DITHER_PATTERNS: Record<string, number[][]> = {
    "Classic 2x2": [
        [0, 128],
        [192, 64]
    ],
    "Fine Grid": [
        [0, 192, 48, 240],
        [128, 64, 176, 112],
        [32, 224, 16, 208],
        [160, 96, 144, 80]
    ]
};

/**
 * Replicates bitboylab_boy.core.effects.dither
 */
export function applyDither(
    sourceImageData: ImageData,
    layer: LayerConfig
): ImageData {
    const size = layer.size !== undefined ? Math.max(1, Number(layer.size)) : 4;
    const colorHex = layer.col as string || "#00ff41";
    const patternType = layer.pattern as string || "Classic 2x2";
    
    const { width, height, data } = sourceImageData;
    const outData = new Uint8ClampedArray(width * height * 4);
    const [rStr, gStr, bStr] = hexToRgb(colorHex);

    // 1. Convert source to grayscale 2D pseudo array representation for error diffusion
    // We scale by block size (s) first if needed, but Python loops in jumps of `s`
    // Wait, Python's dither loops over `y in range(0, h, s)` and `x in range(0, w, s)`.
    // And error jumps by `s`. We need a Float32Array for accumulation.
    
    const gray = new Float32Array(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        gray[j] = getLuminance(data[i], data[i + 1], data[i + 2]);
    }

    const setBlock = (y: number, x: number, s: number, r: number, g: number, b: number) => {
        for (let dy = 0; dy < s; dy++) {
            const py = y + dy;
            if (py >= height) continue;
            for (let dx = 0; dx < s; dx++) {
                const px = x + dx;
                if (px >= width) continue;
                const idx = (py * width + px) * 4;
                outData[idx] = r;
                outData[idx + 1] = g;
                outData[idx + 2] = b;
                outData[idx + 3] = 255;
            }
        }
    };

    if (patternType === "Floyd-Steinberg") {
        for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
                const idx = y * width + x;
                const oldP = gray[idx];
                const newP = oldP > 127 ? 255 : 0;
                gray[idx] = newP;
                
                if (newP === 255) {
                    setBlock(y, x, size, rStr, gStr, bStr);
                }
                
                const err = oldP - newP;
                if (x + size < width) gray[y * width + (x + size)] += err * 7 / 16;
                if (y + size < height) {
                    const nextRow = (y + size) * width;
                    if (x - size >= 0) gray[nextRow + (x - size)] += err * 3 / 16;
                    gray[nextRow + x] += err * 5 / 16;
                    if (x + size < width) gray[nextRow + (x + size)] += err * 1 / 16;
                }
            }
        }
    } else if (patternType === "Atkinson") {
        for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
                const idx = y * width + x;
                const oldP = gray[idx];
                const newP = oldP > 127 ? 255 : 0;
                gray[idx] = newP;

                if (newP === 255) {
                    setBlock(y, x, size, rStr, gStr, bStr);
                }

                const err = (oldP - newP) / 8.0;
                
                const neighbors = [
                    [y, x + size],
                    [y, x + 2 * size],
                    [y + size, x - size],
                    [y + size, x],
                    [y + size, x + size],
                    [y + 2 * size, x]
                ];
                
                for (const [ny, nx] of neighbors) {
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        gray[ny * width + nx] += err;
                    }
                }
            }
        }
    } else if (patternType === "Random") {
        // Pseudo noise threshold
        for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
                const threshold = Math.random() * 256;
                if (gray[y * width + x] > threshold) {
                    setBlock(y, x, size, rStr, gStr, bStr);
                }
            }
        }
    } else if (DITHER_PATTERNS[patternType]) {
        // Ordered Bayer
        const pattern = DITHER_PATTERNS[patternType];
        const ph = pattern.length;
        const pw = pattern[0].length;

        for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
                const pY = (y / size) % ph;
                const pX = (x / size) % pw;
                const threshold = pattern[pY][pX];
                
                if (gray[y * width + x] > threshold) {
                    setBlock(y, x, size, rStr, gStr, bStr);
                }
            }
        }
    }

    return new ImageData(outData, width, height);
}
