import { describe, expect, it } from 'vitest';
import type { ProposalData } from '../types';
import { calculateFinancials, generateFinancialProjections } from '../utils/pricingEngine';

const baseProposal = (overrides: Partial<ProposalData> = {}): ProposalData => ({
  id: 'test-proposal',
  proposalId: 'TEST-001',
  version: 1,
  versionStatus: 'DRAFT',
  isCurrentVersion: true,
  type: 'CONTINUOUS',
  pricingModule: 'SERVICES_COMPLEX',
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
  expirationDate: '2026-01-31',
  responsible: 'Pricing Test',
  clientName: 'Cliente Teste',
  stage: 'Pricing',
  status: 'Active',
  motion: 'NewBusiness',
  probability: 50,
  value: 0,
  pricingModel: 'MARKUP',
  markup: 0,
  financialCostRate: 0,
  contingencyRate: 0,
  contractStartDate: '2026-01-01',
  mobilizationMonths: 1,
  contractDuration: 12,
  paymentTermDays: 30,
  supplierPaymentTermDays: 30,
  payrollCashFlowDay: 5,
  wacc: 0.12,
  roles: [],
  expenses: [],
  safetyCosts: [],
  supportCosts: [],
  profitSharingInstallments: [],
  spotResources: [],
  spotExpenses: [],
  productLines: [],
  taxConfig: {
    regime: 'Lucro Real',
    calculationMode: 'NORMATIVE',
    socialChargesRate: 0,
    chargesBreakdown: {
      groupA: [],
      groupB: [],
      groupC: [],
      groupD: []
    },
    salesTaxes: [],
    incomeTaxes: [],
    revenueTaxesRate: 0
  },
  documents: {
    clientMemo: '',
    deliverables: '',
    technicalAssumptions: '',
    attachments: []
  },
  ...overrides
});

describe('pricingEngine PLR', () => {
  it('rateia uma parcela unica de julho no preco mensal e lanca DRE/caixa em julho', () => {
    const proposal = baseProposal({
      profitSharingInstallments: [
        { id: 'plr-jul', competenceMonth: 7, amount: 1200, active: true }
      ]
    });

    const financials = calculateFinancials(proposal);
    const projections = generateFinancialProjections(proposal);
    const june = projections.timeline.find(month => month.monthIndex === 5);
    const july = projections.timeline.find(month => month.monthIndex === 6);

    expect(financials.totalProfitSharingCost).toBe(1200);
    expect(financials.monthlyProfitSharingCost).toBe(100);
    expect(financials.totalDirectCost).toBe(100);
    expect(financials.monthlyValue).toBe(100);
    expect(june?.dre.profitSharing).toBe(0);
    expect(june?.cashFlow.outflowProfitSharing).toBe(0);
    expect(july?.dre.profitSharing).toBe(1200);
    expect(july?.cashFlow.outflowProfitSharing).toBe(1200);
    expect(july?.dre.netIncome).toBe(-1100);
  });

  it('mantem o mesmo preco mensal para duas parcelas com mesmo total anual e concentra o impacto nos meses configurados', () => {
    const oneInstallment = baseProposal({
      profitSharingInstallments: [
        { id: 'plr-jul', competenceMonth: 7, amount: 1200, active: true }
      ]
    });
    const twoInstallments = baseProposal({
      profitSharingInstallments: [
        { id: 'plr-mar', competenceMonth: 3, amount: 600, active: true },
        { id: 'plr-nov', competenceMonth: 11, amount: 600, active: true }
      ]
    });

    const oneFinancials = calculateFinancials(oneInstallment);
    const twoFinancials = calculateFinancials(twoInstallments);
    const projections = generateFinancialProjections(twoInstallments);

    expect(twoFinancials.monthlyValue).toBe(oneFinancials.monthlyValue);
    expect(projections.timeline.find(month => month.monthIndex === 2)?.dre.profitSharing).toBe(600);
    expect(projections.timeline.find(month => month.monthIndex === 10)?.dre.profitSharing).toBe(600);
    expect(projections.timeline.find(month => month.monthIndex === 6)?.dre.profitSharing).toBe(0);
  });

  it('repete competencias calendario dentro de contratos que atravessam anos', () => {
    const proposal = baseProposal({
      contractDuration: 24,
      profitSharingInstallments: [
        { id: 'plr-jul', competenceMonth: 7, amount: 1000, active: true }
      ]
    });

    const financials = calculateFinancials(proposal);
    const projections = generateFinancialProjections(proposal);

    expect(financials.totalProfitSharingCost).toBe(2000);
    expect(financials.monthlyProfitSharingCost).toBe(83.33);
    expect(projections.timeline.find(month => month.monthIndex === 6)?.cashFlow.outflowProfitSharing).toBe(1000);
    expect(projections.timeline.find(month => month.monthIndex === 18)?.cashFlow.outflowProfitSharing).toBe(1000);
  });

  it('mantem o calculo atual quando nao ha PLR', () => {
    const financials = calculateFinancials(baseProposal());

    expect(financials.totalProfitSharingCost).toBe(0);
    expect(financials.monthlyProfitSharingCost).toBe(0);
    expect(financials.totalDirectCost).toBe(0);
    expect(financials.monthlyValue).toBe(0);
  });

  it('ignora PLR em propostas spot e product', () => {
    const profitSharingInstallments = [
      { id: 'plr-jul', competenceMonth: 7, amount: 1200, active: true }
    ];
    const spot = baseProposal({
      type: 'SPOT',
      profitSharingInstallments,
      spotResources: [{ id: 'res-1', roleName: 'Tecnico', dailyRateCost: 500, days: 1, quantity: 1 }]
    });
    const product = baseProposal({
      type: 'PRODUCT',
      pricingModule: 'PRODUCT_SALES',
      profitSharingInstallments
    });

    expect(calculateFinancials(spot).totalProfitSharingCost).toBe(0);
    expect(calculateFinancials(spot).monthlyValue).toBe(500);
    expect(calculateFinancials(product).totalProfitSharingCost).toBe(0);
    expect(calculateFinancials(product).monthlyValue).toBe(0);
  });
});
