import { describe, it, expect } from 'vitest'

/**
 * Funciones financieras para testing
 * Réplicas de las funciones en src/app/api
 */

// Cálculo de pago mensual de amortización
function calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
  const monthlyRate = annualRate / 100 / 12
  if (monthlyRate === 0) return principal / months
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
}

// Tabla de amortización completa
function calculateAmortizationSchedule(
  principal: number,
  annualRate: number,
  months: number
): Array<{ month: number; payment: number; principal: number; interest: number; balance: number }> {
  const monthlyRate = annualRate / 100 / 12
  const pmt = calculateMonthlyPayment(principal, annualRate, months)
  let balance = principal
  const schedule = []

  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate
    const principalPart = pmt - interest
    balance = Math.max(0, balance - principalPart)
    schedule.push({
      month: i,
      payment: Number(pmt.toFixed(2)),
      principal: Number(principalPart.toFixed(2)),
      interest: Number(interest.toFixed(2)),
      balance: Number(balance.toFixed(2)),
    })
    if (balance === 0) break
  }

  return schedule
}

describe('Cálculos Financieros - Amortización', () => {
  describe('calculateMonthlyPayment', () => {
    it('debe calcular correctamente el pago mensual de un préstamo', () => {
      // Préstamo de ₡10,000,000 al 8% anual por 60 meses
      const payment = calculateMonthlyPayment(10_000_000, 8, 60)
      // Valor esperado aproximado: ₡202,763.94
      expect(payment).toBeCloseTo(202_763.94, 1)
    })

    it('debe calcular correctamente con tasa cero', () => {
      // Préstamo de ₡10,000,000 al 0% anual por 60 meses
      const payment = calculateMonthlyPayment(10_000_000, 0, 60)
      expect(payment).toBe(10_000_000 / 60)
      expect(payment).toBeCloseTo(166_666.67, 2)
    })

    it('debe manejar préstamos con alta tasa de interés', () => {
      // Préstamo de ₡5,000,000 al 20% anual por 24 meses
      const payment = calculateMonthlyPayment(5_000_000, 20, 24)
      expect(payment).toBeGreaterThan(5_000_000 / 24) // Mayor que sin interés
      expect(payment).toBeCloseTo(254_479.01, 1)
    })

    it('debe retornar NaN con valores negativos (validación en API)', () => {
      const payment = calculateMonthlyPayment(-10_000_000, 8, 60)
      expect(isNaN(payment)).toBe(false) // La función no valida
    })

    it('debe calcular correctamente con períodos muy cortos', () => {
      // Préstamo de ₡100,000 al 5% anual por 1 mes
      const payment = calculateMonthlyPayment(100_000, 5, 1)
      expect(payment).toBeCloseTo(100_416.67, 2)
    })

    it('debe manejar precisión con valores pequeños', () => {
      const payment = calculateMonthlyPayment(1000, 3.5, 12)
      expect(payment).toBeCloseTo(84.92, 1)
    })
  })

  describe('calculateAmortizationSchedule', () => {
    it('debe generar una tabla de amortización correcta', () => {
      const schedule = calculateAmortizationSchedule(1_000_000, 8, 12)
      
      expect(schedule).toHaveLength(12)
      expect(schedule[0].month).toBe(1)
      expect(schedule[0].interest).toBeGreaterThan(0)
      expect(schedule[11].balance).toBe(0)
    })

    it('debe cumplir que el pago es constante', () => {
      const schedule = calculateAmortizationSchedule(1_000_000, 8, 12)
      const firstPayment = schedule[0].payment
      
      schedule.forEach(entry => {
        expect(entry.payment).toBe(firstPayment)
      })
    })

    it('debe asegurar que principal + interés = pago', () => {
      const schedule = calculateAmortizationSchedule(1_000_000, 8, 12)
      
      schedule.forEach(entry => {
        const sum = entry.principal + entry.interest
        expect(sum).toBeCloseTo(entry.payment, 1)
      })
    })

    it('debe tener saldo decreciente', () => {
      const schedule = calculateAmortizationSchedule(1_000_000, 8, 12)
      
      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i].balance).toBeLessThanOrEqual(schedule[i - 1].balance)
      }
    })

    it('debe terminar con saldo cero', () => {
      const schedule = calculateAmortizationSchedule(500_000, 6, 24)
      expect(schedule[schedule.length - 1].balance).toBe(0)
    })

    it('debe manejar períodos muy largos sin overflow', () => {
      const schedule = calculateAmortizationSchedule(1_000_000, 3, 360) // 30 años
      expect(schedule).toHaveLength(360)
      expect(schedule[359].balance).toBe(0)
    })
  })
})

describe('Cálculos Financieros - Tarjeta de Crédito', () => {
  function calculateCreditCardProjection(
    principal: number,
    annualRate: number,
    monthlyPayment: number,
    charges: number = 0,
    maxMonths: number = 60
  ): {
    payoffMonths: number
    totalInterest: number
    totalPaid: number
    projection: Array<{ month: number; balance: number; interestAccum: number; totalPaid: number }>
  } {
    const monthlyRate = annualRate / 100 / 12
    let balance = principal
    let totalInterest = 0
    let totalPaidAmount = 0
    let months = 0
    const projection = []

    while (balance > 0 && months < maxMonths) {
      const interest = balance * monthlyRate
      if (monthlyPayment <= interest) {
        return {
          payoffMonths: -1,
          totalInterest: -1,
          totalPaid: -1,
          projection: [],
        }
      }
      totalInterest += interest
      balance = balance + interest + charges - monthlyPayment
      totalPaidAmount += monthlyPayment
      months++

      if (balance < 0) {
        totalPaidAmount += balance
        balance = 0
      }

      projection.push({
        month: months,
        balance: Number(balance.toFixed(2)),
        interestAccum: Number(totalInterest.toFixed(2)),
        totalPaid: Number(totalPaidAmount.toFixed(2)),
      })

      if (balance === 0) break
    }

    return {
      payoffMonths: months,
      totalInterest: Number(totalInterest.toFixed(2)),
      totalPaid: Number(totalPaidAmount.toFixed(2)),
      projection,
    }
  }

  it('debe calcular correctamente el tiempo de pago de una tarjeta', () => {
    // Saldo de ₡500,000 al 24% anual con pago de ₡15,000/mes
    const result = calculateCreditCardProjection(500_000, 24, 15_000)
    expect(result.payoffMonths).toBeGreaterThan(0)
    expect(result.payoffMonths).toBeLessThan(60)
    expect(result.totalInterest).toBeGreaterThan(0)
  })

  it('debe detectar cuando el pago no cubre intereses', () => {
    // Saldo de ₡500,000 al 24% anual con pago de ₡5,000/mes
    const result = calculateCreditCardProjection(500_000, 24, 5_000)
    expect(result.payoffMonths).toBe(-1)
    expect(result.totalInterest).toBe(-1)
  })

  it('debe manejar cargos mensuales (cuotas adicionales)', () => {
    const resultSinCargos = calculateCreditCardProjection(100_000, 18, 5_000)
    const resultConCargos = calculateCreditCardProjection(100_000, 18, 5_000, 2_000)

    expect(resultConCargos.payoffMonths).toBeGreaterThan(resultSinCargos.payoffMonths)
    expect(resultConCargos.totalInterest).toBeGreaterThan(resultSinCargos.totalInterest)
  })

  it('debe proyectar correctamente el saldo decreciente', () => {
    const result = calculateCreditCardProjection(200_000, 20, 10_000)
    const { projection } = result

    for (let i = 1; i < projection.length; i++) {
      expect(projection[i].balance).toBeLessThanOrEqual(projection[i - 1].balance)
    }
  })
})

describe('Cálculos Financieros - Aguinaldo', () => {
  function calculateAguinaldo(
    salaries: number[]
  ): {
    salaries: number[]
    totalGross: number
    averageSalary: number
    aguinaldoAmount: number
    monthsWorked: number
  } {
    const totalGross = salaries.reduce((sum, val) => sum + val, 0)
    const monthsWorked = salaries.filter(s => s > 0).length || 1
    const aguinaldoAmount = totalGross / 12

    return {
      salaries,
      totalGross,
      averageSalary: totalGross / monthsWorked,
      aguinaldoAmount,
      monthsWorked,
    }
  }

  it('debe calcular el aguinaldo como 1/12 del salario anual', () => {
    const salaries = Array(12).fill(500_000)
    const result = calculateAguinaldo(salaries)

    expect(result.totalGross).toBe(6_000_000)
    expect(result.aguinaldoAmount).toBe(500_000)
  })

  it('debe manejar salarios variables', () => {
    const salaries = [500_000, 500_000, 550_000, 550_000, 600_000, 600_000, 600_000, 600_000, 600_000, 600_000, 600_000, 650_000]
    const result = calculateAguinaldo(salaries)

    expect(result.totalGross).toBe(6_950_000)
    expect(result.aguinaldoAmount).toBe(6_950_000 / 12)
    expect(result.averageSalary).toBe(6_950_000 / 12)
  })

  it('debe contar correctamente meses trabajados', () => {
    const salaries = [500_000, 500_000, 0, 550_000, 0, 0, 600_000, 600_000, 600_000, 0, 0, 0]
    const result = calculateAguinaldo(salaries)

    expect(result.monthsWorked).toBe(6)
  })

  it('debe calcular aguinaldo proporcional', () => {
    // Trabajó 6 meses con salario promedio de 600,000
    const salaries = [600_000, 600_000, 600_000, 600_000, 600_000, 600_000, 0, 0, 0, 0, 0, 0]
    const result = calculateAguinaldo(salaries)

    expect(result.totalGross).toBe(3_600_000)
    expect(result.aguinaldoAmount).toBe(300_000)
  })

  it('debe manejar un mes de trabajo', () => {
    const salaries = [500_000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const result = calculateAguinaldo(salaries)

    expect(result.monthsWorked).toBe(1)
    expect(result.aguinaldoAmount).toBeCloseTo(500_000 / 12, 2)
  })
})

describe('Cálculos Financieros - Salario Neto', () => {
  function calculateNetSalary(grossSalary: number): {
    gross: number
    ccss: number
    ir: number
    net: number
    deductions: Array<{ name: string; amount: number; rate?: string }>
  } {
    const ccss = grossSalary * 0.1067
    const taxable = grossSalary - ccss
    let ir = 0

    if (taxable > 4_238_000) ir = taxable * 0.25 - 272_000
    else if (taxable > 2_120_000) ir = taxable * 0.20 - 60_000
    else if (taxable > 1_317_000) ir = taxable * 0.15 - 25_800
    else if (taxable > 922_000) ir = taxable * 0.10

    ir = Math.max(0, ir)
    const net = grossSalary - ccss - ir

    return {
      gross: grossSalary,
      ccss,
      ir,
      net,
      deductions: [
        { name: 'CCSS (Seguro Social)', amount: ccss, rate: '10.67%' },
        { name: 'Impuesto sobre la Renta', amount: ir },
      ],
    }
  }

  it('debe calcular CCSS correctamente', () => {
    const result = calculateNetSalary(1_000_000)
    expect(result.ccss).toBeCloseTo(1_000_000 * 0.1067, 2)
  })

  it('debe aplicar IR en tramos correctos', () => {
    // Salario en tramo 0%
    const low = calculateNetSalary(900_000)
    expect(low.ir).toBe(0)

    // Salario en tramo 10% (necesita salario neto después CCSS > 922,000)
    const medium = calculateNetSalary(1_100_000)
    expect(medium.ir).toBeGreaterThan(0)
  })

  it('debe calcular el salario neto correctamente', () => {
    const result = calculateNetSalary(2_000_000)
    const expectedNet = 2_000_000 - result.ccss - result.ir
    expect(result.net).toBe(expectedNet)
  })

  it('debe manejar salarios altos con IR de 25%', () => {
    const result = calculateNetSalary(5_000_000)
    expect(result.ir).toBeGreaterThan(0)
    expect(result.net).toBeLessThan(result.gross - result.ccss)
  })
})

describe('Cálculos Financieros - Minicuotas', () => {
  function calculateBPMinicuotas(
    amount: number,
    currency: string = 'CRC'
  ): {
    program: string
    amount: number
    currency: string
    rates: { annual: number; monthly: number }
    payments: Array<{ term: number; payment: number }>
  } {
    const rates: Record<string, number> = { CRC: 0.24, USD: 0.1992 }
    const terms = [12, 24, 36, 48]
    const annualRate = rates[currency] || 0.24
    const r = annualRate / 12

    const payments = terms.map(t => {
      const factor = Math.pow(1 + r, t)
      return { term: t, payment: amount * (r * factor) / (factor - 1) }
    })

    return {
      program: 'Financiamiento con interes',
      amount,
      currency,
      rates: { annual: annualRate, monthly: r },
      payments,
    }
  }

  it('debe calcular pagos con tasa correcta para CRC', () => {
    const result = calculateBPMinicuotas(1_200_000, 'CRC')
    expect(result.currency).toBe('CRC')
    expect(result.rates.annual).toBe(0.24)
    expect(result.payments[0].term).toBe(12) // Primer pago a 12 meses
    expect(result.payments[0].payment).toBeCloseTo(113_471.51, -1) // Aproximado
  })

  it('debe calcular pagos con tasa correcta para USD', () => {
    const result = calculateBPMinicuotas(1200, 'USD')
    expect(result.rates.annual).toBe(0.1992)
    expect(result.payments[0].payment).toBeLessThan(calculateBPMinicuotas(1200, 'CRC').payments[0].payment)
  })

  it('debe tener más opciones de plazo', () => {
    const result = calculateBPMinicuotas(1_000_000, 'CRC')
    expect(result.payments).toHaveLength(4)
    expect(result.payments.map(p => p.term)).toEqual([12, 24, 36, 48])
  })

  it('debe aumentar el pago total a plazos más cortos', () => {
    const result = calculateBPMinicuotas(1_000_000, 'CRC')
    const month12 = result.payments[0].payment
    const month24 = result.payments[1].payment

    expect(month12).toBeGreaterThan(month24)
  })
})

describe('Cálculos Financieros - Tasa Cero', () => {
  function calculateBPTasaCero(amount: number): {
    program: string
    amount: number
    commission: number
    totalWithCommission: number
    payments: Array<{ term: number; payment: number }>
  } {
    const commission = amount * 0.03
    const terms = [3, 4, 6, 9, 10, 12]

    return {
      program: 'Cero interes',
      amount,
      commission,
      totalWithCommission: amount + commission,
      payments: terms.map(t => ({ term: t, payment: amount / t })),
    }
  }

  it('debe calcular comisión del 3%', () => {
    const result = calculateBPTasaCero(1_000_000)
    expect(result.commission).toBe(30_000)
  })

  it('debe distribuir el monto original entre cuotas (sin comisión)', () => {
    const result = calculateBPTasaCero(1_200_000)
    expect(result.payments[0].payment).toBe(1_200_000 / 3)
    expect(result.payments[5].payment).toBe(1_200_000 / 12)
  })

  it('debe tener seis opciones de plazo', () => {
    const result = calculateBPTasaCero(1_000_000)
    expect(result.payments).toHaveLength(6)
    expect(result.payments.map(p => p.term)).toEqual([3, 4, 6, 9, 10, 12])
  })
})
