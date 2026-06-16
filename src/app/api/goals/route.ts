import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/turso'
import { v4 as uuid } from 'uuid'

export async function GET() {
  try {
    const goals = await db.execute('SELECT * FROM savings_goals ORDER BY created_at DESC')
    return NextResponse.json({ goals: goals.rows })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, targetAmount, currentAmount = 0, targetDate, currency = 'CRC' } = await req.json()
    const id = uuid()
    await db.execute({
      sql: `INSERT INTO savings_goals (id, name, target_amount, current_amount, target_date, currency) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, name, targetAmount, currentAmount, targetDate || null, currency],
    })
    return NextResponse.json({ id, message: 'Goal created' }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, currentAmount } = await req.json()
    await db.execute({
      sql: 'UPDATE savings_goals SET current_amount = ? WHERE id = ?',
      args: [currentAmount, id],
    })
    return NextResponse.json({ message: 'Updated' })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
