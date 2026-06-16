import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/turso'
import { v4 as uuid } from 'uuid'

export async function GET() {
  try {
    const budgets = await db.execute('SELECT * FROM budgets ORDER BY created_at DESC')
    return NextResponse.json({ budgets: budgets.rows })
  } catch (e) {
    console.error('GET budgets error:', e)
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, period = 'monthly', currency = 'CRC', holderName, incomes = [], expenses = [] } = body
    const id = uuid()
    await db.execute({
      sql: `INSERT INTO budgets (id, name, period, currency, holder_name) VALUES (?, ?, ?, ?, ?)`,
      args: [id, name, period, currency, holderName || null],
    })
    for (let i = 0; i < incomes.length; i++) {
      const inc = incomes[i]
      await db.execute({
        sql: `INSERT INTO income_items (id, budget_id, category, description, amount, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [uuid(), id, inc.category || 'salary', inc.description || '', inc.amount || 0, i],
      })
    }
    for (let i = 0; i < expenses.length; i++) {
      const exp = expenses[i]
      await db.execute({
        sql: `INSERT INTO expense_items (id, budget_id, category, sub_category, description, amount, extra_data, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [uuid(), id, exp.category || 'fixed', exp.subCategory || '', exp.description || '', exp.amount || 0, JSON.stringify(exp.extraData || {}), i],
      })
    }
    return NextResponse.json({ id, message: 'Budget created' }, { status: 201 })
  } catch (e) {
    console.error('POST budgets error:', e)
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
  }
}
