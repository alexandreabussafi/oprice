
import React, { useState } from 'react';
import { ProposalData, ExpenseItem } from '../types';
import { Plus, Trash2, Truck, Wrench, Shield, Monitor, LayoutGrid, LayoutList, Wand2, Users, Calculator, Info, AlertCircle, Package, Clock, DollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/pricingEngine';

interface CostsProps {
  data: ProposalData;
  updateData: (newData: Partial<ProposalData>) => void;
  globalConfig?: ProposalData; // Optional global config for kit import
}

const Costs: React.FC<CostsProps> = ({ data, updateData, globalConfig }) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showKitSelector, setShowKitSelector] = useState(false);

  // Calculate Operational HC for calculations
  const operationalHC = data.roles
    .filter(r => r.category === 'Operational')
    .reduce((acc, r) => acc + r.quantity, 0);

  const addExpense = (category: ExpenseItem['category']) => {
    const newExpense: ExpenseItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Novo Item',
      unitPrice: 0,
      lifespan: 1,
      allocation: 'Fixed',
      category,
    };
    updateData({ expenses: [...data.expenses, newExpense] });
  };

  const removeExpense = (id: string) => {
    updateData({ expenses: data.expenses.filter((e) => e.id !== id) });
  };

  const updateExpense = (id: string, field: keyof ExpenseItem, value: any) => {
    const updatedExpenses = data.expenses.map((e) => {
      if (e.id === id) return { ...e, [field]: value };
      return e;
    });
    updateData({ expenses: updatedExpenses });
  };

  // Import Kit Logic
  const importKit = (kitId: string) => {
      if (!globalConfig?.kitTemplates) return;
      const kit = globalConfig.kitTemplates.find(k => k.id === kitId);
      if (!kit) return;

      const newItems: ExpenseItem[] = kit.items.map(item => ({
          id: Math.random().toString(36).substr(2, 9),
          name: item.name, // Simplified name
          unitPrice: item.unitPrice,
          lifespan: item.lifespan,
          allocation: 'PerHead', // Default allocation for kits
          category: item.category
      }));

      updateData({ expenses: [...data.expenses, ...newItems] });
      setShowKitSelector(false);
  };

  const categories = [
    { id: 'EPI', label: 'EPIs & Uniformes', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { id: 'Tools', label: 'Ferramental', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { id: 'Vehicles', label: 'Veículos & Logística', icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { id: 'IT', label: 'TI & Consumíveis', icon: Monitor, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  ] as const;

  // Helper to calc monthly provision per item
  const calculateItemMonthly = (item: ExpenseItem) => {
      const months = item.lifespan > 0 ? item.lifespan : 1;
      const amortized = item.unitPrice / months;
      const qty = item.allocation === 'PerHead' ? operationalHC : 1;
      return amortized * qty;
  };

  const totalMonthlyCosts = data.expenses.reduce((acc, e) => acc + calculateItemMonthly(e), 0);
  const totalContractCosts = totalMonthlyCosts * 12;

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Custos Operacionais</h2>
          <p className="text-slate-500 text-sm mt-1">Materiais, EPIs, Mobilização e Despesas Administrativas.</p>
        </div>
        
        {/* View Toggle Toolbar */}
        <div className="flex items-center gap-3">
             {globalConfig?.kitTemplates && globalConfig.kitTemplates.length > 0 && (
                 <div className="relative">
                     <button 
                        onClick={() => setShowKitSelector(!showKitSelector)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors"
                     >
                         <Package size={18} /> Importar Kit Padrão
                     </button>
                     {showKitSelector && (
                         <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                             <div className="p-3 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase">Selecione um Kit</div>
                             <div className="max-h-64 overflow-y-auto">
                                 {globalConfig.kitTemplates.map(kit => (
                                     <button 
                                        key={kit.id}
                                        onClick={() => importKit(kit.id)}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-slate-700 transition-colors border-b border-slate-50 last:border-0"
                                     >
                                         <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0">
                                             <Package size={16} />
                                         </div>
                                         <div>
                                             <span className="block text-sm font-bold">{kit.name}</span>
                                             <span className="block text-[10px] text-slate-400">{kit.items.length} itens</span>
                                         </div>
                                     </button>
                                 ))}
                             </div>
                         </div>
                     )}
                 </div>
             )}

             <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-100 text-[#0f172a] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Visualização em Lista"
                >
                  <LayoutList size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-[#0f172a] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Visualização em Cards"
                >
                  <LayoutGrid size={18} />
                </button>
             </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        
        {/* LEFT CONTENT: CATEGORY SECTIONS */}
        <div className="flex-1 w-full space-y-6">
            {categories.map((cat) => {
              const catExpenses = data.expenses.filter((e) => e.category === cat.id);
              const catTotal = catExpenses.reduce((acc, e) => acc + calculateItemMonthly(e), 0);
              const Icon = cat.icon;

              return (
                <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Category Header */}
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${cat.bg} ${cat.color} border ${cat.border}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                          <h3 className="font-bold text-slate-800 text-base">{cat.label}</h3>
                          {cat.id === 'EPI' && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                                  <Users size={12} className="text-slate-400" /> Multiplicador (HC Operacional): <strong className="text-slate-700">{operationalHC}</strong>
                              </p>
                          )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="text-right pl-4 border-l border-slate-200">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Mensal</p>
                            <span className="font-bold text-slate-800 text-lg">{formatCurrency(catTotal)}</span>
                        </div>
                    </div>
                  </div>
                  
                  <div className="p-0">
                    {viewMode === 'list' ? (
                       /* LIST VIEW */
                       <div className="overflow-x-auto">
                           <table className="w-full text-sm text-left">
                               <thead className="bg-white text-slate-400 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
                                   <tr>
                                       <th className="px-6 py-3 w-1/3">Item / Descrição</th>
                                       <th className="px-4 py-3">Valor Unitário</th>
                                       <th className="px-4 py-3">Vida Útil</th>
                                       <th className="px-4 py-3">Alocação</th>
                                       <th className="px-6 py-3 text-right">Provisão Mensal</th>
                                       <th className="px-4 py-3 w-12"></th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-10">
                                   {catExpenses.map((expense) => (
                                       <tr key={expense.id} className="hover:bg-slate-50/50 group transition-colors">
                                           <td className="px-6 py-3">
                                               <input
                                                type="text"
                                                value={expense.name}
                                                onChange={(e) => updateExpense(expense.id, 'name', e.target.value)}
                                                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#fbbf24] focus:ring-0 p-0 py-1 text-slate-700 font-bold placeholder-slate-400 text-sm transition-all"
                                                placeholder="Nome do item"
                                               />
                                           </td>
                                           <td className="px-4 py-3">
                                               <div className="relative">
                                                    <span className="absolute left-2 top-1.5 text-slate-400 text-xs font-bold">R$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={expense.unitPrice}
                                                        onChange={(e) => updateExpense(expense.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                        className="w-28 bg-white border border-slate-200 rounded px-2 pl-8 py-1 text-sm font-bold text-slate-700 focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24]"
                                                    />
                                               </div>
                                           </td>
                                           <td className="px-4 py-3">
                                               <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={expense.lifespan}
                                                        onChange={(e) => updateExpense(expense.id, 'lifespan', parseInt(e.target.value) || 1)}
                                                        className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-center text-sm font-bold text-slate-700 focus:border-[#fbbf24] focus:ring-1 focus:ring-[#fbbf24]"
                                                    />
                                                    <span className="text-[11px] font-medium text-slate-400">meses</span>
                                               </div>
                                           </td>
                                           <td className="px-4 py-3">
                                                <div className="flex bg-slate-100 rounded p-1 w-fit">
                                                    <button 
                                                        onClick={() => updateExpense(expense.id, 'allocation', 'Fixed')}
                                                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${expense.allocation === 'Fixed' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        Fixo
                                                    </button>
                                                    <button 
                                                        onClick={() => updateExpense(expense.id, 'allocation', 'PerHead')}
                                                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${expense.allocation === 'PerHead' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        x HC
                                                    </button>
                                                </div>
                                           </td>
                                           <td className="px-6 py-3 text-right">
                                               <div className="flex flex-col items-end">
                                                   <span className="font-bold text-slate-700">{formatCurrency(calculateItemMonthly(expense))}</span>
                                                   {expense.allocation === 'PerHead' && operationalHC > 1 && (
                                                       <span className="text-[9px] text-slate-400">x {operationalHC} pessoas</span>
                                                   )}
                                               </div>
                                           </td>
                                           <td className="px-4 py-3 text-center">
                                               <button
                                                 onClick={() => removeExpense(expense.id)}
                                                 className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                 title="Remover item"
                                               >
                                                 <Trash2 size={16} />
                                               </button>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                    ) : (
                        /* UPDATED GRID/CARD VIEW - CLEANER & COMPACT */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                            {catExpenses.map((expense) => (
                                <div key={expense.id} className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-3 flex flex-col gap-3">
                                    
                                    {/* Remove Button (Absolute) */}
                                    <button
                                        onClick={() => removeExpense(expense.id)}
                                        className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100 z-10"
                                        title="Remover"
                                    >
                                        <Trash2 size={14} />
                                    </button>

                                    {/* Header: Item Name */}
                                    <div className="pr-6">
                                        <input
                                            type="text"
                                            value={expense.name}
                                            onChange={(e) => updateExpense(expense.id, 'name', e.target.value)}
                                            className="w-full text-sm font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0 placeholder-slate-300 truncate leading-tight"
                                            placeholder="Nome do item"
                                        />
                                        <div className="h-px bg-slate-100 w-full mt-2"></div>
                                    </div>

                                    {/* Middle: Inputs Grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-400 font-bold uppercase">Valor Unit.</label>
                                            <div className="flex items-center bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
                                                <span className="text-[10px] font-bold text-slate-400 mr-1">R$</span>
                                                <input
                                                    type="number"
                                                    value={expense.unitPrice}
                                                    onChange={(e) => updateExpense(expense.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none p-0 border-none focus:ring-0"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-400 font-bold uppercase">Vida Útil</label>
                                            <div className="flex items-center bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
                                                <Clock size={12} className="text-slate-400 mr-1" />
                                                <input
                                                    type="number"
                                                    value={expense.lifespan}
                                                    onChange={(e) => updateExpense(expense.id, 'lifespan', parseInt(e.target.value) || 1)}
                                                    className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none p-0 border-none focus:ring-0 text-center"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Footer: Allocation & Result */}
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex bg-slate-100 rounded-lg p-0.5 shadow-inner">
                                            <button 
                                                onClick={() => updateExpense(expense.id, 'allocation', 'Fixed')}
                                                className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${expense.allocation === 'Fixed' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Fixo
                                            </button>
                                            <button 
                                                onClick={() => updateExpense(expense.id, 'allocation', 'PerHead')}
                                                className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${expense.allocation === 'PerHead' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                x HC
                                            </button>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-800 text-sm">{formatCurrency(calculateItemMonthly(expense))}</p>
                                            <p className="text-[9px] text-slate-400 uppercase font-bold leading-none">Mensal</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {catExpenses.length === 0 && (
                        <div className="p-8 text-center bg-slate-50/50">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-300 mb-3">
                                <Icon size={24} />
                            </div>
                            <p className="text-slate-500 text-sm mb-4 font-medium">Nenhum custo lançado em {cat.label}.</p>
                        </div>
                    )}
    
                    <div className="p-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                        <button
                        onClick={() => addExpense(cat.id as any)}
                        className="w-full py-2.5 border border-dashed border-slate-300 rounded-lg text-slate-500 text-xs font-bold hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                        >
                        <Plus size={14} /> Adicionar Item em {cat.label}
                        </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* RIGHT SIDEBAR: SUMMARY */}
        <div className="w-full xl:w-80 space-y-4 shrink-0">
             {/* Total Card - Dark Theme */}
             <div className="bg-[#0f172a] rounded-xl p-6 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                    <Calculator size={100} />
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Custo OpEx Mensal</p>
                    <h3 className="text-3xl font-bold text-[#fbbf24] mb-4">{formatCurrency(totalMonthlyCosts)}</h3>
                    
                    <div className="h-px bg-white/10 w-full mb-4"></div>
                    
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-400">Total Contrato (12m)</span>
                        <span className="text-sm font-bold text-slate-200">{formatCurrency(totalContractCosts)}</span>
                    </div>
                </div>
             </div>

             {/* Info / Distribution Card */}
             <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                 <div>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
                        <Info size={16} className="text-slate-400" />
                        Distribuição
                    </h4>
                    <div className="space-y-3">
                        {categories.map(cat => {
                            const catVal = data.expenses.filter(e => e.category === cat.id).reduce((acc, e) => acc + calculateItemMonthly(e), 0);
                            const percent = totalMonthlyCosts > 0 ? (catVal / totalMonthlyCosts) * 100 : 0;
                            
                            return (
                                <div key={cat.id}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500 font-medium">{cat.label}</span>
                                        <span className="font-bold text-slate-700">{formatCurrency(catVal)}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${cat.color.replace('text-', 'bg-').replace('-600', '-500')}`} 
                                            style={{ width: `${percent}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                 </div>

                 <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-start gap-2">
                         <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                         <p className="text-[10px] text-slate-400 leading-relaxed">
                             <strong>Atenção:</strong> Itens com alocação "x HC" são multiplicados automaticamente pelo número de colaboradores operacionais ({operationalHC}) definidos na aba Equipe.
                         </p>
                    </div>
                 </div>
             </div>
        </div>

      </div>
    </div>
  );
};

export default Costs;
