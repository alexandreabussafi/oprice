
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
import { Client, ProposalData, OpportunityStage, OpportunityStatus, OpportunityMotion, ProposalType, KitTemplate, ExpenseItem, ContinuousStage, SpotStage, CONTINUOUS_TO_SPOT_MAPPING, SPOT_TO_CONTINUOUS_MAPPING, ProposalVersionStatus, AppRole, Milestone, Contact, CRMTask } from './types';
import { calculateFinancials } from './utils/pricingEngine';
import { Moon, Sun } from 'lucide-react';

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
};

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
  }
];

function App() {
  const [view, setView] = useState<'CRM' | 'EDITOR' | 'HELP'>('CRM');
  // --- THEME STATE ---
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('oprice-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    console.log('App theme changed to:', darkMode ? 'DARK' : 'LIGHT');
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

  // --- MOCK USER STATE ---
  const [currentUser, setCurrentUser] = useState<{ name: string, role: AppRole }>({
    name: 'Admin OPrice',
    role: 'ADMIN'
  });

  // --- PERSISTENCE ---
  // Master Data State
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [tasks, setTasks] = useState<CRMTask[]>(initialTasks);
  // Migration logic for separating terminal stages from activity status
  const migrateLegacyProposals = (props: any[]): ProposalData[] => {
    return props.map(p => {
      let newStage = p.stage;
      let newStatus = p.status;

      // If status implies a terminal state, move it to Stage and reset Status to Active (or Archived)
      if (['Won', 'Lost'].includes(p.status)) {
        newStage = p.status as OpportunityStage;
        newStatus = 'Active';
      }
      // If status was Canceled or OnHold, treat as Archived or Frozen
      if (['Canceled', 'OnHold'].includes(p.status)) {
        newStatus = p.status === 'OnHold' ? 'Frozen' : 'Archived';
      }

      return {
        ...p,
        stage: newStage,
        status: newStatus as OpportunityStatus,
        versionStatus: p.versionStatus || 'DRAFT',
        isCurrentVersion: p.isCurrentVersion !== undefined ? p.isCurrentVersion : true
      };
    });
  };

  const [proposals, setProposals] = useState<ProposalData[]>(migrateLegacyProposals(mockInitialProposals));

  // Global Settings State (Mocking a singleton proposal to hold global config)
  const [globalConfig, setGlobalConfig] = useState<ProposalData>({
    ...defaultProposalTemplate,
    id: 'global-config',
    clientName: 'Configuração Global',
    kitTemplates: defaultKits, // Init with default kits
    // Global Defaults
    markup: 0.30,
    financialCostRate: 0.025,
    contingencyRate: 0.05
  });

  // State: Currently selected proposal ID
  const [currentId, setCurrentId] = useState<string | null>(null);

  // State: Initial snapshot of the current proposal when opened (for versioning diff)
  const [initialDataSnapshot, setInitialDataSnapshot] = useState<ProposalData | null>(null);

  // Computed: The actual data object of the current proposal
  const currentData = proposals.find(p => p.id === currentId);

  // --- CRM ACTIONS ---

  const handleCreateProposal = (payload: { type: ProposalType, clientId: string, motion: OpportunityMotion, referenceId?: string, expansionType?: 'Volume' | 'Scope' | 'Site' }) => {
    const selectedClient = clients.find(c => c.id === payload.clientId) || clients[0];


    const referenceProp = payload.referenceId ? proposals.find(p => p.id === payload.referenceId) : null;
    const shouldInheritRef = referenceProp && ['Renewal', 'Reactivation', 'Addendum', 'Expansion'].includes(payload.motion);

    const newId = Math.random().toString(36).substr(2, 9);
    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + 15);

    const newProp: ProposalData = {
      ...defaultProposalTemplate,
      id: newId,
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
      stage: 'Pricing',
      status: 'Active',
      type: payload.type,
      referenceOpportunityId: payload.referenceId,
      expansionType: payload.expansionType,
      // INHERIT GLOBAL SETTINGS
      taxConfig: globalConfig.taxConfig,
      markup: globalConfig.markup,
      pricingModel: globalConfig.pricingModel || 'MARKUP',
      targetMargin: globalConfig.targetMargin || 0.20,
      financialCostRate: globalConfig.financialCostRate,
      contingencyRate: globalConfig.contingencyRate,
      accountingConfig: globalConfig.accountingConfig,
    };
    setProposals([newProp, ...proposals]);
    setCurrentId(newId);
    setView('EDITOR');
    setActiveTab('dashboard'); // Default start tab
  };

  const handleCreateNewVersion = (id: string, notes?: string) => {
    const source = proposals.find(p => p.id === id);
    if (!source) return;

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
      stage: 'Pricing',
      status: 'Active',
      motion: source.motion === 'NewBusiness' ? 'NewBusiness' : source.motion,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      expirationDate: expiry.toISOString(),
    };

    setProposals([newProp, ...updatedProposals]);
    setCurrentId(newId); // Auto-navigate to the new version
  };

  const handleUpdateVersionStatus = (id: string, newStatus: ProposalVersionStatus) => {
    setProposals(prev => prev.map(p =>
      p.id === id ? { ...p, versionStatus: newStatus, updatedAt: new Date().toISOString() } : p
    ));
  };

  const handleDuplicateProposal = (id: string) => {
    const source = proposals.find(p => p.id === id);
    if (!source) return;

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
      stage: 'Pricing',
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      expirationDate: expiry.toISOString(),
    };
    setProposals([newProp, ...proposals]);
  };

  const handleDeleteProposal = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta proposta?')) {
      setProposals(proposals.filter(p => p.id !== id));
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
    }
    setCurrentId(id);
    setView('EDITOR');
    setActiveTab('dashboard');
  };

  const handleUpdateStage = (id: string, newStage: OpportunityStage) => {
    setProposals(prev => prev.map(p =>
      p.id === id ? { ...p, stage: newStage, updatedAt: new Date().toISOString() } : p
    ));
  };

  const handleUpdateStatus = (id: string, newStatus: OpportunityStatus) => {
    setProposals(prev => prev.map(p =>
      p.id === id ? { ...p, status: newStatus, updatedAt: new Date().toISOString() } : p
    ));
  };

  const handleUpdateProposal = (id: string, data: Partial<ProposalData>) => {
    setProposals(prev => prev.map(p =>
      p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
    ));
  };

  const handleUpdateMilestones = (id: string, milestones: Milestone[]) => {
    setProposals(prev => prev.map(p =>
      p.id === id ? { ...p, milestones, updatedAt: new Date().toISOString() } : p
    ));
  };

  // --- EDITOR ACTIONS ---

  const updateCurrentData = (newData: Partial<ProposalData>) => {
    if (!currentId) return;

    setProposals(prev => prev.map(p => {
      if (p.id === currentId) {
        // Handle Stage Mapping if Type is changing
        let updatedStage = p.stage;
        if (newData.type && newData.type !== p.type) {
          if (newData.type === 'SPOT') {
            updatedStage = CONTINUOUS_TO_SPOT_MAPPING[p.stage as ContinuousStage] || 'MQL';
          } else {
            updatedStage = SPOT_TO_CONTINUOUS_MAPPING[p.stage as SpotStage] || 'MQL';
          }
        }

        const updated = { ...p, ...newData, stage: updatedStage, updatedAt: new Date().toISOString() };

        // Auto-calculate value for CRM view snapshot if structure changes
        // Trigger calculation on key data changes
        if (newData.roles || newData.expenses || newData.markup || newData.taxConfig || newData.safetyCosts || newData.supportCosts || newData.spotResources || newData.spotExpenses) {
          const financials = calculateFinancials(updated);
          updated.value = financials.monthlyValue;
        }

        return updated;
      }
      return p;
    }));
  };

  const saveNewVersionFromEditor = (versionNotes: string) => {
    if (!currentId || !initialDataSnapshot) return;

    const currentSaved = proposals.find(p => p.id === currentId);
    if (!currentSaved) return;

    // The current data inside `currentSaved` is our new V1.
    // The `initialDataSnapshot` is our old V0.

    // 1. We revert the original currentId proposal to its snapshot (keeping it as V0 in history)
    const revertedOriginal = { ...initialDataSnapshot, updatedAt: new Date().toISOString() };

    // 2. We create a NEW proposal object that inherits the mutated state (V1)
    const newId = Math.random().toString(36).substr(2, 9);
    const newVersionedProp: ProposalData = {
      ...currentSaved,
      id: newId,
      version: initialDataSnapshot.version + 1,
      versionNotes: versionNotes,
      updatedAt: new Date().toISOString(),
    };

    setProposals(prev => prev.map(p => p.id === currentId ? revertedOriginal : p).concat(newVersionedProp));

    // 3. Shift the Editor to the newly created version
    setCurrentId(newId);
    setInitialDataSnapshot(JSON.parse(JSON.stringify(newVersionedProp)));
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
            clients={clients}
            proposals={proposals}
            onSelectProposal={handleSelectProposal}
            onCreateProposal={handleCreateProposal}
            onCreateNewVersion={handleCreateNewVersion}
            onDuplicateProposal={handleDuplicateProposal}
            onDeleteProposal={handleDeleteProposal}
            onUpdateStage={handleUpdateStage}
            onUpdateStatus={handleUpdateStatus}
            onUpdateProposal={handleUpdateProposal}
            initialViewMode="kanban"
            currentUser={currentUser}
          />;
        case 'crm-analytics':
          return <Analytics
            proposals={proposals}
            onSelectProposal={handleSelectProposal}
          />;
        case 'crm-clients':
          return <Clients clients={clients} setClients={setClients} proposals={proposals} />;
        case 'crm-contacts':
          return <Contacts contacts={contacts} setContacts={setContacts} clients={clients} currentUser={currentUser} />;
        case 'crm-tasks':
          return <Tasks
            tasks={tasks}
            setTasks={setTasks}
            clients={clients}
            contacts={contacts}
            proposals={proposals}
            currentUser={currentUser}
            users={[
              { name: 'Admin User', role: 'Admin' },
              { name: 'Consultor Vendas', role: 'Seller' }
            ]}
          />;
        case 'crm-settings':
          return <GlobalSettings globalConfig={globalConfig} setGlobalConfig={setGlobalConfig} />;
        case 'crm-help':
          return <Help darkMode={darkMode} />;
        default:
          return <CRM
            clients={clients}
            proposals={proposals}
            onSelectProposal={handleSelectProposal}
            onCreateProposal={handleCreateProposal}
            onCreateNewVersion={handleCreateNewVersion}
            onDuplicateProposal={handleDuplicateProposal}
            onDeleteProposal={handleDeleteProposal}
            onUpdateStage={handleUpdateStage}
            onUpdateStatus={handleUpdateStatus}
            onUpdateProposal={handleUpdateProposal}
            initialViewMode="kanban"
            currentUser={currentUser}
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
    const allVersions = proposals.filter(p => p.proposalId === currentData.proposalId).sort((a, b) => b.version - a.version);
    const isLocked = ['Won', 'Lost'].includes(currentData.stage) || currentData.status === 'Archived';

    const editorContent = (() => {
      switch (activeTab) {
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
          />;
        case 'docs':
          return <Documents data={currentData} updateData={updateCurrentData} />;

        // CONTINUOUS SPECIFIC ROUTES
        case 'team':
          return !isSpot ? <Team data={currentData} updateData={updateCurrentData} /> : null;
        case 'safety':
          return !isSpot ? <Safety data={currentData} updateData={updateCurrentData} globalConfig={globalConfig} /> : null;
        case 'support':
          return !isSpot ? <Support data={currentData} updateData={updateCurrentData} /> : null;
        case 'costs':
          return !isSpot ? <Costs data={currentData} updateData={updateCurrentData} globalConfig={globalConfig} /> : null;

        // SPOT SPECIFIC ROUTE
        case 'spot-editor':
          return isSpot ? <SpotEditor data={currentData} updateData={updateCurrentData} /> : null;

        // SHARED ROUTES
        case 'settings':
          return <Settings data={currentData} updateData={updateCurrentData} resetData={resetCurrentData} />;
        case 'pricing':
          return <Pricing data={currentData} updateData={updateCurrentData} onCreateNewVersion={handleCreateNewVersion} />;
        case 'taxes':
          return <Taxes data={currentData} updateData={updateCurrentData} />;

        default:
          return <Dashboard data={currentData} setActiveTab={setActiveTab} />;
      }
    })();

    return (
      <div className={isLocked && activeTab !== 'dashboard' ? "pointer-events-none opacity-90 select-none cursor-not-allowed" : ""}>
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
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      currentUser={currentUser}
      setCurrentUser={setCurrentUser}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
