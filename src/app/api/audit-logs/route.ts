/**
 * API Route: GET /api/audit-logs
 * Obtiene el historial de auditoría del usuario autenticado
 * 
 * Soporta:
 * - Filtrado por entidad, acción
 * - Paginación
 * - Estadísticas globales
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuditHistory, getAuditStats, getEntityAuditHistory } from '@/lib/audit'
import { getServerSession } from 'next-auth/next'

/**
 * GET /api/audit-logs
 * 
 * Query params:
 * - entity?: string (ej. 'Budget', 'Credit')
 * - action?: string (ej. 'CREATE', 'UPDATE', 'DELETE')
 * - limit?: number (default: 50)
 * - offset?: number (default: 0)
 * - stats?: 'true' (incluir estadísticas)
 * - entityId?: string (historial de entidad específica)
 */
export async function GET(req: NextRequest) {
  try {
    // Obtener usuario autenticado
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const entity = searchParams.get('entity') || undefined
    const action = (searchParams.get('action') as any) || undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeStats = searchParams.get('stats') === 'true'
    const entityId = searchParams.get('entityId') || undefined

    // TODO: Obtener userId real del usuario autenticado
    // Por ahora usar email como proxy (debería ser userId de la sesión)
    const userId = session.user.email

    let logs
    if (entityId && entity) {
      logs = await getEntityAuditHistory(entity, entityId)
    } else {
      logs = await getAuditHistory(userId, {
        entity,
        action,
        limit,
        offset,
      })
    }

    const response: any = { logs }

    if (includeStats) {
      response.stats = await getAuditStats(userId)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[/api/audit-logs] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener auditoría' },
      { status: 500 }
    )
  }
}
