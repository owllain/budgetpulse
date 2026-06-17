/**
 * In-Memory Cache with TTL and Invalidation Strategy
 * Útil para datos que requieren caché rápido antes de persistencia en BD
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
  createdAt: number
  hits: number
}

interface CacheStats {
  size: number
  hits: number
  misses: number
  hitRate: number
}

export class Cache<T> {
  private store = new Map<string, CacheEntry<T>>()
  private hits: number = 0
  private misses: number = 0

  /**
   * Obtiene un valor del caché
   * @param key Clave del caché
   * @returns Valor si existe y no ha expirado, undefined si no existe o expiró
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key)

    if (!entry) {
      this.misses++
      return undefined
    }

    // Verifica si expiró
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      this.misses++
      return undefined
    }

    entry.hits++
    this.hits++
    return entry.value
  }

  /**
   * Establece un valor en el caché con TTL opcional
   * @param key Clave del caché
   * @param value Valor a almacenar
   * @param ttlMs Time-to-live en milisegundos (default: 5 minutos)
   */
  set(key: string, value: T, ttlMs: number = 300000): void {
    const now = Date.now()
    this.store.set(key, {
      value,
      expiresAt: now + ttlMs,
      createdAt: now,
      hits: 0,
    })
  }

  /**
   * Invalida una entrada específica
   */
  invalidate(key: string): boolean {
    return this.store.delete(key)
  }

  /**
   * Invalida todas las entradas que coincidan con un patrón regex
   */
  invalidateByPattern(pattern: RegExp): number {
    let count = 0
    for (const key of this.store.keys()) {
      if (pattern.test(key)) {
        this.store.delete(key)
        count++
      }
    }
    return count
  }

  /**
   * Limpia todas las entradas expiradas
   */
  cleanup(): number {
    const now = Date.now()
    let count = 0
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
        count++
      }
    }
    return count
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.store.clear()
    this.hits = 0
    this.misses = 0
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
    }
  }

  /**
   * Obtiene todas las claves
   */
  keys(): string[] {
    return Array.from(this.store.keys())
  }

  /**
   * Obtiene información de todas las entradas
   */
  entries(): Array<{ key: string; value: T; expiresIn: number; hits: number }> {
    const now = Date.now()
    return Array.from(this.store.entries()).map(([key, entry]) => ({
      key,
      value: entry.value,
      expiresIn: Math.max(0, entry.expiresAt - now),
      hits: entry.hits,
    }))
  }
}

/**
 * Factory para crear cachés singleton por tipo
 */
const caches = new Map<string, Cache<any>>()

export function getOrCreateCache<T>(name: string): Cache<T> {
  if (!caches.has(name)) {
    caches.set(name, new Cache<T>())
  }
  return caches.get(name)!
}

/**
 * Limpia la memoria caché periódicamente
 * @param intervalMs Intervalo de limpieza en milisegundos (default: 5 minutos)
 */
export function startCacheCleanupInterval(intervalMs: number = 300000): NodeJS.Timer {
  return setInterval(() => {
    let totalCleaned = 0
    for (const [name, cache] of caches.entries()) {
      const cleaned = (cache as Cache<any>).cleanup()
      if (cleaned > 0) {
        console.log(`[Cache] ${name}: cleaned ${cleaned} expired entries`)
        totalCleaned += cleaned
      }
    }
    if (totalCleaned > 0) {
      console.log(`[Cache] Total cleaned: ${totalCleaned} entries`)
    }
  }, intervalMs)
}
