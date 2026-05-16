import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { ProposalData, ProposalTemplateConfig } from '../types';
import { calculateFinancials, formatCurrency } from '../utils/pricingEngine';
import { applyProposalTemplateVariables, getProposalDisplayValue, PROPOSAL_TEMPLATE_LABELS } from '../utils/proposalTemplates';

const safeText = (value?: string | number) => String(value ?? '').trim();

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
      ['Custo direto', formatCurrency(financials.totalDirectCost)],
      ['Impostos', formatCurrency(financials.salesTaxAmount)],
      ['Margem operacional', `${(financials.operationalMarginPercent * 100).toFixed(1)}%`]
    ];
  } catch (_) {
    return [['Valor da proposta', formatCurrency(proposal.value || 0)]];
  }
};

const ProposalPdfDocument: React.FC<{ proposal: ProposalData; template: ProposalTemplateConfig }> = ({ proposal, template }) => {
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
        <View style={styles.header}>
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

        <View>
          <Text style={styles.paragraph}>{renderTemplateText(template.introduction)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo comercial</Text>
          {financialRows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.labelCell}>{label}</Text>
              <Text style={styles.valueCell}>{value}</Text>
            </View>
          ))}
          <View style={styles.row}>
            <Text style={styles.labelCell}>Valor de referencia</Text>
            <Text style={styles.valueCell}>{formatCurrency(getProposalDisplayValue(proposal))}</Text>
          </View>
        </View>

        {proposal.type === 'PRODUCT' && proposal.productLines?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Itens da proposta</Text>
            <View style={styles.productHeader}>
              <Text style={[styles.colName, { fontWeight: 700 }]}>Item</Text>
              <Text style={[styles.colSmall, { fontWeight: 700 }]}>Qtd.</Text>
              <Text style={[styles.colSmall, { fontWeight: 700 }]}>Un.</Text>
              <Text style={[styles.colSmall, { fontWeight: 700 }]}>Preco</Text>
              <Text style={[styles.colSmall, { fontWeight: 700 }]}>Total</Text>
            </View>
            {proposal.productLines.map(item => (
              <View key={item.id} style={styles.productRow}>
                <Text style={styles.colName}>{item.name}</Text>
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
          <View key={title} style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.paragraph}>{renderTemplateText(body)}</Text>
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
