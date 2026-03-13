import { LayerConfig } from "@/types";

export async function applyTexture(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: LayerConfig,
    textureFile: File | null
): Promise<void> {
    if (!textureFile) {
        return; // Empty if no texture is uploaded
    }

    const invert = config.invert ?? false;
    const scale = config.scale ?? 1.0;
    const rotation = config.rotation ?? 0;
    const ox = config.ox ?? 0;
    const oy = config.oy ?? 0;
    const repeat = config.repeat ?? false;
    const lumaAlpha = config.luma_alpha ?? false;
    // Opacity handled by engine mask logic, but we could apply here too.

    try {
        const url = URL.createObjectURL(textureFile);
        const img = new Image();
        img.src = url;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const tw = img.width;
        const th = img.height;

        // Texture Canvas
        const texCanvas = document.createElement("canvas");
        texCanvas.width = tw;
        texCanvas.height = th;
        const tCtx = texCanvas.getContext("2d")!;
        tCtx.drawImage(img, 0, 0);
        
        // Convert Luma to Alpha & Invert if needed
        if (invert || lumaAlpha) {
            const tData = tCtx.getImageData(0, 0, tw, th);
            for (let i = 0; i < tData.data.length; i += 4) {
                const r = tData.data[i];
                const g = tData.data[i + 1];
                const b = tData.data[i + 2];
                let a = tData.data[i + 3];

                if (invert) {
                    tData.data[i] = 255 - r;
                    tData.data[i + 1] = 255 - g;
                    tData.data[i + 2] = 255 - b;
                }

                if (lumaAlpha) {
                    const luma = 0.299 * tData.data[i] + 0.587 * tData.data[i + 1] + 0.114 * tData.data[i + 2];
                    tData.data[i + 3] = (a * luma) / 255;
                }
            }
            tCtx.putImageData(tData, 0, 0);
        }

        URL.revokeObjectURL(url);

        // Transformation setup
        ctx.save();

        const moveX = (ox / 100.0) * width;
        const moveY = (oy / 100.0) * height;

        if (repeat) {
            // Setup tiling
            const patternCanvas = document.createElement('canvas');
            const pCtx = patternCanvas.getContext('2d')!;
            
            // To properly tile with scale/rotation, we create a scaled/rotated version first
            // Or use scale/rotate on the patten matrix
            
            const scaledW = Math.max(1, tw * scale);
            const scaledH = Math.max(1, th * scale);

            patternCanvas.width = scaledW;
            patternCanvas.height = scaledH;
            
            // Just draw the scaled texture directly onto the pattern source
            pCtx.drawImage(texCanvas, 0, 0, scaledW, scaledH);
            
            const pattern = ctx.createPattern(patternCanvas, "repeat");
            if (pattern) {
                ctx.fillStyle = pattern;
                
                // Rotation transformation for the pattern filling
                ctx.translate(moveX, moveY);
                ctx.rotate((rotation * Math.PI) / 180);
                
                // Fill rect needs to cover the canvas regardless of rotation
                const diag = Math.sqrt(width * width + height * height);
                ctx.fillRect(-diag, -diag, diag * 2, diag * 2);
            }
        } else {
            // Draw centered + offset
            const scaledW = tw * scale;
            const scaledH = th * scale;
            
            const px = moveX + (width - scaledW) / 2;
            const py = moveY + (height - scaledH) / 2;

            // Center of the image for scaling and rotation
            const cx = px + scaledW / 2;
            const cy = py + scaledH / 2;

            ctx.translate(cx, cy);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.translate(-cx, -cy);

            ctx.drawImage(texCanvas, px, py, scaledW, scaledH);
        }

        ctx.restore();
    } catch (e) {
        console.error("Failed to apply texture", e);
    }
}
