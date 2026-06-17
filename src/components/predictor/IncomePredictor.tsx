'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function IncomePredictor() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ predicted_linear?: number; predicted_sma?: number } | null>(null)

  const handlePredict = async () => {
    const numbers = text.split(/[,\n\s]+/).map(s => parseFloat(s)).filter(n => !isNaN(n))
    if (numbers.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/predict-income', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: numbers })
      })
      if (!res.ok) throw new Error('Prediction failed')
      const data = await res.json()
      setResult(data)
    } catch (e) {
      console.error(e)
      setResult(null)
    } finally { setLoading(false) }
  }

  return (
    <Card className="glass border-white/5 p-4">
      <CardHeader>
        <CardTitle>Predictor de Entradas (Ingresos)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">Pega los últimos montos mensuales separados por comas o espacios (ej: 120000, 130000, 125000).</p>
        <Input value={text} onChange={e => setText(e.target.value)} placeholder="Ej: 100000 120000 110000" />
        <div className="flex gap-2 mt-3">
          <Button onClick={handlePredict} disabled={loading}>{loading ? 'Calculando...' : 'Predecir próximo mes'}</Button>
        </div>
        {result && (
          <div className="mt-3 text-sm">
            <div><strong>Regresión lineal:</strong> {result.predicted_linear?.toFixed(2)}</div>
            <div><strong>Media móvil (3):</strong> {result.predicted_sma?.toFixed(2)}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
