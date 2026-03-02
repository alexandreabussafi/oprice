
import React, { useState } from 'react';
import { ProposalData, ChargeComponent, TaxItem, PricingModel } from '../types';
import { formatPercent } from '../utils/pricingEngine';
import { FileText, Percent, TrendingUp, ChevronDown, Plus, Trash2, Info, Settings as SettingsIcon, ShieldAlert, RefreshCw, AlertTriangle, Calculator, CheckSquare, Square, CalendarClock, DollarSign, Calendar, ArrowRightLeft } from 'lucide-react';
import InfoTooltip from '../components/InfoTooltip';

interface SettingsProps {
    data: ProposalData;
    updateData: (newData: Partial<ProposalData>) => void;
    resetData: () => void;
}

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="group relative inline-block ml-1 align-middle">
        <Info size={14} className="text-slate-400 hover:text-blue-500 cursor-help transition-colors" />
        <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl z-50 text-center leading-relaxed font-normal pointer-events-none">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
    </div>
);

const Settings: React.FC<SettingsProps> = ({ data, updateData, resetData }) => {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        groupA: false, groupB: false, groupC: false, groupD: false,
    });

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const updateGlobalParam = (field: keyof ProposalData, value: string) => {
        updateData({ [field]: (parseFloat(value) || 0) / 100 });
    };

    const updateRegime = (regime: ProposalData['taxConfig']['regime']) => {
        updateData({
            taxConfig: { ...data.taxConfig, regime: regime }
        });
    };

    const setPricingModel = (model: PricingModel) => {
        // Ao trocar de modelo, tentamos manter a coerência financeira convertendo os valores
        if (model === 'MARGIN' && data.markup > 0) {
            // Markup -> Margin: Margin = Markup / (1 + Markup)
            const newMargin = data.markup / (1 + data.markup);
            updateData({ pricingModel: model, targetMargin: newMargin });
        } else if (model === 'MARKUP' && (data.targetMargin || 0) > 0) {
            // Margin -> Markup: Markup = Margin / (1 - Margin)
            const margin = data.targetMargin || 0;
            const newMarkup = margin / (1 - margin);
            updateData({ pricingModel: model, markup: newMarkup });
        } else {
            updateData({ pricingModel: model });
        }
    };

    // --- New Tax Management Functions ---
    const toggleTaxActive = (type: 'sales' | 'profit', id: string) => {
        const listKey = type === 'sales' ? 'salesTaxes' : 'incomeTaxes';
        const updatedList = data.taxConfig[listKey].map(t =>
            t.id === id ? { ...t, active: !t.active } : t
        );
        updateData({
            taxConfig: { ...data.taxConfig, [listKey]: updatedList }
        });
    };

    const updateTaxRate = (type: 'sales' | 'profit', id: string, rate: number) => {
        const listKey = type === 'sales' ? 'salesTaxes' : 'incomeTaxes';
        const updatedList = data.taxConfig[listKey].map(t =>
            t.id === id ? { ...t, rate } : t
        );
        updateData({
            taxConfig: { ...data.taxConfig, [listKey]: updatedList }
        });
    };

    // Derived Totals
    const totalSalesRate = data.taxConfig.salesTaxes.filter(t => t.active).reduce((acc, t) => acc + t.rate, 0);
    const totalIncomeRate = data.taxConfig.incomeTaxes.filter(t => t.active).reduce((acc, t) => acc + t.rate, 0);
    const displayGrossUp = data.taxConfig.calculationMode === 'COMMERCIAL' ? totalSalesRate + totalIncomeRate : totalSalesRate;

    // --- Charge Management Functions ---
    const recalculateTotalRate = (breakdown: ProposalData['taxConfig']['chargesBreakdown']) => {
        let total = 0;
        Object.values(breakdown).forEach(groupArr => {
            groupArr.forEach(item => total += item.value);
        });
        return total;
    };

    const updateComponent = (
        groupKey: keyof ProposalData['taxConfig']['chargesBreakdown'],
        id: string,
        field: keyof ChargeComponent,
        value: any
    ) => {
        const currentGroup = data.taxConfig.chargesBreakdown[groupKey];
        const updatedGroup = currentGroup.map(item => item.id === id ? { ...item, [field]: value } : item);
        const newBreakdown = { ...data.taxConfig.chargesBreakdown, [groupKey]: updatedGroup };

        updateData({
            taxConfig: {
                ...data.taxConfig,
                chargesBreakdown: newBreakdown,
                socialChargesRate: recalculateTotalRate(newBreakdown)
            }
        });
    };

    const addComponent = (groupKey: keyof ProposalData['taxConfig']['chargesBreakdown']) => {
        const newComponent: ChargeComponent = { id: Math.random().toString(36).substr(2, 9), name: 'Novo Item', value: 0 };
        const newBreakdown = { ...data.taxConfig.chargesBreakdown, [groupKey]: [...data.taxConfig.chargesBreakdown[groupKey], newComponent] };
        updateData({
            taxConfig: { ...data.taxConfig, chargesBreakdown: newBreakdown, socialChargesRate: recalculateTotalRate(newBreakdown) }
        });
    };

    const removeComponent = (groupKey: keyof ProposalData['taxConfig']['chargesBreakdown'], id: string) => {
        const newBreakdown = { ...data.taxConfig.chargesBreakdown, [groupKey]: data.taxConfig.chargesBreakdown[groupKey].filter(i => i.id !== id) };
        updateData({
            taxConfig: { ...data.taxConfig, chargesBreakdown: newBreakdown, socialChargesRate: recalculateTotalRate(newBreakdown) }
        });
    };

    const getGroupTotal = (group: ChargeComponent[]) => group.reduce((acc, item) => acc + item.value, 0);

    const groupsConfig = [
        { key: 'groupA', title: 'Grupo A - Encargos Sociais Básicos', desc: 'INSS, Sistema S, FGTS, RAT', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
        { key: 'groupB', title: 'Grupo B - Tempo não Trabalhado', desc: 'Férias, 13º Salário, Ausências', color: 'blue', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        { key: 'groupC', title: 'Grupo C - Indenizações', desc: 'Aviso Prévio, Multa FGTS', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        { key: 'groupD', title: 'Grupo D - Incidências (A sobre B)', desc: 'Reflexos cumulativos', color: 'purple', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    ] as const;

    // Defaults
    const currentModel = data.pricingModel || 'MARKUP';

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
            <header>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <SettingsIcon size={28} className="text-[#0f172a]" />
                    Configurações do Projeto
                </h2>
                <p className="text-slate-500 text-sm mt-1">Definições financeiras, cronograma e estrutura tributária desta proposta.</p>
            </header>

            {/* Global Parameters Section */}
            <section>
                <h3 className="text-lg font-bold text-slate-700 mb-4 border-b border-slate-200 pb-2">Parâmetros de Custo Indireto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Profit Definition Logic (Swappable) */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg text-white shadow-sm ${currentModel === 'MARKUP' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Definição de Lucro</p>
                                    <p className="text-[10px] text-slate-400">Escolha o modelo de entrada</p>
                                </div>
                            </div>
                            <div className="flex bg-slate-100 p-0.5 rounded-lg">
                                <button
                                    onClick={() => setPricingModel('MARKUP')}
                                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${currentModel === 'MARKUP' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Markup
                                </button>
                                <button
                                    onClick={() => setPricingModel('MARGIN')}
                                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${currentModel === 'MARGIN' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Margem
                                </button>
                            </div>
                        </div>

                        <div className="relative">
                            {currentModel === 'MARKUP' ? (
                                <>
                                    <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">
                                        Markup Alvo (% sobre Custo)
                                        <Tooltip text="Percentual adicionado sobre a base de custo para gerar o lucro. Ex: Custo 100 + 30% Markup = Lucro 30." />
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={(data.markup * 100).toFixed(2)}
                                            onChange={(e) => updateGlobalParam('markup', e.target.value)}
                                            className="w-full pl-4 pr-12 py-3 bg-white border border-emerald-200 rounded-xl text-2xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2">
                                        Equivale a uma Margem de <strong>{formatPercent(data.markup / (1 + data.markup))}</strong>
                                    </p>
                                </>
                            ) : (
                                <>
                                    <label className="block text-xs font-bold text-blue-600 uppercase mb-1">
                                        Margem Operacional (% sobre Venda)
                                        <Tooltip text="Percentual do preço de venda (numerador) que será lucro. Ex: Preço 100 com 20% Margem = Lucro 20." />
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={((data.targetMargin || 0) * 100).toFixed(2)}
                                            onChange={(e) => updateGlobalParam('targetMargin', e.target.value)}
                                            className="w-full pl-4 pr-12 py-3 bg-white border border-blue-200 rounded-xl text-2xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</div>
                                    </div>
                                    {data.targetMargin && (
                                        <p className="text-[10px] text-slate-400 mt-2">
                                            Calculado via Markup de <strong>{formatPercent(data.targetMargin / (1 - data.targetMargin))}</strong>
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Other Params */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shadow-sm"><TrendingUp size={20} /></div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
                                        Custo Financeiro
                                        <InfoTooltip text="Compensação pelo capital de giro e defasagem entre pagamentos e recebimentos (Fluxo de Caixa)." />
                                    </p>
                                    <p className="text-[10px] text-slate-400">Taxa sobre Venda</p>
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={(data.financialCostRate * 100).toFixed(2)}
                                    onChange={(e) => updateGlobalParam('financialCostRate', e.target.value)}
                                    className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><ShieldAlert size={20} /></div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
                                        Contingência
                                        <InfoTooltip text="Margem para riscos e variações de escopo. Padrão sugerido TCU/CREA conforme complexidade do projeto." />
                                    </p>
                                    <p className="text-[10px] text-slate-400">Add-on sobre Custo</p>
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={(data.contingencyRate * 100).toFixed(2)}
                                    onChange={(e) => updateGlobalParam('contingencyRate', e.target.value)}
                                    className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-xl font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tax Configuration Section */}
            <section>
                <h3 className="text-lg font-bold text-slate-700 mb-4 border-b border-slate-200 pb-2">Impostos e Encargos</h3>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Left Column: Tax Settings */}
                    <div className="xl:col-span-5 space-y-6">
                        {/* Regime */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg"><FileText size={20} /></div>
                                <h3 className="font-bold text-slate-800">Regime Tributário</h3>
                            </div>
                            <div className="flex flex-col gap-3">
                                {(['Lucro Real', 'Lucro Presumido'] as const).map(r => (
                                    <button key={r} onClick={() => updateRegime(r)}
                                        className={`w-full py-3 px-4 rounded-xl border transition-all text-sm font-bold text-left flex justify-between items-center ${data.taxConfig.regime === r ? 'border-[#0f172a] bg-[#0f172a] text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                                        <span>{r}</span>
                                        {data.taxConfig.regime === r && <div className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Calculated Gross Up Display (Source of Truth) */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Calculator size={20} /></div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center">
                                        Taxa de Gross Up (Efetiva)
                                        <Tooltip text="Percentual total utilizado como divisor na formação do preço [ Preço = Numerador / (1 - Taxa) ]. Soma dos impostos de venda ativos + custo financeiro." />
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-medium">Divisor automático do preço</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                                <span className="text-4xl font-black text-slate-800">{formatPercent(displayGrossUp + data.financialCostRate)}</span>
                                <p className="text-[10px] text-slate-400 mt-2">
                                    *Impostos ({formatPercent(displayGrossUp)}) + Financeiro ({formatPercent(data.financialCostRate)})
                                </p>
                            </div>
                            {data.taxConfig.calculationMode === 'COMMERCIAL' && (
                                <div className="mt-4 p-3 bg-amber-50 rounded border border-amber-100 flex gap-2">
                                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-amber-800 leading-tight">
                                        <strong>O Modo Comercial trata IRPJ/CSLL como custo</strong>, inserindo-os no Gross Up. Isso aumentará seu preço final para garantir o lucro líquido desejado.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Sales Taxes Management */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <div className="flex items-center">
                                    <span className="text-xs font-bold text-slate-600 uppercase">Impostos s/ Venda (Gross Up)</span>
                                    <Tooltip text="Impostos incidentes sobre o faturamento bruto. Estes valores são repassados integralmente ao preço final do cliente." />
                                </div>
                                <span className="text-xs font-bold text-red-600">{formatPercent(totalSalesRate)}</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {data.taxConfig.salesTaxes.map(tax => (
                                    <div key={tax.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => toggleTaxActive('sales', tax.id)} className="text-slate-400 hover:text-slate-600">
                                                {tax.active ? <CheckSquare size={18} className="text-[#0f172a]" /> : <Square size={18} />}
                                            </button>
                                            <span className={`text-sm font-medium ${tax.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{tax.name}</span>
                                        </div>
                                        <div className="flex items-center bg-white border border-slate-200 rounded-md w-20 px-2">
                                            <input type="number" step="0.01" value={(tax.rate * 100).toFixed(2)} onChange={(e) => updateTaxRate('sales', tax.id, (parseFloat(e.target.value) || 0) / 100)} className="w-full text-right text-sm font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-1 outline-none" />
                                            <span className="text-[10px] font-bold text-slate-400">%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Income Taxes Management */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <div className="flex flex-col">
                                    <div className="flex items-center">
                                        <span className="text-xs font-bold text-slate-600 uppercase">Impostos s/ Renda (IRPJ/CSLL)</span>
                                        <Tooltip text="Tributos sobre o lucro (IRPJ/CSLL). No modo 'Normativo' (Padrão), eles não aumentam o preço de venda, servindo apenas para calcular sua margem líquida real. Se desejar embuti-los no preço, altere o modo para 'Comercial'." />
                                    </div>
                                    <span className="text-[9px] text-slate-400">
                                        {data.taxConfig.calculationMode === 'NORMATIVE' ? 'Dedução de Lucro' : 'Compõe Preço'}
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-indigo-600">{formatPercent(totalIncomeRate)}</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {data.taxConfig.incomeTaxes.map(tax => (
                                    <div key={tax.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => toggleTaxActive('profit', tax.id)} className="text-slate-400 hover:text-slate-600">
                                                {tax.active ? <CheckSquare size={18} className="text-[#0f172a]" /> : <Square size={18} />}
                                            </button>
                                            <span className={`text-sm font-medium ${tax.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{tax.name}</span>
                                        </div>
                                        <div className="flex items-center bg-white border border-slate-200 rounded-md w-20 px-2">
                                            <input type="number" step="0.01" value={(tax.rate * 100).toFixed(2)} onChange={(e) => updateTaxRate('profit', tax.id, (parseFloat(e.target.value) || 0) / 100)} className="w-full text-right text-sm font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-1 outline-none" />
                                            <span className="text-[10px] font-bold text-slate-400">%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Charges List */}
                    <div className="xl:col-span-7">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg"><Percent size={20} /></div>
                                    <h3 className="font-bold text-slate-800">Composição dos Encargos (Folha)</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Encargos</p>
                                    <p className="text-3xl font-black text-emerald-600 tracking-tight">{formatPercent(data.taxConfig.socialChargesRate)}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {groupsConfig.map((group) => {
                                    const items = data.taxConfig.chargesBreakdown[group.key as keyof typeof data.taxConfig.chargesBreakdown];
                                    const isExpanded = expandedGroups[group.key];
                                    return (
                                        <div key={group.key} className={`border rounded-xl transition-all ${isExpanded ? 'border-slate-300 ring-1 ring-slate-100' : 'border-slate-200 bg-white'}`}>
                                            <button onClick={() => toggleGroup(group.key)} className={`w-full flex justify-between items-center p-4 ${isExpanded ? 'bg-slate-50/50' : 'bg-white'}`}>
                                                <div className="text-left"><h4 className={`font-bold text-sm ${group.text}`}>{group.title}</h4></div>
                                                <div className="flex items-center gap-4"><span className={`font-bold ${group.text} ${group.bg} px-3 py-1.5 rounded-lg text-sm border ${group.border}`}>{formatPercent(getGroupTotal(items))}</span><ChevronDown size={20} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></div>
                                            </button>
                                            {isExpanded && (
                                                <div className="bg-white p-2 border-t border-slate-100">
                                                    {items.map((item) => (
                                                        <div key={item.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group/item">
                                                            <input type="text" value={item.name} onChange={(e) => updateComponent(group.key as any, item.id, 'name', e.target.value)} className="flex-1 text-sm font-medium text-slate-700 bg-transparent border-none focus:ring-0 p-0" />
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative flex items-center bg-white border border-slate-200 rounded-md w-24"><input type="number" step="0.01" value={(item.value * 100).toFixed(2)} onChange={(e) => updateComponent(group.key as any, item.id, 'value', (parseFloat(e.target.value) || 0) / 100)} className="w-full text-right text-sm font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-1.5 outline-none" /><span className="pr-2 text-[10px] font-bold text-slate-400">%</span></div>
                                                                <button onClick={() => removeComponent(group.key as any, item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100"><Trash2 size={16} /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => addComponent(group.key as any)} className="w-full mt-2 py-3 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-400 hover:bg-blue-50 flex justify-center items-center gap-2"><Plus size={14} /> Novo Item</button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Danger Zone / Reset */}
            <section className="pt-8 border-t border-slate-200">
                <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} /> Área de Controle
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h4 className="font-bold text-red-900">Reiniciar Dados da Proposta</h4>
                        <p className="text-sm text-red-700 mt-1 max-w-2xl">
                            Esta ação irá remover todos os cargos (Equipe) e custos operacionais lançados.
                            As configurações de impostos, taxas globais e markup serão <strong>mantidas</strong>.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            if (window.confirm('Tem certeza? Isso apagará todos os dados de Equipe e Custos, mantendo apenas as configurações.')) {
                                resetData();
                            }
                        }}
                        className="px-6 py-3 bg-white border border-red-200 text-red-700 font-bold rounded-lg hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                    >
                        <RefreshCw size={18} />
                        Resetar Lançamentos
                    </button>
                </div>
            </section>
        </div>
    );
};

export default Settings;
