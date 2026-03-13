import { LayerConfig } from "@/types";

export function applyThreshold(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: LayerConfig
): void {
    const threshold = config.threshold_val ?? 128;
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // standard relative luminance
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        
        const val = luminance >= threshold ? 255 : 0;
        
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
    }
    
    ctx.putImageData(imageData, 0, 0);
}
