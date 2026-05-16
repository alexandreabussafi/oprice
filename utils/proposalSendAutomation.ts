import { ProposalData, ProposalSendAutomationConfig, ProposalSendAutomationTemplate } from '../types';

export type ProposalSendTemplateVariables = {
  cliente: string;
  proposta: string;
  assunto: string;
  destinatarios: string;
  responsavel: string;
  data_envio: string;
};

export const DEFAULT_PROPOSAL_SEND_FOLLOW_UP_TEMPLATE: ProposalSendAutomationTemplate = {
  id: 'default-proposal-follow-up',
  name: 'Follow-up padrao de proposta',
  delayDays: 2,
  titleTemplate: 'Follow-up da proposta #{{proposta}}',
  descriptionTemplate: [
    'Cliente: {{cliente}}',
    'Proposta: #{{proposta}}',
    'E-mail enviado para: {{destinatarios}}',
    'Assunto: {{assunto}}',
    '',
    'Verificar retorno do cliente e registrar a proxima acao comercial.'
  ].join('\n'),
  syncMicrosoftTodo: false
};

export const createDefaultProposalSendAutomationConfig = (): ProposalSendAutomationConfig => ({
  enabled: true,
  defaultTemplateId: DEFAULT_PROPOSAL_SEND_FOLLOW_UP_TEMPLATE.id,
  templates: [{ ...DEFAULT_PROPOSAL_SEND_FOLLOW_UP_TEMPLATE }]
});

const clampDelayDays = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_PROPOSAL_SEND_FOLLOW_UP_TEMPLATE.delayDays;
  return Math.max(0, Math.min(365, Math.round(parsed)));
};

export const normalizeProposalSendAutomation = (
  config?: Partial<ProposalSendAutomationConfig> | null
): ProposalSendAutomationConfig => {
  const fallback = createDefaultProposalSendAutomationConfig();
  const templates = Array.isArray(config?.templates) && config.templates.length > 0
    ? config.templates.map((template, index) => ({
      ...DEFAULT_PROPOSAL_SEND_FOLLOW_UP_TEMPLATE,
      ...template,
      id: template.id || `proposal-follow-up-${index + 1}`,
      name: template.name?.trim() || `Follow-up ${index + 1}`,
      delayDays: clampDelayDays(template.delayDays),
      titleTemplate: template.titleTemplate?.trim() || DEFAULT_PROPOSAL_SEND_FOLLOW_UP_TEMPLATE.titleTemplate,
      descriptionTemplate: template.descriptionTemplate?.trim() || DEFAULT_PROPOSAL_SEND_FOLLOW_UP_TEMPLATE.descriptionTemplate,
      syncMicrosoftTodo: Boolean(template.syncMicrosoftTodo)
    }))
    : fallback.templates;

  const defaultTemplateId = templates.some(template => template.id === config?.defaultTemplateId)
    ? config?.defaultTemplateId
    : templates[0]?.id || fallback.defaultTemplateId;

  return {
    enabled: config?.enabled !== false,
    defaultTemplateId,
    templates
  };
};

export const getDefaultProposalSendAutomationTemplate = (
  config?: Partial<ProposalSendAutomationConfig> | null
) => {
  const normalized = normalizeProposalSendAutomation(config);
  return normalized.templates.find(template => template.id === normalized.defaultTemplateId) || normalized.templates[0];
};

export const renderProposalSendTemplate = (
  template: string,
  variables: ProposalSendTemplateVariables
) => Object.entries(variables).reduce(
  (result, [key, value]) => result.replaceAll(`{{${key}}}`, value || ''),
  template
);

export const buildProposalSendTemplateVariables = (input: {
  proposal: ProposalData;
  subject: string;
  to: string[];
  cc?: string[];
  responsible?: string;
  sentAt?: Date;
}): ProposalSendTemplateVariables => {
  const sentAt = input.sentAt || new Date();
  const recipients = [...input.to, ...(input.cc || [])].filter(Boolean);

  return {
    cliente: input.proposal.clientName || 'Cliente',
    proposta: input.proposal.proposalId || input.proposal.id,
    assunto: input.subject || '(sem assunto)',
    destinatarios: recipients.join(', '),
    responsavel: input.responsible || input.proposal.responsible || input.proposal.salesperson || 'Equipe comercial',
    data_envio: sentAt.toLocaleDateString('pt-BR')
  };
};

export const addDaysDateInput = (days: number, from = new Date()) => {
  const date = new Date(from);
  date.setDate(date.getDate() + clampDelayDays(days));
  return date.toISOString().split('T')[0];
};
