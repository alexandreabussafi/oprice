import React, { useState, useMemo, useEffect } from 'react';
import { ProposalData, CatalogProduct, ProductLineItem } from '../types';
import { Settings, Plus, Search, Trash2, Edit2, Check, X, Package, DollarSign, Calculator, AlertTriangle, Target, FileText, TrendingUp, Globe, CreditCard, Truck } from 'lucide-react';

interface ProductEditorProps {
    data: ProposalData;
    updateData: (newData: Partial<ProposalData>) => void;
    globalConfig?: ProposalData;
}

const ProductEditor: React.FC<ProductEditorProps> = ({ data, updateData, globalConfig }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingLineId, setEditingLineId] = useState<string | null>(null);
    const [tempMargin, setTempMargin] = useState<number>(0);

    const productLines = data.productLines || [];
    const catalog = globalConfig?.productCatalog || [];

    // Filter Catalog
    const filteredCatalog = catalog.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate taxes (using normative logic for simplicity on products - Gross Up)
    const calculateGrossUpMultiplier = () => {
        // Simplify: sum of active sales taxes
        const salesTaxes = data.taxConfig.salesTaxes.filter(t => t.active).reduce((sum, t) => sum + t.rate, 0);
        // Simple gross up multiplier = 1 / (1 - salesTaxes)
        const divisor = 1 - salesTaxes;
        return divisor > 0 ? 1 / divisor : 1; // Fallback
    };

    const grossUpMultiplier = calculateGrossUpMultiplier();

    // Determine default ICMS based on selected destination state
    const getIcmsForState = (stateLabel?: string) => {
        if (!stateLabel) return 0.18; // Default fallback to SP rate (usually 18%)

        const rates = data.taxConfig?.icmsStateRates || {
            SP: 0.18, RJ: 0.12, MG: 0.12, PR: 0.12, SC: 0.12, RS: 0.12, OUTROS: 0.07
        };

        // Exact match
        if (rates[stateLabel] !== undefined) return rates[stateLabel];

        // Match specific rules if not mapped exactly
        if (['RJ', 'MG', 'PR', 'SC', 'RS'].includes(stateLabel)) {
            return rates[stateLabel] ?? rates['OUTROS'] ?? 0.12;
        }

        // Return 'OUTROS' for the rest
        return rates['OUTROS'] ?? 0.07;
    };

    // Auto-update all lines when destinationState changes
    useEffect(() => {
        if (!data.destinationState) return;

        const newIcmsRate = getIcmsForState(data.destinationState);
        let hasChanges = false;

        const updatedLines = productLines.map(line => {
            if (line.icmsPercent !== newIcmsRate) {
                hasChanges = true;
                const margin = line.overrideMargin || 0;
                const ipi = line.ipiPercent || 0;

                // Recalculate Base Price
                const salePrice = (line.unitCost / (1 - margin)) / (1 - newIcmsRate);
                const finalPriceWithIpi = salePrice * (1 + ipi);

                return {
                    ...line,
                    icmsPercent: newIcmsRate,
                    finalPrice: finalPriceWithIpi,
                    total: line.quantity * finalPriceWithIpi
                };
            }
            return line;
        });

        if (hasChanges) {
            updateData({ productLines: updatedLines });
        }
    }, [data.destinationState, data.taxConfig.icmsStateRates]);

    // Add Item to lines
    const handleAddItem = (product: CatalogProduct) => {
        const defaultIcms = getIcmsForState(data.destinationState);

        const newLine: ProductLineItem = {
            id: Math.random().toString(36).substr(2, 9),
            productId: product.id,
            name: product.name,
            sku: product.sku,
            imageUrl: product.imageUrl,
            quantity: 1,
            unitCost: product.costPrice,
            overrideMargin: product.standardMargin,
            ipiPercent: 0, // Default
            icmsPercent: defaultIcms,
            finalPrice: 0, // Will be calculated
            total: 0 // Will be recalculated
        };

        // Recalculate price with defaults
        const currentIcms = newLine.icmsPercent || 0;
        const currentIpi = newLine.ipiPercent || 0;
        const margin = newLine.overrideMargin || 0;

        // Base Price (Gross Up for ICMS)
        const salePrice = (newLine.unitCost / (1 - margin)) / (1 - currentIcms);
        newLine.finalPrice = salePrice * (1 + currentIpi);
        newLine.total = newLine.quantity * newLine.finalPrice;
        newLine.unit = product.unit || 'UN'; // NOVO: Fallback para UN

        updateData({
            productLines: [...productLines, newLine]
        });
    };

    // Remove Item
    const handleRemoveItem = (lineId: string) => {
        updateData({
            productLines: productLines.filter(l => l.id !== lineId)
        });
    };

    // Update Item Quantity
    const handleUpdateQuantity = (lineId: string, quantity: number) => {
        const updated = productLines.map(l => {
            if (l.id === lineId) {
                const q = Math.max(1, quantity);
                return { ...l, quantity: q, total: q * l.finalPrice };
            }
            return l;
        });
        updateData({ productLines: updated });
    };

    // Start Edit Margin
    const startEditingMargin = (line: ProductLineItem) => {
        setEditingLineId(line.id);
        setTempMargin(line.overrideMargin !== undefined ? line.overrideMargin * 100 : 0);
    };

    // Save Margin
    const saveMargin = (lineId: string) => {
        const updated = productLines.map(l => {
            if (l.id === lineId) {
                const marginDecimal = tempMargin / 100;
                const icms = l.icmsPercent || 0;
                const ipi = l.ipiPercent || 0;

                const salePrice = (l.unitCost / (1 - marginDecimal)) / (1 - icms);
                const finalPriceWithIpi = salePrice * (1 + ipi);

                return {
                    ...l,
                    overrideMargin: marginDecimal,
                    finalPrice: finalPriceWithIpi,
                    total: l.quantity * finalPriceWithIpi
                };
            }
            return l;
        });
        updateData({ productLines: updated });
        setEditingLineId(null);
    };

    // Update Tax per line
    const handleUpdateTax = (lineId: string, field: 'ipiPercent' | 'icmsPercent', value: number) => {
        const updated = productLines.map(l => {
            if (l.id === lineId) {
                const margin = l.overrideMargin || 0;
                const newIcms = field === 'icmsPercent' ? value / 100 : (l.icmsPercent || 0);
                const newIpi = field === 'ipiPercent' ? value / 100 : (l.ipiPercent || 0);

                const salePrice = (l.unitCost / (1 - margin)) / (1 - newIcms);
                const finalPriceWithIpi = salePrice * (1 + newIpi);

                return {
                    ...l,
                    [field]: value / 100,
                    finalPrice: finalPriceWithIpi,
                    total: l.quantity * finalPriceWithIpi
                };
            }
            return l;
        });
        updateData({ productLines: updated });
    };

    // Calculate Totals
    const { totalCost, totalValue, totalMargin, totalTaxes, subtotalWithIpi } = useMemo(() => {
        let cost = 0;
        let valWithIpi = 0;
        let taxes = 0;

        productLines.forEach(l => {
            const lineQty = l.quantity || 1;
            cost += l.unitCost * lineQty;
            valWithIpi += l.total;

            // Tax breakdown per line
            const icmsVal = (l.finalPrice / (1 + (l.ipiPercent || 0))) * (l.icmsPercent || 0);
            const ipiVal = (l.finalPrice / (1 + (l.ipiPercent || 0))) * (l.ipiPercent || 0);
            taxes += (icmsVal + ipiVal) * lineQty;
        });

        const freight = data.freightValue || 0;
        const discount = data.discountValue || 0;
        const finalValue = valWithIpi + freight - discount;
        const margin = (valWithIpi - taxes) - cost;

        return {
            totalCost: cost,
            totalValue: finalValue,
            totalMargin: margin,
            totalTaxes: taxes,
            subtotalWithIpi: valWithIpi
        };
    }, [productLines, data.freightValue, data.discountValue]);

    // Sync total value up to ProposalData whenever it changes to ensure Pipeline KPIs represent the Cotação de Produtos
    // Avoid infinite loops by only updating if values differ more than 1 cent
    useEffect(() => {
        if (Math.abs(data.value - totalValue) > 0.01) {
            updateData({ value: totalValue });
        }
    }, [totalValue, data.value]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-32 print:p-0 print:m-0 print:space-y-0 print:max-w-none print:bg-white">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { margin: 0 !important; size: A4 portrait; }
                    body, html { margin: 0 !important; padding: 0 !important; }
                }
            ` }} />

            {/* TELA INTERATIVA (Oculta na impressão) */}
            <div className="space-y-8 print:hidden">

                <header className="mb-6 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black rounded uppercase tracking-widest border border-emerald-200 dark:border-emerald-800">Produtos / Cotação</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            <Package className="text-emerald-600" />
                            Sales Order / Ordem de Venda
                        </h1>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Budget Total (Gross)</p>
                        <p className="text-3xl font-black text-emerald-600">{formatCurrency(totalValue)}</p>
                    </div>
                </header>

                {/* HEADER FIELDS - ORDEM DE VENDA */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800/50">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                            <FileText className="text-emerald-600" size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 dark:text-slate-100">Dados da Ordem de Venda</h2>
                            <p className="text-xs text-slate-500">Identificação e prazos comerciais da negociação.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Target size={12} /> Nº Ordem de Venda
                            </label>
                            <input
                                type="text"
                                value={data.salesOrderNumber || ''}
                                onChange={(e) => updateData({ salesOrderNumber: e.target.value })}
                                placeholder="Ex: OV-2024-001"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText size={12} /> Pedido de Compra (PO)
                            </label>
                            <input
                                type="text"
                                value={data.clientPO || ''}
                                onChange={(e) => updateData({ clientPO: e.target.value })}
                                placeholder="Nº Pedido do Cliente"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Plus size={12} /> Prazo de Entrega
                            </label>
                            <input
                                type="text"
                                value={data.deliveryDeadline || ''}
                                onChange={(e) => updateData({ deliveryDeadline: e.target.value })}
                                placeholder="Ex: 15 dias úteis"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <TrendingUp size={12} /> Validade da Proposta
                            </label>
                            <input
                                type="text"
                                value={data.validity || ''}
                                onChange={(e) => updateData({ validity: e.target.value })}
                                placeholder="Ex: 30 dias"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    {/* NOVOS CAMPOS COMERCIAIS */}
                    {/* NOVOS CAMPOS COMERCIAIS */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Truck size={12} /> Local de Entrega (Full Address)
                            </label>
                            <input
                                type="text"
                                value={data.deliveryAddress || ''}
                                onChange={(e) => updateData({ deliveryAddress: e.target.value })}
                                placeholder="Logradouro, Número, Bairro, Cidade..."
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Truck size={12} /> Enviar para (Pessoa/Identificação)
                            </label>
                            <input
                                type="text"
                                value={data.shippingAddress || ''}
                                onChange={(e) => updateData({ shippingAddress: e.target.value })}
                                placeholder="Ex: João Silva / Depto Recebimento"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText size={12} /> Faturar para (CNPJ/Razão)
                            </label>
                            <input
                                type="text"
                                value={data.billingAddress || ''}
                                onChange={(e) => updateData({ billingAddress: e.target.value })}
                                placeholder="Ex: 00.000.000/0001-00"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText size={12} /> Inscrição Estadual (IE)
                            </label>
                            <input
                                type="text"
                                value={data.stateRegistration || ''}
                                onChange={(e) => updateData({ stateRegistration: e.target.value })}
                                placeholder="Isento ou Nº"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                            />
                        </div>

                        <div className="space-y-1.5 mt-2 md:mt-0">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Target size={12} /> UF Destino (ICMS)
                            </label>
                            <div className="relative">
                                <select
                                    value={data.destinationState || ''}
                                    onChange={(e) => updateData({ destinationState: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-bold text-emerald-800 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>Selecione UF...</option>
                                    <option value="AC">AC</option>
                                    <option value="AL">AL</option>
                                    <option value="AP">AP</option>
                                    <option value="AM">AM</option>
                                    <option value="BA">BA</option>
                                    <option value="CE">CE</option>
                                    <option value="DF">DF</option>
                                    <option value="ES">ES</option>
                                    <option value="GO">GO</option>
                                    <option value="MA">MA</option>
                                    <option value="MT">MT</option>
                                    <option value="MS">MS</option>
                                    <option value="MG">MG</option>
                                    <option value="PA">PA</option>
                                    <option value="PB">PB</option>
                                    <option value="PR">PR</option>
                                    <option value="PE">PE</option>
                                    <option value="PI">PI</option>
                                    <option value="RJ">RJ</option>
                                    <option value="RN">RN</option>
                                    <option value="RS">RS</option>
                                    <option value="RO">RO</option>
                                    <option value="RR">RR</option>
                                    <option value="SC">SC</option>
                                    <option value="SP">SP</option>
                                    <option value="SE">SE</option>
                                    <option value="TO">TO</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">▼</div>
                            </div>
                        </div>

                        <div className="space-y-1.5 mt-2 md:mt-0">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <CreditCard size={12} /> Prazo de Pgto (Dias)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={data.paymentTermDays || 30}
                                    onChange={(e) => updateData({ paymentTermDays: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner pr-12"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">DIAS</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <TrendingUp size={12} /> Vendedor / Responsável
                            </label>
                            <input
                                type="text"
                                value={data.salesperson || data.responsible || ''}
                                onChange={(e) => updateData({ salesperson: e.target.value })}
                                placeholder="Nome do Vendedor"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Truck size={12} /> Frete (Incoterm)
                            </label>
                            <div className="relative">
                                <select
                                    value={data.deliveryIncoterm || 'FOB'}
                                    onChange={(e) => updateData({ deliveryIncoterm: e.target.value as 'CIF' | 'FOB' })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner appearance-none cursor-pointer"
                                >
                                    <option value="CIF">CIF (Incluso)</option>
                                    <option value="FOB">FOB (A Combinar)</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <DollarSign size={12} /> Valor do Frete
                            </label>
                            <input
                                type="number"
                                value={data.freightValue || 0}
                                onChange={(e) => updateData({ freightValue: parseFloat(e.target.value) || 0 })}
                                placeholder="R$ 0,00"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-inner"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Calculator size={12} /> Desconto Comercial
                            </label>
                            <input
                                type="number"
                                value={data.discountValue || 0}
                                onChange={(e) => updateData({ discountValue: parseFloat(e.target.value) || 0 })}
                                placeholder="R$ 0,00"
                                className="w-full px-4 py-2.5 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl text-sm font-bold text-rose-700 dark:text-rose-400 focus:ring-2 focus:ring-rose-500 outline-none transition-all shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                {/* TOTAIS INDICATORS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Custo Direto (Materiais)</p>
                        <p className="text-xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(totalCost)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Impostos (Add-on/Incidência)</p>
                        <p className="text-xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(totalTaxes)}</p>
                    </div>
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-5 shadow-sm">
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Margem de Lucro</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(totalMargin)}</p>
                            <span className="text-xs font-bold text-emerald-500">{(totalValue > 0 ? (totalMargin / totalValue) * 100 : 0).toFixed(1)}%</span>
                        </div>
                    </div>
                    <div className="bg-[#0f172a] dark:bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl shadow-slate-900/10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total da Ordem (Faturamento)</p>
                        <p className="text-xl font-black text-emerald-400">{formatCurrency(totalValue)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

                    {/* LADO ESQUERDO: Catálogo */}
                    <div className="xl:col-span-4 space-y-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[700px]">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                                <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                                    <Search size={18} className="text-slate-400" /> Catálogo de Produtos
                                </h2>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar produtos, peças..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2">
                                {filteredCatalog.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">Nenhum produto encontrado.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredCatalog.map(product => (
                                            <div key={product.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    {product.imageUrl && (
                                                        <div className="w-12 h-12 rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden bg-white shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{product.name}</p>
                                                        <p className="text-xs text-slate-500 line-clamp-1">{product.description}</p>
                                                        <div className="flex gap-2 mt-1">
                                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{product.category}</span>
                                                            <span className="text-[10px] font-bold text-emerald-600">Custo: {formatCurrency(product.costPrice)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAddItem(product)}
                                                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Adicionar à Proposta"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* LADO DIREITO: Itens Selecionados (Carrinho) */}
                    <div className="xl:col-span-8">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm min-h-[700px] flex flex-col">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                                <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wide text-xs">
                                    <Target size={18} className="text-emerald-500" /> Sales Lines (Itens do Pedido)
                                </h2>
                                <span className="text-[10px] font-black text-slate-500 bg-slate-200/50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                                    {productLines.length} SKU(S) • TOTAL QTD: {productLines.reduce((acc, l) => acc + l.quantity, 0)}
                                </span>
                            </div>

                            {productLines.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
                                    <Package size={48} className="text-slate-200 dark:text-slate-800 mb-4" />
                                    <p className="font-medium text-slate-500 dark:text-slate-400">Nenhum produto adicionado</p>
                                    <p className="text-sm mt-1">Selecione itens do catálogo ao lado para montar a cotação.</p>
                                </div>
                            ) : (
                                <div className="p-0 overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                                                <th className="p-4">Produto</th>
                                                <th className="p-4 text-center">Qtd</th>
                                                <th className="p-4 text-center">Margem</th>
                                                <th className="p-4 text-center">ICMS/IPI</th>
                                                <th className="p-4 text-right">Preço Un.</th>
                                                <th className="p-4 text-right">Total</th>
                                                <th className="p-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                            {productLines.map(line => (
                                                <tr key={line.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded border border-slate-100 dark:border-slate-800 overflow-hidden bg-white shrink-0 flex items-center justify-center p-1">
                                                                {line.imageUrl ? (
                                                                    <img src={line.imageUrl} alt={line.name} className="w-full h-full object-contain" />
                                                                ) : (
                                                                    <Package className="text-slate-200" size={20} />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{line.name}</p>
                                                                <div className="flex gap-2 items-center mt-1">
                                                                    <p className="text-[10px] font-mono text-slate-400">{line.sku || 'SEM SKU'}</p>
                                                                    <input
                                                                        className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 px-1 py-0.5 rounded outline-none border border-transparent focus:border-emerald-500 w-20"
                                                                        value={line.ncm || ''}
                                                                        onChange={(e) => {
                                                                            const updated = productLines.map(l => l.id === line.id ? { ...l, ncm: e.target.value } : l);
                                                                            updateData({ productLines: updated });
                                                                        }}
                                                                        placeholder="NCM"
                                                                        title="NCM do Produto"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center w-32">
                                                        <div className="flex items-center gap-1 justify-center">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={line.quantity}
                                                                onChange={(e) => handleUpdateQuantity(line.id, parseInt(e.target.value) || 1)}
                                                                className="w-14 text-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md py-1 text-sm font-semibold focus:ring-1 focus:ring-indigo-500"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={line.unit || 'UN'}
                                                                onChange={(e) => {
                                                                    const updated = productLines.map(l => l.id === line.id ? { ...l, unit: e.target.value.toUpperCase() } : l);
                                                                    updateData({ productLines: updated });
                                                                }}
                                                                className="w-10 text-center border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-md py-1 text-[10px] font-bold text-slate-500 uppercase focus:ring-1 focus:ring-emerald-500"
                                                                placeholder="UN"
                                                                title="Unidade de Medida"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right text-sm text-slate-500 font-medium whitespace-nowrap">
                                                        {formatCurrency(line.unitCost)}
                                                    </td>
                                                    <td className="p-4 text-center w-32">
                                                        {editingLineId === line.id ? (
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    value={tempMargin}
                                                                    onChange={(e) => setTempMargin(parseFloat(e.target.value) || 0)}
                                                                    className="w-14 border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-800 rounded-l-md px-1 py-1 text-sm font-bold text-indigo-700 dark:text-indigo-300 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                />
                                                                <span className="bg-slate-100 dark:bg-slate-800 py-1 px-2 border-y border-r border-slate-200 dark:border-slate-700 text-slate-500 text-sm rounded-r-md">%</span>
                                                                <button onClick={() => saveMargin(line.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={16} /></button>
                                                                <button onClick={() => setEditingLineId(null)} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><X size={16} /></button>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                onClick={() => startEditingMargin(line)}
                                                                className="group flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 py-1 rounded-md transition-colors"
                                                            >
                                                                <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                                                                    {((line.overrideMargin || 0) * 100).toFixed(1)}%
                                                                </span>
                                                                <p className="text-[10px] text-slate-400 font-medium">Custo: {formatCurrency(line.unitCost)}</p>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center w-40 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center justify-between gap-2 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                <span className="text-[10px] uppercase font-bold text-slate-400">ICMS</span>
                                                                <input
                                                                    type="number"
                                                                    value={(line.icmsPercent || 0) * 100}
                                                                    onChange={(e) => handleUpdateTax(line.id, 'icmsPercent', parseFloat(e.target.value) || 0)}
                                                                    className="w-10 bg-transparent text-right text-xs font-black text-slate-600 dark:text-slate-300 focus:outline-none"
                                                                />
                                                                <span className="text-[10px] text-slate-400">%</span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-2 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                <span className="text-[10px] uppercase font-bold text-slate-400">IPI</span>
                                                                <input
                                                                    type="number"
                                                                    value={(line.ipiPercent || 0) * 100}
                                                                    onChange={(e) => handleUpdateTax(line.id, 'ipiPercent', parseFloat(e.target.value) || 0)}
                                                                    className="w-10 bg-transparent text-right text-xs font-black text-slate-600 dark:text-slate-300 focus:outline-none"
                                                                />
                                                                <span className="text-[10px] text-slate-400">%</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-sm text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                        {formatCurrency(line.finalPrice)}
                                                    </td>
                                                    <td className="p-4 text-right font-black text-sm text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                        {formatCurrency(line.total)}
                                                    </td>
                                                    <td className="p-4 text-right h-full align-middle">
                                                        <button
                                                            onClick={() => handleRemoveItem(line.id)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors inline-flex"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* STICKY FOOTER SUMMARY */}
                <div className="fixed bottom-0 left-64 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-4 z-40 print:hidden">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex gap-8">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Custo Total</p>
                                <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{formatCurrency(totalCost)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Impostos Est.</p>
                                <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{formatCurrency(totalTaxes)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-emerald-600 uppercase">Lucro Líquido (Margem)</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-lg font-black text-emerald-600">{formatCurrency(totalMargin)}</p>
                                    <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                                        {(totalValue > 0 ? (totalMargin / totalValue) * 100 : 0).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Total Ordem de Venda</p>
                                <p className="text-3xl font-black text-emerald-600">{formatCurrency(totalValue)}</p>
                            </div>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-6 py-3 bg-[#0f172a] dark:bg-slate-800 text-white rounded-xl font-bold shadow-xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-all hover:-translate-y-0.5"
                            >
                                <FileText size={18} />
                                Imprimir Proposta
                            </button>
                        </div>
                    </div>
                </div>

            </div> {/* FECHA TELA INTERATIVA */}

            {/* LAYOUT DE IMPRESSÃO (DANFE) */}
            <div className="hidden print:block w-full bg-white text-black font-sans box-border" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <table className="w-full border-collapse">
                    <thead className="table-header-group">
                        <tr>
                            <td style={{ padding: 0, border: 0, lineHeight: 0 }}>
                                {(globalConfig?.letterheadConfig?.productHeaderUrl || data.letterheadConfig?.productHeaderUrl) && (
                                    <img
                                        src={globalConfig?.letterheadConfig?.productHeaderUrl || data.letterheadConfig?.productHeaderUrl || ''}
                                        alt="Header"
                                        style={{ display: 'block', width: '100%', maxHeight: '220px', objectFit: 'contain', margin: 0, padding: 0 }}
                                    />
                                )}
                            </td>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        <tr>
                            <td className="p-0 border-0 align-top px-8 pt-4 pb-8">

                                {/* 1. HEADER AREA */}
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h1 className="text-2xl font-light text-slate-800 uppercase tracking-wider mb-1">Cotação Comercial</h1>
                                        <p className="text-sm font-semibold text-slate-500">Nº {data.salesOrderNumber || `QV-${data.proposalId}`}</p>
                                    </div>
                                    <div className="text-right text-xs text-slate-500 space-y-1">
                                        <p><span className="font-semibold text-slate-400 uppercase">Emissão:</span> {new Date().toLocaleDateString('pt-BR')}</p>
                                        <p><span className="font-semibold text-slate-400 uppercase">Validade:</span> {data.validity || '-'}</p>
                                        <p><span className="font-semibold text-slate-400 uppercase">Vendedor:</span> {data.salesperson || data.responsible || '-'}</p>
                                    </div>
                                </div>

                                {/* 2. CUSTOMER INFORMATION */}
                                <div className="mb-8">
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Dados do Cliente</h2>
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-xs">
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-semibold">Empresa / Razão Social</p>
                                            <p className="font-medium text-slate-800 uppercase">{data.clientName || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-semibold">CNPJ / Inscrição Estadual</p>
                                            <p className="font-medium text-slate-800 uppercase">
                                                {data.billingAddress || '-'} {data.stateRegistration ? `| IE: ${data.stateRegistration}` : ''}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-semibold">Endereço de Entrega</p>
                                            <p className="font-medium text-slate-800 flex-wrap">{data.deliveryAddress || '-'}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-semibold">Estado (UF)</p>
                                                <p className="font-medium text-slate-800 uppercase">{data.destinationState || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 uppercase font-semibold">Aos Cuidados (Contato)</p>
                                                <p className="font-medium text-slate-800 uppercase">{data.shippingAddress || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. ITEMS TABLE */}
                                <div className="mb-8">
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Itens da Cotação</h2>
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 border-y border-slate-200">
                                                <th className="py-2 px-2 font-semibold uppercase text-center w-12 text-[9px]">Item</th>
                                                <th className="py-2 px-2 font-semibold uppercase w-20 text-[9px]">Código</th>
                                                <th className="py-2 px-2 font-semibold uppercase text-[9px]">Descrição</th>
                                                <th className="py-2 px-2 font-semibold uppercase text-center w-16 text-[9px]">NCM</th>
                                                <th className="py-2 px-2 font-semibold uppercase text-center w-10 text-[9px]">Qtd</th>
                                                <th className="py-2 px-2 font-semibold uppercase text-center w-8 text-[9px]">Un.</th>
                                                <th className="py-2 px-2 font-semibold uppercase text-right w-20 text-[9px]">V. Unitário</th>
                                                <th className="py-2 px-2 font-semibold uppercase text-center w-10 text-[9px]">IPI %</th>
                                                <th className="py-2 px-2 font-semibold uppercase text-center w-10 text-[9px]">ICMS %</th>
                                                <th className="py-2 px-2 font-semibold uppercase text-right w-20 text-[9px]">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {productLines.map((line) => (
                                                <tr key={line.id} className="page-break-inside-avoid text-slate-700 hover:bg-slate-50 transition-colors">
                                                    <td className="py-3 px-2 align-middle text-center">
                                                        {line.imageUrl ? (
                                                            <div className="w-10 h-10 mx-auto overflow-hidden bg-white flex items-center justify-center border border-slate-100 rounded">
                                                                <img src={line.imageUrl} alt={line.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 mx-auto bg-slate-50 flex items-center justify-center text-[8px] text-slate-300 border border-slate-100 rounded">S/Img</div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-2 font-mono text-[9px] align-middle">{line.sku || '-'}</td>
                                                    <td className="py-3 px-2 font-medium uppercase align-middle">{line.name}</td>
                                                    <td className="py-3 px-2 text-center align-middle">{line.ncm || '-'}</td>
                                                    <td className="py-3 px-2 text-center font-semibold align-middle">{line.quantity}</td>
                                                    <td className="py-3 px-2 text-center align-middle text-slate-500">{line.unit || 'UN'}</td>
                                                    <td className="py-3 px-2 text-right align-middle whitespace-nowrap">{formatCurrency(line.finalPrice)}</td>
                                                    <td className="py-3 px-2 text-center align-middle text-slate-500">{((line.ipiPercent || 0) * 100).toFixed(0)}%</td>
                                                    <td className="py-3 px-2 text-center align-middle text-slate-500">{((line.icmsPercent || 0) * 100).toFixed(0)}%</td>
                                                    <td className="py-3 px-2 text-right font-semibold align-middle text-slate-800 whitespace-nowrap">{formatCurrency(line.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* 4. FINANCIAL SUMMARY */}
                                <div className="mb-8 flex justify-end page-break-inside-avoid">
                                    <div className="w-80 space-y-2">
                                        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1 mb-2">Resumo Financeiro</h2>
                                        <div className="flex justify-between text-xs text-slate-600">
                                            <span className="uppercase">Subtotal dos Produtos:</span>
                                            <span className="font-semibold">{formatCurrency((productLines?.reduce((acc, l) => acc + (l.finalPrice / (1 + (l.ipiPercent || 0))) * l.quantity, 0) || 0))}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-600">
                                            <span className="uppercase">IPI / Impostos Destacados:</span>
                                            <span className="font-semibold">{formatCurrency(totalTaxes)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-600">
                                            <span className="uppercase">Frete Estimado ({data.deliveryIncoterm || 'FOB'}):</span>
                                            <span className="font-semibold">{formatCurrency(data.freightValue || 0)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-rose-600">
                                            <span className="uppercase">Descontos:</span>
                                            <span className="font-semibold">- {formatCurrency(data.discountValue || 0)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm pt-2 mt-2 border-t border-slate-200">
                                            <span className="font-bold uppercase text-slate-800">Total da Cotação:</span>
                                            <span className="font-bold text-slate-800">{formatCurrency(totalValue)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 5. COMMERCIAL CONDITIONS */}
                                <div className="mb-8 page-break-inside-avoid">
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Condições Comerciais</h2>
                                    <div className="grid grid-cols-2 gap-6 text-xs text-slate-700">
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-slate-400 uppercase">Condição de Pagamento:</span>
                                            <span className="font-medium">{data.paymentTermDays} DD</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-slate-400 uppercase">Faturamento (Pedido/PO):</span>
                                            <span className="font-medium">{data.clientPO || 'Pendente'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-slate-400 uppercase">Frete (Incoterm):</span>
                                            <span className="font-medium">{data.deliveryIncoterm || 'FOB (A Combinar)'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-slate-400 uppercase">Prazo Mínimo de Entrega:</span>
                                            <span className="font-medium">{data.deliveryDeadline || 'A confirmar'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 6. OBSERVATIONS */}
                                <div className="page-break-inside-avoid">
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Observações e Informações Adicionais</h2>
                                    <div className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                                        {data.scope || 'Nenhuma observação comercial adicional foi especificada para esta cotação até o momento destas negociações (Orçamento Padrão). Dúvidas, contate nosso suporte.'}
                                    </div>
                                </div>

                            </td>
                        </tr>
                    </tbody>
                    <tfoot className="table-footer-group bg-transparent">
                        <tr>
                            <td className="p-0 border-0">
                                {/* Invisible spacer block to reserve space for the fixed footer on every page.
                                    This prevents the table content from overlapping the fixed footer. */}
                                <div style={{ height: '140px' }} className="w-full border-0"></div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* FIXED FOOTER (Actual Image) - Prints at the absolute bottom of every page */}
            {(globalConfig?.letterheadConfig?.productFooterUrl || data.letterheadConfig?.productFooterUrl) && (
                <div style={{ display: 'none' }} className="print:block" >
                    <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 50, lineHeight: 0, margin: 0, padding: 0 }}>
                        <img
                            src={globalConfig?.letterheadConfig?.productFooterUrl || data.letterheadConfig?.productFooterUrl || ''}
                            alt="Rodapé"
                            style={{ display: 'block', width: '100%', maxHeight: '160px', objectFit: 'contain', margin: 0, padding: 0 }}
                        />
                    </div>
                </div>
            )}

        </div>
    );
};

export default ProductEditor;
