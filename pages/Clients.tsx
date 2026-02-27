
import React, { useState } from 'react';
import { Client, ProposalData } from '../types';
import { Plus, Search, MapPin, Building2, User, Trash2, Edit3, Mail, Phone, XCircle, FileText, CheckCircle, TrendingUp, AlertCircle, LayoutList, LayoutGrid, Clock, Briefcase } from 'lucide-react';
import { formatCurrency } from '../utils/pricingEngine';

interface ClientsProps {
  clients: Client[];
  setClients: (clients: Client[]) => void;
  proposals: ProposalData[]; // Needed to calculate client stats
}

const Clients: React.FC<ClientsProps> = ({ clients, setClients, proposals }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({});

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contactName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // --- STATS CALCULATION ---
  const getClientStats = (clientId: string) => {
      const clientProposals = proposals.filter(p => p.clientId === clientId);
      
      const totalQuotes = clientProposals.length;
      const wonQuotes = clientProposals.filter(p => p.status === 'Won');
      const lostQuotes = clientProposals.filter(p => p.status === 'Lost');
      const pendingQuotes = clientProposals.filter(p => ['Draft', 'Sent', 'Negotiation'].includes(p.status));
      
      const totalWonValue = wonQuotes.reduce((acc, p) => acc + p.value, 0);
      const pipelineValue = pendingQuotes.reduce((acc, p) => acc + p.value, 0);
      
      const conversionRate = totalQuotes > 0 ? (wonQuotes.length / totalQuotes) * 100 : 0;

      return {
          totalQuotes,
          wonCount: wonQuotes.length,
          lostCount: lostQuotes.length,
          pendingCount: pendingQuotes.length,
          totalWonValue,
          pipelineValue,
          conversionRate,
          recentProposals: clientProposals.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
      };
  };

  const selectedClientStats = selectedClientId ? getClientStats(selectedClientId) : null;

  // --- HANDLERS ---

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingId(client.id);
      setFormData(client);
    } else {
      setEditingId(null);
      setFormData({ status: 'Active' });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      setClients(clients.map(c => c.id === editingId ? { ...c, ...formData } as Client : c));
    } else {
      const newClient: Client = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name || 'Novo Cliente',
        status: 'Active',
      } as Client;
      setClients([...clients, newClient]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if(window.confirm('Remover cliente? Isso não apaga as propostas existentes, mas remove o vínculo.')) {
        setClients(clients.filter(c => c.id !== id));
        if (selectedClientId === id) setSelectedClientId(null);
    }
  };

  return (
    <div className="flex h-full">
        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">Carteira de Clientes</h1>
                    <p className="text-slate-500 mt-1">Gestão de contas, contatos e histórico de relacionamento.</p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex">
                        <button 
                          onClick={() => setViewMode('list')}
                          className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-100 text-[#0f172a] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          title="Lista"
                        >
                          <ListIcon />
                        </button>
                        <button 
                          onClick={() => setViewMode('grid')}
                          className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-[#0f172a] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          title="Grade"
                        >
                          <LayoutGridIcon />
                        </button>
                    </div>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-5 py-3 rounded-lg font-bold shadow-lg shadow-slate-900/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Plus size={20} /> Novo Cliente
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Buscar por nome, segmento, contato..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-[#fbbf24] focus:border-[#fbbf24] outline-none shadow-sm"
                />
            </div>

            {/* Content Area */}
            {viewMode === 'list' ? (
                /* TABLE VIEW */
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Empresa / CNPJ</th>
                                <th className="px-6 py-4">Segmento</th>
                                <th className="px-6 py-4">Contato Principal</th>
                                <th className="px-6 py-4">Localização</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 cursor-pointer">
                            {filteredClients.map((client) => {
                                const isSelected = selectedClientId === client.id;
                                return (
                                    <tr 
                                        key={client.id} 
                                        onClick={() => setSelectedClientId(client.id)}
                                        className={`transition-all group border-l-[6px] ${isSelected ? 'bg-slate-50 border-l-[#0f172a] shadow-inner' : 'border-l-transparent hover:bg-slate-50/60 hover:border-l-slate-200'}`}
                                    >
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${client.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${client.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                {client.status === 'Active' ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 text-base">{client.name}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-0.5">{client.cnpj || 'CNPJ não informado'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <div className="p-1.5 bg-slate-100 rounded text-slate-500"><Building2 size={14} /></div>
                                                <span className="font-medium">{client.industry || 'Indústria Geral'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold border border-indigo-100">
                                                    {client.contactName ? client.contactName.charAt(0) : <User size={12}/>}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700">{client.contactName || '-'}</p>
                                                    <p className="text-[10px] text-slate-400">{client.email || ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                             <div className="flex items-center gap-1.5">
                                                <MapPin size={14} className="text-slate-300" />
                                                {client.location || '-'}
                                             </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredClients.map(client => {
                        const isSelected = selectedClientId === client.id;
                        return (
                            <div 
                                key={client.id} 
                                onClick={() => setSelectedClientId(client.id)}
                                className={`
                                    bg-white rounded-xl border shadow-sm p-6 cursor-pointer transition-all hover:shadow-md relative overflow-hidden group
                                    ${isSelected ? 'ring-2 ring-[#0f172a] border-transparent' : 'border-slate-200'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-100">
                                        <Building2 size={24} />
                                    </div>
                                    <span className={`inline-flex items-center justify-center w-2.5 h-2.5 rounded-full ${client.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                </div>
                                
                                <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight">{client.name}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{client.industry || 'Indústria Geral'}</p>
                                
                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                        <User size={16} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{client.contactName || 'Sem contato'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                        <MapPin size={16} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{client.location || 'Local não informado'}</span>
                                    </div>
                                </div>

                                {/* Hover Actions */}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-lg">
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit3 size={14}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* RIGHT SIDEBAR - CLIENT DETAILS */}
        {selectedClient && selectedClientStats && (
            <div className="w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 z-50 shrink-0">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-start mb-4">
                         <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border ${
                             selectedClient.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-200 text-slate-600 border-slate-300'
                         }`}>
                             {selectedClient.status === 'Active' ? 'Cliente Ativo' : 'Inativo'}
                         </span>
                         <button onClick={() => setSelectedClientId(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"><XCircle size={20} /></button>
                    </div>
                    <h2 className="font-bold text-xl text-slate-800 leading-tight mb-1">{selectedClient.name}</h2>
                    <p className="text-xs text-slate-500 font-mono">{selectedClient.cnpj || 'CNPJ não informado'}</p>
                    
                    {/* Primary Contact Card */}
                    <div className="mt-4 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><User size={16}/></div>
                             <div>
                                 <p className="text-sm font-bold text-slate-700">{selectedClient.contactName || 'Contato não definido'}</p>
                                 <p className="text-[10px] text-slate-400 uppercase font-bold">{selectedClient.industry || 'Indústria'}</p>
                             </div>
                        </div>
                        <div className="space-y-1.5 pl-1">
                             <div className="flex items-center gap-2 text-xs text-slate-600">
                                 <Mail size={12} className="text-slate-400" />
                                 {selectedClient.email || '-'}
                             </div>
                             <div className="flex items-center gap-2 text-xs text-slate-600">
                                 <Phone size={12} className="text-slate-400" />
                                 {selectedClient.phone || '-'}
                             </div>
                             <div className="flex items-center gap-2 text-xs text-slate-600">
                                 <MapPin size={12} className="text-slate-400" />
                                 {selectedClient.location || '-'}
                             </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                            <p className="text-2xl font-black text-slate-800">{selectedClientStats.totalQuotes}</p>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Total Propostas</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                             <p className="text-2xl font-black text-amber-500">{selectedClientStats.pendingCount}</p>
                             <p className="text-[10px] uppercase font-bold text-slate-400">Em Aberto</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                             <p className="text-2xl font-black text-emerald-600">{selectedClientStats.wonCount}</p>
                             <p className="text-[10px] uppercase font-bold text-slate-400">Fechados</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                             <p className="text-2xl font-black text-red-500">{selectedClientStats.lostCount}</p>
                             <p className="text-[10px] uppercase font-bold text-slate-400">Perdidos</p>
                        </div>
                    </div>

                    {/* Financials */}
                    <div className="space-y-3">
                         <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                             <div className="flex items-center gap-2 mb-1">
                                 <TrendingUp size={16} className="text-emerald-600" />
                                 <p className="text-xs font-bold text-emerald-800 uppercase">Valor Ganho (LTV)</p>
                             </div>
                             <p className="text-2xl font-black text-emerald-700">{formatCurrency(selectedClientStats.totalWonValue)}</p>
                         </div>
                         
                         <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                             <div className="flex items-center gap-2 mb-1">
                                 <Briefcase size={16} className="text-blue-600" />
                                 <p className="text-xs font-bold text-blue-800 uppercase">Pipeline Aberto</p>
                             </div>
                             <p className="text-2xl font-black text-blue-700">{formatCurrency(selectedClientStats.pipelineValue)}</p>
                         </div>
                    </div>

                    {/* Recent Activity */}
                    <div>
                         <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                             <Clock size={16} className="text-slate-400" /> 
                             Propostas Recentes
                         </h4>
                         <div className="space-y-2">
                             {selectedClientStats.recentProposals.length > 0 ? selectedClientStats.recentProposals.map(p => (
                                 <div key={p.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-slate-300 transition-colors">
                                     <div>
                                         <p className="text-xs font-bold text-slate-700">#{p.proposalId} <span className="text-slate-400 font-normal">v{p.version}</span></p>
                                         <p className="text-[10px] text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</p>
                                     </div>
                                     <div className="text-right">
                                         <p className="text-xs font-bold text-slate-800">{formatCurrency(p.value)}</p>
                                         <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                             p.status === 'Won' ? 'bg-emerald-100 text-emerald-700' :
                                             p.status === 'Lost' ? 'bg-red-100 text-red-700' :
                                             'bg-slate-100 text-slate-600'
                                         }`}>{p.status}</span>
                                     </div>
                                 </div>
                             )) : (
                                 <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma proposta encontrada.</p>
                             )}
                         </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
                     <button 
                        onClick={() => handleOpenModal(selectedClient)}
                        className="flex-1 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
                     >
                         <Edit3 size={14} /> Editar Dados
                     </button>
                     <button 
                         onClick={() => handleDelete(selectedClient.id)}
                         className="flex-1 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                     >
                         <Trash2 size={14} /> Remover
                     </button>
                </div>
            </div>
        )}

        {/* Modal (Inline) */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                        <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                    </div>
                    
                    <div className="p-6 space-y-6 overflow-y-auto">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Dados da Empresa</h4>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Razão Social / Nome Fantasia</label>
                                <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#fbbf24] outline-none" placeholder="Ex: Votorantim Cimentos" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CNPJ</label>
                                    <input type="text" value={formData.cnpj || ''} onChange={e => setFormData({...formData, cnpj: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none" placeholder="00.000.000/0001-00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Segmento / Indústria</label>
                                    <input type="text" value={formData.industry || ''} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none" placeholder="Ex: Papel e Celulose" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço / Localização</label>
                                <input type="text" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none" placeholder="Cidade - UF" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Contato Principal</h4>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Contato</label>
                                <input type="text" value={formData.contactName || ''} onChange={e => setFormData({...formData, contactName: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none" placeholder="Nome do comprador ou engenheiro" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                    <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none" placeholder="email@empresa.com" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone</label>
                                    <input type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg outline-none" placeholder="(00) 0000-0000" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                                <select 
                                    value={formData.status || 'Active'} 
                                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                                    className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-white"
                                >
                                    <option value="Active">Ativo</option>
                                    <option value="Inactive">Inativo</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-[#0f172a] text-white font-bold rounded-lg hover:bg-[#1e293b] shadow-lg transition-colors">Salvar Cliente</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

const LayoutGridIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></svg>
);

const ListIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
);

export default Clients;
