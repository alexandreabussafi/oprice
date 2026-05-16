import { ProposalData, ProposalTemplateConfig, ProposalTemplateKind, ProposalTemplatesConfig } from '../types';
import { calculateFinancials, formatCurrency } from './pricingEngine';

export const PROPOSAL_TEMPLATE_KINDS: ProposalTemplateKind[] = [
  'PRODUCT_SALES',
  'SERVICES_CONTINUOUS',
  'SERVICES_SPOT',
  'SAAS_SUBSCRIPTION',
  'IOT_SUBSCRIPTION'
];

export const PROPOSAL_TEMPLATE_LABELS: Record<ProposalTemplateKind, string> = {
  PRODUCT_SALES: 'Produto',
  SERVICES_CONTINUOUS: 'Servico continuado',
  SERVICES_SPOT: 'Servico spot',
  SAAS_SUBSCRIPTION: 'Assinatura SaaS',
  IOT_SUBSCRIPTION: 'Assinatura IoT'
};

const defaultScope: Record<ProposalTemplateKind, string> = {
  PRODUCT_SALES: 'Fornecimento dos itens descritos na proposta comercial, conforme quantidades, prazos e condicoes acordadas.',
  SERVICES_CONTINUOUS: 'Prestacao continuada dos servicos descritos, com equipe, recursos, governanca e indicadores definidos para o contrato.',
  SERVICES_SPOT: 'Execucao pontual do servico solicitado, com entregaveis, prazos e premissas comerciais apresentados nesta proposta.',
  SAAS_SUBSCRIPTION: 'Disponibilizacao da assinatura de software, incluindo licencas, configuracao inicial e suporte conforme o plano contratado.',
  IOT_SUBSCRIPTION: 'Fornecimento da solucao de monitoramento IoT, incluindo equipamentos, instalacao e servico recorrente de acompanhamento.'
};

export const createDefaultProposalTemplates = (companyName = 'sua empresa'): ProposalTemplatesConfig => (
  PROPOSAL_TEMPLATE_KINDS.reduce((acc, kind) => {
    const label = PROPOSAL_TEMPLATE_LABELS[kind];
    acc[kind] = {
      kind,
      name: `Template ${label}`,
      emailSubject: `Proposta tecnico-comercial {{proposta}} - {{cliente}}`,
      emailBody: [
        'Ola,',
        '',
        'Segue em anexo a proposta tecnico-comercial {{proposta}} para avaliacao.',
        '',
        'Fico a disposicao para ajustes e proximos passos.',
        '',
        `Atenciosamente,`,
        companyName
      ].join('\n'),
      introduction: `Apresentamos a proposta tecnico-comercial da ${companyName}, elaborada com base nas informacoes comerciais e tecnicas levantadas para {{cliente}}.`,
      scope: defaultScope[kind],
      commercialConditions: 'Os valores, prazos e condicoes comerciais estao descritos nesta proposta e sao validos conforme o prazo informado.',
      terms: 'A execucao, faturamento e entrega seguem as condicoes comerciais aprovadas entre as partes e a legislacao aplicavel.',
      closingNotes: 'Esta proposta pode ser ajustada conforme evolucao do escopo, premissas tecnicas ou negociacao comercial.'
    };
    return acc;
  }, {} as ProposalTemplatesConfig)
);

export const mergeProposalTemplates = (
  templates?: Partial<ProposalTemplatesConfig>,
  companyName?: string
): ProposalTemplatesConfig => {
  const defaults = createDefaultProposalTemplates(companyName);
  return PROPOSAL_TEMPLATE_KINDS.reduce((acc, kind) => {
    acc[kind] = {
      ...defaults[kind],
      ...(templates?.[kind] || {}),
      kind
    };
    return acc;
  }, {} as ProposalTemplatesConfig);
};

export const getProposalTemplateKind = (proposal: ProposalData): ProposalTemplateKind => {
  if (proposal.pricingModule === 'SAAS_SUBSCRIPTION') return 'SAAS_SUBSCRIPTION';
  if (proposal.pricingModule === 'IOT_SUBSCRIPTION') return 'IOT_SUBSCRIPTION';
  if (proposal.type === 'PRODUCT') return 'PRODUCT_SALES';
  if (proposal.type === 'SPOT') return 'SERVICES_SPOT';
  return 'SERVICES_CONTINUOUS';
};

export const getProposalDisplayValue = (proposal: ProposalData) => {
  if (proposal.pricingModule === 'SAAS_SUBSCRIPTION') {
    const unitPrice = proposal.saasUnitPrice || 0;
    const quantity = proposal.saasQuantity || 1;
    const discount = proposal.saasMonthlyDiscount || 0;
    const setup = proposal.saasSetupFee || 0;
    return Math.max(0, unitPrice * quantity * (1 - discount)) + setup;
  }
  if (proposal.type === 'PRODUCT') {
    return (proposal.productLines || []).reduce((sum, item) => sum + (item.total || 0), 0) || proposal.value || 0;
  }
  try {
    return calculateFinancials(proposal).grossRevenue || proposal.value || 0;
  } catch (_) {
    return proposal.value || 0;
  }
};

export const applyProposalTemplateVariables = (
  value: string,
  proposal: ProposalData,
  template: ProposalTemplateConfig
) => {
  const replacements: Record<string, string> = {
    cliente: proposal.clientName || 'Cliente',
    proposta: proposal.proposalId || '',
    modalidade: PROPOSAL_TEMPLATE_LABELS[template.kind],
    empresa: proposal.letterheadConfig?.companyName || '',
    valor: formatCurrency(getProposalDisplayValue(proposal)),
    validade: proposal.expirationDate ? new Date(proposal.expirationDate).toLocaleDateString('pt-BR') : ''
  };

  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => replacements[key] ?? '');
};
