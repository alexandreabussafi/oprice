
import React, { useState, useEffect } from 'react';
import { ProposalData, ChargeComponent, TaxItem } from '../types';
import { calculateFinancials, formatCurrency, formatPercent } from '../utils/pricingEngine';
import { FileText, Percent, TrendingUp, DollarSign, Calculator, ChevronDown, CheckSquare, Square, Info, AlertTriangle, Package } from 'lucide-react';

interface TaxesProps {
    data: ProposalData;
    updateData: (newData: Partial<ProposalData>) => void;
    showServiceCharges?: boolean;
    showProductTaxes?: boolean;
}

const Taxes: React.FC<TaxesProps> = ({ data, updateData, showServiceCharges = true, showProductTaxes = true }) => {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        groupA: false, groupB: false, groupC: false, groupD: false,
    });

    // Simulation State
    const [simulationBase, setSimulationBase] = useState<number>(0);

    // Initialize simulation with actual payroll if available, otherwise 0
    useEffect(() => {
        const basePayroll = data.roles.reduce((acc, r) => {
            let base = r.baseSalary;
            if (r.additionalHazard) base += r.baseSalary * 0.2;
            if (r.additionalDanger) base += r.baseSalary * 0.3;
            return acc + (base * r.quantity);
        }, 0);

        // Initialize with project data if available, but allow override
        if (basePayroll > 0) setSimulationBase(basePayroll);
    }, [data.roles]);

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const updateRegime = (regime: ProposalData['taxConfig']['regime']) => {
        updateData({
            taxConfig: { ...data.taxConfig, regime: regime }
        });
    };

    const updateMode = (mode: ProposalData['taxConfig']['calculationMode']) => {
        updateData({
            taxConfig: { ...data.taxConfig, calculationMode: mode }
        });
    };

    // --- Tax List Management ---
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

    const calculateTotalRate = (list: TaxItem[]) => list.filter(t => t.active).reduce((acc, t) => acc + t.rate, 0);

    // --- Social Charges Logic ---
    const recalculateTotalChargeRate = (breakdown: ProposalData['taxConfig']['chargesBreakdown']) => {
        let total = 0;
        Object.values(breakdown).forEach(groupArr => {
            groupArr.forEach(item => total += item.value);
        });
        return total;
    };

    const updateComponent = (groupKey: any, id: string, field: any, value: any) => {
        const currentGroup = data.taxConfig.chargesBreakdown[groupKey as keyof typeof data.taxConfig.chargesBreakdown];
        const updatedGroup = currentGroup.map(item => item.id === id ? { ...item, [field]: value } : item);
        const newBreakdown = { ...data.taxConfig.chargesBreakdown, [groupKey]: updatedGroup };
        updateData({
            taxConfig: { ...data.taxConfig, chargesBreakdown: newBreakdown, socialChargesRate: recalculateTotalChargeRate(newBreakdown) }
        });
    };

    const getGroupTotal = (group: ChargeComponent[]) => group.reduce((acc, item) => acc + item.value, 0);

    const groupsConfig = [
        { key: 'groupA', title: 'Grupo A - Encargos Sociais Básicos', desc: 'INSS, Sistema S, Salário Educação, FGTS, RAT', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
        { key: 'groupB', title: 'Grupo B - Tempo não Trabalhado', desc: 'Férias, 13º Salário, Ausências, Feriados', color: 'blue', bg: 'bg-[var(--tenant-secondary-soft)]', text: 'text-[var(--tenant-secondary)]', border: 'border-[var(--tenant-secondary-border)]' },
        { key: 'groupC', title: 'Grupo C - Indenizações', desc: 'Aviso Prévio, Multa FGTS', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        { key: 'groupD', title: 'Grupo D - Incidências (A sobre B)', desc: 'Reflexos cumulativos', color: 'purple', bg: 'bg-[var(--tenant-secondary-soft)]', text: 'text-[var(--tenant-secondary)]', border: 'border-[var(--tenant-secondary-border)]' },
    ] as const;

    return (
        <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
            <header>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Impostos & Encargos</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 transition-colors">Gestão detalhada de regime tributário, alíquotas de venda e encargos sociais.</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* LEFT COLUMN: TAX REGIME & REVENUE TAXES (4 columns wide) */}
                <div className={`${showServiceCharges ? 'xl:col-span-4' : 'xl:col-span-12'} space-y-6`}>
                    {/* Regime Selection */}
                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] rounded-lg shadow-sm border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] p-6 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-[var(--tenant-secondary-soft)] dark:bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] rounded-lg transition-colors"><FileText size={20} /></div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 transition-colors">Regime Tributário</h3>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => updateRegime('Lucro Real')} className={`flex-1 py-3 px-2 rounded-lg border transition-all text-xs font-bold text-center ${data.taxConfig.regime === 'Lucro Real' ? 'border-[var(--tenant-primary)] dark:border-[var(--tenant-secondary-border)] bg-[var(--tenant-primary)] dark:bg-[var(--tenant-secondary-soft)] text-white shadow-md' : 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] text-slate-600 dark:text-slate-400 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)]'}`}>Lucro Real</button>
                            <button onClick={() => updateRegime('Lucro Presumido')} className={`flex-1 py-3 px-2 rounded-lg border transition-all text-xs font-bold text-center ${data.taxConfig.regime === 'Lucro Presumido' ? 'border-[var(--tenant-primary)] dark:border-[var(--tenant-secondary-border)] bg-[var(--tenant-primary)] dark:bg-[var(--tenant-secondary-soft)] text-white shadow-md' : 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] text-slate-600 dark:text-slate-400 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)]'}`}>Lucro Presumido</button>
                        </div>

                        {/* Calculation Mode Switch */}
                        <div className="p-3 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] transition-colors">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Modo de Cálculo (Gross Up)</p>
                            <div className="flex gap-2">
                                <button onClick={() => updateMode('NORMATIVE')} className={`flex-1 py-2 px-2 rounded-md border transition-all text-[10px] font-bold text-center ${data.taxConfig.calculationMode === 'NORMATIVE' ? 'border-emerald-500 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] text-slate-400 dark:text-slate-500'}`}>NORMATIVO<br />(Padrão Contábil)</button>
                                <button onClick={() => updateMode('COMMERCIAL')} className={`flex-1 py-2 px-2 rounded-md border transition-all text-[10px] font-bold text-center ${data.taxConfig.calculationMode === 'COMMERCIAL' ? 'border-[var(--tenant-secondary-border)] dark:border-[var(--tenant-secondary-border)] bg-[var(--tenant-secondary-soft)] dark:bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)]' : 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] text-slate-400 dark:text-slate-500'}`}>COMERCIAL<br />(Meta Líquida)</button>
                            </div>
                            {data.taxConfig.calculationMode === 'COMMERCIAL' && (
                                <p className="text-[10px] text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] mt-2 leading-tight">
                                    *Inclui IRPJ/CSLL no divisor do Gross Up para forçar o preço final a cobrir os impostos de renda.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Sales Taxes */}
                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] rounded-lg shadow-sm border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] overflow-hidden transition-colors">
                        <div className="p-4 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] flex justify-between items-center bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] transition-colors">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={18} className="text-red-500 dark:text-red-400" />
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Impostos s/ Venda (Gross Up)</h3>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Sempre inclusos</p>
                                </div>
                            </div>
                            <span className="text-lg font-bold text-red-600 dark:text-red-500 transition-colors">{formatPercent(calculateTotalRate(data.taxConfig.salesTaxes))}</span>
                        </div>
                        <div className="divide-y divide-[var(--tenant-border)] dark:divide-[var(--tenant-border-dark)]">
                            {data.taxConfig.salesTaxes.map(tax => (
                                <div key={tax.id} className="p-3 flex items-center justify-between hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => toggleTaxActive('sales', tax.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                            {tax.active ? <CheckSquare size={18} className="text-[var(--tenant-primary)] dark:text-white" /> : <Square size={18} />}
                                        </button>
                                        <span className={`text-sm font-medium ${tax.active ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600 line-through'}`}>{tax.name}</span>
                                    </div>
                                    <div className="flex items-center bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-md w-24 shadow-sm transition-colors">
                                        <input type="number" step="0.01" value={(tax.rate * 100).toFixed(2)} onChange={(e) => updateTaxRate('sales', tax.id, (parseFloat(e.target.value) || 0) / 100)} className="w-full text-right text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none focus:ring-0 p-1.5 outline-none transition-colors" />
                                        <span className="pr-2 text-[10px] font-bold text-slate-400 select-none transition-colors">%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ICMS Interestadual (Produtos) */}
                    {showProductTaxes && (
                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] rounded-lg shadow-sm border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] overflow-hidden transition-colors mt-6">
                        <div className="p-4 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] transition-colors">
                            <div className="flex items-center gap-2">
                                <Package size={18} className="text-emerald-500 dark:text-emerald-400" />
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">ICMS Interestadual (Produtos)</h3>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Origem Padrão: SP</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 space-y-4">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Configure as alíquotas base aplicadas automaticamente quando o estado de destino for selecionado na ordem de venda (Gross Up).</p>

                            <div className="grid grid-cols-2 gap-4">
                                {['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'OUTROS'].map(state => {
                                    const rate = data.taxConfig.icmsStateRates?.[state] ?? (state === 'SP' ? 0.18 : (state === 'OUTROS' ? 0.07 : 0.12));
                                    return (
                                        <div key={state} className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{state}</span>
                                            <div className="flex items-center bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-md w-24 shadow-sm transition-colors">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={(rate * 100).toFixed(2)}
                                                    onChange={(e) => {
                                                        const newVal = (parseFloat(e.target.value) || 0) / 100;
                                                        const currentRates = data.taxConfig.icmsStateRates || {
                                                            SP: 0.18, RJ: 0.12, MG: 0.12, PR: 0.12, SC: 0.12, RS: 0.12, OUTROS: 0.07
                                                        };
                                                        updateData({
                                                            taxConfig: {
                                                                ...data.taxConfig,
                                                                icmsStateRates: { ...currentRates, [state]: newVal }
                                                            }
                                                        });
                                                    }}
                                                    className="w-full text-right text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none focus:ring-0 p-1.5 outline-none transition-colors"
                                                />
                                                <span className="pr-2 text-[10px] font-bold text-slate-400 select-none transition-colors">%</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded flex items-start gap-2">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <p>Outros estados que não listados especificamente acima usarão a alíquota definida em "OUTROS" (Padrão 7% - Norte, Nordeste, Centro-Oeste e ES).</p>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Income Taxes */}
                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] rounded-lg shadow-sm border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] overflow-hidden transition-colors">
                        <div className="p-4 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] flex justify-between items-center bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] transition-colors">
                            <div className="flex items-center gap-2">
                                <DollarSign size={18} className="text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)]" />
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Impostos s/ Renda (IRPJ)</h3>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                        {data.taxConfig.calculationMode === 'NORMATIVE' ? 'Dedução do Lucro' : 'Incluso no Gross Up'}
                                    </p>
                                </div>
                            </div>
                            <span className="text-lg font-bold text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] transition-colors">{formatPercent(calculateTotalRate(data.taxConfig.incomeTaxes))}</span>
                        </div>
                        <div className="divide-y divide-[var(--tenant-border)] dark:divide-[var(--tenant-border-dark)] transition-colors">
                            {data.taxConfig.incomeTaxes.map(tax => (
                                <div key={tax.id} className="p-3 flex items-center justify-between hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => toggleTaxActive('profit', tax.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                            {tax.active ? <CheckSquare size={18} className="text-[var(--tenant-primary)] dark:text-white" /> : <Square size={18} />}
                                        </button>
                                        <span className={`text-sm font-medium ${tax.active ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600 line-through'}`}>{tax.name}</span>
                                    </div>
                                    <div className="flex items-center bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-md w-24 shadow-sm transition-colors">
                                        <input type="number" step="0.01" value={(tax.rate * 100).toFixed(2)} onChange={(e) => updateTaxRate('profit', tax.id, (parseFloat(e.target.value) || 0) / 100)} className="w-full text-right text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none focus:ring-0 p-1.5 outline-none transition-colors" />
                                        <span className="pr-2 text-[10px] font-bold text-slate-400 select-none transition-colors">%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className={`p-3 text-xs flex gap-2 transition-colors ${data.taxConfig.calculationMode === 'NORMATIVE' ? 'bg-[var(--tenant-secondary-soft)] dark:bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)]' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'}`}>
                            <Info size={14} className="shrink-0 mt-0.5" />
                            <p>
                                {data.taxConfig.calculationMode === 'NORMATIVE'
                                    ? "Estimativa para dashboard. Não afeta o preço final no modo Normativo."
                                    : "Ativo no Gross Up! O preço será aumentado para cobrir este custo."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* CENTER COLUMN: SOCIAL CHARGES (5 columns wide) */}
                {showServiceCharges && (
                <div className="xl:col-span-5 transition-colors">
                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] rounded-lg shadow-sm border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] p-6 h-full flex flex-col transition-colors">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg transition-colors"><Percent size={20} /></div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 transition-colors">Encargos Sociais (Folha)</h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider transition-colors">Total</p>
                                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500 tracking-tight transition-colors">{formatPercent(data.taxConfig.socialChargesRate)}</p>
                            </div>
                        </div>

                        <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar flex-1">
                            {groupsConfig.map((group) => {
                                const items = data.taxConfig.chargesBreakdown[group.key as keyof typeof data.taxConfig.chargesBreakdown];
                                const total = getGroupTotal(items);
                                const isExpanded = expandedGroups[group.key];
                                return (
                                    <div key={group.key} className={`border rounded-lg transition-all duration-300 overflow-hidden ${isExpanded ? 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-md ring-1 ring-[var(--tenant-border)] dark:ring-[var(--tenant-border-dark)]' : 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] hover:border-[var(--tenant-border)] dark:hover:border-[var(--tenant-border-dark)]'}`}>
                                        <button onClick={() => toggleGroup(group.key)} className={`w-full flex justify-between items-center p-4 focus:outline-none transition-colors ${isExpanded ? 'bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)]' : 'bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)]'}`}>
                                            <div className="text-left">
                                                <h4 className={`font-bold text-sm ${group.text} dark:text-slate-200 flex items-center gap-2 transition-colors`}>{group.title}</h4>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium opacity-80 transition-colors">{group.desc}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`font-bold ${group.text} dark:text-slate-100 ${group.bg} dark:bg-[var(--tenant-control-dark)] px-3 py-1.5 rounded-lg text-sm border ${group.border} dark:border-[var(--tenant-border-dark)] transition-colors`}>{formatPercent(total)}</span>
                                                <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                    <ChevronDown size={20} className="text-slate-400 dark:text-slate-500" />
                                                </div>
                                            </div>
                                        </button>
                                        {isExpanded && (
                                            <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-2 border-t border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] transition-colors">
                                                {items.map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between p-2 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] rounded-lg group/item transition-colors border border-transparent hover:border-[var(--tenant-border)] dark:hover:border-[var(--tenant-border-dark)]">
                                                        <input type="text" value={item.name} onChange={(e) => updateComponent(group.key, item.id, 'name', e.target.value)} className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 bg-transparent border-none focus:ring-0 p-0 placeholder-slate-400 dark:placeholder-slate-500 transition-colors" />
                                                        <div className="flex items-center gap-3 transition-colors">
                                                            <div className="relative flex items-center bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-md shadow-sm w-24 transition-colors">
                                                                <input type="number" step="0.01" value={(item.value * 100).toFixed(2)} onChange={(e) => updateComponent(group.key, item.id, 'value', (parseFloat(e.target.value) || 0) / 100)} className="w-full text-right text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none focus:ring-0 p-1.5 outline-none transition-colors" />
                                                                <span className="pr-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 select-none transition-colors">%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                )}

                {/* RIGHT COLUMN: FINANCIAL IMPACT (3 columns wide) */}
                {showServiceCharges && (
                <div className="xl:col-span-3">
                    <div className="bg-[var(--tenant-primary)] rounded-lg shadow-xl text-white p-6 h-full flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5"><Calculator size={120} /></div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold text-[#fbbf24] flex items-center gap-2 mb-6"><DollarSign size={20} />Simulação RH</h3>
                            <div className="space-y-6 flex-1">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-bold">Base de Cálculo (Folha)</p>
                                    <div className="relative group">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-focus-within:text-[#fbbf24] transition-colors">R$</span>
                                        <input
                                            type="number"
                                            value={simulationBase || ''}
                                            onChange={(e) => setSimulationBase(parseFloat(e.target.value) || 0)}
                                            className="w-full bg-[var(--tenant-panel)] border border-white/10 rounded-lg p-3 pl-10 text-2xl font-bold text-white focus:bg-[var(--tenant-panel)] focus:border-[#fbbf24] outline-none transition-all placeholder-white/20"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="h-px bg-[var(--tenant-panel)] w-full"></div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3 font-bold">Custo Estimado dos Encargos</p>
                                    <div className="flex justify-between items-center bg-[var(--tenant-panel)] p-3 rounded-lg border border-white/10">
                                        <span className="text-sm font-bold text-emerald-400">Total Encargos</span>
                                        <span className="font-mono text-slate-200">{formatCurrency(simulationBase * data.taxConfig.socialChargesRate)}</span>
                                    </div>
                                </div>
                                <div className="mt-auto pt-6 border-t border-white/10">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Custo Total RH (Mensal)</p>
                                    <p className="text-3xl font-bold text-[#fbbf24] tracking-tight">{formatCurrency(simulationBase * (1 + data.taxConfig.socialChargesRate))}</p>
                                    <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">*Inclui Salários, Adicionais e Encargos.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                )}

            </div>
        </div>
    );
};

export default Taxes;
