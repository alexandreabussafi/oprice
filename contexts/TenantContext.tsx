import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { AppRole, BusinessUnitAccess, PlatformRole, Tenant, TenantBranding, TenantMember, TenantMembership, TenantModule } from '../types';
import { classifySupabaseError, getPersistenceErrorMessage, runSupabaseRequest, runSupabaseResponse, withAbortSignal } from '../services/supabaseRequest';
import { auditRepository } from '../services/auditRepository';

export const PLATFORM_SUPERADMIN_EMAIL = 'alexandre.abussafi@gmail.com';
export const LUBRIM_TENANT_ID = 'tenant-lubrim';
export const SAAS_TENANT_ID = 'tenant-saas';
export const IOT_TENANT_ID = 'tenant-iot';
const RESERVED_PATHS = new Set(['login', 'superadmin', 'help', 'auth', 'api', 'assets']);
const PLATFORM_CREATE_USER_TIMEOUT_MS = 60_000;
const PLATFORM_CREATE_USER_RECONCILE_TIMEOUT_MS = 20_000;
const PLATFORM_CREATE_USER_RECONCILE_INTERVAL_MS = 2_000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const readFunctionErrorMessage = async (response?: Response | null) => {
  if (!response) return null;
  try {
    const body = await response.clone().json();
    return typeof body?.error === 'string' ? body.error : null;
  } catch {
    return null;
  }
};

const getPathTenantSlug = () => {
  if (typeof window === 'undefined') return null;
  const slug = window.location.pathname.split('/').filter(Boolean)[0]?.toLowerCase();
  if (!slug || RESERVED_PATHS.has(slug)) return null;
  return slug;
};

const pushTenantPath = (slug?: string | null, replace = false) => {
  if (typeof window === 'undefined') return;
  const nextPath = slug ? `/${slug}` : '/';
  if (window.location.pathname === nextPath) return;
  const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', nextUrl);
};

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
  uploadTenantBrandingAsset: (tenantId: string, file: File, folder?: 'logos' | 'favicons' | 'letterhead') => Promise<string>;
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

  const trackTenantUserAction = (
    tenantId: string,
    action: 'USER_CREATE' | 'USER_UPDATE' | 'USER_REMOVE',
    targetUserId: string,
    metadata: Record<string, any> = {}
  ) => {
    if (!user?.id) return;
    void auditRepository.trackActivity({
      tenantId,
      userId: user.id,
      action,
      entityType: 'tenant_user',
      entityId: targetUserId,
      metadata
    }).catch(error => console.warn('TenantContext: audit event unavailable.', error));
  };

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
      const data = await runSupabaseResponse(
        signal => {
          const tenantsQuery = isPlatformSuperAdmin
            ? supabase.from('tenants').select('*').order('name')
            : supabase.from('tenant_users').select('tenant_id, role, allowed_types, active, tenants(*)').eq('user_id', user.id).eq('active', true);
          return withAbortSignal(tenantsQuery, signal);
        },
        { label: 'Carregar tenants', resource: isPlatformSuperAdmin ? 'tenants' : 'tenant_users', timeoutMs: 10000 }
      );
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
      setTenantError(getPersistenceErrorMessage(error, 'Erro ao carregar tenants.'));
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

  useEffect(() => {
    if (tenantLoading || tenants.length === 0 || activeTenantId) return;
    const slug = getPathTenantSlug();
    if (!slug) return;
    const tenant = tenants.find(item => item.slug.toLowerCase() === slug);
    if (tenant) setActiveTenantId(tenant.id);
  }, [tenantLoading, tenants, activeTenantId]);

  const selectTenant = (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setActiveTenantId(tenantId);
      pushTenantPath(tenant.slug);
    }
  };

  const clearTenantSelection = () => {
    setActiveTenantId(null);
    pushTenantPath(null);
  };

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
    await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('tenants').upsert(payload).select().single(), signal),
      { label: 'Salvar tenant', resource: 'tenants', tenantId: payload.id, timeoutMs: 10000 }
    );
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

    const updateDirectly = () => runSupabaseResponse(
      signal => withAbortSignal(supabase.from('tenants').update({ branding: nextBranding }).eq('id', tenantId), signal),
      { label: 'Atualizar marca do tenant diretamente', resource: 'tenants', tenantId, timeoutMs: 20000 }
    );

    if (isPlatformSuperAdmin) {
      try {
        await updateDirectly();
      } catch (error: any) {
        throw new Error(getPersistenceErrorMessage(error, 'Erro ao salvar marca do tenant.'));
      }
    } else {
      try {
        await runSupabaseResponse(
          signal => withAbortSignal(supabase.rpc('update_tenant_branding', {
            next_branding: nextBranding,
            target_tenant_id: tenantId
          }), signal),
          { label: 'Atualizar marca do tenant via RPC', resource: 'rpc/update_tenant_branding', tenantId, timeoutMs: 20000 }
        );
      } catch (error: any) {
        const isMissingRpc = error.message?.includes('update_tenant_branding') || error.code === 'PGRST202';
        const kind = classifySupabaseError(error);
        if (!isMissingRpc || kind === 'timeout' || kind === 'abort' || kind === 'network') {
          throw new Error(getPersistenceErrorMessage(error, 'Erro ao salvar marca do tenant.'));
        }

        try {
          await updateDirectly();
        } catch (fallbackError: any) {
          throw new Error(`${getPersistenceErrorMessage(fallbackError, 'Erro ao salvar marca do tenant.')} A RPC update_tenant_branding ainda nao esta disponivel no Supabase; aplique a migration de branding.`);
        }
      }
    }
    setTenants(prev => prev.map(tenant => tenant.id === tenantId ? { ...tenant, branding: nextBranding } : tenant));
  };

  const updateTenantModules = async (tenantId: string, enabledModules: TenantModule[]) => {
    if (usingLocalFallback) {
      const nextTenants = tenants.map(tenant => tenant.id === tenantId ? { ...tenant, enabledModules } : tenant);
      saveLocalTenants(nextTenants);
      setTenants(nextTenants);
      return;
    }

    await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('tenants').update({ enabled_modules: enabledModules }).eq('id', tenantId), signal),
      { label: 'Atualizar modulos do tenant', resource: 'tenants', tenantId, timeoutMs: 10000 }
    );
    await refreshTenants();
  };

  const updateTenantStatus = async (tenantId: string, status: Tenant['status']) => {
    if (usingLocalFallback) {
      const nextTenants = tenants.map(tenant => tenant.id === tenantId ? { ...tenant, status } : tenant);
      saveLocalTenants(nextTenants);
      setTenants(nextTenants);
      return;
    }

    await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('tenants').update({ status }).eq('id', tenantId), signal),
      { label: 'Atualizar status do tenant', resource: 'tenants', tenantId, timeoutMs: 10000 }
    );
    await refreshTenants();
  };

  const assignUserToTenant = async (payload: { tenantId: string; userId: string; role: AppRole; allowed_types: BusinessUnitAccess[] }) => {
    if (usingLocalFallback) {
      return;
    }

    await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('tenant_users').upsert({
        tenant_id: payload.tenantId,
        user_id: payload.userId,
        role: payload.role,
        allowed_types: payload.allowed_types,
        active: true
      }), signal),
      { label: 'Vincular usuario ao tenant', resource: 'tenant_users', tenantId: payload.tenantId, timeoutMs: 10000 }
    );
    await refreshTenantMembers(payload.tenantId);
    trackTenantUserAction(payload.tenantId, 'USER_UPDATE', payload.userId, {
      operation: 'assign',
      role: payload.role,
      allowedTypes: payload.allowed_types
    });
  };

  const createPlatformUser = async (payload: { tenantId: string; email: string; password: string; fullName: string; role: AppRole; allowed_types: BusinessUnitAccess[]; platformRole: PlatformRole }) => {
    if (usingLocalFallback) {
      throw new Error('Criacao de usuarios exige Supabase ativo.');
    }

    const findCreatedUser = async () => {
      const profile = await runSupabaseResponse(
        signal => withAbortSignal(
          supabase
            .from('profiles')
            .select('id,email,platform_role')
            .ilike('email', payload.email)
            .maybeSingle(),
          signal
        ),
        { label: 'Conferir usuario criado', resource: 'profiles', tenantId: payload.tenantId, timeoutMs: 5000 }
      ) as any;

      if (!profile?.id) return null;
      if (payload.platformRole === 'SUPER_ADMIN' && profile.platform_role === 'SUPER_ADMIN') {
        return { userId: profile.id, email: profile.email || payload.email };
      }
      if (payload.platformRole === 'SUPER_ADMIN') return null;

      const membership = await runSupabaseResponse(
        signal => withAbortSignal(
          supabase
            .from('tenant_users')
            .select('tenant_id,user_id,active')
            .eq('tenant_id', payload.tenantId)
            .eq('user_id', profile.id)
            .maybeSingle(),
          signal
        ),
        { label: 'Conferir vinculo do usuario criado', resource: 'tenant_users', tenantId: payload.tenantId, timeoutMs: 5000 }
      ) as any;

      return membership?.user_id && membership.active !== false ? { userId: profile.id, email: profile.email || payload.email } : null;
    };

    const waitForCreatedUserAfterTimeout = async () => {
      const deadline = Date.now() + PLATFORM_CREATE_USER_RECONCILE_TIMEOUT_MS;
      while (Date.now() < deadline) {
        try {
          const created = await findCreatedUser();
          if (created) return created;
        } catch (error) {
          console.warn('TenantContext: nao foi possivel reconciliar criacao de usuario apos timeout.', error);
        }
        await sleep(PLATFORM_CREATE_USER_RECONCILE_INTERVAL_MS);
      }
      return null;
    };

    let response: any;
    try {
      response = await runSupabaseRequest(
        signal => supabase.functions.invoke('platform-create-user', {
          body: payload,
          signal,
          timeout: PLATFORM_CREATE_USER_TIMEOUT_MS
        } as any),
        { label: 'Criar usuario na plataforma', resource: 'functions/platform-create-user', tenantId: payload.tenantId, timeoutMs: PLATFORM_CREATE_USER_TIMEOUT_MS }
      );
    } catch (error: any) {
      if (classifySupabaseError(error) === 'timeout') {
        const created = await waitForCreatedUserAfterTimeout();
        if (created) {
          await refreshTenantMembers(payload.tenantId);
          if (payload.platformRole === 'SUPER_ADMIN') {
            await refreshTenants();
          }
          trackTenantUserAction(payload.tenantId, 'USER_CREATE', created.userId, {
            email: payload.email,
            role: payload.role,
            platformRole: payload.platformRole,
            allowedTypes: payload.allowed_types,
            reconciledAfterTimeout: true
          });
          return created;
        }
      }
      throw new Error(getPersistenceErrorMessage(error, 'Erro ao chamar a Edge Function platform-create-user.'));
    }

    const { data, error } = response;
    if (error) {
      const functionMessage = await readFunctionErrorMessage(response.response);
      const message = error.message?.includes('Failed to send a request')
        ? 'Nao foi possivel acessar a Edge Function platform-create-user. Verifique se ela foi publicada no Supabase e se o projeto esta acessivel.'
        : functionMessage || error.message;
      throw new Error(message || 'Erro ao chamar a Edge Function platform-create-user.');
    }
    if (data?.error) throw new Error(data.error);
    await refreshTenantMembers(payload.tenantId);
    if (payload.platformRole === 'SUPER_ADMIN') {
      await refreshTenants();
    }
    if (data?.userId) {
      trackTenantUserAction(payload.tenantId, 'USER_CREATE', data.userId, {
        email: payload.email,
        role: payload.role,
        platformRole: payload.platformRole,
        allowedTypes: payload.allowed_types
      });
    }
    return data as { userId: string; email: string };
  };

  const updateTenantUser = async (payload: { tenantId: string; userId: string; role: AppRole; allowed_types: BusinessUnitAccess[]; active: boolean }) => {
    await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('tenant_users').update({
        role: payload.role,
        allowed_types: payload.allowed_types,
        active: payload.active
      }).eq('tenant_id', payload.tenantId).eq('user_id', payload.userId), signal),
      { label: 'Atualizar usuario do tenant', resource: 'tenant_users', tenantId: payload.tenantId, timeoutMs: 10000 }
    );
    await refreshTenantMembers(payload.tenantId);
    trackTenantUserAction(payload.tenantId, 'USER_UPDATE', payload.userId, {
      role: payload.role,
      allowedTypes: payload.allowed_types,
      active: payload.active
    });
  };

  const removeUserFromTenant = async (tenantId: string, userId: string) => {
    await runSupabaseResponse(
      signal => withAbortSignal(supabase.from('tenant_users').delete().eq('tenant_id', tenantId).eq('user_id', userId), signal),
      { label: 'Remover usuario do tenant', resource: 'tenant_users', tenantId, timeoutMs: 10000 }
    );
    await refreshTenantMembers(tenantId);
    trackTenantUserAction(tenantId, 'USER_REMOVE', userId);
  };

  const refreshTenantMembers = async (tenantId: string) => {
    if (!tenantId || usingLocalFallback) {
      setTenantMembers([]);
      setAvailableProfiles([]);
      return;
    }

    const [membersData, profilesData] = await Promise.all([
      runSupabaseResponse(
        signal => withAbortSignal(supabase.from('tenant_user_profiles').select('*').eq('tenant_id', tenantId).order('email'), signal),
        { label: 'Listar membros do tenant', resource: 'tenant_user_profiles', tenantId, timeoutMs: 10000 }
      ),
      runSupabaseResponse(
        signal => withAbortSignal(supabase.from('profiles').select('id,email,full_name,role,allowed_types,platform_role').order('email'), signal),
        { label: 'Listar perfis disponiveis', resource: 'profiles', tenantId, timeoutMs: 10000 }
      )
    ]);

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

  const uploadTenantBrandingAsset = async (tenantId: string, file: File, folder: 'logos' | 'favicons' | 'letterhead' = 'logos') => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `tenants/${tenantId}/${folder}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await runSupabaseRequest(
      () => supabase.storage.from('branding-assets').upload(path, file, { upsert: true }),
      { label: 'Enviar arquivo de marca', resource: 'storage/branding-assets', tenantId, timeoutMs: 15000 }
    );
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('branding-assets').getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadTenantLogo = async (tenantId: string, file: File) => {
    const publicUrl = await uploadTenantBrandingAsset(tenantId, file, 'logos');
    await updateTenantBranding(tenantId, { logoUrl: publicUrl });
    return publicUrl;
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
    uploadTenantLogo,
    uploadTenantBrandingAsset
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
