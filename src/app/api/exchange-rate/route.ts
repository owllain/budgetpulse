import { NextResponse } from 'next/server'
import { db } from '@/lib/turso'
import { v4 as uuid } from 'uuid'

const BCCR_API_BASE = 'https://apim.bccr.fi.cr/SDDE/api/Bccr.Ge.SDDE.Publico.Indicadores.API'
const BCCR_TOKEN = process.env.BCCR_API_TOKEN || ''

// Indicadores del BCCR: 317 = Compra USD, 318 = Venta USD
async function fetchBCCRRate(): Promise<{ buy: number; sell: number } | null> {
  if (!BCCR_TOKEN) {
    console.warn('BCCR_API_TOKEN not configured, using fallback')
    return null
  }

  try {
    const today = new Date()
    const formatDate = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
    const fechaInicio = formatDate(today)
    const fechaFin = formatDate(today)

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${BCCR_TOKEN}`,
      'Accept': 'application/json',
    }

    // Fetch both buy (317) and sell (318) rates in parallel
    const [buyRes, sellRes] = await Promise.all([
      fetch(
        `${BCCR_API_BASE}/indicadoresEconomicos/317/series?fechaInicio=${encodeURIComponent(fechaInicio)}&fechaFin=${encodeURIComponent(fechaFin)}&idioma=ES`,
        { headers }
      ),
      fetch(
        `${BCCR_API_BASE}/indicadoresEconomicos/318/series?fechaInicio=${encodeURIComponent(fechaInicio)}&fechaFin=${encodeURIComponent(fechaFin)}&idioma=ES`,
        { headers }
      ),
    ])

    const buyData = await buyRes.json()
    const sellData = await sellRes.json()

    // Extract the latest value from the series
    let buy: number | null = null
    let sell: number | null = null

    if (buyData?.estado && buyData?.datos?.length > 0) {
      const series = buyData.datos[0].series
      if (series?.length > 0) {
        // Get the latest entry (last in array)
        const latest = series[series.length - 1]
        buy = parseFloat(latest.valorDatoPorPeriodo)
      }
    }

    if (sellData?.estado && sellData?.datos?.length > 0) {
      const series = sellData.datos[0].series
      if (series?.length > 0) {
        const latest = series[series.length - 1]
        sell = parseFloat(latest.valorDatoPorPeriodo)
      }
    }

    if (buy && sell && !isNaN(buy) && !isNaN(sell)) {
      return { buy, sell }
    }

    // If today has no data (weekends/holidays), try fetching last 7 days
    const weekAgo = new Date(today.getTime() - 7 * 86400000)
    const fechaInicioWeek = formatDate(weekAgo)

    const [buyRes2, sellRes2] = await Promise.all([
      fetch(
        `${BCCR_API_BASE}/indicadoresEconomicos/317/series?fechaInicio=${encodeURIComponent(fechaInicioWeek)}&fechaFin=${encodeURIComponent(fechaFin)}&idioma=ES`,
        { headers }
      ),
      fetch(
        `${BCCR_API_BASE}/indicadoresEconomicos/318/series?fechaInicio=${encodeURIComponent(fechaInicioWeek)}&fechaFin=${encodeURIComponent(fechaFin)}&idioma=ES`,
        { headers }
      ),
    ])

    const buyData2 = await buyRes2.json()
    const sellData2 = await sellRes2.json()

    if (buyData2?.estado && buyData2?.datos?.length > 0) {
      const series = buyData2.datos[0].series
      if (series?.length > 0) {
        const latest = series[series.length - 1]
        buy = parseFloat(latest.valorDatoPorPeriodo)
      }
    }

    if (sellData2?.estado && sellData2?.datos?.length > 0) {
      const series = sellData2.datos[0].series
      if (series?.length > 0) {
        const latest = series[series.length - 1]
        sell = parseFloat(latest.valorDatoPorPeriodo)
      }
    }

    if (buy && sell && !isNaN(buy) && !isNaN(sell)) {
      return { buy, sell }
    }

    return null
  } catch (error) {
    console.error('BCCR API error:', error)
    return null
  }
}

export async function GET() {
  try {
    // Check cache first (today's rate)
    const today = new Date().toISOString().split('T')[0]
    const cached = await db.execute({
      sql: 'SELECT buy_rate, sell_rate, date FROM exchange_rates WHERE date = ? AND source = ? ORDER BY created_at DESC LIMIT 1',
      args: [today, 'BCCR'],
    })

    if (cached.rows.length > 0) {
      return NextResponse.json({
        date: cached.rows[0].date,
        buy: cached.rows[0].buy_rate,
        sell: cached.rows[0].sell_rate,
        source: 'BCCR',
        cached: true,
      })
    }

    // Fetch from BCCR REST API
    const rates = await fetchBCCRRate()

    if (!rates) {
      // Fallback: try last cached rate
      const fallback = await db.execute({
        sql: 'SELECT buy_rate, sell_rate, date FROM exchange_rates WHERE source = ? ORDER BY date DESC LIMIT 1',
        args: ['BCCR'],
      })

      if (fallback.rows.length > 0) {
        return NextResponse.json({
          date: fallback.rows[0].date,
          buy: fallback.rows[0].buy_rate,
          sell: fallback.rows[0].sell_rate,
          source: 'BCCR',
          cached: true,
          fallback: true,
        })
      }

      // Hardcoded fallback when no API token or no data
      return NextResponse.json({
        date: today,
        buy: 505.50,
        sell: 515.50,
        source: BCCR_TOKEN ? 'manual' : 'estimado',
        cached: false,
        warning: BCCR_TOKEN
          ? 'No se pudo obtener el tipo de cambio del BCCR. Valor estimado.'
          : 'Configure BCCR_API_TOKEN para obtener el tipo de cambio real del BCCR.',
      })
    }

    // Save to cache
    await db.execute({
      sql: 'INSERT INTO exchange_rates (id, date, buy_rate, sell_rate, source) VALUES (?, ?, ?, ?, ?)',
      args: [uuid(), today, rates.buy, rates.sell, 'BCCR'],
    })

    return NextResponse.json({
      date: today,
      buy: rates.buy,
      sell: rates.sell,
      source: 'BCCR',
      cached: false,
    })
  } catch (error) {
    console.error('Exchange rate error:', error)
    return NextResponse.json({
      date: new Date().toISOString().split('T')[0],
      buy: 505.50,
      sell: 515.50,
      source: 'estimado',
      cached: false,
      warning: 'Error al obtener tipo de cambio.',
    }, { status: 200 })
  }
}
