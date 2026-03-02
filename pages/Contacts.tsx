import React, { useState } from 'react';
import { Contact, Client } from '../types';
import { Plus, Search, Filter, Mail, Phone, Building2, UserCircle2, Briefcase, UserCog, Edit2, Trash2, Linkedin } from 'lucide-react';

interface ContactsProps {
    contacts: Contact[];
    setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
    clients: Client[];
    currentUser: { name: string; role: string };
}

const Contacts: React.FC<ContactsProps> = ({ contacts, setContacts, clients }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);

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
            case 'Influencer': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">Influenciador</span>;
            case 'Evaluator': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Avaliador</span>;
            case 'User': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Usuário</span>;
        }
    };

    const handleSaveContact = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newContact: Contact = {
            id: editingContact ? editingContact.id : `cont-${Date.now()}`,
            clientId: formData.get('clientId') as string,
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            role: formData.get('role') as string,
            influenceLevel: formData.get('influenceLevel') as Contact['influenceLevel'],
            linkedin: formData.get('linkedin') as string || undefined
        };

        if (editingContact) {
            setContacts(contacts.map(c => c.id === newContact.id ? newContact : c));
        } else {
            setContacts([...contacts, newContact]);
        }
        closeModal();
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir este contato?')) {
            setContacts(contacts.filter(c => c.id !== id));
        }
    };

    const openModal = (contact?: Contact) => {
        setEditingContact(contact || null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingContact(null);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <UserCircle2 className="text-indigo-600 dark:text-indigo-400" size={28} />
                        Gestão de Contatos
                    </h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Gerencie tomadores de decisão e influenciadores das contas.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                >
                    <Plus size={18} /> Novo Contato
                </button>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar contatos por nome, cargo ou e-mail..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                    />
                </div>
                <button className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all">
                    <Filter size={18} /> Filtros
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContacts.map(contact => (
                    <div key={contact.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xl border border-indigo-100 dark:border-indigo-800/50">
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
                                <button onClick={() => openModal(contact)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
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
                                <a href={`mailto:${contact.email}`} className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate">{contact.email}</a>
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
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                        <UserCog className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Nenhum contato encontrado</h3>
                        <p className="text-slate-500 mt-1">Tente ajustar seus termos de busca ou crie um novo contato.</p>
                    </div>
                )}
            </div>

            {/* Modal de Edição/Criação */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <UserCog className="text-indigo-600 dark:text-indigo-400" size={20} />
                                {editingContact ? 'Editar Contato' : 'Novo Contato'}
                            </h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSaveContact} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nome Completo</label>
                                    <input type="text" name="name" required defaultValue={editingContact?.name} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500" />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Empresa (Conta)</label>
                                    <select name="clientId" required defaultValue={editingContact?.clientId} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                                        <option value="">Selecione...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Cargo</label>
                                    <input type="text" name="role" required defaultValue={editingContact?.role} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500" />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">E-mail</label>
                                    <input type="email" name="email" required defaultValue={editingContact?.email} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500" />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Telefone</label>
                                    <input type="tel" name="phone" required defaultValue={editingContact?.phone} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500" />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Decisão de Compra</label>
                                    <select name="influenceLevel" required defaultValue={editingContact?.influenceLevel || 'Influencer'} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                                        <option value="Decision Maker">Decisor Principal</option>
                                        <option value="Influencer">Influenciador</option>
                                        <option value="Evaluator">Avaliador Técnico/Econômico</option>
                                        <option value="User">Usuário Final</option>
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Perfil do LinkedIn (URL)</label>
                                    <input type="url" name="linkedin" placeholder="https://linkedin.com/in/..." defaultValue={editingContact?.linkedin} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>

                            <div className="pt-6 flex justify-end gap-3">
                                <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 dark:shadow-none transition-transform active:scale-95">
                                    Salvar Contato
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )}
        </div >
    );
};

export default Contacts;
