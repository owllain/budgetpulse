import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/turso'
import { calcBudgetSummary } from '@/lib/finance'

// POST /api/export - Export budget data
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { budgetId, format } = body

    if (!budgetId) {
      return NextResponse.json({ error: 'Budget ID required' }, { status: 400 })
    }

    const budget = await db.execute({ sql: 'SELECT * FROM budgets WHERE id = ?', args: [budgetId] })
    if (budget.rows.length === 0) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    const [incomes, expenses] = await Promise.all([
      db.execute({ sql: 'SELECT * FROM income_items WHERE budget_id = ? ORDER BY sort_order', args: [budgetId] }),
      db.execute({ sql: 'SELECT * FROM expense_items WHERE budget_id = ? ORDER BY sort_order', args: [budgetId] }),
    ])

    const expenseRows = expenses.rows as Array<any>
    const fixedExpenses = expenseRows.filter(e => e.category === 'fixed')
    const creditObligations = expenseRows.filter(e => e.category === 'credit')
    const emergencyFunds = expenseRows.filter(e => e.category === 'emergency')
    const variableExpenses = expenseRows.filter(e => e.category === 'other')

    const budgetData = budget.rows[0]
    const data = {
      budget: budgetData,
      incomes: incomes.rows,
      expenses: expenseRows,
      summary: calcBudgetSummary({
        incomes: incomes.rows.map((r: any) => r.amount),
        fixedExpenses: fixedExpenses.map((r: any) => r.amount),
        creditObligations: creditObligations.map((r: any) => r.amount),
        emergencyContributions: emergencyFunds.map((r: any) => r.amount),
        variableExpenses: variableExpenses.map((r: any) => r.amount),
      }),
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
