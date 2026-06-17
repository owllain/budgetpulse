import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/turso'
import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit'
import { validateCreditCardAmounts, validateLoanAmounts, sanitizeNumericAmount } from '@/lib/numeric-validation'

export type CreditProduct = {
  id: string
  user_id: string
  name: string
  financial_entity: string
  product_type: 'credit_card' | 'loan'
  currency: string
  interest_rate: number
  current_balance: number
  credit_limit?: number
  minimum_payment?: number
  statement_closing_day?: number
  payment_due_day: number
  initial_amount?: number
  total_with_interest?: number
  loan_term_years?: number
  total_installments?: number
  paid_installments?: number
  installment_amount?: number
  created_at: string
  updated_at: string
}

function calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
  const monthlyRate = annualRate / 100 / 12
  if (monthlyRate === 0) return principal / months
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
}

// GET - Fetch user's credits
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  try {
    const cards = await db.execute(
      `SELECT id, user_id, name, financial_entity, currency, credit_limit, current_balance, minimum_payment, statement_closing_day, payment_due_day, interest_rate, created_at, updated_at
       FROM credit_cards WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    )

    const loans = await db.execute(
      `SELECT id, user_id, name, financial_entity, currency, initial_amount, total_with_interest, current_balance, loan_term_years, total_installments, paid_installments, installment_amount, payment_due_day, interest_rate, created_at, updated_at
       FROM loans WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    )

    const creditCards = cards.rows.map(row => ({
      id: row[0],
      user_id: row[1],
      name: row[2],
      financial_entity: row[3],
      product_type: 'credit_card' as const,
      currency: row[4],
      credit_limit: row[5],
      current_balance: row[6],
      minimum_payment: row[7],
      statement_closing_day: row[8],
      payment_due_day: row[9],
      interest_rate: row[10],
      created_at: row[11],
      updated_at: row[12],
    }))

    const loansData = loans.rows.map(row => ({
      id: row[0],
      user_id: row[1],
      name: row[2],
      financial_entity: row[3],
      product_type: 'loan' as const,
      currency: row[4],
      initial_amount: row[5],
      total_with_interest: row[6],
      current_balance: row[7],
      loan_term_years: row[8],
      total_installments: row[9],
      paid_installments: row[10],
      installment_amount: row[11],
      payment_due_day: row[12],
      interest_rate: row[13],
      created_at: row[14],
      updated_at: row[15],
    }))

    return NextResponse.json([...creditCards, ...loansData].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
  } catch (e) {
    console.error('Error fetching credits:', e)
    return NextResponse.json({ error: 'Error fetching credits' }, { status: 500 })
  }
}

// POST - Create credit
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id,
      user_id,
      name,
      financial_entity,
      product_type,
      currency,
      interest_rate,
      current_balance,
      credit_limit,
      minimum_payment,
      statement_closing_day,
      payment_due_day,
      initial_amount,
      loan_term_years,
      total_installments,
    } = body

    if (!user_id || !name || !financial_entity || !product_type || !payment_due_day) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate numeric amounts based on product type
    if (product_type === 'credit_card') {
      const validation = validateCreditCardAmounts(body)
      if (!validation.isValid) {
        return NextResponse.json(
          { error: 'Validación numérica fallida', details: validation.errors },
          { status: 400 }
        )
      }
    } else if (product_type === 'loan') {
      const validation = validateLoanAmounts(body)
      if (!validation.isValid) {
        return NextResponse.json(
          { error: 'Validación numérica fallida', details: validation.errors },
          { status: 400 }
        )
      }
    }

    if (product_type === 'credit_card') {
      await auditCreate({
        userId: user_id,
        entity: 'Credit',
        newValues: { name, financial_entity, currency, credit_limit, current_balance, minimum_payment, statement_closing_day, payment_due_day, interest_rate },
        ipAddress: req.headers.get('x-forwarded-for') || null,
        fn: async () => {
          await db.execute(
            `INSERT INTO credit_cards (id, user_id, name, financial_entity, currency, credit_limit, current_balance, minimum_payment, statement_closing_day, payment_due_day, interest_rate, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [
              id,
              user_id,
              name,
              financial_entity,
              currency,
              sanitizeNumericAmount(credit_limit, 0),
              sanitizeNumericAmount(current_balance, 0),
              sanitizeNumericAmount(minimum_payment, 0),
              statement_closing_day || 1,
              payment_due_day,
              sanitizeNumericAmount(interest_rate, 0),
            ]
          )
        }
      })
    } else if (product_type === 'loan') {
      const principal = sanitizeNumericAmount(initial_amount, 0)
      const months = sanitizeNumericAmount(total_installments) || (sanitizeNumericAmount(loan_term_years, 1) * 12)
      const monthlyPayment = calculateMonthlyPayment(principal, sanitizeNumericAmount(interest_rate, 0), months)
      const total_with_interest = monthlyPayment * months
      await auditCreate({
        userId: user_id,
        entity: 'Credit',
        newValues: { name, financial_entity, currency, initial_amount: principal, total_with_interest, current_balance, loan_term_years, total_installments: months },
        ipAddress: req.headers.get('x-forwarded-for') || null,
        fn: async () => {
          await db.execute(
            `INSERT INTO loans (id, user_id, name, financial_entity, currency, initial_amount, total_with_interest, current_balance, loan_term_years, total_installments, paid_installments, installment_amount, payment_due_day, interest_rate, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [
              id,
              user_id,
              name,
              financial_entity,
              currency,
              principal,
              total_with_interest,
              sanitizeNumericAmount(current_balance, principal),
              sanitizeNumericAmount(loan_term_years, 1),
              months,
              0,
              monthlyPayment,
              payment_due_day,
              sanitizeNumericAmount(interest_rate, 0),
            ]
          )
        }
      })
    } else {
      return NextResponse.json({ error: 'Unsupported product type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Error creating credit:', e)
    return NextResponse.json({ error: 'Error creating credit' }, { status: 500 })
  }
}

// PUT - Update credit
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id,
      user_id,
      name,
      financial_entity,
      product_type,
      currency,
      interest_rate,
      current_balance,
      credit_limit,
      minimum_payment,
      statement_closing_day,
      payment_due_day,
      initial_amount,
      loan_term_years,
      total_installments,
      paid_installments,
      installment_amount,
    } = body

    if (!id || !user_id || !product_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate numeric amounts based on product type
    if (product_type === 'credit_card') {
      const validation = validateCreditCardAmounts(body)
      if (!validation.isValid) {
        return NextResponse.json(
          { error: 'Validación numérica fallida', details: validation.errors },
          { status: 400 }
        )
      }
    } else if (product_type === 'loan') {
      const validation = validateLoanAmounts(body)
      if (!validation.isValid) {
        return NextResponse.json(
          { error: 'Validación numérica fallida', details: validation.errors },
          { status: 400 }
        )
      }
    }

    if (product_type === 'credit_card') {
      // fetch before
      const beforeRes = await db.execute('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?', [id, user_id])
      const before = beforeRes.rows[0]

      await auditUpdate({
        userId: user_id,
        entity: 'Credit',
        entityId: id,
        oldValues: before || null,
        newValues: { name, financial_entity, currency, interest_rate, current_balance, credit_limit, minimum_payment, statement_closing_day, payment_due_day },
        ipAddress: req.headers.get('x-forwarded-for') || null,
        fn: async () => {
          await db.execute(
            `UPDATE credit_cards
             SET name = ?, financial_entity = ?, currency = ?, interest_rate = ?, current_balance = ?, credit_limit = ?, minimum_payment = ?, statement_closing_day = ?, payment_due_day = ?, updated_at = datetime('now')
             WHERE id = ? AND user_id = ?`,
            [
              name,
              financial_entity,
              currency,
              sanitizeNumericAmount(interest_rate, 0),
              sanitizeNumericAmount(current_balance, 0),
              sanitizeNumericAmount(credit_limit, 0),
              sanitizeNumericAmount(minimum_payment, 0),
              statement_closing_day || 1,
              payment_due_day || 1,
              id,
              user_id,
            ]
          )
        }
      })
    } else if (product_type === 'loan') {
      const principal = sanitizeNumericAmount(initial_amount, 0)
      const months = sanitizeNumericAmount(total_installments) || (sanitizeNumericAmount(loan_term_years, 1) * 12)
      const monthlyPayment = installment_amount ? sanitizeNumericAmount(installment_amount, 0) : calculateMonthlyPayment(principal, sanitizeNumericAmount(interest_rate, 0), months)
      const total_with_interest = monthlyPayment * months
      const beforeRes = await db.execute('SELECT * FROM loans WHERE id = ? AND user_id = ?', [id, user_id])
      const before = beforeRes.rows[0]

      await auditUpdate({
        userId: user_id,
        entity: 'Credit',
        entityId: id,
        oldValues: before || null,
        newValues: { name, financial_entity, currency, interest_rate, current_balance, initial_amount: principal, total_with_interest, loan_term_years, total_installments: months },
        ipAddress: req.headers.get('x-forwarded-for') || null,
        fn: async () => {
          await db.execute(
            `UPDATE loans
             SET name = ?, financial_entity = ?, currency = ?, interest_rate = ?, current_balance = ?, initial_amount = ?, total_with_interest = ?, loan_term_years = ?, total_installments = ?, paid_installments = ?, installment_amount = ?, payment_due_day = ?, updated_at = datetime('now')
             WHERE id = ? AND user_id = ?`,
            [
              name,
              financial_entity,
              currency,
              sanitizeNumericAmount(interest_rate, 0),
              sanitizeNumericAmount(current_balance, 0),
              principal,
              total_with_interest,
              sanitizeNumericAmount(loan_term_years, 1),
              months,
              sanitizeNumericAmount(paid_installments, 0),
              monthlyPayment,
              payment_due_day || 1,
              id,
              user_id,
            ]
          )
        }
      })
    } else {
      return NextResponse.json({ error: 'Unsupported product type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Error updating credit:', e)
    return NextResponse.json({ error: 'Error updating credit' }, { status: 500 })
  }
}

// DELETE - Delete credit
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const userId = searchParams.get('userId')

  if (!id || !userId) return NextResponse.json({ error: 'Missing id or userId' }, { status: 400 })

  try {
    // fetch existing
    const beforeCard = await db.execute('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?', [id, userId])
    const beforeLoan = await db.execute('SELECT * FROM loans WHERE id = ? AND user_id = ?', [id, userId])
    const before = beforeCard.rows[0] || beforeLoan.rows[0] || null

    await auditDelete({
      userId: userId,
      entity: 'Credit',
      entityId: id,
      oldValues: before || null,
      ipAddress: req.headers.get('x-forwarded-for') || null,
      fn: async () => {
        await db.execute('DELETE FROM credit_cards WHERE id = ? AND user_id = ?', [id, userId])
        await db.execute('DELETE FROM loans WHERE id = ? AND user_id = ?', [id, userId])
      }
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Error deleting credit:', e)
    return NextResponse.json({ error: 'Error deleting credit' }, { status: 500 })
  }
}
