import { NextRequest, NextResponse } from 'next/server'
import { calcAguinaldo } from '@/lib/finance'
import { turso } from '@/lib/turso'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { salaries, year } = body

    if (!salaries || !Array.isArray(salaries) || salaries.length !== 12) {
      return NextResponse.json({ error: 'Must provide exactly 12 monthly salaries' }, { status: 400 })
    }

    const result = calcAguinaldo(salaries)

    // Save calculation
    const id = uuidv4()
    await turso.execute({
      sql: `INSERT INTO aguinaldo_calculations (id, year, salaries, total_gross, aguinaldo_amount) VALUES (?, ?, ?, ?, ?)`,
      args: [id, year || new Date().getFullYear(), JSON.stringify(salaries), result.totalGross, result.aguinaldoAmount],
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Aguinaldo calculation error:', error)
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const result = await turso.execute('SELECT * FROM aguinaldo_calculations ORDER BY created_at DESC')
    return NextResponse.json({ calculations: result.rows })
  } catch (error) {
    console.error('Error fetching aguinaldo calculations:', error)
    return NextResponse.json({ error: 'Failed to fetch calculations' }, { status: 500 })
  }
}
