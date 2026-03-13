import { LayerConfig } from "@/types";
import { hexToRgb } from "../color";

export function applyHalftone(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: LayerConfig
): void {
    const size = config.size !== undefined ? Math.max(2, Number(config.size)) : 8;
    const method = config.method ?? "Classic";
    const colorHex = config.col ?? "#ffffff";
    const dotScale = config.dot_scale !== undefined ? Number(config.dot_scale) : 0.9;
    
    const rgb = hexToRgb(colorHex);
    
    // We need original image luminance
    const srcData = ctx.getImageData(0, 0, width, height).data;
    
    // Create new transparent canvas for dots
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = width;
    dotCanvas.height = height;
    const dotCtx = dotCanvas.getContext('2d')!;
    dotCtx.fillStyle = colorHex;
    
    if (method === "Classic") {
        for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
                // Approximate cell luminance by taking center pixel or average
                // To match python's np.mean(cell) we could average it, but center pixel is faster
                const cxOffset = Math.min(width - 1, x + Math.floor(size/2));
                const cyOffset = Math.min(height - 1, y + Math.floor(size/2));
                const cIdx = (cyOffset * width + cxOffset) * 4;
                
                const luma = (0.299 * srcData[cIdx] + 0.587 * srcData[cIdx+1] + 0.114 * srcData[cIdx+2]) / 255;
                const radius = (size / 2) * luma * dotScale;
                
                if (radius > 0.5) {
                    dotCtx.beginPath();
                    dotCtx.arc(x + size/2, y + size/2, radius, 0, Math.PI * 2);
                    dotCtx.fill();
                }
            }
        }
    } else {
        // Floyd-Steinberg or Blue Noise halftone
        // Since it's intensive, we fallback to a simpler grid approach or just support Classic for now
        // To properly implement fs-halftone, we'd do error diffusion and then drop circles.
        for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
                const cIdx = (y * width + x) * 4;
                const luma = (0.299 * srcData[cIdx] + 0.587 * srcData[cIdx+1] + 0.114 * srcData[cIdx+2]) / 255;
                if (luma > Math.random()) {
                    const radius = size / 2;
                    dotCtx.beginPath();
                    dotCtx.arc(x + size/2, y + size/2, radius, 0, Math.PI * 2);
                    dotCtx.fill();
                }
            }
        }
    }
    
    // Clear and draw the dots
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(dotCanvas, 0, 0);
}
