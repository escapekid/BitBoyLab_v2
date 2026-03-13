import { EffectSchema, LayerConfig } from "@/types";
import { LOCAL_SCHEMAS } from "./schemas";

export async function fetchEffects(): Promise<EffectSchema[]> {
    // Simulate API delay, though instant is fine too
    return LOCAL_SCHEMAS;
}

export async function processImage(
    file: File,
    layers: Omit<LayerConfig, "id">[],
    texture?: File | null,
    mosaicSize: number = 1,
    bgAlpha: number = 1.0,
    globalScale: number = 1.0
): Promise<string> {
    const form = new FormData();
    form.append("image", file);
    if (texture) {
        form.append("texture", texture);
    }
    form.append("layers", JSON.stringify(layers));
    form.append("mosaic_size", mosaicSize.toString());
    form.append("bg_alpha", bgAlpha.toString());
    form.append("global_scale", globalScale.toString());

    const res = await fetch("/api/process", {
        method: "POST",
        body: form,
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Processing failed: ${errorText}`);
    }

    const resBlob = await res.blob();
    const blob = new Blob([resBlob], { type: "image/jpeg" });
    return URL.createObjectURL(blob);
}
