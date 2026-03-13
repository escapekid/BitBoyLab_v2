export function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getHarmonyColors(hex: string, mode: string, count: number): string[] {
    const { h, s, l } = hexToHsl(hex);
    const colors: string[] = [hex];

    if (mode === "Monochromatic") {
        for (let i = 1; i < count; i++) {
            colors.push(hslToHex(h, s, Math.max(10, Math.min(90, l + (i % 2 === 0 ? i * 10 : -i * 10)))));
        }
    } else if (mode === "Complementary") {
        const complement = (h + 180) % 360;
        for (let i = 1; i < count; i++) {
            colors.push(hslToHex(i % 2 === 0 ? h : complement, s, l));
        }
    } else if (mode === "Quad") {
        const q1 = (h + 90) % 360;
        const q2 = (h + 180) % 360;
        const q3 = (h + 270) % 360;
        for (let i = 1; i < count; i++) {
            const hue = [h, q1, q2, q3][i % 4];
            colors.push(hslToHex(hue, s, l));
        }
    }

    return colors;
}

export function hexToRgb(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
}
