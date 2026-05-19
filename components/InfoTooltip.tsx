
import React from 'react';
import { Info } from 'lucide-react';
import { cn, tooltipClass } from './ui';

interface InfoTooltipProps {
    text: string;
    className?: string;
    width?: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, className = "", width = "w-72" }) => (
    <span className={`group relative inline-block ml-1 align-middle outline-none ${className}`} tabIndex={0} aria-label={text}>
        <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-400 transition group-hover:border-[var(--tenant-primary-border)] group-hover:text-[var(--tenant-primary)] group-focus:border-[var(--tenant-primary-border)] group-focus:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">
            <Info size={11} />
        </span>
        <span className={cn(`invisible group-hover:visible group-focus:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ${width} p-3 text-center text-[11px] font-normal leading-relaxed z-50 pointer-events-none transition-all duration-200 block`, tooltipClass)}>
            {text}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--tenant-border)] dark:border-t-[var(--tenant-border-dark)]"></span>
        </span>
    </span>
);

export default InfoTooltip;
