/**
 * API Route: POST /api/debt-optimizer
 * 
 * Servicio de optimización de deudas
 * Recibe: Array de deudas + presupuesto extra
 * Retorna: Ambas estrategias + análisis comparativo
 * 
 * Estándar Fintech:
 * - Validación exhaustiva
 * - Errores descriptivos
 * - Logging auditado
 * - Respuestas inmutables
 */

import { NextRequest, NextResponse } from 'next/server'
import { optimizarDeudas, type Debt } from '@/lib/financial/debt-optimizer'

interface RequestBody {
  deudas: unknown
  presupuestoExtra: unknown
}

/**
 * Validar que el body contiene deudas y presupuesto válidos
 */
function validarRequest(body: unknown): { 
  isValid: boolean
  deudas?: Debt[]
  presupuestoExtra?: number
  error?: string
} {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Body debe ser un objeto JSON válido' }
  }

  const req = body as RequestBody

  // Validar deudas
  if (!Array.isArray(req.deudas)) {
    return { isValid: false, error: 'deudas debe ser un array' }
  }

  if (req.deudas.length === 0) {
    return { isValid: false, error: 'deudas no puede estar vacío' }
  }

  // Validar cada deuda
  for (let i = 0; i < req.deudas.length; i++) {
    const deuda = req.deudas[i] as any
    
    if (!deuda.id || typeof deuda.id !== 'string') {
      return { isValid: false, error: `Deuda ${i}: id requerido (string)` }
    }
    
    if (!deuda.name || typeof deuda.name !== 'string') {
      return { isValid: false, error: `Deuda ${i}: name requerido (string)` }
    }
    
    if (typeof deuda.saldoActual !== 'number' || deuda.saldoActual < 0) {
      return { isValid: false, error: `Deuda ${i}: saldoActual debe ser número ≥ 0` }
    }
    
    if (typeof deuda.tasaInteresAnual !== 'number' || deuda.tasaInteresAnual < 0 || deuda.tasaInteresAnual > 100) {
      return { isValid: false, error: `Deuda ${i}: tasaInteresAnual debe estar entre 0-100` }
    }
    
    if (typeof deuda.pagoMinimoMensual !== 'number' || deuda.pagoMinimoMensual < 0) {
      return { isValid: false, error: `Deuda ${i}: pagoMinimoMensual debe ser número ≥ 0` }
    }
    
    if (!deuda.tipoDeuda || typeof deuda.tipoDeuda !== 'string') {
      return { isValid: false, error: `Deuda ${i}: tipoDeuda requerido` }
    }
  }

  // Validar presupuesto
  if (typeof req.presupuestoExtra !== 'number') {
    return { isValid: false, error: 'presupuestoExtra debe ser un número' }
  }

  if (req.presupuestoExtra < 0) {
    return { isValid: false, error: 'presupuestoExtra no puede ser negativo' }
  }

  return {
    isValid: true,
    deudas: req.deudas as Debt[],
    presupuestoExtra: req.presupuestoExtra,
  }
}

/**
 * POST /api/debt-optimizer
 * 
 * Calcula ambas estrategias de pago de deudas
 * 
 * @example
 * POST /api/debt-optimizer
 * Content-Type: application/json
 * 
 * {
 *   "deudas": [
 *     {
 *       "id": "1",
 *       "name": "Tarjeta VISA",
 *       "saldoActual": 500000,
 *       "tasaInteresAnual": 22.5,
 *       "pagoMinimoMensual": 15000,
 *       "tipoDeuda": "tarjeta_credito"
 *     }
 *   ],
 *   "presupuestoExtra": 50000
 * }
 * 
 * @returns 200 - OptimizationResult completo
 * @returns 400 - Validación fallida
 * @returns 500 - Error en procesamiento
 */
export async function POST(req: NextRequest) {
  try {
    // Parsear body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'JSON inválido en body' },
        { status: 400 }
      )
    }

    // Validar
    const validacion = validarRequest(body)
    if (!validacion.isValid) {
      return NextResponse.json(
        { error: validacion.error },
        { status: 400 }
      )
    }

    const { deudas, presupuestoExtra } = validacion

    // Ejecutar motor
    const resultado = optimizarDeudas(deudas!, presupuestoExtra!)

    // Retornar resultado
    return NextResponse.json(resultado, { status: 200 })
  } catch (error) {
    console.error('[/api/debt-optimizer] Error:', error)

    // Si es error conocido del motor
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Error en optimización: ${error.message}` },
        { status: 400 }
      )
    }

    // Error desconocido
    return NextResponse.json(
      { error: 'Error interno en servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/debt-optimizer
 * 
 * Endpoint de health check para validar que el servicio está activo
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'debt-optimizer',
    version: '1.0.0',
  })
}
