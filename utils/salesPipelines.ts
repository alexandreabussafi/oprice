import {
  PipelineStageCategory,
  PipelineStageId,
  PipelineVariant,
  PricingModuleId,
  ProposalData,
  ProposalType,
  SalesPipelineConfig,
  SalesPipelineStageConfig,
  TenantModule
} from '../types';
import { getEnabledPricingModules, getPricingModuleDefinition, isPricingModuleId } from './pricingModules';

export interface SalesPipelineOption {
  key: string;
  pricingModule: PricingModuleId;
  variant: PipelineVariant;
  label: string;
  shortLabel: string;
  proposalType: ProposalType;
}

export const PIPELINE_VARIANT_LABELS: Record<PipelineVariant, string> = {
  DEFAULT: 'Padrao',
  CONTINUOUS: 'Continuo',
  SPOT: 'Spot'
};

export const PIPELINE_CATEGORY_LABELS: Record<PipelineStageCategory, string> = {
  intake: 'Entrada',
  diagnosis: 'Diagnostico',
  solution: 'Solucao',
  pricing: 'Precificacao',
  proposal: 'Proposta',
  negotiation: 'Negociacao',
  closing: 'Fechamento',
  won: 'Ganho',
  lost: 'Perdido'
};

export const PIPELINE_CATEGORY_OPTIONS: Array<{ id: PipelineStageCategory; label: string }> = [
  { id: 'intake', label: PIPELINE_CATEGORY_LABELS.intake },
  { id: 'diagnosis', label: PIPELINE_CATEGORY_LABELS.diagnosis },
  { id: 'solution', label: PIPELINE_CATEGORY_LABELS.solution },
  { id: 'pricing', label: PIPELINE_CATEGORY_LABELS.pricing },
  { id: 'proposal', label: PIPELINE_CATEGORY_LABELS.proposal },
  { id: 'negotiation', label: PIPELINE_CATEGORY_LABELS.negotiation },
  { id: 'closing', label: PIPELINE_CATEGORY_LABELS.closing }
];

export const PIPELINE_STAGE_STYLES: Record<string, { color: string; bg: string; border: string; barColor: string; headerBg: string; badge: string }> = {
  primary: {
    color: 'text-[var(--tenant-primary)]',
    bg: 'bg-[var(--tenant-primary-soft)]',
    border: 'border-[var(--tenant-primary-border)]',
    barColor: 'bg-[var(--tenant-primary)]',
    headerBg: 'bg-[var(--tenant-primary-soft)]',
    badge: 'bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] border-[var(--tenant-primary-border)]'
  },
  violet: {
    color: 'text-[var(--tenant-secondary)]',
    bg: 'bg-[var(--tenant-secondary-soft)]',
    border: 'border-[var(--tenant-secondary-border)]',
    barColor: 'bg-[var(--tenant-secondary-soft)]0',
    headerBg: 'bg-[var(--tenant-secondary-soft)]',
    badge: 'bg-[var(--tenant-secondary-soft)] dark:bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] border-[var(--tenant-secondary-border)] dark:border-[var(--tenant-secondary-border)]'
  },
  cyan: {
    color: 'text-[var(--tenant-secondary)]',
    bg: 'bg-[var(--tenant-secondary-soft)]',
    border: 'border-[var(--tenant-secondary-border)]',
    barColor: 'bg-[var(--tenant-secondary-soft)]0',
    headerBg: 'bg-[var(--tenant-secondary-soft)]',
    badge: 'bg-[var(--tenant-secondary-soft)] dark:bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] border-[var(--tenant-secondary-border)] dark:border-[var(--tenant-secondary-border)]'
  },
  slate: {
    color: 'text-slate-600',
    bg: 'bg-[var(--tenant-control)]',
    border: 'border-[var(--tenant-border)]',
    barColor: 'bg-[var(--tenant-control)]0',
    headerBg: 'bg-[var(--tenant-control)]',
    badge: 'bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] text-slate-600 dark:text-slate-300 border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]'
  },
  blue: {
    color: 'text-[var(--tenant-secondary)]',
    bg: 'bg-[var(--tenant-secondary-soft)]',
    border: 'border-[var(--tenant-secondary-border)]',
    barColor: 'bg-[var(--tenant-secondary)]',
    headerBg: 'bg-[var(--tenant-secondary-soft)]',
    badge: 'bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] border-[var(--tenant-secondary-border)] dark:text-[var(--tenant-secondary)]'
  },
  amber: {
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    barColor: 'bg-amber-500',
    headerBg: 'bg-amber-50/70',
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800'
  },
  rose: {
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-400',
    barColor: 'bg-rose-500',
    headerBg: 'bg-rose-50/70',
    badge: 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-800'
  },
  emerald: {
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    barColor: 'bg-emerald-500',
    headerBg: 'bg-emerald-50/70',
    badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
  },
  red: {
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-400',
    barColor: 'bg-red-500',
    headerBg: 'bg-red-50/70',
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
  },
  teal: {
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-300',
    barColor: 'bg-teal-500',
    headerBg: 'bg-teal-100/50',
    badge: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400 border-teal-200 dark:border-teal-800'
  }
};

const categoryColor: Record<PipelineStageCategory, string> = {
  intake: 'primary',
  diagnosis: 'violet',
  solution: 'cyan',
  pricing: 'slate',
  proposal: 'blue',
  negotiation: 'amber',
  closing: 'rose',
  won: 'emerald',
  lost: 'red'
};

const stage = (
  id: PipelineStageId,
  label: string,
  category: PipelineStageCategory,
  order: number,
  colorToken = categoryColor[category],
  probability = 50,
  overrides: Partial<SalesPipelineStageConfig> = {}
): SalesPipelineStageConfig => ({
  id,
  label,
  category,
  order,
  active: true,
  visibleInKanban: category !== 'lost',
  locked: category === 'won' || category === 'lost',
  colorToken,
  probability,
  ...overrides
});

const pipeline = (
  pricingModule: PricingModuleId,
  variant: PipelineVariant,
  stages: SalesPipelineStageConfig[],
  defaultStageId: PipelineStageId = 'Pricing'
): SalesPipelineConfig => ({
  pricingModule,
  variant,
  stages,
  defaultStageId,
  wonStageId: 'Won',
  lostStageId: 'Lost'
});

export const DEFAULT_SALES_PIPELINES: Record<PricingModuleId, Partial<Record<PipelineVariant, SalesPipelineConfig>>> = {
  SERVICES_COMPLEX: {
    CONTINUOUS: pipeline('SERVICES_COMPLEX', 'CONTINUOUS', [
      stage('MQL', 'Prospeccao', 'intake', 10, 'primary', 10),
      stage('Qualification', 'Qualificacao', 'diagnosis', 20, 'violet', 20),
      stage('SolutionDesign', 'Desenho de Solucao', 'solution', 30, 'cyan', 35),
      stage('Pricing', 'Precificacao', 'pricing', 40, 'slate', 50),
      stage('Sent', 'Proposta Enviada', 'proposal', 50, 'blue', 65),
      stage('Negotiation', 'Negociacao', 'negotiation', 60, 'amber', 75),
      stage('Review', 'Em Revisao', 'closing', 70, 'rose', 85),
      stage('Won', 'Ganho', 'won', 80, 'emerald', 100),
      stage('Lost', 'Perdido', 'lost', 90, 'red', 0, { visibleInKanban: false })
    ]),
    SPOT: pipeline('SERVICES_COMPLEX', 'SPOT', [
      stage('MQL', 'Prospeccao', 'intake', 10, 'primary', 10),
      stage('Diagnosis', 'Diagnostico', 'diagnosis', 20, 'cyan', 25),
      stage('Pricing', 'Precificacao', 'pricing', 30, 'slate', 50),
      stage('Sent', 'Proposta Enviada', 'proposal', 40, 'blue', 65),
      stage('FinalAdjustments', 'Ajustes Finais', 'negotiation', 50, 'amber', 75),
      stage('AwaitingPO', 'Aguardando PO', 'closing', 60, 'rose', 85),
      stage('Won', 'Ganho', 'won', 70, 'emerald', 100),
      stage('Lost', 'Perdido', 'lost', 80, 'red', 0, { visibleInKanban: false })
    ])
  },
  PRODUCT_SALES: {
    DEFAULT: pipeline('PRODUCT_SALES', 'DEFAULT', [
      stage('MQL', 'Lead / Interesse', 'intake', 10, 'emerald', 10),
      stage('Qualification', 'Cotacao Tecnica', 'diagnosis', 20, 'teal', 30),
      stage('Pricing', 'Lista de Precos', 'pricing', 30, 'slate', 50),
      stage('Sent', 'Cotacao Enviada', 'proposal', 40, 'blue', 65),
      stage('Negotiation', 'Fechamento', 'negotiation', 50, 'amber', 80),
      stage('Won', 'Faturado', 'won', 60, 'emerald', 100),
      stage('Lost', 'Perdido', 'lost', 70, 'red', 0, { visibleInKanban: false })
    ])
  },
  SAAS_SUBSCRIPTION: {
    DEFAULT: pipeline('SAAS_SUBSCRIPTION', 'DEFAULT', [
      stage('MQL', 'Lead', 'intake', 10, 'primary', 10),
      stage('Qualification', 'Discovery', 'diagnosis', 20, 'violet', 25),
      stage('SolutionDesign', 'Demonstracao / Escopo', 'solution', 30, 'cyan', 40),
      stage('Pricing', 'Plano & Setup', 'pricing', 40, 'slate', 55),
      stage('Sent', 'Proposta Enviada', 'proposal', 50, 'blue', 70),
      stage('Negotiation', 'Negociacao', 'negotiation', 60, 'amber', 85),
      stage('Won', 'Contrato Assinado', 'won', 70, 'emerald', 100),
      stage('Lost', 'Perdido', 'lost', 80, 'red', 0, { visibleInKanban: false })
    ])
  },
  IOT_SUBSCRIPTION: {
    DEFAULT: pipeline('IOT_SUBSCRIPTION', 'DEFAULT', [
      stage('MQL', 'Lead', 'intake', 10, 'primary', 10),
      stage('Diagnosis', 'Diagnostico Tecnico', 'diagnosis', 20, 'cyan', 25),
      stage('SolutionDesign', 'Arquitetura / Hardware', 'solution', 30, 'violet', 40),
      stage('Pricing', 'Precificacao', 'pricing', 40, 'slate', 55),
      stage('Sent', 'Proposta Enviada', 'proposal', 50, 'blue', 70),
      stage('Negotiation', 'Fechamento', 'negotiation', 60, 'amber', 85),
      stage('Won', 'Ganho', 'won', 70, 'emerald', 100),
      stage('Lost', 'Perdido', 'lost', 80, 'red', 0, { visibleInKanban: false })
    ])
  }
};

export const getPipelineOptionKey = (pricingModule: PricingModuleId, variant: PipelineVariant) =>
  `${pricingModule}:${variant}`;

export const parsePipelineOptionKey = (key: string): { pricingModule: PricingModuleId; variant: PipelineVariant } | null => {
  const [pricingModule, variant] = key.split(':') as [TenantModule | undefined, PipelineVariant | undefined];
  if (!isPricingModuleId(pricingModule)) return null;
  if (!['DEFAULT', 'CONTINUOUS', 'SPOT'].includes(String(variant))) return null;
  return { pricingModule, variant: variant as PipelineVariant };
};

export const getPipelineVariantsForPricingModule = (pricingModule: PricingModuleId): PipelineVariant[] =>
  pricingModule === 'SERVICES_COMPLEX' ? ['CONTINUOUS', 'SPOT'] : ['DEFAULT'];

export const getDefaultSalesPipeline = (
  pricingModule: PricingModuleId,
  variant: PipelineVariant = 'DEFAULT'
): SalesPipelineConfig => {
  const moduleDefaults = DEFAULT_SALES_PIPELINES[pricingModule];
  const selected = moduleDefaults[variant] || moduleDefaults.DEFAULT || moduleDefaults.CONTINUOUS;
  if (!selected) {
    return pipeline(pricingModule, variant, [
      stage('MQL', 'Entrada', 'intake', 10),
      stage('Pricing', 'Precificacao', 'pricing', 20, 'slate', 50),
      stage('Sent', 'Proposta Enviada', 'proposal', 30, 'blue', 70),
      stage('Won', 'Ganho', 'won', 40, 'emerald', 100),
      stage('Lost', 'Perdido', 'lost', 50, 'red', 0, { visibleInKanban: false })
    ]);
  }
  return {
    ...selected,
    stages: selected.stages.map(item => ({ ...item }))
  };
};

const isActiveDefaultStage = (stageConfig?: SalesPipelineStageConfig) =>
  !!stageConfig && stageConfig.active !== false && !['won', 'lost'].includes(stageConfig.category);

export const normalizeSalesPipelineConfig = (
  input: Partial<SalesPipelineConfig> | undefined,
  pricingModule: PricingModuleId,
  variant: PipelineVariant
): SalesPipelineConfig => {
  const base = getDefaultSalesPipeline(pricingModule, variant);
  const inputStages = Array.isArray(input?.stages) ? input!.stages : [];
  const inputById = new Map(inputStages.filter(item => item?.id).map(item => [item.id, item]));
  const baseIds = new Set(base.stages.map(item => item.id));

  const mergedBaseStages = base.stages.map(baseStage => {
    const override = inputById.get(baseStage.id);
    const category = override?.category || baseStage.category;
    return {
      ...baseStage,
      ...override,
      id: baseStage.id,
      label: override?.label?.trim() || baseStage.label,
      category,
      order: Number.isFinite(Number(override?.order)) ? Number(override?.order) : baseStage.order,
      active: override?.active ?? baseStage.active,
      visibleInKanban: override?.visibleInKanban ?? baseStage.visibleInKanban,
      locked: baseStage.locked || override?.locked || category === 'won' || category === 'lost',
      colorToken: override?.colorToken || baseStage.colorToken || categoryColor[category],
      probability: Number.isFinite(Number(override?.probability)) ? Number(override?.probability) : baseStage.probability
    };
  });

  const customStages = inputStages
    .filter(item => item?.id && !baseIds.has(item.id))
    .map((item, index) => {
      const category = item.category && item.category !== 'won' && item.category !== 'lost'
        ? item.category
        : 'negotiation';
      return {
        id: item.id,
        label: item.label?.trim() || item.id,
        category,
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : 45 + index,
        active: item.active !== false,
        visibleInKanban: item.visibleInKanban !== false,
        locked: false,
        colorToken: item.colorToken || categoryColor[category],
        probability: Number.isFinite(Number(item.probability)) ? Number(item.probability) : 50
      };
    });

  const stages = [...mergedBaseStages, ...customStages]
    .map(item => ({
      ...item,
      probability: Math.max(0, Math.min(100, Number(item.probability || 0)))
    }))
    .sort((a, b) => a.order - b.order);

  const stageById = new Map(stages.map(item => [item.id, item]));
  const wonStageId = stageById.has(input?.wonStageId || '') ? input!.wonStageId! : base.wonStageId;
  const lostStageId = stageById.has(input?.lostStageId || '') ? input!.lostStageId! : base.lostStageId;
  const requestedDefault = input?.defaultStageId && stageById.get(input.defaultStageId);
  const baseDefault = stageById.get(base.defaultStageId);
  const firstActive = stages.find(isActiveDefaultStage);

  return {
    pricingModule,
    variant,
    stages,
    defaultStageId: isActiveDefaultStage(requestedDefault)
      ? requestedDefault!.id
      : isActiveDefaultStage(baseDefault)
        ? baseDefault!.id
        : firstActive?.id || base.defaultStageId,
    wonStageId,
    lostStageId
  };
};

export const normalizeModulePipelines = (
  pricingModule: PricingModuleId,
  pipelines?: Partial<Record<PipelineVariant, SalesPipelineConfig>>
): Partial<Record<PipelineVariant, SalesPipelineConfig>> => {
  const normalized: Partial<Record<PipelineVariant, SalesPipelineConfig>> = {};
  getPipelineVariantsForPricingModule(pricingModule).forEach(variant => {
    normalized[variant] = normalizeSalesPipelineConfig(pipelines?.[variant], pricingModule, variant);
  });
  return normalized;
};

export const getPricingModuleForProposal = (proposal: ProposalData): PricingModuleId => {
  if (isPricingModuleId(proposal.pricingModule)) return proposal.pricingModule;
  if (proposal.type === 'PRODUCT') {
    return proposal.saasPlanName || proposal.saasUnitPrice || proposal.saasQuantity
      ? 'SAAS_SUBSCRIPTION'
      : 'PRODUCT_SALES';
  }
  return 'SERVICES_COMPLEX';
};

export const getPipelineVariantForProposal = (proposal: ProposalData): PipelineVariant => {
  const pricingModule = getPricingModuleForProposal(proposal);
  if (pricingModule === 'SERVICES_COMPLEX') return proposal.type === 'SPOT' ? 'SPOT' : 'CONTINUOUS';
  return 'DEFAULT';
};

export const getSalesPipelineFromConfig = (
  tenantConfig: ProposalData,
  pricingModule: PricingModuleId,
  variant: PipelineVariant
): SalesPipelineConfig => {
  const moduleConfig = tenantConfig.pricingModules?.[pricingModule] as { pipelines?: Partial<Record<PipelineVariant, SalesPipelineConfig>> } | undefined;
  return normalizeSalesPipelineConfig(moduleConfig?.pipelines?.[variant], pricingModule, variant);
};

export const getSalesPipelineForProposal = (
  proposal: ProposalData,
  tenantConfig: ProposalData
): SalesPipelineConfig => {
  const pricingModule = getPricingModuleForProposal(proposal);
  const variant = getPipelineVariantForProposal(proposal);
  return getSalesPipelineFromConfig(tenantConfig, pricingModule, variant);
};

export const getSalesPipelineForCreation = (
  tenantConfig: ProposalData,
  pricingModule: PricingModuleId,
  type: ProposalType
): SalesPipelineConfig => {
  const variant = pricingModule === 'SERVICES_COMPLEX'
    ? (type === 'SPOT' ? 'SPOT' : 'CONTINUOUS')
    : 'DEFAULT';
  return getSalesPipelineFromConfig(tenantConfig, pricingModule, variant);
};

export const getSalesPipelineOptions = (
  enabledModules: TenantModule[] = [],
  businessUnit?: 'SERVICES' | 'PRODUCTS'
): SalesPipelineOption[] =>
  getEnabledPricingModules(enabledModules, businessUnit).flatMap(pricingModule => {
    const definition = getPricingModuleDefinition(pricingModule);
    return getPipelineVariantsForPricingModule(pricingModule).map(variant => {
      const variantLabel = PIPELINE_VARIANT_LABELS[variant];
      const label = pricingModule === 'SERVICES_COMPLEX'
        ? variantLabel
        : definition?.shortLabel || definition?.label || pricingModule;
      return {
        key: getPipelineOptionKey(pricingModule, variant),
        pricingModule,
        variant,
        label,
        shortLabel: label,
        proposalType: pricingModule === 'SERVICES_COMPLEX'
          ? (variant === 'SPOT' ? 'SPOT' : 'CONTINUOUS')
          : 'PRODUCT'
      };
    });
  });

export const getPipelineOptionForProposal = (proposal: ProposalData) =>
  getPipelineOptionKey(getPricingModuleForProposal(proposal), getPipelineVariantForProposal(proposal));

export const getPipelineStage = (
  pipelineConfig: SalesPipelineConfig,
  stageId?: PipelineStageId
) => pipelineConfig.stages.find(item => item.id === stageId);

export const getPipelineStageLabel = (
  pipelineConfig: SalesPipelineConfig,
  stageId?: PipelineStageId,
  fallback = 'Etapa'
) => getPipelineStage(pipelineConfig, stageId)?.label || stageId || fallback;

export const getPipelineStageCategory = (
  stageId: PipelineStageId,
  pipelineConfig?: SalesPipelineConfig
): PipelineStageCategory => {
  const stageConfig = pipelineConfig ? getPipelineStage(pipelineConfig, stageId) : undefined;
  if (stageConfig?.category) return stageConfig.category;
  if (stageId === 'Won') return 'won';
  if (stageId === 'Lost') return 'lost';

  for (const modulePipelines of Object.values(DEFAULT_SALES_PIPELINES)) {
    for (const defaultPipeline of Object.values(modulePipelines)) {
      const defaultStage = defaultPipeline?.stages.find(item => item.id === stageId);
      if (defaultStage) return defaultStage.category;
    }
  }

  return 'negotiation';
};

export const isWonStage = (stageId: PipelineStageId, pipelineConfig?: SalesPipelineConfig) =>
  stageId === (pipelineConfig?.wonStageId || 'Won') || getPipelineStageCategory(stageId, pipelineConfig) === 'won';

export const isLostStage = (stageId: PipelineStageId, pipelineConfig?: SalesPipelineConfig) =>
  stageId === (pipelineConfig?.lostStageId || 'Lost') || getPipelineStageCategory(stageId, pipelineConfig) === 'lost';

export const isClosedStage = (stageId: PipelineStageId, pipelineConfig?: SalesPipelineConfig) =>
  isWonStage(stageId, pipelineConfig) || isLostStage(stageId, pipelineConfig);

export const getPipelineStageStyle = (stageConfig?: SalesPipelineStageConfig) =>
  PIPELINE_STAGE_STYLES[stageConfig?.colorToken || 'slate'] || PIPELINE_STAGE_STYLES.slate;

export const getKanbanStagesForPipeline = (
  pipelineConfig: SalesPipelineConfig,
  proposals: ProposalData[] = []
): SalesPipelineStageConfig[] => {
  const visibleStages = pipelineConfig.stages
    .filter(item => item.active && item.visibleInKanban)
    .sort((a, b) => a.order - b.order);
  const visibleIds = new Set(visibleStages.map(item => item.id));
  const knownIds = new Set(pipelineConfig.stages.map(item => item.id));
  const legacyStages: SalesPipelineStageConfig[] = [];

  proposals.forEach(proposal => {
    if (!proposal.stage || visibleIds.has(proposal.stage) || isLostStage(proposal.stage, pipelineConfig)) return;
    const knownStage = knownIds.has(proposal.stage) ? getPipelineStage(pipelineConfig, proposal.stage) : undefined;
    if (!legacyStages.some(item => item.id === proposal.stage)) {
      legacyStages.push({
        id: proposal.stage,
        label: knownStage ? `Etapa legada: ${knownStage.label}` : `Etapa legada: ${proposal.stage}`,
        category: knownStage?.category || getPipelineStageCategory(proposal.stage, pipelineConfig),
        order: 900 + legacyStages.length,
        active: false,
        visibleInKanban: true,
        locked: true,
        colorToken: knownStage?.colorToken || 'slate',
        probability: knownStage?.probability ?? 0
      });
    }
  });

  return [...visibleStages, ...legacyStages];
};

export const mapStageBetweenPipelines = (
  stageId: PipelineStageId,
  fromPipeline: SalesPipelineConfig,
  toPipeline: SalesPipelineConfig
): PipelineStageId => {
  if (isWonStage(stageId, fromPipeline)) return toPipeline.wonStageId;
  if (isLostStage(stageId, fromPipeline)) return toPipeline.lostStageId;
  if (toPipeline.stages.some(item => item.id === stageId && item.active)) return stageId;

  const category = getPipelineStageCategory(stageId, fromPipeline);
  const sameCategory = toPipeline.stages
    .filter(item => item.active && !isClosedStage(item.id, toPipeline))
    .sort((a, b) => a.order - b.order)
    .find(item => item.category === category);

  return sameCategory?.id || toPipeline.defaultStageId;
};
