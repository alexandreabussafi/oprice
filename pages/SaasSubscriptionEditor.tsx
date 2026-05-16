import React, { useMemo, useState } from 'react';
import { Calculator, Check, CreditCard, Download, Eye, FileText, Loader2, Mail, Percent, Rocket, Save, Send, Users, X } from 'lucide-react';
import { Contact, GoogleConnectionStatus, GoogleEmailDraft, MicrosoftConnectionStatus, MicrosoftEmailDraft, ProposalData } from '../types';
import { formatCurrency } from '../utils/pricingEngine';
import { Button, inputClass, surfaceClass } from '../components/ui';
import { createTenantTheme } from '../utils/theme';
import InfoTooltip from '../components/InfoTooltip';
import { applyProposalTemplateVariables, getProposalTemplateKind, mergeProposalTemplates } from '../utils/proposalTemplates';
import { blobToBase64, downloadProposalPdf, generateProposalPdfBlob, getProposalPdfFileName } from '../services/proposalPdf';

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
  globalConfig?: ProposalData;
  contacts?: Contact[];
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
  brandColor = '#0f172a',
  brandSecondaryColor = '#2563eb',
  globalConfig,
  contacts = [],
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
  const tenantTheme = createTenantTheme({ primaryColor: brandColor, secondaryColor: brandSecondaryColor });
  const unitPrice = data.saasUnitPrice ?? 0;
  const quantity = data.saasQuantity ?? 1;
  const discount = data.saasMonthlyDiscount ?? 0;
  const setupFee = data.saasSetupFee ?? 0;
  const contractMonths = data.saasContractMonths ?? data.contractDuration ?? 12;

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
    contractDuration: contractMonths,
    letterheadConfig: globalConfig?.letterheadConfig || data.letterheadConfig,
    proposalTemplates: globalConfig?.proposalTemplates || data.proposalTemplates
  }), [contractMonths, data, discount, globalConfig?.letterheadConfig, globalConfig?.proposalTemplates, quantity, setupFee, unitPrice]);

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

  const openPdfPreview = async () => {
    setPdfLoading(true);
    try {
      const blob = await generateProposalPdfBlob({ ...currentProposal, ...savePayload() }, proposalTemplate);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } finally {
      setPdfLoading(false);
    }
  };

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
      const blob = await generateProposalPdfBlob(proposal, proposalTemplate);
      const base64Content = await blobToBase64(blob);
      const attachment = {
        fileName: getProposalPdfFileName(proposal, proposalTemplate),
        contentType: 'application/pdf',
        base64Content
      };
      const draft = {
        tenantId: '',
        clientId: data.clientId,
        proposalId: data.id,
        contactId: contacts.find(contact => to.includes(contact.email))?.id,
        to,
        cc,
        subject: emailSubject,
        bodyText: emailBody,
        attachments: [attachment]
      };
      if (emailProvider === 'google') {
        await onSendGoogleEmail?.(draft);
      } else {
        await onSendMicrosoftEmail?.(draft);
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
    <div className="min-h-full bg-slate-50 p-4 text-slate-900 dark:bg-[#101621] dark:text-slate-100 sm:p-6 lg:p-8" style={tenantTheme.cssVars}>
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-black uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <CreditCard size={14} style={{ color: brandColor }} />
              Assinatura SaaS
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Cotacao de mensalidade</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{data.clientName} - #{data.proposalId}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={openPdfPreview} icon={pdfLoading ? Loader2 : Eye} variant="secondary" theme={tenantTheme} className="px-4 py-2" disabled={pdfLoading}>
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
            <p className="text-2xl font-black" style={{ color: brandColor }}>{formatCurrency(metrics.opportunityValue)}</p>
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
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border" style={{ color: brandColor, backgroundColor: tenantTheme.primarySoft, borderColor: tenantTheme.primaryBorder }}>
                    <Icon size={16} />
                  </span>
                </div>
                <p className="text-xl font-black">{item.value}</p>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className={surfaceClass}>
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
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

          <aside className="space-y-4">
            <div className={`${surfaceClass} p-5`}>
              <h3 className="font-black">Resumo financeiro</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="inline-flex items-center text-slate-500">MRR bruto<InfoTooltip text="MRR bruto e a receita recorrente mensal antes do desconto comercial." width="w-64" /></span><strong>{formatCurrency(metrics.grossMrr)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Desconto</span><strong>-{formatCurrency(metrics.discountAmount)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Impostos mensais</span><strong>-{formatCurrency(metrics.monthlyTaxes)}</strong></div>
                <div className="flex justify-between"><span className="inline-flex items-center text-slate-500">MRR apos impostos<InfoTooltip text="MRR apos impostos e a receita recorrente mensal depois do desconto comercial e dos impostos mensais configurados." width="w-64" /></span><strong>{formatCurrency(metrics.netAfterTaxes)}</strong></div>
                <div className="flex justify-between border-t border-slate-200 pt-3 dark:border-slate-800"><span className="font-bold">Total do contrato</span><strong>{formatCurrency(metrics.contractTotal)}</strong></div>
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

      {emailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black">Enviar proposta</h3>
                <p className="text-sm text-slate-500">O PDF sera gerado e anexado ao e-mail.</p>
              </div>
              <button type="button" onClick={() => setEmailOpen(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setEmailProvider('google')} className={`rounded-md border px-3 py-2 text-sm font-bold ${emailProvider === 'google' ? 'border-[var(--tenant-primary)] text-[var(--tenant-primary)]' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`} disabled={!googleConnection?.connected}>Gmail</button>
                <button type="button" onClick={() => setEmailProvider('microsoft')} className={`rounded-md border px-3 py-2 text-sm font-bold ${emailProvider === 'microsoft' ? 'border-[var(--tenant-primary)] text-[var(--tenant-primary)]' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`} disabled={!microsoftConnection?.connected}>Outlook</button>
              </div>
              <label className="block space-y-2"><span className="text-xs font-black uppercase text-slate-500">Para</span><input value={emailTo} onChange={event => setEmailTo(event.target.value)} className={`w-full ${inputClass}`} placeholder="email@cliente.com.br" /></label>
              <label className="block space-y-2"><span className="text-xs font-black uppercase text-slate-500">Cc</span><input value={emailCc} onChange={event => setEmailCc(event.target.value)} className={`w-full ${inputClass}`} placeholder="emails separados por virgula" /></label>
              <label className="block space-y-2"><span className="text-xs font-black uppercase text-slate-500">Assunto</span><input value={emailSubject} onChange={event => setEmailSubject(event.target.value)} className={`w-full ${inputClass}`} /></label>
              <label className="block space-y-2"><span className="text-xs font-black uppercase text-slate-500">Mensagem</span><textarea rows={7} value={emailBody} onChange={event => setEmailBody(event.target.value)} className={`w-full resize-y ${inputClass}`} /></label>
              {emailError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">{emailError}</p>}
              {emailSent && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">Proposta enviada.</p>}
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 p-5 dark:border-slate-800">
              <Button type="button" variant="secondary" theme={tenantTheme} onClick={() => setEmailOpen(false)}>Cancelar</Button>
              <Button type="button" theme={tenantTheme} icon={pdfLoading || workspaceLoading ? Loader2 : Send} onClick={sendProposalEmail} disabled={pdfLoading || workspaceLoading}>
                Enviar com PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaasSubscriptionEditor;
