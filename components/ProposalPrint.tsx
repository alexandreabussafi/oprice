import React from 'react';
import { ProposalData } from '../types';
import { formatCurrency, calculateFinancials, ExtendedFinancials } from '../utils/pricingEngine';

interface ProposalPrintProps {
    data: ProposalData;
}

const ProposalPrint: React.FC<ProposalPrintProps> = ({ data }) => {
    const financials = calculateFinancials(data) as ExtendedFinancials;

    return (
        <div className="hidden print:block w-full h-full bg-white text-slate-900 font-sans p-10">
            {/* Header / Timbre */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">OPC<span className="text-blue-600">APEX</span></h1>
                    <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mt-1">Industrial Viability Engine</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-slate-800">Proposta Comercial</h2>
                    <p className="text-sm text-slate-500 font-mono mt-1">Ref: #{data.proposalId} <span className="text-slate-400">v{data.version}</span></p>
                    <p className="text-sm text-slate-500 mt-1">Data: {new Date().toLocaleDateString('pt-BR')}</p>
                    <p className="text-sm text-slate-500">Validade: {new Date(data.expirationDate).toLocaleDateString('pt-BR')}</p>
                </div>
            </div>

            {/* Cabeçalho do Cliente */}
            <div className="mb-10 bg-slate-50 p-6 rounded-lg border border-slate-200">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Preparado Para</p>
                        <p className="text-lg font-bold text-slate-800">{data.clientName}</p>
                        {/* Se tivéssemos contato do cliente mapeado aqui, poderíamos exibir, mas usaremos clientName no momento */}
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
                    <thead className="bg-[#0f172a] text-white">
                        <tr>
                            <th className="px-4 py-3 text-left font-bold rounded-tl-lg">Item</th>
                            <th className="px-4 py-3 text-right font-bold">Tipo</th>
                            <th className="px-4 py-3 text-right font-bold rounded-tr-lg">Valor Total Mensal</th>
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
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-2">
                    <p><strong>Condições de Pagamento:</strong> O faturamento será emitido com vencimento para {data.paymentTermDays || 30} dias contados da entrega ou medição do período.</p>
                    <p><strong>Tributos:</strong> Os valores acima já incluem todos os impostos incidentes sobre o faturamento (PIS, COFINS, ISS/ICMS). Retenções obrigatórias na fonte (IRRF, CSRF, INSS, ISS) serão descontadas do valor bruto no momento do pagamento, de acordo com a legislação vigente aplicável ao município do prestador e do tomador.</p>
                    <p><strong>Validade:</strong> Esta proposta comercial possui validade de {(new Date(data.expirationDate).getTime() - new Date(data.createdAt).getTime()) / (1000 * 3600 * 24)} dias a partir da data de emissão.</p>
                </div>
            </div>

            {/* Quadro de Pessoal - Apenas se houver e se não for SPOT para ficar mais claro, ou mostra sempre */}
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

            {/* Footer / Assinatura (Fica empurrado para o final se couber ou quebra pág) */}
            <div className="mt-20 pt-10 border-t border-slate-200 grid grid-cols-2 gap-10 page-break-inside-avoid">
                <div className="text-center">
                    <div className="w-full h-px bg-slate-400 mb-2"></div>
                    <p className="font-bold text-slate-800">{data.responsible}</p>
                    <p className="text-xs text-slate-500">OPCAPEX - Comercial</p>
                </div>
                <div className="text-center">
                    <div className="w-full h-px bg-slate-400 mb-2"></div>
                    <p className="font-bold text-slate-800">{data.clientName}</p>
                    <p className="text-xs text-slate-500">De Acordo / Aprovação</p>
                </div>
            </div>

            {/* Rodapé Absoluto de Página */}
            <div className="fixed bottom-0 left-0 w-full p-4 text-center text-[10px] text-slate-400 font-mono">
                OpCapex Ltda - Av. Industrial, 1000 - São Paulo/SP - CNPJ 00.000.000/0001-00<br />
                contato@opcapex.com.br | (11) 9999-9999 | www.opcapex.com.br
            </div>

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
                }
            `}</style>
        </div>
    );
};

export default ProposalPrint;
