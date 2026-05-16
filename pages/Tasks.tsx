import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CRMCommunication, CRMExternalEvent, CRMTask, Client, Contact, ProposalData, TaskAttachment, GoogleConnectionStatus, GoogleEmailDraft, MicrosoftConnectionStatus, MicrosoftEmailDraft } from '../types';
import { Plus, Search, Calendar, CheckSquare, Clock, ArrowRight, MessageSquare, PhoneCall, MailCheck, CalendarDays, MoreHorizontal, FileText, UserCircle2, Filter, LayoutList, LayoutGrid, AlertCircle, Calendar as CalendarIcon, CheckCircle2, Paperclip, UploadCloud, File as FileIcon, X, ExternalLink, Trash2, Loader2, Send } from 'lucide-react';
import { CommunicationThread, buildGmailReplyHeaders, getCommunicationDate, getThreadReplySourceMessage, groupCommunicationThreads } from '../utils/crmTraceability';
import { Button, PageHeader, PageShell, ResponsiveDrawer } from '../components/ui';
import { useTenant } from '../contexts/TenantContext';
import { createTenantTheme } from '../utils/theme';

interface TasksProps {
    tasks: CRMTask[];
    taskAttachments: TaskAttachment[];
    communications?: CRMCommunication[];
    externalEvents?: CRMExternalEvent[];
    onSaveTask: (task: CRMTask) => CRMTask | Promise<CRMTask>;
    onDeleteTask: (id: string) => void | Promise<void>;
    onUploadTaskAttachment: (task: CRMTask, file: File) => TaskAttachment | Promise<TaskAttachment>;
    onDeleteTaskAttachment: (attachment: TaskAttachment) => void | Promise<void>;
    onOpenTaskAttachment: (attachment: TaskAttachment) => void | Promise<void>;
    googleConnection?: GoogleConnectionStatus;
    microsoftConnection?: MicrosoftConnectionStatus;
    onSendGoogleEmail?: (draft: GoogleEmailDraft) => Promise<unknown>;
    onSendMicrosoftEmail?: (draft: MicrosoftEmailDraft) => Promise<unknown>;
    clients: Client[];
    contacts: Contact[];
    proposals: ProposalData[];
    currentUser: { name: string; role: string };
    users?: { name: string; role: string }[]; // Optional prop for the list of available users
}

type ViewMode = 'list' | 'kanban' | 'calendar';

type QueuedAttachment = {
    id: string;
    file: File;
    status: 'pending' | 'uploading' | 'done' | 'error';
    error?: string;
};

const MAX_ATTACHMENTS_PER_TASK = 10;
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/webp'
];
const ATTACHMENT_TYPE_BY_EXTENSION: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp'
};
const ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp,application/pdf';
const CLIPBOARD_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const Tasks: React.FC<TasksProps> = ({ tasks, taskAttachments, communications = [], externalEvents = [], onSaveTask, onDeleteTask, onUploadTaskAttachment, onDeleteTaskAttachment, onOpenTaskAttachment, googleConnection, microsoftConnection, onSendGoogleEmail, onSendMicrosoftEmail, clients, contacts, proposals, currentUser, users = [] }) => {
    const { activeTenant } = useTenant();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<CRMTask | null>(null);
    const [historyTask, setHistoryTask] = useState<CRMTask | null>(null);
    const [taskPanelMode, setTaskPanelMode] = useState<'details' | 'history'>('details');
    const [taskDraftDefaults, setTaskDraftDefaults] = useState<Partial<CRMTask> | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [queuedAttachments, setQueuedAttachments] = useState<QueuedAttachment[]>([]);
    const [attachmentError, setAttachmentError] = useState<string | null>(null);
    const [isSavingTask, setIsSavingTask] = useState(false);
    const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
    const [emailComposerTaskId, setEmailComposerTaskId] = useState<string | null>(null);
    const [emailProvider, setEmailProvider] = useState<'google' | 'microsoft'>('microsoft');
    const [emailThread, setEmailThread] = useState<CommunicationThread | null>(null);
    const [emailTo, setEmailTo] = useState('');
    const [emailCc, setEmailCc] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [emailSending, setEmailSending] = useState(false);

    // Filters
    const [filterType, setFilterType] = useState<string>('all');
    const [filterAssignee, setFilterAssignee] = useState<string>('all');
    const [quickFilter, setQuickFilter] = useState<'all' | 'today' | 'overdue' | 'mine' | 'done'>('all');
    const taskDrawerTheme = useMemo(() => createTenantTheme(activeTenant?.branding), [activeTenant?.branding]);

    // Filtered and Sorted Tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || t.type === filterType;
            const matchesAssignee = filterAssignee === 'all' ||
                (filterAssignee === 'me' ? t.assignee === currentUser.name : t.assignee === filterAssignee) ||
                (filterAssignee === 'unassigned' && !t.assignee);
            const today = new Date().toISOString().split('T')[0];
            const dueDate = new Date(t.dueDate).toISOString().split('T')[0];
            const isOverdue = t.status !== 'Done' && new Date(`${t.dueDate}T23:59:59`).getTime() < Date.now();
            const matchesQuickFilter =
                quickFilter === 'all' ||
                (quickFilter === 'today' && dueDate === today && t.status !== 'Done') ||
                (quickFilter === 'overdue' && isOverdue) ||
                (quickFilter === 'mine' && t.assignee === currentUser.name && t.status !== 'Done') ||
                (quickFilter === 'done' && t.status === 'Done');
            return matchesSearch && matchesType && matchesAssignee && matchesQuickFilter;
        }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [tasks, searchTerm, filterType, filterAssignee, quickFilter, currentUser]);

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
    const getClient = (id?: string) => clients.find(c => c.id === id);
    const getContact = (id?: string) => contacts.find(c => c.id === id);
    const getProposalLabel = (id?: string) => {
        const proposal = proposals.find(p => p.id === id);
        return proposal ? `#${proposal.proposalId} - ${proposal.clientName}` : undefined;
    };
    const getTaskAttachments = (taskId?: string) => taskId ? taskAttachments.filter(attachment => attachment.taskId === taskId) : [];
    const editingTaskAttachments = getTaskAttachments(editingTask?.id);
    const formatFileSize = (bytes: number) => {
        if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    };
    const getAttachmentCount = (task: CRMTask) => getTaskAttachments(task.id).length;
    const getTaskCommunications = (task: CRMTask) => communications
        .filter(communication => communication.taskId === task.id || (!!task.proposalId && communication.proposalId === task.proposalId))
        .sort((a, b) => new Date(getCommunicationDate(b)).getTime() - new Date(getCommunicationDate(a)).getTime());
    const getDirectTaskCommunicationCount = (task: CRMTask) => communications.filter(communication => communication.taskId === task.id).length;
    const getLastInboundCommunication = (task: CRMTask) => getTaskCommunications(task).find(communication => communication.direction === 'inbound');
    const getTaskEvents = (task: CRMTask) => externalEvents
        .filter(event => event.taskId === task.id || (!!task.proposalId && event.proposalId === task.proposalId))
        .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    const isProviderConnected = (provider: 'google' | 'microsoft') =>
        provider === 'google' ? Boolean(googleConnection?.connected && onSendGoogleEmail) : Boolean(microsoftConnection?.connected && onSendMicrosoftEmail);
    const getDefaultProvider = (thread?: CommunicationThread | null): 'google' | 'microsoft' => {
        if (thread?.provider === 'google' && isProviderConnected('google')) return 'google';
        if (thread?.provider === 'microsoft' && isProviderConnected('microsoft')) return 'microsoft';
        if (isProviderConnected('microsoft')) return 'microsoft';
        return 'google';
    };
    const getReplyRecipient = (task: CRMTask, thread?: CommunicationThread | null) => {
        const lastInbound = thread?.messages.slice().reverse().find(message => message.direction === 'inbound' && message.fromEmail);
        return lastInbound?.fromEmail || getContact(task.contactId)?.email || getClient(task.clientId)?.email || '';
    };

    const validateFile = (file: File, currentCount: number) => {
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        const inferredType = ALLOWED_ATTACHMENT_TYPES.includes(file.type) || Boolean(ATTACHMENT_TYPE_BY_EXTENSION[extension]);
        if (currentCount >= MAX_ATTACHMENTS_PER_TASK) return 'Limite de 10 anexos por tarefa.';
        if (file.size > MAX_ATTACHMENT_SIZE) return 'Arquivo acima do limite de 20 MB.';
        if (!inferredType) return 'Tipo de arquivo nao permitido.';
        return null;
    };

    const getClipboardImageName = (type: string, index: number) => {
        const now = new Date();
        const stamp = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
            '-',
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0'),
            String(now.getSeconds()).padStart(2, '0')
        ].join('');
        const extension = type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png';
        return `print-${stamp}${index > 0 ? `-${index + 1}` : ''}.${extension}`;
    };

    const handleAttachmentFileArray = (files: File[]) => {
        if (files.length === 0) return;
        setAttachmentError(null);

        const existingCount = editingTaskAttachments.length + queuedAttachments.length;
        const nextQueued: QueuedAttachment[] = [];
        let firstError: string | null = null;

        files.forEach(file => {
            const validationError = validateFile(file, existingCount + nextQueued.length);
            if (validationError) {
                firstError = `${file.name}: ${validationError}`;
                return;
            }
            nextQueued.push({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                file,
                status: 'pending'
            });
        });

        if (firstError) setAttachmentError(firstError);
        if (nextQueued.length > 0) setQueuedAttachments(prev => [...prev, ...nextQueued]);
    };

    const handleAttachmentFiles = (files?: FileList | null) => {
        if (!files || files.length === 0) return;
        handleAttachmentFileArray(Array.from(files));
    };

    const handleAttachmentPaste = (event: React.ClipboardEvent) => {
        const clipboardItems = Array.from(event.clipboardData?.items || []);
        const imageFiles = clipboardItems
            .filter(item => item.kind === 'file' && CLIPBOARD_IMAGE_TYPES.has(item.type))
            .map((item, index) => {
                const file = item.getAsFile();
                if (!file) return null;
                return new File([file], getClipboardImageName(file.type, index), {
                    type: file.type,
                    lastModified: Date.now()
                });
            })
            .filter((file): file is File => Boolean(file));

        if (imageFiles.length === 0) return;
        event.preventDefault();
        handleAttachmentFileArray(imageFiles);
    };

    const removeQueuedAttachment = (id: string) => {
        setQueuedAttachments(prev => prev.filter(item => item.id !== id));
    };

    const uploadQueuedAttachments = async (task: CRMTask) => {
        let hasUploadError = false;
        for (const queued of queuedAttachments) {
            if (queued.status === 'done') continue;
            setQueuedAttachments(prev => prev.map(item => item.id === queued.id ? { ...item, status: 'uploading', error: undefined } : item));
            try {
                await onUploadTaskAttachment(task, queued.file);
                setQueuedAttachments(prev => prev.filter(item => item.id !== queued.id));
            } catch (error: any) {
                hasUploadError = true;
                setQueuedAttachments(prev => prev.map(item => item.id === queued.id ? { ...item, status: 'error', error: error?.message || 'Erro ao enviar arquivo.' } : item));
            }
        }
        return !hasUploadError;
    };

    const getTypeIcon = (type: CRMTask['type'], size = 16) => {
        switch (type) {
            case 'Meeting': return <CalendarDays size={size} className="text-[var(--tenant-secondary)]" />;
            case 'Call': return <PhoneCall size={size} className="text-emerald-500" />;
            case 'Email': return <MailCheck size={size} className="text-[var(--tenant-primary)]" />;
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
            return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] border border-[var(--tenant-primary-border)] flex items-center gap-1">Em Andamento</span>;
        }
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] text-slate-700 dark:text-slate-400 border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] flex items-center gap-1">A Fazer</span>;
    };

    // Handlers
    const handleSaveTask = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSavingTask) return;
        setIsSavingTask(true);
        setAttachmentError(null);
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

        try {
            const savedTask = await onSaveTask(newTask);
            const uploadsSucceeded = queuedAttachments.length === 0 || await uploadQueuedAttachments(savedTask);
            if (uploadsSucceeded) {
                closeModal();
            } else {
                setEditingTask(savedTask);
                setAttachmentError('A tarefa foi salva, mas um ou mais anexos falharam.');
            }
        } finally {
            setIsSavingTask(false);
        }
    };

    const openModal = (task?: CRMTask, defaults?: Partial<CRMTask>) => {
        setEditingTask(task || null);
        setTaskDraftDefaults(defaults || null);
        setQueuedAttachments([]);
        setAttachmentError(null);
        setDeletingAttachmentId(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
        setTaskDraftDefaults(null);
        setQueuedAttachments([]);
        setAttachmentError(null);
        setDeletingAttachmentId(null);
    };

    const openTaskPanel = (task: CRMTask, mode: 'details' | 'history' = 'details') => {
        setHistoryTask(task);
        setTaskPanelMode(mode);
        if (mode === 'details') {
            setEmailComposerTaskId(null);
            setEmailThread(null);
            setEmailError(null);
        }
    };

    const openHistoryPanel = (task: CRMTask) => {
        openTaskPanel(task, 'history');
    };

    const closeHistoryPanel = () => {
        setHistoryTask(null);
        setTaskPanelMode('details');
        setEmailComposerTaskId(null);
        setEmailThread(null);
        setEmailError(null);
    };

    const openHistoryEmailComposer = (task: CRMTask, thread?: CommunicationThread | null) => {
        const provider = getDefaultProvider(thread);
        setTaskPanelMode('history');
        setEmailProvider(provider);
        setEmailThread(thread || null);
        setEmailComposerTaskId(task.id);
        setEmailTo(getReplyRecipient(task, thread));
        setEmailCc('');
        setEmailSubject(thread?.subject?.toLowerCase().startsWith('re:') ? thread.subject : `Re: ${thread?.subject || task.title}`);
        setEmailBody('');
        setEmailError(null);
    };

    const openFollowUpTaskFromHistory = (task: CRMTask) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const defaults = {
            clientId: task.clientId,
            contactId: task.contactId,
            proposalId: task.proposalId,
            assignee: currentUser.name,
            title: `Acompanhar retorno: ${task.title}`,
            description: `Follow-up criado a partir do historico de mensagens.\n\nOrigem: ${task.title}`,
            type: 'Follow-up',
            status: 'To Do',
            dueDate: tomorrow.toISOString()
        } satisfies Partial<CRMTask>;
        setHistoryTask(null);
        setEmailComposerTaskId(null);
        openModal(undefined, defaults);
    };

    const submitHistoryEmail = async () => {
        if (!historyTask) return;
        if (!isProviderConnected(emailProvider)) {
            setEmailError(`Conecte sua conta ${emailProvider === 'google' ? 'Gmail' : 'Outlook'} antes de enviar.`);
            return;
        }
        if (!emailTo.trim() || !emailSubject.trim() || !emailBody.trim()) {
            setEmailError('Preencha destinatario, assunto e mensagem.');
            return;
        }

        const baseDraft = {
            tenantId: '',
            clientId: historyTask.clientId,
            contactId: historyTask.contactId,
            proposalId: historyTask.proposalId,
            to: emailTo.split(',').map(item => item.trim()).filter(Boolean),
            cc: emailCc.split(',').map(item => item.trim()).filter(Boolean),
            subject: emailSubject.trim(),
            bodyText: emailBody
        };

        setEmailSending(true);
        setEmailError(null);
        try {
            if (emailProvider === 'google') {
                const replySource = getThreadReplySourceMessage(emailThread);
                const replyHeaders = buildGmailReplyHeaders(replySource);
                await onSendGoogleEmail?.({
                    ...baseDraft,
                    gmailThreadId: emailThread?.lastMessage.gmailThreadId,
                    ...replyHeaders
                });
            } else {
                await onSendMicrosoftEmail?.({
                    ...baseDraft,
                    microsoftConversationId: emailThread?.lastMessage.microsoftConversationId,
                    createMicrosoftTodo: false
                });
            }
            setEmailComposerTaskId(null);
            setEmailThread(null);
            setEmailBody('');
        } catch (error: any) {
            setEmailError(error?.message || 'Nao foi possivel enviar o e-mail.');
        } finally {
            setEmailSending(false);
        }
    };

    const toggleStatus = async (task: CRMTask) => {
        const newStatus = task.status === 'Done' ? 'To Do' : 'Done';
        await onSaveTask({ ...task, status: newStatus });
    };

    const changeTaskStatus = async (taskId: string, newStatus: CRMTask['status']) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) await onSaveTask({ ...task, status: newStatus });
    };

    // View Components
    const renderListView = () => (
        <div className="space-y-2">
            {filteredTasks.map(task => {
                const taskCommunications = getTaskCommunications(task);
                const lastInbound = getLastInboundCommunication(task);
                const attachmentCount = getAttachmentCount(task);
                const clientName = getClientName(task.clientId);
                const contactName = getContactName(task.contactId);

                return (
                    <div
                        key={task.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openTaskPanel(task, 'details')}
                        onKeyDown={(event) => {
                            const target = event.target as HTMLElement;
                            if (target.closest('button,a,input,select,textarea')) return;
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                openTaskPanel(task, 'details');
                            }
                        }}
                        className={`group flex cursor-pointer gap-2.5 rounded-md border px-2.5 py-2 shadow-sm transition hover:border-[var(--tenant-primary-border)] hover:bg-[var(--tenant-primary-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:hover:bg-[var(--tenant-control-dark)] sm:gap-3 sm:px-3 sm:py-3 ${task.status === 'Done' ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/10' : 'border-[var(--tenant-border)] bg-[var(--tenant-panel)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]'}`}
                    >
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                toggleStatus(task);
                            }}
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-2 transition-colors sm:mt-0.5 sm:h-8 sm:w-8 ${task.status === 'Done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-[var(--tenant-border)] hover:border-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)]'}`}
                            title={task.status === 'Done' ? 'Reabrir tarefa' : 'Concluir tarefa'}
                            aria-label={task.status === 'Done' ? 'Reabrir tarefa' : 'Concluir tarefa'}
                        >
                            {task.status === 'Done' && <CheckSquare size={15} />}
                        </button>

                        <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <h3 className={`truncate text-sm font-black leading-5 sm:text-[15px] ${task.status === 'Done' ? 'text-slate-500 line-through decoration-slate-300 dark:decoration-slate-600' : 'text-slate-800 dark:text-slate-100'}`}>
                                        {task.title}
                                    </h3>
                                    <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                        {clientName && (
                                            <span className="inline-flex max-w-[58vw] truncate rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-2 py-1 text-[11px] font-black text-[var(--tenant-primary)] dark:text-[var(--tenant-primary-on-dark)] sm:max-w-[220px]">
                                                {clientName}
                                            </span>
                                        )}
                                        <span className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 ${isTaskOverdue(task.dueDate, task.status) ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-300' : 'border-[var(--tenant-border)] bg-[var(--tenant-control)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]'}`}>
                                            <Calendar size={13} />
                                            {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                        </span>
                                        {getStatusBadge(task.status, task.dueDate)}
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-1">
                                    {taskCommunications.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                openTaskPanel(task, 'history');
                                            }}
                                            className="relative flex h-10 w-10 items-center justify-center rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] transition hover:brightness-95 dark:text-[var(--tenant-primary-on-dark)]"
                                            title="Abrir historico"
                                            aria-label="Abrir historico"
                                        >
                                            <MailCheck size={15} />
                                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--tenant-panel)] px-1 text-[9px] font-black text-slate-600 shadow-sm dark:bg-[var(--tenant-control-dark)] dark:text-slate-200">{taskCommunications.length}</span>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            openModal(task);
                                        }}
                                        className="flex h-10 w-10 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-[var(--tenant-control)] hover:text-[var(--tenant-primary)] dark:hover:bg-[var(--tenant-control-dark)] dark:hover:text-[var(--tenant-primary-on-dark)]"
                                        title="Editar tarefa"
                                        aria-label="Editar tarefa"
                                    >
                                        <MoreHorizontal size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-2 hidden flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 sm:flex">
                                <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                    {getTypeIcon(task.type, 13)}
                                    {task.type}
                                </span>
                                {task.assignee && (
                                    <span className="inline-flex h-7 max-w-[190px] items-center gap-1.5 truncate rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300">
                                        <UserCircle2 size={13} />
                                        {task.assignee}
                                    </span>
                                )}
                                {attachmentCount > 0 && (
                                    <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300">
                                        <Paperclip size={13} />
                                        {attachmentCount}
                                    </span>
                                )}
                                {lastInbound && (
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            openTaskPanel(task, 'history');
                                        }}
                                        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                                        title="Abrir resposta recebida"
                                    >
                                        <MessageSquare size={13} />
                                        Resposta
                                    </button>
                                )}
                            </div>

                            {task.description && (
                                <p className="mt-2 hidden line-clamp-1 text-xs leading-5 text-slate-600 dark:text-slate-400 sm:block">{task.description}</p>
                            )}

                            <div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
                                {contactName && (
                                    <span className="inline-flex max-w-[220px] items-center gap-1.5 truncate rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-2 py-1 text-[11px] font-bold text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300">
                                        <UserCircle2 size={12} className="text-slate-400" />
                                        {contactName}
                                    </span>
                                )}
                                {task.proposalId && (
                                    <span className="inline-flex max-w-[260px] truncate rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-2 py-1 text-[11px] font-bold text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">
                                        {getProposalLabel(task.proposalId)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {filteredTasks.length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-[var(--tenant-border)] bg-[var(--tenant-control)] px-4 py-10 text-center dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] sm:py-16">
                    <CheckSquare className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600 sm:h-16 sm:w-16" />
                    <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 sm:text-xl">Nenhuma tarefa encontrada</h3>
                    <p className="mt-2 hidden text-slate-500 sm:block">Crie uma nova acao ou ajuste seus filtros.</p>
                </div>
            )}
        </div>
    );

    const renderLegacyListView = () => (
        <div className="space-y-4">
            {filteredTasks.map(task => (
                <div key={task.id} className={`bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] rounded-lg p-5 border shadow-sm transition-all hover:shadow flex gap-5 ${task.status === 'Done' ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]'}`}>
                    <button
                        onClick={() => toggleStatus(task)}
                        className={`mt-1 flex-shrink-0 w-8 h-8 rounded-md border-2 flex items-center justify-center transition-colors ${task.status === 'Done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] hover:border-[var(--tenant-primary)]'}`}
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
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]">
                                        {getTypeIcon(task.type, 14)}
                                        {task.type}
                                    </span>
                                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${isTaskOverdue(task.dueDate, task.status) ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800/50' : 'bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]'}`}>
                                        <Calendar size={14} />
                                        {new Date(task.dueDate).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                                    </span>
                                    {task.assignee && (
                                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                            <UserCircle2 size={14} />
                                            {task.assignee}
                                        </span>
                                    )}
                                    {getAttachmentCount(task) > 0 && (
                                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                            <Paperclip size={14} />
                                            {getAttachmentCount(task)}
                                        </span>
                                    )}
                                    {getTaskCommunications(task).length > 0 && (
                                        <button type="button" onClick={() => openHistoryPanel(task)} className="flex items-center gap-1.5 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-2.5 py-1 text-slate-600 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300">
                                            <MailCheck size={14} />
                                            {getTaskCommunications(task).length} mensagens
                                        </button>
                                    )}
                                    {getLastInboundCommunication(task) && (
                                        <button type="button" onClick={() => openHistoryPanel(task)} className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                                            <MessageSquare size={14} />
                                            resposta recebida
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                {getTaskCommunications(task).length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => openHistoryPanel(task)}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-3 py-2 text-xs font-black text-[var(--tenant-primary)] transition hover:-translate-y-0.5 hover:shadow-sm"
                                        title="Abrir histórico de mensagens"
                                    >
                                        <MailCheck size={14} />
                                        Histórico
                                    </button>
                                )}
                                {getStatusBadge(task.status, task.dueDate)}
                                <button onClick={() => openModal(task)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-[var(--tenant-control)] hover:text-[var(--tenant-primary)] dark:hover:bg-[var(--tenant-control-dark)]">
                                    <MoreHorizontal size={20} />
                                </button>
                            </div>
                        </div>

                        {task.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{task.description}</p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-2">
                            {task.clientId && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--tenant-primary-soft)] border border-[var(--tenant-primary-border)] text-xs font-bold text-[var(--tenant-primary)]">
                                    {getClientName(task.clientId)}
                                </span>
                            )}
                            {task.contactId && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] text-xs font-bold text-slate-600 dark:text-slate-300">
                                    <UserCircle2 size={14} className="text-slate-400" />
                                    {getContactName(task.contactId)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {filteredTasks.length === 0 && (
                <div className="py-16 text-center border-2 border-dashed border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)]">
                    <CheckSquare className="mx-auto h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Nenhuma tarefa encontrada</h3>
                    <p className="text-slate-500 mt-2">Crie uma nova a??o ou ajuste seus filtros.</p>
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
                        <div key={col.id} className="min-w-[320px] w-80 flex-shrink-0 flex flex-col snap-center bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] overflow-hidden">
                            <div className="p-4 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    {col.id === 'To Do' && <CalendarDays size={18} className="text-slate-500" />}
                                    {col.id === 'In Progress' && <Clock size={18} className="text-[var(--tenant-primary)]" />}
                                    {col.id === 'Done' && <CheckCircle2 size={18} className="text-emerald-500" />}
                                    {col.title}
                                </h3>
                                <span className="bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] text-slate-600 dark:text-slate-400 text-xs font-bold px-2.5 py-1 rounded-full">{colTasks.length}</span>
                            </div>
                            <div className="p-4 flex-1 overflow-y-auto space-y-4">
                                {colTasks.map(task => (
                                    <div key={task.id} className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-4 rounded-md shadow-sm border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] hover:shadow-md transition-shadow cursor-grab group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                {getTypeIcon(task.type, 12)}
                                                {task.type}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {getTaskCommunications(task).length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openHistoryPanel(task)}
                                                        className="rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-2 py-1 text-[10px] font-black uppercase text-[var(--tenant-primary)] transition hover:brightness-95"
                                                        title="Abrir histórico de mensagens"
                                                    >
                                                        Histórico
                                                    </button>
                                                )}
                                                <button onClick={() => openModal(task)} className="text-slate-300 hover:text-[var(--tenant-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <h4 className={`font-bold text-sm mb-2 ${task.status === 'Done' ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{task.title}</h4>
                                        <div className="flex items-center justify-between mt-3">
                                            <div className={`flex items-center gap-1.5 text-xs font-medium ${isTaskOverdue(task.dueDate, task.status) ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                                <Calendar size={12} />
                                                {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getAttachmentCount(task) > 0 && (
                                                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400" title="Anexos">
                                                        <Paperclip size={12} />
                                                        {getAttachmentCount(task)}
                                                    </span>
                                                )}
                                                {getDirectTaskCommunicationCount(task) > 0 && (
                                                    <button type="button" onClick={() => openHistoryPanel(task)} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 transition hover:text-[var(--tenant-primary)] dark:text-slate-400" title="Conversas">
                                                        <MailCheck size={12} />
                                                        {getDirectTaskCommunicationCount(task)}
                                                    </button>
                                                )}
                                                {task.assignee && (
                                                    <div className="w-6 h-6 rounded-md bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] flex items-center justify-center text-[10px] font-bold" title={task.assignee}>
                                                        {task.assignee.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {/* Status quick actions */}
                                        <div className="mt-3 pt-3 border-t border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] flex gap-2">
                                            {col.id !== 'To Do' && <button onClick={() => changeTaskStatus(task.id, 'To Do')} className="flex-1 text-[10px] font-bold text-slate-500 hover:bg-[var(--tenant-control)] py-1 rounded">Mover p/ Fazer</button>}
                                            {col.id !== 'In Progress' && <button onClick={() => changeTaskStatus(task.id, 'In Progress')} className="flex-1 text-[10px] font-bold text-[var(--tenant-primary)] hover:bg-[var(--tenant-primary-soft)] py-1 rounded">Andamento</button>}
                                            {col.id !== 'Done' && <button onClick={() => changeTaskStatus(task.id, 'Done')} className="flex-1 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 py-1 rounded">Concluir</button>}
                                        </div>
                                    </div>
                                ))}
                                {colTasks.length === 0 && (
                                    <div className="h-24 flex items-center justify-center text-sm text-slate-400 font-medium border-2 border-dashed border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-md">
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
                            <div className="sticky top-0 z-10 flex items-center gap-4 py-2 bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)] backdrop-blur-sm -mx-4 px-4">
                                <h3 className={`font-black text-lg ${isToday ? 'text-[var(--tenant-primary)] ' : isPast ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                </h3>
                                {isToday && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)]">HOJE</span>}
                                <div className="flex-1 border-t border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]"></div>
                            </div>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupedByDate[dateStr].map(task => (
                                    <div key={task.id} onClick={() => openModal(task)} className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] p-4 rounded-md border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-sm cursor-pointer hover:shadow-md hover:border-[var(--tenant-primary-border)] transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                {getTypeIcon(task.type, 14)}
                                                {task.type}
                                            </span>
                                            {getStatusBadge(task.status, task.dueDate)}
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">{task.title}</h4>
                                        <div className="flex items-center justify-between gap-3">
                                            {task.clientId && <p className="text-xs text-slate-500 truncate">{getClientName(task.clientId)}</p>}
                                            {getAttachmentCount(task) > 0 && (
                                                <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    <Paperclip size={12} />
                                                    {getAttachmentCount(task)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {sortedDates.length === 0 && (
                    <div className="py-16 text-center border-2 border-dashed border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)]">
                        <CalendarIcon className="mx-auto h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Agenda Vazia</h3>
                        <p className="text-slate-500 mt-2">Nenhuma tarefa agendada para este filtro.</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <PageShell>
            {/* Header & Primary Actions */}
            <PageHeader
                icon={CheckSquare}
                title="Gestão de Tarefas"
                subtitle="Planeje, execute e acompanhe o fluxo de interações comerciais."
                actions={
                    <Button type="button" onClick={() => openModal()} icon={Plus} className="min-h-11 w-full sm:w-auto">
                        <span className="sm:hidden">Nova</span>
                        <span className="hidden sm:inline">Nova Tarefa</span>
                    </Button>
                }
            />

            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                {[
                    { id: 'all' as const, label: 'Todas' },
                    { id: 'today' as const, label: 'Hoje' },
                    { id: 'overdue' as const, label: 'Atrasadas' },
                    { id: 'mine' as const, label: 'Minhas' },
                    { id: 'done' as const, label: 'Concluídas' }
                ].map(item => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setQuickFilter(item.id)}
                        className={`min-h-10 shrink-0 rounded-md border px-3 text-xs font-black transition ${quickFilter === item.id ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] dark:text-[var(--tenant-primary-on-dark)]' : 'border-[var(--tenant-border)] bg-[var(--tenant-panel)] text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-400'}`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-2 md:gap-4">
                <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-3 rounded-md border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-sm flex items-center justify-between sm:p-5 sm:rounded-lg">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 sm:text-xs">Total</p>
                        <p className="text-xl font-black text-slate-800 dark:text-slate-100 sm:text-2xl">{kpis.total}</p>
                    </div>
                    <div className="hidden w-12 h-12 rounded-md bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] sm:flex items-center justify-center text-slate-600 dark:text-slate-400">
                        <CheckSquare size={24} />
                    </div>
                </div>
                <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-3 rounded-md border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-sm flex items-center justify-between sm:p-5 sm:rounded-lg">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 sm:text-xs">Atraso</p>
                        <p className="text-xl font-black text-red-600 dark:text-red-400 sm:text-2xl">{kpis.delayed}</p>
                    </div>
                    <div className="hidden w-12 h-12 rounded-md bg-red-100 dark:bg-red-900/20 sm:flex items-center justify-center text-red-600 dark:text-red-400">
                        <AlertCircle size={24} />
                    </div>
                </div>
                <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-3 rounded-md border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-sm flex items-center justify-between sm:p-5 sm:rounded-lg">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 sm:text-xs">Prazo</p>
                        <p className="text-xl font-black text-[var(--tenant-primary)] sm:text-2xl">{kpis.onTime}</p>
                    </div>
                    <div className="hidden w-12 h-12 rounded-md bg-[var(--tenant-primary-soft)] sm:flex items-center justify-center text-[var(--tenant-primary)]">
                        <Clock size={24} />
                    </div>
                </div>
                <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-3 rounded-md border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-sm flex items-center justify-between sm:p-5 sm:rounded-lg">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 sm:text-xs">Feitas</p>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 sm:text-2xl">{kpis.done}</p>
                    </div>
                    <div className="hidden w-12 h-12 rounded-md bg-emerald-100 dark:bg-emerald-900/20 sm:flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={24} />
                    </div>
                </div>
            </div>

            {/* Filters & View Controls */}
            <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] p-3 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] sm:gap-4 sm:p-4">
                <div className="flex-1 w-full flex flex-col md:flex-row gap-3 sm:gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar tarefa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                        />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-md text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] outline-none sm:w-auto"
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
                            className="w-full px-3 py-2 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-md text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] outline-none sm:w-auto"
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

                <div className="flex items-center gap-1 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-1 rounded-md border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shrink-0">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)]' : 'text-slate-500 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)]'}`}
                        title="Lista"
                    >
                        <LayoutList size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('kanban')}
                        className={`p-2 rounded-md flex items-center justify-center transition-colors ${viewMode === 'kanban' ? 'bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)]' : 'text-slate-500 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)]'}`}
                        title="Kanban"
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`p-2 rounded-md flex items-center justify-center transition-colors ${viewMode === 'calendar' ? 'bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)]' : 'text-slate-500 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)]'}`}
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

            {historyTask && createPortal((() => {
                const taskCommunications = getTaskCommunications(historyTask);
                const taskEvents = getTaskEvents(historyTask);
                const threads = groupCommunicationThreads(taskCommunications);
                const panelAttachments = getTaskAttachments(historyTask.id);
                const panelClient = getClient(historyTask.clientId);
                const panelContact = getContact(historyTask.contactId);
                return (
                    <ResponsiveDrawer
                        open={Boolean(historyTask)}
                        onClose={closeHistoryPanel}
                        mode="overlay"
                        style={taskDrawerTheme.cssVars}
                        panelClassName="bg-[var(--tenant-panel)] text-[var(--tenant-text)] dark:bg-[var(--tenant-panel-dark)] dark:text-[var(--tenant-text-dark)]"
                    >
                            <div className="shrink-0 border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)] sm:p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary)] px-2 py-1 text-[10px] font-black uppercase text-white">
                                            {taskPanelMode === 'history' ? <MailCheck size={13} /> : <FileText size={13} />}
                                            {taskPanelMode === 'history' ? 'Historico de mensagens' : 'Detalhes da tarefa'}
                                        </p>
                                        <h2 className="truncate text-lg font-black text-slate-900 dark:text-slate-100">{historyTask.title}</h2>
                                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            {getProposalLabel(historyTask.proposalId) || getClientName(historyTask.clientId) || 'Tarefa sem proposta vinculada'}
                                        </p>
                                    </div>
                                    <button type="button" onClick={closeHistoryPanel} className="rounded-md border border-transparent p-2 text-slate-400 transition hover:border-[var(--tenant-border)] hover:bg-[var(--tenant-control)] hover:text-slate-700 dark:hover:border-[var(--tenant-border-dark)] dark:hover:bg-[var(--tenant-control-dark)] dark:hover:text-slate-100">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openHistoryEmailComposer(historyTask, threads[0])}
                                        className="inline-flex items-center gap-2 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary)] px-3 py-2 text-xs font-black text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={!isProviderConnected('google') && !isProviderConnected('microsoft')}
                                    >
                                        <Send size={14} /> Enviar e-mail
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openFollowUpTaskFromHistory(historyTask)}
                                        className="inline-flex items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-xs font-black text-slate-700 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-200 dark:hover:text-[var(--tenant-primary-on-dark)]"
                                    >
                                        <Plus size={14} /> Criar tarefa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openModal(historyTask)}
                                        className="inline-flex items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-xs font-black text-slate-700 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-200 dark:hover:text-[var(--tenant-primary-on-dark)]"
                                    >
                                        <MoreHorizontal size={14} /> Editar
                                    </button>
                                </div>
                                <div className="mt-4 grid grid-cols-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-1 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                    <button
                                        type="button"
                                        onClick={() => setTaskPanelMode('details')}
                                        className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-black transition ${taskPanelMode === 'details' ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-control-active)] text-[var(--tenant-primary)] dark:bg-[var(--tenant-control-active-dark)] dark:text-[var(--tenant-primary-on-dark)]' : 'border-transparent text-slate-500 hover:bg-[var(--tenant-control)] dark:text-slate-400 dark:hover:bg-[var(--tenant-control-dark)]'}`}
                                    >
                                        <FileText size={14} /> Detalhes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTaskPanelMode('history')}
                                        className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-black transition ${taskPanelMode === 'history' ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-control-active)] text-[var(--tenant-primary)] dark:bg-[var(--tenant-control-active-dark)] dark:text-[var(--tenant-primary-on-dark)]' : 'border-transparent text-slate-500 hover:bg-[var(--tenant-control)] dark:text-slate-400 dark:hover:bg-[var(--tenant-control-dark)]'}`}
                                    >
                                        <MailCheck size={14} /> Historico
                                    </button>
                                </div>
                                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                        <p className="text-lg font-black text-slate-900 dark:text-slate-100">{taskCommunications.length}</p>
                                        <p className="text-[10px] font-bold uppercase text-slate-400">mensagens</p>
                                    </div>
                                    <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-300">{taskCommunications.filter(item => item.direction === 'inbound').length}</p>
                                        <p className="text-[10px] font-bold uppercase text-slate-400">recebidas</p>
                                    </div>
                                    <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                        <p className="text-lg font-black text-slate-900 dark:text-slate-100">{taskEvents.length}</p>
                                        <p className="text-[10px] font-bold uppercase text-slate-400">eventos</p>
                                    </div>
                                </div>
                                {emailComposerTaskId === historyTask.id && (
                                    <div className="mt-4 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                            <button type="button" onClick={() => setEmailProvider('google')} disabled={!isProviderConnected('google')} className={`rounded-md border px-3 py-1.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${emailProvider === 'google' ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary-on-dark)]' : 'border-[var(--tenant-border)] text-slate-500 dark:border-[var(--tenant-border-dark)] dark:text-slate-400'}`}>Gmail</button>
                                            <button type="button" onClick={() => setEmailProvider('microsoft')} disabled={!isProviderConnected('microsoft')} className={`rounded-md border px-3 py-1.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${emailProvider === 'microsoft' ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary-on-dark)]' : 'border-[var(--tenant-border)] text-slate-500 dark:border-[var(--tenant-border-dark)] dark:text-slate-400'}`}>Outlook</button>
                                        </div>
                                        <div className="space-y-3">
                                            <input value={emailTo} onChange={event => setEmailTo(event.target.value)} className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100" placeholder="Para" />
                                            <input value={emailCc} onChange={event => setEmailCc(event.target.value)} className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100" placeholder="Cc" />
                                            <input value={emailSubject} onChange={event => setEmailSubject(event.target.value)} className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100" placeholder="Assunto" />
                                            <textarea value={emailBody} onChange={event => setEmailBody(event.target.value)} rows={4} className="w-full resize-y rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-100" placeholder="Mensagem" />
                                        </div>
                                        {emailError && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">{emailError}</p>}
                                        <div className="mt-4 flex justify-end gap-2">
                                            <button type="button" onClick={() => setEmailComposerTaskId(null)} className="rounded-md px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)]">Cancelar</button>
                                            <button type="button" onClick={submitHistoryEmail} disabled={emailSending} className="inline-flex items-center gap-2 rounded-md bg-[var(--tenant-primary)] px-3 py-2 text-xs font-black text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60">
                                                {emailSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                Enviar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto p-5">
                                {taskPanelMode === 'details' ? (
                                    <div className="space-y-4">
                                        <section className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Detalhes</h3>
                                                {getStatusBadge(historyTask.status, historyTask.dueDate)}
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                    <p className="text-[10px] font-black uppercase text-slate-400">Tipo</p>
                                                    <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">{getTypeIcon(historyTask.type, 14)} {historyTask.type}</p>
                                                </div>
                                                <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                    <p className="text-[10px] font-black uppercase text-slate-400">Prazo</p>
                                                    <p className={`mt-1 flex items-center gap-2 text-sm font-bold ${isTaskOverdue(historyTask.dueDate, historyTask.status) ? 'text-red-600 dark:text-red-300' : 'text-slate-800 dark:text-slate-100'}`}>
                                                        <Calendar size={14} /> {new Date(historyTask.dueDate).toLocaleDateString('pt-BR', { dateStyle: 'medium' })}
                                                    </p>
                                                </div>
                                                <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                    <p className="text-[10px] font-black uppercase text-slate-400">Responsavel</p>
                                                    <p className="mt-1 flex items-center gap-2 truncate text-sm font-bold text-slate-800 dark:text-slate-100"><UserCircle2 size={14} /> {historyTask.assignee || '-'}</p>
                                                </div>
                                                <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                    <p className="text-[10px] font-black uppercase text-slate-400">Mensagens</p>
                                                    <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><MailCheck size={14} /> {taskCommunications.length}</p>
                                                </div>
                                            </div>
                                            {historyTask.description && (
                                                <div className="mt-3 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                    <p className="text-[10px] font-black uppercase text-slate-400">Descricao</p>
                                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{historyTask.description}</p>
                                                </div>
                                            )}
                                        </section>

                                        <section className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                            <h3 className="mb-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">Contexto</h3>
                                            <div className="grid gap-2 text-sm">
                                                <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                    <span className="text-xs font-black uppercase text-slate-400">Cliente</span>
                                                    <span className="truncate font-bold text-slate-800 dark:text-slate-100">{panelClient?.name || '-'}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                    <span className="text-xs font-black uppercase text-slate-400">Contato</span>
                                                    <span className="truncate font-bold text-slate-800 dark:text-slate-100">{panelContact?.name || '-'}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                    <span className="text-xs font-black uppercase text-slate-400">Proposta</span>
                                                    <span className="truncate font-bold text-slate-800 dark:text-slate-100">{getProposalLabel(historyTask.proposalId) || '-'}</span>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Anexos</h3>
                                                <span className="text-[11px] font-black text-slate-400">{panelAttachments.length}</span>
                                            </div>
                                            {panelAttachments.length === 0 ? (
                                                <div className="rounded-md border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-5 text-center text-xs font-bold text-slate-400 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">Nenhum anexo.</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {panelAttachments.map(attachment => (
                                                        <div key={attachment.id} className="flex items-center gap-3 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-2.5 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                            <FileIcon size={16} className="shrink-0 text-[var(--tenant-primary)] dark:text-[var(--tenant-primary-on-dark)]" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-xs font-black text-slate-800 dark:text-slate-100">{attachment.fileName}</p>
                                                                <p className="text-[10px] font-medium text-slate-400">{formatFileSize(attachment.fileSize)}</p>
                                                            </div>
                                                            <button type="button" onClick={() => onOpenTaskAttachment(attachment)} className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--tenant-border)] text-slate-500 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:text-slate-300 dark:hover:text-[var(--tenant-primary-on-dark)]" title="Abrir anexo" aria-label="Abrir anexo">
                                                                <ExternalLink size={14} />
                                                            </button>
                                                            <button type="button" onClick={async () => { setDeletingAttachmentId(attachment.id); await onDeleteTaskAttachment(attachment); setDeletingAttachmentId(null); }} disabled={deletingAttachmentId === attachment.id} className="flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-500 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:hover:bg-red-950/40" title="Remover anexo" aria-label="Remover anexo">
                                                                {deletingAttachmentId === attachment.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </section>

                                        <section className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Historico</h3>
                                                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{taskCommunications.length} mensagens vinculadas</p>
                                                </div>
                                                <button type="button" onClick={() => setTaskPanelMode('history')} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-3 py-2 text-xs font-black text-[var(--tenant-primary-on-dark)] transition hover:brightness-95">
                                                    <MailCheck size={14} /> Ver historico
                                                </button>
                                            </div>
                                        </section>
                                    </div>
                                ) : threads.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-control)] px-4 py-10 text-center dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                        <MessageSquare className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={32} />
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Nenhuma conversa vinculada.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {threads.map(thread => (
                                            <section key={thread.key} className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                <div className="mb-3 flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <h3 className="break-words text-sm font-black text-slate-900 dark:text-slate-100">{thread.subject}</h3>
                                                        <p className="mt-1 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">{thread.participants.slice(0, 3).join(', ')}</p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <button type="button" onClick={() => openHistoryEmailComposer(historyTask, thread)} className="inline-flex items-center gap-1 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-2 py-1 text-[10px] font-black uppercase text-[var(--tenant-primary-on-dark)] transition hover:brightness-95">
                                                            <Send size={11} /> Responder
                                                        </button>
                                                        <span className="rounded-md bg-[var(--tenant-panel)] px-2 py-1 text-[10px] font-black uppercase text-slate-500 dark:bg-[var(--tenant-panel-dark)]">
                                                            {thread.provider === 'microsoft' ? 'Outlook' : 'Gmail'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                    <span>{thread.messages.length} mensagens</span>
                                                    <span>{thread.inboundCount} recebidas</span>
                                                    <span>Ã?ltima: {new Date(getCommunicationDate(thread.lastMessage)).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {thread.messages.map(message => (
                                                        <div key={message.id} className={`rounded-md border px-3 py-2 ${message.direction === 'inbound' ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/25' : 'border-[var(--tenant-border)] bg-[var(--tenant-panel)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]'}`}>
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{message.direction === 'inbound' ? 'Resposta recebida' : 'E-mail enviado'}</span>
                                                                <span className="text-[10px] font-semibold text-slate-500">{new Date(getCommunicationDate(message)).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                            </div>
                                                            {message.bodyPreview && <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-400">{message.bodyPreview}</p>}
                                                            {message.externalUrl && <a href={message.externalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[10px] font-black text-[var(--tenant-primary-on-dark)] hover:underline">Abrir no e-mail</a>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        ))}
                                    </div>
                                )}
                            </div>
                    </ResponsiveDrawer>
                );
            })(), document.body)}

            {/* Modal de Tarefa */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] p-0 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-t-xl border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-2xl animate-in slide-in-from-bottom-4 duration-200 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] sm:rounded-lg sm:animate-in sm:zoom-in-95">
                        <div className="flex items-center justify-between border-b border-[var(--tenant-border)] bg-[var(--tenant-control)] px-4 py-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] sm:px-6 sm:py-4">
                            <h2 className="flex min-w-0 items-center gap-3 text-base font-black text-slate-800 dark:text-slate-100 sm:text-xl">
                                <span className="bg-[var(--tenant-primary-soft)] p-2 rounded-md text-[var(--tenant-primary)]">
                                    <CheckSquare size={20} />
                                </span>
                                <span className="truncate">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</span>
                            </h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] rounded-full">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSaveTask} onPaste={handleAttachmentPaste} className="bg-[var(--tenant-panel)] p-4 text-left dark:bg-[var(--tenant-panel-dark)] sm:p-6">

                            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
                                <div className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Título</label>
                                <input type="text" name="title" required defaultValue={editingTask?.title || taskDraftDefaults?.title || ''} className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-md px-4 py-3.5 font-bold text-lg text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] transition-all placeholder:text-slate-400 placeholder:font-medium" placeholder="Ex: Ligar para cliente" />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                                        Tipo
                                    </label>
                                    <div className="relative">
                                        <select name="type" required defaultValue={editingTask?.type || taskDraftDefaults?.type || 'Meeting'} className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-md px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] cursor-pointer appearance-none transition-all">
                                            <option value="Meeting">Reunião</option>
                                            <option value="Call">Ligação</option>
                                            <option value="Email">E-mail</option>
                                            <option value="Follow-up">Follow-up</option>
                                            <option value="Other">Outro</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                                        <CalendarDays size={12} /> Prazo
                                    </label>
                                    <input type="date" name="dueDate" required defaultValue={editingTask?.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : taskDraftDefaults?.dueDate ? new Date(taskDraftDefaults.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-md px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] transition-all" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Responsável</label>
                                <div className="relative">
                                    <select name="assignee" defaultValue={editingTask?.assignee || taskDraftDefaults?.assignee || currentUser.name} className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-md px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] cursor-pointer appearance-none transition-all">
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
                                    <FileText size={12} /> Notas
                                </label>
                                <textarea name="description" rows={4} defaultValue={editingTask?.description || taskDraftDefaults?.description || ''} className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-md px-4 py-3 font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] resize-none transition-all placeholder:text-slate-400/70" placeholder="Notas internas" />
                            </div>

                                </div>
                                <div className="space-y-5">
                            <div className="bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] p-4 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Paperclip size={12} /> Anexos
                                    </label>
                                    <span className="text-[10px] font-bold text-slate-400">{editingTaskAttachments.length + queuedAttachments.length}/10</span>
                                </div>

                                <div className="relative overflow-hidden rounded-md border-2 border-dashed border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 text-center transition-colors hover:border-[var(--tenant-primary-border)] hover:bg-[var(--tenant-primary-soft)]/40 focus-within:border-[var(--tenant-primary-border)] focus-within:bg-[var(--tenant-primary-soft)]/40 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:hover:border-[var(--tenant-primary-border)] dark:hover:bg-[var(--tenant-primary-soft)] dark:focus-within:border-[var(--tenant-primary-border)] dark:focus-within:bg-[var(--tenant-primary-soft)]">
                                    <UploadCloud className="mx-auto mb-2 text-slate-400" size={24} />
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Adicionar arquivos</p>
                                    <input
                                        type="file"
                                        multiple
                                        accept={ATTACHMENT_ACCEPT}
                                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                        onChange={(event) => {
                                            handleAttachmentFiles(event.target.files);
                                            event.target.value = '';
                                        }}
                                    />
                                </div>

                                {attachmentError && (
                                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{attachmentError}</p>
                                )}

                                {(editingTaskAttachments.length > 0 || queuedAttachments.length > 0) && (
                                    <div className="space-y-2">
                                        {editingTaskAttachments.map(attachment => (
                                            <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="rounded-lg bg-[var(--tenant-control)] p-2 text-slate-500 dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">
                                                        <FileIcon size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{attachment.fileName}</p>
                                                        <p className="text-[10px] font-medium text-slate-400">{formatFileSize(attachment.fileSize)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button type="button" onClick={() => onOpenTaskAttachment(attachment)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-[var(--tenant-control)] hover:text-[var(--tenant-primary)] dark:hover:bg-[var(--tenant-control-dark)]" title="Abrir anexo">
                                                        <ExternalLink size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={deletingAttachmentId === attachment.id}
                                                        onClick={async () => {
                                                            setDeletingAttachmentId(attachment.id);
                                                            setAttachmentError(null);
                                                            try {
                                                                await onDeleteTaskAttachment(attachment);
                                                            } catch (error: any) {
                                                                setAttachmentError(error?.message || 'Erro ao remover anexo.');
                                                            } finally {
                                                                setDeletingAttachmentId(null);
                                                            }
                                                        }}
                                                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20"
                                                        title="Remover anexo"
                                                    >
                                                        {deletingAttachmentId === attachment.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {queuedAttachments.map(queued => (
                                            <div key={queued.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="rounded-lg bg-[var(--tenant-control)] p-2 text-slate-500 dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">
                                                        {queued.status === 'uploading' ? <Loader2 size={16} className="animate-spin" /> : <FileIcon size={16} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{queued.file.name}</p>
                                                        <p className={`text-[10px] font-medium ${queued.status === 'error' ? 'text-red-500' : 'text-slate-400'}`}>
                                                            {queued.status === 'error' ? queued.error : queued.status === 'done' ? 'Enviado' : formatFileSize(queued.file.size)}
                                                        </p>
                                                    </div>
                                                </div>
                                                {queued.status !== 'uploading' && queued.status !== 'done' && (
                                                    <button type="button" onClick={() => removeQueuedAttachment(queued.id)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-[var(--tenant-control)] hover:text-red-600 dark:hover:bg-[var(--tenant-control-dark)]" title="Remover da fila">
                                                        <X size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] p-4 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contexto</h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Cliente</label>
                                        <select name="clientId" required defaultValue={editingTask?.clientId || taskDraftDefaults?.clientId || ''} className="w-full bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] cursor-pointer">
                                            <option value="">Selecione um cliente</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Contato</label>
                                        <select name="contactId" defaultValue={editingTask?.contactId || taskDraftDefaults?.contactId || ''} className="w-full bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] cursor-pointer">
                                            <option value="">(Sem contato)</option>
                                            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Oportunidade / Proposta</label>
                                        <select name="proposalId" defaultValue={editingTask?.proposalId || taskDraftDefaults?.proposalId || ''} className="w-full bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] cursor-pointer">
                                            <option value="">(Sem proposta)</option>
                                            {proposals.map(p => <option key={p.id} value={p.id}>#{p.proposalId} - {p.clientName}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {editingTask && (() => {
                                const taskCommunications = getTaskCommunications(editingTask);
                                const taskEvents = getTaskEvents(editingTask);
                                const threads = groupCommunicationThreads(taskCommunications);
                                return (
                                    <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--tenant-border)] pb-3 dark:border-[var(--tenant-border-dark)]">
                                            <div>
                                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Rastreabilidade</h4>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-[10px] font-black text-slate-500">
                                                <span className="rounded-md bg-[var(--tenant-control)] px-2 py-1 dark:bg-[var(--tenant-control-dark)]">{taskCommunications.length} mensagens</span>
                                                <span className="rounded-md bg-[var(--tenant-control)] px-2 py-1 dark:bg-[var(--tenant-control-dark)]">{taskEvents.length} eventos</span>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 text-xs sm:grid-cols-3">
                                            <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                <p className="text-[10px] font-black uppercase text-slate-400">Cliente</p>
                                                <p className="mt-1 font-bold text-slate-700 dark:text-slate-200">{getClientName(editingTask.clientId) || 'Sem cliente'}</p>
                                            </div>
                                            <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                <p className="text-[10px] font-black uppercase text-slate-400">Contato</p>
                                                <p className="mt-1 font-bold text-slate-700 dark:text-slate-200">{getContactName(editingTask.contactId) || 'Sem contato'}</p>
                                            </div>
                                            <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                <p className="text-[10px] font-black uppercase text-slate-400">Proposta</p>
                                                <p className="mt-1 font-bold text-slate-700 dark:text-slate-200">{getProposalLabel(editingTask.proposalId) || 'Sem proposta'}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 space-y-4">
                                            <div>
                                                <h5 className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-slate-500 dark:text-slate-400"><MailCheck size={14} /> Conversas relacionadas</h5>
                                                {threads.length === 0 ? (
                                                    <p className="rounded-md border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-4 text-center text-xs font-semibold text-slate-400 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">Nenhuma conversa vinculada.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {threads.map(thread => (
                                                            <div key={thread.key} className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <p className="break-words text-sm font-black text-slate-800 dark:text-slate-100">{thread.subject}</p>
                                                                        <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{thread.messages.length} mensagens - {thread.inboundCount} recebidas - ultima {new Date(getCommunicationDate(thread.lastMessage)).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                                                                    </div>
                                                                    {thread.lastMessage.externalUrl && <a href={thread.lastMessage.externalUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-2 py-1 text-[10px] font-black text-[var(--tenant-primary)] hover:bg-[var(--tenant-control)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">Abrir</a>}
                                                                </div>
                                                                {thread.lastMessage.bodyPreview && <p className="mt-2 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{thread.lastMessage.bodyPreview}</p>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <h5 className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-slate-500 dark:text-slate-400"><CalendarDays size={14} /> Eventos relacionados</h5>
                                                {taskEvents.length === 0 ? (
                                                    <p className="rounded-md border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-4 text-center text-xs font-semibold text-slate-400 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">Nenhum evento vinculado.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {taskEvents.slice(0, 4).map(event => (
                                                            <div key={event.id} className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">{event.title}</p>
                                                                    <span className="shrink-0 text-[10px] font-bold text-slate-500">{new Date(event.startsAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                                </div>
                                                                {event.meetLink && <a href={event.meetLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[10px] font-black text-[var(--tenant-secondary)] hover:underline">{event.provider === 'microsoft' ? 'Abrir Teams' : 'Abrir Meet'}</a>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                                </div>
                            </div>

                            <input type="hidden" name="status" value={editingTask?.status || taskDraftDefaults?.status || 'To Do'} />

                            <div className="mt-6 pt-6 border-t border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] flex justify-between items-center">
                                {/* Delete button could go here if in edit mode */}
                                {editingTask ? (
                                    <button type="button" onClick={async () => {
                                        if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
                                            await onDeleteTask(editingTask.id);
                                            closeModal();
                                        }
                                    }} className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                        Excluir
                                    </button>
                                ) : <div></div>}

                                <div className="flex gap-3">
                                    <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-md font-bold text-slate-600 dark:text-slate-400 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] transition-all">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={isSavingTask} className="px-6 py-2.5 bg-[var(--tenant-primary)] hover:brightness-95 text-white rounded-md font-bold shadow-lg dark:shadow-none transition-transform active:scale-95 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-70">
                                        {isSavingTask ? <Loader2 size={18} className="animate-spin" /> : <CheckSquare size={18} />}
                                        {isSavingTask ? 'Salvando...' : editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PageShell>
    );
};

export default Tasks;
