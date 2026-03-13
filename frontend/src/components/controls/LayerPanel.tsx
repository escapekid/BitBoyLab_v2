import React, { useRef } from 'react';
import styles from './LayerPanel.module.css';
import { EffectSchema, LayerConfig, BlendMode, BLEND_MODES, BLEND_MODE_GROUPS } from '@/types';
import { NumberSlider, SelectDropdown, ColorPicker, Toggle, RangeSlider } from './Controls';

interface Props {
    layer: LayerConfig;
    schema: EffectSchema;
    onChange: (updated: LayerConfig) => void;
    onRemove: () => void;
    onDragStart: () => void;
    onDragEnd: () => void;
    textureImage: File | null;
    setTextureImage: (file: File | null) => void;
}

export default function LayerPanel({
    layer, schema, onChange, onRemove, onDragStart, onDragEnd, textureImage, setTextureImage
}: Props) {

    const updateField = (key: string, value: any) => {
        onChange({ ...layer, [key]: value });
    };

    // Drag handle: only let the card be draggable when user grabs the handle
    const canDragRef = useRef(false);

    const isParamLocked = (key: string) =>
        (layer.lockedParams ?? []).includes(key);

    const toggleParamLock = (key: string) => {
        const current = layer.lockedParams ?? [];
        const next = current.includes(key)
            ? current.filter(k => k !== key)
            : [...current, key];
        onChange({ ...layer, lockedParams: next });
    };

    const lockBtn = (key: string) => {
        const locked = isParamLocked(key);
        return (
            <button
                onClick={() => toggleParamLock(key)}
                title={locked ? "Unlock param" : "Lock param (skip randomization)"}
                style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "9px", padding: "0 0 0 3px",
                    opacity: locked ? 1 : 0.25,
                    color: locked ? "var(--accent-color, #00ff41)" : "currentColor",
                    verticalAlign: "middle", lineHeight: 1,
                    transition: "opacity 0.15s, color 0.15s",
                }}
            >
                {locked ? "■" : "□"}
            </button>
        );
    };

    const lbl = (key: string) => <>{key}{lockBtn(key)}</>;

    const renderControl = (key: string, desc: string) => {
        const val = layer[key];

        // Conditional visibility for Gradient Map & Tileset Dither
        if (layer.type === "GRADIENT_MAP") {
            const numColors = parseInt(layer.num_colors?.toString() || "4");
            if (numColors === 2 && (key.includes("col1") || key.includes("pos1") || key.includes("col2") || key.includes("pos2"))) return null;
            if (numColors === 3 && (key.includes("col2") || key.includes("pos2"))) return null;
        }

        if (layer.type === "TILESET_DITHER") {
            if (layer.mode !== "Harmony" && key.startsWith("col")) return null;
        }

        // Booleans first
        if (desc.match(/\bbool\b/) || desc.includes("true/false")) {
            return <Toggle key={key} label={lbl(key)} value={!!val} onChange={(v) => updateField(key, v)} />;
        }

        const isNumeric = (/\bint\b/i.test(desc) || /\bfloat\b/i.test(desc)) ||
            ["size", "levels", "opacity", "amount", "intensity", "freq", "ox", "oy", "sensitivity", "thickness", "min_len", "max_len", "quality", "seed", "mosaic", "dot_scale"].includes(key);

        if (isNumeric) {
            const match = desc.match(/(-?\d+\.?\d*)[-–—](-?\d+\.?\d*)/);
            const min = match ? Number(match[1]) : 0;
            const max = match ? Number(match[2]) : (key === "opacity" || key === "amount" ? 1 : 255);
            const step = (desc.includes("float") || ["opacity", "amount", "dot_scale", "randomness"].includes(key)) ? 0.01 : 1;

            const numericVal = typeof val === 'number' ? val : (parseInt(val) || min);

            return <NumberSlider key={key} label={lbl(key)} value={numericVal} min={min} max={max} step={step} onChange={(v) => updateField(key, v)} />;
        }

        if (desc.includes("|") || desc.includes(",")) {
            let optStr = desc;
            if (desc.includes(":")) optStr = desc.split(":")[1];
            else if (desc.includes("—")) optStr = desc.split("—")[0].trim();

            const delimiter = optStr.includes("|") ? "|" : ",";
            const options = optStr.split(delimiter).map(s => s.trim()).filter(s => s.length > 0);
            return <SelectDropdown key={key} label={lbl(key)} value={val?.toString() || options[0]} options={options} onChange={(v) => updateField(key, v)} />;
        }

        const isColor = desc.includes("hex") || desc.includes("color") || ["col", "color", "f_col", "bg_col", "bg_color"].includes(key);

        if (isColor) {
            const defaultColor = key.includes("bg") ? '#000000' : '#ffffff';
            return <ColorPicker key={key} label={lbl(key)} value={val || defaultColor} onChange={(v) => updateField(key, v)} />;
        }

        if (key === "range") {
            return <RangeSlider key={key} label="Threshold" value={val || [0, 255]} onChange={(v: [number, number]) => updateField(key, v)} />;
        }

        return null;
    };

    return (
        <div
            className={`${styles.layerCard} ${layer.clipped ? styles.clippedLayer : ''}`}
            style={layer.pinned ? { borderTop: "2px solid var(--accent-color, #00ff41)", boxShadow: "0 -3px 10px rgba(var(--accent-rgb, 0,255,65), 0.25)" } : {}}
            draggable
            onDragStart={(e) => {
                if (!canDragRef.current) { e.preventDefault(); return; }
                onDragStart();
            }}
            onDragEnd={() => { canDragRef.current = false; onDragEnd(); }}
        >
            <div
                className={`${styles.header} ${layer.isCollapsed ? styles.collapsedHeader : ''}`}
                onDoubleClick={() => updateField("isCollapsed", !layer.isCollapsed)}
                onMouseDown={() => { canDragRef.current = true; }}
                title="Drag to reorder · Double-click to expand"
            >
                <div className={styles.titleRow}>
                    <div
                        className={`${styles.chevron} ${!layer.isCollapsed ? styles.chevronExpanded : ''}`}
                        onClick={(e) => { e.stopPropagation(); updateField("isCollapsed", !layer.isCollapsed); }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        ▶
                    </div>
                    <div onMouseDown={(e) => e.stopPropagation()}>
                        <Toggle label="" value={layer.enabled} onChange={(v) => updateField("enabled", v)} />
                    </div>
                    <h3 className={styles.title} title={schema.description}>{schema.label}</h3>
                    <div className={styles.actions} style={{ marginLeft: "auto" }} onMouseDown={(e) => e.stopPropagation()}>
                        {layer.type !== "SOURCE" && (
                            <button
                                className={layer.clipped ? styles.clipBtnActive : styles.clipBtn}
                                onClick={() => updateField("clipped", !layer.clipped)}
                                title="Clip to Layer Below"
                            >
                                ↳
                            </button>
                        )}
                        {layer.type !== "SOURCE" && (
                            <button
                                className={layer.ignoreBelow ? styles.clipBtnActive : styles.clipBtn}
                                onClick={() => updateField("ignoreBelow", !layer.ignoreBelow)}
                                title={layer.ignoreBelow ? "Reads original source" : "Ignore layers below"}
                            >
                                ⊥
                            </button>
                        )}
                        {layer.type !== "SOURCE" && (
                            <button
                                className={layer.ignoreMosaic ? styles.clipBtnActive : styles.clipBtn}
                                onClick={() => updateField("ignoreMosaic", !layer.ignoreMosaic)}
                                title={layer.ignoreMosaic ? "Free pixel grid" : "Snap to mosaic grid"}
                            >
                                ⊞
                            </button>
                        )}
                        <button
                            className={layer.locked ? styles.lockBtnActive : styles.lockBtn}
                            onClick={() => updateField("locked", !layer.locked)}
                            title={layer.locked ? "Unlock Layer" : "Lock Layer"}
                        >
                            {layer.locked ? "◈" : "◇"}
                        </button>
                        {layer.type !== "SOURCE" && (
                            <button
                                className={layer.pinned ? styles.clipBtnActive : styles.clipBtn}
                                onClick={() => updateField("pinned", !layer.pinned)}
                                title={layer.pinned ? "Unpin (stack order)" : "Pin to top"}
                                style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px" }}
                            >
                                TOP
                            </button>
                        )}
                        {!layer.locked && (
                            <button onClick={onRemove} className={styles.iconBtnDanger} title="Remove Layer">×</button>
                        )}
                    </div>
                </div>
            </div>

            {!layer.isCollapsed && (
                <div className={styles.body}>
                    <div className={styles.globalConfig}>
                        <SelectDropdown
                            label={lbl("blend")}
                            value={layer.blend}
                            groups={BLEND_MODE_GROUPS}
                            variant="grid"
                            onChange={(v) => updateField("blend", v as BlendMode)}
                        />
                        <div style={{ marginTop: "12px" }}>
                            <NumberSlider
                                label={lbl("opacity")}
                                value={layer.opacity ?? 1.0}
                                min={0}
                                max={1}
                                step={0.01}
                                onChange={(v) => updateField("opacity", v)}
                            />
                        </div>
                    </div>

                    <div className={styles.divider} />

                    <div className={styles.effectConfig}>
                        <div style={{ marginBottom: "20px" }}>
                            <RangeSlider
                                label={lbl("range")}
                                value={layer.range}
                                onChange={(v: [number, number]) => updateField("range", v)}
                            />
                        </div>

                        <div className={styles.divider} />

                        {Object.entries(schema.params).map(([key, desc]) => {
                            if (["enabled", "blend", "range", "opacity"].includes(key)) return null;
                            const control = renderControl(key, desc);
                            if (!control) return null;
                            return (
                                <div key={key} style={{ marginBottom: "12px" }}>
                                    {control}
                                </div>
                            );
                        })}

                        {layer.type === "TEXTURE" && (
                            <div className={styles.textureSlot}>
                                <label>Texture File</label>
                                <div
                                    className={styles.uploadArea}
                                    onClick={() => document.getElementById(`texture-upload-${layer.id}`)?.click()}
                                >
                                    <div className={`${styles.uploadText} ${textureImage ? styles.uploadTextActive : ''}`}>
                                        {textureImage ? textureImage.name : "Click to upload texture (PNG/JPG)"}
                                    </div>
                                    <input
                                        id={`texture-upload-${layer.id}`}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: "none" }}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setTextureImage(file);
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
