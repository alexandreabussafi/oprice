
import React, { useState } from 'react';
import { ProposalData, KitTemplate, KitItemTemplate, ExpenseItem, AccountingMapping, AccountingAccount } from '../types';
import Taxes from './Taxes'; // Reusing the Taxes component logic for global settings
import { Globe, Save, Package, Plus, Trash2, Edit2, Check, X, Box, Info, ShieldAlert, TrendingUp, Landmark, Wrench, Truck, Monitor, HardHat, Wand2, BookOpen, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/pricingEngine';
import InfoTooltip from '../components/InfoTooltip';

interface GlobalSettingsProps {
    globalConfig: ProposalData; // Using ProposalData structure to hold global configs
    setGlobalConfig: (config: ProposalData) => void;
}

const GlobalSettings: React.FC<GlobalSettingsProps> = ({ globalConfig, setGlobalConfig }) => {
    const [activeTab, setActiveTab] = useState<'taxes' | 'kits' | 'finance' | 'accounting'>('finance');

    // --- KITS MANAGER STATE ---
    const [selectedKitId, setSelectedKitId] = useState<string | null>(null);

    const selectedKit = globalConfig.kitTemplates?.find(k => k.id === selectedKitId);

    // Wrapper to match Taxes component signature
    const updateGlobalData = (newData: Partial<ProposalData>) => {
        setGlobalConfig({ ...globalConfig, ...newData });
    };

    const updateGlobalParam = (field: keyof ProposalData, value: string) => {
        setGlobalConfig({ ...globalConfig, [field]: (parseFloat(value) || 0) / 100 });
    };

    // --- ACCOUNTING CONFIG ---
    const defaultAccounting: AccountingMapping = {
        revenueAccount: { code: '3.1.01', name: 'Receita Bruta de Serviços', type: 'CREDIT' },
        deductionTaxesAccount: { code: '3.2.01', name: 'Deduções s/ Venda (Impostos)', type: 'DEBIT' },
        directLaborAccount: { code: '4.1.01', name: 'Salários e Ordenados', type: 'DEBIT' },
        laborChargesAccount: { code: '4.1.02', name: 'Encargos Sociais', type: 'DEBIT' },
        laborProvisionsAccount: { code: '4.1.03', name: 'Provisões Trabalhistas', type: 'DEBIT' },
        operationalCostsAccount: { code: '4.2.01', name: 'Materiais e EPIs', type: 'DEBIT' },
        safetyCostsAccount: { code: '4.2.02', name: 'Treinamentos e SMS', type: 'DEBIT' },
        supportCostsAccount: { code: '4.3.01', name: 'Despesas de Viagem e Suporte', type: 'DEBIT' },
        marginAccount: { code: '5.1.01', name: 'Lucro do Exercício', type: 'CREDIT' },
        financialResultAccount: { code: '5.2.01', name: 'Despesas Financeiras', type: 'DEBIT' },
    };

    const accountingConfig = globalConfig.accountingConfig || defaultAccounting;

    const updateAccount = (key: keyof AccountingMapping, field: keyof AccountingAccount, value: string) => {
        const newConfig = {
            ...accountingConfig,
            [key]: {
                ...accountingConfig[key],
                [field]: value
            }
        };
        setGlobalConfig({ ...globalConfig, accountingConfig: newConfig });
    };

    // --- CRUD OPERATIONS FOR KITS ---

    const handleNewKit = () => {
        const newId = Math.random().toString(36).substr(2, 9);
        const newKit: KitTemplate = {
            id: newId,
            name: 'Novo Kit',
            description: '',
            icon: 'Package',
            items: []
        };
        setGlobalConfig({
            ...globalConfig,
            kitTemplates: [...(globalConfig.kitTemplates || []), newKit]
        });
        setSelectedKitId(newId);
    };

    const handleDeleteKit = (id: string) => {
        if (window.confirm('Tem certeza? Isso removerá o kit das opções disponíveis.')) {
            setGlobalConfig({
                ...globalConfig,
                kitTemplates: (globalConfig.kitTemplates || []).filter(k => k.id !== id)
            });
            if (selectedKitId === id) setSelectedKitId(null);
        }
    };

    const handleUpdateKitField = (id: string, field: keyof KitTemplate, value: any) => {
        setGlobalConfig({
            ...globalConfig,
            kitTemplates: (globalConfig.kitTemplates || []).map(k => k.id === id ? { ...k, [field]: value } : k)
        });
    };

    // --- CRUD OPERATIONS FOR ITEMS INSIDE KIT ---
    const handleAddItemToKit = (kitId: string) => {
        const newItem: KitItemTemplate = {
            id: Math.random().toString(36).substr(2, 9),
            name: 'Novo Item',
            unitPrice: 0,
            lifespan: 12,
            category: 'EPI'
        };
        const updatedKits = (globalConfig.kitTemplates || []).map(k => {
            if (k.id === kitId) {
                return { ...k, items: [...k.items, newItem] };
            }
            return k;
        });
        setGlobalConfig({ ...globalConfig, kitTemplates: updatedKits });
    };

    const handleUpdateItem = (kitId: string, itemId: string, field: keyof KitItemTemplate, value: any) => {
        const updatedKits = (globalConfig.kitTemplates || []).map(k => {
            if (k.id === kitId) {
                return {
                    ...k,
                    items: k.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
                };
            }
            return k;
        });
        setGlobalConfig({ ...globalConfig, kitTemplates: updatedKits });
    };

    const handleRemoveItem = (kitId: string, itemId: string) => {
        const updatedKits = (globalConfig.kitTemplates || []).map(k => {
            if (k.id === kitId) {
                return {
                    ...k,
                    items: k.items.filter(i => i.id !== itemId)
                };
            }
            return k;
        });
        setGlobalConfig({ ...globalConfig, kitTemplates: updatedKits });
    };

    const iconsList = [
        { id: 'HardHat', label: 'EPI / Segurança', icon: <HardHat size={18} /> },
        { id: 'Wrench', label: 'Ferramentas', icon: <Wrench size={18} /> },
        { id: 'Truck', label: 'Veículos', icon: <Truck size={18} /> },
        { id: 'Monitor', label: 'TI / Tecnologia', icon: <Monitor size={18} /> },
        { id: 'TrendingUp', label: 'Financeiro', icon: <TrendingUp size={18} /> },
        { id: 'Package', label: 'Geral', icon: <Package size={18} /> },
    ];

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
            <header className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-6 transition-colors">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 transition-colors">
                        <Globe size={28} className="text-[#0f172a] dark:text-indigo-500" />
                        Configurações Globais do Sistema
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors">Central de parametrização para novos projetos (Padrões).</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg transition-colors">
                    <button
                        onClick={() => setActiveTab('finance')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'finance' ? 'bg-white dark:bg-slate-900 shadow text-[#0f172a] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Parâmetros Financeiros
                    </button>
                    <button
                        onClick={() => setActiveTab('taxes')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'taxes' ? 'bg-white dark:bg-slate-900 shadow text-[#0f172a] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Impostos & Encargos
                    </button>
                    <button
                        onClick={() => setActiveTab('accounting')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'accounting' ? 'bg-white dark:bg-slate-900 shadow text-[#0f172a] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Plano de Contas
                    </button>
                    <button
                        onClick={() => setActiveTab('kits')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'kits' ? 'bg-white dark:bg-slate-900 shadow text-[#0f172a] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Kits & Recursos
                    </button>
                </div>
            </header>

            {/* TAB 1: FINANCIAL PARAMETERS */}
            {activeTab === 'finance' && (
                <div className="max-w-4xl mx-auto space-y-6 transition-colors">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-6 flex items-center gap-2 transition-colors">
                            <Landmark size={24} className="text-[#0f172a] dark:text-indigo-500" />
                            Taxas Padrão para Novos Projetos
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-2xl transition-colors">
                            Estes valores serão carregados automaticamente ao criar uma nova proposta.
                            Eles podem ser ajustados individualmente dentro de cada projeto, mas aqui você define a política global da empresa.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Contingency */}
                            <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-xl border border-orange-100 dark:border-orange-800/50 relative group transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 rounded-lg shadow-sm transition-colors"><ShieldAlert size={20} /></div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1 transition-colors">
                                            Contingência
                                            <InfoTooltip text="Margem para riscos e variações de escopo. Padrão sugerido TCU/CREA conforme complexidade do projeto." />
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 transition-colors">Adicionada ao Custo (Pre-Markup)</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={(globalConfig.contingencyRate * 100).toFixed(2)}
                                        onChange={(e) => updateGlobalParam('contingencyRate', e.target.value)}
                                        className="w-full pl-4 pr-12 py-3 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-800 rounded-xl text-2xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500 transition-colors">%</div>
                                </div>
                            </div>

                            {/* Financial Cost */}
                            <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800/50 relative group transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg shadow-sm transition-colors"><TrendingUp size={20} /></div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1 transition-colors">
                                            Custo Financeiro
                                            <InfoTooltip text="Compensação pelo capital de giro e defasagem entre pagamentos e recebimentos (Fluxo de Caixa)." />
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 transition-colors">Incide na Venda (Gross Up)</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={(globalConfig.financialCostRate * 100).toFixed(2)}
                                        onChange={(e) => updateGlobalParam('financialCostRate', e.target.value)}
                                        className="w-full pl-4 pr-12 py-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl text-2xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500 transition-colors">%</div>
                                </div>
                            </div>

                            {/* Markup Target */}
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-xl border border-emerald-100 dark:border-emerald-800/50 relative group transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 rounded-lg shadow-sm transition-colors"><TrendingUp size={20} /></div>
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1 transition-colors">
                                            Markup Alvo
                                            <InfoTooltip text="Índice multiplicador aplicado sobre o custo direto para formation do preço de venda esperado." />
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 transition-colors">Margem Comercial</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={(globalConfig.markup * 100).toFixed(2)}
                                        onChange={(e) => updateGlobalParam('markup', e.target.value)}
                                        className="w-full pl-4 pr-12 py-3 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-xl text-2xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500 transition-colors">%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: ACCOUNTING */}
            {activeTab === 'accounting' && (
                <div className="max-w-5xl mx-auto space-y-6 transition-colors">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-6 flex items-center gap-2 transition-colors">
                            <BookOpen size={24} className="text-[#0f172a] dark:text-indigo-500" />
                            Configuração do Plano de Contas (De/Para)
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-3xl transition-colors">
                            Mapeie os eventos do sistema para suas contas contábeis reais.
                            Isso permite gerar a DRE e o arquivo de integração contábil com a codificação correta do seu ERP.
                        </p>

                        <div className="space-y-4">
                            <div className="grid grid-cols-12 gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">
                                <div className="col-span-4">Evento do Sistema</div>
                                <div className="col-span-2">Código Contábil</div>
                                <div className="col-span-6">Descrição da Conta (Razão)</div>
                            </div>

                            {[
                                { key: 'revenueAccount', label: 'Receita Bruta (Faturamento)' },
                                { key: 'deductionTaxesAccount', label: 'Impostos s/ Venda (Deduções)' },
                                { key: 'directLaborAccount', label: 'Mão de Obra (Salários)' },
                                { key: 'laborChargesAccount', label: 'Encargos Sociais' },
                                { key: 'laborProvisionsAccount', label: 'Provisões (Férias/13º)' },
                                { key: 'operationalCostsAccount', label: 'Custos Operacionais (Materiais)' },
                                { key: 'safetyCostsAccount', label: 'Despesas com Segurança (SMS)' },
                                { key: 'supportCostsAccount', label: 'Overhead / Suporte' },
                                { key: 'financialResultAccount', label: 'Despesas Financeiras' },
                            ].map((item) => (
                                <div key={item.key} className="grid grid-cols-12 gap-4 items-center p-3 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <div className="col-span-4 font-bold text-slate-700 dark:text-slate-200 text-sm">
                                        {item.label}
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            value={accountingConfig[item.key as keyof AccountingMapping]?.code || ''}
                                            onChange={(e) => updateAccount(item.key as keyof AccountingMapping, 'code', e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-sm font-mono text-slate-800 dark:text-slate-200 focus:border-indigo-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="col-span-6">
                                        <input
                                            type="text"
                                            value={accountingConfig[item.key as keyof AccountingMapping]?.name || ''}
                                            onChange={(e) => updateAccount(item.key as keyof AccountingMapping, 'name', e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-sm text-slate-800 dark:text-slate-200 focus:border-indigo-500 outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: TAXES & CHARGES */}
            {activeTab === 'taxes' ? (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-2 transition-colors">
                    <Taxes data={globalConfig} updateData={updateGlobalData} />
                </div>
            ) : activeTab === 'kits' ? (
                /* KITS TAB */
                <div className="flex gap-8 h-[calc(100vh-250px)] transition-colors">
                    {/* LEFT SIDEBAR: KIT LIST */}
                    <div className="w-80 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden transition-colors">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center transition-colors">
                            <div>
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Biblioteca de Kits</h3>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">EPIs, Ferramentas, Veículos</p>
                            </div>
                            <button onClick={handleNewKit} className="p-1.5 bg-[#0f172a] dark:bg-indigo-600 text-white rounded hover:bg-[#1e293b] dark:hover:bg-indigo-700 transition-colors"><Plus size={16} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {(globalConfig.kitTemplates || []).map(kit => {
                                const isSelected = selectedKitId === kit.id;
                                return (
                                    <div
                                        key={kit.id}
                                        onClick={() => setSelectedKitId(kit.id)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all group relative ${isSelected ? 'bg-slate-50 dark:bg-slate-800 border-[#0f172a] dark:border-indigo-500 ring-1 ring-[#0f172a] dark:ring-indigo-500' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-md transition-colors ${isSelected ? 'bg-[#0f172a] dark:bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                {iconsList.find(i => i.id === kit.icon)?.icon || <Package size={20} />}
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm transition-colors ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{kit.name}</p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 transition-colors">{kit.items.length} itens</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteKit(kit.id); }}
                                            className="absolute top-2 right-2 p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* RIGHT CONTENT: KIT DETAILS */}
                    <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden transition-colors">
                        {selectedKit ? (
                            <>
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 transition-colors">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block transition-colors">Nome do Kit / Recurso</label>
                                            <input
                                                type="text"
                                                value={selectedKit.name}
                                                onChange={(e) => handleUpdateKitField(selectedKit.id, 'name', e.target.value)}
                                                className="w-full text-2xl font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-[#0f172a] dark:focus:border-indigo-500 focus:ring-0 px-0 outline-none transition-all placeholder-slate-300 dark:placeholder-slate-700"
                                                placeholder="Ex: Kit Ferramentas Mecânica, Caminhonete Padrão..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block transition-colors">Ícone</label>
                                            <select
                                                value={selectedKit.icon}
                                                onChange={(e) => handleUpdateKitField(selectedKit.id, 'icon', e.target.value)}
                                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg p-2 text-sm focus:ring-0 outline-none cursor-pointer transition-colors"
                                            >
                                                {iconsList.map(icon => (
                                                    <option key={icon.id} value={icon.id}>{icon.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block transition-colors">Descrição</label>
                                        <input
                                            type="text"
                                            value={selectedKit.description}
                                            onChange={(e) => handleUpdateKitField(selectedKit.id, 'description', e.target.value)}
                                            className="w-full text-sm text-slate-600 dark:text-slate-400 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:border-[#0f172a] dark:focus:border-indigo-500 focus:ring-0 outline-none transition-colors"
                                            placeholder="Descreva o que este kit contém..."
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 transition-colors">
                                    <div className="flex justify-between items-center mb-4 transition-colors">
                                        <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2 transition-colors">
                                            <Box size={16} /> Itens do Kit
                                        </h4>
                                        <button
                                            onClick={() => handleAddItemToKit(selectedKit.id)}
                                            className="text-xs bg-[#0f172a] dark:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 hover:bg-[#1e293b] dark:hover:bg-indigo-700 transition-colors"
                                        >
                                            <Plus size={14} /> Adicionar Item
                                        </button>
                                    </div>

                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 transition-colors">
                                            <tr>
                                                <th className="px-4 py-3">Item / Produto</th>
                                                <th className="px-4 py-3 w-32">Categoria</th>
                                                <th className="px-4 py-3 w-28">Valor Unit.</th>
                                                <th className="px-4 py-3 w-24">Vida Útil</th>
                                                <th className="px-4 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                                            {selectedKit.items.map(item => (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="text"
                                                            value={item.name}
                                                            onChange={e => handleUpdateItem(selectedKit.id, item.id, 'name', e.target.value)}
                                                            className="w-full bg-transparent border-none text-slate-700 dark:text-slate-200 font-medium focus:ring-0 p-0 placeholder-slate-300 dark:placeholder-slate-600 transition-colors"
                                                            placeholder="Nome do item"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <select
                                                            value={item.category}
                                                            onChange={e => handleUpdateItem(selectedKit.id, item.id, 'category', e.target.value)}
                                                            className="w-full bg-transparent border-none text-xs text-slate-600 dark:text-slate-400 p-0 focus:ring-0 cursor-pointer transition-colors"
                                                        >
                                                            <option value="EPI" className="bg-white dark:bg-slate-900 border-none">EPI</option>
                                                            <option value="Tools" className="bg-white dark:bg-slate-900 border-none">Ferramentas</option>
                                                            <option value="Vehicles" className="bg-white dark:bg-slate-900 border-none">Veículos</option>
                                                            <option value="Consumables" className="bg-white dark:bg-slate-900 border-none">Consumíveis</option>
                                                            <option value="IT" className="bg-white dark:bg-slate-900 border-none">TI</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center gap-1 transition-colors">
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 transition-colors">R$</span>
                                                            <input
                                                                type="number"
                                                                value={item.unitPrice}
                                                                onChange={e => handleUpdateItem(selectedKit.id, item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                                className="w-full bg-transparent border-none text-slate-700 dark:text-slate-200 font-bold focus:ring-0 p-0 text-right transition-colors"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center gap-1 transition-colors">
                                                            <input
                                                                type="number"
                                                                value={item.lifespan}
                                                                onChange={e => handleUpdateItem(selectedKit.id, item.id, 'lifespan', parseInt(e.target.value))}
                                                                className="w-full bg-transparent border-none text-slate-700 dark:text-slate-200 font-bold focus:ring-0 p-0 text-center transition-colors"
                                                            />
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 transition-colors">mês</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <button onClick={() => handleRemoveItem(selectedKit.id, item.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {selectedKit.items.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500 italic text-xs transition-colors">Nenhum item adicionado a este kit.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>

                                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-lg flex items-start gap-2 transition-colors">
                                        <div className="text-blue-500 dark:text-blue-400 mt-0.5 transition-colors"><Info size={16} /></div>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed transition-colors">
                                            <strong>Nota:</strong> As alterações feitas aqui serão salvas automaticamente nos Padrões Globais.
                                            Elas não afetam propostas que já utilizaram este kit anteriormente (os itens são copiados).
                                        </p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 transition-colors">
                                <Package size={64} className="mb-4 opacity-50" />
                                <p className="font-bold text-slate-400 dark:text-slate-500 transition-colors">Selecione ou crie um Kit para editar</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default GlobalSettings;
