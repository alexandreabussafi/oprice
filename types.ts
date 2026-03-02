export type AccountClassification = 'Lead' | 'Prospect' | 'Client';

export interface Client {
  id: string;
  name: string;
  cnpj?: string;
  industry?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  location?: string;
  status: 'Active' | 'Inactive';
  classification?: AccountClassification;
  segment?: string;
  subSegment?: string;
  corporateGroup?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  legalName?: string;
  tradeName?: string;
  registrationStatus?: string;
  stateRegistration?: string;
}

export interface Contact {
  id: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  influenceLevel: 'Decision Maker' | 'Influencer' | 'Evaluator' | 'User';
  linkedin?: string;
}

export interface CRMTask {
  id: string;
  clientId?: string;
  proposalId?: string;
  contactId?: string;
  assignee?: string; // NOVO: Responsável pela tarefa
  title: string;
  description: string;
  type: 'Meeting' | 'Call' | 'Email' | 'Follow-up' | 'Other';
  status: 'To Do' | 'In Progress' | 'Done';
  dueDate: string; // ISO date string
  createdAt: string;
}

export interface CanvasSection {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string; // Hex color or class ID for background
}

export interface CanvasDecoration {
  id: string;
  type: 'factory' | 'tools' | 'truck' | 'user' | 'alert' | 'box' | 'flame' | 'zap' | 'skull' | 'biohazard';
  x: number;
  y: number;
  scale: number;
  label?: string;
}

export type ConnectionSide = 'top' | 'right' | 'bottom' | 'left';

export interface Role {
  id: string;
  parentId?: string; // ID do cargo supervisor (para Organograma)

  // Connection Preferences (Optional - for visual persistence if needed later)
  parentSourceSide?: ConnectionSide;
  childTargetSide?: ConnectionSide;

  title: string;
  category: 'Operational' | 'Administrative';
  quantity: number;
  baseSalary: number;
  additionalHazard: boolean; // Insalubridade (20%)
  additionalDanger: boolean; // Periculosidade (30%)
  // Canvas Coordinates & Style
  x?: number;
  y?: number;
  color?: string; // Card header color
}

export interface ExpenseItem {
  id: string;
  name: string;
  category: 'EPI' | 'Tools' | 'Vehicles' | 'Consumables' | 'IT';
  unitPrice: number;
  lifespan: number; // In months
  allocation: 'Fixed' | 'PerHead';
}

export interface CapexItem {
  id: string;
  name: string;
  category: 'Machine' | 'Vehicle' | 'IT' | 'Furniture' | 'Other';
  value: number; // Purchase Value
  purchaseMonth: number; // Month 0 is upfront
  paymentTerm: 'UPFRONT' | 'INSTALLMENTS';
  installments?: number; // E.g., 12x
  lifespanMonths: number; // For linear depreciation
}


export interface BenefitsConfig {
  healthInsurance: number;
  healthInsuranceDependentFactor: number;
  foodAllowance: number; // VA
  mealAllowance: number; // VR
  transportAllowance: number; // VT/VC
  hasCafeteria: boolean; // Zera VR
}

// Novos Tipos para Segurança e Suporte
export interface SafetyItem {
  id: string;
  nrCode: string; // ex: 'NR-35'
  name: string;
  active: boolean;
  costPerHead: number; // Custo de Treinamento/Exame por pessoa
  frequencyMonths: number; // Validade do treinamento (ex: 24 meses)
}

export interface SupportItem {
  id: string;
  description: string; // ex: 'Visita Gestor Operacional'
  frequency: 'Weekly' | 'Biweekly' | 'Monthly' | 'Quarterly';
  costPerVisit: number;
  quantity: number; // Qtd de visitas no período
}

// --- NOVOS TIPOS PARA KITS PADRÃO ---
export interface KitItemTemplate {
  id: string;
  name: string;
  unitPrice: number;
  lifespan: number;
  category: ExpenseItem['category'];
}

export interface KitTemplate {
  id: string;
  name: string;
  icon: 'HardHat' | 'TrendingUp' | 'Wand2' | 'Package' | 'Wrench' | 'Truck' | 'Monitor';
  description: string;
  items: KitItemTemplate[];
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadDate: string;
}

export interface ChargeComponent {
  id: string;
  name: string;
  value: number; // percentage (e.g. 0.20 for 20%)
}

export interface TaxItem {
  id: string;
  name: string;
  rate: number; // percentage
  active: boolean;
  type: 'SALES' | 'INCOME'; // SALES = Gross Up; INCOME = Profit Deduction
  isServiceTax?: boolean; // Identify ISS/Service taxes for specific overrides
}

// --- CONFIGURAÇÃO CONTÁBIL (PLANO DE CONTAS) ---
export interface AccountingAccount {
  code: string; // ex: "3.1.01"
  name: string; // ex: "Receita Bruta de Serviços"
  type: 'CREDIT' | 'DEBIT';
}

export interface AccountingMapping {
  revenueAccount: AccountingAccount;
  deductionTaxesAccount: AccountingAccount; // Impostos s/ Venda
  directLaborAccount: AccountingAccount; // Salários
  laborChargesAccount: AccountingAccount; // Encargos
  laborProvisionsAccount: AccountingAccount; // Provisões (Férias/13o)
  operationalCostsAccount: AccountingAccount; // Materiais/EPIs
  safetyCostsAccount: AccountingAccount; // SMS
  supportCostsAccount: AccountingAccount; // Overhead
  marginAccount: AccountingAccount; // Lucro
  financialResultAccount: AccountingAccount; // Resultado Financeiro
  depreciationAccount?: AccountingAccount; // CAPEX Depreciation
}

export interface TaxConfig {
  regime: 'Lucro Real' | 'Lucro Presumido';
  calculationMode: 'NORMATIVE' | 'COMMERCIAL'; // NORMATIVE = Sales Tax only in Gross Up; COMMERCIAL = Sales + Income in Gross Up

  socialChargesRate: number;
  chargesBreakdown: {
    groupA: ChargeComponent[];
    groupB: ChargeComponent[];
    groupC: ChargeComponent[];
    groupD: ChargeComponent[];
  };

  salesTaxes: TaxItem[]; // PIS, COFINS, ISS, etc.
  incomeTaxes: TaxItem[]; // IRPJ, CSLL

  revenueTaxesRate: number; // Deprecated/Read-only sum
}

export interface ProposalDocuments {
  clientMemo: string; // O que o cliente pediu (informal)
  deliverables: string; // O que será entregue (formal)
  clientBudget?: number; // Target Price do cliente para Gap Analysis
  technicalAssumptions: string; // Premissas técnicas
  technicalNumber?: string; // Novo: Número da solicitação técnica
  attachments: Attachment[]; // Novo: Arquivos anexados
}

export type ContinuousStage = 'MQL' | 'Qualification' | 'SolutionDesign' | 'Pricing' | 'Sent' | 'Negotiation' | 'Review' | 'Won' | 'Lost';
export type SpotStage = 'MQL' | 'Diagnosis' | 'Pricing' | 'Sent' | 'FinalAdjustments' | 'AwaitingPO' | 'Won' | 'Lost';

export type OpportunityStage = ContinuousStage | SpotStage;
export type OpportunityStatus = 'Active' | 'Frozen' | 'Archived';
export type OpportunityMotion = 'NewBusiness' | 'Renewal' | 'Expansion' | 'Addendum' | 'Reactivation';

export type ProposalVersionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export type AppRole = 'ADMIN' | 'SELLER' | 'MANAGER';

export type ProposalStatus = OpportunityStage; // Alias for compatibility during migration

export type PricingModel = 'MARKUP' | 'MARGIN';

export type ProposalType = 'CONTINUOUS' | 'SPOT';

export const CONTINUOUS_STAGES: ContinuousStage[] = [
  'MQL',
  'Qualification',
  'SolutionDesign',
  'Pricing',
  'Sent',
  'Negotiation',
  'Review',
  'Won',
  'Lost'
];

export const SPOT_STAGES: SpotStage[] = [
  'MQL',
  'Diagnosis',
  'Pricing',
  'Sent',
  'FinalAdjustments',
  'AwaitingPO',
  'Won',
  'Lost'
];

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  MQL: 'MQL/Lead',
  Qualification: 'Qualificação',
  SolutionDesign: 'Desenho de Solução',
  Pricing: 'Precificação',
  Sent: 'Proposta Enviada',
  Negotiation: 'Negociação',
  Review: 'Em Revisão',
  Won: 'Vencida (Won)',
  Lost: 'Perdida (Lost)',
  Diagnosis: 'Diagnóstico',
  FinalAdjustments: 'Ajustes Finais',
  AwaitingPO: 'Aguardando PO'
};

export const CONTINUOUS_TO_SPOT_MAPPING: Record<ContinuousStage, SpotStage> = {
  MQL: 'MQL',
  Qualification: 'Diagnosis',
  SolutionDesign: 'Diagnosis',
  Pricing: 'Pricing',
  Sent: 'Sent',
  Negotiation: 'FinalAdjustments',
  Review: 'AwaitingPO',
  Won: 'Won',
  Lost: 'Lost'
};

export const SPOT_TO_CONTINUOUS_MAPPING: Record<SpotStage, ContinuousStage> = {
  MQL: 'MQL',
  Diagnosis: 'Qualification',
  Pricing: 'Pricing',
  Sent: 'Sent',
  FinalAdjustments: 'Negotiation',
  AwaitingPO: 'Review',
  Won: 'Won',
  Lost: 'Lost'
};

// --- SPOT SPECIFIC TYPES ---
export interface SpotResource {
  id: string;
  roleName: string; // Consultor Senior, Tecnico Lub, etc.
  quantity: number;
  days: number;
  dailyRateCost: number; // Custo diária do profissional (com encargos simplificados)
}

export interface SpotExpense {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
  category: 'Travel' | 'Lodging' | 'Meals' | 'Materials' | 'Other';
}

export interface SpotServiceType {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string; // ISO date string
  completed: boolean;
  notes?: string;
}

export interface ProposalData {
  id: string; // Internal UUID
  proposalId: string; // Human readable ID (e.g. 180256)
  version: number; // 1, 2, 3...
  versionNotes?: string; // Motivo da nova versão
  versionStatus: ProposalVersionStatus; // Controle de edição/envio
  isCurrentVersion: boolean; // Histórico no Kanban
  type: ProposalType; // NOVO: Tipo de Proposta

  milestones?: Milestone[]; // Prazos e eventos

  createdAt: string;
  updatedAt: string;

  // New CRM Fields
  expirationDate: string; // Data de validade da proposta
  responsible: string; // Quem fez a precificação

  clientId?: string; // Link to Client Registry
  clientName: string; // Snapshot or fallback

  // NEW CRM ARCHITECTURE
  stage: OpportunityStage;
  status: OpportunityStatus; // Transversal (Active, Frozen, etc)
  frozenReason?: string;
  frozenUntil?: string;

  // Roles & Approvals
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalRequestedBy?: string;
  approvedBy?: string;
  approvalJustification?: string;
  motion: OpportunityMotion;

  // Reference for Motions other than NewBusiness
  referenceOpportunityId?: string;
  expansionType?: 'Volume' | 'Scope' | 'Site';

  /** @deprecated use stage instead */
  proposalStatus?: OpportunityStage;
  /** @deprecated legacy field, will be removed after migration */
  status_legacy?: string;


  // CRM Data
  probability: number; // 0-100%
  value: number; // Snapshot of the total value

  // Pricing Data
  pricingModel?: PricingModel; // 'MARKUP' (Sobre Custo) ou 'MARGIN' (Sobre Venda/Numerador)
  markup: number; // Used for calculation (effective markup)
  targetMargin?: number; // Used for UI input when pricingModel === 'MARGIN'

  financialCostRate: number;
  contingencyRate: number;

  // --- PROJECT TIMELINE & FINANCE ---
  contractStartDate?: string; // Data de início do contrato (YYYY-MM-DD)
  mobilizationMonths: number; // Meses antes do início (ex: 1)
  contractDuration: number; // Padrão 12 meses

  paymentTermDays: number; // Prazo de recebimento (ex: 30, 45, 60)
  supplierPaymentTermDays: number; // Prazo médio pagto fornecedores
  payrollCashFlowDay: number; // Dia do mês para pagamento de folha (ex: 5)

  wacc: number; // Weighted Average Cost of Capital (TMA do Projeto) anual

  // --- LOCAL OVERRIDES ---
  issTaxOverride?: number; // Se definido, substitui a taxa de ISS global (ex: 0.02)

  // CONTINUOUS SPECIFIC
  roles: Role[];
  sections?: CanvasSection[]; // Background Areas/Lanes
  decorations?: CanvasDecoration[]; // Icons and visual elements
  expenses: ExpenseItem[];
  safetyCosts: SafetyItem[]; // NRs, Treinamentos
  supportCosts: SupportItem[]; // Overhead, Visitas de Gestão
  benefitsConfig?: BenefitsConfig; // NOVO: Configuração Global de Benefícios

  // SPOT SPECIFIC (NOVO)
  spotServiceIds?: string[]; // IDs dos serviços selecionados
  spotResources?: SpotResource[];
  spotExpenses?: SpotExpense[];

  // CAPEX
  capexItems?: CapexItem[];
  includeResidualValueInNPV?: boolean; // Se verdadeiro, o valor não depreciado do CAPEX retorna como caixa no VPL

  // Configuração de Kits (Geralmente preenchido apenas no GlobalConfig)
  kitTemplates?: KitTemplate[];

  taxConfig: TaxConfig;

  // Configuração Contábil Global (Injetada)
  accountingConfig?: AccountingMapping;

  // Documentation & Analysis
  documents: ProposalDocuments;
}

export interface CalculatedFinancials {
  totalLaborCost: number;
  totalOperationalCost: number; // Materiais e Despesas
  totalSafetyCost: number; // Treinamentos e Exames
  totalSupportCost: number; // Overhead de Gestão
  totalDepreciationCost: number; // Sum of monthly depreciation for CAPEX

  totalDirectCost: number; // Soma de tudo acima


  totalIndirectCost: number; // Financial + Contingency
  totalCostBase: number; // Direct + Indirect

  markupAmount: number; // Result. Operacional (Contábil Final)
  netRevenue: number; // Preço sem impostos
  grossRevenue: number; // Preço Final

  // --- NEW FIELDS ---
  contributionMarginAmount: number; // Margem Operacional (Net Revenue - Direct Costs)
  contributionMarginPercent: number;

  operationalProfitAmount: number; // EBIT/EBITDA proxy (Contribution - Contingency/Overhead)
  operationalMarginPercent: number; // % da Margem Operacional sobre Venda Bruta

  salesTaxAmount: number; // Impostos da Nota
  incomeTaxAmount: number; // Estimativa de IRPJ/CSLL

  grossMarginPercent: number; // Margem Contábil
  netProfitAmount: number; // Resultado Líquido Final Estimado
  netProfitPercent: number;

  monthlyValue: number;
  annualValue: number;
}
