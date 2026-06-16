import { NextRequest, NextResponse } from 'next/server'
import {
  calcPMT, amortizationSchedule, projectCCDebt, payoffTime,
  bpMinicuotas, bpTasaCero, bpCompraSaldos, calcNetSalary,
} from '@/lib/financial'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type } = body
    switch (type) {
      case 'loan': {
        const { principal, annualRate, months } = body
        const monthlyPayment = calcPMT(principal, annualRate, months)
        const schedule = amortizationSchedule(principal, annualRate, months)
        const totalPaid = monthlyPayment * months
        return NextResponse.json({ monthlyPayment, totalPaid, totalInterest: totalPaid - principal, schedule: schedule.slice(0, 60) })
      }
      case 'credit-card': {
        const { principal, annualRate, payment, months = 60 } = body
        const projection = projectCCDebt(principal, annualRate, payment, months)
        const pf = payoffTime(principal, annualRate, payment)
        return NextResponse.json({ projection, payoff: pf })
      }
      case 'bp-minicuotas': return NextResponse.json(bpMinicuotas(body.amount, body.currency || 'CRC'))
      case 'bp-tasa-cero': return NextResponse.json(bpTasaCero(body.amount))
      case 'bp-compra-saldos': return NextResponse.json(bpCompraSaldos(body.amount, body.currency || 'CRC'))
      case 'net-salary': return NextResponse.json(calcNetSalary(body.grossSalary))
      default: return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    }
  } catch (e) {
    console.error('Calculator error:', e)
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 })
  }
}
