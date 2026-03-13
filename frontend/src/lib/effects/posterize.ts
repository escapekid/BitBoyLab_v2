import { LayerConfig } from "@/types";

export function applyPosterize(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: LayerConfig
): void {
    let levels = config.levels !== undefined ? Number(config.levels) : 4;
    levels = Math.max(1, Math.min(8, Math.floor(levels)));
    
    // In Python PIL, posterize takes number of bits to keep per channel (1-8).
    // If levels=4, it means keep 4 highest bits, which is 16 values per channel.
    // So 2^levels values.
    const numValues = Math.pow(2, levels);
    const step = 255 / (numValues - 1);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            // Quantize each channel
            const val = data[i + c];
            data[i + c] = Math.round(Math.round(val / 255 * (numValues - 1)) * step);
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}
