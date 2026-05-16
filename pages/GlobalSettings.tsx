
import React, { useEffect, useState } from 'react';
import { ProposalData, KitTemplate, KitItemTemplate, AccountingMapping, AccountingAccount, defaultAccounting, AppRole, BusinessUnitAccess, TenantMember, ProposalTemplateConfig, ProposalTemplateKind } from '../types';
import Taxes from './Taxes'; // Reusing the Taxes component logic for global settings
import { Settings, Package, Plus, Trash2, Box, Info, ShieldAlert, TrendingUp, Landmark, Wrench, Truck, Monitor, HardHat, BookOpen, Palette, Image as ImageIcon, Loader2, Users, UserPlus, Shield, Save, X, Edit2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import InfoTooltip from '../components/InfoTooltip';
import { useTenant } from '../contexts/TenantContext';
import { mergeProposalTemplates, PROPOSAL_TEMPLATE_KINDS, PROPOSAL_TEMPLATE_LABELS } from '../utils/proposalTemplates';
import { PageHeader, PageShell } from '../components/ui';

interface GlobalSettingsProps {
    globalConfig: ProposalData; // Using ProposalData structure to hold global configs
    setGlobalConfig: (config: ProposalData) => void;
}

const GlobalSettings: React.FC<GlobalSettingsProps> = ({ globalConfig, setGlobalConfig }) => {
    const [mainGroup, setMainGroup] = useState<'gerais' | 'servicos' | 'produtos' | 'propostas' | 'usuarios'>('gerais');
    const [activeTab, setActiveTab] = useState<'finance' | 'taxes' | 'accounting' | 'letterhead' | 'kits' | 'products' | 'product_layout' | 'proposal_templates' | 'user_list'>('finance');
    const { activeTenant, activeTenantId, tenantMembers, refreshTenantMembers, createPlatformUser, updateTenantUser, removeUserFromTenant } = useTenant();

    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [editingUser, setEditingUser] = useState<TenantMember | null>(null);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [showNewUserPassword, setShowNewUserPassword] = useState(false);
    const [newUserRole, setNewUserRole] = useState<AppRole>('SELLER');
    const [newUserServices, setNewUserServices] = useState(false);
    const [newUserProducts, setNewUserProducts] = useState(false);
    // --- KITS MANAGER STATE ---
    const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
    const [selectedTemplateKind, setSelectedTemplateKind] = useState<ProposalTemplateKind>('SAAS_SUBSCRIPTION');

    const selectedKit = globalConfig.kitTemplates?.find(k => k.id === selectedKitId);
    const proposalTemplates = mergeProposalTemplates(globalConfig.proposalTemplates, globalConfig.letterheadConfig?.companyName);
    const selectedProposalTemplate = proposalTemplates[selectedTemplateKind];

    // Wrapper to match Taxes component signature
    const updateGlobalData = (newData: Partial<ProposalData>) => {
        setGlobalConfig({ ...globalConfig, ...newData });
    };

    const updateGlobalParam = (field: keyof ProposalData, value: string) => {
        setGlobalConfig({ ...globalConfig, [field]: (parseFloat(value) || 0) / 100 });
    };


    const accountingConfig = globalConfig.accountingConfig || defaultAccounting;
    const productAccountingConfig = globalConfig.productAccountingConfig || defaultAccounting;

    const updateAccount = (isProduct: boolean, key: keyof AccountingMapping, field: keyof AccountingAccount, value: string) => {
        const base = isProduct ? productAccountingConfig : accountingConfig;
        const newConfig = {
            ...base,
            [key]: {
                ...base[key],
                [field]: value
            }
        };
        setGlobalConfig({
            ...globalConfig,
            [isProduct ? 'productAccountingConfig' : 'accountingConfig']: newConfig
        });
    };

    const updateProposalTemplate = (field: keyof ProposalTemplateConfig, value: string) => {
        setGlobalConfig({
            ...globalConfig,
            proposalTemplates: {
                ...proposalTemplates,
                [selectedTemplateKind]: {
                    ...selectedProposalTemplate,
                    [field]: value,
                    kind: selectedTemplateKind
                }
            }
        });
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

    // --- LOGO UPLOADER COMPONENT ---
    const LogoUploader: React.FC<{
        label: string;
        currentUrl?: string;
        onUpload: (url: string) => void;
        aspectRatio?: string;
        tip?: string;
    }> = ({ label, currentUrl, onUpload, aspectRatio = "vazio", tip }) => {
        const [isUploading, setIsUploading] = useState(false);

        const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setIsUploading(true);
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `logos/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('logos')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('logos')
                    .getPublicUrl(filePath);

                onUpload(publicUrl);
            } catch (error: any) {
                console.error('Error uploading logo:', error);
                alert('Erro ao fazer upload. Verifique se o bucket "logos" existe no Supabase e é público.\nDetalhes: ' + error.message);
            } finally {
                setIsUploading(false);
            }
        };

        return (
            <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    {label}
                </label>
                <div className="relative group">
                    <div className={`w-full h-32 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col items-center justify-center transition-all group-hover:border-indigo-400/50`}>
                        {currentUrl ? (
                            <div className="relative w-full h-full flex items-center justify-center p-2">
                                <img src={currentUrl} alt={label} className="max-w-full max-h-full object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <button
                                        onClick={() => onUpload('')}
                                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                        title="Remover Imagem"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
                                {isUploading ? (
                                    <Loader2 size={24} className="animate-spin text-indigo-500" />
                                ) : (
                                    <>
                                        <ImageIcon size={24} className="mb-2 opacity-50" />
                                        <span className="text-[10px] font-medium tracking-tight">SOLTE OU CLIQUE AQUI</span>
                                    </>
                                )}
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={isUploading}
                            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                    </div>
                </div>
                {tip && <p className="text-[9px] text-slate-400 italic mt-1 leading-tight">{tip}</p>}
        </div>
    );
};

    const roleOptions: AppRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'ANALYST'];

    const refreshUsers = async () => {
        if (!activeTenantId) return;
        setLoadingProfiles(true);
        try {
            await refreshTenantMembers(activeTenantId);
        } catch (error: any) {
            console.error('Error fetching tenant users:', error);
            alert('Erro ao carregar usuários: ' + error.message);
        } finally {
            setLoadingProfiles(false);
        }
    };

    useEffect(() => {
        if (mainGroup === 'usuarios' && activeTenantId) {
            refreshUsers();
        }
    }, [mainGroup, activeTenantId]);

    const updateMember = async (userId: string, updates: Partial<Pick<TenantMember, 'role' | 'allowed_types' | 'active'>>) => {
        if (!activeTenantId) return;
        const member = tenantMembers.find(item => item.userId === userId);
        if (!member) return;

        try {
            await updateTenantUser({
                tenantId: activeTenantId,
                userId,
                role: updates.role || member.role,
                allowed_types: updates.allowed_types || member.allowed_types,
                active: updates.active ?? member.active
            });
        } catch (error: any) {
            console.error('Error updating tenant user:', error);
            alert('Erro ao atualizar usuário: ' + error.message);
        }
    };

    const toggleMemberAccess = async (member: TenantMember, access: BusinessUnitAccess) => {
        const current = member.allowed_types || [];
        const next = current.includes(access)
            ? current.filter(item => item !== access)
            : [...current.filter(item => item !== 'BOTH'), access];
        await updateMember(member.userId, { allowed_types: next.length > 0 ? next : ['BOTH'] });
    };

    const handleRemoveMember = async (userId: string) => {
        if (!activeTenantId) return;
        if (!window.confirm('Remover este usuário do tenant ativo? A conta global não será excluída.')) return;

        try {
            await removeUserFromTenant(activeTenantId, userId);
        } catch (error: any) {
            console.error('Error removing tenant user:', error);
            alert('Erro ao remover usuário: ' + error.message);
        }
    };

    const handleCreateUser = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!activeTenantId) return;
        if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
            alert('Preencha nome, e-mail e senha.');
            return;
        }
        if (newUserPassword.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        const allowedTypes: BusinessUnitAccess[] = [];
        if (newUserServices) allowedTypes.push('SERVICES');
        if (newUserProducts) allowedTypes.push('PRODUCTS');

        try {
            await createPlatformUser({
                tenantId: activeTenantId,
                email: newUserEmail,
                password: newUserPassword,
                fullName: newUserName,
                role: newUserRole,
                allowed_types: allowedTypes.length > 0 ? allowedTypes : ['BOTH'],
                platformRole: 'USER'
            });
            setIsCreatingUser(false);
            setNewUserName('');
            setNewUserEmail('');
            setNewUserPassword('');
            setShowNewUserPassword(false);
            setNewUserRole('SELLER');
            setNewUserServices(false);
            setNewUserProducts(false);
            await refreshUsers();
        } catch (error: any) {
            console.error('Error creating tenant user:', error);
            alert('Erro ao criar usuário: ' + error.message);
        }
    };

    return (
        <PageShell className="max-w-[1600px]">
            <PageHeader
                icon={Settings}
                title="Configurações do Tenant"
                subtitle="Padrões e parâmetros do tenant ativo para novas propostas."
                actions={
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg transition-colors">
                    <button
                        onClick={() => { setMainGroup('gerais'); setActiveTab('finance'); }}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${mainGroup === 'gerais' ? 'bg-white dark:bg-slate-900 shadow text-[#0f172a] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Gerais
                    </button>
                    <button
                        onClick={() => { setMainGroup('servicos'); setActiveTab('kits'); }}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${mainGroup === 'servicos' ? 'bg-white dark:bg-slate-900 shadow text-[#0f172a] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Serviços
                    </button>
                    <button
                        onClick={() => { setMainGroup('produtos'); setActiveTab('products'); }}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${mainGroup === 'produtos' ? 'bg-white dark:bg-slate-900 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Produtos
                    </button>
                    <button
                        onClick={() => { setMainGroup('propostas'); setActiveTab('proposal_templates'); }}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${mainGroup === 'propostas' ? 'bg-white dark:bg-slate-900 shadow text-[#0f172a] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Propostas
                    </button>
                </div>
                }
            />

            {/* SUB-MENU SELECTION */}
            <div className="flex justify-center -mt-2 mb-6">
                <div className="flex gap-2">
                    {mainGroup === 'gerais' && (
                        <>
                            <button onClick={() => setActiveTab('finance')} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeTab === 'finance' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Parâmetros Financeiros</button>
                            <button onClick={() => setActiveTab('taxes')} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeTab === 'taxes' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Impostos & Encargos</button>
                            <button onClick={() => setActiveTab('accounting')} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeTab === 'accounting' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Plano de Contas</button>
                            <button onClick={() => setActiveTab('letterhead')} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeTab === 'letterhead' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Papel Timbrado</button>
                        </>
                    )}
                    {mainGroup === 'servicos' && (
                        <>
                            <button onClick={() => setActiveTab('kits')} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeTab === 'kits' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Kits & Recursos</button>
                        </>
                    )}
                    {mainGroup === 'produtos' && (
                        <>
                            <button onClick={() => setActiveTab('products')} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeTab === 'products' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Catálogo de Itens</button>
                            <button onClick={() => setActiveTab('product_layout')} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeTab === 'product_layout' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Layout do Orçamento</button>
                        </>
                    )}
                    {mainGroup === 'propostas' && (
                        <button onClick={() => setActiveTab('proposal_templates')} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeTab === 'proposal_templates' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Templates de Proposta</button>
                    )}
                </div>
            </div>

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
                            Eles podem ser ajustados individualmente dentro de cada projeto, mas aqui você define a política do tenant.
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
                <div className="max-w-5xl mx-auto space-y-12 transition-colors">
                    {/* SERVIÇOS SECTION */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-6 flex items-center gap-2 transition-colors">
                            <BookOpen size={24} className="text-indigo-500" />
                            Mapeamento Contábil: Serviços
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-3xl transition-colors">
                            Codificação para DRE de contratos de manutenção e prestação de serviços.
                        </p>

                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest transition-colors border-b border-slate-100 dark:border-slate-800">
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
                                <div key={item.key} className="grid grid-cols-12 gap-4 items-center p-2 border-b border-slate-50 dark:border-slate-800/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <div className="col-span-4 font-bold text-slate-700 dark:text-slate-300 text-sm">
                                        {item.label}
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            value={accountingConfig[item.key as keyof AccountingMapping]?.code || ''}
                                            onChange={(e) => updateAccount(false, item.key as keyof AccountingMapping, 'code', e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-600 dark:text-slate-400 focus:border-indigo-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="col-span-6">
                                        <input
                                            type="text"
                                            value={accountingConfig[item.key as keyof AccountingMapping]?.name || ''}
                                            onChange={(e) => updateAccount(false, item.key as keyof AccountingMapping, 'name', e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-600 dark:text-slate-400 focus:border-indigo-500 outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PRODUTOS SECTION */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-6 flex items-center gap-2 transition-colors">
                            <BookOpen size={24} className="text-emerald-500" />
                            Mapeamento Contábil: Produtos
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-3xl transition-colors">
                            Codificação para DRE de venda de itens, peças e equipamentos.
                        </p>

                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest transition-colors border-b border-slate-100 dark:border-slate-800">
                                <div className="col-span-4">Evento do Sistema</div>
                                <div className="col-span-2">Código Contábil</div>
                                <div className="col-span-6">Descrição da Conta (Razão)</div>
                            </div>

                            {[
                                { key: 'revenueAccount', label: 'Receita de Venda de Produtos' },
                                { key: 'deductionTaxesAccount', label: 'Impostos s/ Produtos (IPI/ICMS)' },
                                { key: 'operationalCostsAccount', label: 'Custo de Mercadoria Vendida (CPV)' },
                                { key: 'financialResultAccount', label: 'Despesas Financeiras / Taxas' },
                            ].map((item) => (
                                <div key={item.key} className="grid grid-cols-12 gap-4 items-center p-2 border-b border-slate-50 dark:border-slate-800/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <div className="col-span-4 font-bold text-slate-700 dark:text-slate-300 text-sm">
                                        {item.label}
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            value={productAccountingConfig[item.key as keyof AccountingMapping]?.code || ''}
                                            onChange={(e) => updateAccount(true, item.key as keyof AccountingMapping, 'code', e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="col-span-6">
                                        <input
                                            type="text"
                                            value={productAccountingConfig[item.key as keyof AccountingMapping]?.name || ''}
                                            onChange={(e) => updateAccount(true, item.key as keyof AccountingMapping, 'name', e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-600 dark:text-slate-400 focus:border-emerald-500 outline-none transition-colors"
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
                                            <strong>Nota:</strong> As alterações feitas aqui serão salvas automaticamente nos padrões do tenant.
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
            ) : activeTab === 'letterhead' ? (
                <div className="max-w-4xl mx-auto space-y-6 transition-colors">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <header className="mb-8">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                                <Palette size={24} className="text-[#0f172a] dark:text-indigo-500" />
                                Configuração de Proposta Comercial (Papel Timbrado)
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Personalize a identidade visual e os dados fixos que aparecem na proposta impressa.</p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                            {/* CABEÇALHO E RODAPÉ GERAIS */}
                            <div className="col-span-2 space-y-4">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                                    <ImageIcon size={14} /> Padrões do Tenant (Serviços)
                                </h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <LogoUploader
                                        label="Papel Timbrado: Cabeçalho (Padrão)"
                                        currentUrl={globalConfig.letterheadConfig?.headerUrl}
                                        onUpload={(url) => setGlobalConfig({
                                            ...globalConfig,
                                            letterheadConfig: { ...globalConfig.letterheadConfig!, headerUrl: url }
                                        })}
                                        tip="A4 2480x350px. Usado como padrão para serviços."
                                    />
                                    <LogoUploader
                                        label="Papel Timbrado: Rodapé (Padrão)"
                                        currentUrl={globalConfig.letterheadConfig?.footerUrl}
                                        onUpload={(url) => setGlobalConfig({
                                            ...globalConfig,
                                            letterheadConfig: { ...globalConfig.letterheadConfig!, footerUrl: url }
                                        })}
                                        tip="A4 2480x200px. Usado como padrão para serviços."
                                    />
                                </div>
                            </div>

                            <div className="col-span-2 space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                                    <Palette size={14} /> Logotipos Específicos
                                </h4>
                                <div className="grid grid-cols-3 gap-6">
                                    <LogoUploader
                                        label="Logo Principal (Texto)"
                                        currentUrl={globalConfig.letterheadConfig?.logoUrl}
                                        onUpload={(url) => setGlobalConfig({
                                            ...globalConfig,
                                            letterheadConfig: { ...globalConfig.letterheadConfig!, logoUrl: url }
                                        })}
                                        tip="Exibido em layouts que não usam papel timbrado."
                                    />
                                    <LogoUploader
                                        label="Logo p/ Serviços"
                                        currentUrl={globalConfig.letterheadConfig?.serviceLogoUrl}
                                        onUpload={(url) => setGlobalConfig({
                                            ...globalConfig,
                                            letterheadConfig: { ...globalConfig.letterheadConfig!, serviceLogoUrl: url }
                                        })}
                                        tip="Logo específico para propostas de manutenção."
                                    />
                                    <LogoUploader
                                        label="Logo p/ Produtos"
                                        currentUrl={globalConfig.letterheadConfig?.productLogoUrl}
                                        onUpload={(url) => setGlobalConfig({
                                            ...globalConfig,
                                            letterheadConfig: { ...globalConfig.letterheadConfig!, productLogoUrl: url }
                                        })}
                                        tip="Logo exclusivo para o catálogo de equipamentos."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block">Cor Principal</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={globalConfig.letterheadConfig?.primaryColor || '#0f172a'}
                                            onChange={(e) => setGlobalConfig({
                                                ...globalConfig,
                                                letterheadConfig: { ...globalConfig.letterheadConfig!, primaryColor: e.target.value }
                                            })}
                                            className="h-10 w-12 border-none p-0 cursor-pointer bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={globalConfig.letterheadConfig?.primaryColor || ''}
                                            onChange={(e) => setGlobalConfig({
                                                ...globalConfig,
                                                letterheadConfig: { ...globalConfig.letterheadConfig!, primaryColor: e.target.value }
                                            })}
                                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm font-mono"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block">Cor de Destaque</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={globalConfig.letterheadConfig?.secondaryColor || '#2563eb'}
                                            onChange={(e) => setGlobalConfig({
                                                ...globalConfig,
                                                letterheadConfig: { ...globalConfig.letterheadConfig!, secondaryColor: e.target.value }
                                            })}
                                            className="h-10 w-12 border-none p-0 cursor-pointer bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={globalConfig.letterheadConfig?.secondaryColor || ''}
                                            onChange={(e) => setGlobalConfig({
                                                ...globalConfig,
                                                letterheadConfig: { ...globalConfig.letterheadConfig!, secondaryColor: e.target.value }
                                            })}
                                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Company Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Nome da Empresa</label>
                                <input
                                    type="text"
                                    value={globalConfig.letterheadConfig?.companyName || ''}
                                    onChange={(e) => setGlobalConfig({
                                        ...globalConfig,
                                        letterheadConfig: { ...globalConfig.letterheadConfig!, companyName: e.target.value }
                                    })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Slogan / Tagline</label>
                                <input
                                    type="text"
                                    value={globalConfig.letterheadConfig?.companySlogan || ''}
                                    onChange={(e) => setGlobalConfig({
                                        ...globalConfig,
                                        letterheadConfig: { ...globalConfig.letterheadConfig!, companySlogan: e.target.value }
                                    })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Endereço (Linha 1)</label>
                                    <input
                                        type="text"
                                        value={globalConfig.letterheadConfig?.addressLine1 || ''}
                                        onChange={(e) => setGlobalConfig({
                                            ...globalConfig,
                                            letterheadConfig: { ...globalConfig.letterheadConfig!, addressLine1: e.target.value }
                                        })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 text-sm outline-none"
                                        placeholder="Ex: Av. Industrial, 1000"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Cidade/UF/CEP (Linha 2)</label>
                                    <input
                                        type="text"
                                        value={globalConfig.letterheadConfig?.addressLine2 || ''}
                                        onChange={(e) => setGlobalConfig({
                                            ...globalConfig,
                                            letterheadConfig: { ...globalConfig.letterheadConfig!, addressLine2: e.target.value }
                                        })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 text-sm outline-none"
                                        placeholder="Ex: São Paulo/SP - CEP 00000-000"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">CNPJ</label>
                                    <input
                                        type="text"
                                        value={globalConfig.letterheadConfig?.cnpj || ''}
                                        onChange={(e) => setGlobalConfig({
                                            ...globalConfig,
                                            letterheadConfig: { ...globalConfig.letterheadConfig!, cnpj: e.target.value }
                                        })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Website</label>
                                    <input
                                        type="text"
                                        value={globalConfig.letterheadConfig?.website || ''}
                                        onChange={(e) => setGlobalConfig({
                                            ...globalConfig,
                                            letterheadConfig: { ...globalConfig.letterheadConfig!, website: e.target.value }
                                        })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 text-sm outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pré-visualização do Timbrado</h4>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white rounded border flex items-center justify-center p-1">
                                    {globalConfig.letterheadConfig?.logoUrl ? (
                                        <img src={globalConfig.letterheadConfig.logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <Package className="text-slate-300" size={24} />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-black text-xl leading-none" style={{ color: globalConfig.letterheadConfig?.primaryColor || '#0f172a' }}>
                                        {globalConfig.letterheadConfig?.companyName || 'NOME DA EMPRESA'}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-tighter mt-1 font-bold">
                                        {globalConfig.letterheadConfig?.companySlogan || 'Slogan Industrial'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right text-[10px] text-slate-400 font-mono space-y-0.5">
                                <p>{globalConfig.letterheadConfig?.addressLine1}</p>
                                <p>{globalConfig.letterheadConfig?.addressLine2}</p>
                                <p>{globalConfig.letterheadConfig?.cnpj} | {globalConfig.letterheadConfig?.website}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/*ABA PRODUTOS / CATALOGO */}
            {activeTab === 'products' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl mx-auto pb-20">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Package className="text-emerald-500" /> Catálogo de Produtos
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">Gerencie a lista oficial de produtos disponíveis.</p>
                        </div>
                        <button
                            onClick={() => {
                                const newProduct = {
                                    id: Math.random().toString(36).substr(2, 9),
                                    name: 'Novo Produto',
                                    sku: '',
                                    costPrice: 0,
                                    standardMargin: 0.2,
                                    category: 'Peças',
                                    description: '',
                                    imageUrl: ''
                                };
                                setGlobalConfig({ ...globalConfig, productCatalog: [...(globalConfig.productCatalog || []), newProduct] });
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none"
                        >
                            <Plus size={16} /> Novo Produto
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(globalConfig.productCatalog || []).map(product => (
                            <div key={product.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm group hover:border-emerald-200 dark:hover:border-emerald-800 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <input
                                                type="text"
                                                value={product.sku || ''}
                                                onChange={(e) => {
                                                    const updated = globalConfig.productCatalog?.map(p => p.id === product.id ? { ...p, sku: e.target.value } : p);
                                                    setGlobalConfig({ ...globalConfig, productCatalog: updated });
                                                }}
                                                placeholder="SKU-000"
                                                className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded border-none focus:ring-1 focus:ring-emerald-500 w-24"
                                            />
                                            <input
                                                type="text"
                                                value={product.ncm || ''}
                                                onChange={(e) => {
                                                    const updated = globalConfig.productCatalog?.map(p => p.id === product.id ? { ...p, ncm: e.target.value } : p);
                                                    setGlobalConfig({ ...globalConfig, productCatalog: updated });
                                                }}
                                                placeholder="NCM"
                                                className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded border-none focus:ring-1 focus:ring-emerald-500 w-20"
                                            />
                                            <input
                                                type="text"
                                                value={product.category}
                                                onChange={(e) => {
                                                    const updated = globalConfig.productCatalog?.map(p => p.id === product.id ? { ...p, category: e.target.value as any } : p);
                                                    setGlobalConfig({ ...globalConfig, productCatalog: updated });
                                                }}
                                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded border-none focus:ring-0"
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={product.name}
                                            onChange={(e) => {
                                                const updated = globalConfig.productCatalog?.map(p => p.id === product.id ? { ...p, name: e.target.value } : p);
                                                setGlobalConfig({ ...globalConfig, productCatalog: updated });
                                            }}
                                            className="font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none focus:ring-0 p-0 text-lg w-full mb-2"
                                            placeholder="Nome do Produto"
                                        />

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase">URL da Imagem</label>
                                            <input
                                                type="text"
                                                value={product.imageUrl || ''}
                                                onChange={(e) => {
                                                    const updated = globalConfig.productCatalog?.map(p => p.id === product.id ? { ...p, imageUrl: e.target.value } : p);
                                                    setGlobalConfig({ ...globalConfig, productCatalog: updated });
                                                }}
                                                placeholder="https://..."
                                                className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500 outline-none w-full"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <div className="w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white shadow-inner flex items-center justify-center relative group-hover:border-emerald-300 transition-colors">
                                            {product.imageUrl ? (
                                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <Package size={24} className="text-slate-200" />
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                const updated = globalConfig.productCatalog?.filter(p => p.id !== product.id);
                                                setGlobalConfig({ ...globalConfig, productCatalog: updated });
                                            }}
                                            className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Custo Un.</label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">R$</span>
                                            <input
                                                type="number"
                                                value={product.costPrice}
                                                onChange={(e) => {
                                                    const updated = globalConfig.productCatalog?.map(p => p.id === product.id ? { ...p, costPrice: parseFloat(e.target.value) || 0 } : p);
                                                    setGlobalConfig({ ...globalConfig, productCatalog: updated });
                                                }}
                                                className="w-full pl-8 pr-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-black text-slate-700 dark:text-slate-200"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Margem Sugerida</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={product.standardMargin * 100}
                                                onChange={(e) => {
                                                    const updated = globalConfig.productCatalog?.map(p => p.id === product.id ? { ...p, standardMargin: (parseFloat(e.target.value) || 0) / 100 } : p);
                                                    setGlobalConfig({ ...globalConfig, productCatalog: updated });
                                                }}
                                                className="w-full pr-6 pl-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-black text-emerald-600 dark:text-emerald-400"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: PRODUCT LAYOUT */}
            {activeTab === 'product_layout' && (
                <div className="max-w-4xl mx-auto space-y-6 transition-colors">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-6 flex items-center gap-2 transition-colors">
                            <Palette size={24} className="text-emerald-500" />
                            Layout do Orçamento de Produtos
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">Configurações visuais específicas para propostas de equipamentos, consumíveis e peças.</p>

                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-10">
                            <div className="space-y-6">
                                <LogoUploader
                                    label="Capa de Produtos (Cabeçalho)"
                                    currentUrl={globalConfig.letterheadConfig?.productHeaderUrl}
                                    onUpload={(url) => setGlobalConfig({
                                        ...globalConfig,
                                        letterheadConfig: { ...globalConfig.letterheadConfig!, productHeaderUrl: url }
                                    })}
                                    tip="Imagem A4 (2480x350px) exclusiva para propostas de venda de produtos."
                                />
                                <LogoUploader
                                    label="Rodapé de Produtos"
                                    currentUrl={globalConfig.letterheadConfig?.productFooterUrl}
                                    onUpload={(url) => setGlobalConfig({
                                        ...globalConfig,
                                        letterheadConfig: { ...globalConfig.letterheadConfig!, productFooterUrl: url }
                                    })}
                                    tip="Imagem A4 (2480x200px) exclusiva para propostas de venda de produtos."
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Termos Gerais (Rodapé)</label>
                                <textarea
                                    className="w-full h-full min-h-[180px] px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 resize-none outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    placeholder="Informações Gerais - Os NCMs que fazem parte..."
                                    value={globalConfig.letterheadConfig?.productGeneralTerms || ''}
                                    onChange={(e) => setGlobalConfig({
                                        ...globalConfig,
                                        letterheadConfig: { ...globalConfig.letterheadConfig!, productGeneralTerms: e.target.value }
                                    })}
                                ></textarea>
                                <p className="text-[9px] text-slate-400 italic">Texto impresso abaixo da tabela de impostos do orçamento.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'proposal_templates' && (
                <div className="mx-auto max-w-6xl space-y-6">
                    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-6 flex flex-col gap-2 border-b border-slate-200 pb-5 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Templates de Proposta</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Configure os textos e e-mails usados na proposta tecnico-comercial de cada modalidade do tenant ativo.
                            </p>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                            <nav className="space-y-2">
                                {PROPOSAL_TEMPLATE_KINDS.map(kind => (
                                    <button
                                        key={kind}
                                        type="button"
                                        onClick={() => setSelectedTemplateKind(kind)}
                                        className={`w-full rounded-md border px-4 py-3 text-left text-sm font-bold transition-colors ${selectedTemplateKind === kind ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                                    >
                                        {PROPOSAL_TEMPLATE_LABELS[kind]}
                                    </button>
                                ))}
                            </nav>

                            <div className="space-y-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className="space-y-2">
                                        <span className="text-xs font-black uppercase text-slate-500">Nome do template</span>
                                        <input value={selectedProposalTemplate.name} onChange={event => updateProposalTemplate('name', event.target.value)} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-xs font-black uppercase text-slate-500">Assunto do e-mail</span>
                                        <input value={selectedProposalTemplate.emailSubject} onChange={event => updateProposalTemplate('emailSubject', event.target.value)} className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                                    </label>
                                </div>

                                <label className="space-y-2 block">
                                    <span className="text-xs font-black uppercase text-slate-500">Corpo do e-mail</span>
                                    <textarea rows={5} value={selectedProposalTemplate.emailBody} onChange={event => updateProposalTemplate('emailBody', event.target.value)} className="w-full resize-y rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                                </label>

                                {[
                                    ['introduction', 'Introducao'],
                                    ['scope', 'Escopo'],
                                    ['commercialConditions', 'Condicoes comerciais'],
                                    ['terms', 'Termos'],
                                    ['closingNotes', 'Observacoes finais']
                                ].map(([field, label]) => (
                                    <label key={field} className="space-y-2 block">
                                        <span className="text-xs font-black uppercase text-slate-500">{label}</span>
                                        <textarea rows={4} value={selectedProposalTemplate[field as keyof ProposalTemplateConfig] as string} onChange={event => updateProposalTemplate(field as keyof ProposalTemplateConfig, event.target.value)} className="w-full resize-y rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                                    </label>
                                ))}

                                <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                                    Variaveis disponiveis: {'{{cliente}}'}, {'{{proposta}}'}, {'{{modalidade}}'}, {'{{empresa}}'}, {'{{valor}}'} e {'{{validade}}'}.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'user_list' && (
                <div className="mx-auto max-w-6xl space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="flex items-center gap-3 text-xl font-bold text-slate-800 dark:text-slate-100">
                                    <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                        <Users size={22} />
                                    </span>
                                    Propostas do tenant
                                </h3>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    Gerencie somente os membros de {activeTenant?.branding?.displayName || activeTenant?.name || 'este tenant'}.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsCreatingUser(prev => !prev)} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${isCreatingUser ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                    {isCreatingUser ? <X size={17} /> : <UserPlus size={17} />}
                                    {isCreatingUser ? 'Cancelar' : 'Convidar usuário'}
                                </button>
                                <button type="button" onClick={refreshUsers} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800" title="Atualizar lista">
                                    <Loader2 size={18} className={loadingProfiles ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>

                        {isCreatingUser && (
                            <form onSubmit={handleCreateUser} className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <input value={newUserName} onChange={event => setNewUserName(event.target.value)} required placeholder="Nome completo" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900" />
                                    <input type="email" value={newUserEmail} onChange={event => setNewUserEmail(event.target.value)} required placeholder="email@empresa.com" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900" />
                                    <div className="relative">
                                        <input type={showNewUserPassword ? 'text' : 'password'} value={newUserPassword} onChange={event => setNewUserPassword(event.target.value)} required minLength={6} placeholder="Senha temporária" className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 pr-10 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900" />
                                        <button type="button" onClick={() => setShowNewUserPassword(prev => !prev)} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                                            {showNewUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <select value={newUserRole} onChange={event => setNewUserRole(event.target.value as AppRole)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900">
                                        <option value="ADMIN">ADMIN</option>
                                        <option value="MANAGER">GERENTE</option>
                                        <option value="SELLER">VENDEDOR</option>
                                        <option value="ANALYST">ANALISTA</option>
                                    </select>
                                </div>
                                <div className="mt-4 flex items-center justify-between gap-4">
                                    <div className="flex gap-3">
                                        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                                            <input type="checkbox" checked={newUserServices} onChange={event => setNewUserServices(event.target.checked)} className="h-4 w-4" />
                                            SERVIÇOS
                                        </label>
                                        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                                            <input type="checkbox" checked={newUserProducts} onChange={event => setNewUserProducts(event.target.checked)} className="h-4 w-4" />
                                            PRODUTOS
                                        </label>
                                    </div>
                                    <button type="submit" className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                                        <Save size={16} />
                                        Criar cadastro
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-slate-800/60">
                                    <tr>
                                        <th className="px-4 py-3">Usuário</th>
                                        <th className="px-4 py-3">Papel</th>
                                        <th className="px-4 py-3">Unidades</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {loadingProfiles && tenantMembers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                                                <Loader2 size={28} className="mx-auto mb-2 animate-spin text-indigo-500" />
                                                Carregando usuários do tenant...
                                            </td>
                                        </tr>
                                    ) : tenantMembers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-10 text-center text-slate-400">Nenhum usuário vinculado a este tenant.</td>
                                        </tr>
                                    ) : tenantMembers.map(member => (
                                        <tr key={member.userId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-black text-white">
                                                        {member.fullName?.[0] || member.email?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-slate-800 dark:text-slate-100">{member.fullName || 'Usuário sem nome'}</p>
                                                            {member.platformRole === 'SUPER_ADMIN' && <Shield size={14} className="text-purple-500" />}
                                                        </div>
                                                        <p className="text-xs text-slate-500">{member.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <select value={member.role} onChange={event => updateMember(member.userId, { role: event.target.value as AppRole })} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
                                                    {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex gap-2">
                                                    {(['SERVICES', 'PRODUCTS'] as BusinessUnitAccess[]).map(access => (
                                                        <button type="button" key={access} onClick={() => toggleMemberAccess(member, access)} className={`rounded-md border px-2 py-1 text-[10px] font-black ${member.allowed_types.includes(access) || member.allowed_types.includes('BOTH') ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}>
                                                            {access}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button type="button" onClick={() => updateMember(member.userId, { active: !member.active })} className={`rounded-full px-3 py-1 text-[10px] font-black ${member.active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                    {member.active ? 'ATIVO' : 'INATIVO'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <button type="button" onClick={() => setEditingUser(member)} className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button type="button" onClick={() => handleRemoveMember(member.userId)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                        <AlertCircle size={18} />
                        A lista acima é limitada ao tenant ativo. Permissões de acesso são gravadas em tenant_users, não no perfil global.
                    </div>

                    {editingUser && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
                            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingUser.fullName || 'Usuário sem nome'}</h3>
                                        <p className="text-sm text-slate-500">{editingUser.email}</p>
                                    </div>
                                    <button type="button" onClick={() => setEditingUser(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Papel no tenant</label>
                                        <select value={editingUser.role} onChange={event => setEditingUser({ ...editingUser, role: event.target.value as AppRole })} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-800">
                                            {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Unidades</label>
                                        <div className="flex gap-2">
                                            {(['SERVICES', 'PRODUCTS'] as BusinessUnitAccess[]).map(access => (
                                                <button type="button" key={access} onClick={() => {
                                                    const current = editingUser.allowed_types || [];
                                                    const next = current.includes(access) ? current.filter(item => item !== access) : [...current.filter(item => item !== 'BOTH'), access];
                                                    setEditingUser({ ...editingUser, allowed_types: next.length > 0 ? next : ['BOTH'] });
                                                }} className={`flex-1 rounded-md border px-3 py-2 text-xs font-black ${editingUser.allowed_types.includes(access) || editingUser.allowed_types.includes('BOTH') ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}>
                                                    {access}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-2">
                                    <button type="button" onClick={() => setEditingUser(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancelar</button>
                                    <button type="button" onClick={async () => { await updateMember(editingUser.userId, { role: editingUser.role, allowed_types: editingUser.allowed_types, active: editingUser.active }); setEditingUser(null); }} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                                        <Save size={16} />
                                        Salvar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </PageShell>

    );
};

export default GlobalSettings;

