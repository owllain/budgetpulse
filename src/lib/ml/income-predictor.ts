/**
 * Predictores simples de ingresos
 * - Implementa una regresión lineal mínima para series temporales cortas
 * - Este es un stub para prototipado; puede reemplazarse por un modelo ML más avanzado
 */

/**
 * Predice el siguiente valor de la serie usando regresión lineal (least squares)
 * @param series Array de números (valores por periodo, ej. ingresos mensuales)
 * @returns Valor predicho para el siguiente periodo
 */
export function predictNextLinear(series: number[]): number {
  if (!series || series.length === 0) return 0
  if (series.length === 1) return series[0]

  const n = series.length
  // x = 0,1,2,...
  const xs = series.map((_, i) => i)
  const sumX = xs.reduce((s, v) => s + v, 0)
  const sumY = series.reduce((s, v) => s + v, 0)
  const sumXY = xs.reduce((s, v, i) => s + v * series[i], 0)
  const sumX2 = xs.reduce((s, v) => s + v * v, 0)

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return series[series.length - 1]

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  const nextX = n
  const predicted = intercept + slope * nextX
  return Math.max(0, predicted)
}

/**
 * Predict next using simple moving average (fallback)
 */
export function predictNextSMA(series: number[], window: number = 3): number {
  if (!series || series.length === 0) return 0
  const w = Math.min(window, series.length)
  const recent = series.slice(series.length - w)
  const avg = recent.reduce((s, v) => s + v, 0) / recent.length
  return avg
}
