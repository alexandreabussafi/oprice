import React, { useState } from 'react';
import { Contact, Client } from '../types';
import { Plus, Search, Filter, Mail, Phone, Building2, UserCircle2, Briefcase, UserCog, Edit2, Trash2, Linkedin, LayoutList, LayoutGrid, XCircle, MapPin, ExternalLink } from 'lucide-react';
import { Button, PageHeader, PageShell, Toolbar, ResponsiveDrawer, inputClass } from '../components/ui';

interface ContactsProps {
    contacts: Contact[];
    onSaveContact: (contact: Contact) => void | Promise<void>;
    onDeleteContact: (id: string) => void | Promise<void>;
    clients: Client[];
    currentUser: { name: string; role: string };
}

const Contacts: React.FC<ContactsProps> = ({ contacts, onSaveContact, onDeleteContact, clients }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [isSavingContact, setIsSavingContact] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [contactDetailTab, setContactDetailTab] = useState<'summary' | 'account'>('summary');

    const filteredContacts = contacts.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getClientName = (clientId: string) => {
        return clients.find(c => c.id === clientId)?.name || 'Empresa Desconhecida';
    };

    const selectedContact = contacts.find(c => c.id === selectedContactId) || null;
    const selectedClient = selectedContact ? clients.find(c => c.id === selectedContact.clientId) : undefined;
    const selectedClientLocation = selectedClient ? selectedClient.location || [selectedClient.city, selectedClient.state].filter(Boolean).join(' - ') : '';
    const selectedClientAddress = selectedClient ? [
        selectedClient.address,
        selectedClient.addressNumber,
        selectedClient.neighborhood,
        selectedClient.city,
        selectedClient.state
    ].filter(Boolean).join(', ') : '';

    const openContactPreview = (contactId: string) => {
        setSelectedContactId(contactId);
        setContactDetailTab('summary');
    };

    const handleSelectableKeyDown = (event: React.KeyboardEvent, contactId: string) => {
        const target = event.target as HTMLElement;
        if (target.closest('button,a,input,select,textarea')) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openContactPreview(contactId);
        }
    };

    const stopActionPropagation = (event: React.MouseEvent) => {
        event.stopPropagation();
    };

    const getInfluenceBadge = (level: Contact['influenceLevel']) => {
        switch (level) {
            case 'Decision Maker': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Decisor</span>;
            case 'Influencer': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] border border-[var(--tenant-primary-border)]">Influenciador</span>;
            case 'Evaluator': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Avaliador</span>;
            case 'User': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] text-slate-700 dark:text-slate-400 border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]">Usuário</span>;
        }
    };

    const handleSaveContact = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSavingContact) return;
        const formData = new FormData(e.currentTarget);
        const clientId = formData.get('clientId') as string;
        if (!clientId) {
            setSaveError('Selecione uma empresa para o contato.');
            return;
        }
        const newContact: Contact = {
            id: editingContact ? editingContact.id : `cont-${Date.now()}`,
            clientId,
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            role: formData.get('role') as string,
            influenceLevel: formData.get('influenceLevel') as Contact['influenceLevel'],
            linkedin: formData.get('linkedin') as string || undefined
        };

        setIsSavingContact(true);
        setSaveError(null);
        try {
            await onSaveContact(newContact);
            closeModal();
        } catch (error: any) {
            setSaveError(error?.message || 'Erro ao salvar contato.');
        } finally {
            setIsSavingContact(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este contato?')) {
            await onDeleteContact(id);
            if (selectedContactId === id) setSelectedContactId(null);
        }
    };

    const openModal = (contact?: Contact) => {
        setEditingContact(contact || null);
        setSaveError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingContact(null);
        setSaveError(null);
        setIsSavingContact(false);
    };

    return (
        <div className="flex h-full min-h-0">
        <PageShell className="min-w-0 flex-1 overflow-y-auto">
            <PageHeader
                icon={UserCircle2}
                title="Gestão de Contatos"
                subtitle="Gerencie tomadores de decisão e influenciadores das contas."
                actions={<Button type="button" onClick={() => openModal()} icon={Plus} className="w-full sm:w-auto">Novo Contato</Button>}
            />

            <Toolbar>
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar contatos por nome, cargo ou e-mail..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] py-3 pl-12 pr-4 text-[var(--tenant-text)] shadow-sm outline-none transition-all focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]"
                    />
                </div>
                <button className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-5 py-3 font-bold text-slate-600 shadow-sm transition-all hover:border-[var(--tenant-primary-border)] hover:brightness-95 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">
                    <Filter size={18} /> Filtros
                </button>
                <div className="flex items-center gap-1 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-1 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                    <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        title="Visão de lista"
                        aria-label="Visão de lista"
                        className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'bg-[var(--tenant-control-active)] text-[var(--tenant-primary)] dark:bg-[var(--tenant-control-active-dark)] dark:text-[var(--tenant-primary-on-dark)]' : 'text-slate-500 hover:bg-[var(--tenant-surface)] dark:text-slate-400 dark:hover:bg-[var(--tenant-surface-dark)]'}`}
                    >
                        <LayoutList size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('cards')}
                        title="Visão em cards"
                        aria-label="Visão em cards"
                        className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${viewMode === 'cards' ? 'bg-[var(--tenant-control-active)] text-[var(--tenant-primary)] dark:bg-[var(--tenant-control-active-dark)] dark:text-[var(--tenant-primary-on-dark)]' : 'text-slate-500 hover:bg-[var(--tenant-surface)] dark:text-slate-400 dark:hover:bg-[var(--tenant-surface-dark)]'}`}
                    >
                        <LayoutGrid size={18} />
                    </button>
                </div>
            </Toolbar>

            {viewMode === 'list' && (
                <div className="overflow-hidden rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                    <div className="overflow-x-auto">
                        <table className="min-w-[980px] w-full text-left text-sm">
                            <thead className="border-b border-[var(--tenant-border)] bg-[var(--tenant-control)] text-[11px] font-black uppercase text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">
                                <tr>
                                    <th className="px-5 py-3">Contato</th>
                                    <th className="px-4 py-3">Empresa</th>
                                    <th className="px-4 py-3">E-mail</th>
                                    <th className="px-4 py-3">Telefone</th>
                                    <th className="px-4 py-3">Papel</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--tenant-border)] dark:divide-[var(--tenant-border-dark)]">
                                {filteredContacts.map(contact => {
                                    const isSelected = selectedContactId === contact.id;
                                    return (
                                    <tr
                                        key={contact.id}
                                        role="button"
                                        tabIndex={0}
                                        aria-selected={isSelected}
                                        onClick={() => openContactPreview(contact.id)}
                                        onKeyDown={(event) => handleSelectableKeyDown(event, contact.id)}
                                        className={`cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--tenant-primary-soft)] ${isSelected ? 'bg-[var(--tenant-primary-soft)] dark:bg-[var(--tenant-control-active-dark)]' : 'hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)]'}`}
                                    >
                                        <td className="px-5 py-4">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-sm font-black text-[var(--tenant-primary)] dark:text-[var(--tenant-primary-on-dark)]">
                                                    {contact.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate font-black text-slate-800 dark:text-slate-100">{contact.name}</p>
                                                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                        <Briefcase size={13} className="shrink-0 text-slate-400" />
                                                        {contact.role}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex max-w-[220px] items-center gap-2 text-slate-600 dark:text-slate-300">
                                                <Building2 size={15} className="shrink-0 text-slate-400" />
                                                <span className="truncate font-semibold">{getClientName(contact.clientId)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <a href={`mailto:${contact.email}`} onClick={stopActionPropagation} className="inline-flex max-w-[240px] items-center gap-2 text-slate-600 transition-colors hover:text-[var(--tenant-primary)] dark:text-slate-300 dark:hover:text-[var(--tenant-primary-on-dark)]">
                                                <Mail size={15} className="shrink-0 text-slate-400" />
                                                <span className="truncate font-semibold">{contact.email}</span>
                                            </a>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
                                                <Phone size={15} className="text-slate-400" />
                                                {contact.phone}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">{getInfluenceBadge(contact.influenceLevel)}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-end gap-1">
                                                {contact.linkedin && (
                                                    <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" onClick={stopActionPropagation} title="LinkedIn" aria-label="Abrir LinkedIn" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-[var(--tenant-control)] hover:text-[var(--tenant-secondary)] dark:hover:bg-[var(--tenant-control-dark)]">
                                                        <Linkedin size={15} />
                                                    </a>
                                                )}
                                                <button type="button" onClick={(event) => { event.stopPropagation(); openModal(contact); }} title="Editar contato" aria-label="Editar contato" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-[var(--tenant-control)] hover:text-[var(--tenant-primary)] dark:hover:bg-[var(--tenant-control-dark)] dark:hover:text-[var(--tenant-primary-on-dark)]">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button type="button" onClick={(event) => { event.stopPropagation(); handleDelete(contact.id); }} title="Excluir contato" aria-label="Excluir contato" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}

                                {filteredContacts.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-14 text-center">
                                            <UserCog className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                                            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Nenhum contato encontrado</h3>
                                            <p className="mt-1 text-slate-500">Tente ajustar seus termos de busca ou crie um novo contato.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {viewMode === 'cards' && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContacts.map(contact => {
                    const isSelected = selectedContactId === contact.id;
                    return (
                    <div
                        key={contact.id}
                        role="button"
                        tabIndex={0}
                        aria-selected={isSelected}
                        onClick={() => openContactPreview(contact.id)}
                        onKeyDown={(event) => handleSelectableKeyDown(event, contact.id)}
                        className={`group cursor-pointer rounded-lg border bg-[var(--tenant-panel)] p-6 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-primary-soft)] dark:bg-[var(--tenant-panel-dark)] ${isSelected ? 'border-[var(--tenant-primary-border)] ring-2 ring-[var(--tenant-primary-soft)]' : 'border-[var(--tenant-border)] hover:border-[var(--tenant-primary-border)] hover:shadow-md dark:border-[var(--tenant-border-dark)]'}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-md bg-[var(--tenant-primary-soft)] flex items-center justify-center text-[var(--tenant-primary)] font-black text-xl border border-[var(--tenant-primary-border)]">
                                    {contact.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">{contact.name}</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        <Briefcase size={14} className="text-slate-400" />
                                        {contact.role}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                                <button type="button" onClick={(event) => { event.stopPropagation(); openModal(contact); }} className="p-2 text-slate-400 transition-colors hover:text-[var(--tenant-primary)]" title="Editar contato" aria-label="Editar contato">
                                    <Edit2 size={16} />
                                </button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); handleDelete(contact.id); }} className="p-2 text-slate-400 transition-colors hover:text-red-600 dark:hover:text-red-400" title="Excluir contato" aria-label="Excluir contato">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 mb-5">
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <Building2 size={16} className="text-slate-400 shrink-0" />
                                <span className="font-medium truncate">{getClientName(contact.clientId)}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <Mail size={16} className="text-slate-400 shrink-0" />
                                <a href={`mailto:${contact.email}`} onClick={stopActionPropagation} className="truncate font-medium transition-colors hover:text-[var(--tenant-primary)]">{contact.email}</a>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <Phone size={16} className="text-slate-400 shrink-0" />
                                <span className="font-medium">{contact.phone}</span>
                            </div>
                            {contact.linkedin && (
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <Linkedin size={16} className="text-[var(--tenant-secondary)] shrink-0" />
                                    <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" onClick={stopActionPropagation} className="truncate font-medium transition-colors hover:text-[var(--tenant-secondary)]">Perfil Linkedin</a>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between border-t border-[var(--tenant-border)] pt-4 dark:border-[var(--tenant-border-dark)]">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Papel:</span>
                            {getInfluenceBadge(contact.influenceLevel)}
                        </div>
                    </div>
                    );
                })}

                {filteredContacts.length === 0 && (
                    <div className="col-span-full rounded-lg border-2 border-dashed border-[var(--tenant-border)] py-16 text-center dark:border-[var(--tenant-border-dark)]">
                        <UserCog className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhum contato encontrado</h3>
                        <p className="text-slate-500 mt-1">Tente ajustar seus termos de busca ou crie um novo contato.</p>
                    </div>
                )}
            </div>

            {/* Modal de Edição/Criação */}
            </>
            )}

        </PageShell>

            {selectedContact && (
                <ResponsiveDrawer
                    open={Boolean(selectedContact)}
                    onClose={() => setSelectedContactId(null)}
                    panelClassName="lg:!w-[430px] lg:!max-w-[calc(100vw-24px)]"
                >
                    <div className="shrink-0 border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-5 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                {getInfluenceBadge(selectedContact.influenceLevel)}
                                {selectedClient?.classification && (
                                    <span className="rounded border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-2 py-1 text-[10px] font-bold uppercase text-[var(--tenant-primary)]">
                                        {selectedClient.classification}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedContactId(null)}
                                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-[var(--tenant-control)] hover:text-slate-600 dark:hover:bg-[var(--tenant-control-dark)] dark:hover:text-slate-300"
                                title="Fechar painel"
                                aria-label="Fechar painel"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-lg font-black uppercase text-[var(--tenant-primary)] dark:text-[var(--tenant-primary-on-dark)]">
                                {selectedContact.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <h2 className="truncate text-xl font-black leading-tight text-slate-800 dark:text-slate-100">{selectedContact.name}</h2>
                                <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    <Briefcase size={13} className="shrink-0 text-slate-400" />
                                    {selectedContact.role || 'Cargo nao informado'}
                                </p>
                                <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    <Building2 size={13} className="shrink-0 text-slate-400" />
                                    {selectedClient?.name || getClientName(selectedContact.clientId)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 border-b border-[var(--tenant-border)] bg-[var(--tenant-control)] px-5 pt-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                        {[
                            { id: 'summary', label: 'Resumo', icon: UserCircle2 },
                            { id: 'account', label: 'Conta', icon: Building2 }
                        ].map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setContactDetailTab(tab.id as typeof contactDetailTab)}
                                    className={`mr-5 flex items-center gap-1.5 border-b-2 px-2 pb-3 text-[11px] font-bold uppercase transition-colors ${contactDetailTab === tab.id ? 'border-[var(--tenant-primary)] text-[var(--tenant-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                >
                                    <Icon size={14} /> {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="min-w-0 flex-1 space-y-5 overflow-y-auto p-5">
                        {contactDetailTab === 'summary' && (
                            <>
                                <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                    <h4 className="mb-4 flex items-center gap-2 border-b border-[var(--tenant-border)] pb-2 text-xs font-black uppercase text-slate-600 dark:border-[var(--tenant-border-dark)] dark:text-slate-300">
                                        <UserCircle2 size={14} /> Dados do contato
                                    </h4>
                                    <div className="space-y-3">
                                        <InfoLine icon={Briefcase} label="Cargo" value={selectedContact.role || '-'} />
                                        <InfoLine icon={UserCog} label="Papel na decisao" value={getInfluenceBadge(selectedContact.influenceLevel)} />
                                        <InfoLine icon={Building2} label="Conta" value={selectedClient?.name || getClientName(selectedContact.clientId)} />
                                    </div>
                                </div>

                                <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                    <h4 className="mb-4 flex items-center gap-2 border-b border-[var(--tenant-border)] pb-2 text-xs font-black uppercase text-slate-600 dark:border-[var(--tenant-border-dark)] dark:text-slate-300">
                                        <Mail size={14} /> Canais
                                    </h4>
                                    <div className="space-y-3">
                                        {selectedContact.email ? (
                                            <a href={`mailto:${selectedContact.email}`} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300 dark:hover:text-[var(--tenant-primary-on-dark)]">
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <Mail size={15} className="shrink-0 text-slate-400" />
                                                    <span className="truncate">{selectedContact.email}</span>
                                                </span>
                                                <ExternalLink size={14} className="shrink-0 text-slate-400" />
                                            </a>
                                        ) : (
                                            <InfoLine icon={Mail} label="E-mail" value="Nao informado" />
                                        )}
                                        {selectedContact.phone ? (
                                            <a href={`tel:${selectedContact.phone}`} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300 dark:hover:text-[var(--tenant-primary-on-dark)]">
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <Phone size={15} className="shrink-0 text-slate-400" />
                                                    <span className="truncate">{selectedContact.phone}</span>
                                                </span>
                                                <ExternalLink size={14} className="shrink-0 text-slate-400" />
                                            </a>
                                        ) : (
                                            <InfoLine icon={Phone} label="Telefone" value="Nao informado" />
                                        )}
                                        {selectedContact.linkedin ? (
                                            <a href={selectedContact.linkedin} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-[var(--tenant-secondary-border)] hover:text-[var(--tenant-secondary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300">
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <Linkedin size={15} className="shrink-0 text-[var(--tenant-secondary)]" />
                                                    <span className="truncate">Perfil LinkedIn</span>
                                                </span>
                                                <ExternalLink size={14} className="shrink-0 text-slate-400" />
                                            </a>
                                        ) : (
                                            <InfoLine icon={Linkedin} label="LinkedIn" value="Nao informado" />
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {contactDetailTab === 'account' && (
                            <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                <h4 className="mb-4 flex items-center gap-2 border-b border-[var(--tenant-border)] pb-2 text-xs font-black uppercase text-slate-600 dark:border-[var(--tenant-border-dark)] dark:text-slate-300">
                                    <Building2 size={14} /> Conta vinculada
                                </h4>
                                {selectedClient ? (
                                    <div className="space-y-3">
                                        <InfoLine icon={Building2} label="Empresa" value={selectedClient.name} />
                                        <InfoLine icon={Briefcase} label="CNPJ" value={selectedClient.cnpj || 'CNPJ nao informado'} />
                                        <InfoLine icon={UserCog} label="Status" value={selectedClient.status === 'Active' ? 'Ativo' : 'Inativo'} />
                                        <InfoLine icon={UserCircle2} label="Classificacao" value={selectedClient.classification || '-'} />
                                        <InfoLine icon={Filter} label="Segmento" value={selectedClient.segment || selectedClient.industry || 'Segmento nao informado'} />
                                        <InfoLine icon={MapPin} label="Localizacao" value={selectedClientLocation || 'Localizacao nao informada'} />
                                        <InfoLine icon={MapPin} label="Endereco" value={selectedClientAddress || 'Endereco nao informado'} />
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-control)] px-4 py-8 text-center dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                        <Building2 className="mx-auto mb-3 h-9 w-9 text-slate-300 dark:text-slate-600" />
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Conta nao encontrada</p>
                                        <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500">Este contato esta vinculado a uma empresa que nao esta na lista atual.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 border-t border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => openModal(selectedContact)}
                                className="flex items-center justify-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] py-2.5 text-xs font-bold text-[var(--tenant-text)] transition hover:brightness-95 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]"
                            >
                                <Edit2 size={14} /> Editar
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete(selectedContact.id)}
                                className="flex items-center justify-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] py-2.5 text-xs font-bold text-red-600 transition hover:border-red-200 hover:bg-red-50 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-red-400 dark:hover:border-red-800 dark:hover:bg-red-900/20"
                            >
                                <Trash2 size={14} /> Remover
                            </button>
                        </div>
                    </div>
                </ResponsiveDrawer>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] p-0 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="max-h-[92dvh] w-full max-w-xl overflow-hidden rounded-t-xl border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-2xl animate-in slide-in-from-bottom-4 duration-200 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] sm:rounded-lg sm:animate-in sm:zoom-in-95">
                        <div className="flex items-center justify-between border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-4 py-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)] sm:px-6 sm:py-4">
                            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <UserCog className="text-[var(--tenant-primary)]" size={20} />
                                {editingContact ? 'Editar Contato' : 'Novo Contato'}
                            </h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSaveContact} className="max-h-[calc(92dvh-64px)] space-y-4 overflow-y-auto p-4 sm:p-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nome Completo</label>
                                    <input type="text" name="name" required defaultValue={editingContact?.name} className={`w-full px-4 py-3 ${inputClass}`} />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Empresa (Conta)</label>
                                    <select name="clientId" required defaultValue={editingContact?.clientId} className={`w-full cursor-pointer px-4 py-3 ${inputClass}`}>
                                        <option value="">Selecione...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Cargo</label>
                                    <input type="text" name="role" required defaultValue={editingContact?.role} className={`w-full px-4 py-3 ${inputClass}`} />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">E-mail</label>
                                    <input type="email" name="email" required defaultValue={editingContact?.email} className={`w-full px-4 py-3 ${inputClass}`} />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Telefone</label>
                                    <input type="tel" name="phone" required defaultValue={editingContact?.phone} className={`w-full px-4 py-3 ${inputClass}`} />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Decisão de Compra</label>
                                    <select name="influenceLevel" required defaultValue={editingContact?.influenceLevel || 'Influencer'} className={`w-full cursor-pointer px-4 py-3 ${inputClass}`}>
                                        <option value="Decision Maker">Decisor Principal</option>
                                        <option value="Influencer">Influenciador</option>
                                        <option value="Evaluator">Avaliador Técnico/Econômico</option>
                                        <option value="User">Usuário Final</option>
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Perfil do LinkedIn (URL)</label>
                                    <input type="url" name="linkedin" placeholder="https://linkedin.com/in/..." defaultValue={editingContact?.linkedin} className={`w-full px-4 py-3 ${inputClass}`} />
                                </div>
                            </div>

                            {saveError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                                    {saveError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 sm:justify-end sm:pt-6">
                                <button type="button" disabled={isSavingContact} onClick={closeModal} className="min-h-11 flex-1 rounded-md px-5 py-2.5 font-bold text-slate-600 transition-colors hover:bg-[var(--tenant-control)] disabled:opacity-60 dark:text-slate-400 dark:hover:bg-[var(--tenant-control-dark)] sm:flex-none">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSavingContact} className="min-h-11 flex-1 rounded-md bg-[var(--tenant-primary)] px-5 py-2.5 font-bold text-white shadow-md transition-transform hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 dark:shadow-none sm:flex-none">
                                    {isSavingContact ? 'Salvando...' : 'Salvar Contato'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )}
        </div>
    );
};

const InfoLine: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode }> = ({ icon: Icon, label, value }) => (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2.5 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
        <span className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
            <Icon size={14} className="shrink-0 text-slate-400" />
            <span className="truncate">{label}</span>
        </span>
        <span className="min-w-0 max-w-[58%] text-right text-sm font-bold text-slate-700 dark:text-slate-200">
            {typeof value === 'string' ? <span className="break-words">{value}</span> : value}
        </span>
    </div>
);

export default Contacts;
