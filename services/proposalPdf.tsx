import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { EmailAttachment, ProposalData, ProposalTemplateConfig } from '../types';
import { calculateFinancials, formatCurrency } from '../utils/pricingEngine';
import { applyProposalTemplateVariables, getProposalDisplayValue, getProposalTemplateKind, mergeProposalTemplates, PROPOSAL_TEMPLATE_LABELS } from '../utils/proposalTemplates';
import { buildLubitSaasProposalData, LubitSlaRow } from '../utils/lubitSaasProposal';

const safeText = (value?: string | number) => String(value ?? '').trim();

const SECTION_MIN_PRESENCE_AHEAD = 76;
const TABLE_MIN_PRESENCE_AHEAD = 52;
const CARD_MIN_PRESENCE_AHEAD = 44;
const TEXT_ORPHANS = 2;
const TEXT_WIDOWS = 2;

const slaToneColor: Record<LubitSlaRow['tone'], string> = {
  critical: '#ad3232',
  high: '#9a6a14',
  medium: '#2563eb',
  low: '#64748b',
};

const LubitSaasPdfDocument: React.FC<{ proposal: ProposalData; template: ProposalTemplateConfig }> = ({ proposal, template }) => {
  const view = buildLubitSaasProposalData(proposal, template);
  const primaryColor = view.primaryColor;
  const secondaryColor = view.secondaryColor;
  const styles = StyleSheet.create({
    page: {
      padding: 28,
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#172027',
      backgroundColor: '#ffffff'
    },
    cover: {
      padding: 22,
      color: '#ffffff',
      backgroundColor: primaryColor,
      borderRadius: 8,
      marginBottom: 10
    },
    coverRow: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    watermarkLogo: {
      position: 'absolute',
      top: 245,
      left: 82,
      width: 430,
      height: 270,
      objectFit: 'contain',
      opacity: 0.045
    },
    logo: { width: 86, height: 38, objectFit: 'contain', marginBottom: 12 },
    brandFallback: { fontSize: 20, fontWeight: 700, marginBottom: 12 },
    kicker: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#bae6fd', marginBottom: 5 },
    title: { fontSize: 25, fontWeight: 700, lineHeight: 1.1, maxWidth: 360 },
    paragraphLight: { color: '#d8e7ef', lineHeight: 1.4, marginTop: 9, maxWidth: 360 },
    meta: { width: 170, padding: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderLeftWidth: 3, borderLeftColor: '#67e8f9' },
    metaLabel: { fontSize: 7, color: '#bae6fd', textTransform: 'uppercase', fontWeight: 700, marginTop: 6 },
    metaValue: { fontSize: 9, color: '#ffffff', fontWeight: 700, marginTop: 2 },
    badges: { flexDirection: 'row', marginTop: 14 },
    badge: { borderWidth: 1, borderColor: '#86e8f9', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 4, marginRight: 5, color: '#e0f2fe', fontSize: 7, fontWeight: 700 },
    metricRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#d8e1e8', marginBottom: 12 },
    metric: { width: '25%', padding: 8, borderRightWidth: 1, borderRightColor: '#d8e1e8' },
    metricLast: { width: '25%', padding: 8 },
    label: { fontSize: 7, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 },
    value: { fontSize: 10, color: '#0f172a', fontWeight: 700 },
    section: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    sectionTitle: { fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 7 },
    sectionKicker: { fontSize: 7, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 },
    summary: { borderLeftWidth: 3, borderLeftColor: primaryColor, borderWidth: 1, borderColor: '#d8e1e8', padding: 9, borderRadius: 5 },
    text: { lineHeight: 1.45, color: '#334155' },
    cardGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    card: { width: '48.7%', borderWidth: 1, borderColor: '#d8e1e8', borderRadius: 5, padding: 8, marginRight: 6, marginBottom: 6, backgroundColor: '#fbfcfd' },
    cardThird: { width: '24%', borderWidth: 1, borderColor: '#d8e1e8', borderRadius: 5, padding: 8, marginRight: 4, marginBottom: 5, backgroundColor: '#fbfcfd' },
    cardTitle: { fontSize: 9, fontWeight: 700, color: '#0f172a', marginBottom: 3 },
    cardText: { fontSize: 8, color: '#475569', lineHeight: 1.35 },
    number: { width: 18, height: 18, borderRadius: 4, backgroundColor: '#eaf8ef', color: '#217044', textAlign: 'center', paddingTop: 4, fontSize: 8, fontWeight: 700, marginBottom: 5 },
    commercialGrid: { flexDirection: 'row' },
    commercialValue: { width: '35%', borderLeftWidth: 3, borderLeftColor: secondaryColor, borderWidth: 1, borderColor: '#d8e1e8', borderRadius: 5, padding: 10, marginRight: 8, backgroundColor: '#eaf1ff' },
    commercialTerms: { flex: 1, borderWidth: 1, borderColor: '#d8e1e8', borderRadius: 5, padding: 10 },
    bigMoney: { fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 5 },
    table: { borderWidth: 1, borderColor: '#d8e1e8', borderRadius: 5, overflow: 'hidden' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#eef3f6' },
    tableRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#d8e1e8' },
    th: { padding: 7, fontSize: 7, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' },
    td: { padding: 7, fontSize: 8, color: '#172027' },
    pill: { color: '#ffffff', borderRadius: 9, paddingHorizontal: 6, paddingVertical: 3, fontSize: 7, fontWeight: 700, alignSelf: 'flex-start' },
    listCard: { width: '48.7%', borderWidth: 1, borderColor: '#d8e1e8', borderRadius: 5, padding: 8, marginRight: 6, marginBottom: 6 },
    listItem: { marginBottom: 3, lineHeight: 1.35, color: '#334155' },
    footer: { position: 'absolute', left: 28, right: 28, bottom: 18, color: '#64748b', fontSize: 7, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6 }
  });

  return (
    <Document title={`Proposta SaaS ${view.proposalNumber}`}>
      <Page size="A4" style={styles.page}>
        {view.logoUrl ? <Image src={view.logoUrl} style={styles.watermarkLogo} fixed /> : null}
        <View style={styles.cover} wrap={false}>
          <View style={styles.coverRow}>
            <View>
              {view.logoUrl ? <Image src={view.logoUrl} style={styles.logo} /> : <Text style={styles.brandFallback}>{view.companyName}</Text>}
              <Text style={styles.kicker}>Proposta tecnica e comercial</Text>
              <Text style={styles.title}>{view.title}</Text>
              <Text style={styles.paragraphLight} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>{view.executiveSummary}</Text>
              <View style={styles.badges}>
                <Text style={styles.badge}>{view.config.profile}</Text>
                <Text style={styles.badge}>SLA {view.slaPlan.title} - {view.slaPlan.badge}</Text>
                <Text style={styles.badge}>{view.modules.length} modulos</Text>
              </View>
            </View>
            <View style={styles.meta}>
              <Text style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{view.companyName}</Text>
              {[
                ['Cliente', view.clientName],
                ['Proposta', `#${view.proposalNumber} v${view.version}`],
                ['Validade', view.validUntil],
                ['Responsavel', view.owner],
                ['Plano', view.planName]
              ].map(([label, value]) => (
                <View key={label}>
                  <Text style={styles.metaLabel}>{label}</Text>
                  <Text style={styles.metaValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.metricRow} wrap={false}>
          {[
            ['MRR liquido', view.formattedMonthly],
            ['ARR liquido', view.formattedArr],
            ['Implantacao', view.formattedSetup],
            ['Total do prazo', view.formattedContractTotal],
          ].map(([label, value], index) => (
            <View key={label} style={index === 3 ? styles.metricLast : styles.metric}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section} minPresenceAhead={SECTION_MIN_PRESENCE_AHEAD}>
          <Text style={styles.sectionKicker}>Resumo</Text>
          <Text style={styles.sectionTitle}>Visao da contratacao</Text>
          <View style={styles.summary} wrap={false}><Text style={styles.text} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>{view.executiveSummary}</Text></View>
        </View>

        <View style={styles.section} minPresenceAhead={SECTION_MIN_PRESENCE_AHEAD}>
          <Text style={styles.sectionKicker}>Menu configurado</Text>
          <Text style={styles.sectionTitle}>Parametros da proposta</Text>
          <View style={styles.cardGrid}>
            {[
              ['Perfil', view.config.profile],
              ['Suporte', `${view.slaPlan.title} - ${view.slaPlan.badge}`],
              ['Escopo', `${view.modules.length} modulos`],
              ['Opcionais', `${view.addons.length} itens`],
            ].map(([label, value]) => (
              <View key={label} style={styles.cardThird} wrap={false}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} minPresenceAhead={SECTION_MIN_PRESENCE_AHEAD}>
          <Text style={styles.sectionKicker}>Escopo</Text>
          <Text style={styles.sectionTitle}>Escopo contratado</Text>
          <View style={styles.cardGrid}>
            {view.scopeItems.map((item, index) => (
              <View key={`${item}-${index}`} style={styles.card} wrap={false}>
                <Text style={styles.number}>{index + 1}</Text>
                <Text style={styles.cardText} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} minPresenceAhead={SECTION_MIN_PRESENCE_AHEAD}>
          <Text style={styles.sectionKicker}>CMMS / SaaS industrial</Text>
          <Text style={styles.sectionTitle}>Modulos funcionais selecionados</Text>
          <View style={styles.cardGrid}>
            {view.modules.map(item => (
              <View key={item.id} style={styles.card} wrap={false}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardText} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>{item.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} minPresenceAhead={SECTION_MIN_PRESENCE_AHEAD}>
          <Text style={styles.sectionKicker}>Condicoes comerciais</Text>
          <Text style={styles.sectionTitle}>Modelo de assinatura</Text>
          <View style={styles.commercialGrid} wrap={false}>
            <View style={styles.commercialValue}>
              <Text style={styles.label}>Valor mensal</Text>
              <Text style={styles.bigMoney}>{view.formattedMonthly}</Text>
              <Text style={styles.cardText} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>{view.licenses} licenca(s) - {view.planName}</Text>
            </View>
            <View style={styles.commercialTerms}>
              <Text style={styles.text} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>Setup / implantacao: {view.formattedSetup}</Text>
              <Text style={styles.text} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>Prazo estimado: {view.config.implementationTime}</Text>
              <Text style={styles.text} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>Reajuste: {view.config.adjustment}</Text>
              {view.commercialTerms.map(item => <Text key={item} style={[styles.text, { marginTop: 4 }]} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>- {item}</Text>)}
            </View>
          </View>
        </View>

        <View style={styles.section} minPresenceAhead={SECTION_MIN_PRESENCE_AHEAD}>
          <Text style={styles.sectionKicker}>Opcionais</Text>
          <Text style={styles.sectionTitle}>Matriz de evolucao comercial</Text>
          <View style={styles.cardGrid}>
            {[...view.addons, ...view.futureAddons].map(item => (
              <View key={item.id} style={styles.card} wrap={false}>
                <Text style={styles.label}>{view.addons.some(addon => addon.id === item.id) ? 'Selecionado' : 'Opcional futuro'}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardText} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>{item.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} minPresenceAhead={SECTION_MIN_PRESENCE_AHEAD}>
          <Text style={styles.sectionKicker}>Suporte</Text>
          <Text style={styles.sectionTitle}>SLA de atendimento</Text>
          <View style={styles.summary} wrap={false}>
            <Text style={styles.value}>Plano {view.slaPlan.title} - {view.slaPlan.badge}</Text>
            <Text style={styles.text} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>{view.slaPlan.coverage}. {view.slaPlan.summary} Canal previsto: {view.slaPlan.channel}.</Text>
          </View>
          <View style={[styles.table, { marginTop: 8 }]} minPresenceAhead={TABLE_MIN_PRESENCE_AHEAD}>
            <View style={styles.tableHeader} wrap={false}>
              <Text style={[styles.th, { width: '22%' }]}>Severidade</Text>
              <Text style={[styles.th, { width: '24%' }]}>Primeira resposta</Text>
              <Text style={[styles.th, { width: '54%' }]}>Criterio de priorizacao</Text>
            </View>
            {view.slaPlan.rows.map(row => (
              <View key={row.severity} style={styles.tableRow} wrap={false}>
                <View style={[styles.td, { width: '22%' }]}><Text style={[styles.pill, { backgroundColor: slaToneColor[row.tone] }]}>{row.severity}</Text></View>
                <Text style={[styles.td, { width: '24%', fontWeight: 700 }]}>{row.response}</Text>
                <Text style={[styles.td, { width: '54%' }]} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>{row.description}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.cardText, { marginTop: 7 }]} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>SLA baseado em primeira resposta e priorizacao. Prazos de solucao dependem de diagnostico, evidencias, causa raiz, terceiros e complexidade tecnica.</Text>
        </View>

        <View style={styles.section} minPresenceAhead={SECTION_MIN_PRESENCE_AHEAD}>
          <Text style={styles.sectionKicker}>Responsabilidades</Text>
          <Text style={styles.sectionTitle}>Obrigacoes das partes</Text>
          <View style={styles.cardGrid}>
            {[
              ['Incluido nesta proposta', view.config.includedItems],
              ['Fora do escopo / opcional', view.config.excludedItems],
              ['Lubit/Core', view.config.providerResponsibilities],
              ['Cliente', view.config.clientResponsibilities],
            ].map(([title, items]) => (
              <View key={title as string} style={styles.listCard} minPresenceAhead={CARD_MIN_PRESENCE_AHEAD}>
                <Text style={styles.cardTitle}>{title as string}</Text>
                {(items as string[]).map(item => <Text key={item} style={styles.listItem} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>- {item}</Text>)}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} minPresenceAhead={SECTION_MIN_PRESENCE_AHEAD}>
          <Text style={styles.sectionKicker}>Anexos tecnicos</Text>
          <Text style={styles.sectionTitle}>Referencias de implantacao e governanca</Text>
          <View style={styles.cardGrid}>
            {view.config.technicalAnnexes.map((item, index) => (
              <View key={item} style={styles.card} wrap={false}>
                <Text style={styles.label}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={styles.cardText} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} minPresenceAhead={SECTION_MIN_PRESENCE_AHEAD}>
          <Text style={styles.sectionKicker}>Aceite</Text>
          <Text style={styles.sectionTitle}>Condicoes finais e aprovacao</Text>
          <Text style={styles.text} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>{view.closingNotes}</Text>
          {proposal.saasNotes ? <Text style={[styles.text, { marginTop: 6 }]} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>{proposal.saasNotes}</Text> : null}
        </View>

        <Text style={styles.footer}>
          {safeText(view.companyName)} {safeText(proposal.letterheadConfig?.cnpj) ? `| CNPJ ${safeText(proposal.letterheadConfig?.cnpj)}` : ''} {safeText(proposal.letterheadConfig?.contactEmail) ? `| ${safeText(proposal.letterheadConfig?.contactEmail)}` : ''}
        </Text>
      </Page>
    </Document>
  );
};

const getFinancialRows = (proposal: ProposalData) => {
  if (proposal.pricingModule === 'SAAS_SUBSCRIPTION') {
    const unitPrice = proposal.saasUnitPrice || 0;
    const quantity = proposal.saasQuantity || 1;
    const discount = proposal.saasMonthlyDiscount || 0;
    const setup = proposal.saasSetupFee || 0;
    const months = proposal.saasContractMonths || proposal.contractDuration || 12;
    const grossMrr = unitPrice * quantity;
    const discountAmount = grossMrr * discount;
    const netMrr = Math.max(0, grossMrr - discountAmount);
    return [
      ['Plano/oferta', proposal.saasPlanName || 'Plano'],
      ['Preco mensal unitario', formatCurrency(unitPrice)],
      ['Licencas', String(quantity)],
      ['MRR liquido', formatCurrency(netMrr)],
      ['Implantacao', formatCurrency(setup)],
      ['Prazo', `${months} meses`],
      ['Total do contrato', formatCurrency(netMrr * months + setup)]
    ];
  }

  if (proposal.type === 'PRODUCT') {
    const total = (proposal.productLines || []).reduce((sum, item) => sum + (item.total || 0), 0) || proposal.value || 0;
    return [
      ['Itens', String(proposal.productLines?.length || 0)],
      ['Frete', formatCurrency(proposal.freightValue || 0)],
      ['Desconto', formatCurrency(proposal.discountValue || 0)],
      ['Total comercial', formatCurrency(total)]
    ];
  }

  try {
    const financials = calculateFinancials(proposal);
    return [
      ['Receita bruta', formatCurrency(financials.grossRevenue)],
      ['Mao de obra', formatCurrency(financials.totalLaborCost)],
      ['PLR mensalizado', formatCurrency(financials.monthlyProfitSharingCost)],
      ['Custo direto', formatCurrency(financials.totalDirectCost)],
      ['Impostos', formatCurrency(financials.salesTaxAmount)],
      ['Margem operacional', `${(financials.operationalMarginPercent * 100).toFixed(1)}%`]
    ];
  } catch (_) {
    return [['Valor da proposta', formatCurrency(proposal.value || 0)]];
  }
};

const ProposalPdfDocument: React.FC<{ proposal: ProposalData; template: ProposalTemplateConfig }> = ({ proposal, template }) => {
  if (proposal.pricingModule === 'SAAS_SUBSCRIPTION') {
    return <LubitSaasPdfDocument proposal={proposal} template={template} />;
  }

  const letterhead = proposal.letterheadConfig;
  const primaryColor = letterhead?.primaryColor || '#0f172a';
  const secondaryColor = letterhead?.secondaryColor || '#2563eb';
  const styles = StyleSheet.create({
    page: {
      padding: 36,
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#0f172a',
      backgroundColor: '#ffffff'
    },
    header: {
      borderBottomWidth: 2,
      borderBottomColor: primaryColor,
      paddingBottom: 16,
      marginBottom: 18,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 18
    },
    logo: { width: 82, height: 42, objectFit: 'contain' },
    watermarkLogo: {
      position: 'absolute',
      top: 255,
      left: 92,
      width: 410,
      height: 260,
      objectFit: 'contain',
      opacity: 0.045
    },
    company: { fontSize: 10, color: '#475569', marginTop: 4 },
    title: { fontSize: 22, fontWeight: 700, color: primaryColor, marginBottom: 4 },
    subtitle: { fontSize: 10, color: '#475569' },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: '#eef2ff',
      color: secondaryColor,
      fontSize: 8,
      fontWeight: 700,
      textTransform: 'uppercase'
    },
    section: {
      marginTop: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0'
    },
    sectionTitle: { fontSize: 11, fontWeight: 700, color: primaryColor, marginBottom: 6 },
    paragraph: { lineHeight: 1.45, color: '#334155' },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      paddingVertical: 7
    },
    labelCell: { width: '42%', color: '#64748b', fontWeight: 700 },
    valueCell: { width: '58%', color: '#0f172a', fontWeight: 700 },
    productHeader: {
      flexDirection: 'row',
      backgroundColor: '#f8fafc',
      borderBottomWidth: 1,
      borderBottomColor: '#cbd5e1',
      padding: 6,
      marginTop: 8
    },
    productRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      padding: 6
    },
    colName: { width: '48%' },
    colSmall: { width: '13%', textAlign: 'right' },
    footer: {
      position: 'absolute',
      left: 36,
      right: 36,
      bottom: 24,
      color: '#64748b',
      fontSize: 8,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      paddingTop: 8
    }
  });

  const renderTemplateText = (value: string) => applyProposalTemplateVariables(value, proposal, template);
  const financialRows = getFinancialRows(proposal);

  return (
    <Document title={`Proposta ${proposal.proposalId}`}>
      <Page size="A4" style={styles.page}>
        {letterhead?.logoUrl ? <Image src={letterhead.logoUrl} style={styles.watermarkLogo} fixed /> : null}
        <View style={styles.header} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text style={styles.badge}>{PROPOSAL_TEMPLATE_LABELS[template.kind]}</Text>
            <Text style={styles.title}>Proposta tecnico-comercial</Text>
            <Text style={styles.subtitle}>Cliente: {proposal.clientName}</Text>
            <Text style={styles.subtitle}>Proposta: {proposal.proposalId}</Text>
            <Text style={styles.subtitle}>Validade: {proposal.expirationDate ? new Date(proposal.expirationDate).toLocaleDateString('pt-BR') : '-'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {letterhead?.logoUrl ? <Image src={letterhead.logoUrl} style={styles.logo} /> : null}
            <Text style={styles.company}>{letterhead?.companyName || ''}</Text>
            <Text style={styles.company}>{letterhead?.website || ''}</Text>
          </View>
        </View>

        <View minPresenceAhead={SECTION_MIN_PRESENCE_AHEAD}>
          <Text style={styles.paragraph} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>{renderTemplateText(template.introduction)}</Text>
        </View>

        <View style={styles.section} minPresenceAhead={SECTION_MIN_PRESENCE_AHEAD}>
          <Text style={styles.sectionTitle}>Resumo comercial</Text>
          {financialRows.map(([label, value]) => (
            <View key={label} style={styles.row} wrap={false}>
              <Text style={styles.labelCell}>{label}</Text>
              <Text style={styles.valueCell}>{value}</Text>
            </View>
          ))}
          <View style={styles.row} wrap={false}>
            <Text style={styles.labelCell}>Valor de referencia</Text>
            <Text style={styles.valueCell}>{formatCurrency(getProposalDisplayValue(proposal))}</Text>
          </View>
        </View>

        {proposal.type === 'PRODUCT' && proposal.productLines?.length ? (
          <View style={styles.section} minPresenceAhead={SECTION_MIN_PRESENCE_AHEAD}>
            <Text style={styles.sectionTitle}>Itens da proposta</Text>
            <View style={styles.productHeader} wrap={false}>
              <Text style={[styles.colName, { fontWeight: 700 }]}>Item</Text>
              <Text style={[styles.colSmall, { fontWeight: 700 }]}>Qtd.</Text>
              <Text style={[styles.colSmall, { fontWeight: 700 }]}>Un.</Text>
              <Text style={[styles.colSmall, { fontWeight: 700 }]}>Preco</Text>
              <Text style={[styles.colSmall, { fontWeight: 700 }]}>Total</Text>
            </View>
            {proposal.productLines.map(item => (
              <View key={item.id} style={styles.productRow} wrap={false}>
                <Text style={styles.colName} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>{item.name}</Text>
                <Text style={styles.colSmall}>{item.quantity}</Text>
                <Text style={styles.colSmall}>{item.unit || 'UN'}</Text>
                <Text style={styles.colSmall}>{formatCurrency(item.finalPrice || 0)}</Text>
                <Text style={styles.colSmall}>{formatCurrency(item.total || 0)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {[
          ['Escopo', template.scope],
          ['Condicoes comerciais', template.commercialConditions],
          ['Termos', template.terms],
          ['Observacoes finais', `${template.closingNotes}${proposal.saasNotes ? `\n\n${proposal.saasNotes}` : ''}`]
        ].map(([title, body]) => (
          <View key={title} style={styles.section} minPresenceAhead={SECTION_MIN_PRESENCE_AHEAD}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.paragraph} orphans={TEXT_ORPHANS} widows={TEXT_WIDOWS}>{renderTemplateText(body)}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          {safeText(letterhead?.companyName)} {safeText(letterhead?.cnpj) ? `| CNPJ ${safeText(letterhead?.cnpj)}` : ''} {safeText(letterhead?.contactEmail) ? `| ${safeText(letterhead?.contactEmail)}` : ''}
        </Text>
      </Page>
    </Document>
  );
};

export const generateProposalPdfBlob = (proposal: ProposalData, template: ProposalTemplateConfig) =>
  pdf(<ProposalPdfDocument proposal={proposal} template={template} />).toBlob();

export const getProposalPdfTemplate = (proposal: ProposalData) =>
  mergeProposalTemplates(proposal.proposalTemplates, proposal.letterheadConfig?.companyName)[getProposalTemplateKind(proposal)];

export const getProposalPdfFileName = (proposal: ProposalData, template: ProposalTemplateConfig) => {
  const modality = template.kind.toLowerCase().replace(/_/g, '-');
  const proposalNumber = (proposal.proposalId || 'proposta').replace(/[^\w-]/g, '');
  return `proposta-${modality}-${proposalNumber}.pdf`;
};

export const downloadProposalPdf = async (proposal: ProposalData, template: ProposalTemplateConfig) => {
  const blob = await generateProposalPdfBlob(proposal, template);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getProposalPdfFileName(proposal, template);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const result = String(reader.result || '');
    resolve(result.includes(',') ? result.split(',')[1] : result);
  };
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export const generateProposalEmailAttachment = async (
  proposal: ProposalData,
  template: ProposalTemplateConfig = getProposalPdfTemplate(proposal)
): Promise<EmailAttachment> => {
  const blob = await generateProposalPdfBlob(proposal, template);
  return {
    fileName: getProposalPdfFileName(proposal, template),
    contentType: 'application/pdf',
    base64Content: await blobToBase64(blob)
  };
};
