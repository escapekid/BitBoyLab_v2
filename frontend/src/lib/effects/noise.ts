import { LayerConfig } from "@/types";

export function applyNoise(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: LayerConfig
): void {
    const amount = config.amount !== undefined ? Number(config.amount) : 0.2;
    const noise_type = config.noise_type ?? "Uniform";

    const intensity = amount * 255;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    if (noise_type === "Uniform") {
        for (let i = 0; i < data.length; i += 4) {
            const rOffset = (Math.random() * 2 - 1) * intensity;
            const gOffset = (Math.random() * 2 - 1) * intensity;
            const bOffset = (Math.random() * 2 - 1) * intensity;
            data[i]   = Math.max(0, Math.min(255, data[i]   + rOffset));
            data[i+1] = Math.max(0, Math.min(255, data[i+1] + gOffset));
            data[i+2] = Math.max(0, Math.min(255, data[i+2] + bOffset));
        }
    } else if (noise_type === "VHS") {

        // 1. Base grain (fine noise on every pixel)
        const grainStrength = intensity * 0.25;
        for (let i = 0; i < data.length; i += 4) {
            const g = (Math.random() * 2 - 1) * grainStrength;
            data[i]   = Math.max(0, Math.min(255, data[i]   + g));
            data[i+1] = Math.max(0, Math.min(255, data[i+1] + g));
            data[i+2] = Math.max(0, Math.min(255, data[i+2] + g));
        }

        // 2. Salt & pepper sparkles
        const sparkleChance = 0.015 + amount * 0.04;
        for (let i = 0; i < data.length; i += 4) {
            if (Math.random() < sparkleChance) {
                const v = Math.random() > 0.4 ? 255 : 0;
                data[i] = v; data[i+1] = v; data[i+2] = v;
            }
        }

        // 3. Thick tracking bands (FIXED HEIGHT — not scaled by amount)
        // Always 30-80px tall so they are always clearly visible
        const numBands = Math.floor(amount * 4) + 1;
        for (let b = 0; b < numBands; b++) {
            const bandH = 30 + Math.floor(Math.random() * 50); // 30-80px always
            const bandY = Math.floor(Math.random() * (height - bandH));

            for (let y = bandY; y < bandY + bandH; y++) {
                // Snow density: 60-95% of pixels are white/black static
                const snowDensity = 0.6 + Math.random() * 0.35;
                for (let x = 0; x < width; x++) {
                    if (Math.random() < snowDensity) {
                        const i = (y * width + x) * 4;
                        // Mostly white (70%) with some black (30%) for TV static look
                        const v = Math.random() > 0.3 ? 255 : 0;
                        data[i] = v; data[i+1] = v; data[i+2] = v;
                    }
                }
            }
        }

        // 4. Horizontal color tears (clearly visible red/blue/cyan streaks)
        const numTears = Math.floor(amount * 6) + 2;
        for (let t = 0; t < numTears; t++) {
            const tearY  = Math.floor(Math.random() * height);
            const tearH  = Math.floor(Math.random() * 5) + 2; // 2-6 px tall

            // Strong color channel shifts: R, B, or cyan
            const kind = Math.floor(Math.random() * 3);
            for (let y = tearY; y < Math.min(height, tearY + tearH); y++) {
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    if (kind === 0) {
                        // Red tear
                        data[i]   = Math.min(255, data[i]   + 180);
                        data[i+1] = Math.max(0,   data[i+1] - 40);
                        data[i+2] = Math.max(0,   data[i+2] - 40);
                    } else if (kind === 1) {
                        // Blue tear
                        data[i]   = Math.max(0,   data[i]   - 40);
                        data[i+1] = Math.max(0,   data[i+1] - 40);
                        data[i+2] = Math.min(255, data[i+2] + 180);
                    } else {
                        // Cyan/bright tear
                        data[i]   = Math.max(0,   data[i]   - 30);
                        data[i+1] = Math.min(255, data[i+1] + 160);
                        data[i+2] = Math.min(255, data[i+2] + 160);
                    }
                }
            }
        }

    } else {
        // Gaussian approximation
        for (let i = 0; i < data.length; i += 4) {
            let u = 0, v = 0;
            while(u === 0) u = Math.random();
            while(v === 0) v = Math.random();
            let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            num = num / 10.0 + 0.5;
            if (num > 1 || num < 0) num = Math.random();
            const offset = (num * 2 - 1) * intensity;
            data[i]   = Math.max(0, Math.min(255, data[i]   + offset));
            data[i+1] = Math.max(0, Math.min(255, data[i+1] + offset));
            data[i+2] = Math.max(0, Math.min(255, data[i+2] + offset));
        }
    }

    ctx.putImageData(imageData, 0, 0);
}
