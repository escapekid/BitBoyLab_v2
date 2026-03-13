"use client";
import { useState, useEffect } from "react";

interface Props {
    text?: string;
}

export default function AsciiLoader({ text = "INITIALIZING BITBOY LAB..." }: Props) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) return 0;
                return prev + Math.floor(Math.random() * 15);
            });
        }, 200);
        return () => clearInterval(interval);
    }, []);

    const cappedProgress = Math.min(progress, 100);
    const bars = Math.floor(cappedProgress / 10);
    const empty = 10 - bars;
    const barStr = "█".repeat(bars) + "░".repeat(empty);

    return (
        <div style={{
            fontFamily: "var(--font-mono)",
            color: "var(--accent-color)",
            textAlign: "center",
            lineHeight: "1.5",
            letterSpacing: "0.1em"
        }}>
            <div>{text}</div>
            <div style={{ fontSize: "1.2rem", marginTop: "8px" }}>
                [{barStr}] {cappedProgress}%
            </div>
        </div>
    );
}
