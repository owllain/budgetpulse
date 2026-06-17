import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/turso'
import { auditDelete } from '@/lib/audit'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const { id, itemId } = await params

    const beforeRes = await db.execute({ sql: 'SELECT * FROM income_items WHERE id = ? AND budget_id = ?', args: [itemId, id] })
    const before = beforeRes.rows[0]

    await auditDelete({
      userId: before?.user_id || 'unknown',
      entity: 'IncomeItem',
      entityId: itemId,
      oldValues: before || null,
      ipAddress: req.headers.get('x-forwarded-for') || null,
      fn: async () => {
        await db.execute({ sql: 'DELETE FROM income_items WHERE id = ? AND budget_id = ?', args: [itemId, id] })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE income error:', error)
    return NextResponse.json({ error: 'Error al eliminar ingreso' }, { status: 500 })
  }
}
