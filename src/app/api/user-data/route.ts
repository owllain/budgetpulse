import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/turso'

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }

    const budgets = await db.execute({
      sql: 'SELECT id FROM budgets WHERE user_id = ?',
      args: [userId],
    })

    const budgetIds = budgets.rows.map(row => row[0] as string)
    if (budgetIds.length > 0) {
      const placeholders = budgetIds.map(() => '?').join(', ')
      await db.execute({
        sql: `DELETE FROM income_items WHERE budget_id IN (${placeholders})`,
        args: budgetIds,
      })
      await db.execute({
        sql: `DELETE FROM expense_items WHERE budget_id IN (${placeholders})`,
        args: budgetIds,
      })
    }

    await db.execute({ sql: 'DELETE FROM budgets WHERE user_id = ?', args: [userId] })
    await db.execute({ sql: 'DELETE FROM savings_goals WHERE user_id = ?', args: [userId] })
    await db.execute({ sql: 'DELETE FROM credit_cards WHERE user_id = ?', args: [userId] })
    await db.execute({ sql: 'DELETE FROM loans WHERE user_id = ?', args: [userId] })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE user-data error:', error)
    return NextResponse.json({ error: 'Error al eliminar los datos del usuario' }, { status: 500 })
  }
}
