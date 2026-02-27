
import React from 'react';
import { LayoutDashboard, Users, Calculator, FileText, PieChart, DollarSign, Settings, ArrowLeft, Briefcase, LayoutGrid, FolderOpen, BarChart3, Globe, HardHat, Truck, FileCheck, Zap } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onBackToCRM: () => void;
  isCRMMode: boolean;
  proposalType?: 'CONTINUOUS' | 'SPOT'; // Type awareness for dynamic menu
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onBackToCRM, isCRMMode, proposalType }) => {

  // Menu Global do CRM
  const crmMenuItems = [
    { id: 'crm-dashboard', label: 'Gestão de Propostas', icon: LayoutGrid },
    { id: 'crm-analytics', label: 'Analytics & KPIs', icon: BarChart3 }, // New Item
    { id: 'crm-clients', label: 'Carteira de Clientes', icon: FolderOpen },
    { id: 'crm-settings', label: 'Configurações Globais', icon: Globe },
  ];

  // Menu Contextual do Editor CONTINUOUS
  const continuousMenuItems = [
    { id: 'dashboard', label: 'Dashboard Proposta', icon: LayoutDashboard },
    { id: 'docs', label: 'Documentos & Escopo', icon: Briefcase },
    { id: 'team', label: 'Equipe & Salários', icon: Users },
    { id: 'safety', label: 'Segurança (SMS)', icon: HardHat },
    { id: 'support', label: 'Suporte & Gestão', icon: Truck },
    { id: 'costs', label: 'Custos Operacionais', icon: Calculator },
    { id: 'pricing', label: 'Precificação (BDI)', icon: DollarSign },
    { id: 'settings', label: 'Configurações Local', icon: Settings },
  ];

  // Menu Contextual do Editor SPOT (Simplified)
  const spotMenuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'spot-editor', label: 'Escopo & Custos', icon: Zap }, // New Combined Editor
    { id: 'docs', label: 'Documentos', icon: FileText },
    { id: 'pricing', label: 'Fechamento (DRE)', icon: DollarSign },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  // Decide qual menu mostrar
  let menuItems = crmMenuItems;
  if (!isCRMMode) {
    menuItems = proposalType === 'SPOT' ? spotMenuItems : continuousMenuItems;
  }

  return (
    // PRINT FIX: Reset min-h-screen and flex to allow natural document flow
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 print:block print:h-auto print:static print:overflow-visible">

      {/* Sidebar - Always visible now, changes context */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a] text-white shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 border-r border-white/5 print:hidden flex flex-col">

        {/* Header da Sidebar */}
        <div className="flex h-20 items-center gap-3 px-6 border-b border-white/10 bg-[#020617] shrink-0">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="OPrice Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-tight">OPrice</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">
              {isCRMMode ? 'CRM Industrial' : (proposalType === 'SPOT' ? 'Projeto Spot' : 'Contrato Mensal')}
            </p>
          </div>
        </div>

        {/* Botão Voltar (Apenas no Modo Editor) */}
        {!isCRMMode && (
          <div className="px-3 pt-4 pb-2">
            <button
              onClick={onBackToCRM}
              className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/5 hover:border-white/20 bg-white/5"
            >
              <ArrowLeft size={16} /> Voltar ao CRM
            </button>
            <div className="mt-4 mb-2 h-px bg-white/10 mx-2"></div>
          </div>
        )}

        {/* Navegação */}
        <nav className="space-y-1 px-3 py-4 flex-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // No modo CRM, activeTab controla a página renderizada (dashboard, clients, settings)
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 group ${isActive
                  ? 'bg-white/10 text-white shadow-inner border-l-4 border-[#fbbf24]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <Icon size={20} className={`transition-colors ${isActive ? 'text-[#fbbf24]' : 'text-slate-500 group-hover:text-white'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer do Usuário */}
        <div className="mt-auto p-4 border-t border-white/10 bg-[#020617] shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white font-bold text-xs">
              AL
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Admin OPrice</p>
              <p className="text-xs text-slate-500">Gestor Comercial</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Unlocked for Print */}
      <main className="flex-1 overflow-auto bg-slate-50/50 print:bg-white print:overflow-visible print:h-auto print:block print:w-full print:static">
        {children}
      </main>
    </div>
  );
};

export default Layout;
