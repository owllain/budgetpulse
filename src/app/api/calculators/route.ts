import { NextRequest, NextResponse } from 'next/server'
import {
  calcAmortizationPayment,
  calcCreditCardMinimum,
  projectCreditCardDebt,
  calcPayoffTime,
  calcBPMinicuotas,
  calcBPTasaCero,
  calcBPCompraSaldos,
  generateAmortizationSchedule,
} from '@/lib/finance'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type } = body

    switch (type) {
      case 'loan': {
        const { principal, annualRate, months } = body
        const monthlyPayment = calcAmortizationPayment(principal, annualRate, months)
        const schedule = generateAmortizationSchedule(principal, annualRate, months)
        const totalPaid = monthlyPayment * months
        const totalInterest = totalPaid - principal
        return NextResponse.json({
          monthlyPayment,
          totalPaid,
          totalInterest,
          schedule: schedule.slice(0, 60), // limit schedule
        })
      }

      case 'credit-card': {
        const { principal, annualRate, charges, loyaltyCuota, minicuotasCuota, overdraft, latePayments, averageBalance, currency } = body
        const result = calcCreditCardMinimum(
          principal, annualRate, charges || 0,
          loyaltyCuota || 0, minicuotasCuota || 0,
          overdraft || 0, latePayments || 0,
          averageBalance, currency || 'CRC'
        )
        return NextResponse.json(result)
      }

      case 'credit-card-projection': {
        const { principal, annualRate, monthlyPayment, months } = body
        const projection = projectCreditCardDebt(principal, annualRate, monthlyPayment, months)
        const payoff = calcPayoffTime(principal, annualRate, monthlyPayment)
        return NextResponse.json({ projection, payoff })
      }

      case 'bp-minicuotas': {
        const { amount, currency } = body
        const result = calcBPMinicuotas(amount, currency || 'CRC')
        return NextResponse.json(result)
      }

      case 'bp-tasa-cero': {
        const { amount } = body
        const result = calcBPTasaCero(amount)
        return NextResponse.json(result)
      }

      case 'bp-compra-saldos': {
        const { amount, currency } = body
        const result = calcBPCompraSaldos(amount, currency || 'CRC')
        return NextResponse.json(result)
      }

      case 'amortization-schedule': {
        const { principal, annualRate, months } = body
        const schedule = generateAmortizationSchedule(principal, annualRate, months)
        return NextResponse.json({ schedule })
      }

      default:
        return NextResponse.json({ error: 'Unknown calculation type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Calculator error:', error)
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 })
  }
}
