import { NextRequest, NextResponse } from 'next/server'

// POST /api/calculators — financial calculations
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type } = body

    switch (type) {
      case 'amortization': {
        const { principal, annualRate, months } = body
        if (!principal || !annualRate || !months) {
          return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400 })
        }
        const r = annualRate / 12
        const pmt = r === 0 ? principal / months : principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
        let bal = principal
        const schedule = []
        for (let i = 1; i <= months; i++) {
          const interest = bal * r
          const principalPart = pmt - interest
          bal = Math.max(0, bal - principalPart)
          schedule.push({ month: i, payment: pmt, principal: principalPart, interest, balance: bal })
          if (bal === 0) break
        }
        return NextResponse.json({ monthlyPayment: pmt, totalInterest: (pmt * months) - principal, totalPaid: pmt * months, schedule })
      }

      case 'creditCard': {
        const { principal, annualRate, monthlyPayment, charges = 0, months = 60 } = body
        if (!principal || !annualRate || !monthlyPayment) {
          return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400 })
        }
        const r = annualRate / 12
        let bal = principal, totalInt = 0, paid = 0, m = 0
        const projection = []
        while (bal > 0 && m < months) {
          const interest = bal * r
          if (monthlyPayment <= interest) {
            return NextResponse.json({ error: 'El pago no cubre los intereses', payoffMonths: -1 })
          }
          totalInt += interest
          bal = bal + interest + charges - monthlyPayment
          paid += monthlyPayment
          m++
          if (bal < 0) { paid += bal; bal = 0 }
          projection.push({ month: m, balance: bal, interestAccum: totalInt, totalPaid: paid })
          if (bal === 0) break
        }
        return NextResponse.json({ payoffMonths: m, totalInterest: totalInt, totalPaid: paid, projection })
      }

      case 'netSalary': {
        const { grossSalary } = body
        if (!grossSalary) {
          return NextResponse.json({ error: 'Salario bruto requerido' }, { status: 400 })
        }
        const ccss = grossSalary * 0.1067
        const taxable = grossSalary - ccss
        let ir = 0
        if (taxable > 4238000) ir = taxable * 0.25 - 272000
        else if (taxable > 2120000) ir = taxable * 0.20 - 60000
        else if (taxable > 1317000) ir = taxable * 0.15 - 25800
        else if (taxable > 922000) ir = taxable * 0.10
        ir = Math.max(0, ir)
        const net = grossSalary - ccss - ir
        return NextResponse.json({
          gross: grossSalary, ccss, ir, net,
          deductions: [
            { name: 'CCSS (Seguro Social)', amount: ccss, rate: '10.67%' },
            { name: 'Impuesto sobre la Renta', amount: ir },
          ],
        })
      }

      case 'bpMinicuotas': {
        const { amount, currency = 'CRC' } = body
        if (!amount) return NextResponse.json({ error: 'Monto requerido' }, { status: 400 })
        const rates: Record<string, number> = { CRC: 0.24, USD: 0.1992 }
        const terms = [12, 24, 36, 48]
        const annualRate = rates[currency] || 0.24
        const r = annualRate / 12
        const payments = terms.map(t => {
          const factor = Math.pow(1 + r, t)
          return { term: t, payment: amount * (r * factor) / (factor - 1) }
        })
        return NextResponse.json({ program: 'Financiamiento con interes', amount, currency, rates: { annual: annualRate, monthly: r }, payments })
      }

      case 'bpTasaCero': {
        const { amount } = body
        if (!amount) return NextResponse.json({ error: 'Monto requerido' }, { status: 400 })
        const commission = amount * 0.03
        const terms = [3, 4, 6, 9, 10, 12]
        return NextResponse.json({
          program: 'Cero interes', amount, commission, totalWithCommission: amount + commission,
          payments: terms.map(t => ({ term: t, payment: amount / t })),
        })
      }

      case 'bpCompraSaldos': {
        const { amount, currency = 'CRC' } = body
        if (!amount) return NextResponse.json({ error: 'Monto requerido' }, { status: 400 })
        const rates: Record<string, number> = { CRC: 0.21, USD: 0.18 }
        const terms = [12, 24, 36, 48, 60]
        const annualRate = rates[currency] || 0.21
        const r = annualRate / 12
        const payments = terms.map(t => {
          const factor = Math.pow(1 + r, t)
          return { term: t, payment: amount * (r * factor) / (factor - 1) }
        })
        return NextResponse.json({ program: 'BP Compra de Saldos', amount, currency, rates: { annual: annualRate, monthly: r }, payments })
      }

      default:
        return NextResponse.json({ error: 'Tipo de cálculo no reconocido' }, { status: 400 })
    }
  } catch (error) {
    console.error('Calculator error:', error)
    return NextResponse.json({ error: 'Error en el cálculo' }, { status: 500 })
  }
}
