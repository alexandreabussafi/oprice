
import { ProposalData, CalculatedFinancials, AccountingMapping } from '../types';

/**
 * Biblioteca de Matemática Financeira Segura (Integer Math)
 * Política B: Arredondamento em cada etapa monetária (2 casas)
 */
const PricingMath = {
  // Arredonda um float para 2 casas decimais de forma segura
  round: (value: number): number => {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  },

  // Multiplica Valor * Taxa e arredonda o resultado imediatamente
  // Ex: 100.00 * 0.1633 = 16.33
  multiply: (value: number, rate: number): number => {
    return PricingMath.round(value * rate);
  },

  // Soma segura
  add: (a: number, b: number): number => {
    return PricingMath.round(a + b);
  },

  // Gross Up: Net / (1 - Tax)
  grossUp: (netValue: number, taxRate: number): number => {
    const divisor = 1 - taxRate;
    if (divisor <= 0.0001) return netValue; // Evita divisão por zero
    return PricingMath.round(netValue / divisor);
  }
};

export interface ExtendedFinancials extends CalculatedFinancials {
  contingencyAmount: number;
  financialCostAmount: number;
  totalCostWithContingency: number;
  revenueDeductionsAmount: number;
  effectiveIssRate?: number;
}

export const calculateFinancials = (data: ProposalData): ExtendedFinancials => {
  // --- 0. MARKUP EFFECTIVE RATE LOGIC ---
  let effectiveMarkupRate = data.markup;

  if (data.pricingModel === 'MARGIN' && data.targetMargin !== undefined) {
    const safeMargin = Math.min(data.targetMargin, 0.9999);
    effectiveMarkupRate = safeMargin / (1 - safeMargin);
  }

  // --- LOGICA HIBRIDA: SPOT VS CONTINUOUS ---
  let totalLaborCost = 0;
  let totalOperationalCost = 0;
  let totalSafetyCost = 0;
  let totalSupportCost = 0;

  if (data.type === 'SPOT') {
    // Cálculo Spot: Simples e Direto
    // Labor = Resources * Days * Rate
    (data.spotResources || []).forEach(res => {
      const resTotal = PricingMath.round(res.dailyRateCost * res.days * res.quantity);
      totalLaborCost = PricingMath.add(totalLaborCost, resTotal);
    });

    // Operational = Travel/Expenses
    (data.spotExpenses || []).forEach(exp => {
      const expTotal = PricingMath.round(exp.unitCost * exp.quantity);
      totalOperationalCost = PricingMath.add(totalOperationalCost, expTotal);
    });

    // Safety/Support usually included in Daily Rate or Expenses for Spot, so kept 0 or manually added
    // Se quiser usar os arrays padrão para spot, poderia somar aqui, mas vamos manter separado por enquanto.

  } else {
    // Cálculo Continuous (Padrão Original)
    data.roles.forEach(role => {
      let baseSalary = role.baseSalary;
      let addOns = 0;

      if (role.additionalHazard) addOns += PricingMath.multiply(baseSalary, 0.20);
      if (role.additionalDanger) addOns += PricingMath.multiply(baseSalary, 0.30);

      const unitBase = PricingMath.add(baseSalary, addOns);
      const unitCharges = PricingMath.multiply(unitBase, data.taxConfig.socialChargesRate);
      const unitTotalCost = PricingMath.add(unitBase, unitCharges);

      totalLaborCost = PricingMath.add(totalLaborCost, unitTotalCost * role.quantity);
    });

    const operationalHeadcount = data.roles
      .filter(r => r.category === 'Operational')
      .reduce((acc, r) => acc + r.quantity, 0);

    // 2. Despesas Operacionais
    data.expenses.forEach(exp => {
      const months = exp.lifespan > 0 ? exp.lifespan : 1;
      const monthlyAmortization = exp.unitPrice / months;
      const quantity = exp.allocation === 'PerHead' ? operationalHeadcount : 1;
      const itemTotal = PricingMath.round(monthlyAmortization * quantity);
      totalOperationalCost = PricingMath.add(totalOperationalCost, itemTotal);
    });

    // 3. Custos de Segurança
    (data.safetyCosts || []).forEach(item => {
      if (item.active) {
        const months = item.frequencyMonths > 0 ? item.frequencyMonths : 12;
        const monthlyAmortization = item.costPerHead / months;
        const itemTotal = PricingMath.round(monthlyAmortization * operationalHeadcount);
        totalSafetyCost = PricingMath.add(totalSafetyCost, itemTotal);
      }
    });

    // 4. Custos de Suporte
    (data.supportCosts || []).forEach(item => {
      const itemTotal = PricingMath.round(item.costPerVisit * item.quantity);
      totalSupportCost = PricingMath.add(totalSupportCost, itemTotal);
    });
  }

  // 5. Custos Diretos Totais (CD)
  const totalDirectCost = PricingMath.add(
    PricingMath.add(totalLaborCost, totalOperationalCost),
    PricingMath.add(totalSafetyCost, totalSupportCost)
  );

  // --- PRICING LOGIC (SHARED) ---

  // A. CONTINGÊNCIA (Sobre o Custo Direto)
  const contingencyAmount = PricingMath.multiply(totalDirectCost, data.contingencyRate);
  const totalCostWithContingency = PricingMath.add(totalDirectCost, contingencyAmount);

  // B. NUMERADOR (Custo Inflado + Lucro)
  const markupAmountTarget = PricingMath.multiply(totalCostWithContingency, effectiveMarkupRate);
  const numerator = PricingMath.add(totalCostWithContingency, markupAmountTarget);

  // C. DIVISOR (Impostos + Custo Financeiro)
  // Tax Override Logic (ISS/Service Tax)
  let effectiveSalesTaxes = data.taxConfig.salesTaxes;
  if (data.issTaxOverride !== undefined && data.issTaxOverride >= 0) {
    effectiveSalesTaxes = data.taxConfig.salesTaxes.map(t => {
      if (t.isServiceTax) return { ...t, rate: data.issTaxOverride! };
      return t;
    });
  }

  const activeSalesRate = effectiveSalesTaxes.filter(t => t.active).reduce((acc, t) => acc + t.rate, 0);
  const activeIncomeRate = data.taxConfig.incomeTaxes.filter(t => t.active).reduce((acc, t) => acc + t.rate, 0);

  let taxesInDivisor = activeSalesRate;
  // REMOVED: In COMMERCIAL mode we do not put activeIncomeRate in the divisor anymore, 
  // to avoid charging income tax over the gross revenue as if it was a sales tax.

  const revenueDeductionsRate = data.financialCostRate;
  const totalDivisorRate = taxesInDivisor + revenueDeductionsRate;

  // D. Preço Final
  const grossRevenue = PricingMath.grossUp(numerator, totalDivisorRate);

  // E. Valores Absolutos
  const financialCostAmount = PricingMath.multiply(grossRevenue, data.financialCostRate);
  const salesTaxAmount = PricingMath.multiply(grossRevenue, activeSalesRate);

  let revenueDeductionsAmount = PricingMath.add(salesTaxAmount, financialCostAmount);

  // F. Resultado Operacional Real (Markup Real - Contábil)
  const netRevenue = PricingMath.add(grossRevenue, -salesTaxAmount);

  let incomeTaxAmount = 0;
  if (data.taxConfig.calculationMode === 'NORMATIVE') {
    incomeTaxAmount = PricingMath.multiply(markupAmountTarget, activeIncomeRate);
  } else {
    // Em Lucro Real (COMMERCIAL), o IR incide sobre o Lucro antes do IR (EBT) e não sobre a Receita Bruta
    // Como simplificação inicial para manter a margem, calculamos como proporção da receita líquida - custos
    const ebtEstimate = netRevenue - totalDirectCost - financialCostAmount - contingencyAmount;
    incomeTaxAmount = PricingMath.multiply(ebtEstimate > 0 ? ebtEstimate : 0, activeIncomeRate);
    revenueDeductionsAmount = PricingMath.add(revenueDeductionsAmount, incomeTaxAmount);
  }

  const totalIndirectCost = PricingMath.add(contingencyAmount, financialCostAmount);
  const totalCostBase = PricingMath.add(totalDirectCost, totalIndirectCost);

  let markupAmount = grossRevenue;
  markupAmount -= salesTaxAmount;
  markupAmount -= financialCostAmount;
  if (data.taxConfig.calculationMode === 'COMMERCIAL') markupAmount -= incomeTaxAmount;
  markupAmount -= contingencyAmount;
  markupAmount -= totalDirectCost;
  markupAmount = PricingMath.round(markupAmount);

  // G. INDICADORES DRE (Top-Down)

  const contributionMarginAmount = PricingMath.round(netRevenue - totalDirectCost);
  const contributionMarginPercent = grossRevenue > 0 ? (contributionMarginAmount / grossRevenue) * 100 : 0;

  let operationalProfitAmount = contributionMarginAmount;
  operationalProfitAmount -= contingencyAmount;
  operationalProfitAmount = PricingMath.round(operationalProfitAmount);

  const operationalMarginPercent = grossRevenue > 0 ? (operationalProfitAmount / grossRevenue) * 100 : 0;

  const grossMarginPercent = grossRevenue > 0 ? (markupAmount / grossRevenue) * 100 : 0;

  let netProfitAmount = markupAmount;
  if (data.taxConfig.calculationMode === 'NORMATIVE') {
    netProfitAmount = PricingMath.add(markupAmount, -incomeTaxAmount);
  }

  const netProfitPercent = grossRevenue > 0 ? (netProfitAmount / grossRevenue) * 100 : 0;

  return {
    totalLaborCost,
    totalOperationalCost,
    totalSafetyCost,
    totalSupportCost,
    totalDirectCost,
    contingencyAmount,
    financialCostAmount,
    totalCostWithContingency,
    revenueDeductionsAmount,
    totalIndirectCost,
    totalCostBase,
    markupAmount,
    netRevenue,
    grossRevenue,

    // New Fields
    contributionMarginAmount,
    contributionMarginPercent,

    operationalProfitAmount,
    operationalMarginPercent,

    salesTaxAmount,
    incomeTaxAmount,
    grossMarginPercent,
    netProfitAmount,
    netProfitPercent,
    monthlyValue: grossRevenue, // Para Spot, isso é o valor Total do Projeto. Para Continuous, é o valor mensal.
    annualValue: data.type === 'SPOT' ? grossRevenue : grossRevenue * 12,
    effectiveIssRate: data.issTaxOverride
  };
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatPercent = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};


// --- FINANCIAL PROJECTIONS (DRE & CASH FLOW) ---

export interface FinancialMonth {
  monthIndex: number;
  label: string;
  date: string;
  dre: {
    grossRevenue: number;
    deductionTaxes: number;
    netRevenue: number;
    directLabor: number;
    operationalCosts: number;
    safetyCosts: number;
    supportCosts: number;
    grossProfit: number;
    indirectCosts: number;
    ebitda: number;
    financialResult: number;
    ebt: number;
    taxesOnProfit: number;
    netIncome: number;
  };
  cashFlow: {
    inflow: number;
    outflowLabor: number;
    outflowTaxes: number;
    outflowSuppliers: number;
    outflowFinancial: number;
    totalOutflow: number;
    netCash: number;
    cumulativeCash: number;
  };
}

export interface FinancialProjection {
  timeline: FinancialMonth[];
  indicators: {
    paybackMonth: number;
    npv: number;
    irr: number;
    totalInvestment: number;
    roi: number;
  }
}

// Helper: Calculate IRR using Newton-Raphson approximation
const calculateIRR = (cashFlows: number[], guess = 0.1): number => {
  const hasPositive = cashFlows.some(v => v > 0);
  const hasNegative = cashFlows.some(v => v < 0);

  if (!hasPositive || !hasNegative) {
    return 0;
  }

  const maxIterations = 1000;
  const tolerance = 0.00001;
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dNpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const factor = Math.pow(1 + rate, t);
      npv += cashFlows[t] / factor;
      dNpv -= (t * cashFlows[t]) / (factor * (1 + rate));
    }

    if (Math.abs(dNpv) < 0.0000001) {
      return 0;
    }

    const newRate = rate - npv / dNpv;

    if (Math.abs(newRate - rate) < tolerance) {
      if (!isFinite(newRate) || isNaN(newRate)) return 0;
      return newRate;
    }

    rate = newRate;
  }

  return 0;
};

export const generateFinancialProjections = (data: ProposalData, accountingConfig?: AccountingMapping): FinancialProjection => {
  const financials = calculateFinancials(data);
  const months: FinancialMonth[] = [];

  // Simplificação para SPOT: 1 mês de execução (ou duração)
  const isSpot = data.type === 'SPOT';
  const mobilizationMonths = isSpot ? 0 : (data.mobilizationMonths || 1);
  const contractDuration = isSpot ? 1 : (data.contractDuration || 12);
  const paymentTermDays = data.paymentTermDays || 30;
  const supplierTermDays = data.supplierPaymentTermDays || 30;
  const discountRateAnnual = data.wacc || 0.12;
  const discountRateMonthly = Math.pow(1 + discountRateAnnual, 1 / 12) - 1;

  const receiptLag = Math.ceil(paymentTermDays / 30);
  const supplierLag = Math.ceil(supplierTermDays / 30);
  const laborLag = 1;
  const taxLag = 1;

  let cumulativeCash = 0;
  let minCash = 0;

  const maxTimeline = contractDuration + receiptLag + 1;
  const startDate = data.contractStartDate ? new Date(data.contractStartDate) : new Date();
  const projectStartDate = new Date(startDate);
  projectStartDate.setMonth(projectStartDate.getMonth() - mobilizationMonths);

  for (let i = -mobilizationMonths; i < maxTimeline; i++) {
    const isMobilization = i < 0;
    const isContractPeriod = i >= 0 && i < contractDuration;

    let monthLabel = '';
    if (isMobilization) monthLabel = `Mob ${i + mobilizationMonths + 1}`;
    else if (i < contractDuration) monthLabel = `Mês ${i + 1}`;
    else monthLabel = `Pós ${i - contractDuration + 1}`;

    const currentDate = new Date(projectStartDate);
    currentDate.setMonth(currentDate.getMonth() + (i + mobilizationMonths));
    const dateStr = currentDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

    const hasRevenue = isContractPeriod;
    const opFactor = isMobilization ? 0.6 : (isContractPeriod ? 1.0 : 0);

    const dre = {
      grossRevenue: hasRevenue ? financials.monthlyValue : 0,
      deductionTaxes: hasRevenue ? financials.salesTaxAmount : 0,
      netRevenue: hasRevenue ? financials.netRevenue : 0,

      directLabor: PricingMath.multiply(financials.totalLaborCost, opFactor),
      operationalCosts: PricingMath.multiply(financials.totalOperationalCost, opFactor),
      safetyCosts: PricingMath.multiply(financials.totalSafetyCost, opFactor),
      supportCosts: PricingMath.multiply(financials.totalSupportCost, opFactor),

      get grossProfit() { return PricingMath.round(this.netRevenue - (this.directLabor + this.operationalCosts + this.safetyCosts + this.supportCosts)) },

      indirectCosts: PricingMath.multiply(financials.contingencyAmount, opFactor),

      get ebitda() { return PricingMath.round(this.grossProfit - this.indirectCosts) },

      financialResult: hasRevenue ? -financials.financialCostAmount : 0,

      get ebt() { return PricingMath.round(this.ebitda + this.financialResult) },

      taxesOnProfit: hasRevenue ? financials.incomeTaxAmount : 0,

      get netIncome() { return PricingMath.round(this.ebt - this.taxesOnProfit) }
    };

    const getMonthDRE = (targetIndex: number) => {
      if (targetIndex >= 0 && targetIndex < contractDuration) return { ...financials, opFactor: 1 };
      if (targetIndex >= -mobilizationMonths && targetIndex < 0) return { ...financials, monthlyValue: 0, salesTaxAmount: 0, opFactor: 0.6 };
      return { monthlyValue: 0, salesTaxAmount: 0, totalLaborCost: 0, totalOperationalCost: 0, totalSafetyCost: 0, totalSupportCost: 0, opFactor: 0, incomeTaxAmount: 0, financialCostAmount: 0, contingencyAmount: 0 };
    };

    const revenueSourceMonth = i - receiptLag;
    const inflow = (revenueSourceMonth >= 0 && revenueSourceMonth < contractDuration) ? financials.monthlyValue : 0;

    const laborSource = getMonthDRE(i - laborLag);
    const outflowLabor = laborSource.totalLaborCost * laborSource.opFactor;

    const taxSource = getMonthDRE(i - taxLag);
    const outflowTaxes = (taxSource.salesTaxAmount + taxSource.incomeTaxAmount) * (taxSource.monthlyValue > 0 ? 1 : 0);

    const supplierSource = getMonthDRE(i - supplierLag);
    const supplierCosts = (supplierSource.totalOperationalCost + supplierSource.totalSafetyCost + supplierSource.totalSupportCost + supplierSource.contingencyAmount) * supplierSource.opFactor;
    const outflowSuppliers = supplierCosts;

    const financialSource = getMonthDRE(i);
    const outflowFinancial = financialSource.financialCostAmount * (financialSource.monthlyValue > 0 ? 1 : 0);

    const totalOutflow = outflowLabor + outflowTaxes + outflowSuppliers + outflowFinancial;
    const netCash = inflow - totalOutflow;

    cumulativeCash += netCash;
    if (cumulativeCash < minCash) minCash = cumulativeCash;

    months.push({
      monthIndex: i,
      label: monthLabel,
      date: dateStr,
      dre,
      cashFlow: {
        inflow,
        outflowLabor,
        outflowTaxes,
        outflowSuppliers,
        outflowFinancial,
        totalOutflow,
        netCash,
        cumulativeCash
      }
    });
  }

  const paybackMonthData = months.find(m => m.cashFlow.cumulativeCash >= 0 && m.monthIndex >= 0);
  const paybackMonth = paybackMonthData ? paybackMonthData.monthIndex + 1 : 0;

  let npv = 0;
  const netCashFlows: number[] = [];

  months.forEach((m, index) => {
    npv += m.cashFlow.netCash / Math.pow(1 + discountRateMonthly, index);
    netCashFlows.push(m.cashFlow.netCash);
  });

  const irrMonthly = calculateIRR(netCashFlows);
  // Para SPOT projects (curta duração), anualizar a TIR infla irrealisticamente o número.
  // Usaremos a TIR do período para SPOT, e a TIR Anualizada para Contratos Contínuos.
  const irrAnnual = isSpot ? irrMonthly : (Math.pow(1 + irrMonthly, 12) - 1);

  const totalProfit = months.reduce((acc, m) => acc + m.dre.netIncome, 0);
  const roi = (Math.abs(minCash) > 0.01) ? (totalProfit / Math.abs(minCash)) * 100 : 0;

  return {
    timeline: months,
    indicators: {
      paybackMonth,
      npv,
      irr: irrAnnual,
      totalInvestment: Math.abs(minCash),
      roi
    }
  };
};
