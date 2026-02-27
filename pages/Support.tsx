
import React from 'react';
import { ProposalData, SupportItem } from '../types';
import { formatCurrency } from '../utils/pricingEngine';
import { Truck, Plus, Trash2, AlertCircle, TrendingUp, Briefcase, AlertTriangle } from 'lucide-react';

interface SupportProps {
  data: ProposalData;
  updateData: (newData: Partial<ProposalData>) => void;
}

const Support: React.FC<SupportProps> = ({ data, updateData }) => {
  
  // --- Support Logic ---
  const addSupportItem = () => {
      const newItem: SupportItem = {
          id: Math.random().toString(36).substr(2, 9),
          description: 'Nova Visita / Suporte',
          frequency: 'Monthly',
          quantity: 1,
          costPerVisit: 0
      };
      updateData({ supportCosts: [...(data.supportCosts || []), newItem] });
  };

  const updateSupportItem = (id: string, field: keyof SupportItem, value: any) => {
      const updated = (data.supportCosts || []).map(s => s.id === id ? { ...s, [field]: value } : s);
      updateData({ supportCosts: updated });
  };

  const removeSupportItem = (id: string) => {
      updateData({ supportCosts: (data.supportCosts || []).filter(s => s.id !== id) });
  };

  // Totals
  const totalSupport = (data.supportCosts || []).reduce((acc, s) => acc + (s.costPerVisit * s.quantity), 0);

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Truck size={28} className="text-[#0f172a]" />
                    Suporte & Gestão Operacional
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    Overhead do contrato: visitas de gestão, estrutura de apoio, mobilização e custos logísticos.
                </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-xs font-bold">
                <AlertTriangle size={14} />
                <span>Gestão de Riscos Ativa</span>
            </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-8 items-start">
            
            {/* MAIN CONTENT AREA */}
            <div className="flex-1 w-full space-y-6">
                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Briefcase size={20} className="text-indigo-600" />
                            Estrutura de Apoio (Overhead)
                        </h3>
                        <button onClick={addSupportItem} className="text-xs font-bold bg-[#0f172a] text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[#1e293b]">
                            <Plus size={14} /> Novo Item
                        </button>
                    </div>
                    <p className="text-sm text-slate-500 mb-6">
                        Liste aqui os custos indiretos de gestão do contrato que não são alocados diretamente aos colaboradores da ponta (Ex: Visitas de Supervisor, Diárias, Combustível de Apoio, Engenharia de Confiabilidade).
                    </p>

                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-4 bg-slate-50 p-3 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <div className="col-span-5">Descrição / Item</div>
                            <div className="col-span-2">Frequência</div>
                            <div className="col-span-2">Qtd/Mês</div>
                            <div className="col-span-2 text-right">Custo Unit.</div>
                            <div className="col-span-1"></div>
                        </div>
                        {(data.supportCosts || []).map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-4 p-3 border-b border-slate-100 items-center hover:bg-slate-50 transition-colors">
                                <div className="col-span-5">
                                    <input 
                                        type="text" 
                                        value={item.description} 
                                        onChange={e => updateSupportItem(item.id, 'description', e.target.value)}
                                        className="w-full font-bold text-slate-700 text-sm bg-transparent border-none p-0 focus:ring-0 placeholder-slate-300" 
                                        placeholder="Descrição (ex: Visita quinzenal)"
                                    />
                                </div>
                                <div className="col-span-2">
                                     <select 
                                        value={item.frequency}
                                        onChange={e => updateSupportItem(item.id, 'frequency', e.target.value)}
                                        className="w-full text-xs bg-slate-100 rounded border-none py-1 cursor-pointer focus:ring-0"
                                     >
                                        <option value="Weekly">Semanal</option>
                                        <option value="Biweekly">Quinzenal</option>
                                        <option value="Monthly">Mensal</option>
                                        <option value="Quarterly">Trimestral</option>
                                     </select>
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number" 
                                        value={item.quantity} 
                                        onChange={e => updateSupportItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded text-center font-bold text-sm py-1 focus:ring-0 focus:border-indigo-500"
                                    />
                                </div>
                                <div className="col-span-2 text-right flex items-center justify-end gap-1">
                                    <span className="text-xs text-slate-400">R$</span>
                                    <input 
                                        type="number" 
                                        value={item.costPerVisit} 
                                        onChange={e => updateSupportItem(item.id, 'costPerVisit', parseFloat(e.target.value) || 0)}
                                        className="w-20 bg-transparent text-right font-bold text-slate-700 outline-none border-b border-transparent hover:border-slate-300 focus:border-indigo-500 p-0"
                                    />
                                </div>
                                <div className="col-span-1 text-center">
                                    <button onClick={() => removeSupportItem(item.id)} className="text-slate-300 hover:text-red-500 p-1 transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                        {(data.supportCosts || []).length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-lg">
                                <Truck size={32} className="mx-auto text-slate-200 mb-2" />
                                <p className="text-slate-400 italic text-sm">Nenhum custo de suporte lançado.</p>
                                <button onClick={addSupportItem} className="mt-3 text-xs font-bold text-indigo-600 hover:underline">
                                    Adicionar Item
                                </button>
                            </div>
                        )}
                    </div>
                 </div>
            </div>

            {/* RIGHT SUMMARY */}
            <div className="w-full xl:w-80 space-y-4 shrink-0">
                 <div className="bg-[#0f172a] rounded-xl p-6 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Custo Overhead Mensal</p>
                        <h3 className="text-3xl font-bold text-[#fbbf24] mb-4">{formatCurrency(totalSupport)}</h3>
                        
                        <div className="h-px bg-white/10 w-full mb-4"></div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                             <TrendingUp size={14} />
                             Impacto direto no Custo Direto (CD)
                        </div>
                    </div>
                 </div>

                 <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex items-start gap-2">
                         <AlertCircle size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                         <p className="text-xs text-slate-500 leading-relaxed">
                             O <strong>Suporte Operacional</strong> é essencial para garantir a qualidade da entrega. Contratos sem previsão de visitas de gestão tendem a ter maior churn (cancelamento).
                         </p>
                    </div>
                 </div>
            </div>

        </div>
    </div>
  );
};

export default Support;
