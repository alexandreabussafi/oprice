import React, { useState, useEffect } from 'react';
import { ProposalData, OpportunityStage, OpportunityStatus, OpportunityMotion, ProposalType, Client, Contact, CRMTask, CONTINUOUS_STAGES, SPOT_STAGES, STAGE_LABELS, CONTINUOUS_TO_SPOT_MAPPING, ContinuousStage, SpotStage, TenantModule, TaskAttachment, CRMCommunication, CRMExternalEvent, GoogleConnectionStatus, GoogleEmailDraft, GoogleMeetingDraft, MicrosoftConnectionStatus, MicrosoftEmailDraft, MicrosoftMeetingDraft, MicrosoftTodoDraft, WorkspaceProvider } from '../types';
import { calculateFinancials, formatCurrency, formatPercent } from '../utils/pricingEngine';
import { Plus, Search, FileText, CheckCircle, XCircle, X, Clock, Copy, Edit3, Trash2, PieChart, TrendingUp, Calendar, User, LayoutGrid, List, ArrowRight, DollarSign, Users, Briefcase, GripVertical, ExternalLink, BarChart3, Zap, Repeat, AlertCircle, Snowflake, Filter, Save, Landmark, Package, Activity, History, CreditCard, PhoneCall, MailCheck, CalendarDays, Paperclip, File as FileIcon, UserPlus } from 'lucide-react';
import { buildCommercialTimeline, getCommunicationDate, groupCommunicationThreads, groupTimelineByDay } from '../utils/crmTraceability';
import { Button, PageHeader, ResponsiveDrawer } from '../components/ui';

interface CRMProps {
    clients: Client[];
    contacts: Contact[];
    tasks: CRMTask[];
    taskAttachments: TaskAttachment[];
    communications: CRMCommunication[];
    externalEvents: CRMExternalEvent[];
    googleConnection: GoogleConnectionStatus;
    googleWorkspaceLoading: boolean;
    microsoftConnection: MicrosoftConnectionStatus;
    microsoftWorkspaceLoading: boolean;
    proposals: ProposalData[];
    onSelectProposal: (id: string) => void;
    onCreateProposal: (payload: { type: ProposalType, clientId: string, motion: OpportunityMotion, pricingModule: TenantModule, inlineClientName: string, referenceId: string, expansionType: 'Volume' | 'Scope' | 'Site' }) => void | Promise<void>;
    onCreateNewVersion: (id: string, notes: string) => void | Promise<void>;
    onDuplicateProposal: (id: string) => void;
    onDeleteProposal: (id: string) => void;
    onUpdateStage: (id: string, newStage: OpportunityStage) => void | Promise<void>;
    onUpdateStatus: (id: string, newStatus: OpportunityStatus) => void | Promise<void>;
    onUpdateProposal: (id: string, data: Partial<ProposalData>) => void | Promise<void>;
    onUpdateMilestones: (id: string, milestones: import('../types').Milestone[]) => void | Promise<void>;
    onCreateTask: (task: CRMTask) => CRMTask | Promise<CRMTask>;
    onSaveContact: (contact: Contact) => void | Promise<void>;
    onOpenTaskAttachment: (attachment: TaskAttachment) => void | Promise<void>;
    onConnectGoogle: () => void | Promise<void>;
    onDisconnectGoogle: () => void | Promise<void>;
    onSyncGoogle: () => void | Promise<void>;
    onSendGoogleEmail: (draft: GoogleEmailDraft) => Promise<{ task: CRMTask; communication: CRMCommunication }>;
    onCreateGoogleMeeting: (draft: GoogleMeetingDraft) => Promise<{ task: CRMTask; externalEvent: CRMExternalEvent }>;
    onConnectMicrosoft: () => void | Promise<void>;
    onDisconnectMicrosoft: () => void | Promise<void>;
    onSyncMicrosoft: () => void | Promise<void>;
    onSendMicrosoftEmail: (draft: MicrosoftEmailDraft) => Promise<{ task: CRMTask; communication: CRMCommunication; todoTask: CRMTask; externalTask: any; todoError: string }>;
    onCreateMicrosoftMeeting: (draft: MicrosoftMeetingDraft) => Promise<{ task: CRMTask; externalEvent: CRMExternalEvent }>;
    onCreateMicrosoftTodoTask: (draft: MicrosoftTodoDraft) => Promise<{ task: CRMTask; externalTask: any; todoError: string }>;
    currentUser: { name: string; role: string };
    initialViewMode: 'list' | 'kanban';
    businessUnit: 'SERVICES' | 'PRODUCTS';
    enabledModules: TenantModule[];
}

const CRM: React.FC<CRMProps> = ({
    clients = [],
    contacts = [],
    tasks = [],
    taskAttachments = [],
    communications = [],
    externalEvents = [],
    googleConnection = { connected: false, account: null },
    googleWorkspaceLoading = false,
    microsoftConnection = { connected: false, account: null },
    microsoftWorkspaceLoading = false,
    proposals,
    onSelectProposal,
    onCreateProposal,
    onCreateNewVersion,
    onDuplicateProposal,
    onDeleteProposal,
    onUpdateStage,
    onUpdateStatus,
    onUpdateProposal,
    onUpdateMilestones,
    onCreateTask,
    onSaveContact,
    onOpenTaskAttachment,
    onConnectGoogle,
    onDisconnectGoogle,
    onSyncGoogle,
    onSendGoogleEmail,
    onCreateGoogleMeeting,
    onConnectMicrosoft,
    onDisconnectMicrosoft,
    onSyncMicrosoft,
    onSendMicrosoftEmail,
    onCreateMicrosoftMeeting,
    onCreateMicrosoftTodoTask,
    currentUser,
    initialViewMode = 'kanban',
    businessUnit,
    enabledModules = ['CRM_CORE', 'SERVICES_COMPLEX', 'PRODUCT_SALES']
}) => {
    const hasServicesModule = enabledModules.includes('SERVICES_COMPLEX');
    const hasProductModule = enabledModules.some(module => ['PRODUCT_SALES', 'SAAS_SUBSCRIPTION', 'IOT_SUBSCRIPTION'].includes(module));
    const hasSaasModule = enabledModules.includes('SAAS_SUBSCRIPTION');
    const hasProductSalesModule = enabledModules.includes('PRODUCT_SALES');
    const hasIotModule = enabledModules.includes('IOT_SUBSCRIPTION');
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>(initialViewMode as 'list' | 'kanban');
    const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pipelineFilter, setPipelineFilter] = useState<ProposalType>(businessUnit === 'PRODUCTS' ? 'PRODUCT' : 'CONTINUOUS');
    const [showFrozen, setShowFrozen] = useState(false);

    // Create Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createStep, setCreateStep] = useState<1 | 2>(1);
    const [createType, setCreateType] = useState<ProposalType>(businessUnit === 'PRODUCTS' ? 'PRODUCT' : 'CONTINUOUS');
    const [createPricingModule, setCreatePricingModule] = useState<TenantModule | undefined>(businessUnit === 'PRODUCTS' ? 'PRODUCT_SALES' : 'SERVICES_COMPLEX');
    const [createClientId, setCreateClientId] = useState<string>('');
    const [createInlineClientName, setCreateInlineClientName] = useState('');
    const [createMotion, setCreateMotion] = useState<OpportunityMotion>('NewBusiness');
    const [createReferenceId, setCreateReferenceId] = useState<string>('');
    const [createExpansionType, setCreateExpansionType] = useState<'Volume' | 'Scope' | 'Site'>('Volume');
    const [isCreatingProposal, setIsCreatingProposal] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Drag & Drop State
    const [draggedProposalId, setDraggedProposalId] = useState<string | null>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);

    // UX Modals State
    const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
    const [isFrozenModalOpen, setIsFrozenModalOpen] = useState(false);
    const [actionProposalId, setActionProposalId] = useState<string | null>(null);
    const [tempNotes, setTempNotes] = useState('');
    const [tempFrozenUntil, setTempFrozenUntil] = useState('');
    const [activityModal, setActivityModal] = useState<{ proposalId?: string; clientId?: string; type: CRMTask['type']; quick?: boolean } | null>(null);
    const [activityClientId, setActivityClientId] = useState('');
    const [activityProposalId, setActivityProposalId] = useState('');
    const [activityTitle, setActivityTitle] = useState('');
    const [activityDescription, setActivityDescription] = useState('');
    const [activityContactId, setActivityContactId] = useState('');
    const [activityDueDate, setActivityDueDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [activitySyncMicrosoftTodo, setActivitySyncMicrosoftTodo] = useState(false);
    const [activityError, setActivityError] = useState<string | null>(null);
    const [emailModal, setEmailModal] = useState<{ proposalId: string } | null>(null);
    const [emailProvider, setEmailProvider] = useState<WorkspaceProvider>('google');
    const [emailContactId, setEmailContactId] = useState('');
    const [emailTo, setEmailTo] = useState('');
    const [emailCc, setEmailCc] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [emailSyncMicrosoftTodo, setEmailSyncMicrosoftTodo] = useState(false);
    const [emailSentAfterError, setEmailSentAfterError] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [meetingModal, setMeetingModal] = useState<{ proposalId: string } | null>(null);
    const [meetingProvider, setMeetingProvider] = useState<WorkspaceProvider>('google');
    const [meetingContactIds, setMeetingContactIds] = useState<string[]>([]);
    const [meetingTitle, setMeetingTitle] = useState('');
    const [meetingDescription, setMeetingDescription] = useState('');
    const [meetingStartsAt, setMeetingStartsAt] = useState('');
    const [meetingDurationMinutes, setMeetingDurationMinutes] = useState(45);
    const [meetingError, setMeetingError] = useState<string | null>(null);
    const [contactModal, setContactModal] = useState<{ proposalId: string } | null>(null);
    const [contactName, setContactName] = useState('');
    const [contactRole, setContactRole] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactLinkedin, setContactLinkedin] = useState('');
    const [contactInfluenceLevel, setContactInfluenceLevel] = useState<Contact['influenceLevel']>('Influencer');
    const [contactSaveError, setContactSaveError] = useState<string | null>(null);
    const [isSavingQuickContact, setIsSavingQuickContact] = useState(false);

    // Milestones State
    const [isAddingMilestone, setIsAddingMilestone] = useState(false);
    const [tempMilestoneTitle, setTempMilestoneTitle] = useState('');
    const [tempMilestoneDate, setTempMilestoneDate] = useState('');

    // Tab State for Right Sidebar
    const [activeRightPanelTab, setActiveRightPanelTab] = useState<'overview' | 'activities' | 'timeline'>('overview');

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 767px)');
        const applyMobileDefault = () => {
            if (media.matches) setViewMode('list');
        };
        applyMobileDefault();
        media.addEventListener('change', applyMobileDefault);
        return () => media.removeEventListener('change', applyMobileDefault);
    }, []);

    // Sync pipeline and creation defaults when Business Unit changes
    useEffect(() => {
        if (businessUnit === 'PRODUCTS') {
            if (hasProductModule) {
                setPipelineFilter('PRODUCT');
                setCreateType('PRODUCT');
                setCreatePricingModule(hasSaasModule ? 'SAAS_SUBSCRIPTION' : hasIotModule ? 'IOT_SUBSCRIPTION' : 'PRODUCT_SALES');
            }
        } else {
            if (hasServicesModule) {
                setPipelineFilter('CONTINUOUS');
                setCreateType('CONTINUOUS');
                setCreatePricingModule('SERVICES_COMPLEX');
            }
        }
    }, [businessUnit, hasProductModule, hasServicesModule, hasSaasModule, hasIotModule]);

    // Get only the proposals that are the CURRENT version
    const activeProposals = proposals.filter(p => p.isCurrentVersion);

    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, id });
    };

    const selectedProposal = proposals.find(p => p.id === selectedPreviewId);
    const selectedFinancials = selectedProposal ? calculateFinancials(selectedProposal) : null;
    const workspaceLoading = googleWorkspaceLoading || microsoftWorkspaceLoading;
    const connectedProviders: WorkspaceProvider[] = [
        ...(googleConnection.connected ? ['google' as WorkspaceProvider] : []),
        ...(microsoftConnection.connected ? ['microsoft' as WorkspaceProvider] : [])
    ];
    const getDefaultProvider = (): WorkspaceProvider => googleConnection.connected ? 'google' : 'microsoft';
    const isProviderConnected = (provider: WorkspaceProvider) => provider === 'google' ? googleConnection.connected : microsoftConnection.connected;
    const getProviderLabel = (provider: WorkspaceProvider) => provider === 'google' ? 'Google Workspace' : 'Microsoft 365';
    const getEmailProviderLabel = (provider: WorkspaceProvider) => provider === 'google' ? 'Gmail' : 'Outlook';
    const getMeetingProviderLabel = (provider: WorkspaceProvider) => provider === 'google' ? 'Google Meet' : 'Microsoft Teams';
    const getProposalTasks = (proposalId: string) => tasks.filter(task => task.proposalId === proposalId);
    const getPendingProposalTasks = (proposalId: string) => getProposalTasks(proposalId)
        .filter(task => task.status !== 'Done')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const getTaskStatusLabel = (status: CRMTask['status']) => {
        if (status === 'To Do') return 'A fazer';
        if (status === 'In Progress') return 'Em andamento';
        return 'Concluídas';
    };
    const getTaskTypeLabel = (type: CRMTask['type']) => {
        if (type === 'Meeting') return 'Reunião';
        if (type === 'Call') return 'Ligação';
        if (type === 'Email') return 'E-mail';
        if (type === 'Follow-up') return 'Follow-up';
        return 'Outro';
    };
    const isTaskOverdue = (task: CRMTask) => task.status !== 'Done' && new Date(`${task.dueDate}T23:59:59`).getTime() < Date.now();
    const getProposalTaskAttachments = (proposalId: string) => {
        const proposalTaskIds = new Set(getProposalTasks(proposalId).map(task => task.id));
        return taskAttachments.filter(attachment => attachment.proposalId === proposalId || proposalTaskIds.has(attachment.taskId));
    };
    const getProposalCommunications = (proposalId: string) => communications
        .filter(communication => communication.proposalId === proposalId)
        .sort((a, b) => new Date(b.receivedAt || b.sentAt || b.createdAt).getTime() - new Date(a.receivedAt || a.sentAt || a.createdAt).getTime());
    const getProposalExternalEvents = (proposalId: string) => externalEvents
        .filter(event => event.proposalId === proposalId)
        .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    const getProposalTraceability = (proposal: ProposalData) => {
        const proposalCommunications = getProposalCommunications(proposal.id);
        const proposalTasks = getProposalTasks(proposal.id);
        const proposalEvents = getProposalExternalEvents(proposal.id);
        const threads = groupCommunicationThreads(proposalCommunications);
        const timeline = buildCommercialTimeline({
            communications: proposalCommunications,
            externalEvents: proposalEvents,
            tasks: proposalTasks,
            timeline: proposal.timeline || []
        });
        return { proposalCommunications, proposalTasks, proposalEvents, threads, timeline, groupedTimeline: groupTimelineByDay(timeline) };
    };
    const openReplyTaskFromCommunication = (communication: CRMCommunication) => {
        const proposal = proposals.find(p => p.id === communication.proposalId);
        if (!proposal?.clientId) return;
        setActivityModal({ proposalId: proposal.id, clientId: proposal.clientId, type: 'Follow-up' });
        setActivityClientId(proposal.clientId);
        setActivityProposalId(proposal.id);
        setActivityTitle(`Responder e-mail: ${communication.subject || 'sem assunto'}`);
        setActivityDescription([
            `Responder a ${communication.fromEmail || 'remetente do e-mail'}.`,
            communication.bodyPreview ? `Preview: ${communication.bodyPreview}` : '',
            communication.externalUrl ? `Link: ${communication.externalUrl}` : ''
        ].filter(Boolean).join('\n'));
        setActivityContactId(communication.contactId || '');
        setActivityDueDate(addDaysDateInput(1));
        setActivitySyncMicrosoftTodo(Boolean(microsoftConnection.connected && onCreateMicrosoftTodoTask));
        setActivityError(null);
    };
    const formatAttachmentSize = (bytes: number) => {
        if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    };
    const toLocalDateTimeInput = (date: Date) => {
        const offset = date.getTimezoneOffset();
        return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
    };
    const addDaysDateInput = (days: number) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setCreateStep(1);
        setCreateClientId('');
        setCreateInlineClientName('');
        setCreateReferenceId('');
        setCreateError(null);
        setIsCreatingProposal(false);
    };

    const submitCreateProposal = async () => {
        if (isCreatingProposal) return;
        setIsCreatingProposal(true);
        setCreateError(null);
        try {
            await onCreateProposal({
                type: createType,
                clientId: createClientId,
                motion: createMotion,
                pricingModule: createPricingModule,
                inlineClientName: createInlineClientName,
                referenceId: createMotion !== 'NewBusiness' ? createReferenceId : undefined,
                expansionType: createMotion === 'Expansion' ? createExpansionType : undefined
            });
            closeCreateModal();
        } catch (error: any) {
            setCreateError(error.message || 'Não foi possível criar a cotação. Verifique os dados e tente novamente.');
        } finally {
            setIsCreatingProposal(false);
        }
    };

    const closeMilestoneForm = () => {
        setIsAddingMilestone(false);
        setTempMilestoneTitle('');
        setTempMilestoneDate('');
    };

    const closePreviewPanel = () => {
        setSelectedPreviewId(null);
        setActiveRightPanelTab('overview');
        closeMilestoneForm();
    };

    const closeActivityModal = () => {
        setActivityModal(null);
        setActivityClientId('');
        setActivityProposalId('');
        setActivityTitle('');
        setActivityDescription('');
        setActivityContactId('');
        setActivityDueDate(new Date().toISOString().split('T')[0]);
        setActivitySyncMicrosoftTodo(false);
        setActivityError(null);
    };

    const closeEmailModal = () => {
        setEmailModal(null);
        setEmailProvider(getDefaultProvider());
        setEmailContactId('');
        setEmailTo('');
        setEmailCc('');
        setEmailSubject('');
        setEmailBody('');
        setEmailSyncMicrosoftTodo(false);
        setEmailSentAfterError(false);
        setEmailError(null);
    };

    const closeMeetingModal = () => {
        setMeetingModal(null);
        setMeetingProvider(getDefaultProvider());
        setMeetingContactIds([]);
        setMeetingTitle('');
        setMeetingDescription('');
        setMeetingStartsAt('');
        setMeetingDurationMinutes(45);
        setMeetingError(null);
    };

    const closeContactModal = () => {
        setContactModal(null);
        setContactName('');
        setContactRole('');
        setContactEmail('');
        setContactPhone('');
        setContactLinkedin('');
        setContactInfluenceLevel('Influencer');
        setContactSaveError(null);
        setIsSavingQuickContact(false);
    };

    const closeNewVersionModal = () => {
        setIsNewVersionModalOpen(false);
        setActionProposalId(null);
        setTempNotes('');
    };

    const closeFrozenModal = () => {
        setIsFrozenModalOpen(false);
        setActionProposalId(null);
        setTempNotes('');
        setTempFrozenUntil('');
    };

    const openActivityModal = (proposalId: string, type: CRMTask['type'] = 'Follow-up') => {
        const proposal = proposals.find(p => p.id === proposalId);
        if (!proposal?.clientId) return;
        const defaultTitle = type === 'Meeting' ? 'Reunião com cliente' :
            type === 'Call' ? 'Ligação de follow-up' :
                type === 'Email' ? 'Enviar e-mail de acompanhamento' :
                    'Follow-up da proposta';
        setActivityModal({ proposalId, clientId: proposal.clientId, type });
        setActivityClientId(proposal.clientId);
        setActivityProposalId(proposalId);
        setActivityTitle(defaultTitle);
        setActivityDescription('');
        setActivityContactId('');
        setActivityDueDate(new Date().toISOString().split('T')[0]);
        setActivitySyncMicrosoftTodo(Boolean(microsoftConnection.connected && onCreateMicrosoftTodoTask));
        setActivityError(null);
        setContextMenu(null);
    };

    const openQuickActivityModal = (type: CRMTask['type'] = 'Call') => {
        const defaultTitle = type === 'Meeting' ? 'Reunião em campo' :
            type === 'Call' ? 'Ligação comercial' :
                type === 'Email' ? 'Enviar e-mail' :
                    type === 'Other' ? 'Apontamento de campo' :
                        'Follow-up comercial';
        setActivityModal({ type, quick: true });
        setActivityClientId('');
        setActivityProposalId('');
        setActivityTitle(defaultTitle);
        setActivityDescription('');
        setActivityContactId('');
        setActivityDueDate(new Date().toISOString().split('T')[0]);
        setActivitySyncMicrosoftTodo(Boolean(microsoftConnection.connected && onCreateMicrosoftTodoTask));
        setActivityError(null);
        setContextMenu(null);
    };

    const openEmailComposer = (proposalId: string) => {
        const proposal = proposals.find(p => p.id === proposalId);
        if (!proposal?.clientId) return;
        const clientContacts = contacts.filter(contact => contact.clientId === proposal.clientId);
        const primaryContact = clientContacts.find(contact => contact.email) || clientContacts[0];
        const defaultProvider = getDefaultProvider();
        setEmailModal({ proposalId });
        setEmailProvider(defaultProvider);
        setEmailContactId(primaryContact?.id || '');
        setEmailTo(primaryContact?.email || '');
        setEmailCc('');
        setEmailSubject(`Follow-up proposta #${proposal.proposalId} - ${proposal.clientName}`);
        setEmailBody(`Olá${primaryContact?.name ? ` ${primaryContact.name}` : ''},\n\nEstou entrando em contato para dar sequência à proposta #${proposal.proposalId}.\n\nFico à disposição.\n`);
        setEmailSyncMicrosoftTodo(Boolean(defaultProvider === 'microsoft' && microsoftConnection.connected && onCreateMicrosoftTodoTask));
        setEmailSentAfterError(false);
        setEmailError(null);
        setContextMenu(null);
    };

    const openMeetingScheduler = (proposalId: string) => {
        const proposal = proposals.find(p => p.id === proposalId);
        if (!proposal?.clientId) return;
        const clientContacts = contacts.filter(contact => contact.clientId === proposal.clientId);
        const primaryContact = clientContacts.find(contact => contact.email) || clientContacts[0];
        const start = new Date();
        start.setDate(start.getDate() + 1);
        start.setHours(9, 0, 0, 0);
        setMeetingModal({ proposalId });
        setMeetingProvider(getDefaultProvider());
        setMeetingContactIds(primaryContact?.email ? [primaryContact.id] : []);
        setMeetingTitle(`Reunião proposta #${proposal.proposalId} - ${proposal.clientName}`);
        setMeetingDescription(`Discussão da proposta #${proposal.proposalId}.`);
        setMeetingStartsAt(toLocalDateTimeInput(start));
        setMeetingDurationMinutes(45);
        setMeetingError(null);
        setContextMenu(null);
    };

    const openContactModal = (proposalId: string) => {
        const proposal = proposals.find(p => p.id === proposalId);
        if (!proposal?.clientId || !onSaveContact) return;
        setContactModal({ proposalId });
        setContactName('');
        setContactRole('');
        setContactEmail('');
        setContactPhone('');
        setContactLinkedin('');
        setContactInfluenceLevel('Influencer');
        setContactSaveError(null);
        setContextMenu(null);
    };

    const submitActivity = async () => {
        if (!activityModal) return;
        const proposalId = activityModal.proposalId || activityProposalId || undefined;
        const proposal = proposalId ? proposals.find(p => p.id === proposalId) : undefined;
        const clientId = proposal?.clientId || activityModal.clientId || activityClientId;
        if (!clientId || !activityTitle.trim()) {
            setActivityError('Selecione um cliente e informe um título para a atividade.');
            return;
        }
        setActivityError(null);
        try {
            if (activitySyncMicrosoftTodo && microsoftConnection.connected && onCreateMicrosoftTodoTask) {
                await onCreateMicrosoftTodoTask({
                    tenantId: '',
                    clientId,
                    proposalId,
                    contactId: activityContactId || undefined,
                    title: activityTitle.trim(),
                    description: activityDescription.trim(),
                    type: activityModal.type,
                    dueDate: activityDueDate
                });
            } else {
                await onCreateTask({
                    id: `task-${Date.now()}`,
                    clientId,
                    proposalId,
                    contactId: activityContactId || undefined,
                    assignee: currentUser.name,
                    title: activityTitle.trim(),
                    description: activityDescription.trim(),
                    type: activityModal.type,
                    status: 'To Do',
                    dueDate: activityDueDate,
                    createdAt: new Date().toISOString()
                });
            }
            closeActivityModal();
        } catch (error: any) {
            setActivityError(error.message || 'Não foi possível criar a atividade.');
            console.error('Erro ao criar atividade', error);
        }
    };

    const submitEmail = async () => {
        if (!emailModal) return;
        const proposal = proposals.find(p => p.id === emailModal.proposalId);
        if (!proposal?.clientId) return;
        if (!isProviderConnected(emailProvider)) {
            setEmailError(`Conecte sua conta ${getProviderLabel(emailProvider)} antes de enviar e-mails.`);
            return;
        }
        if (emailProvider === 'google' && !onSendGoogleEmail) return;
        if (emailProvider === 'microsoft' && !onSendMicrosoftEmail) return;
        if (emailSentAfterError) {
            setEmailError('Este e-mail ja foi enviado. Feche o modal e confira o historico antes de tentar novamente.');
            return;
        }
        const lastCommunication = getProposalCommunications(proposal.id).find(communication =>
            emailProvider === 'google' ? communication.gmailThreadId : communication.microsoftConversationId
        );
        try {
            setEmailError(null);
            const baseDraft = {
                tenantId: '',
                clientId: proposal.clientId,
                proposalId: proposal.id,
                contactId: emailContactId || undefined,
                to: emailTo.split(',').map(item => item.trim()).filter(Boolean),
                cc: emailCc.split(',').map(item => item.trim()).filter(Boolean),
                subject: emailSubject.trim(),
                bodyText: emailBody
            };
            if (emailProvider === 'google') {
                await onSendGoogleEmail?.({
                    ...baseDraft,
                    gmailThreadId: lastCommunication.gmailThreadId
                });
            } else {
                await onSendMicrosoftEmail?.({
                    ...baseDraft,
                    microsoftConversationId: lastCommunication.microsoftConversationId,
                    createMicrosoftTodo: emailSyncMicrosoftTodo && Boolean(onCreateMicrosoftTodoTask),
                    todoDueDate: addDaysDateInput(2),
                    todoTitle: `Acompanhar retorno: ${emailSubject.trim()}`,
                    todoDescription: [
                        `Cliente: ${proposal.clientName}`,
                        `Proposta: #${proposal.proposalId}`,
                        `Para: ${emailTo}`,
                        emailCc.trim() ? `Cc: ${emailCc}` : '',
                        '',
                        emailBody
                    ].filter(Boolean).join('\n')
                });
            }
            setActiveRightPanelTab('timeline');
            closeEmailModal();
        } catch (error: any) {
            if (error.emailSent) setEmailSentAfterError(true);
            setEmailError(error.message || 'Não foi possível enviar o e-mail.');
        }
    };

    const submitMeeting = async () => {
        if (!meetingModal) return;
        const proposal = proposals.find(p => p.id === meetingModal.proposalId);
        if (!proposal?.clientId) return;
        if (!isProviderConnected(meetingProvider)) {
            setMeetingError(`Conecte sua conta ${getProviderLabel(meetingProvider)} antes de criar reunioes.`);
            return;
        }
        if (meetingProvider === 'google' && !onCreateGoogleMeeting) return;
        if (meetingProvider === 'microsoft' && !onCreateMicrosoftMeeting) return;
        const selectedContacts = contacts.filter(item => meetingContactIds.includes(item.id) && item.email);
        const primaryContact = selectedContacts[0];
        const startsAt = new Date(meetingStartsAt);
        const endsAt = new Date(startsAt.getTime() + meetingDurationMinutes * 60000);
        try {
            const draft = {
                tenantId: '',
                clientId: proposal.clientId,
                proposalId: proposal.id,
                contactId: primaryContact.id,
                title: meetingTitle.trim(),
                description: meetingDescription.trim(),
                startsAt: startsAt.toISOString(),
                endsAt: endsAt.toISOString(),
                attendeeEmails: selectedContacts.map(contact => contact.email)
            };
            if (meetingProvider === 'google') {
                await onCreateGoogleMeeting?.(draft);
            } else {
                await onCreateMicrosoftMeeting?.(draft);
            }
            setActiveRightPanelTab('activities');
            closeMeetingModal();
        } catch (error: any) {
            setMeetingError(error.message || 'Não foi possível criar a reunião.');
        }
    };

    const submitQuickContact = async () => {
        if (!contactModal || !onSaveContact || isSavingQuickContact) return;
        const proposal = proposals.find(p => p.id === contactModal.proposalId);
        if (!proposal.clientId) {
            setContactSaveError('Esta cotação não tem cliente vinculado.');
            return;
        }
        if (!contactName.trim() || !contactRole.trim()) {
            setContactSaveError('Informe o nome e o cargo do contato.');
            return;
        }

        setIsSavingQuickContact(true);
        setContactSaveError(null);
        try {
            await onSaveContact({
                id: `cont-${Date.now()}`,
                clientId: proposal.clientId,
                name: contactName.trim(),
                role: contactRole.trim(),
                email: contactEmail.trim(),
                phone: contactPhone.trim(),
                influenceLevel: contactInfluenceLevel,
                linkedin: contactLinkedin.trim() || undefined
            });
            closeContactModal();
        } catch (error) {
            console.error('Erro ao cadastrar contato', error);
            setContactSaveError(error instanceof Error ? error.message : 'Não foi possível salvar o contato.');
            setIsSavingQuickContact(false);
        }
    };

    const renderProposalAttachments = (proposalId: string) => {
        const attachments = getProposalTaskAttachments(proposalId);
        const attachmentsByTask = attachments.reduce<Record<string, TaskAttachment[]>>((acc, attachment) => {
            if (!acc[attachment.taskId]) acc[attachment.taskId] = [];
            acc[attachment.taskId].push(attachment);
            return acc;
        }, {});
        const taskIds = Object.keys(attachmentsByTask);

        return (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Paperclip size={14} /> Anexos das atividades
                    </h4>
                    {attachments.length > 0 && (
                        <span className="rounded bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">{attachments.length}</span>
                    )}
                </div>
                {taskIds.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">Nenhum anexo em atividades vinculadas.</p>
                ) : (
                    <div className="space-y-3">
                        {taskIds.map(taskId => {
                            const task = tasks.find(item => item.id === taskId);
                            return (
                                <div key={taskId} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                    <p className="mb-2 truncate text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{task.title || 'Atividade'}</p>
                                    <div className="space-y-2">
                                        {attachmentsByTask[taskId].map(attachment => (
                                            <button
                                                key={attachment.id}
                                                type="button"
                                                onClick={() => onOpenTaskAttachment(attachment)}
                                                className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-[var(--tenant-primary-border)] hover:bg-[var(--tenant-primary-soft)] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-[var(--tenant-primary-border)] dark:hover:bg-[var(--tenant-primary-soft)]"
                                            >
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <FileIcon size={14} className="shrink-0 text-slate-400" />
                                                    <span className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{attachment.fileName}</span>
                                                </span>
                                                <span className="shrink-0 text-[10px] font-bold text-slate-400">{formatAttachmentSize(attachment.fileSize)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const filteredProposals = activeProposals.filter(p => {
        const matchesSearch = p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.proposalId.includes(searchTerm) ||
            p.responsible.toLowerCase().includes(searchTerm.toLowerCase());

        // Status filters
        const matchesFrozen = showFrozen || p.status !== 'Frozen';
        const isArchived = p.status === 'Archived';

        // Business Unit / Pipeline filter
        let matchesPipeline = false;
        if (businessUnit === 'PRODUCTS') {
            matchesPipeline = hasProductModule && p.type === 'PRODUCT';
        } else {
            // In Services BI, we toggle between Continuous and Spot
            matchesPipeline = hasServicesModule && (pipelineFilter === 'CONTINUOUS' ? p.type === 'CONTINUOUS' : p.type === 'SPOT');
        }

        return matchesSearch && matchesFrozen && !isArchived && matchesPipeline;
    });

    // --- KPI Calculations ---
    const totalQuotesForConversion = activeProposals.filter(p => p.status !== 'Frozen' && p.status !== 'Archived').length;
    const wonQuotes = activeProposals.filter(p => p.stage === 'Won');
    const totalGains = wonQuotes.reduce((acc, p) => acc + p.value, 0);

    // Pipeline should exclude Won and Lost and Archived
    const totalPipeline = activeProposals
        .filter(p =>
            !['Won', 'Lost'].includes(p.stage) &&
            p.status === 'Active'
        ).reduce((acc, p) => acc + p.value, 0);


    const handleRowClick = (id: string) => {
        setSelectedPreviewId(id);
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedProposalId(id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, newStage: OpportunityStage) => {
        e.preventDefault();
        if (draggedProposalId) {
            onUpdateStage(draggedProposalId, newStage);
            setDraggedProposalId(null);
        }
    };

    // Added 'barColor' for explicit tailwind classes
    const continuousColumns: { id: OpportunityStage, label: string, color: string, bg: string, border: string, barColor: string, headerBg: string }[] = [
        { id: 'MQL', label: 'Prospecção', color: 'text-[var(--tenant-primary)]', bg: 'bg-[var(--tenant-primary-soft)]', border: 'border-[var(--tenant-primary-border)]', barColor: 'bg-[var(--tenant-primary)]', headerBg: 'bg-[var(--tenant-primary-soft)]' },
        { id: 'Qualification', label: 'Qualificação', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-300', barColor: 'bg-violet-500', headerBg: 'bg-violet-100/50' },
        { id: 'SolutionDesign', label: 'Desenho de Solução', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-300', barColor: 'bg-cyan-500', headerBg: 'bg-cyan-100/50' },
        { id: 'Pricing', label: 'Precificação', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-300', barColor: 'bg-slate-500', headerBg: 'bg-slate-100/50' },
        { id: 'Sent', label: 'Enviado', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-400', barColor: 'bg-blue-500', headerBg: 'bg-blue-50/70' },
        { id: 'Negotiation', label: 'Negociação', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-400', barColor: 'bg-amber-500', headerBg: 'bg-amber-50/70' },
        { id: 'Review', label: 'Em Revisão', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-400', barColor: 'bg-rose-500', headerBg: 'bg-rose-50/70' },
        { id: 'Won', label: 'Ganho', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500', barColor: 'bg-emerald-500', headerBg: 'bg-emerald-50/70' },
    ];

    const spotColumns: { id: OpportunityStage, label: string, color: string, bg: string, border: string, barColor: string, headerBg: string }[] = [
        { id: 'MQL', label: 'Prospecção', color: 'text-[var(--tenant-primary)]', bg: 'bg-[var(--tenant-primary-soft)]', border: 'border-[var(--tenant-primary-border)]', barColor: 'bg-[var(--tenant-primary)]', headerBg: 'bg-[var(--tenant-primary-soft)]' },
        { id: 'Diagnosis', label: 'Diagnóstico', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-300', barColor: 'bg-cyan-500', headerBg: 'bg-cyan-100/50' },
        { id: 'Pricing', label: 'Precificação', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-300', barColor: 'bg-slate-500', headerBg: 'bg-slate-100/50' },
        { id: 'Sent', label: 'Enviado', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-400', barColor: 'bg-blue-500', headerBg: 'bg-blue-50/70' },
        { id: 'FinalAdjustments', label: 'Ajustes Finais', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-400', barColor: 'bg-amber-500', headerBg: 'bg-amber-50/70' },
        { id: 'AwaitingPO', label: 'Aguardando PO', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-400', barColor: 'bg-rose-500', headerBg: 'bg-rose-50/70' },
        { id: 'Won', label: 'Ganho', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500', barColor: 'bg-emerald-500', headerBg: 'bg-emerald-50/70' },
    ];

    const productColumns: { id: OpportunityStage, label: string, color: string, bg: string, border: string, barColor: string, headerBg: string }[] = [
        { id: 'MQL', label: 'Lead/Interesse', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-300', barColor: 'bg-emerald-500', headerBg: 'bg-emerald-100/50' },
        { id: 'Qualification', label: 'Cotação Técnica', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-300', barColor: 'bg-teal-500', headerBg: 'bg-teal-100/50' },
        { id: 'Pricing', label: 'Lista de Preços', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-300', barColor: 'bg-slate-500', headerBg: 'bg-slate-100/50' },
        { id: 'Sent', label: 'Cotação Enviada', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-400', barColor: 'bg-blue-500', headerBg: 'bg-blue-50/70' },
        { id: 'Negotiation', label: 'Fechamento', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-400', barColor: 'bg-amber-500', headerBg: 'bg-amber-50/70' },
        { id: 'Won', label: 'Faturado', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500', barColor: 'bg-emerald-500', headerBg: 'bg-emerald-50/70' },
    ];

    let kanbanColumns = continuousColumns;
    if (pipelineFilter === 'SPOT') kanbanColumns = spotColumns;
    else if (pipelineFilter === 'PRODUCT') kanbanColumns = productColumns;

    const getStatusBadge = (stage: OpportunityStage, status: OpportunityStatus = 'Active') => {
        if (status === 'Frozen') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-900/10 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors"><Snowflake size={12} /> Congelado</span>;
        if (status === 'Archived') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 transition-colors"><Trash2 size={12} /> Arquivado</span>;

        const label = STAGE_LABELS[stage] || stage;

        switch (stage) {
            case 'Won': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-colors"><CheckCircle size={12} /> {label}</span>;
            case 'Lost': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800 transition-colors"><XCircle size={12} /> {label}</span>;
            case 'Pricing': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"><Edit3 size={12} /> {label}</span>;
            case 'Sent': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-colors"><FileText size={12} /> {label}</span>;
            case 'Negotiation':
            case 'FinalAdjustments': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800 transition-colors"><Clock size={12} /> {label}</span>;
            case 'MQL': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] border border-[var(--tenant-primary-border)] transition-colors">{label}</span>;
            case 'Qualification':
            case 'Diagnosis': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-400 border border-violet-200 dark:border-violet-800 transition-colors">{label}</span>;
            case 'Review':
            case 'AwaitingPO': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors">{label}</span>;
            case 'SolutionDesign': return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 transition-colors">{label}</span>;
            default: return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors">{label}</span>;
        }
    };

    const getMotionBadge = (motion: OpportunityMotion) => {
        switch (motion) {
            case 'NewBusiness': return <span className="text-[10px] bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-800 font-bold transition-colors">Novo</span>;
            case 'Renewal': return <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800 font-bold transition-colors">Renovação</span>;
            case 'Expansion': return <span className="text-[10px] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] px-1.5 py-0.5 rounded border border-[var(--tenant-primary-border)] font-bold transition-colors">Expansão</span>;
            case 'Addendum': return <span className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700 font-bold transition-colors">Aditivo</span>;
            case 'Reactivation': return <span className="text-[10px] bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-800 font-bold transition-colors">Reativação</span>;
        }
    };

    const getProposalTypeLabel = (proposal: ProposalData) => {
        if (proposal.pricingModule === 'SAAS_SUBSCRIPTION') return 'SaaS';
        if (proposal.pricingModule === 'IOT_SUBSCRIPTION') return 'IoT';
        if (proposal.type === 'SPOT') return 'Spot / Consultoria';
        if (proposal.type === 'PRODUCT') return 'Produtos';
        return 'Contrato Mensal';
    };

    const renderProposalMobileCard = (prop: ProposalData) => {
        const nextTask = getPendingProposalTasks(prop.id)[0];
        const isSelected = selectedPreviewId === prop.id;
        return (
            <article
                key={prop.id}
                onClick={(event) => {
                    event.stopPropagation();
                    handleRowClick(prop.id);
                }}
                className={`rounded-md border bg-white px-3 py-2.5 shadow-sm transition active:scale-[0.99] dark:bg-slate-900 ${isSelected ? 'border-[var(--tenant-primary)] ring-2 ring-[var(--tenant-primary-soft)]' : 'border-slate-200 dark:border-slate-800'} ${prop.status === 'Frozen' ? 'opacity-70 grayscale-[0.4]' : ''}`}
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black leading-5 text-slate-900 dark:text-slate-100">{prop.clientName}</p>
                        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <span className="font-mono">#{prop.proposalId}</span>
                            <span>v{prop.version}</span>
                            <span className="truncate">{getProposalTypeLabel(prop)}</span>
                        </div>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-slate-900 dark:text-slate-100">{formatCurrency(prop.value)}</p>
                        <p className="text-[10px] font-bold text-slate-400">{new Date(prop.expirationDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                    </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex flex-1 items-center gap-1.5 overflow-hidden">
                        {getStatusBadge(prop.stage, prop.status)}
                        {nextTask && (
                            <span className={`inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold ${isTaskOverdue(nextTask) ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300'}`}>
                                <Clock size={11} />
                                <span className="truncate">{nextTask.title}</span>
                            </span>
                        )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                openActivityModal(prop.id, 'Call');
                            }}
                            className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            title="Ligar"
                            aria-label="Ligar"
                        >
                            <PhoneCall size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                openActivityModal(prop.id, 'Follow-up');
                            }}
                            className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] dark:text-[var(--tenant-primary-on-dark)]"
                            title="Follow-up"
                            aria-label="Follow-up"
                        >
                            <Activity size={15} />
                        </button>
                    </div>
                </div>
            </article>
        );
    };



    return (
        <div className="flex h-full w-full relative">
            {/* Main Content Area */}
            <div
                className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--tenant-bg)] dark:bg-[var(--tenant-bg-dark)] transition-colors"
                onClick={() => selectedPreviewId && closePreviewPanel()}
            >
                {/* Header Section */}
                <div className="shrink-0 space-y-3 p-3 pt-4 sm:space-y-6 sm:p-6 sm:pt-5 lg:p-8 lg:pt-5 lg:pb-6">
                    <PageHeader
                        icon={PieChart}
                        title="Oportunidades e Propostas"
                        subtitle="Pipeline comercial, cotações e próximas atividades."
                        actions={
                        <>
                            {businessUnit === 'SERVICES' && hasServicesModule && (
                                <div className="flex p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                                    <button
                                        onClick={() => setPipelineFilter('CONTINUOUS')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${pipelineFilter === 'CONTINUOUS' ? 'bg-[var(--tenant-primary)] text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                    >
                                        <Repeat size={14} /> Contínuo
                                    </button>
                                    <button
                                        onClick={() => setPipelineFilter('SPOT')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${pipelineFilter === 'SPOT' ? 'bg-[var(--tenant-primary)] text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                    >
                                        <Zap size={14} /> Spot
                                    </button>
                                </div>
                            )}

                            {businessUnit === 'PRODUCTS' && hasSaasModule && (
                                <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-800 dark:bg-slate-900 sm:flex">
                                    <CreditCard size={16} className="text-slate-700 dark:text-slate-200" />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Assinatura SaaS</span>
                                </div>
                            )}

                            {businessUnit === 'PRODUCTS' && hasProductModule && !hasSaasModule && (
                                <div className="hidden items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2 dark:border-emerald-800 dark:bg-emerald-900/20 sm:flex">
                                    <Package size={16} className="text-emerald-600" />
                                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Hub de Produtos</span>
                                </div>
                            )}

                            <div className="bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex transition-colors">
                                <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`} title="Kanban"><LayoutGrid size={20} /></button>
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`} title="Lista"><List size={20} /></button>
                            </div>
                            <button
                                onClick={() => setShowFrozen(!showFrozen)}
                                title={showFrozen ? 'Ocultar congelados' : 'Mostrar congelados'}
                                aria-label={showFrozen ? 'Ocultar congelados' : 'Mostrar congelados'}
                                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-all ${showFrozen ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}
                            >
                                <Snowflake size={16} />
                                <span className="hidden sm:inline">{showFrozen ? 'Ocultar Congelados' : 'Mostrar Congelados'}</span>
                            </button>
                            <div className="hidden h-10 w-px bg-slate-200 dark:bg-slate-800 mx-1 transition-colors sm:block"></div>
                            <Button
                                type="button"
                                variant="secondary"
                                icon={Activity}
                                className="min-h-11 flex-1 sm:w-auto sm:flex-none"
                                onClick={() => openQuickActivityModal('Call')}
                            >
                                Apontar
                            </Button>
                            <Button
                                type="button"
                                icon={Plus}
                                className="min-h-11 flex-1 sm:w-auto sm:flex-none"
                                onClick={() => {
                                if (businessUnit === 'PRODUCTS' && hasProductModule) {
                                    setCreateType('PRODUCT');
                                    setCreatePricingModule(hasSaasModule ? 'SAAS_SUBSCRIPTION' : hasIotModule ? 'IOT_SUBSCRIPTION' : 'PRODUCT_SALES');
                                    setCreateStep(2);
                                } else if (!hasServicesModule) {
                                    return;
                                } else {
                                    setCreateStep(1);
                                }
                                setCreateClientId('');
                                setCreateInlineClientName('');
                                setCreateError(null);
                                setCreateMotion('NewBusiness');
                                setCreateReferenceId('');
                                setShowCreateModal(true);
                            }}
                        >
                            <span className="sm:hidden">Nova</span>
                            <span className="hidden sm:inline">Nova Cotação</span>
                        </Button>
                        </>
                        }
                    />
                    <div className="grid grid-cols-4 gap-2 sm:hidden">
                        {[
                            { type: 'Call' as CRMTask['type'], label: 'Ligar', icon: PhoneCall },
                            { type: 'Meeting' as CRMTask['type'], label: 'Reunião', icon: CalendarDays },
                            { type: 'Follow-up' as CRMTask['type'], label: 'Follow', icon: Activity },
                            { type: 'Other' as CRMTask['type'], label: 'Nota', icon: FileText }
                        ].map(item => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.type}
                                    type="button"
                                    onClick={() => openQuickActivityModal(item.type)}
                                    className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-1 text-[10px] font-black text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                                >
                                    <Icon size={16} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden px-3 pb-4 sm:px-6 lg:px-8 lg:pb-8 flex flex-col">
                    {viewMode === 'list' ? (
                        /* LIST VIEW */
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full w-full transition-colors">
                            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50/30 p-2.5 dark:border-slate-800 dark:bg-slate-900/30 sm:gap-4 sm:p-4">
                                <Search className="text-slate-400 dark:text-slate-500" size={18} />
                                <input
                                    type="text"
                                placeholder="Filtrar por cliente, ID ou responsável..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-transparent outline-none text-sm w-full font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                                />
                            </div>
                            <div className="flex-1 space-y-3 overflow-y-auto p-3 custom-scrollbar lg:hidden">
                                {filteredProposals.map(renderProposalMobileCard)}
                                {filteredProposals.length === 0 && (
                                    <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center dark:border-slate-800 dark:bg-slate-900/50">
                                        <Search className="mx-auto mb-3 text-slate-300" size={28} />
                                        <p className="text-sm font-black text-slate-600 dark:text-slate-300">Nenhuma oportunidade encontrada</p>
                                    </div>
                                )}
                            </div>
                            <div className="hidden overflow-auto flex-1 custom-scrollbar lg:block">
                                <table className="w-full text-sm text-left relative">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm transition-colors">
                                        <tr>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">ID / Cliente</th>
                                            <th className="px-6 py-4">Tipo</th>
                                            <th className="px-6 py-4">Responsável</th>
                                            <th className="px-6 py-4">Valor</th>
                                            <th className="px-6 py-4">Vencimento</th>
                                            <th className="px-6 py-4 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 cursor-pointer transition-colors text-slate-800 dark:text-slate-200">
                                        {filteredProposals.map((prop) => {
                                            const isSelected = selectedPreviewId === prop.id;
                                            return (
                                                <tr
                                                    key={prop.id}
                                                    onClick={(e) => { e.stopPropagation(); handleRowClick(prop.id); }}
                                                    onDoubleClick={() => onSelectProposal(prop.id)}
                                                    onContextMenu={(e) => handleContextMenu(e, prop.id)}
                                                    className={`transition-all group border-l-[6px] ${isSelected ? 'bg-slate-50 dark:bg-slate-800/50 border-l-[var(--tenant-primary)] shadow-inner' : 'border-l-transparent hover:bg-slate-50/60 dark:hover:bg-slate-800/30 hover:border-l-slate-200 dark:hover:border-l-slate-700'} ${prop.status === 'Frozen' ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                                >
                                                    <td className="px-6 py-4">{getStatusBadge(prop.stage, prop.status)}</td>
                                                    <td className="px-6 py-4">
                                                        <div className={`font-bold transition-colors ${isSelected ? 'text-[var(--tenant-primary)]' : 'text-slate-800 dark:text-slate-200'}`}>{prop.clientName}</div>
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5 transition-colors">#{prop.proposalId} <span className="bg-slate-100 dark:bg-slate-800 px-1 rounded ml-1 transition-colors">v{prop.version}</span></p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border transition-colors ${prop.type === 'SPOT' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' : prop.type === 'PRODUCT' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'}`}>
                                                            {getProposalTypeLabel(prop)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 transition-colors">
                                                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 transition-colors">{prop.responsible.charAt(0)}</div>
                                                            <span className="text-xs font-medium">{prop.responsible}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100 transition-colors">{formatCurrency(prop.value)}</td>
                                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs transition-colors">{new Date(prop.expirationDate).toLocaleDateString('pt-BR')}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button onClick={(e) => { e.stopPropagation(); onSelectProposal(prop.id); }} className="text-blue-600 dark:text-blue-400 font-bold text-xs hover:underline bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800 transition-colors">
                                                            Abrir
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        /* KANBAN BOARD */
                        <div className="flex gap-6 h-full overflow-x-auto pb-2 custom-scrollbar items-stretch snap-x">
                            {kanbanColumns.map(col => {
                                const colProposals = filteredProposals.filter(p => p.stage === col.id);

                                return (
                                    <div
                                        key={col.id}
                                        className="flex flex-col h-full rounded-xl overflow-hidden bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 min-w-[280px] w-full max-w-[320px] shrink-0 snap-center transition-colors"
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, col.id)}
                                    >
                                        {/* Column Header */}
                                        <div className={`flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 ${col.headerBg} dark:bg-slate-800/40 backdrop-blur-sm sticky top-0 z-10 transition-colors`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${col.bg.replace('bg-', 'bg-').replace('-50', '-500')}`}></div>
                                                <h3 className={`font-bold text-sm text-slate-700 dark:text-slate-100 transition-colors`}>{col.label}</h3>
                                            </div>
                                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">{colProposals.length}</span>
                                        </div>

                                        {/* Column Content */}
                                        <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                                            {colProposals
                                                .filter(p => viewMode === 'list' || p.type === pipelineFilter)
                                                .map(prop => (
                                                    <div
                                                        key={prop.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, prop.id)}
                                                        onClick={(e) => { e.stopPropagation(); handleRowClick(prop.id); }}
                                                        onDoubleClick={() => onSelectProposal(prop.id)}
                                                        onContextMenu={(e) => handleContextMenu(e, prop.id)}
                                                        className={`
                                                    group bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:-translate-y-1 relative overflow-hidden
                                                    ${selectedPreviewId === prop.id ? 'ring-2 ring-[var(--tenant-primary)] shadow-md' : 'border-slate-200 dark:border-slate-700'}
                                                    border-l-[6px] ${col.border}
                                                    ${prop.status === 'Frozen' ? 'grayscale-[0.8] opacity-70 bg-slate-50/50 dark:bg-slate-900/50' : ''}
                                                `}
                                                    >
                                                        {prop.status === 'Frozen' && (
                                                            <div className="absolute top-0 right-0 p-1 bg-blue-900/10 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 rounded-bl-lg transition-colors" title="Congelada">
                                                                <Snowflake size={14} />
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between items-start mb-3">
                                                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 px-1.5 rounded border border-slate-100 dark:border-slate-700 transition-colors">
                                                                #{prop.proposalId} v{prop.version}
                                                            </span>
                                                            <div className="flex gap-1 items-center">
                                                                {getMotionBadge(prop.motion)}
                                                                {prop.type === 'SPOT' && <Zap size={14} className="text-amber-500" title="Projeto Spot" />}
                                                                {prop.pricingModule === 'SAAS_SUBSCRIPTION' ? <CreditCard size={14} className="text-slate-500" title="Assinatura SaaS" /> : prop.type === 'PRODUCT' && <Package size={14} className="text-emerald-500" title="Cotação de Produtos" />}
                                                                <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        </div>

                                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 leading-tight line-clamp-2 transition-colors">{prop.clientName}</h4>
                                                        {(() => {
                                                            const nextTask = getPendingProposalTasks(prop.id)[0];
                                                            if (!nextTask) return null;
                                                            return (
                                                                <div className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                                                                    <Clock size={11} />
                                                                    <span className="truncate">{nextTask.title}</span>
                                                                    <span className="shrink-0">{new Date(nextTask.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                                                </div>
                                                            );
                                                        })()}

                                                        <div className="flex justify-between items-end">
                                                            <div>
                                                                <p className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight transition-colors">{formatCurrency(prop.value)}</p>
                                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium transition-colors">Margem: <span className={prop.markup < 0.15 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'}>{formatPercent(prop.markup)}</span></p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {prop.markup < 0.15 && (
                                                                    <div className="w-5 h-5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center animate-pulse" title="Margem abaixo do limite (15%)">
                                                                        <AlertCircle size={12} />
                                                                    </div>
                                                                )}
                                                                <div className="p-2 bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 rounded-lg group-hover:bg-[var(--tenant-primary)] group-hover:text-white dark:group-hover:text-white transition-colors">
                                                                    <ArrowRight size={14} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT SIDEBAR PREVIEW OVERLAY */}
            {selectedProposal && (
                <ResponsiveDrawer
                    open={Boolean(selectedProposal)}
                    onClose={closePreviewPanel}
                    panelClassName="overflow-x-hidden"
                >
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${selectedProposal.type === 'SPOT' ? 'bg-amber-100 text-amber-700' : selectedProposal.type === 'PRODUCT' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                {getProposalTypeLabel(selectedProposal).toUpperCase()}
                            </span>
                            <button onClick={closePreviewPanel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><XCircle size={20} /></button>
                        </div>
                        <h2 className="font-bold text-xl text-slate-800 dark:text-slate-100 leading-tight mb-1">{selectedProposal.clientName}</h2>

                        {selectedProposal.versionNotes && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-100 dark:border-amber-800 mt-2 italic shadow-sm">
                                Nota Nota da versão: {selectedProposal.versionNotes}
                            </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                            {getStatusBadge(selectedProposal.stage, selectedProposal.status)}
                            {getMotionBadge(selectedProposal.motion)}
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${selectedProposal.type === 'SPOT' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' : selectedProposal.type === 'PRODUCT' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'}`}>
                                {getProposalTypeLabel(selectedProposal)}
                            </span>
                        </div>

                        {/* Responsible and Version Info */}
                        <div className="mt-4 flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><User size={14} /> Vendedor Resp.</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{selectedProposal.responsible}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Copy size={14} /> Histórico de Versões</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">Versão {selectedProposal.version} <span className="font-normal text-slate-400">({selectedProposal.versionStatus})</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">

                        {/* TABS */}
                        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 pt-2 px-5 shrink-0 sticky top-0 z-10 transition-colors">
                            <button
                                onClick={() => setActiveRightPanelTab('overview')}
                                className={`pb-3 px-2 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2 ${activeRightPanelTab === 'overview' ? 'border-[var(--tenant-primary)] text-[var(--tenant-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                Visão Geral
                            </button>
                            <button
                                onClick={() => setActiveRightPanelTab('activities')}
                                className={`pb-3 px-2 ml-5 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 ${activeRightPanelTab === 'activities' ? 'border-[var(--tenant-primary)] text-[var(--tenant-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                <Activity size={14} /> Atividades
                            </button>
                            <button
                                onClick={() => setActiveRightPanelTab('timeline')}
                                className={`pb-3 px-2 ml-5 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 ${activeRightPanelTab === 'timeline' ? 'border-[var(--tenant-primary)] text-[var(--tenant-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                <History size={14} /> Histórico
                            </button>
                        </div>

                        <div className="p-5 space-y-5 flex-1 min-w-0">
                            {activeRightPanelTab === 'overview' && (
                                <>
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Workspace</h4>
                                                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                    {connectedProviders.length > 0 ? connectedProviders.map(getProviderLabel).join(' + ') : 'Não conectado'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                            <button
                                                disabled={connectedProviders.length === 0 || workspaceLoading || (!onSendGoogleEmail && !onSendMicrosoftEmail)}
                                                onClick={() => openEmailComposer(selectedProposal.id)}
                                                className="rounded-lg bg-[var(--tenant-primary)] px-3 py-2 text-xs font-bold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                E-mail
                                            </button>
                                            <button
                                                disabled={connectedProviders.length === 0 || workspaceLoading || (!onCreateGoogleMeeting && !onCreateMicrosoftMeeting)}
                                                onClick={() => openMeetingScheduler(selectedProposal.id)}
                                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Reunião
                                            </button>
                                            <button
                                                disabled={connectedProviders.length === 0 || workspaceLoading || (!onSyncGoogle && !onSyncMicrosoft)}
                                                onClick={async () => {
                                                    try {
                                                        if (googleConnection.connected) await onSyncGoogle?.();
                                                        if (microsoftConnection.connected) await onSyncMicrosoft?.();
                                                    } catch (error) {
                                                        console.error('Erro ao sincronizar workspace', error);
                                                    }
                                                }}
                                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                            >
                                                {workspaceLoading ? 'Sincronizando...' : 'Sincronizar'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* FINANCIAL SUMMARY BLOCK */}
                                    {(() => {
                                        if (!selectedProposal) return null;
                                        const financials = calculateFinancials(selectedProposal);
                                        const isSaas = selectedProposal.pricingModule === 'SAAS_SUBSCRIPTION';
                                        const saasGrossMrr = (selectedProposal.saasUnitPrice || 0) * (selectedProposal.saasQuantity || 1);
                                        const saasNetMrr = Math.max(0, saasGrossMrr - (saasGrossMrr * (selectedProposal.saasMonthlyDiscount || 0)));
                                        const saasTaxRate = selectedProposal.taxConfig.salesTaxes.filter(tax => tax.active).reduce((sum, tax) => sum + tax.rate, 0) || 0;
                                        const displayMonthlyValue = isSaas ? saasNetMrr : financials.monthlyValue;
                                        const displayTaxRate = isSaas ? saasTaxRate : financials.salesTaxAmount / (financials.monthlyValue || 1);
                                        const totalHeadcount = Math.round(selectedProposal.roles?.reduce((acc, r) => acc + r.quantity, 0) * 10) / 10; // Arredonda para 1 casa decimal se necessário

                                        return (
                                            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                                                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center gap-2">
                                                    <PieChart size={14} /> Resumo da Cotação
                                                </h4>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-lg shadow-sm">
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Preço (Mensal)</p>
                                                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(displayMonthlyValue)}</p>
                                                    </div>
                                                    <div className={`border p-3 rounded-lg shadow-sm ${selectedProposal.targetMargin < 0.15 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Margem (Target)</p>
                                                        <p className={`text-lg font-black ${selectedProposal.targetMargin < 0.15 ? 'text-red-600 dark:text-red-400' : 'text-[var(--tenant-primary)]'}`}>
                                                            {formatPercent(selectedProposal.targetMargin)}
                                                        </p>
                                                    </div>
                                                    {selectedProposal.type === 'CONTINUOUS' && (
                                                        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-lg shadow-sm">
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Total de Vidas (HC)</p>
                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Users size={14} className="text-slate-400" /> {totalHeadcount}</p>
                                                        </div>
                                                    )}
                                                    {selectedProposal.type === 'SPOT' && (
                                                        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-lg shadow-sm">
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Recursos Alocados</p>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Users size={14} className="text-slate-400" /> {selectedProposal.spotResources?.reduce((acc, r) => acc + r.quantity, 0) || 0} diárias</p>
                                                        </div>
                                                    )}
                                                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-lg shadow-sm">
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Carga Trib. s/ Venda</p>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Landmark size={14} className="text-slate-400" /> {formatPercent(displayTaxRate)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* ALERT: Margin Validation */}
                                    {selectedProposal.targetMargin < 0.15 && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex gap-3 animate-pulse">
                                            <XCircle className="text-red-600 dark:text-red-400 shrink-0" size={20} />
                                            <div>
                                                <p className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-tight">Alerta de Viabilidade</p>
                                                <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">A margem desta proposta ({formatPercent(selectedProposal.markup)}) está abaixo do limite de 15%. Requer aprovação da diretoria.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Status/Stage Selectors */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Etapa (Funil)</label>
                                            <select
                                                disabled={selectedProposal.status === 'Archived'}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                value={selectedProposal.stage}
                                                onChange={async (e) => {
                                                    try {
                                                        await onUpdateStage(selectedProposal.id, e.target.value as OpportunityStage);
                                                        closePreviewPanel();
                                                    } catch (error) {
                                                        console.error('Erro ao atualizar etapa', error);
                                                    }
                                                }}
                                            >
                                                {selectedProposal.type === 'CONTINUOUS' ? (
                                                    <>
                                                        {CONTINUOUS_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                                                    </>
                                                ) : (
                                                    <>
                                                        {SPOT_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estado Transversal</label>
                                            <select
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] outline-none transition-colors"
                                                value={selectedProposal.status}
                                                onChange={async (e) => {
                                                    const newStatus = e.target.value as OpportunityStatus;
                                                    if (newStatus === 'Frozen') {
                                                        setActionProposalId(selectedProposal.id);
                                                        setTempNotes('');
                                                        setTempFrozenUntil('');
                                                        setIsFrozenModalOpen(true);
                                                    } else {
                                                        try {
                                                            await onUpdateStatus(selectedProposal.id, newStatus);
                                                            closePreviewPanel();
                                                        } catch (error) {
                                                            console.error('Erro ao atualizar status', error);
                                                        }
                                                    }
                                                }}
                                            >
                                                <option value="Active">Ativo</option>
                                                <option value="Frozen">Congelado</option>
                                                <option value="Archived">Arquivado</option>
                                            </select>
                                        </div>
                                    </div>

                                    {selectedProposal.status === 'Frozen' && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
                                            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-400 font-bold text-xs uppercase">
                                                <Snowflake size={14} /> Detalhes do Congelamento
                                            </div>
                                            <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Motivo: <span className="font-normal italic text-blue-600 dark:text-blue-400">{selectedProposal.frozenReason}</span></p>
                                            {selectedProposal.frozenUntil && (
                                                <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Revisar em: <span className="font-normal italic text-blue-600 dark:text-blue-400">{new Date(selectedProposal.frozenUntil).toLocaleDateString()}</span></p>
                                            )}
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await onUpdateStatus(selectedProposal.id, 'Active');
                                                        closePreviewPanel();
                                                    } catch (error) {
                                                        console.error('Erro ao reativar oportunidade', error);
                                                    }
                                                }}
                                                className="w-full mt-2 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-colors"
                                            >
                                                Reativar Oportunidade (Unfreeze)
                                            </button>
                                        </div>
                                    )}

                                    {false && <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <Activity size={14} /> Próximas atividades
                                            </h4>
                                            <button
                                                onClick={() => openActivityModal(selectedProposal.id, 'Follow-up')}
                                                className="text-[var(--tenant-primary)] hover:brightness-90 text-xs font-bold transition-colors"
                                            >
                                                + Cadastrar
                                            </button>
                                        </div>
                                        {getPendingProposalTasks(selectedProposal.id).length === 0 ? (
                                            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">Nenhuma atividade pendente.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {getPendingProposalTasks(selectedProposal.id).slice(0, 3).map(task => {
                                                    const contact = contacts.find(c => c.id === task.contactId);
                                                    return (
                                                        <div key={task.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{task.title}</p>
                                                                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{contact?.name || 'Sem contato'} ? {task.type}</p>
                                                                </div>
                                                                <span className="shrink-0 rounded bg-white px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                                    {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>}

                                    {renderProposalAttachments(selectedProposal.id)}

                                    {/* MILESTONES SECTION */}
                                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <Calendar size={14} /> Eventos e Prazos
                                            </h4>
                                            <button
                                                onClick={() => isAddingMilestone ? closeMilestoneForm() : setIsAddingMilestone(true)}
                                                className="text-[var(--tenant-primary)] hover:brightness-90 text-xs font-bold transition-colors"
                                            >
                                                {isAddingMilestone ? 'Cancelar' : '+ Cadastrar'}
                                            </button>
                                        </div>

                                        {isAddingMilestone && (
                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="Ex: Confirmação de Visita Técnica"
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[var(--tenant-primary)]"
                                                    value={tempMilestoneTitle}
                                                    onChange={(e) => setTempMilestoneTitle(e.target.value)}
                                                />
                                                <input
                                                    type="date"
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[var(--tenant-primary)]"
                                                    value={tempMilestoneDate}
                                                    onChange={(e) => setTempMilestoneDate(e.target.value)}
                                                />
                                                <button
                                                    disabled={!tempMilestoneTitle || !tempMilestoneDate}
                                                    onClick={async () => {
                                                        const newMilestone = {
                                                            id: Math.random().toString(36).substr(2, 9),
                                                            title: tempMilestoneTitle,
                                                            date: tempMilestoneDate,
                                                            completed: false
                                                        };
                                                        try {
                                                            await onUpdateMilestones(selectedProposal.id, [...(selectedProposal.milestones || []), newMilestone]);
                                                            closeMilestoneForm();
                                                        } catch (error) {
                                                            console.error('Erro ao salvar evento', error);
                                                        }
                                                    }}
                                                    className="w-full bg-[var(--tenant-primary)] hover:brightness-95 text-white text-xs font-bold py-1.5 rounded transition-colors disabled:opacity-50"
                                                >
                                                    Salvar Evento
                                                </button>
                                            </div>
                                        )}

                                        {(!selectedProposal.milestones || selectedProposal.milestones.length === 0) && !isAddingMilestone && (
                                            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">Nenhum evento registrado.</p>
                                        )}

                                        {selectedProposal.milestones && selectedProposal.milestones.length > 0 && (
                                            <div className="space-y-3">
                                                {[...selectedProposal.milestones]
                                                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                                    .map((m) => (
                                                        <div key={m.id} className="flex gap-3 group relative pl-4 border-l-2 border-slate-100 dark:border-slate-700 hover:border-[var(--tenant-primary)] transition-colors">
                                                            <div className="absolute -left-[9px] top-0.5 bg-white dark:bg-slate-800 rounded-full">
                                                                <button
                                                                    onClick={async () => {
                                                                        const updated = selectedProposal.milestones!.map(ms => ms.id === m.id ? { ...ms, completed: !ms.completed } : ms);
                                                                        await onUpdateMilestones(selectedProposal.id, updated);
                                                                    }}
                                                                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${m.completed ? 'bg-[var(--tenant-primary)] border-[var(--tenant-primary)] text-white' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-transparent hover:border-[var(--tenant-primary)]'}`}
                                                                >
                                                                    <CheckCircle size={10} className={m.completed ? 'opacity-100' : 'opacity-0 hover:opacity-100 text-[var(--tenant-primary)]'} />
                                                                </button>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-bold truncate transition-all ${m.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                    {m.title}
                                                                </p>
                                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                                                    <Clock size={10} /> {new Date(m.date).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                            <button
                                                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all px-1"
                                                                onClick={async () => {
                                                                    const updated = selectedProposal.milestones!.filter(ms => ms.id !== m.id);
                                                                    await onUpdateMilestones(selectedProposal.id, updated);
                                                                }}
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {activeRightPanelTab === 'activities' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Kanban de atividades</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Tarefas vinculadas a esta oportunidade.</p>
                                        </div>
                                        <button
                                            onClick={() => openActivityModal(selectedProposal.id, 'Follow-up')}
                                            className="rounded-lg bg-[var(--tenant-primary)] px-3 py-2 text-xs font-bold text-white hover:brightness-95 transition-colors"
                                        >
                                            + Cadastrar
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        {(['To Do', 'In Progress', 'Done'] as CRMTask['status'][]).map(status => {
                                            const statusTasks = getProposalTasks(selectedProposal.id)
                                                .filter(task => task.status === status)
                                                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
                                            return (
                                                <div key={status} className="min-h-[360px] rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/40">
                                                    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                                                        <span className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300">{getTaskStatusLabel(status)}</span>
                                                        <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">{statusTasks.length}</span>
                                                    </div>
                                                    <div className="space-y-2 p-2">
                                                        {statusTasks.length === 0 ? (
                                                            <div className="rounded-lg border border-dashed border-slate-200 bg-white/60 px-2 py-6 text-center text-[11px] font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-500">
                                                                Sem atividades.
                                                            </div>
                                                        ) : statusTasks.map(task => {
                                                            const contact = contacts.find(c => c.id === task.contactId);
                                                            const overdue = isTaskOverdue(task);
                                                            return (
                                                                <div key={task.id} className={`rounded-lg border bg-white p-3 shadow-sm dark:bg-slate-900 ${overdue ? 'border-red-200 dark:border-red-900/60' : 'border-slate-200 dark:border-slate-800'}`}>
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">{getTaskTypeLabel(task.type)}</span>
                                                                        <span className={`text-[10px] font-bold ${overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                            {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                    <p className="mt-2 text-xs font-black leading-snug text-slate-800 dark:text-slate-100">{task.title}</p>
                                                                    {task.description && <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">{task.description}</p>}
                                                                    <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[10px] font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                                                        <div className="flex items-center gap-1.5"><User size={11} /> {contact?.name || 'Sem contato'}</div>
                                                                        <div className="flex items-center gap-1.5"><Clock size={11} /> {task.assignee || selectedProposal.responsible}</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {activeRightPanelTab === 'timeline' && (() => {
                                const traceability = getProposalTraceability(selectedProposal);
                                const hasEvents = traceability.timeline.length > 0;
                                return (
                                    <div className="space-y-5">
                                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Conversas</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Threads de e-mail vinculadas a esta proposta.</p>
                                                </div>
                                                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400">{traceability.threads.length}</span>
                                            </div>
                                            {traceability.threads.length === 0 ? (
                                                <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">Nenhuma conversa vinculada.</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {traceability.threads.map(thread => (
                                                        <div key={thread.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="break-words text-sm font-black text-slate-800 dark:text-slate-100">{thread.subject}</p>
                                                                    <p className="mt-1 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">{thread.participants.slice(0, 3).join(', ')}</p>
                                                                </div>
                                                                <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-500 dark:bg-slate-900">{thread.provider === 'microsoft' ? 'Outlook' : 'Gmail'}</span>
                                                            </div>
                                                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                                <span>{thread.messages.length} mensagens</span>
                                                                <span>{thread.inboundCount} recebidas</span>
                                                                <span>Ultima: {new Date(getCommunicationDate(thread.lastMessage)).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                            </div>
                                                            <div className="mt-3 space-y-2">
                                                                {thread.messages.slice(-3).map(message => (
                                                                    <div key={message.id} className={`rounded-md border px-3 py-2 ${message.direction === 'inbound' ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{message.direction === 'inbound' ? 'Resposta recebida' : 'E-mail enviado'}</span>
                                                                            <span className="text-[10px] font-semibold text-slate-500">{new Date(getCommunicationDate(message)).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                                        </div>
                                                                        {message.bodyPreview && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-400">{message.bodyPreview}</p>}
                                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                                            {message.externalUrl && <a href={message.externalUrl} target="_blank" rel="noreferrer" className="text-[10px] font-black text-[var(--tenant-primary)] hover:underline">Abrir no e-mail</a>}
                                                                            {message.direction === 'inbound' && (message.taskId ? (
                                                                                <button type="button" onClick={() => setActiveRightPanelTab('activities')} className="text-[10px] font-black text-slate-600 hover:text-[var(--tenant-primary)] dark:text-slate-300">Abrir tarefa relacionada</button>
                                                                            ) : (
                                                                                <button type="button" onClick={() => openReplyTaskFromCommunication(message)} className="text-[10px] font-black text-[var(--tenant-primary)] hover:underline">Criar tarefa de resposta</button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                            <div className="mb-4">
                                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Linha do tempo comercial</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">E-mails, reunioes, tarefas e mudancas da proposta em ordem cronologica.</p>
                                            </div>
                                            {!hasEvents ? (
                                                <div className="text-center py-10">
                                                    <History className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={32} />
                                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Nenhum evento registrado ainda.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-5">
                                                    {Object.entries(traceability.groupedTimeline).map(([day, items]) => (
                                                        <div key={day}>
                                                            <div className="mb-3 flex items-center gap-3">
                                                                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">{day}</span>
                                                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                                                            </div>
                                                            <div className="space-y-3">
                                                                {items.map(item => {
                                                                    const communication = item.kind === 'communication' ? item.communication : null;
                                                                    const event = item.kind === 'external_event' ? item.event : null;
                                                                    const task = item.kind === 'task' ? item.task : null;
                                                                    const legacy = item.kind === 'timeline' ? item.event : null;
                                                                    return (
                                                                        <div key={item.id} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                                                                            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${communication.direction === 'inbound' ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)]'}`}>
                                                                                {communication ? <MailCheck size={14} /> : event ? <CalendarDays size={14} /> : task ? <CheckCircle size={14} /> : <Activity size={14} />}
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                                    <p className="break-words text-xs font-black text-slate-800 dark:text-slate-100">
                                                                                        {communication ? `${communication.direction === 'inbound' ? 'Resposta recebida' : 'E-mail enviado'}: ${communication.subject || '(sem assunto)'}` : event ? event.title : task ? task.title : legacy.title}
                                                                                    </p>
                                                                                    <span className="text-[10px] font-semibold text-slate-500">{new Date(item.date).toLocaleString([], { timeStyle: 'short' })}</span>
                                                                                </div>
                                                                                {communication.bodyPreview && <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{communication.bodyPreview}</p>}
                                                                                {event.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{event.description}</p>}
                                                                                {task.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{task.description}</p>}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>



                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0 transition-colors">
                        <button
                            onClick={() => onSelectProposal(selectedProposal.id)}
                            className="w-full py-3 bg-[var(--tenant-primary)] text-white rounded-lg font-bold hover:brightness-95 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            Abrir Editor Completo <ArrowRight size={16} />
                        </button>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <button
                                onClick={() => {
                                    setActionProposalId(selectedProposal.id);
                                    setTempNotes('');
                                    setIsNewVersionModalOpen(true);
                                }}
                                className="py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-[var(--tenant-primary)] transition-colors flex items-center justify-center gap-1"
                                title="Cria versão 2, 3... da mesma proposta"
                            >
                                <Repeat size={14} /> Nova Versão
                            </button>
                            <button
                                onClick={() => onDuplicateProposal(selectedProposal.id)}
                                className="py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-[var(--tenant-primary)] transition-colors flex items-center justify-center gap-1"
                                title="Cria uma cotação v1 com um novo ID"
                            >
                                <Copy size={14} /> Duplicar
                            </button>
                        </div>
                        <button onClick={() => onDeleteProposal(selectedProposal.id)} className="w-full mt-2 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors">Arquivar / Descartar</button>
                    </div>
                </ResponsiveDrawer>
            )
            }

            {/* CREATE MODAL */}
            {
                showCreateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border dark:border-slate-800 transition-colors">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 relative">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center">Nova Oportunidade Comercial</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center">
                                    {createStep === 1 ? 'Selecione o tipo de projeto' : 'Detalhes da Oportunidade'}
                                </p>
                                {createStep === 2 && businessUnit === 'SERVICES' && (
                                    <button onClick={() => setCreateStep(1)} className="absolute left-6 top-6 text-slate-400 hover:text-slate-700">
                                        <ArrowRight size={20} className="rotate-180" />
                                    </button>
                                )}
                            </div>

                            {createStep === 1 && (
                                <div className={`p-6 grid grid-cols-1 ${businessUnit === 'SERVICES' ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4`}>
                                    {businessUnit === 'SERVICES' && hasServicesModule && (
                                        <>
                                            <button
                                                onClick={() => { setCreateType('CONTINUOUS'); setCreatePricingModule('SERVICES_COMPLEX'); setCreateStep(2); }}
                                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all group"
                                            >
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-full text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shadow-sm">
                                                    <Repeat size={28} />
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm">Contrato Mensal</h4>
                                                    <p className="text-[9px] text-blue-600 dark:text-blue-400 mt-1">Mão de obra fixa, custos recorrentes.</p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => { setCreateType('SPOT'); setCreatePricingModule('SERVICES_COMPLEX'); setCreateStep(2); }}
                                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 hover:border-amber-500 dark:hover:border-amber-400 hover:shadow-lg transition-all group"
                                            >
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-full text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shadow-sm">
                                                    <Zap size={28} />
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Projeto Spot</h4>
                                                    <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-1">Consultoria pontual, auditorias.</p>
                                                </div>
                                            </button>
                                        </>
                                    )}

                                    {businessUnit === 'PRODUCTS' && hasSaasModule && (
                                        <button
                                            onClick={() => { setCreateType('PRODUCT'); setCreatePricingModule('SAAS_SUBSCRIPTION'); setCreateStep(2); }}
                                            className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-slate-500 dark:hover:border-slate-500 hover:shadow-lg transition-all group"
                                        >
                                            <div className="p-3 bg-white dark:bg-slate-800 rounded-full text-slate-800 dark:text-slate-100 group-hover:scale-110 transition-transform shadow-sm">
                                                <CreditCard size={28} />
                                            </div>
                                            <div className="text-center">
                                                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Assinatura SaaS</h4>
                                                <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">Mensalidade, licenças e implantação.</p>
                                            </div>
                                        </button>
                                    )}

                                    {businessUnit === 'PRODUCTS' && hasProductSalesModule && (
                                        <button
                                            onClick={() => { setCreateType('PRODUCT'); setCreatePricingModule('PRODUCT_SALES'); setCreateStep(2); }}
                                            className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/20 hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-lg transition-all group"
                                        >
                                            <div className="p-3 bg-white dark:bg-slate-800 rounded-full text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shadow-sm">
                                                <Package size={28} />
                                            </div>
                                            <div className="text-center">
                                                <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">Produtos</h4>
                                                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1">Cotação de produtos, peças e hardware.</p>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            )}

                            {createStep === 2 && (
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Cliente</label>
                                        {clients && clients.length > 0 ? (
                                            <div className="space-y-2">
                                                <select
                                                    value={createClientId}
                                                    onChange={(e) => {
                                                        setCreateClientId(e.target.value);
                                                        if (e.target.value) setCreateInlineClientName('');
                                                    }}
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-colors"
                                                >
                                                    <option value="">Selecione um cliente</option>
                                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                                <input
                                                    value={createInlineClientName}
                                                    onChange={(e) => {
                                                        setCreateInlineClientName(e.target.value);
                                                        if (e.target.value.trim()) setCreateClientId('');
                                                    }}
                                                    placeholder="Ou cadastre novo cliente nesta cotação"
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-colors"
                                                />
                                            </div>
                                        ) : (
                                            <input
                                                value={createInlineClientName}
                                                onChange={(e) => setCreateInlineClientName(e.target.value)}
                                                placeholder="Nome do primeiro cliente deste tenant"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-colors"
                                            />
                                        )}
                                    </div>

                                    {businessUnit === 'SERVICES' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Movimento / Motivo</label>
                                            <select
                                                value={createMotion}
                                                onChange={(e) => {
                                                    setCreateMotion(e.target.value as OpportunityMotion);
                                                    setCreateReferenceId('');
                                                }}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-colors"
                                            >
                                                <option value="NewBusiness">Novo Negócio</option>
                                                <option value="Renewal">Renovação</option>
                                                <option value="Expansion">Expansão</option>
                                                <option value="Addendum">Aditivo</option>
                                                <option value="Reactivation">Reativação</option>
                                            </select>
                                        </div>
                                    )}

                                    {createMotion !== 'NewBusiness' && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Proposta de Referência <span className="text-red-500">*</span></label>
                                            <select
                                                value={createReferenceId}
                                                onChange={(e) => setCreateReferenceId(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-colors"
                                                required
                                            >
                                                <option value="" disabled>Selecione uma proposta ativa relacionada...</option>
                                                {activeProposals
                                                    .filter(p => p.clientId === createClientId && p.stage === 'Won') // Suggesting Won ones only as references initially
                                                    .map(p => (
                                                        <option key={p.id} value={p.id}>#{p.proposalId} - {p.clientName}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    )}

                                    {createMotion === 'Expansion' && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Tipologia da Expansão</label>
                                            <select
                                                value={createExpansionType}
                                                onChange={(e) => setCreateExpansionType(e.target.value as any)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-colors"
                                            >
                                                <option value="Volume">Aumento de Volume/Quantidade</option>
                                                <option value="Scope">Novo Escopo/Serviço Adicional</option>
                                                <option value="Site">Nova Unidade/Site</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="mt-6">
                                        {createError && (
                                            <div className="mb-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-300">
                                                {createError}
                                            </div>
                                        )}
                                        <button
                                            disabled={isCreatingProposal || (createMotion !== 'NewBusiness' && !createReferenceId) || (!createClientId && !createInlineClientName.trim())}
                                            onClick={submitCreateProposal}
                                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isCreatingProposal ? 'Criando...' : 'Confirmar e Criar'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-center transition-colors">
                                <button onClick={closeCreateModal} className="text-slate-500 dark:text-slate-400 text-sm font-bold hover:text-slate-800 dark:hover:text-slate-100 transition-colors">Cancelar</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* CONTEXT MENU */}
            {
                contextMenu && (
                    <div
                        className="fixed isolate bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-600 shadow-2xl shadow-slate-950/45 rounded-lg z-[100] py-1 w-60 animate-in fade-in zoom-in-95 duration-100 font-medium transition-colors"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                                Ações Rápidas
                        </div>
                        <button
                            onClick={() => onSelectProposal(contextMenu.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/90 hover:text-[var(--tenant-primary)] flex items-center gap-2 transition-colors"
                        >
                            <ExternalLink size={14} className="text-slate-400" /> Abrir Editor
                        </button>
                        <button
                            onClick={() => {
                                setActionProposalId(contextMenu.id);
                                setTempNotes('');
                                setIsNewVersionModalOpen(true);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/90 hover:text-[var(--tenant-primary)] flex items-center gap-2 transition-colors"
                        >
                            <Repeat size={14} className="text-slate-400" /> Criar Nova Versão
                        </button>
                        <button
                            onClick={() => onDuplicateProposal(contextMenu.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/90 hover:text-[var(--tenant-primary)] flex items-center gap-2 transition-colors"
                        >
                            <Copy size={14} className="text-slate-400" /> Duplicar (Nova Cotação)
                        </button>
                        {onSaveContact && (
                            <button
                                onClick={() => openContactModal(contextMenu.id)}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/90 hover:text-emerald-600 dark:hover:text-emerald-300 flex items-center gap-2 transition-colors"
                            >
                                <UserPlus size={14} className="text-slate-400" /> Cadastrar Contato
                            </button>
                        )}
                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                            Criar atividade
                        </div>
                        {[
                            { type: 'Meeting' as CRMTask['type'], label: 'Reunião', icon: CalendarDays },
                            { type: 'Call' as CRMTask['type'], label: 'Ligação', icon: PhoneCall },
                            { type: 'Email' as CRMTask['type'], label: 'E-mail', icon: MailCheck },
                            { type: 'Follow-up' as CRMTask['type'], label: 'Follow-up', icon: Activity }
                        ].map(item => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.type}
                                    onClick={() => item.type === 'Email' ? openEmailComposer(contextMenu.id)
                                        : item.type === 'Meeting' ? openMeetingScheduler(contextMenu.id)
                                            : openActivityModal(contextMenu.id, item.type)}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/90 hover:text-[var(--tenant-primary)] flex items-center gap-2 transition-colors"
                                >
                                    <Icon size={14} className="text-slate-400" /> {item.label}
                                </button>
                            );
                        })}
                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                        <button
                            onClick={() => onDeleteProposal(contextMenu.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/60 flex items-center gap-2 transition-colors"
                        >
                            <Trash2 size={14} /> Arquivar
                        </button>
                    </div>
                )
            }
            {/* QUICK ACTIVITY MODAL */}
            {
                activityModal && (() => {
                    const resolvedProposalId = activityModal.proposalId || activityProposalId;
                    const proposal = resolvedProposalId ? proposals.find(p => p.id === resolvedProposalId) : undefined;
                    const selectedClientId = proposal?.clientId || activityModal.clientId || activityClientId;
                    const selectedClient = clients.find(client => client.id === selectedClientId);
                    const clientContacts = contacts.filter(contact => contact.clientId === selectedClientId);
                    const clientProposals = activeProposals.filter(item => item.clientId === selectedClientId);
                    return (
                        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4">
                            <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200 dark:border-slate-800 dark:bg-slate-900 sm:rounded-xl sm:animate-in sm:zoom-in-95">
                                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 sm:p-6">
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Criar atividade</h3>
                                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                            {proposal ? `${proposal.clientName} - #${proposal.proposalId}` : selectedClient?.name || 'Apontamento rapido'}
                                        </p>
                                    </div>
                                    <button onClick={closeActivityModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                                    {activityError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{activityError}</div>}
                                    {activityModal.quick && (
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <label className="space-y-1.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</span>
                                                <select
                                                    value={activityClientId}
                                                    onChange={event => {
                                                        setActivityClientId(event.target.value);
                                                        setActivityProposalId('');
                                                        setActivityContactId('');
                                                    }}
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                                >
                                                    <option value="">Selecione um cliente</option>
                                                    {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                                                </select>
                                            </label>
                                            <label className="space-y-1.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proposta</span>
                                                <select
                                                    value={activityProposalId}
                                                    onChange={event => setActivityProposalId(event.target.value)}
                                                    disabled={!activityClientId}
                                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                                >
                                                    <option value="">Sem proposta especifica</option>
                                                    {clientProposals.map(item => <option key={item.id} value={item.id}>#{item.proposalId} - {item.clientName}</option>)}
                                                </select>
                                            </label>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</span>
                                            <select
                                                value={activityModal.type}
                                                onChange={event => setActivityModal({ ...activityModal, type: event.target.value as CRMTask['type'] })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                            >
                                                <option value="Meeting">Reunião</option>
                                                <option value="Call">Ligação</option>
                                                <option value="Email">E-mail</option>
                                                <option value="Follow-up">Follow-up</option>
                                                <option value="Other">Outro</option>
                                            </select>
                                        </label>
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prazo</span>
                                            <input
                                                type="date"
                                                value={activityDueDate}
                                                onChange={event => setActivityDueDate(event.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                            />
                                        </label>
                                    </div>
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Título</span>
                                        <input
                                            value={activityTitle}
                                            onChange={event => setActivityTitle(event.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                            placeholder="Ex: Follow-up da proposta"
                                        />
                                    </label>
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contato / pessoa</span>
                                        <select
                                            value={activityContactId}
                                            onChange={event => setActivityContactId(event.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                        >
                                            <option value="">Sem contato específico</option>
                                            {clientContacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                                        </select>
                                    </label>
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Observação</span>
                                        <textarea
                                            value={activityDescription}
                                            onChange={event => setActivityDescription(event.target.value)}
                                            rows={3}
                                            className="w-full resize-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                            placeholder="Pauta, contexto da chamada ou próximo passo."
                                        />
                                    </label>
                                    {microsoftConnection.connected && onCreateMicrosoftTodoTask && (
                                        <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                                            <input
                                                type="checkbox"
                                                checked={activitySyncMicrosoftTodo}
                                                onChange={event => setActivitySyncMicrosoftTodo(event.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                            />
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Criar tambem no Microsoft To Do</span>
                                        </label>
                                    )}
                                </div>
                                <div className="flex gap-3 border-t border-slate-100 bg-slate-50 p-4 transition-colors dark:border-slate-800 dark:bg-slate-900">
                                    <button disabled={workspaceLoading} onClick={closeActivityModal} className="min-h-11 flex-1 px-4 py-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100 sm:flex-none">Cancelar</button>
                                    <button
                                        disabled={workspaceLoading || !activityTitle.trim() || !selectedClientId}
                                        onClick={submitActivity}
                                        className="min-h-11 flex-1 rounded-lg bg-[var(--tenant-primary)] px-5 py-2 text-sm font-bold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                                    >
                                        {microsoftWorkspaceLoading ? 'Salvando...' : 'Salvar atividade'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }
            {/* QUICK CONTACT MODAL */}
            {
                emailModal && (() => {
                    const proposal = proposals.find(p => p.id === emailModal.proposalId);
                    const clientContacts = contacts.filter(contact => contact.clientId === proposal.clientId);
                    return (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border dark:border-slate-800 animate-in zoom-in-95 duration-200">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Enviar e-mail pelo {getEmailProviderLabel(emailProvider)}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{proposal.clientName} - #{proposal.proposalId}</p>
                                    </div>
                                    <button disabled={workspaceLoading} onClick={closeEmailModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    {emailError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{emailError}</div>}
                                    {connectedProviders.length > 1 && (
                                        <label className="space-y-1.5 block">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Provedor</span>
                                            <select
                                                value={emailProvider}
                                                onChange={event => {
                                                    const provider = event.target.value as WorkspaceProvider;
                                                    setEmailProvider(provider);
                                                    setEmailSyncMicrosoftTodo(Boolean(provider === 'microsoft' && microsoftConnection.connected && onCreateMicrosoftTodoTask));
                                                }}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                            >
                                                {googleConnection.connected && <option value="google">Google Workspace / Gmail</option>}
                                                {microsoftConnection.connected && <option value="microsoft">Microsoft 365 / Outlook</option>}
                                            </select>
                                        </label>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contato</span>
                                            <select
                                                value={emailContactId}
                                                onChange={event => {
                                                    const contact = contacts.find(item => item.id === event.target.value);
                                                    setEmailContactId(event.target.value);
                                                    if (contact.email) setEmailTo(contact.email);
                                                }}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                            >
                                                <option value="">Sem contato especifico</option>
                                                {clientContacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                                            </select>
                                        </label>
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Para</span>
                                            <input
                                                value={emailTo}
                                                onChange={event => setEmailTo(event.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                                placeholder="email@empresa.com"
                                            />
                                        </label>
                                    </div>
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cc</span>
                                        <input
                                            value={emailCc}
                                            onChange={event => setEmailCc(event.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                            placeholder="Opcional, separado por virgula"
                                        />
                                    </label>
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assunto</span>
                                        <input
                                            value={emailSubject}
                                            onChange={event => setEmailSubject(event.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                        />
                                    </label>
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mensagem</span>
                                        <textarea
                                            value={emailBody}
                                            onChange={event => setEmailBody(event.target.value)}
                                            rows={8}
                                            className="w-full resize-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                        />
                                    </label>
                                    {emailProvider === 'microsoft' && microsoftConnection.connected && onCreateMicrosoftTodoTask && (
                                        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                                            <input
                                                type="checkbox"
                                                checked={emailSyncMicrosoftTodo}
                                                onChange={event => setEmailSyncMicrosoftTodo(event.target.checked)}
                                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                            />
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                                Criar tarefa no Microsoft To Do
                                                <span className="block pt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                    Follow-up automático em {new Date(`${addDaysDateInput(2)}T12:00:00`).toLocaleDateString('pt-BR')}.
                                                </span>
                                            </span>
                                        </label>
                                    )}
                                </div>
                                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 transition-colors">
                                    <button disabled={workspaceLoading} onClick={closeEmailModal} className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm font-bold hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-50 transition-colors">Cancelar</button>
                                    <button
                                        disabled={workspaceLoading || emailSentAfterError || !emailTo.trim() || !emailSubject.trim() || !emailBody.trim()}
                                        onClick={submitEmail}
                                        className="px-5 py-2 bg-[var(--tenant-primary)] text-white rounded-lg text-sm font-bold hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {emailSentAfterError ? 'E-mail já enviado' : workspaceLoading ? 'Enviando...' : 'Enviar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }
            {
                meetingModal && (() => {
                    const proposal = proposals.find(p => p.id === meetingModal.proposalId);
                    const clientContacts = contacts.filter(contact => contact.clientId === proposal.clientId);
                    const selectedInvitees = clientContacts.filter(contact => meetingContactIds.includes(contact.id) && contact.email);
                    return (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border dark:border-slate-800 animate-in zoom-in-95 duration-200">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                                    <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Agendar reunião {getMeetingProviderLabel(meetingProvider)}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{proposal.clientName} - #{proposal.proposalId}</p>
                                    </div>
                                    <button disabled={workspaceLoading} onClick={closeMeetingModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    {meetingError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{meetingError}</div>}
                                    {connectedProviders.length > 1 && (
                                        <label className="space-y-1.5 block">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Provedor</span>
                                            <select
                                                value={meetingProvider}
                                                onChange={event => setMeetingProvider(event.target.value as WorkspaceProvider)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                            >
                                                {googleConnection.connected && <option value="google">Google Calendar / Meet</option>}
                                                {microsoftConnection.connected && <option value="microsoft">Outlook Calendar / Teams</option>}
                                            </select>
                                        </label>
                                    )}
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Titulo</span>
                                        <input
                                            value={meetingTitle}
                                            onChange={event => setMeetingTitle(event.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inicio</span>
                                            <input
                                                type="datetime-local"
                                                value={meetingStartsAt}
                                                onChange={event => setMeetingStartsAt(event.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </label>
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duracao</span>
                                            <select
                                                value={meetingDurationMinutes}
                                                onChange={event => setMeetingDurationMinutes(Number(event.target.value))}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                            >
                                                <option value={30}>30 minutos</option>
                                                <option value={45}>45 minutos</option>
                                                <option value={60}>60 minutos</option>
                                                <option value={90}>90 minutos</option>
                                            </select>
                                        </label>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Convidados</span>
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                {selectedInvitees.length > 0 ? `${selectedInvitees.length} selecionado${selectedInvitees.length > 1 ? 's' : ''}` : 'Nenhum convidado selecionado'}
                                            </span>
                                        </div>
                                        <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
                                            {clientContacts.length === 0 ? (
                                                <p className="px-3 py-4 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">Nenhum contato cadastrado para este cliente.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {clientContacts.map(contact => {
                                                        const hasEmail = Boolean(contact.email);
                                                        const checked = meetingContactIds.includes(contact.id);
                                                        return (
                                                            <label
                                                                key={contact.id}
                                                                className={`flex items-center gap-3 rounded-md border px-3 py-2 transition-colors ${hasEmail ? 'cursor-pointer border-slate-200 bg-white hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-emerald-700' : 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60 dark:border-slate-700 dark:bg-slate-900/40'}`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    disabled={!hasEmail}
                                                                    checked={checked}
                                                                    onChange={event => {
                                                                        setMeetingContactIds(prev => event.target.checked ? [...prev, contact.id]
                                                                            : prev.filter(id => id !== contact.id));
                                                                    }}
                                                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                                />
                                                                <span className="min-w-0 flex-1">
                                                                    <span className="block truncate text-sm font-bold text-slate-700 dark:text-slate-200">{contact.name}</span>
                                                                    <span className="block truncate text-xs font-medium text-slate-500 dark:text-slate-400">{contact.email || 'Sem e-mail cadastrado'}</span>
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descricao</span>
                                        <textarea
                                            value={meetingDescription}
                                            onChange={event => setMeetingDescription(event.target.value)}
                                            rows={4}
                                            className="w-full resize-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </label>
                                </div>
                                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 transition-colors">
                                    <button disabled={workspaceLoading} onClick={closeMeetingModal} className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm font-bold hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-50 transition-colors">Cancelar</button>
                                    <button
                                        disabled={workspaceLoading || !meetingTitle.trim() || !meetingStartsAt}
                                        onClick={submitMeeting}
                                        className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {workspaceLoading ? 'Agendando...' : 'Criar reunião'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }
            {
                contactModal && (() => {
                    const proposal = proposals.find(p => p.id === contactModal.proposalId);
                    const clientName = proposal.clientName || clients.find(client => client.id === proposal.clientId).name;
                    return (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border dark:border-slate-700 animate-in zoom-in-95 duration-200">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Cadastrar contato</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{clientName} {proposal?.proposalId ? `- #${proposal.proposalId}` : ''}</p>
                                    </div>
                                    <button disabled={isSavingQuickContact} onClick={closeContactModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    {contactSaveError && (
                                        <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-300">
                                            {contactSaveError}
                                        </div>
                                    )}
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome</span>
                                        <input
                                            value={contactName}
                                            onChange={event => setContactName(event.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="Nome do contato"
                                        />
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cargo</span>
                                            <input
                                                value={contactRole}
                                                onChange={event => setContactRole(event.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="Ex: Compras"
                                            />
                                        </label>
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Influencia</span>
                                            <select
                                                value={contactInfluenceLevel}
                                                onChange={event => setContactInfluenceLevel(event.target.value as Contact['influenceLevel'])}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                            >
                                                <option value="Decision Maker">Decisor</option>
                                                <option value="Influencer">Influenciador</option>
                                                <option value="Evaluator">Avaliador</option>
                                                <option value="User">Usuario</option>
                                            </select>
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-mail</span>
                                            <input
                                                type="email"
                                                value={contactEmail}
                                                onChange={event => setContactEmail(event.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="email@empresa.com"
                                            />
                                        </label>
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone</span>
                                            <input
                                                value={contactPhone}
                                                onChange={event => setContactPhone(event.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="(00) 00000-0000"
                                            />
                                        </label>
                                    </div>
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LinkedIn</span>
                                        <input
                                            value={contactLinkedin}
                                            onChange={event => setContactLinkedin(event.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="https://linkedin.com/in/..."
                                        />
                                    </label>
                                </div>
                                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 transition-colors">
                                    <button disabled={isSavingQuickContact} onClick={closeContactModal} className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm font-bold hover:text-slate-800 dark:hover:text-slate-100 transition-colors disabled:opacity-50">Cancelar</button>
                                    <button
                                        disabled={isSavingQuickContact || !contactName.trim() || !contactRole.trim()}
                                        onClick={submitQuickContact}
                                        className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isSavingQuickContact ? 'Salvando...' : 'Salvar contato'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }
            {/* NEW VERSION MODAL */}
            {
                isNewVersionModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border dark:border-slate-800 animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Formalizar Nova Versão</h3>
                                <button onClick={closeNewVersionModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                    Descreva o motivo desta nova versão opcionalmente. Isso ajudará no rastreio do histórico de negociação.
                                </p>
                                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Notas da Versão</label>
                                <textarea
                                    autoFocus
                                    value={tempNotes}
                                    onChange={(e) => setTempNotes(e.target.value)}
                                    placeholder="Ex: Ajuste de margem conforme solicitação do cliente..."
                                    className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] outline-none transition-all resize-none"
                                />
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                <button
                                    onClick={closeNewVersionModal}
                                    className="flex-1 py-2.5 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        if (actionProposalId) {
                                            try {
                                                await onCreateNewVersion(actionProposalId, tempNotes);
                                                closeNewVersionModal();
                                            } catch (error) {
                                                console.error('Erro ao criar nova versao', error);
                                            }
                                        }
                                    }}
                                    className="flex-1 py-2.5 bg-[var(--tenant-primary)] text-white rounded-lg font-bold text-sm hover:brightness-95 transition-colors shadow-lg shadow-slate-200 dark:shadow-none flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> Confirmar Versão
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* FROZEN MODAL */}
            {
                isFrozenModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border dark:border-slate-800 animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20">
                                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                    <Snowflake size={20} />
                                    <h3 className="text-lg font-bold">Congelar Oportunidade</h3>
                                </div>
                                <button onClick={closeFrozenModal} className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Congelar uma oportunidade remove ela dos dashboards de forecast ativo, mas preserva seu histórico e estágio atual.
                                </p>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Motivo do Congelamento</label>
                                    <textarea
                                        autoFocus
                                        value={tempNotes}
                                        onChange={(e) => setTempNotes(e.target.value)}
                                        placeholder="Ex: Cliente aguardando aprovação de budget do próximo ano..."
                                        className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Revisar em (Opcional)</label>
                                    <input
                                        type="date"
                                        value={tempFrozenUntil}
                                        onChange={(e) => setTempFrozenUntil(e.target.value)}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                <button
                                    onClick={closeFrozenModal}
                                    className="flex-1 py-2.5 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        if (actionProposalId) {
                                            try {
                                                await onUpdateProposal(actionProposalId, {
                                                status: 'Frozen',
                                                frozenReason: tempNotes || 'Não informado',
                                                frozenUntil: tempFrozenUntil || undefined
                                                });
                                                closeFrozenModal();
                                                closePreviewPanel();
                                            } catch (error) {
                                                console.error('Erro ao congelar oportunidade', error);
                                            }
                                        }
                                    }}
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2"
                                >
                                    <Snowflake size={16} /> Congelar Agora
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default CRM;
