/**
 * Componente de Ejemplo: Optimizador de Deuda
 * 
 * Muestra cómo integrar el Motor de Optimización en la UI
 * Sigue la arquitectura: Component → Hook → API → Motor
 * 
 * @example
 * import { DebtOptimizerExample } from '@/components/examples/debt-optimizer-example'
 * 
 * export default function Page() {
 *   return <DebtOptimizerExample />
 * }
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Debt } from '@/lib/financial/debt-optimizer'
import { useOptimizeDebts } from '@/hooks/use-debt-optimizer'
import { Button } from '@/components/ui/button'
import { useSaveDebtStrategy } from '@/hooks/use-debt-optimizer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, TrendingDown, TrendingUp, Clock } from 'lucide-react'

/**
 * Datos de ejemplo: 3 deudas típicas de Costa Rica
 */
const DEUDAS_EJEMPLO: Debt[] = [
  {
    id: 'deuda-1',
    name: 'Tarjeta VISA',
    saldoActual: 500000,
    tasaInteresAnual: 22.5,
    pagoMinimoMensual: 15000,
    tipoDeuda: 'tarjeta_credito',
  },
  {
    id: 'deuda-2',
    name: 'Mastercard',
    saldoActual: 260000,
    tasaInteresAnual: 20,
    pagoMinimoMensual: 9000,
    tipoDeuda: 'tarjeta_credito',
  },
  {
    id: 'deuda-3',
    name: 'Préstamo Personal',
    saldoActual: 180000,
    tasaInteresAnual: 12,
    pagoMinimoMensual: 10000,
    tipoDeuda: 'prestamo_personal',
  },
]

const PRESUPUESTO_EXTRA = 50000

interface DeudaFormulario extends Debt {}

export function DebtOptimizerExample() {
  // Estado local
  const [deudas, setDeudas] = useState<DeudaFormulario[]>(DEUDAS_EJEMPLO)
  const [presupuestoExtra, setPresupuestoExtra] = useState(PRESUPUESTO_EXTRA)
  const [newDebt, setNewDebt] = useState<Partial<DeudaFormulario>>({ name: '', saldoActual: 0, tasaInteresAnual: 0, pagoMinimoMensual: 0, tipoDeuda: 'tarjeta_credito' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDebt, setEditingDebt] = useState<Partial<DeudaFormulario> | null>(null)
  const [csvText, setCsvText] = useState('')
  const [estrategiaSeleccionada, setEstrategiaSeleccionada] = useState<'avalanche' | 'snowball'>('avalanche')
  const [shouldCalculate, setShouldCalculate] = useState(false)

  // Hook de React Query para optimización
  const {
    data: resultado,
    isLoading,
    error,
  } = useOptimizeDebts(deudas, presupuestoExtra, shouldCalculate)

  const saveStrategyMutation = useSaveDebtStrategy()

  // Formato de moneda CRC
  const formatCRC = (valor: number) =>
    new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Optimizador de Deudas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-40 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg animate-pulse" />
            <div className="h-40 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg animate-pulse" />
            <p className="text-center text-slate-500">Calculando estrategias optimales...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error: {error.message}</AlertDescription>
      </Alert>
    )
  }

  // Estrategia activa
  const estrategiaActiva = resultado?.[estrategiaSeleccionada]

  const addDebt = () => {
    if (!newDebt.name || (Number(newDebt.saldoActual) || 0) <= 0) { toast.error('Ingresa nombre y saldo válido (>0)'); return }
    if ((Number(newDebt.tasaInteresAnual) || 0) < 0) { toast.error('La tasa anual no puede ser negativa'); return }
    const id = crypto.randomUUID()
    const debt: DeudaFormulario = {
      id,
      name: newDebt.name!.trim(),
      saldoActual: Number(newDebt.saldoActual || 0),
      tasaInteresAnual: Number(newDebt.tasaInteresAnual || 0),
      pagoMinimoMensual: Number(newDebt.pagoMinimoMensual || 0),
      tipoDeuda: (newDebt.tipoDeuda as any) || 'tarjeta_credito',
    }
    setDeudas(prev => [...prev, debt])
    setNewDebt({ name: '', saldoActual: 0, tasaInteresAnual: 0, pagoMinimoMensual: 0, tipoDeuda: 'tarjeta_credito' })
    setShouldCalculate(false)
    toast.success('Deuda agregada')
  }

  const removeDebt = (id: string) => {
    setDeudas(prev => prev.filter(d => d.id !== id))
    setShouldCalculate(false)
  }

  const startEdit = (d: DeudaFormulario) => {
    setEditingId(d.id)
    setEditingDebt({ ...d })
  }

  const saveEdit = () => {
    if (!editingId || !editingDebt) return
    if (!editingDebt.name || (Number(editingDebt.saldoActual) || 0) <= 0) { toast.error('Nombre y saldo válidos son requeridos'); return }
    setDeudas(prev => prev.map(d => d.id === editingId ? ({ ...(d as any), name: editingDebt.name!.trim(), saldoActual: Number(editingDebt.saldoActual), tasaInteresAnual: Number(editingDebt.tasaInteresAnual), pagoMinimoMensual: Number(editingDebt.pagoMinimoMensual), tipoDeuda: editingDebt.tipoDeuda as any }) : d))
    setEditingId(null)
    setEditingDebt(null)
    setShouldCalculate(false)
    toast.success('Deuda actualizada')
  }

  const cancelEdit = () => { setEditingId(null); setEditingDebt(null) }

  const parseCsvAndAdd = () => {
    if (!csvText.trim()) { toast.error('Pega un CSV válido'); return }
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const added: DeudaFormulario[] = []
    const errors: string[] = []
    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim())
      // Expected: name,saldo,tasa,pago,tipo
      const name = cols[0]
      const saldo = Number(cols[1])
      const tasa = Number(cols[2] || 0)
      const pago = Number(cols[3] || 0)
      const tipo = cols[4] || 'tarjeta_credito'
      if (!name || !saldo || saldo <= 0) { errors.push(`Línea ${i+1}: nombre/saldo inválido`); continue }
      const d: DeudaFormulario = { id: crypto.randomUUID(), name, saldoActual: saldo, tasaInteresAnual: tasa, pagoMinimoMensual: pago, tipoDeuda: tipo as any }
      added.push(d)
    }
    if (added.length > 0) {
      setDeudas(prev => [...prev, ...added])
      setShouldCalculate(false)
    }
    setCsvText('')
    if (added.length > 0) toast.success(`Se agregaron ${added.length} deudas`)
    if (errors.length > 0) toast.error(errors.join('; '))
  }

  const canShowResultados = shouldCalculate && !!resultado
  const showCalculatePrompt = deudas.length > 0 && !shouldCalculate
  const showEmptyResultado = deudas.length === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Motor de Optimización de Deuda</h1>
        <p className="text-slate-600 mt-2">
          Compara estrategias Avalanche vs Snowball para tu situación financiera
        </p>
      </div>

      {/* Formulario para ingreso de deudas */}
      <Card className="glass border-white/5 p-4">
        <CardHeader>
          <CardTitle className="text-lg">📥 Ingresa tus deudas</CardTitle>
          <CardDescription>Introduce cada deuda para que el motor calcule las estrategias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="bg-white/5 border-white/10 p-2 rounded" placeholder="Nombre (ej: VISA)" value={newDebt.name || ''} onChange={e => setNewDebt({ ...newDebt, name: e.target.value })} />
            <input className="bg-white/5 border-white/10 p-2 rounded" placeholder="Saldo actual" type="number" value={newDebt.saldoActual as any || ''} onChange={e => setNewDebt({ ...newDebt, saldoActual: parseFloat(e.target.value) || 0 })} />
            <input className="bg-white/5 border-white/10 p-2 rounded" placeholder="Tasa anual (%)" type="number" value={newDebt.tasaInteresAnual as any || ''} onChange={e => setNewDebt({ ...newDebt, tasaInteresAnual: parseFloat(e.target.value) || 0 })} />
            <input className="bg-white/5 border-white/10 p-2 rounded" placeholder="Pago mínimo mensual" type="number" value={newDebt.pagoMinimoMensual as any || ''} onChange={e => setNewDebt({ ...newDebt, pagoMinimoMensual: parseFloat(e.target.value) || 0 })} />
            <select className="bg-white/5 border-white/10 p-2 rounded" value={newDebt.tipoDeuda as string} onChange={e => setNewDebt({ ...newDebt, tipoDeuda: e.target.value as any })}>
              <option value="tarjeta_credito">Tarjeta de Crédito</option>
              <option value="prestamo_personal">Préstamo Personal</option>
              <option value="otro">Otro</option>
            </select>
            <div className="flex items-center gap-2">
              <Button onClick={addDebt} className="bg-indigo-600">Agregar deuda</Button>
              <Button variant="outline" onClick={() => setDeudas([])}>Limpiar</Button>
            </div>
          </div>
          {/* CSV paste */}
          <div className="mt-3">
            <p className="text-sm text-muted-foreground mb-2">Pega CSV (nombre,saldo,tasa,pago,tipo) — una deuda por línea</p>
            <textarea value={csvText} onChange={e => setCsvText(e.target.value)} placeholder={`Ej: VISA,500000,22.5,15000,tarjeta_credito`} className="w-full bg-white/5 border-white/10 p-2 rounded h-24" />
            <div className="flex gap-2 mt-2">
              <Button onClick={parseCsvAndAdd} size="sm">Pegar CSV</Button>
              <Button variant="outline" onClick={() => setCsvText('')} size="sm">Limpiar CSV</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deudas ingresadas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Deudas Ingresadas</CardTitle>
          <CardDescription>Total: {formatCRC(deudas.reduce((sum, d) => sum + d.saldoActual, 0))}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deudas.length === 0 && <p className="text-sm text-muted-foreground">No hay deudas. Agrega al menos una para correr la optimización.</p>}
            {deudas.map(deuda => (
              <div key={deuda.id} className="flex items-center justify-between p-3 bg-white/3 rounded-lg">
                {editingId === deuda.id && editingDebt ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input className="bg-white/5 border-white/10 p-1 rounded" value={editingDebt.name || ''} onChange={e => setEditingDebt({ ...editingDebt, name: e.target.value })} />
                    <input className="bg-white/5 border-white/10 p-1 rounded" type="number" value={editingDebt.saldoActual as any || ''} onChange={e => setEditingDebt({ ...editingDebt, saldoActual: parseFloat(e.target.value) || 0 })} />
                    <input className="bg-white/5 border-white/10 p-1 rounded" type="number" value={editingDebt.tasaInteresAnual as any || ''} onChange={e => setEditingDebt({ ...editingDebt, tasaInteresAnual: parseFloat(e.target.value) || 0 })} />
                    <input className="bg-white/5 border-white/10 p-1 rounded" type="number" value={editingDebt.pagoMinimoMensual as any || ''} onChange={e => setEditingDebt({ ...editingDebt, pagoMinimoMensual: parseFloat(e.target.value) || 0 })} />
                    <select className="bg-white/5 border-white/10 p-1 rounded" value={editingDebt.tipoDeuda as string} onChange={e => setEditingDebt({ ...editingDebt, tipoDeuda: e.target.value as any })}>
                      <option value="tarjeta_credito">Tarjeta de Crédito</option>
                      <option value="prestamo_personal">Préstamo Personal</option>
                      <option value="otro">Otro</option>
                    </select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>Guardar</Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="font-medium">{deuda.name}</p>
                      <p className="text-sm text-muted-foreground">Tasa: {deuda.tasaInteresAnual}% anual</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="font-semibold">{formatCRC(deuda.saldoActual)}</p>
                        <p className="text-sm text-muted-foreground">Pago mín: {formatCRC(deuda.pagoMinimoMensual)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(deuda)}>Editar</Button>
                        <Button size="sm" variant="ghost" onClick={() => removeDebt(deuda.id)}>Eliminar</Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Presupuesto Extra */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💵 Presupuesto Extra</CardTitle>
          <CardDescription>Define cuánto presupuesto extra puedes destinar cada mes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center p-4 bg-green-50 rounded-lg">
            <div>
              <p className="font-medium">Monto disponible mensualmente:</p>
              <p className="text-sm text-slate-600">Usaremos este valor para calcular cómo aplicar extra a Avalanche y Snowball.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="w-full md:w-48 bg-white/90 border border-slate-200 p-2 rounded"
                type="number"
                min={0}
                value={presupuestoExtra}
                onChange={e => {
                  const value = Number(e.target.value || 0)
                  setPresupuestoExtra(value)
                  setShouldCalculate(false)
                }}
              />
              <span className="font-bold text-green-600">{formatCRC(presupuestoExtra)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 bg-slate-50">
        <CardHeader>
          <CardTitle className="text-lg">🧭 Guía del Optimizador</CardTitle>
          <CardDescription>Sigue estos pasos para obtener el mejor resultado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
            <li>Primero ingresa tus deudas una por una o pega un CSV.</li>
            <li>Luego revisa que los totales de saldo e interés estén correctos.</li>
            <li>Presiona <strong>Calcular Estrategia</strong> para comparar Avalanche y Snowball.</li>
            <li>Finalmente descarga el reporte PDF profesional si deseas conservarlo.</li>
          </ol>
          <Button onClick={() => setShouldCalculate(true)} className="w-full md:w-auto" disabled={deudas.length === 0}>
            Calcular Estrategia
          </Button>
          {showCalculatePrompt && (
            <p className="text-sm text-slate-600">
              Haz clic en <strong>Calcular Estrategia</strong> para ejecutar el motor y ver cuál método conviene más.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resultados de optimización */}
      {showEmptyResultado ? (
        <Card className="glass border-white/5 p-4">
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Agrega al menos una deuda usando el formulario o pega un CSV para ver las estrategias comparativas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Error: {error.message}</AlertDescription>
            </Alert>
          )}

          {isLoading && (
            <Card>
              <CardHeader>
                <CardTitle>Calculando estrategias...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-24 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="h-24 bg-slate-200 rounded-lg animate-pulse" />
                </div>
              </CardContent>
            </Card>
          )}

          {canShowResultados && (
            <>
              <Tabs value={estrategiaSeleccionada} onValueChange={(v) => setEstrategiaSeleccionada(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="avalanche">🏔️ Avalanche</TabsTrigger>
                  <TabsTrigger value="snowball">❄️ Snowball</TabsTrigger>
                </TabsList>

                {/* AVALANCHE */}
                <TabsContent value="avalanche" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Estrategia Avalanche (Matemáticamente Óptima)</CardTitle>
                      <CardDescription>Pagar primero las deudas con MAYOR tasa de interés</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Resumen */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-slate-600">Total Intereses</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCRC(resultado.avalanche.totalizadoGlobal.interesTotalPagado)}
                          </p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <p className="text-sm text-slate-600">Liquidación</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {resultado.avalanche.totalizadoGlobal.mesesALiquidacion} meses
                          </p>
                          <p className="text-xs text-slate-500">
                            ({(resultado.avalanche.totalizadoGlobal.mesesALiquidacion / 12).toFixed(1)} años)
                          </p>
                        </div>
                        <div className="p-4 bg-amber-50 rounded-lg">
                          <p className="text-sm text-slate-600">Pago Total</p>
                          <p className="text-2xl font-bold text-amber-600">
                            {formatCRC(resultado.avalanche.totalizadoGlobal.pagoTotalRequerido)}
                          </p>
                        </div>
                      </div>

                      {/* Orden de pago */}
                      <div className="space-y-2">
                        <h4 className="font-semibold">Orden de liquidación:</h4>
                        {resultado.avalanche.deudas.map((deuda, idx) => (
                          <div key={deuda.id} className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0 p-3 border border-slate-200 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full text-sm font-bold text-blue-600">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-medium">{deuda.name}</p>
                                <p className="text-sm text-slate-600">Liquidada en mes {deuda.mesesALiquidacion}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">Intereses: {formatCRC(deuda.totalInteresAPagar)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* SNOWBALL */}
                <TabsContent value="snowball" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Estrategia Snowball (Psicológicamente Óptima)</CardTitle>
                      <CardDescription>Pagar primero las deudas con MENOR saldo</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-slate-600">Total Intereses</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCRC(resultado.snowball.totalizadoGlobal.interesTotalPagado)}
                          </p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <p className="text-sm text-slate-600">Liquidación</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {resultado.snowball.totalizadoGlobal.mesesALiquidacion} meses
                          </p>
                          <p className="text-xs text-slate-500">
                            ({(resultado.snowball.totalizadoGlobal.mesesALiquidacion / 12).toFixed(1)} años)
                          </p>
                        </div>
                        <div className="p-4 bg-amber-50 rounded-lg">
                          <p className="text-sm text-slate-600">Pago Total</p>
                          <p className="text-2xl font-bold text-amber-600">
                            {formatCRC(resultado.snowball.totalizadoGlobal.pagoTotalRequerido)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold">Orden de liquidación:</h4>
                        {resultado.snowball.deudas.map((deuda, idx) => (
                          <div key={deuda.id} className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0 p-3 border border-slate-200 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-cyan-100 rounded-full text-sm font-bold text-cyan-600">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-medium">{deuda.name}</p>
                                <p className="text-sm text-slate-600">Liquidada en mes {deuda.mesesALiquidacion}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">Intereses: {formatCRC(deuda.totalInteresAPagar)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <Card className="border-2 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingDown className="h-5 w-5 text-green-600" />
                    <span>Análisis Comparativo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Ahorro con Avalanche</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCRC(Math.abs(resultado.analisisComparativo.ahorroInteresesAvalanche))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Diferencia Temporal</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {Math.abs(resultado.analisisComparativo.diferenciaEnMeses)} meses
                      </p>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-semibold mb-2">
                        ✅ Recomendación: <span className="uppercase">{resultado.analisisComparativo.recomendacion}</span>
                      </p>
                      <p>{resultado.analisisComparativo.razonamiento}</p>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <div className="flex flex-col md:flex-row gap-3">
                <Button variant="default" size="lg" onClick={() => {
                  saveStrategyMutation.mutate({
                    userId: 'current',
                    strategy: estrategiaSeleccionada,
                    deudas,
                    presupuestoExtra,
                  })
                }}>
                  Guardar Estrategia
                </Button>
                <Button variant="outline" size="lg" onClick={async () => {
                    try {
                      if (!shouldCalculate) {
                        toast.error('Primero calcula la estrategia antes de exportar el PDF.')
                        return
                      }
                      const res = await fetch('/api/export-strategy-pdf', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ deudas, presupuestoExtra }),
                      })

                      if (!res.ok) throw new Error('Error generando PDF')

                      const blob = await res.blob()
                      const href = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = href
                      a.download = `estrategia-deuda-${new Date().toISOString().split('T')[0]}.pdf`
                      document.body.appendChild(a)
                      a.click()
                      a.remove()
                      URL.revokeObjectURL(href)
                    } catch (e) {
                      console.error(e)
                    }
                  }}>
                  Descargar Reporte
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Exportar componentes individuales para reutilización
 */
export { }
