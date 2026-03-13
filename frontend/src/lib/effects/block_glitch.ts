import { LayerConfig } from "@/types";

export function applyBlockGlitch(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: LayerConfig
): void {
    const blockSize = config.size !== undefined ? Math.max(1, Number(config.size)) : 16;
    const amount = config.amount !== undefined ? Number(config.amount) : 0.2;
    // Seed is hard to use elegantly with Math.random, but we just use random for now
    
    // We need the original image to cut blocks from
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = width;
    srcCanvas.height = height;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.drawImage(ctx.canvas, 0, 0);

    // We draw glitch blocks over the original
    for (let y = 0; y < height; y += blockSize) {
        for (let x = 0; x < width; x += blockSize) {
            
            // Mask check handled by engine (engine isolates layers)
            // But if we want to honor mask, engine passes fully masked image anyway?
            // Actually, BitBoy engine blends the WHOLE canvas with the mask at the end.
            
            if (Math.random() < amount) {
                const dx = Math.floor(Math.random() * (blockSize * 4)) - blockSize * 2;
                const dy = Math.floor(Math.random() * (blockSize * 4)) - blockSize * 2;
                
                const srcX = Math.max(0, Math.min(x + dx, width - blockSize));
                const srcY = Math.max(0, Math.min(y + dy, height - blockSize));
                
                // Draw glitched block from source onto current
                ctx.drawImage(
                    srcCanvas, 
                    srcX, srcY, blockSize, blockSize,
                    x, y, blockSize, blockSize
                );
            }
        }
    }
}
