import { LayerConfig } from "@/types";

export function applyPixelSort(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: LayerConfig,
    layerMask: Uint8Array
): void {
    const direction = config.direction ?? "Horizontal";
    const sortBy = config.sort_by ?? "Brightness";
    const reverse = config.reverse ?? false;
    const minLen = config.min_len !== undefined ? Number(config.min_len) : 10;
    const maxLen = config.max_len !== undefined ? Number(config.max_len) : 10000;
    const randomness = config.randomness !== undefined ? Number(config.randomness) : 0.0;
    const sortOnly = config.sort_only ?? false;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Create an output buffer. If sort_only is true, it starts fully transparent
    const outData = new Uint8ClampedArray(data.length);
    if (!sortOnly) {
        outData.set(data);
    } // else leaves it as 0s (transparent)

    const getSortValue = (r: number, g: number, b: number): number => {
        if (sortBy === "Hue") {
            const mx = Math.max(r, g, b);
            const mn = Math.min(r, g, b);
            const diff = mx - mn;
            if (diff === 0) return 0;
            let h = 0;
            if (mx === r) {
                h = (g - b) / diff;
            } else if (mx === g) {
                h = 2.0 + (b - r) / diff;
            } else {
                h = 4.0 + (r - g) / diff;
            }
            return (h < 0 ? h + 6.0 : h) % 6.0;
        } else if (sortBy === "Saturation") {
            const mx = Math.max(r, g, b);
            const mn = Math.min(r, g, b);
            return mx === 0 ? 0 : (mx - mn) / mx;
        }
        // Default: Brightness (BT.601)
        return 0.299 * r + 0.587 * g + 0.114 * b;
    };

    if (direction === "Horizontal") {
        for (let y = 0; y < height; y++) {
            let inSegment = false;
            let startX = 0;

            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const isMasked = layerMask[idx] > 0;

                if (isMasked && !inSegment) {
                    // Start of a segment
                    inSegment = true;
                    startX = x;
                }
                
                // End of a segment if we are in one, and either:
                // 1) This pixel is unmasked
                // 2) We reached the end of the image width
                if (inSegment && (!isMasked || x === width - 1)) {
                    inSegment = false;
                    const endX = isMasked ? width : x;
                    const length = endX - startX;

                    if (length >= Math.max(2, minLen) && length <= maxLen) {
                        if (randomness === 0 || Math.random() > randomness) {
                            // Sort this segment
                            const segmentMap = [];
                            for (let sx = startX; sx < endX; sx++) {
                                const pxIdx = (y * width + sx) * 4;
                                const r = data[pxIdx];
                                const g = data[pxIdx + 1];
                                const b = data[pxIdx + 2];
                                const a = data[pxIdx + 3];
                                const val = getSortValue(r, g, b);
                                segmentMap.push({ r, g, b, a, val });
                            }

                            segmentMap.sort((a, b) => reverse ? b.val - a.val : a.val - b.val);

                            for (let sx = startX; sx < endX; sx++) {
                                const pxIdx = (y * width + sx) * 4;
                                const sortedPx = segmentMap[sx - startX];
                                outData[pxIdx] = sortedPx.r;
                                outData[pxIdx + 1] = sortedPx.g;
                                outData[pxIdx + 2] = sortedPx.b;
                                outData[pxIdx + 3] = sortedPx.a;
                            }
                        } else if (sortOnly) {
                            // If skipped and sortOnly, skipped segments remain transparent
                        }
                    }
                }
            }
        }
    } else {
        // Vertical
        for (let x = 0; x < width; x++) {
            let inSegment = false;
            let startY = 0;

            for (let y = 0; y < height; y++) {
                const idx = y * width + x;
                const isMasked = layerMask[idx] > 0;

                if (isMasked && !inSegment) {
                    inSegment = true;
                    startY = y;
                }
                
                // End of a segment if we are in one, and either:
                // 1) This pixel is unmasked
                // 2) We reached the end of the image height
                if (inSegment && (!isMasked || y === height - 1)) {
                    inSegment = false;
                    const endY = isMasked ? height : y;
                    const length = endY - startY;

                    if (length >= Math.max(2, minLen) && length <= maxLen) {
                        if (randomness === 0 || Math.random() > randomness) {
                            const segmentMap = [];
                            for (let sy = startY; sy < endY; sy++) {
                                const pxIdx = (sy * width + x) * 4;
                                const r = data[pxIdx];
                                const g = data[pxIdx + 1];
                                const b = data[pxIdx + 2];
                                const a = data[pxIdx + 3];
                                const val = getSortValue(r, g, b);
                                segmentMap.push({ r, g, b, a, val });
                            }

                            segmentMap.sort((a, b) => reverse ? b.val - a.val : a.val - b.val);

                            for (let sy = startY; sy < endY; sy++) {
                                const pxIdx = (sy * width + x) * 4;
                                const sortedPx = segmentMap[sy - startY];
                                outData[pxIdx] = sortedPx.r;
                                outData[pxIdx + 1] = sortedPx.g;
                                outData[pxIdx + 2] = sortedPx.b;
                                outData[pxIdx + 3] = sortedPx.a;
                            }
                        }
                    }
                }
            }
        }
    }

    // Write back to imageData
    for (let i = 0; i < data.length; i++) {
        data[i] = outData[i];
    }
    
    ctx.putImageData(imageData, 0, 0);
}
