import { LayerConfig } from "@/types";
import { hexToRgb } from "../color";

export function applyGradientMap(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: LayerConfig
): void {
    const numColors = config.num_colors !== undefined ? Number(config.num_colors) : 4;
    
    // Default stops
    const stopsRaw = [
        { pos: config.pos0 ?? 0, col: hexToRgb(config.col0 ?? "#000000") },
        { pos: config.pos1 ?? 85, col: hexToRgb(config.col1 ?? "#555555") },
        { pos: config.pos2 ?? 170, col: hexToRgb(config.col2 ?? "#aaaaaa") },
        { pos: config.pos3 ?? 255, col: hexToRgb(config.col3 ?? "#ffffff") },
    ];
    
    let stops = stopsRaw;
    if (numColors === 2) {
        stops = [stopsRaw[0], stopsRaw[3]];
    } else if (numColors === 3) {
        stops = [stopsRaw[0], stopsRaw[1], stopsRaw[3]];
    }
    
    // Sort stops
    stops.sort((a, b) => a.pos - b.pos);
    
    // Build LUT
    const lut = new Uint8Array(256 * 3);
    
    // Fill before first
    for (let i = 0; i < stops[0].pos; i++) {
        lut[i*3] = stops[0].col[0];
        lut[i*3+1] = stops[0].col[1];
        lut[i*3+2] = stops[0].col[2];
    }
    
    // Fill after last
    for (let i = stops[stops.length-1].pos; i < 256; i++) {
        lut[i*3] = stops[stops.length-1].col[0];
        lut[i*3+1] = stops[stops.length-1].col[1];
        lut[i*3+2] = stops[stops.length-1].col[2];
    }
    
    // Interpolate
    for (let s = 0; s < stops.length - 1; s++) {
        const pStart = stops[s].pos;
        const pEnd = stops[s+1].pos;
        
        if (pStart === pEnd) continue;
        
        const cStart = stops[s].col;
        const cEnd = stops[s+1].col;
        
        for (let p = pStart; p <= pEnd; p++) {
            const f = (p - pStart) / (pEnd - pStart);
            lut[p*3] = Math.round(cStart[0] + (cEnd[0] - cStart[0]) * f);
            lut[p*3+1] = Math.round(cStart[1] + (cEnd[1] - cStart[1]) * f);
            lut[p*3+2] = Math.round(cStart[2] + (cEnd[2] - cStart[2]) * f);
        }
    }
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        
        data[i] = lut[luma*3];
        data[i+1] = lut[luma*3+1];
        data[i+2] = lut[luma*3+2];
    }
    
    ctx.putImageData(imageData, 0, 0);
}
