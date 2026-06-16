import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'

// GET /api/budgets/[id] - Get a budget with all its items
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const budget = await turso.execute({ sql: 'SELECT * FROM budgets WHERE id = ?', args: [id] })
    if (budget.rows.length === 0) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    const [incomes, fixedExpenses, creditObligations, emergencyFunds, variableExpenses] = await Promise.all([
      turso.execute({ sql: 'SELECT * FROM incomes WHERE budget_id = ?', args: [id] }),
      turso.execute({ sql: 'SELECT * FROM fixed_expenses WHERE budget_id = ?', args: [id] }),
      turso.execute({ sql: 'SELECT * FROM credit_obligations WHERE budget_id = ?', args: [id] }),
      turso.execute({ sql: 'SELECT * FROM emergency_funds WHERE budget_id = ?', args: [id] }),
      turso.execute({ sql: 'SELECT * FROM variable_expenses WHERE budget_id = ?', args: [id] }),
    ])

    return NextResponse.json({
      budget: budget.rows[0],
      incomes: incomes.rows,
      fixedExpenses: fixedExpenses.rows,
      creditObligations: creditObligations.rows,
      emergencyFunds: emergencyFunds.rows,
      variableExpenses: variableExpenses.rows,
    })
  } catch (error) {
    console.error('Error fetching budget:', error)
    return NextResponse.json({ error: 'Failed to fetch budget' }, { status: 500 })
  }
}

// DELETE /api/budgets/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Delete children first (cascade should handle it but be safe)
    await Promise.all([
      turso.execute({ sql: 'DELETE FROM incomes WHERE budget_id = ?', args: [id] }),
      turso.execute({ sql: 'DELETE FROM fixed_expenses WHERE budget_id = ?', args: [id] }),
      turso.execute({ sql: 'DELETE FROM credit_obligations WHERE budget_id = ?', args: [id] }),
      turso.execute({ sql: 'DELETE FROM emergency_funds WHERE budget_id = ?', args: [id] }),
      turso.execute({ sql: 'DELETE FROM variable_expenses WHERE budget_id = ?', args: [id] }),
    ])
    await turso.execute({ sql: 'DELETE FROM budgets WHERE id = ?', args: [id] })
    return NextResponse.json({ message: 'Budget deleted successfully' })
  } catch (error) {
    console.error('Error deleting budget:', error)
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 })
  }
}
