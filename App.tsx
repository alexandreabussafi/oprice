
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Team from './pages/Team';
import Costs from './pages/Costs';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import Taxes from './pages/Taxes';
import CRM from './pages/CRM';
import Documents from './pages/Documents';
import Clients from './pages/Clients';
import GlobalSettings from './pages/GlobalSettings';
import Safety from './pages/Safety';
import Support from './pages/Support';
import SpotEditor from './pages/SpotEditor'; // Import New Component
import Help from './pages/Help';
import Analytics from './pages/Analytics';
import Contacts from './pages/Contacts';
import Tasks from './pages/Tasks';
import ProductEditor from './pages/ProductEditor'; // NOVO: Módulo de Produtos
import SaasSubscriptionEditor from './pages/SaasSubscriptionEditor';
import { Client, ProposalData, OpportunityStage, OpportunityStatus, OpportunityMotion, ProposalType, KitTemplate, ExpenseItem, ProposalVersionStatus, AppRole, BusinessUnitAccess, Milestone, Contact, CRMTask, CatalogProduct, defaultAccounting, TimelineEvent, TenantModule, PricingModuleId, TaskAttachment, CRMCommunication, CRMCommunicationTriageStatus, CRMExternalEvent, GoogleConnectionStatus, GoogleEmailDraft, GoogleMeetingDraft, MicrosoftConnectionStatus, MicrosoftEmailDraft, MicrosoftMeetingDraft, MicrosoftTodoDraft, TenantActivityAction, TenantAuditEntityType } from './types';
import { calculateFinancials } from './utils/pricingEngine';
import { Moon, Sun, X } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import TenantEntry from './pages/TenantEntry';
import SuperAdminPortal from './pages/SuperAdminPortal';
import { IOT_TENANT_ID, LUBRIM_TENANT_ID, SAAS_TENANT_ID, useTenant } from './contexts/TenantContext';
import { crmRepository, isUuid } from './services/crmRepository';
import { googleWorkspaceService } from './services/googleWorkspaceService';
import { microsoftWorkspaceService } from './services/microsoftWorkspaceService';
import { getPersistenceErrorMessage, runSupabaseRequest } from './services/supabaseRequest';
import { auditRepository } from './services/auditRepository';
import { createDefaultProposalTemplates, mergeProposalTemplates } from './utils/proposalTemplates';
import { addDaysDateInput as addProposalFollowUpDays, buildProposalSendTemplateVariables, createDefaultProposalSendAutomationConfig, getDefaultProposalSendAutomationTemplate, normalizeProposalSendAutomation, renderProposalSendTemplate } from './utils/proposalSendAutomation';
import { applyPricingModuleDefaultsToProposal, withPricingModuleCompatibility } from './utils/pricingModuleAdapters';
import { getDefaultPricingModuleForBusinessUnit, getPricingModuleDefinition, getSafeEditorTabForProposal, isEditorTabAllowedForProposal, isPricingModuleEnabledForTenant, isPricingModuleId, tenantSupportsPricingBusinessUnit } from './utils/pricingModules';
import { getPricingModuleForProposal, getSalesPipelineForCreation, getSalesPipelineForProposal, isClosedStage, mapStageBetweenPipelines } from './utils/salesPipelines';

// Default Tax Config (The System Standard)
const defaultTaxConfig: ProposalData['taxConfig'] = {
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
      { id: 'a5', name: 'Salário Educação', value: 0.025 },
      { id: 'a6', name: 'FGTS', value: 0.08 },
      { id: 'a7', name: 'RAT + FAP', value: 0.03 },
      { id: 'a8', name: 'SEBRAE', value: 0.006 },
    ],
    groupB: [
      { id: 'b1', name: 'Férias', value: 0.1111 },
      { id: 'b2', name: '1/3 sobre Férias', value: 0.0370 },
      { id: 'b3', name: '13º Salário', value: 0.0833 },
      { id: 'b4', name: 'Ausências Legais / Feriados', value: 0.0636 },
    ],
    groupC: [
      { id: 'c1', name: 'Aviso Prévio Indenizado', value: 0.005 },
      { id: 'c2', name: 'Multa Rescisória FGTS', value: 0.04 },
    ],
    groupD: [
      { id: 'd1', name: 'Incidência A sobre B', value: 0.06 },
    ],
  },
  salesTaxes: [
    { id: 'pis', name: 'PIS', rate: 0.0165, active: true, type: 'SALES' },
    { id: 'cofins', name: 'COFINS', rate: 0.0760, active: true, type: 'SALES' },
    { id: 'iss', name: 'ISS', rate: 0.0500, active: true, type: 'SALES' }
  ],
  incomeTaxes: [
    { id: 'irpj', name: 'IRPJ', rate: 0.1500, active: true, type: 'INCOME' },
    { id: 'csll', name: 'CSLL', rate: 0.0900, active: true, type: 'INCOME' }
  ]
};

// --- INITIAL KITS CONFIGURATION ---
const defaultKits: KitTemplate[] = [
  {
    id: 'kit-basic',
    name: 'Kit EPI Básico',
    icon: 'HardHat',
    description: 'Capacete, Óculos, Botina, Luvas, Protetor Auricular e Uniforme.',
    items: [
      { id: 'k1', name: 'Capacete c/ Carneira', unitPrice: 45, lifespan: 12, category: 'EPI' },
      { id: 'k2', name: 'Óculos de Proteção', unitPrice: 15, lifespan: 6, category: 'EPI' },
      { id: 'k3', name: 'Botina de Segurança', unitPrice: 110, lifespan: 6, category: 'EPI' },
      { id: 'k4', name: 'Luva Pigmentada', unitPrice: 8, lifespan: 1, category: 'EPI' },
      { id: 'k5', name: 'Uniforme Completo', unitPrice: 180, lifespan: 6, category: 'EPI' }
    ]
  },
  {
    id: 'kit-tools-basic',
    name: 'Maleta Ferramentas Mec.',
    icon: 'Wrench',
    description: 'Jogo de chaves, alicates e chaves de fenda para manutenção básica.',
    items: [
      { id: 't1', name: 'Jogo Chaves Combinadas', unitPrice: 450, lifespan: 24, category: 'Tools' },
      { id: 't2', name: 'Alicate Universal', unitPrice: 85, lifespan: 12, category: 'Tools' },
      { id: 't3', name: 'Jogo Chaves Fenda/Phillips', unitPrice: 120, lifespan: 12, category: 'Tools' },
      { id: 't4', name: 'Martelo Bola', unitPrice: 60, lifespan: 24, category: 'Tools' }
    ]
  },
  {
    id: 'kit-vehicle-light',
    name: 'Veículo Leve (Uno/Gol)',
    icon: 'Truck',
    description: 'Locação e combustível para veículo de apoio administrativo.',
    items: [
      { id: 'v1', name: 'Locação Veículo Leve', unitPrice: 2200, lifespan: 1, category: 'Vehicles' },
      { id: 'v2', name: 'Combustível (Estimado)', unitPrice: 1200, lifespan: 1, category: 'Vehicles' },
      { id: 'v3', name: 'Manutenção / Pneus', unitPrice: 300, lifespan: 1, category: 'Vehicles' }
    ]
  }
];

const defaultLetterheadConfig: ProposalData['letterheadConfig'] = {
  logoUrl: '/oprice-logo-text-blue.png',
  primaryColor: '#0f172a',
  secondaryColor: '#047857',
  companyName: 'OPrice',
  companySlogan: 'Pricing System',
  addressLine1: 'Av. Industrial, 1000',
  addressLine2: 'São Paulo/SP - CEP 00000-000',
  cnpj: '00.000.000/0001-00',
  contactEmail: 'contato@opcapex.com.br',
  contactPhone: '(11) 9999-9999',
  website: 'www.opcapex.com.br'
};

const ensureHeadLink = (rel: string, href: string, type?: string) => {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
  if (type) link.type = type;
};

const ensureHeadMeta = (selector: string, attributes: Record<string, string>, content: string) => {
  let meta = document.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => meta!.setAttribute(key, value));
    document.head.appendChild(meta);
  }
  meta.content = content;
};

// Default Template for new proposals
const defaultProposalTemplate: ProposalData = {
  id: '',
  clientName: 'Novo Cliente',
  proposalId: '000000',
  version: 1,
  versionStatus: 'DRAFT',
  isCurrentVersion: true,
  type: 'CONTINUOUS', // Default
  stage: 'Pricing',
  status: 'Active',
  motion: 'NewBusiness',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  expirationDate: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(), // +15 days
  responsible: 'Admin OPrice',
  probability: 50,
  value: 0,
  pricingModel: 'MARKUP',
  markup: 0.25,
  targetMargin: 0.20, // Default equivalent to 25% Markup
  financialCostRate: 0.02,
  contingencyRate: 0.03,

  // Timeline Defaults
  mobilizationMonths: 1,
  contractDuration: 12,
  paymentTermDays: 30, // Prazo Recebimento
  supplierPaymentTermDays: 30, // Prazo Pagto Fornecedor
  payrollCashFlowDay: 5, // Dia do mês para pagamento de folha
  wacc: 0.12, // 12% a.a.

  documents: {
    clientMemo: '',
    deliverables: '',
    technicalAssumptions: '',
    technicalNumber: '',
    attachments: []
  },
  taxConfig: defaultTaxConfig, // Use the default config
  roles: [],
  expenses: [],
  safetyCosts: [], // Init empty
  supportCosts: [], // Init empty
  spotResources: [],
  spotExpenses: [],
  milestones: [],
  productLines: [], // NOVO: Vazio por padrão
};

// --- INITIAL PRODUCT CATALOG (MOCK ERP) ---
const initialProductCatalog: CatalogProduct[] = [
  { id: 'prod-001', name: 'Bomba de Engrenagem', description: 'Bomba de engrenagem 10GPM', costPrice: 2500, standardMargin: 0.35, category: 'Equipment' },
  { id: 'prod-002', name: 'Filtro Dessecante', description: 'Filtro dessecante de ar 1"', costPrice: 350, standardMargin: 0.45, category: 'Consumable' },
  { id: 'prod-003', name: 'Software Monitoramento', description: 'Licença anual software preditivo', costPrice: 1200, standardMargin: 0.60, category: 'Software' },
  { id: 'prod-004', name: 'Sensor de Vibração IOT', description: 'Sensor sem fio triaxial', costPrice: 850, standardMargin: 0.40, category: 'Equipment' },
  { id: 'prod-005', name: 'Unidade Hidráulica', description: 'Unidade 50L com trocador de calor', costPrice: 15000, standardMargin: 0.30, category: 'Equipment' },
];

const createTenantConfig = (
  tenantId: string,
  overrides: Partial<ProposalData> = {}
): ProposalData => withPricingModuleCompatibility({
  ...defaultProposalTemplate,
  id: `global-config-${tenantId}`,
  tenantId,
  clientName: 'Configuração Global',
  kitTemplates: defaultKits,
  letterheadConfig: defaultLetterheadConfig,
  productCatalog: initialProductCatalog,
  proposalTemplates: createDefaultProposalTemplates(defaultLetterheadConfig.companyName),
  proposalSendAutomation: createDefaultProposalSendAutomationConfig(),
  accountingConfig: defaultAccounting,
  productAccountingConfig: defaultAccounting,
  markup: 0.30,
  financialCostRate: 0.025,
  contingencyRate: 0.05,
  ...overrides
});

const createInitialTenantConfigs = (): Record<string, ProposalData> => ({
  [LUBRIM_TENANT_ID]: createTenantConfig(LUBRIM_TENANT_ID, {
    letterheadConfig: {
      ...defaultLetterheadConfig,
      companyName: 'Lubrim',
      companySlogan: 'Serviços industriais especializados'
    }
  }),
  [SAAS_TENANT_ID]: createTenantConfig(SAAS_TENANT_ID, {
    pricingModule: 'SAAS_SUBSCRIPTION',
    markup: 0.20,
    targetMargin: 0.35,
    letterheadConfig: {
      ...defaultLetterheadConfig,
      companyName: 'Software SaaS',
      companySlogan: 'Soluções digitais por assinatura',
      website: 'www.software-saas.com.br'
    },
    productCatalog: [
      { id: 'saas-001', name: 'Plano Professional', description: 'Assinatura mensal por usuário', costPrice: 35, standardMargin: 0.70, category: 'Software', unit: 'USER' },
      { id: 'saas-002', name: 'Setup Implantação', description: 'Serviço inicial de configuração e onboarding', costPrice: 1200, standardMargin: 0.45, category: 'Software', unit: 'UN' }
    ]
  }),
  [IOT_TENANT_ID]: createTenantConfig(IOT_TENANT_ID, {
    pricingModule: 'IOT_SUBSCRIPTION',
    markup: 0.25,
    targetMargin: 0.40,
    letterheadConfig: {
      ...defaultLetterheadConfig,
      companyName: 'Sensores & Monitoramento',
      companySlogan: 'Monitoramento industrial recorrente',
      website: 'www.sensores-monitoramento.com.br'
    },
    productCatalog: [
      { id: 'iot-001', name: 'Sensor Triaxial Wireless', description: 'Sensor para monitoramento contínuo', costPrice: 850, standardMargin: 0.40, category: 'Equipment', unit: 'UN' },
      { id: 'iot-002', name: 'Mensalidade Monitoramento', description: 'Portal, alertas e análise mensal por ponto', costPrice: 45, standardMargin: 0.65, category: 'Software', unit: 'PONTO' },
      { id: 'iot-003', name: 'Instalação Técnica', description: 'Instalação e comissionamento em campo', costPrice: 900, standardMargin: 0.35, category: 'Other', unit: 'DIA' }
    ]
  })
});

// Initial Mock Clients
const initialClients: Client[] = [
  { id: 'c1', name: 'Electrolux do Brasil', industry: 'Eletrodomésticos', status: 'Active', location: 'Curitiba - PR', cnpj: '00.000.000/0001-91', contactName: 'Ricardo Souza', email: 'ricardo.souza@electrolux.com', phone: '(41) 3333-9999', classification: 'Client', segment: 'Indústria Têxtil e Bens de Consumo', subSegment: 'Fabricação de Eletrodomésticos', corporateGroup: 'Grupo Electrolux' },
  { id: 'c2', name: 'Klabin S.A.', industry: 'Papel e Celulose', status: 'Active', location: 'Telêmaco Borba - PR', cnpj: '89.637.490/0001-45', contactName: 'Mariana Oliveira', email: 'compras@klabin.com.br', phone: '(42) 3271-0000', classification: 'Client', segment: 'Papel, Celulose e Madeira', subSegment: 'Fabricação de Papel' },
  { id: 'c3', name: 'Gerdau', industry: 'Siderurgia', status: 'Active', location: 'Sapucaia do Sul - RS', cnpj: '33.611.500/0001-19', contactName: 'Fernando Torres', email: 'ftorres@gerdau.com.br', phone: '(51) 3455-0000', classification: 'Prospect', segment: 'Mineração e Metalurgia', subSegment: 'Siderurgia', corporateGroup: 'Grupo Gerdau' },
  { id: 'c4', name: 'Votorantim Cimentos', industry: 'Cimento', status: 'Inactive', location: 'São Paulo - SP', cnpj: '01.637.895/0001-32', contactName: 'Juliana Mendes', email: 'jmendes@vcimentos.com', phone: '(11) 2111-0000', classification: 'Lead', segment: 'Construção Cível', corporateGroup: 'Grupo Votorantim' }
];

// Initial Mock Contacts
const initialContacts: Contact[] = [
  { id: 'cont1', clientId: 'c1', name: 'Ricardo Souza', email: 'ricardo.souza@electrolux.com', phone: '(41) 3333-9999', role: 'Gerente de Manutenção', influenceLevel: 'Decision Maker', linkedin: 'https://linkedin.com/in/ricardosouza' },
  { id: 'cont2', clientId: 'c1', name: 'Amanda Correia', email: 'amanda.correia@electrolux.com', phone: '(41) 3333-9998', role: 'Compradora Pleno', influenceLevel: 'Evaluator' },
  { id: 'cont3', clientId: 'c2', name: 'Mariana Oliveira', email: 'compras@klabin.com.br', phone: '(42) 3271-0000', role: 'Diretora de Suprimentos', influenceLevel: 'Decision Maker', linkedin: 'https://linkedin.com/in/marioliveira' },
  { id: 'cont4', clientId: 'c3', name: 'Fernando Torres', email: 'ftorres@gerdau.com.br', phone: '(51) 3455-0000', role: 'Engenheiro Chefe', influenceLevel: 'Influencer' },
];

// Initial Mock Tasks
const initialTasks: CRMTask[] = [
  { id: 't1', clientId: 'c1', proposalId: 'mock-1', contactId: 'cont1', title: 'Apresentação da Proposta Técnica', description: 'Revisar escopo de lubrificação com a equipe e sanar dúvidas de segurança.', type: 'Meeting', status: 'In Progress', dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), createdAt: new Date().toISOString() },
  { id: 't2', clientId: 'c3', contactId: 'cont4', title: 'Follow-up Cotação Spot', description: 'Ligar para entender por que perdemos para a concorrência e pegar feedback de preço.', type: 'Call', status: 'To Do', dueDate: new Date(Date.now() + 86400000 * 5).toISOString(), createdAt: new Date().toISOString() },
  { id: 't3', clientId: 'c4', title: 'Enviar Apresentação Institucional', description: 'Mandar e-mail introductório sobre soluções de vibração.', type: 'Email', status: 'Done', dueDate: new Date(Date.now() - 86400000 * 2).toISOString(), createdAt: new Date().toISOString() },
];

// Initial Mock Data
const mockInitialProposals: ProposalData[] = [
  {
    ...defaultProposalTemplate,
    id: 'mock-1',
    clientId: 'c1',
    clientName: 'Electrolux - Unidade PR',
    proposalId: '180256',
    stage: 'Negotiation',
    status: 'Active',
    motion: 'NewBusiness',
    type: 'CONTINUOUS',
    versionStatus: 'SUBMITTED',
    isCurrentVersion: true,
    version: 1,
    value: 45000,
    createdAt: new Date('2023-10-15').toISOString(),
    expirationDate: new Date('2023-10-30').toISOString(),
    responsible: 'Carlos Mendes',
    taxConfig: defaultTaxConfig,
    documents: {
      ...defaultProposalTemplate.documents,
      clientMemo: 'Cliente solicita equipe dedicada para lubrificação e manutenção de redutores.',
      deliverables: 'Equipe de 5 técnicos, ferramental completo e gestão de EPIs.'
    },
    roles: [
      { id: '1', title: 'Líder de Equipe', category: 'Operational', quantity: 1, baseSalary: 2300, additionalHazard: true, additionalDanger: false },
      { id: '2', title: 'Lubrificador', category: 'Operational', quantity: 3, baseSalary: 1800, additionalHazard: true, additionalDanger: false },
      { id: '3', title: 'Mecânico Industrial', category: 'Operational', quantity: 1, baseSalary: 2000, additionalHazard: true, additionalDanger: false },
      { id: '4', title: 'Coordenador Local', category: 'Administrative', quantity: 0.5, baseSalary: 5000, additionalHazard: false, additionalDanger: false }
    ],
    expenses: [
      { id: '1', name: 'Capacete com carneira', unitPrice: 45, lifespan: 6, allocation: 'PerHead', category: 'EPI' },
      { id: '2', name: 'Óculos de Segurança', unitPrice: 15, lifespan: 3, allocation: 'PerHead', category: 'EPI' },
      { id: '3', name: 'Kit Ferramentas', unitPrice: 1200, lifespan: 12, allocation: 'Fixed', category: 'Tools' },
      { id: '4', name: 'Locação Caminhão Comboio', unitPrice: 520, lifespan: 1, allocation: 'Fixed', category: 'Vehicles' },
      { id: '5', name: 'Telefonia Móvel', unitPrice: 89, lifespan: 1, allocation: 'Fixed', category: 'IT' },
    ],
    safetyCosts: [
      { id: 's1', nrCode: 'NR-06', name: 'EPIs - Treinamento', active: true, costPerHead: 50, frequencyMonths: 12 },
      { id: 's2', nrCode: 'NR-35', name: 'Trabalho em Altura', active: true, costPerHead: 150, frequencyMonths: 24 }
    ],
    supportCosts: [
      { id: 'sup1', description: 'Visita Gestor Operacional', frequency: 'Biweekly', costPerVisit: 450, quantity: 2 }
    ]
  },
  {
    ...defaultProposalTemplate,
    id: 'mock-2',
    clientId: 'c2',
    clientName: 'Klabin - Projeto Puma',
    proposalId: '180299',
    stage: 'Won',
    status: 'Active',
    motion: 'Expansion',
    type: 'CONTINUOUS',
    versionStatus: 'APPROVED',
    isCurrentVersion: true,
    version: 3,
    value: 125000,
    createdAt: new Date('2023-09-01').toISOString(),
    expirationDate: new Date('2023-09-15').toISOString(),
    responsible: 'Ana Silva',
    taxConfig: defaultTaxConfig,
  },
  {
    ...defaultProposalTemplate,
    id: 'mock-3',
    clientId: 'c3',
    clientName: 'Gerdau Aços Longos',
    proposalId: '180305',
    stage: 'Lost',
    status: 'Active',
    motion: 'NewBusiness',
    type: 'SPOT',
    versionStatus: 'REJECTED',
    isCurrentVersion: true,
    version: 1,
    value: 12000,
    createdAt: new Date('2023-08-20').toISOString(),
    expirationDate: new Date('2023-09-05').toISOString(),
    responsible: 'Roberto Almeida',
    taxConfig: defaultTaxConfig,
  },
  {
    ...defaultProposalTemplate,
    id: 'mock-prod-1',
    clientId: 'c1',
    clientName: 'Electrolux - Almoxarifado',
    proposalId: 'PRD-1001',
    stage: 'Pricing',
    status: 'Active',
    motion: 'NewBusiness',
    type: 'PRODUCT',
    versionStatus: 'DRAFT',
    isCurrentVersion: true,
    version: 1,
    value: 5400,
    createdAt: new Date('2024-03-01').toISOString(),
    expirationDate: new Date('2024-03-15').toISOString(),
    responsible: 'Ana Silva',
    salesOrderNumber: 'OV-2024-001',
    clientPO: 'PO-998877',
    deliveryDeadline: '10 dias úteis',
    validity: '15 dias',
    deliveryAddress: 'Rua das Industrias, 500 - Curitiba/PR',
    billingAddress: '00.000.000/0001-91',
    shippingAddress: 'Almoxarifado Central - A/C Sr. Marcos',
    destinationState: 'PR',
    productLines: [
      {
        id: 'li-1',
        productId: 'prod-001',
        name: 'Bomba de Engrenagem',
        sku: 'BOMBA-G-10',
        ncm: '8413.60.11',
        quantity: 2,
        unit: 'UN',
        unitCost: 2500,
        icmsPercent: 0.12,
        ipiPercent: 0.05,
        overrideMargin: 0.35,
        finalPrice: 5200,
        total: 10400
      }
    ]
  },
  {
    ...defaultProposalTemplate,
    id: 'mock-prod-2',
    clientId: 'c2',
    clientName: 'Klabin - Manutenção Central',
    proposalId: 'PRD-1002',
    stage: 'Sent',
    status: 'Active',
    motion: 'Expansion',
    type: 'PRODUCT',
    versionStatus: 'SUBMITTED',
    isCurrentVersion: true,
    version: 1,
    value: 12500,
    createdAt: new Date('2024-02-25').toISOString(),
    expirationDate: new Date('2024-03-10').toISOString(),
    responsible: 'Carlos Mendes',
    salesOrderNumber: 'OV-2024-002',
    deliveryAddress: 'Fazenda Monte Alegre - Telêmaco Borba/PR',
    billingAddress: '89.637.490/0001-45',
    shippingAddress: 'Pátio de Cargas - Portão 4',
    destinationState: 'PR',
    productLines: [
      {
        id: 'li-2',
        productId: 'prod-005',
        name: 'Unidade Hidráulica',
        sku: 'UH-50L-TC',
        ncm: '8412.29.00',
        quantity: 1,
        unit: 'UN',
        unitCost: 15000,
        icmsPercent: 0.12,
        ipiPercent: 0,
        overrideMargin: 0.30,
        finalPrice: 21428.57,
        total: 21428.57
      }
    ]
  }
];

function App() {
  const { activeTenant, activeTenantId, memberships, tenantLoading, isPlatformSuperAdmin, clearTenantSelection } = useTenant();
  const [view, setView] = useState<'CRM' | 'EDITOR' | 'HELP' | 'SUPERADMIN'>('CRM');
  // --- THEME STATE ---
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('oprice-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('oprice-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('oprice-theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    console.log('Toggle Button Clicked!');
    setDarkMode(prev => !prev);
  };

  const [activeTab, setActiveTab] = useState('crm-dashboard');

  useEffect(() => {
    if (window.location.pathname.split('/').filter(Boolean)[0]?.toLowerCase() === 'superadmin') {
      setView('SUPERADMIN');
    }
  }, []);
  const [businessUnit, setBusinessUnit] = useState<'SERVICES' | 'PRODUCTS'>(() => {
    const saved = localStorage.getItem('oprice-business-unit');
    return (saved as 'SERVICES' | 'PRODUCTS') || 'SERVICES';
  });

  const resolveTenantBusinessUnit = (
    enabledModules: TenantModule[] = [],
    preferred?: 'SERVICES' | 'PRODUCTS'
  ): 'SERVICES' | 'PRODUCTS' => {
    const tenantSupportsServices = tenantSupportsPricingBusinessUnit(enabledModules, 'SERVICES');
    const tenantSupportsProducts = tenantSupportsPricingBusinessUnit(enabledModules, 'PRODUCTS');

    if (preferred === 'SERVICES' && tenantSupportsServices) return 'SERVICES';
    if (preferred === 'PRODUCTS' && tenantSupportsProducts) return 'PRODUCTS';
    if (!tenantSupportsServices && tenantSupportsProducts) return 'PRODUCTS';
    if (tenantSupportsServices && !tenantSupportsProducts) return 'SERVICES';
    return preferred || 'SERVICES';
  };

  useEffect(() => {
    if (activeTenant) {
      localStorage.setItem('oprice-business-unit', businessUnit);
    }
  }, [businessUnit, activeTenant]);

  const { session, loading, profile, signOut } = useAuth();
  const [currentUser, setCurrentUser] = useState<{ id: string, name: string, role: AppRole, allowed_types: BusinessUnitAccess[] }>({
    id: '',
    name: 'Convidado',
    role: 'SELLER',
    allowed_types: ['PRODUCTS', 'SERVICES']
  });

  useEffect(() => {
    if (profile) {
      setCurrentUser({
        id: profile.id,
        name: profile.full_name || profile.email?.split('@')[0] || 'Usuário',
        role: (memberships.find(m => m.tenantId === activeTenantId)?.role) || (isPlatformSuperAdmin ? 'SUPER_ADMIN' : profile.role),
        allowed_types: (memberships.find(m => m.tenantId === activeTenantId)?.allowed_types) || profile.allowed_types || ['PRODUCTS', 'SERVICES']
      });
      // Force business unit if they don't have access to BOTH
      const activeMembership = memberships.find(m => m.tenantId === activeTenantId);
      const enabledModules = activeTenant?.enabledModules || [];
      if (activeMembership?.allowed_types?.length === 1 && activeMembership.allowed_types[0] !== 'BOTH') {
        setBusinessUnit(resolveTenantBusinessUnit(enabledModules, activeMembership.allowed_types[0] as 'PRODUCTS' | 'SERVICES'));
      } else {
        setBusinessUnit(resolveTenantBusinessUnit(enabledModules, activeTenant?.defaultBusinessUnit));
      }
    }
  }, [profile, memberships, activeTenantId, activeTenant?.enabledModules, isPlatformSuperAdmin]);

  // --- PERSISTENCE ---
  // Master Data State (must be declared before any conditional returns)
  const [clients, setClients] = useState<Client[]>(() => initialClients.map(c => ({ ...c, tenantId: LUBRIM_TENANT_ID })));
  const [contacts, setContacts] = useState<Contact[]>(() => initialContacts.map(c => ({ ...c, tenantId: LUBRIM_TENANT_ID })));
  const [tasks, setTasks] = useState<CRMTask[]>(() => initialTasks.map(t => ({ ...t, tenantId: LUBRIM_TENANT_ID })));
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);
  const [communications, setCommunications] = useState<CRMCommunication[]>([]);
  const [externalEvents, setExternalEvents] = useState<CRMExternalEvent[]>([]);
  const [googleConnection, setGoogleConnection] = useState<GoogleConnectionStatus>({ connected: false, account: null });
  const [googleWorkspaceLoading, setGoogleWorkspaceLoading] = useState(false);
  const [microsoftConnection, setMicrosoftConnection] = useState<MicrosoftConnectionStatus>({ connected: false, account: null });
  const [microsoftWorkspaceLoading, setMicrosoftWorkspaceLoading] = useState(false);

  const [proposals, setProposals] = useState<ProposalData[]>(() => {
    return mockInitialProposals.map((p: any) => {
      let newStage = p.stage;
      let newStatus = p.status;
      if (['Won', 'Lost'].includes(p.status)) { newStage = p.status; newStatus = 'Active'; }
      if (['Canceled', 'OnHold'].includes(p.status)) { newStatus = p.status === 'OnHold' ? 'Frozen' : 'Archived'; }
      return { ...p, tenantId: p.tenantId || LUBRIM_TENANT_ID, stage: newStage, status: newStatus as OpportunityStatus, versionStatus: p.versionStatus || 'DRAFT', isCurrentVersion: p.isCurrentVersion !== undefined ? p.isCurrentVersion : true };
    });
  });
  const [crmDataLoading, setCrmDataLoading] = useState(false);
  const [crmSaving, setCrmSaving] = useState(false);
  const [crmDataError, setCrmDataError] = useState<string | null>(null);

  const [tenantConfigs, setTenantConfigs] = useState<Record<string, ProposalData>>(() => createInitialTenantConfigs());

  const resolvedTenantId = activeTenantId || LUBRIM_TENANT_ID;
  const globalConfig = tenantConfigs[resolvedTenantId] || createTenantConfig(resolvedTenantId);
  const tenantBranding = activeTenant?.branding || {};
  const brandedGlobalConfig: ProposalData = withPricingModuleCompatibility({
    ...globalConfig,
    proposalTemplates: mergeProposalTemplates(
      globalConfig.proposalTemplates,
      tenantBranding.companyName || tenantBranding.displayName || activeTenant?.name || globalConfig.letterheadConfig?.companyName
    ),
    letterheadConfig: {
      ...globalConfig.letterheadConfig,
      logoUrl: tenantBranding.logoUrl || globalConfig.letterheadConfig?.logoUrl || '/oprice-logo-text-blue.png',
      primaryColor: tenantBranding.primaryColor || globalConfig.letterheadConfig?.primaryColor || '#0f172a',
      secondaryColor: tenantBranding.secondaryColor || globalConfig.letterheadConfig?.secondaryColor || '#047857',
      companyName: tenantBranding.companyName || tenantBranding.displayName || activeTenant?.name || globalConfig.letterheadConfig?.companyName || 'OPrice'
    }
  });

  useEffect(() => {
    const tenantName = tenantBranding.displayName || tenantBranding.companyName || activeTenant?.name || 'OPrice';
    const tenantSlug = activeTenant?.slug || 'oprice';
    const tenantSlogan = tenantBranding.slogan || globalConfig.letterheadConfig?.companySlogan || 'Pricing System';
    const title = `${tenantName} | ${tenantSlug} - ${tenantSlogan}`;
    const faviconUrl = tenantBranding.faviconUrl || tenantBranding.logoUrl || '/pwa-icon-192.png';
    const themeColor = tenantBranding.primaryColor || globalConfig.letterheadConfig?.primaryColor || '#0f172a';

    document.title = title;
    ensureHeadMeta('meta[name="description"]', { name: 'description' }, `${tenantName} (${tenantSlug}) - ${tenantSlogan}`);
    ensureHeadMeta('meta[name="theme-color"]', { name: 'theme-color' }, themeColor);
    ensureHeadMeta('meta[name="apple-mobile-web-app-title"]', { name: 'apple-mobile-web-app-title' }, tenantName);
    ensureHeadLink('icon', faviconUrl);
    ensureHeadLink('shortcut icon', faviconUrl);
    ensureHeadLink('apple-touch-icon', faviconUrl);
  }, [
    activeTenant?.id,
    activeTenant?.slug,
    activeTenant?.name,
    tenantBranding.displayName,
    tenantBranding.companyName,
    tenantBranding.logoUrl,
    tenantBranding.faviconUrl,
    tenantBranding.primaryColor,
    tenantBranding.slogan,
    globalConfig.letterheadConfig?.logoUrl,
    globalConfig.letterheadConfig?.primaryColor,
    globalConfig.letterheadConfig?.companySlogan
  ]);

  const setGlobalConfig = async (config: ProposalData) => {
    const nextConfig = withPricingModuleCompatibility({
      ...config,
      tenantId: resolvedTenantId,
      proposalTemplates: mergeProposalTemplates(
        config.proposalTemplates,
        config.letterheadConfig?.companyName || activeTenant?.name
      )
    });
    const previousConfig = tenantConfigs[resolvedTenantId];
    setTenantConfigs(prev => ({
      ...prev,
      [resolvedTenantId]: nextConfig
    }));
    setCrmSaving(true);
    setCrmDataError(null);
    try {
      const savedSettings = await withTenantLoadTimeout(
        signal => crmRepository.upsertTenantSettings(resolvedTenantId, nextConfig, { signal }),
        'Salvar configuracoes do tenant',
        30000
      );
      setTenantConfigs(prev => ({ ...prev, [resolvedTenantId]: withPricingModuleCompatibility({ ...savedSettings, tenantId: resolvedTenantId }) }));
      trackTenantActivity('UPDATE', 'tenant_settings', resolvedTenantId, {
        changedSections: Object.keys(config || {}).filter(key => (config as any)[key] !== (previousConfig as any)?.[key]).slice(0, 20)
      });
    } catch (error: any) {
      setTenantConfigs(prev => ({ ...prev, [resolvedTenantId]: previousConfig || createTenantConfig(resolvedTenantId) }));
      setCrmDataError(error.message || 'Erro ao salvar configurações do tenant.');
      throw error;
    } finally {
      setCrmSaving(false);
    }
  };

  const tenantClients = clients.filter(c => (c.tenantId || LUBRIM_TENANT_ID) === resolvedTenantId);
  const tenantContacts = contacts.filter(c => (c.tenantId || LUBRIM_TENANT_ID) === resolvedTenantId);
  const tenantTasks = tasks.filter(t => (t.tenantId || LUBRIM_TENANT_ID) === resolvedTenantId);
  const tenantTaskAttachments = taskAttachments.filter(a => a.tenantId === resolvedTenantId);
  const tenantCommunications = communications.filter(c => c.tenantId === resolvedTenantId);
  const tenantExternalEvents = externalEvents.filter(e => e.tenantId === resolvedTenantId);
  const tenantProposals = proposals.filter(p => (p.tenantId || LUBRIM_TENANT_ID) === resolvedTenantId);

  const replaceTenantClients = (tenantId: string, nextClients: Client[]) => {
    setClients(prev => [
      ...prev.filter(c => (c.tenantId || LUBRIM_TENANT_ID) !== tenantId),
      ...nextClients.map(c => ({ ...c, tenantId }))
    ]);
  };

  const replaceTenantContacts = (tenantId: string, nextContacts: Contact[]) => {
    setContacts(prev => [
      ...prev.filter(c => (c.tenantId || LUBRIM_TENANT_ID) !== tenantId),
      ...nextContacts.map(c => ({ ...c, tenantId }))
    ]);
  };

  const replaceTenantTasks = (tenantId: string, nextTasks: CRMTask[]) => {
    setTasks(prev => [
      ...prev.filter(t => (t.tenantId || LUBRIM_TENANT_ID) !== tenantId),
      ...nextTasks.map(t => ({ ...t, tenantId }))
    ]);
  };

  const replaceTenantTaskAttachments = (tenantId: string, nextAttachments: TaskAttachment[]) => {
    setTaskAttachments(prev => [
      ...prev.filter(a => a.tenantId !== tenantId),
      ...nextAttachments.map(a => ({ ...a, tenantId }))
    ]);
  };

  const replaceTenantCommunications = (tenantId: string, nextCommunications: CRMCommunication[]) => {
    setCommunications(prev => [
      ...prev.filter(c => c.tenantId !== tenantId),
      ...nextCommunications.map(c => ({ ...c, tenantId }))
    ]);
  };

  const replaceTenantExternalEvents = (tenantId: string, nextEvents: CRMExternalEvent[]) => {
    setExternalEvents(prev => [
      ...prev.filter(e => e.tenantId !== tenantId),
      ...nextEvents.map(e => ({ ...e, tenantId }))
    ]);
  };

  const replaceTenantProposals = (tenantId: string, nextProposals: ProposalData[]) => {
    setProposals(prev => [
      ...prev.filter(p => (p.tenantId || LUBRIM_TENANT_ID) !== tenantId),
      ...nextProposals.map(p => ({ ...p, tenantId }))
    ]);
  };

  const withTenantLoadTimeout = async <T,>(
    operation: Promise<T> | ((signal?: AbortSignal) => Promise<T>),
    label: string,
    timeoutMs = 15000
  ): Promise<T> => {
    return runSupabaseRequest(
      signal => typeof operation === 'function' ? operation(signal) : operation,
      { label, tenantId: resolvedTenantId, timeoutMs }
    );
  };

  const trackTenantActivity = (
    action: TenantActivityAction,
    entityType: TenantAuditEntityType,
    entityId?: string | null,
    metadata: Record<string, any> = {}
  ) => {
    if (!activeTenantId || !profile?.id) return;
    void auditRepository.trackActivity({
      tenantId: activeTenantId,
      userId: profile.id,
      action,
      entityType,
      entityId,
      metadata
    }).catch(error => console.warn('App: audit event unavailable.', error));
  };

  useEffect(() => {
    if (!activeTenantId || !profile?.id || !session) return;
    let cancelled = false;

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
    auditRepository.startUserSession({
      tenantId: activeTenantId,
      userId: profile.id,
      userAgent
    }).then(sessionRow => {
      if (cancelled || !sessionRow) return;
      return Promise.all([
        auditRepository.trackActivity({
          tenantId: activeTenantId,
          userId: profile.id,
          action: 'LOGIN',
          entityType: 'session',
          entityId: sessionRow.id,
          metadata: { tenantId: activeTenantId }
        }),
        auditRepository.trackActivity({
          tenantId: activeTenantId,
          userId: profile.id,
          action: 'TENANT_ENTER',
          entityType: 'tenant',
          entityId: activeTenantId,
          metadata: {
            tenantName: activeTenant?.name,
            role: memberships.find(item => item.tenantId === activeTenantId)?.role
          }
        })
      ]);
    }).catch(error => console.warn('App: user session audit unavailable.', error));

    const heartbeatId = window.setInterval(() => {
      void auditRepository.heartbeat({
        tenantId: activeTenantId,
        userId: profile.id
      }).catch(error => console.warn('App: heartbeat audit unavailable.', error));
    }, 60_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void auditRepository.heartbeat({ tenantId: activeTenantId, userId: profile.id });
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void auditRepository.trackActivity({
        tenantId: activeTenantId,
        userId: profile.id,
        action: 'LOGOUT',
        entityType: 'session',
        metadata: { reason: 'tenant_or_session_changed' }
      }).catch(() => undefined);
      void auditRepository.endUserSession({
        tenantId: activeTenantId,
        userId: profile.id
      }).catch(() => undefined);
    };
  }, [activeTenantId, profile?.id, session?.user?.id]);

  useEffect(() => {
    if (!activeTenantId || !profile?.id || !session) return;
    trackTenantActivity('PAGE_VIEW', 'page', activeTab, {
      view,
      businessUnit
    });
    void auditRepository.heartbeat({
      tenantId: activeTenantId,
      userId: profile.id
    }).catch(() => undefined);
  }, [activeTab, view, businessUnit, activeTenantId, profile?.id, session?.user?.id]);

  const getCrmSaveErrorMessage = (error: any, fallback: string) => {
    const classified = getPersistenceErrorMessage(error, fallback);
    if (classified && classified !== fallback) return classified;
    const code = String(error?.code || '');
    const message = String(error?.message || error?.details || '');
    const details = String(error?.details || '');
    const combined = `${message} ${details}`;
    if (code === 'CRM_TIMEOUT') {
      return message || `${error?.crmLabel || 'Operacao'} excedeu o tempo limite de resposta do Supabase.`;
    }
    if (error?.name === 'AbortError' || /abort|aborted/i.test(combined)) {
      return 'A chamada ao Supabase foi abortada apos timeout para liberar a tela. Tente novamente e consulte o trace do Playwright se persistir.';
    }
    if (/failed to fetch|networkerror|load failed|err_network|err_connection|fetch failed/i.test(combined)) {
      return 'Falha de rede ao acessar o Supabase. Verifique internet, URL/chave do projeto e bloqueios do navegador.';
    }
    if (/column .*payload.* does not exist/i.test(message)) {
      return 'Schema remoto incompatível: a tabela não possui coluna payload. O salvamento foi interrompido sem travar a tela.';
    }
    if (/column .* does not exist|schema cache|could not find .* column/i.test(combined)) {
      return `Schema remoto incompatível: ${message}`;
    }
    if (code === '42501' || /row-level security|permission denied|not authorized|unauthorized/i.test(combined)) {
      return 'Sem permissão para salvar neste tenant. Verifique se o usuário está vinculado ao tenant ativo ou se as políticas RLS foram aplicadas.';
    }
    if (code === '23503' && /tenant_id|tenants/i.test(combined)) {
      return 'Tenant ativo não existe no Supabase ou não está disponível para gravação. Reabra o tenant ou verifique a migration multitenant.';
    }
    if (code === '23503' && /client_id|clients/i.test(combined)) {
      return 'Cliente inválido para esta oportunidade. Recarregue os dados do tenant e selecione um cliente do tenant ativo.';
    }
    if (code === '23505' && /proposals_human_id_key|human_id bloqueando o versionamento/i.test(combined)) {
      return 'Constraint legada de human_id está bloqueando o versionamento. Rode a migration que remove proposals_human_id_key no Supabase.';
    }
    if (code === '23505' && /proposals_tenant_proposal_number_version_key|número e versão|numero e versao/i.test(combined)) {
      return 'Já existe uma proposta com este número e versão neste tenant. Os dados foram recarregados; tente novamente.';
    }
    if (code === '23505' || /duplicate key|unique constraint|already exists/i.test(combined)) {
      return 'Já existe uma proposta com este número e versão neste tenant. Tente criar novamente para gerar outro número.';
    }
    if (/demorou demais para responder/i.test(message)) {
      return message;
    }
    return message || fallback;
  };

  const isProposalVersionDuplicateError = (error: any) => {
    const combined = `${error?.message || ''} ${error?.details || ''} ${error?.constraint || ''}`;
    return error?.code === '23505'
      && /proposals_tenant_proposal_number_version_key|número e versão|numero e versao/i.test(combined);
  };

  const upsertLocalClient = (tenantId: string, client: Client) => {
    setClients(prev => [
      ...prev.filter(c => c.id !== client.id),
      { ...client, tenantId }
    ]);
  };

  const upsertLocalContact = (tenantId: string, contact: Contact) => {
    setContacts(prev => [
      ...prev.filter(c => c.id !== contact.id),
      { ...contact, tenantId }
    ]);
  };

  const upsertLocalTask = (tenantId: string, task: CRMTask) => {
    setTasks(prev => [
      ...prev.filter(t => t.id !== task.id),
      { ...task, tenantId }
    ]);
  };

  const upsertLocalTaskAttachment = (tenantId: string, attachment: TaskAttachment) => {
    setTaskAttachments(prev => [
      ...prev.filter(a => a.id !== attachment.id),
      { ...attachment, tenantId }
    ]);
  };

  const upsertLocalCommunication = (tenantId: string, communication: CRMCommunication) => {
    setCommunications(prev => [
      ...prev.filter(c => c.id !== communication.id),
      { ...communication, tenantId }
    ]);
  };

  const upsertLocalExternalEvent = (tenantId: string, event: CRMExternalEvent) => {
    setExternalEvents(prev => [
      ...prev.filter(e => e.id !== event.id),
      { ...event, tenantId }
    ]);
  };

  const upsertLocalProposal = (tenantId: string, proposal: ProposalData) => {
    setProposals(prev => [
      ...prev.filter(p => p.id !== proposal.id),
      { ...proposal, tenantId }
    ]);
  };

  useEffect(() => {
    if (!activeTenantId || tenantLoading) return;
    let cancelled = false;

    const loadTenantCrmData = async () => {
      setCrmDataLoading(true);
      setCrmDataError(null);
      try {
        const [loadedClients, loadedContacts, loadedTasks, loadedProposals, loadedSettings] = await Promise.all([
          withTenantLoadTimeout(signal => crmRepository.listClients(activeTenantId, { signal }), 'Clientes'),
          withTenantLoadTimeout(signal => crmRepository.listContacts(activeTenantId, { signal }), 'Contatos'),
          withTenantLoadTimeout(signal => crmRepository.listTasks(activeTenantId, { signal }), 'Tarefas'),
          withTenantLoadTimeout(signal => crmRepository.listProposals(activeTenantId, { signal }), 'Propostas'),
          withTenantLoadTimeout(signal => crmRepository.getTenantSettings<ProposalData>(activeTenantId, { signal }), 'Configurações')
        ]);
        if (cancelled) return;

        replaceTenantClients(activeTenantId, loadedClients.length > 0 || activeTenantId !== LUBRIM_TENANT_ID ? loadedClients : initialClients.map(c => ({ ...c, tenantId: LUBRIM_TENANT_ID })));
        replaceTenantContacts(activeTenantId, loadedContacts.length > 0 || activeTenantId !== LUBRIM_TENANT_ID ? loadedContacts : initialContacts.map(c => ({ ...c, tenantId: LUBRIM_TENANT_ID })));
        replaceTenantTasks(activeTenantId, loadedTasks.length > 0 || activeTenantId !== LUBRIM_TENANT_ID ? loadedTasks : initialTasks.map(t => ({ ...t, tenantId: LUBRIM_TENANT_ID })));
        replaceTenantProposals(activeTenantId, loadedProposals.length > 0 || activeTenantId !== LUBRIM_TENANT_ID ? loadedProposals : mockInitialProposals.map((p: any) => ({ ...p, tenantId: LUBRIM_TENANT_ID })));
        setTenantConfigs(prev => ({
          ...prev,
          [activeTenantId]: loadedSettings
            ? withPricingModuleCompatibility({ ...loadedSettings, tenantId: activeTenantId })
            : prev[activeTenantId] || createTenantConfig(activeTenantId)
        }));

        const optionalResults = await Promise.allSettled([
          withTenantLoadTimeout(signal => crmRepository.listTaskAttachments(activeTenantId, undefined, { signal, timeoutMs: 7000 }), 'Anexos de tarefas', 7000),
          withTenantLoadTimeout(signal => crmRepository.listCommunications(activeTenantId, { signal, timeoutMs: 7000 }), 'Comunicacoes', 7000),
          withTenantLoadTimeout(signal => crmRepository.listExternalEvents(activeTenantId, { signal, timeoutMs: 7000 }), 'Eventos externos', 7000)
        ]);
        if (cancelled) return;

        const [attachmentsResult, communicationsResult, eventsResult] = optionalResults;
        if (attachmentsResult.status === 'fulfilled') {
          replaceTenantTaskAttachments(activeTenantId, attachmentsResult.value);
        } else {
          console.warn('Anexos de tarefas indisponiveis. Verifique a migration crm_task_attachments.', attachmentsResult.reason);
          replaceTenantTaskAttachments(activeTenantId, []);
        }
        if (communicationsResult.status === 'fulfilled') {
          replaceTenantCommunications(activeTenantId, communicationsResult.value);
        } else {
          console.warn('Comunicacoes Google indisponiveis. Verifique a migration google_workspace_integration.', communicationsResult.reason);
          replaceTenantCommunications(activeTenantId, []);
        }
        if (eventsResult.status === 'fulfilled') {
          replaceTenantExternalEvents(activeTenantId, eventsResult.value);
        } else {
          console.warn('Eventos Google indisponiveis. Verifique a migration google_workspace_integration.', eventsResult.reason);
          replaceTenantExternalEvents(activeTenantId, []);
        }
      } catch (error: any) {
        if (!cancelled) {
          setCrmDataError(getCrmSaveErrorMessage(error, 'Erro ao carregar dados do tenant.'));
        }
      } finally {
        if (!cancelled) setCrmDataLoading(false);
      }
    };

    loadTenantCrmData();
    return () => {
      cancelled = true;
      setCrmDataLoading(false);
    };
  }, [activeTenantId, tenantLoading]);

  useEffect(() => {
    if (!crmDataError) return;
    const timeoutId = window.setTimeout(() => setCrmDataError(null), 8000);
    return () => window.clearTimeout(timeoutId);
  }, [crmDataError]);

  useEffect(() => {
    if (!activeTenantId || tenantLoading || !session) {
      setGoogleConnection({ connected: false, account: null });
      setMicrosoftConnection({ connected: false, account: null });
      return;
    }
    let cancelled = false;
    Promise.allSettled([
      googleWorkspaceService.getConnectionStatus(activeTenantId),
      microsoftWorkspaceService.getConnectionStatus(activeTenantId)
    ])
      .then(([googleStatus, microsoftStatus]) => {
        if (cancelled) return;
        if (googleStatus.status === 'fulfilled') {
          setGoogleConnection(googleStatus.value);
        } else {
          console.warn('Status Google indisponivel.', googleStatus.reason);
          setGoogleConnection({ connected: false, account: null });
        }
        if (microsoftStatus.status === 'fulfilled') {
          setMicrosoftConnection(microsoftStatus.value);
        } else {
          console.warn('Status Microsoft indisponivel.', microsoftStatus.reason);
          setMicrosoftConnection({ connected: false, account: null });
        }
      })
    return () => {
      cancelled = true;
    };
  }, [activeTenantId, tenantLoading, session]);

  const saveTenantClient = async (client: Client): Promise<Client> => {
    const previousClients = tenantClients;
    const optimistic = { ...client, tenantId: resolvedTenantId };
    const auditAction: TenantActivityAction = isUuid(client.id) ? 'UPDATE' : 'CREATE';
    upsertLocalClient(resolvedTenantId, optimistic);
    setCrmSaving(true);
    setCrmDataError(null);
    try {
      const savedClient = await withTenantLoadTimeout(
        signal => isUuid(client.id)
          ? crmRepository.updateClient(optimistic, resolvedTenantId, { signal })
          : crmRepository.createClient(optimistic, resolvedTenantId, { signal }),
        'Salvar cliente',
        10000
      );
      setClients(prev => [
        ...prev.filter(c => c.id !== client.id && c.id !== savedClient.id),
        { ...savedClient, tenantId: resolvedTenantId }
      ]);
      trackTenantActivity(auditAction, 'client', savedClient.id, {
        name: savedClient.name,
        status: savedClient.status,
        businessUnit: savedClient.businessUnit
      });
      return { ...savedClient, tenantId: resolvedTenantId };
    } catch (error: any) {
      replaceTenantClients(resolvedTenantId, previousClients);
      const message = getCrmSaveErrorMessage(error, 'Erro ao salvar clientes.');
      setCrmDataError(message);
      throw new Error(message);
    } finally {
      setCrmSaving(false);
    }
  };

  const deleteTenantClient = async (id: string) => {
    const previousClients = tenantClients;
    setClients(prev => prev.filter(c => c.id !== id));
    setCrmSaving(true);
    setCrmDataError(null);
    try {
      await withTenantLoadTimeout(signal => crmRepository.deleteClient(id, resolvedTenantId, { signal }), 'Excluir cliente', 10000);
      trackTenantActivity('DELETE', 'client', id);
    } catch (error: any) {
      replaceTenantClients(resolvedTenantId, previousClients);
      setCrmDataError(error.message || 'Erro ao excluir cliente.');
      throw error;
    } finally {
      setCrmSaving(false);
    }
  };

  const saveTenantContact = async (contact: Contact): Promise<Contact> => {
    const previousContacts = tenantContacts;
    const optimistic = { ...contact, tenantId: resolvedTenantId };
    const auditAction: TenantActivityAction = isUuid(contact.id) ? 'UPDATE' : 'CREATE';
    upsertLocalContact(resolvedTenantId, optimistic);
    setCrmSaving(true);
    setCrmDataError(null);
    try {
      const savedContact = await withTenantLoadTimeout(
        signal => isUuid(contact.id)
          ? crmRepository.updateContact(optimistic, resolvedTenantId, { signal })
          : crmRepository.createContact(optimistic, resolvedTenantId, { signal }),
        'Salvar contato',
        10000
      );
      setContacts(prev => [
        ...prev.filter(c => c.id !== contact.id && c.id !== savedContact.id),
        { ...savedContact, tenantId: resolvedTenantId }
      ]);
      trackTenantActivity(auditAction, 'contact', savedContact.id, {
        name: savedContact.name,
        clientId: savedContact.clientId
      });
      return { ...savedContact, tenantId: resolvedTenantId };
    } catch (error: any) {
      replaceTenantContacts(resolvedTenantId, previousContacts);
      const message = getCrmSaveErrorMessage(error, 'Erro ao salvar contatos.');
      setCrmDataError(message);
      throw new Error(message);
    } finally {
      setCrmSaving(false);
    }
  };

  const deleteTenantContact = async (id: string) => {
    const previousContacts = tenantContacts;
    setContacts(prev => prev.filter(c => c.id !== id));
    setCrmSaving(true);
    setCrmDataError(null);
    try {
      await withTenantLoadTimeout(signal => crmRepository.deleteContact(id, resolvedTenantId, { signal }), 'Excluir contato', 10000);
      trackTenantActivity('DELETE', 'contact', id);
    } catch (error: any) {
      replaceTenantContacts(resolvedTenantId, previousContacts);
      setCrmDataError(error.message || 'Erro ao excluir contato.');
      throw error;
    } finally {
      setCrmSaving(false);
    }
  };

  const saveTenantTask = async (task: CRMTask): Promise<CRMTask> => {
    if (!task.clientId) {
      setCrmDataError('Selecione um cliente para criar a atividade.');
      throw new Error('Cliente obrigatório para atividade.');
    }
    const previousTasks = tenantTasks;
    const optimistic = { ...task, tenantId: resolvedTenantId };
    const auditAction: TenantActivityAction = isUuid(task.id) ? 'UPDATE' : 'CREATE';
    upsertLocalTask(resolvedTenantId, optimistic);
    setCrmSaving(true);
    setCrmDataError(null);
    try {
      const savedTask = await withTenantLoadTimeout(
        signal => isUuid(task.id)
          ? crmRepository.updateTask(optimistic, resolvedTenantId, { signal })
          : crmRepository.createTask(optimistic, resolvedTenantId, { signal }),
        'Salvar tarefa',
        10000
      );
      setTasks(prev => [
        ...prev.filter(t => t.id !== task.id && t.id !== savedTask.id),
        { ...savedTask, tenantId: resolvedTenantId }
      ]);
      trackTenantActivity(auditAction, 'task', savedTask.id, {
        title: savedTask.title,
        status: savedTask.status,
        type: savedTask.type,
        clientId: savedTask.clientId,
        proposalId: savedTask.proposalId
      });
      return { ...savedTask, tenantId: resolvedTenantId };
    } catch (error: any) {
      replaceTenantTasks(resolvedTenantId, previousTasks);
      const message = getCrmSaveErrorMessage(error, 'Erro ao salvar tarefas.');
      setCrmDataError(message);
      throw new Error(message);
    } finally {
      setCrmSaving(false);
    }
  };

  const deleteTenantTask = async (id: string) => {
    const previousTasks = tenantTasks;
    const previousAttachments = tenantTaskAttachments;
    setTasks(prev => prev.filter(t => t.id !== id));
    setTaskAttachments(prev => prev.filter(a => a.taskId !== id));
    setCrmSaving(true);
    setCrmDataError(null);
    try {
      await withTenantLoadTimeout(signal => crmRepository.deleteTask(id, resolvedTenantId, { signal }), 'Excluir tarefa', 10000);
      trackTenantActivity('DELETE', 'task', id);
    } catch (error: any) {
      replaceTenantTasks(resolvedTenantId, previousTasks);
      replaceTenantTaskAttachments(resolvedTenantId, previousAttachments);
      setCrmDataError(error.message || 'Erro ao excluir tarefa.');
      throw error;
    } finally {
      setCrmSaving(false);
    }
  };

  const uploadTenantTaskAttachment = async (task: CRMTask, file: File): Promise<TaskAttachment> => {
    setCrmSaving(true);
    setCrmDataError(null);
    try {
      const savedAttachment = await withTenantLoadTimeout(
        signal => crmRepository.uploadTaskAttachment(task, file, resolvedTenantId, profile?.id, { signal }),
        'Anexar arquivo',
        10000
      );
      upsertLocalTaskAttachment(resolvedTenantId, savedAttachment);
      trackTenantActivity('UPLOAD', 'task_attachment', savedAttachment.id, {
        taskId: savedAttachment.taskId,
        fileName: savedAttachment.fileName,
        fileSize: savedAttachment.fileSize
      });
      return savedAttachment;
    } catch (error: any) {
      const message = error.message || 'Erro ao anexar arquivo.';
      setCrmDataError(/crm_task_attachments|bucket|schema cache|does not exist/i.test(message)
        ? 'Anexos indisponíveis: aplique a migration crm_task_attachments no Supabase e tente novamente.'
        : message);
      throw error;
    } finally {
      setCrmSaving(false);
    }
  };

  const deleteTenantTaskAttachment = async (attachment: TaskAttachment): Promise<void> => {
    const previousAttachments = tenantTaskAttachments;
    setTaskAttachments(prev => prev.filter(a => a.id !== attachment.id));
    setCrmSaving(true);
    setCrmDataError(null);
    try {
      await withTenantLoadTimeout(
        signal => crmRepository.deleteTaskAttachment(attachment, resolvedTenantId, { signal }),
        'Remover anexo',
        10000
      );
      trackTenantActivity('DELETE', 'task_attachment', attachment.id, {
        taskId: attachment.taskId,
        fileName: attachment.fileName
      });
    } catch (error: any) {
      replaceTenantTaskAttachments(resolvedTenantId, previousAttachments);
      setCrmDataError(error.message || 'Erro ao remover anexo.');
      throw error;
    } finally {
      setCrmSaving(false);
    }
  };

  const openTenantTaskAttachment = async (attachment: TaskAttachment): Promise<void> => {
    try {
      const signedUrl = await withTenantLoadTimeout(
        signal => crmRepository.createTaskAttachmentSignedUrl(attachment, resolvedTenantId, { signal }),
        'Abrir anexo',
        10000
      );
      trackTenantActivity('DOWNLOAD', 'task_attachment', attachment.id, {
        taskId: attachment.taskId,
        fileName: attachment.fileName
      });
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      setCrmDataError(error.message || 'Erro ao abrir anexo.');
      throw error;
    }
  };

  const connectTenantGoogle = async () => {
    setGoogleWorkspaceLoading(true);
    setCrmDataError(null);
    try {
      const authUrl = await googleWorkspaceService.startOAuth(resolvedTenantId);
      trackTenantActivity('UPDATE', 'workspace', 'google', { operation: 'connect_start' });
      window.location.assign(authUrl);
    } catch (error: any) {
      setCrmDataError(error.message || 'Erro ao iniciar conexao Google.');
      throw error;
    } finally {
      setGoogleWorkspaceLoading(false);
    }
  };

  const disconnectTenantGoogle = async () => {
    setGoogleWorkspaceLoading(true);
    setCrmDataError(null);
    try {
      await googleWorkspaceService.disconnect(resolvedTenantId);
      setGoogleConnection({ connected: false, account: null });
      trackTenantActivity('UPDATE', 'workspace', 'google', { operation: 'disconnect' });
    } catch (error: any) {
      setCrmDataError(error.message || 'Erro ao desconectar Google.');
      throw error;
    } finally {
      setGoogleWorkspaceLoading(false);
    }
  };

  const getProposalSentStageId = (proposal: ProposalData) => {
    const pipeline = getSalesPipelineForProposal(proposal, brandedGlobalConfig);
    return pipeline.stages.find(stage => stage.id === 'Sent')?.id
      || pipeline.stages.find(stage => stage.category === 'proposal')?.id
      || 'Sent';
  };

  const handleProposalSentAutomation = async (
    draft: GoogleEmailDraft | MicrosoftEmailDraft,
    communication: CRMCommunication
  ) => {
    if (!draft.markProposalSent || !draft.proposalId) return;
    const proposal = tenantProposals.find(p => p.id === draft.proposalId);
    if (!proposal?.clientId) return;

    const sentAt = new Date(communication.sentAt || communication.createdAt || Date.now());
    const sentStageId = getProposalSentStageId(proposal);
    const nextProposal: ProposalData = {
      ...proposal,
      stage: sentStageId,
      status: 'Active',
      versionStatus: 'SUBMITTED',
      updatedAt: sentAt.toISOString(),
      timeline: [
        ...(proposal.timeline || []),
        {
          id: Math.random().toString(36).substring(2, 9),
          date: sentAt.toISOString(),
          type: 'COMMUNICATION',
          title: `Proposta #${proposal.proposalId} enviada por e-mail`,
          user: currentUser.name || profile?.email || 'Sistema',
          metadata: {
            communicationId: communication.id,
            provider: communication.provider,
            subject: draft.subject,
            to: draft.to,
            stage: sentStageId,
            status: 'Active',
            versionStatus: 'SUBMITTED'
          }
        }
      ]
    };

    await persistProposal(nextProposal);
    trackTenantActivity('SEND', 'proposal', nextProposal.id, {
      proposalNumber: nextProposal.proposalId,
      provider: communication.provider,
      communicationId: communication.id,
      to: draft.to
    });

    const automation = normalizeProposalSendAutomation(brandedGlobalConfig.proposalSendAutomation);
    if (!automation.enabled) return;

    const template = getDefaultProposalSendAutomationTemplate(automation);
    const variables = buildProposalSendTemplateVariables({
      proposal: nextProposal,
      subject: draft.subject,
      to: draft.to,
      cc: draft.cc,
      responsible: currentUser.name || profile?.email,
      sentAt
    });
    const title = renderProposalSendTemplate(template.titleTemplate, variables);
    const description = renderProposalSendTemplate(template.descriptionTemplate, variables);
    const dueDate = addProposalFollowUpDays(template.delayDays, sentAt);

    if (template.syncMicrosoftTodo && microsoftConnection.connected) {
      await createTenantMicrosoftTodoTask({
        tenantId: '',
        clientId: nextProposal.clientId,
        proposalId: nextProposal.id,
        contactId: draft.contactId,
        title,
        description,
        type: 'Follow-up',
        dueDate
      });
      return;
    }

    await saveTenantTask({
      id: `task-${Date.now()}`,
      clientId: nextProposal.clientId,
      proposalId: nextProposal.id,
      contactId: draft.contactId,
      assignee: currentUser.name || profile?.email,
      title,
      description,
      type: 'Follow-up',
      status: 'To Do',
      dueDate,
      createdAt: new Date().toISOString()
    });
  };

  const syncTenantGmail = async () => {
    setGoogleWorkspaceLoading(true);
    setCrmDataError(null);
    try {
      await googleWorkspaceService.syncGmail(resolvedTenantId);
      const [loadedCommunications, status] = await Promise.all([
        withTenantLoadTimeout(signal => crmRepository.listCommunications(resolvedTenantId, { signal }), 'Recarregar comunicacoes', 7000),
        googleWorkspaceService.getConnectionStatus(resolvedTenantId)
      ]);
      replaceTenantCommunications(resolvedTenantId, loadedCommunications);
      setGoogleConnection(status);
      trackTenantActivity('SYNC', 'workspace', 'google', { operation: 'gmail_sync' });
    } catch (error: any) {
      setCrmDataError(error.message || 'Erro ao sincronizar Gmail.');
      throw error;
    } finally {
      setGoogleWorkspaceLoading(false);
    }
  };

  const sendTenantGoogleEmail = async (draft: GoogleEmailDraft) => {
    setGoogleWorkspaceLoading(true);
    setCrmDataError(null);
    try {
      const { task, communication, threadWarning } = await googleWorkspaceService.sendEmail({ ...draft, tenantId: resolvedTenantId });
      upsertLocalTask(resolvedTenantId, task);
      upsertLocalCommunication(resolvedTenantId, communication);
      if (threadWarning) setCrmDataError(threadWarning);
      trackTenantActivity('SEND', 'communication', communication.id, {
        provider: 'google',
        subject: draft.subject,
        to: draft.to,
        proposalId: draft.proposalId
      });
      try {
        await handleProposalSentAutomation(draft, communication);
      } catch (automationError: any) {
        const message = `E-mail enviado, mas nao foi possivel atualizar a proposta e criar o follow-up: ${automationError.message || automationError}`;
        setCrmDataError(message);
        const enhanced = new Error(message);
        (enhanced as any).emailSent = true;
        throw enhanced;
      }
      return { task, communication };
    } catch (error: any) {
      setCrmDataError(error.message || 'Erro ao enviar e-mail pelo Gmail.');
      throw error;
    } finally {
      setGoogleWorkspaceLoading(false);
    }
  };

  const createTenantGoogleMeeting = async (draft: GoogleMeetingDraft) => {
    setGoogleWorkspaceLoading(true);
    setCrmDataError(null);
    try {
      const { task, externalEvent } = await googleWorkspaceService.createCalendarEvent({ ...draft, tenantId: resolvedTenantId });
      upsertLocalTask(resolvedTenantId, task);
      upsertLocalExternalEvent(resolvedTenantId, externalEvent);
      trackTenantActivity('CREATE', 'external_event', externalEvent.id, {
        provider: 'google',
        taskId: task.id,
        title: task.title
      });
      return { task, externalEvent };
    } catch (error: any) {
      setCrmDataError(error.message || 'Erro ao criar reuniao no Google Calendar.');
      throw error;
    } finally {
      setGoogleWorkspaceLoading(false);
    }
  };

  const connectTenantMicrosoft = async () => {
    setMicrosoftWorkspaceLoading(true);
    setCrmDataError(null);
    try {
      const authUrl = await microsoftWorkspaceService.startOAuth(resolvedTenantId);
      trackTenantActivity('UPDATE', 'workspace', 'microsoft', { operation: 'connect_start' });
      window.location.assign(authUrl);
    } catch (error: any) {
      setCrmDataError(error.message || 'Erro ao iniciar conexao Microsoft.');
      throw error;
    } finally {
      setMicrosoftWorkspaceLoading(false);
    }
  };

  const disconnectTenantMicrosoft = async () => {
    setMicrosoftWorkspaceLoading(true);
    setCrmDataError(null);
    try {
      await microsoftWorkspaceService.disconnect(resolvedTenantId);
      setMicrosoftConnection({ connected: false, account: null });
      trackTenantActivity('UPDATE', 'workspace', 'microsoft', { operation: 'disconnect' });
    } catch (error: any) {
      setCrmDataError(error.message || 'Erro ao desconectar Microsoft.');
      throw error;
    } finally {
      setMicrosoftWorkspaceLoading(false);
    }
  };

  const syncTenantMicrosoft = async () => {
    setMicrosoftWorkspaceLoading(true);
    setCrmDataError(null);
    try {
      const syncResult = await microsoftWorkspaceService.syncMail(resolvedTenantId);
      const [loadedCommunications, loadedTasks, status] = await Promise.all([
        withTenantLoadTimeout(signal => crmRepository.listCommunications(resolvedTenantId, { signal }), 'Recarregar comunicacoes', 7000),
        withTenantLoadTimeout(signal => crmRepository.listTasks(resolvedTenantId, { signal }), 'Recarregar tarefas', 7000),
        microsoftWorkspaceService.getConnectionStatus(resolvedTenantId)
      ]);
      replaceTenantCommunications(resolvedTenantId, loadedCommunications);
      replaceTenantTasks(resolvedTenantId, loadedTasks);
      setMicrosoftConnection(status);
      trackTenantActivity('SYNC', 'workspace', 'microsoft', {
        operation: 'mail_sync',
        taskErrors: syncResult.taskErrors,
        mailboxWarnings: syncResult.mailboxWarnings,
        conversationWarnings: syncResult.conversationWarnings
      });
      if (syncResult.taskErrors && syncResult.taskErrors > 0) {
        setCrmDataError(`Sincronizacao Microsoft concluida, mas ${syncResult.taskErrors} tarefa(s) do To Do nao puderam ser atualizadas.`);
      } else if (syncResult.mailboxWarnings && syncResult.mailboxWarnings > 0) {
        setCrmDataError('Sincronizacao Microsoft concluida, mas uma caixa compartilhada nao pode ser lida. Verifique o acesso delegado da caixa e reconecte o Outlook se aparecer pedido de permissao.');
      } else if (syncResult.conversationWarnings && syncResult.conversationWarnings > 0) {
        setCrmDataError('Sincronizacao Microsoft concluida, mas algumas conversas do Outlook nao puderam ser verificadas.');
      }
    } catch (error: any) {
      setCrmDataError(error.message || 'Erro ao sincronizar Outlook.');
    } finally {
      setMicrosoftWorkspaceLoading(false);
    }
  };

  const triageTenantCommunicationThread = async (payload: {
    communicationId: string;
    microsoftConversationId?: string;
    clientId?: string | null;
    contactId?: string | null;
    proposalId?: string | null;
    taskId?: string | null;
    triageStatus: CRMCommunicationTriageStatus;
    triageNotes?: string | null;
  }): Promise<CRMCommunication[]> => {
    setCrmSaving(true);
    setCrmDataError(null);
    try {
      const updatedCommunications = await withTenantLoadTimeout(
        signal => crmRepository.updateCommunicationThreadTriage({
          tenantId: resolvedTenantId,
          ...payload,
          triagedBy: profile?.id || null
        }, { signal }),
        'Atualizar triagem de e-mail',
        10000
      );
      setCommunications(prev => [
        ...prev.filter(existing => !updatedCommunications.some(updated => updated.id === existing.id)),
        ...updatedCommunications.map(communication => ({ ...communication, tenantId: resolvedTenantId }))
      ]);
      trackTenantActivity('TRIAGE', 'communication', payload.communicationId || payload.microsoftConversationId, {
        triageStatus: payload.triageStatus,
        clientId: payload.clientId,
        contactId: payload.contactId,
        proposalId: payload.proposalId,
        taskId: payload.taskId
      });
      return updatedCommunications.map(communication => ({ ...communication, tenantId: resolvedTenantId }));
    } catch (error: any) {
      const message = getCrmSaveErrorMessage(error, 'Erro ao atualizar triagem do e-mail.');
      setCrmDataError(message);
      throw new Error(message);
    } finally {
      setCrmSaving(false);
    }
  };

  const sendTenantMicrosoftEmail = async (draft: MicrosoftEmailDraft) => {
    setMicrosoftWorkspaceLoading(true);
    setCrmDataError(null);
    try {
      const { task, communication, todoTask, externalTask, todoError } = await microsoftWorkspaceService.sendEmail({ ...draft, tenantId: resolvedTenantId });
      upsertLocalTask(resolvedTenantId, task);
      upsertLocalCommunication(resolvedTenantId, communication);
      if (todoTask) upsertLocalTask(resolvedTenantId, todoTask);
      if (todoError) setCrmDataError(todoError);
      trackTenantActivity('SEND', 'communication', communication.id, {
        provider: 'microsoft',
        subject: draft.subject,
        to: draft.to,
        proposalId: draft.proposalId
      });
      try {
        await handleProposalSentAutomation(draft, communication);
      } catch (automationError: any) {
        const message = `E-mail enviado, mas nao foi possivel atualizar a proposta e criar o follow-up: ${automationError.message || automationError}`;
        setCrmDataError(message);
        const enhanced = new Error(message);
        (enhanced as any).emailSent = true;
        throw enhanced;
      }
      return { task, communication, todoTask, externalTask, todoError };
    } catch (error: any) {
      setCrmDataError(error.message || 'Erro ao enviar e-mail pelo Outlook.');
      throw error;
    } finally {
      setMicrosoftWorkspaceLoading(false);
    }
  };

  const createTenantMicrosoftMeeting = async (draft: MicrosoftMeetingDraft) => {
    setMicrosoftWorkspaceLoading(true);
    setCrmDataError(null);
    try {
      const { task, externalEvent } = await microsoftWorkspaceService.createCalendarEvent({ ...draft, tenantId: resolvedTenantId });
      upsertLocalTask(resolvedTenantId, task);
      upsertLocalExternalEvent(resolvedTenantId, externalEvent);
      trackTenantActivity('CREATE', 'external_event', externalEvent.id, {
        provider: 'microsoft',
        taskId: task.id,
        title: task.title
      });
      return { task, externalEvent };
    } catch (error: any) {
      setCrmDataError(error.message || 'Erro ao criar reuniao no Outlook Calendar.');
      throw error;
    } finally {
      setMicrosoftWorkspaceLoading(false);
    }
  };

  const createTenantMicrosoftTodoTask = async (draft: MicrosoftTodoDraft) => {
    setMicrosoftWorkspaceLoading(true);
    setCrmDataError(null);
    try {
      const { task, externalTask, todoError } = await microsoftWorkspaceService.createTodoTask({ ...draft, tenantId: resolvedTenantId });
      upsertLocalTask(resolvedTenantId, task);
      if (todoError) setCrmDataError(todoError);
      trackTenantActivity('CREATE', 'task', task.id, {
        provider: 'microsoft',
        externalTaskId: (externalTask as any)?.id,
        title: task.title,
        status: task.status,
        proposalId: task.proposalId
      });
      return { task, externalTask, todoError };
    } catch (error: any) {
      setCrmDataError(error.message || 'Erro ao criar tarefa no Microsoft To Do.');
      throw error;
    } finally {
      setMicrosoftWorkspaceLoading(false);
    }
  };

  // State: Currently selected proposal ID
  const [currentId, setCurrentId] = useState<string | null>(null);

  // State: Initial snapshot of the current proposal when opened (for versioning diff)
  const [initialDataSnapshot, setInitialDataSnapshot] = useState<ProposalData | null>(null);

  useEffect(() => {
    setCurrentId(null);
    setInitialDataSnapshot(null);
    setView('CRM');
    setActiveTab('crm-dashboard');
    if (activeTenant) {
      setBusinessUnit(resolveTenantBusinessUnit(activeTenant.enabledModules, activeTenant.defaultBusinessUnit));
    }
  }, [activeTenantId, activeTenant?.defaultBusinessUnit, activeTenant?.enabledModules]);

  // Compute visible proposals based on Role and Business Unit Access rules
  const visibleProposals = tenantProposals.filter((p) => {
    const pTypeAccess: BusinessUnitAccess = p.type === 'PRODUCT' ? 'PRODUCTS' : 'SERVICES';
    if (!currentUser.allowed_types.includes(pTypeAccess) && !currentUser.allowed_types.includes('BOTH')) {
      return false;
    }
    if (currentUser.role === 'SELLER' || currentUser.role === 'ANALYST') {
      return p.responsible === currentUser.name;
    }
    return true;
  });

  // Computed: The actual data object of the current proposal
  const currentData = tenantProposals.find(p => p.id === currentId);

  useEffect(() => {
    if (view !== 'EDITOR' || !currentData) return;
    const safeTab = getSafeEditorTabForProposal(currentData, activeTab);
    if (safeTab !== activeTab) setActiveTab(safeTab);
  }, [view, currentData?.id, currentData?.type, currentData?.pricingModule, activeTab]);

  // ---- GUARD RETURNS (all hooks declared above, safe to return early now) ----
  if (loading) {
    return <div className="flex h-screen w-screen items-center justify-center bg-[var(--tenant-bg)] text-slate-500 dark:bg-[var(--tenant-bg-dark)]">Carregando...</div>;
  }

  if (!session) {
    return <Login />;
  }

  if (view === 'SUPERADMIN') {
    return <SuperAdminPortal onBack={() => {
      window.history.pushState({}, '', activeTenant?.slug ? `/${activeTenant.slug}` : '/');
      setView('CRM');
    }} />;
  }

  if (tenantLoading || !activeTenantId || !activeTenant) {
    return <TenantEntry onOpenPortal={() => {
      window.history.pushState({}, '', '/superadmin');
      setView('SUPERADMIN');
    }} />;
  }

  // --- CRM ACTIONS ---

  const getDefaultProductPricingModule = (): PricingModuleId | null => {
    return getDefaultPricingModuleForBusinessUnit(activeTenant.enabledModules, 'PRODUCTS');
  };

  const getEditorTabForPricingModule = (type: ProposalType, pricingModule?: TenantModule) => {
    return getSafeEditorTabForProposal({ type, pricingModule });
  };

  const getDefaultStageForPricing = (pricingModule: PricingModuleId, type: ProposalType) =>
    getSalesPipelineForCreation(brandedGlobalConfig, pricingModule, type).defaultStageId;

  const persistProposal = async (proposal: ProposalData) => {
    const previousProposals = tenantProposals;
    const optimistic = { ...proposal, tenantId: resolvedTenantId };
    upsertLocalProposal(resolvedTenantId, optimistic);
    setCrmSaving(true);
    setCrmDataError(null);
    try {
      const savedProposal = await withTenantLoadTimeout(
        signal => isUuid(proposal.id)
          ? crmRepository.updateProposal(optimistic, resolvedTenantId, { signal })
          : crmRepository.createProposal(optimistic, resolvedTenantId, { signal }),
        'Salvar proposta',
        10000
      );
      setProposals(prev => [
        ...prev.filter(p => p.id !== proposal.id && p.id !== savedProposal.id),
        { ...savedProposal, tenantId: resolvedTenantId }
      ]);
      trackTenantActivity(isUuid(proposal.id) ? 'UPDATE' : 'CREATE', 'proposal', savedProposal.id, {
        proposalNumber: savedProposal.proposalId,
        clientId: savedProposal.clientId,
        stage: savedProposal.stage,
        status: savedProposal.status,
        versionStatus: savedProposal.versionStatus,
        pricingModule: savedProposal.pricingModule
      });
      if (currentId === proposal.id && savedProposal.id !== proposal.id) {
        setCurrentId(savedProposal.id);
      }
    } catch (error: any) {
      const message = getCrmSaveErrorMessage(error, 'Erro ao salvar proposta.');
      replaceTenantProposals(resolvedTenantId, previousProposals);
      setCrmDataError(message);
      throw new Error(message);
    } finally {
      setCrmSaving(false);
    }
  };

  const handleCreateProposal = async (payload: { type: ProposalType, clientId: string, motion: OpportunityMotion, pricingModule?: TenantModule, inlineClientName?: string, referenceId?: string, expansionType?: 'Volume' | 'Scope' | 'Site', openEditor?: boolean }): Promise<ProposalData> => {
    let selectedClient = tenantClients.find(c => c.id === payload.clientId);
    const inlineName = payload.inlineClientName?.trim();

    if (!selectedClient && inlineName) {
      setCrmSaving(true);
      setCrmDataError(null);
      try {
        selectedClient = await withTenantLoadTimeout(signal => crmRepository.createClient({
          id: Math.random().toString(36).substr(2, 9),
          tenantId: resolvedTenantId,
          name: inlineName,
          status: 'Active',
          classification: 'Prospect',
          businessUnit: payload.type === 'PRODUCT' ? 'PRODUCTS' : 'SERVICES',
          isProductClient: payload.type === 'PRODUCT',
          isServiceClient: payload.type !== 'PRODUCT'
        }, resolvedTenantId, { signal }), 'Salvar cliente');
        replaceTenantClients(resolvedTenantId, [selectedClient, ...tenantClients]);
      } catch (error: any) {
        const message = getCrmSaveErrorMessage(error, 'Erro ao salvar cliente.');
        setCrmDataError(message);
        setCrmSaving(false);
        throw new Error(message);
      }
    }

    if (!selectedClient) {
      const error = new Error('Selecione ou cadastre um cliente antes de criar a cotação.');
      setCrmDataError(error.message);
      throw error;
    }

    if (selectedClient.tenantId && selectedClient.tenantId !== resolvedTenantId) {
      const error = new Error('Cliente inválido para esta oportunidade. Recarregue os dados do tenant e selecione um cliente do tenant ativo.');
      setCrmDataError(error.message);
      throw error;
    }


    const referenceProp = payload.referenceId ? proposals.find(p => p.id === payload.referenceId) : null;
    const shouldInheritRef = referenceProp && ['Renewal', 'Reactivation', 'Addendum', 'Expansion'].includes(payload.motion);

    const newId = Math.random().toString(36).substr(2, 9);
    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + 15);
    const requestedPricingModule = isPricingModuleId(payload.pricingModule) ? payload.pricingModule : null;
    const resolvedPricingModule = payload.type === 'PRODUCT'
      ? (requestedPricingModule || getDefaultProductPricingModule())
      : (requestedPricingModule || (isPricingModuleEnabledForTenant('SERVICES_COMPLEX', activeTenant.enabledModules) ? 'SERVICES_COMPLEX' : null));

    if (!resolvedPricingModule || !isPricingModuleEnabledForTenant(resolvedPricingModule, activeTenant.enabledModules)) {
      const error = new Error('Este tenant nao possui modulo ativo para criar este tipo de cotacao.');
      setCrmDataError(error.message);
      throw error;
    }

    const moduleDefinition = getPricingModuleDefinition(resolvedPricingModule);
    if (!moduleDefinition?.allowedProposalTypes.includes(payload.type)) {
      const error = new Error('Modulo de pricing invalido para este tipo de cotacao.');
      setCrmDataError(error.message);
      throw error;
    }

    let newProp: ProposalData = {
      ...defaultProposalTemplate,
      id: newId,
      tenantId: resolvedTenantId,
      proposalId: Math.floor(Math.random() * 1000000).toString(),
      createdAt: today.toISOString(),
      expirationDate: expiry.toISOString(),
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      roles: shouldInheritRef ? [...referenceProp!.roles] : defaultProposalTemplate.roles,
      expenses: shouldInheritRef ? [...referenceProp!.expenses] : defaultProposalTemplate.expenses,
      safetyCosts: shouldInheritRef ? [...referenceProp!.safetyCosts] : defaultProposalTemplate.safetyCosts,
      supportCosts: shouldInheritRef ? [...referenceProp!.supportCosts] : defaultProposalTemplate.supportCosts,
      spotResources: shouldInheritRef ? [...referenceProp!.spotResources] : defaultProposalTemplate.spotResources,
      spotExpenses: shouldInheritRef ? [...referenceProp!.spotExpenses] : defaultProposalTemplate.spotExpenses,
      documents: shouldInheritRef ? { ...referenceProp!.documents } : defaultProposalTemplate.documents,
      motion: payload.motion,
      stage: getDefaultStageForPricing(resolvedPricingModule, payload.type),
      status: 'Active',
      type: payload.type,
      pricingModule: resolvedPricingModule,
      referenceOpportunityId: payload.referenceId,
      expansionType: payload.expansionType,
      // INHERIT GLOBAL SETTINGS
      taxConfig: brandedGlobalConfig.taxConfig,
      markup: brandedGlobalConfig.markup,
      pricingModel: brandedGlobalConfig.pricingModel || 'MARKUP',
      targetMargin: brandedGlobalConfig.targetMargin || 0.20,
      financialCostRate: brandedGlobalConfig.financialCostRate,
      contingencyRate: brandedGlobalConfig.contingencyRate,
      accountingConfig: brandedGlobalConfig.accountingConfig,
      productAccountingConfig: brandedGlobalConfig.productAccountingConfig,
      letterheadConfig: brandedGlobalConfig.letterheadConfig,
      proposalTemplates: brandedGlobalConfig.proposalTemplates,
      timeline: [{
        id: Math.random().toString(36).substring(2, 9),
        date: today.toISOString(),
        type: 'CREATED',
        title: 'Oportunidade Criada',
        user: currentUser.name || 'Sistema'
      }]
    };
    newProp = applyPricingModuleDefaultsToProposal(newProp, brandedGlobalConfig, resolvedPricingModule);
    setCrmSaving(true);
    setCrmDataError(null);
    try {
      const savedProposal = await withTenantLoadTimeout(
        signal => crmRepository.createProposal(newProp, resolvedTenantId, { signal }),
        'Salvar proposta'
      );
      setProposals(prev => [
        { ...savedProposal, tenantId: resolvedTenantId },
        ...prev.filter(p => p.id !== savedProposal.id)
      ]);
      if (payload.openEditor !== false) {
        setCurrentId(savedProposal.id);
        setView('EDITOR');
        setActiveTab(getEditorTabForPricingModule(payload.type, savedProposal.pricingModule));
      }
      trackTenantActivity('CREATE', 'proposal', savedProposal.id, {
        proposalNumber: savedProposal.proposalId,
        clientId: savedProposal.clientId,
        motion: payload.motion,
        type: savedProposal.type,
        pricingModule: savedProposal.pricingModule
      });
      return { ...savedProposal, tenantId: resolvedTenantId };
    } catch (error: any) {
      const message = getCrmSaveErrorMessage(error, 'Erro ao salvar proposta.');
      setCrmDataError(message);
      throw new Error(message);
    } finally {
      setCrmSaving(false);
    }
  };

  const handleCreateNewVersion = async (id: string, notes?: string) => {
    const source = proposals.find(p => p.id === id);
    if (!source) return;
    const previousProposals = proposals;
    const previousCurrentId = currentId;

    const newId = Math.random().toString(36).substr(2, 9);
    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + 15);

    // Make the old version inactive in the Kanban
    const updatedProposals = proposals.map(p =>
      p.id === id ? { ...p, isCurrentVersion: false } : p
    );

    const newProp: ProposalData = {
      ...source,
      id: newId,
      version: source.version + 1,
      versionNotes: notes,
      versionStatus: 'DRAFT',
      isCurrentVersion: true,
      stage: getDefaultStageForPricing(getPricingModuleForProposal(source), source.type),
      status: 'Active',
      motion: source.motion === 'NewBusiness' ? 'NewBusiness' : source.motion,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      expirationDate: expiry.toISOString(),
      timeline: [
        ...(source.timeline || []),
        {
          id: Math.random().toString(36).substring(2, 9),
          date: today.toISOString(),
          type: 'VERSION_CREATED',
          title: `Nova versão criada (v${source.version + 1})`,
          user: currentUser.name || 'Sistema',
          metadata: { notes }
        }
      ]
    };

    setProposals([newProp, ...updatedProposals]);
    setCurrentId(newId); // Auto-navigate to the new version
    setCrmSaving(true);
    setCrmDataError(null);
    try {
      const savedInactiveSource = await withTenantLoadTimeout(
        signal => crmRepository.updateProposal({ ...source, isCurrentVersion: false, updatedAt: today.toISOString() }, resolvedTenantId, { signal }),
        'Arquivar versao anterior',
        10000
      );
      const savedNewProp = await withTenantLoadTimeout(
        signal => crmRepository.createProposal(newProp, resolvedTenantId, { signal }),
        'Criar nova versao',
        10000
      );
      setProposals(prev => prev.map(p => p.id === source.id ? savedInactiveSource : p.id === newProp.id ? savedNewProp : p));
      setCurrentId(savedNewProp.id);
      trackTenantActivity('VERSION_CREATE', 'proposal', savedNewProp.id, {
        proposalNumber: savedNewProp.proposalId,
        version: savedNewProp.version,
        sourceId: source.id,
        notes
      });
    } catch (error: any) {
      setCrmDataError(error.message || 'Erro ao criar nova versão.');
      const message = getCrmSaveErrorMessage(error, 'Erro ao criar nova versao.');
      setProposals(previousProposals);
      setCurrentId(previousCurrentId);
      setCrmDataError(message);
      throw new Error(message);
    } finally {
      setCrmSaving(false);
    }
  };

  const handleUpdateVersionStatus = (id: string, newStatus: ProposalVersionStatus) => {
    const existing = proposals.find(p => p.id === id);
    const changedProposal = existing ? { ...existing, versionStatus: newStatus, updatedAt: new Date().toISOString() } : null;
    setProposals(prev => prev.map(p =>
      p.id === id ? { ...p, versionStatus: newStatus, updatedAt: new Date().toISOString() } : p
    ));
    if (changedProposal) {
      persistProposal(changedProposal)
        .then(() => trackTenantActivity('STATUS_CHANGE', 'proposal', id, { versionStatus: newStatus }))
        .catch(() => undefined);
    }
  };

  const handleDuplicateProposal = async (id: string) => {
    const source = proposals.find(p => p.id === id);
    if (!source) return;
    const previousProposals = proposals;

    const newId = Math.random().toString(36).substr(2, 9);
    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + 15);

    const newProp: ProposalData = {
      ...source,
      id: newId,
      proposalId: Math.floor(Math.random() * 1000000).toString(),
      version: 1,
      versionNotes: undefined,
      versionStatus: 'DRAFT',
      isCurrentVersion: true,
      status: 'Active',
      stage: getDefaultStageForPricing(getPricingModuleForProposal(source), source.type),
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      expirationDate: expiry.toISOString(),
      timeline: [{
        id: Math.random().toString(36).substring(2, 9),
        date: today.toISOString(),
        type: 'CREATED',
        title: `Cotação duplicada a partir de #${source.proposalId}`,
        user: currentUser.name || 'Sistema'
      }]
    };
    setProposals([newProp, ...proposals]);
    setCrmSaving(true);
    setCrmDataError(null);
    try {
      const savedNewProp = await withTenantLoadTimeout(
        signal => crmRepository.createProposal(newProp, resolvedTenantId, { signal }),
        'Duplicar proposta',
        10000
      );
      setProposals(prev => prev.map(p => p.id === newProp.id ? savedNewProp : p));
      trackTenantActivity('CREATE', 'proposal', savedNewProp.id, {
        operation: 'duplicate',
        sourceId: id,
        proposalNumber: savedNewProp.proposalId
      });
    } catch (error: any) {
      const message = getCrmSaveErrorMessage(error, 'Erro ao duplicar proposta.');
      setProposals(previousProposals);
      setCrmDataError(message);
    } finally {
      setCrmSaving(false);
    }
  };

  const handleDeleteProposal = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta proposta?')) {
      setProposals(proposals.filter(p => p.id !== id));
      withTenantLoadTimeout(signal => crmRepository.deleteProposal(id, resolvedTenantId, { signal }), 'Excluir proposta', 10000)
        .then(() => trackTenantActivity('DELETE', 'proposal', id))
        .catch((error: any) => setCrmDataError(getCrmSaveErrorMessage(error, 'Erro ao excluir proposta.')));
      if (currentId === id) {
        setCurrentId(null);
        setView('CRM');
      }
    }
  };

  const handleSelectProposal = (id: string) => {
    const prop = proposals.find(p => p.id === id);
    if (prop) {
      // Deep clone stringifying to keep a strict historical snapshot before edits
      setInitialDataSnapshot(JSON.parse(JSON.stringify(prop)));
      setCurrentId(id);
      setView('EDITOR');
      setActiveTab(getEditorTabForPricingModule(prop.type, prop.pricingModule));
      trackTenantActivity('PAGE_VIEW', 'proposal', id, {
        proposalNumber: prop.proposalId,
        stage: prop.stage,
        status: prop.status
      });
    }
  };

  const handleUpdateStage = (id: string, newStage: OpportunityStage) => {
    let changedProposal: ProposalData | null = null;
    setProposals(prev => prev.map(p => {
      if (p.id === id && p.stage !== newStage) {
        changedProposal = {
          ...p,
          stage: newStage,
          updatedAt: new Date().toISOString(),
          timeline: [
            ...(p.timeline || []),
            {
              id: Math.random().toString(36).substring(2, 9),
              date: new Date().toISOString(),
              type: 'STAGE_CHANGE',
              title: `O Estágio foi atualizado de ${p.stage} para ${newStage}`,
              user: currentUser.name || 'Sistema',
              metadata: { from: p.stage, to: newStage }
            }
          ]
        };
        return changedProposal;
      }
      return p;
    }));
    return changedProposal
      ? persistProposal(changedProposal).then(() => trackTenantActivity('STAGE_CHANGE', 'proposal', id, { to: newStage }))
      : Promise.resolve();
  };

  const handleUpdateStatus = (id: string, newStatus: OpportunityStatus) => {
    let changedProposal: ProposalData | null = null;
    setProposals(prev => prev.map(p => {
      if (p.id === id && p.status !== newStatus) {
        changedProposal = {
          ...p,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          timeline: [
            ...(p.timeline || []),
            {
              id: Math.random().toString(36).substring(2, 9),
              date: new Date().toISOString(),
              type: 'STATUS_CHANGE',
              title: `O Status foi alterado de ${p.status} para ${newStatus}`,
              user: currentUser.name || 'Sistema',
              metadata: { from: p.status, to: newStatus }
            }
          ]
        };
        return changedProposal;
      }
      return p;
    }));
    return changedProposal
      ? persistProposal(changedProposal).then(() => trackTenantActivity('STATUS_CHANGE', 'proposal', id, { to: newStatus }))
      : Promise.resolve();
  };

  const handleUpdateProposal = (id: string, data: Partial<ProposalData>) => {
    const existing = proposals.find(p => p.id === id);
    const changedProposal = existing ? { ...existing, ...data, updatedAt: new Date().toISOString() } : null;
    setProposals(prev => prev.map(p =>
      p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
    ));
    return changedProposal
      ? persistProposal(changedProposal).then(() => trackTenantActivity('UPDATE', 'proposal', id, { fields: Object.keys(data || {}).slice(0, 20) }))
      : Promise.resolve();
  };

  const handleUpdateMilestones = (id: string, milestones: Milestone[]) => {
    const existing = proposals.find(p => p.id === id);
    const changedProposal = existing ? { ...existing, milestones, updatedAt: new Date().toISOString() } : null;
    setProposals(prev => prev.map(p =>
      p.id === id ? { ...p, milestones, updatedAt: new Date().toISOString() } : p
    ));
    return changedProposal
      ? persistProposal(changedProposal).then(() => trackTenantActivity('UPDATE', 'proposal', id, { fields: ['milestones'] }))
      : Promise.resolve();
  };

  // --- EDITOR ACTIONS ---

  const updateCurrentData = (newData: Partial<ProposalData>, options: { persist?: boolean } = {}) => {
    if (!currentId) return;
    const shouldPersist = options.persist !== false;

    let changedProposal: ProposalData | null = null;
    setProposals(prev => prev.map(p => {
      if (p.id === currentId) {
        let updatedStage = p.stage;
        const nextType = newData.type || p.type;
        const nextPricingModule = newData.pricingModule && newData.pricingModule !== 'CRM_CORE'
          ? newData.pricingModule as PricingModuleId
          : getPricingModuleForProposal({ ...p, ...newData });
        if ((newData.type && newData.type !== p.type) || (newData.pricingModule && newData.pricingModule !== p.pricingModule)) {
          updatedStage = mapStageBetweenPipelines(
            p.stage,
            getSalesPipelineForProposal(p, brandedGlobalConfig),
            getSalesPipelineForCreation(brandedGlobalConfig, nextPricingModule, nextType)
          );
        }

        const updated = { ...p, ...newData, stage: updatedStage, updatedAt: new Date().toISOString() };

        // Auto-calculate value for CRM view snapshot if structure changes
        // Trigger calculation on key data changes
        if (newData.roles || newData.expenses || newData.markup || newData.taxConfig || newData.safetyCosts || newData.supportCosts || newData.spotResources || newData.spotExpenses) {
          const financials = calculateFinancials(updated);
          updated.value = financials.monthlyValue;
        }

        changedProposal = updated;
        return updated;
      }
      return p;
    }));
    if (changedProposal && shouldPersist) persistProposal(changedProposal).catch(() => undefined);
  };

  const updateCurrentDataDraft = (newData: Partial<ProposalData>) => updateCurrentData(newData, { persist: false });

  const saveCurrentData = async (newData: Partial<ProposalData>) => {
    if (!currentId) return;
    const existing = proposals.find(p => p.id === currentId);
    if (!existing) return;
    const changedProposal = { ...existing, ...newData, updatedAt: new Date().toISOString() };
    await persistProposal(changedProposal);
    setInitialDataSnapshot(JSON.parse(JSON.stringify(changedProposal)));
  };

  const saveNewVersionFromEditor = async (versionNotes: string) => {
    if (!currentId || !initialDataSnapshot) return;

    const currentSaved = proposals.find(p => p.id === currentId);
    if (!currentSaved) return;
    if (!currentSaved.isCurrentVersion) {
      const message = 'Nao e possivel versionar uma versao historica.';
      setCrmDataError(message);
      throw new Error(message);
    }
    const previousProposals = proposals;
    const previousCurrentId = currentId;

    // The current data inside `currentSaved` is our new V1.
    // The `initialDataSnapshot` is our old V0.

    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(now.getDate() + 15);
    const sameProposalVersions = tenantProposals.filter(p => p.proposalId === currentSaved.proposalId);
    let nextVersion = Math.max(0, ...sameProposalVersions.map(p => Number(p.version || 0))) + 1;
    const reloadTenantProposals = async () => {
      const freshProposals = await withTenantLoadTimeout(
        signal => crmRepository.listProposals(resolvedTenantId, { signal }),
        'Recarregar propostas',
        8000
      );
      replaceTenantProposals(resolvedTenantId, freshProposals);
      return freshProposals;
    };
    const remoteProposalVersions = await withTenantLoadTimeout(
      signal => crmRepository.listProposalVersions(resolvedTenantId, currentSaved.proposalId, { signal }),
      'Consultar versoes da proposta',
      8000
    );
    if (remoteProposalVersions.length > 0) {
      nextVersion = Math.max(0, ...remoteProposalVersions.map(p => Number(p.version || 0))) + 1;
    }

    // 1. We revert the original currentId proposal to its snapshot (keeping it as V0 in history)
    const revertedOriginal: ProposalData = {
      ...initialDataSnapshot,
      isCurrentVersion: false,
      updatedAt: now.toISOString()
    };

    // 2. We create a NEW proposal object that inherits the mutated state (V1)
    const newId = Math.random().toString(36).substr(2, 9);
    let newVersionedProp: ProposalData = {
      ...currentSaved,
      id: newId,
      version: nextVersion,
      versionNotes: versionNotes,
      versionStatus: 'DRAFT',
      isCurrentVersion: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expirationDate: expiry.toISOString(),
      timeline: [
        ...(currentSaved.timeline || []),
        {
          id: Math.random().toString(36).substring(2, 9),
          date: now.toISOString(),
          type: 'VERSION_CREATED',
          title: `Nova versao gerada no editor (v${nextVersion})`,
          user: currentUser.name || 'Sistema',
          metadata: { notes: versionNotes }
        }
      ]
    };

    setCrmSaving(true);
    setCrmDataError(null);
    try {
      const savedOriginal = await withTenantLoadTimeout(
        signal => crmRepository.updateProposal(revertedOriginal, resolvedTenantId, { signal }),
        'Atualizar versao anterior',
        10000
      );
      let savedNewVersion: ProposalData;
      try {
        savedNewVersion = await withTenantLoadTimeout(
          signal => crmRepository.createProposal(newVersionedProp, resolvedTenantId, { signal }),
          'Criar nova versao',
          10000
        );
      } catch (createError: any) {
        if (!isProposalVersionDuplicateError(createError)) throw createError;
        const refreshedVersions = await withTenantLoadTimeout(
          signal => crmRepository.listProposalVersions(resolvedTenantId, currentSaved.proposalId, { signal }),
          'Reconsultar versoes da proposta',
          8000
        );
        nextVersion = Math.max(0, ...refreshedVersions.map(p => Number(p.version || 0))) + 1;
        newVersionedProp = {
          ...newVersionedProp,
          id: Math.random().toString(36).substr(2, 9),
          version: nextVersion,
          timeline: [
            ...(currentSaved.timeline || []),
            {
              id: Math.random().toString(36).substring(2, 9),
              date: new Date().toISOString(),
              type: 'VERSION_CREATED',
              title: `Nova versao gerada no editor (v${nextVersion})`,
              user: currentUser.name || 'Sistema',
              metadata: { notes: versionNotes }
            }
          ]
        };
        savedNewVersion = await withTenantLoadTimeout(
          signal => crmRepository.createProposal(newVersionedProp, resolvedTenantId, { signal }),
          'Criar nova versao',
          10000
        );
      }
      setProposals(prev => {
        const updated = prev.map(p => {
          if (p.id === savedNewVersion.id || p.id === newVersionedProp.id) {
            return { ...savedNewVersion, tenantId: resolvedTenantId, isCurrentVersion: true };
          }
          if (p.id === savedOriginal.id || p.id === currentId) {
            return { ...savedOriginal, tenantId: resolvedTenantId, isCurrentVersion: false };
          }
          if (p.proposalId === savedNewVersion.proposalId) {
            return { ...p, isCurrentVersion: false };
          }
          return p;
        });
        return updated.some(p => p.id === savedNewVersion.id)
          ? updated
          : [{ ...savedNewVersion, tenantId: resolvedTenantId, isCurrentVersion: true }, ...updated];
      });
      setCurrentId(savedNewVersion.id);
      setInitialDataSnapshot(JSON.parse(JSON.stringify(savedNewVersion)));
      trackTenantActivity('VERSION_CREATE', 'proposal', savedNewVersion.id, {
        proposalNumber: savedNewVersion.proposalId,
        version: savedNewVersion.version,
        sourceId: currentSaved.id,
        notes: versionNotes,
        origin: 'editor'
      });
      try {
        const refreshedProposals = await reloadTenantProposals();
        const refreshedNewVersion = refreshedProposals.find(p => p.id === savedNewVersion.id);
        if (refreshedNewVersion) {
          setInitialDataSnapshot(JSON.parse(JSON.stringify(refreshedNewVersion)));
        }
      } catch (reloadError) {
        console.error('Erro ao recarregar propostas apos versionamento', reloadError);
      }
    } catch (error: any) {
      setCrmDataError(error.message || 'Erro ao salvar nova versão.');
      let message = getCrmSaveErrorMessage(error, 'Erro ao salvar nova versao.');
      try {
        await withTenantLoadTimeout(
          signal => crmRepository.updateProposal({ ...initialDataSnapshot, isCurrentVersion: true, updatedAt: new Date().toISOString() }, resolvedTenantId, { signal }),
          'Restaurar versao original',
          8000
        );
      } catch (rollbackError) {
        console.error('Erro ao restaurar versao original apos falha de versionamento', rollbackError);
        message = `${message} A versao anterior pode nao ter sido restaurada automaticamente; recarregue os dados do tenant.`;
      }
      let didReload = false;
      try {
        await reloadTenantProposals();
        didReload = true;
      } catch (reloadError) {
        console.error('Erro ao recarregar propostas apos falha de versionamento', reloadError);
      }
      if (!didReload) setProposals(previousProposals);
      setCurrentId(previousCurrentId);
      setCrmDataError(message);
      throw new Error(message);
    } finally {
      setCrmSaving(false);
    }
  };

  const resetCurrentData = () => {
    if (!currentId) return;
    updateCurrentData({
      roles: [],
      expenses: [],
      safetyCosts: [],
      supportCosts: [],
      spotResources: [],
      spotExpenses: []
    });
  };

  // --- RENDER ---

  const renderContent = () => {
    // 1. CRM Views
    if (view === 'CRM') {
      switch (activeTab) {
        case 'crm-dashboard':
          return <CRM
            clients={tenantClients}
            contacts={tenantContacts}
            tasks={tenantTasks}
            taskAttachments={tenantTaskAttachments}
            communications={tenantCommunications}
            externalEvents={tenantExternalEvents}
            googleConnection={googleConnection}
            googleWorkspaceLoading={googleWorkspaceLoading}
            microsoftConnection={microsoftConnection}
            microsoftWorkspaceLoading={microsoftWorkspaceLoading}
            proposals={visibleProposals}
            globalConfig={brandedGlobalConfig}
            onSelectProposal={handleSelectProposal}
            onCreateProposal={handleCreateProposal}
            onCreateTask={saveTenantTask}
            onSaveClient={saveTenantClient}
            onSaveContact={saveTenantContact}
            onTriageCommunicationThread={triageTenantCommunicationThread}
            onOpenTaskAttachment={openTenantTaskAttachment}
            onConnectGoogle={connectTenantGoogle}
            onDisconnectGoogle={disconnectTenantGoogle}
            onSyncGoogle={syncTenantGmail}
            onSendGoogleEmail={sendTenantGoogleEmail}
            onCreateGoogleMeeting={createTenantGoogleMeeting}
            onConnectMicrosoft={connectTenantMicrosoft}
            onDisconnectMicrosoft={disconnectTenantMicrosoft}
            onSyncMicrosoft={syncTenantMicrosoft}
            onSendMicrosoftEmail={sendTenantMicrosoftEmail}
            onCreateMicrosoftMeeting={createTenantMicrosoftMeeting}
            onCreateMicrosoftTodoTask={createTenantMicrosoftTodoTask}
            onCreateNewVersion={handleCreateNewVersion}
            onDuplicateProposal={handleDuplicateProposal}
            onDeleteProposal={handleDeleteProposal}
            onUpdateStage={handleUpdateStage}
            onUpdateStatus={handleUpdateStatus}
            onUpdateProposal={handleUpdateProposal}
            onUpdateMilestones={handleUpdateMilestones}
            initialViewMode="kanban"
            initialSection="pipeline"
            businessUnit={businessUnit}
            currentUser={currentUser}
            enabledModules={activeTenant.enabledModules}
          />;
        case 'crm-inbox':
          return <CRM
            clients={tenantClients}
            contacts={tenantContacts}
            tasks={tenantTasks}
            taskAttachments={tenantTaskAttachments}
            communications={tenantCommunications}
            externalEvents={tenantExternalEvents}
            googleConnection={googleConnection}
            googleWorkspaceLoading={googleWorkspaceLoading}
            microsoftConnection={microsoftConnection}
            microsoftWorkspaceLoading={microsoftWorkspaceLoading}
            proposals={visibleProposals}
            globalConfig={brandedGlobalConfig}
            onSelectProposal={handleSelectProposal}
            onCreateProposal={handleCreateProposal}
            onCreateTask={saveTenantTask}
            onSaveClient={saveTenantClient}
            onSaveContact={saveTenantContact}
            onTriageCommunicationThread={triageTenantCommunicationThread}
            onOpenTaskAttachment={openTenantTaskAttachment}
            onConnectGoogle={connectTenantGoogle}
            onDisconnectGoogle={disconnectTenantGoogle}
            onSyncGoogle={syncTenantGmail}
            onSendGoogleEmail={sendTenantGoogleEmail}
            onCreateGoogleMeeting={createTenantGoogleMeeting}
            onConnectMicrosoft={connectTenantMicrosoft}
            onDisconnectMicrosoft={disconnectTenantMicrosoft}
            onSyncMicrosoft={syncTenantMicrosoft}
            onSendMicrosoftEmail={sendTenantMicrosoftEmail}
            onCreateMicrosoftMeeting={createTenantMicrosoftMeeting}
            onCreateMicrosoftTodoTask={createTenantMicrosoftTodoTask}
            onCreateNewVersion={handleCreateNewVersion}
            onDuplicateProposal={handleDuplicateProposal}
            onDeleteProposal={handleDeleteProposal}
            onUpdateStage={handleUpdateStage}
            onUpdateStatus={handleUpdateStatus}
            onUpdateProposal={handleUpdateProposal}
            onUpdateMilestones={handleUpdateMilestones}
            initialViewMode="list"
            initialSection="inbox"
            businessUnit={businessUnit}
            currentUser={currentUser}
            enabledModules={activeTenant.enabledModules}
          />;
        case 'crm-analytics':
          return <Analytics
            proposals={visibleProposals}
            onSelectProposal={handleSelectProposal}
            businessUnit={businessUnit}
            globalConfig={brandedGlobalConfig}
          />;
        case 'crm-clients':
          return <Clients clients={tenantClients} contacts={tenantContacts} onSaveClient={saveTenantClient} onDeleteClient={deleteTenantClient} onSaveContact={saveTenantContact} onSelectProposal={handleSelectProposal} onCreateProposal={handleCreateProposal} businessUnit={businessUnit} proposals={visibleProposals} />;
        case 'crm-contacts':
          return <Contacts contacts={tenantContacts} onSaveContact={saveTenantContact} onDeleteContact={deleteTenantContact} clients={tenantClients} currentUser={currentUser} />;
        case 'crm-tasks':
          return <Tasks
            tasks={tenantTasks}
            taskAttachments={tenantTaskAttachments}
            communications={tenantCommunications}
            externalEvents={tenantExternalEvents}
            onSaveTask={saveTenantTask}
            onDeleteTask={deleteTenantTask}
            onUploadTaskAttachment={uploadTenantTaskAttachment}
            onDeleteTaskAttachment={deleteTenantTaskAttachment}
            onOpenTaskAttachment={openTenantTaskAttachment}
            googleConnection={googleConnection}
            microsoftConnection={microsoftConnection}
            onSendGoogleEmail={sendTenantGoogleEmail}
            onSendMicrosoftEmail={sendTenantMicrosoftEmail}
            clients={tenantClients}
            contacts={tenantContacts}
            proposals={visibleProposals}
            currentUser={currentUser}
            users={[
              { name: 'Admin User', role: 'Admin' },
              { name: 'Consultor Vendas', role: 'Seller' }
            ]}
          />;
        case 'crm-settings':
          return <GlobalSettings globalConfig={brandedGlobalConfig} setGlobalConfig={setGlobalConfig} />;
        case 'crm-help':
          return <Help darkMode={darkMode} />;
        default:
          return <CRM
            clients={tenantClients}
            contacts={tenantContacts}
            tasks={tenantTasks}
            taskAttachments={tenantTaskAttachments}
            communications={tenantCommunications}
            externalEvents={tenantExternalEvents}
            googleConnection={googleConnection}
            googleWorkspaceLoading={googleWorkspaceLoading}
            microsoftConnection={microsoftConnection}
            microsoftWorkspaceLoading={microsoftWorkspaceLoading}
            proposals={visibleProposals}
            globalConfig={brandedGlobalConfig}
            onSelectProposal={handleSelectProposal}
            onCreateProposal={handleCreateProposal}
            onCreateTask={saveTenantTask}
            onSaveClient={saveTenantClient}
            onSaveContact={saveTenantContact}
            onTriageCommunicationThread={triageTenantCommunicationThread}
            onOpenTaskAttachment={openTenantTaskAttachment}
            onConnectGoogle={connectTenantGoogle}
            onDisconnectGoogle={disconnectTenantGoogle}
            onSyncGoogle={syncTenantGmail}
            onSendGoogleEmail={sendTenantGoogleEmail}
            onCreateGoogleMeeting={createTenantGoogleMeeting}
            onConnectMicrosoft={connectTenantMicrosoft}
            onDisconnectMicrosoft={disconnectTenantMicrosoft}
            onSyncMicrosoft={syncTenantMicrosoft}
            onSendMicrosoftEmail={sendTenantMicrosoftEmail}
            onCreateMicrosoftMeeting={createTenantMicrosoftMeeting}
            onCreateMicrosoftTodoTask={createTenantMicrosoftTodoTask}
            onCreateNewVersion={handleCreateNewVersion}
            onDuplicateProposal={handleDuplicateProposal}
            onDeleteProposal={handleDeleteProposal}
            onUpdateStage={handleUpdateStage}
            onUpdateStatus={handleUpdateStatus}
            onUpdateProposal={handleUpdateProposal}
            onUpdateMilestones={handleUpdateMilestones}
            initialViewMode="kanban"
            initialSection="pipeline"
            businessUnit={businessUnit}
            currentUser={currentUser}
            enabledModules={activeTenant.enabledModules}
          />;
      }
    }

    // 2. Help View
    if (view === 'HELP') {
      return <Help darkMode={darkMode} />;
    }

    // 3. Editor Views
    if (!currentData) return <div>Erro: Proposta não encontrada.</div>;

    const isSpot = currentData.type === 'SPOT';
    const isContinuous = currentData.type === 'CONTINUOUS';
    const isProduct = currentData.type === 'PRODUCT';
    const allVersions = tenantProposals.filter(p => p.proposalId === currentData.proposalId).sort((a, b) => b.version - a.version);
    const currentProposalFamilyIds = new Set(allVersions.map(proposal => proposal.id));
    const isLocked = isClosedStage(currentData.stage, getSalesPipelineForProposal(currentData, brandedGlobalConfig)) || currentData.status === 'Archived';
    const effectiveActiveTab = isEditorTabAllowedForProposal(currentData, activeTab)
      ? activeTab
      : getSafeEditorTabForProposal(currentData, activeTab);

    const editorContent = (() => {
      switch (effectiveActiveTab) {
        case 'dashboard':
          return <Dashboard
            data={currentData}
            setActiveTab={setActiveTab}
            initialSnapshot={initialDataSnapshot}
            allVersions={allVersions}
            onSaveVersion={saveNewVersionFromEditor}
            onSelectVersion={handleSelectProposal}
            onUpdateVersionStatus={handleUpdateVersionStatus}
            currentUser={currentUser}
            globalConfig={brandedGlobalConfig}
          />;
        case 'docs':
          return <Documents data={currentData!} updateData={updateCurrentData} globalConfig={brandedGlobalConfig} />;

        // CONTINUOUS SPECIFIC ROUTES
        case 'team':
          return isContinuous ? <Team data={currentData} updateData={updateCurrentData} /> : null;
        case 'safety':
          return isContinuous ? <Safety data={currentData} updateData={updateCurrentData} globalConfig={brandedGlobalConfig} /> : null;
        case 'support':
          return isContinuous ? <Support data={currentData} updateData={updateCurrentData} /> : null;
        case 'costs':
          return isContinuous ? <Costs data={currentData} updateData={updateCurrentData} globalConfig={brandedGlobalConfig} /> : null;

        // SPOT SPECIFIC ROUTE
        case 'spot-editor':
          return isSpot ? <SpotEditor data={currentData} updateData={updateCurrentData} /> : null;

        // PRODUCT SPECIFIC ROUTE
        case 'saas-editor':
          return isProduct && currentData.pricingModule === 'SAAS_SUBSCRIPTION' ? <SaasSubscriptionEditor
            data={currentData}
            updateData={updateCurrentDataDraft}
            onSaveData={saveCurrentData}
            tenantBranding={tenantBranding}
            globalConfig={brandedGlobalConfig}
            contacts={tenantContacts.filter(contact => contact.clientId === currentData.clientId)}
            communications={tenantCommunications.filter(communication => Boolean(communication.proposalId && currentProposalFamilyIds.has(communication.proposalId)))}
            googleConnection={googleConnection}
            microsoftConnection={microsoftConnection}
            workspaceLoading={googleWorkspaceLoading || microsoftWorkspaceLoading}
            onSendGoogleEmail={sendTenantGoogleEmail}
            onSendMicrosoftEmail={sendTenantMicrosoftEmail}
          /> : null;
        case 'product-editor':
          return isProduct && currentData.pricingModule !== 'SAAS_SUBSCRIPTION' ? <ProductEditor data={currentData} updateData={updateCurrentData} globalConfig={brandedGlobalConfig} /> : null;

        // SHARED ROUTES
        case 'settings':
          return isEditorTabAllowedForProposal(currentData, 'settings') ? <Settings data={currentData} updateData={updateCurrentData} resetData={resetCurrentData} /> : null;
        case 'pricing':
          return isEditorTabAllowedForProposal(currentData, 'pricing') ? <Pricing data={currentData} updateData={updateCurrentData} onCreateNewVersion={handleCreateNewVersion} /> : null;
        case 'taxes':
          return isEditorTabAllowedForProposal(currentData, 'taxes') ? <Taxes data={currentData} updateData={updateCurrentData} /> : null;

        default:
          return <Dashboard data={currentData} setActiveTab={setActiveTab} globalConfig={brandedGlobalConfig} />;
      }
    })();

    return (
      <div className={isLocked && effectiveActiveTab !== 'dashboard' ? "pointer-events-none opacity-90 select-none cursor-not-allowed" : ""}>
        {editorContent}
      </div>
    );
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={(tab) => {
        // If switching from Editor tab to CRM Tab, change View Mode
        if (tab.startsWith('crm-')) {
          setView(tab === 'crm-help' ? 'HELP' : 'CRM');
        }
        setActiveTab(tab);
      }}
      onBackToCRM={() => {
        setView('CRM');
        setActiveTab('crm-dashboard');
      }}
      isCRMMode={view !== 'EDITOR'}
      proposalType={currentData?.type}
      pricingModule={currentData?.pricingModule}
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      businessUnit={businessUnit}
      setBusinessUnit={setBusinessUnit}
      currentUser={currentUser}
      setCurrentUser={setCurrentUser}
      onExitTenant={isPlatformSuperAdmin ? clearTenantSelection : undefined}
      activeTenant={activeTenant}
      googleConnection={googleConnection}
      googleWorkspaceLoading={googleWorkspaceLoading}
      microsoftConnection={microsoftConnection}
      microsoftWorkspaceLoading={microsoftWorkspaceLoading}
      onConnectGoogle={connectTenantGoogle}
      onDisconnectGoogle={disconnectTenantGoogle}
      onConnectMicrosoft={connectTenantMicrosoft}
      onDisconnectMicrosoft={disconnectTenantMicrosoft}
    >
      {(crmDataLoading || crmSaving || crmDataError) && (
        <div className="fixed right-5 top-20 z-[200] flex items-center gap-3 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-4 py-3 text-sm font-bold text-[var(--tenant-text)] shadow-xl print:hidden dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-[var(--tenant-text-dark)]">
          <span>{crmDataError || (crmSaving ? 'Salvando dados...' : 'Carregando dados do tenant...')}</span>
          {crmDataError && (
            <button
              type="button"
              onClick={() => setCrmDataError(null)}
              className="rounded p-1 text-slate-500 transition hover:bg-[var(--tenant-control)] hover:text-[var(--tenant-primary)] dark:text-slate-300 dark:hover:bg-[var(--tenant-control-dark)]"
              aria-label="Fechar aviso"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}

export default App;
