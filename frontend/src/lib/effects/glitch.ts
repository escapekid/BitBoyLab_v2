import { LayerConfig } from "../../types";

/**
 * Replicates bitboylab_boy.core.effects.glitch.
 * Uses JPEG compression corruption.
 */
export async function applyGlitch(
    source: HTMLCanvasElement,
    layer: LayerConfig
): Promise<ImageData> {
    const amount = layer.amount !== undefined ? Number(layer.amount) : 50;
    const quality = layer.quality !== undefined ? Number(layer.quality) : 30;
    // JS Math.random doesn't take a seed directly natively without a PRNG library,
    // but we can generate pseudo-random glitches based on amount and quality.
    // If strict deterministic seeding is wanted, a simple SFC32 or Mulberry32 function can be used.

    const { width, height } = source;

    // 1. Export canvas to JPEG blob at low quality
    const blob = await new Promise<Blob | null>((resolve) => {
        source.toBlob(resolve, "image/jpeg", quality / 100);
    });

    if (!blob) {
        // Fallback if toBlob fails
        return source.getContext("2d")!.getImageData(0, 0, width, height);
    }

    // 2. Corrupt the JPEG bytes
    const arrayBuffer = await blob.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Locate end of JPEG header (SOS marker 0xFF 0xDA)
    let headerEnd = 100; // Safe fallback
    for (let i = 0; i < data.length - 1; i++) {
        if (data[i] === 0xff && data[i + 1] === 0xda) {
            headerEnd = i + 2;
            break;
        }
    }

    if (headerEnd < 2) headerEnd = 100;

    const numCorruptions = Math.floor(amount / 5) + 1;
    for (let i = 0; i < numCorruptions; i++) {
        // Random position after header
        const pos = Math.floor(headerEnd + Math.random() * (data.length - headerEnd - 10));
        data[pos] = Math.floor(Math.random() * 256);
    }

    // 3. Load corrupted bytes back into an image
    const corruptedBlob = new Blob([data], { type: "image/jpeg" });
    const url = URL.createObjectURL(corruptedBlob);

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = width;
            tempCanvas.height = height;
            const ctx = tempCanvas.getContext("2d")!;
            // Draw corrupted image (scaled to fit back into original dimensions just in case JPEG decode alters them)
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            resolve(ctx.getImageData(0, 0, width, height));
        };
        img.onerror = () => {
            // If corruption broke the JPEG completely, fallback to original
            URL.revokeObjectURL(url);
            resolve(source.getContext("2d")!.getImageData(0, 0, width, height));
        };
        img.src = url;
    });
}
