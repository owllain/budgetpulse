/**
 * Pruebas del Motor de Optimización de Deuda
 * Ejecutar con: npx ts-node tests/unit/debt-optimizer.test.ts
 */

import {
  optimizarDeudas,
  type Debt,
} from '@/lib/financial/debt-optimizer'

// ============================================================================
// CASO DE PRUEBA 1: Escenario realista con 3 deudas
// ============================================================================

const deudas: Debt[] = [
  {
    id: '1',
    name: 'Tarjeta VISA',
    saldoActual: 500000,
    tasaInteresAnual: 22.5, // 22.5% anual (típica de tarjetas)
    pagoMinimoMensual: 15000,
    tipoDeuda: 'tarjeta_credito',
  },
  {
    id: '2',
    name: 'Tarjeta Mastercard',
    saldoActual: 250000,
    tasaInteresAnual: 20, // 20% anual
    pagoMinimoMensual: 8000,
    tipoDeuda: 'tarjeta_credito',
  },
  {
    id: '3',
    name: 'Préstamo Personal',
    saldoActual: 200000,
    tasaInteresAnual: 12, // 12% anual (típico de préstamos)
    pagoMinimoMensual: 10000,
    tipoDeuda: 'prestamo_personal',
  },
]

const presupuestoExtra = 50000 // 50,000 CRC extras mensuales

console.log('═'.repeat(80))
console.log('🎯 MOTOR DE OPTIMIZACIÓN DE DEUDA - PRUEBA INTEGRAL')
console.log('═'.repeat(80))
console.log()

console.log('📊 DEUDAS A ANALIZAR:')
console.log('-'.repeat(80))
deudas.forEach((d, i) => {
  console.log(
    `${i + 1}. ${d.name}` +
      `\n   💰 Saldo: ${d.saldoActual.toLocaleString('es-CR', { style: 'currency', currency: 'CRC' })}` +
      `\n   📈 Tasa: ${d.tasaInteresAnual}% anual` +
      `\n   ⚙️  Pago mínimo: ${d.pagoMinimoMensual.toLocaleString('es-CR', { style: 'currency', currency: 'CRC' })}`
  )
})
console.log()
console.log(
  `💵 PRESUPUESTO EXTRA MENSUAL: ${presupuestoExtra.toLocaleString('es-CR', { style: 'currency', currency: 'CRC' })}`
)
console.log()

try {
  const resultado = optimizarDeudas(deudas, presupuestoExtra)

  // ========================================================================
  // ESTRATEGIA AVALANCHE
  // ========================================================================
  console.log('═'.repeat(80))
  console.log('🏔️  ESTRATEGIA AVALANCHE (Matemáticamente Óptima)')
  console.log('═'.repeat(80))
  console.log()

  console.log('📋 Deudas ordenadas por TASA DE INTERÉS (Mayor → Menor):')
  console.log('-'.repeat(80))
  resultado.avalanche.deudas.forEach((d, i) => {
    const totalInteres = d.totalInteresAPagar.toLocaleString('es-CR', {
      style: 'currency',
      currency: 'CRC',
    })
    const meses = d.mesesALiquidacion
    console.log(`${i + 1}. ${d.name}`)
    console.log(`   ⏱️  Liquidada en: ${meses} meses (${(meses / 12).toFixed(1)} años)`)
    console.log(`   💸 Interés total pagado: ${totalInteres}`)
    console.log()
  })

  console.log('🎯 RESUMEN AVALANCHE:')
  console.log('-'.repeat(80))
  console.log(
    `Total de interés pagado: ${resultado.avalanche.totalizadoGlobal.interesTotalPagado.toLocaleString('es-CR', { style: 'currency', currency: 'CRC' })}`
  )
  console.log(
    `Todas las deudas liquidadas en: ${resultado.avalanche.totalizadoGlobal.mesesALiquidacion} meses (${(resultado.avalanche.totalizadoGlobal.mesesALiquidacion / 12).toFixed(1)} años)`
  )
  console.log(
    `Pago total requerido: ${resultado.avalanche.totalizadoGlobal.pagoTotalRequerido.toLocaleString('es-CR', { style: 'currency', currency: 'CRC' })}`
  )
  console.log()

  // ========================================================================
  // ESTRATEGIA SNOWBALL
  // ========================================================================
  console.log('═'.repeat(80))
  console.log('❄️  ESTRATEGIA SNOWBALL (Psicológicamente Óptima)')
  console.log('═'.repeat(80))
  console.log()

  console.log('📋 Deudas ordenadas por SALDO (Menor → Mayor):')
  console.log('-'.repeat(80))
  resultado.snowball.deudas.forEach((d, i) => {
    const totalInteres = d.totalInteresAPagar.toLocaleString('es-CR', {
      style: 'currency',
      currency: 'CRC',
    })
    const meses = d.mesesALiquidacion
    console.log(`${i + 1}. ${d.name}`)
    console.log(`   ⏱️  Liquidada en: ${meses} meses (${(meses / 12).toFixed(1)} años)`)
    console.log(`   💸 Interés total pagado: ${totalInteres}`)
    console.log()
  })

  console.log('🎯 RESUMEN SNOWBALL:')
  console.log('-'.repeat(80))
  console.log(
    `Total de interés pagado: ${resultado.snowball.totalizadoGlobal.interesTotalPagado.toLocaleString('es-CR', { style: 'currency', currency: 'CRC' })}`
  )
  console.log(
    `Todas las deudas liquidadas en: ${resultado.snowball.totalizadoGlobal.mesesALiquidacion} meses (${(resultado.snowball.totalizadoGlobal.mesesALiquidacion / 12).toFixed(1)} años)`
  )
  console.log(
    `Pago total requerido: ${resultado.snowball.totalizadoGlobal.pagoTotalRequerido.toLocaleString('es-CR', { style: 'currency', currency: 'CRC' })}`
  )
  console.log()

  // ========================================================================
  // ANÁLISIS COMPARATIVO
  // ========================================================================
  console.log('═'.repeat(80))
  console.log('📊 ANÁLISIS COMPARATIVO')
  console.log('═'.repeat(80))
  console.log()

  const ahorro = resultado.analisisComparativo.ahorroInteresesAvalanche
  const diferenciaMeses = resultado.analisisComparativo.diferenciaEnMeses

  console.log(`Ahorro de intereses con Avalanche: ${ahorro.toLocaleString('es-CR', { style: 'currency', currency: 'CRC' })}`)
  console.log(
    `Diferencia de tiempo: ${Math.abs(diferenciaMeses)} meses ${diferenciaMeses > 0 ? '(Avalanche termina antes)' : '(Snowball termina antes)'}`
  )
  console.log()
  console.log(`✅ RECOMENDACIÓN: ${resultado.analisisComparativo.recomendacion.toUpperCase()}`)
  console.log(`📝 Razonamiento: ${resultado.analisisComparativo.razonamiento}`)
  console.log()

  console.log('═'.repeat(80))
  console.log('✅ PRUEBA COMPLETADA EXITOSAMENTE')
  console.log('═'.repeat(80))
} catch (error) {
  console.error('❌ ERROR:', error instanceof Error ? error.message : error)
}
