import React from 'react';
import { createPortal } from 'react-dom';
import styles from './Controls.module.css';

interface BaseControlProps {
    label: React.ReactNode;
    value: any;
    onChange: (val: any) => void;
}

export const NumberSlider = ({ label, value, onChange, min = 0, max = 255, step = 1 }: BaseControlProps & { min?: number, max?: number, step?: number }) => (
    <div className={styles.controlGroup}>
        <div className={styles.controlHeader}>
            <label>{label}</label>
            <span className={styles.valueDisplay}>{value}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className={styles.slider}
        />
    </div>
);

export const SelectDropdown = ({ label, value, onChange, options, groups, className, variant = 'list' }: BaseControlProps & { options?: string[], groups?: { label: string, modes: string[] }[], className?: string, variant?: 'list' | 'grid' }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const [portalNode, setPortalNode] = React.useState<HTMLElement | null>(null);
    const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 });

    React.useEffect(() => {
        setPortalNode(document.body);
    }, []);

    const updateCoords = () => {
        if (dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    };

    React.useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener('scroll', updateCoords, true);
            window.addEventListener('resize', updateCoords);
        }
        return () => {
            window.removeEventListener('scroll', updateCoords, true);
            window.removeEventListener('resize', updateCoords);
        };
    }, [isOpen]);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                // Give a bit of buffer for portal clicks
                const portalContent = document.querySelector(`.${styles.optionsList}`);
                if (portalContent && portalContent.contains(event.target as Node)) return;
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const dropdownContent = isOpen && (
        <div 
            className={`${styles.optionsList} ${variant === 'grid' ? styles.optionsGrid : ''}`}
            style={{ 
                position: 'fixed', 
                top: coords.top + 4, 
                left: variant === 'grid' ? coords.left - (640 - coords.width) : coords.left,
                width: variant === 'grid' ? 640 : coords.width,
                zIndex: 99999
            }}
        >
            {groups ? (
                groups.map(group => (
                    <div key={group.label} className={variant === 'grid' ? styles.gridGroup : styles.optionGroup}>
                        <div className={styles.groupHeader}>{group.label}</div>
                        <div className={variant === 'grid' ? styles.gridOptions : ''}>
                            {group.modes.map(opt => (
                                <div
                                    key={opt}
                                    className={`${styles.optionItem} ${value === opt ? styles.optionActive : ''}`}
                                    onClick={() => {
                                        onChange(opt);
                                        setIsOpen(false);
                                    }}
                                >
                                    {opt}
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                options?.map(opt => (
                    <div
                        key={opt}
                        className={`${styles.optionItem} ${value === opt ? styles.optionActive : ''}`}
                        onClick={() => {
                            onChange(opt);
                            setIsOpen(false);
                        }}
                    >
                        {opt}
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className={className || styles.controlGroup}>
            {label && <label className={styles.label}>{label}</label>}
            <div className={`${styles.customSelectWrapper} ${isOpen ? styles.wrapperOpen : ''}`} ref={dropdownRef}>
                <div
                    className={`${styles.select} ${isOpen ? styles.selectOpen : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                    tabIndex={0}
                >
                    {value}
                    <span className={styles.selectArrow} style={{ transform: isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)' }}>▼</span>
                </div>
                {isOpen && portalNode && createPortal(dropdownContent, portalNode)}
            </div>
        </div>
    );
};

export const ColorPicker = ({ label, value, onChange }: BaseControlProps) => (
    <div className={styles.controlGroupRow}>
        <label className={styles.label}>{label}</label>
        <div className={styles.colorInputWrapper}>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={styles.hexInput}
                placeholder="#000000"
            />
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={styles.colorPicker}
            />
        </div>
    </div>
);

export const Toggle = ({ label, value, onChange }: BaseControlProps) => {
    const btn = (
        <button
            type="button"
            className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
            onClick={() => onChange(!value)}
        >
            <div className={styles.toggleKnob} />
        </button>
    );

    if (!label) return btn;

    return (
        <div className={styles.controlGroupRow}>
            <label className={styles.label}>{label}</label>
            {btn}
        </div>
    );
};

export const RangeSlider = ({ label, value, onChange, min = 0, max = 255 }: BaseControlProps & { min?: number, max?: number }) => {
    const [low, high] = Array.isArray(value) ? value : [0, 255];

    const handleLowChange = (v: number) => {
        const nextLow = Math.min(v, high);
        onChange([nextLow, high]);
    };

    const handleHighChange = (v: number) => {
        const nextHigh = Math.max(v, low);
        onChange([low, nextHigh]);
    };

    const leftPercent = (low / max) * 100;
    const rightPercent = 100 - (high / max) * 100;

    return (
        <div className={styles.controlGroup}>
            <div className={styles.controlHeader}>
                <label>{label}</label>
                <span className={styles.valueDisplay}>{low} - {high}</span>
            </div>
            <div className={styles.rangeSliderContainer}>
                <div className={styles.rangeTrack} />
                <div
                    className={styles.rangeSelected}
                    style={{ left: `${leftPercent}%`, right: `${rightPercent}%` }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={low}
                    onChange={(e) => handleLowChange(Number(e.target.value))}
                    className={styles.rangeInput}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={high}
                    onChange={(e) => handleHighChange(Number(e.target.value))}
                    className={styles.rangeInput}
                />
            </div>
        </div>
    );
};
