export type BlendMode = 
    | "Normal" 
    | "Multiply" | "Darken"
    | "Screen" | "Lighten"
    | "Overlay" | "Soft Light" | "Hard Light" | "Vivid Light" | "Linear Light" | "Pin Light" | "Hard Mix"
    | "Difference" | "Exclusion" | "Subtractive"
    | "Hue" | "Saturation" | "Color" | "Luminosity";

export const BLEND_MODES: BlendMode[] = [
    "Normal",
    "Multiply",
    "Darken",
    "Screen",
    "Lighten",
    "Overlay",
    "Soft Light",
    "Hard Light",
    "Vivid Light",
    "Linear Light",
    "Pin Light",
    "Hard Mix",
    "Difference",
    "Exclusion",
    "Subtractive",
    "Hue",
    "Saturation",
    "Color",
    "Luminosity",
];

// Organized groups for the UI
export const BLEND_MODE_GROUPS = [
    { label: "Normal", modes: ["Normal"] },
    { label: "Inversion", modes: ["Difference", "Exclusion", "Subtractive"] },
    { label: "Darken", modes: ["Multiply", "Darken"] },
    { label: "Components", modes: ["Hue", "Saturation", "Color", "Luminosity"] },
    { label: "Lighten", modes: ["Screen", "Lighten"] },
    { label: "Contrast", modes: ["Overlay", "Soft Light", "Hard Light", "Vivid Light", "Linear Light", "Pin Light", "Hard Mix"] },
];

export interface EffectSchema {
    type: string;
    label: string;
    description: string;
    params: Record<string, string>; // e.g. { size: "int 4-100", col: "str" }
}

export interface LayerConfig {
    id: string; // Frontend only, for React keys
    type: string;
    enabled: boolean;
    range: [number, number];
    blend: BlendMode;
    clipped: boolean;
    locked: boolean;
    isCollapsed: boolean;
    ignoreBelow?: boolean;   // Process against original source, not the composite below
    ignoreMosaic?: boolean;  // Opt-out of source mosaic pixelate snapping
    lockedParams?: string[]; // Individual param keys excluded from randomization
    pinned?: boolean;        // Always render on top regardless of stack position
    [key: string]: any; // Dynamic effect parameters
}

// Defaults for a new layer (will be extended with effect-specific defaults)
export const BASE_LAYER_DEFAULTS = {
    enabled: true,
    range: [0, 255] as [number, number],
    blend: "Normal" as BlendMode,
    clipped: false,
    locked: false,
    isCollapsed: false,
    ignoreBelow: false,
    ignoreMosaic: false,
    lockedParams: [] as string[],
    pinned: false,
};
