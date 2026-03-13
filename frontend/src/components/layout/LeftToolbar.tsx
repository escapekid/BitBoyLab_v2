import styles from "./LeftToolbar.module.css";
import { LayerConfig } from "@/types";

interface Props {
    layers: LayerConfig[];
    onRandomStack: () => void;
    onRandomParams: () => void;
    onClear: () => void;
    onExport: () => void;
    isProcessing: boolean;
    resultImage: string | null;
    view: "editor" | "community";
    setView: (v: "editor" | "community") => void;
}

export default function LeftToolbar({
    layers,
    onRandomStack,
    onRandomParams,
    onClear,
    onExport,
    isProcessing,
    resultImage,
    view,
    setView
}: Props) {
    return (
        <nav className={styles.toolbar}>
            <div className={styles.group}>
                <button
                    className={`${styles.iconBtn} ${view === "editor" ? styles.iconBtnActive : ""}`}
                    onClick={() => setView("editor")}
                    title="Editor View"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 17 10 11 4 5"></polyline>
                        <line x1="12" y1="19" x2="20" y2="19"></line>
                    </svg>
                    <span className={styles.tooltip}>Editor</span>
                </button>
                <button
                    className={`${styles.iconBtn} ${view === "community" ? styles.iconBtnActive : ""}`}
                    onClick={() => setView("community")}
                    title="Community View"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 1-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span className={styles.tooltip}>Community</span>
                </button>
            </div>

            <div className={styles.spacer} />

            <div className={styles.group}>
                <button
                    className={styles.iconBtnDanger}
                    onClick={() => window.location.reload()}
                    title="Clear Canvas"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <span className={styles.tooltip}>Clear Canvas</span>
                </button>
                <button
                    className={styles.iconBtn}
                    onClick={onRandomStack}
                    title="Generate Random Stack"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span className={styles.tooltip}>Random Stack</span>
                </button>
                <button
                    className={styles.iconBtn}
                    onClick={onRandomParams}
                    title="Randomize Parameters"
                    disabled={layers.length === 0}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                    </svg>
                    <span className={styles.tooltip}>Random Params</span>
                </button>
                <button
                    className={styles.iconBtnDanger}
                    onClick={onClear}
                    title="Clear Effects"
                    disabled={layers.length === 0}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    <span className={styles.tooltip}>Clear Effects</span>
                </button>
            </div>

            <div className={styles.spacer} />

            <div className={styles.group}>
                <button
                    className={styles.exportBtn}
                    onClick={onExport}
                    disabled={!resultImage || isProcessing}
                    title="Export Image"
                >
                    {isProcessing ? (
                        <svg className={styles.spinner} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="2" x2="12" y2="6"></line>
                            <line x1="12" y1="18" x2="12" y2="22"></line>
                            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                            <line x1="2" y1="12" x2="6" y2="12"></line>
                            <line x1="18" y1="12" x2="22" y2="12"></line>
                            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <polyline points="19 12 12 19 5 12"></polyline>
                        </svg>
                    )}
                    <span className={styles.tooltip}>Export</span>
                </button>

                <a
                    href="https://www.buymeacoffee.com/escapekid"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.donateBtn}
                    title="Buy Me A Coffee"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                        <line x1="6" y1="1" x2="6" y2="4"></line>
                        <line x1="10" y1="1" x2="10" y2="4"></line>
                        <line x1="14" y1="1" x2="14" y2="4"></line>
                    </svg>
                    <span className={styles.tooltip}>Support</span>
                </a>
            </div>
        </nav>
    );
}
