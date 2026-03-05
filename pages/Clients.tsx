
import React, { useState } from 'react';
import { Client, ProposalData } from '../types';
import { Plus, Search, MapPin, Building2, User, Trash2, Edit3, Mail, Phone, XCircle, FileText, CheckCircle, TrendingUp, AlertCircle, LayoutList, LayoutGrid, Clock, Briefcase, Loader2, Network, Package } from 'lucide-react';
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
    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
    const [cnpjError, setCnpjError] = useState<string | null>(null);

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
            recentProposals: clientProposals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
        };
    };

    const selectedClientStats = selectedClientId ? getClientStats(selectedClientId) : null;

    // --- FORMATTING HELPERS ---
    const formatCnpj = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 14);
        return digits
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    };

    const formatIE = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 12);
        return digits.replace(/(\d{3})(?=\d)/g, '$1.');
    };

    // --- HANDLERS ---

    const handleOpenModal = (client?: Client) => {
        setCnpjError(null);
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
        if (window.confirm('Remover cliente? Isso não apaga as propostas existentes, mas remove o vínculo.')) {
            setClients(clients.filter(c => c.id !== id));
            if (selectedClientId === id) setSelectedClientId(null);
        }
    };

    const handleFetchCnpj = async () => {
        if (!formData.cnpj) {
            setCnpjError('Digite um CNPJ válido.');
            return;
        }
        const cleanCnpj = formData.cnpj.replace(/\D/g, '');
        if (cleanCnpj.length !== 14) {
            setCnpjError('O CNPJ deve ter 14 dígitos.');
            return;
        }

        setIsFetchingCnpj(true);
        setCnpjError(null);

        try {
            // Fetch from both APIs concurrently
            const [brasilApiResponse, cnpjWsResponse] = await Promise.all([
                fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`),
                fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`).catch(() => null)
            ]);

            if (!brasilApiResponse.ok) {
                throw new Error('CNPJ não encontrado ou erro na API');
            }
            const data = await brasilApiResponse.json();

            // Try to extract Inscrição Estadual (IE) from CNPJ.ws
            let stateRegistration = '';
            if (cnpjWsResponse && cnpjWsResponse.ok) {
                try {
                    const wsData = await cnpjWsResponse.json();
                    const uf = data.uf || wsData.estabelecimento?.estado?.sigla;
                    if (uf && wsData.estabelecimento?.inscricoes_estaduais) {
                        const activeIe = wsData.estabelecimento.inscricoes_estaduais.find(
                            (ie: any) => ie.estado.sigla === uf && ie.ativo
                        );
                        stateRegistration = activeIe?.inscricao_estadual || '';
                    }
                } catch (e) {
                    console.error('Error parsing CNPJ.ws data:', e);
                }
            }

            setFormData(prev => ({
                ...prev,
                name: data.nome_fantasia || data.razao_social || prev.name,
                legalName: data.razao_social || prev.legalName,
                tradeName: data.nome_fantasia || prev.tradeName,
                registrationStatus: data.descricao_situacao_cadastral || prev.registrationStatus,
                cnpj: formatCnpj(cleanCnpj),
                stateRegistration: formatIE(stateRegistration) || prev.stateRegistration,
                location: `${data.municipio} - ${data.uf}`,
                segment: data.cnae_fiscal_descricao || prev.segment,
                subSegment: data.cnaes_secundarios?.[0]?.descricao || prev.subSegment,
                cep: data.cep || prev.cep,
                address: data.logradouro || prev.address,
                addressNumber: data.numero || prev.addressNumber,
                neighborhood: data.bairro || prev.neighborhood,
                city: data.municipio || prev.city,
                state: data.uf || prev.state,
            }));

        } catch (error: any) {
            setCnpjError(error.message || 'Erro ao consultar CNPJ');
        } finally {
            setIsFetchingCnpj(false);
        }
    };

    return (
        <div className="flex h-full">
            <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-colors">
                    <div>
                        <h1 className="text-3xl font-black text-[#0f172a] dark:text-slate-100 tracking-tight transition-colors">Carteira de Clientes</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors">Gestão de contas, contatos e histórico de relacionamento.</p>
                    </div>
                    <div className="flex gap-3 transition-colors">
                        <div className="bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex transition-colors">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-800 text-[#0f172a] dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                title="Lista"
                            >
                                <ListIcon />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-800 text-[#0f172a] dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                title="Grade"
                            >
                                <LayoutGridIcon />
                            </button>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-[#0f172a] dark:bg-indigo-600 hover:bg-[#1e293b] dark:hover:bg-indigo-700 text-white px-5 py-3 rounded-lg font-bold shadow-lg shadow-slate-900/20 flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Plus size={20} /> Novo Cliente
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative transition-colors">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, segmento, contato..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-[#fbbf24] dark:focus:ring-indigo-500 focus:border-[#fbbf24] dark:focus:border-indigo-500 outline-none shadow-sm transition-colors"
                    />
                </div>

                {/* Content Area */}
                {viewMode === 'list' ? (
                    /* TABLE VIEW */
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider border-b border-slate-200 dark:border-slate-800 transition-colors">
                                <tr>
                                    <th className="px-6 py-4">Status & Tipo</th>
                                    <th className="px-6 py-4">Empresa / CNPJ</th>
                                    <th className="px-6 py-4">Segmento</th>
                                    <th className="px-6 py-4">Contato Principal</th>
                                    <th className="px-6 py-4">Localização</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 cursor-pointer transition-colors">
                                {filteredClients.map((client) => {
                                    const isSelected = selectedClientId === client.id;
                                    return (
                                        <tr
                                            key={client.id}
                                            onClick={() => setSelectedClientId(client.id)}
                                            className={`transition-all group border-l-[6px] ${isSelected ? 'bg-slate-50 dark:bg-slate-800/50 border-l-[#0f172a] dark:border-l-indigo-500 shadow-inner' : 'border-l-transparent hover:bg-slate-50/60 dark:hover:bg-slate-800/30 hover:border-l-slate-200 dark:hover:border-l-slate-700'}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-2 items-start">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${client.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full transition-colors ${client.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'}`}></span>
                                                        {client.status === 'Active' ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                    {client.classification && (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                                            ${client.classification === 'Client' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' :
                                                                client.classification === 'Prospect' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                                                    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                                        >
                                                            {client.classification}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 dark:text-slate-100 text-base transition-colors">{client.name}</div>
                                                <div className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5 transition-colors">{client.cnpj || 'CNPJ não informado'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 transition-colors">
                                                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 dark:text-slate-400 transition-colors"><Building2 size={14} /></div>
                                                    <div>
                                                        <span className="font-medium block">{client.segment || client.industry || 'Indústria Geral'}</span>
                                                        {client.corporateGroup && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded uppercase mt-1 inline-block">{client.corporateGroup}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 transition-colors">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold border border-indigo-100 dark:border-indigo-800/50 transition-colors">
                                                        {client.contactName ? client.contactName.charAt(0) : <User size={12} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors">{client.contactName || '-'}</p>
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 transition-colors">{client.email || ''}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                                                <div className="flex items-center gap-1.5 transition-colors">
                                                    <MapPin size={14} className="text-slate-300 dark:text-slate-600 transition-colors" />
                                                    {client.location || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit3 size={16} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
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
                                    bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6 cursor-pointer transition-all hover:shadow-md relative overflow-hidden group
                                    ${isSelected ? 'ring-2 ring-[#0f172a] dark:ring-indigo-500 border-transparent shadow-lg' : 'border-slate-200 dark:border-slate-800'}
                                `}
                                >
                                    <div className="flex justify-between items-start mb-4 transition-colors">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors">
                                            <Building2 size={24} />
                                        </div>
                                        <span className={`inline-flex items-center justify-center w-2.5 h-2.5 rounded-full transition-colors ${client.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></span>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 leading-tight transition-colors">{client.name}</h3>
                                    <div className="flex gap-2 items-center mb-1 flex-wrap">
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider transition-colors">{client.segment || client.industry || 'Indústria Geral'}</p>
                                        {client.classification && (
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
                                                ${client.classification === 'Client' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' :
                                                    client.classification === 'Prospect' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                            >
                                                {client.classification}
                                            </span>
                                        )}
                                    </div>

                                    {/* Cross-selling Indicators */}
                                    <div className="flex items-center gap-1.5 mb-4">
                                        <div className={`p-1 rounded bg-slate-100 dark:bg-slate-800 transition-all ${client.isServiceClient ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-700 opacity-40'}`} title="Cliente de Serviços">
                                            <Briefcase size={12} />
                                        </div>
                                        <div className={`p-1 rounded bg-slate-100 dark:bg-slate-800 transition-all ${client.isProductClient ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-700 opacity-40'}`} title="Cliente de Produtos">
                                            <Package size={12} />
                                        </div>
                                        {client.isServiceClient && client.isProductClient && (
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 ml-1">✓ Cross-sell</span>
                                        )}
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
                                        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 transition-colors">
                                            <User size={16} className="text-slate-400 dark:text-slate-500 shrink-0 transition-colors" />
                                            <span className="truncate">{client.contactName || 'Sem contato'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 transition-colors">
                                            <MapPin size={16} className="text-slate-400 dark:text-slate-500 shrink-0 transition-colors" />
                                            <span className="truncate">{client.location || 'Local não informado'}</span>
                                        </div>
                                    </div>

                                    {/* Hover Actions */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-1 rounded-lg">
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"><Edit3 size={14} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* RIGHT SIDEBAR - CLIENT DETAILS */}
            {selectedClient && selectedClientStats && (
                <div className="w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 z-50 shrink-0 transition-colors">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 transition-colors">
                        <div className="flex justify-between items-start mb-4 transition-colors">
                            <div className="flex gap-2 items-center">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border transition-all ${selectedClient.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'}`}>
                                    {selectedClient.status === 'Active' ? 'Ativo' : 'Inativo'}
                                </span>
                                {selectedClient.classification && (
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border transition-all
                                          ${selectedClient.classification === 'Client' ? 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' :
                                            selectedClient.classification === 'Prospect' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
                                                'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'}`}>
                                        {selectedClient.classification}
                                    </span>
                                )}
                                <div className="ml-2 flex gap-1">
                                    <div className={`p-1 rounded ${selectedClient.isServiceClient ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border border-slate-100 dark:border-slate-800'}`} title="Unidade de Serviços">
                                        <Briefcase size={12} />
                                    </div>
                                    <div className={`p-1 rounded ${selectedClient.isProductClient ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border border-slate-100 dark:border-slate-800'}`} title="Unidade de Produtos">
                                        <Package size={12} />
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedClientId(null)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-all"><XCircle size={20} /></button>
                        </div>
                        <h2 className="font-bold text-xl text-slate-800 dark:text-slate-100 leading-tight mb-1 transition-colors">{selectedClient.name}</h2>
                        <div className="flex items-center gap-3">
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono transition-colors">{selectedClient.cnpj || 'CNPJ não informado'}</p>
                            {selectedClient.corporateGroup && (
                                <span className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/50">
                                    <Network size={10} />
                                    {selectedClient.corporateGroup}
                                </span>
                            )}
                        </div>

                        {/* Primary Contact Card */}
                        <div className="mt-4 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm transition-colors">
                            <div className="flex items-center gap-3 mb-2 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"><User size={16} /></div>
                                <div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">{selectedClient.contactName || 'Contato não definido'}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold transition-colors">{selectedClient.segment || selectedClient.industry || 'Indústria'}</p>
                                </div>
                            </div>
                            <div className="space-y-1.5 pl-1 transition-colors">
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 transition-colors">
                                    <Mail size={12} className="text-slate-400 dark:text-slate-500" />
                                    {selectedClient.email || '-'}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 transition-colors">
                                    <Phone size={12} className="text-slate-400 dark:text-slate-500" />
                                    {selectedClient.phone || '-'}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 transition-colors">
                                    <MapPin size={12} className="text-slate-400 dark:text-slate-500" />
                                    {selectedClient.location || '-'}
                                </div>
                            </div>
                        </div>

                        {/* Registration Details */}
                        {(selectedClient.legalName || selectedClient.tradeName || selectedClient.registrationStatus) && (
                            <div className="mt-6 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-4 transition-colors">
                                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Informações Cadastrais</h4>
                                <div className="space-y-3">
                                    {selectedClient.legalName && (
                                        <div className="transition-colors">
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase transition-colors">Razão Social</p>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold leading-tight transition-colors">{selectedClient.legalName}</p>
                                        </div>
                                    )}
                                    {selectedClient.tradeName && (
                                        <div className="transition-colors">
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase transition-colors">Nome Fantasia</p>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold leading-tight transition-colors">{selectedClient.tradeName}</p>
                                        </div>
                                    )}
                                    {selectedClient.registrationStatus && (
                                        <div className="transition-colors">
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-1 transition-colors">Situação na Receita</p>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${selectedClient.registrationStatus === 'ATIVA' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/50'}`}>
                                                {selectedClient.registrationStatus}
                                            </span>
                                        </div>
                                    )}
                                    {selectedClient.stateRegistration && (
                                        <div className="transition-colors">
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase transition-colors">Inscrição Estadual</p>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold leading-tight transition-colors">{selectedClient.stateRegistration}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 transition-colors">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 transition-colors">
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center transition-colors">
                                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 transition-colors">{selectedClientStats.totalQuotes}</p>
                                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 transition-colors">Total Propostas</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center transition-colors">
                                <p className="text-2xl font-black text-amber-500 dark:text-amber-400 transition-colors">{selectedClientStats.pendingCount}</p>
                                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 transition-colors">Em Aberto</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center transition-colors">
                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 transition-colors">{selectedClientStats.wonCount}</p>
                                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 transition-colors">Fechados</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center transition-colors">
                                <p className="text-2xl font-black text-red-500 dark:text-red-400 transition-colors">{selectedClientStats.lostCount}</p>
                                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 transition-colors">Perdidos</p>
                            </div>
                        </div>

                        {/* Financials */}
                        <div className="space-y-3 transition-colors">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/50 transition-colors">
                                <div className="flex items-center gap-2 mb-1 transition-colors">
                                    <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400 transition-colors" />
                                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase transition-colors">Valor Ganho (LTV)</p>
                                </div>
                                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 transition-colors">{formatCurrency(selectedClientStats.totalWonValue)}</p>
                            </div>

                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/50 transition-colors">
                                <div className="flex items-center gap-2 mb-1 transition-colors">
                                    <Briefcase size={16} className="text-blue-600 dark:text-blue-400 transition-colors" />
                                    <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase transition-colors">Pipeline Aberto</p>
                                </div>
                                <p className="text-2xl font-black text-blue-700 dark:text-blue-400 transition-colors">{formatCurrency(selectedClientStats.pipelineValue)}</p>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="transition-colors">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-3 flex items-center gap-2 transition-colors">
                                <Clock size={16} className="text-slate-400 dark:text-slate-500" />
                                Propostas Recentes
                            </h4>
                            <div className="space-y-2 transition-colors">
                                {selectedClientStats.recentProposals.length > 0 ? selectedClientStats.recentProposals.map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors">#{p.proposalId} <span className="text-slate-400 dark:text-slate-500 font-normal transition-colors">v{p.version}</span></p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 transition-colors">{new Date(p.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right transition-colors">
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 transition-colors">{formatCurrency(p.value)}</p>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors ${p.status === 'Won' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                                p.status === 'Lost' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                                    'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                }`}>{p.status}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4 transition-colors">Nenhuma proposta encontrada.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex gap-2 transition-colors">
                        <button
                            onClick={() => handleOpenModal(selectedClient)}
                            className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-all"
                        >
                            <Edit3 size={14} /> Editar Dados
                        </button>
                        <button
                            onClick={() => handleDelete(selectedClient.id)}
                            className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 transition-all"
                        >
                            <Trash2 size={14} /> Remover
                        </button>
                    </div>
                </div>
            )}

            {/* Modal (Inline) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border dark:border-slate-800 transition-colors">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0 transition-colors">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 transition-colors">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto transition-colors">
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 transition-colors">Dados da Empresa</h4>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Nome Exibição (Comercial)</label>
                                    <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-[#fbbf24] dark:focus:ring-indigo-500 outline-none transition-all" placeholder="Ex: Votorantim Cimentos" />
                                </div>
                                <div className="grid grid-cols-2 gap-4 transition-colors">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Razão Social</label>
                                        <input type="text" value={formData.legalName || ''} onChange={e => setFormData({ ...formData, legalName: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" placeholder="RAZAO SOCIAL DA EMPRESA LTDA" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Nome Fantasia</label>
                                        <input type="text" value={formData.tradeName || ''} onChange={e => setFormData({ ...formData, tradeName: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" placeholder="NOME FANTASIA" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 transition-colors">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">CNPJ</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={formData.cnpj || ''}
                                                onChange={e => {
                                                    setFormData({ ...formData, cnpj: formatCnpj(e.target.value) });
                                                    setCnpjError(null);
                                                }}
                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all"
                                                placeholder="00.000.000/0001-00"
                                            />
                                            <button
                                                onClick={handleFetchCnpj}
                                                disabled={isFetchingCnpj}
                                                className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center justify-center min-w-[80px]"
                                            >
                                                {isFetchingCnpj ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
                                            </button>
                                        </div>
                                        {cnpjError && <p className="text-red-500 text-xs mt-1 font-medium">{cnpjError}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Inscrição Estadual</label>
                                        <input
                                            type="text"
                                            value={formData.stateRegistration || ''}
                                            onChange={e => setFormData({ ...formData, stateRegistration: formatIE(e.target.value) })}
                                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all"
                                            placeholder="000.000.000.000"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 transition-colors">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Situação Cadastral</label>
                                        <input type="text" value={formData.registrationStatus || ''} onChange={e => setFormData({ ...formData, registrationStatus: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" placeholder="ATIVA" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Segmento</label>
                                        <input type="text" value={formData.segment || formData.industry || ''} onChange={e => setFormData({ ...formData, segment: e.target.value, industry: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" placeholder="Ex: Papel e Celulose" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Sub-segmento</label>
                                        <input type="text" value={formData.subSegment || ''} onChange={e => setFormData({ ...formData, subSegment: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" placeholder="Ex: Laminação" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Grupo Econômico</label>
                                    <input type="text" value={formData.corporateGroup || ''} onChange={e => setFormData({ ...formData, corporateGroup: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" placeholder="Ex: Grupo Votorantim" />
                                </div>

                                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 transition-colors pt-2">Endereço Detalhado</h4>
                                <div className="grid grid-cols-4 gap-4 transition-colors">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">CEP</label>
                                        <input type="text" value={formData.cep || ''} onChange={e => setFormData({ ...formData, cep: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" placeholder="00000-000" />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Logradouro / Rua</label>
                                        <input type="text" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" placeholder="Av. das Nações Unidas" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Número</label>
                                        <input type="text" value={formData.addressNumber || ''} onChange={e => setFormData({ ...formData, addressNumber: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" placeholder="123" />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Bairro</label>
                                        <input type="text" value={formData.neighborhood || ''} onChange={e => setFormData({ ...formData, neighborhood: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" placeholder="Centro" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Cidade</label>
                                        <input type="text" value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Estado (UF)</label>
                                        <input type="text" value={formData.state || ''} onChange={e => setFormData({ ...formData, state: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" />
                                    </div>
                                </div>
                                <div className="hidden">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Endereço Residencial (Sumário)</label>
                                    <input type="text" value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" placeholder="Cidade - UF" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 transition-colors">Contato Principal</h4>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Nome do Contato</label>
                                    <input type="text" value={formData.contactName || ''} onChange={e => setFormData({ ...formData, contactName: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" placeholder="Nome do comprador ou engenheiro" />
                                </div>
                                <div className="grid grid-cols-2 gap-4 transition-colors">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Email</label>
                                        <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" placeholder="email@empresa.com" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Telefone</label>
                                        <input type="text" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg outline-none transition-all" placeholder="(00) 0000-0000" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Classificação</label>
                                        <select
                                            value={formData.classification || 'Lead'}
                                            onChange={e => setFormData({ ...formData, classification: e.target.value as any })}
                                            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all font-bold"
                                        >
                                            <option value="Lead">Lead</option>
                                            <option value="Prospect">Prospect</option>
                                            <option value="Client">Cliente (Conta)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 transition-colors">Status</label>
                                        <select
                                            value={formData.status || 'Active'}
                                            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all"
                                        >
                                            <option value="Active">Ativo</option>
                                            <option value="Inactive">Inativo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 shrink-0 transition-colors">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all">Cancelar</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-[#0f172a] dark:bg-indigo-600 text-white font-bold rounded-lg hover:bg-[#1e293b] dark:hover:bg-indigo-700 shadow-lg shadow-slate-900/20 dark:shadow-none transition-all">Salvar Cliente</button>
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
);

export default Clients;
