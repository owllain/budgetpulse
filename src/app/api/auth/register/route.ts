import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/turso'
import { v4 as uuid } from 'uuid'

// Password validation: uppercase, lowercase, numbers, special chars, 4-16 chars
function validatePassword(pw: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (pw.length < 4) errors.push('Mínimo 4 caracteres')
  if (pw.length > 16) errors.push('Máximo 16 caracteres')
  if (!/[A-Z]/.test(pw)) errors.push('Al menos una mayúscula')
  if (!/[a-z]/.test(pw)) errors.push('Al menos una minúscula')
  if (!/[0-9]/.test(pw)) errors.push('Al menos un número')
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push('Al menos un carácter especial')
  return { valid: errors.length === 0, errors }
}

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json()

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Correo electrónico inválido' }, { status: 400 })
    }

    // Validate password
    const pwValidation = validatePassword(password)
    if (!pwValidation.valid) {
      return NextResponse.json({ error: pwValidation.errors.join('. ') }, { status: 400 })
    }

    // Check if user exists
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email.toLowerCase()],
    })
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Este correo ya está registrado' }, { status: 409 })
    }

    // Hash password
    const hash = await bcrypt.hash(password, 12)

    // Create user (pending approval)
    const userId = uuid()
    await db.execute({
      sql: `INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`,
      args: [userId, email.toLowerCase(), name, hash],
    })

    // Send notification email (via LLM/email service)
    try {
      const notifUrl = process.env.NOTIFICATION_URL
      if (notifUrl) {
        await fetch(notifUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'alvaro.cascante.m@cpic.cr',
            subject: `Nueva solicitud de registro - BudgetPulse`,
            body: `Nuevo usuario solicita acceso:\n\nCorreo: ${email}\nNombre: ${name}\n\nApruebe o rechace desde el panel de administración.`,
          }),
        })
      }
    } catch {
      // Email notification is best-effort
    }

    return NextResponse.json({
      message: 'Solicitud enviada. Un administrador revisará su registro.',
      userId,
    }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
