import { NextRequest, NextResponse } from 'next/server'
import { turso } from '@/lib/turso'
import { v4 as uuidv4 } from 'uuid'

// GET /api/budgets - List all budgets
export async function GET() {
  try {
    const result = await turso.execute('SELECT * FROM budgets ORDER BY created_at DESC')
    return NextResponse.json({ budgets: result.rows })
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }
}

// POST /api/budgets - Create a new budget with all items
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      periodType,
      periodStart,
      periodEnd,
      currency = 'CRC',
      incomes = [],
      fixedExpenses = [],
      creditObligations = [],
      emergencyFunds = [],
      variableExpenses = [],
    } = body

    const budgetId = uuidv4()

    // Insert budget
    await turso.execute({
      sql: `INSERT INTO budgets (id, name, period_type, period_start, period_end, currency) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [budgetId, name, periodType, periodStart, periodEnd, currency],
    })

    // Insert incomes
    for (const inc of incomes) {
      await turso.execute({
        sql: `INSERT INTO incomes (id, budget_id, name, amount, category, is_recurring) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [uuidv4(), budgetId, inc.name, inc.amount || 0, inc.category || 'salary', inc.isRecurring ? 1 : 0],
      })
    }

    // Insert fixed expenses
    for (const exp of fixedExpenses) {
      await turso.execute({
        sql: `INSERT INTO fixed_expenses (id, budget_id, name, amount, category, due_date, is_paid) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [uuidv4(), budgetId, exp.name, exp.amount || 0, exp.category || 'utilities', exp.dueDate || null, exp.isPaid ? 1 : 0],
      })
    }

    // Insert credit obligations
    for (const obl of creditObligations) {
      await turso.execute({
        sql: `INSERT INTO credit_obligations (id, budget_id, name, type, total_debt, monthly_payment, annual_rate, remaining_months, minimum_payment, is_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          uuidv4(), budgetId, obl.name, obl.type || 'credit_card',
          obl.totalDebt || 0, obl.monthlyPayment || 0, obl.annualRate || 0,
          obl.remainingMonths || 0, obl.minimumPayment || 0, obl.isPaid ? 1 : 0,
        ],
      })
    }

    // Insert emergency funds
    for (const ef of emergencyFunds) {
      await turso.execute({
        sql: `INSERT INTO emergency_funds (id, budget_id, name, target_amount, current_amount, monthly_contribution) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [uuidv4(), budgetId, ef.name, ef.targetAmount || 0, ef.currentAmount || 0, ef.monthlyContribution || 0],
      })
    }

    // Insert variable expenses
    for (const ve of variableExpenses) {
      await turso.execute({
        sql: `INSERT INTO variable_expenses (id, budget_id, name, amount, category) VALUES (?, ?, ?, ?, ?)`,
        args: [uuidv4(), budgetId, ve.name, ve.amount || 0, ve.category || 'food'],
      })
    }

    return NextResponse.json({ id: budgetId, message: 'Budget created successfully' }, { status: 201 })
  } catch (error) {
    console.error('Error creating budget:', error)
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
  }
}
