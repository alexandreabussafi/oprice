
import React, { useState } from 'react';
import { ProposalData, SpotResource, SpotExpense } from '../types';
import { formatCurrency } from '../utils/pricingEngine';
import { Zap, Users, Plane, CheckSquare, Plus, Trash2, Shield, Search, Briefcase } from 'lucide-react';

interface SpotEditorProps {
    data: ProposalData;
    updateData: (newData: Partial<ProposalData>) => void;
}

const SpotEditor: React.FC<SpotEditorProps> = ({ data, updateData }) => {
    const [activeSection, setActiveSection] = useState<'scope' | 'resources' | 'expenses'>('scope');

    // --- SERVICE TYPES (Cards) ---
    const serviceTypes = [
        { id: 'plan', label: 'Plano de Lubrificação', description: 'Mapeamento de pontos, definição de lubrificantes e frequências.', icon: Briefcase },
        { id: 'rationalization', label: 'Racionalização', description: 'Otimização de itens de estoque e consolidação de fornecedores.', icon: Search },
        { id: 'shielding', label: 'Blindagem de Máquinas', description: 'Proteção contra contaminantes e instalação de respiradores.', icon: Shield },
        { id: 'audit', label: 'Auditoria de Processos', description: 'Verificação de conformidade com melhores práticas.', icon: CheckSquare },
    ];

    // --- RESOURCE TEMPLATES ---
    const resourceTemplates = [
        { role: 'Consultor Sênior', rate: 2500 },
        { role: 'Engenheiro de Confiabilidade', rate: 1800 },
        { role: 'Técnico Especialista', rate: 1200 },
        { role: 'Assistente Técnico', rate: 600 },
    ];

    // --- EXPENSE CATEGORIES ---
    const expenseCategories = [
        { id: 'Travel', label: 'Passagens Aéreas' },
        { id: 'Lodging', label: 'Hospedagem' },
        { id: 'Meals', label: 'Alimentação' },
        { id: 'Materials', label: 'Materiais de Consumo' },
        { id: 'Other', label: 'Outros' },
    ];

    // --- HANDLERS ---

    const toggleService = (id: string) => {
        const current = data.spotServiceIds || [];
        const updated = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
        updateData({ spotServiceIds: updated });
    };

    const addResource = (role: string, rate: number) => {
        const newRes: SpotResource = {
            id: Math.random().toString(36).substr(2, 9),
            roleName: role,
            dailyRateCost: rate,
            days: 5,
            quantity: 1
        };
        updateData({ spotResources: [...(data.spotResources || []), newRes] });
    };

    const updateResource = (id: string, field: keyof SpotResource, value: any) => {
        const updated = (data.spotResources || []).map(r => r.id === id ? { ...r, [field]: value } : r);
        updateData({ spotResources: updated });
    };

    const removeResource = (id: string) => {
        updateData({ spotResources: (data.spotResources || []).filter(r => r.id !== id) });
    };

    const addExpense = () => {
        const newExp: SpotExpense = {
            id: Math.random().toString(36).substr(2, 9),
            description: 'Nova Despesa',
            category: 'Travel',
            quantity: 1,
            unitCost: 0
        };
        updateData({ spotExpenses: [...(data.spotExpenses || []), newExp] });
    };

    const updateExpense = (id: string, field: keyof SpotExpense, value: any) => {
        const updated = (data.spotExpenses || []).map(e => e.id === id ? { ...e, [field]: value } : e);
        updateData({ spotExpenses: updated });
    };

    const removeExpense = (id: string) => {
        updateData({ spotExpenses: (data.spotExpenses || []).filter(e => e.id !== id) });
    };

    // Calculations
    const totalLabor = (data.spotResources || []).reduce((acc, r) => acc + (r.dailyRateCost * r.days * r.quantity), 0);
    const totalExpenses = (data.spotExpenses || []).reduce((acc, e) => acc + (e.unitCost * e.quantity), 0);

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
            <header className="flex justify-between items-end border-b border-slate-200 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                        <Zap size={28} className="text-amber-500" />
                        Definição Spot
                    </h2>
                    <p className="text-slate-500 mt-1">Configuração simplificada para projetos de consultoria e serviços pontuais.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT: MAIN EDITOR */}
                <div className="lg:col-span-8 space-y-8">

                    {/* SECTION 1: SCOPE */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <CheckSquare size={20} className="text-blue-600" />
                            1. Escopo do Serviço
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {serviceTypes.map(svc => {
                                const isSelected = (data.spotServiceIds || []).includes(svc.id);
                                const Icon = svc.icon;
                                return (
                                    <div
                                        key={svc.id}
                                        onClick={() => toggleService(svc.id)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-4 ${isSelected ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                                    >
                                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            <Icon size={24} />
                                        </div>
                                        <div>
                                            <h4 className={`font-bold ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{svc.label}</h4>
                                            <p className="text-xs text-slate-500 mt-1">{svc.description}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* SECTION 2: RESOURCES */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Users size={20} className="text-emerald-600" />
                                2. Recursos e Diárias
                            </h3>
                            <div className="flex gap-2">
                                {resourceTemplates.map(tmpl => (
                                    <button key={tmpl.role} onClick={() => addResource(tmpl.role, tmpl.rate)} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded border border-slate-200 transition-colors">
                                        + {tmpl.role}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-4 bg-slate-50 p-2 rounded text-[10px] font-bold text-slate-500 uppercase">
                                <div className="col-span-4">Profissional</div>
                                <div className="col-span-2 text-right">Custo Diária</div>
                                <div className="col-span-2 text-center">Dias</div>
                                <div className="col-span-2 text-center">Qtd Pessoas</div>
                                <div className="col-span-2 text-right">Subtotal</div>
                            </div>
                            {(data.spotResources || []).map(res => (
                                <div key={res.id} className="grid grid-cols-12 gap-4 items-center p-2 border-b border-slate-100">
                                    <div className="col-span-4">
                                        <input type="text" value={res.roleName} onChange={e => updateResource(res.id, 'roleName', e.target.value)} className="w-full font-bold text-sm text-slate-700 bg-transparent border-none p-0 focus:ring-0" />
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <input type="number" value={res.dailyRateCost} onChange={e => updateResource(res.id, 'dailyRateCost', parseFloat(e.target.value) || 0)} className="w-full text-right text-sm text-slate-600 bg-transparent border-none p-0 focus:ring-0" />
                                    </div>
                                    <div className="col-span-2">
                                        <input type="number" value={res.days} onChange={e => updateResource(res.id, 'days', parseFloat(e.target.value) || 0)} className="w-full text-center font-bold text-sm bg-slate-50 rounded border border-slate-200 py-1" />
                                    </div>
                                    <div className="col-span-2">
                                        <input type="number" value={res.quantity} onChange={e => updateResource(res.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-full text-center font-bold text-sm bg-slate-50 rounded border border-slate-200 py-1" />
                                    </div>
                                    <div className="col-span-2 flex justify-end items-center gap-2">
                                        <span className="font-bold text-slate-800 text-sm">{formatCurrency(res.dailyRateCost * res.days * res.quantity)}</span>
                                        <button onClick={() => removeResource(res.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                            {(data.spotResources || []).length === 0 && (
                                <div className="text-center py-4 text-slate-400 text-xs italic">Nenhum recurso alocado.</div>
                            )}
                        </div>
                    </div>

                    {/* SECTION 3: EXPENSES */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Plane size={20} className="text-amber-600" />
                                3. Logística e Despesas
                            </h3>
                            <button onClick={addExpense} className="flex items-center gap-1 text-xs font-bold bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
                                <Plus size={14} /> Adicionar Item
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-4 bg-slate-50 p-2 rounded text-[10px] font-bold text-slate-500 uppercase">
                                <div className="col-span-4">Descrição</div>
                                <div className="col-span-3">Categoria</div>
                                <div className="col-span-2 text-center">Qtd</div>
                                <div className="col-span-2 text-right">Valor Unit.</div>
                                <div className="col-span-1"></div>
                            </div>
                            {(data.spotExpenses || []).map(exp => (
                                <div key={exp.id} className="grid grid-cols-12 gap-4 items-center p-2 border-b border-slate-100">
                                    <div className="col-span-4">
                                        <input type="text" value={exp.description} onChange={e => updateExpense(exp.id, 'description', e.target.value)} className="w-full font-bold text-sm text-slate-700 bg-transparent border-none p-0 focus:ring-0" placeholder="Ex: Voo SP-RJ" />
                                    </div>
                                    <div className="col-span-3">
                                        <select value={exp.category} onChange={e => updateExpense(exp.id, 'category', e.target.value)} className="w-full text-xs bg-transparent border-none p-0 focus:ring-0 cursor-pointer">
                                            {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <input type="number" value={exp.quantity} onChange={e => updateExpense(exp.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-full text-center font-bold text-sm bg-slate-50 rounded border border-slate-200 py-1" />
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <input type="number" value={exp.unitCost} onChange={e => updateExpense(exp.id, 'unitCost', parseFloat(e.target.value) || 0)} className="w-full text-right text-sm text-slate-600 bg-transparent border-none p-0 focus:ring-0" />
                                    </div>
                                    <div className="col-span-1 text-center">
                                        <button onClick={() => removeExpense(exp.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* RIGHT: SUMMARY */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#0f172a] rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Custo Total (Direto)</p>
                            <h3 className="text-3xl font-bold text-[#fbbf24] mb-4">{formatCurrency(totalLabor + totalExpenses)}</h3>

                            <div className="h-px bg-white/10 w-full mb-4"></div>

                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-400">Mão de Obra</span>
                                <span className="font-bold">{formatCurrency(totalLabor)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Despesas</span>
                                <span className="font-bold">{formatCurrency(totalExpenses)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h4 className="font-bold text-slate-800 text-sm mb-4">Resumo do Projeto</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Dias Estimados</span>
                                <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                    {Math.max(...(data.spotResources || []).map(r => r.days), 0)} dias
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Equipe</span>
                                <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                    {(data.spotResources || []).reduce((acc, r) => acc + r.quantity, 0)} pessoas
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SpotEditor;
