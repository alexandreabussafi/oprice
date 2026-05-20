
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Calculator, FileText, DollarSign, Settings, ArrowLeft, Briefcase, LayoutGrid, FolderOpen, BarChart3, Globe, HardHat, Truck, FileCheck, Zap, Sun, Moon, HelpCircle, PanelLeftClose, PanelLeftOpen, Building2, LogOut, UserCircle, MailCheck, CalendarDays, Link as LinkIcon, Phone, Linkedin, Camera, X } from 'lucide-react';

import { AppRole, BusinessUnitAccess, GoogleConnectionStatus, MicrosoftConnectionStatus, Tenant, TenantModule } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { createTenantTheme } from '../utils/theme';
import { getAllowedEditorTabsForProposal, getPricingModuleLabel, tenantSupportsPricingBusinessUnit } from '../utils/pricingModules';

const OPRICE_LOGO_LIGHT = '/oprice-logo-text-blue.png';
const OPRICE_LOGO_DARK = '/oprice-logo-text-white.png';
const OPRICE_MARK = '/pwa-icon-192.png';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onBackToCRM: () => void;
  isCRMMode: boolean;
  proposalType?: 'CONTINUOUS' | 'SPOT' | 'PRODUCT'; // Type awareness for dynamic menu
  pricingModule?: TenantModule;
  darkMode?: boolean;
  toggleDarkMode?: () => void;
  businessUnit: 'SERVICES' | 'PRODUCTS';
  setBusinessUnit: (bu: 'SERVICES' | 'PRODUCTS') => void;
  currentUser: { name: string; role: AppRole; allowed_types: BusinessUnitAccess[] };
  setCurrentUser: (user: { name: string; role: AppRole; allowed_types: BusinessUnitAccess[] }) => void;
  onExitTenant?: () => void;
  activeTenant?: Tenant | null;
  googleConnection?: GoogleConnectionStatus;
  googleWorkspaceLoading?: boolean;
  microsoftConnection?: MicrosoftConnectionStatus;
  microsoftWorkspaceLoading?: boolean;
  onConnectGoogle?: () => void | Promise<void>;
  onDisconnectGoogle?: () => void | Promise<void>;
  onConnectMicrosoft?: () => void | Promise<void>;
  onDisconnectMicrosoft?: () => void | Promise<void>;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onBackToCRM, isCRMMode, proposalType, pricingModule, darkMode, toggleDarkMode, businessUnit, setBusinessUnit, currentUser, setCurrentUser, onExitTenant, activeTenant, googleConnection = { connected: false, account: null }, googleWorkspaceLoading = false, microsoftConnection = { connected: false, account: null }, microsoftWorkspaceLoading = false, onConnectGoogle, onDisconnectGoogle, onConnectMicrosoft, onDisconnectMicrosoft }) => {
  const { signOut, profile } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('oprice-sidebar-collapsed') === 'true');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profilePhone, setProfilePhone] = useState('');
  const [profileLinkedin, setProfileLinkedin] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const enabledModules = activeTenant?.enabledModules || [];
  const tenantSupportsServices = tenantSupportsPricingBusinessUnit(enabledModules, 'SERVICES');
  const tenantSupportsProducts = tenantSupportsPricingBusinessUnit(enabledModules, 'PRODUCTS');
  const branding = activeTenant?.branding || {};
  const tenantName = branding.displayName || branding.companyName || activeTenant?.name || 'OPrice';
  const isDefaultOpriceLogo = !branding.logoUrl || ['/logo.png', OPRICE_LOGO_LIGHT, OPRICE_LOGO_DARK].includes(branding.logoUrl);
  const tenantLogo = isDefaultOpriceLogo ? (darkMode ? OPRICE_LOGO_DARK : OPRICE_LOGO_LIGHT) : branding.logoUrl;
  const tenantLogoAlt = isDefaultOpriceLogo ? 'OPrice' : `${tenantName} Logo`;
  const tenantTheme = createTenantTheme(branding);
  const brandPrimary = tenantTheme.primary;
  const brandSecondary = tenantTheme.secondary;
  const getHexLuminance = (hex: string) => {
    const raw = hex.replace('#', '');
    const full = raw.length === 3 ? raw.split('').map(char => `${char}${char}`).join('') : raw;
    const rgb = [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16) / 255);
    const linear = rgb.map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const currentSidebarColor = darkMode ? tenantTheme.sidebarDark : tenantTheme.sidebarLight;
  const sidebarUsesDarkSurface = getHexLuminance(currentSidebarColor) < 0.38;
  const sidebarAccent = sidebarUsesDarkSurface ? tenantTheme.primaryOnDark : brandPrimary;
  const sidebarControlStyle = {
    backgroundColor: sidebarUsesDarkSurface ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.72)',
    borderColor: sidebarUsesDarkSurface ? 'rgba(255,255,255,0.14)' : tenantTheme.borderLight,
    color: sidebarUsesDarkSurface ? 'rgba(226,232,240,0.88)' : '#64748b'
  };
  const sidebarControlActiveStyle = {
    backgroundColor: sidebarUsesDarkSurface ? 'rgba(255,255,255,0.09)' : tenantTheme.primarySubtle,
    borderColor: tenantTheme.primaryBorder,
    color: sidebarAccent
  };
  const sidebarMutedTextStyle = { color: sidebarUsesDarkSurface ? 'rgba(203,213,225,0.68)' : '#64748b' };
  const sidebarStrongTextStyle = { color: sidebarUsesDarkSurface ? '#f8fafc' : '#334155' };

  useEffect(() => {
    localStorage.setItem('oprice-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    setProfileName(profile?.full_name || currentUser.name);
    setProfilePhone(profile?.phone || '');
    setProfileLinkedin(profile?.linkedin_url || '');
    setProfileAvatarUrl(profile?.avatar_url || '');
  }, [profile, currentUser.name]);

  const roleLabel = currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : currentUser.role === 'ADMIN' ? 'Administrador' : currentUser.role === 'MANAGER' ? 'Gestor' : currentUser.role === 'ANALYST' ? 'Analista' : 'Vendedor';
  const initials = (profileName || currentUser.name).trim().split(' ').map((n, i) => i < 2 ? n[0] : '').join('').toUpperCase();
  const workspaceBusy = googleWorkspaceLoading || microsoftWorkspaceLoading;

  const saveUserProfile = async () => {
    if (!profile?.id) return;
    setProfileSaving(true);
    setProfileError(null);
    try {
      const updates = {
        full_name: profileName.trim() || null,
        phone: profilePhone.trim() || null,
        linkedin_url: profileLinkedin.trim() || null,
        avatar_url: profileAvatarUrl.trim() || null
      };
      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
      if (error) throw error;
      setCurrentUser({ ...currentUser, name: updates.full_name || currentUser.name });
    } catch (error: any) {
      setProfileError(error?.message || 'Nao foi possivel salvar seu perfil.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Menu Global do CRM
  const crmMenuItems = [
    { id: 'crm-inbox', label: 'Inbox CRM', icon: MailCheck },
    { id: 'crm-dashboard', label: 'Oportunidades', icon: LayoutGrid },
    { id: 'crm-clients', label: 'Contas (Empresas)', icon: FolderOpen },
    { id: 'crm-contacts', label: 'Contatos', icon: Users },
    { id: 'crm-tasks', label: 'Tarefas & Atividades', icon: FileCheck },
    { id: 'crm-analytics', label: 'Analytics & KPIs', icon: BarChart3 },
  ];

  const canOpenTenantSettings = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role);

  // Menu Contextual do Editor CONTINUOUS
  const continuousMenuItems = [
    { id: 'dashboard', label: 'Dashboard Proposta', icon: LayoutDashboard },
    { id: 'docs', label: 'Documentos & Escopo', icon: Briefcase },
    { id: 'team', label: 'Equipe & Salários', icon: Users },
    { id: 'safety', label: 'Segurança (SMS)', icon: HardHat },
    { id: 'support', label: 'Suporte & Gestão', icon: Truck },
    { id: 'costs', label: 'Custos Operacionais', icon: Calculator },
    { id: 'pricing', label: 'Precificação (BDI)', icon: DollarSign },
    { id: 'settings', label: 'Configurações Local', icon: Settings },
  ];

  // Menu Contextual do Editor SPOT (Simplified)
  const spotMenuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'spot-editor', label: 'Escopo & Custos', icon: Zap }, // New Combined Editor
    { id: 'docs', label: 'Documentos', icon: FileText },
    { id: 'pricing', label: 'Fechamento (DRE)', icon: DollarSign },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  // Menu Contextual do Editor PRODUCT (Vendas Diretas)
  const productMenuItems: any[] = []; // Unified Single Screen: No internal tabs

  const isProducts = businessUnit === 'PRODUCTS';

  // Decide qual menu mostrar
  let menuItems = crmMenuItems;
  if (!isCRMMode) {
    if (proposalType === 'PRODUCT') menuItems = productMenuItems;
    else if (proposalType === 'SPOT') menuItems = spotMenuItems;
    else menuItems = continuousMenuItems;
    if (proposalType && pricingModule) {
      const allowedTabs = new Set(getAllowedEditorTabsForProposal({ type: proposalType, pricingModule }));
      menuItems = menuItems.filter(item => allowedTabs.has(item.id));
    }
  }

  const userCanServices = currentUser.allowed_types.includes('SERVICES') || currentUser.allowed_types.includes('BOTH');
  const userCanProducts = currentUser.allowed_types.includes('PRODUCTS') || currentUser.allowed_types.includes('BOTH');
  const hasMultipleBUs = userCanServices && userCanProducts && tenantSupportsServices && tenantSupportsProducts;
  const mobileNavItems = [
    { id: 'crm-inbox', label: 'Inbox', icon: MailCheck },
    { id: 'crm-dashboard', label: 'Funil', icon: LayoutGrid },
    { id: 'crm-clients', label: 'Contas', icon: FolderOpen },
    { id: 'crm-contacts', label: 'Contatos', icon: Users },
    { id: 'crm-tasks', label: 'Tarefas', icon: FileCheck },
    { id: 'crm-analytics', label: 'KPIs', icon: BarChart3 },
  ];
  const mobileContextLabel = isCRMMode
    ? (isProducts ? 'Produtos' : 'Serviços')
    : (proposalType === 'PRODUCT' ? 'Cotação' : proposalType === 'SPOT' ? 'Spot' : 'Contrato');

  return (
    // PRINT FIX: Reset min-h-screen and flex to allow natural document flow
    <div
      className={`flex h-dvh overflow-hidden bg-[var(--tenant-bg)] font-sans text-[var(--tenant-text)] transition-colors duration-300 dark:bg-[var(--tenant-bg-dark)] dark:text-[var(--tenant-text-dark)] print:block print:h-auto print:static print:overflow-visible print:bg-[var(--tenant-panel)] ${isProducts ? 'theme-products' : 'theme-services'}`}
      style={tenantTheme.cssVars}
    >

      {/* Sidebar - Alive & Light/Dark Theme */}
      <aside className={`fixed inset-y-0 left-0 z-50 hidden ${sidebarCollapsed ? 'w-20' : 'w-64'} shrink-0 flex-col overflow-hidden border-r border-[var(--tenant-border)] bg-[var(--tenant-sidebar)] text-slate-700 shadow-[4px_0_24px_rgba(15,23,42,0.04)] transition-all duration-300 ease-in-out dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-sidebar-dark)] dark:text-slate-300 lg:static lg:inset-0 lg:flex lg:translate-x-0 print:hidden`}>

        {/* Header da Sidebar */}
        <div className={`relative flex h-20 shrink-0 items-center ${sidebarCollapsed ? 'justify-center px-3' : 'gap-3 px-4'} border-b border-[var(--tenant-border)] bg-[var(--tenant-sidebar)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-sidebar-dark)]`} style={{ borderTop: `3px solid ${brandPrimary}` }}>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(prev => !prev)}
            className="absolute right-2 top-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-1.5 text-slate-500 shadow-sm transition hover:text-slate-900 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300 dark:hover:text-white"
            title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
          {isDefaultOpriceLogo && !sidebarCollapsed ? (
            <div className="flex min-w-0 flex-1 items-center pr-8">
              <img
                src={tenantLogo}
                alt={tenantLogoAlt}
                className="h-11 max-w-[168px] object-contain"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
            </div>
          ) : (
          <div
            className={`flex ${sidebarCollapsed ? 'h-10 w-10' : 'h-12 w-12'} shrink-0 items-center justify-center rounded-lg border bg-[var(--tenant-control)] p-2 dark:bg-[var(--tenant-control-dark)]`}
            style={{ borderColor: tenantTheme.primaryBorder, backgroundColor: tenantTheme.primarySubtle }}
          >
            {tenantLogo ? (
              <img
                src={isDefaultOpriceLogo ? OPRICE_MARK : tenantLogo}
                alt={tenantLogoAlt}
                className="h-full w-full object-contain"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <Building2 size={22} style={{ color: brandPrimary }} />
            )}
          </div>
          )}
          {!sidebarCollapsed && !isDefaultOpriceLogo && <div className="flex-1">
            <h1 className="truncate text-lg font-black leading-tight text-slate-800 dark:text-slate-100">{tenantName}</h1>
            <p className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500">
              {isCRMMode ? (isProducts ? 'Produtos' : 'Serviços') : (proposalType === 'PRODUCT' ? 'Cotação de Produtos' : proposalType === 'SPOT' ? 'Projeto Spot' : 'Contrato Mensal')}
            </p>
          </div>}
        </div>

        {isCRMMode && hasMultipleBUs && !sidebarCollapsed && (
          <div className="border-b border-[var(--tenant-border)] bg-[var(--tenant-sidebar)] p-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-sidebar-dark)]">
            <div className="relative flex h-9 items-center rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-1 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
              <div
                className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 shadow-sm ${isProducts ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
                style={{ background: isProducts ? brandSecondary : brandPrimary }}
              ></div>
              <button
                onClick={() => setBusinessUnit('SERVICES')}
                className={`relative z-10 flex-1 text-[10px] font-black uppercase tracking-wider text-center transition-colors duration-300 ${!isProducts ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Serviços
              </button>
              <button
                onClick={() => setBusinessUnit('PRODUCTS')}
                className={`relative z-10 flex-1 text-[10px] font-black uppercase tracking-wider text-center transition-colors duration-300 ${isProducts ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Produtos
              </button>
            </div>
          </div>
        )}

        {/* Botão Voltar (Apenas no Modo Editor) */}
        {!isCRMMode && (
          <div className={`${sidebarCollapsed ? 'px-3' : 'px-3'} pb-2 pt-3`}>
            <button
              onClick={onBackToCRM}
              title="Voltar ao CRM"
              className={`group flex w-full items-center justify-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] ${sidebarCollapsed ? 'px-2' : 'px-3'} py-2 text-xs font-bold uppercase text-slate-600 shadow-sm transition-all duration-300 hover:shadow active:scale-95 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300`}
              style={{ color: brandPrimary }}
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {!sidebarCollapsed && 'Voltar ao CRM'}
            </button>
            <div className="mx-2 mb-1 mt-3 h-px bg-[var(--tenant-border)] dark:bg-[var(--tenant-border-dark)]"></div>
          </div>
        )}

        {/* Navegação */}
        <nav className={`min-h-0 flex-1 space-y-1 overflow-hidden ${sidebarCollapsed ? 'px-2' : 'px-3'} py-3`}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            // No modo CRM, activeTab controla a página renderizada (dashboard, clients, settings)
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                style={isActive ? { borderColor: brandPrimary, backgroundColor: tenantTheme.primarySubtle, color: brandPrimary } : undefined}
                className={`group flex w-full items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} rounded-md border-l-2 py-2 text-sm font-bold transition-all duration-200 ${isActive
                  ? 'border-y-transparent border-r-transparent shadow-sm dark:text-slate-100'
                  : `border-transparent text-slate-500 hover:bg-[var(--tenant-control)] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[var(--tenant-control-dark)] dark:hover:text-white ${!sidebarCollapsed ? 'hover:translate-x-0.5' : ''}`
                  }`}
              >
                <div
                  className="rounded-md p-1.5 text-slate-400 transition-colors group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-200"
                  style={isActive ? { color: brandPrimary, backgroundColor: tenantTheme.primarySoft } : undefined}
                >
                  <Icon size={18} />
                </div>
                {!sidebarCollapsed && item.label}
              </button>
            );
          })}

          {!isCRMMode && proposalType === 'PRODUCT' && !sidebarCollapsed && (
            <div className="p-4 mt-10">
              <div className="rounded-lg border p-4" style={{ borderColor: tenantTheme.secondaryBorder, backgroundColor: tenantTheme.secondarySubtle }}>
                <p className="mb-2 text-[10px] font-black uppercase" style={{ color: brandSecondary }}>{getPricingModuleLabel(pricingModule, 'Editor Simplificado')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Toda a cotação é gerenciada em uma única tela de <strong>Ordem de Venda</strong>.
                </p>
              </div>
            </div>
          )}
        </nav>

        {/* Toggle Theme & User Footer */}
        <div className={`mt-auto ${sidebarCollapsed ? 'p-2' : 'p-3'} shrink-0 space-y-2 border-t border-[var(--tenant-border)] bg-[var(--tenant-sidebar)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-sidebar-dark)]`}>

          <div className={`grid gap-2 ${isCRMMode ? (canOpenTenantSettings ? 'grid-cols-3' : 'grid-cols-2') : 'grid-cols-1'}`}>
            {isCRMMode && (
              <button
                type="button"
                onClick={() => setActiveTab('crm-help')}
                title="Ajuda & Manuais"
                aria-label="Ajuda & Manuais"
                style={activeTab === 'crm-help' ? sidebarControlActiveStyle : sidebarControlStyle}
                className="flex h-9 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-500 shadow-sm transition hover:border-[var(--tenant-primary-border)] hover:brightness-95 active:scale-[0.98] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300"
              >
                <HelpCircle size={16} />
              </button>
            )}

            {isCRMMode && canOpenTenantSettings && (
                <button
                  type="button"
                  onClick={() => setActiveTab('crm-settings')}
                  title="Configurações do Tenant"
                  aria-label="Configurações do Tenant"
                  style={activeTab === 'crm-settings' ? sidebarControlActiveStyle : sidebarControlStyle}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-500 shadow-sm transition hover:border-[var(--tenant-primary-border)] hover:brightness-95 active:scale-[0.98] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300"
                >
                  <Settings size={16} />
                </button>
            )}

            <button
              type="button"
              onClick={toggleDarkMode}
              title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
              aria-label={darkMode ? 'Modo Claro' : 'Modo Escuro'}
              style={sidebarControlStyle}
              className="flex h-9 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-500 shadow-sm transition-all hover:border-[var(--tenant-primary-border)] hover:brightness-95 active:scale-[0.98] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300"
            >
              {darkMode ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} style={{ color: sidebarAccent }} />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            title="Abrir perfil"
            style={sidebarControlStyle}
            className={`flex w-full cursor-pointer items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-2.5 text-left shadow-sm transition hover:border-[var(--tenant-primary-border)] hover:brightness-95 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]`}
          >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border text-xs font-black uppercase"
                style={{ backgroundColor: tenantTheme.primarySoft, borderColor: tenantTheme.primaryBorder, color: brandPrimary }}
              >
                {profileAvatarUrl ? <img src={profileAvatarUrl} alt={profileName} className="h-full w-full object-cover" /> : initials || <UserCircle size={18} />}
              </div>
              {!sidebarCollapsed && <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-bold" style={sidebarStrongTextStyle} title={profileName || currentUser.name}>{profileName || currentUser.name}</p>
                <p className="truncate text-xs font-medium" style={sidebarMutedTextStyle}>
                  {roleLabel}
                </p>
              </div>}
          </button>
        </div>
      </aside>

      {/* Main Content - Unlocked for Print */}
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--tenant-bg)] transition-[margin] duration-300 dark:bg-[var(--tenant-bg-dark)] print:block print:h-auto print:w-full print:static print:overflow-visible print:bg-[var(--tenant-panel)] print:ml-0">
        <div className="shrink-0 border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-3 py-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)] lg:hidden print:hidden">
          <div className="flex min-h-12 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {!isCRMMode && (
                <button
                  type="button"
                  onClick={onBackToCRM}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300"
                  title="Voltar ao CRM"
                  aria-label="Voltar ao CRM"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              {isDefaultOpriceLogo ? (
                <img src={tenantLogo} alt={tenantLogoAlt} className="h-9 w-32 shrink-0 object-contain" />
              ) : (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-[var(--tenant-control)] p-1.5 dark:bg-[var(--tenant-control-dark)]"
                  style={{ borderColor: tenantTheme.primaryBorder, backgroundColor: tenantTheme.primarySubtle }}
                >
                  {tenantLogo ? (
                    <img src={tenantLogo} alt={tenantLogoAlt} className="h-full w-full object-contain" />
                  ) : (
                    <Building2 size={19} style={{ color: brandPrimary }} />
                  )}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900 dark:text-slate-100">{tenantName}</p>
                <p className="hidden truncate text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 min-[360px]:block">{mobileContextLabel}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isCRMMode && hasMultipleBUs && (
                <div className="flex h-10 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-1 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                  <button
                    type="button"
                    onClick={() => setBusinessUnit('SERVICES')}
                    className={`rounded px-2 text-[10px] font-black uppercase ${!isProducts ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}
                    style={!isProducts ? { backgroundColor: brandPrimary } : undefined}
                  >
                    Serv
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusinessUnit('PRODUCTS')}
                    className={`rounded px-2 text-[10px] font-black uppercase ${isProducts ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}
                    style={isProducts ? { backgroundColor: brandSecondary } : undefined}
                  >
                    Prod
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] text-xs font-black uppercase text-slate-700 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-200"
                title="Abrir perfil"
                aria-label="Abrir perfil"
              >
                {profileAvatarUrl ? <img src={profileAvatarUrl} alt={profileName} className="h-full w-full object-cover" /> : initials || <UserCircle size={18} />}
              </button>
            </div>
          </div>
        </div>
        {profileOpen && (
          <div className="fixed inset-0 z-[260] flex items-center justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] p-4 backdrop-blur-sm print:hidden" onClick={() => setProfileOpen(false)}>
            <div
              className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[720px] flex-col overflow-hidden rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-2xl dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-5 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] text-lg font-black text-slate-700 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-100">
                      {profileAvatarUrl ? <img src={profileAvatarUrl} alt={profileName} className="h-full w-full object-cover" /> : initials || <UserCircle size={24} />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-slate-900 dark:text-white">{profileName || currentUser.name}</p>
                      <p className="truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{profile?.email}</p>
                      <span className="mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase" style={{ borderColor: tenantTheme.primaryBorder, backgroundColor: tenantTheme.primarySoft, color: brandPrimary }}>{roleLabel}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => setProfileOpen(false)} className="rounded-lg p-2 text-slate-400 transition hover:bg-[var(--tenant-control)] hover:text-slate-700 dark:hover:bg-[var(--tenant-control-dark)] dark:hover:text-slate-100">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {profileError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{profileError}</div>}
                <section className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                  <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Cadastro do usuário</h3>
                  <div className="grid gap-4">
                    <label className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><UserCircle size={13} /> Nome</span>
                      <input value={profileName} onChange={event => setProfileName(event.target.value)} className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-bold text-[var(--tenant-text)] outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]" />
                    </label>
                    <label className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Camera size={13} /> URL da foto</span>
                      <input value={profileAvatarUrl} onChange={event => setProfileAvatarUrl(event.target.value)} placeholder="https://..." className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-medium text-[var(--tenant-text)] outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]" />
                    </label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-1.5">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Phone size={13} /> Telefone</span>
                        <input value={profilePhone} onChange={event => setProfilePhone(event.target.value)} placeholder="(00) 00000-0000" className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-medium text-[var(--tenant-text)] outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]" />
                      </label>
                      <label className="space-y-1.5">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Linkedin size={13} /> LinkedIn</span>
                        <input value={profileLinkedin} onChange={event => setProfileLinkedin(event.target.value)} placeholder="https://linkedin.com/in/..." className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-medium text-[var(--tenant-text)] outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]" />
                      </label>
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                  <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Conexões do workspace</h3>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100"><MailCheck size={16} /> Google Workspace</p>
                          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{googleConnection.connected ? googleConnection.account?.google_email : 'Gmail e Google Meet'}</p>
                        </div>
                        {googleConnection.connected ? (
                          <button disabled={workspaceBusy || !onDisconnectGoogle} onClick={() => onDisconnectGoogle?.()} className="rounded-lg border border-[var(--tenant-border)] px-3 py-2 text-xs font-bold text-slate-600 hover:bg-[var(--tenant-surface)] disabled:opacity-50 dark:border-[var(--tenant-border-dark)] dark:text-slate-300 dark:hover:bg-[var(--tenant-surface-dark)]">Desconectar</button>
                        ) : (
                          <button disabled={workspaceBusy || !onConnectGoogle} onClick={() => onConnectGoogle?.()} className="rounded-lg bg-[var(--tenant-primary)] px-3 py-2 text-xs font-bold text-white hover:brightness-95 disabled:opacity-50">Conectar</button>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-slate-100"><CalendarDays size={16} /> Microsoft 365</p>
                          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{microsoftConnection.connected ? microsoftConnection.account?.microsoft_email : 'Outlook, Teams e To Do'}</p>
                        </div>
                        {microsoftConnection.connected ? (
                          <button disabled={workspaceBusy || !onDisconnectMicrosoft} onClick={() => onDisconnectMicrosoft?.()} className="rounded-lg border border-[var(--tenant-border)] px-3 py-2 text-xs font-bold text-slate-600 hover:bg-[var(--tenant-surface)] disabled:opacity-50 dark:border-[var(--tenant-border-dark)] dark:text-slate-300 dark:hover:bg-[var(--tenant-surface-dark)]">Desconectar</button>
                        ) : (
                          <button disabled={workspaceBusy || !onConnectMicrosoft} onClick={() => onConnectMicrosoft?.()} className="rounded-lg bg-[var(--tenant-primary)] px-3 py-2 text-xs font-bold text-white hover:brightness-95 disabled:opacity-50">Conectar</button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]">
                <div className="flex items-center gap-2">
                  {onExitTenant && (
                    <button type="button" onClick={() => { setProfileOpen(false); onExitTenant(); }} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold transition hover:brightness-95" style={{ color: brandSecondary, borderColor: tenantTheme.secondaryBorder, backgroundColor: tenantTheme.secondarySubtle }}>
                      <Globe size={16} /> Portal Superadmin
                    </button>
                  )}
                  <button type="button" onClick={() => signOut()} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40">
                    <LogOut size={16} /> Sair
                  </button>
                </div>
                <button type="button" disabled={profileSaving} onClick={saveUserProfile} className="rounded-md px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-50" style={{ backgroundColor: brandPrimary }}>
                  {profileSaving ? 'Salvando...' : 'Salvar perfil'}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
        {isCRMMode && (
          <nav className="shrink-0 border-t border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)] lg:hidden print:hidden">
            <div className="grid grid-cols-5 gap-1">
              {mobileNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    title={item.label}
                    aria-label={item.label}
                    className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-black transition ${isActive ? 'text-[var(--tenant-primary)]' : 'text-slate-500 dark:text-slate-400'}`}
                    style={isActive ? { backgroundColor: tenantTheme.primarySoft, color: brandPrimary } : undefined}
                  >
                    <Icon size={18} />
                    <span className="max-w-full truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </main>
    </div>
  );
};

export default Layout;
