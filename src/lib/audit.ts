/**
 * Middleware de Auditoría Inmutable
 * Intercepta y registra TODAS las modificaciones en BD
 * 
 * Estándar de Compliance:
 * - Atomicidad: Transacciones ACID
 * - Inmutabilidad: Logs nunca se modifican
 * - Trazabilidad: Quién, qué, cuándo, dónde
 * - No-repudio: IP, User-Agent capturados
 */

import { db } from '@/lib/turso'
import { v4 as uuid } from 'uuid'

/**
 * Acción auditada en la BD
 */
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT'

/**
 * Log de auditoría
 */
export interface AuditLog {
  id: string
  userId: string
  action: AuditAction
  entity: string
  entityId: string
  oldValues: Record<string, any> | null
  newValues: Record<string, any> | null
  ipAddress: string | null
  userAgent: string | null
  changes: string[] | null // Array de campos modificados
  metadata: Record<string, any> | null
  createdAt: Date
}

/**
 * Opciones para registrar auditoría
 */
export interface AuditOptions {
  userId: string
  action: AuditAction
  entity: string
  entityId: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

/**
 * Calcula qué campos cambiaron entre oldValues y newValues
 */
function calculateChanges(
  oldValues: Record<string, any> | undefined,
  newValues: Record<string, any> | undefined
): string[] {
  if (!oldValues || !newValues) return []

  const changes: string[] = []
  const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)])

  for (const key of allKeys) {
    if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
      changes.push(key)
    }
  }

  return changes
}

/**
 * Registra un evento de auditoría en la BD
 * 
 * IMPORTANTE: Esta función es atómica y debe usarse en transacciones
 * 
 * @param options Opciones de auditoría
 * @returns ID del log creado
 * 
 * @example
 * await logAudit({
 *   userId: 'user123',
 *   action: 'UPDATE',
 *   entity: 'Budget',
 *   entityId: 'budget456',
 *   oldValues: { name: 'Presupuesto 1' },
 *   newValues: { name: 'Presupuesto 1 - Actualizado' },
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...'
 * })
 */
export async function logAudit(options: AuditOptions): Promise<string> {
  const logId = uuid()
  const changes = calculateChanges(options.oldValues, options.newValues)

  try {
    await db.execute({
      sql: `
        INSERT INTO audit_logs (
          id, userId, action, entity, entityId,
          oldValues, newValues, ipAddress, userAgent,
          changes, metadata, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      args: [
        logId,
        options.userId,
        options.action,
        options.entity,
        options.entityId,
        options.oldValues ? JSON.stringify(options.oldValues) : null,
        options.newValues ? JSON.stringify(options.newValues) : null,
        options.ipAddress || null,
        options.userAgent || null,
        changes.length > 0 ? JSON.stringify(changes) : null,
        options.metadata ? JSON.stringify(options.metadata) : null,
      ],
    })

    return logId
  } catch (error) {
    console.error('[AuditLog] Error registrando auditoría:', error)
    throw error
  }
}

/**
 * Wrapper para operaciones CREATE
 * 
 * @example
 * const result = await auditCreate({
 *   userId,
 *   entity: 'Budget',
 *   newValues: { name: 'Mi Presupuesto', currency: 'CRC' },
 *   ipAddress,
 *   fn: async () => {
 *     const id = uuid()
 *     await db.execute(insertBudgetSQL, [id, ...])
 *     return id
 *   }
 * })
 */
export async function auditCreate({
  userId,
  entity,
  newValues,
  ipAddress,
  userAgent,
  metadata,
  fn,
}: {
  userId: string
  entity: string
  newValues: Record<string, any>
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
  fn: () => Promise<string>
}): Promise<string> {
  const entityId = await fn()

  await logAudit({
    userId,
    action: 'CREATE',
    entity,
    entityId,
    newValues,
    ipAddress,
    userAgent,
    metadata,
  })

  return entityId
}

/**
 * Wrapper para operaciones UPDATE
 * 
 * @example
 * await auditUpdate({
 *   userId,
 *   entity: 'Budget',
 *   entityId: 'budget123',
 *   oldValues: { name: 'Presupuesto Viejo' },
 *   newValues: { name: 'Presupuesto Nuevo' },
 *   ipAddress,
 *   fn: async () => {
 *     await db.execute(updateBudgetSQL, [newName, budgetId])
 *   }
 * })
 */
export async function auditUpdate({
  userId,
  entity,
  entityId,
  oldValues,
  newValues,
  ipAddress,
  userAgent,
  metadata,
  fn,
}: {
  userId: string
  entity: string
  entityId: string
  oldValues: Record<string, any>
  newValues: Record<string, any>
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
  fn: () => Promise<void>
}): Promise<void> {
  await fn()

  await logAudit({
    userId,
    action: 'UPDATE',
    entity,
    entityId,
    oldValues,
    newValues,
    ipAddress,
    userAgent,
    metadata,
  })
}

/**
 * Wrapper para operaciones DELETE
 * 
 * @example
 * await auditDelete({
 *   userId,
 *   entity: 'Budget',
 *   entityId: 'budget123',
 *   oldValues: { name: 'Presupuesto a Eliminar', currency: 'CRC' },
 *   ipAddress,
 *   fn: async () => {
 *     await db.execute(deleteBudgetSQL, [budgetId])
 *   }
 * })
 */
export async function auditDelete({
  userId,
  entity,
  entityId,
  oldValues,
  ipAddress,
  userAgent,
  metadata,
  fn,
}: {
  userId: string
  entity: string
  entityId: string
  oldValues: Record<string, any>
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
  fn: () => Promise<void>
}): Promise<void> {
  await fn()

  await logAudit({
    userId,
    action: 'DELETE',
    entity,
    entityId,
    oldValues,
    ipAddress,
    userAgent,
    metadata,
  })
}

/**
 * Wrapper para operaciones EXPORT (descarga de reportes, PDFs, etc)
 * 
 * @example
 * await auditExport({
 *   userId,
 *   entity: 'DebtStrategy',
 *   entityId: 'strategy123',
 *   ipAddress,
 *   metadata: { format: 'pdf', fileName: 'estrategia-pago.pdf' },
 *   fn: async () => {
 *     return generatePDF(strategy)
 *   }
 * })
 */
export async function auditExport({
  userId,
  entity,
  entityId,
  ipAddress,
  userAgent,
  metadata,
  fn,
}: {
  userId: string
  entity: string
  entityId: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
  fn: () => Promise<void>
}): Promise<void> {
  await logAudit({
    userId,
    action: 'EXPORT',
    entity,
    entityId,
    ipAddress,
    userAgent,
    metadata,
  })

  await fn()
}

/**
 * Obtiene el historial de auditoría de un usuario
 * 
 * @param userId ID del usuario
 * @param options Opciones de filtrado
 * @returns Array de logs de auditoría
 */
export async function getAuditHistory(
  userId: string,
  options?: {
    entity?: string
    action?: AuditAction
    limit?: number
    offset?: number
  }
): Promise<AuditLog[]> {
  let sql = 'SELECT * FROM audit_logs WHERE userId = ?'
  const args: any[] = [userId]

  if (options?.entity) {
    sql += ' AND entity = ?'
    args.push(options.entity)
  }

  if (options?.action) {
    sql += ' AND action = ?'
    args.push(options.action)
  }

  sql += ' ORDER BY createdAt DESC'

  if (options?.limit) {
    sql += ` LIMIT ${options.limit}`
  }

  if (options?.offset) {
    sql += ` OFFSET ${options.offset}`
  }

  const result = await db.execute({ sql, args })

  return result.rows.map(row => ({
    id: row[0] as string,
    userId: row[1] as string,
    action: row[2] as AuditAction,
    entity: row[3] as string,
    entityId: row[4] as string,
    oldValues: row[5] ? JSON.parse(row[5] as string) : null,
    newValues: row[6] ? JSON.parse(row[6] as string) : null,
    ipAddress: row[7] as string | null,
    userAgent: row[8] as string | null,
    changes: row[9] ? JSON.parse(row[9] as string) : null,
    metadata: row[10] ? JSON.parse(row[10] as string) : null,
    createdAt: new Date(row[11] as string),
  }))
}

/**
 * Obtiene el historial de auditoría de una entidad específica
 * 
 * @example
 * const budgetHistory = await getEntityAuditHistory('Budget', 'budget123')
 * budgetHistory.forEach(log => {
 *   console.log(`${log.action} by ${log.userId}`)
 *   console.log(`Changes: ${log.changes?.join(', ')}`)
 * })
 */
export async function getEntityAuditHistory(
  entity: string,
  entityId: string
): Promise<AuditLog[]> {
  const result = await db.execute({
    sql: `
      SELECT * FROM audit_logs
      WHERE entity = ? AND entityId = ?
      ORDER BY createdAt DESC
    `,
    args: [entity, entityId],
  })

  return result.rows.map(row => ({
    id: row[0] as string,
    userId: row[1] as string,
    action: row[2] as AuditAction,
    entity: row[3] as string,
    entityId: row[4] as string,
    oldValues: row[5] ? JSON.parse(row[5] as string) : null,
    newValues: row[6] ? JSON.parse(row[6] as string) : null,
    ipAddress: row[7] as string | null,
    userAgent: row[8] as string | null,
    changes: row[9] ? JSON.parse(row[9] as string) : null,
    metadata: row[10] ? JSON.parse(row[10] as string) : null,
    createdAt: new Date(row[11] as string),
  }))
}

/**
 * Obtiene estadísticas de auditoría global
 */
export async function getAuditStats(userId: string): Promise<{
  totalEvents: number
  byAction: Record<AuditAction, number>
  byEntity: Record<string, number>
  lastEvent: Date | null
}> {
  const result = await db.execute({
    sql: `
      SELECT action, entity, COUNT(*) as count
      FROM audit_logs
      WHERE userId = ?
      GROUP BY action, entity
    `,
    args: [userId],
  })

  const byAction: Record<string, number> = {}
  const byEntity: Record<string, number> = {}
  let totalEvents = 0

  result.rows.forEach(row => {
    const action = row[0] as string
    const entity = row[1] as string
    const count = row[2] as number

    byAction[action] = (byAction[action] || 0) + count
    byEntity[entity] = (byEntity[entity] || 0) + count
    totalEvents += count
  })

  // Obtener último evento
  const lastEventResult = await db.execute({
    sql: 'SELECT MAX(createdAt) FROM audit_logs WHERE userId = ?',
    args: [userId],
  })

  const lastEvent = lastEventResult.rows[0]?.[0]
    ? new Date(lastEventResult.rows[0][0] as string)
    : null

  return {
    totalEvents,
    byAction: byAction as Record<AuditAction, number>,
    byEntity,
    lastEvent,
  }
}
