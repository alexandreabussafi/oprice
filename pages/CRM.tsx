
import React, { useState, useEffect } from 'react';
import { ProposalData, ProposalStatus, ProposalType } from '../types';
import { calculateFinancials, formatCurrency, formatPercent } from '../utils/pricingEngine';
import { Plus, Search, FileText, CheckCircle, XCircle, Clock, Copy, Edit3, Trash2, PieChart, TrendingUp, Calendar, User, LayoutGrid, List, ArrowRight, DollarSign, Users, Briefcase, GripVertical, ExternalLink, BarChart3, Zap, Repeat } from 'lucide-react';

interface CRMProps {
    proposals: ProposalData[];
    onSelectProposal: (id: string) => void;
    onCreateProposal: (type: ProposalType) => void;
    onCloneProposal: (id: string) => void;
    onDeleteProposal: (id: string) => void;
    onUpdateStatus: (id: string, newStatus: ProposalStatus) => void;
    initialViewMode?: 'list' | 'kanban' | 'analytics'; // Prop para controle inicial
}

const CRM: React.FC<CRMProps> = ({
    proposals,
    onSelectProposal,
    onCreateProposal,
    onCloneProposal,
    onDeleteProposal,
    onUpdateStatus,
    initialViewMode = 'kanban'
}) => {
    const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'analytics'>(initialViewMode);
    const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Drag & Drop State
    const [draggedProposalId, setDraggedProposalId] = useState<string | null>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);

    // Sync viewMode when prop changes (Sidebar navigation)
    useEffect(() => {
        setViewMode(initialViewMode);
    }, [initialViewMode]);

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, id });
    };

    const selectedProposal = proposals.find(p => p.id === selectedPreviewId);
    const selectedFinancials = selectedProposal ? calculateFinancials(selectedProposal) : null;

    const filteredProposals = proposals.filter(p =>
        p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.proposalId.includes(searchTerm) ||
        p.responsible.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- KPI Calculations ---
    const totalQuotes = proposals.length;
    const wonQuotes = proposals.filter(p => p.status === 'Won');
    const totalGains = wonQuotes.reduce((acc, p) => acc + p.value, 0);
    const totalPipeline = proposals.filter(p => ['Draft', 'Sent', 'Negotiation'].includes(p.status)).reduce((acc, p) => acc + p.value, 0);
    const conversionRate = totalQuotes > 0 ? (wonQuotes.length / totalQuotes) : 0;

    // New KPIs for Analytics
    const continuousProposals = proposals.filter(p => p.type !== 'SPOT');
    const spotProposals = proposals.filter(p => p.type === 'SPOT');
    const continuousValue = continuousProposals.reduce((acc, p) => acc + p.value, 0);
    const spotValue = spotProposals.reduce((acc, p) => acc + p.value, 0);
    const totalValue = continuousValue + spotValue;

    const handleRowClick = (id: string) => {
        setSelectedPreviewId(id);
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedProposalId(id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, newStatus: ProposalStatus) => {
        e.preventDefault();
        if (draggedProposalId) {
            onUpdateStatus(draggedProposalId, newStatus);
            setDraggedProposalId(null);
        }
    };

    // Added 'barColor' for explicit tailwind classes
    const kanbanColumns: { id: ProposalStatus, label: string, color: string, bg: string, border: string, barColor: string, headerBg: string }[] = [
        { id: 'Draft', label: 'Precificação', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-300', barColor: 'bg-slate-500', headerBg: 'bg-slate-100/50' },
        { id: 'Negotiation', label: 'Em Negociação', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-400', barColor: 'bg-amber-500', headerBg: 'bg-amber-50/70' },
        { id: 'Won', label: 'Ganho (Fechado)', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500', barColor: 'bg-emerald-500', headerBg: 'bg-emerald-50/70' },
        { id: 'Lost', label: 'Perdido', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-400', barColor: 'bg-red-500', headerBg: 'bg-red-50/70' },
    ];

    const getStatusBadge = (status: ProposalStatus) => {
        switch (status) {
            case 'Won': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle size={12} /> Ganho</span>;
            case 'Lost': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200"><XCircle size={12} /> Perdido</span>;
            case 'Draft': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200"><Edit3 size={12} /> Precificação</span>;
            case 'Sent': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200"><FileText size={12} /> Enviado</span>;
            case 'Negotiation': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200"><Clock size={12} /> Negociação</span>;
        }
    };

    const renderAnalytics = () => (
        <div className="p-4 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Top Mix Cards */}
            <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Receita Total (Pipeline)</p>
                        <p className="text-2xl font-black text-slate-800">{formatCurrency(totalValue)}</p>
                    </div>
                    <div className="h-12 w-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600"><DollarSign size={24} /></div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Projetos Spot</p>
                        <p className="text-2xl font-black text-amber-600">{formatCurrency(spotValue)}</p>
                        <p className="text-[10px] text-slate-400">{spotProposals.length} propostas ({totalValue > 0 ? ((spotValue / totalValue) * 100).toFixed(0) : 0}%)</p>
                    </div>
                    <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600"><Zap size={24} /></div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Contratos Contínuos</p>
                        <p className="text-2xl font-black text-blue-600">{formatCurrency(continuousValue)}</p>
                        <p className="text-[10px] text-slate-400">{continuousProposals.length} propostas ({totalValue > 0 ? ((continuousValue / totalValue) * 100).toFixed(0) : 0}%)</p>
                    </div>
                    <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><Repeat size={24} /></div>
                </div>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-2 gap-6 h-80">
                {/* Simple CSS Bar Chart: Status Distribution */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <PieChart size={18} className="text-slate-400" /> Status do Pipeline
                    </h3>
                    <div className="flex-1 flex items-end justify-around gap-4 px-4">
                        {kanbanColumns.map(col => {
                            const count = proposals.filter(p => p.status === col.id || (col.id === 'Negotiation' && p.status === 'Sent')).length;
                            const height = totalQuotes > 0 ? (count / totalQuotes) * 100 : 0;
                            return (
                                <div key={col.id} className="flex-1 flex flex-col items-center gap-2 group w-full">
                                    <div className="text-xs font-bold text-slate-600">{count}</div>
                                    <div className="w-full bg-slate-100 rounded-t-lg relative h-40 overflow-hidden">
                                        <div
                                            className={`absolute bottom-0 w-full transition-all duration-500 ${col.barColor}`}
                                            style={{ height: `${Math.max(height, 2)}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase text-center truncate w-full">{col.label}</div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Simple List: Top Opportunities */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-slate-400" /> Maiores Oportunidades
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        {proposals
                            .sort((a, b) => b.value - a.value)
                            .slice(0, 5)
                            .map((p, idx) => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors cursor-pointer" onClick={() => onSelectProposal(p.id)}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-slate-400 w-4">#{idx + 1}</span>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{p.clientName}</p>
                                            <p className="text-[10px] text-slate-500">{p.type === 'SPOT' ? 'Consultoria Spot' : 'Contrato Mensal'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-800">{formatCurrency(p.value)}</p>
                                        <span className="text-[9px] text-slate-400">{p.status}</span>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-full w-full relative">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/50">
                {/* Header Section */}
                <div className="p-8 pb-6 shrink-0 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">Gestão de Propostas</h1>
                            <p className="text-slate-500 mt-1">Pipeline comercial e acompanhamento de status.</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex">
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-100 text-[#0f172a] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Lista"><List size={20} /></button>
                                <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-slate-100 text-[#0f172a] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Kanban"><LayoutGrid size={20} /></button>
                                <button onClick={() => setViewMode('analytics')} className={`p-2 rounded-md transition-all ${viewMode === 'analytics' ? 'bg-slate-100 text-[#0f172a] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Indicadores"><BarChart3 size={20} /></button>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-5 py-3 rounded-lg font-bold shadow-lg shadow-slate-900/20 flex items-center gap-2 transition-all active:scale-95"
                            >
                                <Plus size={20} /> Nova Cotação
                            </button>
                        </div>
                    </div>

                    {/* KPIs Grid - Hide on Analytics View to avoid duplication */}
                    {viewMode !== 'analytics' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total em Carteira</p>
                                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md"><TrendingUp size={16} /></div>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900">{formatCurrency(totalGains)}</h3>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500"></div>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pipeline Aberto</p>
                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md"><PieChart size={16} /></div>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900">{formatCurrency(totalPipeline)}</h3>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500"></div>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Volumetria</p>
                                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md"><FileText size={16} /></div>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900">{totalQuotes}</h3>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500"></div>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Conversão</p>
                                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md"><CheckCircle size={16} /></div>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900">{(conversionRate * 100).toFixed(1)}%</h3>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden px-8 pb-8 flex flex-col">
                    {viewMode === 'analytics' ? renderAnalytics() :
                        viewMode === 'list' ? (
                            /* LIST VIEW */
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full w-full">
                                <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50/30 shrink-0">
                                    <Search className="text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Filtrar por cliente, ID ou responsável..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="bg-transparent outline-none text-sm w-full font-medium text-slate-700 placeholder-slate-400"
                                    />
                                </div>
                                <div className="overflow-auto flex-1 custom-scrollbar">
                                    <table className="w-full text-sm text-left relative">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs tracking-wider border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">ID / Cliente</th>
                                                <th className="px-6 py-4">Tipo</th>
                                                <th className="px-6 py-4">Responsável</th>
                                                <th className="px-6 py-4">Valor</th>
                                                <th className="px-6 py-4">Vencimento</th>
                                                <th className="px-6 py-4 text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 cursor-pointer">
                                            {filteredProposals.map((prop) => {
                                                const isSelected = selectedPreviewId === prop.id;
                                                return (
                                                    <tr
                                                        key={prop.id}
                                                        onClick={() => handleRowClick(prop.id)}
                                                        onDoubleClick={() => onSelectProposal(prop.id)}
                                                        onContextMenu={(e) => handleContextMenu(e, prop.id)}
                                                        className={`transition-all group border-l-[6px] ${isSelected ? 'bg-slate-50 border-l-[#0f172a] shadow-inner' : 'border-l-transparent hover:bg-slate-50/60 hover:border-l-slate-200'}`}
                                                    >
                                                        <td className="px-6 py-4">{getStatusBadge(prop.status)}</td>
                                                        <td className="px-6 py-4">
                                                            <div className={`font-bold transition-colors ${isSelected ? 'text-[#0f172a]' : 'text-slate-800'}`}>{prop.clientName}</div>
                                                            <p className="text-xs text-slate-400 font-mono mt-0.5">#{prop.proposalId} <span className="bg-slate-100 px-1 rounded ml-1">v{prop.version}</span></p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${prop.type === 'SPOT' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                                {prop.type === 'SPOT' ? 'Spot / Consultoria' : 'Contrato Mensal'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2 text-slate-600">
                                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">{prop.responsible.charAt(0)}</div>
                                                                <span className="text-xs font-medium">{prop.responsible}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-slate-800">{formatCurrency(prop.value)}</td>
                                                        <td className="px-6 py-4 text-slate-500 text-xs">{new Date(prop.expirationDate).toLocaleDateString('pt-BR')}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button onClick={(e) => { e.stopPropagation(); onSelectProposal(prop.id); }} className="text-blue-600 font-bold text-xs hover:underline bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                                                Abrir
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            /* KANBAN BOARD */
                            <div className="flex gap-6 h-full overflow-x-auto pb-2 custom-scrollbar items-stretch snap-x">
                                {kanbanColumns.map(col => {
                                    const colProposals = filteredProposals.filter(p => {
                                        if (col.id === 'Negotiation') return ['Negotiation', 'Sent'].includes(p.status);
                                        if (col.id === 'Draft') return p.status === 'Draft';
                                        return p.status === col.id;
                                    });

                                    return (
                                        <div
                                            key={col.id}
                                            className="flex flex-col h-full rounded-xl overflow-hidden bg-slate-100/50 border border-slate-200/60 min-w-[280px] w-full max-w-[320px] shrink-0 snap-center"
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, col.id)}
                                        >
                                            {/* Column Header */}
                                            <div className={`flex items-center justify-between p-3 border-b border-slate-200 ${col.headerBg} backdrop-blur-sm sticky top-0 z-10`}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${col.bg.replace('bg-', 'bg-').replace('-50', '-500')}`}></div>
                                                    <h3 className={`font-bold text-sm text-slate-700`}>{col.label}</h3>
                                                </div>
                                                <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-500 shadow-sm border border-slate-200">{colProposals.length}</span>
                                            </div>

                                            {/* Column Content */}
                                            <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                                                {colProposals.map(prop => (
                                                    <div
                                                        key={prop.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, prop.id)}
                                                        onClick={() => handleRowClick(prop.id)}
                                                        onDoubleClick={() => onSelectProposal(prop.id)}
                                                        onContextMenu={(e) => handleContextMenu(e, prop.id)}
                                                        className={`
                                                    group bg-white p-4 rounded-xl shadow-sm border cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:-translate-y-1 relative overflow-hidden
                                                    ${selectedPreviewId === prop.id ? 'ring-2 ring-[#0f172a] shadow-md' : 'border-slate-200'}
                                                    border-l-[6px] ${col.border}
                                                `}
                                                    >
                                                        <div className="flex justify-between items-start mb-3">
                                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 rounded border border-slate-100">
                                                                #{prop.proposalId} v{prop.version}
                                                            </span>
                                                            <div className="flex gap-1">
                                                                {prop.type === 'SPOT' && <Zap size={14} className="text-amber-500" title="Projeto Spot" />}
                                                                <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        </div>

                                                        <h4 className="font-bold text-slate-800 text-sm mb-1 leading-tight line-clamp-2">{prop.clientName}</h4>

                                                        <div className="text-lg font-black text-slate-900 mb-4 tracking-tight">
                                                            {formatCurrency(prop.value)}
                                                        </div>

                                                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                                <Calendar size={12} className="text-slate-400" />
                                                                {new Date(prop.expirationDate).toLocaleDateString('pt-BR')}
                                                            </div>
                                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-200 shadow-sm" title={prop.responsible}>
                                                                {prop.responsible.charAt(0)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                </div>
            </div>

            {/* RIGHT SIDEBAR PREVIEW OVERLAY */}
            {selectedProposal && (
                <div className="w-96 shrink-0 bg-white border-l border-slate-200 shadow-xl flex flex-col h-full animate-in slide-in-from-right duration-300 z-20">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border ${selectedProposal.status === 'Won' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                selectedProposal.status === 'Lost' ? 'bg-red-100 text-red-800 border-red-200' :
                                    'bg-slate-200 text-slate-600 border-slate-300'
                                }`}>
                                {selectedProposal.status}
                            </span>
                            <button onClick={() => setSelectedPreviewId(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"><XCircle size={20} /></button>
                        </div>
                        <h2 className="font-bold text-xl text-slate-800 leading-tight mb-1">{selectedProposal.clientName}</h2>
                        <p className="text-xs text-slate-500 font-mono">ID: #{selectedProposal.proposalId} • Versão {selectedProposal.version}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {/* Main Value */}
                        <div className="bg-[#0f172a] rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Valor Total</p>
                                {selectedProposal.type === 'SPOT' && <span className="text-[10px] bg-amber-500 text-[#0f172a] px-2 rounded font-bold">SPOT</span>}
                            </div>
                            <p className="text-3xl font-bold text-[#fbbf24] tracking-tight">{formatCurrency(selectedProposal.value)}</p>
                            <Briefcase className="absolute -bottom-4 -right-4 text-white/5 w-24 h-24" />
                        </div>

                        {/* Stats Grid */}
                        {selectedFinancials && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Margem</p>
                                    <p className="font-bold text-amber-600 text-lg">{formatPercent(selectedProposal.markup)}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Lucro Liq.</p>
                                    <p className="font-bold text-indigo-600 text-lg">{formatPercent(selectedFinancials.netProfitPercent / 100)}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Tipo</p>
                                    <p className="font-bold text-slate-700 text-sm">{selectedProposal.type === 'SPOT' ? 'Consultoria' : 'Mensal'}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Impostos</p>
                                    <p className="font-bold text-red-600 text-lg">{formatCurrency(selectedFinancials.salesTaxAmount)}</p>
                                </div>
                            </div>
                        )}

                        {/* Info List */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 shadow-sm"><User size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Responsável</p>
                                    <p className="font-bold text-slate-800 text-sm">{selectedProposal.responsible}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                        <button
                            onClick={() => onSelectProposal(selectedProposal.id)}
                            className="w-full py-3 bg-[#0f172a] text-white rounded-lg font-bold hover:bg-[#1e293b] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            Abrir Editor Completo <ArrowRight size={16} />
                        </button>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <button onClick={() => onCloneProposal(selectedProposal.id)} className="py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">Duplicar Versão</button>
                            <button onClick={() => onDeleteProposal(selectedProposal.id)} className="py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">Arquivar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 text-center">
                            <h3 className="text-xl font-bold text-slate-800">Nova Proposta Comercial</h3>
                            <p className="text-slate-500 text-sm mt-1">Selecione o tipo de projeto para iniciar</p>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-4">
                            <button
                                onClick={() => { onCreateProposal('CONTINUOUS'); setShowCreateModal(false); }}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-blue-100 bg-blue-50 hover:border-blue-500 hover:shadow-lg transition-all group"
                            >
                                <div className="p-4 bg-white rounded-full text-blue-600 group-hover:scale-110 transition-transform shadow-sm">
                                    <Repeat size={32} />
                                </div>
                                <div className="text-center">
                                    <h4 className="font-bold text-blue-900">Contrato Mensal</h4>
                                    <p className="text-xs text-blue-600 mt-1">Mão de obra fixa, custos recorrentes (MRR).</p>
                                </div>
                            </button>

                            <button
                                onClick={() => { onCreateProposal('SPOT'); setShowCreateModal(false); }}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-amber-100 bg-amber-50 hover:border-amber-500 hover:shadow-lg transition-all group"
                            >
                                <div className="p-4 bg-white rounded-full text-amber-600 group-hover:scale-110 transition-transform shadow-sm">
                                    <Zap size={32} />
                                </div>
                                <div className="text-center">
                                    <h4 className="font-bold text-amber-900">Projeto Spot</h4>
                                    <p className="text-xs text-amber-600 mt-1">Consultoria pontual, auditorias e serviços.</p>
                                </div>
                            </button>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-center">
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-500 text-sm font-bold hover:text-slate-800">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTEXT MENU */}
            {contextMenu && (
                <div
                    className="fixed bg-white border border-slate-200 shadow-xl rounded-lg z-[100] py-1 w-56 animate-in fade-in zoom-in-95 duration-100 font-medium"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Ações Rápidas
                    </div>
                    <button
                        onClick={() => onSelectProposal(contextMenu.id)}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#0f172a] flex items-center gap-2 transition-colors"
                    >
                        <ExternalLink size={14} className="text-slate-400" /> Abrir Editor
                    </button>
                    <button
                        onClick={() => onCloneProposal(contextMenu.id)}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                    >
                        <Copy size={14} className="text-slate-400" /> Duplicar Proposta
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button
                        onClick={() => onDeleteProposal(contextMenu.id)}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                        <Trash2 size={14} /> Arquivar
                    </button>
                </div>
            )}
        </div>
    );
};

export default CRM;
