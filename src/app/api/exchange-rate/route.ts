import { NextResponse } from 'next/server'
import { db } from '@/lib/turso'
import { createCircuitBreaker } from '@/lib/circuit-breaker'
import { getOrCreateCache } from '@/lib/cache'
import { v4 as uuid } from 'uuid'

const HACIENDA_API_URL = 'https://api.hacienda.go.cr/indicadores/tc'
const HACIENDA_BACKUP_API = 'https://api.bccr.fi.cr/indicador/cotizacion'

// Cache en memoria para respuestas rápidas
const exchangeRateCache = getOrCreateCache<{ buy: number; sell: number }>('exchange_rates')

// Circuit breaker para proteger la API de Hacienda
const haciendaCircuitBreaker = createCircuitBreaker(
  async () => {
    const response = await fetch(HACIENDA_API_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000), // Timeout de 5 segundos
    })

    if (!response.ok) {
      throw new Error(`Hacienda API returned ${response.status}`)
    }

    const data = await response.json()
    const buy = Number(data?.dolar?.compra?.valor)
    const sell = Number(data?.dolar?.venta?.valor)

    if (!Number.isFinite(buy) || !Number.isFinite(sell)) {
      throw new Error('Invalid rate values from Hacienda API')
    }

    return { buy, sell }
  },
  {
    failureThreshold: 3,
    successThreshold: 2,
    resetTimeout: 60000, // 1 minuto
  }
)

/**
 * Intenta obtener tasas de cambio con retry y fallback
 */
async function fetchExchangeRates(): Promise<{ buy: number; sell: number } | null> {
  try {
    // Intenta con Circuit Breaker
    return await haciendaCircuitBreaker.execute()
  } catch (error) {
    console.error('[ExchangeRate] Circuit breaker or Hacienda API failed:', error)

    // Intenta backup (BCCR)
    try {
      const response = await fetch(HACIENDA_BACKUP_API, {
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        const data = await response.json()
        const buy = Number(data?.buy)
        const sell = Number(data?.sell)

        if (Number.isFinite(buy) && Number.isFinite(sell)) {
          console.info('[ExchangeRate] Using backup BCCR API')
          return { buy, sell }
        }
      }
    } catch (backupError) {
      console.error('[ExchangeRate] Backup API also failed:', backupError)
    }

    return null
  }
}

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `hacienda_${today}`

    // 1. Intenta obtener del caché en memoria (milisegundos)
    let cached = exchangeRateCache.get(cacheKey)
    if (cached) {
      return NextResponse.json({
        date: today,
        buy: cached.buy,
        sell: cached.sell,
        source: 'Hacienda',
        cached: true,
        cacheSource: 'memory',
      })
    }

    // 2. Intenta obtener de la BD (si ya fue consultado hoy)
    const dbCached = await db.execute({
      sql: 'SELECT buy_rate, sell_rate FROM exchange_rates WHERE date = ? AND source = ? ORDER BY created_at DESC LIMIT 1',
      args: [today, 'Hacienda'],
    })

    if (dbCached.rows.length > 0) {
      const buy = Number(dbCached.rows[0][0])
      const sell = Number(dbCached.rows[0][1])

      // Carga en memoria para próximas solicitudes
      exchangeRateCache.set(cacheKey, { buy, sell }, 3600000) // 1 hora

      return NextResponse.json({
        date: today,
        buy,
        sell,
        source: 'Hacienda',
        cached: true,
        cacheSource: 'database',
      })
    }

    // 3. Intenta obtener de la API externa
    const rates = await fetchExchangeRates()

    if (rates) {
      // Persiste en BD y caché
      try {
        await db.execute({
          sql: 'INSERT INTO exchange_rates (id, date, buy_rate, sell_rate, source) VALUES (?, ?, ?, ?, ?)',
          args: [uuid(), today, rates.buy, rates.sell, 'Hacienda'],
        })
      } catch (dbError) {
        console.error('[ExchangeRate] Error saving to database:', dbError)
        // No falla la respuesta si la BD tiene problemas
      }

      exchangeRateCache.set(cacheKey, rates, 3600000) // 1 hora

      return NextResponse.json({
        date: today,
        buy: rates.buy,
        sell: rates.sell,
        source: 'Hacienda',
        cached: false,
        fresh: true,
      })
    }

    // 4. Fallback: último valor conocido de la BD
    const fallback = await db.execute({
      sql: 'SELECT buy_rate, sell_rate, date FROM exchange_rates WHERE source = ? ORDER BY date DESC LIMIT 1',
      args: ['Hacienda'],
    })

    if (fallback.rows.length > 0) {
      const buy = Number(fallback.rows[0][0])
      const sell = Number(fallback.rows[0][1])
      const date = String(fallback.rows[0][2])

      return NextResponse.json({
        date,
        buy,
        sell,
        source: 'Hacienda',
        cached: true,
        fallback: true,
        warning: 'API no disponible. Usando último valor conocido.',
      })
    }

    // 5. Último recurso: valor estimado
    return NextResponse.json({
      date: today,
      buy: 505.5,
      sell: 515.5,
      source: 'estimado',
      cached: false,
      warning: 'No se pudo obtener tipo de cambio. Usando valor estimado.',
    })
  } catch (error) {
    console.error('[ExchangeRate] Unhandled error:', error)

    return NextResponse.json(
      {
        date: new Date().toISOString().split('T')[0],
        buy: 505.5,
        sell: 515.5,
        source: 'estimado',
        error: 'Error al obtener tipo de cambio. Usando valor estimado.',
      },
      { status: 200 }
    )
  }
}
