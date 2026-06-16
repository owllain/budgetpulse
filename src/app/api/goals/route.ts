import { NextRequest, NextResponse } from 'next/server'
import { db, hasColumn } from '@/lib/turso'
import { v4 as uuid } from 'uuid'

// GET /api/goals?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    const goalsHasUser = await hasColumn('savings_goals', 'user_id')

    if (goalsHasUser && !userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }

    const sql = goalsHasUser
      ? 'SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM savings_goals ORDER BY created_at DESC'

    const goals = await db.execute({ sql, args: goalsHasUser ? [userId] : [] })

    return NextResponse.json(goals.rows.map(g => ({
      id: g.id,
      name: g.name,
      targetAmount: g.target_amount,
      currentAmount: g.current_amount,
      targetDate: g.target_date,
      currency: g.currency,
      userId: goalsHasUser ? g.user_id : undefined,
      createdAt: g.created_at,
    })))
  } catch (error) {
    console.error('GET goals error:', error)
    return NextResponse.json({ error: 'Error al obtener metas' }, { status: 500 })
  }
}

// POST /api/goals
export async function POST(req: NextRequest) {
  try {
    const { name, targetAmount, currentAmount, targetDate, currency, userId } = await req.json()
    const goalsHasUser = await hasColumn('savings_goals', 'user_id')

    if (!name || !targetAmount || (goalsHasUser && !userId)) {
      return NextResponse.json({ error: 'Nombre, monto objetivo y usuario son requeridos' }, { status: 400 })
    }

    const id = uuid()
    const columns = ['id', 'name', 'target_amount', 'current_amount', 'target_date', 'currency']
    const values = ['?', '?', '?', '?', '?', '?']
    const args = [id, name, targetAmount, currentAmount || 0, targetDate || null, currency || 'CRC']

    if (goalsHasUser) {
      columns.splice(1, 0, 'user_id')
      values.splice(1, 0, '?')
      args.splice(1, 0, userId)
    }

    await db.execute({
      sql: `INSERT INTO savings_goals (${columns.join(', ')}) VALUES (${values.join(', ')})`,
      args,
    })

    return NextResponse.json({
      id,
      name,
      targetAmount,
      currentAmount: currentAmount || 0,
      targetDate,
      currency: currency || 'CRC',
      userId: goalsHasUser ? userId : undefined,
    }, { status: 201 })
  } catch (error) {
    console.error('POST goals error:', error)
    return NextResponse.json({ error: 'Error al crear meta' }, { status: 500 })
  }
}

// PUT /api/goals
export async function PUT(req: NextRequest) {
  try {
    const { id, name, targetAmount, currentAmount, targetDate, currency } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    await db.execute({
      sql: `UPDATE savings_goals SET name=?, target_amount=?, current_amount=?, target_date=?, currency=? WHERE id=?`,
      args: [name, targetAmount, currentAmount, targetDate || null, currency || 'CRC', id],
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT goals error:', error)
    return NextResponse.json({ error: 'Error al actualizar meta' }, { status: 500 })
  }
}

// DELETE /api/goals
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    await db.execute({ sql: 'DELETE FROM savings_goals WHERE id = ?', args: [id] })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE goals error:', error)
    return NextResponse.json({ error: 'Error al eliminar meta' }, { status: 500 })
  }
}
