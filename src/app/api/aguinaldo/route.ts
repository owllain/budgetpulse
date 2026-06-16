import { NextRequest, NextResponse } from 'next/server'
import { calcAguinaldo } from '@/lib/financial'
import { db } from '@/lib/turso'
import { v4 as uuid } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const { salaries, year } = await req.json()
    if (!salaries || salaries.length < 1) return NextResponse.json({ error: 'Provide salaries' }, { status: 400 })
    const result = calcAguinaldo(salaries)
    // Pad to 12 if needed
    while (salaries.length < 12) salaries.push(0)
    try {
      await db.execute({
        sql: `INSERT INTO savings_goals (id, name, target_amount, current_amount, target_date, currency) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [uuid(), `Aguinaldo ${year || new Date().getFullYear()}`, result.aguinaldoAmount, 0, null, 'CRC'],
      })
    } catch {}
    return NextResponse.json(result)
  } catch (e) {
    console.error('Aguinaldo error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
