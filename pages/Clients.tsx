import React, { useState } from 'react';
import { Client, Contact, OpportunityMotion, ProposalData, ProposalType, TenantModule } from '../types';
import { Plus, Search, MapPin, Building2, User, Trash2, Edit3, Mail, Phone, XCircle, TrendingUp, LayoutList, LayoutGrid, Clock, Briefcase, Loader2, Network, Package, Users, FileText, UserPlus } from 'lucide-react';
import { formatCurrency } from '../utils/pricingEngine';
import { Button, PageHeader, ResponsiveDrawer } from '../components/ui';

interface ClientsProps {
    clients: Client[];
    contacts?: Contact[];
    onSaveClient: (client: Client) => void | Promise<void>;
    onDeleteClient: (id: string) => void | Promise<void>;
    onSaveContact?: (contact: Contact) => void | Promise<void>;
    onSelectProposal?: (id: string) => void;
    onCreateProposal?: (payload: { type: ProposalType, clientId: string, motion: OpportunityMotion, pricingModule?: TenantModule, openEditor?: boolean }) => ProposalData | void | Promise<ProposalData | void>;
    businessUnit: 'SERVICES' | 'PRODUCTS';
    proposals: ProposalData[];
}

const Clients: React.FC<ClientsProps> = ({ clients, contacts = [], onSaveClient, onDeleteClient, onSaveContact, onSelectProposal, onCreateProposal, businessUnit, proposals }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [detailTab, setDetailTab] = useState<'summary' | 'contacts' | 'proposals'>('summary');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Client>>({});
    const [formTab, setFormTab] = useState<'company' | 'address' | 'contact'>('company');
    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
    const [cnpjError, setCnpjError] = useState<string | null>(null);
    const [isSavingClient, setIsSavingClient] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [contactDraft, setContactDraft] = useState<Partial<Contact>>({ influenceLevel: 'Influencer' });
    const [isSavingContact, setIsSavingContact] = useState(false);
    const [contactError, setContactError] = useState<string | null>(null);

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnpj?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedClient = clients.find(c => c.id === selectedClientId);
    const selectedClientContacts = selectedClientId ? contacts.filter(contact => contact.clientId === selectedClientId) : [];
    const selectedClientProposals = selectedClientId
        ? proposals.filter(p => p.clientId === selectedClientId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [];

    const getClientStats = (clientId: string) => {
        const clientProposals = proposals.filter(p => p.clientId === clientId);
        const wonQuotes = clientProposals.filter(p => p.stage === 'Won');
        const lostQuotes = clientProposals.filter(p => p.stage === 'Lost');
        const pendingQuotes = clientProposals.filter(p => p.status !== 'Archived' && !['Won', 'Lost'].includes(p.stage));
        const totalWonValue = wonQuotes.reduce((acc, p) => acc + p.value, 0);
        const pipelineValue = pendingQuotes.reduce((acc, p) => acc + p.value, 0);

        return {
            totalQuotes: clientProposals.length,
            wonCount: wonQuotes.length,
            lostCount: lostQuotes.length,
            pendingCount: pendingQuotes.length,
            totalWonValue,
            pipelineValue,
            conversionRate: clientProposals.length > 0 ? (wonQuotes.length / clientProposals.length) * 100 : 0,
            recentProposals: clientProposals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
        };
    };

    const selectedClientStats = selectedClientId ? getClientStats(selectedClientId) : null;

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

    const openClientDetail = (clientId: string) => {
        setSelectedClientId(clientId);
        setDetailTab('summary');
    };

    const handleOpenModal = (client?: Client) => {
        setCnpjError(null);
        setSaveError(null);
        setFormTab('company');
        if (client) {
            setEditingId(client.id);
            setFormData(client);
        } else {
            setEditingId(null);
            setFormData({ status: 'Active', classification: 'Prospect' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (isSavingClient) return;
        if (!formData.name?.trim()) {
            setSaveError('Informe o nome do cliente.');
            setFormTab('company');
            return;
        }

        setIsSavingClient(true);
        setSaveError(null);
        try {
            if (editingId) {
                const existing = clients.find(c => c.id === editingId);
                await onSaveClient({ ...(existing || {}), ...formData, id: editingId, name: formData.name.trim() } as Client);
            } else {
                const newClient: Client = {
                    ...formData,
                    id: Math.random().toString(36).substr(2, 9),
                    name: formData.name.trim(),
                    status: formData.status || 'Active',
                    classification: formData.classification || 'Prospect'
                } as Client;
                await onSaveClient(newClient);
            }
            setIsModalOpen(false);
        } catch (error: any) {
            setSaveError(error?.message || 'Erro ao salvar cliente.');
        } finally {
            setIsSavingClient(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Remover cliente? Isso nao apaga as propostas existentes, mas remove o vinculo.')) {
            await onDeleteClient(id);
            if (selectedClientId === id) setSelectedClientId(null);
        }
    };

    const handleFetchCnpj = async () => {
        if (!formData.cnpj) {
            setCnpjError('Digite um CNPJ valido.');
            return;
        }
        const cleanCnpj = formData.cnpj.replace(/\D/g, '');
        if (cleanCnpj.length !== 14) {
            setCnpjError('O CNPJ deve ter 14 digitos.');
            return;
        }

        setIsFetchingCnpj(true);
        setCnpjError(null);
        try {
            const [brasilApiResponse, cnpjWsResponse] = await Promise.all([
                fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`),
                fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`).catch(() => null)
            ]);

            if (!brasilApiResponse.ok) throw new Error('CNPJ nao encontrado ou erro na API');
            const data = await brasilApiResponse.json();

            let stateRegistration = '';
            if (cnpjWsResponse && cnpjWsResponse.ok) {
                try {
                    const wsData = await cnpjWsResponse.json();
                    const uf = data.uf || wsData.estabelecimento?.estado?.sigla;
                    const activeIe = wsData.estabelecimento?.inscricoes_estaduais?.find((ie: any) => ie.estado.sigla === uf && ie.ativo);
                    stateRegistration = activeIe?.inscricao_estadual || '';
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
                industry: data.cnae_fiscal_descricao || prev.industry,
                subSegment: data.cnaes_secundarios?.[0]?.descricao || prev.subSegment,
                cep: data.cep || prev.cep,
                address: data.logradouro || prev.address,
                addressNumber: data.numero || prev.addressNumber,
                neighborhood: data.bairro || prev.neighborhood,
                city: data.municipio || prev.city,
                state: data.uf || prev.state
            }));
        } catch (error: any) {
            setCnpjError(error.message || 'Erro ao consultar CNPJ');
        } finally {
            setIsFetchingCnpj(false);
        }
    };

    const openContactModal = () => {
        if (!selectedClient || !onSaveContact) return;
        setContactDraft({ clientId: selectedClient.id, influenceLevel: 'Influencer' });
        setContactError(null);
        setIsContactModalOpen(true);
    };

    const saveContact = async () => {
        if (!selectedClient || !onSaveContact || isSavingContact) return;
        if (!contactDraft.name?.trim() || !contactDraft.role?.trim()) {
            setContactError('Informe nome e cargo do contato.');
            return;
        }

        setIsSavingContact(true);
        setContactError(null);
        try {
            await onSaveContact({
                id: `cont-${Date.now()}`,
                clientId: selectedClient.id,
                name: contactDraft.name.trim(),
                role: contactDraft.role.trim(),
                email: contactDraft.email?.trim() || '',
                phone: contactDraft.phone?.trim() || '',
                influenceLevel: contactDraft.influenceLevel || 'Influencer',
                linkedin: contactDraft.linkedin?.trim() || undefined
            });
            setIsContactModalOpen(false);
            setDetailTab('contacts');
        } catch (error: any) {
            setContactError(error?.message || 'Erro ao salvar contato.');
        } finally {
            setIsSavingContact(false);
        }
    };

    const createProposalFromClient = async () => {
        if (!selectedClient || !onCreateProposal) return;
        await onCreateProposal({
            type: businessUnit === 'PRODUCTS' ? 'PRODUCT' : 'CONTINUOUS',
            clientId: selectedClient.id,
            motion: 'NewBusiness',
            openEditor: true
        });
    };

    const fieldClass = 'w-full rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-semibold text-[var(--tenant-text)] outline-none transition-all focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]';
    const labelClass = 'block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1';

    const renderClientBadge = (client: Client) => (
        <div className="flex flex-col gap-2 items-start">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${client.status === 'Active' ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-400' : 'border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${client.status === 'Active' ? 'bg-emerald-500' : 'bg-[var(--tenant-border)] dark:bg-[var(--tenant-border-dark)]'}`}></span>
                {client.status === 'Active' ? 'Ativo' : 'Inativo'}
            </span>
            {client.classification && (
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${client.classification === 'Client' ? 'bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)]' : client.classification === 'Prospect' ? 'bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)]' : 'bg-[var(--tenant-control)] text-slate-600 dark:bg-[var(--tenant-control-dark)] dark:text-slate-400'}`}>
                    {client.classification}
                </span>
            )}
        </div>
    );

    return (
        <div className="flex h-full" onClick={() => selectedClientId && setSelectedClientId(null)}>
            <div className="flex-1 space-y-8 overflow-y-auto px-4 pb-8 pt-5 sm:px-6 lg:px-8" onClick={() => selectedClientId && setSelectedClientId(null)}>
                <PageHeader
                    icon={Building2}
                    title="Carteira de Clientes"
                    subtitle="Gestão de contas, contatos e histórico de relacionamento."
                    actions={
                    <>
                        <div className="flex rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-1 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-[var(--tenant-control-active)] text-[var(--tenant-primary)] shadow-sm dark:bg-[var(--tenant-control-active-dark)]' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`} title="Lista"><LayoutList size={20} /></button>
                            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-[var(--tenant-control-active)] text-[var(--tenant-primary)] shadow-sm dark:bg-[var(--tenant-control-active-dark)]' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`} title="Grade"><LayoutGrid size={20} /></button>
                        </div>
                        <Button type="button" onClick={() => handleOpenModal()} icon={Plus} className="min-h-11 w-full sm:w-auto">
                            <span className="sm:hidden">Cliente</span>
                            <span className="hidden sm:inline">Novo Cliente</span>
                        </Button>
                    </>
                    }
                />

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] py-3 pl-12 pr-4 text-[var(--tenant-text)] shadow-sm outline-none transition focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] placeholder:text-slate-400 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)] dark:placeholder:text-slate-500"
                    />
                </div>

                {viewMode === 'list' ? (
                    <div className="space-y-2">
                        <div className="space-y-2 lg:hidden">
                            {filteredClients.map(client => {
                                const isSelected = selectedClientId === client.id;
                                return (
                                    <div
                                        key={client.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => { e.stopPropagation(); openClientDetail(client.id); }}
                                        onKeyDown={(event) => {
                                            const target = event.target as HTMLElement;
                                            if (target.closest('button,a,input,select,textarea')) return;
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                openClientDetail(client.id);
                                            }
                                        }}
                                        className={`rounded-md border px-3 py-2.5 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] ${isSelected ? 'border-[var(--tenant-primary-border)] bg-[color-mix(in_srgb,var(--tenant-primary)_12%,var(--tenant-panel))] shadow-md ring-1 ring-[var(--tenant-primary-soft)] dark:bg-[color-mix(in_srgb,var(--tenant-primary)_18%,var(--tenant-panel-dark))]' : 'border-[var(--tenant-border)] bg-[var(--tenant-panel)] hover:-translate-y-0.5 hover:border-[var(--tenant-primary-border)] hover:bg-[color-mix(in_srgb,var(--tenant-primary)_7%,var(--tenant-panel))] hover:shadow-md dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:hover:bg-[color-mix(in_srgb,var(--tenant-primary)_12%,var(--tenant-panel-dark))]'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${client.status === 'Active' ? 'bg-emerald-500' : 'bg-[var(--tenant-border)] dark:bg-[var(--tenant-border-dark)]'}`}></span>
                                                    <h3 className="truncate text-sm font-black text-slate-800 dark:text-slate-100">{client.name}</h3>
                                                </div>
                                                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    <span className="max-w-[52vw] truncate rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-2 py-1 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                                        {client.segment || client.industry || 'Geral'}
                                                    </span>
                                                    {client.cnpj && <span className="font-mono">{client.cnpj}</span>}
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }} className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--tenant-primary)] transition hover:bg-[var(--tenant-primary-soft)]" title="Editar cliente" aria-label="Editar cliente"><Edit3 size={16} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }} className="flex h-10 w-10 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" title="Remover cliente" aria-label="Remover cliente"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                            <span className="flex min-w-0 items-center gap-1.5">
                                                <User size={13} className="shrink-0 text-slate-400" />
                                                <span className="truncate">{client.contactName || 'Sem contato'}</span>
                                            </span>
                                            <span className="flex min-w-0 items-center gap-1.5">
                                                <MapPin size={13} className="shrink-0 text-slate-400" />
                                                <span className="truncate">{client.location || 'Sem local'}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredClients.length === 0 && (
                                <div className="rounded-lg border-2 border-dashed border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-4 py-10 text-center dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                    <Search className="mx-auto mb-3 text-slate-300" size={28} />
                                    <p className="text-sm font-black text-slate-600 dark:text-slate-300">Nenhum cliente encontrado</p>
                                </div>
                            )}
                        </div>
                        <div className="hidden overflow-x-auto rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] lg:block">
                        <table className="min-w-[980px] w-full text-sm text-left">
                            <thead className="border-b border-[var(--tenant-border)] bg-[var(--tenant-control)] text-xs font-bold uppercase text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-4">Status & Tipo</th>
                                    <th className="px-6 py-4">Empresa / CNPJ</th>
                                    <th className="px-6 py-4">Segmento</th>
                                    <th className="px-6 py-4">Contato principal</th>
                                    <th className="px-6 py-4">Localizacao</th>
                                    <th className="px-6 py-4 text-center">Acoes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--tenant-border)] dark:divide-[var(--tenant-border-dark)]/50 cursor-pointer">
                                {filteredClients.map(client => {
                                    const isSelected = selectedClientId === client.id;
                                    return (
                                        <tr key={client.id} onClick={(e) => { e.stopPropagation(); openClientDetail(client.id); }} className={`group border-l-[6px] transition-all ${isSelected ? 'border-l-[var(--tenant-primary)] bg-[color-mix(in_srgb,var(--tenant-primary)_12%,var(--tenant-panel))] shadow-[inset_0_0_0_1px_var(--tenant-primary-border)] dark:bg-[color-mix(in_srgb,var(--tenant-primary)_16%,var(--tenant-panel-dark))]' : 'border-l-transparent hover:border-l-[var(--tenant-primary-border)] hover:bg-[color-mix(in_srgb,var(--tenant-primary)_6%,var(--tenant-panel))] dark:hover:bg-[color-mix(in_srgb,var(--tenant-primary)_10%,var(--tenant-panel-dark))]'}`}>
                                            <td className="px-6 py-4">{renderClientBadge(client)}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 dark:text-slate-100 text-base">{client.name}</div>
                                                <div className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">{client.cnpj || 'CNPJ nao informado'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                    <Building2 size={14} className="text-slate-400" />
                                                    <span className="font-medium">{client.segment || client.industry || 'Industria geral'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] flex items-center justify-center text-[10px] font-bold border border-[var(--tenant-primary-border)]">
                                                        {client.contactName ? client.contactName.charAt(0) : <User size={12} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{client.contactName || '-'}</p>
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{client.email || ''}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                                                <div className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-300 dark:text-slate-600" />{client.location || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }} className="rounded-lg p-2 text-[var(--tenant-primary)] hover:bg-[var(--tenant-primary-soft)]"><Edit3 size={16} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredClients.map(client => (
                            <div key={client.id} onClick={(e) => { e.stopPropagation(); openClientDetail(client.id); }} className={`group relative cursor-pointer overflow-hidden rounded-lg border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${selectedClientId === client.id ? 'border-[var(--tenant-primary-border)] bg-[color-mix(in_srgb,var(--tenant-primary)_12%,var(--tenant-panel))] ring-1 ring-[var(--tenant-primary-soft)] dark:bg-[color-mix(in_srgb,var(--tenant-primary)_16%,var(--tenant-panel-dark))]' : 'border-[var(--tenant-border)] bg-[var(--tenant-panel)] hover:border-[var(--tenant-primary-border)] hover:bg-[color-mix(in_srgb,var(--tenant-primary)_6%,var(--tenant-panel))] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:hover:bg-[color-mix(in_srgb,var(--tenant-primary)_10%,var(--tenant-panel-dark))]'}`}>
                                <span className={`absolute inset-y-0 left-0 w-1 transition ${selectedClientId === client.id ? 'bg-[var(--tenant-primary)]' : 'bg-transparent group-hover:bg-[var(--tenant-primary-border)]'}`} />
                                <div className="flex justify-between items-start mb-4">
                                    <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300"><Building2 size={22} /></div>
                                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${client.status === 'Active' ? 'bg-emerald-500' : 'bg-[var(--tenant-border)] dark:bg-[var(--tenant-border-dark)]'}`}></span>
                                </div>
                                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-1 leading-tight">{client.name}</h3>
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{client.segment || client.industry || 'Industria geral'}</p>
                                <div className="mt-4 flex items-center gap-1.5">
                                    <div className={`rounded bg-[var(--tenant-control)] p-1 dark:bg-[var(--tenant-control-dark)] ${client.isServiceClient ? 'text-[var(--tenant-primary)]' : 'text-slate-300 dark:text-slate-700 opacity-40'}`} title="Cliente de Servicos"><Briefcase size={12} /></div>
                                    <div className={`rounded bg-[var(--tenant-control)] p-1 dark:bg-[var(--tenant-control-dark)] ${client.isProductClient ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-700 opacity-40'}`} title="Cliente de Produtos"><Package size={12} /></div>
                                </div>
                                <div className="mt-4 space-y-2 border-t border-[var(--tenant-border)] pt-4 text-sm text-slate-600 dark:border-[var(--tenant-border-dark)] dark:text-slate-400">
                                    <div className="flex items-center gap-2"><User size={15} /> <span className="truncate">{client.contactName || 'Sem contato'}</span></div>
                                    <div className="flex items-center gap-2"><MapPin size={15} /> <span className="truncate">{client.location || 'Local nao informado'}</span></div>
                                </div>
                                <div className="absolute right-2 top-2 flex gap-1 rounded-lg bg-[var(--tenant-control)] p-1 opacity-0 shadow-sm transition group-hover:opacity-100 dark:bg-[var(--tenant-control-dark)]">
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }} className="rounded p-1.5 text-[var(--tenant-primary)] hover:bg-[var(--tenant-primary-soft)]"><Edit3 size={14} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedClient && selectedClientStats && (
                <ResponsiveDrawer
                    open={Boolean(selectedClient)}
                    onClose={() => setSelectedClientId(null)}
                    panelClassName="lg:w-[460px] lg:max-w-[calc(100vw-24px)]"
                >
                    <div className="border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-6 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase ${selectedClient.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] text-slate-600 dark:text-slate-400 border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]'}`}>{selectedClient.status === 'Active' ? 'Ativo' : 'Inativo'}</span>
                                {selectedClient.classification && <span className="text-[10px] font-bold px-2 py-1 rounded uppercase border bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] border-[var(--tenant-primary-border)]">{selectedClient.classification}</span>}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {onCreateProposal && (
                                    <button
                                        type="button"
                                        onClick={createProposalFromClient}
                                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[var(--tenant-primary)] px-3 text-xs font-black text-white shadow-sm transition hover:brightness-95"
                                        title="Criar oportunidade"
                                        aria-label="Criar oportunidade"
                                    >
                                        <Plus size={14} />
                                        <span className="hidden sm:inline">Oportunidade</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleOpenModal(selectedClient)}
                                    className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-600 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300"
                                    title="Editar cliente"
                                    aria-label="Editar cliente"
                                >
                                    <Edit3 size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(selectedClient.id)}
                                    className="flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
                                    title="Remover cliente"
                                    aria-label="Remover cliente"
                                >
                                    <Trash2 size={15} />
                                </button>
                                <button onClick={() => setSelectedClientId(null)} className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-400 transition hover:text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-500 dark:hover:text-slate-300" title="Fechar painel" aria-label="Fechar painel"><XCircle size={18} /></button>
                            </div>
                        </div>
                        <h2 className="font-black text-xl text-slate-800 dark:text-slate-100 leading-tight mb-1">{selectedClient.name}</h2>
                        <div className="flex items-center gap-3">
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{selectedClient.cnpj || 'CNPJ nao informado'}</p>
                            {selectedClient.corporateGroup && <span className="flex items-center gap-1 text-[10px] text-[var(--tenant-primary)] font-bold bg-[var(--tenant-primary-soft)] px-2 py-0.5 rounded border border-[var(--tenant-primary-border)]"><Network size={10} />{selectedClient.corporateGroup}</span>}
                        </div>
                    </div>

                    <div className="flex border-b border-[var(--tenant-border)] bg-[var(--tenant-control)] px-6 pt-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                        {[
                            { id: 'summary', label: 'Resumo', icon: TrendingUp },
                            { id: 'contacts', label: 'Contatos', icon: Users },
                            { id: 'proposals', label: 'Propostas', icon: FileText }
                        ].map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button key={tab.id} onClick={() => setDetailTab(tab.id as typeof detailTab)} className={`pb-3 px-2 mr-5 text-[11px] font-bold uppercase border-b-2 flex items-center gap-1.5 ${detailTab === tab.id ? 'border-[var(--tenant-primary)] text-[var(--tenant-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                                    <Icon size={14} /> {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        {detailTab === 'summary' && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <Metric label="Total propostas" value={selectedClientStats.totalQuotes} />
                                    <Metric label="Em aberto" value={selectedClientStats.pendingCount} accent="amber" />
                                    <Metric label="Fechadas" value={selectedClientStats.wonCount} accent="emerald" />
                                    <Metric label="Perdidas" value={selectedClientStats.lostCount} accent="red" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <MoneyBlock label="Valor ganho" value={selectedClientStats.totalWonValue} icon={TrendingUp} tone="emerald" />
                                    <MoneyBlock label="Pipeline aberto" value={selectedClientStats.pipelineValue} icon={Briefcase} tone="blue" />
                                </div>
                                <InfoPanel title="Dados cadastrais" rows={[
                                    ['Razao social', selectedClient.legalName],
                                    ['Nome fantasia', selectedClient.tradeName],
                                    ['Situacao', selectedClient.registrationStatus],
                                    ['Inscricao estadual', selectedClient.stateRegistration],
                                    ['Segmento', selectedClient.segment || selectedClient.industry],
                                    ['Endereco', [selectedClient.address, selectedClient.addressNumber, selectedClient.neighborhood, selectedClient.city, selectedClient.state].filter(Boolean).join(', ')]
                                ]} />
                            </>
                        )}

                        {detailTab === 'contacts' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Contatos vinculados</h4>
                                    {onSaveContact && <button onClick={openContactModal} className="rounded-lg bg-[var(--tenant-primary)] px-3 py-2 text-xs font-bold text-white hover:brightness-95 flex items-center gap-1.5"><UserPlus size={14} /> Contato</button>}
                                </div>
                                {selectedClientContacts.length === 0 ? (
                                    <p className="rounded-lg border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-control)] py-8 text-center text-xs font-semibold text-slate-400 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-500">Nenhum contato cadastrado para este cliente.</p>
                                ) : selectedClientContacts.map(contact => (
                                    <div key={contact.id} className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-black text-slate-800 dark:text-slate-100">{contact.name}</p>
                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{contact.role}</p>
                                            </div>
                                            <span className="rounded bg-[var(--tenant-surface)] px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-[var(--tenant-surface-dark)] dark:text-slate-400">{contact.influenceLevel}</span>
                                        </div>
                                        <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-2"><Mail size={12} /> {contact.email || '-'}</div>
                                            <div className="flex items-center gap-2"><Phone size={12} /> {contact.phone || '-'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {detailTab === 'proposals' && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Propostas do cliente</h4>
                                {selectedClientProposals.length === 0 ? (
                                    <p className="rounded-lg border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-control)] py-8 text-center text-xs font-semibold text-slate-400 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-500">Nenhuma proposta vinculada.</p>
                                ) : selectedClientProposals.map(p => (
                                    <div key={p.id} className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-black text-slate-700 dark:text-slate-200">#{p.proposalId} <span className="text-slate-400 font-semibold">v{p.version}</span></p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                            <span className="rounded bg-[var(--tenant-surface)] px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-[var(--tenant-surface-dark)] dark:text-slate-400">{p.stage}</span>
                                        </div>
                                        <div className="mt-3 flex items-end justify-between gap-3">
                                            <p className="text-lg font-black text-slate-900 dark:text-slate-100">{formatCurrency(p.value)}</p>
                                            {onSelectProposal && <button onClick={() => onSelectProposal(p.id)} className="rounded-lg border border-[var(--tenant-border)] px-3 py-1.5 text-xs font-bold text-[var(--tenant-text)] hover:bg-[var(--tenant-surface)] dark:border-[var(--tenant-border-dark)] dark:text-[var(--tenant-text-dark)] dark:hover:bg-[var(--tenant-surface-dark)]">Abrir</button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </ResponsiveDrawer>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[700] flex items-center justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_55%,transparent)] backdrop-blur-sm p-4">
                    <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-2xl dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                        <div className="shrink-0 border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-5 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]">
                            <h3 className="font-black text-lg text-slate-800 dark:text-slate-100">{editingId ? 'Editar cliente' : 'Novo cliente'}</h3>
                        </div>
                        <div className="flex border-b border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-6 pt-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                            {[
                                { id: 'company', label: 'Empresa', icon: Building2 },
                                { id: 'address', label: 'Endereco', icon: MapPin },
                                { id: 'contact', label: 'Contato principal', icon: User }
                            ].map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button key={tab.id} onClick={() => setFormTab(tab.id as typeof formTab)} className={`pb-3 px-2 mr-6 text-[11px] font-bold uppercase border-b-2 flex items-center gap-1.5 ${formTab === tab.id ? 'border-[var(--tenant-primary)] text-[var(--tenant-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                                        <Icon size={14} /> {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {formTab === 'company' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Nome exibicao" className="col-span-2"><input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className={fieldClass} placeholder="Ex: Votorantim Cimentos" /></Field>
                                    <Field label="Razao social"><input value={formData.legalName || ''} onChange={e => setFormData({ ...formData, legalName: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Nome fantasia"><input value={formData.tradeName || ''} onChange={e => setFormData({ ...formData, tradeName: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="CNPJ">
                                        <div className="flex gap-2">
                                            <input value={formData.cnpj || ''} onChange={e => { setFormData({ ...formData, cnpj: formatCnpj(e.target.value) }); setCnpjError(null); }} className={fieldClass} placeholder="00.000.000/0001-00" />
                                            <button onClick={handleFetchCnpj} disabled={isFetchingCnpj} className="min-w-[82px] rounded-lg border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-3 text-xs font-bold text-[var(--tenant-primary)] hover:brightness-95 disabled:opacity-60">{isFetchingCnpj ? <Loader2 size={16} className="mx-auto animate-spin" /> : 'Buscar'}</button>
                                        </div>
                                        {cnpjError && <p className="mt-1 text-xs font-semibold text-red-500">{cnpjError}</p>}
                                    </Field>
                                    <Field label="Inscricao estadual"><input value={formData.stateRegistration || ''} onChange={e => setFormData({ ...formData, stateRegistration: formatIE(e.target.value) })} className={fieldClass} /></Field>
                                    <Field label="Situacao cadastral"><input value={formData.registrationStatus || ''} onChange={e => setFormData({ ...formData, registrationStatus: e.target.value })} className={fieldClass} placeholder="ATIVA" /></Field>
                                    <Field label="Grupo economico"><input value={formData.corporateGroup || ''} onChange={e => setFormData({ ...formData, corporateGroup: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Segmento"><input value={formData.segment || formData.industry || ''} onChange={e => setFormData({ ...formData, segment: e.target.value, industry: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Sub-segmento"><input value={formData.subSegment || ''} onChange={e => setFormData({ ...formData, subSegment: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Classificacao">
                                        <select value={formData.classification || 'Prospect'} onChange={e => setFormData({ ...formData, classification: e.target.value as any })} className={fieldClass}>
                                            <option value="Lead">Lead</option>
                                            <option value="Prospect">Prospect</option>
                                            <option value="Client">Cliente</option>
                                        </select>
                                    </Field>
                                    <Field label="Status">
                                        <select value={formData.status || 'Active'} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className={fieldClass}>
                                            <option value="Active">Ativo</option>
                                            <option value="Inactive">Inativo</option>
                                        </select>
                                    </Field>
                                </div>
                            )}

                            {formTab === 'address' && (
                                <div className="grid grid-cols-4 gap-4">
                                    <Field label="CEP"><input value={formData.cep || ''} onChange={e => setFormData({ ...formData, cep: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Logradouro / rua" className="col-span-3"><input value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Numero"><input value={formData.addressNumber || ''} onChange={e => setFormData({ ...formData, addressNumber: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Bairro" className="col-span-3"><input value={formData.neighborhood || ''} onChange={e => setFormData({ ...formData, neighborhood: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Cidade" className="col-span-2"><input value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Estado (UF)" className="col-span-2"><input value={formData.state || ''} onChange={e => setFormData({ ...formData, state: e.target.value })} className={fieldClass} /></Field>
                                </div>
                            )}

                            {formTab === 'contact' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Nome do contato" className="col-span-2"><input value={formData.contactName || ''} onChange={e => setFormData({ ...formData, contactName: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Email"><input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className={fieldClass} /></Field>
                                    <Field label="Telefone"><input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={fieldClass} /></Field>
                                </div>
                            )}
                        </div>
                        <div className="shrink-0 border-t border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-5 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]">
                            {saveError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{saveError}</div>}
                            <div className="flex justify-end gap-3">
                                <button disabled={isSavingClient} onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2 font-bold text-slate-600 hover:bg-[var(--tenant-control)] disabled:opacity-60 dark:text-slate-400 dark:hover:bg-[var(--tenant-control-dark)]">Cancelar</button>
                                <button disabled={isSavingClient} onClick={handleSave} className="px-6 py-2 bg-[var(--tenant-primary)] text-white font-bold rounded-md hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70">{isSavingClient ? 'Salvando...' : 'Salvar cliente'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isContactModalOpen && selectedClient && (
                <div className="fixed inset-0 z-[720] flex items-center justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_55%,transparent)] backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-2xl dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                        <div className="flex items-center justify-between border-b border-[var(--tenant-border)] p-5 dark:border-[var(--tenant-border-dark)]">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Cadastrar contato</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedClient.name}</p>
                            </div>
                            <button disabled={isSavingContact} onClick={() => setIsContactModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={20} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 p-5">
                            {contactError && <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{contactError}</div>}
                            <Field label="Nome" className="col-span-2"><input value={contactDraft.name || ''} onChange={e => setContactDraft({ ...contactDraft, name: e.target.value })} className={fieldClass} /></Field>
                            <Field label="Cargo"><input value={contactDraft.role || ''} onChange={e => setContactDraft({ ...contactDraft, role: e.target.value })} className={fieldClass} /></Field>
                            <Field label="Influencia">
                                <select value={contactDraft.influenceLevel || 'Influencer'} onChange={e => setContactDraft({ ...contactDraft, influenceLevel: e.target.value as Contact['influenceLevel'] })} className={fieldClass}>
                                    <option value="Decision Maker">Decisor</option>
                                    <option value="Influencer">Influenciador</option>
                                    <option value="Evaluator">Avaliador</option>
                                    <option value="User">Usuario</option>
                                </select>
                            </Field>
                            <Field label="Email"><input type="email" value={contactDraft.email || ''} onChange={e => setContactDraft({ ...contactDraft, email: e.target.value })} className={fieldClass} /></Field>
                            <Field label="Telefone"><input value={contactDraft.phone || ''} onChange={e => setContactDraft({ ...contactDraft, phone: e.target.value })} className={fieldClass} /></Field>
                            <Field label="LinkedIn" className="col-span-2"><input value={contactDraft.linkedin || ''} onChange={e => setContactDraft({ ...contactDraft, linkedin: e.target.value })} className={fieldClass} /></Field>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]">
                            <button disabled={isSavingContact} onClick={() => setIsContactModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">Cancelar</button>
                            <button disabled={isSavingContact || !contactDraft.name?.trim() || !contactDraft.role?.trim()} onClick={saveContact} className="rounded-lg bg-[var(--tenant-primary)] px-5 py-2 text-sm font-bold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60">{isSavingContact ? 'Salvando...' : 'Salvar contato'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Field: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({ label, className = '', children }) => (
    <label className={`block ${className}`}>
        <span className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">{label}</span>
        {children}
    </label>
);

const Metric: React.FC<{ label: string; value: number; accent?: 'amber' | 'emerald' | 'red' }> = ({ label, value, accent }) => {
    const color = accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : accent === 'red' ? 'text-red-500 dark:text-red-400' : accent === 'amber' ? 'text-amber-500 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100';
    return (
        <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 text-center dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">{label}</p>
        </div>
    );
};

const MoneyBlock: React.FC<{ label: string; value: number; icon: React.ElementType; tone: 'emerald' | 'blue' }> = ({ label, value, icon: Icon, tone }) => (
    <div className={`rounded-lg border p-4 ${tone === 'emerald' ? 'border-emerald-100 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/10' : 'border-[var(--tenant-secondary-border)] bg-[var(--tenant-secondary-soft)]'}`}>
        <div className="mb-1 flex items-center gap-2">
            <Icon size={16} className={tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--tenant-secondary)]'} />
            <p className={`text-xs font-bold uppercase ${tone === 'emerald' ? 'text-emerald-800 dark:text-emerald-300' : 'text-[var(--tenant-secondary)]'}`}>{label}</p>
        </div>
        <p className={`text-xl font-black ${tone === 'emerald' ? 'text-emerald-700 dark:text-emerald-400' : 'text-[var(--tenant-secondary)]'}`}>{formatCurrency(value)}</p>
    </div>
);

const InfoPanel: React.FC<{ title: string; rows: Array<[string, string | undefined]> }> = ({ title, rows }) => (
    <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
        <h4 className="mb-3 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">{title}</h4>
        <div className="space-y-3">
            {rows.filter(([, value]) => value).map(([label, value]) => (
                <div key={label}>
                    <p className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">{label}</p>
                    <p className="text-xs font-semibold leading-tight text-slate-700 dark:text-slate-300">{value}</p>
                </div>
            ))}
        </div>
    </div>
);

export default Clients;
