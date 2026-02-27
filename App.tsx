
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
import { ProposalData, Client, ProposalStatus, KitTemplate, ProposalType } from './types';
import { calculateFinancials } from './utils/pricingEngine';

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
  type: 'CONTINUOUS', // Default
  status: 'Draft',
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
};

// Initial Mock Clients
const initialClients: Client[] = [
    { id: 'c1', name: 'Electrolux do Brasil', industry: 'Eletrodomésticos', status: 'Active', location: 'Curitiba - PR', cnpj: '00.000.000/0001-91', contactName: 'Ricardo Souza', email: 'ricardo.souza@electrolux.com', phone: '(41) 3333-9999' },
    { id: 'c2', name: 'Klabin S.A.', industry: 'Papel e Celulose', status: 'Active', location: 'Telêmaco Borba - PR', cnpj: '89.637.490/0001-45', contactName: 'Mariana Oliveira', email: 'compras@klabin.com.br', phone: '(42) 3271-0000' },
    { id: 'c3', name: 'Gerdau', industry: 'Siderurgia', status: 'Active', location: 'Sapucaia do Sul - RS', cnpj: '33.611.500/0001-19', contactName: 'Fernando Torres', email: 'ftorres@gerdau.com.br', phone: '(51) 3455-0000' },
    { id: 'c4', name: 'Votorantim Cimentos', industry: 'Cimento', status: 'Inactive', location: 'São Paulo - SP', cnpj: '01.637.895/0001-32', contactName: 'Juliana Mendes', email: 'jmendes@vcimentos.com', phone: '(11) 2111-0000' }
];

// Initial Mock Data
const mockInitialProposals: ProposalData[] = [
    {
        ...defaultProposalTemplate,
        id: 'mock-1',
        clientId: 'c1',
        clientName: 'Electrolux - Unidade PR',
        proposalId: '180256',
        status: 'Negotiation',
        type: 'CONTINUOUS',
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
        status: 'Won',
        type: 'CONTINUOUS',
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
        status: 'Lost',
        type: 'SPOT',
        version: 1,
        value: 12000,
        createdAt: new Date('2023-08-20').toISOString(),
        expirationDate: new Date('2023-09-05').toISOString(),
        responsible: 'Roberto Almeida',
        taxConfig: defaultTaxConfig,
    }
];

function App() {
  const [view, setView] = useState<'CRM' | 'EDITOR'>('CRM');
  const [activeTab, setActiveTab] = useState('crm-dashboard');
  
  // Master Data State
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [proposals, setProposals] = useState<ProposalData[]>(mockInitialProposals);
  
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

  // Computed: The actual data object of the current proposal
  const currentData = proposals.find(p => p.id === currentId);

  // --- CRM ACTIONS ---

  const handleCreateProposal = (type: ProposalType = 'CONTINUOUS') => {
    // Basic Client Selection (Mocked as simple prompt for now, usually would be a modal)
    let selectedClient = clients[0];
    
    const newId = Math.random().toString(36).substr(2, 9);
    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + 15);

    const newProp: ProposalData = {
        ...defaultProposalTemplate,
        id: newId,
        type: type, // Set specific type
        proposalId: Math.floor(Math.random() * 1000000).toString(),
        createdAt: today.toISOString(),
        expirationDate: expiry.toISOString(),
        clientId: selectedClient.id,
        clientName: selectedClient.name,
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

  const handleCloneProposal = (id: string) => {
    const source = proposals.find(p => p.id === id);
    if (!source) return;

    const newId = Math.random().toString(36).substr(2, 9);
    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + 15);

    const newProp: ProposalData = {
        ...source,
        id: newId,
        version: source.version + 1,
        status: 'Draft',
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
    setCurrentId(id);
    setView('EDITOR');
    setActiveTab('dashboard');
  };

  const handleUpdateProposalStatus = (id: string, newStatus: ProposalStatus) => {
      setProposals(prev => prev.map(p => 
          p.id === id ? { ...p, status: newStatus, updatedAt: new Date().toISOString() } : p
      ));
  };

  // --- EDITOR ACTIONS ---

  const updateCurrentData = (newData: Partial<ProposalData>) => {
    if (!currentId) return;
    
    setProposals(prev => prev.map(p => {
        if (p.id === currentId) {
            const updated = { ...p, ...newData, updatedAt: new Date().toISOString() };
            
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
                        proposals={proposals}
                        onSelectProposal={handleSelectProposal}
                        onCreateProposal={handleCreateProposal}
                        onCloneProposal={handleCloneProposal}
                        onDeleteProposal={handleDeleteProposal}
                        onUpdateStatus={handleUpdateProposalStatus}
                        initialViewMode="kanban"
                    />;
            case 'crm-analytics': 
                return <CRM 
                        proposals={proposals}
                        onSelectProposal={handleSelectProposal}
                        onCreateProposal={handleCreateProposal}
                        onCloneProposal={handleCloneProposal}
                        onDeleteProposal={handleDeleteProposal}
                        onUpdateStatus={handleUpdateProposalStatus}
                        initialViewMode="analytics"
                    />;
            case 'crm-clients':
                return <Clients clients={clients} setClients={setClients} proposals={proposals} />;
            case 'crm-settings':
                return <GlobalSettings globalConfig={globalConfig} setGlobalConfig={setGlobalConfig} />;
            default:
                return <CRM 
                        proposals={proposals}
                        onSelectProposal={handleSelectProposal}
                        onCreateProposal={handleCreateProposal}
                        onCloneProposal={handleCloneProposal}
                        onDeleteProposal={handleDeleteProposal}
                        onUpdateStatus={handleUpdateProposalStatus}
                        initialViewMode="kanban"
                    />;
        }
    }

    // 2. Editor Views
    if (!currentData) return <div>Erro: Proposta não encontrada.</div>;

    const isSpot = currentData.type === 'SPOT';

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard data={currentData} setActiveTab={setActiveTab} />;
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
        return <Pricing data={currentData} updateData={updateCurrentData} />;
      case 'taxes':
        return <Taxes data={currentData} updateData={updateCurrentData} />;
        
      default:
        return <Dashboard data={currentData} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
            // If switching from Editor tab to CRM Tab, change View Mode
            if (tab.startsWith('crm-')) {
                setView('CRM');
            }
            setActiveTab(tab);
        }}
        onBackToCRM={() => {
            setView('CRM');
            setActiveTab('crm-dashboard');
        }}
        isCRMMode={view === 'CRM'}
        proposalType={currentData?.type}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
