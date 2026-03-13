/**
 * Replicates the Python backend `core.mask.get_mask` logic.
 * Calculates luminance for each pixel and checks if it falls within the [low, high] range.
 */

export function getLuminance(r: number, g: number, b: number): number {
    // Standard relative luminance (or simple average depending on Python backend implementation)
    // Python backend uses `img.convert("L")` which uses standard PIL L-mode: L = R * 299/1000 + G * 587/1000 + B * 114/1000
    return Math.round(r * 0.299 + g * 0.587 + b * 0.114);
}

/**
 * Returns a Uint8Array (boolean mask) of size width * height.
 * 1 means the pixel is inside the luminance threshold range.
 * 0 means it is outside.
 */
export function getMask(
    imageData: ImageData,
    range: [number, number]
): Uint8Array {
    const { data, width, height } = imageData;
    const mask = new Uint8Array(width * height);
    const [low, high] = range;

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const luma = getLuminance(data[i], data[i + 1], data[i + 2]);
        if (luma >= low && luma <= high) {
            mask[j] = 1;
        } else {
            mask[j] = 0;
        }
    }

    return mask;
}

/**
 * In-place modifies the imageData to set Alpha = 0 where mask is 0.
 * Useful for applying the mask directly to an effect layer before blending.
 */
export function applyMaskToAlpha(
    imageData: ImageData,
    mask: Uint8Array | null,
    globalOpacity: number = 1.0
): void {
    const data = imageData.data;
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        if (mask && mask[j] === 0) {
            data[i + 3] = 0;
        } else {
            data[i + 3] = Math.round(data[i + 3] * globalOpacity);
        }
    }
}

/**
 * Extracts the alpha channel from ImageData as a Uint8Array (0-255).
 */
export function getAlphaMask(imageData: ImageData): Uint8Array {
    const { data, width, height } = imageData;
    const mask = new Uint8Array(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        mask[j] = data[i + 3];
    }
    return mask;
}

/**
 * Multiplies the alpha channel of targetImageData by the provided mask (0-255).
 * Acts like a clipping mask.
 */
export function applyAlphaMask(
    targetImageData: ImageData,
    mask: Uint8Array
): void {
    const data = targetImageData.data;
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const maskAlpha = mask[j] / 255;
        data[i + 3] = Math.round(data[i + 3] * maskAlpha);
    }
}
