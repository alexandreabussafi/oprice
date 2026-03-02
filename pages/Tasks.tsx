import React, { useState, useMemo } from 'react';
import { CRMTask, Client, Contact, ProposalData } from '../types';
import { Plus, Search, Calendar, CheckSquare, Clock, ArrowRight, MessageSquare, PhoneCall, MailCheck, CalendarDays, MoreHorizontal, FileText, UserCircle2, Filter, LayoutList, LayoutGrid, AlertCircle, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';

interface TasksProps {
    tasks: CRMTask[];
    setTasks: React.Dispatch<React.SetStateAction<CRMTask[]>>;
    clients: Client[];
    contacts: Contact[];
    proposals: ProposalData[];
    currentUser: { name: string; role: string };
    users?: { name: string; role: string }[]; // Optional prop for the list of available users
}

type ViewMode = 'list' | 'kanban' | 'calendar';

const Tasks: React.FC<TasksProps> = ({ tasks, setTasks, clients, contacts, proposals, currentUser, users = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<CRMTask | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    // Filters
    const [filterType, setFilterType] = useState<string>('all');
    const [filterAssignee, setFilterAssignee] = useState<string>('all');

    // Filtered and Sorted Tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || t.type === filterType;
            const matchesAssignee = filterAssignee === 'all' ||
                (filterAssignee === 'me' ? t.assignee === currentUser.name : t.assignee === filterAssignee) ||
                (filterAssignee === 'unassigned' && !t.assignee);
            return matchesSearch && matchesType && matchesAssignee;
        }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [tasks, searchTerm, filterType, filterAssignee, currentUser]);

    // KPIs
    const kpis = useMemo(() => {
        const now = new Date().getTime();
        let delayed = 0;
        let onTime = 0;
        let done = 0;

        filteredTasks.forEach(t => {
            if (t.status === 'Done') {
                done++;
            } else {
                const due = new Date(t.dueDate).getTime();
                if (due < now && t.status !== 'Done') {
                    delayed++;
                } else {
                    onTime++;
                }
            }
        });

        return { total: filteredTasks.length, delayed, onTime, done };
    }, [filteredTasks]);

    // Helpers
    const getClientName = (id?: string) => clients.find(c => c.id === id)?.name;
    const getContactName = (id?: string) => contacts.find(c => c.id === id)?.name;

    const getTypeIcon = (type: CRMTask['type'], size = 16) => {
        switch (type) {
            case 'Meeting': return <CalendarDays size={size} className="text-blue-500" />;
            case 'Call': return <PhoneCall size={size} className="text-emerald-500" />;
            case 'Email': return <MailCheck size={size} className="text-indigo-500" />;
            case 'Follow-up': return <ArrowRight size={size} className="text-amber-500" />;
            default: return <MessageSquare size={size} className="text-slate-500" />;
        }
    };

    const isTaskOverdue = (dueDate: string, status: string) => {
        return new Date(dueDate).getTime() < new Date().getTime() && status !== 'Done';
    };

    const getStatusBadge = (status: CRMTask['status'], dueDate: string) => {
        if (status === 'Done') {
            return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"><CheckSquare size={12} /> Concluída</span>;
        }
        if (isTaskOverdue(dueDate, status)) {
            return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center gap-1"><Clock size={12} /> Atrasada</span>;
        }
        if (status === 'In Progress') {
            return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">Em Andamento</span>;
        }
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">A Fazer</span>;
    };

    // Handlers
    const handleSaveTask = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newTask: CRMTask = {
            id: editingTask ? editingTask.id : `task-${Date.now()}`,
            clientId: formData.get('clientId') as string || undefined,
            proposalId: formData.get('proposalId') as string || undefined,
            contactId: formData.get('contactId') as string || undefined,
            assignee: formData.get('assignee') as string || currentUser.name,
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            type: formData.get('type') as CRMTask['type'],
            status: formData.get('status') as CRMTask['status'],
            dueDate: formData.get('dueDate') as string,
            createdAt: editingTask ? editingTask.createdAt : new Date().toISOString()
        };

        if (editingTask) {
            setTasks(tasks.map(t => t.id === newTask.id ? newTask : t));
        } else {
            setTasks([...tasks, newTask]);
        }
        closeModal();
    };

    const openModal = (task?: CRMTask) => {
        setEditingTask(task || null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const toggleStatus = (task: CRMTask) => {
        const newStatus = task.status === 'Done' ? 'To Do' : 'Done';
        setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    };

    const changeTaskStatus = (taskId: string, newStatus: CRMTask['status']) => {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    };

    // View Components
    const renderListView = () => (
        <div className="space-y-4">
            {filteredTasks.map(task => (
                <div key={task.id} className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border shadow-sm transition-all hover:shadow flex gap-5 ${task.status === 'Done' ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-800'}`}>
                    <button
                        onClick={() => toggleStatus(task)}
                        className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'Done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'}`}
                    >
                        {task.status === 'Done' && <CheckSquare size={16} />}
                    </button>

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                            <div>
                                <h3 className={`font-bold text-lg truncate ${task.status === 'Done' ? 'text-slate-500 line-through decoration-slate-300 dark:decoration-slate-600' : 'text-slate-800 dark:text-slate-100'}`}>
                                    {task.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                        {getTypeIcon(task.type, 14)}
                                        {task.type}
                                    </span>
                                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${isTaskOverdue(task.dueDate, task.status) ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800/50' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                                        <Calendar size={14} />
                                        {new Date(task.dueDate).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                                    </span>
                                    {task.assignee && (
                                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                            <UserCircle2 size={14} />
                                            {task.assignee}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                {getStatusBadge(task.status, task.dueDate)}
                                <button onClick={() => openModal(task)} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <MoreHorizontal size={20} />
                                </button>
                            </div>
                        </div>

                        {task.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{task.description}</p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-2">
                            {task.clientId && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                    {getClientName(task.clientId)}
                                </span>
                            )}
                            {task.contactId && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                                    <UserCircle2 size={14} className="text-slate-400" />
                                    {getContactName(task.contactId)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {filteredTasks.length === 0 && (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
                    <CheckSquare className="mx-auto h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Nenhuma tarefa encontrada</h3>
                    <p className="text-slate-500 mt-2">Crie uma nova ação ou ajuste seus filtros.</p>
                </div>
            )}
        </div>
    );

    const renderKanbanView = () => {
        const columns: { id: CRMTask['status'], title: string }[] = [
            { id: 'To Do', title: 'A Fazer / Planejado' },
            { id: 'In Progress', title: 'Em Andamento' },
            { id: 'Done', title: 'Concluído' }
        ];

        return (
            <div className="flex gap-6 overflow-x-auto pb-6 snap-x">
                {columns.map(col => {
                    const colTasks = filteredTasks.filter(t => t.status === col.id);
                    return (
                        <div key={col.id} className="min-w-[320px] w-80 flex-shrink-0 flex flex-col snap-center bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    {col.id === 'To Do' && <CalendarDays size={18} className="text-slate-500" />}
                                    {col.id === 'In Progress' && <Clock size={18} className="text-indigo-500" />}
                                    {col.id === 'Done' && <CheckCircle2 size={18} className="text-emerald-500" />}
                                    {col.title}
                                </h3>
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-2.5 py-1 rounded-full">{colTasks.length}</span>
                            </div>
                            <div className="p-4 flex-1 overflow-y-auto space-y-4">
                                {colTasks.map(task => (
                                    <div key={task.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-grab group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                {getTypeIcon(task.type, 12)}
                                                {task.type}
                                            </span>
                                            <button onClick={() => openModal(task)} className="text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </div>
                                        <h4 className={`font-bold text-sm mb-2 ${task.status === 'Done' ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{task.title}</h4>
                                        <div className="flex items-center justify-between mt-3">
                                            <div className={`flex items-center gap-1.5 text-xs font-medium ${isTaskOverdue(task.dueDate, task.status) ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                                <Calendar size={12} />
                                                {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                            </div>
                                            {task.assignee && (
                                                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold" title={task.assignee}>
                                                    {task.assignee.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {/* Status quick actions */}
                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                                            {col.id !== 'To Do' && <button onClick={() => changeTaskStatus(task.id, 'To Do')} className="flex-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 py-1 rounded">Mover p/ Fazer</button>}
                                            {col.id !== 'In Progress' && <button onClick={() => changeTaskStatus(task.id, 'In Progress')} className="flex-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 py-1 rounded">Andamento</button>}
                                            {col.id !== 'Done' && <button onClick={() => changeTaskStatus(task.id, 'Done')} className="flex-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 py-1 rounded">Concluir</button>}
                                        </div>
                                    </div>
                                ))}
                                {colTasks.length === 0 && (
                                    <div className="h-24 flex items-center justify-center text-sm text-slate-400 font-medium border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                        Nenhuma tarefa
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderCalendarView = () => {
        // Simplified calendar list view for upcoming days
        const groupedByDate: Record<string, CRMTask[]> = {};

        filteredTasks.forEach(t => {
            const dateStr = new Date(t.dueDate).toISOString().split('T')[0];
            if (!groupedByDate[dateStr]) groupedByDate[dateStr] = [];
            groupedByDate[dateStr].push(t);
        });

        const sortedDates = Object.keys(groupedByDate).sort();

        return (
            <div className="space-y-8">
                {sortedDates.map(dateStr => {
                    const date = new Date(dateStr);
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                        <div key={dateStr} className="relative">
                            <div className="sticky top-0 z-10 flex items-center gap-4 py-2 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm -mx-4 px-4">
                                <h3 className={`font-black text-lg ${isToday ? 'text-indigo-600 dark:text-indigo-400' : isPast ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                </h3>
                                {isToday && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">HOJE</span>}
                                <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
                            </div>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupedByDate[dateStr].map(task => (
                                    <div key={task.id} onClick={() => openModal(task)} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                {getTypeIcon(task.type, 14)}
                                                {task.type}
                                            </span>
                                            {getStatusBadge(task.status, task.dueDate)}
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">{task.title}</h4>
                                        {task.clientId && <p className="text-xs text-slate-500 truncate">{getClientName(task.clientId)}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {sortedDates.length === 0 && (
                    <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
                        <CalendarIcon className="mx-auto h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Agenda Vazia</h3>
                        <p className="text-slate-500 mt-2">Nenhuma tarefa agendada para este filtro.</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Primary Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <CheckSquare className="text-indigo-600 dark:text-indigo-400" size={28} />
                        Gestão de Tarefas
                    </h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Planeje, execute e acompanhe o fluxo de interações comerciais.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95 whitespace-nowrap"
                >
                    <Plus size={18} /> Nova Tarefa
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Exibido</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{kpis.total}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                        <CheckSquare size={24} />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Atrasadas</p>
                        <p className="text-2xl font-black text-red-600 dark:text-red-400">{kpis.delayed}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                        <AlertCircle size={24} />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Em Dia / Prazo</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{kpis.onTime}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Clock size={24} />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Concluídas</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpis.done}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={24} />
                    </div>
                </div>
            </div>

            {/* Filters & View Controls */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex-1 w-full flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por título ou descrição..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="all">Tipos (Todos)</option>
                            <option value="Meeting">Reuniões</option>
                            <option value="Call">Ligações</option>
                            <option value="Email">E-mails</option>
                            <option value="Follow-up">Follow-ups</option>
                            <option value="Other">Outros</option>
                        </select>
                        <select
                            value={filterAssignee}
                            onChange={e => setFilterAssignee(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="all">Responsável (Todos)</option>
                            <option value="me">Minhas (Eu)</option>
                            <option value="unassigned">Sem Responsável</option>
                            {/* In a real app, populate from actual users list */}
                            <option disabled>--- Equipe ---</option>
                            <option value="Admin User">Admin User</option>
                            <option value="Consultor Vendas">Consultor Vendas</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        title="Lista"
                    >
                        <LayoutList size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('kanban')}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'kanban' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        title="Kanban"
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'calendar' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        title="Calendário"
                    >
                        <CalendarIcon size={18} />
                    </button>
                </div>
            </div>

            {/* Main Content Area based on View Mode */}
            <div className="mt-6">
                {viewMode === 'list' && renderListView()}
                {viewMode === 'kanban' && renderKanbanView()}
                {viewMode === 'calendar' && renderCalendarView()}
            </div>

            {/* Modal de Tarefa */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                                <span className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                                    <CheckSquare size={20} />
                                </span>
                                {editingTask ? 'Editar Detalhes da Tarefa' : 'Programar Nova Tarefa'}
                            </h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSaveTask} className="p-6 space-y-5 text-left bg-white dark:bg-slate-900">

                            <div>
                                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">O que precisa ser feito?</label>
                                <input type="text" name="title" required defaultValue={editingTask?.title} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 font-bold text-lg text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-medium" placeholder="Ex: Apresentar proposta comercial..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                                        Tipo de Ação
                                    </label>
                                    <div className="relative">
                                        <select name="type" required defaultValue={editingTask?.type || 'Meeting'} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none transition-all">
                                            <option value="Meeting">Reunião (Presencial / Online)</option>
                                            <option value="Call">Ligação / Fone</option>
                                            <option value="Email">Envio de E-mail</option>
                                            <option value="Follow-up">Acompanhamento / Follow-up</option>
                                            <option value="Other">Outro</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                                        <CalendarDays size={12} /> Prazo Limite
                                    </label>
                                    <input type="date" name="dueDate" required defaultValue={editingTask?.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Responsável</label>
                                <div className="relative">
                                    <select name="assignee" defaultValue={editingTask?.assignee || currentUser.name} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none transition-all">
                                        <option value={currentUser.name}>{currentUser.name} (Eu)</option>
                                        <option value="Consultor Vendas">Consultor Vendas</option>
                                        <option value="Admin User">Admin User</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                                        <UserCircle2 size={16} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                                    <FileText size={12} /> Anotações / Descrição Interna
                                </label>
                                <textarea name="description" rows={3} defaultValue={editingTask?.description} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 resize-none transition-all placeholder:text-slate-400/70" placeholder="Pauta da reunião, links importantes, detalhes sobre a ligação..." />
                            </div>

                            <div className="bg-slate-50/80 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="flex-1 border-t border-slate-200 dark:border-slate-700"></span>
                                    Contexto e Vínculos
                                    <span className="flex-1 border-t border-slate-200 dark:border-slate-700"></span>
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Empresa / Conta</label>
                                        <select name="clientId" defaultValue={editingTask?.clientId} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                                            <option value="">(Sem vínculo)</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Ponto de Contato</label>
                                        <select name="contactId" defaultValue={editingTask?.contactId} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                                            <option value="">(Sem vínculo)</option>
                                            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <input type="hidden" name="status" value={editingTask?.status || 'To Do'} />

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                {/* Delete button could go here if in edit mode */}
                                {editingTask ? (
                                    <button type="button" onClick={() => {
                                        if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
                                            setTasks(tasks.filter(t => t.id !== editingTask.id));
                                            closeModal();
                                        }
                                    }} className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                        Excluir
                                    </button>
                                ) : <div></div>}

                                <div className="flex gap-3">
                                    <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200/50 dark:shadow-none transition-transform active:scale-95 flex items-center gap-2">
                                        <CheckSquare size={18} />
                                        {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tasks;
