
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
            <header className="flex justify-between items-center border-b border-slate-200 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                        <Globe size={28} className="text-[#0f172a]" />
                        Configurações Globais do Sistema
                    </h2>
                    <p className="text-slate-500 mt-1">Central de parametrização para novos projetos (Padrões).</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('finance')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'finance' ? 'bg-white shadow text-[#0f172a]' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Parâmetros Financeiros
                    </button>
                    <button
                        onClick={() => setActiveTab('taxes')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'taxes' ? 'bg-white shadow text-[#0f172a]' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Impostos & Encargos
                    </button>
                    <button
                        onClick={() => setActiveTab('accounting')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'accounting' ? 'bg-white shadow text-[#0f172a]' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Plano de Contas
                    </button>
                    <button
                        onClick={() => setActiveTab('kits')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'kits' ? 'bg-white shadow text-[#0f172a]' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Kits & Recursos
                    </button>
                </div>
            </header>

            {/* TAB 1: FINANCIAL PARAMETERS */}
            {activeTab === 'finance' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                            <Landmark size={24} className="text-[#0f172a]" />
                            Taxas Padrão para Novos Projetos
                        </h3>
                        <p className="text-sm text-slate-500 mb-8 max-w-2xl">
                            Estes valores serão carregados automaticamente ao criar uma nova proposta.
                            Eles podem ser ajustados individualmente dentro de cada projeto, mas aqui você define a política global da empresa.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Contingency */}
                            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 relative group">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-white text-orange-600 rounded-lg shadow-sm"><ShieldAlert size={20} /></div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
                                            Contingência
                                            <InfoTooltip text="Margem para riscos e variações de escopo. Padrão sugerido TCU/CREA conforme complexidade do projeto." />
                                        </p>
                                        <p className="text-[10px] text-slate-500">Adicionada ao Custo (Pre-Markup)</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={(globalConfig.contingencyRate * 100).toFixed(2)}
                                        onChange={(e) => updateGlobalParam('contingencyRate', e.target.value)}
                                        className="w-full pl-4 pr-12 py-3 bg-white border border-orange-200 rounded-xl text-2xl font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</div>
                                </div>
                            </div>

                            {/* Financial Cost */}
                            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 relative group">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm"><TrendingUp size={20} /></div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
                                            Custo Financeiro
                                            <InfoTooltip text="Compensação pelo capital de giro e defasagem entre pagamentos e recebimentos (Fluxo de Caixa)." />
                                        </p>
                                        <p className="text-[10px] text-slate-500">Incide na Venda (Gross Up)</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={(globalConfig.financialCostRate * 100).toFixed(2)}
                                        onChange={(e) => updateGlobalParam('financialCostRate', e.target.value)}
                                        className="w-full pl-4 pr-12 py-3 bg-white border border-indigo-200 rounded-xl text-2xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</div>
                                </div>
                            </div>

                            {/* Markup Target */}
                            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 relative group">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-white text-emerald-600 rounded-lg shadow-sm"><TrendingUp size={20} /></div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
                                            Markup Alvo
                                            <InfoTooltip text="Índice multiplicador aplicado sobre o custo direto para formação do preço de venda esperado." />
                                        </p>
                                        <p className="text-[10px] text-slate-500">Margem Comercial</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={(globalConfig.markup * 100).toFixed(2)}
                                        onChange={(e) => updateGlobalParam('markup', e.target.value)}
                                        className="w-full pl-4 pr-12 py-3 bg-white border border-emerald-200 rounded-xl text-2xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: ACCOUNTING */}
            {activeTab === 'accounting' && (
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                            <BookOpen size={24} className="text-[#0f172a]" />
                            Configuração do Plano de Contas (De/Para)
                        </h3>
                        <p className="text-sm text-slate-500 mb-8 max-w-3xl">
                            Mapeie os eventos do sistema para suas contas contábeis reais.
                            Isso permite gerar a DRE e o arquivo de integração contábil com a codificação correta do seu ERP.
                        </p>

                        <div className="space-y-4">
                            <div className="grid grid-cols-12 gap-4 bg-slate-50 p-3 rounded-lg text-xs font-bold text-slate-500 uppercase tracking-wider">
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
                                <div key={item.key} className="grid grid-cols-12 gap-4 items-center p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <div className="col-span-4 font-bold text-slate-700 text-sm">
                                        {item.label}
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            value={accountingConfig[item.key as keyof AccountingMapping]?.code || ''}
                                            onChange={(e) => updateAccount(item.key as keyof AccountingMapping, 'code', e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm font-mono focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-6">
                                        <input
                                            type="text"
                                            value={accountingConfig[item.key as keyof AccountingMapping]?.name || ''}
                                            onChange={(e) => updateAccount(item.key as keyof AccountingMapping, 'name', e.target.value)}
                                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'taxes' ? (
                /* TAXES TAB */
                <div className="bg-slate-50 rounded-xl p-2">
                    <Taxes data={globalConfig} updateData={updateGlobalData} />
                </div>
            ) : activeTab === 'kits' ? (
                /* KITS TAB */
                <div className="flex gap-8 h-[calc(100vh-250px)]">
                    {/* LEFT SIDEBAR: KIT LIST */}
                    <div className="w-80 shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-700 text-sm">Biblioteca de Kits</h3>
                                <p className="text-[10px] text-slate-400">EPIs, Ferramentas, Veículos</p>
                            </div>
                            <button onClick={handleNewKit} className="p-1.5 bg-[#0f172a] text-white rounded hover:bg-[#1e293b] transition-colors"><Plus size={16} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {(globalConfig.kitTemplates || []).map(kit => {
                                const isSelected = selectedKitId === kit.id;
                                return (
                                    <div
                                        key={kit.id}
                                        onClick={() => setSelectedKitId(kit.id)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all group relative ${isSelected ? 'bg-slate-50 border-[#0f172a] ring-1 ring-[#0f172a]' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-md ${isSelected ? 'bg-[#0f172a] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {iconsList.find(i => i.id === kit.icon)?.icon || <Package size={20} />}
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{kit.name}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{kit.items.length} itens</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteKit(kit.id); }}
                                            className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* RIGHT CONTENT: KIT DETAILS */}
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                        {selectedKit ? (
                            <>
                                <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Nome do Kit / Recurso</label>
                                            <input
                                                type="text"
                                                value={selectedKit.name}
                                                onChange={(e) => handleUpdateKitField(selectedKit.id, 'name', e.target.value)}
                                                className="w-full text-2xl font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#0f172a] focus:ring-0 px-0 outline-none"
                                                placeholder="Ex: Kit Ferramentas Mecânica, Caminhonete Padrão..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Ícone</label>
                                            <select
                                                value={selectedKit.icon}
                                                onChange={(e) => handleUpdateKitField(selectedKit.id, 'icon', e.target.value)}
                                                className="bg-white border border-slate-200 rounded-lg p-2 text-sm focus:ring-0 outline-none cursor-pointer"
                                            >
                                                {iconsList.map(icon => (
                                                    <option key={icon.id} value={icon.id}>{icon.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Descrição</label>
                                        <input
                                            type="text"
                                            value={selectedKit.description}
                                            onChange={(e) => handleUpdateKitField(selectedKit.id, 'description', e.target.value)}
                                            className="w-full text-sm text-slate-600 bg-transparent border border-slate-200 rounded-lg px-3 py-2 focus:border-[#0f172a] focus:ring-0 outline-none"
                                            placeholder="Descreva o que este kit contém..."
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                            <Box size={16} /> Itens do Kit
                                        </h4>
                                        <button
                                            onClick={() => handleAddItemToKit(selectedKit.id)}
                                            className="text-xs bg-[#0f172a] text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 hover:bg-[#1e293b]"
                                        >
                                            <Plus size={14} /> Adicionar Item
                                        </button>
                                    </div>

                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3">Item / Produto</th>
                                                <th className="px-4 py-3 w-32">Categoria</th>
                                                <th className="px-4 py-3 w-28">Valor Unit.</th>
                                                <th className="px-4 py-3 w-24">Vida Útil</th>
                                                <th className="px-4 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedKit.items.map(item => (
                                                <tr key={item.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="text"
                                                            value={item.name}
                                                            onChange={e => handleUpdateItem(selectedKit.id, item.id, 'name', e.target.value)}
                                                            className="w-full bg-transparent border-none text-slate-700 font-medium focus:ring-0 p-0 placeholder-slate-300"
                                                            placeholder="Nome do item"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <select
                                                            value={item.category}
                                                            onChange={e => handleUpdateItem(selectedKit.id, item.id, 'category', e.target.value)}
                                                            className="w-full bg-transparent border-none text-xs text-slate-600 p-0 focus:ring-0 cursor-pointer"
                                                        >
                                                            <option value="EPI">EPI</option>
                                                            <option value="Tools">Ferramentas</option>
                                                            <option value="Vehicles">Veículos</option>
                                                            <option value="Consumables">Consumíveis</option>
                                                            <option value="IT">TI</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-slate-400">R$</span>
                                                            <input
                                                                type="number"
                                                                value={item.unitPrice}
                                                                onChange={e => handleUpdateItem(selectedKit.id, item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                                className="w-full bg-transparent border-none text-slate-700 font-bold focus:ring-0 p-0 text-right"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                value={item.lifespan}
                                                                onChange={e => handleUpdateItem(selectedKit.id, item.id, 'lifespan', parseInt(e.target.value))}
                                                                className="w-full bg-transparent border-none text-slate-700 font-bold focus:ring-0 p-0 text-center"
                                                            />
                                                            <span className="text-[10px] text-slate-400">mês</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <button onClick={() => handleRemoveItem(selectedKit.id, item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {selectedKit.items.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="py-8 text-center text-slate-400 italic text-xs">Nenhum item adicionado a este kit.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>

                                    <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
                                        <div className="text-blue-500 mt-0.5"><Info size={16} /></div>
                                        <p className="text-xs text-blue-700 leading-relaxed">
                                            <strong>Nota:</strong> As alterações feitas aqui serão salvas automaticamente nos Padrões Globais.
                                            Elas não afetam propostas que já utilizaram este kit anteriormente (os itens são copiados).
                                        </p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                                <Package size={64} className="mb-4 opacity-50" />
                                <p className="font-bold text-slate-400">Selecione ou crie um Kit para editar</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default GlobalSettings;
