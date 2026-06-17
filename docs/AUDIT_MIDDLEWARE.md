# Uso del Middleware de Auditoría (Prisma)

Este documento explica cómo usar el middleware de auditoría y los helpers `setAuditContext` / `clearAuditContext` definidos en `src/lib/prisma-client.ts`.

Resumen rápido:

- Antes de ejecutar operaciones que modifican la base de datos, establece el contexto de auditoría con `setAuditContext({ userId, ipAddress, userAgent })`.
- Ejecuta tus operaciones con `prisma` normalmente (create/update/delete). El middleware registrará un `AuditLog` de forma atómica cuando se use Prisma.
- Luego limpia el contexto con `clearAuditContext()` (recomendado en `finally`).

Ejemplo (Next.js API route con Prisma):

```ts
import { prisma, setAuditContext, clearAuditContext } from '@/lib/prisma-client'

export async function POST(req: Request) {
  const session = await getServerSession()
  const ip = req.headers.get('x-forwarded-for') || null

  setAuditContext({ userId: session?.user?.email || null, ipAddress: ip, userAgent: req.headers.get('user-agent') })

  try {
    const created = await prisma.budget.create({ data: { /* ... */ } })
    return new Response(JSON.stringify(created), { status: 201 })
  } finally {
    clearAuditContext()
  }
}
```

Notas importantes:

- Si tu código usa el cliente `turso` (SQL directo con `db.execute`), utiliza las funciones de auditoría en `src/lib/audit.ts` (`auditCreate`, `auditUpdate`, `auditDelete`, `auditExport`). Estas funciones insertan logs pero NO están integradas en la transacción de la operación por defecto; intenta capturar `oldValues` antes de ejecutar cambios para mayor trazabilidad.
- Asegúrate de que tus modelos usan `id` como PK si confías en la extracción automática de `entityId` en el middleware Prisma. Si usas otra llave primaria, adapta el middleware o provee `entityId` manualmente en los wrappers.
- Para descargas/exports (PDF), usa `auditExport` para registrar una acción `EXPORT` (ya usamos esto en `/api/export-strategy-pdf`).

Si quieres, puedo automatizar la instrumentación en más endpoints (transacciones, créditos, etc.).
