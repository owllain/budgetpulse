/**
 * API Route: POST /api/export-strategy-pdf
 * Genera y descarga un PDF con la estrategia de deuda optimizada
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateDebtStrategyPDF } from '@/lib/pdf-generator'
import { optimizarDeudas, type Debt } from '@/lib/financial/debt-optimizer'
import { auditExport } from '@/lib/audit'
import { db } from '@/lib/turso'
import { getServerSession } from 'next-auth/next'

interface RequestBody {
  deudas: Debt[]
  presupuestoExtra: number
}

/**
 * POST /api/export-strategy-pdf
 * 
 * Body:
 * {
 *   "deudas": [...],
 *   "presupuestoExtra": 50000
 * }
 * 
 * Retorna: PDF descargable (application/pdf)
 */
export async function POST(req: NextRequest) {
  try {
    // Obtener usuario autenticado
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body: RequestBody = await req.json()

    // Validar input
    if (!Array.isArray(body.deudas) || !body.deudas.length) {
      return NextResponse.json({ error: 'Deudas requeridas' }, { status: 400 })
    }

    // Optimizar deudas
    const resultado = optimizarDeudas(body.deudas, body.presupuestoExtra)

    // Generar PDF
    const pdfBuffer = await generateDebtStrategyPDF(
      resultado,
      session.user.name || 'Usuario',
      session.user.email
    )

    // Registrar en auditoría (EXPORT)
    const strategyId = `strategy_${Date.now()}`
    await auditExport({
      userId: session.user.email,
      entity: 'DebtStrategy',
      entityId: strategyId,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      metadata: {
        format: 'pdf',
        fileName: `estrategia-deuda-${new Date().toISOString().split('T')[0]}.pdf`,
        deudaCount: body.deudas.length,
        presupuestoExtra: body.presupuestoExtra,
      },
      fn: async () => {
        // El archivo se genera en la función anterior
      },
    })
    // Guardar metadatos mínimos en DebtStrategy (no persistimos la estrategia completa)
    try {
      await db.execute({
        sql: `INSERT INTO debt_strategies (id, userId, strategyId, strategyType, fileName, debtCount, presupuestoExtra, metadata, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [
          `ds_${Date.now()}`,
          session.user.email,
          strategyId,
          'debt_optimizer',
          `estrategia-deuda-${new Date().toISOString().split('T')[0]}.pdf`,
          body.deudas.length,
          body.presupuestoExtra,
          JSON.stringify({ exportedAt: new Date().toISOString() }),
        ],
      })
    } catch (err) {
      console.error('Error saving DebtStrategy metadata to Turso:', err)
    }

    // Retornar PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="estrategia-deuda-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[/api/export-strategy-pdf] Error:', error)

    if (error instanceof Error && error.message.includes('Validación')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error al generar PDF' },
      { status: 500 }
    )
  }
}
