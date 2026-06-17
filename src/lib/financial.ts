/**
 * FinanzasCR — Financial calculation utilities for Costa Rica
 * Compound interest, loan amortization, aguinaldo, net salary, etc.
 */

export function formatCRC(amount: number, currency: string = 'CRC'): string {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount)
}

export function formatCompact(amount: number, currency: string = 'CRC'): string {
  if (Math.abs(amount) >= 1000000) return `${(amount / 1000000).toFixed(1)}M`
  if (Math.abs(amount) >= 1000) return `${(amount / 1000).toFixed(0)}K`
  return amount.toFixed(0)
}

// French amortization payment (PMT)
export function calcPMT(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months
  const r = annualRate / 12
  const factor = Math.pow(1 + r, months)
  return principal * (r * factor) / (factor - 1)
}

export interface AmortRow { month: number; payment: number; principal: number; interest: number; balance: number }

export function amortizationSchedule(principal: number, annualRate: number, months: number): AmortRow[] {
  const schedule: AmortRow[] = []
  const r = annualRate / 12
  const pmt = calcPMT(principal, annualRate, months)
  let bal = principal
  for (let i = 1; i <= months; i++) {
    const int = bal * r
    const prin = pmt - int
    bal = Math.max(0, bal - prin)
    schedule.push({ month: i, payment: pmt, principal: prin, interest: int, balance: bal })
    if (bal === 0) break
  }
  return schedule
}

// Credit card payoff projection
export interface CCProjection { month: number; balance: number; interestAccum: number; totalPaid: number }

export function projectCCDebt(principal: number, annualRate: number, payment: number, months: number): CCProjection[] {
  const proj: CCProjection[] = []
  const r = annualRate / 12
  let bal = principal, intAccum = 0, paid = 0
  for (let i = 1; i <= months; i++) {
    const int = bal * r
    intAccum += int
    bal = bal + int - payment
    paid += payment
    if (bal < 0) { paid += bal; bal = 0 }
    proj.push({ month: i, balance: bal, interestAccum: intAccum, totalPaid: paid })
    if (bal === 0) break
  }
  return proj
}

export function payoffTime(principal: number, annualRate: number, payment: number) {
  const r = annualRate / 12
  let bal = principal, totalInt = 0, paid = 0, months = 0
  while (bal > 0 && months < 600) {
    const int = bal * r
    if (payment <= int) return { months: -1, totalInterest: Infinity, totalPaid: Infinity }
    totalInt += int
    bal = bal + int - payment
    paid += payment
    months++
    if (bal < 0) { paid += bal; bal = 0 }
  }
  return { months, totalInterest: totalInt, totalPaid: paid }
}

// Costa Rica Aguinaldo
export function calcAguinaldo(salaries: number[]) {
  const totalGross = salaries.reduce((s, v) => s + v, 0)
  const monthsWorked = salaries.filter(s => s > 0).length || 1
  const aguinaldoAmount = totalGross / 12
  return { salaries, totalGross, averageSalary: totalGross / monthsWorked, aguinaldoAmount, monthsWorked }
}

// Costa Rica Net Salary (CCSS + IR 2024)
export function calcNetSalary(grossSalary: number): { gross: number; ccss: number; ir: number; net: number; deductions: { name: string; amount: number }[] } {
  const deductions: { name: string; amount: number }[] = []
  // CCSE (Seguro Social) ~10.67% on gross
  const ccss = grossSalary * 0.1067
  deductions.push({ name: 'CCSS (Seguro Social)', amount: ccss })
  // Impuesto sobre la Renta (tarifa 2024)
  const taxable = grossSalary - ccss
  let ir = 0
  if (taxable > 4238000) ir = taxable * 0.25 - 272000
  else if (taxable > 2120000) ir = taxable * 0.20 - 60000
  else if (taxable > 1317000) ir = taxable * 0.15 - 25800
  else if (taxable > 922000) ir = taxable * 0.10
  ir = Math.max(0, ir)
  deductions.push({ name: 'Impuesto Renta', amount: ir })
  const net = grossSalary - ccss - ir
  return { gross: grossSalary, ccss, ir, net, deductions }
}

// BP Programs
export function bpMinicuotas(amount: number, currency: 'CRC' | 'USD') {
  const rates: Record<string, number> = { CRC: 0.24, USD: 0.1992 }
  return { program: 'Financiamiento con interes', amount, paymentsByTerm: [12, 24, 36, 48].map(t => ({ term: t, payment: calcPMT(amount, rates[currency], t) })) }
}

export function bpTasaCero(amount: number) {
  const commission = amount * 0.03
  return { program: 'Cero interes', amount, commission, totalWithCommission: amount + commission, paymentsByTerm: [3, 4, 6, 9, 10, 12].map(t => ({ term: t, payment: amount / t })) }
}

export function bpCompraSaldos(amount: number, currency: 'CRC' | 'USD') {
  const rates: Record<string, number> = { CRC: 0.21, USD: 0.18 }
  return { program: 'BP Compra de Saldos', amount, paymentsByTerm: [12, 24, 36, 48, 60].map(t => ({ term: t, payment: calcPMT(amount, rates[currency], t) })) }
}

// Financial Health Score (0-100)
export function calcHealthScore(params: {
  totalIncome: number; totalExpenses: number; totalDebt: number;
  emergencyFund: number; monthlyEmergencyTarget: number; savingsRate: number
}): number {
  let score = 50
  // Savings rate (up to 25 points)
  if (params.savingsRate >= 20) score += 25
  else if (params.savingsRate >= 10) score += 15
  else if (params.savingsRate > 0) score += 5
  else score -= 10
  // Debt-to-income ratio (up to 25 points)
  const debtRatio = params.totalIncome > 0 ? params.totalDebt / params.totalIncome : 0
  if (debtRatio <= 0.2) score += 25
  else if (debtRatio <= 0.35) score += 15
  else if (debtRatio <= 0.5) score += 5
  else score -= 15
  // Emergency fund (up to 25 points)
  if (params.emergencyFund >= params.monthlyEmergencyTarget) score += 25
  else if (params.emergencyFund >= params.monthlyEmergencyTarget * 0.5) score += 12
  else score -= 5
  // Expense ratio (up to 25 points)
  const expenseRatio = params.totalIncome > 0 ? params.totalExpenses / params.totalIncome : 1
  if (expenseRatio <= 0.6) score += 25
  else if (expenseRatio <= 0.8) score += 15
  else if (expenseRatio <= 1) score += 0
  else score -= 25
  return Math.max(0, Math.min(100, score))
}
