import {
  PricingModuleBusinessUnit,
  PricingModuleDefinition,
  PricingModuleId,
  PricingSettingsSection,
  ProposalData,
  ProposalTemplateKind,
  ProposalType,
  TenantModule
} from '../types';

export const PRICING_MODULE_IDS: PricingModuleId[] = [
  'SERVICES_COMPLEX',
  'PRODUCT_SALES',
  'SAAS_SUBSCRIPTION',
  'IOT_SUBSCRIPTION'
];

export const SERVICE_PRICING_MODULE_IDS: PricingModuleId[] = ['SERVICES_COMPLEX'];
export const PRODUCT_PRICING_MODULE_IDS: PricingModuleId[] = ['SAAS_SUBSCRIPTION', 'IOT_SUBSCRIPTION', 'PRODUCT_SALES'];
export const ALL_TENANT_MODULE_IDS: TenantModule[] = ['CRM_CORE', ...PRICING_MODULE_IDS];

export const PRICING_MODULE_DEFINITIONS: Record<PricingModuleId, PricingModuleDefinition> = {
  SERVICES_COMPLEX: {
    id: 'SERVICES_COMPLEX',
    label: 'Servicos complexos',
    shortLabel: 'Servicos',
    description: 'Contratos e projetos de servico com mao de obra, encargos, EPIs, suporte, CAPEX e DRE.',
    businessUnit: 'SERVICES',
    proposalType: 'CONTINUOUS',
    allowedProposalTypes: ['CONTINUOUS', 'SPOT'],
    commercialModel: 'SERVICE_COST_PLUS',
    defaultTemplateKind: 'SERVICES_CONTINUOUS',
    defaultEditorTab: 'dashboard',
    editorTabs: ['dashboard', 'docs', 'team', 'safety', 'support', 'costs', 'spot-editor', 'pricing', 'settings'],
    settingsSections: ['FINANCE_COSTS', 'SERVICE_CHARGES', 'SERVICE_KITS', 'SERVICE_ACCOUNTING', 'PROPOSAL_TEMPLATES', 'PIPELINES'],
    includes: ['Equipe e salarios', 'Encargos sociais', 'Seguranca/SMS', 'Custos e suporte', 'DRE'],
    capabilities: {
      socialCharges: true,
      serviceLabor: true,
      safetyAndSupport: true,
      serviceCosting: true,
      serviceMargin: true
    }
  },
  PRODUCT_SALES: {
    id: 'PRODUCT_SALES',
    label: 'Venda de produtos',
    shortLabel: 'Produtos',
    description: 'Cotacao direta de itens, catalogo, margem por item, IPI/ICMS e ordem de venda.',
    businessUnit: 'PRODUCTS',
    proposalType: 'PRODUCT',
    allowedProposalTypes: ['PRODUCT'],
    commercialModel: 'PRODUCT_MARGIN',
    defaultTemplateKind: 'PRODUCT_SALES',
    defaultEditorTab: 'product-editor',
    editorTabs: ['dashboard', 'docs', 'product-editor'],
    settingsSections: ['FINANCE_COSTS', 'PRODUCT_CATALOG', 'PRODUCT_TAXES', 'PRODUCT_ACCOUNTING', 'PRODUCT_LAYOUT', 'PROPOSAL_TEMPLATES', 'PIPELINES'],
    includes: ['Catalogo', 'Itens e fotos', 'IPI/ICMS', 'Layout de orcamento'],
    capabilities: {
      productCatalog: true,
      productTaxes: true,
      productMargin: true
    }
  },
  SAAS_SUBSCRIPTION: {
    id: 'SAAS_SUBSCRIPTION',
    label: 'Assinatura SaaS',
    shortLabel: 'SaaS',
    description: 'Oferta recorrente com mensalidade, licencas, setup, desconto e proposta tecnico-comercial.',
    businessUnit: 'PRODUCTS',
    proposalType: 'PRODUCT',
    allowedProposalTypes: ['PRODUCT'],
    commercialModel: 'SUBSCRIPTION_REVENUE',
    defaultTemplateKind: 'SAAS_SUBSCRIPTION',
    defaultEditorTab: 'saas-editor',
    editorTabs: ['dashboard', 'docs', 'saas-editor'],
    settingsSections: ['SAAS_DEFAULTS', 'SAAS_REVENUE_TAXES', 'PROPOSAL_TEMPLATES', 'PIPELINES'],
    includes: ['Mensalidade', 'Licencas', 'Setup', 'Descontos', 'MRR/ARR'],
    capabilities: {
      subscription: true,
      subscriptionRevenue: true,
      setupFee: true
    }
  },
  IOT_SUBSCRIPTION: {
    id: 'IOT_SUBSCRIPTION',
    label: 'IoT e sensores',
    shortLabel: 'IoT',
    description: 'Assinatura com hardware, instalacao, recorrencia de monitoramento e premissas de comodato ou venda.',
    businessUnit: 'PRODUCTS',
    proposalType: 'PRODUCT',
    allowedProposalTypes: ['PRODUCT'],
    commercialModel: 'IOT_HYBRID',
    defaultTemplateKind: 'IOT_SUBSCRIPTION',
    defaultEditorTab: 'product-editor',
    editorTabs: ['dashboard', 'docs', 'product-editor'],
    settingsSections: ['FINANCE_COSTS', 'PRODUCT_CATALOG', 'PRODUCT_TAXES', 'PRODUCT_ACCOUNTING', 'PRODUCT_LAYOUT', 'PROPOSAL_TEMPLATES', 'PIPELINES'],
    includes: ['Sensores/hardware', 'Instalacao', 'Monitoramento recorrente', 'Venda ou comodato'],
    capabilities: {
      productCatalog: true,
      productTaxes: true,
      productMargin: true,
      subscription: true,
      subscriptionRevenue: true,
      setupFee: true,
      iot: true
    }
  }
};

export const normalizeTenantModules = (enabledModules: TenantModule[] = []): TenantModule[] => {
  const normalized = enabledModules.filter((module): module is TenantModule =>
    ALL_TENANT_MODULE_IDS.includes(module as TenantModule)
  );
  return Array.from(new Set(['CRM_CORE', ...normalized]));
};

export const isPricingModuleId = (module?: TenantModule | null): module is PricingModuleId =>
  !!module && module !== 'CRM_CORE' && PRICING_MODULE_IDS.includes(module as PricingModuleId);

export const getPricingModuleDefinition = (module?: TenantModule | null) =>
  isPricingModuleId(module) ? PRICING_MODULE_DEFINITIONS[module] : null;

export const getPricingModuleLabel = (module?: TenantModule | null, fallback = 'Modulo de pricing') =>
  getPricingModuleDefinition(module)?.label || fallback;

export const isPricingModuleEnabledForTenant = (
  module: TenantModule | null | undefined,
  enabledModules: TenantModule[] = []
): module is PricingModuleId =>
  isPricingModuleId(module) && normalizeTenantModules(enabledModules).includes(module);

export const getEnabledPricingModules = (
  enabledModules: TenantModule[] = [],
  businessUnit?: PricingModuleBusinessUnit
): PricingModuleId[] =>
  PRICING_MODULE_IDS.filter(module => (
    normalizeTenantModules(enabledModules).includes(module) &&
    (!businessUnit || PRICING_MODULE_DEFINITIONS[module].businessUnit === businessUnit)
  ));

export const tenantHasAnyPricingModule = (enabledModules: TenantModule[] = []) =>
  getEnabledPricingModules(enabledModules).length > 0;

export const tenantSupportsPricingBusinessUnit = (
  enabledModules: TenantModule[] = [],
  businessUnit: PricingModuleBusinessUnit
) => getEnabledPricingModules(enabledModules, businessUnit).length > 0;

export const resolveDefaultBusinessUnitForModules = (
  enabledModules: TenantModule[] = [],
  preferred: PricingModuleBusinessUnit = 'SERVICES'
): PricingModuleBusinessUnit => {
  const supportsPreferred = tenantSupportsPricingBusinessUnit(enabledModules, preferred);
  if (supportsPreferred) return preferred;
  const fallback = preferred === 'SERVICES' ? 'PRODUCTS' : 'SERVICES';
  if (tenantSupportsPricingBusinessUnit(enabledModules, fallback)) return fallback;
  return preferred;
};

export const getDefaultPricingModuleForBusinessUnit = (
  enabledModules: TenantModule[] = [],
  businessUnit: PricingModuleBusinessUnit
): PricingModuleId | null => {
  const ordered = businessUnit === 'PRODUCTS' ? PRODUCT_PRICING_MODULE_IDS : SERVICE_PRICING_MODULE_IDS;
  const normalized = normalizeTenantModules(enabledModules);
  return ordered.find(module => normalized.includes(module)) || null;
};

export const getProposalTypeForPricingModule = (
  module: TenantModule | undefined,
  fallback: ProposalType = 'CONTINUOUS'
): ProposalType => getPricingModuleDefinition(module)?.proposalType || fallback;

export const getEditorTabForPricingModule = (
  type: ProposalType,
  module?: TenantModule
) => {
  const definition = getPricingModuleDefinition(module);
  if (definition?.defaultEditorTab) return definition.defaultEditorTab;
  return type === 'PRODUCT' ? 'product-editor' : 'dashboard';
};

export const getAllowedEditorTabsForProposal = (proposal: Pick<ProposalData, 'type' | 'pricingModule'>): string[] => {
  const definition = getPricingModuleDefinition(proposal.pricingModule);
  if (!definition) {
    return proposal.type === 'PRODUCT'
      ? ['dashboard', 'docs', 'product-editor']
      : proposal.type === 'SPOT'
        ? ['dashboard', 'docs', 'spot-editor', 'pricing', 'settings']
        : ['dashboard', 'docs', 'team', 'safety', 'support', 'costs', 'pricing', 'settings'];
  }

  if (proposal.pricingModule === 'SERVICES_COMPLEX' && proposal.type === 'SPOT') {
    return definition.editorTabs.filter(tab => ['dashboard', 'docs', 'spot-editor', 'pricing', 'settings'].includes(tab));
  }

  if (proposal.pricingModule === 'SERVICES_COMPLEX') {
    return definition.editorTabs.filter(tab => tab !== 'spot-editor');
  }

  return definition.editorTabs;
};

export const isEditorTabAllowedForProposal = (
  proposal: Pick<ProposalData, 'type' | 'pricingModule'>,
  tab: string
) => getAllowedEditorTabsForProposal(proposal).includes(tab);

export const getSafeEditorTabForProposal = (
  proposal: Pick<ProposalData, 'type' | 'pricingModule'>,
  requestedTab?: string
) => {
  const allowedTabs = getAllowedEditorTabsForProposal(proposal);
  if (requestedTab && allowedTabs.includes(requestedTab)) return requestedTab;
  const defaultTab = getEditorTabForPricingModule(proposal.type, proposal.pricingModule);
  return allowedTabs.includes(defaultTab) ? defaultTab : allowedTabs[0] || 'dashboard';
};

export const getEnabledPricingSettingsSections = (
  enabledModules: TenantModule[] = []
): Set<PricingSettingsSection> => {
  const sections = new Set<PricingSettingsSection>();
  getEnabledPricingModules(enabledModules).forEach(module => {
    PRICING_MODULE_DEFINITIONS[module].settingsSections.forEach(section => sections.add(section));
  });
  return sections;
};

export const getTenantPricingCapabilities = (enabledModules: TenantModule[] = []) => {
  const modules = getEnabledPricingModules(enabledModules);
  return modules.reduce((acc, module) => ({
    socialCharges: acc.socialCharges || !!PRICING_MODULE_DEFINITIONS[module].capabilities.socialCharges,
    serviceCosting: acc.serviceCosting || !!PRICING_MODULE_DEFINITIONS[module].capabilities.serviceCosting,
    productCatalog: acc.productCatalog || !!PRICING_MODULE_DEFINITIONS[module].capabilities.productCatalog,
    productTaxes: acc.productTaxes || !!PRICING_MODULE_DEFINITIONS[module].capabilities.productTaxes,
    productMargin: acc.productMargin || !!PRICING_MODULE_DEFINITIONS[module].capabilities.productMargin,
    subscriptionRevenue: acc.subscriptionRevenue || !!PRICING_MODULE_DEFINITIONS[module].capabilities.subscriptionRevenue,
    iot: acc.iot || !!PRICING_MODULE_DEFINITIONS[module].capabilities.iot
  }), {
    socialCharges: false,
    serviceCosting: false,
    productCatalog: false,
    productTaxes: false,
    productMargin: false,
    subscriptionRevenue: false,
    iot: false
  });
};

export const getProposalTemplateKindForPricing = (proposal: ProposalData): ProposalTemplateKind => {
  if (proposal.pricingModule === 'SERVICES_COMPLEX' && proposal.type === 'SPOT') return 'SERVICES_SPOT';
  if (proposal.pricingModule === 'SERVICES_COMPLEX') return 'SERVICES_CONTINUOUS';
  return getPricingModuleDefinition(proposal.pricingModule)?.defaultTemplateKind
    || (proposal.type === 'PRODUCT' ? 'PRODUCT_SALES' : proposal.type === 'SPOT' ? 'SERVICES_SPOT' : 'SERVICES_CONTINUOUS');
};
