
import React, { useState, useEffect } from 'react';
import { ProposalData, Attachment } from '../types';
import { calculateFinancials, formatCurrency, formatPercent } from '../utils/pricingEngine';
import { FileText, Target, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Save, UploadCloud, File, X, Paperclip, Hash, Calendar, Clock, DollarSign, PenTool, Globe, Printer } from 'lucide-react';
import ProposalPrint from '../components/ProposalPrint';

interface DocumentsProps {
    data: ProposalData;
    updateData: (newData: Partial<ProposalData>) => void;
    globalConfig?: ProposalData;
}

const Documents: React.FC<DocumentsProps> = ({ data, updateData, globalConfig }) => {
    const financials = calculateFinancials(data);
    const { documents } = data;
    const [isDragging, setIsDragging] = useState(false);

    // Merged data for printing to ensure letterhead fallback
    const printData = {
        ...data,
        letterheadConfig: data.letterheadConfig || globalConfig?.letterheadConfig
    };

    // Local state for Budget Input formatting
    const [budgetDisplay, setBudgetDisplay] = useState('');

    useEffect(() => {
        // Sync local display with prop data on load/change
        if (documents.clientBudget) {
            setBudgetDisplay(documents.clientBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        } else {
            setBudgetDisplay('');
        }
    }, [documents.clientBudget]);

    const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove everything that is not a digit
        let value = e.target.value.replace(/\D/g, '');

        if (!value) {
            setBudgetDisplay('');
            updateDoc('clientBudget', 0);
            return;
        }

        // Convert to number (divide by 100 to handle cents)
        const numberValue = parseInt(value) / 100;

        // Update display formatted
        setBudgetDisplay(numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

        // Update actual data
        updateDoc('clientBudget', numberValue);
    };

    // Helpers for direct updates
    const updateDoc = (field: keyof ProposalData['documents'], value: any) => {
        updateData({
            documents: {
                ...documents,
                [field]: value
            }
        });
    };

    const updateRoot = (field: keyof ProposalData, value: any) => {
        updateData({ [field]: value });
    };

    // Simulated File Upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newAttachments: Attachment[] = Array.from(files).map((f: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                name: f.name,
                size: (f.size / 1024).toFixed(1) + ' KB',
                type: f.type,
                uploadDate: new Date().toLocaleDateString()
            }));
            updateDoc('attachments', [...(documents.attachments || []), ...newAttachments]);
        }
    };

    const removeAttachment = (id: string) => {
        updateDoc('attachments', (documents.attachments || []).filter(a => a.id !== id));
    };

    // Gap Analysis Calculations
    const clientBudget = documents.clientBudget || 0;
    const calculatedPrice = financials.monthlyValue;
    const gap = calculatedPrice - clientBudget;
    const gapPercent = clientBudget > 0 ? (gap / clientBudget) : 0;
    const isOverBudget = gap > 0;

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
            <header className="flex justify-between items-end border-b border-slate-200 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                        <PenTool size={28} className="text-[#0f172a]" />
                        Definição do Projeto
                    </h2>
                    <p className="text-slate-500 mt-1">Configuração do cronograma, parâmetros financeiros locais e escopo técnico.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setTimeout(() => {
                                window.print();
                            }, 100);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 shadow-sm transition-colors"
                    >
                        <Printer size={18} /> Gerar PDF (Proposta)
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] text-white rounded-lg font-bold text-sm hover:bg-[#1e293b] shadow-lg shadow-slate-900/10 transition-colors">
                        <Save size={18} /> Salvar Alterações
                    </button>
                </div>
            </header>

            {/* Hidden Print Component */}
            <ProposalPrint data={printData} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* PRODUCT SIMPLE VIEW */}
                {data.type === 'PRODUCT' ? (
                    <div className="lg:col-span-12 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                    <FileText size={18} className="text-emerald-500" /> Resumo Executivo
                                </h3>
                                <textarea
                                    value={data.executiveSummary || ''}
                                    onChange={(e) => updateData({ executiveSummary: e.target.value })}
                                    className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                    placeholder="Descreva o propósito da cotação ou observações gerais..."
                                />
                            </div>

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-emerald-500" /> Termos & Condições
                                </h3>
                                <textarea
                                    value={data.termsAndConditions || ''}
                                    onChange={(e) => updateData({ termsAndConditions: e.target.value })}
                                    className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                    placeholder="Ex: Condições de pagamento, frete, garantia..."
                                />
                            </div>
                        </div>

                        {/* ATTACHMENTS (Still useful for Products) */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <Paperclip size={18} className="text-indigo-600" />
                                Arquivos e Catálogos
                            </h3>
                            <div
                                className={`relative overflow-hidden z-0 border-2 border-dashed rounded-xl p-6 text-center transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
                            >
                                <UploadCloud className="mx-auto text-slate-400 mb-2" size={32} />
                                <p className="text-sm text-slate-600 font-medium text-center">Anexar documentos técnicos ou catálogos</p>
                                <input
                                    type="file"
                                    multiple
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                    onChange={handleFileUpload}
                                />
                            </div>
                            <div className="space-y-2 mt-4">
                                {(documents.attachments || []).map(file => (
                                    <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-slate-100 rounded text-slate-500"><File size={16} /></div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-700 truncate">{file.name}</p>
                                                <p className="text-[10px] text-slate-400">{file.size} • {file.uploadDate}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => removeAttachment(file.id)} className="text-slate-300 hover:text-red-500 p-1"><X size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* LEFT COLUMN: PROJECT CONFIGURATION (7 cols) */}
                        <div className="lg:col-span-7 space-y-6">

                            {/* 1. CRONOGRAMA DO PROJETO */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Calendar size={18} className="text-blue-600" />
                                    Cronograma Financeiro
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Início Previsto</label>
                                        <input
                                            type="date"
                                            value={data.contractStartDate ? data.contractStartDate.split('T')[0] : ''}
                                            onChange={(e) => updateRoot('contractStartDate', e.target.value)}
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Duração Contrato</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={data.contractDuration}
                                                onChange={(e) => updateRoot('contractDuration', parseInt(e.target.value) || 12)}
                                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">meses</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mobilização Prévia</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={data.mobilizationMonths}
                                                onChange={(e) => updateRoot('mobilizationMonths', parseInt(e.target.value) || 1)}
                                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">meses</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Investimento antes da receita</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">WACC / TMA Projeto</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={((data.wacc || 0.12) * 100).toFixed(2)}
                                                onChange={(e) => updateRoot('wacc', (parseFloat(e.target.value) || 0) / 100)}
                                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">% a.a.</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Taxa desconto p/ VPL</p>
                                    </div>
                                </div>
                            </div>

                            {/* 2. CICLO DE CAIXA */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Clock size={18} className="text-amber-600" />
                                    Ciclo de Caixa (Prazos)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Recebimento (Cliente)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={data.paymentTermDays}
                                                onChange={(e) => updateRoot('paymentTermDays', parseInt(e.target.value) || 30)}
                                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">dias</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pagto. Fornecedor</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={data.supplierPaymentTermDays || 30}
                                                onChange={(e) => updateRoot('supplierPaymentTermDays', parseInt(e.target.value) || 30)}
                                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">dias</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Dia Pagto. Folha</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Dia</span>
                                            <input
                                                type="number"
                                                max="30"
                                                min="1"
                                                value={data.payrollCashFlowDay || 5}
                                                onChange={(e) => updateRoot('payrollCashFlowDay', parseInt(e.target.value) || 5)}
                                                className="w-full pl-10 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">Dia útil do mês seguinte</p>
                                    </div>
                                </div>
                            </div>

                            {/* 3. PARÂMETROS LOCAIS */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Globe size={18} className="text-emerald-600" />
                                    Parâmetros Locais (Override)
                                </h3>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">ISS - Alíquota Local</label>
                                        <p className="text-[10px] text-slate-500 mb-3 leading-tight">
                                            Define a alíquota específica para o município deste projeto.
                                            Se preenchido, substitui o valor global (ex: 5%) nas projeções.
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-32">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={data.issTaxOverride !== undefined ? (data.issTaxOverride * 100).toFixed(2) : ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value === '' ? undefined : parseFloat(e.target.value) / 100;
                                                        updateRoot('issTaxOverride', val);
                                                    }}
                                                    placeholder="Global"
                                                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none placeholder-slate-300"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                                            </div>
                                            {data.issTaxOverride !== undefined && (
                                                <button
                                                    onClick={() => updateRoot('issTaxOverride', undefined)}
                                                    className="text-xs text-red-500 hover:text-red-700 font-bold underline"
                                                >
                                                    Restaurar Padrão
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="w-px bg-slate-200 self-stretch mx-2"></div>

                                    <div className="flex-1 opacity-50 pointer-events-none">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Outros Impostos</label>
                                        <p className="text-[10px] text-slate-400">Gerenciados na configuração global.</p>
                                    </div>
                                </div>
                            </div>

                            {/* 4. ANEXOS E MEMO */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <Paperclip size={18} className="text-indigo-600" />
                                        Documentação de Suporte
                                    </h3>
                                </div>

                                <div className="mb-6">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                        <Hash size={12} /> Número da Solicitação (Cliente)
                                    </label>
                                    <input
                                        type="text"
                                        value={documents.technicalNumber || ''}
                                        onChange={(e) => updateDoc('technicalNumber', e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#fbbf24] outline-none"
                                        placeholder="Ex: RFQ-2023-998"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Arquivos Anexados</p>
                                    {/* SAFEGUARD: Added 'relative', 'overflow-hidden' and 'z-0' to strictly contain the input */}
                                    <div
                                        className={`relative overflow-hidden z-0 border-2 border-dashed rounded-xl p-6 text-center transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsDragging(false);
                                        }}
                                    >
                                        <UploadCloud className="mx-auto text-slate-400 mb-2" size={32} />
                                        <p className="text-sm text-slate-600 font-medium">Arraste arquivos ou clique para anexar</p>
                                        <p className="text-[10px] text-slate-400 mt-1">PDF, Excel, Imagens (Máx 10MB)</p>
                                        <input
                                            type="file"
                                            multiple
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                            onChange={handleFileUpload}
                                        />
                                    </div>

                                    <div className="space-y-2 mt-4">
                                        {(documents.attachments || []).map(file => (
                                            <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="p-2 bg-slate-100 rounded text-slate-500"><File size={16} /></div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-700 truncate">{file.name}</p>
                                                        <p className="text-[10px] text-slate-400">{file.size} • {file.uploadDate}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeAttachment(file.id)} className="text-slate-300 hover:text-red-500 p-1"><X size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: SCOPE & TARGETS (5 cols) */}
                        <div className="lg:col-span-5 space-y-6">

                            <div className="bg-[#0f172a] text-white rounded-xl shadow-xl p-6 relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                        <Target size={20} className="text-[#fbbf24]" />
                                        Gap Analysis (Budget)
                                    </h3>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Budget do Cliente (Target)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                                <input
                                                    type="text"
                                                    value={budgetDisplay}
                                                    onChange={handleBudgetChange}
                                                    className="w-full bg-white/10 border border-white/20 rounded-lg py-3 pl-10 pr-4 text-2xl font-bold text-white placeholder-white/30 focus:bg-white/20 focus:border-[#fbbf24] outline-none transition-all"
                                                    placeholder="0,00"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Preço Calculado (ERP)</label>
                                            <div className="text-2xl font-bold text-white opacity-80">
                                                {formatCurrency(calculatedPrice)}
                                            </div>
                                        </div>

                                        <div className="h-px bg-white/10 w-full"></div>

                                        {clientBudget > 0 && (
                                            <div className={`p-4 rounded-lg border ${isOverBudget ? 'bg-red-500/20 border-red-500/50' : 'bg-emerald-500/20 border-emerald-500/50'}`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className={`text-sm font-bold ${isOverBudget ? 'text-red-300' : 'text-emerald-300'} flex items-center gap-2`}>
                                                        {isOverBudget ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                        {isOverBudget ? 'Acima do Budget' : 'Abaixo do Budget'}
                                                    </span>
                                                    <span className={`text-lg font-black ${isOverBudget ? 'text-red-400' : 'text-emerald-400'}`}>
                                                        {isOverBudget ? '+' : ''}{formatCurrency(gap)}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                        style={{ width: '100%' }}
                                                    ></div>
                                                </div>
                                                <p className="text-[10px] mt-2 opacity-70">
                                                    O preço calculado está <strong>{formatPercent(Math.abs(gapPercent))}</strong> {isOverBudget ? 'acima' : 'abaixo'} da expectativa do cliente.
                                                </p>
                                            </div>
                                        )}

                                        {!clientBudget && (
                                            <div className="flex items-center gap-2 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-200 text-xs">
                                                <AlertTriangle size={16} />
                                                Informe o Budget do cliente para visualizar a análise de gap.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <FileText size={18} className="text-blue-600" />
                                    Memo do Cliente
                                </h3>
                                <textarea
                                    value={documents.clientMemo}
                                    onChange={(e) => updateDoc('clientMemo', e.target.value)}
                                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                    placeholder="Ex: Cliente solicita equipe de 5 pessoas para turno administrativo..."
                                />
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-emerald-600" />
                                    Entregáveis (Escopo Técnico)
                                </h3>
                                <textarea
                                    value={documents.deliverables}
                                    onChange={(e) => updateDoc('deliverables', e.target.value)}
                                    className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                                    placeholder="1. Fornecimento de mão de obra especializada...&#10;2. Gestão de EPIs...&#10;3. Relatórios mensais de performance..."
                                />
                            </div>

                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Documents;
