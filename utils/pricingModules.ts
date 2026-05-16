import {
  PricingModuleBusinessUnit,
  PricingModuleDefinition,
  PricingModuleId,
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

export const PRICING_MODULE_DEFINITIONS: Record<PricingModuleId, PricingModuleDefinition> = {
  SERVICES_COMPLEX: {
    id: 'SERVICES_COMPLEX',
    label: 'Servicos complexos',
    shortLabel: 'Servicos',
    description: 'Contratos e projetos de servico com mao de obra, encargos, EPIs, suporte, CAPEX e DRE.',
    businessUnit: 'SERVICES',
    proposalType: 'CONTINUOUS',
    defaultTemplateKind: 'SERVICES_CONTINUOUS',
    defaultEditorTab: 'dashboard',
    includes: ['Equipe e salarios', 'Encargos sociais', 'Seguranca/SMS', 'Custos e suporte', 'DRE'],
    capabilities: {
      socialCharges: true,
      serviceLabor: true,
      safetyAndSupport: true
    }
  },
  PRODUCT_SALES: {
    id: 'PRODUCT_SALES',
    label: 'Venda de produtos',
    shortLabel: 'Produtos',
    description: 'Cotacao direta de itens, catalogo, margem por item, IPI/ICMS e ordem de venda.',
    businessUnit: 'PRODUCTS',
    proposalType: 'PRODUCT',
    defaultTemplateKind: 'PRODUCT_SALES',
    defaultEditorTab: 'product-editor',
    includes: ['Catalogo', 'Itens e fotos', 'IPI/ICMS', 'Layout de orcamento'],
    capabilities: {
      productCatalog: true,
      productTaxes: true
    }
  },
  SAAS_SUBSCRIPTION: {
    id: 'SAAS_SUBSCRIPTION',
    label: 'Assinatura SaaS',
    shortLabel: 'SaaS',
    description: 'Oferta recorrente com mensalidade, licencas, setup, desconto e proposta tecnico-comercial.',
    businessUnit: 'PRODUCTS',
    proposalType: 'PRODUCT',
    defaultTemplateKind: 'SAAS_SUBSCRIPTION',
    defaultEditorTab: 'saas-editor',
    includes: ['Mensalidade', 'Licencas', 'Setup', 'Descontos', 'MRR/ARR'],
    capabilities: {
      subscription: true
    }
  },
  IOT_SUBSCRIPTION: {
    id: 'IOT_SUBSCRIPTION',
    label: 'IoT e sensores',
    shortLabel: 'IoT',
    description: 'Assinatura com hardware, instalacao, recorrencia de monitoramento e premissas de comodato ou venda.',
    businessUnit: 'PRODUCTS',
    proposalType: 'PRODUCT',
    defaultTemplateKind: 'IOT_SUBSCRIPTION',
    defaultEditorTab: 'product-editor',
    includes: ['Sensores/hardware', 'Instalacao', 'Monitoramento recorrente', 'Venda ou comodato'],
    capabilities: {
      productCatalog: true,
      productTaxes: true,
      subscription: true,
      iot: true
    }
  }
};

export const isPricingModuleId = (module?: TenantModule | null): module is PricingModuleId =>
  !!module && module !== 'CRM_CORE' && PRICING_MODULE_IDS.includes(module as PricingModuleId);

export const getPricingModuleDefinition = (module?: TenantModule | null) =>
  isPricingModuleId(module) ? PRICING_MODULE_DEFINITIONS[module] : null;

export const getPricingModuleLabel = (module?: TenantModule | null, fallback = 'Modulo de pricing') =>
  getPricingModuleDefinition(module)?.label || fallback;

export const getEnabledPricingModules = (
  enabledModules: TenantModule[] = [],
  businessUnit?: PricingModuleBusinessUnit
): PricingModuleId[] =>
  PRICING_MODULE_IDS.filter(module => (
    enabledModules.includes(module) &&
    (!businessUnit || PRICING_MODULE_DEFINITIONS[module].businessUnit === businessUnit)
  ));

export const tenantSupportsPricingBusinessUnit = (
  enabledModules: TenantModule[] = [],
  businessUnit: PricingModuleBusinessUnit
) => getEnabledPricingModules(enabledModules, businessUnit).length > 0;

export const getDefaultPricingModuleForBusinessUnit = (
  enabledModules: TenantModule[] = [],
  businessUnit: PricingModuleBusinessUnit
): PricingModuleId | null => {
  const ordered = businessUnit === 'PRODUCTS' ? PRODUCT_PRICING_MODULE_IDS : SERVICE_PRICING_MODULE_IDS;
  return ordered.find(module => enabledModules.includes(module)) || null;
};

export const getProposalTypeForPricingModule = (
  module: TenantModule | undefined,
  fallback: ProposalType = 'CONTINUOUS'
): ProposalType => getPricingModuleDefinition(module)?.proposalType || fallback;

export const getEditorTabForPricingModule = (
  type: ProposalType,
  module?: TenantModule
) => {
  if (type === 'PRODUCT') {
    return getPricingModuleDefinition(module)?.defaultEditorTab || 'product-editor';
  }
  return 'dashboard';
};

export const getProposalTemplateKindForPricing = (proposal: ProposalData): ProposalTemplateKind => {
  if (proposal.pricingModule === 'SERVICES_COMPLEX' && proposal.type === 'SPOT') return 'SERVICES_SPOT';
  if (proposal.pricingModule === 'SERVICES_COMPLEX') return 'SERVICES_CONTINUOUS';
  return getPricingModuleDefinition(proposal.pricingModule)?.defaultTemplateKind
    || (proposal.type === 'PRODUCT' ? 'PRODUCT_SALES' : proposal.type === 'SPOT' ? 'SERVICES_SPOT' : 'SERVICES_CONTINUOUS');
};
