import { NextRequest, NextResponse } from 'next/server'
import { predictNextLinear, predictNextSMA } from '@/lib/ml/income-predictor'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const history = Array.isArray(body?.history) ? body.history.map(Number).filter(n => !isNaN(n)) : []

    if (history.length === 0) {
      return NextResponse.json({ error: 'history array required' }, { status: 400 })
    }

    const linear = predictNextLinear(history)
    const sma = predictNextSMA(history, 3)

    return NextResponse.json({ predicted_linear: linear, predicted_sma: sma })
  } catch (error) {
    console.error('[/api/predict-income] Error:', error)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
