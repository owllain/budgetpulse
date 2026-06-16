import { NextRequest, NextResponse } from 'next/server'
import { db as turso } from '@/lib/turso'
import { calcBudgetSummary } from '@/lib/finance'

// POST /api/export - Export budget data
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { budgetId, format } = body

    if (!budgetId) {
      return NextResponse.json({ error: 'Budget ID required' }, { status: 400 })
    }

    // Fetch budget with all items
    const budget = await turso.execute({ sql: 'SELECT * FROM budgets WHERE id = ?', args: [budgetId] })
    if (budget.rows.length === 0) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    const [incomes, fixedExpenses, creditObligations, emergencyFunds, variableExpenses] = await Promise.all([
      turso.execute({ sql: 'SELECT * FROM incomes WHERE budget_id = ?', args: [budgetId] }),
      turso.execute({ sql: 'SELECT * FROM fixed_expenses WHERE budget_id = ?', args: [budgetId] }),
      turso.execute({ sql: 'SELECT * FROM credit_obligations WHERE budget_id = ?', args: [budgetId] }),
      turso.execute({ sql: 'SELECT * FROM emergency_funds WHERE budget_id = ?', args: [budgetId] }),
      turso.execute({ sql: 'SELECT * FROM variable_expenses WHERE budget_id = ?', args: [budgetId] }),
    ])

    const budgetData = budget.rows[0]
    const data = {
      budget: budgetData,
      incomes: incomes.rows,
      fixedExpenses: fixedExpenses.rows,
      creditObligations: creditObligations.rows,
      emergencyFunds: emergencyFunds.rows,
      variableExpenses: variableExpenses.rows,
      summary: calcBudgetSummary({
        incomes: incomes.rows.map((r: any) => r.amount),
        fixedExpenses: fixedExpenses.rows.map((r: any) => r.amount),
        creditObligations: creditObligations.rows.map((r: any) => r.monthly_payment),
        emergencyContributions: emergencyFunds.rows.map((r: any) => r.monthly_contribution),
        variableExpenses: variableExpenses.rows.map((r: any) => r.amount),
      }),
    }

    if (format === 'json') {
      return NextResponse.json(data)
    }

    // For xlsx and pdf, return the data and let frontend handle it
    return NextResponse.json(data)
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
