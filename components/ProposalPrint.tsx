import React from 'react';
import { ProposalData } from '../types';
import { formatCurrency, calculateFinancials, ExtendedFinancials } from '../utils/pricingEngine';

interface ProposalPrintProps {
    data: ProposalData;
}

const ProposalPrint: React.FC<ProposalPrintProps> = ({ data }) => {
    const financials = calculateFinancials(data) as ExtendedFinancials;

    // --- PRODUCT LAYOUT (NEW DESIGN) ---
    if (data.type === 'PRODUCT') {
        const totalProducts = data.productLines?.reduce((acc, l) => acc + (l.finalPrice / (1 + (l.ipiPercent || 0))) * l.quantity, 0) || 0;
        const totalTaxes = data.productLines?.reduce((acc, l) => acc + ((l.finalPrice / (1 + (l.ipiPercent || 0))) * (l.icmsPercent || 0) * l.quantity) + ((l.finalPrice / (1 + (l.ipiPercent || 0))) * (l.ipiPercent || 0) * l.quantity), 0) || 0;
        const finalValue = data.value;

        return (
            <div className="hidden print:block w-full h-full bg-white text-slate-900 font-sans p-0 relative min-h-screen">
                {/* CABEÇALHO */}
                {(data.letterheadConfig?.headerUrl || data.letterheadConfig?.productHeaderUrl) ? (
                    <img src={data.letterheadConfig.headerUrl || data.letterheadConfig.productHeaderUrl} alt="Header" className="w-full object-cover" />
                ) : (
                    <div className="flex justify-between items-center p-8 border-b border-slate-200">
                        {(data.letterheadConfig?.productLogoUrl || data.letterheadConfig?.logoUrl) ? (
                            <img src={data.letterheadConfig.productLogoUrl || data.letterheadConfig.logoUrl} alt="Logo" className="h-16 object-contain" />
                        ) : (
                            <div className="h-16 flex items-center"><h1 className="text-3xl font-black">{data.letterheadConfig?.companyName || 'OPCAPEX'}</h1></div>
                        )}
                        <h1 className="text-4xl font-light text-slate-400 tracking-widest uppercase">Orçamento</h1>
                    </div>
                )}

                <div className="p-8">
                    {/* INFORMAÇÕES DO ORÇAMENTO (2 Colunas) */}
                    <div className="grid grid-cols-2 gap-8 mb-8 items-start">
                        {/* Lado Esquerdo */}
                        <div className="text-xs space-y-2">
                            <div className="flex"><span className="w-32 font-bold text-slate-500 uppercase">Orçamento Nº:</span><span className="font-semibold">{data.salesOrderNumber || `OV-${data.proposalId}`}</span></div>
                            <div className="flex"><span className="w-32 font-bold text-slate-500 uppercase">Validade:</span><span>{new Date(data.expirationDate).toLocaleDateString('pt-BR')}</span></div>
                            <div className="flex"><span className="w-32 font-bold text-slate-500 uppercase">Assunto:</span><span>Orçamento de Produtos</span></div>
                            <div className="flex"><span className="w-32 font-bold text-slate-500 uppercase">Empresa:</span><span className="font-bold text-slate-800">{data.clientName}</span></div>
                            <div className="flex"><span className="w-32 font-bold text-slate-500 uppercase">Vendedor:</span><span>{data.responsible}</span></div>
                        </div>
                        {/* Lado Direito */}
                        <div className="text-xs space-y-4">
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                                <span className="block font-bold text-slate-500 uppercase mb-1">Enviar Para</span>
                                <span className="font-medium text-slate-800">{data.shippingAddress || data.deliveryAddress || 'Endereço Principal'}</span>
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                                <span className="block font-bold text-slate-500 uppercase mb-1">Faturar Para (CNPJ)</span>
                                <span className="font-medium text-slate-800">{data.billingAddress || data.clientName}</span>
                            </div>
                        </div>
                    </div>

                    {/* TABELA DE PRODUTOS */}
                    <div className="mb-8 border border-slate-300 rounded overflow-hidden">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-[#595959] text-white">
                                <tr>
                                    <th className="p-2 font-semibold">IMAGEM</th>
                                    <th className="p-2 font-semibold">SKU</th>
                                    <th className="p-2 font-semibold">NOME DO PRODUTO</th>
                                    <th className="p-2 font-semibold text-center">QTD</th>
                                    <th className="p-2 font-semibold text-right">PREÇO UN. (R$)</th>
                                    <th className="p-2 font-semibold text-right">TOTAL (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {data.productLines?.map((line, idx) => (
                                    <tr key={idx} className="page-break-inside-avoid">
                                        <td className="p-2 align-middle">
                                            {line.imageUrl ? (
                                                <img src={line.imageUrl} alt={line.name} className="w-12 h-12 object-contain" />
                                            ) : (
                                                <div className="w-12 h-12 bg-slate-100 flex items-center justify-center text-[8px] text-slate-400 text-center border border-slate-200">Sem Foto</div>
                                            )}
                                        </td>
                                        <td className="p-2 align-middle font-mono text-[10px] uppercase text-slate-500 border-l border-slate-200">{line.sku || '-'}</td>
                                        <td className="p-2 align-middle border-l border-slate-200">
                                            <p className="font-bold text-slate-800 uppercase">{line.name}</p>
                                            {line.ncm && <p className="text-[9px] text-slate-500 mt-0.5">NCM: {line.ncm}</p>}
                                        </td>
                                        <td className="p-2 align-middle text-center font-bold border-l border-slate-200">{line.quantity}</td>
                                        <td className="p-2 align-middle text-right border-l border-slate-200">{formatCurrency(line.total / line.quantity)}</td>
                                        <td className="p-2 align-middle text-right font-bold text-slate-800 border-l border-slate-200 bg-slate-50/50">{formatCurrency(line.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* QUADRO DE TOTAIS */}
                    <div className="flex justify-end mb-8 page-break-inside-avoid">
                        <div className="w-72 border border-slate-300 rounded overflow-hidden text-xs">
                            <div className="flex justify-between items-center p-2 border-b border-slate-200 bg-slate-50">
                                <span className="font-bold text-slate-600 uppercase">Subtotal</span>
                                <span>{formatCurrency(totalProducts)}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 border-b border-slate-200 bg-slate-50">
                                <span className="font-bold text-slate-600 uppercase">Impostos (Inclusos)</span>
                                <span>{formatCurrency(totalTaxes)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-[#595959] text-white">
                                <span className="font-bold uppercase text-sm">Total Bruto</span>
                                <span className="font-bold text-sm">{formatCurrency(finalValue)}</span>
                            </div>
                        </div>
                    </div>

                    {/* TERMOS GERAIS */}
                    {data.letterheadConfig?.productGeneralTerms && (
                        <div className="mb-8 text-[10px] text-slate-600 border-t border-slate-200 pt-4 whitespace-pre-wrap">
                            <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[11px]">Informações Gerais</h4>
                            {data.letterheadConfig.productGeneralTerms}
                        </div>
                    )}
                </div>

                {/* RODAPÉ ABSOLUTO OU IMAGEM */}
                {(data.letterheadConfig?.footerUrl || data.letterheadConfig?.productFooterUrl) ? (
                    <div className="mt-8 mb-4 break-inside-avoid">
                        <img src={data.letterheadConfig.footerUrl || data.letterheadConfig.productFooterUrl} alt="Footer" className="w-full object-cover" />
                    </div>
                ) : (
                    <div className="mt-8 mb-4 p-8 text-center text-[10px] text-slate-400 font-mono border-t border-slate-200 break-inside-avoid">
                        {data.letterheadConfig?.companyName} | {data.letterheadConfig?.addressLine1} - {data.letterheadConfig?.addressLine2}<br />
                        {data.letterheadConfig?.contactEmail} | {data.letterheadConfig?.contactPhone} | {data.letterheadConfig?.website}
                    </div>
                )}

                <style>{`
                    @media print {
                        @page { margin: 0; size: A4 portrait; }
                        body * { visibility: hidden; }
                        .print\\:block, .print\\:block * { visibility: visible; }
                        .print\\:block {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            background: white !important;
                        }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        .page-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
                    }
                `}</style>
            </div>
        );
    }

    // --- SPOT / CONTINUOUS LAYOUT (CLASSIC) ---
    return (
        <div className="hidden print:block w-full h-full bg-white text-slate-900 font-sans p-16">
            {/* Header / Timbre */}
            {data.letterheadConfig?.headerUrl ? (
                <div className="w-full mb-8 pt-0 -mt-16 -mx-16 px-0 box-content">
                    <img src={data.letterheadConfig.headerUrl} alt="Header" className="w-full object-cover" />
                </div>
            ) : (
                <div
                    className="flex justify-between items-start border-b-2 pb-6 mb-8 transition-colors"
                    style={{ borderColor: data.letterheadConfig?.primaryColor || '#0f172a' }}
                >
                    <div className="flex items-center gap-4">
                        {(data.letterheadConfig?.serviceLogoUrl || data.letterheadConfig?.logoUrl) ? (
                            <img src={data.letterheadConfig.serviceLogoUrl || data.letterheadConfig.logoUrl} alt="Logo" className="h-16 object-contain" />
                        ) : (
                            <img src="/logo.png" alt="Logo" className="h-16 object-contain" />
                        )}
                        <div>
                            <h1 className="text-3xl font-black tracking-tight" style={{ color: data.letterheadConfig?.primaryColor || '#0f172a' }}>
                                {data.letterheadConfig?.companyName || 'OPCAPEX'}
                            </h1>
                            <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mt-1">
                                {data.letterheadConfig?.companySlogan || 'Industrial Viability Engine'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-slate-800">Proposta Comercial</h2>
                        <p className="text-sm text-slate-500 font-mono mt-1">Ref: #{data.proposalId} <span className="text-slate-400">v{data.version}</span></p>
                        <p className="text-sm text-slate-500 mt-1">Data: {new Date().toLocaleDateString('pt-BR')}</p>
                        <p className="text-sm text-slate-500">Validade: {new Date(data.expirationDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
            )}

            {/* Cabeçalho do Cliente */}
            <div className="mb-10 bg-slate-50 p-6 rounded-lg border border-slate-200">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Preparado Para</p>
                        <p className="text-lg font-bold text-slate-800">{data.clientName}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Responsável Comercial</p>
                        <p className="text-lg font-bold text-slate-800">{data.responsible}</p>
                    </div>
                </div>
            </div>

            {/* Escopo e Premissas */}
            <div className="mb-10 space-y-8">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">1. Escopo e Entregáveis</h3>
                    <div className="prose prose-sm text-slate-600 whitespace-pre-wrap">
                        {data.documents.deliverables || "Escopo detalhado não informado nesta versão da proposta."}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">2. Premissas Comerciais e Técnicas</h3>
                    <div className="prose prose-sm text-slate-600 whitespace-pre-wrap">
                        {data.documents.technicalAssumptions || "Premissas não detalhadas nesta versão da proposta."}
                    </div>
                </div>
            </div>

            {/* Tabela de Investimento (Resumo) */}
            <div className="mb-12">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-6">3. Resumo de Investimento</h3>

                <table className="w-full text-sm border-collapse">
                    <thead className="text-white" style={{ backgroundColor: data.letterheadConfig?.primaryColor || '#0f172a' }}>
                        <tr>
                            <th className="px-4 py-3 text-left font-bold rounded-tl-lg">Item</th>
                            <th className="px-4 py-3 text-right font-bold">Tipo</th>
                            <th className="px-4 py-3 text-right font-bold rounded-tr-lg">Valor Total {data.type === 'CONTINUOUS' ? 'Mensal' : ''}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 border-b border-slate-200">
                        <tr>
                            <td className="px-4 py-4 text-slate-800 font-medium">Prestação de Serviços - {data.type === 'SPOT' ? 'Projeto Spot' : 'Contrato Contínuo'}</td>
                            <td className="px-4 py-4 text-right text-slate-600">{data.type === 'SPOT' ? 'Pagamento Único (Spot)' : 'Faturamento Mensal'}</td>
                            <td className="px-4 py-4 text-right font-black text-slate-900">{formatCurrency(financials.monthlyValue)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Notas Fiscais e Tributos info */}
                <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-3 shadow-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p><strong>Local de Entrega:</strong> {data.deliveryAddress || 'Conforme cadastro.'}</p>
                            <p><strong>Prazo de Entrega:</strong> {data.deliveryDeadline || 'A combinar.'}</p>
                        </div>
                        <div>
                            <p><strong>Condições de Pagamento:</strong> {data.paymentTermDays || 30} dias líquidos.</p>
                            <p><strong>Validade da Proposta:</strong> {data.validity || '15 dias'}.</p>
                        </div>
                    </div>
                    <div className="pt-3 border-t border-slate-200 text-[10px] leading-relaxed">
                        <p><strong>Tributos:</strong> Os valores acima já incluem todos os impostos incidentes sobre o faturamento (PIS, COFINS, ISS/ICMS). Retenções obrigatórias na fonte (IRRF, CSRF, INSS, ISS) serão descontadas do valor bruto no momento do pagamento, de acordo com a legislação vigente aplicável ao município do prestador e do tomador.</p>
                    </div>
                </div>
            </div>

            {/* Quadro de Pessoal - Apenas se houver e se não for SPOT para ficar mais claro */}
            {data.roles && data.roles.length > 0 && (
                <div className="mb-10 page-break-inside-avoid">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">4. Dimensionamento de Equipe</h3>
                    <table className="w-full text-sm text-left border border-slate-200">
                        <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-2 font-bold">Cargo / Função</th>
                                <th className="px-4 py-2 text-center font-bold">Qtd. Prevista</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.roles.map(role => (
                                <tr key={role.id}>
                                    <td className="px-4 py-2 text-slate-800">{role.title}</td>
                                    <td className="px-4 py-2 text-center text-slate-800">{role.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer / Assinatura */}
            <div className="mt-20 pt-10 border-t border-slate-200 grid grid-cols-2 gap-10 page-break-inside-avoid">
                <div className="text-center">
                    <div className="w-full h-px bg-slate-400 mb-2"></div>
                    <p className="font-bold text-slate-800">{data.responsible}</p>
                    <p className="text-xs text-slate-500">{data.letterheadConfig?.companyName || 'OPCAPEX'} - Comercial</p>
                </div>
                <div className="text-center">
                    <div className="w-full h-px bg-slate-400 mb-2"></div>
                    <p className="font-bold text-slate-800">{data.clientName}</p>
                    <p className="text-xs text-slate-500">De Acordo / Aprovação</p>
                </div>
            </div>

            {/* Rodapé Absoluto de Página */}
            {data.letterheadConfig?.footerUrl ? (
                <div className="fixed bottom-0 left-0 w-full break-inside-avoid">
                    <img src={data.letterheadConfig.footerUrl} alt="Footer" className="w-full object-cover" />
                </div>
            ) : (
                <div className="fixed bottom-0 left-0 w-full p-4 text-center text-[10px] text-slate-400 font-mono">
                    {data.letterheadConfig?.companyName} | {data.letterheadConfig?.addressLine1} - {data.letterheadConfig?.addressLine2}<br />
                    {data.letterheadConfig?.contactEmail} | {data.letterheadConfig?.contactPhone} | {data.letterheadConfig?.website}
                </div>
            )}

            {/* Global print styles to hide everything else */}
            <style>{`
                @media print {
                    @page { margin: 0; size: A4 portrait; }
                    body * { visibility: hidden; }
                    .print\\:block, .print\\:block * { visibility: visible; }
                    .print\\:block {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                    }
                    /* Ensure background colors render */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .page-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
                }
            `}</style>
        </div>
    );
};

export default ProposalPrint;
