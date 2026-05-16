import React, { useMemo, useState } from 'react';
import { Boxes, Calculator, Check, CreditCard, Download, Eye, FileText, Headphones, Loader2, Mail, Percent, Rocket, Save, Send, Settings2, Users, X } from 'lucide-react';
import { Contact, CRMCommunication, GoogleConnectionStatus, GoogleEmailDraft, MicrosoftConnectionStatus, MicrosoftEmailDraft, ProposalData, SaasProposalConfig, TenantBranding } from '../types';
import { formatCurrency } from '../utils/pricingEngine';
import { Button, inputClass, surfaceClass } from '../components/ui';
import { createTenantTheme } from '../utils/theme';
import InfoTooltip from '../components/InfoTooltip';
import { applyProposalTemplateVariables, getProposalTemplateKind, mergeProposalTemplates } from '../utils/proposalTemplates';
import { downloadProposalPdf, generateProposalEmailAttachment } from '../services/proposalPdf';
import LubitSaasProposal from '../components/proposals/LubitSaasProposal';
import { LUBIT_ADDON_CATALOG, LUBIT_MODULE_CATALOG, LUBIT_SLA_PLANS, normalizeSaasProposalConfig } from '../utils/lubitSaasProposal';
import { buildGmailReplyHeaders, groupCommunicationThreads } from '../utils/crmTraceability';

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDecimalBR = (value: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);

const parseDecimalBR = (value: string) => {
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return toNumber(normalized);
};

const mrrLiquidoHelp = 'MRR (Monthly Recurring Revenue) e a receita recorrente mensal apos desconto comercial, antes dos impostos.';
const arrLiquidoHelp = 'ARR (Annual Recurring Revenue) e o MRR liquido multiplicado por 12.';

interface SaasSubscriptionEditorProps {
  data: ProposalData;
  updateData: (newData: Partial<ProposalData>) => void;
  onSaveData: (newData: Partial<ProposalData>) => void | Promise<void>;
  brandColor?: string;
  brandSecondaryColor?: string;
  tenantBranding?: TenantBranding;
  globalConfig?: ProposalData;
  contacts?: Contact[];
  communications?: CRMCommunication[];
  googleConnection?: GoogleConnectionStatus;
  microsoftConnection?: MicrosoftConnectionStatus;
  workspaceLoading?: boolean;
  onSendGoogleEmail?: (draft: GoogleEmailDraft) => Promise<unknown>;
  onSendMicrosoftEmail?: (draft: MicrosoftEmailDraft) => Promise<unknown>;
}

const SaasSubscriptionEditor: React.FC<SaasSubscriptionEditorProps> = ({
  data,
  updateData,
  onSaveData,
  brandColor,
  brandSecondaryColor,
  tenantBranding,
  globalConfig,
  contacts = [],
  communications = [],
  googleConnection,
  microsoftConnection,
  workspaceLoading = false,
  onSendGoogleEmail,
  onSendMicrosoftEmail
}) => {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [focusedMoneyField, setFocusedMoneyField] = useState<'unitPrice' | 'setupFee' | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailProvider, setEmailProvider] = useState<'google' | 'microsoft'>(googleConnection?.connected ? 'google' : 'microsoft');
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [proposalPreviewOpen, setProposalPreviewOpen] = useState(false);
  const tenantTheme = createTenantTheme(tenantBranding || (brandColor || brandSecondaryColor ? { primaryColor: brandColor, secondaryColor: brandSecondaryColor } : undefined));
  const brandPrimary = tenantTheme.primary;
  const unitPrice = data.saasUnitPrice ?? 0;
  const quantity = data.saasQuantity ?? 1;
  const discount = data.saasMonthlyDiscount ?? 0;
  const setupFee = data.saasSetupFee ?? 0;
  const contractMonths = data.saasContractMonths ?? data.contractDuration ?? 12;
  const saasProposalConfig = useMemo(() => normalizeSaasProposalConfig(data.saasProposalConfig), [data.saasProposalConfig]);
  const proposalThreads = useMemo(() => groupCommunicationThreads(communications), [communications]);
  const getLatestThreadForProvider = (provider: 'google' | 'microsoft') =>
    proposalThreads.find(thread => thread.provider === provider && (provider === 'google'
      ? Boolean(thread.lastMessage.gmailThreadId)
      : Boolean(thread.lastMessage.microsoftConversationId)
    ));

  const currentProposal = useMemo<ProposalData>(() => ({
    ...data,
    pricingModule: 'SAAS_SUBSCRIPTION',
    type: 'PRODUCT',
    saasPlanName: data.saasPlanName || 'Plano Professional',
    saasUnitPrice: unitPrice,
    saasQuantity: quantity,
    saasMonthlyDiscount: discount,
    saasSetupFee: setupFee,
    saasContractMonths: contractMonths,
    saasProposalConfig,
    contractDuration: contractMonths,
    letterheadConfig: globalConfig?.letterheadConfig || data.letterheadConfig,
    proposalTemplates: globalConfig?.proposalTemplates || data.proposalTemplates
  }), [contractMonths, data, discount, globalConfig?.letterheadConfig, globalConfig?.proposalTemplates, quantity, saasProposalConfig, setupFee, unitPrice]);

  const proposalTemplate = useMemo(() => {
    const templates = mergeProposalTemplates(currentProposal.proposalTemplates, currentProposal.letterheadConfig?.companyName);
    return templates[getProposalTemplateKind(currentProposal)];
  }, [currentProposal]);

  const salesTaxRate = useMemo(() => (
    data.taxConfig?.salesTaxes?.filter(tax => tax.active).reduce((sum, tax) => sum + tax.rate, 0) || 0
  ), [data.taxConfig?.salesTaxes]);

  const metrics = useMemo(() => {
    const grossMrr = unitPrice * quantity;
    const discountAmount = grossMrr * discount;
    const netMrr = Math.max(0, grossMrr - discountAmount);
    const monthlyTaxes = netMrr * salesTaxRate;
    const netAfterTaxes = Math.max(0, netMrr - monthlyTaxes);

    return {
      grossMrr,
      discountAmount,
      netMrr,
      monthlyTaxes,
      netAfterTaxes,
      arr: netMrr * 12,
      contractTotal: netMrr * contractMonths + setupFee,
      opportunityValue: netMrr + setupFee
    };
  }, [unitPrice, quantity, discount, setupFee, contractMonths, salesTaxRate]);

  const patch = (payload: Partial<ProposalData>) => {
    setSaveState('idle');
    updateData(payload);
  };

  const patchSaasProposalConfig = (payload: Partial<SaasProposalConfig>) => {
    patch({ saasProposalConfig: normalizeSaasProposalConfig({ ...saasProposalConfig, ...payload }) });
  };

  const toggleSaasConfigId = (field: 'selectedModuleIds' | 'selectedAddonIds', id: string) => {
    const selected = new Set<string>(saasProposalConfig[field]);
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    if (field === 'selectedModuleIds') {
      patchSaasProposalConfig({ selectedModuleIds: Array.from(selected) });
    } else {
      patchSaasProposalConfig({ selectedAddonIds: Array.from(selected) });
    }
  };

  const savePayload = () => ({
    pricingModule: 'SAAS_SUBSCRIPTION' as const,
    type: 'PRODUCT' as const,
    saasPlanName: data.saasPlanName || 'Plano Professional',
    saasUnitPrice: unitPrice,
    saasQuantity: quantity,
    saasMonthlyDiscount: discount,
    saasSetupFee: setupFee,
    saasContractMonths: contractMonths,
    contractDuration: contractMonths,
    saasNotes: data.saasNotes,
    saasProposalConfig,
    value: metrics.opportunityValue,
    proposalTemplates: currentProposal.proposalTemplates,
    letterheadConfig: currentProposal.letterheadConfig
  });

  const handleSave = async () => {
    setSaveState('saving');
    try {
      await onSaveData(savePayload());
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 2000);
    } catch (error) {
      setSaveState('idle');
      console.error('Erro ao salvar cotacao SaaS', error);
    }
  };

  const openProposalPreview = () => setProposalPreviewOpen(true);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadProposalPdf({ ...currentProposal, ...savePayload() }, proposalTemplate);
    } finally {
      setPdfLoading(false);
    }
  };

  const openEmailModal = () => {
    const primaryContact = contacts.find(contact => contact.email) || contacts[0];
    const proposal = { ...currentProposal, ...savePayload() };
    setEmailProvider(googleConnection?.connected ? 'google' : 'microsoft');
    setEmailTo(primaryContact?.email || '');
    setEmailCc('');
    setEmailSubject(applyProposalTemplateVariables(proposalTemplate.emailSubject, proposal, proposalTemplate));
    setEmailBody(applyProposalTemplateVariables(proposalTemplate.emailBody, proposal, proposalTemplate));
    setEmailError(null);
    setEmailSent(false);
    setEmailOpen(true);
  };

  const sendProposalEmail = async () => {
    const providerConnected = emailProvider === 'google' ? googleConnection?.connected : microsoftConnection?.connected;
    const sender = emailProvider === 'google' ? onSendGoogleEmail : onSendMicrosoftEmail;
    if (!providerConnected || !sender) {
      setEmailError('Conecte Gmail ou Outlook antes de enviar a proposta.');
      return;
    }
    const to = emailTo.split(',').map(item => item.trim()).filter(Boolean);
    const cc = emailCc.split(',').map(item => item.trim()).filter(Boolean);
    if (!to.length) {
      setEmailError('Informe pelo menos um destinatario.');
      return;
    }
    setPdfLoading(true);
    setEmailError(null);
    try {
      const proposal = { ...currentProposal, ...savePayload() };
      const attachment = await generateProposalEmailAttachment(proposal, proposalTemplate);
      const latestThread = getLatestThreadForProvider(emailProvider);
      const draft = {
        tenantId: '',
        clientId: data.clientId,
        proposalId: data.id,
        contactId: contacts.find(contact => to.includes(contact.email))?.id,
        to,
        cc,
        subject: emailSubject,
        bodyText: emailBody,
        attachments: [attachment],
        markProposalSent: true
      };
      if (emailProvider === 'google') {
        const replyHeaders = buildGmailReplyHeaders(latestThread?.lastMessage);
        await onSendGoogleEmail?.({
          ...draft,
          gmailThreadId: latestThread?.lastMessage.gmailThreadId,
          ...replyHeaders
        });
      } else {
        await onSendMicrosoftEmail?.({
          ...draft,
          microsoftConversationId: latestThread?.lastMessage.microsoftConversationId
        });
      }
      setEmailSent(true);
      setEmailOpen(false);
    } catch (error: any) {
      setEmailError(error?.message || 'Erro ao enviar proposta.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[var(--tenant-bg)] p-4 text-[var(--tenant-text)] dark:bg-[var(--tenant-bg-dark)] dark:text-[var(--tenant-text-dark)] sm:p-6 lg:p-8" style={tenantTheme.cssVars}>
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-4 border-b border-[var(--tenant-border)] pb-6 dark:border-[var(--tenant-border-dark)] xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-2.5 py-1 text-xs font-black uppercase text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">
              <CreditCard size={14} style={{ color: brandPrimary }} />
              Assinatura SaaS
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Cotacao de mensalidade</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{data.clientName} - #{data.proposalId}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={openProposalPreview} icon={Eye} variant="secondary" theme={tenantTheme} className="px-4 py-2">
              Visualizar proposta
            </Button>
            <Button type="button" onClick={handleDownloadPdf} icon={Download} variant="secondary" theme={tenantTheme} className="px-4 py-2" disabled={pdfLoading}>
              Baixar PDF
            </Button>
            <Button type="button" onClick={openEmailModal} icon={Mail} variant="secondary" theme={tenantTheme} className="px-4 py-2">
              Enviar proposta
            </Button>
            <Button type="button" onClick={handleSave} icon={saveState === 'saved' ? Check : Save} theme={tenantTheme} className="px-5 py-2.5">
              {saveState === 'saved' ? 'Salvo' : 'Salvar cotacao'}
            </Button>
          </div>

          <div className={`${surfaceClass} min-w-[190px] px-5 py-4 text-left xl:text-right`}>
            <p className="text-xs font-black uppercase text-slate-400">Valor no funil</p>
            <p className="text-2xl font-black" style={{ color: brandPrimary }}>{formatCurrency(metrics.opportunityValue)}</p>
            <p className="inline-flex items-center text-xs text-slate-500 xl:justify-end">
              MRR + implantacao
              <InfoTooltip text="Valor usado no funil: MRR liquido + implantacao, refletindo a primeira receita esperada da oportunidade." width="w-64" />
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'MRR liquido', value: formatCurrency(metrics.netMrr), icon: CreditCard, help: mrrLiquidoHelp },
            { label: 'ARR liquido', value: formatCurrency(metrics.arr), icon: Calculator, help: arrLiquidoHelp },
            { label: 'Implantacao', value: formatCurrency(setupFee), icon: Rocket },
            { label: 'Total do prazo', value: formatCurrency(metrics.contractTotal), icon: FileText }
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`${surfaceClass} p-4`}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="inline-flex items-center text-xs font-black uppercase text-slate-400">
                    {item.label}
                    {item.help && <InfoTooltip text={item.help} width="w-64" />}
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border" style={{ color: brandPrimary, backgroundColor: tenantTheme.primarySoft, borderColor: tenantTheme.primaryBorder }}>
                    <Icon size={16} />
                  </span>
                </div>
                <p className="text-xl font-black">{item.value}</p>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className={surfaceClass}>
              <div className="border-b border-[var(--tenant-border)] p-5 dark:border-[var(--tenant-border-dark)]">
                <h2 className="font-black">Modelo comercial</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Mensalidade, licencas, desconto, implantacao e observacoes.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-6 xl:grid-cols-12">
                <label className="space-y-2 md:col-span-6 xl:col-span-12">
                  <span className="text-xs font-black uppercase text-slate-500">Plano / oferta</span>
                  <input value={data.saasPlanName || ''} onChange={event => patch({ saasPlanName: event.target.value })} placeholder="Ex: Plano Professional" className={`w-full ${inputClass}`} />
                </label>

                <label className="space-y-2 md:col-span-3 xl:col-span-3">
                  <span className="text-xs font-black uppercase text-slate-500">Preco mensal unitario</span>
                  <input type="text" inputMode="decimal" value={focusedMoneyField === 'unitPrice' ? String(unitPrice || '') : formatDecimalBR(unitPrice)} onFocus={() => setFocusedMoneyField('unitPrice')} onBlur={() => setFocusedMoneyField(null)} onChange={event => patch({ saasUnitPrice: parseDecimalBR(event.target.value) })} className={`w-full ${inputClass}`} />
                </label>

                <label className="space-y-2 md:col-span-3 xl:col-span-3">
                  <span className="text-xs font-black uppercase text-slate-500">Licencas</span>
                  <div className="relative">
                    <Users className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input type="number" min="1" value={quantity} onChange={event => patch({ saasQuantity: Math.max(1, toNumber(event.target.value)) })} className={`w-full pl-9 ${inputClass}`} />
                  </div>
                </label>

                <label className="space-y-2 md:col-span-2 xl:col-span-2">
                  <span className="text-xs font-black uppercase text-slate-500">Desconto mensal (%)</span>
                  <div className="relative">
                    <Percent className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input type="number" min="0" max="100" value={Math.round(discount * 10000) / 100} onChange={event => patch({ saasMonthlyDiscount: Math.min(1, Math.max(0, toNumber(event.target.value) / 100)) })} className={`w-full pl-9 ${inputClass}`} />
                  </div>
                </label>

                <label className="space-y-2 md:col-span-2 xl:col-span-2">
                  <span className="text-xs font-black uppercase text-slate-500">Implantacao</span>
                  <input type="text" inputMode="decimal" value={focusedMoneyField === 'setupFee' ? String(setupFee || '') : formatDecimalBR(setupFee)} onFocus={() => setFocusedMoneyField('setupFee')} onBlur={() => setFocusedMoneyField(null)} onChange={event => patch({ saasSetupFee: parseDecimalBR(event.target.value) })} className={`w-full ${inputClass}`} />
                </label>

                <label className="space-y-2 md:col-span-2 xl:col-span-2">
                  <span className="text-xs font-black uppercase text-slate-500">Meses</span>
                  <input type="number" min="1" value={contractMonths} onChange={event => patch({ saasContractMonths: Math.max(1, toNumber(event.target.value)), contractDuration: Math.max(1, toNumber(event.target.value)) })} className={`w-full ${inputClass}`} />
                </label>

                <label className="space-y-2 md:col-span-6 xl:col-span-12">
                  <span className="text-xs font-black uppercase text-slate-500">Observacoes comerciais</span>
                  <textarea value={data.saasNotes || ''} onChange={event => patch({ saasNotes: event.target.value })} rows={3} className={`w-full resize-y ${inputClass}`} placeholder="Condicoes, limites de uso, escopo da implantacao..." />
                </label>
              </div>
            </div>

            <div className={surfaceClass}>
              <div className="flex flex-col gap-3 border-b border-[var(--tenant-border)] p-5 dark:border-[var(--tenant-border-dark)] lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-2.5 py-1 text-xs font-black uppercase text-[var(--tenant-primary)]">
                    <Settings2 size={14} />
                    Configuracao da proposta
                  </div>
                  <h2 className="font-black">Template LubCore SaaS</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">SLA, modulos e opcionais que entram na proposta tecnico-comercial.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-xs font-black uppercase text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                  <Headphones size={14} style={{ color: brandPrimary }} />
                  {LUBIT_SLA_PLANS[saasProposalConfig.slaPlan].title} - {LUBIT_SLA_PLANS[saasProposalConfig.slaPlan].badge}
                </div>
              </div>

              <div className="space-y-6 p-5">
                <div>
                  <p className="mb-3 text-xs font-black uppercase text-slate-500">Modelo de SLA</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {Object.values(LUBIT_SLA_PLANS).map(plan => {
                      const active = saasProposalConfig.slaPlan === plan.id;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => patchSaasProposalConfig({ slaPlan: plan.id })}
                          className={`rounded-lg border p-4 text-left transition hover:brightness-95 ${active ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)]' : 'border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300'}`}
                        >
                          <span className="text-[10px] font-black uppercase">{plan.badge}</span>
                          <strong className="mt-1 block text-sm">{plan.title}</strong>
                          <span className="mt-2 block text-xs font-semibold opacity-80">{plan.coverage}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Boxes size={15} style={{ color: brandPrimary }} />
                    <p className="text-xs font-black uppercase text-slate-500">Escopo funcional</p>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {LUBIT_MODULE_CATALOG.map(item => {
                      const checked = saasProposalConfig.selectedModuleIds.includes(item.id);
                      return (
                        <label key={item.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition hover:brightness-95 ${checked ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)]' : 'border-[var(--tenant-border)] bg-[var(--tenant-control)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]'}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleSaasConfigId('selectedModuleIds', item.id)} className="mt-1 h-4 w-4 accent-[var(--tenant-primary)]" />
                          <span>
                            <strong className="block text-xs text-[var(--tenant-text)] dark:text-[var(--tenant-text-dark)]">{item.title}</strong>
                            <small className="mt-1 block text-[11px] font-semibold leading-snug text-slate-500 dark:text-slate-400">{item.description}</small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Rocket size={15} style={{ color: brandPrimary }} />
                    <p className="text-xs font-black uppercase text-slate-500">Opcionais comerciais</p>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {LUBIT_ADDON_CATALOG.map(item => {
                      const checked = saasProposalConfig.selectedAddonIds.includes(item.id);
                      return (
                        <label key={item.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition hover:brightness-95 ${checked ? 'border-[var(--tenant-secondary-border)] bg-[var(--tenant-secondary-soft)]' : 'border-[var(--tenant-border)] bg-[var(--tenant-control)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]'}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleSaasConfigId('selectedAddonIds', item.id)} className="mt-1 h-4 w-4 accent-[var(--tenant-secondary)]" />
                          <span>
                            <strong className="block text-xs text-[var(--tenant-text)] dark:text-[var(--tenant-text-dark)]">{item.title}</strong>
                            <small className="mt-1 block text-[11px] font-semibold leading-snug text-slate-500 dark:text-slate-400">{item.description}</small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className={`${surfaceClass} p-5`}>
              <h3 className="font-black">Resumo financeiro</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="inline-flex items-center text-slate-500">MRR bruto<InfoTooltip text="MRR bruto e a receita recorrente mensal antes do desconto comercial." width="w-64" /></span><strong>{formatCurrency(metrics.grossMrr)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Desconto</span><strong>-{formatCurrency(metrics.discountAmount)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Impostos mensais</span><strong>-{formatCurrency(metrics.monthlyTaxes)}</strong></div>
                <div className="flex justify-between"><span className="inline-flex items-center text-slate-500">MRR apos impostos<InfoTooltip text="MRR apos impostos e a receita recorrente mensal depois do desconto comercial e dos impostos mensais configurados." width="w-64" /></span><strong>{formatCurrency(metrics.netAfterTaxes)}</strong></div>
                <div className="flex justify-between border-t border-[var(--tenant-border)] pt-3 dark:border-[var(--tenant-border-dark)]"><span className="font-bold">Total do contrato</span><strong>{formatCurrency(metrics.contractTotal)}</strong></div>
              </div>
            </div>
            <div className={`${surfaceClass} p-5`}>
              <p className="text-xs font-black uppercase text-slate-400">Template ativo</p>
              <p className="mt-2 text-sm font-bold">{proposalTemplate.name}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">A proposta usa marca, cores, papel timbrado e textos configurados no tenant ativo.</p>
            </div>
          </aside>
        </section>
      </div>

      {proposalPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] p-4 sm:p-6">
          <div className="w-full max-w-6xl">
            <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-3 shadow-xl dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Previa da proposta</p>
                <h3 className="font-black text-[var(--tenant-text)] dark:text-[var(--tenant-text-dark)]">LubCore SaaS - {data.clientName}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" theme={tenantTheme} icon={Download} onClick={handleDownloadPdf} disabled={pdfLoading}>
                  Baixar PDF
                </Button>
                <Button type="button" variant="neutral" theme={tenantTheme} icon={X} onClick={() => setProposalPreviewOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
            <LubitSaasProposal proposal={{ ...currentProposal, ...savePayload() }} template={proposalTemplate} branding={tenantBranding} />
          </div>
        </div>
      )}

      {emailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] p-4">
          <div className="w-full max-w-2xl rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-2xl dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
            <div className="flex items-start justify-between border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-5 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]">
              <div>
                <h3 className="text-lg font-black">Enviar proposta</h3>
                <p className="text-sm text-slate-500">O PDF sera gerado e anexado ao e-mail.</p>
              </div>
              <button type="button" onClick={() => setEmailOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)]"><X size={18} /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setEmailProvider('google')} className={`rounded-md border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${emailProvider === 'google' ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-control-active)] text-[var(--tenant-primary)] dark:bg-[var(--tenant-control-active-dark)]' : 'border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-500 hover:border-[var(--tenant-primary-border)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]'}`} disabled={!googleConnection?.connected}>Gmail</button>
                <button type="button" onClick={() => setEmailProvider('microsoft')} className={`rounded-md border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${emailProvider === 'microsoft' ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-control-active)] text-[var(--tenant-primary)] dark:bg-[var(--tenant-control-active-dark)]' : 'border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-500 hover:border-[var(--tenant-primary-border)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]'}`} disabled={!microsoftConnection?.connected}>Outlook</button>
              </div>
              <label className="block space-y-2"><span className="text-xs font-black uppercase text-slate-500">Para</span><input value={emailTo} onChange={event => setEmailTo(event.target.value)} className={`w-full ${inputClass}`} placeholder="email@cliente.com.br" /></label>
              <label className="block space-y-2"><span className="text-xs font-black uppercase text-slate-500">Cc</span><input value={emailCc} onChange={event => setEmailCc(event.target.value)} className={`w-full ${inputClass}`} placeholder="emails separados por virgula" /></label>
              <label className="block space-y-2"><span className="text-xs font-black uppercase text-slate-500">Assunto</span><input value={emailSubject} onChange={event => setEmailSubject(event.target.value)} className={`w-full ${inputClass}`} /></label>
              <label className="block space-y-2"><span className="text-xs font-black uppercase text-slate-500">Mensagem</span><textarea rows={7} value={emailBody} onChange={event => setEmailBody(event.target.value)} className={`w-full resize-y ${inputClass}`} /></label>
              {emailError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">{emailError}</p>}
              {emailSent && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">Proposta enviada.</p>}
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-5 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]">
              <Button type="button" variant="secondary" theme={tenantTheme} onClick={() => setEmailOpen(false)}>Cancelar</Button>
              <Button type="button" theme={tenantTheme} icon={pdfLoading || workspaceLoading ? Loader2 : Send} onClick={sendProposalEmail} disabled={pdfLoading || workspaceLoading || emailSent}>
                {emailSent ? 'Proposta enviada' : 'Enviar com PDF'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaasSubscriptionEditor;
