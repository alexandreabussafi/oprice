import { ProposalData, TenantPricingModulesConfig, PricingModuleId } from '../types';
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

export const createPricingModulesFromLegacyConfig = (config: ProposalData): TenantPricingModulesConfig => ({
  SERVICES_COMPLEX: {
    taxConfig: {
      socialChargesRate: config.taxConfig.socialChargesRate,
      chargesBreakdown: config.taxConfig.chargesBreakdown
    },
    benefitsConfig: config.benefitsConfig,
    kitTemplates: config.kitTemplates || [],
    accountingConfig: config.accountingConfig,
    pipelines: normalizeModulePipelines('SERVICES_COMPLEX')
  },
  PRODUCT_SALES: {
    productCatalog: config.productCatalog || [],
    productAccountingConfig: config.productAccountingConfig,
    icmsStateRates: config.taxConfig.icmsStateRates || DEFAULT_ICMS_STATE_RATES,
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
});

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
    taxConfig: {
      ...config.taxConfig,
      ...(servicesConfig?.taxConfig || {}),
      icmsStateRates: productConfig?.icmsStateRates || config.taxConfig.icmsStateRates || DEFAULT_ICMS_STATE_RATES
    },
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
