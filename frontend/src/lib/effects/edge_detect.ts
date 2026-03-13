import { LayerConfig } from "../../types";
import { hexToRgb } from "../color";
import { getLuminance } from "../mask";

/**
 * Replicates bitboylab_boy.core.effects.edge_detect.
 * Sobel-based edge detection.
 */
export function applyEdgeDetect(
    sourceImageData: ImageData,
    layer: LayerConfig
): ImageData {
    const sensitivity = layer.sensitivity !== undefined ? Number(layer.sensitivity) : 50;
    const thickness = layer.thickness !== undefined ? Number(layer.thickness) : 1;
    const colorHex = layer.color as string || "#ffffff";
    const [rStr, gStr, bStr] = hexToRgb(colorHex);

    const { width, height, data } = sourceImageData;
    const outData = new Uint8ClampedArray(width * height * 4);

    // 1. Convert to Grayscale (1D array for easier index math)
    const gray = new Float32Array(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        gray[j] = getLuminance(data[i], data[i + 1], data[i + 2]);
    }

    // 2. Sobel Gradient & Magnitude
    // We compute gradients skipping the 1px border like the Python numpy advanced slicing
    const mag = new Float32Array(width * height);
    let maxMag = 0;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            // Simplified Sobel / Cross differences
            const gx = gray[idx + 1] - gray[idx - 1];
            const gy = gray[idx + width] - gray[idx - width];
            
            const currentMag = Math.sqrt(gx * gx + gy * gy);
            mag[idx] = currentMag;
            if (currentMag > maxMag) maxMag = currentMag;
        }
    }

    // Normalize magnitude to 0-255 if maxMag > 0
    if (maxMag > 0) {
        for (let i = 0; i < mag.length; i++) {
            mag[i] = (mag[i] / maxMag) * 255.0;
        }
    }

    // 3. Thresholding
    // Map sensitivity [0, 100] -> threshold [255, 0]
    const threshold = (101 - sensitivity) * 2.55;
    let edges = new Uint8Array(width * height);
    
    for (let i = 0; i < mag.length; i++) {
        edges[i] = mag[i] > threshold ? 1 : 0;
    }

    // 4. Dilation for thickness
    if (thickness > 1) {
        for (let t = 0; t < thickness - 1; t++) {
            const dilated = new Uint8Array(edges);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = y * width + x;
                    if (edges[idx] === 1) {
                        if (x < width - 1) dilated[idx + 1] = 1; // shift right
                        if (x > 0) dilated[idx - 1] = 1; // shift left
                        if (y < height - 1) dilated[idx + width] = 1; // shift down
                        if (y > 0) dilated[idx - width] = 1; // shift up
                    }
                }
            }
            edges = dilated;
        }
    }

    // 5. Build RGBA Output
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        if (edges[j] === 1) {
            outData[i] = rStr;
            outData[i + 1] = gStr;
            outData[i + 2] = bStr;
            outData[i + 3] = 255; // Fully opaque edges
        } else {
            outData[i] = 0;
            outData[i + 1] = 0;
            outData[i + 2] = 0;
            outData[i + 3] = 0; // Transparent background
        }
    }

    return new ImageData(outData, width, height);
}
