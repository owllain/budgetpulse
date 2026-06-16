import { NextResponse } from 'next/server'
import { db } from '@/lib/turso'
import { v4 as uuid } from 'uuid'

const HACIENDA_API_URL = 'https://api.hacienda.go.cr/indicadores/tc'

async function fetchHaciendaRate(): Promise<{ buy: number; sell: number } | null> {
  try {
    const response = await fetch(HACIENDA_API_URL, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Hacienda API status:', response.status)
      return null
    }

    const data = await response.json()
    const buy = Number(data?.dolar?.compra?.valor)
    const sell = Number(data?.dolar?.venta?.valor)

    if (!Number.isFinite(buy) || !Number.isFinite(sell)) {
      console.error('Hacienda API invalid response:', data)
      return null
    }

    return { buy, sell }
  } catch (error) {
    console.error('Hacienda API error:', error)
    return null
  }
}

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const cached = await db.execute({
      sql: 'SELECT buy_rate, sell_rate, date FROM exchange_rates WHERE date = ? AND source = ? ORDER BY created_at DESC LIMIT 1',
      args: [today, 'Hacienda'],
    })

    if (cached.rows.length > 0) {
      return NextResponse.json({
        date: cached.rows[0].date,
        buy: cached.rows[0].buy_rate,
        sell: cached.rows[0].sell_rate,
        source: 'Hacienda',
        cached: true,
      })
    }

    const rates = await fetchHaciendaRate()

    if (!rates) {
      const fallback = await db.execute({
        sql: 'SELECT buy_rate, sell_rate, date FROM exchange_rates WHERE source = ? ORDER BY date DESC LIMIT 1',
        args: ['Hacienda'],
      })

      if (fallback.rows.length > 0) {
        return NextResponse.json({
          date: fallback.rows[0].date,
          buy: fallback.rows[0].buy_rate,
          sell: fallback.rows[0].sell_rate,
          source: 'Hacienda',
          cached: true,
          fallback: true,
        })
      }

      return NextResponse.json({
        date: today,
        buy: 505.5,
        sell: 515.5,
        source: 'estimado',
        cached: false,
        warning: 'No se pudo obtener el tipo de cambio del Ministerio de Hacienda. Usando valor estimado.',
      })
    }

    await db.execute({
      sql: 'INSERT INTO exchange_rates (id, date, buy_rate, sell_rate, source) VALUES (?, ?, ?, ?, ?)',
      args: [uuid(), today, rates.buy, rates.sell, 'Hacienda'],
    })

    return NextResponse.json({
      date: today,
      buy: rates.buy,
      sell: rates.sell,
      source: 'Hacienda',
      cached: false,
    })
  } catch (error) {
    console.error('Exchange rate error:', error)
    return NextResponse.json({
      date: new Date().toISOString().split('T')[0],
      buy: 505.5,
      sell: 515.5,
      source: 'estimado',
      cached: false,
      warning: 'Error al obtener tipo de cambio.',
    }, { status: 200 })
  }
}
