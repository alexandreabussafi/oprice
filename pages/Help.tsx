
import React from 'react';
import { HelpCircle, Download, ExternalLink, Printer } from 'lucide-react';

interface HelpProps {
    darkMode?: boolean;
}

const Help: React.FC<HelpProps> = ({ darkMode }) => {
    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-8 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <HelpCircle className="text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)]" size={32} />
                        Central de Ajuda & Manuais
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Tudo o que você precisa para dominar a viabilidade industrial no OpCapex.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <a
                        href="/docs/manual_usuario_premium.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--tenant-primary)] hover:bg-[var(--tenant-secondary-soft)] text-white rounded-lg font-bold shadow-lg dark:shadow-none transition-all hover:-translate-y-1 active:scale-95 text-sm"
                    >
                        <Printer size={18} />
                        Gerar PDF Oficial
                    </a>
                </div>
            </div>

            {/* Manual Content Preview / Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* Quick Guide Card */}
                    <div className="rounded-lg bg-[linear-gradient(135deg,var(--tenant-primary),var(--tenant-secondary))] p-1 shadow-xl dark:shadow-none">
                        <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] rounded-[22px] p-8">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tenant-secondary-soft)] dark:bg-[var(--tenant-secondary-soft)] text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] text-sm">1</span>
                                Início Rápido: O que é o OpCapex?
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                                O OpCapex é seu motor de viabilidade. Ele transforma custos de equipe, materiais e investimentos (CAPEX) em uma proposta comercial sólida com DRE e Fluxo de Caixa automáticos.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-lg bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]">
                                    <p className="text-xs font-black text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] uppercase tracking-widest mb-1">CRM</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Gestão visual do funil e status das cotações.</p>
                                </div>
                                <div className="p-4 rounded-lg bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)]">
                                    <p className="text-xs font-black text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] uppercase tracking-widest mb-1">Cálculo</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">DRE em cascata com impostos e margem real.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Manual Sections */}
                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-8 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-sm space-y-8">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Conteúdo do Manual</h2>

                        <div className="space-y-4">
                            {[
                                { title: "CRM & Funil de Vendas", desc: "Como mover propostas entre estágios, colunas e gerenciar Won/Lost.", anchor: "crm" },
                                { title: "Gestão de Contas", desc: "Classificação de Leads, Prospects e Clients com métricas LTV.", anchor: "crm_contas" },
                                { title: "Contatos e Stakeholders", desc: "Cadastro de decisores e influenciadores nas contas.", anchor: "crm_contatos" },
                                { title: "Tarefas & Follow-ups", desc: "Gestão de pendências comerciais integrada com o pipeline.", anchor: "crm_tarefas" },
                                { title: "Composição de Equipe", desc: "Configuração de salários, encargos e uso do Organograma interativo.", anchor: "editor_team" },
                                { title: "OPEX vs CAPEX", desc: "Entenda a diferença entre custos mensais e investimentos em ativos.", anchor: "editor_capex" },
                                { title: "Fluxo de Caixa e VPL/TIR", desc: "A matemática por trás da viabilidade e tempo de retorno (Payback).", anchor: "editor_dashboard" },
                            ].map((item, i) => (
                                <a
                                    key={i}
                                    href={`/docs/manual_usuario_premium.html#${item.anchor}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group block p-5 rounded-lg hover:bg-[var(--tenant-control)] dark:hover:bg-[var(--tenant-control-dark)] border border-transparent hover:border-[var(--tenant-border)] dark:hover:border-[var(--tenant-border-dark)] transition-all active:scale-[0.99]"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-[var(--tenant-secondary)] dark:group-hover:text-[var(--tenant-secondary)] transition-colors uppercase text-sm tracking-tight">{item.title}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{item.desc}</p>
                                        </div>
                                        <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--tenant-control)] dark:bg-[var(--tenant-control-dark)] group-hover:bg-[var(--tenant-secondary-soft)] dark:group-hover:bg-[var(--tenant-secondary-soft)] transition-colors">
                                            <ExternalLink size={18} className="text-slate-300 group-hover:text-[var(--tenant-secondary)] dark:group-hover:text-[var(--tenant-secondary)] transition-colors" />
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Help */}
                <div className="space-y-6">
                    <div className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-panel)] p-8 text-[var(--tenant-text)] shadow-xl dark:border-[var(--tenant-border-dark)] dark:bg-[var(--tenant-panel-dark)] dark:text-[var(--tenant-text-dark)]">
                        <h3 className="text-lg font-bold mb-4">Dúvidas Técnicas?</h3>
                        <p className="text-sm text-slate-400 mb-6">Estamos aqui para ajudar com cálculos complexos ou integrações.</p>
                        <button className="w-full py-3 bg-[var(--tenant-panel)] text-slate-900 rounded-lg font-bold hover:bg-[var(--tenant-control)] transition-colors text-sm">
                            Falar com Suporte
                        </button>
                    </div>

                    <div className="bg-[var(--tenant-panel)] dark:bg-[var(--tenant-panel-dark)] p-8 rounded-lg border border-[var(--tenant-border)] dark:border-[var(--tenant-border-dark)] shadow-sm text-center">
                        <div className="h-16 w-16 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <Download className="text-amber-600 dark:text-amber-500" size={24} />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Manual em MD</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Acesse a versão raw em markdown para o Github.</p>
                        <a
                            href="/docs/manual_usuario.md"
                            className="text-[var(--tenant-secondary)] dark:text-[var(--tenant-secondary)] text-sm font-bold hover:underline"
                        >
                            Abrir manual.md
                        </a>
                    </div>
                </div>
            </div>

            <footer className="text-center pt-8">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    OpCapex — Industrial Viability Engine v1.0
                </p>
            </footer>
        </div>
    );
};

export default Help;
