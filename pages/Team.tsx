
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ProposalData, Role, CanvasSection, CanvasDecoration } from '../types';
import { formatCurrency } from '../utils/pricingEngine';
import { Users, Plus, Trash2, LayoutList, LayoutGrid, CheckSquare, Workflow, Move, ZoomIn, ZoomOut, MousePointer2, X, Link as LinkIcon, Palette, Briefcase, Factory, Wrench, Truck, AlertTriangle, Box, Type, Grip, Ban, DollarSign, Square, MousePointer, Flame, Zap, Skull, Biohazard, HeartPulse, ShoppingBag, Utensils, Bus } from 'lucide-react';

interface TeamProps {
    data: ProposalData;
    updateData: (newData: Partial<ProposalData>) => void;
}

// Cores para personalização dos cards
const CARD_COLORS = [
    { id: 'slate', bg: 'bg-slate-50', border: 'border-slate-200', header: 'bg-slate-100', text: 'text-slate-700' },
    { id: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', header: 'bg-blue-100', text: 'text-blue-700' },
    { id: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', header: 'bg-emerald-100', text: 'text-emerald-700' },
    { id: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', header: 'bg-amber-100', text: 'text-amber-700' },
    { id: 'red', bg: 'bg-red-50', border: 'border-red-200', header: 'bg-red-100', text: 'text-red-700' },
    { id: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', header: 'bg-purple-100', text: 'text-purple-700' },
    { id: 'dark', bg: 'bg-[#1e293b]', border: 'border-slate-600', header: 'bg-[#0f172a]', text: 'text-white' },
];

const SECTION_COLORS = [
    { id: 'gray', bg: 'bg-slate-100/30', border: 'border-slate-300' },
    { id: 'blue', bg: 'bg-blue-100/20', border: 'border-blue-200' },
    { id: 'green', bg: 'bg-emerald-100/20', border: 'border-emerald-200' },
    { id: 'yellow', bg: 'bg-amber-100/20', border: 'border-amber-200' },
    { id: 'red', bg: 'bg-red-100/20', border: 'border-red-200' },
];

const Team: React.FC<TeamProps> = ({ data, updateData }) => {
    const [viewMode, setViewMode] = useState<'list' | 'grid' | 'organogram'>('list');

    // --- Organogram State ---
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    // UI State for Active Feedback (only for visuals)
    const [isDraggingUI, setIsDraggingUI] = useState(false);
    const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
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
    } | null>(null);

    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0 });

    const dataRef = useRef(data);
    dataRef.current = data; // Always keep fresh

    const panRef = useRef(pan);
    panRef.current = pan;

    const scaleRef = useRef(scale);
    scaleRef.current = scale;

    // --- ROBUST EVENT SYSTEM TO PREVENT "STICKY HAND" ---
    // We use Refs to store the handlers so they can reference each other without circular dependencies
    const moveHandlerRef = useRef<(e: MouseEvent) => void>(null);
    const upHandlerRef = useRef<(e: MouseEvent) => void>(null);

    // 1. DEFINE UP HANDLER (Cleanup)
    useEffect(() => {
        upHandlerRef.current = (e: MouseEvent) => {
            // Clean up Refs
            isPanningRef.current = false;
            dragInfoRef.current = null;

            // Clean up UI State
            setIsDraggingUI(false);
            if (connectingNodeId) setConnectingNodeId(null);

            // Remove Listeners immediately
            if (moveHandlerRef.current) window.removeEventListener('mousemove', moveHandlerRef.current);
            if (upHandlerRef.current) {
                window.removeEventListener('mouseup', upHandlerRef.current);
                window.removeEventListener('mouseleave', upHandlerRef.current); // Catch leaving window
            }
            document.body.style.cursor = 'default';
        };
    }, [connectingNodeId]); // Re-bind if dependencies change

    // 2. DEFINE MOVE HANDLER (Logic)
    useEffect(() => {
        moveHandlerRef.current = (e: MouseEvent) => {
            // --- SAFETY VALVE: THE "STICKY HAND" FIX ---
            // If e.buttons is 0, it means no mouse button is pressed.
            // If we still think we are dragging, we are wrong. Force release.
            if (e.buttons === 0 && (isPanningRef.current || dragInfoRef.current)) {
                upHandlerRef.current?.(e);
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
                    const updatedRoles = currentData.roles.map(r =>
                        r.id === id ? { ...r, x: initialObjX + deltaX, y: initialObjY + deltaY } : r
                    );
                    updateData({ roles: updatedRoles });
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
            if (connectingNodeId && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const worldX = (e.clientX - rect.left - panRef.current.x) / scaleRef.current;
                const worldY = (e.clientY - rect.top - panRef.current.y) / scaleRef.current;
                setMousePos({ x: worldX, y: worldY });
            }
        };
    }, [updateData, connectingNodeId]);

    // --- START LISTENERS ---

    const startGlobalListeners = () => {
        if (moveHandlerRef.current && upHandlerRef.current) {
            window.addEventListener('mousemove', moveHandlerRef.current);
            window.addEventListener('mouseup', upHandlerRef.current);
            window.addEventListener('mouseleave', upHandlerRef.current);
        }
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
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
        if (e.button !== 0 || e.altKey || connectingNodeId) return;
        e.stopPropagation();
        e.preventDefault();

        dragInfoRef.current = {
            type, id,
            startX: e.clientX, startY: e.clientY,
            initialObjX: initialObj.x, initialObjY: initialObj.y,
            initialObjW: initialObj.width, initialObjH: initialObj.height
        };

        setIsDraggingUI(true);
        startGlobalListeners();
    };

    // --- Helpers ---
    const getCenterViewCoords = () => {
        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = (rect.width / 2 - pan.x) / scale - 150;
            const y = (rect.height / 2 - pan.y) / scale - 100;
            return { x, y };
        }
        return { x: 0, y: 0 };
    };

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
        updateData({ roles: [...data.roles, newRole] });
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
        const newRole = {
            ...source,
            id: Math.random().toString(36).substr(2, 9),
            x: (source.x || 0) + 50,
            y: (source.y || 0) + 50,
            parentId: source.parentId
        };
        updateData({ roles: [...data.roles, newRole] });
    };

    const updateRole = (id: string, field: keyof Role, value: any) => {
        updateData({ roles: data.roles.map(r => r.id === id ? { ...r, [field]: value } : r) });
    };

    const updateSection = (id: string, field: keyof CanvasSection, value: any) => {
        const sections = data.sections || [];
        updateData({ sections: sections.map(s => s.id === id ? { ...s, [field]: value } : s) });
    };

    const removeEntity = (type: 'role' | 'section' | 'decoration', id: string) => {
        if (type === 'role') {
            const updatedRoles = data.roles
                .filter(r => r.id !== id)
                .map(r => r.parentId === id ? { ...r, parentId: undefined } : r);
            updateData({ roles: updatedRoles });
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
        if (connectingNodeId && connectingNodeId !== targetId) {
            updateRole(targetId, 'parentId', connectingNodeId);
        }
        setConnectingNodeId(null);
    };

    const handleSalaryChange = (id: string, rawValue: string) => {
        const numeric = rawValue.replace(/\D/g, '');
        const val = numeric ? parseFloat(numeric) / 100 : 0;
        updateRole(id, 'baseSalary', val);
    };

    // --- Smart Path Logic (Dynamic Entry/Exit) ---

    const getSmartPath = (parent: Role, child: Role) => {
        const pW = 256; const pH = 140;
        const cW = 256; const cH = 140;

        const pX = parent.x || 0; const pY = parent.y || 0;
        const cX = child.x || 0; const cY = child.y || 0;

        // Centers
        const pCenter = { x: pX + pW / 2, y: pY + pH / 2 };
        const cCenter = { x: cX + cW / 2, y: cY + cH / 2 };

        // Determine relative position
        const dx = cCenter.x - pCenter.x;
        const dy = cCenter.y - pCenter.y;

        let startPoint = { x: 0, y: 0 };
        let endPoint = { x: 0, y: 0 };
        let controlPoint1 = { x: 0, y: 0 };
        let controlPoint2 = { x: 0, y: 0 };

        // SMART EXIT LOGIC (From Parent)
        // If child is significantly to the right/left vs top/bottom
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal Dominance
            if (dx > 0) {
                // Child is to the Right -> Exit Parent Right
                startPoint = { x: pX + pW, y: pY + pH / 2 };
                controlPoint1 = { x: startPoint.x + 50, y: startPoint.y };
            } else {
                // Child is to the Left -> Exit Parent Left
                startPoint = { x: pX, y: pY + pH / 2 };
                controlPoint1 = { x: startPoint.x - 50, y: startPoint.y };
            }
        } else {
            // Vertical Dominance
            if (dy > 0) {
                // Child is Below -> Exit Parent Bottom
                startPoint = { x: pX + pW / 2, y: pY + pH };
                controlPoint1 = { x: startPoint.x, y: startPoint.y + 50 };
            } else {
                // Child is Above -> Exit Parent Top
                startPoint = { x: pX + pW / 2, y: pY };
                controlPoint1 = { x: startPoint.x, y: startPoint.y - 50 };
            }
        }

        // SMART ENTRY LOGIC (To Child)
        // Logic: Enter from the side closest to parent center
        const angle = Math.atan2(dy, dx); // Radians
        const degrees = angle * (180 / Math.PI);

        if (degrees >= -45 && degrees <= 45) {
            // Parent is left of Child (Child is right) -> Enter Left
            endPoint = { x: cX, y: cY + cH / 2 };
            controlPoint2 = { x: endPoint.x - 50, y: endPoint.y };
        } else if (degrees > 45 && degrees < 135) {
            // Parent is above Child (Child is below) -> Enter Top
            endPoint = { x: cX + cW / 2, y: cY };
            controlPoint2 = { x: endPoint.x, y: endPoint.y - 50 };
        } else if (degrees >= 135 || degrees <= -135) {
            // Parent is right of Child (Child is left) -> Enter Right
            endPoint = { x: cX + cW, y: cY + cH / 2 };
            controlPoint2 = { x: endPoint.x + 50, y: endPoint.y };
        } else {
            // Parent is below Child (Child is above) -> Enter Bottom
            endPoint = { x: cX + cW / 2, y: cY + cH };
            controlPoint2 = { x: endPoint.x, y: endPoint.y + 50 };
        }

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
            case 'skull': return <Skull size={size} className="text-slate-800" />;
            case 'biohazard': return <Biohazard size={size} className="text-emerald-600" />;
            default: return <Briefcase size={size} />;
        }
    };

    useEffect(() => {
        // Initial Layout if empty
        if (viewMode === 'organogram' && data.roles.length > 0 && data.roles[0].x === undefined) {
            const updatedRoles = data.roles.map((r, i) => ({
                ...r,
                x: (i % 3) * 300,
                y: Math.floor(i / 3) * 250
            }));
            updateData({ roles: updatedRoles });
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

    // --- Overview Indicators ---
    const totalHeadcount = roles.reduce((acc, role) => acc + role.quantity, 0);
    const totalCost = roles.reduce((acc, role) => acc + calculateRoleCost(role), 0);
    const averageSalary = totalHeadcount > 0
        ? roles.reduce((acc, role) => acc + (role.baseSalary * role.quantity), 0) / totalHeadcount
        : 0;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50">
            {/* Header Toolbar */}
            <div className="p-6 pb-2 shrink-0 z-20 relative bg-white border-b border-slate-200">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            {viewMode === 'organogram' ? <Workflow size={28} className="text-[#0f172a]" /> : <Users size={28} className="text-[#0f172a]" />}
                            Quadro de Pessoal
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">
                            {viewMode === 'organogram'
                                ? 'Canvas Interativo: Arraste para organizar (Miro Style).'
                                : 'Definição de cargos, salários e adicionais trabalhistas.'}
                        </p>
                    </div>

                    <div className="flex gap-4">
                        {viewMode === 'organogram' && (
                            <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm items-center">
                                <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-2 hover:bg-slate-50 text-slate-500 rounded"><ZoomOut size={16} /></button>
                                <span className="text-xs font-mono font-bold w-12 text-center select-none">{Math.round(scale * 100)}%</span>
                                <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2 hover:bg-slate-50 text-slate-500 rounded"><ZoomIn size={16} /></button>
                            </div>
                        )}

                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-slate-400'}`}><LayoutList size={20} /></button>
                            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-slate-400'}`}><LayoutGrid size={20} /></button>
                            <button onClick={() => setViewMode('organogram')} className={`p-2 rounded-md ${viewMode === 'organogram' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-slate-400'}`}><Workflow size={20} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* VIEW CONTENT */}
            {viewMode === 'organogram' ? (
                <div className={`flex-1 relative overflow-hidden select-none bg-[#f8fafc] ${isDraggingUI ? 'cursor-grabbing' : 'cursor-grab'}`}>
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
                                        className={`absolute border-2 border-dashed rounded-xl group/section ${style.bg} ${style.border}`}
                                        style={{ left: section.x, top: section.y, width: section.width, height: section.height, zIndex: 0 }}
                                        onMouseDown={(e) => handleEntityMouseDown(e, 'section', section.id, section)}
                                        onContextMenu={(e) => handleContextMenuCanvas(e, 'section', section.id)}
                                    >
                                        <div className="absolute top-0 left-0 px-4 py-2 bg-white/80 rounded-br-xl backdrop-blur-sm border-r border-b border-inherit">
                                            <input
                                                value={section.title}
                                                onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                                                className="bg-transparent font-bold text-slate-500 text-xs uppercase tracking-wider outline-none w-48"
                                            />
                                        </div>
                                        <div
                                            className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize hover:bg-black/10 rounded-tl flex items-end justify-end p-1 text-slate-400"
                                            onMouseDown={(e) => handleEntityMouseDown(e, 'resize-section', section.id, { x: 0, y: 0, width: section.width, height: section.height })}
                                        >
                                            <Grip size={14} />
                                        </div>
                                    </div>
                                )
                            })}

                            {/* LAYER 1: CONNECTIONS */}
                            <svg className="absolute top-[-10000px] left-[-10000px] w-[20000px] h-[20000px] pointer-events-none overflow-visible" style={{ zIndex: 5 }}>
                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                        <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                                    </marker>
                                </defs>
                                {roles.map(role => {
                                    if (!role.parentId) return null;
                                    const parent = roles.find(r => r.id === role.parentId);
                                    if (!parent) return null;
                                    return (
                                        <path
                                            key={role.id}
                                            d={getSmartPath(parent, role)}
                                            stroke="#94a3b8" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"
                                        />
                                    );
                                })}
                                {connectingNodeId && (
                                    <line
                                        x1={(() => {
                                            const r = roles.find(n => n.id === connectingNodeId);
                                            return (r?.x || 0) + 128;
                                        })()}
                                        y1={(() => {
                                            const r = roles.find(n => n.id === connectingNodeId);
                                            return (r?.y || 0) + 70;
                                        })()}
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
                                    className="absolute text-slate-400 hover:text-slate-600 transition-colors cursor-move"
                                    style={{ left: deco.x, top: deco.y, transform: `scale(${deco.scale})`, zIndex: 5 }}
                                    onMouseDown={(e) => handleEntityMouseDown(e, 'decoration', deco.id, deco)}
                                    onContextMenu={(e) => handleContextMenuCanvas(e, 'decoration', deco.id)}
                                >
                                    {getDecorationIcon(deco.type)}
                                    {deco.label && <div className="absolute top-full left-1/2 -translate-x-1/2 text-[10px] font-bold mt-1 bg-white px-1 rounded shadow-sm whitespace-nowrap">{deco.label}</div>}
                                </div>
                            ))}

                            {/* LAYER 3: ROLES (Cards) - Highest Z-Index */}
                            {roles.map(role => {
                                const style = CARD_COLORS.find(c => c.id === (role.color || 'slate')) || CARD_COLORS[0];
                                const connectorStyle = "absolute w-4 h-4 bg-white border border-slate-300 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-crosshair hover:bg-blue-50 hover:border-blue-500 z-50 shadow-sm";

                                return (
                                    <div
                                        key={role.id}
                                        className={`absolute w-64 bg-white rounded-lg shadow-sm border group hover:shadow-xl transition-shadow ${style.border} ${connectingNodeId === role.id ? 'ring-2 ring-[#fbbf24]' : ''}`}
                                        style={{ left: role.x, top: role.y, zIndex: 10 }}
                                        onMouseDown={(e) => handleEntityMouseDown(e, 'role', role.id, role)}
                                        onMouseUp={(e) => onConnectorMouseUp(e, role.id)}
                                        onContextMenu={(e) => handleContextMenuCanvas(e, 'node', role.id)}
                                    >
                                        {/* Connectors (N/S/E/W) */}
                                        <div className={`${connectorStyle} -top-2 left-1/2 -translate-x-1/2`} onMouseDown={(e) => { e.stopPropagation(); setConnectingNodeId(role.id); }} />
                                        <div className={`${connectorStyle} -bottom-2 left-1/2 -translate-x-1/2`} onMouseDown={(e) => { e.stopPropagation(); setConnectingNodeId(role.id); }} />
                                        <div className={`${connectorStyle} top-1/2 -left-2 -translate-y-1/2`} onMouseDown={(e) => { e.stopPropagation(); setConnectingNodeId(role.id); }} />
                                        <div className={`${connectorStyle} top-1/2 -right-2 -translate-y-1/2`} onMouseDown={(e) => { e.stopPropagation(); setConnectingNodeId(role.id); }} />

                                        {/* Header */}
                                        <div className={`px-3 py-2 rounded-t-lg border-b flex justify-between items-center ${style.header} ${style.border}`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`p-0.5 rounded ${style.text} bg-white/20`}>
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
                                                className="w-full font-bold text-slate-800 text-sm bg-transparent border-none p-0 focus:ring-0 mb-2 placeholder-slate-400"
                                                placeholder="Nome do Cargo"
                                            />
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-slate-50 rounded border border-slate-100 px-2 py-1">
                                                    <label className="text-[8px] font-bold text-slate-400 uppercase block">Salário Base</label>
                                                    <div className="flex items-center">
                                                        <span className="text-xs text-slate-400 mr-1">R$</span>
                                                        <input
                                                            value={role.baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            onChange={(e) => handleSalaryChange(role.id, e.target.value)}
                                                            className="w-full bg-transparent text-xs font-bold text-slate-700 border-none p-0 focus:ring-0"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="w-16 bg-slate-50 rounded border border-slate-100 px-2 py-1 text-center">
                                                    <label className="text-[8px] font-bold text-slate-400 uppercase block">Qtd</label>
                                                    <input
                                                        type="number"
                                                        value={role.quantity}
                                                        onChange={(e) => updateRole(role.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                        className="w-full bg-transparent text-xs font-bold text-slate-700 border-none p-0 focus:ring-0 text-center"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-slate-100 text-right">
                                                <span className="text-[10px] font-bold text-slate-400">Total: </span>
                                                <span className="text-xs font-black text-slate-800">{formatCurrency(calculateRoleCost(role))}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* FLOATING TOOLBAR - MIRO STYLE */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-2xl rounded-full px-4 py-2 border border-slate-200 flex items-center gap-2 z-50">
                        <button
                            title="Cursor (Mover)"
                            className="p-3 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                        >
                            <MousePointer size={20} />
                        </button>
                        <div className="w-px h-6 bg-slate-300 mx-1"></div>
                        <button
                            onClick={() => addRole('Operational')}
                            title="Adicionar Cargo Operacional"
                            className="p-3 rounded-full hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            <Briefcase size={20} />
                        </button>
                        <button
                            onClick={() => addRole('Administrative')}
                            title="Adicionar Cargo Administrativo"
                            className="p-3 rounded-full hover:bg-purple-50 text-purple-600 hover:text-purple-700 transition-colors"
                        >
                            <CheckSquare size={20} />
                        </button>
                        <div className="w-px h-6 bg-slate-300 mx-1"></div>
                        <button
                            onClick={() => addSection()}
                            title="Criar Área (Lane)"
                            className="p-3 rounded-full hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors relative group"
                        >
                            <Square size={20} className="fill-current opacity-50" />
                            <Plus size={10} className="absolute top-2 right-2 text-amber-800 font-bold" />
                        </button>

                        {/* Decorative Icons */}
                        <button onClick={() => addDecoration('factory')} title="Fábrica" className="p-3 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700"><Factory size={20} /></button>
                        <button onClick={() => addDecoration('flame')} title="Inflamável" className="p-3 rounded-full hover:bg-orange-50 text-orange-500 hover:text-orange-600"><Flame size={20} /></button>
                        <button onClick={() => addDecoration('zap')} title="Elétrico" className="p-3 rounded-full hover:bg-yellow-50 text-yellow-500 hover:text-yellow-600"><Zap size={20} /></button>
                        <button onClick={() => addDecoration('biohazard')} title="Risco Químico/Bio" className="p-3 rounded-full hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700"><Biohazard size={20} /></button>
                    </div>

                    {/* CONTEXT MENU */}
                    {contextMenu && (
                        <div
                            className="fixed z-[100] bg-white rounded-lg shadow-xl border border-slate-200 py-1 w-56 text-sm animate-in fade-in zoom-in-95 duration-100"
                            style={{ top: contextMenu.y, left: contextMenu.x }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {contextMenu.type === 'node' && (
                                <>
                                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100 mb-1">
                                        Ações do Card
                                    </div>
                                    <button onClick={() => updateRole(contextMenu.targetId!, 'parentId', undefined)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2">
                                        <LinkIcon size={14} /> Desconectar Parente
                                    </button>
                                    <button onClick={() => duplicateRole(contextMenu.targetId!)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2">
                                        <Type size={14} /> Duplicar / Dividir
                                    </button>

                                    <div className="px-4 py-2 hover:bg-slate-50 flex items-center gap-2 relative group/colors cursor-pointer">
                                        <Palette size={14} className="text-slate-400" />
                                        <span>Cor do Card</span>
                                        <div className="absolute left-full top-0 ml-2 bg-white border border-slate-200 shadow-xl rounded-lg p-3 grid grid-cols-4 gap-2 hidden group-hover/colors:grid w-40">
                                            {CARD_COLORS.map(c => (
                                                <button
                                                    key={c.id}
                                                    className={`w-6 h-6 rounded-full ${c.bg} border ${c.border} hover:scale-110 transition-transform`}
                                                    onClick={() => { updateRole(contextMenu.targetId!, 'color', c.id); setContextMenu(null); }}
                                                ></button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-100 my-1"></div>
                                    <button onClick={() => { removeEntity('role', contextMenu.targetId!); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2">
                                        <Trash2 size={14} /> Excluir
                                    </button>
                                </>
                            )}

                            {contextMenu.type === 'section' && (
                                <>
                                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100 mb-1">
                                        Área / Lane
                                    </div>
                                    <div className="px-4 py-2 flex gap-2">
                                        {SECTION_COLORS.map(c => (
                                            <button key={c.id} className={`w-6 h-6 rounded-full border ${c.bg} ${c.border}`} onClick={() => { updateSection(contextMenu.targetId!, 'color', c.id); setContextMenu(null); }} />
                                        ))}
                                    </div>
                                    <button onClick={() => { removeEntity('section', contextMenu.targetId!); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2">
                                        <Trash2 size={14} /> Remover Área
                                    </button>
                                </>
                            )}

                            {contextMenu.type === 'decoration' && (
                                <button onClick={() => { removeEntity('decoration', contextMenu.targetId!); setContextMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2">
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
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Efetivo Total</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <p className="text-3xl font-black text-slate-800 tracking-tight">{totalHeadcount}</p>
                                    <span className="text-xs font-medium text-slate-400">pessoas</span>
                                </div>
                            </div>
                            <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                                <Users size={24} />
                            </div>
                        </div>

                        {/* Salário Médio Base */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Salário Médio Base</p>
                                <p className="text-3xl font-black text-emerald-600 mt-1 tracking-tight">{formatCurrency(averageSalary)}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Não inclui adicionais e encargos</p>
                            </div>
                            <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                                <DollarSign size={24} />
                            </div>
                        </div>

                        {/* Custo Total em Folha */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custo Total da Folha</p>
                                <p className="text-3xl font-black text-amber-600 mt-1 tracking-tight">{formatCurrency(totalCost)}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium flex items-center gap-1">
                                    Inclui adicionais e <span className="font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded">{data.taxConfig.socialChargesRate * 100}%</span> de encargos
                                </p>
                            </div>
                            <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
                                <Briefcase size={24} />
                            </div>
                        </div>
                    </div>

                    {/* BENEFITS CONFIGURATION SECTION */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 shrink-0">
                        <div className="flex items-center gap-2 mb-4">
                            <Box className="text-purple-600" size={20} />
                            <h3 className="text-lg font-bold text-slate-800">Configuração Global de Benefícios</h3>
                            <span className="text-xs font-medium text-slate-500 ml-2">Aplicado proporcionalmente ao efetivo total</span>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            {/* Assistência Médica */}
                            <div className="col-span-1 lg:col-span-1 border border-rose-200 bg-rose-50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                <label className="text-xs font-bold text-rose-700 block mb-3 flex items-center gap-1">
                                    <HeartPulse size={16} /> Assistência Médica
                                </label>
                                <div className="flex items-center gap-1 bg-white p-2.5 rounded-md border border-rose-100 focus-within:ring-2 focus-within:ring-rose-200 focus-within:border-rose-300 transition-all">
                                    <span className="text-rose-400 text-xs font-bold">R$</span>
                                    <input
                                        type="number"
                                        value={benefits.healthInsurance}
                                        onChange={(e) => updateBenefits('healthInsurance', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-transparent font-extrabold text-slate-700 text-sm border-none p-0 focus:ring-0"
                                        placeholder="0,00"
                                    />
                                    <span className="text-rose-300 text-[10px] font-bold">/mês</span>
                                </div>
                            </div>

                            {/* Dependentes */}
                            <div className="col-span-1 lg:col-span-1 border border-indigo-200 bg-indigo-50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                <label className="text-xs font-bold text-indigo-700 block mb-3 flex items-center gap-1">
                                    <Users size={16} /> Fator Dependentes
                                </label>
                                <div className="bg-white p-2.5 rounded-md border border-indigo-100 flex items-center focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-indigo-300 transition-all">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={benefits.healthInsuranceDependentFactor}
                                        onChange={(e) => updateBenefits('healthInsuranceDependentFactor', parseFloat(e.target.value) || 1)}
                                        className="w-full bg-transparent font-extrabold text-slate-700 text-sm border-none p-0 focus:ring-0 text-center"
                                        title="Ex: 1.5 significa Titular + 0.5 dependentes em média"
                                    />
                                </div>
                            </div>

                            {/* Alimentação (VA) */}
                            <div className="col-span-1 lg:col-span-1 border border-orange-200 bg-orange-50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                <label className="text-xs font-bold text-orange-700 block mb-3 flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                    <ShoppingBag size={16} className="shrink-0" /> Vale Alimentação (VA)
                                </label>
                                <div className="flex items-center gap-1 bg-white p-2.5 rounded-md border border-orange-100 focus-within:ring-2 focus-within:ring-orange-200 focus-within:border-orange-300 transition-all">
                                    <span className="text-orange-400 text-xs font-bold">R$</span>
                                    <input
                                        type="number"
                                        value={benefits.foodAllowance}
                                        onChange={(e) => updateBenefits('foodAllowance', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-transparent font-extrabold text-slate-700 text-sm border-none p-0 focus:ring-0"
                                        placeholder="0,00"
                                    />
                                    <span className="text-orange-300 text-[10px] font-bold">/mês</span>
                                </div>
                            </div>

                            {/* Refeição (VR) vs Refeitório */}
                            <div className="col-span-2 lg:col-span-1 flex flex-col gap-2">
                                <div className={`border rounded-lg p-4 flex-1 shadow-sm transition-all ${benefits.hasCafeteria ? 'border-slate-200 bg-slate-100/50' : 'border-amber-200 bg-amber-50 hover:shadow-md'}`}>
                                    <label className={`text-xs font-bold block mb-3 flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis ${benefits.hasCafeteria ? 'text-slate-400' : 'text-amber-700'}`}>
                                        <Utensils size={16} className="shrink-0" /> Vale Refeição (VR)
                                    </label>
                                    <div className={`flex items-center gap-1 p-2.5 rounded-md border transition-all ${benefits.hasCafeteria ? 'bg-white/50 border-slate-200' : 'bg-white border-amber-100 focus-within:ring-2 focus-within:ring-amber-200 focus-within:border-amber-300'}`}>
                                        <span className={`text-xs font-bold ${benefits.hasCafeteria ? 'text-slate-300' : 'text-amber-400'}`}>R$</span>
                                        <input
                                            type="number"
                                            value={benefits.mealAllowance}
                                            onChange={(e) => updateBenefits('mealAllowance', parseFloat(e.target.value) || 0)}
                                            disabled={benefits.hasCafeteria}
                                            className={`w-full bg-transparent font-extrabold text-sm border-none p-0 focus:ring-0 ${benefits.hasCafeteria ? 'text-slate-400' : 'text-slate-700'}`}
                                            placeholder="0,00"
                                        />
                                        <span className={`text-[10px] font-bold ${benefits.hasCafeteria ? 'text-slate-300' : 'text-amber-300'}`}>/mês</span>
                                    </div>
                                </div>
                                <label className={`flex items-center justify-center gap-2 cursor-pointer border px-3 py-2 rounded-lg transition-colors shadow-sm ${benefits.hasCafeteria ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                    <input
                                        type="checkbox"
                                        checked={benefits.hasCafeteria}
                                        onChange={(e) => updateBenefits('hasCafeteria', e.target.checked)}
                                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                                    />
                                    <span className="text-xs font-bold">Possui Refeitório?</span>
                                </label>
                            </div>

                            {/* Transporte (VT) */}
                            <div className="col-span-1 lg:col-span-1 border border-cyan-200 bg-cyan-50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                <label className="text-xs font-bold text-cyan-700 block mb-3 flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis">
                                    <Bus size={16} className="shrink-0" /> Vale Transporte (VT)
                                </label>
                                <div className="flex items-center gap-1 bg-white p-2.5 rounded-md border border-cyan-100 focus-within:ring-2 focus-within:ring-cyan-200 focus-within:border-cyan-300 transition-all">
                                    <span className="text-cyan-400 text-xs font-bold">R$</span>
                                    <input
                                        type="number"
                                        value={benefits.transportAllowance}
                                        onChange={(e) => updateBenefits('transportAllowance', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-transparent font-extrabold text-slate-700 text-sm border-none p-0 focus:ring-0"
                                        placeholder="0,00"
                                    />
                                    <span className="text-cyan-300 text-[10px] font-bold">/mês</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {viewMode === 'list' && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs tracking-wider border-b border-slate-200">
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
                                <tbody className="divide-y divide-slate-100">
                                    {roles.map(role => (
                                        <tr key={role.id} className="hover:bg-slate-50 group">
                                            <td className="px-6 py-4">
                                                <input type="text" value={role.title} onChange={(e) => updateRole(role.id, 'title', e.target.value)} className="bg-transparent border-none font-bold text-slate-700 p-0 focus:ring-0 w-full" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${role.category === 'Operational' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                    {role.category === 'Operational' ? 'Operacional' : 'Admin'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <input type="number" value={role.quantity} onChange={(e) => updateRole(role.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded text-center font-bold text-slate-700 py-1" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-slate-400 text-xs">R$</span>
                                                    <input
                                                        value={role.baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        onChange={(e) => handleSalaryChange(role.id, e.target.value)}
                                                        className="w-full bg-transparent border-none font-bold text-slate-700 p-0 focus:ring-0"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button onClick={() => updateRole(role.id, 'additionalHazard', !role.additionalHazard)} className={`p-1 rounded border text-[10px] font-bold uppercase flex items-center gap-1 ${role.additionalHazard ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                                                        <Biohazard size={10} /> INS (20%)
                                                    </button>
                                                    <button onClick={() => updateRole(role.id, 'additionalDanger', !role.additionalDanger)} className={`p-1 rounded border text-[10px] font-bold uppercase flex items-center gap-1 ${role.additionalDanger ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                                                        <Zap size={10} /> PER (30%)
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-700">{formatCurrency(calculateRoleCost(role))}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => removeEntity('role', role.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-4">
                                <button onClick={() => addRole('Operational')} className="text-xs font-bold bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded-lg hover:bg-blue-50 flex items-center gap-2"><Plus size={14} /> Adicionar Operacional</button>
                                <button onClick={() => addRole('Administrative')} className="text-xs font-bold bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded-lg hover:bg-purple-50 flex items-center gap-2"><Plus size={14} /> Adicionar Administrativo</button>
                            </div>
                        </div>
                    )}

                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {roles.map(role => (
                                <div key={role.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative group hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2 rounded-lg ${role.category === 'Operational' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {role.category === 'Operational' ? <Briefcase size={20} /> : <CheckSquare size={20} />}
                                        </div>
                                        <button onClick={() => removeEntity('role', role.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <input type="text" value={role.title} onChange={(e) => updateRole(role.id, 'title', e.target.value)} className="w-full text-lg font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0 mb-1" />
                                    <p className="text-xs text-slate-400 uppercase font-bold mb-4">{role.category === 'Operational' ? 'Operacional' : 'Administrativo'}</p>

                                    <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-500">Salário Base</label>
                                            <div className="flex items-center gap-1 w-28">
                                                <span className="text-xs text-slate-400">R$</span>
                                                <input
                                                    value={role.baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    onChange={(e) => handleSalaryChange(role.id, e.target.value)}
                                                    className="w-full bg-transparent text-right font-bold text-slate-700 text-sm border-none p-0 focus:ring-0"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-500">Quantidade</label>
                                            <input type="number" value={role.quantity} onChange={(e) => updateRole(role.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-16 bg-white border border-slate-200 text-center font-bold text-slate-700 text-sm rounded py-0.5 focus:ring-0" />
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-2">
                                        <button onClick={() => updateRole(role.id, 'additionalHazard', !role.additionalHazard)} className={`flex-1 py-2 rounded text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${role.additionalHazard ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-slate-200 text-slate-400'}`}>
                                            <Biohazard size={14} /> Insalubridade
                                        </button>
                                        <button onClick={() => updateRole(role.id, 'additionalDanger', !role.additionalDanger)} className={`flex-1 py-2 rounded text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${role.additionalDanger ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-400'}`}>
                                            <Zap size={14} /> Periculosidade
                                        </button>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Custo Total</span>
                                        <span className="text-lg font-black text-slate-800">{formatCurrency(calculateRoleCost(role))}</span>
                                    </div>
                                </div>
                            ))}

                            <button onClick={() => addRole('Operational')} className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all min-h-[300px]">
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
