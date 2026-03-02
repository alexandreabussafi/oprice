import React, { useState, useEffect } from 'react';
import { ProposalData, OpportunityStage, OpportunityStatus, OpportunityMotion, ProposalType, Client, CONTINUOUS_STAGES, SPOT_STAGES, STAGE_LABELS, CONTINUOUS_TO_SPOT_MAPPING, SPOT_TO_CONTINUOUS_MAPPING, ContinuousStage, SpotStage } from '../types';
import { calculateFinancials, formatCurrency, formatPercent } from '../utils/pricingEngine';
import { Plus, Search, FileText, CheckCircle, XCircle, X, Clock, Copy, Edit3, Trash2, PieChart, TrendingUp, Calendar, User, LayoutGrid, List, ArrowRight, DollarSign, Users, Briefcase, GripVertical, ExternalLink, BarChart3, Zap, Repeat, AlertCircle, Snowflake, Filter, Save, Landmark } from 'lucide-react';

interface CRMProps {
    clients?: Client[];
    proposals: ProposalData[];
    onSelectProposal: (id: string) => void;
    onCreateProposal: (payload: { type: ProposalType, clientId: string, motion: OpportunityMotion, referenceId?: string, expansionType?: 'Volume' | 'Scope' | 'Site' }) => void;
    onCreateNewVersion: (id: string, notes?: string) => void;
    onDuplicateProposal: (id: string) => void;
    onDeleteProposal: (id: string) => void;
    onUpdateStage: (id: string, newStage: OpportunityStage) => void;
    onUpdateStatus: (id: string, newStatus: OpportunityStatus) => void;
    onUpdateProposal: (id: string, data: Partial<ProposalData>) => void;
    onUpdateMilestones: (id: string, milestones: import('../types').Milestone[]) => void;
    initialViewMode?: 'list' | 'kanban'; // Prop para controle inicial
}

const CRM: React.FC<CRMProps> = ({
    clients = [],
    proposals,
    onSelectProposal,
    onCreateProposal,
    onCreateNewVersion,
    onDuplicateProposal,
    onDeleteProposal,
    onUpdateStage,
    onUpdateStatus,
    onUpdateProposal,
    onUpdateMilestones,
    initialViewMode = 'kanban'
}) => {
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>(initialViewMode as 'list' | 'kanban');
    const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pipelineFilter, setPipelineFilter] = useState<ProposalType>('CONTINUOUS');
    const [showFrozen, setShowFrozen] = useState(false);

    // Create Modal States
    const [showCreateModal, setShowCreateModal] = useState(false); // Keeping this as it's likely still needed to control modal visibility
    const [createStep, setCreateStep] = useState<1 | 2>(1);
    const [createType, setCreateType] = useState<ProposalType>('CONTINUOUS');
    const [createClientId, setCreateClientId] = useState<string>(/* clients && clients.length > 0 ? clients[0].id : */ ''); // Assuming 'clients' would be passed as a prop or derived. Defaulting to '' for now.
    const [createMotion, setCreateMotion] = useState<OpportunityMotion>('NewBusiness');
    const [createReferenceId, setCreateReferenceId] = useState<string>('');
    const [createExpansionType, setCreateExpansionType] = useState<'Volume' | 'Scope' | 'Site'>('Volume');

    // Drag & Drop State
    const [draggedProposalId, setDraggedProposalId] = useState<string | null>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);

    // UX Modals State
    const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
    const [isFrozenModalOpen, setIsFrozenModalOpen] = useState(false);
    const [actionProposalId, setActionProposalId] = useState<string | null>(null);
    const [tempNotes, setTempNotes] = useState('');
    const [tempFrozenUntil, setTempFrozenUntil] = useState('');

    // Milestones State
    const [isAddingMilestone, setIsAddingMilestone] = useState(false);
    const [tempMilestoneTitle, setTempMilestoneTitle] = useState('');
    const [tempMilestoneDate, setTempMilestoneDate] = useState('');

    // Sync viewMode when prop changes (Sidebar navigation)
    useEffect(() => {
        setViewMode(initialViewMode);
    }, [initialViewMode]);

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Get only the proposals that are the CURRENT version
    const activeProposals = proposals.filter(p => p.isCurrentVersion);

    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, id });
    };

    const selectedProposal = proposals.find(p => p.id === selectedPreviewId);
    const selectedFinancials = selectedProposal ? calculateFinancials(selectedProposal) : null;

    const filteredProposals = activeProposals.filter(p => {
        const matchesSearch = p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.proposalId.includes(searchTerm) ||
            p.responsible.toLowerCase().includes(searchTerm.toLowerCase());

        // Status filters
        const matchesFrozen = showFrozen || p.status !== 'Frozen';
        const isArchived = p.status === 'Archived';

        return matchesSearch && matchesFrozen && !isArchived;
    });

    // --- KPI Calculations ---
    const totalQuotesForConversion = activeProposals.filter(p => p.status !== 'Frozen' && p.status !== 'Archived').length;
    const wonQuotes = activeProposals.filter(p => p.stage === 'Won');
    const totalGains = wonQuotes.reduce((acc, p) => acc + p.value, 0);

    // Pipeline should exclude Won and Lost and Archived
    const totalPipeline = activeProposals
        .filter(p =>
            !['Won', 'Lost'].includes(p.stage) &&
            p.status === 'Active'
        ).reduce((acc, p) => acc + p.value, 0);


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

    const handleDrop = (e: React.DragEvent, newStage: OpportunityStage) => {
        e.preventDefault();
        if (draggedProposalId) {
            onUpdateStage(draggedProposalId, newStage);
            setDraggedProposalId(null);
        }
    };

    // Added 'barColor' for explicit tailwind classes
    const continuousColumns: { id: ContinuousStage, label: string, color: string, bg: string, border: string, barColor: string, headerBg: string }[] = [
        { id: 'MQL', label: 'Prospecção', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-300', barColor: 'bg-indigo-500', headerBg: 'bg-indigo-100/50' },
        { id: 'Qualification', label: 'Qualificação', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-300', barColor: 'bg-violet-500', headerBg: 'bg-violet-100/50' },
        { id: 'SolutionDesign', label: 'Desenho de Solução', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-300', barColor: 'bg-cyan-500', headerBg: 'bg-cyan-100/50' },
        { id: 'Pricing', label: 'Precificação', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-300', barColor: 'bg-slate-500', headerBg: 'bg-slate-100/50' },
        { id: 'Sent', label: 'Enviado', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-400', barColor: 'bg-blue-500', headerBg: 'bg-blue-50/70' },
        { id: 'Negotiation', label: 'Negociação', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-400', barColor: 'bg-amber-500', headerBg: 'bg-amber-50/70' },
        { id: 'Review', label: 'Em Revisão', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-400', barColor: 'bg-rose-500', headerBg: 'bg-rose-50/70' },
        { id: 'Won', label: 'Ganho', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500', barColor: 'bg-emerald-500', headerBg: 'bg-emerald-50/70' },
    ];

    const spotColumns: { id: SpotStage, label: string, color: string, bg: string, border: string, barColor: string, headerBg: string }[] = [
        { id: 'MQL', label: 'Prospecção', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-300', barColor: 'bg-indigo-500', headerBg: 'bg-indigo-100/50' },
        { id: 'Diagnosis', label: 'Diagnóstico', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-300', barColor: 'bg-cyan-500', headerBg: 'bg-cyan-100/50' },
        { id: 'Pricing', label: 'Precificação', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-300', barColor: 'bg-slate-500', headerBg: 'bg-slate-100/50' },
        { id: 'Sent', label: 'Enviado', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-400', barColor: 'bg-blue-500', headerBg: 'bg-blue-50/70' },
        { id: 'FinalAdjustments', label: 'Ajustes Finais', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-400', barColor: 'bg-amber-500', headerBg: 'bg-amber-50/70' },
        { id: 'AwaitingPO', label: 'Aguardando PO', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-400', barColor: 'bg-rose-500', headerBg: 'bg-rose-50/70' },
        { id: 'Won', label: 'Ganho', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500', barColor: 'bg-emerald-500', headerBg: 'bg-emerald-50/70' },
    ];

    const kanbanColumns = pipelineFilter === 'CONTINUOUS' ? continuousColumns : spotColumns;

    const getStatusBadge = (stage: OpportunityStage, status: OpportunityStatus = 'Active') => {
        if (status === 'Frozen') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-900/10 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors"><Snowflake size={12} /> Congelado</span>;
        if (status === 'Archived') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 transition-colors"><Trash2 size={12} /> Arquivado</span>;

        const label = STAGE_LABELS[stage] || stage;

        switch (stage) {
            case 'Won': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-colors"><CheckCircle size={12} /> {label}</span>;
            case 'Lost': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800 transition-colors"><XCircle size={12} /> {label}</span>;
            case 'Pricing': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"><Edit3 size={12} /> {label}</span>;
            case 'Sent': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-colors"><FileText size={12} /> {label}</span>;
            case 'Negotiation':
            case 'FinalAdjustments': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800 transition-colors"><Clock size={12} /> {label}</span>;
            case 'MQL': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition-colors">{label}</span>;
            case 'Qualification':
            case 'Diagnosis': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-400 border border-violet-200 dark:border-violet-800 transition-colors">{label}</span>;
            case 'Review':
            case 'AwaitingPO': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors">{label}</span>;
            case 'SolutionDesign': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 transition-colors">{label}</span>;
            default: return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">{label}</span>;
        }
    };

    const getMotionBadge = (motion: OpportunityMotion) => {
        switch (motion) {
            case 'NewBusiness': return <span className="text-[10px] bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-800 font-bold transition-colors">Novo</span>;
            case 'Renewal': return <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800 font-bold transition-colors">Renovação</span>;
            case 'Expansion': return <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 font-bold transition-colors">Expansão</span>;
            case 'Addendum': return <span className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700 font-bold transition-colors">Aditivo</span>;
            case 'Reactivation': return <span className="text-[10px] bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-800 font-bold transition-colors">Reativação</span>;
        }
    };



    return (
        <div className="flex h-full w-full relative">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/50 dark:bg-slate-950 transition-colors">
                {/* Header Section */}
                <div className="p-8 pb-6 shrink-0 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-[#0f172a] dark:text-slate-100 tracking-tight">Gestão de Propostas</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Pipeline comercial e acompanhamento de status.</p>
                        </div>
                        <div className="flex gap-3">
                            {viewMode === 'kanban' && (
                                <div className="flex p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                                    <button
                                        onClick={() => setPipelineFilter('CONTINUOUS')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${pipelineFilter === 'CONTINUOUS' ? 'bg-[#0f172a] dark:bg-indigo-600 text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                    >
                                        <Repeat size={14} /> Contínuo
                                    </button>
                                    <button
                                        onClick={() => setPipelineFilter('SPOT')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${pipelineFilter === 'SPOT' ? 'bg-[#0f172a] dark:bg-indigo-600 text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                    >
                                        <Zap size={14} /> Spot
                                    </button>
                                </div>
                            )}
                            <div className="bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex transition-colors">
                                <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-slate-100 dark:bg-slate-800 text-[#0f172a] dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`} title="Kanban"><LayoutGrid size={20} /></button>
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-800 text-[#0f172a] dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`} title="Lista"><List size={20} /></button>
                            </div>
                            <button
                                onClick={() => setShowFrozen(!showFrozen)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${showFrozen ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}
                            >
                                <Snowflake size={16} /> {showFrozen ? 'Ocultar Congelados' : 'Mostrar Congelados'}
                            </button>
                            <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 mx-1 transition-colors"></div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-[#0f172a] dark:bg-indigo-600 hover:bg-[#1e293b] dark:hover:bg-indigo-700 text-white px-5 py-3 rounded-lg font-bold shadow-lg shadow-slate-900/20 dark:shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95"
                            >
                                <Plus size={20} /> Nova Cotação
                            </button>
                        </div>
                    </div>


                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden px-8 pb-8 flex flex-col">
                    {viewMode === 'list' ? (
                        /* LIST VIEW */
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full w-full transition-colors">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 bg-slate-50/30 dark:bg-slate-900/30 shrink-0">
                                <Search className="text-slate-400 dark:text-slate-500" size={18} />
                                <input
                                    type="text"
                                    placeholder="Filtrar por cliente, ID ou responsável..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-transparent outline-none text-sm w-full font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                                />
                            </div>
                            <div className="overflow-auto flex-1 custom-scrollbar">
                                <table className="w-full text-sm text-left relative">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm transition-colors">
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
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 cursor-pointer transition-colors text-slate-800 dark:text-slate-200">
                                        {filteredProposals.map((prop) => {
                                            const isSelected = selectedPreviewId === prop.id;
                                            return (
                                                <tr
                                                    key={prop.id}
                                                    onClick={() => handleRowClick(prop.id)}
                                                    onDoubleClick={() => onSelectProposal(prop.id)}
                                                    onContextMenu={(e) => handleContextMenu(e, prop.id)}
                                                    className={`transition-all group border-l-[6px] ${isSelected ? 'bg-slate-50 dark:bg-slate-800/50 border-l-[#0f172a] dark:border-l-indigo-500 shadow-inner' : 'border-l-transparent hover:bg-slate-50/60 dark:hover:bg-slate-800/30 hover:border-l-slate-200 dark:hover:border-l-slate-700'} ${prop.status === 'Frozen' ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                                >
                                                    <td className="px-6 py-4">{getStatusBadge(prop.stage, prop.status)}</td>
                                                    <td className="px-6 py-4">
                                                        <div className={`font-bold transition-colors ${isSelected ? 'text-[#0f172a] dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>{prop.clientName}</div>
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5 transition-colors">#{prop.proposalId} <span className="bg-slate-100 dark:bg-slate-800 px-1 rounded ml-1 transition-colors">v{prop.version}</span></p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border transition-colors ${prop.type === 'SPOT' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'}`}>
                                                            {prop.type === 'SPOT' ? 'Spot / Consultoria' : 'Contrato Mensal'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 transition-colors">
                                                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 transition-colors">{prop.responsible.charAt(0)}</div>
                                                            <span className="text-xs font-medium">{prop.responsible}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100 transition-colors">{formatCurrency(prop.value)}</td>
                                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs transition-colors">{new Date(prop.expirationDate).toLocaleDateString('pt-BR')}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button onClick={(e) => { e.stopPropagation(); onSelectProposal(prop.id); }} className="text-blue-600 dark:text-blue-400 font-bold text-xs hover:underline bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800 transition-colors">
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
                                const colProposals = filteredProposals.filter(p => p.stage === col.id);

                                return (
                                    <div
                                        key={col.id}
                                        className="flex flex-col h-full rounded-xl overflow-hidden bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 min-w-[280px] w-full max-w-[320px] shrink-0 snap-center transition-colors"
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, col.id)}
                                    >
                                        {/* Column Header */}
                                        <div className={`flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 ${col.headerBg} dark:bg-slate-800/40 backdrop-blur-sm sticky top-0 z-10 transition-colors`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${col.bg.replace('bg-', 'bg-').replace('-50', '-500')}`}></div>
                                                <h3 className={`font-bold text-sm text-slate-700 dark:text-slate-100 transition-colors`}>{col.label}</h3>
                                            </div>
                                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">{colProposals.length}</span>
                                        </div>

                                        {/* Column Content */}
                                        <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                                            {colProposals
                                                .filter(p => viewMode === 'list' || p.type === pipelineFilter)
                                                .map(prop => (
                                                    <div
                                                        key={prop.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, prop.id)}
                                                        onClick={() => handleRowClick(prop.id)}
                                                        onDoubleClick={() => onSelectProposal(prop.id)}
                                                        onContextMenu={(e) => handleContextMenu(e, prop.id)}
                                                        className={`
                                                    group bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:-translate-y-1 relative overflow-hidden
                                                    ${selectedPreviewId === prop.id ? 'ring-2 ring-[#0f172a] dark:ring-indigo-500 shadow-md' : 'border-slate-200 dark:border-slate-700'}
                                                    border-l-[6px] ${col.border}
                                                    ${prop.status === 'Frozen' ? 'grayscale-[0.8] opacity-70 bg-slate-50/50 dark:bg-slate-900/50' : ''}
                                                `}
                                                    >
                                                        {prop.status === 'Frozen' && (
                                                            <div className="absolute top-0 right-0 p-1 bg-blue-900/10 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 rounded-bl-lg transition-colors" title="Congelada">
                                                                <Snowflake size={14} />
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between items-start mb-3">
                                                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 px-1.5 rounded border border-slate-100 dark:border-slate-700 transition-colors">
                                                                #{prop.proposalId} v{prop.version}
                                                            </span>
                                                            <div className="flex gap-1 items-center">
                                                                {getMotionBadge(prop.motion)}
                                                                {prop.type === 'SPOT' && <Zap size={14} className="text-amber-500" title="Projeto Spot" />}
                                                                <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        </div>

                                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 leading-tight line-clamp-2 transition-colors">{prop.clientName}</h4>

                                                        <div className="flex justify-between items-end">
                                                            <div>
                                                                <p className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight transition-colors">{formatCurrency(prop.value)}</p>
                                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium transition-colors">Margem: <span className={prop.markup < 0.15 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'}>{formatPercent(prop.markup)}</span></p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {prop.markup < 0.15 && (
                                                                    <div className="w-5 h-5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center animate-pulse" title="Margem abaixo do limite (15%)">
                                                                        <AlertCircle size={12} />
                                                                    </div>
                                                                )}
                                                                <div className="p-2 bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 rounded-lg group-hover:bg-[#0f172a] dark:group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:text-white transition-colors">
                                                                    <ArrowRight size={14} />
                                                                </div>
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
                <div className="w-96 shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl flex flex-col h-full animate-in slide-in-from-right duration-300 z-20 transition-colors">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${selectedProposal.type === 'SPOT' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                {selectedProposal.type === 'SPOT' ? 'SPOT' : 'MENSAL'}
                            </span>
                            <button onClick={() => setSelectedPreviewId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><XCircle size={20} /></button>
                        </div>
                        <h2 className="font-bold text-xl text-slate-800 dark:text-slate-100 leading-tight mb-1">{selectedProposal.clientName}</h2>

                        {selectedProposal.versionNotes && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-100 dark:border-amber-800 mt-2 italic shadow-sm">
                                📝 Nota da versão: {selectedProposal.versionNotes}
                            </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                            {getStatusBadge(selectedProposal.stage, selectedProposal.status)}
                            {getMotionBadge(selectedProposal.motion)}
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${selectedProposal.type === 'SPOT' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'}`}>
                                {selectedProposal.type === 'SPOT' ? 'Spot' : 'Mensal'}
                            </span>
                        </div>

                        {/* Responsible and Version Info */}
                        <div className="mt-4 flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><User size={14} /> Vendedor Resp.</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{selectedProposal.responsible}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Copy size={14} /> Histórico de Versões</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">Versão {selectedProposal.version} <span className="font-normal text-slate-400">({selectedProposal.versionStatus})</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {/* FINANCIAL SUMMARY BLOCK */}
                        {(() => {
                            if (!selectedProposal) return null;
                            const financials = calculateFinancials(selectedProposal);
                            const totalHeadcount = Math.round(selectedProposal.roles.reduce((acc, r) => acc + r.quantity, 0) * 10) / 10; // Arredonda para 1 casa decimal se necessário

                            return (
                                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center gap-2">
                                        <PieChart size={14} /> Resumo da Cotação
                                    </h4>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-lg shadow-sm">
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Preço (Mensal)</p>
                                            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(financials.monthlyValue)}</p>
                                        </div>
                                        <div className={`border p-3 rounded-lg shadow-sm ${selectedProposal.targetMargin < 0.15 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Margem (Target)</p>
                                            <p className={`text-lg font-black ${selectedProposal.targetMargin < 0.15 ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                                {formatPercent(selectedProposal.targetMargin)}
                                            </p>
                                        </div>
                                        {selectedProposal.type === 'CONTINUOUS' && (
                                            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-lg shadow-sm">
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Total de Vidas (HC)</p>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Users size={14} className="text-slate-400" /> {totalHeadcount}</p>
                                            </div>
                                        )}
                                        {selectedProposal.type === 'SPOT' && (
                                            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-lg shadow-sm">
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Recursos Alocados</p>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Users size={14} className="text-slate-400" /> {selectedProposal.spotResources?.reduce((acc, r) => acc + r.quantity, 0) || 0} diárias</p>
                                            </div>
                                        )}
                                        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-lg shadow-sm">
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Carga Trib. s/ Venda</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Landmark size={14} className="text-slate-400" /> {formatPercent(financials.salesTaxAmount / (financials.monthlyValue || 1))}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ALERT: Margin Validation */}
                        {selectedProposal.targetMargin < 0.15 && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex gap-3 animate-pulse">
                                <XCircle className="text-red-600 dark:text-red-400 shrink-0" size={20} />
                                <div>
                                    <p className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-tight">Alerta de Viabilidade</p>
                                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">A margem desta proposta ({formatPercent(selectedProposal.markup)}) está abaixo do limite de 15%. Requer aprovação da diretoria.</p>
                                </div>
                            </div>
                        )}

                        {/* Status/Stage Selectors */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Etapa (Funil)</label>
                                <select
                                    disabled={selectedProposal.status === 'Archived'}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    value={selectedProposal.stage}
                                    onChange={(e) => onUpdateStage(selectedProposal.id, e.target.value as OpportunityStage)}
                                >
                                    {selectedProposal.type === 'CONTINUOUS' ? (
                                        <>
                                            {CONTINUOUS_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                                        </>
                                    ) : (
                                        <>
                                            {SPOT_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estado Transversal</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                                    value={selectedProposal.status}
                                    onChange={(e) => {
                                        const newStatus = e.target.value as OpportunityStatus;
                                        if (newStatus === 'Frozen') {
                                            setActionProposalId(selectedProposal.id);
                                            setTempNotes('');
                                            setTempFrozenUntil('');
                                            setIsFrozenModalOpen(true);
                                        } else {
                                            onUpdateStatus(selectedProposal.id, newStatus);
                                        }
                                    }}
                                >
                                    <option value="Active">Ativo</option>
                                    <option value="Frozen">Congelado</option>
                                    <option value="Archived">Arquivado</option>
                                </select>
                            </div>
                        </div>

                        {selectedProposal.status === 'Frozen' && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
                                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-400 font-bold text-xs uppercase">
                                    <Snowflake size={14} /> Detalhes do Congelamento
                                </div>
                                <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Motivo: <span className="font-normal italic text-blue-600 dark:text-blue-400">{selectedProposal.frozenReason}</span></p>
                                {selectedProposal.frozenUntil && (
                                    <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Revisar em: <span className="font-normal italic text-blue-600 dark:text-blue-400">{new Date(selectedProposal.frozenUntil).toLocaleDateString()}</span></p>
                                )}
                                <button
                                    onClick={() => onUpdateStatus(selectedProposal.id, 'Active')}
                                    className="w-full mt-2 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-colors"
                                >
                                    Reativar Oportunidade (Unfreeze)
                                </button>
                            </div>
                        )}

                        {/* MILESTONES SECTION */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={14} /> Eventos e Prazos
                                </h4>
                                <button
                                    onClick={() => setIsAddingMilestone(!isAddingMilestone)}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs font-bold transition-colors"
                                >
                                    {isAddingMilestone ? 'Cancelar' : '+ Cadastrar'}
                                </button>
                            </div>

                            {isAddingMilestone && (
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Ex: Confirmação de Visita Técnica"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                                        value={tempMilestoneTitle}
                                        onChange={(e) => setTempMilestoneTitle(e.target.value)}
                                    />
                                    <input
                                        type="date"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                                        value={tempMilestoneDate}
                                        onChange={(e) => setTempMilestoneDate(e.target.value)}
                                    />
                                    <button
                                        disabled={!tempMilestoneTitle || !tempMilestoneDate}
                                        onClick={() => {
                                            const newMilestone = {
                                                id: Math.random().toString(36).substr(2, 9),
                                                title: tempMilestoneTitle,
                                                date: tempMilestoneDate,
                                                completed: false
                                            };
                                            onUpdateMilestones(selectedProposal.id, [...(selectedProposal.milestones || []), newMilestone]);
                                            setIsAddingMilestone(false);
                                            setTempMilestoneTitle('');
                                            setTempMilestoneDate('');
                                        }}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 rounded transition-colors disabled:opacity-50"
                                    >
                                        Salvar Evento
                                    </button>
                                </div>
                            )}

                            {(!selectedProposal.milestones || selectedProposal.milestones.length === 0) && !isAddingMilestone && (
                                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">Nenhum evento registrado.</p>
                            )}

                            {selectedProposal.milestones && selectedProposal.milestones.length > 0 && (
                                <div className="space-y-3">
                                    {[...selectedProposal.milestones]
                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                        .map((m) => (
                                            <div key={m.id} className="flex gap-3 group relative pl-4 border-l-2 border-slate-100 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
                                                <div className="absolute -left-[9px] top-0.5 bg-white dark:bg-slate-800 rounded-full">
                                                    <button
                                                        onClick={() => {
                                                            const updated = selectedProposal.milestones!.map(ms => ms.id === m.id ? { ...ms, completed: !ms.completed } : ms);
                                                            onUpdateMilestones(selectedProposal.id, updated);
                                                        }}
                                                        className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${m.completed ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-transparent hover:border-indigo-400 dark:hover:border-indigo-500'}`}
                                                    >
                                                        <CheckCircle size={10} className={m.completed ? 'opacity-100' : 'opacity-0 hover:opacity-100 text-indigo-400 dark:text-indigo-300'} />
                                                    </button>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-bold truncate transition-all ${m.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        {m.title}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <Clock size={10} /> {new Date(m.date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <button
                                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all px-1"
                                                    onClick={() => {
                                                        const updated = selectedProposal.milestones!.filter(ms => ms.id !== m.id);
                                                        onUpdateMilestones(selectedProposal.id, updated);
                                                    }}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>



                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0 transition-colors">
                        <button
                            onClick={() => onSelectProposal(selectedProposal.id)}
                            className="w-full py-3 bg-[#0f172a] dark:bg-indigo-600 text-white rounded-lg font-bold hover:bg-[#1e293b] dark:hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            Abrir Editor Completo <ArrowRight size={16} />
                        </button>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <button
                                onClick={() => {
                                    setActionProposalId(selectedProposal.id);
                                    setTempNotes('');
                                    setIsNewVersionModalOpen(true);
                                }}
                                className="py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-1"
                                title="Cria versão 2, 3... da mesma proposta"
                            >
                                <Repeat size={14} /> Nova Versão
                            </button>
                            <button
                                onClick={() => onDuplicateProposal(selectedProposal.id)}
                                className="py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-1"
                                title="Cria uma cotação v1 com um novo ID"
                            >
                                <Copy size={14} /> Duplicar
                            </button>
                        </div>
                        <button onClick={() => onDeleteProposal(selectedProposal.id)} className="w-full mt-2 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors">Arquivar / Descartar</button>
                    </div>
                </div >
            )}

            {/* CREATE MODAL */}
            {
                showCreateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border dark:border-slate-800 transition-colors">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 relative">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center">Nova Oportunidade Comercial</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center">
                                    {createStep === 1 ? 'Selecione o tipo de projeto' : 'Detalhes da Oportunidade'}
                                </p>
                                {createStep === 2 && (
                                    <button onClick={() => setCreateStep(1)} className="absolute left-6 top-6 text-slate-400 hover:text-slate-700">
                                        <ArrowRight size={20} className="rotate-180" />
                                    </button>
                                )}
                            </div>

                            {createStep === 1 && (
                                <div className="p-6 grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => { setCreateType('CONTINUOUS'); setCreateStep(2); }}
                                        className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all group"
                                    >
                                        <div className="p-4 bg-white dark:bg-slate-800 rounded-full text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shadow-sm">
                                            <Repeat size={32} />
                                        </div>
                                        <div className="text-center">
                                            <h4 className="font-bold text-blue-900 dark:text-blue-200">Contrato Mensal</h4>
                                            <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">Mão de obra fixa, custos recorrentes.</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { setCreateType('SPOT'); setCreateStep(2); }}
                                        className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 hover:border-amber-500 dark:hover:border-amber-400 hover:shadow-lg transition-all group"
                                    >
                                        <div className="p-4 bg-white dark:bg-slate-800 rounded-full text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shadow-sm">
                                            <Zap size={32} />
                                        </div>
                                        <div className="text-center">
                                            <h4 className="font-bold text-amber-900 dark:text-amber-200">Projeto Spot</h4>
                                            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Consultoria pontual, auditorias.</p>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {createStep === 2 && (
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Cliente</label>
                                        <select
                                            value={createClientId}
                                            onChange={(e) => setCreateClientId(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-colors"
                                        >
                                            {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Movimento / Motivo</label>
                                        <select
                                            value={createMotion}
                                            onChange={(e) => {
                                                setCreateMotion(e.target.value as OpportunityMotion);
                                                setCreateReferenceId('');
                                            }}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-colors"
                                        >
                                            <option value="NewBusiness">Novo Negócio</option>
                                            <option value="Renewal">Renovação</option>
                                            <option value="Expansion">Expansão</option>
                                            <option value="Addendum">Aditivo</option>
                                            <option value="Reactivation">Reativação</option>
                                        </select>
                                    </div>

                                    {createMotion !== 'NewBusiness' && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Proposta de Referência <span className="text-red-500">*</span></label>
                                            <select
                                                value={createReferenceId}
                                                onChange={(e) => setCreateReferenceId(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-colors"
                                                required
                                            >
                                                <option value="" disabled>Selecione uma proposta ativa relacionada...</option>
                                                {activeProposals
                                                    .filter(p => p.clientId === createClientId && p.stage === 'Won') // Suggesting Won ones only as references initially
                                                    .map(p => (
                                                        <option key={p.id} value={p.id}>#{p.proposalId} - {p.clientName}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    )}

                                    {createMotion === 'Expansion' && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Tipologia da Expansão</label>
                                            <select
                                                value={createExpansionType}
                                                onChange={(e) => setCreateExpansionType(e.target.value as any)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-colors"
                                            >
                                                <option value="Volume">Aumento de Volume/Quantidade</option>
                                                <option value="Scope">Novo Escopo/Serviço Adicional</option>
                                                <option value="Site">Nova Unidade/Site</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="mt-6">
                                        <button
                                            disabled={createMotion !== 'NewBusiness' && !createReferenceId}
                                            onClick={() => {
                                                onCreateProposal({
                                                    type: createType,
                                                    clientId: createClientId || (clients ? clients[0]?.id : ''),
                                                    motion: createMotion,
                                                    referenceId: createMotion !== 'NewBusiness' ? createReferenceId : undefined,
                                                    expansionType: createMotion === 'Expansion' ? createExpansionType : undefined
                                                });
                                                setShowCreateModal(false);
                                                setCreateStep(1);
                                            }}
                                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Confirmar e Criar
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-center transition-colors">
                                <button onClick={() => { setShowCreateModal(false); setCreateStep(1); }} className="text-slate-500 dark:text-slate-400 text-sm font-bold hover:text-slate-800 dark:hover:text-slate-100 transition-colors">Cancelar</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* CONTEXT MENU */}
            {
                contextMenu && (
                    <div
                        className="fixed bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg z-[100] py-1 w-56 animate-in fade-in zoom-in-95 duration-100 font-medium transition-colors"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Ações Rápidas
                        </div>
                        <button
                            onClick={() => onSelectProposal(contextMenu.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-[#0f172a] dark:hover:text-white flex items-center gap-2 transition-colors"
                        >
                            <ExternalLink size={14} className="text-slate-400" /> Abrir Editor
                        </button>
                        <button
                            onClick={() => {
                                setActionProposalId(contextMenu.id);
                                setTempNotes('');
                                setIsNewVersionModalOpen(true);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
                        >
                            <Repeat size={14} className="text-slate-400" /> Criar Nova Versão
                        </button>
                        <button
                            onClick={() => onDuplicateProposal(contextMenu.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
                        >
                            <Copy size={14} className="text-slate-400" /> Duplicar (Nova Cotação)
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                        <button
                            onClick={() => onDeleteProposal(contextMenu.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 transition-colors"
                        >
                            <Trash2 size={14} /> Arquivar
                        </button>
                    </div>
                )
            }
            {/* NEW VERSION MODAL */}
            {
                isNewVersionModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border dark:border-slate-800 animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Formalizar Nova Versão</h3>
                                <button onClick={() => setIsNewVersionModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                    Descreva o motivo desta nova versão opcionalmente. Isso ajudará no rastreio do histórico de negociação.
                                </p>
                                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Notas da Versão</label>
                                <textarea
                                    autoFocus
                                    value={tempNotes}
                                    onChange={(e) => setTempNotes(e.target.value)}
                                    placeholder="Ex: Ajuste de margem conforme solicitação do cliente..."
                                    className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                />
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                <button
                                    onClick={() => setIsNewVersionModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        if (actionProposalId) {
                                            onCreateNewVersion(actionProposalId, tempNotes);
                                            setIsNewVersionModalOpen(false);
                                        }
                                    }}
                                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> Confirmar Versão
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* FROZEN MODAL */}
            {
                isFrozenModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border dark:border-slate-800 animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20">
                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                    <Snowflake size={20} />
                                    <h3 className="text-lg font-bold">Congelar Oportunidade</h3>
                                </div>
                                <button onClick={() => setIsFrozenModalOpen(false)} className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Congelar uma oportunidade remove ela dos dashboards de forecast ativo, mas preserva seu histórico e estágio atual.
                                </p>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Motivo do Congelamento</label>
                                    <textarea
                                        autoFocus
                                        value={tempNotes}
                                        onChange={(e) => setTempNotes(e.target.value)}
                                        placeholder="Ex: Cliente aguardando aprovação de budget do próximo ano..."
                                        className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Revisar em (Opcional)</label>
                                    <input
                                        type="date"
                                        value={tempFrozenUntil}
                                        onChange={(e) => setTempFrozenUntil(e.target.value)}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                <button
                                    onClick={() => setIsFrozenModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        if (actionProposalId) {
                                            onUpdateProposal(actionProposalId, {
                                                status: 'Frozen',
                                                frozenReason: tempNotes || 'Não informado',
                                                frozenUntil: tempFrozenUntil || undefined
                                            });
                                            setIsFrozenModalOpen(false);
                                        }
                                    }}
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2"
                                >
                                    <Snowflake size={16} /> Congelar Agora
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default CRM;
