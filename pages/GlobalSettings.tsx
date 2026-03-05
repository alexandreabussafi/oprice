
import React, { useState, useEffect } from 'react';
import { ProposalData, KitTemplate, KitItemTemplate, ExpenseItem, AccountingMapping, AccountingAccount, defaultAccounting, BusinessUnitAccess } from '../types';
import Taxes from './Taxes'; // Reusing the Taxes component logic for global settings
import { Globe, Save, Package, Plus, Trash2, Edit2, Check, X, Box, Info, ShieldAlert, TrendingUp, Landmark, Wrench, Truck, Monitor, HardHat, Wand2, BookOpen, AlertCircle, Palette, Upload, Image as ImageIcon, Loader2, Users, UserPlus, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/pricingEngine';
import InfoTooltip from '../components/InfoTooltip';

interface GlobalSettingsProps {
    globalConfig: ProposalData; // Using ProposalData structure to hold global configs
    setGlobalConfig: (config: ProposalData) => void;
}

const GlobalSettings: React.FC<GlobalSettingsProps> = ({ globalConfig, setGlobalConfig }) => {
    const [mainGroup, setMainGroup] = useState<'gerais' | 'servicos' | 'produtos' | 'usuarios'>('gerais');
    const [activeTab, setActiveTab] = useState<'finance' | 'taxes' | 'accounting' | 'letterhead' | 'kits' | 'products' | 'product_layout' | 'user_list'>('finance');

    // --- USER MANAGEMENT STATE ---
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

    // --- USER REGISTRATION STATE ---
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SELLER' | 'ANALYST'>('SELLER');
    const [newUserServices, setNewUserServices] = useState(false);
    const [newUserProducts, setNewUserProducts] = useState(false);



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

    // --- USER MANAGEMENT LOGIC ---
    const fetchUsers = async () => {
        setLoadingProfiles(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name');
            if (error) throw error;
            setProfiles(data || []);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            alert('Erro ao carregar usuários: ' + error.message);
        } finally {
            setLoadingProfiles(false);
        }
    };

    React.useEffect(() => {
        if (mainGroup === 'usuarios') {
            fetchUsers();
        }
    }, [mainGroup]);

    const handleUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
        try {
            const { id, email, ...safeUpdates } = updates as any;

            if (Object.keys(safeUpdates).length > 0) {
                const { error } = await supabase
                    .from('profiles')
                    .update(safeUpdates)
                    .eq('id', userId);
                if (error) throw error;
            }

            // Local update
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, ...updates } : p));
            if (editingUser?.id === userId) {
                setEditingUser(prev => prev ? { ...prev, ...updates } : null);
            }
            alert('Usuário atualizado com sucesso!');
        } catch (error: any) {
            console.error('Error updating user:', error);
            alert('Erro ao atualizar usuário: ' + error.message);
        }
    };

    const handleToggleUnitAccess = async (user: UserProfile, unit: BusinessUnitAccess) => {
        const currentAccess = user.allowed_types || [];
        const newAccess = currentAccess.includes(unit)
            ? currentAccess.filter(t => t !== unit)
            : [...currentAccess, unit];

        await handleUpdateUser(user.id, { allowed_types: newAccess });
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação removerá o perfil do banco de dados e não pode ser desfeita.')) return;

        try {
            // Usa a procedure PostgreSQL criada no Supabase para deletar de auth.users usando permissão root (cascade automático para o profile)
            const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId });

            if (error) throw error;

            setProfiles(prev => prev.filter(p => p.id !== userId));
            alert('Usuário removido com sucesso!');
        } catch (error: any) {
            console.error('Error deleting user:', error);
            alert('Erro ao remover usuário: ' + error.message);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        if (newUserPassword.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        try {
            // Instantiate secondary local client to create user without overriding current active admin session
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
            const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error("Missing Supabase env vars");
            }

            const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });

            // signUp generates the user in auth.users and triggers handle_new_user to make profile
            const { data, error: signUpError } = await tempSupabase.auth.signUp({
                email: newUserEmail,
                password: newUserPassword,
                options: {
                    data: {
                        full_name: newUserName,
                    }
                }
            });

            if (signUpError) throw signUpError;

            const newUserId = data.user?.id;

            if (newUserId) {
                // Wait briefly for the trigger to execute
                await new Promise(r => setTimeout(r, 1000));

                // Now, using current primary logged-in supervisor session, update the profile created by trigger
                const allowedTypes: BusinessUnitAccess[] = [];
                if (newUserServices) allowedTypes.push('SERVICES');
                if (newUserProducts) allowedTypes.push('PRODUCTS');

                await handleUpdateUser(newUserId, {
                    role: newUserRole,
                    allowed_types: allowedTypes,
                    full_name: newUserName
                });

                // Clear form
                setIsCreatingUser(false);
                setNewUserName('');
                setNewUserEmail('');
                setNewUserPassword('');
                setNewUserRole('SELLER');
                setNewUserServices(false);
                setNewUserProducts(false);
                alert('Usuário criado com sucesso!');
                fetchUsers();
            }

        } catch (error: any) {
            console.error('Error creating user:', error);
            alert('Erro ao criar usuário: ' + error.message);
        }
    };



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
                        onClick={() => { setMainGroup('usuarios'); setActiveTab('user_list'); }}
                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${mainGroup === 'usuarios' ? 'bg-white dark:bg-slate-900 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Usuários
                    </button>
                </div>
            </header>

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
                                    <ImageIcon size={14} /> Padrões Globais (Serviços)
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

            {/* TAB: USER MANAGEMENT */}
            {activeTab === 'user_list' && (
                <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors relative overflow-hidden">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                            <Users size={200} />
                        </div>

                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xl flex items-center gap-3 mb-2 transition-colors">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                        <Users size={24} />
                                    </div>
                                    Gestão de Acessos e Usuários
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl transition-colors">
                                    Controle quem pode acessar o sistema, quais são seus níveis de permissão e a quais unidades de negócio eles pertencem.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsCreatingUser(prev => !prev)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-95 ${isCreatingUser
                                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                                        }`}
                                >
                                    {isCreatingUser ? <X size={18} /> : <UserPlus size={18} />}
                                    {isCreatingUser ? 'Cancelar' : 'Convidar Usuário'}
                                </button>
                                <button
                                    onClick={fetchUsers}
                                    className="p-2.5 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                                    title="Atualizar Lista"
                                >
                                    <Loader2 size={18} className={loadingProfiles ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>

                        {/* Inline User Creation Form */}
                        {isCreatingUser && (
                            <form onSubmit={handleCreateUser} className="mb-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">
                                    <Shield size={16} className="text-indigo-500" />
                                    Novo Usuário
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Nome Completo</label>
                                        <input
                                            type="text"
                                            value={newUserName}
                                            onChange={e => setNewUserName(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                            placeholder="Ex: João Silva"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">E-mail</label>
                                        <input
                                            type="email"
                                            value={newUserEmail}
                                            onChange={e => setNewUserEmail(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                            placeholder="Ex: joao@empresa.com"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Senha</label>
                                        <input
                                            type="password"
                                            value={newUserPassword}
                                            onChange={e => setNewUserPassword(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                            placeholder="Mínimo 6 caracteres"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Nível de Acesso (Cargo)</label>
                                        <select
                                            value={newUserRole}
                                            onChange={e => setNewUserRole(e.target.value as any)}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                                        >
                                            <option value="SUPER_ADMIN">SUPER_ADMIN (Acesso Total)</option>
                                            <option value="ADMIN">ADMIN (Configurações)</option>
                                            <option value="MANAGER">GERENTE (Todas as Cotações)</option>
                                            <option value="SELLER">VENDEDOR (Suas Cotações)</option>
                                            <option value="ANALYST">ANALISTA (Apenas Leitura)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2 mt-2">
                                        <label className="text-xs font-bold text-slate-500">Unidades Disponíveis</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className="relative flex items-center justify-center w-5 h-5">
                                                    <input
                                                        type="checkbox"
                                                        checked={newUserServices}
                                                        onChange={e => setNewUserServices(e.target.checked)}
                                                        className="peer sr-only"
                                                    />
                                                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all"></div>
                                                    <Check size={14} className="absolute text-white stroke-[3] opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-blue-500 transition-colors">SERVIÇOS</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className="relative flex items-center justify-center w-5 h-5">
                                                    <input
                                                        type="checkbox"
                                                        checked={newUserProducts}
                                                        onChange={e => setNewUserProducts(e.target.checked)}
                                                        className="peer sr-only"
                                                    />
                                                    <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all"></div>
                                                    <Check size={14} className="absolute text-white stroke-[3] opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-emerald-500 transition-colors">PRODUTOS</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingUser(false)}
                                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
                                    >
                                        <Save size={16} />
                                        Criar Cadastro
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest transition-colors">
                                        <th className="px-6 py-4">Usuário</th>
                                        <th className="px-6 py-4">Nível de Acesso</th>
                                        <th className="px-6 py-4">Unidades Disponíveis</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 transition-colors">
                                    {loadingProfiles && profiles.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                                                    Carregando base de usuários...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : profiles.map(u => (
                                        <tr key={u.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                                        {u.full_name?.[0] || u.email?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{u.full_name || 'Usuário sem nome'}</p>
                                                        <p className="text-xs text-slate-400 dark:text-slate-500">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={u.role}
                                                        onChange={(e) => handleUpdateUser(u.id, { role: e.target.value as any })}
                                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg bg-transparent border transition-all cursor-pointer outline-none
                                                            ${u.role === 'SUPER_ADMIN' ? 'text-purple-600 border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/20' :
                                                                u.role === 'ADMIN' ? 'text-indigo-600 border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20' :
                                                                    'text-slate-600 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}
                                                        `}
                                                    >
                                                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                                        <option value="ADMIN">ADMIN</option>
                                                        <option value="MANAGER">GERENTE</option>
                                                        <option value="SELLER">VENDEDOR</option>
                                                        <option value="ANALYST">ANALISTA</option>
                                                    </select>
                                                    {u.role === 'SUPER_ADMIN' && <Shield size={14} className="text-purple-500" />}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleToggleUnitAccess(u, 'SERVICES')}
                                                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all border
                                                            ${u.allowed_types?.includes('SERVICES')
                                                                ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                                                                : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-400 hover:border-blue-400 hover:text-blue-500'}
                                                        `}
                                                    >
                                                        SERVIÇOS
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleUnitAccess(u, 'PRODUCTS')}
                                                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all border
                                                            ${u.allowed_types?.includes('PRODUCTS')
                                                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                                                : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-400 hover:border-emerald-400 hover:text-emerald-500'}
                                                        `}
                                                    >
                                                        PRODUTOS
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => setEditingUser(u)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                                                        title="Editar Detalhes"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                                                        title="Excluir Usuário"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* User Edit Modal / Sidebar Overlay */}
                        {editingUser && (
                            <div className="fixed inset-0 z-[1000] flex items-center justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                                <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl p-8 animate-in slide-in-from-right duration-300 relative overflow-y-auto">
                                    <button
                                        onClick={() => setEditingUser(null)}
                                        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
                                    >
                                        <X size={20} />
                                    </button>

                                    <div className="mt-8 space-y-8">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-indigo-500/20">
                                                {editingUser.full_name?.[0] || editingUser.email?.[0]?.toUpperCase()}
                                            </div>
                                            <div className="text-center">
                                                <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingUser.full_name || 'Usuário'}</h4>
                                                <p className="text-sm text-slate-400 dark:text-slate-500">{editingUser.email}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 transition-colors">Nome Completo</label>
                                                <input
                                                    type="text"
                                                    value={editingUser.full_name || ''}
                                                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 transition-colors">Nível de Acesso (Cargo)</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'ANALYST'] as const).map(role => (
                                                        <button
                                                            key={role}
                                                            onClick={() => setEditingUser({ ...editingUser, role })}
                                                            className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all border flex items-center justify-center gap-2
                                                                ${editingUser.role === role
                                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                                                    : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}
                                                            `}
                                                        >
                                                            {role === 'SUPER_ADMIN' && <Shield size={12} />}
                                                            {role}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 transition-colors">Acesso às Unidades</label>
                                                <div className="flex gap-4">
                                                    <label className="flex-1 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={editingUser.allowed_types?.includes('SERVICES')}
                                                            onChange={() => {
                                                                const types = editingUser.allowed_types || [];
                                                                setEditingUser({
                                                                    ...editingUser,
                                                                    allowed_types: types.includes('SERVICES') ? types.filter(t => t !== 'SERVICES') : [...types, 'SERVICES']
                                                                });
                                                            }}
                                                        />
                                                        <div className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 shadow-sm
                                                            ${editingUser.allowed_types?.includes('SERVICES')
                                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                                : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}
                                                        `}>
                                                            <Wrench size={24} className={editingUser.allowed_types?.includes('SERVICES') ? 'text-blue-500' : 'text-slate-400'} />
                                                            <span className={`text-[10px] font-bold ${editingUser.allowed_types?.includes('SERVICES') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>SERVIÇOS</span>
                                                        </div>
                                                    </label>

                                                    <label className="flex-1 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={editingUser.allowed_types?.includes('PRODUCTS')}
                                                            onChange={() => {
                                                                const types = editingUser.allowed_types || [];
                                                                setEditingUser({
                                                                    ...editingUser,
                                                                    allowed_types: types.includes('PRODUCTS') ? types.filter(t => t !== 'PRODUCTS') : [...types, 'PRODUCTS']
                                                                });
                                                            }}
                                                        />
                                                        <div className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 shadow-sm
                                                            ${editingUser.allowed_types?.includes('PRODUCTS')
                                                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                                                : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}
                                                        `}>
                                                            <Package size={24} className={editingUser.allowed_types?.includes('PRODUCTS') ? 'text-emerald-500' : 'text-slate-400'} />
                                                            <span className={`text-[10px] font-bold ${editingUser.allowed_types?.includes('PRODUCTS') ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>PRODUTOS</span>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                                            <button
                                                onClick={() => {
                                                    handleUpdateUser(editingUser.id, editingUser);
                                                    setEditingUser(null);
                                                }}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Save size={18} />
                                                Salvar Alterações
                                            </button>
                                            <button
                                                onClick={() => setEditingUser(null)}
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RLS Informative Banner */}
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 rounded-xl flex gap-3 items-center transition-colors">
                        <AlertCircle className="text-amber-500 shrink-0" size={20} />
                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
                            <strong>Aviso de Segurança:</strong> Somente usuários com cargos de <strong>ADMIN</strong> ou <strong>SUPER_ADMIN</strong> têm permissão para editar outros perfis.
                            As políticas de RLS do Supabase garantem que vendedores ou analistas não visualizem ou alterem esta lista.
                        </p>
                    </div>
                </div>
            )}
        </div>

    );
};

export default GlobalSettings;
