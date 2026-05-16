
import React from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
    text: string;
    className?: string;
    width?: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, className = "", width = "w-72" }) => (
    <span className={`group relative inline-block ml-1 align-middle outline-none ${className}`} tabIndex={0} aria-label={text}>
        <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-300 bg-white text-slate-400 transition group-hover:border-[var(--tenant-primary-border)] group-hover:text-[var(--tenant-primary)] group-focus:border-[var(--tenant-primary-border)] group-focus:text-[var(--tenant-primary)] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <Info size={11} />
        </span>
        <span className={`invisible group-hover:visible group-focus:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ${width} rounded-md border border-slate-700 bg-slate-900 p-3 text-center text-[11px] font-normal leading-relaxed text-white shadow-lg z-50 pointer-events-none transition-all duration-200 block`}>
            {text}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></span>
        </span>
    </span>
);

export default InfoTooltip;
