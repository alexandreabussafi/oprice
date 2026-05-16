import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Info, X } from 'lucide-react';
import type { TenantTheme } from '../utils/theme';
import { createTenantTheme, hexToRgba } from '../utils/theme';

export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const defaultTheme = createTenantTheme();

export const surfaceClass = 'rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]';
export const subpanelClass = 'rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-surface)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]';
export const controlClass = 'rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]';
export const activeControlClass = 'rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-control-active)] text-[var(--tenant-primary)] dark:bg-[var(--tenant-control-active-dark)] dark:text-[var(--tenant-primary-on-dark)]';
export const inputClass = 'rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-semibold text-[var(--tenant-text)] outline-none transition focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]';
export const labelClass = 'text-[10px] font-black uppercase text-slate-500 dark:text-slate-400';
export const pageShellClass = 'w-full max-w-[1560px] space-y-5 px-3 pb-6 pt-4 sm:space-y-6 sm:px-6 sm:pt-5 lg:px-8 animate-in fade-in slide-in-from-bottom-2 duration-300';
export const modalPanelClass = 'max-h-[92dvh] overflow-hidden rounded-t-xl border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-2xl dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] sm:rounded-lg';
export const modalHeaderClass = 'border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]';
export const tableClass = 'overflow-hidden rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]';
export const tableHeaderClass = 'border-b border-[var(--tenant-border)] bg-[var(--tenant-control)] text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400';
export const tooltipClass = 'rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] text-[var(--tenant-text)] shadow-lg dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-[var(--tenant-text-dark)]';
export const neutralBadgeClass = 'rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300';

interface BrandedProps {
  theme?: TenantTheme;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, BrandedProps {
  variant?: 'primary' | 'secondary' | 'neutral' | 'ghost' | 'danger';
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', theme = defaultTheme, icon: Icon, className, children, style, ...props }) => {
  const variantStyle: React.CSSProperties =
    variant === 'primary'
      ? { backgroundColor: 'var(--tenant-primary)', borderColor: 'var(--tenant-primary)', color: '#fff' }
      : variant === 'secondary'
        ? { backgroundColor: 'var(--tenant-secondary-soft)', borderColor: 'var(--tenant-secondary-border)', color: 'var(--tenant-secondary)' }
        : variant === 'danger'
          ? {}
        : variant === 'ghost'
            ? { color: 'var(--tenant-primary)' }
            : {};

  const variantClass =
    variant === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
      : variant === 'neutral'
        ? 'border-[var(--tenant-border)] bg-[var(--tenant-control)] text-[var(--tenant-text)] hover:brightness-95 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]'
        : variant === 'ghost'
          ? 'border-transparent bg-transparent hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)]'
          : 'border hover:brightness-95';

  return (
    <button
      {...props}
      style={{ ...variantStyle, ...style }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]',
        variantClass,
        className
      )}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, BrandedProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ icon: Icon, label, active, theme = defaultTheme, className, style, ...props }) => (
  <button
    {...props}
    title={label}
    aria-label={label}
    style={{
      ...(active ? { color: theme.primary, backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder } : {}),
      ...style
    }}
    className={cn(
      'inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-500 transition hover:brightness-95 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300',
      className
    )}
  >
    <Icon size={17} />
  </button>
);

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, BrandedProps {
  tone?: 'brand' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', theme = defaultTheme, className, style, ...props }) => {
  const toneStyle: React.CSSProperties =
    tone === 'brand'
      ? { backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder, color: theme.primary }
      : tone === 'secondary'
        ? { backgroundColor: theme.secondarySoft, borderColor: theme.secondaryBorder, color: theme.secondary }
        : {};

  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300'
        : tone === 'danger'
          ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
          : tone === 'neutral'
            ? 'border-[var(--tenant-border)] bg-[var(--tenant-control)] text-[var(--tenant-text)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]'
            : 'border';

  return (
    <span
      {...props}
      style={{ ...toneStyle, ...style }}
      className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase', toneClass, className)}
    />
  );
};

interface FieldProps {
  label: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({ label, icon: Icon, hint, className, children }) => (
  <label className={cn('space-y-2', className)}>
    <span className="flex items-center gap-1.5">
      {Icon && <Icon size={13} className="text-slate-400" />}
      <span className={labelClass}>{label}</span>
      {hint && (
        <span className="group relative inline-flex">
          <Info size={13} className="cursor-help text-slate-400 transition hover:text-[var(--tenant-primary)]" />
          <span className={cn('invisible absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 p-2.5 text-center text-[11px] font-medium leading-relaxed opacity-0 transition group-hover:visible group-hover:opacity-100', tooltipClass)}>
            {hint}
          </span>
        </span>
      )}
    </span>
    {children}
  </label>
);

interface MetricCardProps extends BrandedProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'primary' | 'secondary' | 'neutral';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon: Icon, theme = defaultTheme, tone = 'primary', className }) => {
  const accent = tone === 'secondary' ? theme.secondary : theme.primary;
  return (
    <div className={cn(surfaceClass, 'p-4', className)}>
      <div className="mb-3 flex items-center justify-between">
        <p className={labelClass}>{label}</p>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-md border"
          style={{ color: accent, backgroundColor: hexToRgba(accent, 0.08), borderColor: hexToRgba(accent, 0.2) }}
        >
          <Icon size={16} />
        </span>
      </div>
      <p className="text-xl font-black text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
};

interface SegmentedControlProps<T extends string> extends BrandedProps {
  value: T;
  options: Array<{ value: T; label: string; icon?: LucideIcon }>;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({ value, options, onChange, theme = defaultTheme, className }: SegmentedControlProps<T>) {
  return (
    <div className={cn('inline-flex rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-1 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]', className)}>
      {options.map(option => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={active ? { color: theme.primary, borderColor: theme.primaryBorder } : undefined}
            className={cn(
              'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-black uppercase transition',
              active ? 'border bg-[var(--tenant-control-active)] shadow-sm dark:bg-[var(--tenant-control-active-dark)]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {Icon && <Icon size={14} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const PageShell: React.FC<PageShellProps> = ({ children, className, ...props }) => (
  <div {...props} className={cn(pageShellClass, className)}>
    {children}
  </div>
);

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon: Icon, actions, className, ...props }) => (
  <header
    {...props}
    className={cn(
      surfaceClass,
      'sticky top-0 z-30 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-5',
      className
    )}
  >
    <div className="flex min-w-0 items-center gap-3">
      {Icon && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] sm:h-10 sm:w-10">
          <Icon size={18} />
        </span>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-lg font-black tracking-tight text-slate-950 dark:text-slate-100 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 hidden text-sm font-medium text-slate-500 dark:text-slate-400 sm:block">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center sm:justify-end">{actions}</div>}
  </header>
);

interface ResponsiveDrawerProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  panelClassName?: string;
  mode?: 'static-md' | 'overlay';
  closeLabel?: string;
  showCloseButton?: boolean;
}

export const ResponsiveDrawer: React.FC<ResponsiveDrawerProps> = ({
  open,
  onClose,
  children,
  className,
  panelClassName,
  mode = 'static-md',
  closeLabel = 'Fechar painel',
  showCloseButton = false,
  ...props
}) => {
  if (!open) return null;

  const wrapperClass = mode === 'static-md'
    ? 'fixed inset-0 z-[90] lg:static lg:inset-auto lg:z-20 lg:h-full lg:w-auto lg:shrink-0'
    : 'fixed inset-0 z-[500]';

  const panelClass = mode === 'static-md'
    ? 'fixed inset-y-0 right-0 z-[91] flex h-dvh w-[88vw] max-w-[420px] flex-col border-l border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-2xl animate-in slide-in-from-right duration-200 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] sm:w-[50vw] sm:min-w-[360px] sm:max-w-[520px] lg:static lg:z-auto lg:h-full lg:w-[min(720px,calc(100vw_-_280px))] lg:max-w-none lg:shadow-xl'
    : 'fixed inset-y-0 right-0 z-[501] flex h-dvh w-[88vw] max-w-[420px] flex-col border-l border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-2xl animate-in slide-in-from-right duration-200 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] sm:w-[50vw] sm:min-w-[360px] sm:max-w-[560px] lg:w-[min(640px,54vw)] lg:max-w-[680px]';

  return (
    <div {...props} className={cn(wrapperClass, className)} onClick={onClose}>
      <div className={cn('absolute inset-0 bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] backdrop-blur-[1px]', mode === 'static-md' && 'lg:hidden')} />
      <aside className={cn(panelClass, panelClassName)} onClick={event => event.stopPropagation()}>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            title={closeLabel}
            aria-label={closeLabel}
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-500 shadow-sm transition hover:brightness-95 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300"
          >
            <X size={18} />
          </button>
        )}
        {children}
      </aside>
    </div>
  );
};

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  detail?: React.ReactNode;
  tone?: 'tenant' | 'neutral' | 'success' | 'warning' | 'danger';
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, detail, tone = 'tenant', className, ...props }) => {
  const semanticClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300'
        : tone === 'danger'
          ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
        : tone === 'neutral'
            ? 'border-[var(--tenant-border)] bg-[var(--tenant-control)] text-[var(--tenant-text)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]'
            : 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)]';

  return (
    <div {...props} className={cn(surfaceClass, 'flex items-center justify-between gap-3 p-3 transition-shadow hover:shadow-md sm:gap-4 sm:p-5', className)}>
      <div className="min-w-0">
        <p className={labelClass}>{label}</p>
        <p className="mt-1 truncate text-xl font-black text-slate-950 dark:text-slate-100 sm:mt-2 sm:text-2xl">{value}</p>
        {detail && <div className="mt-1 hidden text-[11px] font-bold text-slate-500 dark:text-slate-400 sm:block">{detail}</div>}
      </div>
      {Icon && (
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md border sm:h-11 sm:w-11', semanticClass)}>
          <Icon size={19} />
        </span>
      )}
    </div>
  );
};

interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Toolbar: React.FC<ToolbarProps> = ({ children, className, ...props }) => (
  <div {...props} className={cn(surfaceClass, 'flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between', className)}>
    {children}
  </div>
);

export const SkeletonBlock: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div {...props} className={cn('animate-pulse rounded-md bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)]', className)} />
);

export const SkeletonCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div {...props} className={cn(surfaceClass, 'space-y-4 p-5', className)}>
    <SkeletonBlock className="h-4 w-1/3" />
    <SkeletonBlock className="h-8 w-2/3" />
    <SkeletonBlock className="h-4 w-full" />
  </div>
);
