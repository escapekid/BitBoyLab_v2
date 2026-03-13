"use client";
import styles from "./Canvas.module.css";
import React, { useRef, useState, useCallback, useEffect } from "react";
import AsciiLoader from "../ui/AsciiLoader";

interface Props {
    sourceImage: File | null;
    resultImage: string | null;
    isProcessing: boolean;
    onImageUpload: (img: File) => void;
    zoom: number;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
    pan: { x: number, y: number };
    setPan: React.Dispatch<React.SetStateAction<{ x: number, y: number }>>;
}

const Tutorial = () => {
    const [lang, setLang] = useState<"en" | "de">("en");

    return (
        <div className={styles.tutorialContainer}>
            <div className={styles.langToggle}>
                <button
                    className={lang === "en" ? styles.langBtnActive : styles.langBtn}
                    onClick={() => setLang("en")}
                >
                    EN
                </button>
                <span className={styles.langSep}>|</span>
                <button
                    className={lang === "de" ? styles.langBtnActive : styles.langBtn}
                    onClick={() => setLang("de")}
                >
                    DE
                </button>
            </div>
            {lang === "en" ? (
                <div className={styles.tutorialText}>
                    <strong>How it works:</strong><br />
                    1. Upload an image by dragging &amp; dropping below.<br />
                    2. Add effects from the right Sidebar (+ Add Layer).<br />
                    3. Reorder and tweak parameters to create unique glitch art!<br />
                    4. Check out the &quot;Random&quot; buttons on the left toolbar to explore.
                </div>
            ) : (
                <div className={styles.tutorialText}>
                    <strong>Wie es funktioniert:</strong><br />
                    1. Lade ein Bild hoch (Drag &amp; Drop unten).<br />
                    2. Füge Effekte über die rechte Sidebar hinzu (+ Add Layer).<br />
                    3. Ändere die Reihenfolge und Parameter für deine einzigartige Glitch-Kunst!<br />
                    4. Nutze die &quot;Random&quot; Buttons in der linken Leiste zum Erkunden.
                </div>
            )}
        </div>
    );
};

export default function Canvas({ sourceImage, resultImage, isProcessing, onImageUpload, zoom, setZoom, pan, setPan }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageWrapperRef = useRef<HTMLDivElement>(null);

    // Pan state
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const panStart = useRef({ x: 0, y: 0 });

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.min(Math.max(prev + delta, 0.2), 10));
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only pan with left-click
        if (e.button !== 0) return;
        e.preventDefault();
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        panStart.current = { ...pan };
    }, [pan]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPan({
            x: panStart.current.x + dx,
            y: panStart.current.y + dy,
        });
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onImageUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImageUpload(e.target.files[0]);
        }
    };

    // Safe fallback to locally preview the source image if result isn't ready
    let previewUrl = null;
    if (resultImage) {
        previewUrl = resultImage;
    } else if (sourceImage) {
        // Only generate object URL if result Image isn't there
        previewUrl = URL.createObjectURL(sourceImage);
    }

    const isZoomed = zoom !== 1 || pan.x !== 0 || pan.y !== 0;

    return (
        <div className={styles.canvasContainer}>
            {!sourceImage ? (
                <div className={styles.uploadSection}>
                    <Tutorial />
                    <div
                        className={styles.dropzone}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className={styles.uploadIcon}>+</div>
                        <p>Drag &amp; Drop high-res image here</p>
                        <span>or click to browse</span>
                        <input
                            type="file"
                            accept="image/*"
                            className={styles.hiddenInput}
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                    </div>
                </div>
            ) : (
                <div className={styles.preview}>
                    <div
                        className={styles.imageWrapper}
                        ref={imageWrapperRef}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    >
                        <div
                            className={styles.pannedContent}
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                transformOrigin: 'center center',
                                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={previewUrl as string}
                                alt="Processed preview"
                                className={styles.img}
                                draggable={false}
                            />
                            {isProcessing && (
                                <div className={styles.loadingOverlay}>
                                    <AsciiLoader text="RENDERING SIGNAL..." />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.bottomRightControls}>
                        {/* Zoom controls bar */}
                        <div className={styles.zoomBar}>
                            <button
                                className={styles.zoomBtn}
                                onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.2))}
                                title="Zoom Out"
                            >
                                −
                            </button>
                            <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
                            <button
                                className={styles.zoomBtn}
                                onClick={() => setZoom(prev => Math.min(prev + 0.25, 10))}
                                title="Zoom In"
                            >
                                +
                            </button>
                            {isZoomed && (
                                <button
                                    className={styles.zoomResetBtn}
                                    onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                                    title="Reset View"
                                >
                                    ⟳ Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
