
import React from 'react';
import { LayoutDashboard, Users, Calculator, FileText, PieChart, DollarSign, Settings, ArrowLeft, Briefcase, LayoutGrid, FolderOpen, BarChart3, Globe, HardHat, Truck, FileCheck, Zap, Sun, Moon, HelpCircle } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onBackToCRM: () => void;
  isCRMMode: boolean;
  proposalType?: 'CONTINUOUS' | 'SPOT'; // Type awareness for dynamic menu
  darkMode?: boolean;
  toggleDarkMode?: () => void;
  currentUser: { name: string; role: 'ADMIN' | 'SELLER' | 'MANAGER' };
  setCurrentUser: (user: { name: string; role: 'ADMIN' | 'SELLER' | 'MANAGER' }) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onBackToCRM, isCRMMode, proposalType, darkMode, toggleDarkMode, currentUser, setCurrentUser }) => {

  // Menu Global do CRM
  const crmMenuItems = [
    { id: 'crm-analytics', label: 'Analytics & KPIs', icon: BarChart3 },
    { id: 'crm-dashboard', label: 'Oportunidades (Funil)', icon: LayoutGrid },
    { id: 'crm-clients', label: 'Contas (Empresas)', icon: FolderOpen },
    { id: 'crm-contacts', label: 'Contatos', icon: Users },
    { id: 'crm-tasks', label: 'Tarefas & Atividades', icon: FileCheck },
    { id: 'crm-help', label: 'Ajuda & Manuais', icon: HelpCircle },
  ];


  if (currentUser.role === 'ADMIN') {
    crmMenuItems.push({ id: 'crm-settings', label: 'Configurações Globais', icon: Globe });
  }

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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 print:block print:h-auto print:static print:overflow-visible">

      {/* Sidebar - Alive & Light/Dark Theme */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 border-r border-slate-200 dark:border-slate-800 print:hidden flex flex-col">

        {/* Header da Sidebar */}
        <div className="flex h-24 items-center gap-4 px-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex h-16 w-16 items-center justify-center p-0">
            <img src="/logo.png" alt="OPrice Logo" className="h-full w-full object-contain brightness-110" />
          </div>
          <div>
            <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-800 dark:text-slate-100 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-blue-600 dark:from-indigo-400 dark:to-blue-400">OPrice</h1>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              {isCRMMode ? 'Industrial Engine' : (proposalType === 'SPOT' ? 'Projeto Spot' : 'Contrato Mensal')}
            </p>
          </div>
        </div>

        {/* Botão Voltar (Apenas no Modo Editor) */}
        {!isCRMMode && (
          <div className="px-4 pt-5 pb-2">
            <button
              onClick={onBackToCRM}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-300 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow active:scale-95 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Voltar ao CRM
            </button>
            <div className="mt-5 mb-2 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent mx-2"></div>
          </div>
        )}

        {/* Navegação */}
        <nav className="space-y-1.5 px-3 py-4 flex-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // No modo CRM, activeTab controla a página renderizada (dashboard, clients, settings)
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 group ${isActive
                  ? 'bg-gradient-to-r from-indigo-50 to-blue-50/50 dark:from-indigo-900/40 dark:to-blue-900/40 text-indigo-700 dark:text-indigo-300 border-l-4 border-indigo-600 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:translate-x-1'
                  }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30'}`}>
                  <Icon size={18} />
                </div>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Toggle Theme & User Footer */}
        <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 space-y-4">

          {/* THEME TOGGLE */}
          <button
            onClick={toggleDarkMode}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              {darkMode ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-indigo-600" />}
              <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
            </div>
            <div className="h-5 w-9 rounded-full bg-slate-100 dark:bg-slate-700 relative p-1 transition-colors">
              <div className={`h-3 w-3 rounded-full bg-white shadow transition-all duration-300 ${darkMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
          </button>

          <div className="relative group">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow transition-all cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-black text-xs shadow-inner">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{currentUser.name}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {currentUser.role === 'ADMIN' ? 'Administrador' : currentUser.role === 'MANAGER' ? 'Gestor' : 'Vendedor'}
                </p>
              </div>
            </div>

            {/* Hover Menu for User Switch (Mock Simulation) */}
            <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden z-[100]">
              <div className="p-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center bg-slate-50 dark:bg-slate-900/50">
                Testar Como:
              </div>
              <button
                onClick={() => setCurrentUser({ name: 'Admin OPrice', role: 'ADMIN' })}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Admin (Total Acesso)
              </button>
              <button
                onClick={() => setCurrentUser({ name: 'João Gestor', role: 'MANAGER' })}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Gestor (Aprovação)
              </button>
              <button
                onClick={() => setCurrentUser({ name: 'Ana Vendedora', role: 'SELLER' })}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Vendedora (Solicitante)
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Unlocked for Print */}
      <main className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950/20 print:bg-white print:overflow-visible print:h-auto print:block print:w-full print:static">
        {children}
      </main>
    </div>
  );
};

export default Layout;
