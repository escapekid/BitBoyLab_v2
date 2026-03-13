import { LayerConfig } from "../../types";
import { getLuminance } from "../mask";

const CHAR_SETS: Record<string, string> = {
    "HRDWRE":   "H R D W R E",
    "HACKER":   "[ ] < > / \\ | _ - +",
    "Standard": "@ % # * + = - : . ",
    "Blocky":   "█ ▓ ▒ ░ ",
    "Matrix":   "0 1",
};

/**
 * Replicates bitboylab_boy.core.effects.ascii_art
 */
export function applyAscii(
    sourceImageData: ImageData,
    layer: LayerConfig,
    layerMask: Uint8Array
): ImageData {
    const size = layer.size !== undefined ? Math.max(1, Number(layer.size)) : 16;
    const mapping = layer.mapping as string || "Brightness";
    const fontColor = layer.f_col as string || "#ffffff";
    const bgMode = layer.bg_mode as string || "Fixed Color";
    const bgColor = layer.bg_col as string || "#000000";
    const charset = layer.set as string || "HRDWRE";
    const offsetX = layer.ox !== undefined ? Number(layer.ox) : 0;
    const offsetY = layer.oy !== undefined ? Number(layer.oy) : 0;
    const softMask = layer.soft_mask !== false; // default true if not strictly false

    const chars = (CHAR_SETS[charset] || CHAR_SETS["HRDWRE"]).split(" ");

    const { width, height, data } = sourceImageData;
    
    // Create an offscreen canvas to render text
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    ctx.font = `${size}px monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    // Precalculate luminance array
    const gray = new Float32Array(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        gray[j] = getLuminance(data[i], data[i + 1], data[i + 2]);
    }

    // Grid sizes
    const sw = Math.max(1, Math.floor(width / size));
    const sh = Math.max(1, Math.floor(height / size));

    // 1. Draw Background
    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = width;
    bgCanvas.height = height;
    const bgCtx = bgCanvas.getContext("2d")!;
    
    for (let yIdx = 0; yIdx < sh; yIdx++) {
        const cy0 = Math.floor(yIdx * height / sh);
        const cy1 = Math.floor((yIdx + 1) * height / sh);
        
        for (let xIdx = 0; xIdx < sw; xIdx++) {
            const cx0 = Math.floor(xIdx * width / sw);
            const cx1 = Math.floor((xIdx + 1) * width / sw);
            
            // source coordinates accounting for offset
            const srcYIdx = (yIdx + offsetY) % sh;
            const srcXIdx = (xIdx + offsetX) % sw;
            
            const cellCenterX = Math.floor((cx0 + cx1) / 2);
            const cellCenterY = Math.floor((cy0 + cy1) / 2);
            
            const cellCenterSampleX = Math.min(width - 1, Math.max(0, cellCenterX));
            const cellCenterSampleY = Math.min(height - 1, Math.max(0, cellCenterY));
            const maskValue = layerMask[cellCenterSampleY * width + cellCenterSampleX];
            
            if (maskValue === 0) {
                continue;
            }

            const dataIdx = (cellCenterY * width + cellCenterX) * 4;
            
            if (bgMode === "Sample Image") {
                const r = data[dataIdx];
                const g = data[dataIdx + 1];
                const b = data[dataIdx + 2];
                bgCtx.fillStyle = `rgb(${r},${g},${b})`;
            } else {
                bgCtx.fillStyle = bgColor;
            }
            bgCtx.fillRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
        }
    }

    // 1.5 Apply accurate pixel mask to BACKGROUND ONLY
    const bgData = bgCtx.getImageData(0, 0, width, height);
    if (softMask) {
        // In Python: bg_layer.putalpha(Image.fromarray(mask.astype(np.uint8) * 255))
        // This is a HARD cut-out (0 or 255) based purely on the layerMask boolean! 
        // No luminance-based "fade/gradient", just a pixel-perfect cut.
        for (let i = 0, j = 0; i < bgData.data.length; i += 4, j++) {
            if (layerMask[j] === 0) {
                bgData.data[i + 3] = 0;
            }
        }
    }
    // Render the final background into the main context
    ctx.putImageData(bgData, 0, 0);

    // 2. Draw Text Characters
    ctx.fillStyle = fontColor;
    for (let yIdx = 0; yIdx < sh; yIdx++) {
        const cy0 = Math.floor(yIdx * height / sh);
        const cy1 = Math.floor((yIdx + 1) * height / sh);
        const srcYIdx = (yIdx + offsetY) % sh;
        
        for (let xIdx = 0; xIdx < sw; xIdx++) {
            const cx0 = Math.floor(xIdx * width / sw);
            const cx1 = Math.floor((xIdx + 1) * width / sw);
            const srcXIdx = (xIdx + offsetX) % sw;
            
            const cellCenterX = Math.floor((cx0 + cx1) / 2);
            const cellCenterY = Math.floor((cy0 + cy1) / 2);

            const cellCenterSampleX = Math.min(width - 1, Math.max(0, cellCenterX));
            const cellCenterSampleY = Math.min(height - 1, Math.max(0, cellCenterY));
            if (layerMask[cellCenterSampleY * width + cellCenterSampleX] === 0) {
                continue;
            }

            const idx = cellCenterY * width + cellCenterX;
            
            let charIndex = 0;
            if (mapping === "Random") {
                charIndex = Math.floor(Math.random() * chars.length);
            } else {
                const brightness = gray[idx];
                charIndex = Math.floor((brightness / 255.1) * (chars.length - 1));
            }
            
            const char = chars[charIndex] || " ";
            
            // Draw text in the middle of the cell, applying char offsets
            const px = cx0 + (cx1 - cx0) / 2 + offsetX;
            const py = cy0 + (cy1 - cy0) / 2 + offsetY;
            ctx.fillText(char, px, py);
        }
    }

    return ctx.getImageData(0, 0, width, height);
}
