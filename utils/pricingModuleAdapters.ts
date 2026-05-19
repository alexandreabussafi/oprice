import { ProposalData, TenantPricingModulesConfig, PricingModuleId, TaxConfig } from '../types';
import { normalizeModulePipelines } from './salesPipelines';

const DEFAULT_ICMS_STATE_RATES: Record<string, number> = {
  SP: 0.18,
  RJ: 0.12,
  MG: 0.12,
  PR: 0.12,
  SC: 0.12,
  RS: 0.12,
  OUTROS: 0.07
};

const DEFAULT_TAX_CONFIG: TaxConfig = {
  regime: 'Lucro Real',
  calculationMode: 'NORMATIVE',
  socialChargesRate: 0.768,
  revenueTaxesRate: 0.1633,
  chargesBreakdown: {
    groupA: [
      { id: 'a1', name: 'INSS', value: 0.20 },
      { id: 'a2', name: 'SESI / SESC', value: 0.015 },
      { id: 'a3', name: 'SENAI / SENAC', value: 0.01 },
      { id: 'a4', name: 'INCRA', value: 0.002 },
      { id: 'a5', name: 'Salario Educacao', value: 0.025 },
      { id: 'a6', name: 'FGTS', value: 0.08 },
      { id: 'a7', name: 'RAT + FAP', value: 0.03 },
      { id: 'a8', name: 'SEBRAE', value: 0.006 }
    ],
    groupB: [
      { id: 'b1', name: 'Ferias', value: 0.1111 },
      { id: 'b2', name: '1/3 sobre Ferias', value: 0.0370 },
      { id: 'b3', name: '13o Salario', value: 0.0833 },
      { id: 'b4', name: 'Ausencias Legais / Feriados', value: 0.0636 }
    ],
    groupC: [
      { id: 'c1', name: 'Aviso Previo Indenizado', value: 0.005 },
      { id: 'c2', name: 'Multa Rescisoria FGTS', value: 0.04 }
    ],
    groupD: [
      { id: 'd1', name: 'Incidencia A sobre B', value: 0.06 }
    ]
  },
  salesTaxes: [
    { id: 'pis', name: 'PIS', rate: 0.0165, active: true, type: 'SALES' },
    { id: 'cofins', name: 'COFINS', rate: 0.0760, active: true, type: 'SALES' },
    { id: 'iss', name: 'ISS', rate: 0.0500, active: true, type: 'SALES' }
  ],
  incomeTaxes: [
    { id: 'irpj', name: 'IRPJ', rate: 0.1500, active: true, type: 'INCOME' },
    { id: 'csll', name: 'CSLL', rate: 0.0900, active: true, type: 'INCOME' }
  ],
  icmsStateRates: DEFAULT_ICMS_STATE_RATES
};

const normalizeTaxConfig = (taxConfig?: Partial<TaxConfig>): TaxConfig => {
  const chargesBreakdown = taxConfig?.chargesBreakdown || {};

  return {
    ...DEFAULT_TAX_CONFIG,
    ...taxConfig,
    chargesBreakdown: {
      groupA: chargesBreakdown.groupA || DEFAULT_TAX_CONFIG.chargesBreakdown.groupA,
      groupB: chargesBreakdown.groupB || DEFAULT_TAX_CONFIG.chargesBreakdown.groupB,
      groupC: chargesBreakdown.groupC || DEFAULT_TAX_CONFIG.chargesBreakdown.groupC,
      groupD: chargesBreakdown.groupD || DEFAULT_TAX_CONFIG.chargesBreakdown.groupD
    },
    salesTaxes: taxConfig?.salesTaxes || DEFAULT_TAX_CONFIG.salesTaxes,
    incomeTaxes: taxConfig?.incomeTaxes || DEFAULT_TAX_CONFIG.incomeTaxes,
    icmsStateRates: taxConfig?.icmsStateRates || DEFAULT_ICMS_STATE_RATES
  };
};

export const createPricingModulesFromLegacyConfig = (config: ProposalData): TenantPricingModulesConfig => {
  const taxConfig = normalizeTaxConfig(config.taxConfig);

  return {
    SERVICES_COMPLEX: {
      taxConfig: {
        socialChargesRate: taxConfig.socialChargesRate,
        chargesBreakdown: taxConfig.chargesBreakdown
      },
      benefitsConfig: config.benefitsConfig,
      kitTemplates: config.kitTemplates || [],
      accountingConfig: config.accountingConfig,
      pipelines: normalizeModulePipelines('SERVICES_COMPLEX')
    },
    PRODUCT_SALES: {
      productCatalog: config.productCatalog || [],
      productAccountingConfig: config.productAccountingConfig,
      icmsStateRates: taxConfig.icmsStateRates || DEFAULT_ICMS_STATE_RATES,
      productHeaderUrl: config.letterheadConfig?.productHeaderUrl,
      productFooterUrl: config.letterheadConfig?.productFooterUrl,
      productLogoUrl: config.letterheadConfig?.productLogoUrl,
      productGeneralTerms: config.letterheadConfig?.productGeneralTerms,
      pipelines: normalizeModulePipelines('PRODUCT_SALES')
    },
    SAAS_SUBSCRIPTION: {
      defaultPlanName: config.saasPlanName || 'Plano Professional',
      defaultUnitPrice: config.saasUnitPrice ?? 0,
      defaultQuantity: config.saasQuantity ?? 1,
      defaultMonthlyDiscount: config.saasMonthlyDiscount ?? 0,
      defaultSetupFee: config.saasSetupFee ?? 0,
      defaultContractMonths: config.saasContractMonths || config.contractDuration || 12,
      notesTemplate: config.saasNotes,
      pipelines: normalizeModulePipelines('SAAS_SUBSCRIPTION')
    },
    IOT_SUBSCRIPTION: {
      productCatalog: config.productCatalog || [],
      defaultContractMonths: config.contractDuration || 12,
      hardwareCommercialModel: 'BOTH',
      recurringServiceLabel: 'Monitoramento recorrente',
      pipelines: normalizeModulePipelines('IOT_SUBSCRIPTION')
    }
  };
};

export const normalizePricingModulesConfig = (config: ProposalData): TenantPricingModulesConfig => {
  const legacy = createPricingModulesFromLegacyConfig(config);
  const current = config.pricingModules || {};

  return {
    SERVICES_COMPLEX: {
      ...(current.SERVICES_COMPLEX || {}),
      ...legacy.SERVICES_COMPLEX,
      pipelines: normalizeModulePipelines('SERVICES_COMPLEX', current.SERVICES_COMPLEX?.pipelines || legacy.SERVICES_COMPLEX.pipelines)
    },
    PRODUCT_SALES: {
      ...(current.PRODUCT_SALES || {}),
      ...legacy.PRODUCT_SALES,
      pipelines: normalizeModulePipelines('PRODUCT_SALES', current.PRODUCT_SALES?.pipelines || legacy.PRODUCT_SALES.pipelines)
    },
    SAAS_SUBSCRIPTION: {
      ...legacy.SAAS_SUBSCRIPTION,
      ...(current.SAAS_SUBSCRIPTION || {}),
      pipelines: normalizeModulePipelines('SAAS_SUBSCRIPTION', current.SAAS_SUBSCRIPTION?.pipelines || legacy.SAAS_SUBSCRIPTION.pipelines)
    },
    IOT_SUBSCRIPTION: {
      ...legacy.IOT_SUBSCRIPTION,
      ...(current.IOT_SUBSCRIPTION || {}),
      pipelines: normalizeModulePipelines('IOT_SUBSCRIPTION', current.IOT_SUBSCRIPTION?.pipelines || legacy.IOT_SUBSCRIPTION.pipelines)
    }
  };
};

export const withPricingModuleCompatibility = (config: ProposalData): ProposalData => {
  const baseTaxConfig = normalizeTaxConfig(config.taxConfig);
  const pricingModules = normalizePricingModulesConfig(config);
  const servicesConfig = pricingModules.SERVICES_COMPLEX;
  const productConfig = pricingModules.PRODUCT_SALES;
  const saasConfig = pricingModules.SAAS_SUBSCRIPTION;

  return {
    ...config,
    pricingModules,
    benefitsConfig: servicesConfig?.benefitsConfig ?? config.benefitsConfig,
    kitTemplates: servicesConfig?.kitTemplates ?? config.kitTemplates,
    accountingConfig: servicesConfig?.accountingConfig ?? config.accountingConfig,
    productCatalog: productConfig?.productCatalog ?? config.productCatalog,
    productAccountingConfig: productConfig?.productAccountingConfig ?? config.productAccountingConfig,
    saasPlanName: config.saasPlanName ?? saasConfig?.defaultPlanName,
    saasUnitPrice: config.saasUnitPrice ?? saasConfig?.defaultUnitPrice,
    saasQuantity: config.saasQuantity ?? saasConfig?.defaultQuantity,
    saasMonthlyDiscount: config.saasMonthlyDiscount ?? saasConfig?.defaultMonthlyDiscount,
    saasSetupFee: config.saasSetupFee ?? saasConfig?.defaultSetupFee,
    saasContractMonths: config.saasContractMonths ?? saasConfig?.defaultContractMonths,
    saasNotes: config.saasNotes ?? saasConfig?.notesTemplate,
    taxConfig: normalizeTaxConfig({
      ...baseTaxConfig,
      ...(servicesConfig?.taxConfig || {}),
      icmsStateRates: productConfig?.icmsStateRates || baseTaxConfig.icmsStateRates || DEFAULT_ICMS_STATE_RATES
    }),
    letterheadConfig: {
      ...config.letterheadConfig,
      productHeaderUrl: productConfig?.productHeaderUrl ?? config.letterheadConfig?.productHeaderUrl,
      productFooterUrl: productConfig?.productFooterUrl ?? config.letterheadConfig?.productFooterUrl,
      productLogoUrl: productConfig?.productLogoUrl ?? config.letterheadConfig?.productLogoUrl,
      productGeneralTerms: productConfig?.productGeneralTerms ?? config.letterheadConfig?.productGeneralTerms
    }
  };
};

export const applyPricingModuleDefaultsToProposal = (
  proposal: ProposalData,
  tenantConfig: ProposalData,
  pricingModule: PricingModuleId
): ProposalData => {
  const compatibleConfig = withPricingModuleCompatibility(tenantConfig);
  const modules = compatibleConfig.pricingModules || {};
  const productConfig = modules.PRODUCT_SALES;
  const saasConfig = modules.SAAS_SUBSCRIPTION;
  const servicesConfig = modules.SERVICES_COMPLEX;

  const baseProposal: ProposalData = {
    ...proposal,
    pricingModule,
    taxConfig: {
      ...compatibleConfig.taxConfig,
      ...(pricingModule === 'SERVICES_COMPLEX' ? (servicesConfig?.taxConfig || {}) : {}),
      icmsStateRates: productConfig?.icmsStateRates || compatibleConfig.taxConfig.icmsStateRates
    },
    accountingConfig: servicesConfig?.accountingConfig || compatibleConfig.accountingConfig,
    productAccountingConfig: productConfig?.productAccountingConfig || compatibleConfig.productAccountingConfig,
    letterheadConfig: compatibleConfig.letterheadConfig,
    proposalTemplates: compatibleConfig.proposalTemplates
  };

  if (pricingModule === 'SAAS_SUBSCRIPTION') {
    return {
      ...baseProposal,
      type: 'PRODUCT',
      saasPlanName: proposal.saasPlanName ?? saasConfig?.defaultPlanName ?? 'Plano Professional',
      saasUnitPrice: proposal.saasUnitPrice ?? saasConfig?.defaultUnitPrice ?? 0,
      saasQuantity: proposal.saasQuantity ?? saasConfig?.defaultQuantity ?? 1,
      saasMonthlyDiscount: proposal.saasMonthlyDiscount ?? saasConfig?.defaultMonthlyDiscount ?? 0,
      saasSetupFee: proposal.saasSetupFee ?? saasConfig?.defaultSetupFee ?? 0,
      saasContractMonths: proposal.saasContractMonths ?? saasConfig?.defaultContractMonths ?? 12,
      contractDuration: proposal.contractDuration || saasConfig?.defaultContractMonths || compatibleConfig.contractDuration || 12,
      saasNotes: proposal.saasNotes ?? saasConfig?.notesTemplate
    };
  }

  if (pricingModule === 'PRODUCT_SALES' || pricingModule === 'IOT_SUBSCRIPTION') {
    return {
      ...baseProposal,
      type: 'PRODUCT'
    };
  }

  return baseProposal;
};
