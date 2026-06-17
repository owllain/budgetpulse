/**
 * Financial calculation utilities for Costa Rica
 * Includes: compound interest, loan amortization, aguinaldo, etc.
 */

// Format currency for Costa Rica
export function formatCRC(amount: number, currency: string = 'CRC'): string {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Calculate monthly payment for amortizing loan (French system)
export function calcAmortizationPayment(
  principal: number,
  annualRate: number,
  months: number
): number {
  if (annualRate === 0) return principal / months
  const monthlyRate = annualRate / 12
  const factor = Math.pow(1 + monthlyRate, months)
  return principal * (monthlyRate * factor) / (factor - 1)
}

// Generate full amortization schedule
export interface AmortizationRow {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
}

export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  months: number
): AmortizationRow[] {
  const schedule: AmortizationRow[] = []
  const monthlyRate = annualRate / 12
  const monthlyPayment = calcAmortizationPayment(principal, annualRate, months)
  let balance = principal

  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate
    const principalPart = monthlyPayment - interest
    balance -= principalPart
    schedule.push({
      month: i,
      payment: monthlyPayment,
      principal: principalPart,
      interest,
      balance: Math.max(0, balance),
    })
  }
  return schedule
}

// Credit card minimum payment calculation (Costa Rica - Banco Popular style)
export interface CreditCardCalcResult {
  minimumPayment: number
  contadoPayment: number
  amortization: number
  interest: number
  charges: number
  loyaltyPayments: number
  overdraftAndLate: number
}

export function calcCreditCardMinimum(
  principal: number,
  annualRate: number,
  charges: number = 0,
  loyaltyCuota: number = 0,
  minicuotasCuota: number = 0,
  overdraft: number = 0,
  latePayments: number = 0,
  averageBalance?: number,
  currency: string = 'CRC'
): CreditCardCalcResult {
  const config: Record<string, { floorMin: number }> = {
    CRC: { floorMin: 4000 },
    USD: { floorMin: 10 },
  }
  const floorMin = config[currency]?.floorMin || 4000
  const effectiveBalance = averageBalance ?? principal
  const monthlyRate = annualRate / 12
  const interest = effectiveBalance * monthlyRate
  let amortization = principal / 60 // P/60
  let subtotalMin = amortization + interest + charges
  const loyaltyPayments = loyaltyCuota + minicuotasCuota
  const overdraftAndLate = overdraft + latePayments

  if (principal > 0 && subtotalMin < floorMin && subtotalMin > 0) {
    amortization += floorMin - subtotalMin
    subtotalMin = floorMin
  }

  const minimumPayment = subtotalMin + loyaltyPayments + overdraftAndLate
  const contadoPayment = principal + interest + charges + loyaltyPayments + overdraftAndLate

  return {
    minimumPayment,
    contadoPayment,
    amortization,
    interest,
    charges,
    loyaltyPayments,
    overdraftAndLate,
  }
}

// Compound interest projection for credit card debt
export interface CompoundProjection {
  month: number
  balance: number
  interestAccumulated: number
  totalPaid: number
}

export function projectCreditCardDebt(
  principal: number,
  annualRate: number,
  monthlyPayment: number,
  months: number
): CompoundProjection[] {
  const projections: CompoundProjection[] = []
  const monthlyRate = annualRate / 12
  let balance = principal
  let interestAccumulated = 0
  let totalPaid = 0

  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate
    interestAccumulated += interest
    balance = balance + interest - monthlyPayment
    totalPaid += monthlyPayment
    if (balance < 0) balance = 0
    projections.push({
      month: i,
      balance,
      interestAccumulated,
      totalPaid,
    })
    if (balance === 0) break
  }
  return projections
}

// Calculate how long to pay off credit card
export function calcPayoffTime(
  principal: number,
  annualRate: number,
  monthlyPayment: number
): { months: number; totalInterest: number; totalPaid: number } {
  const monthlyRate = annualRate / 12
  let balance = principal
  let totalInterest = 0
  let totalPaid = 0
  let months = 0

  while (balance > 0 && months < 600) {
    const interest = balance * monthlyRate
    totalInterest += interest
    if (monthlyPayment <= interest) {
      // Payment doesn't cover interest - debt grows forever
      return { months: -1, totalInterest: Infinity, totalPaid: Infinity }
    }
    balance = balance + interest - monthlyPayment
    totalPaid += monthlyPayment
    months++
    if (balance < 0) {
      totalPaid += balance // adjust for overpayment
      balance = 0
    }
  }
  return { months, totalInterest, totalPaid }
}

// Costa Rica Aguinaldo calculation
// Aguinaldo = promedio de los 12 salarios del año (diciembre del año anterior a noviembre del año actual)
export interface AguinaldoResult {
  salaries: number[]
  totalGross: number
  averageSalary: number
  aguinaldoAmount: number
}

export function calcAguinaldo(salaries: number[]): AguinaldoResult {
  const totalGross = salaries.reduce((sum, s) => sum + s, 0)
  const averageSalary = totalGross / 12
  const aguinaldoAmount = averageSalary // 1 month's average per Costa Rica law

  return {
    salaries,
    totalGross,
    averageSalary,
    aguinaldoAmount,
  }
}

// Loyalty programs calculation (BP style)
export interface LoyaltyProgramResult {
  program: string
  amount: number
  paymentsByTerm: { term: number; payment: number }[]
  commission?: number
  totalWithCommission?: number
}

export function calcBPMinicuotas(
  amount: number,
  currency: 'CRC' | 'USD'
): LoyaltyProgramResult {
  const rates: Record<string, number> = { CRC: 0.24, USD: 0.1992 }
  const terms = [12, 24, 36, 48]
  const annualRate = rates[currency]
  const monthlyRate = annualRate / 12

  return {
    program: 'Financiamiento con interes',
    amount,
    paymentsByTerm: terms.map(term => ({
      term,
      payment: calcAmortizationPayment(amount, monthlyRate * 12, term),
    })),
  }
}

export function calcBPTasaCero(amount: number): LoyaltyProgramResult {
  const terms = [3, 4, 6, 9, 10, 12]
  const commission = amount * 0.03

  return {
    program: 'Cero interes',
    amount,
    paymentsByTerm: terms.map(term => ({
      term,
      payment: amount / term,
    })),
    commission,
    totalWithCommission: amount + commission,
  }
}

export function calcBPCompraSaldos(
  amount: number,
  currency: 'CRC' | 'USD'
): LoyaltyProgramResult {
  const rates: Record<string, number> = { CRC: 0.21, USD: 0.18 }
  const terms = [12, 24, 36, 48, 60]
  const annualRate = rates[currency]

  return {
    program: 'BP Compra de Saldos',
    amount,
    paymentsByTerm: terms.map(term => ({
      term,
      payment: calcAmortizationPayment(amount, annualRate, term),
    })),
  }
}

// Budget summary calculations
export interface BudgetSummary {
  totalIncome: number
  totalFixedExpenses: number
  totalCreditObligations: number
  totalEmergencyContribution: number
  totalVariableExpenses: number
  totalExpenses: number
  available: number
  availablePercentage: number
}

export function calcBudgetSummary(params: {
  incomes: number[]
  fixedExpenses: number[]
  creditObligations: number[]
  emergencyContributions: number[]
  variableExpenses: number[]
}): BudgetSummary {
  const totalIncome = params.incomes.reduce((s, v) => s + v, 0)
  const totalFixedExpenses = params.fixedExpenses.reduce((s, v) => s + v, 0)
  const totalCreditObligations = params.creditObligations.reduce((s, v) => s + v, 0)
  const totalEmergencyContribution = params.emergencyContributions.reduce((s, v) => s + v, 0)
  const totalVariableExpenses = params.variableExpenses.reduce((s, v) => s + v, 0)
  const totalExpenses = totalFixedExpenses + totalCreditObligations + totalEmergencyContribution + totalVariableExpenses
  const available = totalIncome - totalExpenses
  const availablePercentage = totalIncome > 0 ? (available / totalIncome) * 100 : 0

  return {
    totalIncome,
    totalFixedExpenses,
    totalCreditObligations,
    totalEmergencyContribution,
    totalVariableExpenses,
    totalExpenses,
    available,
    availablePercentage,
  }
}
