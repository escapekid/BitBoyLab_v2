import { useState, useEffect } from "react";
import styles from "./Sidebar.module.css";
import { EffectSchema, LayerConfig, BASE_LAYER_DEFAULTS, BlendMode } from "@/types";
import LayerPanel from "../controls/LayerPanel";
import { NumberSlider, SelectDropdown } from "../controls/Controls";
import { getHarmonyColors } from "@/lib/color";
import CommunityTab from "./CommunityTab";

interface Props {
    schemas: EffectSchema[];
    layers: LayerConfig[];
    setLayers: React.Dispatch<React.SetStateAction<LayerConfig[]>>;
    textureImage: File | null;
    setTextureImage: React.Dispatch<React.SetStateAction<File | null>>;
    onExport: () => void;
    onRandomStack: () => void;
    onRandomParams: () => void;
    onClear: () => void;
    isProcessing: boolean;
    resultImage: string | null;
    globalScale: number;
    setGlobalScale: (v: number) => void;
    zoom: number;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
    pan: { x: number, y: number };
    setPan: React.Dispatch<React.SetStateAction<{ x: number, y: number }>>;
}

export default function Sidebar({
    schemas,
    layers,
    setLayers,
    textureImage,
    setTextureImage,
    onExport,
    onRandomStack,
    onRandomParams,
    onClear,
    isProcessing,
    resultImage,
    globalScale,
    setGlobalScale,
    zoom,
    setZoom,
    pan,
    setPan
}: Props) {
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [harmonyMode, setHarmonyMode] = useState<"None" | "Monochromatic" | "Complementary" | "Quad">("None");
    const [globalColor, setGlobalColor] = useState("#00ff41");
    const [isSwapped, setIsSwapped] = useState(false);
    const [theme, setTheme] = useState("dark");
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
    const [isHintOpen, setIsHintOpen] = useState(false);

    // Load theme from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem("bitboy-theme") || "dark";
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
    }, []);

    // Sync global accent color with CSS variable for logo and other UI elements
    useEffect(() => {
        document.documentElement.style.setProperty('--accent-color', globalColor);
        
        // Extract RGB for transparent variations in CSS
        if (globalColor.startsWith('#')) {
            const r = parseInt(globalColor.slice(1, 3), 16);
            const g = parseInt(globalColor.slice(3, 5), 16);
            const b = parseInt(globalColor.slice(5, 7), 16);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
            }
        }
    }, [globalColor]);

    const cycleTheme = () => {
        const themes = ["dark", "white", "blade-runner", "mono"];
        const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        setTheme(nextTheme);
        document.documentElement.setAttribute("data-theme", nextTheme);
        localStorage.setItem("bitboy-theme", nextTheme);

        // Fun dynamic color switching
        let newColor = globalColor;
        if (nextTheme === "dark") newColor = "#00ff41";
        else if (nextTheme === "white") newColor = "#02A6FF";
        else if (nextTheme === "blade-runner") newColor = "#ff00ff";
        else if (nextTheme === "mono") newColor = "#ffae00";
        
        handleGlobalColorChange(newColor);
    };

    const applyHarmony = (currentLayers: LayerConfig[], mode: string, baseColor: string, swapped: boolean) => {
        if (mode === "None") return currentLayers;

        let harmonyColors = getHarmonyColors(baseColor, mode, currentLayers.length * 2);
        if (swapped) harmonyColors = [...harmonyColors].reverse();
        let colorIdx = 0;

        return currentLayers.map(layer => {
            if (layer.type === "GRADIENT_MAP" && layer.syncHarmony === false) return layer;
            if (layer.type === "TILESET_DITHER" && layer.mode !== "Harmony") return layer;

            const colorKeys = Object.keys(layer).filter(k =>
                ["col", "color", "f_col", "bg_col", "col0", "col1", "col2", "col3"].includes(k)
            );
            if (colorKeys.length === 0) return layer;

            const newLayer = { ...layer };
            colorKeys.sort().forEach(key => {
                newLayer[key] = harmonyColors[colorIdx % harmonyColors.length];
                colorIdx++;
            });
            return newLayer;
        });
    };

    const handleAddLayer = (schema: EffectSchema) => {
        const newLayer: LayerConfig = {
            id: crypto.randomUUID(),
            type: schema.type,
            ...BASE_LAYER_DEFAULTS,
            opacity: 1.0,
        };

        Object.entries(schema.params).forEach(([key, desc]) => {
            if (key === "enabled" || key === "range") return;
            const isBool = desc.match(/\bbool\b/) || desc.includes("true/false");
            const isColor = desc.includes("hex") || desc.includes("color");

            if (isBool) newLayer[key] = false;
            else if (isColor) newLayer[key] = "#ffffff";
            else if (desc.match(/\bint\b/) || desc.match(/\bfloat\b/)) {
                const match = desc.match(/(-?\d+\.?\d*)[-–](-?\d+\.?\d*)/);
                const min = match ? Number(match[1]) : 0;
                newLayer[key] = min;
            } else if (desc.includes("|") || desc.includes(",")) {
                let optStr = desc;
                if (desc.includes(":")) optStr = desc.split(":")[1];
                else if (desc.includes("—")) optStr = desc.split("—")[0].trim();
                const delimiter = optStr.includes("|") ? "|" : ",";
                newLayer[key] = optStr.split(delimiter)[0].trim();
            }
        });

        if (schema.type === "PIXEL_SORT") {
            newLayer.range = [20, 255];
            newLayer.min_len = 10;
            newLayer.direction = "Horizontal";
            newLayer.sort_by = "Brightness";
            newLayer.ignore_mosaic = false;
        } else if (schema.type === "ASCII") {
            newLayer.size = 45;
            newLayer.set = "Standard";
            newLayer.bg_col = "#000000";
            newLayer.soft_mask = true;
        } else if (schema.type === "DITHER") {
            newLayer.size = 10;
            newLayer.pattern = "Classic 2x2";
        } else if (schema.type === "CRT") {
            newLayer.intensity = 80;
            newLayer.freq = 30;
            newLayer.oy = 0;
            newLayer.col = "#00ff41";
        } else if (schema.type === "EDGE") {
            newLayer.sensitivity = 50;
            newLayer.thickness = 1;
            newLayer.color = "#ffffff";
            newLayer.ignore_mosaic = false;
        } else if (schema.type === "BLOCK_GLITCH") {
            newLayer.size = 16;
            newLayer.amount = 0.2;
            newLayer.seed = 42;
        } else if (schema.type === "NOISE") {
            newLayer.amount = 0.2;
            newLayer.noise_type = "Uniform";
            newLayer.seed = 42;
        } else if (schema.type === "TEXTURE") {
            newLayer.invert = false;
            newLayer.scale = 1.0;
            newLayer.rotation = 0;
            newLayer.ox = 0;
            newLayer.oy = 0;
            newLayer.repeat = true;
            newLayer.luma_alpha = false;
            newLayer.blend = "Soft Light" as BlendMode;
        } else if (schema.type === "TILESET_DITHER") {
            newLayer.size = 12;
            newLayer.brightness = 1.0;
            newLayer.contrast = 1.0;
            newLayer.mode = "Source Colors";
            newLayer.symbol_set = "standard";
            newLayer.col0 = "#000000";
            newLayer.col1 = "#555555";
            newLayer.col2 = "#aaaaaa";
            newLayer.col3 = "#ffffff";
            newLayer.num_colors = "4";
            newLayer.full_bg = true;
        } else if (schema.type === "HALFTONE") {
            newLayer.size = 8;
            newLayer.method = "Classic";
            newLayer.col = "#ffffff";
            newLayer.dot_scale = 0.9;
            newLayer.blend = "Overlay" as BlendMode;
        } else if (schema.type === "POSTERIZE") {
            newLayer.levels = 4;
            newLayer.blend = "Normal" as BlendMode;
        } else if (schema.type === "GRADIENT_MAP") {
            newLayer.col0 = "#000000";
            newLayer.pos0 = 0;
            newLayer.col1 = "#555555";
            newLayer.pos1 = 85;
            newLayer.col2 = "#aaaaaa";
            newLayer.pos2 = 170;
            newLayer.col3 = "#ffffff";
            newLayer.pos3 = 255;
            newLayer.num_colors = "4";
            newLayer.syncHarmony = true;
            newLayer.blend = "Normal" as BlendMode;
        } else if (schema.type === "LEVELS") {
            newLayer.black_lift = 0;
            newLayer.mid_point = 1.0;
            newLayer.white_point = 255;
        } else if (schema.type === "THRESHOLD") {
            newLayer.threshold_val = 128;
        } else if (schema.type === "SOURCE") {
            newLayer.mosaic = 1;
            newLayer.opacity = 1.0;
            newLayer.blend = "Normal";
        }

        const updatedLayers = [newLayer, ...layers];
        setLayers(applyHarmony(updatedLayers, harmonyMode, globalColor, isSwapped));
        setIsAddMenuOpen(false);
    };

    const handleDragEnd = (fromIdx: number, toIdx: number | null) => {
        setDragIdx(null);
        setDragOverIdx(null);
        if (toIdx === null || fromIdx === toIdx || fromIdx === toIdx - 1) return;
        const newLayers = [...layers];
        const [moved] = newLayers.splice(fromIdx, 1);
        const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
        newLayers.splice(insertAt, 0, moved);
        setLayers(newLayers);
    };

    const clearLayersInternal = () => setLayers(layers.filter(l => l.locked));

    const randomizeStack = () => {
        const bitboyTypes = ["ASCII", "DITHER", "TILESET_DITHER", "PIXEL_SORT", "GLITCH", "BLOCK_GLITCH"];
        const postAdjTypes = ["CRT", "NOISE", "EDGE", "HALFTONE", "POSTERIZE", "LEVELS", "THRESHOLD", "GRADIENT_MAP"];
        
        const hasSource = layers.some(l => l.type === "SOURCE");
        let hasBitboy = layers.some(l => l.locked && bitboyTypes.includes(l.type));
        
        const randomized = layers.map(layer => {
            if (layer.locked) return layer;
            
            // If it's a SOURCE layer and not locked, randomize its mosaic and force Normal blend
            if (layer.type === "SOURCE") {
                return {
                    ...layer,
                    blend: "Normal" as BlendMode,
                    mosaic: Math.random() > 0.5 ? Math.floor(Math.random() * 40) + 5 : 1,
                };
            }

            const canAddPostAdj = hasSource && hasBitboy;
            let poolTypes = bitboyTypes;
            
            // 60% chance for BitBoy, 40% for Post/Adj (if allowed)
            if (canAddPostAdj && Math.random() > 0.6) {
                poolTypes = postAdjTypes;
            }

            const targetType = poolTypes[Math.floor(Math.random() * poolTypes.length)];
            if (bitboyTypes.includes(targetType)) hasBitboy = true;
            
            const schema = schemas.find(s => s.type === targetType);
            if (!schema) return layer;

            const newLayer: LayerConfig = {
                id: layer.id, // preserve ID
                type: schema.type,
                ...BASE_LAYER_DEFAULTS,
                opacity: 1.0,
                blend: ["Normal", "Overlay", "Screen", "Multiply", "Difference", "Exclusion"][Math.floor(Math.random() * 6)] as BlendMode,
            };

            // Apply random params
            Object.entries(schema.params).forEach(([key, desc]) => {
                if (key === "enabled" || key === "range") return;
                if ((layer.lockedParams ?? []).includes(key)) return; // Skip locked params

                const isBool = desc.includes("bool") || desc.includes("true/false");
                const isColor = (desc.includes("hex") || desc.includes("color")) && !key.includes("num_colors");

                if (key === "size") newLayer[key] = Math.floor(Math.random() * 100) + 2;
                else if (key === "scale") newLayer[key] = 0.5 + Math.random() * 2.5;
                else if (key === "amount") newLayer[key] = Math.random();
                else if (isBool) {
                    newLayer[key] = Math.random() > 0.5;
                } else if (isColor) {
                    newLayer[key] = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
                } else if (/\bint\b/i.test(desc) || /\bfloat\b/i.test(desc)) {
                    const match = desc.match(/(-?\d+\.?\d*)[-–](-?\d+\.?\d*)/);
                    if (match) {
                        const min = Number(match[1]);
                        const max = Number(match[2]);
                        newLayer[key] = min + Math.random() * (max - min);
                        if (desc.includes("int") || key.startsWith("pos")) newLayer[key] = Math.floor(newLayer[key]);
                    }
                } else if (desc.includes("|") || desc.includes(",")) {
                    let optStr = desc;
                    if (desc.includes(":")) optStr = desc.split(":")[1];
                    else if (desc.includes("—")) optStr = desc.split("—")[0].trim();
                    const delimiter = optStr.includes("|") ? "|" : ",";
                    const options = optStr.split(delimiter).map(s => s.trim());
                    newLayer[key] = options[Math.floor(Math.random() * options.length)];
                }
            });
            return newLayer;
        });

        setLayers(applyHarmony(randomized, harmonyMode, globalColor, isSwapped));
    };

    const randomizeParams = () => {
        const randLayers = layers.map(layer => {
            if (layer.locked) return layer;
            const schema = schemas.find(s => s.type === layer.type);
            if (!schema) return layer;
            const randLayer = { ...layer };
            Object.entries(schema.params).forEach(([key, desc]) => {
                if (key === "enabled" || key === "range") return;
                if ((layer.lockedParams ?? []).includes(key)) return; // Skip locked params

                const isBool = desc.includes("bool") || desc.includes("true/false");
                const isColor = (desc.includes("hex") || desc.includes("color")) && !key.includes("num_colors");

                if (key === "size") randLayer[key] = Math.floor(Math.random() * 60) + 10;
                else if (isBool) {
                    randLayer[key] = Math.random() > 0.5;
                } else if (isColor) {
                    randLayer[key] = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
                } else if (/\bint\b/i.test(desc) || /\bfloat\b/i.test(desc)) {
                    const match = desc.match(/(-?\d+\.?\d*)[-–](-?\d+\.?\d*)/);
                    if (match) {
                        const min = Number(match[1]);
                        const max = Number(match[2]);
                        randLayer[key] = min + Math.random() * (max - min);
                        if (desc.includes("int") || key.startsWith("pos")) randLayer[key] = Math.floor(randLayer[key]);
                    }
                } else if (desc.includes("|") || desc.includes(",")) {
                    let optStr = desc;
                    if (desc.includes(":")) optStr = desc.split(":")[1];
                    else if (desc.includes("—")) optStr = desc.split("—")[0].trim();
                    const delimiter = optStr.includes("|") ? "|" : ",";
                    const options = optStr.split(delimiter).map(s => s.trim());
                    randLayer[key] = options[Math.floor(Math.random() * options.length)];
                }
            });
            return randLayer;
        });
        setLayers(applyHarmony(randLayers, harmonyMode, globalColor, isSwapped));
    };

    const handleHarmonyChange = (newMode: typeof harmonyMode) => {
        setHarmonyMode(newMode);
        setLayers(applyHarmony(layers, newMode, globalColor, isSwapped));
    };

    const handleGlobalColorChange = (newColor: string) => {
        setGlobalColor(newColor);
        setLayers(applyHarmony(layers, harmonyMode, newColor, isSwapped));
    };

    const handleSwap = () => {
        const newSwapped = !isSwapped;
        setIsSwapped(newSwapped);
        setLayers(applyHarmony(layers, harmonyMode, globalColor, newSwapped));
    };

    const handleSaveRecipe = () => {
        const recipe = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            layers: layers
        };
        const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recipe-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleLoadRecipe = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.layers && Array.isArray(json.layers)) {
                    // Update IDs to avoid duplicates if loaded multiple times
                    const importedLayers = json.layers.map((l: any) => ({
                        ...l,
                        id: crypto.randomUUID()
                    }));
                    setLayers(importedLayers);
                }
            } catch (err) {
                console.error("Failed to load recipe:", err);
                alert("Invalid recipe file.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.globalSettings}>
                <pre 
                    className={styles.asciiLogo}
                    onClick={cycleTheme}
                    title="Click to change theme"
                >
                    {`██████╗ ██╗████████╗██████╗  ██████╗ ██╗   ██╗
██╔══██╗██║╚══██╔══╝██╔══██╗██╔═══██╗╚██╗ ██╔╝
██████╔╝██║   ██║   ██████╔╝██║   ██║ ╚████╔╝ 
██╔══██╗██║   ██║   ██╔══██╗██║   ██║  ╚██╔╝  
██████╔╝██║   ██║   ██████╔╝╚██████╔╝   ██║   
╚═════╝ ╚═╝   ╚═╝   ╚═════╝  ╚═════╝    ╚═╝`}
                </pre>

                <div className={styles.harmonyCont}>
                    <div className={styles.harmonyHeader}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>Harmony</span>
                            <button
                                className={isSwapped ? styles.swapBtnActive : styles.swapBtn}
                                onClick={handleSwap}
                                title="Swap Colors"
                            >
                                ⇄
                            </button>
                        </div>
                        <div className={styles.colorPickerGroup}>
                            <SelectDropdown
                                label=""
                                value={harmonyMode}
                                options={["None", "Monochromatic", "Complementary", "Quad"]}
                                onChange={(v) => handleHarmonyChange(v as any)}
                                className={styles.harmonyDropdown}
                            />
                            <input
                                type="text"
                                value={globalColor}
                                onChange={(e) => handleGlobalColorChange(e.target.value)}
                                className={styles.hexInput}
                                placeholder="#000000"
                            />
                            <input
                                type="color"
                                value={globalColor}
                                onChange={(e) => handleGlobalColorChange(e.target.value)}
                                className={styles.colorWheel}
                            />
                        </div>
                    </div>

                    <div className={styles.globalScaleRow}>
                        <button
                            onClick={() => setIsHintOpen(true)}
                            title="Layer Icon Guide"
                            className={styles.helpBtn}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                        </button>
                        <div className={styles.scaleButtons}>
                            <div className={styles.scaleLabel} style={{ marginRight: "6px" }}>SCALE</div>
                            <button
                                className={styles.scaleBtn}
                                onClick={() => setGlobalScale(Math.max(0.25, globalScale - 0.05))}
                                title="Decrease Scale"
                            >
                                -
                            </button>
                            <div className={styles.scaleValue}>{globalScale.toFixed(2)}</div>
                            <button
                                className={styles.scaleBtn}
                                onClick={() => setGlobalScale(Math.min(4.0, globalScale + 0.05))}
                                title="Increase Scale"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.header}>
                <h2>Layer Stack</h2>
                <div style={{ position: "relative", display: "flex", gap: "8px" }}>
                    <button className={styles.addBtn} onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}>+ Add Layer</button>
                    {isAddMenuOpen && (
                        <div className={styles.addMenu}>
                            {[
                                { title: "BitBoy", types: ["ASCII", "DITHER", "TILESET_DITHER", "PIXEL_SORT", "GLITCH", "BLOCK_GLITCH"] },
                                { title: "Post Process", types: ["CRT", "NOISE", "EDGE", "HALFTONE"] },
                                { title: "Adjustments", types: ["POSTERIZE", "LEVELS", "THRESHOLD", "GRADIENT_MAP"] },
                                { title: "Sources", types: ["SOURCE", "TEXTURE"] }
                            ].map(cat => (
                                <div key={cat.title} className={styles.categoryGroup}>
                                    <div className={styles.categoryHeader}>{cat.title}</div>
                                    {cat.types.map(type => {
                                        const schema = schemas.find(s => s.type === type);
                                        if (!schema) return null;
                                        return (
                                            <div key={type} className={styles.menuItem} onClick={() => handleAddLayer(schema)}>
                                                {schema.label}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.content}>
                {layers.length === 0 ? (
                    <div className={styles.emptyState}>No layers added yet.</div>
                ) : (
                    <div
                        onDragOver={(e) => { e.preventDefault(); }}
                        // onDrop={() => handleDragEnd(dragIdx!, dragOverIdx)} // This was moved to individual layer divs
                    >
                        {layers.map((layer, idx) => {
                            const schema = schemas.find(s => s.type === layer.type);
                            if (!schema) return null;
                            return (
                                <div
                                    key={layer.id}
                                    // draggable // Moved to LayerPanel
                                    // onDragStart={() => setDragIdx(idx)} // Moved to LayerPanel
                                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                                    onDrop={() => handleDragEnd(dragIdx!, dragOverIdx)} // Moved here from parent div
                                    // onDragEnd={() => handleDragEnd(dragIdx!, dragOverIdx)} // Moved to LayerPanel
                                    style={{
                                        opacity: dragIdx === idx ? 0.4 : 1,
                                        transition: "opacity 0.15s",
                                        cursor: "grab",
                                    }}
                                >
                                    {/* Drop indicator line above this layer */}
                                    {dragOverIdx === idx && dragIdx !== idx && (
                                        <div style={{
                                            height: "2px",
                                            background: "var(--accent-color, #00ff41)",
                                            borderRadius: "2px",
                                            margin: "2px 0",
                                            boxShadow: "0 0 6px var(--accent-color, #00ff41)",
                                        }} />
                                    )}
                                    <LayerPanel
                                        layer={layer}
                                        schema={schema}
                                        onChange={(updated) => {
                                            // Find layer by ID to avoid stale-closure index bugs
                                            const oldLayer = layers.find(l => l.id === updated.id);
                                            const pinnedTurnedOn = updated.pinned && !oldLayer?.pinned;

                                            let newLayers = layers.map(l => l.id === updated.id ? updated : l);

                                            if (pinnedTurnedOn) {
                                                // Bucket-sort: [pinned...][unpinned...][SOURCE]
                                                const source  = newLayers.filter(l => l.type === "SOURCE");
                                                const pinned  = newLayers.filter(l => l.pinned && l.type !== "SOURCE");
                                                const rest    = newLayers.filter(l => !l.pinned && l.type !== "SOURCE");
                                                newLayers = [...pinned, ...rest, ...source];
                                            }
                                            setLayers(newLayers);
                                        }}
                                        onRemove={() => setLayers(layers.filter((_, i) => i !== idx))}
                                        onDragStart={() => setDragIdx(idx)} // Added as prop
                                        onDragEnd={() => handleDragEnd(dragIdx!, dragOverIdx)} // Added as prop
                                        textureImage={textureImage}
                                        setTextureImage={setTextureImage}
                                    />
                                </div>
                            );
                        })}
                        {/* Drop zone at the very bottom */}
                        <div
                            style={{ height: "24px" }}
                            onDragOver={(e) => { e.preventDefault(); setDragOverIdx(layers.length); }}
                        >
                            {dragOverIdx === layers.length && (
                                <div style={{
                                    height: "2px",
                                    background: "var(--accent-color, #00ff41)",
                                    borderRadius: "2px",
                                    margin: "2px 0",
                                    boxShadow: "0 0 6px var(--accent-color, #00ff41)",
                                }} />
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.recipeCont}>
                <div className={styles.recipeHeader}>Glitch Recipes</div>
                <div className={styles.recipeBtnGroup}>
                    <button className={styles.recipeBtn} onClick={handleSaveRecipe} title="Save current stack">Save Recipe</button>
                    <label className={styles.recipeBtn}>
                        Load Recipe
                        <input type="file" accept=".json" onChange={handleLoadRecipe} hidden />
                    </label>
                </div>
            </div>

            {/* ─── Icon Hint Modal ─── */}
            {isHintOpen && (
                <div
                    onClick={() => setIsHintOpen(false)}
                    style={{
                        position: "fixed", inset: 0, zIndex: 9999,
                        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "var(--panel-bg, #111)", border: "1px solid var(--accent-color, #00ff41)",
                            borderRadius: "10px", padding: "28px 32px", maxWidth: "460px", width: "90%",
                            boxShadow: "0 0 40px rgba(0,255,65,0.15)", color: "var(--text-primary, #fff)",
                            fontFamily: "monospace", position: "relative",
                        }}
                    >
                        <button
                            onClick={() => setIsHintOpen(false)}
                            style={{
                                position: "absolute", top: "12px", right: "14px",
                                background: "none", border: "none", color: "inherit", fontSize: "18px",
                                cursor: "pointer", opacity: 0.6,
                            }}
                        >×</button>

                        <h3 style={{ margin: "0 0 18px", fontSize: "13px", textTransform: "uppercase",
                            letterSpacing: "2px", color: "var(--accent-color, #00ff41)" }}>
                            Layer Icons · Symbole
                        </h3>

                        {[
                            { icon: "▶", en: "Collapse / expand layer body", de: "Layer ein-/ausklappen" },
                            { icon: "●", en: "Enable / disable layer", de: "Layer ein-/ausschalten" },
                            { icon: "↳", en: "Clip to layer below (mask)", de: "An Layer darunter clippen" },
                            { icon: "⊥", en: "Ignore layers below (read source directly)", de: "Layer darunter ignorieren (nur Quelle)" },
                            { icon: "⊞", en: "Ignore mosaic grid (free pixel grid)", de: "Mosaik-Raster ignorieren" },
                            { icon: "◇ / ◈", en: "Lock / unlock layer (prevents all randomization)", de: "Layer sperren / entsperren (kein Zufall)" },
                            { icon: "TOP", en: "Pin to top (always renders on top)", de: "Oben anheften (immer oben gerendert)" },
                            { icon: "×", en: "Remove layer from stack", de: "Layer aus dem Stack entfernen" },
                            { icon: "■ / □", en: "Lock single param (skip in randomize)", de: "Einzelnen Parameter sperren (kein Zufall)" },
                        ].map(({ icon, en, de }) => (
                            <div key={icon} style={{
                                display: "grid", gridTemplateColumns: "44px 1fr",
                                gap: "6px 12px", alignItems: "start",
                                padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
                                fontSize: "12px",
                            }}>
                                <span style={{
                                    fontSize: "14px", fontWeight: 700,
                                    color: "var(--accent-color, #00ff41)", textAlign: "center",
                                }}>{icon}</span>
                                <span>
                                    <span style={{ opacity: 0.55, fontSize: "10px", marginRight: "4px" }}>EN</span>{en}<br />
                                    <span style={{ opacity: 0.55, fontSize: "10px", marginRight: "4px" }}>DE</span>
                                    <span style={{ opacity: 0.75 }}>{de}</span>
                                </span>
                            </div>
                        ))}

                        <p style={{ margin: "14px 0 0", fontSize: "10px", opacity: 0.4, textAlign: "center" }}>
                            Click outside or × to close
                        </p>
                    </div>
                </div>
            )}
        </aside>

    );
}
