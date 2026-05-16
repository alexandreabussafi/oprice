import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { AppRole, BusinessUnitAccess, PlatformRole, Tenant, TenantBranding, TenantMember, TenantMembership, TenantModule } from '../types';

export const PLATFORM_SUPERADMIN_EMAIL = 'alexandre.abussafi@gmail.com';
export const LUBRIM_TENANT_ID = 'tenant-lubrim';
export const SAAS_TENANT_ID = 'tenant-saas';
export const IOT_TENANT_ID = 'tenant-iot';

export const fallbackTenants: Tenant[] = [
  {
    id: LUBRIM_TENANT_ID,
    name: 'Lubrim',
    slug: 'lubrim',
    status: 'ACTIVE',
    enabledModules: ['CRM_CORE', 'SERVICES_COMPLEX', 'PRODUCT_SALES'],
    defaultBusinessUnit: 'SERVICES',
    branding: {
      logoUrl: '/logo.png',
      primaryColor: '#eab308',
      secondaryColor: '#0f172a',
      backgroundLight: '#f8fafc',
      backgroundDark: '#151a24',
      sidebarLight: '#ffffff',
      sidebarDark: '#182031',
      surfaceLight: '#ffffff',
      surfaceDark: '#1f2937',
      textLight: '#0f172a',
      textDark: '#f8fafc',
      borderLight: '#e2e8f0',
      borderDark: '#334155'
    }
  },
  {
    id: SAAS_TENANT_ID,
    name: 'Software SaaS',
    slug: 'software-saas',
    status: 'ACTIVE',
    enabledModules: ['CRM_CORE', 'SAAS_SUBSCRIPTION'],
    defaultBusinessUnit: 'PRODUCTS',
    branding: {
      primaryColor: '#047857',
      secondaryColor: '#0f766e',
      backgroundLight: '#f7faf9',
      backgroundDark: '#13211f',
      sidebarLight: '#ffffff',
      sidebarDark: '#162521',
      surfaceLight: '#ffffff',
      surfaceDark: '#1d2d29',
      textLight: '#10201c',
      textDark: '#f4fbf8',
      borderLight: '#dbe7e2',
      borderDark: '#315148'
    }
  },
  {
    id: IOT_TENANT_ID,
    name: 'Sensores & Monitoramento',
    slug: 'sensores-monitoramento',
    status: 'ACTIVE',
    enabledModules: ['CRM_CORE', 'IOT_SUBSCRIPTION', 'PRODUCT_SALES'],
    defaultBusinessUnit: 'PRODUCTS',
    branding: {
      primaryColor: '#0369a1',
      secondaryColor: '#7c3aed',
      backgroundLight: '#f7faff',
      backgroundDark: '#131d2b',
      sidebarLight: '#ffffff',
      sidebarDark: '#172235',
      surfaceLight: '#ffffff',
      surfaceDark: '#1d2a3d',
      textLight: '#0f172a',
      textDark: '#f8fafc',
      borderLight: '#dbe6f3',
      borderDark: '#334b68'
    }
  }
];

const loadLocalTenants = (): Tenant[] => {
  try {
    const saved = localStorage.getItem('oprice-local-tenants');
    return saved ? JSON.parse(saved) : fallbackTenants;
  } catch {
    return fallbackTenants;
  }
};

const saveLocalTenants = (tenants: Tenant[]) => {
  localStorage.setItem('oprice-local-tenants', JSON.stringify(tenants));
};

const toTenant = (row: any): Tenant => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  status: row.status || 'ACTIVE',
  enabledModules: row.enabled_modules || row.enabledModules || ['CRM_CORE'],
  defaultBusinessUnit: row.default_business_unit || row.defaultBusinessUnit || 'SERVICES',
  branding: row.branding || {}
});

const toMembership = (row: any): TenantMembership => ({
  tenantId: row.tenant_id || row.tenantId,
  tenant: row.tenants ? toTenant(row.tenants) : row.tenant,
  role: row.role || 'SELLER',
  allowed_types: row.allowed_types || ['SERVICES'],
  active: row.active !== false
});

interface TenantContextValue {
  tenants: Tenant[];
  memberships: TenantMembership[];
  tenantMembers: TenantMember[];
  availableProfiles: TenantMember[];
  activeTenant: Tenant | null;
  activeTenantId: string | null;
  tenantLoading: boolean;
  tenantError: string | null;
  isPlatformSuperAdmin: boolean;
  selectTenant: (tenantId: string) => void;
  clearTenantSelection: () => void;
  refreshTenants: () => Promise<void>;
  refreshTenantMembers: (tenantId: string) => Promise<void>;
  hasModule: (module: TenantModule) => boolean;
  upsertTenant: (tenant: Partial<Tenant> & { name: string; slug: string }) => Promise<void>;
  updateTenantBranding: (tenantId: string, branding: TenantBranding) => Promise<void>;
  updateTenantModules: (tenantId: string, enabledModules: TenantModule[]) => Promise<void>;
  updateTenantStatus: (tenantId: string, status: Tenant['status']) => Promise<void>;
  createPlatformUser: (payload: { tenantId: string; email: string; password: string; fullName: string; role: AppRole; allowed_types: BusinessUnitAccess[]; platformRole: PlatformRole }) => Promise<{ userId: string; email: string }>;
  assignUserToTenant: (payload: { tenantId: string; userId: string; role: AppRole; allowed_types: BusinessUnitAccess[] }) => Promise<void>;
  updateTenantUser: (payload: { tenantId: string; userId: string; role: AppRole; allowed_types: BusinessUnitAccess[]; active: boolean }) => Promise<void>;
  removeUserFromTenant: (tenantId: string, userId: string) => Promise<void>;
  uploadTenantLogo: (tenantId: string, file: File) => Promise<string>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);
  const [tenantMembers, setTenantMembers] = useState<TenantMember[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<TenantMember[]>([]);

  const isPlatformSuperAdmin =
    profile?.email?.toLowerCase() === PLATFORM_SUPERADMIN_EMAIL ||
    (profile as any)?.platform_role === 'SUPER_ADMIN';

  const activeTenant = useMemo(
    () => tenants.find(t => t.id === activeTenantId) || null,
    [activeTenantId, tenants]
  );

  const refreshTenants = async () => {
    if (authLoading || !user) {
      setTenants([]);
      setMemberships([]);
      setActiveTenantId(null);
      return;
    }

    setTenantLoading(true);
    setTenantError(null);

    try {
      const tenantsQuery = isPlatformSuperAdmin
        ? supabase.from('tenants').select('*').order('name')
        : supabase.from('tenant_users').select('tenant_id, role, allowed_types, active, tenants(*)').eq('user_id', user.id).eq('active', true);

      const { data, error } = await tenantsQuery;
      if (error) throw error;
      setUsingLocalFallback(false);

      if (isPlatformSuperAdmin) {
        const loadedTenants = ((data || []) as any[]).map(toTenant);
        setTenants(loadedTenants);
        setMemberships(loadedTenants.map(tenant => ({
          tenantId: tenant.id,
          tenant,
          role: 'SUPER_ADMIN',
          allowed_types: ['BOTH'],
          active: true
        })));
      } else {
        const loadedMemberships = ((data || []) as any[]).map(toMembership);
        setMemberships(loadedMemberships);
        setTenants(loadedMemberships.map(m => m.tenant!).filter(Boolean));
      }
    } catch (error: any) {
      console.warn('TenantContext: falling back to local tenants:', error.message);
      setTenantError(error.message);
      setUsingLocalFallback(true);
      const localTenants = loadLocalTenants();
      setTenants(localTenants);
      setMemberships(localTenants.map(tenant => ({
        tenantId: tenant.id,
        tenant,
        role: isPlatformSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN',
        allowed_types: ['PRODUCTS', 'SERVICES'],
        active: true
      })));
    } finally {
      setTenantLoading(false);
    }
  };

  useEffect(() => {
    refreshTenants();
  }, [authLoading, user?.id, profile?.email, (profile as any)?.platform_role]);

  useEffect(() => {
    if (!activeTenantId) return;
    if (!tenants.some(t => t.id === activeTenantId)) {
      setActiveTenantId(null);
    }
  }, [activeTenantId, tenants]);

  const selectTenant = (tenantId: string) => {
    if (tenants.some(t => t.id === tenantId)) {
      setActiveTenantId(tenantId);
    }
  };

  const clearTenantSelection = () => setActiveTenantId(null);

  const upsertTenant = async (tenant: Partial<Tenant> & { name: string; slug: string }) => {
    if (usingLocalFallback) {
      const localTenant: Tenant = {
        id: tenant.id || `tenant-${tenant.slug}`,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status || 'ACTIVE',
        enabledModules: tenant.enabledModules || ['CRM_CORE'],
        defaultBusinessUnit: tenant.defaultBusinessUnit || 'SERVICES',
        branding: tenant.branding || {}
      };
      const nextTenants = tenants.some(item => item.id === localTenant.id)
        ? tenants.map(item => item.id === localTenant.id ? localTenant : item)
        : [...tenants, localTenant];
      saveLocalTenants(nextTenants);
      setTenants(nextTenants);
      setMemberships(nextTenants.map(item => ({
        tenantId: item.id,
        tenant: item,
        role: isPlatformSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN',
        allowed_types: ['PRODUCTS', 'SERVICES'],
        active: true
      })));
      return;
    }

    const payload = {
      id: tenant.id || `tenant-${tenant.slug}`,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status || 'ACTIVE',
      enabled_modules: tenant.enabledModules || ['CRM_CORE'],
      default_business_unit: tenant.defaultBusinessUnit || 'SERVICES',
      branding: tenant.branding || {}
    };
    const { error } = await supabase.from('tenants').upsert(payload).select().single();
    if (error) throw error;
    await refreshTenants();
  };

  const updateTenantBranding = async (tenantId: string, branding: TenantBranding) => {
    const currentTenant = tenants.find(tenant => tenant.id === tenantId);
    if (!currentTenant) return;
    const nextBranding = { ...(currentTenant.branding || {}), ...branding };

    if (usingLocalFallback) {
      const nextTenants = tenants.map(tenant => tenant.id === tenantId ? { ...tenant, branding: nextBranding } : tenant);
      saveLocalTenants(nextTenants);
      setTenants(nextTenants);
      return;
    }

    const { error } = await supabase.from('tenants').update({ branding: nextBranding }).eq('id', tenantId);
    if (error) throw error;
    setTenants(prev => prev.map(tenant => tenant.id === tenantId ? { ...tenant, branding: nextBranding } : tenant));
  };

  const updateTenantModules = async (tenantId: string, enabledModules: TenantModule[]) => {
    if (usingLocalFallback) {
      const nextTenants = tenants.map(tenant => tenant.id === tenantId ? { ...tenant, enabledModules } : tenant);
      saveLocalTenants(nextTenants);
      setTenants(nextTenants);
      return;
    }

    const { error } = await supabase.from('tenants').update({ enabled_modules: enabledModules }).eq('id', tenantId);
    if (error) throw error;
    await refreshTenants();
  };

  const updateTenantStatus = async (tenantId: string, status: Tenant['status']) => {
    if (usingLocalFallback) {
      const nextTenants = tenants.map(tenant => tenant.id === tenantId ? { ...tenant, status } : tenant);
      saveLocalTenants(nextTenants);
      setTenants(nextTenants);
      return;
    }

    const { error } = await supabase.from('tenants').update({ status }).eq('id', tenantId);
    if (error) throw error;
    await refreshTenants();
  };

  const assignUserToTenant = async (payload: { tenantId: string; userId: string; role: AppRole; allowed_types: BusinessUnitAccess[] }) => {
    if (usingLocalFallback) {
      return;
    }

    const { error } = await supabase.from('tenant_users').upsert({
      tenant_id: payload.tenantId,
      user_id: payload.userId,
      role: payload.role,
      allowed_types: payload.allowed_types,
      active: true
    });
    if (error) throw error;
    await refreshTenantMembers(payload.tenantId);
  };

  const createPlatformUser = async (payload: { tenantId: string; email: string; password: string; fullName: string; role: AppRole; allowed_types: BusinessUnitAccess[]; platformRole: PlatformRole }) => {
    if (usingLocalFallback) {
      throw new Error('Criacao de usuarios exige Supabase ativo.');
    }

    const { data, error } = await supabase.functions.invoke('platform-create-user', { body: payload });
    if (error) {
      const message = error.message?.includes('Failed to send a request')
        ? 'Nao foi possivel acessar a Edge Function platform-create-user. Verifique se ela foi publicada no Supabase e se o projeto esta acessivel.'
        : error.message;
      throw new Error(message || 'Erro ao chamar a Edge Function platform-create-user.');
    }
    if (data?.error) throw new Error(data.error);
    await refreshTenantMembers(payload.tenantId);
    if (payload.platformRole === 'SUPER_ADMIN') {
      await refreshTenants();
    }
    return data as { userId: string; email: string };
  };

  const updateTenantUser = async (payload: { tenantId: string; userId: string; role: AppRole; allowed_types: BusinessUnitAccess[]; active: boolean }) => {
    const { error } = await supabase.from('tenant_users').update({
      role: payload.role,
      allowed_types: payload.allowed_types,
      active: payload.active
    }).eq('tenant_id', payload.tenantId).eq('user_id', payload.userId);
    if (error) throw error;
    await refreshTenantMembers(payload.tenantId);
  };

  const removeUserFromTenant = async (tenantId: string, userId: string) => {
    const { error } = await supabase.from('tenant_users').delete().eq('tenant_id', tenantId).eq('user_id', userId);
    if (error) throw error;
    await refreshTenantMembers(tenantId);
  };

  const refreshTenantMembers = async (tenantId: string) => {
    if (!tenantId || usingLocalFallback) {
      setTenantMembers([]);
      setAvailableProfiles([]);
      return;
    }

    const [{ data: membersData, error: membersError }, { data: profilesData, error: profilesError }] = await Promise.all([
      supabase.from('tenant_user_profiles').select('*').eq('tenant_id', tenantId).order('email'),
      supabase.from('profiles').select('id,email,full_name,role,allowed_types,platform_role').order('email')
    ]);

    if (membersError) throw membersError;
    if (profilesError) throw profilesError;

    const members = ((membersData || []) as any[]).map((row): TenantMember => ({
      tenantId: row.tenant_id,
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      allowed_types: row.allowed_types || ['SERVICES'],
      active: row.active !== false,
      platformRole: row.platform_role
    }));

    const memberIds = new Set(members.map(member => member.userId));
    const available = ((profilesData || []) as any[])
      .filter(row => !memberIds.has(row.id))
      .map((row): TenantMember => ({
        tenantId,
        userId: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role || 'SELLER',
        allowed_types: row.allowed_types || ['SERVICES'],
        active: true,
        platformRole: row.platform_role
      }));

    setTenantMembers(members);
    setAvailableProfiles(available);
  };

  const uploadTenantLogo = async (tenantId: string, file: File) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `tenants/${tenantId}/logos/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('branding-assets').upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('branding-assets').getPublicUrl(path);
    await updateTenantBranding(tenantId, { logoUrl: data.publicUrl });
    return data.publicUrl;
  };

  const value = useMemo<TenantContextValue>(() => ({
    tenants,
    memberships,
    tenantMembers,
    availableProfiles,
    activeTenant,
    activeTenantId,
    tenantLoading,
    tenantError,
    isPlatformSuperAdmin,
    selectTenant,
    clearTenantSelection,
    refreshTenants,
    refreshTenantMembers,
    hasModule: (module: TenantModule) => activeTenant?.enabledModules.includes(module) ?? false,
    upsertTenant,
    updateTenantBranding,
    updateTenantModules,
    updateTenantStatus,
    createPlatformUser,
    assignUserToTenant,
    updateTenantUser,
    removeUserFromTenant,
    uploadTenantLogo
  }), [tenants, memberships, tenantMembers, availableProfiles, activeTenant, activeTenantId, tenantLoading, tenantError, isPlatformSuperAdmin]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used inside TenantProvider');
  }
  return context;
};
