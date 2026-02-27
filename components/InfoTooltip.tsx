
import React from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
    text: string;
    className?: string;
    width?: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, className = "", width = "w-72" }) => (
    <span className={`group relative inline-block ml-1 align-middle ${className}`}>
        <HelpCircle size={14} className="text-slate-400 hover:text-blue-500 cursor-help transition-colors" />
        <span className={`invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ${width} p-3 bg-slate-800 text-white text-[11px] rounded-lg shadow-xl z-50 text-center leading-relaxed font-normal pointer-events-none transition-all duration-200 border border-slate-700 block`}>
            {text}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></span>
        </span>
    </span>
);

export default InfoTooltip;
