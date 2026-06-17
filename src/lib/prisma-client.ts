import { PrismaClient } from '@prisma/client'

type AuditContext = {
  userId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['query'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Context used by the audit middleware. Set this per-request before running writes.
 */
export function setAuditContext(ctx: AuditContext) {
  ;(prisma as any).__auditContext = ctx
}

export function clearAuditContext() {
  ;(prisma as any).__auditContext = undefined
}

// Middleware: intercept write operations and record an AuditLog atomically
prisma.$use(async (params, next) => {
  const writeActions = ['create', 'update', 'delete', 'upsert']

  if (!params.model || !writeActions.includes(params.action)) {
    return next(params)
  }

  const auditCtx: AuditContext = (prisma as any).__auditContext || {}
  const userId = auditCtx.userId ?? null
  const ipAddress = auditCtx.ipAddress ?? null
  const userAgent = auditCtx.userAgent ?? null

  const model = params.model
  const action = params.action.toUpperCase()

  try {
    // Use transaction callback form so both the original operation and the audit
    // creation happen atomically.
    return await prisma.$transaction(async (tx) => {
      if (params.action === 'create') {
        const created = await (tx as any)[model].create(params.args)

        await tx.auditLog.create({
          data: {
            userId,
            action,
            entity: model,
            entityId: String((created as any).id ?? ''),
            oldValues: null,
            newValues: created,
            ipAddress,
            userAgent,
            changes: null,
          },
        })

        return created
      }

      if (params.action === 'update') {
        const before = await (tx as any)[model].findUnique({ where: params.args.where })
        const updated = await (tx as any)[model].update(params.args)

        await tx.auditLog.create({
          data: {
            userId,
            action,
            entity: model,
            entityId: String(params.args.where.id ?? ''),
            oldValues: before,
            newValues: updated,
            ipAddress,
            userAgent,
            changes: null,
          },
        })

        return updated
      }

      if (params.action === 'delete') {
        const before = await (tx as any)[model].findUnique({ where: params.args.where })
        const deleted = await (tx as any)[model].delete(params.args)

        await tx.auditLog.create({
          data: {
            userId,
            action,
            entity: model,
            entityId: String(params.args.where.id ?? ''),
            oldValues: before,
            newValues: null,
            ipAddress,
            userAgent,
            changes: null,
          },
        })

        return deleted
      }

      // Fallback
      return next(params)
    })
  } catch (err) {
    console.error('[Prisma Audit Middleware] Error:', err)
    throw err
  }
})

export default prisma
