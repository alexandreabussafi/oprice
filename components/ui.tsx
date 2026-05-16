import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Info } from 'lucide-react';
import type { TenantTheme } from '../utils/theme';
import { createTenantTheme, hexToRgba } from '../utils/theme';

export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const defaultTheme = createTenantTheme();

export const surfaceClass = 'rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-surface)] shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]';
export const inputClass = 'rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-3 py-2 text-sm font-semibold text-[var(--tenant-text)] outline-none transition focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)] dark:text-[var(--tenant-text-dark)]';
export const labelClass = 'text-[10px] font-black uppercase text-slate-500 dark:text-slate-400';
export const pageShellClass = 'w-full max-w-[1560px] space-y-5 px-3 pb-6 pt-4 sm:space-y-6 sm:px-6 sm:pt-5 lg:px-8 animate-in fade-in slide-in-from-bottom-2 duration-300';

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
      ? { backgroundColor: theme.primary, borderColor: theme.primary, color: '#fff' }
      : variant === 'secondary'
        ? { backgroundColor: theme.secondarySoft, borderColor: theme.secondaryBorder, color: theme.secondary }
        : variant === 'danger'
          ? {}
          : variant === 'ghost'
            ? { color: theme.primary }
            : {};

  const variantClass =
    variant === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
      : variant === 'neutral'
        ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800'
        : variant === 'ghost'
          ? 'border-transparent bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/70'
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
      'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800',
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
            ? 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
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
          <span className="invisible absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-md border border-slate-700 bg-slate-900 p-2.5 text-center text-[11px] font-medium leading-relaxed text-white opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
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
    <div className={cn('inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800/70', className)}>
      {options.map(option => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={active ? { color: theme.primary, backgroundColor: '#fff', borderColor: theme.primaryBorder } : undefined}
            className={cn(
              'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-black uppercase transition',
              active ? 'border shadow-sm dark:bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
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
      'sticky top-0 z-30 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5',
      className
    )}
  >
    <div className="flex min-w-0 items-center gap-3">
      {Icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] sm:h-10 sm:w-10">
          <Icon size={20} />
        </span>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-xl font-black tracking-tight text-slate-950 dark:text-slate-100 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center sm:justify-end">{actions}</div>}
  </header>
);

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
            ? 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            : 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)]';

  return (
    <div {...props} className={cn(surfaceClass, 'flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-md', className)}>
      <div className="min-w-0">
        <p className={labelClass}>{label}</p>
        <p className="mt-2 truncate text-2xl font-black text-slate-950 dark:text-slate-100">{value}</p>
        {detail && <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{detail}</div>}
      </div>
      {Icon && (
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-md border', semanticClass)}>
          <Icon size={21} />
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
  <div {...props} className={cn('animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800', className)} />
);

export const SkeletonCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div {...props} className={cn(surfaceClass, 'space-y-4 p-5', className)}>
    <SkeletonBlock className="h-4 w-1/3" />
    <SkeletonBlock className="h-8 w-2/3" />
    <SkeletonBlock className="h-4 w-full" />
  </div>
);
