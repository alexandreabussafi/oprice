import React, { useState } from 'react';
import { Contact, Client } from '../types';
import { Plus, Search, Filter, Mail, Phone, Building2, UserCircle2, Briefcase, UserCog, Edit2, Trash2, Linkedin, LayoutList, LayoutGrid } from 'lucide-react';
import { Button, PageHeader, PageShell, Toolbar } from '../components/ui';

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

    const filteredContacts = contacts.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getClientName = (clientId: string) => {
        return clients.find(c => c.id === clientId)?.name || 'Empresa Desconhecida';
    };

    const getInfluenceBadge = (level: Contact['influenceLevel']) => {
        switch (level) {
            case 'Decision Maker': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Decisor</span>;
            case 'Influencer': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] border border-[var(--tenant-primary-border)]">Influenciador</span>;
            case 'Evaluator': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Avaliador</span>;
            case 'User': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Usuário</span>;
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
        <PageShell>
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
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                    />
                </div>
                <button className="flex min-h-11 items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all">
                    <Filter size={18} /> Filtros
                </button>
                <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        title="Visão de lista"
                        aria-label="Visão de lista"
                        className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${viewMode === 'list' ? 'bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] dark:text-[var(--tenant-primary-on-dark)]' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                    >
                        <LayoutList size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('cards')}
                        title="Visão em cards"
                        aria-label="Visão em cards"
                        className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${viewMode === 'cards' ? 'bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] dark:text-[var(--tenant-primary-on-dark)]' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                    >
                        <LayoutGrid size={18} />
                    </button>
                </div>
            </Toolbar>

            {viewMode === 'list' && (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="overflow-x-auto">
                        <table className="min-w-[980px] w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-400">
                                <tr>
                                    <th className="px-5 py-3">Contato</th>
                                    <th className="px-4 py-3">Empresa</th>
                                    <th className="px-4 py-3">E-mail</th>
                                    <th className="px-4 py-3">Telefone</th>
                                    <th className="px-4 py-3">Papel</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredContacts.map(contact => (
                                    <tr key={contact.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/45">
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
                                            <a href={`mailto:${contact.email}`} className="inline-flex max-w-[240px] items-center gap-2 text-slate-600 transition-colors hover:text-[var(--tenant-primary)] dark:text-slate-300 dark:hover:text-[var(--tenant-primary-on-dark)]">
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
                                                    <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn" aria-label="Abrir LinkedIn" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800">
                                                        <Linkedin size={15} />
                                                    </a>
                                                )}
                                                <button type="button" onClick={() => openModal(contact)} title="Editar contato" aria-label="Editar contato" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-[var(--tenant-primary)] dark:hover:bg-slate-800 dark:hover:text-[var(--tenant-primary-on-dark)]">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button type="button" onClick={() => handleDelete(contact.id)} title="Excluir contato" aria-label="Excluir contato" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

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
                {filteredContacts.map(contact => (
                    <div key={contact.id} className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
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
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openModal(contact)} className="p-2 text-slate-400 hover:text-[var(--tenant-primary)] transition-colors">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(contact.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
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
                                <a href={`mailto:${contact.email}`} className="font-medium hover:text-[var(--tenant-primary)] transition-colors truncate">{contact.email}</a>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <Phone size={16} className="text-slate-400 shrink-0" />
                                <span className="font-medium">{contact.phone}</span>
                            </div>
                            {contact.linkedin && (
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                    <Linkedin size={16} className="text-blue-500 shrink-0" />
                                    <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-blue-600 transition-colors truncate">Perfil Linkedin</a>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Papel:</span>
                            {getInfluenceBadge(contact.influenceLevel)}
                        </div>
                    </div>
                ))}

                {filteredContacts.length === 0 && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                        <UserCog className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhum contato encontrado</h3>
                        <p className="text-slate-500 mt-1">Tente ajustar seus termos de busca ou crie um novo contato.</p>
                    </div>
                )}
            </div>

            {/* Modal de Edição/Criação */}
            </>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="max-h-[92dvh] w-full max-w-xl overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200 dark:border-slate-800 dark:bg-slate-900 sm:rounded-xl sm:animate-in sm:zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50 sm:px-6 sm:py-4">
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
                                    <input type="text" name="name" required defaultValue={editingContact?.name} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-md px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]" />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Empresa (Conta)</label>
                                    <select name="clientId" required defaultValue={editingContact?.clientId} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-md px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] cursor-pointer">
                                        <option value="">Selecione...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Cargo</label>
                                    <input type="text" name="role" required defaultValue={editingContact?.role} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-md px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]" />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">E-mail</label>
                                    <input type="email" name="email" required defaultValue={editingContact?.email} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-md px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]" />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Telefone</label>
                                    <input type="tel" name="phone" required defaultValue={editingContact?.phone} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-md px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]" />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Decisão de Compra</label>
                                    <select name="influenceLevel" required defaultValue={editingContact?.influenceLevel || 'Influencer'} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-md px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] cursor-pointer">
                                        <option value="Decision Maker">Decisor Principal</option>
                                        <option value="Influencer">Influenciador</option>
                                        <option value="Evaluator">Avaliador Técnico/Econômico</option>
                                        <option value="User">Usuário Final</option>
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Perfil do LinkedIn (URL)</label>
                                    <input type="url" name="linkedin" placeholder="https://linkedin.com/in/..." defaultValue={editingContact?.linkedin} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-md px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]" />
                                </div>
                            </div>

                            {saveError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                                    {saveError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 sm:justify-end sm:pt-6">
                                <button type="button" disabled={isSavingContact} onClick={closeModal} className="min-h-11 flex-1 rounded-md px-5 py-2.5 font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 sm:flex-none">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSavingContact} className="min-h-11 flex-1 rounded-md bg-[var(--tenant-primary)] px-5 py-2.5 font-bold text-white shadow-md shadow-slate-200 transition-transform hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 dark:shadow-none sm:flex-none">
                                    {isSavingContact ? 'Salvando...' : 'Salvar Contato'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )}
        </PageShell>
    );
};

export default Contacts;
