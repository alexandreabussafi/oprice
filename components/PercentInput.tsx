import React, { useEffect, useState } from 'react';

type PercentInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'value' | 'onChange'> & {
    value: number;
    onChange: (value: number) => void;
};

const formatPercentValue = (value: number) => {
    const percentValue = Number.isFinite(value) ? value * 100 : 0;
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(percentValue);
};

const parsePercentValue = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return 0;

    let normalized = trimmed.replace(/\s/g, '').replace(/%/g, '');
    if (normalized.includes(',') && normalized.includes('.')) {
        normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
        normalized = normalized.replace(',', '.');
    }

    normalized = normalized.replace(/[^\d.-]/g, '');
    if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') {
        return null;
    }

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed / 100 : null;
};

const PercentInput: React.FC<PercentInputProps> = ({ value, onChange, onFocus, onBlur, ...props }) => {
    const [draft, setDraft] = useState<string | null>(null);

    useEffect(() => {
        if (draft === null) return;
        const parsedDraft = parsePercentValue(draft);
        if (parsedDraft === null || Math.abs(parsedDraft - value) < 0.000001) return;
        setDraft(formatPercentValue(value));
    }, [value]);

    return (
        <input
            {...props}
            type="text"
            inputMode="decimal"
            value={draft ?? formatPercentValue(value)}
            onFocus={(event) => {
                setDraft(event.currentTarget.value);
                onFocus?.(event);
            }}
            onChange={(event) => {
                const nextDraft = event.target.value;
                setDraft(nextDraft);

                const parsedValue = parsePercentValue(nextDraft);
                if (parsedValue !== null) {
                    onChange(parsedValue);
                }
            }}
            onBlur={(event) => {
                setDraft(null);
                onBlur?.(event);
            }}
        />
    );
};

export default PercentInput;
