import React, { useEffect } from 'react';
import { Building2, Crown, LogOut, Loader2 } from 'lucide-react';
import { TenantMembership } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Badge } from '../components/ui';
import { createTenantTheme } from '../utils/theme';

interface TenantEntryProps {
  onOpenPortal: () => void;
}

const TenantEntry: React.FC<TenantEntryProps> = ({ onOpenPortal }) => {
  const { profile, signOut } = useAuth();
  const { memberships, tenants, tenantLoading, isPlatformSuperAdmin, selectTenant, tenantError } = useTenant();

  const activeMemberships = memberships.filter(m => m.active);

  useEffect(() => {
    if (!tenantLoading && !isPlatformSuperAdmin && activeMemberships.length === 1) {
      selectTenant(activeMemberships[0].tenantId);
    }
  }, [tenantLoading, isPlatformSuperAdmin, activeMemberships.length]);

  const renderTenantButton = (membership: TenantMembership) => {
    const tenant = membership.tenant || tenants.find(t => t.id === membership.tenantId);
    if (!tenant) return null;
    const theme = createTenantTheme(tenant.branding);

    return (
      <button
        key={membership.tenantId}
        onClick={() => selectTenant(membership.tenantId)}
        className="group flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900/60"
        style={{ borderColor: theme.primaryBorder }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg border bg-white p-2 dark:bg-slate-800/80"
            style={{ color: theme.primary, backgroundColor: theme.primarySubtle, borderColor: theme.primaryBorder }}
          >
            {tenant.branding?.logoUrl ? (
              <img src={tenant.branding.logoUrl} alt={tenant.name} className="h-full w-full object-contain" />
            ) : (
              <Building2 size={22} />
            )}
          </div>
          <div>
            <p className="font-black text-slate-800 dark:text-slate-100">{tenant.name}</p>
            <p className="text-xs font-semibold uppercase text-slate-400">{tenant.slug}</p>
          </div>
        </div>
        <Badge tone="brand" theme={theme}>{membership.role}</Badge>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 dark:bg-[#101621] dark:text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl flex-col justify-center">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">oPrice RM</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Selecionar acesso</h1>
            <p className="mt-2 text-sm text-slate-400">{profile?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-red-500/40 dark:hover:text-red-300"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>

        <div className="space-y-4">
          {isPlatformSuperAdmin && (
            <button
              onClick={onOpenPortal}
              className="group flex w-full items-center justify-between rounded-lg border border-violet-300/60 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-violet-500/30 dark:bg-slate-900/60"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-600 text-white">
                  <Crown size={22} />
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white">Portal Superadmin</p>
                  <p className="text-xs font-semibold uppercase text-violet-500 dark:text-violet-300">Tenants, modulos e vinculos</p>
                </div>
              </div>
              <Badge className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">Plataforma</Badge>
            </button>
          )}

          {tenantLoading ? (
            <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-10 text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
              <Loader2 className="mr-3 animate-spin" size={22} />
              Carregando acessos...
            </div>
          ) : (
            activeMemberships.map(renderTenantButton)
          )}

          {!tenantLoading && activeMemberships.length === 0 && !isPlatformSuperAdmin && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              Seu usuario ainda nao esta vinculado a uma empresa. Solicite acesso ao administrador.
            </div>
          )}

          {tenantError && (
            <p className="text-xs text-slate-500">
              Modo local ativo porque as tabelas multitenant ainda nao responderam: {tenantError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantEntry;
