/**
 * Script de Migración para Tabla de Auditoría
 * Ejecutar una sola vez: npx ts-node scripts/create-audit-log.ts
 * 
 * Crea la tabla AuditLog para cumplimiento bancario/compliance
 */

import { db } from '@/lib/turso'

async function createAuditLogTable() {
  try {
    console.log('🔐 Creando tabla AuditLog...')

    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE', 'EXPORT')),
        entity TEXT NOT NULL,
        entityId TEXT NOT NULL,
        oldValues TEXT,
        newValues TEXT,
        ipAddress TEXT,
        userAgent TEXT,
        changes TEXT,
        metadata TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    console.log('✅ Tabla AuditLog creada exitosamente')

    // Crear índices para búsquedas rápidas
    console.log('📑 Creando índices...')

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_audit_userId ON audit_logs(userId)
    `)

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, entityId)
    `)

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)
    `)

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_audit_createdAt ON audit_logs(createdAt DESC)
    `)

    console.log('✅ Índices creados exitosamente')
    console.log('🎉 Migración completada')
  } catch (error) {
    console.error('❌ Error en migración:', error)
    process.exit(1)
  }
}

createAuditLogTable()
