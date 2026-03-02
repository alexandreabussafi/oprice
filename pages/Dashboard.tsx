
import React, { useState } from 'react';
import { ProposalData, AccountingMapping } from '../types';
import { calculateFinancials, formatCurrency, formatPercent, generateFinancialProjections } from '../utils/pricingEngine';
import { TrendingUp, Users, DollarSign, ArrowRight, HelpCircle, AlertCircle, Briefcase, Calculator, PieChart, Landmark, BarChart3, Coins, BookOpen, CalendarDays, Activity, BarChart4, CheckCircle, XCircle, Clock, FileText, Trash2, Edit3, Snowflake, Copy } from 'lucide-react';
import InfoTooltip from '../components/InfoTooltip';

interface DashboardProps {
    data: ProposalData;
    setActiveTab: (tab: string) => void;
    initialSnapshot?: ProposalData | null;
    allVersions?: ProposalData[];
    onSaveVersion?: (notes: string) => void;
    onSelectVersion?: (id: string) => void;
    onUpdateVersionStatus?: (id: string, status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED') => void;
    onUpdateProposal?: (id: string, updates: Partial<ProposalData>) => void;
    currentUser?: { name: string; role: 'ADMIN' | 'SELLER' | 'MANAGER' };
}

const Dashboard: React.FC<DashboardProps> = ({ data, setActiveTab, initialSnapshot, allVersions = [], onSaveVersion, onSelectVersion, onUpdateVersionStatus, onUpdateProposal, currentUser }) => {
    const getStatusBadge = () => {
        if (data.status === 'Frozen') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-900/10 text-blue-900 border border-blue-200"><Snowflake size={10} /> Congelado</span>;

        switch (data.stage) {
            case 'Won': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle size={10} /> Ganho</span>;
            case 'Lost': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200"><XCircle size={10} /> Perdido</span>;
            case 'Pricing': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"><Edit3 size={10} /> Precificação</span>;
            case 'Sent': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200"><FileText size={10} /> Enviado</span>;
            case 'Negotiation': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200"><Clock size={10} /> Negociação</span>;
            case 'MQL': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">MQL</span>;
            case 'Qualification': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200">Qualificação</span>;
            case 'Closing': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">Fechamento</span>;
            default: return null;
        }
    };

    const getMotionBadge = () => {
        switch (data.motion) {
            case 'NewBusiness': return <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 font-bold">Novo</span>;
            case 'Renewal': return <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-bold">Renovação</span>;
            case 'Expansion': return <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-bold">Expansão</span>;
            default: return null;
        }
    };

    const [activeView, setActiveView] = useState<'summary' | 'cashflow' | 'dre' | 'feasibility'>('summary');

    const financials = calculateFinancials(data);
    const projections = generateFinancialProjections(data, data.accountingConfig);
    const totalHeadcount = data.roles.reduce((acc, r) => acc + r.quantity, 0);

    const indicators = projections.indicators;
    const wacc = data.wacc || 0.12;
    const isNpvViable = indicators.npv > 0;
    const isIrrViable = indicators.irr > wacc;
    const isProfitViable = financials.netProfitAmount > 0;

    const hasCritialIssue = !isNpvViable || !isIrrViable || !isProfitViable;

    // Managerial Calculation: Total Tax Burden (Sales + Income)
    const totalTaxAmount = financials.salesTaxAmount + financials.incomeTaxAmount;
    const effectiveTaxBurden = financials.monthlyValue > 0 ? totalTaxAmount / financials.monthlyValue : 0;

    // --- VERSIONING MODAL STATE ---
    const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
    const [versionNotes, setVersionNotes] = useState('');

    const handleSaveVersion = () => {
        if (onSaveVersion) {
            onSaveVersion(versionNotes);
            setIsDiffModalOpen(false);
            setVersionNotes('');
        }
    };

    // --- APPROVAL LOGIC ---
    const handleSubmitProposal = () => {
        if (!onUpdateVersionStatus || !onUpdateProposal || !currentUser) return;

        if (data.targetMargin < 0.15 && currentUser.role !== 'ADMIN') {
            // Requires Approval
            console.log(`[TEAMS WEBHOOK SIMULATION] Nova solicitação de aprovação enviada para o Gestor. Proposta: ${data.proposalId} | Cliente: ${data.clientName} | Margem: ${formatPercent(data.targetMargin)}`);
            alert(`Aviso: A margem configurada (${formatPercent(data.targetMargin)}) está abaixo do piso de 15%. Uma solicitação foi enviada ao Gestor via MS Teams para aprovação.`);

            onUpdateProposal(data.id, {
                versionStatus: 'SUBMITTED',
                approvalStatus: 'PENDING',
                approvalRequestedBy: currentUser.name
            });
        } else {
            // Auto Submit if Margin >= 15% or User is ADMIN
            onUpdateVersionStatus(data.id, 'SUBMITTED');
        }
    };

    const handleManagerDecision = (decision: 'APPROVED' | 'REJECTED') => {
        if (!onUpdateProposal || !currentUser) return;

        onUpdateProposal(data.id, {
            versionStatus: decision,
            approvalStatus: decision,
            approvedBy: currentUser.name
        });
    };

    // --- SUB-COMPONENTS ---

    const renderHealthCheck = () => {
        if (!hasCritialIssue) return null;

        return (
            <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-4">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                        <AlertCircle size={20} />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-red-800 uppercase tracking-tight">Alerta de Viabilidade Financeira</h4>
                        <div className="mt-1 flex flex-wrap gap-4 text-[11px] text-red-700">
                            {!isProfitViable && <span className="flex items-center gap-1 font-bold">● Lucro Líquido Negativo</span>}
                            {!isNpvViable && <span className="flex items-center gap-1 font-bold">● VPL Negativo (Destruição de Valor)</span>}
                            {!isIrrViable && <span className="flex items-center gap-1 font-bold">● TIR abaixo da TMA ({formatPercent(wacc)})</span>}
                        </div>
                        <p className="mt-2 text-xs text-red-600 max-w-2xl">
                            A estrutura de custos atual ou o preço de venda configurado não garantem a saúde econômica deste projeto.
                            Considere aumentar a margem ou revisar os custos operacionais.
                        </p>
                    </div>
                    <button
                        onClick={() => setActiveTab('pricing')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                    >
                        Ajustar Precificação
                    </button>
                </div>
            </div>
        );
    };

    const renderSummary = () => (
        <>
            {/* KPI Cards Strategy: Price -> Ops Margin -> Contribution -> Net Result -> HC */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Card 1: Revenue (Top Line) */}
                <div className="bg-emerald-50/50 p-6 rounded-xl shadow-sm border border-emerald-100 relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-emerald-200">
                    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                        <DollarSign className="absolute -bottom-6 -right-6 w-36 h-36 text-emerald-100/50 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center">
                                    Preço Final (Mensal)
                                </p>
                                <p className="text-[10px] text-emerald-600/70 font-bold">Com Impostos (Gross Up)</p>
                            </div>
                            <span className="p-2.5 bg-white shadow-sm text-emerald-600 rounded-xl"><DollarSign size={22} /></span>
                        </div>
                        <p className="text-3xl font-black text-emerald-900 tracking-tight">{formatCurrency(financials.monthlyValue)}</p>
                        <div className="mt-4 pt-3 border-t border-emerald-200/50 flex justify-between items-center text-xs">
                            <span className="text-emerald-700/80 font-bold">Anual:</span>
                            <span className="font-extrabold text-emerald-800 bg-white/60 px-2 py-0.5 rounded-md">{formatCurrency(financials.annualValue)}</span>
                        </div>
                    </div>
                </div>

                {/* Card 2: Contribution Margin */}
                <div className="bg-sky-50/50 p-6 rounded-xl shadow-sm border border-sky-100 relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-sky-200">
                    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                        <BarChart4 className="absolute -bottom-6 -right-6 w-36 h-36 text-sky-100/50 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center focus-within:z-50">
                                    Margem Operacional
                                    <InfoTooltip text="Receita Líquida - Custos Diretos. Mede a eficiência da operação em cobrir os custos variáveis de mão de obra e materiais antes de despesas indiretas." />
                                </div>
                                <p className="text-[10px] text-sky-600/70 font-bold">Margem de Contribuição</p>
                            </div>
                            <span className="p-2.5 bg-white shadow-sm text-sky-600 rounded-xl"><BarChart4 size={22} /></span>
                        </div>
                        <p className="text-3xl font-black text-sky-900 tracking-tight">{formatCurrency(financials.contributionMarginAmount)}</p>
                        <div className="mt-4 pt-3 border-t border-sky-200/50 flex justify-between items-center text-xs">
                            <span className="text-sky-700/80 font-bold">Margem %:</span>
                            <span className="font-extrabold text-sky-800 bg-white/60 px-2 py-0.5 rounded-md">{formatPercent(financials.contributionMarginPercent / 100)}</span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Operating Profit (EBITDA) */}
                <div className="bg-amber-50/50 p-6 rounded-xl shadow-sm border border-amber-100 relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-amber-200">
                    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                        <TrendingUp className="absolute -bottom-6 -right-6 w-36 h-36 text-amber-100/50 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center focus-within:z-50">
                                    Resultado Operacional
                                    <InfoTooltip text="Resultado antes de juros, impostos e depreciação (EBITDA). Mede o potencial de geração de caixa da operação após custos diretos e contingências." />
                                </div>
                                <p className="text-[10px] text-amber-600/70 font-bold">EBITDA (Pré-Financeiro)</p>
                            </div>
                            <span className="p-2.5 bg-white shadow-sm text-amber-600 rounded-xl"><TrendingUp size={22} /></span>
                        </div>
                        <p className="text-3xl font-black text-amber-900 tracking-tight">{formatCurrency(financials.operationalProfitAmount)}</p>
                        <div className="mt-4 pt-3 border-t border-amber-200/50 flex justify-between items-center text-xs">
                            <span className="text-amber-700/80 font-bold">Margem EBITDA:</span>
                            <span className="font-extrabold text-amber-800 bg-white/60 px-2 py-0.5 rounded-md">{formatPercent(financials.operationalMarginPercent / 100)}</span>
                        </div>
                    </div>
                </div>

                {/* Card 4: Net Profit (Bottom Line) */}
                <div className="bg-indigo-50/50 p-6 rounded-xl shadow-sm border border-indigo-100 relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-indigo-200">
                    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                        <PieChart className="absolute -bottom-6 -right-6 w-36 h-36 text-indigo-100/50 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center focus-within:z-50">
                                    Lucro Líquido Real
                                    <InfoTooltip text="Resultado final para o acionista após a dedução de todos os custos, despesas financeiras e impostos de renda (IRPJ/CSLL)." />
                                </div>
                                <p className="text-[10px] text-indigo-600/70 font-bold">Pós-IRPJ/CSLL</p>
                            </div>
                            <span className="p-2.5 bg-white shadow-sm text-indigo-600 rounded-xl"><Calculator size={22} /></span>
                        </div>
                        <p className="text-3xl font-black text-indigo-900 tracking-tight">{formatCurrency(financials.netProfitAmount)}</p>
                        <div className="mt-4 pt-3 border-t border-indigo-200/50 flex justify-between items-center text-xs">
                            <span className="text-indigo-700/80 font-bold">Margem Líquida:</span>
                            <span className="font-extrabold text-indigo-800 bg-white/60 px-2 py-0.5 rounded-md">{formatPercent(financials.netProfitPercent / 100)}</span>
                        </div>
                    </div>
                </div>

                {/* Card 5: Headcount */}
                <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200 relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300">
                    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                        <Users className="absolute -bottom-6 -right-6 w-36 h-36 text-slate-100/50 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Efetivo Acumulado</p>
                                <p className="text-[10px] text-slate-500 font-bold">Total de Vidas</p>
                            </div>
                            <span className="p-2.5 bg-white shadow-sm text-slate-600 rounded-xl"><Users size={22} /></span>
                        </div>
                        <p className="text-3xl font-black text-slate-900 tracking-tight">{totalHeadcount}</p>
                        <div className="mt-4 pt-3 border-t border-slate-200/50 flex justify-between items-center text-xs">
                            <span className="text-slate-600 font-bold">Ticket Médio/Vida:</span>
                            <span className="font-extrabold text-slate-700 bg-white/60 px-2 py-0.5 rounded-md">{totalHeadcount > 0 ? formatCurrency(financials.monthlyValue / totalHeadcount) : 'R$ 0'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Analysis Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Waterfall Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        Composição do Preço (DRE)
                        <InfoTooltip text="Estrutura de formação de preço (Gross Up) demonstrando como cada componente (custos, impostos e lucro) compõe a nota fiscal final." />
                    </h3>

                    <div className="space-y-6">
                        {/* 1. Labor & Ops */}
                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <div className="text-right">
                                    <span className="text-xs font-bold inline-block py-1 px-2 uppercase rounded text-emerald-700 bg-emerald-50 border border-emerald-100">
                                        (-) Custos Diretos (MO + Despesas)
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold inline-block text-emerald-700">
                                        {formatCurrency(financials.totalDirectCost)}
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-hidden h-3 mb-1 text-xs flex rounded-full bg-emerald-50">
                                <div style={{ width: `${(financials.totalDirectCost / financials.monthlyValue) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500"></div>
                            </div>
                        </div>

                        {/* 2. Indirects */}
                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <div className="text-right">
                                    <span className="text-xs font-bold inline-block py-1 px-2 uppercase rounded text-blue-700 bg-blue-50 border border-blue-100">
                                        (-) Custos Indiretos (Risco/Contingência)
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold inline-block text-blue-700">
                                        {formatCurrency(financials.contingencyAmount)}
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-hidden h-3 mb-1 text-xs flex rounded-full bg-blue-50">
                                <div style={{ width: `${(financials.contingencyAmount / financials.monthlyValue) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                            </div>
                        </div>

                        {/* 3. Taxes */}
                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <div className="text-right">
                                    <span className="text-xs font-bold inline-block py-1 px-2 uppercase rounded text-red-700 bg-red-50 border border-red-100">
                                        (-) Impostos s/ Venda
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold inline-block text-red-700">
                                        {formatCurrency(financials.salesTaxAmount)}
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-hidden h-3 mb-1 text-xs flex rounded-full bg-red-50">
                                <div style={{ width: `${(financials.salesTaxAmount / financials.monthlyValue) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500"></div>
                            </div>
                        </div>

                        {/* 4. Profit */}
                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <div className="text-right">
                                    <span className="text-xs font-bold inline-block py-1 px-2 uppercase rounded text-amber-700 bg-amber-50 border border-amber-100">
                                        = Resultado Operacional (EBITDA)
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold inline-block text-amber-700">
                                        {formatCurrency(financials.operationalProfitAmount)}
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-hidden h-3 mb-1 text-xs flex rounded-full bg-amber-50">
                                <div style={{ width: `${(financials.operationalProfitAmount / financials.monthlyValue) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#fbbf24]"></div>
                            </div>
                            <div className="flex justify-end mt-1">
                                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                    Deste valor, <strong>{formatCurrency(financials.financialCostAmount)}</strong> vai p/ Financeiro e <strong>{formatCurrency(financials.incomeTaxAmount)}</strong> p/ IR.
                                </span>
                            </div>
                        </div>

                        {/* VISUAL DIVIDER: TOTAL */}
                        <div className="relative py-2 mt-4">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    = Soma dos Componentes
                                </span>
                            </div>
                        </div>

                        {/* TOTAL FINAL LINE */}
                        <div className="bg-[#0f172a] rounded-xl p-4 flex justify-between items-center shadow-lg shadow-slate-900/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-lg text-[#fbbf24]">
                                    <DollarSign size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Preço Final (Revenue)</p>
                                    <p className="text-[10px] text-slate-500 font-medium">100% da Composição</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black text-white tracking-tight">
                                    {formatCurrency(financials.monthlyValue)}
                                </span>
                            </div>
                        </div>

                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <AlertCircle size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                <strong>Nota Técnica:</strong> No Regime <em>{data.taxConfig.regime} / {data.taxConfig.calculationMode === 'NORMATIVE' ? 'Normativo' : 'Comercial'}</em>,
                                o IRPJ e a CSLL são tratados como dedução do lucro {data.taxConfig.calculationMode === 'NORMATIVE' ? 'e não compõem a base de custo do preço de venda' : 'mas foram embutidos no preço (Gross Up) para garantir a margem líquida'}.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tax Info Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800">Parâmetros Fiscais</h3>
                        <button onClick={() => setActiveTab('taxes')} className="text-xs font-bold text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded">
                            Editar
                        </button>
                    </div>

                    <div className="bg-[#0f172a] text-white p-5 rounded-xl mb-6 shadow-md relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-[10px] opacity-70 uppercase font-bold tracking-wider mb-1">Regime Ativo</p>
                            <p className="text-xl font-bold">{data.taxConfig.regime}</p>
                            <div className="mt-3 text-[10px] font-bold bg-white/10 px-2 py-1 rounded inline-flex items-center gap-1">
                                {data.taxConfig.calculationMode === 'NORMATIVE' ? 'Modo Normativo (Padrão)' : 'Modo Comercial (Simulação)'}
                            </div>
                        </div>
                        <Briefcase className="absolute right-4 bottom-4 text-white/10" size={64} />
                    </div>

                    <div className="space-y-4 flex-1">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <span className="text-xs font-bold text-slate-500 uppercase flex items-center">
                                Gross Up Venda
                                <InfoTooltip text="Soma dos impostos indiretos (PIS/COFINS/ISS) e taxas financeiras aplicadas sobre o faturamento bruto para atingir o valor líquido desejado." />
                            </span>
                            <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded text-sm">
                                {formatPercent(
                                    data.taxConfig.salesTaxes
                                        .filter(t => t.active)
                                        .reduce((acc, t) => acc + (t.id === 'iss' && financials.effectiveIssRate !== undefined ? financials.effectiveIssRate : t.rate), 0)
                                    + (data.taxConfig.calculationMode === 'COMMERCIAL' ?
                                        data.taxConfig.incomeTaxes.filter(t => t.active).reduce((acc, t) => acc + t.rate, 0) : 0)
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <span className="text-xs font-bold text-slate-500 uppercase">Encargos Folha</span>
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-sm">{formatPercent(data.taxConfig.socialChargesRate)}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-500 uppercase flex items-center">
                                Markup Target
                                <InfoTooltip text="Percentual aplicado sobre o custo base para cobrir lucro e encargos indiretos (BDI). Define o alvo de rentabilidade da proposta." />
                            </span>
                            <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-sm">{formatPercent(data.markup)}</span>
                        </div>

                        {/* Managerial Tax Burden Section */}
                        <div className="pt-2">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1">
                                    <Landmark size={14} className="text-slate-400" /> Carga Total
                                    <InfoTooltip text="Soma total de todos os tributos incidentes (Venda + Renda) em relação ao faturamento unitário. Representa a fatia real do Estado sobre a operação." />
                                </span>
                                <span className="text-sm font-black text-slate-800">{formatPercent(effectiveTaxBurden)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                                <span>Venda + Renda</span>
                                <span>{formatCurrency(totalTaxAmount)}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                                <div className="bg-slate-800 h-full" style={{ width: `${effectiveTaxBurden * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Break-even Analysis Card */}
            <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-blue-600" />
                    Análise do Ponto de Equilíbrio (Break-even)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Preço Mínimo (Equilíbrio)</p>
                        <p className="text-xl font-black text-slate-900">
                            {formatCurrency(financials.monthlyValue - (financials.netProfitAmount / (1 - effectiveTaxBurden)))}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 italic">Preço para Lucro Zero</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Margem de Segurança</p>
                        <p className={`text-xl font-black ${financials.netProfitAmount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatPercent(financials.monthlyValue > 0 ? financials.netProfitAmount / financials.monthlyValue : 0)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Sua folga atual sobre a venda</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Status de Viabilidade</p>
                        <div className="flex items-center gap-2 mt-1">
                            {isNpvViable && isIrrViable ? (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Altamente Viável</span>
                            ) : isProfitViable ? (
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase">Atenção Necessária</span>
                            ) : (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">Inviável</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    const renderFeasibility = () => {
        const indicators = projections.indicators;
        const isViable = indicators.npv > 0;

        return (
            <div className="space-y-8">
                {/* Feasibility Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* NPV - VPL */}
                    <div className={`p-6 rounded-xl border relative overflow-hidden group ${isViable ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex justify-between items-start mb-2 relative z-10">
                            <div>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${isViable ? 'text-emerald-700' : 'text-red-700'}`}>VPL (Net Present Value)</p>
                                <p className="text-[10px] opacity-70">Valor Presente Líquido</p>
                            </div>
                            <div className={`p-2 rounded-lg ${isViable ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                <Activity size={20} />
                            </div>
                        </div>
                        <h3 className={`text-3xl font-black relative z-10 ${isViable ? 'text-emerald-800' : 'text-red-800'}`}>{formatCurrency(indicators.npv)}</h3>
                        <p className="text-[10px] mt-2 font-medium opacity-70 relative z-10">
                            {isViable ? 'Projeto cria valor econômico.' : 'Projeto destrói valor. Revisar margens.'}
                        </p>
                    </div>

                    {/* TIR - IRR */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TIR (IRR) Estimada</p>
                                <p className="text-[10px] text-slate-400">Taxa Interna de Retorno</p>
                            </div>
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><TrendingUp size={20} /></div>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800">{formatPercent(indicators.irr)}</h3>
                        <div className="mt-2 text-[10px] flex items-center gap-1">
                            <span className="text-slate-400">WACC / TMA:</span>
                            <span className="font-bold text-slate-700">{formatPercent(data.wacc || 0.12)}</span>
                            {indicators.irr > (data.wacc || 0.12) ?
                                <span className="text-emerald-600 font-bold ml-1">(Supera Custo)</span> :
                                <span className="text-red-500 font-bold ml-1">(Abaixo do Custo)</span>
                            }
                        </div>
                    </div>

                    {/* Payback */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payback Simples</p>
                                <p className="text-[10px] text-slate-400">Tempo de Retorno</p>
                            </div>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><CalendarDays size={20} /></div>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800">{indicators.paybackMonth} <span className="text-sm font-bold text-slate-400">meses</span></h3>
                        <p className="text-[10px] mt-2 text-slate-400">
                            Mês em que o caixa acumulado zera.
                        </p>
                    </div>

                    {/* Max Exposure */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Exposição de Caixa</p>
                                <p className="text-[10px] text-slate-400">Necessidade Máxima</p>
                            </div>
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Coins size={20} /></div>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800">{formatCurrency(indicators.totalInvestment)}</h3>
                        <p className="text-[10px] mt-2 text-slate-400">
                            Capital de giro máximo necessário.
                        </p>
                    </div>
                </div>

                {/* Cash Flow Evolution */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <BarChart3 size={20} className="text-[#0f172a]" />
                        Evolução do Fluxo de Caixa Acumulado
                    </h3>
                    <div className="h-64 flex items-end gap-2 relative border-b border-slate-200">
                        <div className="absolute w-full border-t border-dashed border-slate-300 bottom-[50%] left-0 z-0"></div>
                        {projections.timeline.map((month) => {
                            const maxVal = Math.max(Math.abs(indicators.totalInvestment), Math.abs(projections.timeline[projections.timeline.length - 1].cashFlow.cumulativeCash));
                            const range = maxVal * 1.2; // 20% buffer
                            const heightPercent = (month.cashFlow.cumulativeCash / range) * 50; // Scale relative to 50% center line

                            return (
                                <div key={month.monthIndex} className="flex-1 flex flex-col justify-end relative group h-full">
                                    {/* Tooltip */}
                                    <div className="absolute bottom-1/2 mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap shadow-xl">
                                        <p className="font-bold">{month.label} ({month.date})</p>
                                        <p>Acum: {formatCurrency(month.cashFlow.cumulativeCash)}</p>
                                        <p>Mensal: {formatCurrency(month.cashFlow.netCash)}</p>
                                    </div>

                                    <div className="w-full relative h-full">
                                        {/* Bar */}
                                        <div
                                            className={`absolute left-1 right-1 rounded-sm transition-all opacity-80 hover:opacity-100 ${month.cashFlow.cumulativeCash >= 0 ? 'bg-emerald-500' : 'bg-red-400'}`}
                                            style={{
                                                bottom: month.cashFlow.cumulativeCash >= 0 ? '50%' : `calc(50% + ${heightPercent}%)`,
                                                height: `${Math.abs(heightPercent)}%`
                                            }}
                                        ></div>
                                    </div>

                                    <p className="text-[9px] text-slate-400 text-center mt-2 border-t border-slate-100 pt-1 truncate w-full">{month.label}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderCashFlow = () => (
        <div className="space-y-8">
            {/* Chart / Visual Representation */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-x-auto">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <BarChart3 size={20} className="text-[#0f172a]" />
                    Fluxo de Caixa Mensal (Entradas vs Saídas)
                </h3>
                <div className="min-w-[800px] h-64 flex items-end gap-3 relative">
                    {projections.timeline.map((month) => {
                        const maxVal = Math.max(...projections.timeline.map(m => Math.max(m.cashFlow.inflow, m.cashFlow.totalOutflow)));
                        const inHeight = (month.cashFlow.inflow / maxVal) * 80;
                        const outHeight = (month.cashFlow.totalOutflow / maxVal) * 80;

                        return (
                            <div key={month.monthIndex} className="flex-1 flex flex-col justify-end items-center relative group h-full">
                                <div className="flex gap-1 w-full justify-center items-end h-full pb-6">
                                    {/* Inflow Bar */}
                                    <div style={{ height: `${inHeight}%` }} className="w-3 bg-emerald-400 rounded-t-sm relative"></div>
                                    {/* Outflow Bar */}
                                    <div style={{ height: `${outHeight}%` }} className="w-3 bg-red-400 rounded-t-sm relative"></div>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium absolute bottom-0 w-full text-center border-t border-slate-100 pt-1">{month.label}</p>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                            <tr>
                                <th className="px-4 py-3 text-left w-32 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Mês / Data</th>
                                {projections.timeline.map(m => (
                                    <th key={m.monthIndex} className="px-3 py-3 min-w-[100px]">
                                        <div>{m.label}</div>
                                        <div className="text-[9px] text-slate-400 font-normal">{m.date}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr>
                                <td className="px-4 py-3 text-left font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-100">Entradas (Cash In)</td>
                                {projections.timeline.map(m => <td key={m.monthIndex} className="px-3 py-3 text-emerald-600 font-medium">{formatCurrency(m.cashFlow.inflow)}</td>)}
                            </tr>
                            <tr className="bg-slate-50/30">
                                <td className="px-4 py-3 text-left font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r border-slate-100">(-) Pagto Salários</td>
                                {projections.timeline.map(m => <td key={m.monthIndex} className="px-3 py-3 text-red-400">({formatCurrency(m.cashFlow.outflowLabor)})</td>)}
                            </tr>
                            <tr className="bg-slate-50/30">
                                <td className="px-4 py-3 text-left font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r border-slate-100">(-) Pagto Impostos</td>
                                {projections.timeline.map(m => <td key={m.monthIndex} className="px-3 py-3 text-red-400">({formatCurrency(m.cashFlow.outflowTaxes)})</td>)}
                            </tr>
                            <tr className="bg-slate-50/30">
                                <td className="px-4 py-3 text-left font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 border-r border-slate-100">(-) Pagto Fornecedores</td>
                                {projections.timeline.map(m => <td key={m.monthIndex} className="px-3 py-3 text-red-400">({formatCurrency(m.cashFlow.outflowSuppliers)})</td>)}
                            </tr>
                            <tr className="bg-slate-50/50">
                                <td className="px-4 py-3 text-left font-bold text-slate-800 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Saldo Mensal</td>
                                {projections.timeline.map(m => <td key={m.monthIndex} className={`px-3 py-3 font-bold ${m.cashFlow.netCash >= 0 ? 'text-slate-700' : 'text-red-600'}`}>{formatCurrency(m.cashFlow.netCash)}</td>)}
                            </tr>
                            <tr className="bg-[#0f172a] text-white">
                                <td className="px-4 py-3 text-left font-bold sticky left-0 bg-[#0f172a] z-10 border-r border-slate-600">Acumulado</td>
                                {projections.timeline.map(m => <td key={m.monthIndex} className={`px-3 py-3 font-bold ${m.cashFlow.cumulativeCash >= 0 ? 'text-emerald-400' : 'text-red-300'}`}>{formatCurrency(m.cashFlow.cumulativeCash)}</td>)}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderDRE = () => {
        // Get account codes from config or defaults
        const accMap = data.accountingConfig || {
            revenueAccount: { code: '3.1.01', name: 'Receita Bruta' },
            deductionTaxesAccount: { code: '3.2.01', name: 'Impostos s/ Venda' },
            operationalCostsAccount: { code: '4.2.01', name: 'Custos Operacionais' },
            // ... (defaults provided in GlobalSettings if missing)
        };

        return (
            <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                    <BookOpen size={20} className="text-blue-600 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-blue-800 text-sm">Visão de Competência (DRE Projetado)</h4>
                        <p className="text-xs text-blue-600 mt-1">
                            Este relatório reflete o fato gerador das receitas e despesas, conforme o Plano de Contas configurado.
                            Diferente do Fluxo de Caixa, aqui as receitas são reconhecidas no mês do serviço, independente do recebimento.
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-right whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-left w-24 sticky left-0 bg-slate-50 z-20 border-r border-slate-200">Conta</th>
                                    <th className="px-4 py-3 text-left w-48 sticky left-24 bg-slate-50 z-20 border-r border-slate-200">Descrição</th>
                                    {projections.timeline.map(m => (
                                        <th key={m.monthIndex} className="px-3 py-3 min-w-[100px]">{m.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {/* REVENUE */}
                                <tr>
                                    <td className="px-4 py-2 text-left font-mono text-slate-500 sticky left-0 bg-white z-10 border-r border-slate-100">{accMap.revenueAccount?.code || '3.1.01'}</td>
                                    <td className="px-4 py-2 text-left font-bold text-slate-700 sticky left-24 bg-white z-10 border-r border-slate-100">Receita Bruta</td>
                                    {projections.timeline.map(m => <td key={m.monthIndex} className="px-3 py-2 text-slate-700">{formatCurrency(m.dre.grossRevenue)}</td>)}
                                </tr>
                                <tr>
                                    <td className="px-4 py-2 text-left font-mono text-slate-500 sticky left-0 bg-white z-10 border-r border-slate-100">{accMap.deductionTaxesAccount?.code || '3.2.01'}</td>
                                    <td className="px-4 py-2 text-left text-slate-600 sticky left-24 bg-white z-10 border-r border-slate-100">(-) Impostos s/ Venda</td>
                                    {projections.timeline.map(m => <td key={m.monthIndex} className="px-3 py-2 text-red-500">({formatCurrency(m.dre.deductionTaxes)})</td>)}
                                </tr>
                                <tr className="bg-slate-50 font-bold">
                                    <td className="px-4 py-2 text-left sticky left-0 bg-slate-50 z-10 border-r border-slate-200"></td>
                                    <td className="px-4 py-2 text-left sticky left-24 bg-slate-50 z-10 border-r border-slate-200">= Receita Líquida</td>
                                    {projections.timeline.map(m => <td key={m.monthIndex} className="px-3 py-2 text-slate-800">{formatCurrency(m.dre.netRevenue)}</td>)}
                                </tr>

                                {/* COSTS */}
                                <tr>
                                    <td className="px-4 py-2 text-left font-mono text-slate-500 sticky left-0 bg-white z-10 border-r border-slate-100">{accMap.directLaborAccount?.code || '4.1.01'}</td>
                                    <td className="px-4 py-2 text-left text-slate-600 sticky left-24 bg-white z-10 border-r border-slate-100">(-) Mão de Obra</td>
                                    {projections.timeline.map(m => <td key={m.monthIndex} className="px-3 py-2 text-red-500">({formatCurrency(m.dre.directLabor)})</td>)}
                                </tr>
                                <tr>
                                    <td className="px-4 py-2 text-left font-mono text-slate-500 sticky left-0 bg-white z-10 border-r border-slate-100">{accMap.operationalCostsAccount?.code || '4.2.01'}</td>
                                    <td className="px-4 py-2 text-left text-slate-600 sticky left-24 bg-white z-10 border-r border-slate-100">(-) Custos Operacionais</td>
                                    {projections.timeline.map(m => <td key={m.monthIndex} className="px-3 py-2 text-red-500">({formatCurrency(m.dre.operationalCosts)})</td>)}
                                </tr>
                                <tr className="bg-slate-50 font-bold">
                                    <td className="px-4 py-2 text-left sticky left-0 bg-slate-50 z-10 border-r border-slate-200"></td>
                                    <td className="px-4 py-2 text-left sticky left-24 bg-slate-50 z-10 border-r border-slate-200">= Lucro Bruto</td>
                                    {projections.timeline.map(m => <td key={m.monthIndex} className="px-3 py-2 text-slate-800">{formatCurrency(m.dre.grossProfit)}</td>)}
                                </tr>

                                {/* EXPENSES */}
                                <tr>
                                    <td className="px-4 py-2 text-left font-mono text-slate-500 sticky left-0 bg-white z-10 border-r border-slate-100">{accMap.supportCostsAccount?.code || '4.3.01'}</td>
                                    <td className="px-4 py-2 text-left text-slate-600 sticky left-24 bg-white z-10 border-r border-slate-100">(-) Overhead / Gestão</td>
                                    {projections.timeline.map(m => <td key={m.monthIndex} className="px-3 py-2 text-red-500">({formatCurrency(m.dre.supportCosts)})</td>)}
                                </tr>
                                <tr className="bg-indigo-50 font-bold">
                                    <td className="px-4 py-2 text-left sticky left-0 bg-indigo-50 z-10 border-r border-indigo-100"></td>
                                    <td className="px-4 py-2 text-left text-indigo-800 sticky left-24 bg-indigo-50 z-10 border-r border-indigo-100">= EBITDA</td>
                                    {projections.timeline.map(m => <td key={m.monthIndex} className="px-3 py-2 text-indigo-700">{formatCurrency(m.dre.ebitda)}</td>)}
                                </tr>

                                {/* FINANCIAL */}
                                <tr>
                                    <td className="px-4 py-2 text-left font-mono text-slate-500 sticky left-0 bg-white z-10 border-r border-slate-100">{accMap.financialResultAccount?.code || '5.1.01'}</td>
                                    <td className="px-4 py-2 text-left text-slate-600 sticky left-24 bg-white z-10 border-r border-slate-100">Result. Financeiro</td>
                                    {projections.timeline.map(m => <td key={m.monthIndex} className="px-3 py-2 text-slate-600">{formatCurrency(m.dre.financialResult)}</td>)}
                                </tr>

                                {/* NET */}
                                <tr className="bg-[#0f172a] text-white font-bold text-sm">
                                    <td className="px-4 py-3 text-left sticky left-0 bg-[#0f172a] z-10 border-r border-slate-600"></td>
                                    <td className="px-4 py-3 text-left sticky left-24 bg-[#0f172a] z-10 border-r border-slate-600">= Lucro Líquido</td>
                                    {projections.timeline.map(m => <td key={m.monthIndex} className={`px-3 py-3 ${m.dre.netIncome >= 0 ? 'text-emerald-400' : 'text-red-300'}`}>{formatCurrency(m.dre.netIncome)}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                        <PieChart size={28} className="text-[#0f172a]" />
                        Dashboard Financeiro
                    </h2>
                    <div className="flex flex-col gap-2 mt-1">
                        <div className="flex items-center gap-2">
                            <p className="text-slate-500 font-medium">Análise de viabilidade: {data.clientName} (#{data.proposalId})</p>

                            {/* VERSION SELECTOR */}
                            {allVersions.length > 0 && onSelectVersion && (
                                <div className="relative group ml-2">
                                    <select
                                        className="appearance-none bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold py-1 pl-2 pr-6 rounded-md shadow-sm outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/50"
                                        value={data.id}
                                        onChange={(e) => onSelectVersion(e.target.value)}
                                    >
                                        {allVersions.map(v => (
                                            <option key={v.id} value={v.id}>
                                                v{v.version} {v.isCurrentVersion ? '(Atual)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-700">
                                        <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-1 ml-2">
                                {getStatusBadge()}
                                {getMotionBadge()}
                            </div>
                        </div>

                        {/* Status Management Bar */}
                        {data.isCurrentVersion && onUpdateVersionStatus && (
                            <div className="flex items-center gap-2 mt-2">
                                {data.versionStatus === 'DRAFT' && (
                                    <button onClick={handleSubmitProposal} className="text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 uppercase tracking-wider">Submeter Cotação</button>
                                )}

                                {data.versionStatus === 'SUBMITTED' && data.approvalStatus === 'PENDING' && (
                                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-1.5 rounded-lg">
                                        <span className="text-[10px] font-bold px-2 text-amber-800 uppercase tracking-wider flex items-center gap-1">
                                            <AlertCircle size={12} /> Aguardando Aprovação (Margem)
                                        </span>
                                        {currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN' ? (
                                            <>
                                                <button onClick={() => handleManagerDecision('APPROVED')} className="text-[10px] font-bold px-2 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 shadow-sm uppercase tracking-wider">Aprovar Margem</button>
                                                <button onClick={() => handleManagerDecision('REJECTED')} className="text-[10px] font-bold px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 shadow-sm uppercase tracking-wider">Rejeitar</button>
                                            </>
                                        ) : (
                                            <span className="text-[10px] px-2 py-1 text-amber-700/70 italic">Ação restrita ao Gestor</span>
                                        )}
                                    </div>
                                )}

                                {data.versionStatus === 'SUBMITTED' && data.approvalStatus !== 'PENDING' && (
                                    <>
                                        <span className="text-[10px] font-bold px-2 py-1 bg-blue-500 text-white rounded uppercase tracking-wider">Versão Submetida</span>
                                        <button onClick={() => onUpdateVersionStatus(data.id, 'APPROVED')} className="text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 uppercase tracking-wider">Aprovação do Cliente</button>
                                        <button onClick={() => onUpdateVersionStatus(data.id, 'REJECTED')} className="text-[10px] font-bold px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 uppercase tracking-wider">Rejeição do Cliente</button>
                                    </>
                                )}

                                {data.versionStatus === 'APPROVED' && (
                                    <span className="text-[10px] font-bold px-2 py-1 bg-emerald-500 text-white rounded uppercase tracking-wider">
                                        {data.approvalStatus === 'APPROVED' ? 'Aprovado (Gestor & Cliente)' : 'Aprovado (Cliente)'}
                                    </span>
                                )}
                                {data.versionStatus === 'REJECTED' && (
                                    <span className="text-[10px] font-bold px-2 py-1 bg-red-500 text-white rounded uppercase tracking-wider">Versão Rejeitada</span>
                                )}
                            </div>
                        )}
                        {!data.isCurrentVersion && (
                            <div className="mt-2 text-[10px] font-bold px-2 py-1 bg-slate-200 text-slate-500 rounded uppercase tracking-wider self-start">
                                Modo de Visualização: Histórico (Leitura Apenas)
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveView('summary')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeView === 'summary' ? 'bg-white shadow text-[#0f172a]' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Resumo Executivo
                    </button>
                    <button
                        onClick={() => setActiveView('cashflow')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeView === 'cashflow' ? 'bg-white shadow text-[#0f172a]' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Fluxo de Caixa
                    </button>
                    <button
                        onClick={() => setActiveView('dre')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeView === 'dre' ? 'bg-white shadow text-[#0f172a]' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        DRE / Orçamento
                    </button>
                    <button
                        onClick={() => setActiveView('feasibility')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeView === 'feasibility' ? 'bg-white shadow text-[#0f172a]' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Viabilidade Econômica
                    </button>

                    {onSaveVersion && (
                        <button
                            onClick={() => setIsDiffModalOpen(true)}
                            className="ml-4 px-4 py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-md text-sm font-bold shadow-md transition-all flex items-center gap-2"
                        >
                            <Copy size={16} />
                            Salvar Versionando
                        </button>
                    )}
                </div>
            </header>

            {/* Dynamic Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {renderHealthCheck()}
                {activeView === 'summary' && renderSummary()}
                {activeView === 'cashflow' && renderCashFlow()}
                {activeView === 'dre' && renderDRE()}
                {activeView === 'feasibility' && renderFeasibility()}
            </div>

            {/* VERSION DIFF MODAL */}
            {isDiffModalOpen && initialSnapshot && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Formalizar Nova Versão</h3>
                                <p className="text-sm text-slate-500 mt-1">A versão atual será salva no histórico e uma nova versão (v{initialSnapshot.version + 1}) será criada.</p>
                            </div>
                            <button onClick={() => setIsDiffModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Activity size={18} className="text-indigo-500" /> Resumo das Alterações
                            </h4>

                            <div className="space-y-3">
                                {/* Compare Vidas */}
                                {(() => {
                                    const oldVidas = initialSnapshot.roles.reduce((a, r) => a + r.quantity, 0);
                                    const newVidas = totalHeadcount;
                                    if (oldVidas !== newVidas) {
                                        return (
                                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <span className="text-sm font-medium text-slate-600">Total de Vidas</span>
                                                <div className="flex items-center gap-2 text-sm font-bold">
                                                    <span className="text-slate-400 line-through">{oldVidas}</span>
                                                    <ArrowRight size={14} className="text-slate-400" />
                                                    <span className={newVidas > oldVidas ? 'text-emerald-600' : 'text-red-500'}>{newVidas}</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Compare Margin */}
                                {(() => {
                                    const oldMargin = initialSnapshot.targetMargin;
                                    const newMargin = data.targetMargin;
                                    if (oldMargin !== newMargin) {
                                        return (
                                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <span className="text-sm font-medium text-slate-600">Margem Meta (Target)</span>
                                                <div className="flex items-center gap-2 text-sm font-bold">
                                                    <span className="text-slate-400 line-through">{formatPercent(oldMargin)}</span>
                                                    <ArrowRight size={14} className="text-slate-400" />
                                                    <span className={newMargin > oldMargin ? 'text-emerald-600' : 'text-red-500'}>{formatPercent(newMargin)}</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Compare Revenue */}
                                {(() => {
                                    const oldRevenue = calculateFinancials(initialSnapshot).monthlyValue;
                                    const newRevenue = financials.monthlyValue;
                                    if (Math.abs(oldRevenue - newRevenue) > 1) { // 1 to handle minor floats
                                        return (
                                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <span className="text-sm font-medium text-slate-600">Preço Final (Mensal)</span>
                                                <div className="flex items-center gap-2 text-sm font-bold">
                                                    <span className="text-slate-400 line-through">{formatCurrency(oldRevenue)}</span>
                                                    <ArrowRight size={14} className="text-slate-400" />
                                                    <span className={newRevenue > oldRevenue ? 'text-emerald-600' : 'text-red-500'}>{formatCurrency(newRevenue)}</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            <div className="mt-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Notas da Versão</label>
                                <textarea
                                    className="w-full text-sm rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                                    rows={3}
                                    placeholder="Descreva brevemente o motivo desta nova versão (ex: 'Ajuste de margem após negociação')"
                                    value={versionNotes}
                                    onChange={(e) => setVersionNotes(e.target.value)}
                                ></textarea>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setIsDiffModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveVersion}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 text-white rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2"
                            >
                                <CheckCircle size={16} />
                                Confirmar Versão {initialSnapshot.version + 1}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Dashboard;
