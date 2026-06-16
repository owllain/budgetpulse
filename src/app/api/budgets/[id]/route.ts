import { NextRequest, NextResponse } from 'next/server'
import { db, hasColumn } from '@/lib/turso'

// GET /api/budgets/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const budget = await db.execute({
      sql: 'SELECT * FROM budgets WHERE id = ?',
      args: [id],
    })
    if (budget.rows.length === 0) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
    }

    const b = budget.rows[0]
    const incomes = await db.execute({
      sql: 'SELECT * FROM income_items WHERE budget_id = ? ORDER BY sort_order',
      args: [id],
    })
    const expenses = await db.execute({
      sql: 'SELECT * FROM expense_items WHERE budget_id = ? ORDER BY sort_order',
      args: [id],
    })
    const budgetsHasUser = await hasColumn('budgets', 'user_id')

    return NextResponse.json({
      id: b.id, name: b.name, period: b.period, currency: b.currency,
      holderName: b.holder_name, userId: budgetsHasUser ? b.user_id : undefined,
      createdAt: b.created_at, updatedAt: b.updated_at,
      incomes: incomes.rows.map(i => ({
        id: i.id, category: i.category, description: i.description,
        amount: i.amount, sortOrder: i.sort_order,
      })),
      expenses: expenses.rows.map(e => ({
        id: e.id, category: e.category, description: e.description,
        amount: e.amount, sortOrder: e.sort_order,
      })),
    })
  } catch (error) {
    console.error('GET budget error:', error)
    return NextResponse.json({ error: 'Error al obtener presupuesto' }, { status: 500 })
  }
}

// DELETE /api/budgets/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.execute({ sql: 'DELETE FROM budgets WHERE id = ?', args: [id] })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE budget error:', error)
    return NextResponse.json({ error: 'Error al eliminar presupuesto' }, { status: 500 })
  }
}

// PUT /api/budgets/[id] — update budget + items
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, period, currency, holderName, incomes, expenses } = body
    const incomeHasUser = await hasColumn('income_items', 'user_id')
    const expenseHasUser = await hasColumn('expense_items', 'user_id')
    const budgetsHasUser = await hasColumn('budgets', 'user_id')

    // Update budget header
    await db.execute({
      sql: `UPDATE budgets SET name=?, period=?, currency=?, holder_name=?, updated_at=datetime('now') WHERE id=?`,
      args: [name, period, currency, holderName || null, id],
    })

    let budgetUserId: string | undefined = undefined
    if (budgetsHasUser && (incomeHasUser || expenseHasUser)) {
      const budget = await db.execute({ sql: 'SELECT user_id FROM budgets WHERE id = ?', args: [id] })
      budgetUserId = budget.rows[0]?.user_id
    }

    // Replace incomes
    if (incomes !== undefined) {
      await db.execute({ sql: 'DELETE FROM income_items WHERE budget_id = ?', args: [id] })
      for (let i = 0; i < incomes.length; i++) {
        const item = incomes[i]
        const { v4: uuid } = await import('uuid')
        if (incomeHasUser) {
          await db.execute({
            sql: `INSERT INTO income_items (id, budget_id, user_id, category, description, amount, sort_order)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [uuid(), id, budgetUserId || null, item.category || 'salary', item.description, item.amount || 0, i],
          })
        } else {
          await db.execute({
            sql: `INSERT INTO income_items (id, budget_id, category, description, amount, sort_order)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [uuid(), id, item.category || 'salary', item.description, item.amount || 0, i],
          })
        }
      }
    }

    // Replace expenses
    if (expenses !== undefined) {
      await db.execute({ sql: 'DELETE FROM expense_items WHERE budget_id = ?', args: [id] })
      for (let i = 0; i < expenses.length; i++) {
        const item = expenses[i]
        const { v4: uuid } = await import('uuid')
        if (expenseHasUser) {
          await db.execute({
            sql: `INSERT INTO expense_items (id, budget_id, user_id, category, description, amount, sort_order)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [uuid(), id, budgetUserId || null, item.category || 'other', item.description, item.amount || 0, i],
          })
        } else {
          await db.execute({
            sql: `INSERT INTO expense_items (id, budget_id, category, description, amount, sort_order)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [uuid(), id, item.category || 'other', item.description, item.amount || 0, i],
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT budget error:', error)
    return NextResponse.json({ error: 'Error al actualizar presupuesto' }, { status: 500 })
  }
}
