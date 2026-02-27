
import React, { useState } from 'react';
import { ProposalData, SafetyItem, ExpenseItem } from '../types';
import { formatCurrency } from '../utils/pricingEngine';
import { HardHat, ShieldCheck, Plus, AlertCircle, Info, Package, CheckSquare, Square, Wrench, Truck, Monitor, TrendingUp, Wand2 } from 'lucide-react';

interface SafetyProps {
  data: ProposalData;
  updateData: (newData: Partial<ProposalData>) => void;
  globalConfig: ProposalData;
}

const Safety: React.FC<SafetyProps> = ({ data, updateData, globalConfig }) => {
  const [activeTab, setActiveTab] = useState<'nrs' | 'kits'>('nrs');

  // Helper: Operational HC
  const operationalHC = data.roles
    .filter(r => r.category === 'Operational')
    .reduce((acc, r) => acc + r.quantity, 0);

  // --- NRs Logic ---
  const nrsList = [
      { code: 'NR-06', name: 'EPIs - Treinamento & Uso', defaultCost: 50, months: 12 },
      { code: 'NR-10', name: 'Segurança em Eletricidade', defaultCost: 450, months: 24 },
      { code: 'NR-11', name: 'Transporte e Movimentação', defaultCost: 300, months: 12 },
      { code: 'NR-33', name: 'Espaços Confinados', defaultCost: 350, months: 12 },
      { code: 'NR-35', name: 'Trabalho em Altura', defaultCost: 250, months: 24 },
  ];

  const toggleNR = (nrCode: string) => {
      const existing = (data.safetyCosts || []).find(s => s.nrCode === nrCode);
      if (existing) {
          // Toggle active
          const updated = (data.safetyCosts || []).map(s => s.nrCode === nrCode ? { ...s, active: !s.active } : s);
          updateData({ safetyCosts: updated });
      } else {
          // Add new
          const template = nrsList.find(n => n.code === nrCode);
          if (template) {
              const newItem: SafetyItem = {
                  id: Math.random().toString(36).substr(2, 9),
                  nrCode: template.code,
                  name: template.name,
                  active: true,
                  costPerHead: template.defaultCost,
                  frequencyMonths: template.months
              };
              updateData({ safetyCosts: [...(data.safetyCosts || []), newItem] });
          }
      }
  };

  const updateNR = (id: string, field: keyof SafetyItem, value: any) => {
      const updated = (data.safetyCosts || []).map(s => s.id === id ? { ...s, [field]: value } : s);
      updateData({ safetyCosts: updated });
  };

  // --- Kits Logic (DYNAMIC FROM GLOBAL CONFIG) ---
  const addKitToExpenses = (kitId: string) => {
      const kitTemplate = globalConfig.kitTemplates?.find(k => k.id === kitId);
      
      if (!kitTemplate) {
          alert("Erro: Kit não encontrado nas configurações.");
          return;
      }

      const itemsToAdd: ExpenseItem[] = kitTemplate.items.map(k => ({
          id: Math.random().toString(36).substr(2, 9),
          name: `[${kitTemplate.name}] ${k.name}`,
          category: k.category,
          allocation: 'PerHead',
          unitPrice: k.unitPrice,
          lifespan: k.lifespan
      }));

      updateData({ expenses: [...data.expenses, ...itemsToAdd] });
      alert(`${itemsToAdd.length} itens do kit "${kitTemplate.name}" foram adicionados à lista de Custos Operacionais.`);
  };

  // Totals
  const totalSafety = (data.safetyCosts || []).filter(s => s.active).reduce((acc, s) => acc + (s.costPerHead / (s.frequencyMonths || 12)) * operationalHC, 0);

  // Helper to map string icon name to Lucide component
  const getIcon = (iconName: string) => {
      switch(iconName) {
          case 'HardHat': return <HardHat size={24} />;
          case 'TrendingUp': return <TrendingUp size={24} />;
          case 'Wand2': return <Wand2 size={24} />;
          case 'Wrench': return <Wrench size={24} />;
          case 'Truck': return <Truck size={24} />;
          case 'Monitor': return <Monitor size={24} />;
          default: return <Package size={24} />;
      }
  };
  
  const getColors = (index: number) => {
      const colors = [
          { bg: 'bg-blue-50', text: 'text-blue-600', border: 'hover:border-blue-400', btnHover: 'hover:bg-blue-600' },
          { bg: 'bg-amber-50', text: 'text-amber-600', border: 'hover:border-amber-400', btnHover: 'hover:bg-amber-600' },
          { bg: 'bg-red-50', text: 'text-red-600', border: 'hover:border-red-400', btnHover: 'hover:bg-red-600' },
          { bg: 'bg-purple-50', text: 'text-purple-600', border: 'hover:border-purple-400', btnHover: 'hover:bg-purple-600' },
          { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'hover:border-emerald-400', btnHover: 'hover:bg-emerald-600' },
      ];
      return colors[index % colors.length];
  }

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <HardHat size={28} className="text-[#0f172a]" />
                    Segurança do Trabalho (SMS)
                </h2>
                <p className="text-slate-500 text-sm mt-1">Gestão de NRs, Treinamentos Obrigatórios e Kits de EPI padronizados.</p>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setActiveTab('nrs')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'nrs' ? 'bg-white shadow text-[#0f172a]' : 'text-slate-500 hover:text-slate-700'}`}>Normas (NRs)</button>
                <button onClick={() => setActiveTab('kits')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'kits' ? 'bg-white shadow text-[#0f172a]' : 'text-slate-500 hover:text-slate-700'}`}>Kits de Produto</button>
            </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-8 items-start">
            
            {/* MAIN CONTENT AREA */}
            <div className="flex-1 w-full space-y-6">
                
                {/* TAB 1: NRs */}
                {activeTab === 'nrs' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <ShieldCheck size={20} className="text-emerald-600" />
                            Matriz de Treinamentos e Exames (NRs)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            {nrsList.map(nr => {
                                const activeItem = (data.safetyCosts || []).find(s => s.nrCode === nr.code && s.active);
                                return (
                                    <div key={nr.code} className={`border rounded-xl p-4 transition-all cursor-pointer ${activeItem ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300'}`} onClick={() => toggleNR(nr.code)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`font-black text-sm px-2 py-0.5 rounded ${activeItem ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{nr.code}</span>
                                            {activeItem ? <CheckSquare size={20} className="text-emerald-600"/> : <Square size={20} className="text-slate-300"/>}
                                        </div>
                                        <p className="font-bold text-slate-700 text-sm mb-1">{nr.name}</p>
                                        <p className="text-xs text-slate-500">Validade Padrão: {nr.months} meses</p>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {(data.safetyCosts || []).filter(s => s.active).length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Custos de Treinamento / Exames (Por Pessoa)</h4>
                                {(data.safetyCosts || []).filter(s => s.active).map(item => (
                                    <div key={item.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="w-16 font-bold text-slate-700">{item.nrCode}</div>
                                        <div className="flex-1">
                                            <label className="text-[10px] text-slate-400 block font-bold uppercase">Custo Unit. (Exame/Curso)</label>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs font-bold text-slate-400">R$</span>
                                                <input 
                                                    type="number" 
                                                    value={item.costPerHead} 
                                                    onChange={e => updateNR(item.id, 'costPerHead', parseFloat(e.target.value) || 0)}
                                                    className="bg-transparent font-bold text-slate-800 text-sm outline-none w-24 border-b border-slate-300 focus:border-emerald-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] text-slate-400 block font-bold uppercase">Validade (Meses)</label>
                                            <input 
                                                type="number" 
                                                value={item.frequencyMonths} 
                                                onChange={e => updateNR(item.id, 'frequencyMonths', parseFloat(e.target.value) || 12)}
                                                className="bg-transparent font-bold text-slate-800 text-sm outline-none w-16 border-b border-slate-300 focus:border-emerald-500"
                                            />
                                        </div>
                                        <div className="text-right">
                                            <label className="text-[10px] text-slate-400 block font-bold uppercase">Mensal Total</label>
                                            <span className="font-bold text-emerald-600">
                                                {formatCurrency( (item.costPerHead / item.frequencyMonths) * operationalHC )}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: KITS (DYNAMIC FROM GLOBAL CONFIG) */}
                {activeTab === 'kits' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Package size={20} className="text-blue-600" />
                                    Kits de Produto (EPIs & Ferramentas)
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Adicione pacotes padronizados (definidos em Configurações Globais) à lista de Custos Operacionais.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            {(globalConfig.kitTemplates || []).map((kit, index) => {
                                const style = getColors(index);
                                return (
                                    <div key={kit.id} className={`border border-slate-200 rounded-xl p-5 ${style.border} hover:shadow-md transition-all group`}>
                                        <div className={`p-3 ${style.bg} ${style.text} rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform`}>
                                            {getIcon(kit.icon)}
                                        </div>
                                        <h4 className="font-bold text-slate-800">{kit.name}</h4>
                                        <p className="text-xs text-slate-500 mt-1 mb-4 h-10 line-clamp-2">{kit.description}</p>
                                        <button onClick={() => addKitToExpenses(kit.id)} className={`w-full py-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-xs ${style.btnHover} hover:text-white transition-colors flex items-center justify-center gap-2`}>
                                            <Plus size={14} /> Adicionar ({kit.items.length} itens)
                                        </button>
                                    </div>
                                )
                            })}
                            
                            {(globalConfig.kitTemplates || []).length === 0 && (
                                <div className="col-span-3 text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                    <p className="text-slate-400 text-sm">Nenhum kit configurado no sistema.</p>
                                    <p className="text-xs text-slate-400">Vá em Configurações Globais para criar templates de kits.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 rounded-lg flex gap-3 border border-blue-100">
                             <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
                             <p className="text-xs text-blue-700 leading-relaxed">
                                 <strong>Nota:</strong> Ao clicar em "Adicionar", os itens são copiados para a aba <strong>Custos Operacionais</strong> e calculados com base no HC Operacional ({operationalHC} pessoas).
                             </p>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT SUMMARY */}
            <div className="w-full xl:w-80 space-y-4 shrink-0">
                 <div className="bg-[#0f172a] rounded-xl p-6 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Custo SMS Mensal</p>
                        <h3 className="text-3xl font-bold text-[#fbbf24] mb-4">{formatCurrency(totalSafety)}</h3>
                        
                        <div className="h-px bg-white/10 w-full mb-4"></div>
                        <p className="text-[10px] text-slate-400">
                            *Refere-se exclusivamente a treinamentos e exames recorrentes (amortizados) conforme NRs ativas.
                        </p>
                    </div>
                 </div>

                 <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex items-start gap-2">
                         <AlertCircle size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                         <p className="text-xs text-slate-500 leading-relaxed">
                             O custo de <strong>EPIs</strong> inseridos via Kits é contabilizado na aba de Custos Operacionais, não aqui. Esta aba foca na conformidade legal (treinamentos).
                         </p>
                    </div>
                 </div>
            </div>

        </div>
    </div>
  );
};

export default Safety;
