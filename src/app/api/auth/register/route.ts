import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db, verifyTursoConfig } from '@/lib/turso'
import { v4 as uuid } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    verifyTursoConfig()

    const { email, name, password } = await req.json()
    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase()
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [normalizedEmail],
    })
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Este correo ya está registrado' }, { status: 409 })
    }

    const hash = await bcrypt.hash(password, 12)
    const userId = uuid()

    await db.execute({
      sql: `INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'user', datetime('now'), datetime('now'))`,
      args: [userId, normalizedEmail, name, hash],
    })

    return NextResponse.json({
      message: 'Usuario creado correctamente.',
      userId,
    }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    if (error instanceof Error && /TURSO_AUTH_TOKEN|401|Unauthorized|SERVER_ERROR/.test(error.message)) {
      return NextResponse.json({ error: 'Error de configuración de la base de datos. Revisa TURSO_DATABASE_URL y TURSO_AUTH_TOKEN.' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
