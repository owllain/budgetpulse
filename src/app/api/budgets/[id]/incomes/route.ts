import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/turso'
import { auditCreate } from '@/lib/audit'
import { validateBudgetItemAmount } from '@/lib/numeric-validation'
import { v4 as uuid } from 'uuid'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { category, description, amount } = body

    const validation = validateBudgetItemAmount(amount, 'Ingreso')
    if (!validation.isValid) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
    }

    const itemId = uuid()
    const userRes = await db.execute({ sql: 'SELECT user_id FROM budgets WHERE id = ?', args: [id] })
    const userId = userRes.rows[0]?.user_id || null

    await auditCreate({
      userId: userId || 'unknown',
      entity: 'IncomeItem',
      newValues: { id: itemId, category, description, amount },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      fn: async () => {
        await db.execute({
          sql: `INSERT INTO income_items (id, budget_id, user_id, category, description, amount, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [itemId, id, userId, category || 'salary', description || '', amount || 0, Date.now()],
        })
        return itemId
      }
    })

    return NextResponse.json({ id: itemId, category, description, amount })
  } catch (error) {
    console.error('POST income error:', error)
    return NextResponse.json({ error: 'Error al agregar ingreso' }, { status: 500 })
  }
}
