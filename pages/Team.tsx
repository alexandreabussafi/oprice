
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ProposalData, Role, CanvasSection, CanvasDecoration, ProfitSharingInstallment, ConnectionSide } from '../types';
import { calculateFinancials, formatCurrency } from '../utils/pricingEngine';
import { Users, Plus, Trash2, LayoutList, LayoutGrid, CheckSquare, Workflow, Move, ZoomIn, ZoomOut, MousePointer2, X, Link as LinkIcon, Palette, Briefcase, Factory, Wrench, Truck, AlertTriangle, Box, Type, Grip, Ban, DollarSign, Square, MousePointer, Flame, Zap, Skull, Biohazard, HeartPulse, ShoppingBag, Utensils, Bus, Wand2, Maximize2, CalendarDays } from 'lucide-react';

interface TeamProps {
    data: ProposalData;
    updateData: (newData: Partial<ProposalData>) => void;
}

// Cores para personalização dos cards
const CARD_COLORS = [
    { id: 'slate', bg: 'bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)]', border: 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]', header: 'bg-[var(--tenant-control)] dark:bg-[var(--tenant-surface-dark)]', text: 'text-slate-700 dark:text-slate-200' },
    { id: 'blue', bg: 'bg-[var(--tenant-secondary-soft)] dark:bg-[var(--tenant-panel-dark)]', border: 'border-[var(--tenant-secondary-border)] dark:border-[var(--tenant-secondary-border)]', header: 'bg-[var(--tenant-secondary-soft)] dark:bg-[var(--tenant-control-dark)]', text: 'text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)]' },
    { id: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/25', border: 'border-emerald-200 dark:border-emerald-900/60', header: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300' },
    { id: 'amber', bg: 'bg-amber-50 dark:bg-amber-950/25', border: 'border-amber-200 dark:border-amber-900/60', header: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300' },
    { id: 'red', bg: 'bg-red-50 dark:bg-red-950/25', border: 'border-red-200 dark:border-red-900/60', header: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300' },
    { id: 'purple', bg: 'bg-[var(--tenant-secondary-soft)] dark:bg-[var(--tenant-panel-dark)]', border: 'border-[var(--tenant-secondary-border)] dark:border-[var(--tenant-secondary-border)]', header: 'bg-[var(--tenant-secondary-soft)] dark:bg-[var(--tenant-control-dark)]', text: 'text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)]' },
    { id: 'dark', bg: 'bg-[var(--tenant-panel-dark)]', border: 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]', header: 'bg-[var(--tenant-primary)]', text: 'text-white' },
];

const SECTION_COLORS = [
    { id: 'gray', bg: 'bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)]/60', border: 'border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]' },
    { id: 'blue', bg: 'bg-[var(--tenant-secondary-soft)] dark:bg-[var(--tenant-panel-dark)]/60', border: 'border-[var(--tenant-secondary-border)] dark:border-[var(--tenant-secondary-border)]' },
    { id: 'green', bg: 'bg-emerald-100/20 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-900/60' },
    { id: 'yellow', bg: 'bg-amber-100/20 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-900/60' },
    { id: 'red', bg: 'bg-red-100/20 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-900/60' },
];

const MONTH_OPTIONS = [
    { value: 1, label: 'Jan' },
    { value: 2, label: 'Fev' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Abr' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Ago' },
    { value: 9, label: 'Set' },
    { value: 10, label: 'Out' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dez' },
];

const ROLE_CARD_WIDTH = 256;
const ROLE_CARD_HEIGHT = 180;

const SIDE_VECTORS: Record<ConnectionSide, { x: number; y: number }> = {
    top: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    bottom: { x: 0, y: 1 },
    left: { x: -1, y: 0 }
};

const Team: React.FC<TeamProps> = ({ data, updateData }) => {
    const [viewMode, setViewMode] = useState<'list' | 'grid' | 'organogram'>('list');

    // --- Organogram State ---
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    // UI State for Active Feedback (only for visuals)
    const [isDraggingUI, setIsDraggingUI] = useState(false);
    const [connectingNodeIdState, setConnectingNodeIdState] = useState<string | null>(null);
    const connectingNodeIdRef = useRef<string | null>(null);
    const connectingSourceSideRef = useRef<ConnectionSide | null>(null);
    const connectionStartPointRef = useRef<{ x: number; y: number } | null>(null);
    const connectionDragStartedRef = useRef(false);

    // Wrapper to keep ref and state in sync
    const connectingNodeId = connectingNodeIdState;
    const setConnectingNodeId = useCallback((id: string | null) => {
        connectingNodeIdRef.current = id;
        setConnectingNodeIdState(id);
    }, []);

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'node' | 'section' | 'decoration' | 'canvas', targetId?: string } | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);

    // --- REFS FOR EVENT HANDLING (Stable Memory) ---
    const dragInfoRef = useRef<{
        type: 'role' | 'section' | 'decoration' | 'resize-section';
        id: string;
        startX: number;
        startY: number;
        initialObjX: number;
        initialObjY: number;
        initialObjW?: number;
        initialObjH?: number;
        initialRoles?: Role[];
    } | null>(null);

    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0 });

    const dataRef = useRef(data);
    dataRef.current = data; // Always keep fresh

    const panRef = useRef(pan);
    panRef.current = pan;

    const scaleRef = useRef(scale);
    scaleRef.current = scale;

    const getDescendantIds = (roles: Role[], parentId: string): string[] => {
        const descendants: string[] = [];
        const visited = new Set<string>();
        const stack = roles.filter(r => r.parentId === parentId).map(r => r.id);

        while (stack.length > 0) {
            const childId = stack.pop();
            if (!childId || visited.has(childId)) continue;
            visited.add(childId);
            descendants.push(childId);
            roles
                .filter(r => r.parentId === childId && !visited.has(r.id))
                .forEach(r => stack.push(r.id));
        }

        return descendants;
    };

    const wouldCreateRoleCycle = (roles: Role[], roleId: string, parentId?: string) => {
        if (!parentId) return false;
        if (roleId === parentId) return true;
        return getDescendantIds(roles, roleId).includes(parentId);
    };

    const disconnectRole = (role: Role): Role => {
        const { parentId: _parentId, parentSourceSide: _parentSourceSide, childTargetSide: _childTargetSide, ...rest } = role;
        return rest;
    };

    const sanitizeRoleHierarchy = (roles: Role[]) => {
        const existingIds = new Set(roles.map(r => r.id));
        const sanitized = roles.map(role => {
            if (!role.parentId || !existingIds.has(role.parentId) || role.parentId === role.id) {
                return disconnectRole(role);
            }
            return role;
        });

        return sanitized.map(role => (
            role.parentId && wouldCreateRoleCycle(sanitized, role.id, role.parentId)
                ? disconnectRole(role)
                : role
        ));
    };

    const updateRoles = (roles: Role[]) => {
        updateData({ roles: sanitizeRoleHierarchy(roles) });
    };

    const commitRoleConnection = useCallback((sourceId: string, targetId: string, targetSide?: ConnectionSide | null) => {
        if (!sourceId || sourceId === targetId) return false;

        const currentRoles = dataRef.current.roles;
        if (wouldCreateRoleCycle(currentRoles, targetId, sourceId)) return false;
        const sourceSide = connectingSourceSideRef.current;
        if (!sourceSide || !targetSide) return false;

        const updatedRoles = currentRoles.map(role =>
            role.id === targetId
                ? {
                    ...role,
                    parentId: sourceId,
                    parentSourceSide: sourceSide,
                    childTargetSide: targetSide
                }
                : role
        );

        updateData({ roles: sanitizeRoleHierarchy(updatedRoles) });
        return true;
    }, [updateData]);

    // --- ROBUST EVENT SYSTEM TO PREVENT "STICKY HAND" ---
    // We use stable function refs that NEVER get recreated. All state is read via refs.
    const activeCleanupRef = useRef<(() => void) | null>(null);

    const handleGlobalMouseUp = useCallback((e: MouseEvent) => {
        const sourceId = connectingNodeIdRef.current;
        let keepPendingConnection = false;
        if (sourceId) {
            const dropElement = (e.target instanceof Element ? e.target : document.elementFromPoint(e.clientX, e.clientY));
            const targetConnectorElement = dropElement?.closest<HTMLElement>('[data-connector-side]');
            const targetRoleElement = targetConnectorElement?.closest<HTMLElement>('[data-role-id]');
            const targetId = targetRoleElement?.dataset.roleId;
            const targetSide = targetConnectorElement?.dataset.connectorSide as ConnectionSide | undefined;

            if (targetConnectorElement && targetId && targetId !== sourceId) {
                commitRoleConnection(sourceId, targetId, targetSide);
            } else if (targetConnectorElement && targetId === sourceId && !connectionDragStartedRef.current) {
                keepPendingConnection = true;
            }
        }

        // Clean up Refs
        isPanningRef.current = false;
        dragInfoRef.current = null;
        connectionStartPointRef.current = null;
        connectionDragStartedRef.current = false;
        if (!keepPendingConnection) {
            connectingSourceSideRef.current = null;
        }

        // Clean up UI State
        setIsDraggingUI(false);
        if (connectingNodeIdRef.current && !keepPendingConnection) setConnectingNodeId(null);

        // Remove Listeners using the stored cleanup
        if (activeCleanupRef.current) {
            activeCleanupRef.current();
            activeCleanupRef.current = null;
        }
        document.body.style.cursor = 'default';
    }, [commitRoleConnection, setConnectingNodeId]);

    const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
        // --- SAFETY VALVE: THE "STICKY HAND" FIX ---
        if (e.buttons === 0 && (isPanningRef.current || dragInfoRef.current || connectingNodeIdRef.current)) {
            handleGlobalMouseUp(e);
            return;
        }

        // 1. Panning Logic
        if (isPanningRef.current) {
            e.preventDefault();
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            setPan({ x: dx, y: dy });
            return;
        }

        // 2. Dragging Logic
        if (dragInfoRef.current) {
            e.preventDefault();
            const { startX, startY, initialObjX, initialObjY, id, type, initialObjW, initialObjH } = dragInfoRef.current;
            const currentScale = scaleRef.current;
            const currentData = dataRef.current;

            const deltaX = (e.clientX - startX) / currentScale;
            const deltaY = (e.clientY - startY) / currentScale;

            if (type === 'role') {
                const initialRoles = dragInfoRef.current.initialRoles || currentData.roles;
                const descendantIds = getDescendantIds(initialRoles, id);

                const updatedRoles = currentData.roles.map(r => {
                    if (r.id === id) {
                        return { ...r, x: initialObjX + deltaX, y: initialObjY + deltaY };
                    } else if (descendantIds.includes(r.id)) {
                        const initR = initialRoles.find(ir => ir.id === r.id);
                        if (initR) {
                            return { ...r, x: (initR.x || 0) + deltaX, y: (initR.y || 0) + deltaY };
                        }
                    }
                    return r;
                });
                updateRoles(updatedRoles);
            } else if (type === 'section') {
                const updatedSections = (currentData.sections || []).map(s =>
                    s.id === id ? { ...s, x: initialObjX + deltaX, y: initialObjY + deltaY } : s
                );
                updateData({ sections: updatedSections });
            } else if (type === 'decoration') {
                const updatedDecos = (currentData.decorations || []).map(d =>
                    d.id === id ? { ...d, x: initialObjX + deltaX, y: initialObjY + deltaY } : d
                );
                updateData({ decorations: updatedDecos });
            } else if (type === 'resize-section') {
                const w = Math.max(100, (initialObjW || 0) + deltaX);
                const h = Math.max(100, (initialObjH || 0) + deltaY);
                const updatedSections = (currentData.sections || []).map(s =>
                    s.id === id ? { ...s, width: w, height: h } : s
                );
                updateData({ sections: updatedSections });
            }
        }

        // 3. Connecting Line Logic
        if (connectingNodeIdRef.current && canvasRef.current) {
            const startPoint = connectionStartPointRef.current;
            if (startPoint && !connectionDragStartedRef.current) {
                const distance = Math.hypot(e.clientX - startPoint.x, e.clientY - startPoint.y);
                if (distance > 4) connectionDragStartedRef.current = true;
            }

            const rect = canvasRef.current.getBoundingClientRect();
            const worldX = (e.clientX - rect.left - panRef.current.x) / scaleRef.current;
            const worldY = (e.clientY - rect.top - panRef.current.y) / scaleRef.current;
            setMousePos({ x: worldX, y: worldY });
        }
    }, [updateData, handleGlobalMouseUp]);

    // --- START LISTENERS ---
    // Uses the STABLE useCallback refs directly — no stale closure possible
    const startGlobalListeners = useCallback(() => {
        // Attach
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('mouseleave', handleGlobalMouseUp);
        // Store cleanup so the up handler can remove the exact same references
        activeCleanupRef.current = () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('mouseleave', handleGlobalMouseUp);
        };
    }, [handleGlobalMouseMove, handleGlobalMouseUp]);

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 && connectingNodeIdRef.current) {
            setContextMenu(null);
            connectingSourceSideRef.current = null;
            connectionStartPointRef.current = null;
            connectionDragStartedRef.current = false;
            setConnectingNodeId(null);
            return;
        }

        // Middle mouse or Space+Click to Pan
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            isPanningRef.current = true;
            // Calculate offset relative to current pan position
            panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
            setIsDraggingUI(true);
            e.preventDefault();

            document.body.style.cursor = 'grabbing';
            startGlobalListeners();
            return;
        }
        if (e.button === 0) {
            setContextMenu(null);
        }
    };

    const handleEntityMouseDown = (e: React.MouseEvent, type: any, id: string, initialObj: any) => {
        if (e.button === 0 && !e.altKey && connectingNodeIdRef.current) {
            e.stopPropagation();
            e.preventDefault();

            connectingSourceSideRef.current = null;
            connectionStartPointRef.current = null;
            connectionDragStartedRef.current = false;
            setConnectingNodeId(null);
            return;
        }

        if (e.button !== 0 || e.altKey || connectingNodeId) return;
        e.stopPropagation();
        e.preventDefault();

        dragInfoRef.current = {
            type, id,
            startX: e.clientX, startY: e.clientY,
            initialObjX: initialObj.x, initialObjY: initialObj.y,
            initialObjW: initialObj.width, initialObjH: initialObj.height,
            initialRoles: data.roles
        };

        setIsDraggingUI(true);
        startGlobalListeners();
    };

    const handleConnectorMouseDown = (e: React.MouseEvent, roleId: string, side: ConnectionSide) => {
        e.stopPropagation();
        e.preventDefault();
        setContextMenu(null);

        const currentSourceId = connectingNodeIdRef.current;
        if (currentSourceId) {
            if (currentSourceId !== roleId) {
                commitRoleConnection(currentSourceId, roleId, side);
            }

            connectingSourceSideRef.current = null;
            connectionStartPointRef.current = null;
            connectionDragStartedRef.current = false;
            setConnectingNodeId(null);
            return;
        }

        connectingSourceSideRef.current = side;
        connectionStartPointRef.current = { x: e.clientX, y: e.clientY };
        connectionDragStartedRef.current = false;
        setConnectingNodeId(roleId);

        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const worldX = (e.clientX - rect.left - panRef.current.x) / scaleRef.current;
            const worldY = (e.clientY - rect.top - panRef.current.y) / scaleRef.current;
            setMousePos({ x: worldX, y: worldY });
        }

        setIsDraggingUI(true);
        startGlobalListeners();
    };

    // --- Helpers ---
    const getCenterViewCoords = () => {
        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = (rect.width / 2 - pan.x) / scale - ROLE_CARD_WIDTH / 2;
            const y = (rect.height / 2 - pan.y) / scale - ROLE_CARD_HEIGHT / 2;
            return { x, y };
        }
        return { x: 0, y: 0 };
    };

    useEffect(() => {
        const handleClickOutside = () => setContextMenu(null);
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            if (activeCleanupRef.current) {
                activeCleanupRef.current();
                activeCleanupRef.current = null;
            }
        };
    }, []);

    // --- CRUD Actions ---

    const addRole = (category: 'Operational' | 'Administrative') => {
        const { x, y } = getCenterViewCoords();
        const newRole: Role = {
            id: Math.random().toString(36).substr(2, 9),
            title: category === 'Operational' ? 'Novo Técnico' : 'Analista',
            category,
            quantity: 1,
            baseSalary: 2000,
            additionalHazard: category === 'Operational',
            additionalDanger: false,
            x: x,
            y: y,
            color: 'slate'
        };
        updateRoles([...data.roles, newRole]);
    };

    const addSection = () => {
        const { x, y } = getCenterViewCoords();
        const newSection: CanvasSection = {
            id: Math.random().toString(36).substr(2, 9),
            title: 'Nova Área / Setor',
            x: x,
            y: y,
            width: 500,
            height: 400,
            color: 'gray'
        };
        updateData({ sections: [...(data.sections || []), newSection] });
    };

    const addDecoration = (type: CanvasDecoration['type']) => {
        const { x, y } = getCenterViewCoords();
        const newDeco: CanvasDecoration = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            x: x + 100,
            y: y + 50,
            scale: 1,
            label: ''
        };
        updateData({ decorations: [...(data.decorations || []), newDeco] });
    };

    const duplicateRole = (roleId: string) => {
        const source = data.roles.find(r => r.id === roleId);
        if (!source) return;
        const shouldSplitQuantity = source.quantity > 1;
        const originalQuantity = shouldSplitQuantity ? Math.ceil(source.quantity / 2) : source.quantity;
        const newQuantity = shouldSplitQuantity ? Math.floor(source.quantity / 2) : 1;
        const newRole: Role = {
            ...source,
            id: Math.random().toString(36).substr(2, 9),
            title: shouldSplitQuantity ? source.title : `${source.title} Copia`,
            quantity: newQuantity,
            x: (source.x || 0) + 50,
            y: (source.y || 0) + 50,
            parentId: source.parentId || undefined,
            parentSourceSide: source.parentId ? source.parentSourceSide : undefined,
            childTargetSide: source.parentId ? source.childTargetSide : undefined
        };
        updateRoles([
            ...data.roles.map(role => role.id === roleId ? { ...role, quantity: originalQuantity } : role),
            newRole
        ]);
    };

    const updateRole = (id: string, field: keyof Role, value: any) => {
        if (field === 'parentId') {
            if (value && wouldCreateRoleCycle(data.roles, id, value)) return;
            const updatedRoles = data.roles.map(r => r.id === id ? (value ? { ...r, parentId: value } : disconnectRole(r)) : r);
            updateRoles(updatedRoles);
            return;
        }
        const updatedRoles = data.roles.map(r => r.id === id ? { ...r, [field]: value } : r);
        updateRoles(updatedRoles);
    };

    const updateSection = (id: string, field: keyof CanvasSection, value: any) => {
        const sections = data.sections || [];
        updateData({ sections: sections.map(s => s.id === id ? { ...s, [field]: value } : s) });
    };

    const removeEntity = (type: 'role' | 'section' | 'decoration', id: string) => {
        if (type === 'role') {
            const updatedRoles = data.roles
                .filter(r => r.id !== id)
                .map(r => r.parentId === id ? disconnectRole(r) : r);
            updateRoles(updatedRoles);
        }
        if (type === 'section') {
            updateData({ sections: (data.sections || []).filter(s => s.id !== id) });
        }
        if (type === 'decoration') {
            updateData({ decorations: (data.decorations || []).filter(d => d.id !== id) });
        }
    };

    const calculateRoleCost = (role: Role) => {
        let base = role.baseSalary;
        let addOns = 0;
        if (role.additionalHazard) addOns += role.baseSalary * 0.20;
        if (role.additionalDanger) addOns += role.baseSalary * 0.30;
        const totalBase = base + addOns;
        const charges = totalBase * data.taxConfig.socialChargesRate;

        // Calculate Benefits
        let unitBenefits = 0;
        const benefitsConfig = data.benefitsConfig || {
            healthInsurance: 0,
            healthInsuranceDependentFactor: 1,
            foodAllowance: 0,
            mealAllowance: 0,
            transportAllowance: 0,
            hasCafeteria: false
        };
        const { healthInsurance, healthInsuranceDependentFactor, foodAllowance, mealAllowance, transportAllowance, hasCafeteria } = benefitsConfig;
        unitBenefits += Math.round((healthInsurance * healthInsuranceDependentFactor + Number.EPSILON) * 100) / 100;
        unitBenefits += foodAllowance;
        if (!hasCafeteria) unitBenefits += mealAllowance;
        unitBenefits += transportAllowance;

        return (totalBase + charges + unitBenefits) * role.quantity;
    };

    const handleContextMenuCanvas = (e: React.MouseEvent, type: 'node' | 'section' | 'decoration' | 'canvas', targetId?: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type, targetId });
    };

    const onConnectorMouseUp = (e: React.MouseEvent, targetId: string) => {
        e.stopPropagation();
        const sourceId = connectingNodeIdRef.current;
        if (sourceId && sourceId === targetId) {
            if (connectionDragStartedRef.current) {
                connectingSourceSideRef.current = null;
                connectionStartPointRef.current = null;
                connectionDragStartedRef.current = false;
                setConnectingNodeId(null);
            }
            return;
        }

        if (sourceId && sourceId !== targetId) {
            const targetConnectorElement = (e.target as Element).closest<HTMLElement>('[data-connector-side]');
            const targetSide = targetConnectorElement?.dataset.connectorSide as ConnectionSide | undefined;
            commitRoleConnection(sourceId, targetId, targetSide);
        }
        connectingSourceSideRef.current = null;
        connectionStartPointRef.current = null;
        connectionDragStartedRef.current = false;
        setConnectingNodeId(null);
    };

    const handleSalaryChange = (id: string, rawValue: string) => {
        const numeric = rawValue.replace(/\D/g, '');
        const val = numeric ? parseFloat(numeric) / 100 : 0;
        updateRole(id, 'baseSalary', val);
    };

    // --- Anchor Path Logic ---

    const getRoleAnchorPoint = (role: Role, side: ConnectionSide) => {
        const x = role.x || 0;
        const y = role.y || 0;
        if (side === 'top') return { x: x + ROLE_CARD_WIDTH / 2, y };
        if (side === 'right') return { x: x + ROLE_CARD_WIDTH, y: y + ROLE_CARD_HEIGHT / 2 };
        if (side === 'bottom') return { x: x + ROLE_CARD_WIDTH / 2, y: y + ROLE_CARD_HEIGHT };
        return { x, y: y + ROLE_CARD_HEIGHT / 2 };
    };

    const inferConnectionSides = (parent: Role, child: Role): { sourceSide: ConnectionSide; targetSide: ConnectionSide } => {
        const parentCenter = {
            x: (parent.x || 0) + ROLE_CARD_WIDTH / 2,
            y: (parent.y || 0) + ROLE_CARD_HEIGHT / 2
        };
        const childCenter = {
            x: (child.x || 0) + ROLE_CARD_WIDTH / 2,
            y: (child.y || 0) + ROLE_CARD_HEIGHT / 2
        };
        const dx = childCenter.x - parentCenter.x;
        const dy = childCenter.y - parentCenter.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            return dx >= 0
                ? { sourceSide: 'right', targetSide: 'left' }
                : { sourceSide: 'left', targetSide: 'right' };
        }

        return dy >= 0
            ? { sourceSide: 'bottom', targetSide: 'top' }
            : { sourceSide: 'top', targetSide: 'bottom' };
    };

    const getConnectionPath = (parent: Role, child: Role) => {
        const fallback = inferConnectionSides(parent, child);
        const sourceSide = child.parentSourceSide || fallback.sourceSide;
        const targetSide = child.childTargetSide || fallback.targetSide;
        const startPoint = getRoleAnchorPoint(parent, sourceSide);
        const endPoint = getRoleAnchorPoint(child, targetSide);
        const distance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
        const bend = Math.max(48, Math.min(120, distance / 2.5));
        const sourceVector = SIDE_VECTORS[sourceSide];
        const targetVector = SIDE_VECTORS[targetSide];
        const controlPoint1 = {
            x: startPoint.x + sourceVector.x * bend,
            y: startPoint.y + sourceVector.y * bend
        };
        const controlPoint2 = {
            x: endPoint.x + targetVector.x * bend,
            y: endPoint.y + targetVector.y * bend
        };

        return `M ${startPoint.x} ${startPoint.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${endPoint.x} ${endPoint.y}`;
    };

    const getDecorationIcon = (type: string) => {
        const size = 32;
        switch (type) {
            case 'factory': return <Factory size={size} />;
            case 'tools': return <Wrench size={size} />;
            case 'truck': return <Truck size={size} />;
            case 'alert': return <AlertTriangle size={size} />;
            case 'box': return <Box size={size} />;
            case 'flame': return <Flame size={size} className="text-orange-500" />;
            case 'zap': return <Zap size={size} className="text-yellow-500" />;
            case 'skull': return <Skull size={size} className="text-slate-800 dark:text-slate-200" />;
            case 'biohazard': return <Biohazard size={size} className="text-emerald-600" />;
            default: return <Briefcase size={size} />;
        }
    };

    const applyAutoLayout = () => {
        const cleanRoles = sanitizeRoleHierarchy(data.roles);
        const rootNodes = cleanRoles.filter(r => !r.parentId);
        if (rootNodes.length === 0) return;

        const xSpacing = 320;
        const ySpacing = 200;
        const newRoles = [...cleanRoles];

        const layoutSubtree = (nodeId: string, level: number, currentX: number, visited = new Set<string>()) => {
            if (visited.has(nodeId)) return currentX;
            visited.add(nodeId);
            const children = newRoles.filter(r => r.parentId === nodeId);
            const nodeIndex = newRoles.findIndex(r => r.id === nodeId);

            if (children.length === 0) {
                if (nodeIndex !== -1) {
                    newRoles[nodeIndex] = { ...newRoles[nodeIndex], x: currentX, y: level * ySpacing };
                }
                return currentX + xSpacing;
            }

            let nextX = currentX;
            children.forEach(child => {
                nextX = layoutSubtree(child.id, level + 1, nextX, new Set(visited));
            });

            // Center parent over children
            const firstChild = newRoles.find(r => r.id === children[0].id);
            const lastChild = newRoles.find(r => r.id === children[children.length - 1].id);
            if (firstChild && lastChild && nodeIndex !== -1) {
                newRoles[nodeIndex] = {
                    ...newRoles[nodeIndex],
                    x: ((firstChild.x || 0) + (lastChild.x || 0)) / 2,
                    y: level * ySpacing
                };
            }

            return nextX;
        };

        let startX = 0;
        rootNodes.forEach(root => {
            startX = layoutSubtree(root.id, 0, startX);
        });

        updateRoles(newRoles);
    };

    const fitToView = useCallback(() => {
        if (data.roles.length === 0 || !canvasRef.current) return;
        const padding = 80;
        const xs = data.roles.map(r => r.x || 0);
        const ys = data.roles.map(r => r.y || 0);
        const minX = Math.min(...xs) - padding;
        const minY = Math.min(...ys) - padding;
        const maxX = Math.max(...xs) + ROLE_CARD_WIDTH + padding;
        const maxY = Math.max(...ys) + ROLE_CARD_HEIGHT + padding;
        const contentW = maxX - minX;
        const contentH = maxY - minY;
        const rect = canvasRef.current.getBoundingClientRect();
        const viewW = rect.width || 800;
        const viewH = rect.height || 600;

        let newScale = Math.min(viewW / contentW, viewH / contentH, 1.0);

        // Prevent extreme zoom outs due to wild coordinates or 0 dimensions
        if (newScale < 0.5) newScale = 0.7;

        const newPanX = (viewW - contentW * newScale) / 2 - minX * newScale;
        const newPanY = (viewH - contentH * newScale) / 2 - minY * newScale;

        // Ensure values are numbers, not NaN
        setScale(Number.isNaN(newScale) ? 0.85 : newScale);
        setPan({
            x: Number.isNaN(newPanX) ? 50 : newPanX,
            y: Number.isNaN(newPanY) ? 50 : newPanY
        });
    }, [data.roles]);

    useEffect(() => {
        // Initial Layout: assign coordinates when entering organogram if roles lack them
        if (viewMode === 'organogram' && data.roles.length > 0) {
            const cleanRoles = sanitizeRoleHierarchy(data.roles);
            if (JSON.stringify(cleanRoles) !== JSON.stringify(data.roles)) {
                updateData({ roles: cleanRoles });
                return;
            }
            const hasCoords = data.roles.some(r => r.x !== undefined && r.x !== null && r.x !== 0);
            if (!hasCoords) {
                const cols = Math.max(3, Math.ceil(Math.sqrt(data.roles.length)));
                const updatedRoles = data.roles.map((r, i) => ({
                    ...r,
                    x: (i % cols) * 320 + 100,
                    y: Math.floor(i / cols) * 220 + 80
                }));
                updateRoles(updatedRoles);
            }
            // Always center the view when entering organogram
            setTimeout(() => fitToView(), 100);
        }
    }, [viewMode]);

    const roles = data.roles;
    const sections = data.sections || [];
    const decorations = data.decorations || [];

    // --- Global Benefits Config Fallback ---
    const benefits = data.benefitsConfig || {
        healthInsurance: 0,
        healthInsuranceDependentFactor: 1,
        foodAllowance: 0,
        mealAllowance: 0,
        transportAllowance: 0,
        hasCafeteria: false
    };

    const updateBenefits = (field: keyof typeof benefits, value: any) => {
        updateData({ benefitsConfig: { ...benefits, [field]: value } });
    };

    const profitSharingInstallments = data.profitSharingInstallments || [];
    const financials = calculateFinancials(data);

    const updateProfitSharing = (nextInstallments: ProfitSharingInstallment[]) => {
        updateData({ profitSharingInstallments: nextInstallments });
    };

    const addProfitSharingInstallment = () => {
        const usedMonths = new Set(profitSharingInstallments.map(item => item.competenceMonth));
        const defaultMonth = MONTH_OPTIONS.find(month => !usedMonths.has(month.value))?.value || 7;
        updateProfitSharing([
            ...profitSharingInstallments,
            {
                id: Math.random().toString(36).substring(2, 9),
                competenceMonth: defaultMonth,
                amount: 0,
                active: true
            }
        ]);
    };

    const updateProfitSharingInstallment = <K extends keyof ProfitSharingInstallment>(
        id: string,
        field: K,
        value: ProfitSharingInstallment[K]
    ) => {
        updateProfitSharing(profitSharingInstallments.map(item => (
            item.id === id ? { ...item, [field]: value } : item
        )));
    };

    const removeProfitSharingInstallment = (id: string) => {
        updateProfitSharing(profitSharingInstallments.filter(item => item.id !== id));
    };

    // --- Overview Indicators ---
    const totalHeadcount = roles.reduce((acc, role) => acc + role.quantity, 0);
    const totalCost = roles.reduce((acc, role) => acc + calculateRoleCost(role), 0);
    const averageSalary = totalHeadcount > 0
        ? roles.reduce((acc, role) => acc + (role.baseSalary * role.quantity), 0) / totalHeadcount
        : 0;
    const pendingConnectionSource = connectingNodeId ? roles.find(role => role.id === connectingNodeId) : undefined;
    const pendingConnectionStart = pendingConnectionSource
        ? getRoleAnchorPoint(pendingConnectionSource, connectingSourceSideRef.current || 'right')
        : null;

    return (
        <div className="flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--tenant-control)] text-[var(--tenant-text)] dark:bg-[var(--tenant-bg-dark)] dark:text-[var(--tenant-text-dark)]">
            {/* Header Toolbar */}
            <div className="p-6 pb-2 shrink-0 z-20 relative bg-[var(--tenant-panel)] border-b border-[var(--tenant-border)] dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)]">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 dark:text-slate-100">
                            {viewMode === 'organogram' ? <Workflow size={28} className="text-[var(--tenant-primary)]" /> : <Users size={28} className="text-[var(--tenant-primary)]" />}
                            Quadro de Pessoal
                        </h2>
                        <p className="text-slate-500 text-sm mt-1 dark:text-slate-400">
                            {viewMode === 'organogram'
                                ? 'Canvas Interativo: Arraste para organizar (Miro Style).'
                                : 'Definição de cargos, salários e adicionais trabalhistas.'}
                        </p>
                    </div>

                    <div className="flex gap-4">
                        {viewMode === 'organogram' && (
                            <div className="flex bg-[var(--tenant-panel)] border border-[var(--tenant-border)] rounded-lg p-1 shadow-sm items-center dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)]">
                                <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-2 hover:bg-[var(--tenant-control)] text-slate-500 rounded dark:text-slate-400 dark:hover:bg-[var(--tenant-surface-dark)] dark:hover:text-slate-100"><ZoomOut size={16} /></button>
                                <span className="text-xs font-mono font-bold w-12 text-center select-none text-slate-700 dark:text-slate-200">{Math.round(scale * 100)}%</span>
                                <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2 hover:bg-[var(--tenant-control)] text-slate-500 rounded dark:text-slate-400 dark:hover:bg-[var(--tenant-surface-dark)] dark:hover:text-slate-100"><ZoomIn size={16} /></button>
                            </div>
                        )}

                        <div className="flex bg-[var(--tenant-control)] p-1 rounded-lg dark:bg-[var(--tenant-control-dark)]">
                            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-[var(--tenant-panel)] text-[var(--tenant-primary)] shadow-sm dark:bg-[var(--tenant-panel-dark)] dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200'}`}><LayoutList size={20} /></button>
                            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-[var(--tenant-panel)] text-[var(--tenant-primary)] shadow-sm dark:bg-[var(--tenant-panel-dark)] dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200'}`}><LayoutGrid size={20} /></button>
                            <button onClick={() => setViewMode('organogram')} className={`p-2 rounded-md ${viewMode === 'organogram' ? 'bg-[var(--tenant-panel)] text-[var(--tenant-primary)] shadow-sm dark:bg-[var(--tenant-panel-dark)] dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200'}`}><Workflow size={20} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* VIEW CONTENT */}
            {viewMode === 'organogram' ? (
                <div className={`flex-1 relative overflow-hidden min-h-[600px] select-none bg-[var(--tenant-bg)] dark:bg-[var(--tenant-bg-dark)] ${isDraggingUI ? 'cursor-grabbing' : 'cursor-grab'}`}>
                    {/* Infinite Canvas */}
                    <div
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full"
                        onMouseDown={handleCanvasMouseDown}
                        onContextMenu={(e) => handleContextMenuCanvas(e, 'canvas')}
                    >
                        {/* Background Pattern */}
                        <div
                            className="absolute inset-0 pointer-events-none opacity-10"
                            style={{
                                backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
                                backgroundSize: `${20 * scale}px ${20 * scale}px`,
                                backgroundPosition: `${pan.x}px ${pan.y}px`
                            }}
                        />

                        <div
                            className="absolute top-0 left-0 w-full h-full origin-top-left transition-transform duration-75 ease-linear"
                            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
                        >
                            {/* LAYER 0: SECTIONS (Background Areas) - Lowest Z-Index */}
                            {sections.map(section => {
                                const style = SECTION_COLORS.find(c => c.id === section.color) || SECTION_COLORS[0];
                                return (
                                    <div
                                        key={section.id}
                                        className={`absolute border-2 border-dashed rounded-lg group/section ${style.bg} ${style.border}`}
                                        style={{ left: section.x, top: section.y, width: section.width, height: section.height, zIndex: 0 }}
                                        onMouseDown={(e) => handleEntityMouseDown(e, 'section', section.id, section)}
                                        onContextMenu={(e) => handleContextMenuCanvas(e, 'section', section.id)}
                                    >
                                        <div className="absolute top-0 left-0 px-4 py-2 bg-[var(--tenant-panel)] rounded-br-xl backdrop-blur-sm border-r border-b border-inherit dark:bg-[var(--tenant-panel-dark)]">
                                            <input
                                                value={section.title}
                                                onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                                                className="bg-transparent font-bold text-slate-500 text-xs uppercase tracking-wider outline-none w-48 dark:text-slate-300"
                                            />
                                        </div>
                                        <div
                                            className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize hover:bg-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] rounded-tl flex items-end justify-end p-1 text-slate-400 dark:text-slate-500"
                                            onMouseDown={(e) => handleEntityMouseDown(e, 'resize-section', section.id, { x: 0, y: 0, width: section.width, height: section.height })}
                                        >
                                            <Grip size={14} />
                                        </div>
                                    </div>
                                )
                            })}

                            {/* LAYER 1: CONNECTIONS */}
                            <svg
                                className="absolute top-[-10000px] left-[-10000px] w-[20000px] h-[20000px] pointer-events-none overflow-visible"
                                viewBox="-10000 -10000 20000 20000"
                                preserveAspectRatio="none"
                                style={{ zIndex: 5 }}
                            >
                                {roles.map(role => {
                                    if (!role.parentId) return null;
                                    const parent = roles.find(r => r.id === role.parentId);
                                    if (!parent) return null;
                                    return (
                                        <path
                                            key={role.id}
                                            d={getConnectionPath(parent, role)}
                                            stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
                                        />
                                    );
                                })}
                                {pendingConnectionStart && (
                                    <line
                                        x1={pendingConnectionStart.x}
                                        y1={pendingConnectionStart.y}
                                        x2={mousePos.x}
                                        y2={mousePos.y}
                                        stroke="#fbbf24" strokeWidth="2" strokeDasharray="5,5"
                                    />
                                )}
                            </svg>

                            {/* LAYER 2: DECORATIONS */}
                            {decorations.map(deco => (
                                <div
                                    key={deco.id}
                                    className="absolute text-slate-400 hover:text-slate-600 transition-colors cursor-move dark:text-slate-500 dark:hover:text-slate-200"
                                    style={{ left: deco.x, top: deco.y, transform: `scale(${deco.scale})`, zIndex: 5 }}
                                    onMouseDown={(e) => handleEntityMouseDown(e, 'decoration', deco.id, deco)}
                                    onContextMenu={(e) => handleContextMenuCanvas(e, 'decoration', deco.id)}
                                >
                                    {getDecorationIcon(deco.type)}
                                    {deco.label && <div className="absolute top-full left-1/2 -translate-x-1/2 text-[10px] font-bold mt-1 bg-[var(--tenant-panel)] px-1 rounded shadow-sm whitespace-nowrap dark:bg-[var(--tenant-panel-dark)] dark:text-slate-200">{deco.label}</div>}
                                </div>
                            ))}

                            {/* LAYER 3: ROLES (Cards) - Highest Z-Index */}
                            {roles.map(role => {
                                const style = CARD_COLORS.find(c => c.id === (role.color || 'slate')) || CARD_COLORS[0];
                                const connectorStyle = `absolute w-5 h-5 bg-[var(--tenant-panel)] border border-[var(--tenant-border)] dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)] rounded-full flex items-center justify-center ${connectingNodeId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity cursor-crosshair hover:bg-[var(--tenant-secondary-soft)] hover:border-[var(--tenant-secondary-border)] z-50 shadow-sm`;

                                return (
                                    <div
                                        key={role.id}
                                        data-role-id={role.id}
                                        className={`absolute w-64 ${style.bg} rounded-lg shadow-sm border group hover:shadow-xl transition-shadow ${style.border} ${connectingNodeId === role.id ? 'ring-2 ring-[#fbbf24]' : ''} ${connectingNodeId && connectingNodeId !== role.id ? 'hover:ring-2 hover:ring-[var(--tenant-secondary-border)]' : ''}`}
                                        style={{ left: role.x, top: role.y, zIndex: 10 }}
                                        onMouseDown={(e) => handleEntityMouseDown(e, 'role', role.id, role)}
                                        onMouseUp={(e) => onConnectorMouseUp(e, role.id)}
                                        onContextMenu={(e) => handleContextMenuCanvas(e, 'node', role.id)}
                                    >
                                        {/* Connectors (N/S/E/W) */}
                                        <div data-connector-side="top" className={`${connectorStyle} -top-2.5 left-1/2 -translate-x-1/2`} onMouseDown={(e) => handleConnectorMouseDown(e, role.id, 'top')} />
                                        <div data-connector-side="bottom" className={`${connectorStyle} -bottom-2.5 left-1/2 -translate-x-1/2`} onMouseDown={(e) => handleConnectorMouseDown(e, role.id, 'bottom')} />
                                        <div data-connector-side="left" className={`${connectorStyle} top-1/2 -left-2.5 -translate-y-1/2`} onMouseDown={(e) => handleConnectorMouseDown(e, role.id, 'left')} />
                                        <div data-connector-side="right" className={`${connectorStyle} top-1/2 -right-2.5 -translate-y-1/2`} onMouseDown={(e) => handleConnectorMouseDown(e, role.id, 'right')} />

                                        {/* Header */}
                                        <div className={`px-3 py-2 rounded-t-lg border-b flex justify-between items-center ${style.header} ${style.border}`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`p-0.5 rounded ${style.text} bg-[var(--tenant-panel)] dark:bg-[var(--tenant-control-dark)]`}>
                                                    {role.category === 'Operational' ? <Briefcase size={12} /> : <CheckSquare size={12} />}
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase ${style.text}`}>{role.category === 'Operational' ? 'Operacional' : 'Admin'}</span>
                                            </div>
                                            <div className="flex gap-1 items-center">
                                                {role.additionalHazard && (
                                                    <div title="Insalubridade" className="flex items-center justify-center w-5 h-5 bg-orange-100 text-orange-700 rounded-full">
                                                        <Biohazard size={12} />
                                                    </div>
                                                )}
                                                {role.additionalDanger && (
                                                    <div title="Periculosidade" className="flex items-center justify-center w-5 h-5 bg-red-100 text-red-700 rounded-full">
                                                        <Zap size={12} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-3">
                                            <input
                                                value={role.title}
                                                onChange={(e) => updateRole(role.id, 'title', e.target.value)}
                                                className="w-full font-bold text-slate-800 text-sm bg-transparent border-none p-0 focus:ring-0 mb-2 placeholder-slate-400 dark:text-slate-100 dark:placeholder-slate-500"
                                                placeholder="Nome do Cargo"
                                            />
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-[var(--tenant-control)] rounded border border-[var(--tenant-border)] px-2 py-1 dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)]">
                                                    <label className="text-[8px] font-bold text-slate-400 uppercase block dark:text-slate-500">Salário Base</label>
                                                    <div className="flex items-center">
                                                        <span className="text-xs text-slate-400 mr-1 dark:text-slate-500">R$</span>
                                                        <input
                                                            value={role.baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            onChange={(e) => handleSalaryChange(role.id, e.target.value)}
                                                            className="w-full bg-transparent text-xs font-bold text-slate-700 border-none p-0 focus:ring-0 dark:text-slate-100"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="w-16 bg-[var(--tenant-control)] rounded border border-[var(--tenant-border)] px-2 py-1 text-center dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)]">
                                                    <label className="text-[8px] font-bold text-slate-400 uppercase block dark:text-slate-500">Qtd</label>
                                                    <input
                                                        type="number"
                                                        value={role.quantity}
                                                        onChange={(e) => updateRole(role.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                        className="w-full bg-transparent text-xs font-bold text-slate-700 border-none p-0 focus:ring-0 text-center dark:text-slate-100"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-[var(--tenant-border)] text-right dark:border-[var(--tenant-border-dark)]">
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Total: </span>
                                                <span className="text-xs font-black text-slate-800 dark:text-slate-100">{formatCurrency(calculateRoleCost(role))}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* FLOATING TOOLBAR - MIRO STYLE */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[var(--tenant-panel)] backdrop-blur-md shadow-2xl rounded-full px-4 py-2 border border-[var(--tenant-border)] flex items-center gap-2 z-50 dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)]">
                        <button
                            title="Cursor (Mover)"
                            className="p-3 rounded-full hover:bg-[var(--tenant-control)] text-slate-600 transition-colors dark:text-slate-300 dark:hover:bg-[var(--tenant-control-dark)]"
                        >
                            <MousePointer size={20} />
                        </button>
                        <div className="w-px h-6 bg-[var(--tenant-control)] mx-1 dark:bg-[var(--tenant-border-dark)]"></div>
                        <button
                            onClick={() => addRole('Operational')}
                            title="Adicionar Cargo Operacional"
                            className="p-3 rounded-full hover:bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] hover:text-[var(--tenant-secondary)] transition-colors"
                        >
                            <Briefcase size={20} />
                        </button>
                        <button
                            onClick={() => addRole('Administrative')}
                            title="Adicionar Cargo Administrativo"
                            className="p-3 rounded-full hover:bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] hover:text-[var(--tenant-secondary)] transition-colors"
                        >
                            <CheckSquare size={20} />
                        </button>
                        <div className="w-px h-6 bg-[var(--tenant-control)] mx-1 dark:bg-[var(--tenant-border-dark)]"></div>
                        <button
                            onClick={applyAutoLayout}
                            title="Organizar Automaticamente"
                            className="p-3 rounded-full hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                        >
                            <Wand2 size={20} />
                        </button>
                        <div className="w-px h-6 bg-[var(--tenant-control)] mx-1 dark:bg-[var(--tenant-border-dark)]"></div>
                        <button
                            onClick={() => addSection()}

                            title="Criar Área (Lane)"
                            className="p-3 rounded-full hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors relative group dark:text-amber-300 dark:hover:bg-amber-950/30"
                        >
                            <Square size={20} className="fill-current opacity-50" />
                            <Plus size={10} className="absolute top-2 right-2 text-amber-800 font-bold dark:text-amber-200" />
                        </button>

                        {/* Decorative Icons */}
                        <button onClick={() => addDecoration('factory')} title="Fábrica" className="p-3 rounded-full hover:bg-[var(--tenant-control)] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-[var(--tenant-control-dark)] dark:hover:text-slate-100"><Factory size={20} /></button>
                        <button onClick={() => addDecoration('flame')} title="Inflamável" className="p-3 rounded-full hover:bg-orange-50 text-orange-500 hover:text-orange-600 dark:text-orange-300 dark:hover:bg-orange-950/30"><Flame size={20} /></button>
                        <button onClick={() => addDecoration('zap')} title="Elétrico" className="p-3 rounded-full hover:bg-yellow-50 text-yellow-500 hover:text-yellow-600 dark:text-yellow-300 dark:hover:bg-yellow-950/30"><Zap size={20} /></button>
                        <button onClick={() => addDecoration('biohazard')} title="Risco Químico/Bio" className="p-3 rounded-full hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30"><Biohazard size={20} /></button>
                    </div>

                    {/* CONTEXT MENU */}
                    {contextMenu && (
                        <div
                            className="fixed z-[100] bg-[var(--tenant-panel)] rounded-lg shadow-xl border border-[var(--tenant-border)] py-1 w-56 text-sm animate-in fade-in zoom-in-95 duration-100 dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-200"
                            style={{ top: contextMenu.y, left: contextMenu.x }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {contextMenu.type === 'node' && (
                                <>
                                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-[var(--tenant-control)] border-b border-[var(--tenant-border)] mb-1 dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-500">
                                        Ações do Card
                                    </div>
                                    <button onClick={() => { updateRole(contextMenu.targetId!, 'parentId', undefined); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[var(--tenant-control)] text-slate-700 flex items-center gap-2 dark:text-slate-200 dark:hover:bg-[var(--tenant-control-dark)]">
                                        <LinkIcon size={14} /> Desconectar Parente
                                    </button>
                                    <button onClick={() => { duplicateRole(contextMenu.targetId!); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-[var(--tenant-control)] text-slate-700 flex items-center gap-2 dark:text-slate-200 dark:hover:bg-[var(--tenant-control-dark)]">
                                        <Type size={14} /> Duplicar / Dividir
                                    </button>

                                    <div className="px-4 py-2 hover:bg-[var(--tenant-control)] flex items-center gap-2 relative group/colors cursor-pointer dark:hover:bg-[var(--tenant-control-dark)]">
                                        <Palette size={14} className="text-slate-400" />
                                        <span>Cor do Card</span>
                                        <div className="absolute left-full top-0 ml-2 bg-[var(--tenant-panel)] border border-[var(--tenant-border)] shadow-xl rounded-lg p-3 grid grid-cols-4 gap-2 hidden group-hover/colors:grid w-40 dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)]">
                                            {CARD_COLORS.map(c => (
                                                <button
                                                    key={c.id}
                                                    className={`w-6 h-6 rounded-full ${c.bg} border ${c.border} hover:scale-110 transition-transform`}
                                                    onClick={() => { updateRole(contextMenu.targetId!, 'color', c.id); setContextMenu(null); }}
                                                ></button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="h-px bg-[var(--tenant-control)] my-1 dark:bg-[var(--tenant-border-dark)]"></div>
                                    <button onClick={() => { removeEntity('role', contextMenu.targetId!); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 dark:text-red-300 dark:hover:bg-red-950/30">
                                        <Trash2 size={14} /> Excluir
                                    </button>
                                </>
                            )}

                            {contextMenu.type === 'section' && (
                                <>
                                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-[var(--tenant-control)] border-b border-[var(--tenant-border)] mb-1 dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-500">
                                        Área / Lane
                                    </div>
                                    <div className="px-4 py-2 flex gap-2">
                                        {SECTION_COLORS.map(c => (
                                            <button key={c.id} className={`w-6 h-6 rounded-full border ${c.bg} ${c.border}`} onClick={() => { updateSection(contextMenu.targetId!, 'color', c.id); setContextMenu(null); }} />
                                        ))}
                                    </div>
                                    <button onClick={() => { removeEntity('section', contextMenu.targetId!); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 dark:text-red-300 dark:hover:bg-red-950/30">
                                        <Trash2 size={14} /> Remover Área
                                    </button>
                                </>
                            )}

                            {contextMenu.type === 'decoration' && (
                                <button onClick={() => { removeEntity('decoration', contextMenu.targetId!); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 dark:text-red-300 dark:hover:bg-red-950/30">
                                    <Trash2 size={14} /> Remover Ícone
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* LIST OR GRID VIEW (Standard Views) */
                <div className="p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-6">
                    {/* OVERVIEW INDICATORS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Efetivo Total */}
                        <div className="bg-[var(--tenant-panel)] p-5 rounded-lg border border-[var(--tenant-border)] shadow-sm flex items-center justify-between dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)]">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Efetivo Total</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <p className="text-3xl font-black text-slate-800 tracking-tight dark:text-slate-100">{totalHeadcount}</p>
                                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">pessoas</span>
                                </div>
                            </div>
                            <div className="h-12 w-12 bg-[var(--tenant-secondary-soft)] rounded-full flex items-center justify-center text-[var(--tenant-secondary)] dark:bg-[var(--tenant-control-dark)]">
                                <Users size={24} />
                            </div>
                        </div>

                        {/* Salário Médio Base */}
                        <div className="bg-[var(--tenant-panel)] p-5 rounded-lg border border-[var(--tenant-border)] shadow-sm flex items-center justify-between dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)]">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Salário Médio Base</p>
                                <p className="text-3xl font-black text-emerald-600 mt-1 tracking-tight">{formatCurrency(averageSalary)}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium dark:text-slate-500">Não inclui adicionais e encargos</p>
                            </div>
                            <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300">
                                <DollarSign size={24} />
                            </div>
                        </div>

                        {/* Custo Total em Folha */}
                        <div className="bg-[var(--tenant-panel)] p-5 rounded-lg border border-[var(--tenant-border)] shadow-sm flex items-center justify-between dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)]">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Custo Total da Folha</p>
                                <p className="text-3xl font-black text-amber-600 mt-1 tracking-tight">{formatCurrency(totalCost)}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium flex items-center gap-1 dark:text-slate-500">
                                    Inclui adicionais e <span className="font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded dark:bg-amber-950/30 dark:text-amber-300">{data.taxConfig.socialChargesRate * 100}%</span> de encargos
                                </p>
                            </div>
                            <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 dark:bg-amber-950/30 dark:text-amber-300">
                                <Briefcase size={24} />
                            </div>
                        </div>
                    </div>

                    {/* BENEFITS CONFIGURATION SECTION */}
                    <div className="bg-[var(--tenant-panel)] rounded-lg shadow-sm border border-[var(--tenant-border)] p-6 shrink-0 dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)]">
                        <div className="flex items-center gap-2 mb-4">
                            <Box className="text-[var(--tenant-secondary)]" size={20} />
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Configuração Global de Benefícios</h3>
                            <span className="text-xs font-medium text-slate-500 ml-2 dark:text-slate-400">Aplicado proporcionalmente ao efetivo total</span>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            {/* Assistência Médica */}
                            <div className="col-span-1 lg:col-span-1 border border-rose-200 bg-rose-50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow dark:border-rose-900/60 dark:bg-rose-950/20">
                                <label className="text-xs font-bold text-rose-700 block mb-3 flex items-center gap-1">
                                    <HeartPulse size={16} /> Assistência Médica
                                </label>
                                <div className="flex items-center gap-1 bg-[var(--tenant-panel)] p-2.5 rounded-md border border-rose-100 focus-within:ring-2 focus-within:ring-rose-200 focus-within:border-rose-300 transition-all dark:bg-[var(--tenant-control-dark)] dark:border-rose-900/60">
                                    <span className="text-rose-400 text-xs font-bold">R$</span>
                                    <input
                                        type="number"
                                        value={benefits.healthInsurance}
                                        onChange={(e) => updateBenefits('healthInsurance', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-transparent font-extrabold text-slate-700 text-sm border-none p-0 focus:ring-0 dark:text-slate-100"
                                        placeholder="0,00"
                                    />
                                    <span className="text-rose-300 text-[10px] font-bold">/mês</span>
                                </div>
                            </div>

                            {/* Dependentes */}
                            <div className="col-span-1 lg:col-span-1 border border-[var(--tenant-secondary-border)] bg-[var(--tenant-secondary-soft)] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow dark:bg-[var(--tenant-control-dark)]">
                                <label className="text-xs font-bold text-[var(--tenant-secondary)] block mb-3 flex items-center gap-1">
                                    <Users size={16} /> Fator Dependentes
                                </label>
                                <div className="bg-[var(--tenant-panel)] p-2.5 rounded-md border border-[var(--tenant-secondary-border)] flex items-center focus-within:ring-2 focus-within:ring-[var(--tenant-primary-soft)] focus-within:border-[var(--tenant-secondary-border)] transition-all dark:bg-[var(--tenant-panel-dark)]">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={benefits.healthInsuranceDependentFactor}
                                        onChange={(e) => updateBenefits('healthInsuranceDependentFactor', parseFloat(e.target.value) || 1)}
                                        className="w-full bg-transparent font-extrabold text-slate-700 text-sm border-none p-0 focus:ring-0 text-center dark:text-slate-100"
                                        title="Ex: 1.5 significa Titular + 0.5 dependentes em média"
                                    />
                                </div>
                            </div>

                            {/* Alimentação (VA) */}
                            <div className="col-span-1 lg:col-span-1 border border-orange-200 bg-orange-50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow dark:border-orange-900/60 dark:bg-orange-950/20">
                                <label className="text-xs font-bold text-orange-700 block mb-3 flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                    <ShoppingBag size={16} className="shrink-0" /> Vale Alimentação (VA)
                                </label>
                                <div className="flex items-center gap-1 bg-[var(--tenant-panel)] p-2.5 rounded-md border border-orange-100 focus-within:ring-2 focus-within:ring-orange-200 focus-within:border-orange-300 transition-all dark:bg-[var(--tenant-control-dark)] dark:border-orange-900/60">
                                    <span className="text-orange-400 text-xs font-bold">R$</span>
                                    <input
                                        type="number"
                                        value={benefits.foodAllowance}
                                        onChange={(e) => updateBenefits('foodAllowance', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-transparent font-extrabold text-slate-700 text-sm border-none p-0 focus:ring-0 dark:text-slate-100"
                                        placeholder="0,00"
                                    />
                                    <span className="text-orange-300 text-[10px] font-bold">/mês</span>
                                </div>
                            </div>

                            {/* Refeição (VR) vs Refeitório */}
                            <div className="col-span-2 lg:col-span-1 flex flex-col gap-2">
                                <div className={`border rounded-lg p-4 flex-1 shadow-sm transition-all ${benefits.hasCafeteria ? 'border-[var(--tenant-border)] bg-[var(--tenant-control)] dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)]' : 'border-amber-200 bg-amber-50 hover:shadow-md dark:border-amber-900/60 dark:bg-amber-950/20'}`}>
                                    <label className={`text-xs font-bold block mb-3 flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis ${benefits.hasCafeteria ? 'text-slate-400 dark:text-slate-500' : 'text-amber-700 dark:text-amber-300'}`}>
                                        <Utensils size={16} className="shrink-0" /> Vale Refeição (VR)
                                    </label>
                                    <div className={`flex items-center gap-1 p-2.5 rounded-md border transition-all ${benefits.hasCafeteria ? 'bg-[var(--tenant-panel)] border-[var(--tenant-border)] dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)]' : 'bg-[var(--tenant-panel)] border-amber-100 focus-within:ring-2 focus-within:ring-amber-200 focus-within:border-amber-300 dark:bg-[var(--tenant-control-dark)] dark:border-amber-900/60'}`}>
                                        <span className={`text-xs font-bold ${benefits.hasCafeteria ? 'text-slate-300' : 'text-amber-400'}`}>R$</span>
                                        <input
                                            type="number"
                                            value={benefits.mealAllowance}
                                            onChange={(e) => updateBenefits('mealAllowance', parseFloat(e.target.value) || 0)}
                                            disabled={benefits.hasCafeteria}
                                            className={`w-full bg-transparent font-extrabold text-sm border-none p-0 focus:ring-0 ${benefits.hasCafeteria ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-100'}`}
                                            placeholder="0,00"
                                        />
                                        <span className={`text-[10px] font-bold ${benefits.hasCafeteria ? 'text-slate-300' : 'text-amber-300'}`}>/mês</span>
                                    </div>
                                </div>
                                <label className={`flex items-center justify-center gap-2 cursor-pointer border px-3 py-2 rounded-lg transition-colors shadow-sm ${benefits.hasCafeteria ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200' : 'bg-[var(--tenant-panel)] border-[var(--tenant-border)] text-slate-600 hover:bg-[var(--tenant-control)] dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-300 dark:hover:bg-[var(--tenant-control-dark)]'}`}>
                                    <input
                                        type="checkbox"
                                        checked={benefits.hasCafeteria}
                                        onChange={(e) => updateBenefits('hasCafeteria', e.target.checked)}
                                        className="rounded border-[var(--tenant-border)] text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer dark:border-[var(--tenant-border-dark)]"
                                    />
                                    <span className="text-xs font-bold">Possui Refeitório?</span>
                                </label>
                            </div>

                            {/* Transporte (VT) */}
                            <div className="col-span-1 lg:col-span-1 border border-[var(--tenant-secondary-border)] bg-[var(--tenant-secondary-soft)] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow dark:bg-[var(--tenant-control-dark)]">
                                <label className="text-xs font-bold text-[var(--tenant-secondary)] block mb-3 flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                    <Bus size={16} className="shrink-0" /> Vale Transporte (VT)
                                </label>
                                <div className="flex items-center gap-1 bg-[var(--tenant-panel)] p-2.5 rounded-md border border-[var(--tenant-secondary-border)] focus-within:ring-2 focus-within:ring-[var(--tenant-primary-soft)] focus-within:border-[var(--tenant-secondary-border)] transition-all dark:bg-[var(--tenant-panel-dark)]">
                                    <span className="text-[var(--tenant-secondary)] text-xs font-bold">R$</span>
                                    <input
                                        type="number"
                                        value={benefits.transportAllowance}
                                        onChange={(e) => updateBenefits('transportAllowance', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-transparent font-extrabold text-slate-700 text-sm border-none p-0 focus:ring-0 dark:text-slate-100"
                                        placeholder="0,00"
                                    />
                                    <span className="text-[var(--tenant-secondary)] text-[10px] font-bold">/mês</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--tenant-panel)] rounded-lg shadow-sm border border-[var(--tenant-border)] p-3 shrink-0 dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)]">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="text-[var(--tenant-secondary)]" size={20} />
                                <div>
                                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">PLR por Competencia</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Parcela total por mes calendario, sem encargos sociais.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 lg:min-w-[260px]">
                                <div className="bg-[var(--tenant-control)] border border-[var(--tenant-border)] rounded-lg px-3 py-1.5 dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)]">
                                    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wide dark:text-slate-500">Total na vigencia</p>
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">{formatCurrency(financials.totalProfitSharingCost)}</p>
                                </div>
                                <div className="bg-[var(--tenant-control)] border border-[var(--tenant-border)] rounded-lg px-3 py-1.5 dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)]">
                                    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wide dark:text-slate-500">Rateio mensal</p>
                                    <p className="text-sm font-black text-[var(--tenant-secondary)]">{formatCurrency(financials.monthlyProfitSharingCost)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {profitSharingInstallments.length === 0 ? (
                                <button
                                    type="button"
                                    onClick={addProfitSharingInstallment}
                                    className="w-full min-h-9 border border-dashed border-[var(--tenant-border)] rounded-lg bg-[var(--tenant-control)] px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-[var(--tenant-secondary-soft)] hover:text-[var(--tenant-secondary)] flex justify-center items-center gap-2 dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-control-dark)] dark:text-slate-400"
                                >
                                    <Plus size={14} /> Adicionar competencia de PLR
                                    <span className="hidden font-medium text-slate-400 dark:text-slate-500 sm:inline">Nenhuma parcela configurada</span>
                                </button>
                            ) : (
                                <>
                                    {profitSharingInstallments.map(item => (
                                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-[40px_1fr_1.3fr_36px] gap-2 items-center rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-control)] px-2.5 py-1.5 dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)]">
                                            <label className="flex justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={item.active}
                                                    onChange={(event) => updateProfitSharingInstallment(item.id, 'active', event.target.checked)}
                                                    className="rounded border-[var(--tenant-border)] text-[var(--tenant-secondary)] focus:ring-[var(--tenant-secondary)] dark:border-[var(--tenant-border-dark)]"
                                                />
                                            </label>
                                            <select
                                                value={item.competenceMonth}
                                                onChange={(event) => updateProfitSharingInstallment(item.id, 'competenceMonth', Number(event.target.value))}
                                                className="w-full bg-[var(--tenant-panel)] border border-[var(--tenant-border)] rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[var(--tenant-primary-soft)] focus:border-[var(--tenant-secondary-border)] dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-100"
                                            >
                                                {MONTH_OPTIONS.map(month => (
                                                    <option key={month.value} value={month.value}>{month.label}</option>
                                                ))}
                                            </select>
                                            <div className="flex items-center bg-[var(--tenant-panel)] border border-[var(--tenant-border)] rounded-md px-3 py-1.5 focus-within:ring-2 focus-within:ring-[var(--tenant-primary-soft)] focus-within:border-[var(--tenant-secondary-border)] dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)]">
                                                <span className="text-xs font-bold text-slate-400 mr-2 dark:text-slate-500">R$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={item.amount || ''}
                                                    onChange={(event) => updateProfitSharingInstallment(item.id, 'amount', Number(event.target.value) || 0)}
                                                    className="w-full bg-transparent text-sm font-bold text-slate-800 border-none p-0 focus:ring-0 text-right dark:text-slate-100"
                                                    placeholder="0,00"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeProfitSharingInstallment(item.id)}
                                                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:text-slate-500 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                                                title="Remover PLR"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addProfitSharingInstallment}
                                        className="w-full py-2 border border-dashed border-[var(--tenant-border)] rounded-lg text-xs font-bold text-slate-500 hover:bg-[var(--tenant-secondary-soft)] hover:text-[var(--tenant-secondary)] flex justify-center items-center gap-2 dark:border-[var(--tenant-border-dark)] dark:text-slate-400"
                                    >
                                        <Plus size={14} /> Adicionar competencia de PLR
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {viewMode === 'list' && (
                        <div className="bg-[var(--tenant-panel)] rounded-lg shadow-sm border border-[var(--tenant-border)] overflow-hidden dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)]">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[var(--tenant-control)] text-slate-500 font-bold uppercase text-xs tracking-wider border-b border-[var(--tenant-border)] dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4">Cargo / Função</th>
                                        <th className="px-6 py-4">Categoria</th>
                                        <th className="px-6 py-4 w-32">Quantidade</th>
                                        <th className="px-6 py-4">Salário Base</th>
                                        <th className="px-6 py-4">Adicionais</th>
                                        <th className="px-6 py-4 text-right">Custo Total</th>
                                        <th className="px-6 py-4 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--tenant-border)] dark:divide-[var(--tenant-border-dark)]">
                                    {roles.map(role => (
                                        <tr key={role.id} className="hover:bg-[var(--tenant-control)] group dark:hover:bg-[var(--tenant-control-dark)]">
                                            <td className="px-6 py-4">
                                                <input type="text" value={role.title} onChange={(e) => updateRole(role.id, 'title', e.target.value)} className="bg-transparent border-none font-bold text-slate-700 p-0 focus:ring-0 w-full dark:text-slate-100" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${role.category === 'Operational' ? 'bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] border border-[var(--tenant-secondary-border)] dark:bg-[var(--tenant-control-dark)]' : 'bg-[var(--tenant-control)] text-slate-600 border border-[var(--tenant-border)] dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-300'}`}>
                                                    {role.category === 'Operational' ? 'Operacional' : 'Admin'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <input type="number" value={role.quantity} onChange={(e) => updateRole(role.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-full bg-[var(--tenant-control)] border border-[var(--tenant-border)] rounded text-center font-bold text-slate-700 py-1 dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-100" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-slate-400 text-xs dark:text-slate-500">R$</span>
                                                    <input
                                                        value={role.baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        onChange={(e) => handleSalaryChange(role.id, e.target.value)}
                                                        className="w-full bg-transparent border-none font-bold text-slate-700 p-0 focus:ring-0 dark:text-slate-100"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button onClick={() => updateRole(role.id, 'additionalHazard', !role.additionalHazard)} className={`p-1 rounded border text-[10px] font-bold uppercase flex items-center gap-1 ${role.additionalHazard ? 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/30 dark:border-orange-900 dark:text-orange-300' : 'bg-[var(--tenant-control)] border-[var(--tenant-border)] text-slate-300 dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-600'}`}>
                                                        <Biohazard size={10} /> INS (20%)
                                                    </button>
                                                    <button onClick={() => updateRole(role.id, 'additionalDanger', !role.additionalDanger)} className={`p-1 rounded border text-[10px] font-bold uppercase flex items-center gap-1 ${role.additionalDanger ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300' : 'bg-[var(--tenant-control)] border-[var(--tenant-border)] text-slate-300 dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-600'}`}>
                                                        <Zap size={10} /> PER (30%)
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-700 dark:text-slate-100">{formatCurrency(calculateRoleCost(role))}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => removeEntity('role', role.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity dark:text-slate-600 dark:hover:text-red-300"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-4 bg-[var(--tenant-control)] border-t border-[var(--tenant-border)] flex gap-4 dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)]">
                                <button onClick={() => addRole('Operational')} className="text-xs font-bold bg-[var(--tenant-panel)] border border-[var(--tenant-border)] text-slate-600 px-4 py-2 rounded-lg hover:bg-[var(--tenant-secondary-soft)] flex items-center gap-2 dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-300"><Plus size={14} /> Adicionar Operacional</button>
                                <button onClick={() => addRole('Administrative')} className="text-xs font-bold bg-[var(--tenant-panel)] border border-[var(--tenant-border)] text-slate-600 px-4 py-2 rounded-lg hover:bg-[var(--tenant-secondary-soft)] flex items-center gap-2 dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-300"><Plus size={14} /> Adicionar Administrativo</button>
                            </div>
                        </div>
                    )}

                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {roles.map(role => (
                                <div key={role.id} className="bg-[var(--tenant-panel)] rounded-lg shadow-sm border border-[var(--tenant-border)] p-6 relative group hover:shadow-md transition-shadow dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)]">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2 rounded-lg ${role.category === 'Operational' ? 'bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] dark:bg-[var(--tenant-control-dark)]' : 'bg-[var(--tenant-control)] text-slate-600 dark:bg-[var(--tenant-control-dark)] dark:text-slate-300'}`}>
                                            {role.category === 'Operational' ? <Briefcase size={20} /> : <CheckSquare size={20} />}
                                        </div>
                                        <button onClick={() => removeEntity('role', role.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors dark:text-slate-600 dark:hover:bg-red-950/30 dark:hover:text-red-300">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <input type="text" value={role.title} onChange={(e) => updateRole(role.id, 'title', e.target.value)} className="w-full text-lg font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0 mb-1 dark:text-slate-100" />
                                    <p className="text-xs text-slate-400 uppercase font-bold mb-4 dark:text-slate-500">{role.category === 'Operational' ? 'Operacional' : 'Administrativo'}</p>

                                    <div className="space-y-3 bg-[var(--tenant-control)] p-4 rounded-lg border border-[var(--tenant-border)] dark:bg-[var(--tenant-control-dark)] dark:border-[var(--tenant-border-dark)]">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Salário Base</label>
                                            <div className="flex items-center gap-1 w-28">
                                                <span className="text-xs text-slate-400 dark:text-slate-500">R$</span>
                                                <input
                                                    value={role.baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    onChange={(e) => handleSalaryChange(role.id, e.target.value)}
                                                    className="w-full bg-transparent text-right font-bold text-slate-700 text-sm border-none p-0 focus:ring-0 dark:text-slate-100"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Quantidade</label>
                                            <input type="number" value={role.quantity} onChange={(e) => updateRole(role.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-16 bg-[var(--tenant-panel)] border border-[var(--tenant-border)] text-center font-bold text-slate-700 text-sm rounded py-0.5 focus:ring-0 dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-100" />
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-2">
                                        <button onClick={() => updateRole(role.id, 'additionalHazard', !role.additionalHazard)} className={`flex-1 py-2 rounded text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${role.additionalHazard ? 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/30 dark:border-orange-900 dark:text-orange-300' : 'bg-[var(--tenant-panel)] border-[var(--tenant-border)] text-slate-400 dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-500'}`}>
                                            <Biohazard size={14} /> Insalubridade
                                        </button>
                                        <button onClick={() => updateRole(role.id, 'additionalDanger', !role.additionalDanger)} className={`flex-1 py-2 rounded text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${role.additionalDanger ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300' : 'bg-[var(--tenant-panel)] border-[var(--tenant-border)] text-slate-400 dark:bg-[var(--tenant-panel-dark)] dark:border-[var(--tenant-border-dark)] dark:text-slate-500'}`}>
                                            <Zap size={14} /> Periculosidade
                                        </button>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-[var(--tenant-border)] flex justify-between items-center dark:border-[var(--tenant-border-dark)]">
                                        <span className="text-xs font-bold text-slate-400 uppercase dark:text-slate-500">Custo Total</span>
                                        <span className="text-lg font-black text-slate-800 dark:text-slate-100">{formatCurrency(calculateRoleCost(role))}</span>
                                    </div>
                                </div>
                            ))}

                            <button onClick={() => addRole('Operational')} className="border-2 border-dashed border-[var(--tenant-border)] rounded-lg p-6 flex flex-col items-center justify-center text-slate-400 hover:border-[var(--tenant-secondary-border)] hover:text-[var(--tenant-secondary)] hover:bg-[var(--tenant-secondary-soft)] transition-all min-h-[300px] dark:border-[var(--tenant-border-dark)] dark:text-slate-500">
                                <Plus size={32} className="mb-2" />
                                <span className="font-bold text-sm">Adicionar Cargo</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Team;
