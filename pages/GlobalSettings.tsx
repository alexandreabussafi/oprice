
import React, { useEffect, useMemo, useState } from 'react';
import { ProposalData, KitTemplate, KitItemTemplate, AccountingMapping, AccountingAccount, defaultAccounting, AppRole, BusinessUnitAccess, TenantMember, ProposalTemplateConfig, ProposalTemplateKind, TenantBranding, SalesPipelineConfig, SalesPipelineStageConfig, ProposalSendAutomationTemplate, MicrosoftInboxFilterConfig, MicrosoftSharedMailboxConfig, TenantActivityEvent, TenantUserActivitySummary, TenantActivityAction, TenantAuditEntityType } from '../types';
import Taxes from './Taxes'; // Reusing the Taxes component logic for global settings
import { Settings, Package, Plus, Trash2, Box, Info, ShieldAlert, TrendingUp, Landmark, Wrench, Truck, Monitor, HardHat, BookOpen, Palette, Image as ImageIcon, Loader2, Users, UserPlus, Shield, Save, X, Edit2, AlertCircle, Eye, EyeOff, Building2, Upload, Bell, CalendarClock, Activity, Clock, ListFilter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import InfoTooltip from '../components/InfoTooltip';
import { useTenant } from '../contexts/TenantContext';
import { mergeProposalTemplates, PROPOSAL_TEMPLATE_KINDS, PROPOSAL_TEMPLATE_LABELS } from '../utils/proposalTemplates';
import { PageHeader, PageShell } from '../components/ui';
import { OPRICE_BRAND_PRIMARY, OPRICE_BRAND_SECONDARY, createTenantTheme } from '../utils/theme';
import { getEnabledPricingModules } from '../utils/pricingModules';
import { PIPELINE_CATEGORY_OPTIONS, PIPELINE_VARIANT_LABELS, getPipelineOptionKey, getPipelineStageStyle, getSalesPipelineFromConfig, getSalesPipelineOptions, normalizeSalesPipelineConfig } from '../utils/salesPipelines';
import { DEFAULT_PROPOSAL_SEND_FOLLOW_UP_TEMPLATE, normalizeProposalSendAutomation } from '../utils/proposalSendAutomation';
import { auditRepository } from '../services/auditRepository';

interface GlobalSettingsProps {
    globalConfig: ProposalData; // Using ProposalData structure to hold global configs
    setGlobalConfig: (config: ProposalData) => void;
}

const DEFAULT_MICROSOFT_INBOX_FILTERS: Required<Pick<MicrosoftInboxFilterConfig, 'ignoreNoReply' | 'ignoreAutoReplies' | 'ignoreNewsletters'>> & MicrosoftInboxFilterConfig = {
    ignoreNoReply: true,
    ignoreAutoReplies: true,
    ignoreNewsletters: true,
    ignoredDomains: [],
    ignoredSenders: [],
    subjectExcludes: [],
    allowedDomains: []
};

const normalizeMicrosoftInboxFilters = (filters?: MicrosoftInboxFilterConfig): MicrosoftInboxFilterConfig => ({
    ...DEFAULT_MICROSOFT_INBOX_FILTERS,
    ...(filters || {}),
    ignoredDomains: (filters?.ignoredDomains || []).map(item => item.trim().toLowerCase()).filter(Boolean),
    ignoredSenders: (filters?.ignoredSenders || []).map(item => item.trim().toLowerCase()).filter(Boolean),
    subjectExcludes: (filters?.subjectExcludes || []).map(item => item.trim()).filter(Boolean),
    allowedDomains: (filters?.allowedDomains || []).map(item => item.trim().toLowerCase()).filter(Boolean)
});

const normalizeMicrosoftMailboxConfig = (mailbox: MicrosoftSharedMailboxConfig): MicrosoftSharedMailboxConfig => ({
    ...mailbox,
    email: mailbox.email.trim().toLowerCase(),
    label: mailbox.label?.trim() || mailbox.email.trim().toLowerCase(),
    enabled: mailbox.enabled !== false,
    intakeMode: 'filtered',
    intakeStartAt: mailbox.intakeStartAt || new Date().toISOString(),
    filters: normalizeMicrosoftInboxFilters(mailbox.filters)
});

const csvToList = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);
const listToCsv = (items?: string[]) => (items || []).join(', ');
const toDateTimeLocalValue = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
};
const fromDateTimeLocalValue = (value: string) => {
    if (!value) return new Date().toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const GlobalSettings: React.FC<GlobalSettingsProps> = ({ globalConfig, setGlobalConfig }) => {
    const [mainGroup, setMainGroup] = useState<'marca' | 'gerais' | 'crm' | 'servicos' | 'produtos' | 'propostas' | 'usuarios'>('marca');
    const [activeTab, setActiveTab] = useState<'brand' | 'finance' | 'taxes' | 'accounting' | 'pipelines' | 'proposal_followup' | 'microsoft_workspace' | 'letterhead' | 'kits' | 'products' | 'product_layout' | 'proposal_templates' | 'user_list'>('brand');
    const { activeTenant, activeTenantId, memberships, tenantMembers, refreshTenantMembers, createPlatformUser, updateTenantUser, removeUserFromTenant, updateTenantBranding, uploadTenantLogo, uploadTenantBrandingAsset, isPlatformSuperAdmin } = useTenant();
    const [brandingSaving, setBrandingSaving] = useState(false);
    const [assetUploading, setAssetUploading] = useState<'logo' | 'favicon' | null>(null);
    const [brandingNotice, setBrandingNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showAdvancedBranding, setShowAdvancedBranding] = useState(false);
    const [brandForm, setBrandForm] = useState<Required<Pick<TenantBranding, 'primaryColor' | 'secondaryColor' | 'backgroundLight' | 'backgroundDark' | 'sidebarLight' | 'sidebarDark' | 'panelLight' | 'panelDark' | 'controlLight' | 'controlDark' | 'controlActiveLight' | 'controlActiveDark' | 'surfaceLight' | 'surfaceDark' | 'textLight' | 'textDark' | 'borderLight' | 'borderDark'>> & Pick<TenantBranding, 'logoUrl' | 'displayName' | 'companyName' | 'slogan' | 'faviconUrl'>>({
        logoUrl: '',
        displayName: '',
        companyName: '',
        slogan: '',
        faviconUrl: '',
        primaryColor: OPRICE_BRAND_PRIMARY,
        secondaryColor: OPRICE_BRAND_SECONDARY,
        backgroundLight: '#f8fafc',
        backgroundDark: '#151a24',
        sidebarLight: '#ffffff',
        sidebarDark: '#182031',
        panelLight: '#ffffff',
        panelDark: '#1f2937',
        controlLight: '#f8fafc',
        controlDark: '#182031',
        controlActiveLight: '#ffffff',
        controlActiveDark: '#0f172a',
        surfaceLight: '#ffffff',
        surfaceDark: '#1f2937',
        textLight: '#0f172a',
        textDark: '#f8fafc',
        borderLight: '#e2e8f0',
        borderDark: '#334155'
    });

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
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditError, setAuditError] = useState<string | null>(null);
    const [auditPeriodDays, setAuditPeriodDays] = useState(7);
    const [auditUserFilter, setAuditUserFilter] = useState('ALL');
    const [auditActionFilter, setAuditActionFilter] = useState<TenantActivityAction | 'ALL'>('ALL');
    const [auditEntityFilter, setAuditEntityFilter] = useState<TenantAuditEntityType | 'ALL'>('ALL');
    const [activityEvents, setActivityEvents] = useState<TenantActivityEvent[]>([]);
    const [activitySummaries, setActivitySummaries] = useState<TenantUserActivitySummary[]>([]);
    // --- KITS MANAGER STATE ---
    const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
    const [selectedTemplateKind, setSelectedTemplateKind] = useState<ProposalTemplateKind>('SAAS_SUBSCRIPTION');
    const [selectedPipelineKey, setSelectedPipelineKey] = useState('');
    const [selectedFollowUpTemplateId, setSelectedFollowUpTemplateId] = useState<string | null>(null);
    const [newSharedMailboxEmail, setNewSharedMailboxEmail] = useState('');
    const [newSharedMailboxLabel, setNewSharedMailboxLabel] = useState('');

    const selectedKit = globalConfig.kitTemplates?.find(k => k.id === selectedKitId);
    const proposalTemplates = mergeProposalTemplates(globalConfig.proposalTemplates, globalConfig.letterheadConfig?.companyName);
    const proposalSendAutomation = normalizeProposalSendAutomation(globalConfig.proposalSendAutomation);
    const microsoftSharedMailboxes = (globalConfig.microsoftWorkspace?.sharedMailboxes || [])
        .filter(mailbox => mailbox.email)
        .map(normalizeMicrosoftMailboxConfig);
    const selectedFollowUpTemplate = proposalSendAutomation.templates.find(template => template.id === selectedFollowUpTemplateId)
        || proposalSendAutomation.templates.find(template => template.id === proposalSendAutomation.defaultTemplateId)
        || proposalSendAutomation.templates[0];
    const enabledPricingModules = getEnabledPricingModules(activeTenant?.enabledModules || ['SERVICES_COMPLEX', 'PRODUCT_SALES']);
    const hasServicesPricing = enabledPricingModules.includes('SERVICES_COMPLEX');
    const hasProductSalesPricing = enabledPricingModules.includes('PRODUCT_SALES');
    const hasSaasPricing = enabledPricingModules.includes('SAAS_SUBSCRIPTION');
    const hasIotPricing = enabledPricingModules.includes('IOT_SUBSCRIPTION');
    const hasProductConfigurator = hasProductSalesPricing || hasIotPricing;
    const pipelineOptions = useMemo(
        () => getSalesPipelineOptions(activeTenant?.enabledModules || ['SERVICES_COMPLEX', 'PRODUCT_SALES']),
        [activeTenant?.enabledModules?.join('|')]
    );
    const selectedPipelineOption = pipelineOptions.find(option => option.key === selectedPipelineKey) || pipelineOptions[0];
    const selectedPipeline = selectedPipelineOption
        ? getSalesPipelineFromConfig(globalConfig, selectedPipelineOption.pricingModule, selectedPipelineOption.variant)
        : null;
    const activeProposalTemplateKinds = PROPOSAL_TEMPLATE_KINDS.filter(kind => {
        if (kind === 'SERVICES_CONTINUOUS' || kind === 'SERVICES_SPOT') return hasServicesPricing;
        if (kind === 'PRODUCT_SALES') return hasProductSalesPricing;
        if (kind === 'SAAS_SUBSCRIPTION') return hasSaasPricing;
        if (kind === 'IOT_SUBSCRIPTION') return hasIotPricing;
        return false;
    });
    const selectedProposalTemplate = proposalTemplates[selectedTemplateKind] || proposalTemplates[activeProposalTemplateKinds[0] || 'PRODUCT_SALES'];
    const tenantMembership = memberships.find(item => item.tenantId === activeTenantId);
    const canManageTenantUsers = isPlatformSuperAdmin || tenantMembership?.role === 'ADMIN' || tenantMembership?.role === 'SUPER_ADMIN';
    const canViewTenantAudit = canManageTenantUsers || tenantMembership?.role === 'MANAGER';
    const canEditTenantBranding = canManageTenantUsers;
    const canEditTenantSettings = canManageTenantUsers;
    const tenantThemePreview = useMemo(() => createTenantTheme(brandForm), [brandForm]);
    const brandingPaletteFields: Array<{ key: keyof typeof brandForm; label: string; group: 'Identidade' | 'Light' | 'Dark' }> = [
        { key: 'primaryColor', label: 'Primária', group: 'Identidade' },
        { key: 'secondaryColor', label: 'Secundária', group: 'Identidade' },
        { key: 'backgroundLight', label: 'Fundo', group: 'Light' },
        { key: 'panelLight', label: 'Painéis grandes', group: 'Light' },
        { key: 'controlLight', label: 'Campos/inputs', group: 'Light' },
        { key: 'controlActiveLight', label: 'Abas ativas', group: 'Light' },
        { key: 'sidebarLight', label: 'Sidebar', group: 'Light' },
        { key: 'surfaceLight', label: 'Subpainéis/agrupadores', group: 'Light' },
        { key: 'textLight', label: 'Texto', group: 'Light' },
        { key: 'borderLight', label: 'Borda', group: 'Light' },
        { key: 'backgroundDark', label: 'Fundo', group: 'Dark' },
        { key: 'panelDark', label: 'Painéis grandes', group: 'Dark' },
        { key: 'controlDark', label: 'Campos/inputs', group: 'Dark' },
        { key: 'controlActiveDark', label: 'Abas ativas', group: 'Dark' },
        { key: 'sidebarDark', label: 'Sidebar', group: 'Dark' },
        { key: 'surfaceDark', label: 'Subpainéis/agrupadores', group: 'Dark' },
        { key: 'textDark', label: 'Texto', group: 'Dark' },
        { key: 'borderDark', label: 'Borda', group: 'Dark' }
    ];
    const boxColorFields: Array<{ light: keyof typeof brandForm; dark: keyof typeof brandForm; label: string; hint: string }> = [
        { light: 'panelLight', dark: 'panelDark', label: 'Painéis grandes', hint: 'Headers, cards principais e caixas grandes.' },
        { light: 'surfaceLight', dark: 'surfaceDark', label: 'Subpainéis/agrupadores', hint: 'Agrupadores dentro de painéis, como Cores principais.' },
        { light: 'controlLight', dark: 'controlDark', label: 'Campos e caixas', hint: 'Inputs, botões neutros e campos de cor.' },
        { light: 'controlActiveLight', dark: 'controlActiveDark', label: 'Abas ativas', hint: 'Tabs e seleções ativas.' }
    ];

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

    const saveProposalSendAutomation = (nextConfig: typeof proposalSendAutomation) => {
        setGlobalConfig({
            ...globalConfig,
            proposalSendAutomation: normalizeProposalSendAutomation(nextConfig)
        });
    };

    const updateProposalSendAutomation = (updates: Partial<typeof proposalSendAutomation>) => {
        saveProposalSendAutomation({ ...proposalSendAutomation, ...updates });
    };

    const updateFollowUpTemplate = (templateId: string, updates: Partial<ProposalSendAutomationTemplate>) => {
        saveProposalSendAutomation({
            ...proposalSendAutomation,
            templates: proposalSendAutomation.templates.map(template =>
                template.id === templateId ? { ...template, ...updates } : template
            )
        });
    };

    const addFollowUpTemplate = () => {
        const id = `proposal-follow-up-${Date.now()}`;
        const nextTemplate: ProposalSendAutomationTemplate = {
            ...DEFAULT_PROPOSAL_SEND_FOLLOW_UP_TEMPLATE,
            id,
            name: 'Novo modelo de follow-up'
        };
        saveProposalSendAutomation({
            ...proposalSendAutomation,
            templates: [...proposalSendAutomation.templates, nextTemplate]
        });
        setSelectedFollowUpTemplateId(id);
    };

    const removeFollowUpTemplate = (templateId: string) => {
        if (proposalSendAutomation.templates.length <= 1) return;
        const nextTemplates = proposalSendAutomation.templates.filter(template => template.id !== templateId);
        const nextDefault = proposalSendAutomation.defaultTemplateId === templateId
            ? nextTemplates[0]?.id
            : proposalSendAutomation.defaultTemplateId;
        saveProposalSendAutomation({
            ...proposalSendAutomation,
            defaultTemplateId: nextDefault,
            templates: nextTemplates
        });
        if (selectedFollowUpTemplateId === templateId) {
            setSelectedFollowUpTemplateId(nextDefault || nextTemplates[0]?.id || null);
        }
    };

    const saveMicrosoftSharedMailboxes = (sharedMailboxes: MicrosoftSharedMailboxConfig[]) => {
        const normalized = sharedMailboxes
            .map(normalizeMicrosoftMailboxConfig)
            .filter(mailbox => mailbox.email.includes('@'))
            .filter((mailbox, index, list) => list.findIndex(item => item.email === mailbox.email) === index);
        setGlobalConfig({
            ...globalConfig,
            microsoftWorkspace: {
                ...(globalConfig.microsoftWorkspace || {}),
                personalInboxIntake: {
                    ...(globalConfig.microsoftWorkspace?.personalInboxIntake || {}),
                    enabled: false,
                    filters: normalizeMicrosoftInboxFilters(globalConfig.microsoftWorkspace?.personalInboxIntake?.filters)
                },
                sharedMailboxes: normalized
            }
        });
    };

    const addMicrosoftSharedMailbox = () => {
        const email = newSharedMailboxEmail.trim().toLowerCase();
        if (!email.includes('@')) return;
        saveMicrosoftSharedMailboxes([
            ...microsoftSharedMailboxes,
            {
                email,
                label: newSharedMailboxLabel.trim() || email,
                enabled: true,
                intakeMode: 'filtered',
                intakeStartAt: new Date().toISOString(),
                filters: DEFAULT_MICROSOFT_INBOX_FILTERS
            }
        ]);
        setNewSharedMailboxEmail('');
        setNewSharedMailboxLabel('');
    };

    const updateMicrosoftSharedMailbox = (email: string, updates: Partial<MicrosoftSharedMailboxConfig>) => {
        saveMicrosoftSharedMailboxes(microsoftSharedMailboxes.map(mailbox =>
            mailbox.email === email ? { ...mailbox, ...updates } : mailbox
        ));
    };

    const removeMicrosoftSharedMailbox = (email: string) => {
        saveMicrosoftSharedMailboxes(microsoftSharedMailboxes.filter(mailbox => mailbox.email !== email));
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
                const filePath = activeTenantId
                    ? `tenants/${activeTenantId}/letterhead/${fileName}`
                    : `letterhead/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('branding-assets')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('branding-assets')
                    .getPublicUrl(filePath);

                onUpload(publicUrl);
            } catch (error: any) {
                console.error('Error uploading logo:', error);
                alert('Erro ao fazer upload. Verifique se o bucket "branding-assets" existe no Supabase e é público.\nDetalhes: ' + error.message);
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
                    <div className={`w-full h-32 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border-2 border-dashed border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg overflow-hidden flex flex-col items-center justify-center transition-all group-hover:border-[var(--tenant-secondary-border)]`}>
                        {currentUrl ? (
                            <div className="relative w-full h-full flex items-center justify-center p-2">
                                <img src={currentUrl} alt={label} className="max-w-full max-h-full object-contain" />
                                <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
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
                                    <Loader2 size={24} className="animate-spin text-[var(--tenant-secondary)]" />
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

    const refreshAudit = async () => {
        if (!activeTenantId || !canViewTenantAudit) return;
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - auditPeriodDays);
        setAuditLoading(true);
        setAuditError(null);
        try {
            const result = await auditRepository.refreshTenantUserActivity(activeTenantId, {
                from: from.toISOString(),
                to: to.toISOString(),
                userId: auditUserFilter === 'ALL' ? undefined : auditUserFilter,
                action: auditActionFilter,
                entityType: auditEntityFilter,
                limit: 800
            });
            setActivityEvents(result.events);
            setActivitySummaries(result.summaries);
        } catch (error: any) {
            console.error('Error fetching tenant audit:', error);
            setAuditError(error.message || 'Erro ao carregar auditoria.');
        } finally {
            setAuditLoading(false);
        }
    };

    useEffect(() => {
        if (mainGroup === 'usuarios' && activeTenantId) {
            refreshUsers();
            refreshAudit();
        }
    }, [mainGroup, activeTenantId, auditPeriodDays, auditUserFilter, auditActionFilter, auditEntityFilter, canViewTenantAudit]);

    useEffect(() => {
        if (!canEditTenantSettings && canViewTenantAudit) {
            setMainGroup('usuarios');
            setActiveTab('user_list');
        }
    }, [canEditTenantSettings, canViewTenantAudit]);

    useEffect(() => {
        if (mainGroup === 'servicos' && !hasServicesPricing) {
            setMainGroup('gerais');
            setActiveTab('finance');
        }
        if (mainGroup === 'produtos' && !hasProductConfigurator) {
            setMainGroup('gerais');
            setActiveTab('finance');
        }
        if (activeTab === 'kits' && !hasServicesPricing) {
            setActiveTab('finance');
        }
        if ((activeTab === 'products' || activeTab === 'product_layout') && !hasProductConfigurator) {
            setActiveTab('finance');
        }
        if (activeTab === 'proposal_templates' && activeProposalTemplateKinds.length > 0 && !activeProposalTemplateKinds.includes(selectedTemplateKind)) {
            setSelectedTemplateKind(activeProposalTemplateKinds[0]);
        }
        if (activeTab === 'proposal_followup' && selectedFollowUpTemplate && selectedFollowUpTemplate.id !== selectedFollowUpTemplateId) {
            setSelectedFollowUpTemplateId(selectedFollowUpTemplate.id);
        }
        if (activeTab === 'pipelines' && pipelineOptions.length === 0) {
            setMainGroup('gerais');
            setActiveTab('finance');
        }
    }, [activeTab, mainGroup, hasServicesPricing, hasProductConfigurator, selectedTemplateKind, activeProposalTemplateKinds.join('|'), pipelineOptions.length, selectedFollowUpTemplate?.id, selectedFollowUpTemplateId]);

    useEffect(() => {
        if (pipelineOptions.length === 0) {
            setSelectedPipelineKey('');
            return;
        }
        if (!selectedPipelineKey || !pipelineOptions.some(option => option.key === selectedPipelineKey)) {
            setSelectedPipelineKey(pipelineOptions[0].key);
        }
    }, [pipelineOptions, selectedPipelineKey]);

    useEffect(() => {
        const branding = activeTenant?.branding || {};
        setBrandForm({
            logoUrl: branding.logoUrl || globalConfig.letterheadConfig?.logoUrl || '',
            displayName: branding.displayName || activeTenant?.name || globalConfig.letterheadConfig?.companyName || '',
            companyName: branding.companyName || globalConfig.letterheadConfig?.companyName || activeTenant?.name || '',
            slogan: branding.slogan || globalConfig.letterheadConfig?.companySlogan || '',
            faviconUrl: branding.faviconUrl || '',
            primaryColor: branding.primaryColor || globalConfig.letterheadConfig?.primaryColor || OPRICE_BRAND_PRIMARY,
            secondaryColor: branding.secondaryColor || globalConfig.letterheadConfig?.secondaryColor || OPRICE_BRAND_SECONDARY,
            backgroundLight: branding.backgroundLight || '#f8fafc',
            backgroundDark: branding.backgroundDark || '#151a24',
            sidebarLight: branding.sidebarLight || '#ffffff',
            sidebarDark: branding.sidebarDark || '#182031',
            panelLight: branding.panelLight || branding.surfaceLight || '#ffffff',
            panelDark: branding.panelDark || branding.surfaceDark || '#1f2937',
            controlLight: branding.controlLight || '#f8fafc',
            controlDark: branding.controlDark || '#182031',
            controlActiveLight: branding.controlActiveLight || '#ffffff',
            controlActiveDark: branding.controlActiveDark || '#0f172a',
            surfaceLight: branding.surfaceLight || '#ffffff',
            surfaceDark: branding.surfaceDark || '#1f2937',
            textLight: branding.textLight || '#0f172a',
            textDark: branding.textDark || '#f8fafc',
            borderLight: branding.borderLight || '#e2e8f0',
            borderDark: branding.borderDark || '#334155'
        });
    }, [activeTenant?.id]);

    const saveBranding = async () => {
        if (!activeTenantId || !canEditTenantBranding) return;
        const nextConfig: ProposalData = {
            ...globalConfig,
            letterheadConfig: {
                ...globalConfig.letterheadConfig!,
                logoUrl: brandForm.logoUrl || globalConfig.letterheadConfig?.logoUrl,
                primaryColor: brandForm.primaryColor,
                secondaryColor: brandForm.secondaryColor,
                companyName: brandForm.companyName || brandForm.displayName || globalConfig.letterheadConfig?.companyName || '',
                companySlogan: brandForm.slogan || globalConfig.letterheadConfig?.companySlogan || ''
            }
        };
        setBrandingSaving(true);
        setBrandingNotice(null);
        try {
            await updateTenantBranding(activeTenantId, brandForm);
            void Promise.resolve(setGlobalConfig(nextConfig) as unknown as Promise<void>).catch((error: any) => {
                setBrandingNotice({
                    type: 'error',
                    text: error.message || 'Marca salva, mas houve erro ao sincronizar o papel timbrado.'
                });
            });
            setBrandingNotice({ type: 'success', text: 'Marca e aparência do tenant salvas.' });
        } catch (error: any) {
            setBrandingNotice({ type: 'error', text: error.message || 'Erro ao salvar marca do tenant.' });
        } finally {
            setBrandingSaving(false);
        }
    };

    const uploadBrandLogo = async (file?: File) => {
        if (!activeTenantId || !file || !canEditTenantBranding) return;
        setAssetUploading('logo');
        setBrandingNotice(null);
        try {
            const publicUrl = await uploadTenantLogo(activeTenantId, file);
            setBrandForm(prev => ({ ...prev, logoUrl: publicUrl }));
            setBrandingNotice({ type: 'success', text: 'Logo enviada e aplicada ao tenant.' });
        } catch (error: any) {
            setBrandingNotice({ type: 'error', text: error.message || 'Erro ao enviar logo.' });
        } finally {
            setAssetUploading(null);
        }
    };

    const uploadBrandFavicon = async (file?: File) => {
        if (!activeTenantId || !file || !canEditTenantBranding) return;
        setAssetUploading('favicon');
        setBrandingNotice(null);
        try {
            const publicUrl = await uploadTenantBrandingAsset(activeTenantId, file, 'favicons');
            await updateTenantBranding(activeTenantId, { faviconUrl: publicUrl });
            setBrandForm(prev => ({ ...prev, faviconUrl: publicUrl }));
            setBrandingNotice({ type: 'success', text: 'Favicon enviado e aplicado na aba do navegador.' });
        } catch (error: any) {
            setBrandingNotice({ type: 'error', text: error.message || 'Erro ao enviar favicon.' });
        } finally {
            setAssetUploading(null);
        }
    };

    const updateMember = async (userId: string, updates: Partial<Pick<TenantMember, 'role' | 'allowed_types' | 'active'>>) => {
        if (!activeTenantId) return;
        if (!canManageTenantUsers) {
            alert('Apenas administradores podem alterar usuários do tenant.');
            return;
        }
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
        if (!canManageTenantUsers) {
            alert('Apenas administradores podem remover usuários do tenant.');
            return;
        }
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
        if (!canManageTenantUsers) {
            alert('Apenas administradores podem criar usuários do tenant.');
            return;
        }
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

    const topTabClass = (active: boolean, tone: 'brand' | 'secondary' = 'brand') =>
        `px-6 py-2 rounded-md text-sm font-bold transition-all ${active
            ? tone === 'secondary'
                ? 'bg-[var(--tenant-control-active)] text-[var(--tenant-secondary)] shadow dark:bg-[var(--tenant-control-active-dark)]'
                : 'bg-[var(--tenant-control-active)] text-[var(--tenant-primary)] shadow dark:bg-[var(--tenant-control-active-dark)]'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`;

    const subTabClass = (active: boolean, tone: 'brand' | 'secondary' = 'brand') =>
        `px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${active
            ? tone === 'secondary'
                ? 'bg-[var(--tenant-control-active)] text-[var(--tenant-secondary)] dark:bg-[var(--tenant-control-active-dark)]'
                : 'bg-[var(--tenant-control-active)] text-[var(--tenant-primary)] dark:bg-[var(--tenant-control-active-dark)]'
            : 'text-slate-500 hover:bg-[var(--tenant-control)] dark:text-slate-400 dark:hover:bg-[var(--tenant-control-dark)]'}`;

    const formatDateTime = (value?: string | null) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    };

    const formatDuration = (seconds?: number) => {
        const totalSeconds = Math.max(0, Math.round(seconds || 0));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        if (hours <= 0) return `${minutes}min`;
        return `${hours}h ${minutes}min`;
    };

    const getMemberName = (userId: string) => {
        const member = tenantMembers.find(item => item.userId === userId);
        return member?.fullName || member?.email || 'Usuario';
    };

    const summaryByUser = useMemo(() => {
        const map = new Map<string, TenantUserActivitySummary>();
        activitySummaries.forEach(summary => map.set(summary.userId, summary));
        return map;
    }, [activitySummaries]);

    const visibleActivityEvents = useMemo(() => (
        activityEvents.filter(event =>
            (auditUserFilter === 'ALL' || event.userId === auditUserFilter)
            && (auditActionFilter === 'ALL' || event.action === auditActionFilter)
            && (auditEntityFilter === 'ALL' || event.entityType === auditEntityFilter)
        )
    ), [activityEvents, auditUserFilter, auditActionFilter, auditEntityFilter]);

    const savePipelineConfig = (pipelineConfig: SalesPipelineConfig) => {
        const pricingModules = globalConfig.pricingModules || {};
        const moduleConfig = (pricingModules as any)[pipelineConfig.pricingModule] || {};
        const nextPipeline = normalizeSalesPipelineConfig(pipelineConfig, pipelineConfig.pricingModule, pipelineConfig.variant);
        setGlobalConfig({
            ...globalConfig,
            pricingModules: {
                ...pricingModules,
                [pipelineConfig.pricingModule]: {
                    ...moduleConfig,
                    pipelines: {
                        ...(moduleConfig.pipelines || {}),
                        [pipelineConfig.variant]: nextPipeline
                    }
                }
            }
        });
    };

    const updateSelectedPipeline = (updates: Partial<SalesPipelineConfig>) => {
        if (!selectedPipeline) return;
        savePipelineConfig({ ...selectedPipeline, ...updates });
    };

    const updatePipelineStage = (stageId: string, updates: Partial<SalesPipelineStageConfig>) => {
        if (!selectedPipeline) return;
        updateSelectedPipeline({
            stages: selectedPipeline.stages.map(stage =>
                stage.id === stageId ? { ...stage, ...updates } : stage
            )
        });
    };

    const movePipelineStage = (stageId: string, direction: -1 | 1) => {
        if (!selectedPipeline) return;
        const movableStages = selectedPipeline.stages
            .filter(stage => !stage.locked)
            .sort((a, b) => a.order - b.order);
        const index = movableStages.findIndex(stage => stage.id === stageId);
        const target = movableStages[index + direction];
        if (index < 0 || !target) return;

        updateSelectedPipeline({
            stages: selectedPipeline.stages.map(stage => {
                if (stage.id === stageId) return { ...stage, order: target.order };
                if (stage.id === target.id) return { ...stage, order: movableStages[index].order };
                return stage;
            })
        });
    };

    const addPipelineStage = () => {
        if (!selectedPipeline) return;
        const maxOrder = Math.max(
            10,
            ...selectedPipeline.stages.filter(stage => !stage.locked).map(stage => stage.order)
        );
        const newStage: SalesPipelineStageConfig = {
            id: `custom_${Date.now().toString(36)}`,
            label: 'Nova etapa',
            category: 'negotiation',
            order: maxOrder + 10,
            active: true,
            visibleInKanban: true,
            locked: false,
            colorToken: 'amber',
            probability: 60
        };
        updateSelectedPipeline({ stages: [...selectedPipeline.stages, newStage] });
    };

    const removePipelineStage = (stageId: string) => {
        if (!selectedPipeline) return;
        const stage = selectedPipeline.stages.find(item => item.id === stageId);
        if (!stage || stage.locked) return;
        updateSelectedPipeline({
            stages: selectedPipeline.stages.map(item =>
                item.id === stageId ? { ...item, active: false, visibleInKanban: false } : item
            )
        });
    };

    return (
        <PageShell className="max-w-[1600px]">
            <PageHeader
                icon={Settings}
                title="Configurações do Tenant"
                subtitle="Padrões e parâmetros do tenant ativo para novas propostas."
                actions={
                <div className="flex rounded-lg bg-[var(--tenant-control)] p-1 transition-colors dark:bg-[var(--tenant-control-dark)]">
                    {canEditTenantSettings && (
                        <>
                            <button
                                onClick={() => { setMainGroup('marca'); setActiveTab('brand'); }}
                                className={topTabClass(mainGroup === 'marca')}
                            >
                                Marca
                            </button>
                            <button
                                onClick={() => { setMainGroup('gerais'); setActiveTab('finance'); }}
                                className={topTabClass(mainGroup === 'gerais')}
                            >
                                Gerais
                            </button>
                            <button
                                onClick={() => { setMainGroup('crm'); setActiveTab('pipelines'); }}
                                className={topTabClass(mainGroup === 'crm')}
                            >
                                CRM
                            </button>
                            {hasServicesPricing && (
                            <button
                                onClick={() => { setMainGroup('servicos'); setActiveTab('kits'); }}
                                className={topTabClass(mainGroup === 'servicos')}
                            >
                                Serviços
                            </button>
                            )}
                            {hasProductConfigurator && (
                            <button
                                onClick={() => { setMainGroup('produtos'); setActiveTab('products'); }}
                                className={topTabClass(mainGroup === 'produtos', 'secondary')}
                            >
                                Produtos
                            </button>
                            )}
                            <button
                                onClick={() => { setMainGroup('propostas'); setActiveTab('proposal_templates'); }}
                                className={topTabClass(mainGroup === 'propostas')}
                            >
                                Propostas
                            </button>
                        </>
                    )}
                    {canViewTenantAudit && (
                        <button
                            onClick={() => { setMainGroup('usuarios'); setActiveTab('user_list'); }}
                            className={topTabClass(mainGroup === 'usuarios')}
                        >
                            Usuários
                        </button>
                    )}
                </div>
                }
            />

            {/* SUB-MENU SELECTION */}
            <div className="flex justify-center -mt-2 mb-6">
                <div className="flex gap-2">
                    {mainGroup === 'gerais' && (
                        <>
                            <button onClick={() => setActiveTab('finance')} className={subTabClass(activeTab === 'finance')}>Parâmetros Financeiros</button>
                            <button onClick={() => setActiveTab('taxes')} className={subTabClass(activeTab === 'taxes')}>Impostos & Encargos</button>
                            <button onClick={() => setActiveTab('accounting')} className={subTabClass(activeTab === 'accounting')}>Plano de Contas</button>
                        </>
                    )}
                    {mainGroup === 'crm' && (
                        <>
                            <button onClick={() => setActiveTab('pipelines')} className={subTabClass(activeTab === 'pipelines')}>Pipelines de Venda</button>
                            <button onClick={() => setActiveTab('proposal_followup')} className={subTabClass(activeTab === 'proposal_followup')}>Follow-up de Proposta</button>
                            <button onClick={() => setActiveTab('microsoft_workspace')} className={subTabClass(activeTab === 'microsoft_workspace')}>E-mail e Inbox</button>
                        </>
                    )}
                    {mainGroup === 'servicos' && hasServicesPricing && (
                        <>
                            <button onClick={() => setActiveTab('kits')} className={subTabClass(activeTab === 'kits')}>Kits & Recursos</button>
                        </>
                    )}
                    {mainGroup === 'produtos' && hasProductConfigurator && (
                        <>
                            <button onClick={() => setActiveTab('products')} className={subTabClass(activeTab === 'products', 'secondary')}>Catálogo de Itens</button>
                            <button onClick={() => setActiveTab('product_layout')} className={subTabClass(activeTab === 'product_layout', 'secondary')}>Layout do Orçamento</button>
                        </>
                    )}
                    {mainGroup === 'marca' && (
                        <>
                            <button onClick={() => setActiveTab('brand')} className={subTabClass(activeTab === 'brand')}>Marca & Aparência</button>
                            <button onClick={() => setActiveTab('letterhead')} className={subTabClass(activeTab === 'letterhead')}>Papel Timbrado</button>
                        </>
                    )}
                    {mainGroup === 'propostas' && (
                        <button onClick={() => setActiveTab('proposal_templates')} className={subTabClass(activeTab === 'proposal_templates')}>Templates de Proposta</button>
                    )}
                    {mainGroup === 'usuarios' && (
                        <button onClick={() => setActiveTab('user_list')} className={subTabClass(activeTab === 'user_list')}>Equipe & Auditoria</button>
                    )}
                </div>
            </div>

            {activeTab === 'brand' && (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-5 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-6 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-slate-100">
                                    <Palette size={20} style={{ color: tenantThemePreview.primary }} />
                                    Marca & Aparência
                                </h3>
                                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Identidade visual aplicada ao app, botões, sidebar e propostas.</p>
                            </div>
                            <button
                                type="button"
                                onClick={saveBranding}
                                disabled={!canEditTenantBranding || brandingSaving}
                                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-black text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                                style={{ backgroundColor: tenantThemePreview.primary, borderColor: tenantThemePreview.primary }}
                            >
                                {brandingSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Salvar marca
                            </button>
                        </div>

                        {brandingNotice && (
                            <div className={`rounded-md border px-3 py-2 text-sm font-bold ${brandingNotice.type === 'success' ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-red-300 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'}`}>
                                {brandingNotice.text}
                            </div>
                        )}

                        {!canEditTenantBranding && (
                            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                                Seu perfil pode visualizar a marca, mas somente ADMIN ou SUPER_ADMIN do tenant pode alterar.
                            </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Nome no app</span>
                                <input disabled={!canEditTenantBranding} value={brandForm.displayName || ''} onChange={event => setBrandForm(prev => ({ ...prev, displayName: event.target.value }))} className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-bold text-[var(--tenant-text)] outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] disabled:opacity-60 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]" />
                            </label>
                            <label className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Razão/Nome comercial</span>
                                <input disabled={!canEditTenantBranding} value={brandForm.companyName || ''} onChange={event => setBrandForm(prev => ({ ...prev, companyName: event.target.value }))} className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-bold text-[var(--tenant-text)] outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] disabled:opacity-60 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]" />
                            </label>
                            <label className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Slogan</span>
                                <input disabled={!canEditTenantBranding} value={brandForm.slogan || ''} onChange={event => setBrandForm(prev => ({ ...prev, slogan: event.target.value }))} className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-bold text-[var(--tenant-text)] outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] disabled:opacity-60 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]" />
                            </label>
                            <label className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Slug</span>
                                <input disabled value={`/${activeTenant?.slug || ''}`} className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-black text-slate-500 outline-none disabled:opacity-70 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400" />
                            </label>
                        </div>

                        <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Cores principais</p>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-500">Acentos do app e fundos base.</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {(['primaryColor', 'secondaryColor', 'backgroundLight', 'backgroundDark'] as Array<keyof typeof brandForm>).map(fieldKey => (
                                        <span key={fieldKey} className="h-5 w-5 rounded border border-white shadow-sm ring-1 ring-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] dark:ring-[var(--tenant-border-dark)]" style={{ backgroundColor: String(brandForm[fieldKey] || '#000000') }} />
                                    ))}
                                </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                {(['primaryColor', 'secondaryColor', 'backgroundLight', 'backgroundDark'] as Array<keyof typeof brandForm>).map(fieldKey => {
                                    const labels: Record<string, string> = {
                                        primaryColor: 'Primária',
                                        secondaryColor: 'Secundária',
                                        backgroundLight: 'Fundo light',
                                        backgroundDark: 'Fundo dark'
                                    };
                                    return (
                                        <label key={fieldKey} className="grid grid-cols-[42px_1fr] items-center gap-3 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-2.5 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                            <input disabled={!canEditTenantBranding} type="color" value={String(brandForm[fieldKey] || '#000000')} onChange={event => setBrandForm(prev => ({ ...prev, [fieldKey]: event.target.value }))} className="h-9 w-10 rounded border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-0 disabled:opacity-60 dark:border-[var(--tenant-border-dark)]" />
                                            <div className="min-w-0">
                                                <span className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{labels[String(fieldKey)]}</span>
                                                <input disabled={!canEditTenantBranding} value={String(brandForm[fieldKey] || '')} onChange={event => setBrandForm(prev => ({ ...prev, [fieldKey]: event.target.value }))} className="w-full bg-transparent font-mono text-xs font-bold text-slate-700 outline-none disabled:opacity-60 dark:text-slate-200" />
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowAdvancedBranding(prev => !prev)}
                            className="inline-flex h-9 items-center rounded-md border border-[var(--tenant-border)] px-3 text-xs font-black uppercase text-slate-500 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:text-slate-300"
                        >
                            {showAdvancedBranding ? 'Ocultar avançado' : 'Mostrar avançado'}
                        </button>

                        <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Cores das caixas e campos</p>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-500">Essas cores controlam os azuis/roxos de painéis, cards, inputs e abas.</p>
                                </div>
                            </div>
                            <div className="mb-4 grid gap-2 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 sm:grid-cols-5">
                                {[
                                    ['Fundo da página', brandForm.backgroundDark || '#000000'],
                                    ['Header/Painel', brandForm.panelDark || '#000000'],
                                    ['Subpainel', brandForm.surfaceDark || '#000000'],
                                    ['Campo/Input', brandForm.controlDark || '#000000'],
                                    ['Aba ativa', brandForm.controlActiveDark || '#000000']
                                ].map(([label, color]) => (
                                    <div key={label} className="flex items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-2 py-1.5 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                        <span className="h-4 w-4 rounded border border-white/70 shadow-sm" style={{ backgroundColor: String(color) }} />
                                        <span className="truncate">{label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="grid gap-3">
                                {boxColorFields.map(field => (
                                    <div key={field.label} className="grid gap-3 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] md:grid-cols-[minmax(150px,0.7fr)_1fr_1fr]">
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-slate-700 dark:text-slate-200">{field.label}</p>
                                            <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{field.hint}</p>
                                        </div>
                                        {[
                                            { key: field.light, label: 'Light' },
                                            { key: field.dark, label: 'Dark' }
                                        ].map(item => (
                                            <label key={String(item.key)} className="grid grid-cols-[42px_1fr] items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                <input disabled={!canEditTenantBranding} type="color" value={String(brandForm[item.key] || '#000000')} onChange={event => setBrandForm(prev => ({ ...prev, [item.key]: event.target.value }))} className="h-8 w-10 rounded border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-0 disabled:opacity-60 dark:border-[var(--tenant-border-dark)]" />
                                                <div className="min-w-0">
                                                    <span className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{item.label}</span>
                                                    <input disabled={!canEditTenantBranding} value={String(brandForm[item.key] || '')} onChange={event => setBrandForm(prev => ({ ...prev, [item.key]: event.target.value }))} className="w-full bg-transparent font-mono text-xs font-bold text-slate-700 outline-none disabled:opacity-60 dark:text-slate-200" />
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {showAdvancedBranding && (['Light', 'Dark'] as const).map(group => (
                            <div key={group}>
                                <p className="mb-2 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{group}</p>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {brandingPaletteFields.filter(field => field.group === group && ![
                                        'backgroundLight',
                                        'backgroundDark',
                                        'panelLight',
                                        'panelDark',
                                        'surfaceLight',
                                        'surfaceDark',
                                        'controlLight',
                                        'controlDark',
                                        'controlActiveLight',
                                        'controlActiveDark'
                                    ].includes(String(field.key))).map(field => (
                                        <label key={field.key} className="grid grid-cols-[42px_1fr] items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                            <input disabled={!canEditTenantBranding} type="color" value={String(brandForm[field.key] || '#000000')} onChange={event => setBrandForm(prev => ({ ...prev, [field.key]: event.target.value }))} className="h-8 w-10 rounded border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-0 disabled:opacity-60 dark:border-[var(--tenant-border-dark)]" />
                                            <div className="min-w-0">
                                                <span className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{field.label}</span>
                                                <input disabled={!canEditTenantBranding} value={String(brandForm[field.key] || '')} onChange={event => setBrandForm(prev => ({ ...prev, [field.key]: event.target.value }))} className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none disabled:opacity-60 dark:text-slate-200" />
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-5">
                        <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-5 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <h3 className="font-black text-slate-900 dark:text-white">Arquivos de marca</h3>
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Logo do app e favicon da aba.</p>
                                </div>
                                <ImageIcon size={18} style={{ color: tenantThemePreview.primary }} />
                            </div>

                            <div className="grid gap-3">
                                <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-black text-slate-900 dark:text-slate-100">Logo principal</p>
                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sidebar, cabeçalhos e propostas.</p>
                                        </div>
                                        <label className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-xs font-black transition ${canEditTenantBranding && !assetUploading ? 'cursor-pointer hover:brightness-95' : 'cursor-not-allowed opacity-60'}`} style={{ borderColor: tenantThemePreview.primaryBorder, color: tenantThemePreview.primary, backgroundColor: tenantThemePreview.primarySubtle }}>
                                            {assetUploading === 'logo' ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                                            Trocar
                                            <input disabled={!canEditTenantBranding || !!assetUploading} type="file" accept="image/*" className="hidden" onChange={event => uploadBrandLogo(event.target.files?.[0])} />
                                        </label>
                                    </div>
                                    <div className="mt-3 flex h-28 items-center justify-center rounded-md border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                        {brandForm.logoUrl ? <img src={brandForm.logoUrl} className="max-h-20 max-w-full object-contain" /> : <Building2 size={30} className="text-slate-400" />}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-black text-slate-900 dark:text-slate-100">Favicon</p>
                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ícone pequeno da aba do navegador.</p>
                                        </div>
                                        <label className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-xs font-black transition ${canEditTenantBranding && !assetUploading ? 'cursor-pointer hover:brightness-95' : 'cursor-not-allowed opacity-60'}`} style={{ borderColor: tenantThemePreview.secondaryBorder, color: tenantThemePreview.secondary, backgroundColor: tenantThemePreview.secondarySubtle }}>
                                            {assetUploading === 'favicon' ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                                            Enviar
                                            <input disabled={!canEditTenantBranding || !!assetUploading} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon" className="hidden" onChange={event => uploadBrandFavicon(event.target.files?.[0])} />
                                        </label>
                                    </div>
                                    <div className="mt-3 flex items-center gap-3 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                            {(brandForm.faviconUrl || brandForm.logoUrl) ? <img src={brandForm.faviconUrl || brandForm.logoUrl} className="h-full w-full object-contain" /> : <Building2 size={18} className="text-slate-400" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-slate-700 dark:text-slate-200">{brandForm.faviconUrl ? 'Favicon definido' : 'Usando logo como fallback'}</p>
                                            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">PNG, SVG, WEBP ou ICO.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border shadow-sm" style={{ borderColor: tenantThemePreview.borderLight, backgroundColor: tenantThemePreview.backgroundLight, backgroundImage: tenantThemePreview.backgroundGradientLight }}>
                            <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: tenantThemePreview.borderLight, backgroundColor: tenantThemePreview.panelLight }}>
                                <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-[var(--tenant-panel)]">
                                    {(brandForm.faviconUrl || brandForm.logoUrl) ? <img src={brandForm.faviconUrl || brandForm.logoUrl} className="h-4 w-4 object-contain" /> : <Building2 size={12} style={{ color: tenantThemePreview.primary }} />}
                                </div>
                                <p className="truncate text-[11px] font-black" style={{ color: tenantThemePreview.textLight }}>
                                    {brandForm.displayName || activeTenant?.name || 'Tenant'} | {activeTenant?.slug || 'slug'} - {brandForm.slogan || 'Slogan'}
                                </p>
                            </div>
                            <div className="flex min-h-64">
                                <aside className="relative w-24 border-r p-3" style={{ borderColor: tenantThemePreview.borderLight, backgroundColor: tenantThemePreview.sidebarLight, backgroundImage: tenantThemePreview.sidebarGradientLight }}>
                                    <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundImage: tenantThemePreview.topAccentGradient }} />
                                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border bg-[var(--tenant-panel)] p-2" style={{ borderColor: tenantThemePreview.primaryBorder }}>
                                        {brandForm.logoUrl ? <img src={brandForm.logoUrl} className="h-full w-full object-contain" /> : <Building2 size={18} style={{ color: tenantThemePreview.primary }} />}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-8 rounded-md" style={{ backgroundColor: tenantThemePreview.controlActiveLight, backgroundImage: tenantThemePreview.activeNavGradient, borderLeft: `3px solid ${tenantThemePreview.primary}` }} />
                                        <div className="h-8 rounded-md" style={{ backgroundColor: tenantThemePreview.controlLight }} />
                                        <div className="h-8 rounded-md" style={{ backgroundColor: tenantThemePreview.controlLight }} />
                                    </div>
                                </aside>
                                <main className="flex-1 p-3">
                                    <div className="mb-3 rounded-lg border p-3" style={{ borderColor: tenantThemePreview.borderLight, backgroundColor: tenantThemePreview.panelLight }}>
                                        <div className="mb-1 text-sm font-black" style={{ color: tenantThemePreview.textLight }}>{brandForm.displayName || activeTenant?.name || 'Tenant'}</div>
                                        <div className="text-[10px] font-bold" style={{ color: tenantThemePreview.secondary }}>{brandForm.slogan || 'Slogan do tenant'}</div>
                                    </div>
                                    <div className="rounded-lg border p-3" style={{ borderColor: tenantThemePreview.borderLight, backgroundColor: tenantThemePreview.panelLight }}>
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <span className="rounded-full border px-2 py-1 text-[10px] font-black uppercase" style={{ borderColor: tenantThemePreview.secondaryBorder, color: tenantThemePreview.secondary, backgroundColor: tenantThemePreview.secondarySoft }}>Ativo</span>
                                            <button className="rounded-md px-3 py-1.5 text-xs font-black text-white" style={{ backgroundColor: tenantThemePreview.primary }}>Botão</button>
                                        </div>
                                        <div className="h-2 rounded" style={{ backgroundColor: tenantThemePreview.primarySoft }} />
                                        <div className="mt-3 rounded-md border p-2 text-[10px] font-bold text-slate-500" style={{ borderColor: tenantThemePreview.borderLight, backgroundColor: tenantThemePreview.controlLight }}>
                                            Mini proposta comercial
                                            <div className="mt-2 h-2 rounded" style={{ backgroundColor: tenantThemePreview.secondarySoft }} />
                                        </div>
                                    </div>
                                </main>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 1: FINANCIAL PARAMETERS */}
            {activeTab === 'finance' && (
                <div className="max-w-4xl mx-auto space-y-6 transition-colors">
                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-8 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-sm transition-colors">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-6 flex items-center gap-2 transition-colors">
                            <Landmark size={24} className="text-[var(--tenant-primary)] dark:text-[var(--tenant-secondary)]" />
                            Taxas Padrão para Novos Projetos
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-2xl transition-colors">
                            Estes valores serão carregados automaticamente ao criar uma nova proposta.
                            Eles podem ser ajustados individualmente dentro de cada projeto, mas aqui você define a política do tenant.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Contingency */}
                            <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-lg border border-orange-100 dark:border-orange-800/50 relative group transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] text-orange-600 dark:text-orange-400 rounded-lg shadow-sm transition-colors"><ShieldAlert size={20} /></div>
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
                                        className="w-full pl-4 pr-12 py-3 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-orange-200 dark:border-orange-800 rounded-lg text-2xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500 transition-colors">%</div>
                                </div>
                            </div>

                            {/* Financial Cost */}
                            <div className="bg-[var(--tenant-secondary-soft)] dark:bg-[var(--tenant-secondary-soft)] p-6 rounded-lg border border-[var(--tenant-secondary-border)] dark:border-[var(--tenant-secondary-border)] relative group transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] rounded-lg shadow-sm transition-colors"><TrendingUp size={20} /></div>
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
                                        className="w-full pl-4 pr-12 py-3 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-secondary-border)] dark:border-[var(--tenant-secondary-border)] rounded-lg text-2xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-secondary-border)] outline-none transition-colors"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500 transition-colors">%</div>
                                </div>
                            </div>

                            {/* Markup Target */}
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-lg border border-emerald-100 dark:border-emerald-800/50 relative group transition-colors">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] text-emerald-600 dark:text-emerald-400 rounded-lg shadow-sm transition-colors"><TrendingUp size={20} /></div>
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
                                        className="w-full pl-4 pr-12 py-3 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-emerald-200 dark:border-emerald-800 rounded-lg text-2xl font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500 transition-colors">%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'pipelines' && (
                <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                        <h3 className="mb-1 text-sm font-black text-[var(--tenant-text)] dark:text-[var(--tenant-text-dark)]">Pipelines por modulo</h3>
                        <p className="mb-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Apenas modulos ativos no tenant aparecem aqui.</p>
                        <div className="space-y-2">
                            {pipelineOptions.map(option => (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setSelectedPipelineKey(option.key)}
                                    className={`w-full rounded-md border px-3 py-2 text-left text-xs font-black transition ${selectedPipelineKey === option.key
                                        ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)]'
                                        : 'border-[var(--tenant-border)] bg-[var(--tenant-panel)] text-slate-600 hover:border-[var(--tenant-primary-border)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300'}`}
                                >
                                    <span className="block">{option.shortLabel}</span>
                                    <span className="mt-0.5 block text-[10px] font-bold uppercase text-slate-400">{PIPELINE_VARIANT_LABELS[option.variant]}</span>
                                </button>
                            ))}
                            {pipelineOptions.length === 0 && (
                                <div className="rounded-md border border-dashed border-[var(--tenant-border)] p-4 text-center text-xs font-bold text-slate-400 dark:border-[var(--tenant-border-dark)]">
                                    Nenhum modulo de pricing ativo.
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedPipeline && selectedPipelineOption && (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-5 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-black text-[var(--tenant-text)] dark:text-[var(--tenant-text-dark)]">
                                            {selectedPipelineOption.shortLabel} - {PIPELINE_VARIANT_LABELS[selectedPipeline.variant]}
                                        </h3>
                                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                                            Renomeie, ordene e oculte etapas intermediarias sem quebrar oportunidades antigas.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addPipelineStage}
                                        className="inline-flex items-center gap-2 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-3 py-2 text-xs font-black text-[var(--tenant-primary)] transition hover:brightness-95"
                                    >
                                        <Plus size={15} /> Nova etapa
                                    </button>
                                </div>

                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    <label className="space-y-2">
                                        <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Etapa inicial padrao</span>
                                        <select
                                            value={selectedPipeline.defaultStageId}
                                            onChange={event => updateSelectedPipeline({ defaultStageId: event.target.value })}
                                            className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-100"
                                        >
                                            {selectedPipeline.stages
                                                .filter(stage => stage.active && !stage.locked)
                                                .sort((a, b) => a.order - b.order)
                                                .map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                                        </select>
                                    </label>
                                    <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                        <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Protegidas</p>
                                        <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300">Won e Lost permanecem bloqueadas para compatibilidade.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                <div className="grid grid-cols-[72px_1.2fr_150px_120px_120px_96px] gap-3 border-b border-[var(--tenant-border)] bg-[var(--tenant-control)] px-4 py-3 text-[10px] font-black uppercase text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                    <div>Ordem</div>
                                    <div>Etapa</div>
                                    <div>Categoria</div>
                                    <div>Prob.</div>
                                    <div>Exibicao</div>
                                    <div>Acoes</div>
                                </div>
                                <div className="divide-y divide-[var(--tenant-border)] dark:divide-[var(--tenant-border-dark)]">
                                    {selectedPipeline.stages
                                        .sort((a, b) => a.order - b.order)
                                        .map(stage => {
                                            const style = getPipelineStageStyle(stage);
                                            return (
                                                <div key={stage.id} className={`grid grid-cols-[72px_1.2fr_150px_120px_120px_96px] items-center gap-3 px-4 py-3 ${stage.active ? '' : 'opacity-60'}`}>
                                                    <div className="flex items-center gap-1">
                                                        <button type="button" disabled={stage.locked} onClick={() => movePipelineStage(stage.id, -1)} className="rounded border border-[var(--tenant-border)] px-2 py-1 text-[10px] font-black disabled:opacity-30 dark:border-[var(--tenant-border-dark)]">Up</button>
                                                        <button type="button" disabled={stage.locked} onClick={() => movePipelineStage(stage.id, 1)} className="rounded border border-[var(--tenant-border)] px-2 py-1 text-[10px] font-black disabled:opacity-30 dark:border-[var(--tenant-border-dark)]">Down</button>
                                                    </div>
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <span className={`h-3 w-3 shrink-0 rounded-full ${style.barColor}`} />
                                                        <input
                                                            disabled={stage.locked}
                                                            value={stage.label}
                                                            onChange={event => updatePipelineStage(stage.id, { label: event.target.value })}
                                                            className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-sm font-bold text-slate-700 outline-none disabled:bg-[var(--tenant-control)] disabled:text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100 dark:disabled:bg-[var(--tenant-panel-dark)]"
                                                        />
                                                    </div>
                                                    <select
                                                        disabled={stage.locked}
                                                        value={stage.category}
                                                        onChange={event => updatePipelineStage(stage.id, { category: event.target.value as SalesPipelineStageConfig['category'] })}
                                                        className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-2 py-2 text-xs font-bold text-slate-700 outline-none disabled:bg-[var(--tenant-control)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100"
                                                    >
                                                        {(stage.locked ? [{ id: stage.category, label: stage.category }] : PIPELINE_CATEGORY_OPTIONS).map(option => (
                                                            <option key={option.id} value={option.id}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        disabled={stage.locked}
                                                        value={stage.probability}
                                                        onChange={event => updatePipelineStage(stage.id, { probability: Number(event.target.value || 0) })}
                                                        className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-2 py-2 text-xs font-bold text-slate-700 outline-none disabled:bg-[var(--tenant-control)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100"
                                                    />
                                                    <div className="space-y-1">
                                                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                                            <input type="checkbox" checked={stage.active} disabled={stage.locked || selectedPipeline.defaultStageId === stage.id} onChange={event => updatePipelineStage(stage.id, { active: event.target.checked })} />
                                                            Ativa
                                                        </label>
                                                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                                            <input type="checkbox" checked={stage.visibleInKanban} disabled={stage.locked && stage.category !== 'won'} onChange={event => updatePipelineStage(stage.id, { visibleInKanban: event.target.checked })} />
                                                            Kanban
                                                        </label>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={stage.locked}
                                                        onClick={() => removePipelineStage(stage.id)}
                                                        className="inline-flex items-center justify-center gap-1 rounded-md border border-red-200 px-2 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
                                                    >
                                                        <Trash2 size={13} /> Ocultar
                                                    </button>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'proposal_followup' && selectedFollowUpTemplate && (
                <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="flex items-center gap-2 text-sm font-black text-[var(--tenant-text)] dark:text-[var(--tenant-text-dark)]">
                                    <Bell size={16} /> Modelos
                                </h3>
                                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Usados apos o envio de proposta por e-mail.</p>
                            </div>
                            <button type="button" onClick={addFollowUpTemplate} className="rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] p-2 text-[var(--tenant-primary)] transition hover:brightness-95" title="Novo modelo">
                                <Plus size={15} />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {proposalSendAutomation.templates.map(template => (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => setSelectedFollowUpTemplateId(template.id)}
                                    className={`w-full rounded-md border px-3 py-2 text-left text-xs font-black transition ${selectedFollowUpTemplate.id === template.id
                                        ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)]'
                                        : 'border-[var(--tenant-border)] text-slate-600 hover:bg-[var(--tenant-control)] dark:border-[var(--tenant-border-dark)] dark:text-slate-300 dark:hover:bg-[var(--tenant-control-dark)]'}`}
                                >
                                    <span className="block truncate">{template.name}</span>
                                    <span className="mt-0.5 block text-[10px] font-bold text-slate-400">
                                        {template.delayDays === 0 ? 'Hoje' : `${template.delayDays} dia(s)`}
                                        {proposalSendAutomation.defaultTemplateId === template.id ? ' - Padrao' : ''}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-5 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-6 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--tenant-border)] pb-5 dark:border-[var(--tenant-border-dark)]">
                            <div>
                                <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100">
                                    <CalendarClock size={22} className="text-[var(--tenant-primary)]" />
                                    Follow-up de Proposta
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Define a atividade criada automaticamente depois que uma proposta e enviada.</p>
                            </div>
                            <label className="flex items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-xs font-black text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={proposalSendAutomation.enabled}
                                    onChange={event => updateProposalSendAutomation({ enabled: event.target.checked })}
                                />
                                Automacao ativa
                            </label>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                            <label className="space-y-2">
                                <span className="text-xs font-black uppercase text-slate-500">Nome do modelo</span>
                                <input
                                    value={selectedFollowUpTemplate.name}
                                    onChange={event => updateFollowUpTemplate(selectedFollowUpTemplate.id, { name: event.target.value })}
                                    className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-100"
                                />
                            </label>
                            <label className="space-y-2">
                                <span className="text-xs font-black uppercase text-slate-500">Prazo</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={365}
                                    value={selectedFollowUpTemplate.delayDays}
                                    onChange={event => updateFollowUpTemplate(selectedFollowUpTemplate.id, { delayDays: Number(event.target.value || 0) })}
                                    className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-100"
                                />
                            </label>
                        </div>

                        <label className="space-y-2 block">
                            <span className="text-xs font-black uppercase text-slate-500">Titulo da atividade</span>
                            <input
                                value={selectedFollowUpTemplate.titleTemplate}
                                onChange={event => updateFollowUpTemplate(selectedFollowUpTemplate.id, { titleTemplate: event.target.value })}
                                className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-100"
                            />
                        </label>

                        <label className="space-y-2 block">
                            <span className="text-xs font-black uppercase text-slate-500">Descricao</span>
                            <textarea
                                rows={7}
                                value={selectedFollowUpTemplate.descriptionTemplate}
                                onChange={event => updateFollowUpTemplate(selectedFollowUpTemplate.id, { descriptionTemplate: event.target.value })}
                                className="w-full resize-y rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-100"
                            />
                        </label>

                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="flex items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-xs font-bold text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={proposalSendAutomation.defaultTemplateId === selectedFollowUpTemplate.id}
                                    onChange={event => {
                                        if (event.target.checked) updateProposalSendAutomation({ defaultTemplateId: selectedFollowUpTemplate.id });
                                    }}
                                />
                                Usar como padrao
                            </label>
                            <label className="flex items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-xs font-bold text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={Boolean(selectedFollowUpTemplate.syncMicrosoftTodo)}
                                    onChange={event => updateFollowUpTemplate(selectedFollowUpTemplate.id, { syncMicrosoftTodo: event.target.checked })}
                                />
                                Sincronizar com Microsoft To Do
                            </label>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Variaveis: {'{{cliente}}'}, {'{{proposta}}'}, {'{{assunto}}'}, {'{{destinatarios}}'}, {'{{responsavel}}'} e {'{{data_envio}}'}.</p>
                            <button
                                type="button"
                                onClick={() => removeFollowUpTemplate(selectedFollowUpTemplate.id)}
                                disabled={proposalSendAutomation.templates.length <= 1}
                                className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
                            >
                                <Trash2 size={14} /> Remover modelo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'microsoft_workspace' && (
                <div className="mx-auto max-w-5xl space-y-5 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-6 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--tenant-border)] pb-5 dark:border-[var(--tenant-border-dark)]">
                        <div>
                            <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100">
                                <Building2 size={22} className="text-[var(--tenant-primary)]" />
                                E-mail e Inbox Microsoft
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Configure caixas compartilhadas para triagem no CRM sem importar a caixa pessoal inteira.</p>
                        </div>
                    </div>

                    <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-4 py-3 text-xs font-semibold text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">
                        A caixa pessoal conectada continua sincronizando propostas e conversas conhecidas. A Inbox CRM de triagem usa apenas caixas compartilhadas ativas a partir da data configurada.
                    </div>

                    <div className="grid gap-3 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] md:grid-cols-[minmax(0,1fr)_minmax(180px,260px)_auto]">
                        <label className="space-y-2">
                            <span className="text-xs font-black uppercase text-slate-500">E-mail da caixa</span>
                            <input
                                value={newSharedMailboxEmail}
                                onChange={event => setNewSharedMailboxEmail(event.target.value)}
                                placeholder="comercial@empresa.com.br"
                                className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100"
                            />
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-black uppercase text-slate-500">Nome</span>
                            <input
                                value={newSharedMailboxLabel}
                                onChange={event => setNewSharedMailboxLabel(event.target.value)}
                                placeholder="Comercial"
                                className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100"
                            />
                        </label>
                        <button
                            type="button"
                            disabled={!newSharedMailboxEmail.trim().includes('@')}
                            onClick={addMicrosoftSharedMailbox}
                            className="self-end inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--tenant-primary)] px-4 text-sm font-black text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Plus size={16} /> Adicionar
                        </button>
                    </div>

                    <div className="space-y-3">
                        {microsoftSharedMailboxes.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-control)] px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">
                                Nenhuma caixa compartilhada configurada para este tenant.
                            </div>
                        ) : microsoftSharedMailboxes.map(mailbox => (
                            <div key={mailbox.email} className="space-y-4 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,260px)_160px_auto_auto]">
                                    <input
                                        value={mailbox.email}
                                        onChange={event => updateMicrosoftSharedMailbox(mailbox.email, { email: event.target.value })}
                                        className="min-h-10 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100"
                                    />
                                    <input
                                        value={mailbox.label || ''}
                                        onChange={event => updateMicrosoftSharedMailbox(mailbox.email, { label: event.target.value })}
                                        className="min-h-10 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100"
                                    />
                                    <input
                                        type="datetime-local"
                                        value={toDateTimeLocalValue(mailbox.intakeStartAt)}
                                        onChange={event => updateMicrosoftSharedMailbox(mailbox.email, { intakeStartAt: fromDateTimeLocalValue(event.target.value) })}
                                        className="min-h-10 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100"
                                        title="Importar recebidos a partir desta data"
                                    />
                                    <label className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 text-xs font-black text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={mailbox.enabled !== false}
                                            onChange={event => updateMicrosoftSharedMailbox(mailbox.email, { enabled: event.target.checked })}
                                        />
                                        Ativa
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => removeMicrosoftSharedMailbox(mailbox.email)}
                                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-xs font-black text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
                                    >
                                        <Trash2 size={14} /> Remover
                                    </button>
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                    <label className="inline-flex items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-xs font-bold text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={mailbox.filters?.ignoreNoReply !== false}
                                            onChange={event => updateMicrosoftSharedMailbox(mailbox.email, { filters: { ...mailbox.filters, ignoreNoReply: event.target.checked } })}
                                        />
                                        Ignorar no-reply
                                    </label>
                                    <label className="inline-flex items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-xs font-bold text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={mailbox.filters?.ignoreAutoReplies !== false}
                                            onChange={event => updateMicrosoftSharedMailbox(mailbox.email, { filters: { ...mailbox.filters, ignoreAutoReplies: event.target.checked } })}
                                        />
                                        Ignorar respostas automáticas
                                    </label>
                                    <label className="inline-flex items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-xs font-bold text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={mailbox.filters?.ignoreNewsletters !== false}
                                            onChange={event => updateMicrosoftSharedMailbox(mailbox.email, { filters: { ...mailbox.filters, ignoreNewsletters: event.target.checked } })}
                                        />
                                        Ignorar newsletters
                                    </label>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <label className="space-y-2">
                                        <span className="text-xs font-black uppercase text-slate-500">Domínios ignorados</span>
                                        <input
                                            value={listToCsv(mailbox.filters?.ignoredDomains)}
                                            onChange={event => updateMicrosoftSharedMailbox(mailbox.email, { filters: { ...mailbox.filters, ignoredDomains: csvToList(event.target.value) } })}
                                            placeholder="exemplo.com, newsletter.com"
                                            className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100"
                                        />
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-xs font-black uppercase text-slate-500">Remetentes ignorados</span>
                                        <input
                                            value={listToCsv(mailbox.filters?.ignoredSenders)}
                                            onChange={event => updateMicrosoftSharedMailbox(mailbox.email, { filters: { ...mailbox.filters, ignoredSenders: csvToList(event.target.value) } })}
                                            placeholder="noreply@exemplo.com"
                                            className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100"
                                        />
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-4 py-3 text-xs font-semibold text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">
                        A conta Microsoft conectada precisa ter acesso delegado a cada caixa compartilhada e o App Registration precisa de Mail.Read.Shared. Se uma nova permissão aparecer no Microsoft, reconecte o Outlook no CRM para renovar o consentimento.
                    </div>
                </div>
            )}

            {/* TAB 4: ACCOUNTING */}
            {activeTab === 'accounting' && (
                <div className="max-w-5xl mx-auto space-y-12 transition-colors">
                    {/* SERVIÇOS SECTION */}
                    {hasServicesPricing && (
                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-8 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-sm transition-colors">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-6 flex items-center gap-2 transition-colors">
                            <BookOpen size={24} className="text-[var(--tenant-secondary)]" />
                            Mapeamento Contábil: Serviços
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-3xl transition-colors">
                            Codificação para DRE de contratos de manutenção e prestação de serviços.
                        </p>

                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-4 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] p-2 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest transition-colors border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]">
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
                                <div key={item.key} className="grid grid-cols-12 gap-4 items-center p-2 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] transition-colors">
                                    <div className="col-span-4 font-bold text-slate-700 dark:text-slate-300 text-sm">
                                        {item.label}
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            value={accountingConfig[item.key as keyof AccountingMapping]?.code || ''}
                                            onChange={(e) => updateAccount(false, item.key as keyof AccountingMapping, 'code', e.target.value)}
                                            className="w-full bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded px-2 py-1 text-xs font-mono text-slate-600 dark:text-slate-400 focus:border-[var(--tenant-secondary-border)] outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="col-span-6">
                                        <input
                                            type="text"
                                            value={accountingConfig[item.key as keyof AccountingMapping]?.name || ''}
                                            onChange={(e) => updateAccount(false, item.key as keyof AccountingMapping, 'name', e.target.value)}
                                            className="w-full bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded px-2 py-1 text-xs text-slate-600 dark:text-slate-400 focus:border-[var(--tenant-secondary-border)] outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    )}

                    {/* PRODUTOS SECTION */}
                    {hasProductConfigurator && (
                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-8 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-sm transition-colors">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-6 flex items-center gap-2 transition-colors">
                            <BookOpen size={24} className="text-emerald-500" />
                            Mapeamento Contábil: Produtos
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-3xl transition-colors">
                            Codificação para DRE de venda de itens, peças e equipamentos.
                        </p>

                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-4 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] p-2 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest transition-colors border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]">
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
                                <div key={item.key} className="grid grid-cols-12 gap-4 items-center p-2 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] transition-colors">
                                    <div className="col-span-4 font-bold text-slate-700 dark:text-slate-300 text-sm">
                                        {item.label}
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            value={productAccountingConfig[item.key as keyof AccountingMapping]?.code || ''}
                                            onChange={(e) => updateAccount(true, item.key as keyof AccountingMapping, 'code', e.target.value)}
                                            className="w-full bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded px-2 py-1 text-xs font-mono text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="col-span-6">
                                        <input
                                            type="text"
                                            value={productAccountingConfig[item.key as keyof AccountingMapping]?.name || ''}
                                            onChange={(e) => updateAccount(true, item.key as keyof AccountingMapping, 'name', e.target.value)}
                                            className="w-full bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded px-2 py-1 text-xs text-slate-600 dark:text-slate-400 focus:border-emerald-500 outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    )}
                </div>
            )}

            {/* TAB 2: TAXES & CHARGES */}
            {activeTab === 'taxes' ? (
                <div className="bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)] rounded-lg p-2 transition-colors">
                    <Taxes
                        data={globalConfig}
                        updateData={updateGlobalData}
                        showServiceCharges={hasServicesPricing}
                        showProductTaxes={hasProductConfigurator}
                    />
                </div>
            ) : activeTab === 'kits' && hasServicesPricing ? (
                /* KITS TAB */
                <div className="flex gap-8 h-[calc(100vh-250px)] transition-colors">
                    {/* LEFT SIDEBAR: KIT LIST */}
                    <div className="w-80 shrink-0 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg shadow-sm flex flex-col overflow-hidden transition-colors">
                        <div className="p-4 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] flex justify-between items-center transition-colors">
                            <div>
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Biblioteca de Kits</h3>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">EPIs, Ferramentas, Veículos</p>
                            </div>
                            <button onClick={handleNewKit} className="p-1.5 bg-[var(--tenant-primary)] dark:bg-[var(--tenant-secondary-soft)] text-white rounded hover:brightness-95 dark:hover:bg-[var(--tenant-secondary-soft)] transition-colors"><Plus size={16} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {(globalConfig.kitTemplates || []).map(kit => {
                                const isSelected = selectedKitId === kit.id;
                                return (
                                    <div
                                        key={kit.id}
                                        onClick={() => setSelectedKitId(kit.id)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all group relative ${isSelected ? 'bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border-[var(--tenant-primary)] dark:border-[var(--tenant-secondary-border)] ring-1 ring-[var(--tenant-primary)] dark:ring-[var(--tenant-primary-soft)]' : 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] hover:border-[var(--tenant-border)] dark:hover:border-[var(--tenant-border-dark)]'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-md transition-colors ${isSelected ? 'bg-[var(--tenant-primary)] dark:bg-[var(--tenant-secondary-soft)] text-white' : 'bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] text-slate-500 dark:text-slate-400'}`}>
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
                    <div className="flex-1 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg shadow-sm flex flex-col overflow-hidden transition-colors">
                        {selectedKit ? (
                            <>
                                <div className="p-6 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] transition-colors">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block transition-colors">Nome do Kit / Recurso</label>
                                            <input
                                                type="text"
                                                value={selectedKit.name}
                                                onChange={(e) => handleUpdateKitField(selectedKit.id, 'name', e.target.value)}
                                                className="w-full text-2xl font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-[var(--tenant-border)] dark:hover:border-[var(--tenant-border-dark)] focus:border-[var(--tenant-primary)] dark:focus:border-[var(--tenant-secondary-border)] focus:ring-0 px-0 outline-none transition-all placeholder-slate-300 dark:placeholder-slate-700"
                                                placeholder="Ex: Kit Ferramentas Mecânica, Caminhonete Padrão..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block transition-colors">Ícone</label>
                                            <select
                                                value={selectedKit.icon}
                                                onChange={(e) => handleUpdateKitField(selectedKit.id, 'icon', e.target.value)}
                                                className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] text-slate-700 dark:text-slate-200 rounded-lg p-2 text-sm focus:ring-0 outline-none cursor-pointer transition-colors"
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
                                            className="w-full text-sm text-slate-600 dark:text-slate-400 bg-transparent border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:border-[var(--tenant-primary)] dark:focus:border-[var(--tenant-secondary-border)] focus:ring-0 outline-none transition-colors"
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
                                            className="text-xs bg-[var(--tenant-primary)] dark:bg-[var(--tenant-secondary-soft)] text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 hover:brightness-95 dark:hover:bg-[var(--tenant-secondary-soft)] transition-colors"
                                        >
                                            <Plus size={14} /> Adicionar Item
                                        </button>
                                    </div>

                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] transition-colors">
                                            <tr>
                                                <th className="px-4 py-3">Item / Produto</th>
                                                <th className="px-4 py-3 w-32">Categoria</th>
                                                <th className="px-4 py-3 w-28">Valor Unit.</th>
                                                <th className="px-4 py-3 w-24">Vida Útil</th>
                                                <th className="px-4 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--tenant-border)] dark:divide-[var(--tenant-border-dark)] transition-colors">
                                            {selectedKit.items.map(item => (
                                                <tr key={item.id} className="hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] transition-colors">
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
                                                            <option value="EPI" className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] border-none">EPI</option>
                                                            <option value="Tools" className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] border-none">Ferramentas</option>
                                                            <option value="Vehicles" className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] border-none">Veículos</option>
                                                            <option value="Consumables" className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] border-none">Consumíveis</option>
                                                            <option value="IT" className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] border-none">TI</option>
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

                                    <div className="mt-6 p-4 bg-[var(--tenant-secondary-soft)] dark:bg-[var(--tenant-secondary-soft)] border border-[var(--tenant-secondary-border)] dark:border-[var(--tenant-secondary-border)] rounded-lg flex items-start gap-2 transition-colors">
                                        <div className="text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] mt-0.5 transition-colors"><Info size={16} /></div>
                                        <p className="text-xs text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] leading-relaxed transition-colors">
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
                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-8 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-sm transition-colors">
                        <header className="mb-8">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                                <Palette size={24} className="text-[var(--tenant-primary)] dark:text-[var(--tenant-secondary)]" />
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

                            <div className="col-span-2 space-y-4 pt-4 border-t border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]">
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
                                            value={globalConfig.letterheadConfig?.primaryColor || OPRICE_BRAND_PRIMARY}
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
                                            className="flex-1 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-2 py-1 text-sm font-mono"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block">Cor de Destaque</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={globalConfig.letterheadConfig?.secondaryColor || OPRICE_BRAND_SECONDARY}
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
                                            className="flex-1 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-2 py-1 text-sm font-mono"
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
                                    className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 outline-none"
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
                                    className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 outline-none"
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
                                        className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 text-sm outline-none"
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
                                        className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 text-sm outline-none"
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
                                        className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 text-sm outline-none"
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
                                        className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 text-sm outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 pt-8 border-t border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pré-visualização do Timbrado</h4>
                        <div className="bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] p-6 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-[var(--tenant-panel)] rounded border flex items-center justify-center p-1">
                                    {globalConfig.letterheadConfig?.logoUrl ? (
                                        <img src={globalConfig.letterheadConfig.logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <Package className="text-slate-300" size={24} />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-black text-xl leading-none" style={{ color: globalConfig.letterheadConfig?.primaryColor || OPRICE_BRAND_PRIMARY }}>
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
            {activeTab === 'products' && hasProductConfigurator && (
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
                            <div key={product.id} className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg p-5 shadow-sm group hover:border-emerald-200 dark:hover:border-emerald-800 transition-all">
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
                                                className="text-[10px] font-mono font-bold bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] text-slate-500 px-2 py-0.5 rounded border-none focus:ring-1 focus:ring-emerald-500 w-24"
                                            />
                                            <input
                                                type="text"
                                                value={product.ncm || ''}
                                                onChange={(e) => {
                                                    const updated = globalConfig.productCatalog?.map(p => p.id === product.id ? { ...p, ncm: e.target.value } : p);
                                                    setGlobalConfig({ ...globalConfig, productCatalog: updated });
                                                }}
                                                placeholder="NCM"
                                                className="text-[10px] font-mono font-bold bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] text-slate-500 px-2 py-0.5 rounded border-none focus:ring-1 focus:ring-emerald-500 w-20"
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
                                                className="text-[10px] text-slate-400 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500 outline-none w-full"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <div className="w-20 h-20 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] overflow-hidden bg-[var(--tenant-panel)] shadow-inner flex items-center justify-center relative group-hover:border-emerald-300 transition-colors">
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

                                <div className="grid grid-cols-2 gap-4 mt-4 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] p-3 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]">
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
                                                className="w-full pl-8 pr-2 py-1.5 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded text-sm font-black text-slate-700 dark:text-slate-200"
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
                                                className="w-full pr-6 pl-2 py-1.5 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded text-sm font-black text-emerald-600 dark:text-emerald-400"
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
            {activeTab === 'product_layout' && hasProductConfigurator && (
                <div className="max-w-4xl mx-auto space-y-6 transition-colors">
                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-8 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-sm transition-colors">
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
                                    className="w-full h-full min-h-[180px] px-4 py-3 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg text-xs text-slate-600 dark:text-slate-300 resize-none outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                    <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-6 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                        <div className="mb-6 flex flex-col gap-2 border-b border-[var(--tenant-border)] pb-5 dark:border-[var(--tenant-border-dark)]">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Templates de Proposta</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Configure os textos e e-mails usados na proposta tecnico-comercial de cada modalidade do tenant ativo.
                            </p>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                            <nav className="space-y-2">
                                {activeProposalTemplateKinds.map(kind => (
                                    <button
                                        key={kind}
                                        type="button"
                                        onClick={() => setSelectedTemplateKind(kind)}
                                        className={`w-full rounded-md border px-4 py-3 text-left text-sm font-bold transition-colors ${selectedTemplateKind === kind ? 'border-[var(--tenant-secondary-border)] bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] dark:border-[var(--tenant-secondary-border)] dark:bg-[var(--tenant-secondary-soft)] dark:text-[var(--tenant-secondary)]' : 'border-[var(--tenant-border)] text-slate-600 hover:bg-[var(--tenant-control)] dark:border-[var(--tenant-border-dark)] dark:text-slate-300 dark:hover:bg-[var(--tenant-control-dark)]'}`}
                                    >
                                        {PROPOSAL_TEMPLATE_LABELS[kind]}
                                    </button>
                                ))}
                            </nav>

                            <div className="space-y-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className="space-y-2">
                                        <span className="text-xs font-black uppercase text-slate-500">Nome do template</span>
                                        <input value={selectedProposalTemplate.name} onChange={event => updateProposalTemplate('name', event.target.value)} className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-100" />
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-xs font-black uppercase text-slate-500">Assunto do e-mail</span>
                                        <input value={selectedProposalTemplate.emailSubject} onChange={event => updateProposalTemplate('emailSubject', event.target.value)} className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-100" />
                                    </label>
                                </div>

                                <label className="space-y-2 block">
                                    <span className="text-xs font-black uppercase text-slate-500">Corpo do e-mail</span>
                                    <textarea rows={5} value={selectedProposalTemplate.emailBody} onChange={event => updateProposalTemplate('emailBody', event.target.value)} className="w-full resize-y rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-100" />
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
                                        <textarea rows={4} value={selectedProposalTemplate[field as keyof ProposalTemplateConfig] as string} onChange={event => updateProposalTemplate(field as keyof ProposalTemplateConfig, event.target.value)} className="w-full resize-y rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-100" />
                                    </label>
                                ))}

                                <p className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-xs text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-400">
                                    Variaveis disponiveis: {'{{cliente}}'}, {'{{proposta}}'}, {'{{modalidade}}'}, {'{{empresa}}'}, {'{{valor}}'} e {'{{validade}}'}.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'user_list' && (
                <div className="mx-auto max-w-6xl space-y-6">
                    <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-6 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="flex items-center gap-3 text-xl font-bold text-slate-800 dark:text-slate-100">
                                    <span className="rounded-lg bg-[var(--tenant-secondary-soft)] p-2 text-[var(--tenant-secondary)] dark:bg-[var(--tenant-secondary-soft)] dark:text-[var(--tenant-secondary)]">
                                        <Users size={22} />
                                    </span>
                                    Equipe & Auditoria
                                </h3>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    Acompanhe membros, tempo logado, ações e produtividade CRM de {activeTenant?.branding?.displayName || activeTenant?.name || 'este tenant'}.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {canManageTenantUsers && (
                                <button type="button" onClick={() => setIsCreatingUser(prev => !prev)} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${isCreatingUser ? 'bg-[var(--tenant-control)] text-slate-600 dark:bg-[var(--tenant-control-dark)] dark:text-slate-300' : 'bg-[var(--tenant-primary)] text-white hover:bg-[var(--tenant-secondary-soft)]'}`}>
                                    {isCreatingUser ? <X size={17} /> : <UserPlus size={17} />}
                                    {isCreatingUser ? 'Cancelar' : 'Convidar usuário'}
                                </button>
                                )}
                                <button type="button" onClick={() => { refreshUsers(); refreshAudit(); }} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-[var(--tenant-control)] hover:text-[var(--tenant-secondary)] dark:hover:bg-[var(--tenant-control-dark)]" title="Atualizar lista">
                                    <Loader2 size={18} className={loadingProfiles || auditLoading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>

                        {isCreatingUser && canManageTenantUsers && (
                            <form onSubmit={handleCreateUser} className="mb-6 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <input value={newUserName} onChange={event => setNewUserName(event.target.value)} required placeholder="Nome completo" className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-sm font-semibold outline-none focus:border-[var(--tenant-secondary-border)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]" />
                                    <input type="email" value={newUserEmail} onChange={event => setNewUserEmail(event.target.value)} required placeholder="email@empresa.com" className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-sm font-semibold outline-none focus:border-[var(--tenant-secondary-border)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]" />
                                    <div className="relative">
                                        <input type={showNewUserPassword ? 'text' : 'password'} value={newUserPassword} onChange={event => setNewUserPassword(event.target.value)} required minLength={6} placeholder="Senha temporária" className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 pr-10 text-sm font-semibold outline-none focus:border-[var(--tenant-secondary-border)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]" />
                                        <button type="button" onClick={() => setShowNewUserPassword(prev => !prev)} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-[var(--tenant-control)] hover:text-slate-700 dark:hover:bg-[var(--tenant-control-dark)]">
                                            {showNewUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <select value={newUserRole} onChange={event => setNewUserRole(event.target.value as AppRole)} className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-sm font-semibold outline-none focus:border-[var(--tenant-secondary-border)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
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
                                    <button type="submit" className="flex items-center gap-2 rounded-lg bg-[var(--tenant-primary)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--tenant-secondary-soft)]">
                                        <Save size={16} />
                                        Criar cadastro
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="mb-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                    { label: 'Usuários ativos', value: activitySummaries.filter(item => item.activeSession).length, icon: Activity },
                                    { label: 'Eventos no período', value: activitySummaries.reduce((acc, item) => acc + item.totalEvents, 0), icon: ListFilter },
                                    { label: 'Propostas criadas', value: activitySummaries.reduce((acc, item) => acc + item.proposalsCreated, 0), icon: FileText },
                                    { label: 'Tarefas criadas', value: activitySummaries.reduce((acc, item) => acc + item.tasksCreated, 0), icon: CalendarClock }
                                ].map(card => {
                                    const Icon = card.icon;
                                    return (
                                        <div key={card.label} className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)]">
                                                <Icon size={17} />
                                            </div>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white">{card.value}</p>
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{card.label}</p>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                                    <ListFilter size={15} />
                                    Filtros da auditoria
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <select value={auditPeriodDays} onChange={event => setAuditPeriodDays(Number(event.target.value))} className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-xs font-bold dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                        <option value={7}>Últimos 7 dias</option>
                                        <option value={30}>Últimos 30 dias</option>
                                        <option value={90}>Últimos 90 dias</option>
                                    </select>
                                    <select value={auditUserFilter} onChange={event => setAuditUserFilter(event.target.value)} className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-xs font-bold dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                        <option value="ALL">Todos os usuários</option>
                                        {tenantMembers.map(member => <option key={member.userId} value={member.userId}>{member.fullName || member.email}</option>)}
                                    </select>
                                    <select value={auditActionFilter} onChange={event => setAuditActionFilter(event.target.value as TenantActivityAction | 'ALL')} className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-xs font-bold dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                        <option value="ALL">Todas as ações</option>
                                        {(['CREATE', 'UPDATE', 'DELETE', 'SEND', 'SYNC', 'TRIAGE', 'VERSION_CREATE', 'STAGE_CHANGE', 'STATUS_CHANGE', 'PAGE_VIEW'] as TenantActivityAction[]).map(action => <option key={action} value={action}>{action}</option>)}
                                    </select>
                                    <select value={auditEntityFilter} onChange={event => setAuditEntityFilter(event.target.value as TenantAuditEntityType | 'ALL')} className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-xs font-bold dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                        <option value="ALL">Todas as entidades</option>
                                        {(['client', 'contact', 'task', 'proposal', 'tenant_user', 'tenant_settings', 'communication', 'workspace', 'page'] as TenantAuditEntityType[]).map(entity => <option key={entity} value={entity}>{entity}</option>)}
                                    </select>
                                </div>
                                {auditError && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{auditError}</p>}
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[var(--tenant-control)] text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-[var(--tenant-control-dark)]">
                                    <tr>
                                        <th className="px-4 py-3">Usuário</th>
                                        <th className="px-4 py-3">Papel</th>
                                        <th className="px-4 py-3">Unidades</th>
                                        <th className="px-4 py-3">Último acesso</th>
                                        <th className="px-4 py-3">Produtividade</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--tenant-border)] dark:divide-[var(--tenant-border-dark)]">
                                    {loadingProfiles && tenantMembers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                                                <Loader2 size={28} className="mx-auto mb-2 animate-spin text-[var(--tenant-secondary)]" />
                                                Carregando usuários do tenant...
                                            </td>
                                        </tr>
                                    ) : tenantMembers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-10 text-center text-slate-400">Nenhum usuário vinculado a este tenant.</td>
                                        </tr>
                                    ) : tenantMembers.map(member => {
                                        const summary = summaryByUser.get(member.userId);
                                        return (
                                        <tr key={member.userId} className="hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)]">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--tenant-primary)] text-sm font-black text-white">
                                                        {member.fullName?.[0] || member.email?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-slate-800 dark:text-slate-100">{member.fullName || 'Usuário sem nome'}</p>
                                                            {member.platformRole === 'SUPER_ADMIN' && <Shield size={14} className="text-[var(--tenant-secondary)]" />}
                                                        </div>
                                                        <p className="text-xs text-slate-500">{member.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <select disabled={!canManageTenantUsers} value={member.role} onChange={event => updateMember(member.userId, { role: event.target.value as AppRole })} className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-2 py-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                                    {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex gap-2">
                                                    {(['SERVICES', 'PRODUCTS'] as BusinessUnitAccess[]).map(access => (
                                                        <button type="button" disabled={!canManageTenantUsers} key={access} onClick={() => toggleMemberAccess(member, access)} className={`rounded-md border px-2 py-1 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-60 ${member.allowed_types.includes(access) || member.allowed_types.includes('BOTH') ? 'border-[var(--tenant-secondary-border)] bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] dark:border-[var(--tenant-secondary-border)] dark:bg-[var(--tenant-secondary-soft)]0/10 dark:text-[var(--tenant-secondary)]' : 'border-[var(--tenant-border)] text-slate-500 dark:border-[var(--tenant-border-dark)]'}`}>
                                                            {access}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${summary?.activeSession ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-[var(--tenant-control)] text-slate-500 dark:bg-[var(--tenant-control-dark)] dark:text-slate-300'}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${summary?.activeSession ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                        {summary?.activeSession ? 'ONLINE' : 'OFFLINE'}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-500">{formatDateTime(summary?.lastSeenAt || summary?.lastLoginAt)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="grid gap-1 text-xs text-slate-600 dark:text-slate-300">
                                                    <span className="font-bold"><Clock size={13} className="mr-1 inline" />{formatDuration(summary?.periodOnlineSeconds)}</span>
                                                    <span>{summary?.totalEvents || 0} eventos</span>
                                                    <span>{summary?.proposalsCreated || 0} propostas · {summary?.tasksCreated || 0} tarefas</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button type="button" disabled={!canManageTenantUsers} onClick={() => updateMember(member.userId, { active: !member.active })} className={`rounded-full px-3 py-1 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-60 ${member.active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-[var(--tenant-control)] text-slate-500 dark:bg-[var(--tenant-control-dark)] dark:text-slate-300'}`}>
                                                    {member.active ? 'ATIVO' : 'INATIVO'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <button type="button" disabled={!canManageTenantUsers} onClick={() => setEditingUser(member)} className="rounded-lg p-2 text-slate-400 hover:bg-[var(--tenant-secondary-soft)] hover:text-[var(--tenant-secondary)] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-[var(--tenant-secondary-soft)]0/10">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button type="button" disabled={!canManageTenantUsers} onClick={() => handleRemoveMember(member.userId)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-500/10">
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                        <AlertCircle size={18} />
                        A lista e a auditoria são limitadas ao tenant ativo. Gestores podem consultar produtividade; apenas administradores alteram permissões.
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                        <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-5 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                                        <Activity size={20} className="text-[var(--tenant-secondary)]" />
                                        Produtividade CRM
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-500">Criação e alteração de trabalho por usuário no período.</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {tenantMembers.map(member => {
                                    const summary = summaryByUser.get(member.userId);
                                    const totalWork = (summary?.clientsCreated || 0)
                                        + (summary?.contactsCreated || 0)
                                        + (summary?.tasksCreated || 0)
                                        + (summary?.proposalsCreated || 0)
                                        + (summary?.proposalVersionsCreated || 0);
                                    return (
                                        <div key={member.userId} className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">{member.fullName || member.email}</p>
                                                    <p className="text-xs text-slate-500">{member.role}</p>
                                                </div>
                                                <span className="rounded-md bg-[var(--tenant-panel)] px-2 py-1 text-xs font-black text-[var(--tenant-secondary)] dark:bg-[var(--tenant-panel-dark)]">{totalWork} entregas</span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                                <div className="rounded-md bg-[var(--tenant-panel)] p-2 dark:bg-[var(--tenant-panel-dark)]"><b>{summary?.clientsCreated || 0}</b><span className="block text-[10px] text-slate-500">contas</span></div>
                                                <div className="rounded-md bg-[var(--tenant-panel)] p-2 dark:bg-[var(--tenant-panel-dark)]"><b>{summary?.contactsCreated || 0}</b><span className="block text-[10px] text-slate-500">contatos</span></div>
                                                <div className="rounded-md bg-[var(--tenant-panel)] p-2 dark:bg-[var(--tenant-panel-dark)]"><b>{summary?.tasksCreated || 0}</b><span className="block text-[10px] text-slate-500">tarefas</span></div>
                                                <div className="rounded-md bg-[var(--tenant-panel)] p-2 dark:bg-[var(--tenant-panel-dark)]"><b>{summary?.proposalsCreated || 0}</b><span className="block text-[10px] text-slate-500">propostas</span></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-5 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                                        <ListFilter size={20} className="text-[var(--tenant-primary)]" />
                                        Timeline de ações
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-500">Últimos eventos registrados para o tenant.</p>
                                </div>
                                {auditLoading && <Loader2 size={18} className="animate-spin text-[var(--tenant-secondary)]" />}
                            </div>
                            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                                {visibleActivityEvents.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-[var(--tenant-border)] p-8 text-center text-sm font-semibold text-slate-500 dark:border-[var(--tenant-border-dark)]">
                                        Nenhum evento encontrado para os filtros atuais.
                                    </div>
                                ) : visibleActivityEvents.map(event => (
                                    <div key={event.id} className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                                                    {event.action} · {event.entityType}
                                                </p>
                                                <p className="truncate text-xs font-semibold text-slate-500">
                                                    {getMemberName(event.userId)}{event.entityId ? ` · ${event.entityId}` : ''}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-[10px] font-bold text-slate-400">{formatDateTime(event.createdAt)}</span>
                                        </div>
                                        {Object.keys(event.metadata || {}).length > 0 && (
                                            <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                                                {JSON.stringify(event.metadata)}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {editingUser && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] p-4">
                            <div className="w-full max-w-md rounded-lg bg-[var(--tenant-panel)] p-6 shadow-2xl dark:bg-[var(--tenant-panel-dark)]">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingUser.fullName || 'Usuário sem nome'}</h3>
                                        <p className="text-sm text-slate-500">{editingUser.email}</p>
                                    </div>
                                    <button type="button" onClick={() => setEditingUser(null)} className="rounded-lg p-2 text-slate-400 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)]">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Papel no tenant</label>
                                        <select value={editingUser.role} onChange={event => setEditingUser({ ...editingUser, role: event.target.value as AppRole })} className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-sm font-bold dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
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
                                                }} className={`flex-1 rounded-md border px-3 py-2 text-xs font-black ${editingUser.allowed_types.includes(access) || editingUser.allowed_types.includes('BOTH') ? 'border-[var(--tenant-secondary-border)] bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] dark:border-[var(--tenant-secondary-border)] dark:bg-[var(--tenant-secondary-soft)]0/10 dark:text-[var(--tenant-secondary)]' : 'border-[var(--tenant-border)] text-slate-500 dark:border-[var(--tenant-border-dark)]'}`}>
                                                    {access}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-2">
                                    <button type="button" onClick={() => setEditingUser(null)} className="rounded-lg border border-[var(--tenant-border)] px-4 py-2 text-sm font-bold text-slate-600 dark:border-[var(--tenant-border-dark)] dark:text-slate-300">Cancelar</button>
                                    <button type="button" onClick={async () => { await updateMember(editingUser.userId, { role: editingUser.role, allowed_types: editingUser.allowed_types, active: editingUser.active }); setEditingUser(null); }} className="flex items-center gap-2 rounded-lg bg-[var(--tenant-primary)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--tenant-secondary-soft)]">
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

