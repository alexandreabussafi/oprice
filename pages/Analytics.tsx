
import React, { useState } from 'react';
import { ProposalData } from '../types';
import { calculateFinancials, formatCurrency } from '../utils/pricingEngine';
import { DollarSign, Zap, Repeat, TrendingUp, XCircle, Package } from 'lucide-react';

interface AnalyticsProps {
    proposals: ProposalData[];
    onSelectProposal: (id: string) => void;
    businessUnit: 'SERVICES' | 'PRODUCTS';
}

const Analytics: React.FC<AnalyticsProps> = ({ proposals, onSelectProposal, businessUnit }) => {
    const [funnelFilter, setFunnelFilter] = useState<'ALL' | 'SPOT' | 'MENSAL' | 'PRODUCT'>(businessUnit === 'PRODUCTS' ? 'PRODUCT' : 'ALL');
    const [dateFilter, setDateFilter] = useState<'ALL' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR'>('ALL');

    const activeProposals = proposals.filter(p => p.isCurrentVersion);

    // Filter properties based on funnel selection for KPI
    const kpiProposals = activeProposals.filter(p =>
        funnelFilter === 'ALL' || p.type === (funnelFilter === 'SPOT' ? 'SPOT' : funnelFilter === 'MENSAL' ? 'CONTINUOUS' : 'PRODUCT')
    );

    const continuousProposals = kpiProposals.filter(p => p.type === 'CONTINUOUS');
    const spotProposals = kpiProposals.filter(p => p.type === 'SPOT');
    const productProposals = kpiProposals.filter(p => p.type === 'PRODUCT');

    const continuousValue = continuousProposals.reduce((acc, p) => acc + p.value, 0);
    const spotValue = spotProposals.reduce((acc, p) => acc + p.value, 0);
    const productValue = productProposals.reduce((acc, p) => acc + p.value, 0);
    const totalValue = continuousValue + spotValue + productValue;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentQuarter = Math.floor(currentMonth / 3);

    const isDateInRange = (dateString: string) => {
        if (dateFilter === 'ALL') return true;
        const d = new Date(dateString);
        if (dateFilter === 'THIS_MONTH') {
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }
        if (dateFilter === 'THIS_QUARTER') {
            return Math.floor(d.getMonth() / 3) === currentQuarter && d.getFullYear() === currentYear;
        }
        if (dateFilter === 'THIS_YEAR') {
            return d.getFullYear() === currentYear;
        }
        return true;
    };

    const filteredForFunnel = kpiProposals.filter(p => isDateInRange(p.createdAt));

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h1 className="text-3xl font-black text-[#0f172a] dark:text-slate-100 tracking-tight">Analytics & KPIs</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Visão estratégica do pipeline comercial e saúde financeira.</p>
            </div>

            {/* Top Mix Cards */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${businessUnit === 'SERVICES' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Receita Total</p>
                        <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{formatCurrency(totalValue)}</p>
                    </div>
                    <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                        <DollarSign size={24} />
                    </div>
                </div>

                {businessUnit === 'SERVICES' && (
                    <>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Projetos Spot</p>
                                <p className="text-2xl font-black text-amber-600 dark:text-amber-500">{formatCurrency(spotValue)}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded inline-block">
                                    {spotProposals.length} propostas ({totalValue > 0 ? ((spotValue / totalValue) * 100).toFixed(0) : 0}%)
                                </p>
                            </div>
                            <div className="h-12 w-12 bg-amber-50 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-500 shadow-inner">
                                <Zap size={24} />
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Contratos Mensais</p>
                                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(continuousValue)}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded inline-block">
                                    {continuousProposals.length} propostas ({totalValue > 0 ? ((continuousValue / totalValue) * 100).toFixed(0) : 0}%)
                                </p>
                            </div>
                            <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                                <Repeat size={24} />
                            </div>
                        </div>
                    </>
                )}

                {businessUnit === 'PRODUCTS' && (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Produtos</p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(productValue)}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded inline-block">
                                {productProposals.length} propostas ({totalValue > 0 ? ((productValue / totalValue) * 100).toFixed(0) : 0}%)
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                            <Package size={24} />
                        </div>
                    </div>
                )}
            </div>

            {/* Funnel & Table Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start pb-12">

                {/* Visual Sales Funnel Card */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden h-[540px] transition-colors">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={18} className="text-indigo-600" /> Funil de Conversão
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Filter Pill */}
                            <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                {businessUnit === 'SERVICES' ? (
                                    (['ALL', 'SPOT', 'MENSAL'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFunnelFilter(f)}
                                            className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${funnelFilter === f ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                        >{f === 'ALL' ? 'Tudo' : f}</button>
                                    ))
                                ) : (
                                    <button
                                        className="px-3 py-1 text-[10px] font-black uppercase rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm transition-colors"
                                    >Produtos</button>
                                )}
                            </div>

                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value as any)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="ALL">Total</option>
                                <option value="THIS_MONTH">Mês</option>
                                <option value="THIS_QUARTER">Trim.</option>
                                <option value="THIS_YEAR">Ano</option>
                            </select>
                        </div>
                    </h3>

                    <div className="flex-1 flex flex-col items-center justify-center gap-1 w-full max-w-sm mx-auto">
                        {(() => {
                            const precificacaoProps = filteredForFunnel.filter(p => ['MQL', 'Qualification', 'SolutionDesign', 'Diagnosis', 'Pricing'].includes(p.stage));
                            const negoProps = filteredForFunnel.filter(p => ['Sent', 'Negotiation', 'Review', 'FinalAdjustments', 'AwaitingPO'].includes(p.stage));
                            const wonProps = filteredForFunnel.filter(p => p.stage === 'Won');

                            const precificacaoCount = precificacaoProps.length;
                            const negoCount = negoProps.length;
                            const wonCount = wonProps.length;
                            const totalFunnel = precificacaoCount + negoCount + wonCount;

                            const precificacaoValSum = precificacaoProps.reduce((sum, p) => sum + p.value, 0);
                            const negoValSum = negoProps.reduce((sum, p) => sum + p.value, 0);
                            const wonValSum = wonProps.reduce((sum, p) => sum + p.value, 0);
                            const totalValSum = precificacaoValSum + negoValSum + wonValSum;

                            const getLevelHeight = (valSum: number) => {
                                if (totalValSum === 0) return '80px';
                                return `${Math.max(60, (valSum / totalValSum) * 300)}px`;
                            };

                            return (
                                <>
                                    {/* Funnel Level 1 */}
                                    <div className="relative flex items-center justify-center w-full transition-all duration-700" style={{ height: getLevelHeight(precificacaoValSum) }}>
                                        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800/60 border-t-2 border-slate-300 dark:border-slate-700" style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 15% 100%)' }}></div>
                                        <div className="relative z-10 text-center">
                                            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{precificacaoCount}</p>
                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Estudos em Aberto</p>
                                            <p className="text-xs font-mono font-bold text-slate-500 mt-1">{formatCurrency(precificacaoValSum)}</p>
                                        </div>
                                    </div>

                                    {/* Funnel Level 2 */}
                                    <div className="relative flex items-center justify-center w-[75%] transition-all duration-700" style={{ height: getLevelHeight(negoValSum) }}>
                                        <div className="absolute inset-0 bg-indigo-500 dark:bg-indigo-600 border-t-2 border-indigo-400 dark:border-indigo-500" style={{ clipPath: 'polygon(0 0, 100% 0, 80% 100%, 20% 100%)' }}></div>
                                        <div className="relative z-10 text-center text-white">
                                            <p className="text-2xl font-black">{negoCount}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-tighter opacity-80">Em Negociação</p>
                                            <p className="text-xs font-mono font-bold mt-1 text-indigo-100">{formatCurrency(negoValSum)}</p>
                                        </div>
                                    </div>

                                    {/* Funnel Level 3 */}
                                    <div className="relative flex items-center justify-center w-[50%] transition-all duration-700" style={{ height: getLevelHeight(wonValSum) }}>
                                        <div className="absolute inset-0 bg-emerald-500 dark:bg-emerald-600 border-t-2 border-emerald-400 dark:border-emerald-500" style={{ clipPath: 'polygon(0 0, 100% 0, 70% 100%, 30% 100%)' }}></div>
                                        <div className="relative z-10 text-center text-white">
                                            <p className="text-2xl font-black">{wonCount}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-tighter opacity-80">Propostas Ganhas</p>
                                            <p className="text-xs font-mono font-bold mt-1 text-emerald-100">{formatCurrency(wonValSum)}</p>
                                        </div>
                                    </div>

                                    {/* Tag Conversão */}
                                    <div className="mt-8 flex flex-col items-center">
                                        <div className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-black text-sm shadow-xl flex items-center gap-2">
                                            <TrendingUp size={16} className="text-emerald-400 dark:text-emerald-600" />
                                            {totalFunnel > 0 ? ((wonCount / totalFunnel) * 100).toFixed(1) : 0}% <span className="opacity-60 text-xs font-bold">FECHAMENTO</span>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Top Opps List Column */}
                <div className="space-y-6 flex flex-col h-[540px]">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col flex-1 overflow-hidden transition-colors">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 px-1">
                            <Repeat size={18} className="text-amber-500" /> Maiores Alvos
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {activeProposals
                                .sort((a, b) => b.value - a.value)
                                .slice(0, 10)
                                .map((p, idx) => (
                                    <div key={p.id} onClick={() => onSelectProposal(p.id)} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-transparent hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-slate-800 cursor-pointer group transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="h-8 w-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-black text-slate-400 group-hover:text-indigo-600 transition-colors shadow-sm">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight group-hover:text-indigo-600 transition-colors uppercase">{p.clientName}</p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-tight">VENDEDOR: {p.responsible.toUpperCase()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-100">{formatCurrency(p.value)}</p>
                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${p.type === 'SPOT' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{p.type}</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Secondary Metrics Bar */}
                    <div className="grid grid-cols-2 gap-4 h-24 shrink-0">
                        <div className="bg-[#0f172a] rounded-2xl p-4 flex flex-col justify-center text-white">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Ticket Médio</p>
                            <p className="text-lg font-black">{formatCurrency(totalValue / (activeProposals.length || 1))}</p>
                        </div>
                        <div className="bg-emerald-600 rounded-2xl p-4 flex flex-col justify-center text-white">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Ganhos Reais (Won)</p>
                            <p className="text-lg font-black">{formatCurrency(activeProposals.filter(p => p.stage === 'Won').reduce((s, p) => s + p.value, 0))}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
