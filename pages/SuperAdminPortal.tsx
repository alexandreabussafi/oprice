import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, Check, Eye, EyeOff, Image, Loader2, Plus, Save, Shield, Trash2, Upload, UserPlus, Users } from 'lucide-react';
import { AppRole, BusinessUnitAccess, PlatformRole, Tenant, TenantModule } from '../types';
import { useTenant } from '../contexts/TenantContext';
import { Button, IconButton } from '../components/ui';
import { createTenantTheme } from '../utils/theme';
import { PRICING_MODULE_DEFINITIONS, normalizeTenantModules, resolveDefaultBusinessUnitForModules, tenantSupportsPricingBusinessUnit } from '../utils/pricingModules';

const MODULE_CATALOG: {
  id: TenantModule;
  label: string;
  description: string;
  includes: string[];
  impact: string;
  required?: boolean;
}[] = [
  {
    id: 'CRM_CORE',
    label: 'CRM Core',
    description: 'Base comum para todos os tenants.',
    includes: ['Contas e contatos', 'Atividades', 'Funil comercial', 'Propostas e versões'],
    impact: 'Sempre ativo. Sem ele o tenant não opera no RM.',
    required: true
  },
  {
    id: 'SERVICES_COMPLEX',
    label: 'Serviços complexos',
    description: 'Modelo Lubrim de mão de obra e contratos industriais.',
    includes: ['Equipe e salários', 'EPIs e segurança', 'Custos operacionais', 'BDI, encargos e suporte'],
    impact: 'Libera propostas contínuas e spot de serviços.'
  },
  {
    id: 'SAAS_SUBSCRIPTION',
    label: 'SaaS assinatura',
    description: 'Precificação simples por mensalidade, licenças e setup.',
    includes: ['Mensalidade recorrente', 'Setup opcional', 'Usuários/licenças', 'Descontos e impostos'],
    impact: 'Libera proposta de produtos/assinatura para empresas SaaS.'
  },
  {
    id: 'IOT_SUBSCRIPTION',
    label: 'IoT + sensores',
    description: 'Assinatura com sensores, instalação e recorrência.',
    includes: ['Hardware/sensores', 'Instalação', 'Mensalidade', 'Venda ou comodato'],
    impact: 'Libera propostas de monitoramento e sensores.'
  },
  {
    id: 'PRODUCT_SALES',
    label: 'Venda de produtos',
    description: 'Cotação direta de itens, catálogo e ordem de venda.',
    includes: ['Catálogo', 'Margem por item', 'Impostos de produto', 'Ordem de venda'],
    impact: 'Libera o hub de produtos no CRM.'
  }
];

MODULE_CATALOG.forEach(module => {
  if (module.id === 'CRM_CORE') return;
  const definition = PRICING_MODULE_DEFINITIONS[module.id];
  module.label = definition.label;
  module.description = definition.description;
  module.includes = definition.includes;
});

const ROLES: AppRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'ANALYST'];
const ACCESSES: BusinessUnitAccess[] = ['SERVICES', 'PRODUCTS', 'BOTH'];

interface SuperAdminPortalProps {
  onBack: () => void;
}

type TabId = 'summary' | 'modules' | 'users' | 'branding';

const SuperAdminPortal: React.FC<SuperAdminPortalProps> = ({ onBack }) => {
  const {
    tenants,
    tenantLoading,
    tenantError,
    tenantMembers,
    availableProfiles,
    refreshTenantMembers,
    upsertTenant,
    updateTenantModules,
    updateTenantStatus,
    createPlatformUser,
    assignUserToTenant,
    updateTenantUser,
    removeUserFromTenant,
    uploadTenantLogo
  } = useTenant();

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newUserId, setNewUserId] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('ADMIN');
  const [newUserAccess, setNewUserAccess] = useState<BusinessUnitAccess[]>(['BOTH']);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateUserPassword, setShowCreateUserPassword] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'SELLER' as AppRole,
    allowedTypes: ['BOTH'] as BusinessUnitAccess[],
    platformRole: 'USER' as PlatformRole
  });
  const [form, setForm] = useState({
    name: '',
    slug: '',
    displayName: '',
    companyName: '',
    defaultBusinessUnit: 'SERVICES' as Tenant['defaultBusinessUnit'],
    primaryColor: '#0f172a',
    secondaryColor: '#047857',
    backgroundLight: '#f8fafc',
    backgroundDark: '#151a24',
    sidebarLight: '#ffffff',
    sidebarDark: '#182031',
    surfaceLight: '#ffffff',
    surfaceDark: '#1f2937',
    textLight: '#0f172a',
    textDark: '#f8fafc',
    borderLight: '#e2e8f0',
    borderDark: '#334155',
    logoUrl: ''
  });

  const selectedTenant = useMemo(
    () => tenants.find(t => t.id === selectedTenantId) || null,
    [selectedTenantId, tenants]
  );
  const selectedTheme = createTenantTheme({
    ...(selectedTenant?.branding || {}),
    primaryColor: form.primaryColor,
    secondaryColor: form.secondaryColor,
    backgroundLight: form.backgroundLight,
    backgroundDark: form.backgroundDark,
    sidebarLight: form.sidebarLight,
    sidebarDark: form.sidebarDark,
    surfaceLight: form.surfaceLight,
    surfaceDark: form.surfaceDark,
    textLight: form.textLight,
    textDark: form.textDark,
    borderLight: form.borderLight,
    borderDark: form.borderDark
  });
  const selectedEnabledModules = normalizeTenantModules(selectedTenant?.enabledModules || ['CRM_CORE']);
  const selectedSupportsServices = tenantSupportsPricingBusinessUnit(selectedEnabledModules, 'SERVICES');
  const selectedSupportsProducts = tenantSupportsPricingBusinessUnit(selectedEnabledModules, 'PRODUCTS');
  const selectedHasPricingModule = selectedSupportsServices || selectedSupportsProducts;
  const paletteFields: Array<{ key: keyof typeof form; label: string; group: 'Identidade' | 'Light' | 'Dark' }> = [
    { key: 'primaryColor', label: 'Primaria', group: 'Identidade' },
    { key: 'secondaryColor', label: 'Secundaria', group: 'Identidade' },
    { key: 'backgroundLight', label: 'Fundo', group: 'Light' },
    { key: 'sidebarLight', label: 'Sidebar', group: 'Light' },
    { key: 'surfaceLight', label: 'Superficie', group: 'Light' },
    { key: 'textLight', label: 'Texto', group: 'Light' },
    { key: 'borderLight', label: 'Borda', group: 'Light' },
    { key: 'backgroundDark', label: 'Fundo', group: 'Dark' },
    { key: 'sidebarDark', label: 'Sidebar', group: 'Dark' },
    { key: 'surfaceDark', label: 'Superficie', group: 'Dark' },
    { key: 'textDark', label: 'Texto', group: 'Dark' },
    { key: 'borderDark', label: 'Borda', group: 'Dark' }
  ];

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [tenants, selectedTenantId]);

  useEffect(() => {
    if (!selectedTenant) return;
    const branding = selectedTenant.branding || {};
    setForm({
      name: selectedTenant.name,
      slug: selectedTenant.slug,
      displayName: branding.displayName || selectedTenant.name,
      companyName: branding.companyName || selectedTenant.name,
      defaultBusinessUnit: selectedTenant.defaultBusinessUnit,
      primaryColor: branding.primaryColor || '#0f172a',
      secondaryColor: branding.secondaryColor || '#047857',
      backgroundLight: branding.backgroundLight || '#f8fafc',
      backgroundDark: branding.backgroundDark || '#151a24',
      sidebarLight: branding.sidebarLight || '#ffffff',
      sidebarDark: branding.sidebarDark || '#182031',
      surfaceLight: branding.surfaceLight || '#ffffff',
      surfaceDark: branding.surfaceDark || '#1f2937',
      textLight: branding.textLight || '#0f172a',
      textDark: branding.textDark || '#f8fafc',
      borderLight: branding.borderLight || '#e2e8f0',
      borderDark: branding.borderDark || '#334155',
      logoUrl: branding.logoUrl || ''
    });
    refreshTenantMembers(selectedTenant.id).catch(error => {
      setNotice({ type: 'error', text: error.message || 'Erro ao carregar usuários do tenant.' });
    });
  }, [selectedTenant?.id]);

  const showNotice = (type: 'success' | 'error', text: string) => setNotice({ type, text });

  const handleNewTenant = () => {
    setSelectedTenantId(null);
    setActiveTab('summary');
    setForm({
      name: '',
      slug: '',
      displayName: '',
      companyName: '',
      defaultBusinessUnit: 'SERVICES',
      primaryColor: '#0f172a',
      secondaryColor: '#047857',
      backgroundLight: '#f8fafc',
      backgroundDark: '#151a24',
      sidebarLight: '#ffffff',
      sidebarDark: '#182031',
      surfaceLight: '#ffffff',
      surfaceDark: '#1f2937',
      textLight: '#0f172a',
      textDark: '#f8fafc',
      borderLight: '#e2e8f0',
      borderDark: '#334155',
      logoUrl: ''
    });
  };

  const handleSaveTenant = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const enabledModules = normalizeTenantModules(selectedTenant?.enabledModules || ['CRM_CORE']);
      await upsertTenant({
        id: selectedTenant?.id,
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        status: selectedTenant?.status || 'ACTIVE',
        defaultBusinessUnit: resolveDefaultBusinessUnitForModules(enabledModules, form.defaultBusinessUnit),
        enabledModules,
        branding: selectedTenant?.branding || {}
      });
      showNotice('success', tenantError ? 'Tenant salvo no modo local.' : 'Tenant salvo no Supabase.');
    } catch (error: any) {
      showNotice('error', error.message || 'Erro ao salvar tenant.');
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = async (module: TenantModule) => {
    if (!selectedTenant || module === 'CRM_CORE') return;
    setNotice(null);
    try {
      const current = selectedTenant.enabledModules;
      const next = current.includes(module)
        ? current.filter(m => m !== module)
        : [...current, module];
      const normalizedNext = normalizeTenantModules(next);
      const nextDefaultBusinessUnit = resolveDefaultBusinessUnitForModules(normalizedNext, selectedTenant.defaultBusinessUnit);
      await updateTenantModules(selectedTenant.id, normalizedNext);
      setForm(prev => ({ ...prev, defaultBusinessUnit: nextDefaultBusinessUnit }));
      showNotice('success', 'Módulos atualizados.');
    } catch (error: any) {
      showNotice('error', error.message || 'Erro ao atualizar módulos.');
    }
  };

  const handleUploadLogo = async (file?: File) => {
    if (!selectedTenant || !file) return;
    setSaving(true);
    setNotice(null);
    try {
      const publicUrl = await uploadTenantLogo(selectedTenant.id, file);
      setForm(prev => ({ ...prev, logoUrl: publicUrl }));
      showNotice('success', 'Logo enviado e salvo no branding do tenant.');
    } catch (error: any) {
      showNotice('error', error.message || 'Erro ao enviar logo.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignUser = async () => {
    if (!selectedTenant || !newUserId) return;
    setSaving(true);
    setNotice(null);
    try {
      await assignUserToTenant({
        tenantId: selectedTenant.id,
        userId: newUserId,
        role: newUserRole,
        allowed_types: newUserAccess.length > 0 ? newUserAccess : ['BOTH']
      });
      setNewUserId('');
      showNotice('success', 'Usuário vinculado ao tenant.');
    } catch (error: any) {
      showNotice('error', error.message || 'Erro ao vincular usuário.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCreateUserAccess = (access: BusinessUnitAccess) => {
    setCreateUserForm(prev => ({
      ...prev,
      allowedTypes: prev.allowedTypes.includes(access)
        ? prev.allowedTypes.filter(item => item !== access)
        : [...prev.allowedTypes, access]
    }));
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTenant) return;

    const fullName = createUserForm.fullName.trim();
    const email = createUserForm.email.trim().toLowerCase();
    const password = createUserForm.password;

    if (!fullName || !email || !password) {
      showNotice('error', 'Preencha nome, e-mail e senha temporaria.');
      return;
    }
    if (password.length < 6) {
      showNotice('error', 'A senha temporaria deve ter pelo menos 6 caracteres.');
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const platformRole = createUserForm.platformRole;
      await createPlatformUser({
        tenantId: selectedTenant.id,
        email,
        password,
        fullName,
        role: platformRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : createUserForm.role,
        allowed_types: platformRole === 'SUPER_ADMIN' ? ['BOTH'] : (createUserForm.allowedTypes.length > 0 ? createUserForm.allowedTypes : ['BOTH']),
        platformRole
      });
      setCreateUserForm({
        fullName: '',
        email: '',
        password: '',
        role: 'SELLER',
        allowedTypes: ['BOTH'],
        platformRole: 'USER'
      });
      setShowCreateUser(false);
      showNotice('success', platformRole === 'SUPER_ADMIN' ? 'Superadmin criado e vinculado aos tenants.' : 'Usuario criado e vinculado ao tenant.');
    } catch (error: any) {
      showNotice('error', error.message || 'Erro ao criar usuario.');
    } finally {
      setSaving(false);
    }
  };

  const updateMemberAccess = async (userId: string, access: BusinessUnitAccess) => {
    if (!selectedTenant) return;
    const member = tenantMembers.find(item => item.userId === userId);
    if (!member) return;
    const nextAccess = member.allowed_types.includes(access)
      ? member.allowed_types.filter(item => item !== access)
      : [...member.allowed_types, access];
    await updateTenantUser({
      tenantId: selectedTenant.id,
      userId,
      role: member.role,
      allowed_types: nextAccess.length > 0 ? nextAccess : ['BOTH'],
      active: member.active
    });
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'summary', label: 'Resumo' },
    { id: 'modules', label: 'Módulos' },
    { id: 'users', label: 'Usuários' }
  ];

  return (
    <div className="min-h-screen bg-[var(--tenant-control)] text-slate-900 dark:bg-[var(--tenant-bg-dark)] dark:text-slate-100" style={selectedTheme.cssVars}>
      <header className="border-b border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-6 py-4 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <IconButton icon={ArrowLeft} label="Voltar" onClick={onBack} theme={selectedTheme} />
            <div>
              <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Superadmin</p>
              <h1 className="text-xl font-black text-slate-950 dark:text-white">Portal da Plataforma</h1>
            </div>
          </div>
          <Button onClick={handleNewTenant} icon={Plus} theme={selectedTheme}>
            Novo tenant
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-[300px_1fr] gap-6 p-6">
        <aside className="space-y-3">
          {tenantLoading ? (
            <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-6 text-slate-400 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
              <Loader2 className="animate-spin" />
            </div>
          ) : tenants.map(tenant => (
            <button
              key={tenant.id}
              onClick={() => setSelectedTenantId(tenant.id)}
              className={`w-full rounded-lg border bg-[var(--tenant-panel)] p-4 text-left shadow-sm transition hover:shadow-md dark:bg-[var(--tenant-panel-dark)] ${selectedTenantId === tenant.id ? 'border-[var(--tenant-primary-border)]' : 'border-[var(--tenant-border)] hover:border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] dark:hover:border-[var(--tenant-border-dark)]'}`}
              style={selectedTenantId === tenant.id ? { backgroundColor: createTenantTheme(tenant.branding).primarySubtle, borderColor: createTenantTheme(tenant.branding).primaryBorder } : undefined}
            >
              <div className="flex items-center gap-3">
                {tenant.branding?.logoUrl ? (
                  <img src={tenant.branding.logoUrl} className="h-9 w-9 rounded-md object-contain bg-[var(--tenant-panel)] p-1" />
                ) : (
                  <Building2 size={20} style={{ color: createTenantTheme(tenant.branding).primary }} />
                )}
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-800 dark:text-slate-100">{tenant.name}</p>
                  <p className="text-xs font-semibold uppercase text-slate-500">{tenant.slug}</p>
                </div>
              </div>
            </button>
          ))}
        </aside>

        <section className="space-y-5">
          {tenantError && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              O app caiu em modo local porque alguma consulta do Supabase falhou: {tenantError}
            </div>
          )}

          {notice && (
            <div className={`rounded-lg border p-4 text-sm font-semibold ${notice.type === 'success' ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-red-300 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'}`}>
              {notice.text}
            </div>
          )}

          <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
            <div className="flex items-start justify-between border-b border-[var(--tenant-border)] p-5 dark:border-[var(--tenant-border-dark)]">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black">{selectedTenant?.name || 'Novo tenant'}</h2>
                  {selectedTenant && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${selectedTenant.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-[var(--tenant-control)] text-slate-500 dark:bg-[var(--tenant-control-dark)] dark:text-slate-300'}`}>
                      {selectedTenant.status}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-400">{selectedTenant?.slug || 'Cadastre nome, slug, módulos e branding.'}</p>
              </div>
              {selectedTenant && (
                <button
                  onClick={async () => {
                    try {
                      await updateTenantStatus(selectedTenant.id, selectedTenant.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
                      showNotice('success', 'Status do tenant atualizado.');
                    } catch (error: any) {
                      showNotice('error', error.message || 'Erro ao atualizar status.');
                    }
                  }}
                  className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-xs font-bold text-slate-600 hover:bg-[var(--tenant-control)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300 dark:hover:bg-[var(--tenant-control-dark)]"
                >
                  {selectedTenant.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                </button>
              )}
            </div>

            <div className="flex gap-1 border-b border-[var(--tenant-border)] px-5 pt-4 dark:border-[var(--tenant-border-dark)]">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={activeTab === tab.id ? { color: selectedTheme.primary, borderColor: selectedTheme.primaryBorder, backgroundColor: selectedTheme.primarySubtle } : undefined}
                  className={`rounded-t-lg border border-transparent px-4 py-2 text-sm font-bold transition ${activeTab === tab.id ? '' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeTab === 'summary' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                    <p className="text-xs font-black uppercase text-slate-500">Módulos ativos</p>
                    <p className="mt-2 text-3xl font-black">{selectedTenant?.enabledModules.length || 0}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                    <p className="text-xs font-black uppercase text-slate-500">Usuários vinculados</p>
                    <p className="mt-2 text-3xl font-black">{tenantMembers.length}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                    <p className="text-xs font-black uppercase text-slate-500">Unidade padrão</p>
                    <p className="mt-2 text-3xl font-black">{selectedTenant?.defaultBusinessUnit || form.defaultBusinessUnit}</p>
                  </div>
                  </div>

                  <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white">Dados operacionais do tenant</h3>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Marca, logo e aparência são editadas dentro do próprio tenant.</p>
                      </div>
                      <Button onClick={handleSaveTenant} disabled={saving || !form.name || !form.slug} icon={Save} theme={selectedTheme}>
                        Salvar tenant
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do tenant" className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]" />
                      <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="slug" className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]" />
                      <select value={form.defaultBusinessUnit} onChange={e => setForm({ ...form, defaultBusinessUnit: e.target.value as Tenant['defaultBusinessUnit'] })} className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                        <option value="SERVICES" disabled={selectedHasPricingModule && !selectedSupportsServices}>Serviços</option>
                        <option value="PRODUCTS" disabled={selectedHasPricingModule && !selectedSupportsProducts}>Produtos</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'modules' && selectedTenant && (
                <div className="space-y-4">
                  {!selectedHasPricingModule && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                      CRM Core esta ativo sem modulo de cotacao. O tenant podera usar contas, contatos, tarefas e inbox, mas nao criara novas cotacoes ate ativar Servicos, Produto, SaaS ou IoT.
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {MODULE_CATALOG.map(module => {
                      const enabled = selectedTenant.enabledModules.includes(module.id);
                      return (
                        <button
                          key={module.id}
                          onClick={() => toggleModule(module.id)}
                          disabled={module.required}
                          className={`rounded-lg border p-4 text-left transition ${enabled ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/10' : 'border-[var(--tenant-border)] bg-[var(--tenant-control)] hover:border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:hover:border-[var(--tenant-border-dark)]'} ${module.required ? 'cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-black">{module.label}</p>
                              <p className="mt-1 text-sm text-slate-400">{module.description}</p>
                            </div>
                            {enabled && <Check size={18} className="text-emerald-600 dark:text-emerald-300" />}
                          </div>
                          <div className="mt-4 space-y-1">
                            {module.includes.map(item => <p key={item} className="text-xs font-semibold text-slate-500 dark:text-slate-300">- {item}</p>)}
                          </div>
                          <p className="mt-4 border-t border-[var(--tenant-border)] pt-3 text-xs font-bold text-slate-500 dark:border-[var(--tenant-border-dark)]">{module.impact}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'users' && selectedTenant && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white">Usuarios do tenant</h3>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Crie usuarios no Auth ou vincule perfis ja existentes.</p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setShowCreateUser(prev => !prev)}
                      icon={UserPlus}
                      theme={selectedTheme}
                      variant={showCreateUser ? 'neutral' : 'primary'}
                    >
                      Novo usuario
                    </Button>
                  </div>

                  {showCreateUser && (
                    <form onSubmit={handleCreateUser} className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                      <div className="mb-4 flex items-center gap-2">
                        <Shield size={18} style={{ color: selectedTheme.primary }} />
                        <h3 className="font-black">Criar usuario</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          value={createUserForm.fullName}
                          onChange={e => setCreateUserForm(prev => ({ ...prev, fullName: e.target.value }))}
                          placeholder="Nome completo"
                          className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100"
                        />
                        <input
                          type="email"
                          value={createUserForm.email}
                          onChange={e => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@empresa.com"
                          className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100"
                        />
                        <div className="relative">
                          <input
                            type={showCreateUserPassword ? 'text' : 'password'}
                            value={createUserForm.password}
                            onChange={e => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Senha temporaria"
                            minLength={6}
                            className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 pr-10 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCreateUserPassword(prev => !prev)}
                            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-[var(--tenant-control)] hover:text-slate-700 dark:hover:bg-[var(--tenant-control-dark)] dark:hover:text-slate-200"
                            title={showCreateUserPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            aria-label={showCreateUserPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          >
                            {showCreateUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <select
                          value={createUserForm.role}
                          onChange={e => setCreateUserForm(prev => ({ ...prev, role: e.target.value as AppRole }))}
                          disabled={createUserForm.platformRole === 'SUPER_ADMIN'}
                          className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] disabled:opacity-50 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100"
                        >
                          {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                      </div>
                      <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
                        <div className="flex gap-2">
                          {ACCESSES.map(access => (
                            <button
                              type="button"
                              key={access}
                              onClick={() => toggleCreateUserAccess(access)}
                              disabled={createUserForm.platformRole === 'SUPER_ADMIN'}
                              style={createUserForm.allowedTypes.includes(access) ? { borderColor: selectedTheme.primaryBorder, backgroundColor: selectedTheme.primarySoft, color: selectedTheme.primary } : undefined}
                              className={`h-10 flex-1 rounded-md border text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${createUserForm.allowedTypes.includes(access) ? '' : 'border-[var(--tenant-border)] text-slate-500 dark:border-[var(--tenant-border-dark)]'}`}
                            >
                              {access}
                            </button>
                          ))}
                        </div>
                        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 text-xs font-black text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={createUserForm.platformRole === 'SUPER_ADMIN'}
                            onChange={e => setCreateUserForm(prev => ({
                              ...prev,
                              platformRole: e.target.checked ? 'SUPER_ADMIN' : 'USER',
                              role: e.target.checked ? 'SUPER_ADMIN' : prev.role,
                              allowedTypes: e.target.checked ? ['BOTH'] : prev.allowedTypes
                            }))}
                            className="h-4 w-4"
                          />
                          Superadmin da plataforma
                        </label>
                      </div>
                      <div className="mt-4 flex justify-end gap-3">
                        <Button type="button" variant="neutral" onClick={() => setShowCreateUser(false)} theme={selectedTheme}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={saving} icon={Save} theme={selectedTheme}>
                          Criar usuario
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                    <div className="mb-4 flex items-center gap-2">
                      <Users size={18} style={{ color: selectedTheme.primary }} />
                      <h3 className="font-black">Vincular usuário</h3>
                    </div>
                    <div className="grid grid-cols-[1fr_160px_260px_auto] gap-3">
                      <select value={newUserId} onChange={e => setNewUserId(e.target.value)} className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100">
                        <option value="">Selecione um usuário disponível</option>
                        {availableProfiles.map(profile => (
                          <option key={profile.userId} value={profile.userId}>{profile.fullName || profile.email}</option>
                        ))}
                      </select>
                      <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as AppRole)} className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100">
                        {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                      <div className="flex gap-2">
                        {ACCESSES.map(access => (
                          <button
                            type="button"
                            key={access}
                            onClick={() => setNewUserAccess(prev => prev.includes(access) ? prev.filter(item => item !== access) : [...prev, access])}
                            style={newUserAccess.includes(access) ? { borderColor: selectedTheme.primaryBorder, backgroundColor: selectedTheme.primarySoft, color: selectedTheme.primary } : undefined}
                            className={`flex-1 rounded-md border text-xs font-black ${newUserAccess.includes(access) ? '' : 'border-[var(--tenant-border)] text-slate-500 dark:border-[var(--tenant-border-dark)]'}`}
                          >{access}</button>
                        ))}
                      </div>
                      <Button type="button" onClick={handleAssignUser} disabled={!newUserId || saving} theme={selectedTheme}>Vincular</Button>
                    </div>
                    {availableProfiles.length === 0 && (
                      <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Nao ha perfis disponiveis fora deste tenant. Crie um novo usuario acima para adicionar alguem.
                      </p>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--tenant-control)] text-xs uppercase text-slate-500 dark:bg-[var(--tenant-control-dark)]">
                        <tr>
                          <th className="px-4 py-3">Usuário</th>
                          <th className="px-4 py-3">Papel</th>
                          <th className="px-4 py-3">Acessos</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--tenant-border)] dark:divide-[var(--tenant-border-dark)]">
                        {tenantMembers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                              Nenhum usuario vinculado a este tenant.
                            </td>
                          </tr>
                        )}
                        {tenantMembers.map(member => (
                          <tr key={member.userId}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <p className="font-bold">{member.fullName || member.email}</p>
                                {member.platformRole === 'SUPER_ADMIN' && (
                                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                                    PLATAFORMA
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">{member.email}</p>
                            </td>
                            <td className="px-4 py-3">
                              <select value={member.role} onChange={e => updateTenantUser({ tenantId: selectedTenant.id, userId: member.userId, role: e.target.value as AppRole, allowed_types: member.allowed_types, active: member.active })} className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-2 py-1 text-xs font-bold dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {ACCESSES.map(access => (
                                  <button type="button" key={access} onClick={() => updateMemberAccess(member.userId, access)} className={`rounded-md border px-2 py-1 text-[10px] font-black ${member.allowed_types.includes(access) ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-[var(--tenant-border)] text-slate-500 dark:border-[var(--tenant-border-dark)]'}`}>{access}</button>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <button type="button" onClick={() => updateTenantUser({ tenantId: selectedTenant.id, userId: member.userId, role: member.role, allowed_types: member.allowed_types, active: !member.active })} className={`rounded-full px-2.5 py-1 text-xs font-black ${member.active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-[var(--tenant-control)] text-slate-500 dark:bg-[var(--tenant-control-dark)] dark:text-slate-300'}`}>
                                {member.active ? 'Ativo' : 'Inativo'}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button type="button" onClick={() => removeUserFromTenant(selectedTenant.id, member.userId)} className="rounded-lg p-2 text-red-300 hover:bg-red-500/10">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'branding' && (
                <div className="grid grid-cols-[1fr_260px] gap-5">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do tenant" className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]" />
                      <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="slug" className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]" />
                      <input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="Nome no app" className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]" />
                      <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="Razao/nome comercial" className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]" />
                      <select value={form.defaultBusinessUnit} onChange={e => setForm({ ...form, defaultBusinessUnit: e.target.value as Tenant['defaultBusinessUnit'] })} className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-4 py-3 text-sm font-semibold outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                        <option value="SERVICES" disabled={selectedHasPricingModule && !selectedSupportsServices}>Serviços</option>
                        <option value="PRODUCTS" disabled={selectedHasPricingModule && !selectedSupportsProducts}>Produtos</option>
                      </select>
                      <div className="col-span-2 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Paleta visual do tenant</h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Controla fundos, sidebar, superficies, bordas e textos em light/dark.</p>
                          </div>
                          <div className="flex overflow-hidden rounded-md border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]">
                            <span className="h-8 w-8" style={{ backgroundColor: selectedTheme.primary }} />
                            <span className="h-8 w-8" style={{ backgroundColor: selectedTheme.secondary }} />
                            <span className="h-8 w-8" style={{ backgroundColor: selectedTheme.backgroundDark }} />
                          </div>
                        </div>
                        {(['Identidade', 'Light', 'Dark'] as const).map(group => (
                          <div key={group} className="mb-4 last:mb-0">
                            <p className="mb-2 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{group}</p>
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                              {paletteFields.filter(field => field.group === group).map(field => (
                                <label key={field.key} className="grid grid-cols-[42px_1fr] items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                  <input
                                    type="color"
                                    value={String(form[field.key])}
                                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                                    className="h-8 w-10 rounded border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-0 dark:border-[var(--tenant-border-dark)]"
                                    title={field.label}
                                  />
                                  <div className="min-w-0">
                                    <span className="block text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{field.label}</span>
                                    <input
                                      value={String(form[field.key])}
                                      onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                                      className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none dark:text-slate-200"
                                    />
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleSaveTenant} disabled={saving || !form.name || !form.slug} icon={Save} theme={selectedTheme}>
                      Salvar tenant
                    </Button>
                  </div>

                  <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                    <div className="mb-4 flex items-center gap-2">
                      <Image size={18} style={{ color: selectedTheme.primary }} />
                      <h3 className="font-black">Logo</h3>
                    </div>
                    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-panel)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                      {form.logoUrl ? <img src={form.logoUrl} className="max-h-24 max-w-48 object-contain" /> : <span className="text-sm text-slate-500">Sem logo</span>}
                    </div>
                    <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-4 py-2 text-sm font-bold text-slate-700 hover:bg-[var(--tenant-control)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-200 dark:hover:bg-[var(--tenant-control-dark)]">
                      <Upload size={16} />
                      Enviar logo
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleUploadLogo(e.target.files?.[0])} />
                    </label>
                    <p className="mt-3 text-xs leading-relaxed text-slate-500">O arquivo será salvo no bucket público branding-assets em uma pasta isolada do tenant.</p>

                    <div className="mt-5 overflow-hidden rounded-lg border" style={{ borderColor: selectedTheme.borderLight, backgroundColor: selectedTheme.backgroundLight }}>
                      <div className="flex min-h-44">
                        <aside className="w-20 border-r p-3" style={{ borderColor: selectedTheme.borderLight, backgroundColor: selectedTheme.sidebarLight }}>
                          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border bg-[var(--tenant-panel)]" style={{ borderColor: selectedTheme.primaryBorder }}>
                            {form.logoUrl ? <img src={form.logoUrl} className="h-7 w-7 object-contain" /> : <Building2 size={18} style={{ color: selectedTheme.primary }} />}
                          </div>
                          <div className="space-y-2">
                            <div className="h-7 rounded-md" style={{ backgroundColor: selectedTheme.primarySubtle, borderLeft: `3px solid ${selectedTheme.primary}` }} />
                            <div className="h-7 rounded-md bg-[var(--tenant-control)]" />
                            <div className="h-7 rounded-md bg-[var(--tenant-control)]" />
                          </div>
                        </aside>
                        <main className="flex-1 p-3">
                          <div className="mb-3 rounded-lg border p-3" style={{ borderColor: selectedTheme.borderLight, backgroundColor: selectedTheme.surfaceLight }}>
                            <div className="mb-2 h-3 w-32 rounded" style={{ backgroundColor: selectedTheme.primary }} />
                            <div className="h-2 w-44 rounded bg-[var(--tenant-control)]" />
                          </div>
                          <div className="rounded-lg border p-3" style={{ borderColor: selectedTheme.borderLight, backgroundColor: selectedTheme.surfaceLight }}>
                            <div className="mb-3 flex items-center justify-between">
                              <div className="h-3 w-24 rounded bg-[var(--tenant-control)]" />
                              <button className="rounded-md px-3 py-1 text-[10px] font-black text-white" style={{ backgroundColor: selectedTheme.primary }}>Ação</button>
                            </div>
                            <div className="h-2 rounded" style={{ backgroundColor: selectedTheme.secondarySoft }} />
                          </div>
                        </main>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SuperAdminPortal;
