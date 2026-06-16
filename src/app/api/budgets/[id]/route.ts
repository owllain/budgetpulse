import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/turso'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const budget = await db.execute({ sql: 'SELECT * FROM budgets WHERE id = ?', args: [id] })
    if (budget.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const [incomes, expenses] = await Promise.all([
      db.execute({ sql: 'SELECT * FROM income_items WHERE budget_id = ? ORDER BY sort_order', args: [id] }),
      db.execute({ sql: 'SELECT * FROM expense_items WHERE budget_id = ? ORDER BY sort_order', args: [id] }),
    ])
    return NextResponse.json({ budget: budget.rows[0], incomes: incomes.rows, expenses: expenses.rows })
  } catch (e) {
    console.error('GET budget error:', e)
    return NextResponse.json({ error: 'Failed to fetch budget' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.execute({ sql: 'DELETE FROM income_items WHERE budget_id = ?', args: [id] })
    await db.execute({ sql: 'DELETE FROM expense_items WHERE budget_id = ?', args: [id] })
    await db.execute({ sql: 'DELETE FROM budgets WHERE id = ?', args: [id] })
    return NextResponse.json({ message: 'Deleted' })
  } catch (e) {
    console.error('DELETE budget error:', e)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
