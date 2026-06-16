import { NextRequest, NextResponse } from 'next/server'
import { db, hasColumn } from '@/lib/turso'
import { v4 as uuid } from 'uuid'

// GET /api/budgets?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    const budgetsHasUser = await hasColumn('budgets', 'user_id')

    if (budgetsHasUser && !userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }

    const sql = budgetsHasUser
      ? 'SELECT * FROM budgets WHERE user_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM budgets ORDER BY created_at DESC'

    const budgets = await db.execute({ sql, args: budgetsHasUser ? [userId] : [] })

    const result = []
    for (const b of budgets.rows) {
      const incomes = await db.execute({
        sql: 'SELECT * FROM income_items WHERE budget_id = ? ORDER BY sort_order',
        args: [b.id as string],
      })
      const expenses = await db.execute({
        sql: 'SELECT * FROM expense_items WHERE budget_id = ? ORDER BY sort_order',
        args: [b.id as string],
      })
      result.push({
        id: b.id,
        name: b.name,
        period: b.period,
        currency: b.currency,
        holderName: b.holder_name,
        userId: budgetsHasUser ? b.user_id : undefined,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
        incomes: incomes.rows.map(i => ({
          id: i.id, category: i.category, description: i.description,
          amount: i.amount, sortOrder: i.sort_order,
        })),
        expenses: expenses.rows.map(e => ({
          id: e.id, category: e.category, description: e.description,
          amount: e.amount, sortOrder: e.sort_order,
        })),
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET budgets error:', error)
    return NextResponse.json({ error: 'Error al obtener presupuestos' }, { status: 500 })
  }
}

// POST /api/budgets — create budget
export async function POST(req: NextRequest) {
  try {
    const { name, period, currency, holderName, userId } = await req.json()
    const budgetsHasUser = await hasColumn('budgets', 'user_id')

    if (!name || !period || (budgetsHasUser && !userId)) {
      return NextResponse.json({ error: 'Nombre, periodo y usuario son requeridos' }, { status: 400 })
    }

    const id = uuid()
    const columns = ['id', 'name', 'period', 'currency', 'holder_name']
    const values = ['?', '?', '?', '?', '?']
    const args = [id, name, period, currency || 'CRC', holderName || null]

    if (budgetsHasUser) {
      columns.splice(1, 0, 'user_id')
      values.splice(1, 0, '?')
      args.splice(1, 0, userId)
    }

    await db.execute({
      sql: `INSERT INTO budgets (${columns.join(', ')}) VALUES (${values.join(', ')})`,
      args,
    })

    return NextResponse.json({
      id,
      name,
      period,
      currency: currency || 'CRC',
      holderName,
      userId: budgetsHasUser ? userId : undefined,
      incomes: [],
      expenses: [],
    }, { status: 201 })
  } catch (error) {
    console.error('POST budgets error:', error)
    return NextResponse.json({ error: 'Error al crear presupuesto' }, { status: 500 })
  }
}
