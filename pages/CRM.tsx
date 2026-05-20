import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ProposalData, OpportunityStage, OpportunityStatus, OpportunityMotion, ProposalType, Client, Contact, CRMTask, TenantModule, TaskAttachment, CRMCommunication, CRMCommunicationTriageStatus, CRMExternalEvent, GoogleConnectionStatus, GoogleEmailDraft, GoogleMeetingDraft, MicrosoftConnectionStatus, MicrosoftEmailDraft, MicrosoftMeetingDraft, MicrosoftTodoDraft, WorkspaceProvider, PricingModuleId } from '../types';
import { calculateFinancials, formatCurrency, formatPercent } from '../utils/pricingEngine';
import { Plus, Search, FileText, CheckCircle, XCircle, X, Clock, Copy, Edit3, Trash2, PieChart, TrendingUp, Calendar, User, LayoutGrid, List, ArrowRight, DollarSign, Users, Briefcase, GripVertical, ExternalLink, BarChart3, Zap, Repeat, AlertCircle, Snowflake, Filter, Save, Landmark, Package, Activity, History, CreditCard, PhoneCall, MailCheck, CalendarDays, Paperclip, File as FileIcon, UserPlus, Building2, Link2, ClipboardCheck, Ban, RefreshCw } from 'lucide-react';
import { buildCommercialTimeline, buildGmailReplyHeaders, getCommunicationDate, getThreadReplySourceMessage, groupCommunicationThreads, groupTimelineByDay, type CommunicationThread } from '../utils/crmTraceability';
import { Button, PageHeader, ResponsiveDrawer } from '../components/ui';
import { getDefaultPricingModuleForBusinessUnit, getEnabledPricingModules, getPricingModuleDefinition, getPricingModuleLabel, isPricingModuleEnabledForTenant } from '../utils/pricingModules';
import { applyProposalTemplateVariables } from '../utils/proposalTemplates';
import { PIPELINE_VARIANT_LABELS, getKanbanStagesForPipeline, getPipelineOptionForProposal, getPipelineOptionKey, getPipelineStage, getPipelineStageCategory, getPipelineStageLabel, getPipelineStageStyle, getSalesPipelineForProposal, getSalesPipelineFromConfig, getSalesPipelineOptions, isClosedStage, isLostStage, isWonStage, parsePipelineOptionKey, type SalesPipelineOption } from '../utils/salesPipelines';
import { generateProposalEmailAttachment, getProposalPdfTemplate } from '../services/proposalPdf';
import { getDefaultProposalSendAutomationTemplate, normalizeProposalSendAutomation } from '../utils/proposalSendAutomation';
import { useTenant } from '../contexts/TenantContext';
import { createTenantTheme } from '../utils/theme';

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
    globalConfig: ProposalData;
    onSelectProposal: (id: string) => void;
    onCreateProposal: (payload: { type: ProposalType, clientId: string, motion: OpportunityMotion, pricingModule?: TenantModule, inlineClientName?: string, referenceId?: string, expansionType?: 'Volume' | 'Scope' | 'Site', openEditor?: boolean }) => ProposalData | void | Promise<ProposalData | void>;
    onCreateNewVersion: (id: string, notes: string) => void | Promise<void>;
    onDuplicateProposal: (id: string) => void;
    onDeleteProposal: (id: string) => void;
    onUpdateStage: (id: string, newStage: OpportunityStage) => void | Promise<void>;
    onUpdateStatus: (id: string, newStatus: OpportunityStatus) => void | Promise<void>;
    onUpdateProposal: (id: string, data: Partial<ProposalData>) => void | Promise<void>;
    onUpdateMilestones: (id: string, milestones: import('../types').Milestone[]) => void | Promise<void>;
    onCreateTask: (task: CRMTask) => CRMTask | Promise<CRMTask>;
    onSaveClient: (client: Client) => Client | Promise<Client>;
    onSaveContact: (contact: Contact) => Contact | void | Promise<Contact | void>;
    onTriageCommunicationThread: (payload: { communicationId: string; microsoftConversationId?: string; clientId?: string | null; contactId?: string | null; proposalId?: string | null; taskId?: string | null; triageStatus: CRMCommunicationTriageStatus; triageNotes?: string | null }) => Promise<CRMCommunication[]>;
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
    initialSection?: 'pipeline' | 'inbox';
    businessUnit: 'SERVICES' | 'PRODUCTS';
    enabledModules: TenantModule[];
}

const INBOX_DETAIL_DEFAULT_WIDTH = 400;
const INBOX_DETAIL_MIN_WIDTH = 320;
const INBOX_DETAIL_MAX_WIDTH = 640;
const INBOX_LIST_MIN_WIDTH = 520;

const clampInboxDetailWidth = (width: number, containerWidth?: number) => {
    const availableMax = containerWidth ? Math.max(INBOX_DETAIL_MIN_WIDTH, containerWidth - INBOX_LIST_MIN_WIDTH) : INBOX_DETAIL_MAX_WIDTH;
    return Math.min(Math.max(width, INBOX_DETAIL_MIN_WIDTH), Math.min(INBOX_DETAIL_MAX_WIDTH, availableMax));
};

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
    globalConfig,
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
    onSaveClient,
    onSaveContact,
    onTriageCommunicationThread,
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
    initialSection = 'pipeline',
    businessUnit,
    enabledModules = []
}) => {
    const { activeTenant } = useTenant();
    const portalTenantTheme = useMemo(() => createTenantTheme(activeTenant?.branding), [activeTenant?.branding]);
    const inboxDetailStorageKey = useMemo(() => `oprice:inbox-detail-width:${activeTenant?.id || activeTenant?.slug || 'default'}`, [activeTenant?.id, activeTenant?.slug]);
    const servicePricingModules = getEnabledPricingModules(enabledModules, 'SERVICES');
    const productPricingModules = getEnabledPricingModules(enabledModules, 'PRODUCTS');
    const hasServicesModule = servicePricingModules.length > 0;
    const hasProductModule = productPricingModules.length > 0;
    const hasSaasModule = productPricingModules.includes('SAAS_SUBSCRIPTION');
    const hasIotModule = productPricingModules.includes('IOT_SUBSCRIPTION');
    const hasProductSalesModule = productPricingModules.includes('PRODUCT_SALES');
    const defaultProductPricingModule = getDefaultPricingModuleForBusinessUnit(enabledModules, 'PRODUCTS') || undefined;
    const activePipelineOptions = useMemo(() => getSalesPipelineOptions(enabledModules, businessUnit), [enabledModules, businessUnit]);
    const isProposalModuleEnabled = (proposal: ProposalData) =>
        isPricingModuleEnabledForTenant(proposal.pricingModule, enabledModules);
    const isProposalInBusinessUnit = (proposal: ProposalData) =>
        (proposal.type === 'PRODUCT' ? 'PRODUCTS' : 'SERVICES') === businessUnit;
    const legacyPipelineOptions = useMemo<SalesPipelineOption[]>(() => {
        const byKey = new Map<string, SalesPipelineOption>();
        proposals
            .filter(proposal => proposal.isCurrentVersion && isProposalInBusinessUnit(proposal) && !isProposalModuleEnabled(proposal))
            .forEach(proposal => {
                const key = getPipelineOptionForProposal(proposal);
                if (byKey.has(key)) return;
                const parsed = parsePipelineOptionKey(key);
                if (!parsed) return;
                const definition = getPricingModuleDefinition(parsed.pricingModule);
                const variantLabel = PIPELINE_VARIANT_LABELS[parsed.variant];
                const baseLabel = parsed.pricingModule === 'SERVICES_COMPLEX'
                    ? variantLabel
                    : definition?.shortLabel || definition?.label || parsed.pricingModule;
                byKey.set(key, {
                    key,
                    pricingModule: parsed.pricingModule,
                    variant: parsed.variant,
                    label: `${baseLabel} (desativado)`,
                    shortLabel: `${baseLabel} legado`,
                    proposalType: proposal.type
                });
            });
        return Array.from(byKey.values());
    }, [proposals, enabledModules, businessUnit]);
    const pipelineOptions = useMemo(() => [...activePipelineOptions, ...legacyPipelineOptions], [activePipelineOptions, legacyPipelineOptions]);
    const fallbackPipelineOption = pipelineOptions[0] || null;
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>(initialViewMode as 'list' | 'kanban');
    const [crmSection, setCrmSection] = useState<'pipeline' | 'inbox'>(initialSection);
    const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pipelineFilter, setPipelineFilter] = useState<string>(fallbackPipelineOption?.key || '');
    const [showFrozen, setShowFrozen] = useState(false);
    const [inboxFilter, setInboxFilter] = useState<'NEW' | 'SUGGESTED' | 'LINKED' | 'IGNORED'>('NEW');
    const [inboxClientSelection, setInboxClientSelection] = useState<Record<string, string>>({});
    const [inboxProposalSelection, setInboxProposalSelection] = useState<Record<string, string>>({});
    const [inboxActionId, setInboxActionId] = useState<string | null>(null);
    const [inboxError, setInboxError] = useState<string | null>(null);
    const [selectedInboxCommunicationId, setSelectedInboxCommunicationId] = useState<string | null>(null);
    const [inboxSearchTerm, setInboxSearchTerm] = useState('');
    const [inboxDateFilter, setInboxDateFilter] = useState<'TODAY' | 'SEVEN_DAYS' | 'THIRTY_DAYS' | 'ALL'>('ALL');
    const [inboxDetailWidth, setInboxDetailWidth] = useState(() => {
        if (typeof window === 'undefined') return INBOX_DETAIL_DEFAULT_WIDTH;
        const saved = Number(window.localStorage.getItem(inboxDetailStorageKey));
        return Number.isFinite(saved) ? clampInboxDetailWidth(saved) : INBOX_DETAIL_DEFAULT_WIDTH;
    });
    const [isInboxResizing, setIsInboxResizing] = useState(false);
    const inboxSplitContainerRef = useRef<HTMLDivElement | null>(null);

    // Create Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createStep, setCreateStep] = useState<1 | 2>(1);
    const [createType, setCreateType] = useState<ProposalType>(businessUnit === 'PRODUCTS' ? 'PRODUCT' : 'CONTINUOUS');
    const [createPricingModule, setCreatePricingModule] = useState<TenantModule | undefined>(businessUnit === 'PRODUCTS' ? defaultProductPricingModule : servicePricingModules[0]);
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
    const [emailSubmitting, setEmailSubmitting] = useState(false);
    const [emailSentAfterError, setEmailSentAfterError] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [expandedThreadKey, setExpandedThreadKey] = useState<string | null>(null);
    const [replyThreadKey, setReplyThreadKey] = useState<string | null>(null);
    const [replyProvider, setReplyProvider] = useState<WorkspaceProvider>('google');
    const [replyTo, setReplyTo] = useState('');
    const [replyCc, setReplyCc] = useState('');
    const [replySubject, setReplySubject] = useState('');
    const [replyBody, setReplyBody] = useState('');
    const [replySending, setReplySending] = useState(false);
    const [replyError, setReplyError] = useState<string | null>(null);
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

    const activePipelineOption = pipelineOptions.find(option => option.key === pipelineFilter) || fallbackPipelineOption;
    const parsedPipelineFilter = activePipelineOption ? parsePipelineOptionKey(activePipelineOption.key) : null;
    const activePipeline = parsedPipelineFilter
        ? getSalesPipelineFromConfig(globalConfig, parsedPipelineFilter.pricingModule, parsedPipelineFilter.variant)
        : null;
    const getProposalPipeline = (proposal: ProposalData) => getSalesPipelineForProposal(proposal, globalConfig);
    const getPipelineOptionIcon = (option = activePipelineOption) => {
        if (!option) return Package;
        if (option.pricingModule === 'SERVICES_COMPLEX' && option.variant === 'SPOT') return Zap;
        if (option.pricingModule === 'SERVICES_COMPLEX') return Repeat;
        if (option.pricingModule === 'SAAS_SUBSCRIPTION') return CreditCard;
        if (option.pricingModule === 'IOT_SUBSCRIPTION') return Activity;
        return Package;
    };

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    useEffect(() => {
        setCrmSection(initialSection);
        if (initialSection === 'inbox') setSelectedPreviewId(null);
    }, [initialSection]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const saved = Number(window.localStorage.getItem(inboxDetailStorageKey));
        setInboxDetailWidth(Number.isFinite(saved) ? clampInboxDetailWidth(saved, inboxSplitContainerRef.current?.getBoundingClientRect().width) : INBOX_DETAIL_DEFAULT_WIDTH);
    }, [inboxDetailStorageKey]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(inboxDetailStorageKey, String(inboxDetailWidth));
    }, [inboxDetailStorageKey, inboxDetailWidth]);

    useEffect(() => {
        if (!isInboxResizing) return;

        const previousUserSelect = document.body.style.userSelect;
        const previousCursor = document.body.style.cursor;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';

        const handlePointerMove = (event: PointerEvent) => {
            const rect = inboxSplitContainerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setInboxDetailWidth(clampInboxDetailWidth(rect.right - event.clientX, rect.width));
        };
        const stopResize = () => setIsInboxResizing(false);

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', stopResize);
        window.addEventListener('pointercancel', stopResize);

        return () => {
            document.body.style.userSelect = previousUserSelect;
            document.body.style.cursor = previousCursor;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', stopResize);
            window.removeEventListener('pointercancel', stopResize);
        };
    }, [isInboxResizing]);

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
        const currentOption = pipelineOptions.find(option => option.key === pipelineFilter);
        const nextFilterOption = currentOption || pipelineOptions[0];
        const nextCreateOption = activePipelineOptions.find(option => option.key === pipelineFilter) || activePipelineOptions[0];
        if (!nextFilterOption) {
            setPipelineFilter('');
            setCreatePricingModule(undefined);
            return;
        }
        if (!currentOption) setPipelineFilter(nextFilterOption.key);
        if (nextCreateOption) {
            setCreateType(nextCreateOption.proposalType);
            setCreatePricingModule(nextCreateOption.pricingModule);
        } else {
            setCreatePricingModule(undefined);
        }
    }, [businessUnit, pipelineOptions, activePipelineOptions, pipelineFilter]);

    useEffect(() => {
        const currentOption = pipelineOptions.find(option => option.key === pipelineFilter);
        if (currentOption || pipelineOptions.length === 0) return;
        setPipelineFilter(pipelineOptions[0].key);
    }, [pipelineOptions, pipelineFilter]);

    // Get only the proposals that are the CURRENT version
    const activeProposals = proposals.filter(p => p.isCurrentVersion);

    const handleContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, id });
    };

    const selectedProposal = proposals.find(p => p.id === selectedPreviewId);
    const selectedProposalPipeline = selectedProposal ? getProposalPipeline(selectedProposal) : activePipeline;
    const selectedFinancials = selectedProposal ? calculateFinancials(selectedProposal) : null;
    const getModuleDisabledNotice = (proposal: ProposalData) => {
        if (isProposalModuleEnabled(proposal)) return null;
        const label = getPricingModuleLabel(proposal.pricingModule, 'Modulo legado');
        return `${label} esta desabilitado neste tenant. A oportunidade permanece visivel como historico; novas cotacoes deste modulo ficam bloqueadas.`;
    };
    const workspaceLoading = googleWorkspaceLoading || microsoftWorkspaceLoading;
    const connectedProviders: WorkspaceProvider[] = [
        ...(googleConnection.connected ? ['google' as WorkspaceProvider] : []),
        ...(microsoftConnection.connected ? ['microsoft' as WorkspaceProvider] : [])
    ];
    const getDefaultProvider = (): WorkspaceProvider => googleConnection.connected ? 'google' : 'microsoft';
    const getDefaultThreadProvider = (thread?: CommunicationThread | null): WorkspaceProvider => {
        if (thread?.provider === 'google') return 'google';
        if (thread?.provider === 'microsoft') return 'microsoft';
        return getDefaultProvider();
    };
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
    const getProposalFamilyIds = (proposalId: string) => {
        const proposal = proposals.find(p => p.id === proposalId);
        if (!proposal?.proposalId) return new Set([proposalId]);
        return new Set(proposals
            .filter(item => item.id === proposalId || item.proposalId === proposal.proposalId)
            .map(item => item.id));
    };
    const getProposalCommunications = (proposalId: string) => communications
        .filter(communication => communication.proposalId && getProposalFamilyIds(proposalId).has(communication.proposalId))
        .sort((a, b) => new Date(b.receivedAt || b.sentAt || b.createdAt).getTime() - new Date(a.receivedAt || a.sentAt || a.createdAt).getTime());
    const selectedProposalInboxOrigin = selectedProposal
        ? getProposalCommunications(selectedProposal.id)
            .filter(communication =>
                communication.direction === 'inbound' &&
                (communication.triageNotes?.includes('Inbox CRM') || Boolean(communication.sourceMailboxEmail))
            )
            .sort((a, b) => new Date(a.receivedAt || a.createdAt).getTime() - new Date(b.receivedAt || b.createdAt).getTime())[0]
        : undefined;
    const getProposalExternalEvents = (proposalId: string) => externalEvents
        .filter(event => event.proposalId && getProposalFamilyIds(proposalId).has(event.proposalId))
        .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    const getProposalForEmailDocument = (proposal: ProposalData): ProposalData => ({
        ...proposal,
        letterheadConfig: globalConfig.letterheadConfig || proposal.letterheadConfig,
        proposalTemplates: globalConfig.proposalTemplates || proposal.proposalTemplates
    });
    const getProposalTraceability = (proposal: ProposalData) => {
        const familyIds = getProposalFamilyIds(proposal.id);
        const familyProposals = proposals.filter(item => familyIds.has(item.id));
        const proposalCommunications = getProposalCommunications(proposal.id);
        const proposalTasks = tasks.filter(task => task.proposalId && familyIds.has(task.proposalId));
        const proposalEvents = getProposalExternalEvents(proposal.id);
        const threads = groupCommunicationThreads(proposalCommunications);
        const timeline = buildCommercialTimeline({
            communications: proposalCommunications,
            externalEvents: proposalEvents,
            tasks: proposalTasks,
            timeline: familyProposals.flatMap(item => (item.timeline || []).map(event => ({ ...event, id: `${item.id}-${event.id}` })))
        });
        return { proposalCommunications, proposalTasks, proposalEvents, threads, timeline, groupedTimeline: groupTimelineByDay(timeline) };
    };
    const getThreadReplyRecipient = (proposal: ProposalData, thread: CommunicationThread) => {
        const lastInbound = thread.messages.slice().reverse().find(message => message.direction === 'inbound' && message.fromEmail);
        if (lastInbound?.fromEmail) return lastInbound.fromEmail;
        const threadContact = contacts.find(contact => contact.id === thread.lastMessage.contactId && contact.email);
        if (threadContact?.email) return threadContact.email;
        const primaryContact = contacts.find(contact => contact.clientId === proposal.clientId && contact.email);
        if (primaryContact?.email) return primaryContact.email;
        return clients.find(client => client.id === proposal.clientId)?.email || '';
    };
    const getThreadReplySubject = (thread: CommunicationThread) => {
        const subject = thread.subject || '(sem assunto)';
        return subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`;
    };
    const resetThreadReplyComposer = () => {
        setReplyThreadKey(null);
        setReplyProvider(getDefaultProvider());
        setReplyTo('');
        setReplyCc('');
        setReplySubject('');
        setReplyBody('');
        setReplySending(false);
        setReplyError(null);
    };
    const closeExpandedThread = () => {
        setExpandedThreadKey(null);
        resetThreadReplyComposer();
    };
    const openThreadReplyComposer = (proposal: ProposalData, thread: CommunicationThread) => {
        const provider = getDefaultThreadProvider(thread);
        setExpandedThreadKey(thread.key);
        setActiveRightPanelTab('timeline');
        setReplyThreadKey(thread.key);
        setReplyProvider(provider);
        setReplyTo(getThreadReplyRecipient(proposal, thread));
        setReplyCc('');
        setReplySubject(getThreadReplySubject(thread));
        setReplyBody('');
        setReplyError(null);
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
        if (!createPricingModule || !isPricingModuleEnabledForTenant(createPricingModule, enabledModules)) {
            setCreateError('Este tenant nao possui modulo ativo para criar cotacoes nesta unidade.');
            return;
        }
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
        setExpandedThreadKey(null);
        resetThreadReplyComposer();
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
        setEmailSubmitting(false);
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
        const proposalForEmail = getProposalForEmailDocument(proposal);
        const template = getProposalPdfTemplate(proposalForEmail);
        setEmailModal({ proposalId });
        setEmailProvider(defaultProvider);
        setEmailContactId(primaryContact?.id || '');
        setEmailTo(primaryContact?.email || '');
        setEmailCc('');
        setEmailSubject(applyProposalTemplateVariables(template.emailSubject, proposalForEmail, template));
        setEmailBody(applyProposalTemplateVariables(template.emailBody, proposalForEmail, template));
        setEmailSubmitting(false);
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
            setEmailSubmitting(true);
            setEmailError(null);
            const proposalForEmail = getProposalForEmailDocument(proposal);
            const attachment = await generateProposalEmailAttachment(proposalForEmail);
            const baseDraft = {
                tenantId: '',
                clientId: proposal.clientId,
                proposalId: proposal.id,
                contactId: emailContactId || undefined,
                to: emailTo.split(',').map(item => item.trim()).filter(Boolean),
                cc: emailCc.split(',').map(item => item.trim()).filter(Boolean),
                subject: emailSubject.trim(),
                bodyText: emailBody,
                attachments: [attachment],
                markProposalSent: true
            };
            if (emailProvider === 'google') {
                const replyHeaders = buildGmailReplyHeaders(lastCommunication);
                await onSendGoogleEmail?.({
                    ...baseDraft,
                    gmailThreadId: lastCommunication?.gmailThreadId,
                    ...replyHeaders
                });
            } else {
                await onSendMicrosoftEmail?.({
                    ...baseDraft,
                    microsoftConversationId: lastCommunication?.microsoftConversationId
                });
            }
            setActiveRightPanelTab('timeline');
            closeEmailModal();
        } catch (error: any) {
            if (error.emailSent) setEmailSentAfterError(true);
            setEmailError(error.message || 'Não foi possível enviar o e-mail.');
        } finally {
            setEmailSubmitting(false);
        }
    };

    const submitThreadReply = async () => {
        if (!selectedProposal || !replyThreadKey) return;
        const thread = getProposalTraceability(selectedProposal).threads.find(item => item.key === replyThreadKey);
        if (!thread) {
            setReplyError('Conversa nao encontrada. Sincronize o e-mail e tente novamente.');
            return;
        }
        if (!isProviderConnected(replyProvider)) {
            setReplyError(`Conecte sua conta ${getEmailProviderLabel(replyProvider)} antes de responder.`);
            return;
        }
        if (!replyTo.trim() || !replySubject.trim() || !replyBody.trim()) {
            setReplyError('Preencha destinatario, assunto e mensagem.');
            return;
        }
        if (replyProvider === 'google' && !thread.lastMessage.gmailThreadId) {
            setReplyError('Esta conversa nao tem identificador de thread do Gmail. Sincronize o e-mail antes de responder.');
            return;
        }
        if (replyProvider === 'microsoft' && !thread.lastMessage.microsoftConversationId) {
            setReplyError('Esta conversa nao tem identificador de conversa do Outlook. Sincronize o e-mail antes de responder.');
            return;
        }

        const baseDraft = {
            tenantId: '',
            clientId: selectedProposal.clientId,
            proposalId: selectedProposal.id,
            contactId: thread.lastMessage.contactId || undefined,
            to: replyTo.split(',').map(item => item.trim()).filter(Boolean),
            cc: replyCc.split(',').map(item => item.trim()).filter(Boolean),
            subject: replySubject.trim(),
            bodyText: replyBody
        };

        try {
            setReplySending(true);
            setReplyError(null);
            if (replyProvider === 'google') {
                const replySource = getThreadReplySourceMessage(thread);
                const replyHeaders = buildGmailReplyHeaders(replySource);
                await onSendGoogleEmail?.({
                    ...baseDraft,
                    gmailThreadId: thread.lastMessage.gmailThreadId,
                    ...replyHeaders
                });
            } else {
                await onSendMicrosoftEmail?.({
                    ...baseDraft,
                    microsoftConversationId: thread.lastMessage.microsoftConversationId,
                    createMicrosoftTodo: false
                });
            }
            setReplyThreadKey(null);
            setReplyBody('');
        } catch (error: any) {
            setReplyError(error?.message || 'Nao foi possivel enviar a resposta.');
        } finally {
            setReplySending(false);
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
            <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] pb-2">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Paperclip size={14} /> Anexos das atividades
                    </h4>
                    {attachments.length > 0 && (
                        <span className="rounded bg-[var(--tenant-control)] px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-[var(--tenant-panel-dark)] dark:text-slate-400">{attachments.length}</span>
                    )}
                </div>
                {taskIds.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] rounded-lg">Nenhum anexo em atividades vinculadas.</p>
                ) : (
                    <div className="space-y-3">
                        {taskIds.map(taskId => {
                            const task = tasks.find(item => item.id === taskId);
                            return (
                                <div key={taskId} className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                    <p className="mb-2 truncate text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{task.title || 'Atividade'}</p>
                                    <div className="space-y-2">
                                        {attachmentsByTask[taskId].map(attachment => (
                                            <button
                                                key={attachment.id}
                                                type="button"
                                                onClick={() => onOpenTaskAttachment(attachment)}
                                                className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-left transition-colors hover:border-[var(--tenant-primary-border)] hover:bg-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:hover:border-[var(--tenant-primary-border)] dark:hover:bg-[var(--tenant-primary-soft)]"
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

    const normalizeEmail = (value?: string) => (value || '').trim().toLowerCase();
    const getEmailDomain = (value?: string) => normalizeEmail(value).split('@')[1] || '';
    const isCommunicationLinked = (communication: CRMCommunication) =>
        Boolean(communication.clientId || communication.contactId || communication.proposalId || communication.taskId);
    const getCommunicationTriageStatus = (communication: CRMCommunication): CRMCommunicationTriageStatus =>
        communication.triageStatus || (isCommunicationLinked(communication) ? 'LINKED' : 'NEW');
    const canManageInboxTriage = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role);
    const microsoftInboxCommunications = communications
        .filter(communication => communication.provider === 'microsoft' && communication.direction === 'inbound')
        .filter(communication => canManageInboxTriage || getCommunicationTriageStatus(communication) === 'LINKED')
        .sort((a, b) => new Date(b.receivedAt || b.createdAt).getTime() - new Date(a.receivedAt || a.createdAt).getTime());

    const getInboxSuggestion = (communication: CRMCommunication) => {
        const sender = normalizeEmail(communication.fromEmail);
        const senderDomain = getEmailDomain(sender);
        const contact = sender ? contacts.find(item => normalizeEmail(item.email) === sender) : undefined;
        if (contact) {
            const client = clients.find(item => item.id === contact.clientId);
            return { kind: 'contact' as const, contact, client };
        }
        if (senderDomain) {
            const contactByDomain = contacts.find(item => getEmailDomain(item.email) === senderDomain);
            const clientByContact = contactByDomain ? clients.find(item => item.id === contactByDomain.clientId) : undefined;
            const clientByEmail = clients.find(item => getEmailDomain(item.email) === senderDomain);
            const client = clientByContact || clientByEmail;
            if (client) return { kind: 'domain' as const, contact: contactByDomain, client };
        }
        return { kind: 'lead' as const, contact: undefined, client: undefined };
    };

    const inboxCounts = microsoftInboxCommunications.reduce<Record<'NEW' | 'SUGGESTED' | 'LINKED' | 'IGNORED', number>>((acc, communication) => {
        const status = getCommunicationTriageStatus(communication);
        if (status === 'NEW') {
            acc.NEW += 1;
            const suggestion = getInboxSuggestion(communication);
            if (suggestion.kind !== 'lead') acc.SUGGESTED += 1;
        } else if (status === 'LINKED' || status === 'IGNORED') {
            acc[status] += 1;
        }
        return acc;
    }, { NEW: 0, SUGGESTED: 0, LINKED: 0, IGNORED: 0 });

    const getInboxTimestamp = (communication: CRMCommunication) =>
        new Date(communication.receivedAt || communication.createdAt).getTime();
    const getStartOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const nowDate = new Date();
    const todayStart = getStartOfDay(nowDate);
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const sevenDaysStart = todayStart - 6 * 24 * 60 * 60 * 1000;
    const thirtyDaysStart = todayStart - 29 * 24 * 60 * 60 * 1000;

    const filteredInboxCommunications = microsoftInboxCommunications.filter(communication => {
        const status = getCommunicationTriageStatus(communication);
        if (inboxFilter === 'SUGGESTED') return status === 'NEW' && getInboxSuggestion(communication).kind !== 'lead';
        if (status !== inboxFilter) return false;

        const timestamp = getInboxTimestamp(communication);
        if (inboxDateFilter === 'TODAY' && timestamp < todayStart) return false;
        if (inboxDateFilter === 'SEVEN_DAYS' && timestamp < sevenDaysStart) return false;
        if (inboxDateFilter === 'THIRTY_DAYS' && timestamp < thirtyDaysStart) return false;

        const search = normalizeEmail(inboxSearchTerm);
        if (!search) return true;
        const haystack = [
            communication.subject,
            communication.bodyPreview,
            communication.fromEmail,
            communication.sourceMailboxEmail,
            communication.sourceMailboxLabel,
            getEmailDomain(communication.fromEmail)
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(search);
    });

    const getInboxDateGroupLabel = (communication: CRMCommunication) => {
        const timestamp = getInboxTimestamp(communication);
        if (timestamp >= todayStart) return 'Hoje';
        if (timestamp >= yesterdayStart) return 'Ontem';
        if (timestamp >= sevenDaysStart) return 'Esta semana';
        return new Date(timestamp).toLocaleDateString('pt-BR');
    };

    const groupedInboxCommunications = filteredInboxCommunications.reduce<Array<{ label: string; items: CRMCommunication[] }>>((groups, communication) => {
        const label = getInboxDateGroupLabel(communication);
        const existing = groups.find(group => group.label === label);
        if (existing) existing.items.push(communication);
        else groups.push({ label, items: [communication] });
        return groups;
    }, []);

    const selectedInboxCommunication = filteredInboxCommunications.find(communication => communication.id === selectedInboxCommunicationId) || filteredInboxCommunications[0];

    useEffect(() => {
        if (!filteredInboxCommunications.length) {
            if (selectedInboxCommunicationId) setSelectedInboxCommunicationId(null);
            return;
        }
        if (!selectedInboxCommunicationId || !filteredInboxCommunications.some(communication => communication.id === selectedInboxCommunicationId)) {
            setSelectedInboxCommunicationId(filteredInboxCommunications[0].id);
        }
    }, [filteredInboxCommunications.map(communication => communication.id).join('|'), selectedInboxCommunicationId]);

    const getInboxSenderLabel = (communication: CRMCommunication) => {
        const email = communication.fromEmail || '';
        const localPart = email.split('@')[0] || 'Remetente';
        return localPart.replace(/[._-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    };

    const createLeadFromCommunication = async (communication: CRMCommunication) => {
        const domain = getEmailDomain(communication.fromEmail);
        const senderName = getInboxSenderLabel(communication);
        return onSaveClient({
            id: `client-${Date.now()}`,
            name: domain ? domain.split('.')[0].toUpperCase() : senderName,
            status: 'Active',
            classification: 'Lead',
            businessUnit,
            isProductClient: businessUnit === 'PRODUCTS',
            isServiceClient: businessUnit === 'SERVICES'
        });
    };

    const ensureInboxContact = async (communication: CRMCommunication, clientId: string) => {
        const sender = normalizeEmail(communication.fromEmail);
        const existing = contacts.find(contact => contact.clientId === clientId && normalizeEmail(contact.email) === sender);
        if (existing) return existing;
        const saved = await onSaveContact({
            id: `cont-${Date.now()}`,
            clientId,
            name: getInboxSenderLabel(communication),
            email: communication.fromEmail || '',
            phone: '',
            role: '',
            influenceLevel: 'Influencer'
        });
        return saved || contacts.find(contact => contact.clientId === clientId && normalizeEmail(contact.email) === sender);
    };

    const triageCommunication = async (
        communication: CRMCommunication,
        payload: { clientId?: string | null; contactId?: string | null; proposalId?: string | null; taskId?: string | null; triageStatus: CRMCommunicationTriageStatus; triageNotes?: string | null }
    ) => {
        await onTriageCommunicationThread({
            communicationId: communication.id,
            microsoftConversationId: communication.microsoftConversationId,
            ...payload
        });
    };

    const runInboxAction = async (communication: CRMCommunication, action: 'createLead' | 'createLeadProposal' | 'linkClient' | 'linkProposal' | 'createTask' | 'ignore') => {
        if (inboxActionId) return;
        setInboxActionId(`${communication.id}-${action}`);
        setInboxError(null);
        try {
            const suggestion = getInboxSuggestion(communication);
            const selectedClientId = inboxClientSelection[communication.id] || suggestion.client?.id || '';
            const selectedProposalId = inboxProposalSelection[communication.id] || '';

            if (action === 'ignore') {
                await triageCommunication(communication, { triageStatus: 'IGNORED', triageNotes: 'Ignorado na Inbox CRM.' });
                return;
            }

            if (action === 'createLead' || action === 'createLeadProposal') {
                const client = await createLeadFromCommunication(communication);
                const contact = await ensureInboxContact(communication, client.id);
                let proposalId: string | undefined;
                if (action === 'createLeadProposal') {
                    if (!activePipelineOption || !isPricingModuleEnabledForTenant(activePipelineOption.pricingModule, enabledModules)) {
                        throw new Error('Nao ha modulo de cotacao ativo para criar oportunidade pela Inbox CRM.');
                    }
                    const proposal = await onCreateProposal({
                        type: activePipelineOption.proposalType,
                        clientId: client.id,
                        motion: 'NewBusiness',
                        pricingModule: activePipelineOption.pricingModule,
                        openEditor: false
                    });
                    proposalId = proposal?.id;
                }
                await triageCommunication(communication, {
                    clientId: client.id,
                    contactId: contact?.id,
                    proposalId,
                    triageStatus: 'LINKED',
                    triageNotes: action === 'createLeadProposal' ? 'Lead e oportunidade criados pela Inbox CRM.' : 'Lead criado pela Inbox CRM.'
                });
                return;
            }

            if (action === 'linkClient') {
                if (!selectedClientId) throw new Error('Selecione um cliente para vincular este e-mail.');
                const contact = await ensureInboxContact(communication, selectedClientId);
                await triageCommunication(communication, {
                    clientId: selectedClientId,
                    contactId: contact?.id,
                    triageStatus: 'LINKED',
                    triageNotes: 'Conversa vinculada a cliente pela Inbox CRM.'
                });
                return;
            }

            if (action === 'linkProposal') {
                const proposal = proposals.find(item => item.id === selectedProposalId);
                if (!proposal?.clientId) throw new Error('Selecione uma negociacao para vincular este e-mail.');
                const contact = await ensureInboxContact(communication, proposal.clientId);
                await triageCommunication(communication, {
                    clientId: proposal.clientId,
                    contactId: contact?.id,
                    proposalId: proposal.id,
                    triageStatus: 'LINKED',
                    triageNotes: 'Conversa vinculada a negociacao pela Inbox CRM.'
                });
                return;
            }

            if (action === 'createTask') {
                const proposal = selectedProposalId ? proposals.find(item => item.id === selectedProposalId) : undefined;
                const clientId = proposal?.clientId || selectedClientId;
                if (!clientId) throw new Error('Vincule a conversa a um cliente ou negociacao antes de criar tarefa.');
                const contact = await ensureInboxContact(communication, clientId);
                const task = await onCreateTask({
                    id: `task-${Date.now()}`,
                    clientId,
                    proposalId: proposal?.id,
                    contactId: contact?.id,
                    assignee: currentUser.name,
                    title: `Responder e-mail: ${communication.subject || 'sem assunto'}`,
                    description: [
                        communication.fromEmail ? `Remetente: ${communication.fromEmail}` : '',
                        communication.bodyPreview ? `Preview: ${communication.bodyPreview}` : '',
                        communication.externalUrl ? `Outlook: ${communication.externalUrl}` : ''
                    ].filter(Boolean).join('\n'),
                    type: 'Email',
                    status: 'To Do',
                    dueDate: addDaysDateInput(1),
                    createdAt: new Date().toISOString()
                });
                await triageCommunication(communication, {
                    clientId,
                    contactId: contact?.id,
                    proposalId: proposal?.id,
                    taskId: task.id,
                    triageStatus: 'LINKED',
                    triageNotes: 'Tarefa de resposta criada pela Inbox CRM.'
                });
            }
        } catch (error: any) {
            setInboxError(error?.message || 'Nao foi possivel concluir a triagem.');
        } finally {
            setInboxActionId(null);
        }
    };

    const startInboxResize = (event: React.PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setIsInboxResizing(true);
    };

    const resetInboxDetailWidth = () => {
        setInboxDetailWidth(clampInboxDetailWidth(INBOX_DETAIL_DEFAULT_WIDTH, inboxSplitContainerRef.current?.getBoundingClientRect().width));
    };

    const renderInboxViewLegacy = () => (
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-sm transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
            <div className="shrink-0 border-b border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Inbox CRM Outlook</h3>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">E-mails recebidos sem vinculo para triagem manual.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {([
                            ['NEW', 'Novos', inboxCounts.NEW, MailCheck],
                            ['SUGGESTED', 'Sugeridos', inboxCounts.SUGGESTED, Search],
                            ['LINKED', 'Vinculados', inboxCounts.LINKED, Link2],
                            ['IGNORED', 'Ignorados', inboxCounts.IGNORED, Ban]
                        ] as const).map(([key, label, count, Icon]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setInboxFilter(key)}
                                className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-black transition ${inboxFilter === key ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] dark:text-[var(--tenant-primary-on-dark)]' : 'border-[var(--tenant-border)] bg-[var(--tenant-panel)] text-slate-500 hover:border-[var(--tenant-primary-border)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300'}`}
                            >
                                <Icon size={13} />
                                {label}
                                <span className="rounded bg-[var(--tenant-control)] px-1.5 py-0.5 text-[10px] dark:bg-[var(--tenant-control-dark)]">{count}</span>
                            </button>
                        ))}
                        {microsoftConnection.connected ? (
                            <button
                                type="button"
                                disabled={microsoftWorkspaceLoading}
                                onClick={() => onSyncMicrosoft()}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 text-xs font-black text-slate-600 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300"
                            >
                                <RefreshCw size={14} className={microsoftWorkspaceLoading ? 'animate-spin' : ''} />
                                {microsoftWorkspaceLoading ? 'Sincronizando...' : 'Sincronizar Outlook'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={microsoftWorkspaceLoading}
                                onClick={() => onConnectMicrosoft()}
                                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-3 text-xs font-black text-[var(--tenant-primary)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 dark:text-[var(--tenant-primary-on-dark)]"
                            >
                                <MailCheck size={14} />
                                Conectar Outlook
                            </button>
                        )}
                    </div>
                </div>
                {inboxError && (
                    <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{inboxError}</div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {filteredInboxCommunications.length === 0 ? (
                    <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-control)] px-4 text-center dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                        <MailCheck className="mb-3 text-slate-300" size={30} />
                        <p className="text-sm font-black text-slate-700 dark:text-slate-200">Nenhum e-mail neste filtro</p>
                        <p className="mt-1 max-w-md text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {microsoftConnection.connected ? 'Use Sincronizar Outlook para buscar mensagens novas da Inbox Microsoft.' : 'Conecte o Outlook neste tenant para sincronizar caixas compartilhadas.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredInboxCommunications.map(communication => {
                            const suggestion = getInboxSuggestion(communication);
                            const status = getCommunicationTriageStatus(communication);
                            const selectedClientId = inboxClientSelection[communication.id] || suggestion.client?.id || '';
                            const selectedProposalId = inboxProposalSelection[communication.id] || '';
                            const senderDomain = getEmailDomain(communication.fromEmail);
                            const isBusy = inboxActionId?.startsWith(`${communication.id}-`);
                            return (
                                <article key={communication.id} className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] shadow-sm transition-colors hover:border-[var(--tenant-primary-border)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                    <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_440px]">
                                        <div className="min-w-0 p-4">
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${status === 'NEW' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : status === 'LINKED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-[var(--tenant-panel)] text-slate-600 dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300'}`}>
                                                    {status === 'NEW' ? 'Novo' : status === 'LINKED' ? 'Vinculado' : 'Ignorado'}
                                                </span>
                                                {communication.sourceMailboxEmail && (
                                                    <span className="inline-flex items-center gap-1 rounded border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-2 py-0.5 text-[10px] font-black uppercase text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300">
                                                        <Building2 size={11} />
                                                        {communication.sourceMailboxLabel || communication.sourceMailboxEmail}
                                                    </span>
                                                )}
                                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{senderDomain || 'sem dominio'}</span>
                                                <span className="text-[11px] font-bold text-slate-400">{new Date(communication.receivedAt || communication.createdAt).toLocaleString('pt-BR')}</span>
                                            </div>
                                            <h4 className="line-clamp-2 break-words text-base font-black leading-snug text-slate-800 dark:text-slate-100">{communication.subject || '(sem assunto)'}</h4>
                                            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                <span className="truncate">{communication.fromEmail || 'remetente nao identificado'}</span>
                                            </div>
                                            {communication.bodyPreview && <p className="mt-3 line-clamp-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">{communication.bodyPreview}</p>}
                                            <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-xs font-semibold text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300">
                                                <Search size={13} className="shrink-0 text-slate-400" />
                                                <span className="truncate">
                                                {suggestion.kind === 'contact' && suggestion.client && `Sugestao: contato existente em ${suggestion.client.name}.`}
                                                {suggestion.kind === 'domain' && suggestion.client && `Sugestao: dominio parecido com ${suggestion.client.name}.`}
                                                {suggestion.kind === 'lead' && 'Sem match: candidato a novo lead.'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid w-full gap-2 border-t border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] xl:border-l xl:border-t-0">
                                            {!canManageInboxTriage && status !== 'LINKED' ? (
                                                <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 py-2 text-xs font-bold text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300">
                                                    Triagem restrita a gestores e administradores.
                                                </div>
                                            ) : (
                                            <>
                                            <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                                                <ClipboardCheck size={13} />
                                                Ações de triagem
                                            </div>
                                            <select
                                                value={selectedClientId}
                                                onChange={event => setInboxClientSelection(prev => ({ ...prev, [communication.id]: event.target.value }))}
                                                className="min-h-10 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 text-xs font-bold text-slate-700 outline-none focus:border-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-200"
                                            >
                                                <option value="">Selecionar cliente...</option>
                                                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                                            </select>
                                            <select
                                                value={selectedProposalId}
                                                onChange={event => setInboxProposalSelection(prev => ({ ...prev, [communication.id]: event.target.value }))}
                                                className="min-h-10 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 text-xs font-bold text-slate-700 outline-none focus:border-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-200"
                                            >
                                                <option value="">Selecionar negociacao...</option>
                                                {activeProposals.map(proposal => <option key={proposal.id} value={proposal.id}>#{proposal.proposalId} - {proposal.clientName}</option>)}
                                            </select>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button disabled={isBusy} type="button" onClick={() => runInboxAction(communication, 'createLead')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--tenant-primary)] px-3 text-xs font-black text-white transition hover:brightness-95 disabled:opacity-50"><UserPlus size={14} /> Criar lead</button>
                                                <button disabled={isBusy} type="button" onClick={() => runInboxAction(communication, 'createLeadProposal')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-3 text-xs font-black text-[var(--tenant-primary)] transition hover:brightness-95 disabled:opacity-50 dark:text-[var(--tenant-primary-on-dark)]"><Briefcase size={14} /> Lead + oportunidade</button>
                                                <button disabled={isBusy || !selectedClientId} type="button" onClick={() => runInboxAction(communication, 'linkClient')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 text-xs font-black text-slate-600 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] disabled:opacity-50 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300"><Building2 size={14} /> Vincular cliente</button>
                                                <button disabled={isBusy || !selectedProposalId} type="button" onClick={() => runInboxAction(communication, 'linkProposal')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 text-xs font-black text-slate-600 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] disabled:opacity-50 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300"><Link2 size={14} /> Vincular negociação</button>
                                                <button disabled={isBusy || (!selectedClientId && !selectedProposalId)} type="button" onClick={() => runInboxAction(communication, 'createTask')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 text-xs font-black text-slate-600 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] disabled:opacity-50 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300"><ClipboardCheck size={14} /> Criar tarefa</button>
                                                <button disabled={isBusy} type="button" onClick={() => runInboxAction(communication, 'ignore')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"><Ban size={14} /> Ignorar</button>
                                            </div>
                                            {communication.externalUrl && (
                                                <a href={communication.externalUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 text-xs font-black text-slate-600 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300">
                                                    <ExternalLink size={13} /> Abrir no Outlook
                                                </a>
                                            )}
                                            </>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );

    const renderInboxActionPanel = (communication?: CRMCommunication) => {
        if (!communication) {
            return (
                <aside className="hidden min-h-0 border-l border-[var(--tenant-border)] bg-[var(--tenant-panel)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] xl:flex xl:w-full xl:items-center xl:justify-center">
                    <p className="px-6 text-center text-xs font-bold text-slate-400">Selecione um e-mail para ver detalhes e acoes.</p>
                </aside>
            );
        }
        const suggestion = getInboxSuggestion(communication);
        const status = getCommunicationTriageStatus(communication);
        const selectedClientId = inboxClientSelection[communication.id] || suggestion.client?.id || '';
        const selectedProposalId = inboxProposalSelection[communication.id] || '';
        const isBusy = inboxActionId?.startsWith(`${communication.id}-`);

        return (
            <aside className="min-h-0 border-t border-[var(--tenant-border)] bg-[var(--tenant-panel)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] xl:w-full xl:border-l xl:border-t-0">
                <div className="flex h-full min-h-0 flex-col">
                    <div className="shrink-0 border-b border-[var(--tenant-border)] p-4 dark:border-[var(--tenant-border-dark)]">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${status === 'NEW' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : status === 'LINKED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-[var(--tenant-control)] text-slate-600 dark:bg-[var(--tenant-control-dark)] dark:text-slate-300'}`}>
                                {status === 'NEW' ? 'Novo' : status === 'LINKED' ? 'Vinculado' : 'Ignorado'}
                            </span>
                            {communication.sourceMailboxEmail && (
                                <span className="inline-flex items-center gap-1 rounded border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-2 py-0.5 text-[10px] font-black uppercase text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300">
                                    <Building2 size={11} />
                                    {communication.sourceMailboxLabel || communication.sourceMailboxEmail}
                                </span>
                            )}
                        </div>
                        <h4 className="line-clamp-2 text-sm font-black leading-snug text-slate-800 dark:text-slate-100">{communication.subject || '(sem assunto)'}</h4>
                        <p className="mt-1 truncate text-xs font-bold text-slate-500 dark:text-slate-400">{communication.fromEmail || 'remetente nao identificado'}</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-400">{new Date(communication.receivedAt || communication.createdAt).toLocaleString('pt-BR')}</p>
                    </div>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 custom-scrollbar">
                        {communication.bodyPreview && (
                            <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 text-xs font-medium leading-relaxed text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300">
                                {communication.bodyPreview}
                            </div>
                        )}
                        <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-xs font-semibold text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300">
                            <Search size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate">
                                {suggestion.kind === 'contact' && suggestion.client && `Sugestao: contato existente em ${suggestion.client.name}.`}
                                {suggestion.kind === 'domain' && suggestion.client && `Sugestao: dominio parecido com ${suggestion.client.name}.`}
                                {suggestion.kind === 'lead' && 'Sem match: candidato a novo lead.'}
                            </span>
                        </div>

                        {!canManageInboxTriage && status !== 'LINKED' ? (
                            <div className="rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-xs font-bold text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300">
                                Triagem restrita a gestores e administradores.
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                                    <ClipboardCheck size={13} />
                                    Acoes de triagem
                                </div>
                                <select
                                    value={selectedClientId}
                                    onChange={event => setInboxClientSelection(prev => ({ ...prev, [communication.id]: event.target.value }))}
                                    className="min-h-10 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 text-xs font-bold text-slate-700 outline-none focus:border-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-200"
                                >
                                    <option value="">Selecionar cliente...</option>
                                    {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                                </select>
                                <select
                                    value={selectedProposalId}
                                    onChange={event => setInboxProposalSelection(prev => ({ ...prev, [communication.id]: event.target.value }))}
                                    className="min-h-10 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 text-xs font-bold text-slate-700 outline-none focus:border-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-200"
                                >
                                    <option value="">Selecionar negociacao...</option>
                                    {activeProposals.map(proposal => <option key={proposal.id} value={proposal.id}>#{proposal.proposalId} - {proposal.clientName}</option>)}
                                </select>
                                <div className="grid grid-cols-2 gap-2">
                                    <button title="Criar lead a partir deste e-mail" disabled={isBusy} type="button" onClick={() => runInboxAction(communication, 'createLead')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--tenant-primary)] px-3 text-xs font-black text-white transition hover:brightness-95 disabled:opacity-50"><UserPlus size={14} /> Criar lead</button>
                                    <button title="Criar lead e oportunidade no funil atual" disabled={isBusy} type="button" onClick={() => runInboxAction(communication, 'createLeadProposal')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-3 text-xs font-black text-[var(--tenant-primary)] transition hover:brightness-95 disabled:opacity-50 dark:text-[var(--tenant-primary-on-dark)]"><Briefcase size={14} /> Lead + oportunidade</button>
                                    <button title={selectedClientId ? 'Vincular conversa ao cliente selecionado' : 'Selecione um cliente para vincular'} disabled={isBusy || !selectedClientId} type="button" onClick={() => runInboxAction(communication, 'linkClient')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 text-xs font-black text-slate-600 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] disabled:opacity-50 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300"><Building2 size={14} /> Vincular cliente</button>
                                    <button title={selectedProposalId ? 'Vincular conversa a negociacao selecionada' : 'Selecione uma negociacao para vincular'} disabled={isBusy || !selectedProposalId} type="button" onClick={() => runInboxAction(communication, 'linkProposal')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 text-xs font-black text-slate-600 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] disabled:opacity-50 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300"><Link2 size={14} /> Vincular negociacao</button>
                                    <button title={selectedClientId || selectedProposalId ? 'Criar tarefa de resposta' : 'Selecione cliente ou negociacao para criar tarefa'} disabled={isBusy || (!selectedClientId && !selectedProposalId)} type="button" onClick={() => runInboxAction(communication, 'createTask')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 text-xs font-black text-slate-600 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] disabled:opacity-50 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300"><ClipboardCheck size={14} /> Criar tarefa</button>
                                    <button title="Ignorar e remover da fila de novos" disabled={isBusy} type="button" onClick={() => runInboxAction(communication, 'ignore')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"><Ban size={14} /> Ignorar</button>
                                </div>
                                {communication.externalUrl && (
                                    <a href={communication.externalUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 text-xs font-black text-slate-600 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300">
                                        <ExternalLink size={13} /> Abrir no Outlook
                                    </a>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </aside>
        );
    };

    const renderInboxView = () => (
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-sm transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
            <div className="shrink-0 border-b border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Inbox CRM Outlook</h3>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Triagem compacta de e-mails recebidos.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {([
                            ['NEW', 'Novos', inboxCounts.NEW, MailCheck],
                            ['SUGGESTED', 'Sugeridos', inboxCounts.SUGGESTED, Search],
                            ['LINKED', 'Vinculados', inboxCounts.LINKED, Link2],
                            ['IGNORED', 'Ignorados', inboxCounts.IGNORED, Ban]
                        ] as const).map(([key, label, count, Icon]) => (
                            <button key={key} type="button" onClick={() => setInboxFilter(key)} className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-black transition ${inboxFilter === key ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] dark:text-[var(--tenant-primary-on-dark)]' : 'border-[var(--tenant-border)] bg-[var(--tenant-panel)] text-slate-500 hover:border-[var(--tenant-primary-border)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300'}`}>
                                <Icon size={13} /> {label}
                                <span className="rounded bg-[var(--tenant-control)] px-1.5 py-0.5 text-[10px] dark:bg-[var(--tenant-control-dark)]">{count}</span>
                            </button>
                        ))}
                        {microsoftConnection.connected ? (
                            <button type="button" disabled={microsoftWorkspaceLoading} onClick={() => onSyncMicrosoft()} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 text-xs font-black text-slate-600 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300">
                                <RefreshCw size={14} className={microsoftWorkspaceLoading ? 'animate-spin' : ''} />
                                {microsoftWorkspaceLoading ? 'Sincronizando...' : 'Sincronizar Outlook'}
                            </button>
                        ) : (
                            <button type="button" disabled={microsoftWorkspaceLoading} onClick={() => onConnectMicrosoft()} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-3 text-xs font-black text-[var(--tenant-primary)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 dark:text-[var(--tenant-primary-on-dark)]">
                                <MailCheck size={14} /> Conectar Outlook
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-h-9 flex-1 items-center gap-2 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                        <Search size={14} className="shrink-0 text-slate-400" />
                        <input value={inboxSearchTerm} onChange={event => setInboxSearchTerm(event.target.value)} placeholder="Buscar remetente, assunto, dominio ou caixa..." className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200" />
                        {inboxSearchTerm && <button type="button" onClick={() => setInboxSearchTerm('')} className="text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200" aria-label="Limpar busca"><X size={14} /></button>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {([
                            ['TODAY', 'Hoje'],
                            ['SEVEN_DAYS', '7 dias'],
                            ['THIRTY_DAYS', '30 dias'],
                            ['ALL', 'Todos']
                        ] as const).map(([key, label]) => (
                            <button key={key} type="button" onClick={() => setInboxDateFilter(key)} className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-black transition ${inboxDateFilter === key ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] dark:text-[var(--tenant-primary-on-dark)]' : 'border-[var(--tenant-border)] bg-[var(--tenant-panel)] text-slate-500 hover:border-[var(--tenant-primary-border)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300'}`}>
                                <CalendarDays size={13} /> {label}
                            </button>
                        ))}
                    </div>
                </div>
                {inboxError && <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{inboxError}</div>}
            </div>

            <div
                ref={inboxSplitContainerRef}
                className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(520px,1fr)_8px_minmax(320px,var(--inbox-detail-width))]"
                style={{ '--inbox-detail-width': `${inboxDetailWidth}px` } as React.CSSProperties}
            >
                <div className="min-h-0 overflow-y-auto p-3 custom-scrollbar">
                    {filteredInboxCommunications.length === 0 ? (
                        <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-control)] px-4 text-center dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                            <MailCheck className="mb-3 text-slate-300" size={30} />
                            <p className="text-sm font-black text-slate-700 dark:text-slate-200">Nenhum e-mail neste filtro</p>
                            <p className="mt-1 max-w-md text-xs font-semibold text-slate-500 dark:text-slate-400">{microsoftConnection.connected ? 'Ajuste os filtros ou sincronize o Outlook para buscar novas mensagens.' : 'Conecte o Outlook neste tenant para sincronizar caixas compartilhadas.'}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {groupedInboxCommunications.map(group => (
                                <section key={group.label} className="space-y-1.5">
                                    <div className="sticky top-0 z-10 flex items-center gap-2 bg-[var(--tenant-panel)] py-1 text-[10px] font-black uppercase tracking-wide text-slate-400 dark:bg-[var(--tenant-panel-dark)]">
                                        <CalendarDays size={12} /> {group.label}
                                        <span className="rounded bg-[var(--tenant-control)] px-1.5 py-0.5 dark:bg-[var(--tenant-control-dark)]">{group.items.length}</span>
                                    </div>
                                    <div className="overflow-hidden rounded-md border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]">
                                        {group.items.map(communication => {
                                            const suggestion = getInboxSuggestion(communication);
                                            const status = getCommunicationTriageStatus(communication);
                                            const senderDomain = getEmailDomain(communication.fromEmail);
                                            const isSelected = selectedInboxCommunication?.id === communication.id;
                                            return (
                                                <button key={communication.id} type="button" onClick={() => setSelectedInboxCommunicationId(communication.id)} className={`grid min-h-[72px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--tenant-border)] px-3 py-2 text-left transition last:border-b-0 dark:border-[var(--tenant-border-dark)] ${isSelected ? 'bg-[var(--tenant-primary-soft)] ring-1 ring-inset ring-[var(--tenant-primary-border)]' : 'bg-[var(--tenant-control)] hover:bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] dark:hover:bg-[var(--tenant-panel-dark)]'}`}>
                                                    <div className="min-w-0">
                                                        <div className="mb-1 flex min-w-0 items-center gap-1.5">
                                                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${status === 'NEW' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : status === 'LINKED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-[var(--tenant-panel)] text-slate-600 dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300'}`}>{status === 'NEW' ? 'Novo' : status === 'LINKED' ? 'Vinculado' : 'Ignorado'}</span>
                                                            {communication.sourceMailboxLabel && <span className="inline-flex shrink-0 items-center gap-1 rounded border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300"><Building2 size={10} /> {communication.sourceMailboxLabel}</span>}
                                                            <span className="truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">{communication.fromEmail || 'remetente nao identificado'}</span>
                                                        </div>
                                                        <p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">{communication.subject || '(sem assunto)'}</p>
                                                        <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{communication.bodyPreview || (suggestion.kind === 'lead' ? 'Candidato a novo lead.' : 'Possivel vinculo encontrado.')}</p>
                                                    </div>
                                                    <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                                                        <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">{new Date(communication.receivedAt || communication.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className="max-w-[120px] truncate text-[10px] font-bold text-slate-400">{senderDomain || 'sem dominio'}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    title="Arraste para ajustar o painel de detalhes"
                    aria-label="Ajustar largura do painel de detalhes"
                    onPointerDown={startInboxResize}
                    onDoubleClick={resetInboxDetailWidth}
                    className={`group relative hidden cursor-col-resize items-center justify-center border-x border-[var(--tenant-border)] bg-[var(--tenant-panel)] transition dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] xl:flex ${isInboxResizing ? 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)]' : 'hover:border-[var(--tenant-primary-border)] hover:bg-[var(--tenant-primary-soft)]'}`}
                >
                    <span className={`h-10 w-1 rounded-full transition ${isInboxResizing ? 'bg-[var(--tenant-primary)]' : 'bg-slate-500/30 group-hover:bg-[var(--tenant-primary)]'}`} />
                    <GripVertical size={14} className={`absolute text-slate-400 transition ${isInboxResizing ? 'text-[var(--tenant-primary)] opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                </button>
                {renderInboxActionPanel(selectedInboxCommunication)}
            </div>
        </div>
    );

    const filteredProposals = activeProposals.filter(p => {
        const matchesSearch = p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.proposalId.includes(searchTerm) ||
            p.responsible.toLowerCase().includes(searchTerm.toLowerCase());

        // Status filters
        const matchesFrozen = showFrozen || p.status !== 'Frozen';
        const isArchived = p.status === 'Archived';

        const matchesPipeline = activePipelineOption
            ? getPipelineOptionForProposal(p) === activePipelineOption.key
            : false;

        return matchesSearch && matchesFrozen && !isArchived && matchesPipeline;
    });

    // --- KPI Calculations ---
    const totalQuotesForConversion = activeProposals.filter(p => p.status !== 'Frozen' && p.status !== 'Archived').length;
    const wonQuotes = activeProposals.filter(p => isWonStage(p.stage, getProposalPipeline(p)));
    const totalGains = wonQuotes.reduce((acc, p) => acc + p.value, 0);

    // Pipeline should exclude Won and Lost and Archived
    const totalPipeline = activeProposals
        .filter(p =>
            !isClosedStage(p.stage, getProposalPipeline(p)) &&
            p.status === 'Active' &&
            activePipelineOption &&
            getPipelineOptionForProposal(p) === activePipelineOption.key
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

    const kanbanColumns = activePipeline ? getKanbanStagesForPipeline(activePipeline, filteredProposals) : [];

    const getStatusBadge = (stage: OpportunityStage, status: OpportunityStatus = 'Active', pipelineConfig = activePipeline) => {
        if (status === 'Frozen') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] border border-[var(--tenant-secondary-border)] transition-colors"><Snowflake size={12} /> Congelado</span>;
        if (status === 'Archived') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] text-slate-500 dark:text-slate-400 border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] transition-colors"><Trash2 size={12} /> Arquivado</span>;
        if (!pipelineConfig) return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--tenant-control)] text-slate-500 border border-[var(--tenant-border)] transition-colors dark:bg-[var(--tenant-control-dark)] dark:text-slate-400 dark:border-[var(--tenant-border-dark)]"><AlertCircle size={12} /> Sem modulo</span>;

        const stageConfig = getPipelineStage(pipelineConfig, stage);
        const label = getPipelineStageLabel(pipelineConfig, stage);
        const category = getPipelineStageCategory(stage, pipelineConfig);
        const style = getPipelineStageStyle(stageConfig);
        const Icon = isWonStage(stage, pipelineConfig)
            ? CheckCircle
            : isLostStage(stage, pipelineConfig)
                ? XCircle
                : category === 'pricing'
                    ? Edit3
                    : category === 'proposal'
                        ? FileText
                        : category === 'negotiation' || category === 'closing'
                            ? Clock
                            : null;

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${style.badge}`}>
                {Icon && <Icon size={12} />}
                {label}
            </span>
        );
    };

    const getMotionBadge = (motion: OpportunityMotion) => {
        switch (motion) {
            case 'NewBusiness': return <span className="text-[10px] bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-800 font-bold transition-colors">Novo</span>;
            case 'Renewal': return <span className="text-[10px] bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] px-1.5 py-0.5 rounded border border-[var(--tenant-secondary-border)] font-bold transition-colors">Renovação</span>;
            case 'Expansion': return <span className="text-[10px] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] px-1.5 py-0.5 rounded border border-[var(--tenant-primary-border)] font-bold transition-colors">Expansão</span>;
            case 'Addendum': return <span className="text-[10px] bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] font-bold transition-colors">Aditivo</span>;
            case 'Reactivation': return <span className="text-[10px] bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-800 font-bold transition-colors">Reativação</span>;
        }
    };

    const getProposalTypeLabel = (proposal: ProposalData) => {
        const pricingLabel = getPricingModuleDefinition(proposal.pricingModule)?.shortLabel;
        if (pricingLabel) return pricingLabel;
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
                className={`rounded-lg border bg-[var(--tenant-panel)] px-3 py-2.5 shadow-sm transition active:scale-[0.99] dark:bg-[var(--tenant-panel-dark)] ${isSelected ? 'border-[var(--tenant-primary-border)] ring-1 ring-[var(--tenant-primary-soft)]' : 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]'} ${prop.status === 'Frozen' ? 'opacity-70 grayscale-[0.4]' : ''}`}
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
                        {getStatusBadge(prop.stage, prop.status, getProposalPipeline(prop))}
                        {nextTask && (
                            <span className={`inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold ${isTaskOverdue(nextTask) ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300' : 'border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300'}`}>
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
                            className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-600 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-200"
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
                        icon={crmSection === 'inbox' ? MailCheck : PieChart}
                        title={crmSection === 'inbox' ? 'Inbox CRM' : 'Oportunidades e Propostas'}
                        subtitle={crmSection === 'inbox' ? 'Triagem de e-mails recebidos no Outlook.' : 'Pipeline comercial, cotacoes e proximas atividades.'}
                        actions={
                        <>
                            {crmSection === 'pipeline' && (
                            <>
                            {businessUnit === 'SERVICES' && hasServicesModule && (
                                <div className="flex rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-1 shadow-sm transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                    <button
                                        onClick={() => {
                                            setPipelineFilter(getPipelineOptionKey('SERVICES_COMPLEX', 'CONTINUOUS'));
                                            setCreateType('CONTINUOUS');
                                            setCreatePricingModule('SERVICES_COMPLEX');
                                        }}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${pipelineFilter === getPipelineOptionKey('SERVICES_COMPLEX', 'CONTINUOUS') ? 'bg-[var(--tenant-primary)] text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                    >
                                        <Repeat size={14} /> Contínuo
                                    </button>
                                    <button
                                        onClick={() => {
                                            setPipelineFilter(getPipelineOptionKey('SERVICES_COMPLEX', 'SPOT'));
                                            setCreateType('SPOT');
                                            setCreatePricingModule('SERVICES_COMPLEX');
                                        }}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${pipelineFilter === getPipelineOptionKey('SERVICES_COMPLEX', 'SPOT') ? 'bg-[var(--tenant-primary)] text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                    >
                                        <Zap size={14} /> Spot
                                    </button>
                                </div>
                            )}

                            {businessUnit === 'PRODUCTS' && hasProductModule && (
                                <div className="flex rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-1 shadow-sm transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                    {pipelineOptions.map(option => {
                                        const Icon = getPipelineOptionIcon(option);
                                        return (
                                            <button
                                                key={option.key}
                                                onClick={() => {
                                                    setPipelineFilter(option.key);
                                                    setCreateType(option.proposalType);
                                                    setCreatePricingModule(option.pricingModule);
                                                }}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${pipelineFilter === option.key ? 'bg-[var(--tenant-primary)] text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                            >
                                                <Icon size={14} /> {option.shortLabel}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-1 shadow-sm transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`} title="Kanban"><LayoutGrid size={20} /></button>
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)] shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`} title="Lista"><List size={20} /></button>
                            </div>
                            <button
                                onClick={() => setShowFrozen(!showFrozen)}
                                title={showFrozen ? 'Ocultar congelados' : 'Mostrar congelados'}
                                aria-label={showFrozen ? 'Ocultar congelados' : 'Mostrar congelados'}
                                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-all ${showFrozen ? 'border-[var(--tenant-secondary-border)] bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)]' : 'border-[var(--tenant-border)] bg-[var(--tenant-control)] text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400'}`}
                            >
                                <Snowflake size={16} />
                                <span className="hidden sm:inline">{showFrozen ? 'Ocultar Congelados' : 'Mostrar Congelados'}</span>
                            </button>
                            <div className="mx-1 hidden h-10 w-px bg-[var(--tenant-border)] transition-colors dark:bg-[var(--tenant-border-dark)] sm:block"></div>
                            <Button
                                type="button"
                                variant="secondary"
                                icon={Activity}
                                className="min-h-11 flex-1 sm:w-auto sm:flex-none"
                                onClick={() => openQuickActivityModal('Call')}
                            >
                                Apontar
                            </Button>
                            {activePipelineOptions.length > 0 && (
                            <Button
                                type="button"
                                icon={Plus}
                                className="min-h-11 flex-1 sm:w-auto sm:flex-none"
                                onClick={() => {
                                const createOption = activePipelineOptions.find(option => option.key === pipelineFilter) || activePipelineOptions[0];
                                if (!createOption) return;
                                if (businessUnit === 'PRODUCTS' && hasProductModule) {
                                    setCreateType(createOption.proposalType);
                                    setCreatePricingModule(createOption.pricingModule);
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
                            )}
                            </>
                            )}
                        </>
                        }
                    />
                    {crmSection === 'pipeline' && (
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
                                    className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-1 text-[10px] font-black text-[var(--tenant-text)] shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)]"
                                >
                                    <Icon size={16} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden px-3 pb-4 sm:px-6 lg:px-8 lg:pb-8 flex flex-col">
                    {crmSection === 'inbox' ? renderInboxView() : !activePipelineOption ? (
                        <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-8 text-center transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                            <div className="max-w-md">
                                <Package className="mx-auto mb-4 text-slate-300 dark:text-slate-600" size={36} />
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">CRM sem modulo de cotacao ativo</h3>
                                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Contas, contatos, tarefas e inbox continuam disponiveis. Ative Servicos, Produto, SaaS ou IoT no SuperAdmin para criar novas cotacoes.
                                </p>
                            </div>
                        </div>
                    ) : viewMode === 'list' ? (
                        /* LIST VIEW */
                        <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] shadow-sm transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                            <div className="flex shrink-0 items-center gap-3 border-b border-[var(--tenant-border)] bg-[var(--tenant-control)] p-2.5 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] sm:gap-4 sm:p-4">
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
                                    <div className="rounded-lg border-2 border-dashed border-[var(--tenant-border)] bg-[var(--tenant-control)] px-4 py-10 text-center dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                        <Search className="mx-auto mb-3 text-slate-300" size={28} />
                                        <p className="text-sm font-black text-slate-600 dark:text-slate-300">Nenhuma oportunidade encontrada</p>
                                    </div>
                                )}
                            </div>
                            <div className="hidden overflow-auto flex-1 custom-scrollbar lg:block">
                                <table className="w-full text-sm text-left relative">
                                    <thead className="sticky top-0 z-10 border-b border-[var(--tenant-border)] bg-[var(--tenant-control)] text-xs font-bold uppercase tracking-wider text-slate-500 shadow-sm transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">
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
                                    <tbody className="cursor-pointer divide-y divide-[var(--tenant-border)] text-slate-800 transition-colors dark:divide-[var(--tenant-border-dark)] dark:text-slate-200">
                                        {filteredProposals.map((prop) => {
                                            const isSelected = selectedPreviewId === prop.id;
                                            return (
                                                <tr
                                                    key={prop.id}
                                                    onClick={(e) => { e.stopPropagation(); handleRowClick(prop.id); }}
                                                    onDoubleClick={() => onSelectProposal(prop.id)}
                                                    onContextMenu={(e) => handleContextMenu(e, prop.id)}
                                                    className={`group border-l-4 transition-all ${isSelected ? 'border-l-[var(--tenant-primary)] bg-[var(--tenant-control-active)] shadow-inner dark:bg-[var(--tenant-control-active-dark)]' : 'border-l-transparent hover:border-l-[var(--tenant-primary-border)] hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)]'} ${prop.status === 'Frozen' ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                                >
                                                    <td className="px-6 py-4">{getStatusBadge(prop.stage, prop.status, getProposalPipeline(prop))}</td>
                                                    <td className="px-6 py-4">
                                                        <div className={`font-bold transition-colors ${isSelected ? 'text-[var(--tenant-primary)]' : 'text-slate-800 dark:text-slate-200'}`}>{prop.clientName}</div>
                                                        <p className="mt-0.5 font-mono text-xs text-slate-400 transition-colors dark:text-slate-500">#{prop.proposalId} <span className="ml-1 rounded bg-[var(--tenant-control)] px-1 transition-colors dark:bg-[var(--tenant-control-dark)]">v{prop.version}</span></p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border transition-colors ${prop.type === 'SPOT' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' : prop.type === 'PRODUCT' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] border-[var(--tenant-secondary-border)]'}`}>
                                                            {getProposalTypeLabel(prop)}
                                                        </span>
                                                        {getModuleDisabledNotice(prop) && (
                                                            <span title={getModuleDisabledNotice(prop) || undefined} className="ml-2 inline-flex rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                                Legado
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 transition-colors">
                                                            <div className="w-6 h-6 rounded-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 transition-colors">{prop.responsible.charAt(0)}</div>
                                                            <span className="text-xs font-medium">{prop.responsible}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100 transition-colors">{formatCurrency(prop.value)}</td>
                                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs transition-colors">{new Date(prop.expirationDate).toLocaleDateString('pt-BR')}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button onClick={(e) => { e.stopPropagation(); onSelectProposal(prop.id); }} className="rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--tenant-primary)] transition-colors hover:border-[var(--tenant-primary)] dark:text-[var(--tenant-primary-on-dark)]">
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
                                const colStyle = getPipelineStageStyle(col);

                                return (
                                    <div
                                        key={col.id}
                                        className="flex h-full min-w-[280px] w-full max-w-[320px] shrink-0 snap-center flex-col overflow-hidden rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-surface)] transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)]"
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, col.id)}
                                    >
                                        {/* Column Header */}
                                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${colStyle.barColor}`}></div>
                                                <h3 className={`font-bold text-sm text-slate-700 dark:text-slate-100 transition-colors`}>{col.label}</h3>
                                            </div>
                                            <span className="rounded border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-2 py-0.5 text-xs font-bold text-slate-500 shadow-sm transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-400">{colProposals.length}</span>
                                        </div>

                                        {/* Column Content */}
                                        <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                                            {colProposals
                                                .map(prop => (
                                                    <div
                                                        key={prop.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, prop.id)}
                                                        onClick={(e) => { e.stopPropagation(); handleRowClick(prop.id); }}
                                                        onDoubleClick={() => onSelectProposal(prop.id)}
                                                        onContextMenu={(e) => handleContextMenu(e, prop.id)}
                                                        className={`
                                                    group relative cursor-grab overflow-hidden rounded-lg border bg-[var(--tenant-panel)] p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md active:cursor-grabbing dark:bg-[var(--tenant-panel-dark)]
                                                    ${selectedPreviewId === prop.id ? 'border-[var(--tenant-primary-border)] ring-1 ring-[var(--tenant-primary-soft)] shadow-md' : 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]'}
                                                    border-l-4 ${colStyle.border}
                                                    ${prop.status === 'Frozen' ? 'grayscale-[0.8] opacity-70' : ''}
                                                `}
                                                    >
                                                        {prop.status === 'Frozen' && (
                                                            <div className="absolute top-0 right-0 p-1 bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] rounded-bl-lg transition-colors" title="Congelada">
                                                                <Snowflake size={14} />
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between items-start mb-3">
                                                            <span className="rounded border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-1.5 font-mono text-[10px] text-slate-400 transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-500">
                                                                #{prop.proposalId} v{prop.version}
                                                            </span>
                                                            <div className="flex gap-1 items-center">
                                                                {getMotionBadge(prop.motion)}
                                                                {prop.type === 'SPOT' && <Zap size={14} className="text-amber-500" title="Projeto Spot" />}
                                                                {prop.pricingModule === 'SAAS_SUBSCRIPTION'
                                                                    ? <CreditCard size={14} className="text-slate-500" title="Assinatura SaaS" />
                                                                    : prop.pricingModule === 'IOT_SUBSCRIPTION'
                                                                        ? <Activity size={14} className="text-[var(--tenant-secondary)]" title="IoT e sensores" />
                                                                        : prop.type === 'PRODUCT' && <Package size={14} className="text-emerald-500" title="Cotação de Produtos" />}
                                                                {getModuleDisabledNotice(prop) && (
                                                                    <span title={getModuleDisabledNotice(prop) || undefined} className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                                        Legado
                                                                    </span>
                                                                )}
                                                                <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        </div>

                                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 leading-tight line-clamp-2 transition-colors">{prop.clientName}</h4>
                                                        {(() => {
                                                            const nextTask = getPendingProposalTasks(prop.id)[0];
                                                            if (!nextTask) return null;
                                                            return (
                                                                <div className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-2 py-1 text-[10px] font-bold text-slate-500 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">
                                                                    <Clock size={11} />
                                                                    <span className="truncate">{nextTask.title}</span>
                                                                    <span className="shrink-0">{new Date(nextTask.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                                                </div>
                                                            );
                                                        })()}

                                                        <div className="flex justify-between items-end">
                                                            <div>
                                                                <p className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight transition-colors">{formatCurrency(prop.value)}</p>
                                                                {prop.pricingModule === 'SAAS_SUBSCRIPTION' ? (
                                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium transition-colors">MRR: <span className="font-bold text-[var(--tenant-primary)]">{formatCurrency(Math.max(0, ((prop.saasUnitPrice || 0) * (prop.saasQuantity || 1)) * (1 - (prop.saasMonthlyDiscount || 0))))}</span></p>
                                                                ) : (
                                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium transition-colors">Margem: <span className={prop.markup < 0.15 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'}>{formatPercent(prop.markup)}</span></p>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {prop.pricingModule !== 'SAAS_SUBSCRIPTION' && prop.markup < 0.15 && (
                                                                    <div className="w-5 h-5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center animate-pulse" title="Margem abaixo do limite (15%)">
                                                                        <AlertCircle size={12} />
                                                                    </div>
                                                                )}
                                                                <div className="rounded-md bg-[var(--tenant-control)] p-2 text-slate-400 transition-colors group-hover:bg-[var(--tenant-primary)] group-hover:text-white dark:bg-[var(--tenant-control-dark)] dark:text-slate-500 dark:group-hover:text-white">
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
                    mode="overlay"
                    panelClassName="overflow-x-hidden"
                >
                    <div className="p-4 sm:p-5 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)] shrink-0">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <span className={`mb-2 inline-flex px-2 py-1 rounded text-xs font-bold ${selectedProposal.type === 'SPOT' ? 'bg-amber-100 text-amber-700' : selectedProposal.type === 'PRODUCT' ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)]'}`}>
                                    {getProposalTypeLabel(selectedProposal).toUpperCase()}
                                </span>
                                <h2 className="font-bold text-xl text-slate-800 dark:text-slate-100 leading-tight">{selectedProposal.clientName}</h2>
                            </div>
                            <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => onSelectProposal(selectedProposal.id)}
                                    className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-md bg-[var(--tenant-primary)] px-3 text-xs font-black text-white shadow-sm transition hover:brightness-95 active:scale-95 sm:flex-none"
                                    title="Abrir editor completo"
                                    aria-label="Abrir editor completo"
                                >
                                    <ExternalLink size={15} />
                                    <span className="truncate">Abrir</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActionProposalId(selectedProposal.id);
                                        setTempNotes('');
                                        setIsNewVersionModalOpen(true);
                                    }}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] text-slate-600 transition hover:border-[var(--tenant-primary-border)] hover:bg-[var(--tenant-control)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300 dark:hover:text-[var(--tenant-primary-on-dark)]"
                                    title="Nova versão"
                                    aria-label="Nova versão"
                                >
                                    <Repeat size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDuplicateProposal(selectedProposal.id)}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] text-slate-600 transition hover:border-[var(--tenant-primary-border)] hover:bg-[var(--tenant-control)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300 dark:hover:text-[var(--tenant-primary-on-dark)]"
                                    title="Duplicar cotação"
                                    aria-label="Duplicar cotação"
                                >
                                    <Copy size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDeleteProposal(selectedProposal.id)}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/55"
                                    title="Arquivar / descartar"
                                    aria-label="Arquivar / descartar"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={closePreviewPanel}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] text-slate-500 transition hover:bg-[var(--tenant-control)] hover:text-slate-700 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300 dark:hover:text-slate-100"
                                    title="Fechar painel"
                                    aria-label="Fechar painel"
                                >
                                    <XCircle size={18} />
                                </button>
                            </div>
                        </div>

                        {selectedProposal.versionNotes && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-100 dark:border-amber-800 mt-2 italic shadow-sm">
                                Nota Nota da versão: {selectedProposal.versionNotes}
                            </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                            {getStatusBadge(selectedProposal.stage, selectedProposal.status, getProposalPipeline(selectedProposal))}
                            {getMotionBadge(selectedProposal.motion)}
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${selectedProposal.type === 'SPOT' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' : selectedProposal.type === 'PRODUCT' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] border-[var(--tenant-secondary-border)]'}`}>
                                {getProposalTypeLabel(selectedProposal)}
                            </span>
                        </div>

                        {/* Responsible and Version Info */}
                        <div className="mt-4 flex flex-col gap-2 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] p-3 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]">
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
                        <div className="flex border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)] pt-2 px-5 shrink-0 sticky top-0 z-10 transition-colors">
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
                                    <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
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
                                                className="rounded-lg border border-[var(--tenant-border)] px-3 py-2 text-xs font-bold text-slate-600 hover:bg-[var(--tenant-control)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--tenant-border-dark)] dark:text-slate-300 dark:hover:bg-[var(--tenant-control-dark)]"
                                            >
                                                {workspaceLoading ? 'Sincronizando...' : 'Sincronizar'}
                                            </button>
                                        </div>
                                    </div>

                                    {selectedProposalInboxOrigin && (
                                        <div className="rounded-lg border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] p-4 shadow-sm">
                                            <div className="flex min-w-0 items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-panel)] px-2 py-1 text-[10px] font-black uppercase text-[var(--tenant-primary)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-primary-on-dark)]">
                                                        <MailCheck size={12} />
                                                        Origem: Inbox CRM
                                                    </div>
                                                    <h4 className="line-clamp-2 text-sm font-black text-slate-800 dark:text-slate-100">{selectedProposalInboxOrigin.subject || '(sem assunto)'}</h4>
                                                    <div className="mt-2 grid gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                                        <span className="truncate">De: {selectedProposalInboxOrigin.fromEmail || 'remetente nao identificado'}</span>
                                                        {selectedProposalInboxOrigin.sourceMailboxEmail && (
                                                            <span className="truncate">Caixa: {selectedProposalInboxOrigin.sourceMailboxLabel || selectedProposalInboxOrigin.sourceMailboxEmail}</span>
                                                        )}
                                                        <span>{new Date(selectedProposalInboxOrigin.receivedAt || selectedProposalInboxOrigin.createdAt).toLocaleString('pt-BR')}</span>
                                                    </div>
                                                    {selectedProposalInboxOrigin.bodyPreview && (
                                                        <p className="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">{selectedProposalInboxOrigin.bodyPreview}</p>
                                                    )}
                                                </div>
                                                {selectedProposalInboxOrigin.externalUrl && (
                                                    <a
                                                        href={selectedProposalInboxOrigin.externalUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-panel)] px-3 text-xs font-black text-[var(--tenant-primary)] transition hover:brightness-95 dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-primary-on-dark)]"
                                                        title="Abrir e-mail de origem"
                                                        aria-label="Abrir e-mail de origem"
                                                    >
                                                        <ExternalLink size={13} />
                                                        Abrir e-mail
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {getModuleDisabledNotice(selectedProposal) && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                            {getModuleDisabledNotice(selectedProposal)}
                                        </div>
                                    )}

                                    {/* FINANCIAL SUMMARY BLOCK */}
                                    {(() => {
                                        if (!selectedProposal) return null;
                                        const financials = calculateFinancials(selectedProposal);
                                        const isSaas = selectedProposal.pricingModule === 'SAAS_SUBSCRIPTION';
                                        const saasGrossMrr = (selectedProposal.saasUnitPrice || 0) * (selectedProposal.saasQuantity || 1);
                                        const saasNetMrr = Math.max(0, saasGrossMrr - (saasGrossMrr * (selectedProposal.saasMonthlyDiscount || 0)));
                                        const saasTaxRate = selectedProposal.taxConfig.salesTaxes.filter(tax => tax.active).reduce((sum, tax) => sum + tax.rate, 0) || 0;
                                        const saasSetupFee = selectedProposal.saasSetupFee || 0;
                                        const displayMonthlyValue = isSaas ? saasNetMrr : financials.monthlyValue;
                                        const displayTaxRate = isSaas ? saasTaxRate : financials.salesTaxAmount / (financials.monthlyValue || 1);
                                        const totalHeadcount = Math.round(selectedProposal.roles?.reduce((acc, r) => acc + r.quantity, 0) * 10) / 10; // Arredonda para 1 casa decimal se necessário

                                        return (
                                            <div className="bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg p-5 shadow-sm">
                                                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] pb-2 flex items-center gap-2">
                                                    <PieChart size={14} /> Resumo da Cotação
                                                </h4>

                                                <div className="grid grid-cols-2 gap-3">
                                                    {isSaas && (
                                                        <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] p-3 rounded-lg shadow-sm">
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Setup</p>
                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><CreditCard size={14} className="text-slate-400" /> {formatCurrency(saasSetupFee)}</p>
                                                        </div>
                                                    )}
                                                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] p-3 rounded-lg shadow-sm">
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Preço (Mensal)</p>
                                                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(displayMonthlyValue)}</p>
                                                    </div>
                                                    {isSaas ? (
                                                        <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] p-3 rounded-lg shadow-sm">
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">ARR Liquido</p>
                                                            <p className="text-lg font-black text-[var(--tenant-primary)]">{formatCurrency(saasNetMrr * 12)}</p>
                                                        </div>
                                                    ) : (
                                                        <div className={`border p-3 rounded-lg shadow-sm ${selectedProposal.targetMargin < 0.15 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]'}`}>
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Margem (Target)</p>
                                                            <p className={`text-lg font-black ${selectedProposal.targetMargin < 0.15 ? 'text-red-600 dark:text-red-400' : 'text-[var(--tenant-primary)]'}`}>
                                                                {formatPercent(selectedProposal.targetMargin)}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {selectedProposal.type === 'CONTINUOUS' && (
                                                        <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] p-3 rounded-lg shadow-sm">
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Total de Vidas (HC)</p>
                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Users size={14} className="text-slate-400" /> {totalHeadcount}</p>
                                                        </div>
                                                    )}
                                                    {selectedProposal.type === 'SPOT' && (
                                                        <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] p-3 rounded-lg shadow-sm">
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Recursos Alocados</p>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Users size={14} className="text-slate-400" /> {selectedProposal.spotResources?.reduce((acc, r) => acc + r.quantity, 0) || 0} diárias</p>
                                                        </div>
                                                    )}
                                                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] p-3 rounded-lg shadow-sm">
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Carga Trib. s/ Venda</p>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Landmark size={14} className="text-slate-400" /> {formatPercent(displayTaxRate)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* ALERT: Margin Validation */}
                                    {selectedProposal.pricingModule !== 'SAAS_SUBSCRIPTION' && selectedProposal.targetMargin < 0.15 && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3 animate-pulse">
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
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                                {(selectedProposalPipeline?.stages || [])
                                                    .filter(stage => stage.active || stage.id === selectedProposal.stage)
                                                    .sort((a, b) => a.order - b.order)
                                                    .map(stage => (
                                                        <option key={stage.id} value={stage.id}>
                                                            {stage.label}{!stage.active ? ' (legada)' : ''}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estado Transversal</label>
                                            <select
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] outline-none transition-colors"
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
                                        <div className="bg-[var(--tenant-secondary-soft)] border border-[var(--tenant-secondary-border)] rounded-lg p-4 space-y-2">
                                            <div className="flex items-center gap-2 text-[var(--tenant-secondary)] font-bold text-xs uppercase">
                                                <Snowflake size={14} /> Detalhes do Congelamento
                                            </div>
                                            <p className="text-[11px] text-[var(--tenant-secondary)] font-medium">Motivo: <span className="font-normal italic text-[var(--tenant-secondary)]">{selectedProposal.frozenReason}</span></p>
                                            {selectedProposal.frozenUntil && (
                                                <p className="text-[11px] text-[var(--tenant-secondary)] font-medium">Revisar em: <span className="font-normal italic text-[var(--tenant-secondary)]">{new Date(selectedProposal.frozenUntil).toLocaleDateString()}</span></p>
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
                                                className="w-full mt-2 py-1.5 bg-[var(--tenant-primary)] text-white rounded-lg text-[10px] font-bold hover:brightness-95 transition-colors"
                                            >
                                                Reativar Oportunidade (Unfreeze)
                                            </button>
                                        </div>
                                    )}

                                    {false && <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg p-5 shadow-sm">
                                        <div className="flex items-center justify-between mb-4 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] pb-2">
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
                                            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] rounded-lg">Nenhuma atividade pendente.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {getPendingProposalTasks(selectedProposal.id).slice(0, 3).map(task => {
                                                    const contact = contacts.find(c => c.id === task.contactId);
                                                    return (
                                                        <div key={task.id} className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{task.title}</p>
                                                                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{contact?.name || 'Sem contato'} ? {task.type}</p>
                                                                </div>
                                                                <span className="shrink-0 rounded bg-[var(--tenant-panel)] px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">
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
                                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg p-5 shadow-sm">
                                        <div className="flex items-center justify-between mb-4 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] pb-2">
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
                                            <div className="bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)] p-3 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] mb-4 space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="Ex: Confirmação de Visita Técnica"
                                                    className="w-full bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[var(--tenant-primary)]"
                                                    value={tempMilestoneTitle}
                                                    onChange={(e) => setTempMilestoneTitle(e.target.value)}
                                                />
                                                <input
                                                    type="date"
                                                    className="w-full bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-[var(--tenant-primary)]"
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
                                            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] rounded-lg">Nenhum evento registrado.</p>
                                        )}

                                        {selectedProposal.milestones && selectedProposal.milestones.length > 0 && (
                                            <div className="space-y-3">
                                                {[...selectedProposal.milestones]
                                                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                                    .map((m) => (
                                                        <div key={m.id} className="flex gap-3 group relative pl-4 border-l-2 border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] hover:border-[var(--tenant-primary)] transition-colors">
                                                            <div className="absolute -left-[9px] top-0.5 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] rounded-full">
                                                                <button
                                                                    onClick={async () => {
                                                                        const updated = selectedProposal.milestones!.map(ms => ms.id === m.id ? { ...ms, completed: !ms.completed } : ms);
                                                                        await onUpdateMilestones(selectedProposal.id, updated);
                                                                    }}
                                                                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${m.completed ? 'bg-[var(--tenant-primary)] border-[var(--tenant-primary)] text-white' : 'bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] text-transparent hover:border-[var(--tenant-primary)]'}`}
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
                                                <div key={status} className="min-h-[360px] rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                    <div className="flex items-center justify-between border-b border-[var(--tenant-border)] px-3 py-2 dark:border-[var(--tenant-border-dark)]">
                                                        <span className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300">{getTaskStatusLabel(status)}</span>
                                                        <span className="rounded bg-[var(--tenant-panel)] px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-[var(--tenant-border)] dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-400">{statusTasks.length}</span>
                                                    </div>
                                                    <div className="space-y-2 p-2">
                                                        {statusTasks.length === 0 ? (
                                                            <div className="rounded-lg border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-2 py-6 text-center text-[11px] font-semibold text-slate-400 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-500">
                                                                Sem atividades.
                                                            </div>
                                                        ) : statusTasks.map(task => {
                                                            const contact = contacts.find(c => c.id === task.contactId);
                                                            const overdue = isTaskOverdue(task);
                                                            return (
                                                                <div key={task.id} className={`rounded-lg border bg-[var(--tenant-panel)] p-3 shadow-sm dark:bg-[var(--tenant-panel-dark)] ${overdue ? 'border-red-200 dark:border-red-900/60' : 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]'}`}>
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <span className="rounded bg-[var(--tenant-control)] px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-500 dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">{getTaskTypeLabel(task.type)}</span>
                                                                        <span className={`text-[10px] font-bold ${overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                            {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                    <p className="mt-2 text-xs font-black leading-snug text-slate-800 dark:text-slate-100">{task.title}</p>
                                                                    {task.description && <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">{task.description}</p>}
                                                                    <div className="mt-3 space-y-1 border-t border-[var(--tenant-border)] pt-2 text-[10px] font-semibold text-slate-500 dark:border-[var(--tenant-border-dark)] dark:text-slate-400">
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
                                        <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Conversas</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Threads de e-mail vinculadas a esta proposta.</p>
                                                </div>
                                                <span className="rounded-md bg-[var(--tenant-control)] px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">{traceability.threads.length}</span>
                                            </div>
                                            {traceability.threads.length === 0 ? (
                                                <p className="rounded-md border border-dashed border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-5 text-center text-xs font-semibold text-slate-400 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">Nenhuma conversa vinculada.</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {traceability.threads.map(thread => {
                                                        const threadExternalUrl = thread.messages.slice().reverse().find(message => message.externalUrl)?.externalUrl;
                                                        const threadTaskSource = thread.messages.slice().reverse().find(message => message.direction === 'inbound') || thread.lastMessage;
                                                        return (
                                                        <div key={thread.key} className="min-w-0 overflow-hidden rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                <div className="min-w-0 w-full">
                                                                    <p className="line-clamp-2 break-words text-sm font-black leading-snug text-slate-800 dark:text-slate-100">{thread.subject}</p>
                                                                    <p className="mt-1 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">{thread.participants.slice(0, 3).join(', ')}</p>
                                                                </div>
                                                                <div className="grid w-full grid-cols-4 gap-2 sm:w-auto sm:flex sm:shrink-0 sm:flex-wrap sm:justify-end">
                                                                    <button type="button" onClick={() => openThreadReplyComposer(selectedProposal, thread)} className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-2 text-[10px] font-black uppercase text-[var(--tenant-primary)] transition hover:brightness-95 dark:text-[var(--tenant-primary-on-dark)]" title="Responder" aria-label="Responder">
                                                                        <MailCheck size={13} />
                                                                        <span className="hidden sm:inline">Responder</span>
                                                                    </button>
                                                                    <button type="button" onClick={() => setExpandedThreadKey(thread.key)} className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-2 text-[10px] font-black uppercase text-slate-500 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300 dark:hover:text-[var(--tenant-primary-on-dark)]" title="Ver conversa" aria-label="Ver conversa">
                                                                        <History size={13} />
                                                                        <span className="hidden sm:inline">Ver conversa</span>
                                                                    </button>
                                                                    <button type="button" onClick={() => openReplyTaskFromCommunication(threadTaskSource)} className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-2 text-[10px] font-black uppercase text-slate-500 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300 dark:hover:text-[var(--tenant-primary-on-dark)]" title="Criar tarefa" aria-label="Criar tarefa">
                                                                        <Clock size={13} />
                                                                        <span className="hidden sm:inline">Criar tarefa</span>
                                                                    </button>
                                                                    {threadExternalUrl ? (
                                                                        <a href={threadExternalUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-panel)] px-2 text-[10px] font-black uppercase text-slate-500 transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-slate-300 dark:hover:text-[var(--tenant-primary-on-dark)]" title="Abrir no e-mail" aria-label="Abrir no e-mail">
                                                                            <ExternalLink size={13} />
                                                                            <span className="hidden sm:inline">Abrir</span>
                                                                        </a>
                                                                    ) : (
                                                                        <span className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--tenant-panel)] px-2 text-[10px] font-black uppercase text-slate-500 dark:bg-[var(--tenant-panel-dark)] sm:hidden">{thread.provider === 'microsoft' ? 'OUT' : 'GML'}</span>
                                                                    )}
                                                                    <span className="hidden rounded-md bg-[var(--tenant-panel)] px-2 py-1 text-[10px] font-black uppercase text-slate-500 dark:bg-[var(--tenant-panel-dark)] sm:inline-flex">{thread.provider === 'microsoft' ? 'Outlook' : 'Gmail'}</span>
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                                <span>{thread.messages.length} mensagens</span>
                                                                <span>{thread.inboundCount} recebidas</span>
                                                                <span>Ultima: {new Date(getCommunicationDate(thread.lastMessage)).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                            </div>
                                                            <div className="mt-3 space-y-2">
                                                                {thread.messages.slice(-3).map(message => (
                                                                    <div key={message.id} className={`min-w-0 overflow-hidden rounded-md border px-3 py-2 ${message.direction === 'inbound' ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20' : 'border-[var(--tenant-border)] bg-[var(--tenant-panel)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]'}`}>
                                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{message.direction === 'inbound' ? 'Resposta recebida' : 'E-mail enviado'}</span>
                                                                            <span className="text-[10px] font-semibold text-slate-500">{new Date(getCommunicationDate(message)).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                                        </div>
                                                                        {message.bodyPreview && <p className="mt-1 line-clamp-2 break-words whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-400">{message.bodyPreview}</p>}
                                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                                            <button type="button" onClick={() => setExpandedThreadKey(thread.key)} className="text-[10px] font-black text-slate-600 hover:text-[var(--tenant-primary)] dark:text-slate-300">Ver conversa</button>
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
                                                    );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 shadow-sm dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
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
                                                                <span className="rounded-md bg-[var(--tenant-control)] px-2 py-1 text-[10px] font-black uppercase text-slate-500 dark:bg-[var(--tenant-control-dark)] dark:text-slate-400">{day}</span>
                                                                <div className="h-px flex-1 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)]" />
                                                            </div>
                                                            <div className="space-y-3">
                                                                {items.map(item => {
                                                                    const communication = item.kind === 'communication' ? item.communication : null;
                                                                    const event = item.kind === 'external_event' ? item.event : null;
                                                                    const task = item.kind === 'task' ? item.task : null;
                                                                    const legacy = item.kind === 'timeline' ? item.event : null;
                                                                    return (
                                                                        <div key={item.id} className="flex gap-3 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-3 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                                                            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${communication?.direction === 'inbound' ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] text-[var(--tenant-primary)]'}`}>
                                                                                {communication ? <MailCheck size={14} /> : event ? <CalendarDays size={14} /> : task ? <CheckCircle size={14} /> : <Activity size={14} />}
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                                    <p className="break-words text-xs font-black text-slate-800 dark:text-slate-100">
                                                                                        {communication ? `${communication.direction === 'inbound' ? 'Resposta recebida' : 'E-mail enviado'}: ${communication.subject || '(sem assunto)'}` : event ? event.title : task ? task.title : legacy?.title}
                                                                                    </p>
                                                                                    <span className="text-[10px] font-semibold text-slate-500">{new Date(item.date).toLocaleString([], { timeStyle: 'short' })}</span>
                                                                                </div>
                                                                                {communication?.bodyPreview && <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{communication.bodyPreview}</p>}
                                                                                {event?.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{event.description}</p>}
                                                                                {task?.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{task.description}</p>}
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
                </ResponsiveDrawer>
            )
            }

            {/* CREATE MODAL */}
            {
                showCreateModal && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4">
                        <div className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border bg-[var(--tenant-panel)] shadow-2xl transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-lg">
                            <div className="relative shrink-0 border-b border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] sm:p-6">
                                <h3 className="px-9 text-center text-lg font-bold text-slate-800 dark:text-slate-100 sm:px-0 sm:text-xl">Nova Oportunidade Comercial</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center">
                                    {createStep === 1 ? 'Selecione o tipo de projeto' : 'Detalhes da Oportunidade'}
                                </p>
                                {createStep === 2 && businessUnit === 'SERVICES' && (
                                    <button onClick={() => setCreateStep(1)} className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-md text-slate-400 hover:bg-[var(--tenant-control)] hover:text-slate-700 dark:hover:bg-[var(--tenant-control-dark)] sm:left-6 sm:top-6">
                                        <ArrowRight size={20} className="rotate-180" />
                                    </button>
                                )}
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                                {createStep === 1 && (
                                    <div className={`grid grid-cols-1 ${businessUnit === 'SERVICES' || productPricingModules.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4 p-4 sm:p-6`}>
                                    {businessUnit === 'SERVICES' && hasServicesModule && (
                                        <>
                                            <button
                                                onClick={() => { setCreateType('CONTINUOUS'); setCreatePricingModule('SERVICES_COMPLEX'); setCreateStep(2); }}
                                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] hover:border-[var(--tenant-primary)] hover:shadow-lg transition-all group"
                                            >
                                                <div className="p-3 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] rounded-full text-[var(--tenant-secondary)] group-hover:scale-110 transition-transform shadow-sm">
                                                    <Repeat size={28} />
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="font-bold text-[var(--tenant-primary)] text-sm">Contrato Mensal</h4>
                                                    <p className="text-[9px] text-[var(--tenant-secondary)] mt-1">Mão de obra fixa, custos recorrentes.</p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => { setCreateType('SPOT'); setCreatePricingModule('SERVICES_COMPLEX'); setCreateStep(2); }}
                                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg border-2 border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 hover:border-amber-500 dark:hover:border-amber-400 hover:shadow-lg transition-all group"
                                            >
                                                <div className="p-3 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] rounded-full text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shadow-sm">
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
                                            className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg border-2 border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)] hover:border-[var(--tenant-border)] dark:hover:border-[var(--tenant-border)] hover:shadow-lg transition-all group"
                                        >
                                            <div className="p-3 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] rounded-full text-slate-800 dark:text-slate-100 group-hover:scale-110 transition-transform shadow-sm">
                                                <CreditCard size={28} />
                                            </div>
                                            <div className="text-center">
                                                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{getPricingModuleLabel('SAAS_SUBSCRIPTION')}</h4>
                                                <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">Mensalidade, licenças e implantação.</p>
                                            </div>
                                        </button>
                                    )}

                                    {businessUnit === 'PRODUCTS' && hasIotModule && (
                                        <button
                                            onClick={() => { setCreateType('PRODUCT'); setCreatePricingModule('IOT_SUBSCRIPTION'); setCreateStep(2); }}
                                            className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg border-2 border-[var(--tenant-secondary-border)] dark:border-[var(--tenant-secondary-border)] bg-[var(--tenant-secondary-soft)] dark:bg-[var(--tenant-secondary-soft)] hover:border-[var(--tenant-secondary-border)] dark:hover:border-[var(--tenant-secondary-border)] hover:shadow-lg transition-all group"
                                        >
                                            <div className="p-3 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] rounded-full text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] group-hover:scale-110 transition-transform shadow-sm">
                                                <Activity size={28} />
                                            </div>
                                            <div className="text-center">
                                                <h4 className="font-bold text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] text-sm">{getPricingModuleLabel('IOT_SUBSCRIPTION')}</h4>
                                                <p className="text-[9px] text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] mt-1">Sensores, instalacao e recorrencia.</p>
                                            </div>
                                        </button>
                                    )}

                                    {businessUnit === 'PRODUCTS' && hasProductSalesModule && (
                                        <button
                                            onClick={() => { setCreateType('PRODUCT'); setCreatePricingModule('PRODUCT_SALES'); setCreateStep(2); }}
                                            className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg border-2 border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/20 hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-lg transition-all group"
                                        >
                                            <div className="p-3 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)] rounded-full text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shadow-sm">
                                                <Package size={28} />
                                            </div>
                                            <div className="text-center">
                                                <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">{getPricingModuleLabel('PRODUCT_SALES')}</h4>
                                                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1">Cotação de produtos, peças e hardware.</p>
                                            </div>
                                        </button>
                                    )}
                                    </div>
                                )}

                                {createStep === 2 && (
                                    <div className="space-y-4 p-4 sm:p-6">
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
                                                    className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] text-sm font-bold text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] transition-colors"
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
                                                    className="w-full bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] text-sm font-bold text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] transition-colors"
                                                />
                                            </div>
                                        ) : (
                                            <input
                                                value={createInlineClientName}
                                                onChange={(e) => setCreateInlineClientName(e.target.value)}
                                                placeholder="Nome do primeiro cliente deste tenant"
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] text-sm font-bold text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] transition-colors"
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
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] text-sm font-bold text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] transition-colors"
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
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] text-sm font-medium text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] transition-colors"
                                                required
                                            >
                                                <option value="" disabled>Selecione uma proposta ativa relacionada...</option>
                                                {activeProposals
                                                    .filter(p => p.clientId === createClientId && isWonStage(p.stage, getProposalPipeline(p)))
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
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] text-sm font-medium text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] transition-colors"
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
                                            className="min-h-11 w-full rounded-lg bg-[var(--tenant-primary)] py-3 font-bold text-white shadow-sm transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isCreatingProposal ? 'Criando...' : 'Confirmar e Criar'}
                                        </button>
                                    </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex shrink-0 justify-center border-t border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] sm:pb-4">
                                <button onClick={closeCreateModal} className="min-h-11 rounded-md px-4 text-sm font-bold text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">Cancelar</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* CONTEXT MENU */}
            {
                contextMenu && (
                    <div
                        className="fixed isolate bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-2xl rounded-lg z-[100] py-1 w-60 animate-in fade-in zoom-in-95 duration-100 font-medium transition-colors"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <div className="px-3 py-2 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                                Ações Rápidas
                        </div>
                        <button
                            onClick={() => onSelectProposal(contextMenu.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-100 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] hover:text-[var(--tenant-primary)] flex items-center gap-2 transition-colors"
                        >
                            <ExternalLink size={14} className="text-slate-400" /> Abrir Editor
                        </button>
                        <button
                            onClick={() => {
                                setActionProposalId(contextMenu.id);
                                setTempNotes('');
                                setIsNewVersionModalOpen(true);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-100 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] hover:text-[var(--tenant-primary)] flex items-center gap-2 transition-colors"
                        >
                            <Repeat size={14} className="text-slate-400" /> Criar Nova Versão
                        </button>
                        <button
                            onClick={() => onDuplicateProposal(contextMenu.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-100 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] hover:text-[var(--tenant-primary)] flex items-center gap-2 transition-colors"
                        >
                            <Copy size={14} className="text-slate-400" /> Duplicar (Nova Cotação)
                        </button>
                        {onSaveContact && (
                            <button
                                onClick={() => openContactModal(contextMenu.id)}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-100 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] hover:text-emerald-600 dark:hover:text-emerald-300 flex items-center gap-2 transition-colors"
                            >
                                <UserPlus size={14} className="text-slate-400" /> Cadastrar Contato
                            </button>
                        )}
                        <div className="h-px bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] my-1"></div>
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
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-100 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] hover:text-[var(--tenant-primary)] flex items-center gap-2 transition-colors"
                                >
                                    <Icon size={14} className="text-slate-400" /> {item.label}
                                </button>
                            );
                        })}
                        <div className="h-px bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] my-1"></div>
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
                        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4">
                            <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border bg-[var(--tenant-panel)] shadow-2xl animate-in slide-in-from-bottom-4 duration-200 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] sm:rounded-lg sm:animate-in sm:zoom-in-95">
                                <div className="flex items-center justify-between border-b border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] sm:p-6">
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
                                                    className="w-full rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-200"
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
                                                    className="w-full rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] disabled:opacity-60 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-200"
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
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
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
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                            />
                                        </label>
                                    </div>
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Título</span>
                                        <input
                                            value={activityTitle}
                                            onChange={event => setActivityTitle(event.target.value)}
                                            className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                            placeholder="Ex: Follow-up da proposta"
                                        />
                                    </label>
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contato / pessoa</span>
                                        <select
                                            value={activityContactId}
                                            onChange={event => setActivityContactId(event.target.value)}
                                            className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
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
                                            className="w-full resize-none bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                            placeholder="Pauta, contexto da chamada ou próximo passo."
                                        />
                                    </label>
                                    {microsoftConnection.connected && onCreateMicrosoftTodoTask && (
                                        <label className="flex items-center gap-3 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
                                            <input
                                                type="checkbox"
                                                checked={activitySyncMicrosoftTodo}
                                                onChange={event => setActivitySyncMicrosoftTodo(event.target.checked)}
                                                className="h-4 w-4 rounded border-[var(--tenant-border)] text-[var(--tenant-primary)] focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                            />
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Criar tambem no Microsoft To Do</span>
                                        </label>
                                    )}
                                </div>
                                <div className="flex gap-3 border-t border-[var(--tenant-border)] bg-[var(--tenant-control)] p-4 transition-colors dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
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
                    if (!proposal) return null;
                    const clientContacts = contacts.filter(contact => contact.clientId === proposal.clientId);
                    const automation = normalizeProposalSendAutomation(globalConfig.proposalSendAutomation);
                    const followUpTemplate = getDefaultProposalSendAutomationTemplate(automation);
                    return (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden border dark:border-[var(--tenant-border-dark)] animate-in zoom-in-95 duration-200">
                                <div className="p-6 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] flex items-center justify-between bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)]">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Enviar proposta pelo {getEmailProviderLabel(emailProvider)}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{proposal.clientName} - #{proposal.proposalId}. O PDF sera anexado automaticamente.</p>
                                    </div>
                                    <button disabled={workspaceLoading || emailSubmitting} onClick={closeEmailModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 transition-colors">
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
                                                }}
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
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
                                                    if (contact?.email) setEmailTo(contact.email);
                                                }}
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
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
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                                placeholder="email@empresa.com"
                                            />
                                        </label>
                                    </div>
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cc</span>
                                        <input
                                            value={emailCc}
                                            onChange={event => setEmailCc(event.target.value)}
                                            className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                            placeholder="Opcional, separado por virgula"
                                        />
                                    </label>
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assunto</span>
                                        <input
                                            value={emailSubject}
                                            onChange={event => setEmailSubject(event.target.value)}
                                            className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                        />
                                    </label>
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mensagem</span>
                                        <textarea
                                            value={emailBody}
                                            onChange={event => setEmailBody(event.target.value)}
                                            rows={8}
                                            className="w-full resize-none bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)]"
                                        />
                                    </label>
                                    <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-xs font-bold text-slate-600 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-300">
                                        {automation.enabled ? (
                                            <>
                                                Follow-up automatico: {followUpTemplate.name} em {followUpTemplate.delayDays === 0 ? 'hoje' : `${followUpTemplate.delayDays} dia(s)`}
                                                {followUpTemplate.syncMicrosoftTodo && <span className="block pt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">Tambem sera sincronizado com Microsoft To Do quando a conta estiver conectada.</span>}
                                            </>
                                        ) : (
                                            'Follow-up automatico desativado nas configuracoes do tenant.'
                                        )}
                                    </div>
                                </div>
                                <div className="p-4 border-t border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)] flex justify-end gap-3 transition-colors">
                                    <button disabled={workspaceLoading || emailSubmitting} onClick={closeEmailModal} className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm font-bold hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-50 transition-colors">Cancelar</button>
                                    <button
                                        disabled={workspaceLoading || emailSubmitting || emailSentAfterError || !emailTo.trim() || !emailSubject.trim() || !emailBody.trim()}
                                        onClick={submitEmail}
                                        className="px-5 py-2 bg-[var(--tenant-primary)] text-white rounded-lg text-sm font-bold hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {emailSentAfterError ? 'E-mail ja enviado' : emailSubmitting ? 'Gerando PDF...' : workspaceLoading ? 'Enviando...' : 'Enviar com PDF'}
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
                        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden border dark:border-[var(--tenant-border-dark)] animate-in zoom-in-95 duration-200">
                                <div className="p-6 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] flex items-center justify-between bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)]">
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
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
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
                                            className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inicio</span>
                                            <input
                                                type="datetime-local"
                                                value={meetingStartsAt}
                                                onChange={event => setMeetingStartsAt(event.target.value)}
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </label>
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duracao</span>
                                            <select
                                                value={meetingDurationMinutes}
                                                onChange={event => setMeetingDurationMinutes(Number(event.target.value))}
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
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
                                        <div className="max-h-44 overflow-y-auto rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] p-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]">
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
                                                                className={`flex items-center gap-3 rounded-md border px-3 py-2 transition-colors ${hasEmail ? 'cursor-pointer border-[var(--tenant-border)] bg-[var(--tenant-panel)] hover:border-emerald-300 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:hover:border-emerald-700' : 'cursor-not-allowed border-[var(--tenant-border)] bg-[var(--tenant-control)] opacity-60 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]'}`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    disabled={!hasEmail}
                                                                    checked={checked}
                                                                    onChange={event => {
                                                                        setMeetingContactIds(prev => event.target.checked ? [...prev, contact.id]
                                                                            : prev.filter(id => id !== contact.id));
                                                                    }}
                                                                    className="h-4 w-4 rounded border-[var(--tenant-border)] text-emerald-600 focus:ring-emerald-500"
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
                                            className="w-full resize-none bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </label>
                                </div>
                                <div className="p-4 border-t border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)] flex justify-end gap-3 transition-colors">
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
                        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border dark:border-[var(--tenant-border-dark)] animate-in zoom-in-95 duration-200">
                                <div className="p-6 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] flex items-center justify-between bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)]">
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
                                            className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="Nome do contato"
                                        />
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cargo</span>
                                            <input
                                                value={contactRole}
                                                onChange={event => setContactRole(event.target.value)}
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="Ex: Compras"
                                            />
                                        </label>
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Influencia</span>
                                            <select
                                                value={contactInfluenceLevel}
                                                onChange={event => setContactInfluenceLevel(event.target.value as Contact['influenceLevel'])}
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
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
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="email@empresa.com"
                                            />
                                        </label>
                                        <label className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone</span>
                                            <input
                                                value={contactPhone}
                                                onChange={event => setContactPhone(event.target.value)}
                                                className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                                placeholder="(00) 00000-0000"
                                            />
                                        </label>
                                    </div>
                                    <label className="space-y-1.5 block">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LinkedIn</span>
                                        <input
                                            value={contactLinkedin}
                                            onChange={event => setContactLinkedin(event.target.value)}
                                            className="w-full bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="https://linkedin.com/in/..."
                                        />
                                    </label>
                                </div>
                                <div className="p-4 border-t border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)] flex justify-end gap-3 transition-colors">
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
            {selectedProposal && expandedThreadKey && createPortal((() => {
                const traceability = getProposalTraceability(selectedProposal);
                const thread = traceability.threads.find(item => item.key === expandedThreadKey);
                if (!thread) return null;
                const externalUrl = thread.messages.slice().reverse().find(message => message.externalUrl)?.externalUrl;
                const isReplyOpen = replyThreadKey === thread.key;
                const providerLabel = thread.provider === 'microsoft' ? 'Outlook' : thread.provider === 'google' ? 'Gmail' : 'E-mail';
                return (
                    <div
                        className="fixed inset-0 z-[130] flex items-center justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_76%,transparent)] p-3 backdrop-blur-sm sm:p-5"
                        style={portalTenantTheme.cssVars}
                        onClick={closeExpandedThread}
                    >
                        <div className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] text-[var(--tenant-text)] shadow-2xl dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-[var(--tenant-text-dark)]" onClick={event => event.stopPropagation()}>
                            <div className="relative shrink-0 border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-surface-dark)] sm:p-5">
                                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 w-full pr-11 sm:pr-0">
                                        <p className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-2 py-1 text-[10px] font-black uppercase text-[var(--tenant-primary)] dark:text-[var(--tenant-primary-on-dark)]">
                                            <MailCheck size={13} />
                                            Conversa vinculada
                                        </p>
                                        <h3 className="line-clamp-2 break-words text-lg font-black leading-snug text-[var(--tenant-text)] dark:text-[var(--tenant-text-dark)]">{thread.subject}</h3>
                                        <p className="mt-1 line-clamp-2 break-words text-xs font-semibold text-[color-mix(in_srgb,var(--tenant-text)_68%,transparent)] dark:text-[color-mix(in_srgb,var(--tenant-text-dark)_70%,transparent)]">
                                            {thread.participants.join(', ') || selectedProposal.clientName}
                                        </p>
                                    </div>
                                    <button type="button" onClick={closeExpandedThread} className="absolute right-4 top-4 rounded-md border border-transparent p-2 text-[color-mix(in_srgb,var(--tenant-text)_55%,transparent)] transition hover:border-[var(--tenant-border)] hover:bg-[var(--tenant-control)] hover:text-[var(--tenant-text)] dark:text-[color-mix(in_srgb,var(--tenant-text-dark)_55%,transparent)] dark:hover:border-[var(--tenant-border-dark)] dark:hover:bg-[var(--tenant-control-dark)] dark:hover:text-[var(--tenant-text-dark)] sm:static" aria-label="Fechar conversa">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                                    <span className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-2.5 text-[11px] font-black uppercase text-[color-mix(in_srgb,var(--tenant-text)_72%,transparent)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[color-mix(in_srgb,var(--tenant-text-dark)_78%,transparent)]">{providerLabel}</span>
                                    <span className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-2.5 text-[11px] font-bold text-[color-mix(in_srgb,var(--tenant-text)_72%,transparent)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[color-mix(in_srgb,var(--tenant-text-dark)_78%,transparent)]">{thread.messages.length} mensagens</span>
                                    <span className="inline-flex h-9 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-300">{thread.inboundCount} recebidas</span>
                                    <button type="button" onClick={() => openThreadReplyComposer(selectedProposal, thread)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary)] px-3 text-xs font-black text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50" disabled={replySending} title="Responder" aria-label="Responder">
                                        <MailCheck size={13} />
                                        <span className="hidden sm:inline">Responder</span>
                                    </button>
                                    <button type="button" onClick={() => {
                                        openReplyTaskFromCommunication(thread.messages.slice().reverse().find(message => message.direction === 'inbound') || thread.lastMessage);
                                        closeExpandedThread();
                                    }} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 text-xs font-black text-[var(--tenant-text)] transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)] dark:hover:text-[var(--tenant-primary-on-dark)]" title="Criar tarefa" aria-label="Criar tarefa">
                                        <Clock size={13} />
                                        <span className="hidden sm:inline">Criar tarefa</span>
                                    </button>
                                    {externalUrl && (
                                        <a href={externalUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 text-xs font-black text-[var(--tenant-text)] transition hover:border-[var(--tenant-primary-border)] hover:text-[var(--tenant-primary)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-[var(--tenant-text-dark)] dark:hover:text-[var(--tenant-primary-on-dark)]" title="Abrir no e-mail" aria-label="Abrir no e-mail">
                                            <ExternalLink size={13} />
                                            <span className="hidden sm:inline">Abrir no e-mail</span>
                                        </a>
                                    )}
                                </div>
                                {isReplyOpen && (
                                    <div className="mt-4 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-4 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)]">
                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                            <span className="rounded-md border border-[var(--tenant-primary-border)] bg-[var(--tenant-primary-soft)] px-3 py-1.5 text-xs font-black uppercase text-[var(--tenant-primary)] dark:text-[var(--tenant-primary-on-dark)]">
                                                Enviar por {getEmailProviderLabel(replyProvider)}
                                            </span>
                                            {!isProviderConnected(replyProvider) && (
                                                <span className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">Conta nao conectada</span>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <input value={replyTo} onChange={event => setReplyTo(event.target.value)} className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-100" placeholder="Para" />
                                            <input value={replyCc} onChange={event => setReplyCc(event.target.value)} className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-100" placeholder="Cc" />
                                            <input value={replySubject} onChange={event => setReplySubject(event.target.value)} className="w-full rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-100" placeholder="Assunto" />
                                            <textarea value={replyBody} onChange={event => setReplyBody(event.target.value)} rows={5} className="w-full resize-y rounded-md border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary-soft)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-100" placeholder="Mensagem" />
                                        </div>
                                        {replyError && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">{replyError}</p>}
                                        <div className="mt-4 flex justify-end gap-2">
                                            <button type="button" onClick={resetThreadReplyComposer} disabled={replySending} className="rounded-md px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-[var(--tenant-control)] disabled:opacity-50 dark:hover:bg-[var(--tenant-control-dark)]">Cancelar</button>
                                            <button type="button" onClick={submitThreadReply} disabled={replySending || !replyTo.trim() || !replySubject.trim() || !replyBody.trim()} className="inline-flex items-center gap-2 rounded-md bg-[var(--tenant-primary)] px-3 py-2 text-xs font-black text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60">
                                                <MailCheck size={14} />
                                                {replySending ? 'Enviando...' : 'Enviar resposta'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                                <div className="space-y-3">
                                    {thread.messages.map(message => (
                                        <article key={message.id} className={`min-w-0 overflow-hidden rounded-lg border p-4 ${message.direction === 'inbound' ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20' : 'border-[var(--tenant-border)] bg-[var(--tenant-control)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]'}`}>
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-200">{message.direction === 'inbound' ? 'Resposta recebida' : 'E-mail enviado'}</p>
                                                    <p className="mt-1 break-words text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                        {message.direction === 'inbound' ? `De: ${message.fromEmail || '-'}` : `Para: ${message.toEmails.join(', ') || '-'}`}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 text-[11px] font-bold text-slate-500 dark:text-slate-400">{new Date(getCommunicationDate(message)).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                            </div>
                                            {message.bodyPreview ? (
                                                <p className="mt-3 break-words whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{message.bodyPreview}</p>
                                            ) : (
                                                <p className="mt-3 text-sm font-semibold text-slate-400">Sem preview de mensagem.</p>
                                            )}
                                            {message.externalUrl && (
                                                <a href={message.externalUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-[var(--tenant-primary)] hover:underline dark:text-[var(--tenant-primary-on-dark)]">
                                                    <ExternalLink size={13} />
                                                    Abrir mensagem original
                                                </a>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })(), document.body)}
            {/* NEW VERSION MODAL */}
            {
                isNewVersionModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] rounded-lg shadow-2xl w-full max-w-md overflow-hidden border dark:border-[var(--tenant-border-dark)] animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] flex items-center justify-between bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)]">
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
                                    className="w-full h-32 p-3 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] outline-none transition-all resize-none"
                                />
                            </div>
                            <div className="p-6 bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)] border-t border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] flex gap-3">
                                <button
                                    onClick={closeNewVersionModal}
                                    className="flex-1 py-2.5 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] transition-colors"
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
                                    className="flex-1 py-2.5 bg-[var(--tenant-primary)] text-white rounded-lg font-bold text-sm hover:brightness-95 transition-colors shadow-lg dark:shadow-none flex items-center justify-center gap-2"
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
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[color-mix(in_srgb,var(--tenant-bg-dark)_68%,transparent)] backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] rounded-lg shadow-2xl w-full max-w-md overflow-hidden border dark:border-[var(--tenant-border-dark)] animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] flex items-center justify-between bg-[var(--tenant-secondary-soft)]">
                                <div className="flex items-center gap-2 text-[var(--tenant-secondary)]">
                                    <Snowflake size={20} />
                                    <h3 className="text-lg font-bold">Congelar Oportunidade</h3>
                                </div>
                                <button onClick={closeFrozenModal} className="text-[var(--tenant-secondary)] hover:brightness-90 transition-colors">
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
                                        className="w-full h-24 p-3 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] outline-none transition-all resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Revisar em (Opcional)</label>
                                    <input
                                        type="date"
                                        value={tempFrozenUntil}
                                        onChange={(e) => setTempFrozenUntil(e.target.value)}
                                        className="w-full p-3 bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-primary)] outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="p-6 bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)] border-t border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] flex gap-3">
                                <button
                                    onClick={closeFrozenModal}
                                    className="flex-1 py-2.5 rounded-lg font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] transition-colors"
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
                                    className="flex-1 py-2.5 bg-[var(--tenant-primary)] text-white rounded-lg font-bold text-sm hover:brightness-95 transition-colors shadow-lg dark:shadow-none flex items-center justify-center gap-2"
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
