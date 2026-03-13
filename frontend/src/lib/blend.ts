import { BlendMode } from "../types";

/**
 * Maps BitBoyLab blend modes to HTML5 Canvas globalCompositeOperation
 * when a native equivalent exists.
 */
export function getCanvasBlendMode(blend: BlendMode): GlobalCompositeOperation {
    switch (blend) {
        case "Normal": return "source-over";
        case "Multiply": return "multiply";
        case "Darken": return "darken";
        case "Screen": return "screen";
        case "Lighten": return "lighten";
        case "Overlay": return "overlay";
        case "Difference": return "difference";
        case "Exclusion": return "exclusion";
        case "Soft Light": return "soft-light";
        case "Hard Light": return "hard-light";
        case "Hue": return "hue";
        case "Saturation": return "saturation";
        case "Color": return "color";
        case "Luminosity": return "luminosity";
        default:
            return "source-over"; // Fallback for manual modes
    }
}

/**
 * Some blend modes (like "Subtractive" in the Python backend or "Hard Mix") 
 * don't have a direct 1:1 mapped CSS/Canvas blend mode with consistent behavior.
 */
export function applyManualBlending(
    bottom: ImageData,
    top: ImageData,
    blendMode: BlendMode
): ImageData {
    const out = new ImageData(bottom.width, bottom.height);
    const b = bottom.data;
    const t = top.data;
    const o = out.data;

    const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

    for (let i = 0; i < b.length; i += 4) {
        const topAlpha = t[i + 3] / 255;
        
        // If top is fully transparent, just copy bottom
        if (topAlpha === 0) {
            o[i] = b[i];
            o[i + 1] = b[i + 1];
            o[i + 2] = b[i + 2];
            o[i + 3] = b[i + 3];
            continue;
        }

        let rOut = b[i], gOut = b[i + 1], bOut = b[i + 2];

        if (blendMode === "Subtractive") {
            rOut = Math.max(0, b[i] - t[i]);
            gOut = Math.max(0, b[i + 1] - t[i + 1]);
            bOut = Math.max(0, b[i + 2] - t[i + 2]);
        } else if (blendMode === "Hard Mix") {
            rOut = (b[i] + t[i] >= 255) ? 255 : 0;
            gOut = (b[i + 1] + t[i + 1] >= 255) ? 255 : 0;
            bOut = (b[i + 2] + t[i + 2] >= 255) ? 255 : 0;
        } else if (blendMode === "Pin Light") {
            const pin = (bC: number, tC: number) => {
                if (tC > 128) return Math.max(bC, 2 * (tC - 128));
                return Math.min(bC, 2 * tC);
            };
            rOut = pin(b[i], t[i]);
            gOut = pin(b[i + 1], t[i + 1]);
            bOut = pin(b[i + 2], t[i + 2]);
        } else if (blendMode === "Vivid Light") {
            const vivid = (bC: number, tC: number) => {
                if (tC <= 128) {
                    // Color Burn: 1 - (1 - bC) / (2 * tC / 255)
                    if (tC === 0) return 0;
                    return Math.max(0, 255 * (1 - (255 - bC) / (2 * tC)));
                } else {
                    // Color Dodge: bC / (2 * (1 - tC / 255))
                    if (tC === 255) return 255;
                    return Math.min(255, bC / (2 * (255 - tC) / 255));
                }
            };
            rOut = vivid(b[i], t[i]);
            gOut = vivid(b[i + 1], t[i + 1]);
            bOut = vivid(b[i + 2], t[i + 2]);
        } else if (blendMode === "Linear Light") {
            const linear = (bC: number, tC: number) => {
                // bC + 2 * tC - 255
                return Math.min(255, Math.max(0, bC + 2 * tC - 255));
            };
            rOut = linear(b[i], t[i]);
            gOut = linear(b[i + 1], t[i + 1]);
            bOut = linear(b[i + 2], t[i + 2]);
        }

        // Standard alpha composite
        o[i] = lerp(b[i], rOut, topAlpha);
        o[i + 1] = lerp(b[i + 1], gOut, topAlpha);
        o[i + 2] = lerp(b[i + 2], bOut, topAlpha);
        // Alpha calculation: result alpha = top + bottom * (1 - top)
        o[i + 3] = Math.min(255, t[i + 3] + b[i + 3] * (1 - topAlpha));
    }
    return out;
}
