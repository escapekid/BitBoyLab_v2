import { LayerConfig } from "../types";
import { getCanvasBlendMode, applyManualBlending } from "./blend";
import { getMask, applyMaskToAlpha, getAlphaMask, applyAlphaMask } from "./mask";

import { 
    applyAscii, applyDither, applyEdgeDetect, applyGlitch,
    applyThreshold, applyPosterize, applyLevels,
    applyCRT, applyNoise, applyHalftone,
    applyPixelSort, applyBlockGlitch, applyGradientMap, applyTexture,
    applyTilesetDither
} from "./effects";

export class Engine {
    /**
     * Renders a full layer stack onto the source image and returns the final canvas.
     * Replicates `bitboylab_boy.core.engine.Engine.render`.
     */
    static async render(
        source: HTMLImageElement | HTMLCanvasElement,
        layers: LayerConfig[],
        globalScale: number = 1.0,
        textureFile: File | null = null
    ): Promise<HTMLCanvasElement> {
        const { width, height } = source;
        const enabledLayers = layers.filter(l => l.enabled);

        // 1. Setup the master canvas (the final output)
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get 2D context");

        // Fill background
        ctx.fillStyle = `rgba(0, 0, 0, 1.0)`; // Use opaque black by default
        ctx.fillRect(0, 0, width, height);

        // 2. Setup the composite canvas (tracks the look so far, used for masking like in Python)
        const compositeCanvas = document.createElement("canvas");
        compositeCanvas.width = width;
        compositeCanvas.height = height;
        const compCtx = compositeCanvas.getContext("2d")!;
        compCtx.drawImage(source, 0, 0);

        let activeImageData = compCtx.getImageData(0, 0, width, height);

        // Track the alpha mask of the "clipping base" (the last unclipped layer)
        let clippingBaseMask: Uint8Array | null = null;

        // Determine global mosaic size from the SOURCE layer
        const sourceLayer = enabledLayers.find(l => l.type === "SOURCE");
        const sourceMosaicSize = sourceLayer ? Math.max(1, Number(sourceLayer.mosaic ?? 1)) : 1;

        // Sort: pinned layers float to front (index 0,1,...) → rendered last → appear on top.
        // SOURCE always stays at the back (bottom of stack).
        enabledLayers.sort((a, b) => {
            if (a.type === "SOURCE") return 1;
            if (b.type === "SOURCE") return -1;
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return 0; // preserve original relative order
        });

        // Process layers bottom to top (like Photoshop)
        for (let i = enabledLayers.length - 1; i >= 0; i--) {
            const layer = enabledLayers[i];

            // ignoreBelow: feed original source data instead of accumulated composite
            let inputData: ImageData;
            if (layer.type !== "SOURCE" && layer.ignoreBelow) {
                const origCtx = document.createElement("canvas").getContext("2d")!;
                origCtx.canvas.width = width;
                origCtx.canvas.height = height;
                origCtx.drawImage(source, 0, 0);
                inputData = origCtx.getImageData(0, 0, width, height);
            } else {
                inputData = activeImageData;
            }

            // ignoreMosaic=false (default): pixelate input to mosaic grid so the effect snaps to it
            let effectInputData = inputData;
            if (layer.type !== "SOURCE" && !layer.ignoreMosaic && sourceMosaicSize > 1) {
                effectInputData = Engine.pixelateImageData(inputData, width, height, sourceMosaicSize);
            }

            // Render layer onto a temporary hidden canvas
            const layerCanvas = await Engine.renderLayer(layer, compositeCanvas, source, effectInputData, globalScale, textureFile);
            
            // Yield to main thread to allow UI updates (like AsciiLoader animation)
            await new Promise(resolve => setTimeout(resolve, 0));

            const layerCtx = layerCanvas.getContext("2d")!;

            // 3. Handle Clipping
            if (layer.clipped && clippingBaseMask) {
                const layerData = layerCtx.getImageData(0, 0, width, height);
                applyAlphaMask(layerData, clippingBaseMask);
                layerCtx.putImageData(layerData, 0, 0);
            }
            
            // Blend layerCanvas onto the master canvas
            const blendMode = getCanvasBlendMode(layer.blend);
            
            if (blendMode === "source-over" && layer.blend !== "Normal") {
                // If it's a custom blend mode not supported by Canvas API directly (e.g. Subtractive)
                const masterData = ctx.getImageData(0, 0, width, height);
                const layerData = layerCtx.getImageData(0, 0, width, height);
                const blended = applyManualBlending(masterData, layerData, layer.blend);
                ctx.putImageData(blended, 0, 0);
            } else {
                ctx.globalCompositeOperation = blendMode;
                ctx.drawImage(layerCanvas, 0, 0);
            }

            // Update clipping base if this layer is not clipped
            if (!layer.clipped) {
                const layerData = layerCtx.getImageData(0, 0, width, height);
                clippingBaseMask = getAlphaMask(layerData);
            }

            // Update composite for the next layer masking calculations
            // The Python engine sets composite = canvas.convert("RGB")
            ctx.globalCompositeOperation = "source-over"; // reset
            compCtx.drawImage(canvas, 0, 0);
            activeImageData = compCtx.getImageData(0, 0, width, height);
        }

        return canvas;
    }

    /**
     * Pixelates ImageData to a given block size (downscale + upscale).
     * Used so effects snap to the source mosaic grid.
     */
    static pixelateImageData(src: ImageData, width: number, height: number, blockSize: number): ImageData {
        const out = new ImageData(width, height);
        const d = src.data;
        const o = out.data;

        for (let by = 0; by < height; by += blockSize) {
            for (let bx = 0; bx < width; bx += blockSize) {
                // Sample top-left pixel of each block
                const si = (by * width + bx) * 4;
                const r = d[si], g = d[si + 1], b = d[si + 2], a = d[si + 3];

                // Fill entire block with that colour
                for (let dy = 0; dy < blockSize && by + dy < height; dy++) {
                    for (let dx = 0; dx < blockSize && bx + dx < width; dx++) {
                        const oi = ((by + dy) * width + (bx + dx)) * 4;
                        o[oi] = r; o[oi + 1] = g; o[oi + 2] = b; o[oi + 3] = a;
                    }
                }
            }
        }
        return out;
    }

    /**
     * Replicates `Engine._render_layer`.
     * Applies a specific effect and returns a Canvas with that effect (transparent outside the mask).
     */
    private static async renderLayer(
        baseLayerConfig: LayerConfig,
        compositeSrc: HTMLCanvasElement,
        originalSrc: HTMLImageElement | HTMLCanvasElement,
        activeImageData: ImageData,
        globalScale: number,
        textureFile: File | null
    ): Promise<HTMLCanvasElement> {
        // Clone the config to apply global scale adjustments without mutating the UI state
        const layer = { ...baseLayerConfig };
        
        // Apply Global Scale to specific parameters where it makes sense visually
        if (globalScale !== 1.0) {
            const scaleableProps = ["size", "thickness", "radius"];
            for (const prop of scaleableProps) {
                if (layer[prop] !== undefined) {
                    layer[prop] = Math.max(1, Math.round(Number(layer[prop]) * globalScale));
                }
            }

            // Mosaic: scale the existing value (or treat 1 as the base)
            const baseMosaic = layer.mosaic !== undefined ? Number(layer.mosaic) : 1;
            layer.mosaic = Math.max(1, Math.round(baseMosaic * globalScale));

            // Frequencies (like in CRT) get smaller as scale increases
            if (layer.freq !== undefined) {
               layer.freq = Math.max(1, Math.round(Number(layer.freq) / globalScale));
            }

            // Intensity/Displacements
            if (layer.intensity !== undefined && layer.type === "CRT") {
               layer.intensity = Math.round(Number(layer.intensity) * globalScale);
            }
        }

        const { width, height } = compositeSrc;
        const layerCanvas = document.createElement("canvas");
        layerCanvas.width = width;
        layerCanvas.height = height;
        const layerCtx = layerCanvas.getContext("2d")!;

        // 1. Generate Mask
        // Determines where this effect should be visible based on luminance thresholds
        const layerMask = getMask(activeImageData, layer.range || [0, 255]);

        // 2. Render Effect
        const effectType = layer.type;
        let effectData: ImageData | null = null;
        
        const opacity = layer.opacity !== undefined ? Number(layer.opacity) : 1.0;

        switch (effectType) {
            case "SOURCE": {
                // Use the (potentially globalScale-adjusted) mosaic value
                const mosaicSize = layer.mosaic !== undefined ? Number(layer.mosaic) : 1;
                if (mosaicSize > 1) {
                    const tempCanvas = document.createElement("canvas");
                    tempCanvas.width = Math.max(1, Math.ceil(width / mosaicSize));
                    tempCanvas.height = Math.max(1, Math.ceil(height / mosaicSize));
                    const tempCtx = tempCanvas.getContext("2d")!;
                    tempCtx.drawImage(originalSrc, 0, 0, tempCanvas.width, tempCanvas.height);

                    layerCtx.imageSmoothingEnabled = false;
                    layerCtx.drawImage(tempCanvas, 0, 0, width, height);
                    layerCtx.imageSmoothingEnabled = true;
                } else {
                    layerCtx.drawImage(originalSrc, 0, 0);
                }
                effectData = layerCtx.getImageData(0, 0, width, height);
                break;
            }
            case "DITHER":
                effectData = applyDither(activeImageData, layer);
                break;
            case "GLITCH":
                effectData = await applyGlitch(compositeSrc, layer);
                break;
            case "ASCII":
                effectData = applyAscii(activeImageData, layer, layerMask);
                break;
            case "EDGE":
                effectData = applyEdgeDetect(activeImageData, layer);
                break;
            case "TILESET_DITHER":
                effectData = applyTilesetDither(activeImageData, layer, layerMask);
                break;
            case "THRESHOLD":
            case "POSTERIZE":
            case "LEVELS":
            case "CRT":
            case "NOISE":
            case "HALFTONE":
            case "BLOCK_GLITCH":
            case "GRADIENT_MAP":
            case "PIXEL_SORT":
                // These effects require the active image on the layer canvas to manipulate it
                layerCtx.putImageData(activeImageData, 0, 0);
                if (effectType === "THRESHOLD") applyThreshold(layerCtx, width, height, layer);
                else if (effectType === "POSTERIZE") applyPosterize(layerCtx, width, height, layer);
                else if (effectType === "LEVELS") applyLevels(layerCtx, width, height, layer);
                else if (effectType === "CRT") applyCRT(layerCtx, width, height, layer);
                else if (effectType === "NOISE") applyNoise(layerCtx, width, height, layer);
                else if (effectType === "HALFTONE") applyHalftone(layerCtx, width, height, layer);
                else if (effectType === "BLOCK_GLITCH") applyBlockGlitch(layerCtx, width, height, layer);
                else if (effectType === "GRADIENT_MAP") applyGradientMap(layerCtx, width, height, layer);
                else if (effectType === "PIXEL_SORT") applyPixelSort(layerCtx, width, height, layer, layerMask);
                effectData = layerCtx.getImageData(0, 0, width, height);
                break;
            case "TEXTURE":
                await applyTexture(layerCtx, width, height, layer, textureFile);
                effectData = layerCtx.getImageData(0, 0, width, height);
                break;
            default:
                // Fallback: Just return transparent
                effectData = layerCtx.createImageData(width, height);
                break;
        }

        // 3. Apply Mask & Global Layer Opacity
        if (effectData) {
            // Effects that handle masking internally to preserve block/character integrity
            const skipPixelMask = ["ASCII", "TILESET_DITHER"].includes(effectType);
            applyMaskToAlpha(effectData, skipPixelMask ? null : layerMask, opacity);
            layerCtx.putImageData(effectData, 0, 0);
        }

        return layerCanvas;
    }
}
