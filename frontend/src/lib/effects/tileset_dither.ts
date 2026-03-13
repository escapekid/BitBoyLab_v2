import { getLuminance } from "../mask";

const SYMBOL_SETS: Record<string, string[]> = {
    "standard": [' ', '·', '×', '▣', '■'],
    "minimal":  [' ', '.', '+', '#', '@'],
    "binary":   ['0', '1'],
    "hardware": ['_', '▖', '▚', '▜', '▉'],
    "organic":  [' ', '░', '▒', '▓', '█'],
    "braille":  [' ', '⠂', '⠒', '⠗', '⣿'],
    "circuit":  [' ', '╎', '╼', '╋', '█'],
    "angles":   [' ', '└', '┴', '┼', '█']
};

export function applyTilesetDither(
    srcImageData: ImageData,
    layer: any,
    mask: Uint8Array
): ImageData {
    const { width, height, data } = srcImageData;
    const tile_size = Math.max(4, Math.round(Number(layer.size) || 12));
    const mode = layer.mode || "Source Colors";
    const symbol_set_name = layer.symbol_set || "standard";
    const symbols = SYMBOL_SETS[symbol_set_name] || SYMBOL_SETS["standard"];
    const brightness = Number(layer.brightness) || 1.0;
    const contrast = Number(layer.contrast) || 1.0;
    const full_bg = layer.full_bg !== undefined ? Boolean(layer.full_bg) : true;
    
    // Get colors for Brand Palette mode
    const palette = [
        layer.col0 || "#000000",
        layer.col1 || "#1bb544",
        layer.col2 || "#00ff41",
        layer.col3 || "#ffffff"
    ];

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // Accurate grid divisions like ASCII
    const sw = Math.floor(width / tile_size);
    const sh = Math.floor(height / tile_size);

    if (sw === 0 || sh === 0) return ctx.getImageData(0, 0, width, height);

    ctx.font = `${tile_size}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let yIdx = 0; yIdx < sh; yIdx++) {
        const cy0 = Math.floor(yIdx * height / sh);
        const cy1 = Math.floor((yIdx + 1) * height / sh);
        
        for (let xIdx = 0; xIdx < sw; xIdx++) {
            const cx0 = Math.floor(xIdx * width / sw);
            const cx1 = Math.floor((xIdx + 1) * width / sw);
            
            // 50% majority check: At least half the pixels in the tile must be within the visibility range
            let unmaskedCount = 0;
            const th = cy1 - cy0; // Tile height
            const tw = cx1 - cx0; // Tile width

            for (let ty = 0; ty < th; ty++) {
                const rowOffset = (cy0 + ty) * width;
                for (let tx = 0; tx < tw; tx++) {
                    if (mask[rowOffset + (cx0 + tx)] > 0) {
                        unmaskedCount++;
                    }
                }
            }

            if (unmaskedCount < (tw * th) / 2) {
                continue;
            }

            let totalLuma = 0;
            let rSum = 0, gSum = 0, bSum = 0;
            let count = 0;

            // Sample pixels in this cell
            for (let ty = cy0; ty < cy1; ty++) {
                for (let tx = cx0; tx < cx1; tx++) {
                    const idx = ty * width + tx;
                    const p = idx * 4;
                    rSum += data[p];
                    gSum += data[p+1];
                    bSum += data[p+2];
                    
                    let luma = getLuminance(data[p], data[p+1], data[p+2]) / 255;
                    // Apply brightness/contrast
                    luma = ((luma - 0.5) * contrast + 0.5) * brightness;
                    totalLuma += Math.max(0, Math.min(1, luma));
                    count++;
                }
            }

            if (count === 0) continue;

            const avgLuma = totalLuma / count;
            
            // Draw symbol if bright enough
            if (avgLuma > 0.01) {
                if (full_bg) {
                    // Background Tile - Opaque dark gray for the BitBoy look
                    ctx.fillStyle = "#050505";
                    ctx.fillRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
                }

                const symIdx = Math.min(symbols.length - 1, Math.floor(avgLuma * symbols.length));
                const char = symbols[symIdx];

                if (mode === "Source Colors") {
                    ctx.fillStyle = `rgb(${Math.round(rSum/count)}, ${Math.round(gSum/count)}, ${Math.round(bSum/count)})`;
                } else if (mode === "Harmony") {
                    const pIdx = Math.min(palette.length - 1, Math.floor((avgLuma + 0.1) * palette.length));
                    ctx.fillStyle = palette[pIdx];
                }
                
                const px = cx0 + (cx1 - cx0) / 2;
                const py = cy0 + (cy1 - cy0) / 2;
                ctx.fillText(char, px, py);
            }
        }
    }

    return ctx.getImageData(0, 0, width, height);
}
