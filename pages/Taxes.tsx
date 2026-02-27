
import React, { useState, useEffect } from 'react';
import { ProposalData, ChargeComponent, TaxItem } from '../types';
import { calculateFinancials, formatCurrency, formatPercent } from '../utils/pricingEngine';
import { FileText, Percent, TrendingUp, DollarSign, Calculator, ChevronDown, CheckSquare, Square, Info, AlertTriangle } from 'lucide-react';

interface TaxesProps {
    data: ProposalData;
    updateData: (newData: Partial<ProposalData>) => void;
}

const Taxes: React.FC<TaxesProps> = ({ data, updateData }) => {
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
        { key: 'groupB', title: 'Grupo B - Tempo não Trabalhado', desc: 'Férias, 13º Salário, Ausências, Feriados', color: 'blue', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        { key: 'groupC', title: 'Grupo C - Indenizações', desc: 'Aviso Prévio, Multa FGTS', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        { key: 'groupD', title: 'Grupo D - Incidências (A sobre B)', desc: 'Reflexos cumulativos', color: 'purple', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    ] as const;

    return (
        <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
            <header>
                <h2 className="text-2xl font-bold text-slate-800">Impostos & Encargos</h2>
                <p className="text-slate-500 text-sm mt-1">Gestão detalhada de regime tributário, alíquotas de venda e encargos sociais.</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                {/* LEFT COLUMN: TAX REGIME & REVENUE TAXES (4 columns wide) */}
                <div className="xl:col-span-4 space-y-6">
                    {/* Regime Selection */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg"><FileText size={20} /></div>
                            <h3 className="font-bold text-slate-800">Regime Tributário</h3>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => updateRegime('Lucro Real')} className={`flex-1 py-3 px-2 rounded-lg border transition-all text-xs font-bold text-center ${data.taxConfig.regime === 'Lucro Real' ? 'border-[#0f172a] bg-[#0f172a] text-white shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>Lucro Real</button>
                            <button onClick={() => updateRegime('Lucro Presumido')} className={`flex-1 py-3 px-2 rounded-lg border transition-all text-xs font-bold text-center ${data.taxConfig.regime === 'Lucro Presumido' ? 'border-[#0f172a] bg-[#0f172a] text-white shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>Lucro Presumido</button>
                        </div>

                        {/* Calculation Mode Switch */}
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Modo de Cálculo (Gross Up)</p>
                            <div className="flex gap-2">
                                <button onClick={() => updateMode('NORMATIVE')} className={`flex-1 py-2 px-2 rounded-md border transition-all text-[10px] font-bold text-center ${data.taxConfig.calculationMode === 'NORMATIVE' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'}`}>NORMATIVO<br />(Padrão Contábil)</button>
                                <button onClick={() => updateMode('COMMERCIAL')} className={`flex-1 py-2 px-2 rounded-md border transition-all text-[10px] font-bold text-center ${data.taxConfig.calculationMode === 'COMMERCIAL' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-400'}`}>COMERCIAL<br />(Meta Líquida)</button>
                            </div>
                            {data.taxConfig.calculationMode === 'COMMERCIAL' && (
                                <p className="text-[10px] text-blue-600 mt-2 leading-tight">
                                    *Inclui IRPJ/CSLL no divisor do Gross Up para forçar o preço final a cobrir os impostos de renda.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Sales Taxes */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={18} className="text-red-500" />
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">Impostos s/ Venda (Gross Up)</h3>
                                    <p className="text-[10px] text-slate-500">Sempre inclusos</p>
                                </div>
                            </div>
                            <span className="text-lg font-bold text-red-600">{formatPercent(calculateTotalRate(data.taxConfig.salesTaxes))}</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {data.taxConfig.salesTaxes.map(tax => (
                                <div key={tax.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => toggleTaxActive('sales', tax.id)} className="text-slate-400 hover:text-slate-600">
                                            {tax.active ? <CheckSquare size={18} className="text-[#0f172a]" /> : <Square size={18} />}
                                        </button>
                                        <span className={`text-sm font-medium ${tax.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{tax.name}</span>
                                    </div>
                                    <div className="flex items-center bg-white border border-slate-200 rounded-md w-24">
                                        <input type="number" step="0.01" value={(tax.rate * 100).toFixed(2)} onChange={(e) => updateTaxRate('sales', tax.id, (parseFloat(e.target.value) || 0) / 100)} className="w-full text-right text-sm font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-1.5 outline-none" />
                                        <span className="pr-2 text-[10px] font-bold text-slate-400 select-none">%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Income Taxes */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <DollarSign size={18} className="text-indigo-500" />
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm">Impostos s/ Renda (IRPJ)</h3>
                                    <p className="text-[10px] text-slate-500">
                                        {data.taxConfig.calculationMode === 'NORMATIVE' ? 'Dedução do Lucro' : 'Incluso no Gross Up'}
                                    </p>
                                </div>
                            </div>
                            <span className="text-lg font-bold text-indigo-600">{formatPercent(calculateTotalRate(data.taxConfig.incomeTaxes))}</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {data.taxConfig.incomeTaxes.map(tax => (
                                <div key={tax.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => toggleTaxActive('profit', tax.id)} className="text-slate-400 hover:text-slate-600">
                                            {tax.active ? <CheckSquare size={18} className="text-[#0f172a]" /> : <Square size={18} />}
                                        </button>
                                        <span className={`text-sm font-medium ${tax.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{tax.name}</span>
                                    </div>
                                    <div className="flex items-center bg-white border border-slate-200 rounded-md w-24">
                                        <input type="number" step="0.01" value={(tax.rate * 100).toFixed(2)} onChange={(e) => updateTaxRate('profit', tax.id, (parseFloat(e.target.value) || 0) / 100)} className="w-full text-right text-sm font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-1.5 outline-none" />
                                        <span className="pr-2 text-[10px] font-bold text-slate-400 select-none">%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className={`p-3 text-xs flex gap-2 ${data.taxConfig.calculationMode === 'NORMATIVE' ? 'bg-indigo-50 text-indigo-800' : 'bg-amber-50 text-amber-800'}`}>
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
                <div className="xl:col-span-5">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg"><Percent size={20} /></div>
                                <h3 className="font-bold text-slate-800">Encargos Sociais (Folha)</h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</p>
                                <p className="text-3xl font-black text-emerald-600 tracking-tight">{formatPercent(data.taxConfig.socialChargesRate)}</p>
                            </div>
                        </div>

                        <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar flex-1">
                            {groupsConfig.map((group) => {
                                const items = data.taxConfig.chargesBreakdown[group.key as keyof typeof data.taxConfig.chargesBreakdown];
                                const total = getGroupTotal(items);
                                const isExpanded = expandedGroups[group.key];
                                return (
                                    <div key={group.key} className={`border rounded-xl transition-all duration-300 overflow-hidden ${isExpanded ? 'border-slate-300 shadow-md ring-1 ring-slate-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                        <button onClick={() => toggleGroup(group.key)} className={`w-full flex justify-between items-center p-4 focus:outline-none transition-colors ${isExpanded ? 'bg-slate-50/50' : 'bg-white'}`}>
                                            <div className="text-left"><h4 className={`font-bold text-sm ${group.text} flex items-center gap-2`}>{group.title}</h4><p className="text-[11px] text-slate-500 mt-1 font-medium opacity-80">{group.desc}</p></div>
                                            <div className="flex items-center gap-4"><span className={`font-bold ${group.text} ${group.bg} px-3 py-1.5 rounded-lg text-sm border ${group.border}`}>{formatPercent(total)}</span><div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><ChevronDown size={20} className="text-slate-400" /></div></div>
                                        </button>
                                        {isExpanded && (
                                            <div className="bg-white p-2 border-t border-slate-100">
                                                {items.map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group/item transition-colors border border-transparent hover:border-slate-100">
                                                        <input type="text" value={item.name} onChange={(e) => updateComponent(group.key, item.id, 'name', e.target.value)} className="flex-1 text-sm font-medium text-slate-700 bg-transparent border-none focus:ring-0 p-0 placeholder-slate-400" />
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative flex items-center bg-white border border-slate-200 rounded-md shadow-sm w-24"><input type="number" step="0.01" value={(item.value * 100).toFixed(2)} onChange={(e) => updateComponent(group.key, item.id, 'value', (parseFloat(e.target.value) || 0) / 100)} className="w-full text-right text-sm font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-1.5 outline-none" /><span className="pr-2 text-[10px] font-bold text-slate-400 select-none">%</span></div>
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

                {/* RIGHT COLUMN: FINANCIAL IMPACT (3 columns wide) */}
                <div className="xl:col-span-3">
                    <div className="bg-[#0f172a] rounded-xl shadow-xl shadow-slate-900/10 text-white p-6 h-full flex flex-col relative overflow-hidden">
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
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 pl-10 text-2xl font-bold text-white focus:bg-white/10 focus:border-[#fbbf24] outline-none transition-all placeholder-white/20"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="h-px bg-white/10 w-full"></div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3 font-bold">Custo Estimado dos Encargos</p>
                                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10">
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

            </div>
        </div>
    );
};

export default Taxes;
