/**
 * Motor de Optimización de Deuda Inteligente
 * Implementa dos estrategias de pago de deudas con proyecciones mes a mes
 * 
 * Estándar de Precisión:
 * - Todos los cálculos se realizan en centavos (números enteros) para evitar errores de redondeo
 * - Conversión: CRC 1,000.50 = 100,050 centavos
 * - Redondeo final al centavo más cercano (banker's rounding)
 */

/**
 * Representa una deuda individual con toda la información necesaria para optimización
 */
export interface Debt {
  id: string
  name: string
  saldoActual: number // En CRC (puede tener decimales)
  tasaInteresAnual: number // Porcentaje anual (ej: 18.5 para 18.5%)
  pagoMinimoMensual: number // En CRC
  tipoDeuda: 'tarjeta_credito' | 'prestamo_personal' | 'prestamo_automotriz' | 'otro'
}

/**
 * Proyección de una deuda para un mes específico
 */
export interface MonthlyProjection {
  mes: number
  saldoInicial: number
  interesCobrado: number
  pagoAplicado: number
  saldoFinal: number
  estaLiquidada: boolean
}

/**
 * Resultado completo de una estrategia de pago
 */
export interface DebtPaymentStrategy {
  estrategia: 'avalanche' | 'snowball' | 'hybrid'
  deudas: Array<{
    id: string
    name: string
    proyecciones: MonthlyProjection[]
    totalInteresAPagar: number
    mesesALiquidacion: number
  }>
  totalizadoGlobal: {
    interesTotalPagado: number
    mesesALiquidacion: number
    pagoTotalRequerido: number
  }
  presupuestoExtraAplicado: number
}

/**
 * Resultado comparativo entre ambas estrategias
 */
export interface OptimizationResult {
  avalanche: DebtPaymentStrategy
  snowball: DebtPaymentStrategy
  hybrid?: DebtPaymentStrategy
  analisisComparativo: {
    ahorroInteresesAvalanche: number // Negativo si avalanche paga más
    diferenciaEnMeses: number // Positivo si snowball tarda más
    recomendacion: 'avalanche' | 'snowball' | 'hybrid' | 'neutral'
    razonamiento: string
  }
}

// ============================================================================
// UTILIDADES DE PRECISIÓN DECIMAL
// ============================================================================

/**
 * Convierte CRC a centavos (número entero)
 * @param crc Cantidad en CRC con decimales
 * @returns Cantidad en centavos (entero)
 * 
 * @example
 * craToCents(1000.50) // Returns 100050
 * craToCents(18.5) // Returns 1850
 */
function craToCents(crc: number): number {
  return Math.round(crc * 100)
}

/**
 * Convierte centavos a CRC
 * @param cents Cantidad en centavos (entero)
 * @returns Cantidad en CRC con decimales
 */
function centsToCra(cents: number): number {
  return cents / 100
}

/**
 * Calcula interés compuesto mensual con precisión de centavos
 * 
 * Fórmula: Interés = Saldo × (tasaAnual / 12) / 100
 * 
 * @param saldoEnCents Saldo en centavos
 * @param tasaAnualPorcentaje Tasa anual en porcentaje (ej: 18.5)
 * @returns Interés en centavos
 */
function calcularInteresMensual(
  saldoEnCents: number,
  tasaAnualPorcentaje: number
): number {
  // tasaMensual = tasaAnual / 12 / 100
  // interés = saldo × tasaMensual
  const tasaMensualDecimal = tasaAnualPorcentaje / 12 / 100
  const interes = Math.round(saldoEnCents * tasaMensualDecimal)
  return interes
}

/**
 * Valida que una deuda tenga parámetros válidos
 */
function validarDeuda(debt: Debt): void {
  if (debt.saldoActual <= 0) {
    throw new Error(`Deuda "${debt.name}" debe tener saldo > 0`)
  }
  if (debt.tasaInteresAnual < 0 || debt.tasaInteresAnual > 100) {
    throw new Error(`Deuda "${debt.name}" tasa de interés debe estar entre 0 y 100%`)
  }
  if (debt.pagoMinimoMensual <= 0) {
    throw new Error(`Deuda "${debt.name}" pago mínimo debe ser > 0`)
  }
}

// ============================================================================
// ALGORITMO AVALANCHE (Matemáticamente Óptimo)
// ============================================================================

/**
 * **Método Avalanche:**
 * Prioriza pagar las deudas con MAYOR tasa de interés primero.
 * 
 * Lógica:
 * 1. Ordena deudas de mayor a menor tasa de interés
 * 2. Paga mínimo en todas, aplica presupuesto extra a la de mayor tasa
 * 3. Cuando se liquida una deuda, traslada pago a la siguiente de mayor tasa
 * 
 * Ventaja matemática: Minimiza el interés total pagado
 * 
 * @param deudas Array de deudas
 * @param presupuestoExtraDisponible CRC adicionales mensuales (ej: 50000)
 * @param limiteMeses Máximo número de meses a proyectar (seguridad)
 * @returns Resultado de la estrategia
 */
export function calcularEstrategiaAvalanche(
  deudas: Debt[],
  presupuestoExtraDisponible: number,
  limiteMeses: number = 360 // 30 años máximo
): DebtPaymentStrategy {
  // Validaciones
  if (deudas.length === 0) {
    throw new Error('No hay deudas para optimizar')
  }

  deudas.forEach(validarDeuda)

  if (presupuestoExtraDisponible < 0) {
    throw new Error('Presupuesto extra no puede ser negativo')
  }

  // Convertir a centavos para precisión
  const deudaEnCents = deudas.map(d => ({
    ...d,
    saldoActualCents: craToCents(d.saldoActual),
    pagoMinimoMensualCents: craToCents(d.pagoMinimoMensual),
  }))

  const presupuestoExtraCents = craToCents(presupuestoExtraDisponible)

  // Ordenar por tasa de interés DESC (mayor primero)
  const deudassOrdenadas = [...deudaEnCents].sort(
    (a, b) => b.tasaInteresAnual - a.tasaInteresAnual
  )

  const proyecciones = deudassOrdenadas.map(deuda => ({
    id: deuda.id,
    name: deuda.name,
    proyecciones: [] as MonthlyProjection[],
    totalInteresAPagar: 0,
    mesesALiquidacion: 0,
  }))

  // Array para rastrear saldo actual de cada deuda
  const saldosActuales = deudassOrdenadas.map(d => d.saldoActualCents)

  let mes = 0

  // Simular mes a mes
  while (mes < limiteMeses) {
    mes++
    let alguna_deuda_activa = false
    let primerDeudaActivaIdx = -1

    for (let i = 0; i < deudassOrdenadas.length; i++) {
      const deuda = deudassOrdenadas[i]
      const proy = proyecciones[i]
      const saldoInicial = saldosActuales[i]

      if (saldoInicial <= 0) {
        continue // Deuda ya liquidada
      }

      if (primerDeudaActivaIdx === -1) primerDeudaActivaIdx = i

      alguna_deuda_activa = true

      // Calcular interés
      const interes = calcularInteresMensual(saldoInicial, deuda.tasaInteresAnual)

      // Pago aplicado: pago mínimo + interés
      let pagoAplicado = deuda.pagoMinimoMensualCents + interes

      // Aplicar presupuesto extra a la deuda de mayor tasa aún activa
      if (presupuestoExtraCents > 0 && i === primerDeudaActivaIdx) {
        pagoAplicado += presupuestoExtraCents
      }

      // Calcular saldo final
      let saldoFinal = saldoInicial + interes - pagoAplicado
      const estaLiquidada = saldoFinal <= 0

      if (estaLiquidada) {
        saldoFinal = 0
        if (proy.mesesALiquidacion === 0) {
          proy.mesesALiquidacion = mes
        }
      }

      saldosActuales[i] = saldoFinal

      proy.proyecciones.push({
        mes,
        saldoInicial: centsToCra(saldoInicial),
        interesCobrado: centsToCra(interes),
        pagoAplicado: centsToCra(pagoAplicado),
        saldoFinal: centsToCra(saldoFinal),
        estaLiquidada,
      })

      proy.totalInteresAPagar += interes
    }

    if (!alguna_deuda_activa) break
  }

  // Convertir centavos a CRC en totales
  const interesTotalPagado = proyecciones.reduce((sum, p) => sum + centsToCra(p.totalInteresAPagar), 0)
  const mesesALiquidacion = Math.max(...proyecciones.map(p => p.mesesALiquidacion), 0)
  const pagoTotalRequerido = deudas.reduce((sum, d) => sum + d.saldoActual, 0) + interesTotalPagado

  return {
    estrategia: 'avalanche',
    deudas: proyecciones.map(p => ({
      ...p,
      totalInteresAPagar: centsToCra(p.totalInteresAPagar),
    })),
    totalizadoGlobal: {
      interesTotalPagado,
      mesesALiquidacion,
      pagoTotalRequerido,
    },
    presupuestoExtraAplicado: presupuestoExtraDisponible,
  }
}

// ============================================================================
// ALGORITMO SNOWBALL (Psicológicamente Óptimo)
// ============================================================================

/**
 * **Método Snowball (Bola de Nieve):**
 * Prioriza pagar las deudas con MENOR saldo primero.
 * 
 * Lógica:
 * 1. Ordena deudas de menor a mayor saldo
 * 2. Paga mínimo en todas, aplica presupuesto extra a la de menor saldo
 * 3. Cuando se liquida una deuda, traslada pago a la siguiente de menor saldo
 * 
 * Ventaja psicológica: Crea momentum rápido al eliminar deudas pequeñas
 * Desventaja: Paga más interés que avalanche
 * 
 * @param deudas Array de deudas
 * @param presupuestoExtraDisponible CRC adicionales mensuales
 * @param limiteMeses Máximo número de meses a proyectar (seguridad)
 * @returns Resultado de la estrategia
 */
export function calcularEstrategiaSnowball(
  deudas: Debt[],
  presupuestoExtraDisponible: number,
  limiteMeses: number = 360
): DebtPaymentStrategy {
  // Validaciones
  if (deudas.length === 0) {
    throw new Error('No hay deudas para optimizar')
  }

  deudas.forEach(validarDeuda)

  if (presupuestoExtraDisponible < 0) {
    throw new Error('Presupuesto extra no puede ser negativo')
  }

  // Convertir a centavos
  const deudaEnCents = deudas.map(d => ({
    ...d,
    saldoActualCents: craToCents(d.saldoActual),
    pagoMinimoMensualCents: craToCents(d.pagoMinimoMensual),
  }))

  const presupuestoExtraCents = craToCents(presupuestoExtraDisponible)

  // Ordenar por saldo ASC (menor primero)
  const deudassOrdenadas = [...deudaEnCents].sort(
    (a, b) => a.saldoActualCents - b.saldoActualCents
  )

  const proyecciones = deudassOrdenadas.map(deuda => ({
    id: deuda.id,
    name: deuda.name,
    proyecciones: [] as MonthlyProjection[],
    totalInteresAPagar: 0,
    mesesALiquidacion: 0,
  }))

  // Array para rastrear saldo actual de cada deuda
  const saldosActuales = deudassOrdenadas.map(d => d.saldoActualCents)

  let mes = 0

  // Simular mes a mes
  while (mes < limiteMeses) {
    mes++
    let alguna_deuda_activa = false
    let primerDeudaActivaIdx = -1

    for (let i = 0; i < deudassOrdenadas.length; i++) {
      const deuda = deudassOrdenadas[i]
      const proy = proyecciones[i]
      const saldoInicial = saldosActuales[i]

      if (saldoInicial <= 0) {
        continue
      }

      if (primerDeudaActivaIdx === -1) primerDeudaActivaIdx = i

      alguna_deuda_activa = true

      // Calcular interés
      const interes = calcularInteresMensual(saldoInicial, deuda.tasaInteresAnual)

      // Pago aplicado
      let pagoAplicado = deuda.pagoMinimoMensualCents + interes

      // Aplicar presupuesto extra a la deuda de menor saldo aún activa
      if (presupuestoExtraCents > 0 && i === primerDeudaActivaIdx) {
        pagoAplicado += presupuestoExtraCents
      }

      // Calcular saldo final
      let saldoFinal = saldoInicial + interes - pagoAplicado
      const estaLiquidada = saldoFinal <= 0

      if (estaLiquidada) {
        saldoFinal = 0
        if (proy.mesesALiquidacion === 0) {
          proy.mesesALiquidacion = mes
        }
      }

      saldosActuales[i] = saldoFinal

      proy.proyecciones.push({
        mes,
        saldoInicial: centsToCra(saldoInicial),
        interesCobrado: centsToCra(interes),
        pagoAplicado: centsToCra(pagoAplicado),
        saldoFinal: centsToCra(saldoFinal),
        estaLiquidada,
      })

      proy.totalInteresAPagar += interes
    }

    if (!alguna_deuda_activa) break
  }

  // Convertir centavos a CRC en totales
  const interesTotalPagado = proyecciones.reduce((sum, p) => sum + centsToCra(p.totalInteresAPagar), 0)
  const mesesALiquidacion = Math.max(...proyecciones.map(p => p.mesesALiquidacion), 0)
  const pagoTotalRequerido = deudas.reduce((sum, d) => sum + d.saldoActual, 0) + interesTotalPagado

  return {
    estrategia: 'snowball',
    deudas: proyecciones.map(p => ({
      ...p,
      totalInteresAPagar: centsToCra(p.totalInteresAPagar),
    })),
    totalizadoGlobal: {
      interesTotalPagado,
      mesesALiquidacion,
      pagoTotalRequerido,
    },
    presupuestoExtraAplicado: presupuestoExtraDisponible,
  }
}

// ============================================================================
// ALGORITMO HÍBRIDO (Proporcional a la carga de interés)
// ============================================================================

/**
 * Aplica el presupuesto extra proporcionalmente según el "peso" de cada deuda,
 * definido como saldo * tasaAnual. Esto distribuye el extra entre todas las deudas
 * activas en lugar de concentrarlo en una sola, combinando beneficios de ambas estrategias.
 */
export function calcularEstrategiaHybrid(
  deudas: Debt[],
  presupuestoExtraDisponible: number,
  limiteMeses: number = 360
): DebtPaymentStrategy {
  if (deudas.length === 0) throw new Error('No hay deudas para optimizar')
  deudas.forEach(validarDeuda)
  if (presupuestoExtraDisponible < 0) throw new Error('Presupuesto extra no puede ser negativo')

  const deudaEnCents = deudas.map(d => ({
    ...d,
    saldoActualCents: craToCents(d.saldoActual),
    pagoMinimoMensualCents: craToCents(d.pagoMinimoMensual),
  }))

  const presupuestoExtraCents = craToCents(presupuestoExtraDisponible)

  // Mantener el orden original para reporte (pero el algoritmo es indiferente al orden)
  const deudassOrdenadas = [...deudaEnCents]

  const proyecciones = deudassOrdenadas.map(deuda => ({
    id: deuda.id,
    name: deuda.name,
    proyecciones: [] as MonthlyProjection[],
    totalInteresAPagar: 0,
    mesesALiquidacion: 0,
  }))

  const saldosActuales = deudassOrdenadas.map(d => d.saldoActualCents)

  let mes = 0

  while (mes < limiteMeses) {
    mes++
    let alguna_deuda_activa = false

    // Calcular pesos para deudas activas: saldo * tasaAnual (mayor => más peso)
    let totalPeso = 0
    const pesos = saldosActuales.map((saldo, i) => {
      if (saldo <= 0) return 0
      const tasa = deudassOrdenadas[i].tasaInteresAnual
      const peso = Math.abs(saldo) * (tasa || 0)
      totalPeso += peso
      return peso
    })

    for (let i = 0; i < deudassOrdenadas.length; i++) {
      const deuda = deudassOrdenadas[i]
      const proy = proyecciones[i]
      const saldoInicial = saldosActuales[i]

      if (saldoInicial <= 0) continue

      alguna_deuda_activa = true

      const interes = calcularInteresMensual(saldoInicial, deuda.tasaInteresAnual)

      // Asignar parte del presupuesto extra proporcional al peso
      let extraAsignado = 0
      if (presupuestoExtraCents > 0 && totalPeso > 0) {
        extraAsignado = Math.round((pesos[i] / totalPeso) * presupuestoExtraCents)
      }

      let pagoAplicado = deuda.pagoMinimoMensualCents + interes + extraAsignado

      let saldoFinal = saldoInicial + interes - pagoAplicado
      const estaLiquidada = saldoFinal <= 0
      if (estaLiquidada) {
        saldoFinal = 0
        if (proy.mesesALiquidacion === 0) proy.mesesALiquidacion = mes
      }

      saldosActuales[i] = saldoFinal

      proy.proyecciones.push({
        mes,
        saldoInicial: centsToCra(saldoInicial),
        interesCobrado: centsToCra(interes),
        pagoAplicado: centsToCra(pagoAplicado),
        saldoFinal: centsToCra(saldoFinal),
        estaLiquidada,
      })

      proy.totalInteresAPagar += interes
    }

    if (!alguna_deuda_activa) break
  }

  const interesTotalPagado = proyecciones.reduce((sum, p) => sum + centsToCra(p.totalInteresAPagar), 0)
  const mesesALiquidacion = Math.max(...proyecciones.map(p => p.mesesALiquidacion), 0)
  const pagoTotalRequerido = deudas.reduce((sum, d) => sum + d.saldoActual, 0) + interesTotalPagado

  return {
    estrategia: 'avalanche', // etiqueta genérica; se usa solo para reportes
    deudas: proyecciones.map(p => ({
      ...p,
      totalInteresAPagar: centsToCra(p.totalInteresAPagar),
    })),
    totalizadoGlobal: {
      interesTotalPagado,
      mesesALiquidacion,
      pagoTotalRequerido,
    },
    presupuestoExtraAplicado: presupuestoExtraDisponible,
  }
}

// ============================================================================
// MOTOR COMPLETO - Comparación de Estrategias
// ============================================================================

/**
 * **Calcula ambas estrategias y devuelve análisis comparativo**
 * 
 * Este es el punto de entrada principal del Motor de Optimización.
 * 
 * Proceso:
 * 1. Valida todas las deudas
 * 2. Ejecuta proyección Avalanche (matemáticamente óptima)
 * 3. Ejecuta proyección Snowball (psicológicamente óptima)
 * 4. Compara resultados y genera recomendación
 * 
 * @param deudas Array de deudas a optimizar
 * @param presupuestoExtraDisponible CRC adicionales mensuales disponibles
 * @returns Resultado con ambas estrategias y análisis comparativo
 * 
 * @example
 * const deudas: Debt[] = [
 *   {
 *     id: '1',
 *     name: 'Tarjeta VISA',
 *     saldoActual: 500000,
 *     tasaInteresAnual: 22.5,
 *     pagoMinimoMensual: 15000,
 *     tipoDeuda: 'tarjeta_credito',
 *   },
 *   {
 *     id: '2',
 *     name: 'Préstamo Personal',
 *     saldoActual: 200000,
 *     tasaInteresAnual: 12,
 *     pagoMinimoMensual: 10000,
 *     tipoDeuda: 'prestamo_personal',
 *   },
 * ]
 * 
 * const resultado = optimizarDeudas(deudas, 50000)
 * console.log(`Ahorro con Avalanche: ${resultado.analisisComparativo.ahorroInteresesAvalanche}`)
 */
export function optimizarDeudas(
  deudas: Debt[],
  presupuestoExtraDisponible: number
): OptimizationResult {
  // Calcular ambas estrategias
  const avalanche = calcularEstrategiaAvalanche(deudas, presupuestoExtraDisponible)
  const snowball = calcularEstrategiaSnowball(deudas, presupuestoExtraDisponible)
  const hybrid = calcularEstrategiaHybrid(deudas, presupuestoExtraDisponible)

  // Análisis comparativo
  const ahorroInteresesAvalanche =
    snowball.totalizadoGlobal.interesTotalPagado -
    avalanche.totalizadoGlobal.interesTotalPagado

  const diferenciaEnMeses =
    snowball.totalizadoGlobal.mesesALiquidacion -
    avalanche.totalizadoGlobal.mesesALiquidacion

  // Comparar las tres estrategias por interés pagado
  const intereses = [
    { name: 'avalanche', value: avalanche.totalizadoGlobal.interesTotalPagado },
    { name: 'snowball', value: snowball.totalizadoGlobal.interesTotalPagado },
    { name: 'hybrid', value: hybrid.totalizadoGlobal.interesTotalPagado },
  ]

  intereses.sort((a, b) => a.value - b.value)

  const mejor = intereses[0]

  let recomendacion: 'avalanche' | 'snowball' | 'hybrid' | 'neutral' = 'neutral'
  let razonamiento = ''

  // Determinar umbral de decisión (100 CRC de diferencia)
  const segundoMejor = intereses[1]
  const diferenciaMejor = (segundoMejor.value - mejor.value)

  if (diferenciaMejor > 100) {
    recomendacion = mejor.name as any
    razonamiento = `La estrategia ${mejor.name} minimiza los intereses (ahorra ${diferenciaMejor.toFixed(2)} CRC frente a la segunda mejor).`
  } else {
    recomendacion = 'neutral'
    razonamiento = `Las diferencias entre estrategias son pequeñas (máx ${Math.abs(diferenciaMejor).toFixed(2)} CRC). Elige según preferencia personal.`
  }

  return {
    avalanche,
    snowball,
    hybrid,
    analisisComparativo: {
      ahorroInteresesAvalanche,
      diferenciaEnMeses,
      recomendacion,
      razonamiento,
    },
  }
}
