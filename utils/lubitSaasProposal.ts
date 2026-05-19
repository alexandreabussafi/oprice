import { ProposalData, ProposalTemplateConfig, SaasProposalConfig, SaasSlaPlanId, TenantBranding } from '../types';
import { formatCurrency } from './pricingEngine';

export interface LubitProposalCatalogItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface LubitSlaRow {
  severity: string;
  response: string;
  description: string;
  tone: 'critical' | 'high' | 'medium' | 'low';
}

export interface LubitSlaPlan {
  id: SaasSlaPlanId;
  title: string;
  badge: string;
  coverage: string;
  channel: string;
  summary: string;
  rows: LubitSlaRow[];
}

export interface LubitSaasProposalViewData {
  proposal: ProposalData;
  template: ProposalTemplateConfig;
  config: Required<SaasProposalConfig>;
  title: string;
  executiveSummary: string;
  clientName: string;
  proposalNumber: string;
  version: number;
  validUntil: string;
  owner: string;
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  planName: string;
  licenses: number;
  monthlyValue: number;
  setupValue: number;
  contractMonths: number;
  contractTotal: number;
  arrValue: number;
  formattedMonthly: string;
  formattedSetup: string;
  formattedContractTotal: string;
  formattedArr: string;
  modules: LubitProposalCatalogItem[];
  addons: LubitProposalCatalogItem[];
  futureAddons: LubitProposalCatalogItem[];
  slaPlan: LubitSlaPlan;
  scopeItems: string[];
  commercialTerms: string[];
  closingNotes: string;
}

export const LUBIT_MODULE_CATALOG: LubitProposalCatalogItem[] = [
  { id: 'assets', icon: 'Boxes', title: 'Ativos e hierarquia', description: 'Cadastro de equipamentos, areas, criticidade e historico operacional.' },
  { id: 'plans', icon: 'Route', title: 'Planos de lubrificacao', description: 'Rotas, frequencias, pontos de lubrificacao e responsaveis por execucao.' },
  { id: 'routines', icon: 'ListChecks', title: 'Ordens e rotinas', description: 'Execucao de atividades preventivas, corretivas e recorrentes.' },
  { id: 'evidence', icon: 'Image', title: 'Evidencias digitais', description: 'Fotos, anexos, apontamentos, trilha de auditoria e aceite operacional.' },
  { id: 'dashboards', icon: 'BarChart3', title: 'Dashboards gerenciais', description: 'Indicadores de aderencia, atrasos, execucao, backlog e visao por unidade.' },
  { id: 'alerts', icon: 'Bell', title: 'Alertas e priorizacao', description: 'Sinalizacao de vencimentos, desvios, pendencias e criticidade.' },
  { id: 'inventory', icon: 'Package', title: 'Materiais e inventario', description: 'Controle de lubrificantes, consumo, itens minimos e reposicao quando contratado.' },
  { id: 'permissions', icon: 'ShieldCheck', title: 'Perfis e permissoes', description: 'Controle de acesso por papel, unidade, operacao e responsabilidade.' },
];

export const LUBIT_ADDON_CATALOG: LubitProposalCatalogItem[] = [
  { id: 'glpi', icon: 'MessagesSquare', title: 'GLPI / ITSM', description: 'Integracao ou referencia para chamados, SLA, categorias e escalonamento.' },
  { id: 'integrations', icon: 'PlugZap', title: 'Integracoes API', description: 'Conexoes com ERP, BI, identidade, portais ou sistemas industriais.' },
  { id: 'bi', icon: 'BarChart3', title: 'BI executivo', description: 'Camada analitica adicional, paineis customizados e indicadores avancados.' },
  { id: 'onsiteTraining', icon: 'Presentation', title: 'Treinamento presencial', description: 'Capacitacao em campo, multiplicadores e acompanhamento assistido.' },
  { id: 'migration', icon: 'ArrowLeftRight', title: 'Migracao assistida', description: 'Tratamento, carga e conferencia de dados alem dos templates padrao.' },
  { id: 'premiumSupport', icon: 'Headphones', title: 'Suporte premium', description: 'Canal prioritario, operacao critica e rituais de acompanhamento.' },
  { id: 'sso', icon: 'LockKeyhole', title: 'SSO / Seguranca', description: 'Autenticacao corporativa, politicas de acesso e requisitos especificos.' },
  { id: 'customWorkflows', icon: 'Workflow', title: 'Fluxos customizados', description: 'Automacao, regras especificas, aprovacoes e jornadas sob medida.' },
];

export const LUBIT_SLA_PLANS: Record<SaasSlaPlanId, LubitSlaPlan> = {
  essential: {
    id: 'essential',
    title: 'Essencial',
    badge: '5x9',
    coverage: 'Segunda a sexta, 08:00-17:00',
    channel: 'Portal de chamados ou e-mail de suporte',
    summary: 'Modelo indicado para operacao padrao, com triagem em horario comercial.',
    rows: [
      { severity: 'Critico', response: 'Ate 4 horas uteis', description: 'Indisponibilidade de producao com impacto operacional relevante.', tone: 'critical' },
      { severity: 'Alto', response: 'Ate 1 dia util', description: 'Degradacao relevante ou erro recorrente sem parada total.', tone: 'high' },
      { severity: 'Medio', response: 'Ate 2 dias uteis', description: 'Duvida funcional, ajuste de configuracao ou falha com alternativa.', tone: 'medium' },
      { severity: 'Baixo', response: 'Ate 3 dias uteis', description: 'Solicitacao consultiva, melhoria ou item sem impacto imediato.', tone: 'low' },
    ],
  },
  professional: {
    id: 'professional',
    title: 'Profissional',
    badge: '5x12',
    coverage: 'Segunda a sexta, 07:00-19:00',
    channel: 'Chamado, e-mail e triagem prioritaria quando aplicavel',
    summary: 'Modelo recomendado para operacao industrial com necessidade de resposta mais rapida.',
    rows: [
      { severity: 'Critico', response: 'Ate 2 horas uteis', description: 'Indisponibilidade geral da plataforma em producao ou bloqueio severo da operacao principal.', tone: 'critical' },
      { severity: 'Alto', response: 'Ate 6 horas uteis', description: 'Degradacao relevante, erro recorrente ou impacto operacional sem parada total.', tone: 'high' },
      { severity: 'Medio', response: 'Ate 1 dia util', description: 'Duvidas funcionais, ajuste de configuracao ou falha com alternativa operacional disponivel.', tone: 'medium' },
      { severity: 'Baixo', response: 'Ate 2 dias uteis', description: 'Solicitacoes consultivas, melhorias, duvidas gerais ou itens sem impacto operacional imediato.', tone: 'low' },
    ],
  },
  enterprise: {
    id: 'enterprise',
    title: 'Enterprise',
    badge: '7x24 critico',
    coverage: '7x24 para incidentes criticos de producao; demais chamados em horario acordado',
    channel: 'Chamado, e-mail e canal critico definido no contrato',
    summary: 'Modelo para operacoes com alta dependencia do SaaS e necessidade de cobertura critica continua.',
    rows: [
      { severity: 'Critico', response: 'Ate 1 hora', description: 'Indisponibilidade de producao ou bloqueio critico da operacao principal.', tone: 'critical' },
      { severity: 'Alto', response: 'Ate 4 horas', description: 'Degradacao severa com impacto operacional relevante, sem indisponibilidade total.', tone: 'high' },
      { severity: 'Medio', response: 'Ate 1 dia util', description: 'Falha funcional, configuracao ou duvida com contorno operacional disponivel.', tone: 'medium' },
      { severity: 'Baixo', response: 'Ate 2 dias uteis', description: 'Solicitacao consultiva, melhoria ou item de baixo impacto.', tone: 'low' },
    ],
  },
};

export const DEFAULT_LUBIT_SAAS_PROPOSAL_CONFIG: Required<SaasProposalConfig> = {
  profile: 'SaaS industrial / CMMS',
  slaPlan: 'professional',
  selectedModuleIds: ['assets', 'plans', 'routines', 'evidence', 'dashboards', 'alerts'],
  selectedAddonIds: ['glpi', 'integrations', 'premiumSupport'],
  includedItems: [
    'Acesso ao ambiente SaaS Lubit/Core conforme parametros contratados.',
    'Configuracao inicial de unidade, usuarios, perfis e cadastros combinados.',
    'Suporte remoto e atualizacao da plataforma durante a vigencia da assinatura.',
    'Relatorios e evidencias operacionais para acompanhamento gerencial.',
  ],
  excludedItems: [
    'Desenvolvimentos customizados, integracoes especiais e automacoes sob medida.',
    'Saneamento completo de base historica, servicos presenciais e deslocamentos.',
    'Licencas de terceiros, infraestrutura do cliente, conectividade e dispositivos.',
    'Operacao de chamados fora do plano de SLA contratado.',
  ],
  technicalAnnexes: [
    'Arquitetura macro SaaS, ambientes, acessos e premissas de seguranca.',
    'Integracoes opcionais com GLPI/ITSM, ERP, BI ou identidade corporativa.',
    'Modelo de dados minimo para ativos, planos, rotinas, evidencias e usuarios.',
    'Responsabilidades de implantacao, homologacao, go-live e operacao assistida.',
  ],
  providerResponsibilities: [
    'Manter a plataforma SaaS disponivel conforme as condicoes contratadas.',
    'Prestar suporte tecnico nos canais e horarios definidos na proposta.',
    'Tratar incidentes conforme severidade, prioridade e informacoes recebidas do cliente.',
    'Comunicar manutencoes programadas quando houver impacto esperado ao uso.',
  ],
  clientResponsibilities: [
    'Disponibilizar dados, responsaveis e criterios necessarios para implantacao e validacao.',
    'Indicar usuarios-chave para homologacao, operacao assistida e abertura de chamados.',
    'Manter cadastros, permissoes e dados operacionais sob sua responsabilidade atualizados.',
    'Registrar chamados com evidencias, impacto e passos para reproducao quando aplicavel.',
  ],
  implementationTime: 'Ate 30 dias apos kick-off e recebimento das informacoes do cliente',
  adjustment: 'Reajuste anual pelo IPCA ou indice acordado em contrato',
};

const validIds = (ids: string[] | undefined, catalog: LubitProposalCatalogItem[], fallback: string[]) => {
  if (!Array.isArray(ids)) return fallback;
  const allowed = new Set(catalog.map(item => item.id));
  return ids.filter(id => allowed.has(id));
};

export const normalizeSaasProposalConfig = (config?: SaasProposalConfig): Required<SaasProposalConfig> => {
  const merged = { ...DEFAULT_LUBIT_SAAS_PROPOSAL_CONFIG, ...(config || {}) };
  return {
    ...merged,
    slaPlan: LUBIT_SLA_PLANS[merged.slaPlan] ? merged.slaPlan : DEFAULT_LUBIT_SAAS_PROPOSAL_CONFIG.slaPlan,
    selectedModuleIds: validIds(merged.selectedModuleIds, LUBIT_MODULE_CATALOG, DEFAULT_LUBIT_SAAS_PROPOSAL_CONFIG.selectedModuleIds),
    selectedAddonIds: validIds(merged.selectedAddonIds, LUBIT_ADDON_CATALOG, DEFAULT_LUBIT_SAAS_PROPOSAL_CONFIG.selectedAddonIds),
    includedItems: Array.isArray(merged.includedItems) ? merged.includedItems : DEFAULT_LUBIT_SAAS_PROPOSAL_CONFIG.includedItems,
    excludedItems: Array.isArray(merged.excludedItems) ? merged.excludedItems : DEFAULT_LUBIT_SAAS_PROPOSAL_CONFIG.excludedItems,
    technicalAnnexes: Array.isArray(merged.technicalAnnexes) ? merged.technicalAnnexes : DEFAULT_LUBIT_SAAS_PROPOSAL_CONFIG.technicalAnnexes,
    providerResponsibilities: Array.isArray(merged.providerResponsibilities) ? merged.providerResponsibilities : DEFAULT_LUBIT_SAAS_PROPOSAL_CONFIG.providerResponsibilities,
    clientResponsibilities: Array.isArray(merged.clientResponsibilities) ? merged.clientResponsibilities : DEFAULT_LUBIT_SAAS_PROPOSAL_CONFIG.clientResponsibilities,
  };
};

const pickCatalogItems = (catalog: LubitProposalCatalogItem[], ids: string[]) => {
  const selected = new Set(ids);
  return catalog.filter(item => selected.has(item.id));
};

const splitTemplateLines = (value: string, fallback: string[]) => {
  const lines = String(value || '')
    .split(/\n+/)
    .map(line => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
  return lines.length ? lines : fallback;
};

const formatDateBR = (value?: string) => {
  if (!value) return 'A definir';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'A definir';
  return date.toLocaleDateString('pt-BR');
};

const applyProposalVariables = (value: string, proposal: ProposalData, companyName: string, amount: string) => {
  const replacements: Record<string, string> = {
    cliente: proposal.clientName || 'Cliente',
    proposta: proposal.proposalId || '',
    modalidade: 'Assinatura SaaS',
    empresa: companyName,
    valor: amount,
    validade: formatDateBR(proposal.expirationDate)
  };
  return String(value || '').replace(/\{\{(\w+)\}\}/g, (_, key) => replacements[key] ?? '');
};

export const buildLubitSaasProposalData = (
  proposal: ProposalData,
  template: ProposalTemplateConfig,
  branding?: TenantBranding
): LubitSaasProposalViewData => {
  const config = normalizeSaasProposalConfig(proposal.saasProposalConfig);
  const unitPrice = proposal.saasUnitPrice || 0;
  const quantity = proposal.saasQuantity || 1;
  const discount = proposal.saasMonthlyDiscount || 0;
  const monthlyValue = Math.max(0, unitPrice * quantity * (1 - discount));
  const setupValue = proposal.saasSetupFee || 0;
  const contractMonths = proposal.saasContractMonths || proposal.contractDuration || 12;
  const contractTotal = monthlyValue * contractMonths + setupValue;
  const letterhead = proposal.letterheadConfig;
  const companyName = letterhead?.companyName || branding?.displayName || 'LubCore';
  const modules = pickCatalogItems(LUBIT_MODULE_CATALOG, config.selectedModuleIds);
  const addons = pickCatalogItems(LUBIT_ADDON_CATALOG, config.selectedAddonIds);
  const selectedAddons = new Set(config.selectedAddonIds);
  const formattedMonthly = formatCurrency(monthlyValue);

  return {
    proposal,
    template,
    config,
    title: `${proposal.saasPlanName || 'Lubit SaaS'} para gestao de lubrificacao industrial`,
    executiveSummary: applyProposalVariables(template.introduction || 'Contratacao mensal da plataforma Lubit/Core para digitalizar rotinas, organizar planos, apoiar execucao operacional, centralizar evidencias e sustentar a melhoria continua da operacao.', proposal, companyName, formattedMonthly),
    clientName: proposal.clientName || 'Cliente',
    proposalNumber: proposal.proposalId || '',
    version: proposal.version || 1,
    validUntil: formatDateBR(proposal.expirationDate),
    owner: proposal.responsible || proposal.salesperson || 'Equipe comercial',
    companyName,
    logoUrl: letterhead?.productLogoUrl || letterhead?.logoUrl || branding?.logoUrl,
    primaryColor: letterhead?.primaryColor || branding?.primaryColor || '#176b62',
    secondaryColor: letterhead?.secondaryColor || branding?.secondaryColor || '#2563eb',
    planName: proposal.saasPlanName || 'Plano Profissional',
    licenses: quantity,
    monthlyValue,
    setupValue,
    contractMonths,
    contractTotal,
    arrValue: monthlyValue * 12,
    formattedMonthly,
    formattedSetup: formatCurrency(setupValue),
    formattedContractTotal: formatCurrency(contractTotal),
    formattedArr: formatCurrency(monthlyValue * 12),
    modules,
    addons,
    futureAddons: LUBIT_ADDON_CATALOG.filter(item => !selectedAddons.has(item.id)).slice(0, 4),
    slaPlan: LUBIT_SLA_PLANS[config.slaPlan],
    scopeItems: splitTemplateLines(applyProposalVariables(template.scope, proposal, companyName, formattedMonthly), [
      'Ambiente SaaS Lubit/Core para operacao e gestao de lubrificacao.',
      'Configuracao inicial de usuarios, perfis, unidades e parametros operacionais.',
      'Apoio a carga inicial de planos, ativos, materiais e cadastros combinados.',
      'Suporte tecnico por chamado conforme plano de SLA contratado.',
      'Atualizacoes corretivas e evolutivas da plataforma durante a vigencia da assinatura.',
      'Relatorios, evidencias e visao operacional para acompanhamento gerencial.',
    ]),
    commercialTerms: splitTemplateLines(applyProposalVariables(template.commercialConditions, proposal, companyName, formattedMonthly), [
      'Faturamento mensal recorrente a partir da liberacao do ambiente de producao ou data acordada.',
      'Valores nao incluem customizacoes, integracoes especiais, deslocamentos ou treinamentos presenciais, salvo quando expressamente descritos.',
      'A contratacao podera ser formalizada por pedido de compra, contrato ou aceite desta proposta.',
      'Tributos incidentes seguem a legislacao aplicavel e o regime fiscal da contratada.',
    ]),
    closingNotes: applyProposalVariables(template.closingNotes, proposal, companyName, formattedMonthly),
  };
};
