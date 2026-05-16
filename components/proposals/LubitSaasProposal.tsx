import React from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Boxes,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  Headphones,
  Image,
  ListChecks,
  LockKeyhole,
  LucideIcon,
  MessagesSquare,
  Package,
  PlugZap,
  Presentation,
  Route,
  ShieldCheck,
  Signature,
  Workflow,
  XCircle,
} from 'lucide-react';
import { ProposalData, ProposalTemplateConfig, TenantBranding } from '../../types';
import { buildLubitSaasProposalData, LubitProposalCatalogItem, LubitSlaRow } from '../../utils/lubitSaasProposal';
import { cn } from '../ui';

interface LubitSaasProposalProps {
  proposal: ProposalData;
  template: ProposalTemplateConfig;
  branding?: TenantBranding;
  compact?: boolean;
}

const ICONS: Record<string, LucideIcon> = {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Boxes,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  Headphones,
  Image,
  ListChecks,
  LockKeyhole,
  MessagesSquare,
  Package,
  PlugZap,
  Presentation,
  Route,
  ShieldCheck,
  Signature,
  Workflow,
};

const iconFor = (name: string) => ICONS[name] || FileCheck2;

const toneClass: Record<LubitSlaRow['tone'], string> = {
  critical: 'bg-rose-600 text-white',
  high: 'bg-amber-600 text-white',
  medium: 'bg-blue-600 text-white',
  low: 'bg-slate-500 text-white',
};

const IconTile: React.FC<{ icon: string; className?: string }> = ({ icon, className }) => {
  const Icon = iconFor(icon);
  return (
    <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-cyan-50 text-cyan-700', className)}>
      <Icon size={18} />
    </span>
  );
};

const ItemCard: React.FC<{ item: LubitProposalCatalogItem; selected?: boolean; label?: string }> = ({ item, selected, label }) => (
  <div className={cn(
    'flex min-w-0 gap-3 rounded-lg border p-4',
    selected ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white'
  )}>
    <IconTile icon={item.icon} />
    <div className="min-w-0">
      {label && <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>}
      <h4 className="font-black text-slate-950">{item.title}</h4>
      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{item.description}</p>
    </div>
  </div>
);

const ListCard: React.FC<{ title: string; icon: LucideIcon; items: string[]; tone: 'included' | 'excluded' }> = ({ title, icon: Icon, items, tone }) => (
  <div className={cn(
    'rounded-lg border p-4',
    tone === 'included' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
  )}>
    <div className="mb-3 flex items-center gap-2">
      <span className={cn('flex h-8 w-8 items-center justify-center rounded-md border', tone === 'included' ? 'border-emerald-200 bg-white text-emerald-700' : 'border-amber-200 bg-white text-amber-700')}>
        <Icon size={16} />
      </span>
      <h4 className="font-black text-slate-950">{title}</h4>
    </div>
    <ul className="space-y-2 text-sm font-medium leading-relaxed text-slate-700">
      {items.map(item => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />{item}</li>)}
    </ul>
  </div>
);

const Section: React.FC<{ kicker: string; title: string; children: React.ReactNode }> = ({ kicker, title, children }) => (
  <section className="space-y-4">
    <div>
      <p className="text-[11px] font-black uppercase text-slate-500">{kicker}</p>
      <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{title}</h3>
    </div>
    {children}
  </section>
);

const LubitSaasProposal: React.FC<LubitSaasProposalProps> = ({ proposal, template, branding, compact = false }) => {
  const view = buildLubitSaasProposalData(proposal, template, branding);
  const primary = view.primaryColor;
  const secondary = view.secondaryColor;

  return (
    <article className={cn('overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-xl', compact && 'shadow-none')}>
      <section
        className="relative grid gap-8 overflow-hidden p-8 text-white lg:grid-cols-[minmax(0,1.4fr)_360px] lg:p-10"
        style={{ background: `linear-gradient(135deg, #081f2c 0%, ${primary} 54%, ${secondary} 115%)` }}
      >
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,.14) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }} />
        <div className="relative z-10 self-center">
          <div className="mb-8 flex flex-wrap items-center gap-4">
            {view.logoUrl ? (
              <img src={view.logoUrl} alt={view.companyName} className="h-12 max-w-[180px] object-contain" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-200/30 bg-white/10 text-xl font-black">L</div>
            )}
            <div className="border-l border-cyan-100/30 pl-4">
              <p className="text-xs font-black uppercase text-cyan-100">Proposta SaaS</p>
              <p className="text-sm font-bold text-white/75">{view.companyName}</p>
            </div>
          </div>
          <p className="text-xs font-black uppercase text-cyan-100">Proposta tecnica e comercial</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-black leading-tight tracking-tight lg:text-5xl">{view.title}</h1>
          <p className="mt-5 max-w-3xl text-base font-medium leading-relaxed text-white/85">{view.executiveSummary}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {[view.config.profile, `SLA ${view.slaPlan.title} - ${view.slaPlan.badge}`, `${view.modules.length} modulos`, `${view.addons.length} opcionais`].map(item => (
              <span key={item} className="rounded-full border border-cyan-100/30 bg-white/10 px-3 py-1.5 text-xs font-black text-cyan-50">{item}</span>
            ))}
          </div>
        </div>
        <aside className="relative z-10 border border-cyan-100/25 border-l-4 border-l-cyan-200 bg-white/10 p-5 backdrop-blur">
          <p className="text-lg font-black">{view.companyName}</p>
          {[
            ['Cliente', view.clientName],
            ['Proposta', `#${view.proposalNumber} v${view.version}`],
            ['Validade', view.validUntil],
            ['Responsavel', view.owner],
            ['Plano', view.planName],
          ].map(([label, value]) => (
            <div key={label} className="mt-4">
              <p className="text-[11px] font-black uppercase text-cyan-100">{label}</p>
              <p className="mt-0.5 text-sm font-black text-white">{value}</p>
            </div>
          ))}
        </aside>
      </section>

      <div className="grid border-b border-slate-200 md:grid-cols-4">
        {[
          ['MRR liquido', view.formattedMonthly],
          ['ARR liquido', view.formattedArr],
          ['Implantacao', view.formattedSetup],
          ['Total do prazo', view.formattedContractTotal],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-slate-200 p-5 md:border-b-0 md:border-r last:md:border-r-0">
            <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-10 p-6 lg:p-10">
        <Section kicker="Menu configurado" title="Parametros da proposta">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { icon: Boxes, label: 'Perfil', value: view.config.profile, detail: 'Modelo tecnico/comercial da oportunidade.' },
              { icon: Headphones, label: 'Suporte', value: `${view.slaPlan.title} - ${view.slaPlan.badge}`, detail: view.slaPlan.coverage },
              { icon: ListChecks, label: 'Escopo', value: `${view.modules.length} modulos`, detail: 'Modulos funcionais selecionados.' },
              { icon: PlugZap, label: 'Opcionais', value: `${view.addons.length} itens`, detail: 'Evolucoes comerciais e tecnicas.' },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><Icon size={18} /></span>
                  <p className="text-[10px] font-black uppercase text-slate-500">{item.label}</p>
                  <p className="mt-1 font-black">{item.value}</p>
                  <p className="mt-2 text-xs font-medium text-slate-600">{item.detail}</p>
                </div>
              );
            })}
          </div>
        </Section>

        <Section kicker="Escopo" title="Escopo contratado">
          <div className="grid gap-3 md:grid-cols-2">
            {view.scopeItems.map((item, index) => (
              <div key={`${item}-${index}`} className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-sm font-black text-emerald-700">{index + 1}</span>
                <p className="text-sm font-semibold leading-relaxed text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section kicker="CMMS / SaaS industrial" title="Modulos funcionais selecionados">
          <div className="grid gap-3 md:grid-cols-2">
            {view.modules.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        </Section>

        <Section kicker="Jornada" title="Fluxo de ativacao">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ['Kick-off', 'Alinhamento de escopo, responsaveis e cronograma.'],
              ['Configuracao', 'Ambiente, usuarios, perfis e parametros iniciais.'],
              ['Carga assistida', 'Importacao e conferencia dos dados combinados.'],
              ['Operacao', 'Liberacao, suporte e acompanhamento da rotina.'],
            ].map(([title, detail], index) => (
              <div key={title} className="rounded-lg border border-slate-200 border-t-4 bg-white p-4" style={{ borderTopColor: index % 2 ? secondary : primary }}>
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-sm font-black">{index + 1}</span>
                <h4 className="mt-4 font-black">{title}</h4>
                <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">{detail}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section kicker="Condicoes comerciais" title="Modelo de assinatura">
          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
              <p className="text-[11px] font-black uppercase text-slate-500">Valor mensal</p>
              <p className="mt-3 text-4xl font-black text-slate-950">{view.formattedMonthly}</p>
              <p className="mt-2 text-sm font-semibold text-slate-600">{view.licenses} licenca(s) - {view.planName}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="font-black">Setup / implantacao: <span className="font-semibold">{view.formattedSetup}</span></p>
              <p className="mt-2 font-black">Prazo estimado: <span className="font-semibold">{view.config.implementationTime}</span></p>
              <p className="mt-2 font-black">Reajuste: <span className="font-semibold">{view.config.adjustment}</span></p>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm font-medium text-slate-700">
                {view.commercialTerms.map(item => <li key={item}>{item}</li>)}
              </ol>
            </div>
          </div>
        </Section>

        <Section kicker="Opcionais" title="Matriz de evolucao comercial">
          <div className="grid gap-3 md:grid-cols-2">
            {view.addons.map(item => <ItemCard key={item.id} item={item} selected label="Selecionado" />)}
            {view.futureAddons.map(item => <ItemCard key={item.id} item={item} label="Opcional futuro" />)}
          </div>
        </Section>

        <Section kicker="Suporte" title="SLA de atendimento">
          <div className="flex gap-3 rounded-lg border border-slate-200 border-l-4 bg-slate-50 p-4" style={{ borderLeftColor: primary }}>
            <IconTile icon="Headphones" />
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500">Plano {view.slaPlan.title} - {view.slaPlan.badge}</p>
              <p className="font-black">{view.slaPlan.coverage}</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{view.slaPlan.summary} Canal previsto: {view.slaPlan.channel}.</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-[11px] font-black uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Severidade</th>
                  <th className="px-4 py-3">Primeira resposta</th>
                  <th className="px-4 py-3">Criterio de priorizacao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {view.slaPlan.rows.map(row => (
                  <tr key={row.severity}>
                    <td className="px-4 py-3"><span className={cn('rounded-full px-2.5 py-1 text-xs font-black', toneClass[row.tone])}>{row.severity}</span></td>
                    <td className="px-4 py-3 font-bold">{row.response}</td>
                    <td className="px-4 py-3 text-slate-700">{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs font-bold leading-relaxed text-slate-500">SLA baseado em prazo de primeira resposta e priorizacao do atendimento. Prazos de solucao dependem de diagnostico, evidencias, causa raiz, terceiros e complexidade tecnica.</p>
        </Section>

        <Section kicker="Responsabilidades" title="Obrigacoes das partes">
          <div className="grid gap-4 md:grid-cols-2">
            <ListCard title="Incluido nesta proposta" icon={CheckCircle2} items={view.config.includedItems} tone="included" />
            <ListCard title="Fora do escopo / opcional" icon={XCircle} items={view.config.excludedItems} tone="excluded" />
            <ListCard title="Lubit/Core" icon={ShieldCheck} items={view.config.providerResponsibilities} tone="included" />
            <ListCard title="Cliente" icon={FileCheck2} items={view.config.clientResponsibilities} tone="excluded" />
          </div>
        </Section>

        <Section kicker="Anexos tecnicos" title="Referencias de implantacao e governanca">
          <div className="grid gap-3 md:grid-cols-2">
            {view.config.technicalAnnexes.map((item, index) => (
              <div key={item} className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-sm font-black">{String(index + 1).padStart(2, '0')}</span>
                <p className="text-sm font-medium leading-relaxed text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section kicker="Aceite" title="Condicoes finais e aprovacao">
          <p className="text-sm font-medium leading-relaxed text-slate-700">{view.closingNotes}</p>
          {proposal.saasNotes && <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-700">{proposal.saasNotes}</p>}
          <div className="grid gap-4 pt-4 md:grid-cols-2">
            {[
              ['Lubit/Core', view.owner],
              [view.clientName, 'Responsavel pelo aceite'],
            ].map(([name, role]) => (
              <div key={name} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="mt-12 border-t border-slate-500 pt-3">
                  <p className="font-black">{name}</p>
                  <p className="text-sm font-medium text-slate-500">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </article>
  );
};

export default LubitSaasProposal;
