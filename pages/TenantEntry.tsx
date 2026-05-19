import React, { useEffect } from 'react';
import { Building2, Crown, LogOut, Loader2 } from 'lucide-react';
import { TenantMembership } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Badge } from '../components/ui';
import { createTenantTheme } from '../utils/theme';

const OPRICE_LOGO_LIGHT = '/oprice-logo-text-blue.png';
const OPRICE_LOGO_DARK = '/oprice-logo-text-white.png';

interface TenantEntryProps {
  onOpenPortal: () => void;
}

const TenantEntry: React.FC<TenantEntryProps> = ({ onOpenPortal }) => {
  const { profile, signOut } = useAuth();
  const { memberships, tenants, tenantLoading, isPlatformSuperAdmin, selectTenant, tenantError } = useTenant();

  const activeMemberships = memberships.filter(m => m.active);
  const entryTheme = {
    '--entry-bg': '#f3f5f8',
    '--entry-bg-dark': '#151a24',
    '--entry-panel': '#ffffff',
    '--entry-panel-dark': '#202838',
    '--entry-control': '#f8fafc',
    '--entry-control-dark': '#182031',
    '--entry-border': '#d8dee8',
    '--entry-border-dark': '#334155',
    '--entry-text': '#111827',
    '--entry-text-dark': '#f8fafc',
    '--entry-muted': '#64748b',
    '--entry-muted-dark': '#94a3b8',
    '--entry-strong': '#111827'
  } as React.CSSProperties;

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
        className="group flex w-full items-center justify-between rounded-lg border bg-[var(--entry-panel)] p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-[var(--entry-panel-dark)]"
        style={{ borderColor: theme.primaryBorder }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg border p-2"
            style={{ color: theme.primary, backgroundColor: theme.primarySubtle, borderColor: theme.primaryBorder }}
          >
            {tenant.branding?.logoUrl ? (
              <img src={tenant.branding.logoUrl} alt={tenant.name} className="h-full w-full object-contain" />
            ) : (
              <Building2 size={22} />
            )}
          </div>
          <div>
            <p className="font-black text-[var(--entry-text)] dark:text-[var(--entry-text-dark)]">{tenant.name}</p>
            <p className="text-xs font-semibold uppercase text-[var(--entry-muted)] dark:text-[var(--entry-muted-dark)]">{tenant.slug}</p>
          </div>
        </div>
        <Badge tone="brand" theme={theme}>{membership.role}</Badge>
      </button>
    );
  };

  return (
    <div style={entryTheme} className="min-h-screen bg-[var(--entry-bg)] px-6 py-10 text-[var(--entry-text)] dark:bg-[var(--entry-bg-dark)] dark:text-[var(--entry-text-dark)]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl flex-col justify-center">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="h-8">
              <img src={OPRICE_LOGO_LIGHT} alt="OPrice" className="h-full w-auto object-contain dark:hidden" />
              <img src={OPRICE_LOGO_DARK} alt="OPrice" className="hidden h-full w-auto object-contain dark:block" />
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Selecionar acesso</h1>
            <p className="mt-2 text-sm font-medium text-[var(--entry-muted)] dark:text-[var(--entry-muted-dark)]">{profile?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--entry-border)] bg-[var(--entry-panel)] px-4 py-2 text-sm font-bold text-[var(--entry-muted)] shadow-sm transition-colors hover:border-red-300 hover:text-red-600 dark:border-[var(--entry-border-dark)] dark:bg-[var(--entry-panel-dark)] dark:text-[var(--entry-muted-dark)] dark:hover:border-red-500/40 dark:hover:text-red-300"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>

        <div className="space-y-4">
          {isPlatformSuperAdmin && (
            <button
              onClick={onOpenPortal}
              className="group flex w-full items-center justify-between rounded-lg border border-[var(--entry-border)] bg-[var(--entry-panel)] p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--entry-strong)] hover:shadow-md dark:border-[var(--entry-border-dark)] dark:bg-[var(--entry-panel-dark)] dark:hover:border-[var(--entry-muted-dark)]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--entry-strong)] text-white dark:bg-[var(--entry-control-dark)]">
                  <Crown size={22} />
                </div>
                <div>
                  <p className="font-black text-[var(--entry-text)] dark:text-[var(--entry-text-dark)]">Portal Superadmin</p>
                  <p className="text-xs font-semibold uppercase text-[var(--entry-muted)] dark:text-[var(--entry-muted-dark)]">Tenants, modulos e vinculos</p>
                </div>
              </div>
              <span className="rounded-full border border-[var(--entry-border)] bg-[var(--entry-control)] px-2.5 py-1 text-[10px] font-black uppercase text-[var(--entry-muted)] dark:border-[var(--entry-border-dark)] dark:bg-[var(--entry-control-dark)] dark:text-[var(--entry-muted-dark)]">Plataforma</span>
            </button>
          )}

          {tenantLoading ? (
            <div className="flex items-center justify-center rounded-lg border border-[var(--entry-border)] bg-[var(--entry-panel)] p-10 text-[var(--entry-muted)] shadow-sm dark:border-[var(--entry-border-dark)] dark:bg-[var(--entry-panel-dark)] dark:text-[var(--entry-muted-dark)]">
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
            <p className="text-xs text-[var(--entry-muted)] dark:text-[var(--entry-muted-dark)]">
              Modo local ativo porque as tabelas multitenant ainda nao responderam: {tenantError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantEntry;
