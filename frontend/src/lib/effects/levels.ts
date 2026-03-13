import { LayerConfig } from "@/types";

export function applyLevels(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: LayerConfig
): void {
    const black_lift = config.black_lift !== undefined ? Number(config.black_lift) : 0;
    const mid_point = config.mid_point !== undefined ? Number(config.mid_point) : 1.0;
    const white_point = config.white_point !== undefined ? Number(config.white_point) : 255;
    
    let b = black_lift / 255.0;
    let w = white_point / 255.0;
    
    if (w <= b) w = b + 0.01;
    
    const safe_mid = Math.max(0.01, mid_point);
    const gamma_inv = 1.0 / safe_mid;

    // Create a LUT (Lookup Table) for performance rather than calculating per pixel
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
        let val = i / 255.0;
        
        // 1. Remap black and white points
        val = (val - b) / (w - b);
        val = Math.max(0.0, Math.min(1.0, val));
        
        // 2. Gamma
        if (mid_point !== 1.0) {
            val = Math.pow(val, gamma_inv);
        }
        
        lut[i] = Math.round(val * 255);
    }

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = lut[data[i]];
        data[i + 1] = lut[data[i + 1]];
        data[i + 2] = lut[data[i + 2]];
    }
    
    ctx.putImageData(imageData, 0, 0);
}
