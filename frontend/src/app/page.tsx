"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import styles from "./page.module.css";
import Canvas from "@/components/layout/Canvas";
import Sidebar from "@/components/layout/Sidebar";
import LeftToolbar from "@/components/layout/LeftToolbar";
import CommunityTab from "@/components/layout/CommunityTab";
import { EffectSchema, LayerConfig, BASE_LAYER_DEFAULTS, BlendMode } from "@/types";
import { fetchEffects } from "@/lib/api";
import { Engine } from "@/lib/engine";

export default function Home() {
  const [schemas, setSchemas] = useState<EffectSchema[]>([]);
  const [layers, setLayers] = useState<LayerConfig[]>([
    {
      id: "initial-source",
      type: "SOURCE",
      enabled: true,
      blend: "Normal",
      range: [0, 255],
      clipped: false,
      isCollapsed: true,
      mosaic: 1,
      opacity: 1.0,
      locked: true,
    }
  ]);

  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [textureImage, setTextureImage] = useState<File | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalScale, setGlobalScale] = useState(1.0);
  const [view, setView] = useState<"editor" | "community">("editor");

  // Exclude UI-only props (isCollapsed, locked) so toggling them doesn't re-render
  const renderKey = useMemo(() =>
    JSON.stringify(layers.map(({ isCollapsed: _ic, locked: _lk, ...rest }) => rest)),
    [layers]
  );

  // Lifted Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Reset zoom only when a NEW source image is uploaded
  useEffect(() => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
  }, [sourceImage]);


  useEffect(() => {
    fetchEffects().then(setSchemas).catch(console.error);
  }, []);

  // Debounce logic for processing
  useEffect(() => {
    if (!sourceImage) return;

    const timer = setTimeout(async () => {
      setIsProcessing(true);
      try {
        const url = URL.createObjectURL(sourceImage);
        const img = new Image();
        img.src = url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        
        const canvas = await Engine.render(img, layers, globalScale, textureImage);
        const resultDataUrl = canvas.toDataURL("image/jpeg", 0.9);
        
        setResultImage(resultDataUrl);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [sourceImage, renderKey, textureImage, globalScale]);

  const handleExport = useCallback(() => {
    if (!resultImage) return;

    // Create a temporary link and trigger download
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = `bitboy-lab-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
  }, [resultImage]);

  const handleClear = useCallback(() => {
    setLayers(layers.map(l => {
      if (l.type === "SOURCE") {
        return { ...l, mosaic: 1 };
      }
      return l;
    }).filter(l => l.locked));
  }, [layers]);

  const handleRandomStack = useCallback(() => {
    // Weighted pools for better distribution
    const bitboyWeighted = [
      ...Array(4).fill("ASCII"),
      ...Array(4).fill("DITHER"),
      ...Array(4).fill("TILESET_DITHER"),
      "PIXEL_SORT",
      "PIXEL_SORT",
      "GLITCH",
      "BLOCK_GLITCH",
    ];

    // Weighted postAdj pool — HALFTONE and CRT (scanlines) appear less often
    const postAdjWeighted = [
      "NOISE", "NOISE",
      "EDGE", "EDGE",
      "POSTERIZE", "POSTERIZE",
      "LEVELS", "LEVELS",
      "THRESHOLD",
      "GRADIENT_MAP",
      "CRT",       // rare
      "HALFTONE",  // rare
    ];

    // Retrieve locked layers to keep them
    const lockedLayers = layers.filter(l => l.locked);

    // 1. Mandatory Bottom Source
    let sourceLayer: LayerConfig | null = null;
    const existingSource = layers.find(l => l.type === "SOURCE");
    const sourceSchema = schemas.find(s => s.type === "SOURCE");

    if (existingSource) {
      sourceLayer = {
        ...existingSource,
        blend: "Normal",
        mosaic: Math.random() > 0.5 ? Math.floor(Math.random() * 20) + 2 : 1
      };
    } else if (sourceSchema) {
      sourceLayer = {
        id: crypto.randomUUID(),
        type: "SOURCE",
        ...BASE_LAYER_DEFAULTS,
        mosaic: Math.random() > 0.5 ? Math.floor(Math.random() * 20) + 2 : 1,
        opacity: 1.0,
        blend: "Normal",
        isCollapsed: true,
        clipped: false,
        locked: true,
      };
    }

    const bitboyTypes = ["ASCII", "DITHER", "TILESET_DITHER", "PIXEL_SORT", "GLITCH", "BLOCK_GLITCH"];
    const topTypes = ["ASCII", "DITHER", "TILESET_DITHER"]; // always sorted to top
    const postAdjTypes = ["CRT", "NOISE", "EDGE", "HALFTONE", "POSTERIZE", "LEVELS", "THRESHOLD", "GRADIENT_MAP"];
    let hasBitboy = lockedLayers.some(l => bitboyTypes.includes(l.type));

    // Determine how many new layers to generate (2 to 5)
    const numToGenerate = Math.floor(Math.random() * 4) + 2;

    // Create random layers
    const generatedLayers: LayerConfig[] = [];
    let nonNormalCount = 0;

    for (let i = 0; i < numToGenerate; i++) {
      const hasSource = Boolean(sourceLayer);
      const canAddPostAdj = hasSource && hasBitboy;
      
      let targetType: string;
      if (canAddPostAdj && Math.random() > 0.8) {
        targetType = postAdjWeighted[Math.floor(Math.random() * postAdjWeighted.length)];
      } else {
        targetType = bitboyWeighted[Math.floor(Math.random() * bitboyWeighted.length)];
      }

      // Skip if we already have an adjustment layer and try to add another one
      const isAdj = postAdjTypes.includes(targetType);
      const hasExistingAdj = generatedLayers.some(l => postAdjTypes.includes(l.type));
      if (isAdj && hasExistingAdj) {
        i--; // Retry this slot
        continue;
      }

      const schema = schemas.find(s => s.type === targetType);
      if (!schema) continue;

      if (bitboyTypes.includes(targetType)) hasBitboy = true;

      // Determine blend mode
      let blend: BlendMode = "Normal";
      if (targetType !== "PIXEL_SORT") {
        const modes: BlendMode[] = ["Normal", "Overlay", "Screen", "Multiply", "Difference", "Exclusion"];
        let availableModes = isAdj ? modes.filter(m => m !== "Difference" && m !== "Exclusion") : modes;
        
        // If 2+ layers already have non-normal blend modes, restrict further layers
        if (nonNormalCount >= 2) {
          const safeModes: BlendMode[] = ["Normal", "Difference", "Exclusion", "Subtractive", "Hue", "Saturation", "Color", "Luminosity"];
          availableModes = availableModes.filter(m => safeModes.includes(m));
        }

        blend = availableModes[Math.floor(Math.random() * availableModes.length)];
        if (blend !== "Normal") nonNormalCount++;
      }

      // Determine if it handles its own background (Ignore Below/Mosaic)
      // If the layer below (last in generatedLayers or source) has a non-normal blend, 
      // there's a chance this layer will ignore it to keep contrast.
      const layerBelow = generatedLayers[0] || sourceLayer;
      const shouldIgnore = layerBelow && layerBelow.blend !== "Normal" && Math.random() > 0.6;

      const layer: LayerConfig = {
        id: crypto.randomUUID(),
        type: schema.type,
        ...BASE_LAYER_DEFAULTS,
        opacity: 1.0,
        blend,
        ignoreBelow: shouldIgnore,
        ignoreMosaic: shouldIgnore,
        isCollapsed: false,
        clipped: false,
        locked: false,
      };

      // Apply random params
      Object.entries(schema.params).forEach(([key, desc]) => {
        if (key === "enabled" || key === "range") return;
        if ((layer.lockedParams ?? []).includes(key)) return;

        if (targetType === "PIXEL_SORT") {
          if (key === "min_len") {
            layer[key] = 0;
            return;
          }
          if (key === "max_len") {
            layer[key] = Math.floor(Math.random() * 800) + 201; // Always > 200
            return;
          }
        }

        const isBool = desc.includes("bool") || desc.includes("true/false");
        const isColor = (desc.includes("hex") || desc.includes("color")) && !key.includes("num_colors");

        if (key === "size") layer[key] = Math.floor(Math.random() * 100) + 2;
        else if (key === "scale") layer[key] = 0.5 + Math.random() * 2.5;
        else if (key === "amount") layer[key] = Math.random();
        else if (isBool) {
          layer[key] = Math.random() > 0.5;
        } else if (isColor) {
          layer[key] = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        } else if (/\bint\b/i.test(desc) || /\bfloat\b/i.test(desc)) {
          const match = desc.match(/(-?\d+\.?\d*)[-–](-?\d+\.?\d*)/);
          if (match) {
            const min = Number(match[1]);
            const max = Number(match[2]);
            layer[key] = min + Math.random() * (max - min);
            if (desc.includes("int") || key.startsWith("pos")) layer[key] = Math.floor(layer[key]);
          }
        } else if (desc.includes("|") || desc.includes(",")) {
          let optStr = desc;
          if (desc.includes(":")) optStr = desc.split(":")[1];
          else if (desc.includes("—")) optStr = desc.split("—")[0].trim();
          const delimiter = optStr.includes("|") ? "|" : ",";
          const options = optStr.split(delimiter).map(s => s.trim());
          layer[key] = options[Math.floor(Math.random() * options.length)];
        }
      });
      generatedLayers.unshift(layer);
    }

    // Sort: ASCII / DITHER / TILESET_DITHER always go to the front (= top of stack)
    generatedLayers.sort((a, b) => {
      const aTop = topTypes.includes(a.type) ? 0 : 1;
      const bTop = topTypes.includes(b.type) ? 0 : 1;
      return aTop - bTop;
    });
    
    // Randomize Source mosaic if unlocked
    if (sourceLayer && !sourceLayer.locked) {
      const sourceSchema = schemas.find(s => s.type === "SOURCE");
      if (sourceSchema && sourceSchema.params.mosaic) {
        const desc = sourceSchema.params.mosaic;
        const match = desc.match(/(-?\d+\.?\d*)[-–](-?\d+\.?\d*)/);
        if (match) {
          const min = Number(match[1]);
          const max = Number(match[2]);
          sourceLayer.mosaic = Math.floor(min + Math.random() * (max - min + 1));
        }
      }
    }

    // Combine newly generated layers and non-source locked layers
    const nonSourceLockedLayers = lockedLayers.filter(l => l.type !== "SOURCE");
    let combined = [...generatedLayers, ...nonSourceLockedLayers];
    if (sourceLayer) combined.push(sourceLayer);

    // Bucket-sort: pinned layers always at the top of the sidebar [pinned...][unpinned...][SOURCE]
    const pinnedLayers  = combined.filter(l => l.pinned && l.type !== "SOURCE");
    const unpinnedLayers = combined.filter(l => !l.pinned && l.type !== "SOURCE");
    const sourceLayers  = combined.filter(l => l.type === "SOURCE");
    const newLayers = [...pinnedLayers, ...unpinnedLayers, ...sourceLayers];

    setLayers(newLayers);

  }, [schemas, layers]);

  const handleRandomParams = useCallback(() => {
    const randLayers = layers.map(layer => {
      if (layer.locked) return layer;
      const schema = schemas.find(s => s.type === layer.type);
      if (!schema) return layer;
      const randLayer = { ...layer };
      Object.entries(schema.params).forEach(([key, desc]) => {
        if (key === "enabled" || key === "range") return;
        if ((layer.lockedParams ?? []).includes(key)) return; // Skip locked params

        const isBool = desc.includes("bool") || desc.includes("true/false");
        const isColor = (desc.includes("hex") || desc.includes("color")) && !key.startsWith("num_");

        if (layer.type === "PIXEL_SORT") {
          if (key === "min_len") {
            randLayer[key] = 0;
            return;
          }
          if (key === "max_len") {
            randLayer[key] = Math.floor(Math.random() * 800) + 201;
            return;
          }
        }

        if (isBool) {
          randLayer[key] = Math.random() > 0.5;
        } else if (isColor) {
          randLayer[key] = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        } else if (/\bint\b/i.test(desc) || /\bfloat\b/i.test(desc)) {
          const match = desc.match(/(-?\d+\.?\d*)[-–](-?\d+\.?\d*)/);
          if (match) {
            const min = Number(match[1]);
            const max = Number(match[2]);
            randLayer[key] = min + Math.random() * (max - min);
            if (desc.includes("int") || key.startsWith("pos") || key === "mosaic") randLayer[key] = Math.floor(randLayer[key]);
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
    setLayers(randLayers);
  }, [layers, schemas]);

  const handleLoadRecipe = useCallback((recipeLayers: LayerConfig[]) => {
    setLayers(recipeLayers);
    setView("editor");
  }, []);

  return (
    <main className={styles.main}>
      <div className={styles.workspace}>
        <LeftToolbar
          layers={layers}
          onRandomStack={handleRandomStack}
          onRandomParams={handleRandomParams}
          onClear={handleClear}
          onExport={handleExport}
          isProcessing={isProcessing}
          resultImage={resultImage}
          view={view}
          setView={setView}
        />
        
        {view === "editor" ? (
          <>
            <Canvas
              sourceImage={sourceImage}
              resultImage={resultImage}
              isProcessing={isProcessing}
              onImageUpload={setSourceImage}
              zoom={zoom}
              setZoom={setZoom}
              pan={pan}
              setPan={setPan}
            />
            <Sidebar
              schemas={schemas}
              layers={layers}
              setLayers={setLayers}
              textureImage={textureImage}
              setTextureImage={setTextureImage}
              onExport={handleExport}
              onRandomStack={() => { }} 
              onRandomParams={() => { }} 
              onClear={handleClear}
              isProcessing={isProcessing}
              resultImage={resultImage}
              globalScale={globalScale}
              setGlobalScale={setGlobalScale}
              zoom={zoom}
              setZoom={setZoom}
              pan={pan}
              setPan={setPan}
            />
          </>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", height: "100vh" }}>
            <CommunityTab onLoadRecipe={handleLoadRecipe} />
          </div>
        )}
      </div>
    </main>
  );
}
