
import React, { useState, useRef, useEffect } from 'react';
import { ProposalData } from '../types';
import { calculateFinancials, formatCurrency, formatPercent, ExtendedFinancials } from '../utils/pricingEngine';
import { Settings, Save, TrendingUp, Layers, AlertCircle, Download, FileSpreadsheet, ChevronDown, Printer, ShieldAlert, BarChart4, DollarSign, Copy, X } from 'lucide-react';
import InfoTooltip from '../components/InfoTooltip';

interface PricingProps {
    data: ProposalData;
    updateData: (newData: Partial<ProposalData>) => void;
    onCreateNewVersion?: (id: string, notes?: string) => void;
}

const Pricing: React.FC<PricingProps> = ({ data, updateData, onCreateNewVersion }) => {
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
    const [tempNotes, setTempNotes] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);

    const financials = calculateFinancials(data) as ExtendedFinancials;
    const isLocked = ['Won', 'Lost'].includes(data.stage) || data.status === 'Archived' || data.versionStatus !== 'DRAFT';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeSalesRate = data.taxConfig.salesTaxes.filter(t => t.active).reduce((acc, t) => acc + t.rate, 0);
    const activeIncomeRate = data.taxConfig.incomeTaxes.filter(t => t.active).reduce((acc, t) => acc + t.rate, 0);

    const displayTaxRate = data.taxConfig.calculationMode === 'COMMERCIAL'
        ? activeSalesRate + activeIncomeRate
        : activeSalesRate;

    const updateMarkup = (value: string) => {
        updateData({ markup: (parseFloat(value) || 0) / 100 });
    };

    const updateMargin = (value: string) => {
        updateData({ targetMargin: (parseFloat(value) || 0) / 100 });
    };

    const isMarginModel = data.pricingModel === 'MARGIN';

    const handlePrintPDF = () => {
        setIsExportMenuOpen(false);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const handleExportCSV = () => {
        setIsExportMenuOpen(false);

        const rows = [];
        rows.push(['DEMONSTRATIVO DE RESULTADO (DRE)', data.clientName]);
        rows.push(['ID Proposta', data.proposalId]);
        rows.push(['Data', new Date().toLocaleDateString('pt-BR')]);
        rows.push([]);

        rows.push(['Descrição', 'Valor Mensal', '% da Receita']);
        rows.push(['Faturamento Bruto', financials.monthlyValue.toFixed(2), '100%']);
        rows.push(['(-) Impostos s/ Venda', financials.salesTaxAmount.toFixed(2), formatPercent(financials.salesTaxAmount / financials.monthlyValue)]);
        rows.push(['= Receita Líquida', financials.netRevenue.toFixed(2), formatPercent(financials.netRevenue / financials.monthlyValue)]);
        rows.push(['(-) Custos Diretos', financials.totalDirectCost.toFixed(2), formatPercent(financials.totalDirectCost / financials.monthlyValue)]);
        rows.push(['= Margem Operacional', financials.contributionMarginAmount.toFixed(2), formatPercent(financials.contributionMarginPercent / 100)]);
        rows.push(['(-) Custos Indiretos/Risco', financials.contingencyAmount.toFixed(2), formatPercent(financials.contingencyAmount / financials.monthlyValue)]);
        rows.push(['= Resultado Operacional', financials.operationalProfitAmount.toFixed(2), formatPercent(financials.operationalMarginPercent / 100)]);
        rows.push(['(-) Financeiro', financials.financialCostAmount.toFixed(2), formatPercent(financials.financialCostAmount / financials.monthlyValue)]);
        rows.push(['(-) Impostos s/ Renda', financials.incomeTaxAmount.toFixed(2), formatPercent(financials.incomeTaxAmount / financials.monthlyValue)]);
        rows.push(['= Resultado Líquido', financials.netProfitAmount.toFixed(2), formatPercent(financials.netProfitPercent / 100)]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + rows.map(e => e.join(";")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `DRE_Proposta_${data.clientName}_${data.proposalId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto print:p-0 print:max-w-none print:w-full">
            <header className="flex justify-between items-end border-b border-slate-200 pb-6 print:hidden">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Precificação (DRE)</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors">Demonstrativo de Resultado e Formação do Preço.</p>
                </div>
                <div className="flex gap-3 relative" ref={menuRef}>
                    <div className="relative">
                        <button
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 shadow-sm"
                        >
                            <Download size={18} />
                            Exportar
                            <ChevronDown size={14} className={`ml-1 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isExportMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 print:hidden transition-colors">
                                <button
                                    onClick={handlePrintPDF}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 text-slate-700 dark:text-slate-200 border-b border-slate-50 dark:border-slate-800 transition-colors"
                                >
                                    <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"><Printer size={16} /></div>
                                    <div>
                                        <span className="block text-sm font-bold">Relatório PDF</span>
                                        <span className="block text-[10px] text-slate-400 dark:text-slate-500">Layout de impressão</span>
                                    </div>
                                </button>
                                <button
                                    onClick={handleExportCSV}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"><FileSpreadsheet size={16} /></div>
                                    <div>
                                        <span className="block text-sm font-bold">Planilha Excel</span>
                                        <span className="block text-[10px] text-slate-400 dark:text-slate-500">Dados em CSV</span>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        disabled={isLocked}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] dark:bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-[#1e293b] dark:hover:bg-indigo-700 shadow-lg shadow-slate-900/10 dark:shadow-indigo-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={18} /> Salvar Proposta
                    </button>
                </div>
            </header>

            {isLocked && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between gap-3 print:hidden transition-colors">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="text-amber-600 dark:text-amber-400" size={24} />
                        <div>
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                                Proposta Bloqueada para Edição
                                {data.versionStatus !== 'DRAFT'
                                    ? ` (Versão ${data.versionStatus})`
                                    : ` (${data.status === 'Archived' ? 'Arquivado' : data.stage})`
                                }
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-400/80">
                                {data.versionStatus !== 'DRAFT'
                                    ? `Esta é a versão V${data.version}. Para realizar alterações, você precisa criar uma nova versão ou um aditivo.`
                                    : `A edição está bloqueada por conta do estágio/status atual da oportunidade.`
                                }
                            </p>
                        </div>
                    </div>

                    {/* CTA explicitly for unlocking versions */}
                    {data.versionStatus !== 'DRAFT' && data.isCurrentVersion && onCreateNewVersion && (
                        <button
                            onClick={() => setIsNewVersionModalOpen(true)}
                            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-600 dark:bg-amber-700 text-white rounded-lg font-bold text-sm hover:bg-amber-700 dark:hover:bg-amber-600 transition-colors shadow-sm"
                        >
                            <Copy size={16} />
                            Criar Nova Versão (V{data.version + 1})
                        </button>
                    )}
                </div>
            )}

            {/* MODAL PARA NOVA VERSÃO */}
            {isNewVersionModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 transition-colors">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 transition-colors">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Formalizar Nova Versão</h3>
                            <button onClick={() => setIsNewVersionModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 transition-colors">
                                Descreva o motivo desta nova versão opcionalmente. Isso ajudará no rastreio do histórico de negociação.
                            </p>
                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 transition-colors">Notas da Versão</label>
                            <textarea
                                autoFocus
                                value={tempNotes}
                                onChange={(e) => setTempNotes(e.target.value)}
                                placeholder="Ex: Ajuste de margem conforme solicitação do cliente..."
                                className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 underline-none outline-none transition-all resize-none"
                            />
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-3 transition-colors">
                            <button
                                onClick={() => setIsNewVersionModalOpen(false)}
                                className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (onCreateNewVersion) {
                                        onCreateNewVersion(data.id, tempNotes);
                                        setIsNewVersionModalOpen(false);
                                        setTempNotes("");
                                    }
                                }}
                                className="flex-1 px-4 py-2.5 text-sm font-bold bg-amber-600 text-white rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                Criar Versão v{data.version + 1}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header visible only on print */}
            <div className="hidden print:block mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Demonstrativo de Formação de Preço (DRE)</h1>
                <div className="flex justify-between mt-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Cliente: <strong>{data.clientName}</strong></p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Proposta: <strong>#{data.proposalId}</strong></p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">

                {/* Left Column: Configuration (4 cols) */}
                <div className="lg:col-span-4 space-y-6 print:hidden transition-colors">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6 transition-colors">
                            <Settings size={20} className="text-slate-400 dark:text-slate-500" />
                            Definição de Lucro
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className={`block text-xs font-bold uppercase mb-3 ${isMarginModel ? 'text-blue-600' : 'text-emerald-600'}`}>
                                    {isMarginModel ? 'Margem Alvo (Sobre Venda)' : 'Markup (Sobre Custo)'}
                                    <InfoTooltip text="Percentual de ganho aplicado sobre a base de cálculo. O Markup recai sobre o custo, enquanto a Margem é calculada sobre o preço de venda final." />
                                </label>
                                <div className="relative group">
                                    {isMarginModel ? (
                                        <input
                                            type="number"
                                            disabled={isLocked}
                                            value={((data.targetMargin || 0) * 100).toFixed(2)}
                                            onChange={(e) => updateMargin(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-xl py-4 pl-4 pr-12 text-right font-bold text-2xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900"
                                        />
                                    ) : (
                                        <input
                                            type="number"
                                            disabled={isLocked}
                                            value={(data.markup * 100).toFixed(2)}
                                            onChange={(e) => updateMarkup(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-xl py-4 pl-4 pr-12 text-right font-bold text-2xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900"
                                        />
                                    )}
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs font-bold bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded transition-colors">
                                        {isMarginModel ? 'MARGEM' : 'MARKUP'}
                                    </span>
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-bold transition-colors">%</span>
                                </div>
                                <div className={`mt-3 flex justify-between items-center rounded-lg px-3 py-2 border transition-colors ${isMarginModel ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'}`}>
                                    <span className={`text-xs font-medium ${isMarginModel ? 'text-blue-800 dark:text-blue-300' : 'text-emerald-800 dark:text-emerald-300'}`}>Lucro Alvo (Markup)</span>
                                    <span className={`text-sm font-bold ${isMarginModel ? 'text-blue-700 dark:text-blue-200' : 'text-emerald-700 dark:text-emerald-200'}`}>{formatCurrency(financials.markupAmount)}</span>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 space-y-3 transition-colors">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 dark:text-slate-400 transition-colors">Custo Direto</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-200 transition-colors">{formatCurrency(financials.totalDirectCost)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 dark:text-slate-400 transition-colors flex items-center gap-1">
                                        Contingência ({formatPercent(data.contingencyRate)})
                                        <InfoTooltip text="Reserva para riscos e imprevistos. Segundo o TCU, deve cobrir eventos incertos mas estatisticamente prováveis na execução do escopo." />
                                    </span>
                                    <span className="font-bold text-slate-700 dark:text-slate-200 transition-colors">+ {formatCurrency(financials.contingencyAmount)}</span>
                                </div>
                                <div className="h-px bg-slate-200 dark:bg-slate-700 w-full transition-colors"></div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 dark:text-slate-400 font-bold transition-colors">Base p/ Markup</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100 transition-colors">{formatCurrency(financials.totalCostWithContingency)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 p-5 transition-colors">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-blue-500 dark:text-blue-400 mt-0.5 shrink-0 transition-colors" />
                            <div className="space-y-2">
                                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed transition-colors">
                                    <strong>Estrutura DRE:</strong> O relatório à direita segue a estrutura de Demonstrativo de Resultado (Top-Down), partindo do Faturamento Bruto até o Lucro Líquido final.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: DRE Report (8 cols) - Full width on print */}
                <div className="lg:col-span-8 print:col-span-12 print:w-full transition-colors">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden print:shadow-none print:border-slate-300 transition-colors">
                        <div className="bg-[#0f172a] dark:bg-slate-950 p-6 text-white flex justify-between items-center relative overflow-hidden print:bg-white print:text-slate-900 print:border-b print:border-slate-300 transition-colors">
                            <div className="relative z-10">
                                <h3 className="font-bold text-lg dark:text-slate-100">Demonstrativo de Formação de Preço</h3>
                                <p className="text-sm opacity-70 mt-1 dark:text-slate-400 print:text-slate-500">Waterfall Detalhado (DRE)</p>
                            </div>
                            <div className="text-right relative z-10">
                                <p className="text-[10px] uppercase font-bold opacity-60 tracking-wider dark:text-slate-400 print:text-slate-500">Preço Final (Revenue)</p>
                                <p className="text-3xl font-bold text-[#fbbf24] dark:text-amber-400 print:text-slate-900 transition-colors">{formatCurrency(financials.monthlyValue)}</p>
                            </div>
                        </div>

                        <div className="p-0 transition-colors">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-xs print:bg-white border-b border-slate-200 dark:border-slate-700 transition-colors">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Componente</th>
                                        <th className="px-6 py-4 text-right">Valor</th>
                                        <th className="px-6 py-4 text-right min-w-[120px]">Ref. %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200 transition-colors">

                                    {/* 1. FATURAMENTO BRUTO */}
                                    <tr className="bg-slate-50 dark:bg-slate-800/40 print:bg-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                                        <td className="px-6 py-3 font-bold text-slate-800 dark:text-slate-100">1. Faturamento Bruto</td>
                                        <td className="px-6 py-3 text-right font-bold text-slate-800 dark:text-slate-100">{formatCurrency(financials.monthlyValue)}</td>
                                        <td className="px-6 py-3 text-right">
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-full transition-colors">100%</span>
                                        </td>
                                    </tr>

                                    {/* 2. IMPOSTOS SOBRE VENDA */}
                                    <tr className="hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                                        <td className="px-10 py-2 text-slate-600 dark:text-slate-400 pl-12 border-l-4 border-transparent hover:border-red-300 dark:hover:border-red-800">
                                            (-) Impostos sobre Venda (PIS/COFINS/ISS)
                                            <InfoTooltip text="Tributos incidentes diretamente sobre o faturamento bruto. Inclui PIS, COFINS e o ISS (em caso de serviços) ou ICMS (mercadorias)." />
                                        </td>
                                        <td className="px-6 py-2 text-right text-red-600 dark:text-red-400">({formatCurrency(financials.salesTaxAmount)})</td>
                                        <td className="px-6 py-2 text-right text-[10px] font-medium text-slate-400 dark:text-slate-500 transition-colors">{formatPercent(activeSalesRate)}</td>
                                    </tr>

                                    {/* 3. RECEITA LÍQUIDA */}
                                    <tr className="bg-slate-100/80 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-700 print:bg-slate-50 font-bold transition-colors">
                                        <td className="px-6 py-3 text-slate-800 dark:text-slate-100">= 3. Receita Líquida</td>
                                        <td className="px-6 py-3 text-right text-slate-800 dark:text-slate-100">{formatCurrency(financials.netRevenue)}</td>
                                        <td className="px-6 py-3 text-right text-[10px] text-slate-500 dark:text-slate-400 transition-colors">{formatPercent(financials.netRevenue / financials.monthlyValue)}</td>
                                    </tr>

                                    {/* 4 & 5. CUSTOS DIRETOS */}
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-10 py-2 text-slate-600 dark:text-slate-400 pl-12 border-l-4 border-transparent hover:border-slate-300 dark:hover:border-slate-700">(-) Mão de Obra e Encargos</td>
                                        <td className="px-6 py-2 text-right text-red-500 dark:text-red-400">({formatCurrency(financials.totalLaborCost)})</td>
                                        <td className="px-6 py-2 text-right text-[10px] font-medium text-slate-400 dark:text-slate-500 transition-colors">-</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-10 py-2 text-slate-600 dark:text-slate-400 pl-12 border-l-4 border-transparent hover:border-slate-300 dark:hover:border-slate-700">(-) Despesas Operacionais / Materiais</td>
                                        <td className="px-6 py-2 text-right text-red-500 dark:text-red-400">({formatCurrency(financials.totalOperationalCost + financials.totalSafetyCost + financials.totalSupportCost)})</td>
                                        <td className="px-6 py-2 text-right text-[10px] font-medium text-slate-400 dark:text-slate-500 transition-colors">-</td>
                                    </tr>

                                    {/* 6. MARGEM OPERACIONAL (CONTRIBUTION) */}
                                    <tr className="bg-blue-50 dark:bg-blue-900/10 print:bg-white border-l-4 border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                                        <td className="px-6 py-3 font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                                            <Layers size={16} /> = 6. Margem Operacional
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-blue-900 dark:text-blue-200">{formatCurrency(financials.contributionMarginAmount)}</td>
                                        <td className="px-6 py-3 text-right">
                                            <span className="inline-flex whitespace-nowrap text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-full transition-colors">
                                                Mg. {formatPercent(financials.contributionMarginPercent / 100)}
                                            </span>
                                        </td>
                                    </tr>

                                    {/* 7. CUSTOS INDIRETOS / RISCO */}
                                    <tr className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                                        <td className="px-10 py-2 text-slate-600 dark:text-slate-400 pl-12 border-l-4 border-transparent hover:border-orange-300 dark:hover:border-orange-800">(-) Contingência / Risco</td>
                                        <td className="px-6 py-2 text-right text-red-500 dark:text-red-400">({formatCurrency(financials.contingencyAmount)})</td>
                                        <td className="px-6 py-2 text-right text-[10px] font-medium text-slate-400 dark:text-slate-500 transition-colors">{formatPercent(data.contingencyRate)}</td>
                                    </tr>

                                    {/* 8. RESULTADO OPERACIONAL (EBITDA) */}
                                    <tr className="bg-amber-50 dark:bg-amber-900/10 print:bg-white border-l-4 border-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors">
                                        <td className="px-6 py-3 font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                                            <BarChart4 size={16} /> = 8. Resultado Operacional
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-amber-900 dark:text-amber-200">{formatCurrency(financials.operationalProfitAmount)}</td>
                                        <td className="px-6 py-3 text-right">
                                            <span className="inline-flex whitespace-nowrap text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-full transition-colors">
                                                EBITDA {formatPercent(financials.operationalMarginPercent / 100)}
                                            </span>
                                        </td>
                                    </tr>

                                    {/* 9. FINANCEIRO */}
                                    <tr className="hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                                        <td className="px-10 py-2 text-slate-600 dark:text-slate-400 pl-12 border-l-4 border-transparent hover:border-red-300 dark:hover:border-red-800">
                                            (-) Custos Financeiros
                                            <InfoTooltip text="Custo de oportunidade e encargos pelo financiamento do capital de giro necessário até o recebimento da fatura pelo cliente." />
                                        </td>
                                        <td className="px-6 py-2 text-right text-red-500 dark:text-red-400">({formatCurrency(financials.financialCostAmount)})</td>
                                        <td className="px-6 py-2 text-right text-[10px] font-medium text-slate-400 dark:text-slate-500 transition-colors">{formatPercent(data.financialCostRate)}</td>
                                    </tr>

                                    {/* 10. IMPOSTO DE RENDA */}
                                    <tr className="hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                                        <td className="px-10 py-2 text-slate-600 dark:text-slate-400 pl-12 border-l-4 border-transparent hover:border-red-300 dark:hover:border-red-800">
                                            (-) Imposto de Renda (IRPJ/CSLL)
                                            {data.taxConfig.calculationMode === 'NORMATIVE' && <span className="text-[9px] text-slate-400 dark:text-slate-500 ml-1">(Normativo)</span>}
                                        </td>
                                        <td className="px-6 py-2 text-right text-red-500 dark:text-red-400">({formatCurrency(financials.incomeTaxAmount)})</td>
                                        <td className="px-6 py-2 text-right text-[10px] font-medium text-slate-400 dark:text-slate-500 transition-colors">{formatPercent(activeIncomeRate)}</td>
                                    </tr>

                                    {/* 11. LUCRO LÍQUIDO */}
                                    <tr className="bg-[#1e293b] dark:bg-slate-950 text-white print:bg-white print:text-slate-900 print:border-t-2 print:border-slate-900 transition-colors">
                                        <td className="px-6 py-5 font-bold uppercase tracking-wider flex items-center gap-2">
                                            <DollarSign size={20} className="text-[#fbbf24] dark:text-amber-400 print:text-slate-900 transition-colors" /> = 11. Resultado Líquido
                                        </td>
                                        <td className="px-6 py-5 text-right font-bold text-xl text-[#fbbf24] dark:text-amber-400 print:text-slate-900 transition-colors">{formatCurrency(financials.netProfitAmount)}</td>
                                        <td className="px-6 py-5 text-right font-bold text-white dark:text-slate-100 print:text-slate-900 transition-colors">
                                            {formatPercent(financials.netProfitPercent / 100)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="hidden print:block mt-8 text-xs text-slate-400 text-center">
                        <p>Documento gerado eletronicamente pelo sistema OPrice em {new Date().toLocaleDateString('pt-BR')}.</p>
                        <p>Validade da proposta: 15 dias.</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Pricing;
