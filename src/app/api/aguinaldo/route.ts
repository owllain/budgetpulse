import { NextRequest, NextResponse } from 'next/server'

// POST /api/aguinaldo
export async function POST(req: NextRequest) {
  try {
    const { salaries } = await req.json()
    if (!salaries || !Array.isArray(salaries)) {
      return NextResponse.json({ error: 'Array de salarios requerido' }, { status: 400 })
    }

    const totalGross = salaries.reduce((s: number, v: number) => s + v, 0)
    const monthsWorked = salaries.filter((s: number) => s > 0).length || 1
    const aguinaldoAmount = totalGross / 12

    return NextResponse.json({
      salaries,
      totalGross,
      averageSalary: totalGross / monthsWorked,
      aguinaldoAmount,
      monthsWorked,
    })
  } catch (error) {
    console.error('Aguinaldo error:', error)
    return NextResponse.json({ error: 'Error en el cálculo' }, { status: 500 })
  }
}
