'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { v4 as uuid } from 'uuid'
import { Plus, Trash2, Settings, CreditCard as CreditCardIcon, ArrowRight } from 'lucide-react'

function calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
  const monthlyRate = annualRate / 100 / 12
  if (monthlyRate === 0) return principal / months
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
}

function calculateTotalWithInterest(principal: number, annualRate: number, months: number): number {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, months)
  return monthlyPayment * months
}

export function CreditsPage({ credits, userId, onRefresh }: {
  credits: any[]
  userId: string
  onRefresh: () => void
}) {
  const [showNew, setShowNew] = useState(false)
  const [editingCredit, setEditingCredit] = useState<any | null>(null)
  const [paymentGoalId, setPaymentGoalId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const [newCredit, setNewCredit] = useState({
    name: '',
    financial_entity: '',
    product_type: 'credit_card' as 'credit_card' | 'loan',
    currency: 'CRC',
    interest_rate: 0,
    current_balance: 0,
    credit_limit: 0,
    minimum_payment: 0,
    statement_closing_day: 1,
    payment_due_day: 1,
    initial_amount: 0,
    loan_term_years: 1,
    total_installments: 60,
    installment_amount: 0,
    paid_installments: 0,
  })

  const creditCards = credits.filter((credit) => credit.product_type === 'credit_card')
  const loans = credits.filter((credit) => credit.product_type === 'loan')
  const currentCredit = editingCredit ? { ...newCredit, ...editingCredit } : newCredit

  const createCredit = async () => {
    const { name, financial_entity, product_type } = newCredit
    if (!name.trim() || !financial_entity) {
      toast.error('Completa todos los campos requeridos')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: uuid(),
          user_id: userId,
          ...newCredit,
          total_installments: product_type === 'credit_card' ? 60 : newCredit.total_installments,
        }),
      })

      if (res.ok) {
        setShowNew(false)
        setNewCredit({
          name: '',
          financial_entity: '',
          product_type: 'credit_card',
          currency: 'CRC',
          interest_rate: 0,
          current_balance: 0,
          credit_limit: 0,
          minimum_payment: 0,
          statement_closing_day: 1,
          payment_due_day: 1,
          initial_amount: 0,
          loan_term_years: 1,
          total_installments: 60,
          installment_amount: 0,
          paid_installments: 0,
        })
        onRefresh()
        toast.success('Crédito creado')
      } else {
        toast.error('Error creando crédito')
      }
    } catch {
      toast.error('Error al crear crédito')
    } finally {
      setSaving(false)
    }
  }

  const updateCredit = async () => {
    if (!editingCredit) return
    setSaving(true)
    try {
      const res = await fetch('/api/credits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCredit),
      })

      if (res.ok) {
        setEditingCredit(null)
        onRefresh()
        toast.success('Crédito actualizado')
      } else {
        toast.error('Error actualizando crédito')
      }
    } catch {
      toast.error('Error al actualizar crédito')
    } finally {
      setSaving(false)
    }
  }

  const deleteCredit = async (id: string) => {
    try {
      const res = await fetch(`/api/credits?id=${id}&userId=${userId}`, { method: 'DELETE' })
      if (res.ok) {
        onRefresh()
        toast.success('Crédito eliminado')
      } else {
        toast.error('Error eliminando crédito')
      }
    } catch {
      toast.error('Error al eliminar crédito')
    }
  }

  const addPayment = async (credit: any, amount: number) => {
    if (amount <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    const newBalance = Math.max(credit.current_balance - amount, 0)
    try {
      const res = await fetch('/api/credits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credit, current_balance: newBalance, paid_installments: (credit.paid_installments || 0) + 1 }),
      })

      if (res.ok) {
        onRefresh()
        setPaymentGoalId(null)
        setPaymentAmount('')
        toast.success('Pago registrado')
      } else {
        toast.error('Error registrando pago')
      }
    } catch {
      toast.error('Error al registrar pago')
    }
  }

  const formatCurrency = (value: number, currency: string) => {
    if (currency === 'USD') return `$${value.toFixed(2)}`
    return `₡${value.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Créditos y Préstamos</h1>
        <Button onClick={() => setShowNew(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={16} className="mr-1" /> Nuevo Crédito
        </Button>
      </div>

      {credits.length === 0 ? (
        <Card className="glass border-white/5 p-8 text-center">
          <CreditCardIcon size={40} className="mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Sin créditos registrados</h2>
          <p className="text-muted-foreground text-sm">Crea tu primer crédito para realizar un seguimiento</p>
        </Card>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Tarjetas de Crédito</h2>
                <p className="text-sm text-muted-foreground">Monitorea tu límite, saldo usado y fechas importantes.</p>
              </div>
              <span className="text-sm text-muted-foreground">{creditCards.length} tarjeta(s)</span>
            </div>

            {creditCards.length === 0 ? (
              <Card className="glass border-white/5 p-6">
                <h3 className="font-semibold">Aún no hay tarjetas</h3>
                <p className="text-sm text-muted-foreground">Agrega una tarjeta para llevar control de su utilización.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {creditCards.map(credit => {
                  const utilization = credit.credit_limit ? Math.min((credit.current_balance / credit.credit_limit) * 100, 100) : 0

                  return (
                    <Card key={credit.id} className="glass border-white/5 p-0 overflow-hidden">
                      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

                        <div className="relative z-10 space-y-6">
                          <div>
                            <p className="text-white/70 text-sm mb-1">Entidad</p>
                            <p className="font-semibold">{credit.financial_entity}</p>
                          </div>
                          <div className="text-3xl font-bold tracking-widest">
                            *4293 1891 0000 {credit.name?.toUpperCase().slice(0, 10)}
                          </div>
                          <div className="flex justify-between text-white/70 text-xs">
                            <div>
                              <p>Válida hasta</p>
                              <p className="font-semibold text-white">12/28</p>
                            </div>
                            <div className="text-right">
                              <p>Tasa de Interés</p>
                              <p className="font-semibold text-white text-lg">{credit.interest_rate}%</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white/5 rounded p-2">
                            <p className="text-muted-foreground text-xs">Límite de Crédito</p>
                            <p className="text-green-400 font-semibold">{formatCurrency(credit.credit_limit || 0, credit.currency)}</p>
                          </div>
                          <div className="bg-white/5 rounded p-2">
                            <p className="text-muted-foreground text-xs">Utilizado</p>
                            <p className="text-red-400 font-semibold">{formatCurrency(credit.current_balance || 0, credit.currency)}</p>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Utilización</span>
                            <span>{utilization.toFixed(1)}%</span>
                          </div>
                          <Progress value={utilization} className="h-2" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="bg-white/5 rounded p-2">
                            <p className="text-muted-foreground text-xs">Pago Mínimo</p>
                            <p className="font-semibold">{formatCurrency(credit.minimum_payment || 0, credit.currency)}</p>
                          </div>
                          <div className="bg-white/5 rounded p-2">
                            <p className="text-muted-foreground text-xs">Día de Corte</p>
                            <p className="font-semibold">{credit.statement_closing_day || 1}</p>
                          </div>
                          <div className="bg-white/5 rounded p-2">
                            <p className="text-muted-foreground text-xs">Día Vencimiento</p>
                            <p className="font-semibold">{credit.payment_due_day || 1}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {paymentGoalId === credit.id ? (
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <Label className="text-xs text-muted-foreground mb-1 block">Monto de Pago</Label>
                                <Input type="number" placeholder="0" value={paymentAmount}
                                  onChange={e => setPaymentAmount(e.target.value)}
                                  className="bg-white/5 border-white/10 text-sm" />
                              </div>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700"
                                onClick={() => addPayment(credit, parseFloat(paymentAmount) || 0)}>
                                Confirmar
                              </Button>
                              <Button size="sm" variant="outline"
                                onClick={() => { setPaymentGoalId(null); setPaymentAmount('') }}>
                                X
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" className="w-full bg-green-600 hover:bg-green-700"
                              onClick={() => { setPaymentGoalId(credit.id); setPaymentAmount('') }}>
                              <ArrowRight size={14} className="mr-1" /> Registrar Pago
                            </Button>
                          )}
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingCredit(credit)}>
                              <Settings size={14} className="mr-1" /> Editar
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 text-red-400 border-red-500/30" onClick={() => deleteCredit(credit.id)}>
                              <Trash2 size={14} className="mr-1" /> Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Préstamos</h2>
                <p className="text-sm text-muted-foreground">La cuota estimada se calcula por interés compuesto con el monto, plazo y tasa ingresados.</p>
              </div>
              <span className="text-sm text-muted-foreground">{loans.length} préstamo(s)</span>
            </div>

            {loans.length === 0 ? (
              <Card className="glass border-white/5 p-6">
                <h3 className="font-semibold">Aún no hay préstamos</h3>
                <p className="text-sm text-muted-foreground">Agrega un préstamo para ver su cuota mensual estimada.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loans.map(credit => {
                  const monthlyPayment = credit.initial_amount && credit.total_installments
                    ? calculateMonthlyPayment(credit.initial_amount, credit.interest_rate, credit.total_installments)
                    : 0
                  const progress = credit.total_installments
                    ? ((credit.paid_installments || 0) / credit.total_installments) * 100
                    : 0

                  return (
                    <Card key={credit.id} className="glass border-white/5 p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{credit.name}</h3>
                          <p className="text-xs text-muted-foreground">{credit.financial_entity}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditingCredit(credit)}><Settings size={14} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteCredit(credit.id)} className="text-red-400"><Trash2 size={14} /></Button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-white/5 rounded p-2">
                            <p className="text-muted-foreground text-xs">Cuota Mensual</p>
                            <p className="text-green-400 font-semibold">{formatCurrency(monthlyPayment, credit.currency)}</p>
                          </div>
                          <div className="bg-white/5 rounded p-2">
                            <p className="text-muted-foreground text-xs">Tasa</p>
                            <p className="text-orange-400 font-semibold">{credit.interest_rate}%</p>
                          </div>
                          <div className="bg-white/5 rounded p-2">
                            <p className="text-muted-foreground text-xs">Cuotas Pagadas</p>
                            <p className="font-semibold">{credit.paid_installments || 0}/{credit.total_installments}</p>
                          </div>
                          <div className="bg-white/5 rounded p-2">
                            <p className="text-muted-foreground text-xs">Saldo Actual</p>
                            <p className="text-red-400 font-semibold">{formatCurrency(credit.current_balance, credit.currency)}</p>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progreso</span>
                            <span>{progress.toFixed(1)}%</span>
                          </div>
                          <Progress value={Math.min(progress, 100)} className="h-2" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-white/5 rounded p-2">
                            <p className="text-muted-foreground text-xs">Plazo</p>
                            <p className="font-semibold">{credit.loan_term_years} años</p>
                          </div>
                          <div className="bg-white/5 rounded p-2">
                            <p className="text-muted-foreground text-xs">Cuotas Totales</p>
                            <p className="font-semibold">{credit.total_installments}</p>
                          </div>
                        </div>
                        {paymentGoalId === credit.id ? (
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground mb-1 block">Monto de Pago</Label>
                              <Input type="number" placeholder="0" value={paymentAmount}
                                onChange={e => setPaymentAmount(e.target.value)}
                                className="bg-white/5 border-white/10 text-sm" />
                            </div>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700"
                              onClick={() => addPayment(credit, parseFloat(paymentAmount) || 0)}>
                              Confirmar
                            </Button>
                            <Button size="sm" variant="outline"
                              onClick={() => { setPaymentGoalId(null); setPaymentAmount('') }}>
                              X
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => { setPaymentGoalId(credit.id); setPaymentAmount('') }}>
                            <ArrowRight size={14} className="mr-1" /> Registrar Pago
                          </Button>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tips Section */}
      <Card className="glass border-white/5 p-6">
        <h3 className="font-semibold mb-4">Recomendaciones Financieras</h3>
        <div className="space-y-3">
          <div className="border-l-2 border-blue-400 pl-3">
            <p className="text-sm text-muted-foreground">
              <strong>Seguridad:</strong> Recuerda no ingresar información sensible como números de tarjeta completos o cuentas bancarias. Esta información es solo para tu control personal.
            </p>
          </div>
          <div className="border-l-2 border-green-400 pl-3">
            <p className="text-sm text-muted-foreground">
              <strong>Cálculos:</strong> Para estimaciones del pago mínimo de tu tarjeta de crédito usa el módulo de <strong>Calculadora Financiera</strong>.
            </p>
          </div>
          <div className="border-l-2 border-orange-400 pl-3">
            <p className="text-sm text-muted-foreground">
              <strong>Precisión:</strong> Estos montos son aproximaciones. Para estimaciones exactas y asesoría profesional, consulta con un analista financiero de tu entidad.
            </p>
          </div>
          <div className="border-l-2 border-purple-400 pl-3">
            <p className="text-sm text-muted-foreground">
              <strong>Gestión:</strong> Mantén un registro actualizado de tus créditos. Esto te ayudará a monitorear tu salud financiera y planificar mejor tus pagos.
            </p>
          </div>
        </div>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showNew || !!editingCredit} onOpenChange={(open) => {
        if (!open) { setShowNew(false); setEditingCredit(null) }
      }}>
        <DialogContent className="bg-slate-950/95 border-white/15 shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>{editingCredit ? 'Editar Crédito' : 'Nuevo Crédito'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nombre/Alias</Label>
              <Input placeholder="ej: Tarjeta Visa, Préstamo Auto"
                value={currentCredit.name}
                onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, name: e.target.value }) : setNewCredit({ ...newCredit, name: e.target.value })}
                className="bg-white/5 border-white/10 mt-1" />
            </div>

            <div>
              <Label>Entidad Financiera</Label>
              <Input placeholder="ej: BAC, BNCR, Coopetrabas"
                value={currentCredit.financial_entity}
                onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, financial_entity: e.target.value }) : setNewCredit({ ...newCredit, financial_entity: e.target.value })}
                className="bg-white/5 border-white/10 mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={currentCredit.product_type}
                  onValueChange={v => editingCredit ? setEditingCredit({ ...editingCredit, product_type: v }) : setNewCredit({ ...newCredit, product_type: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                    <SelectItem value="loan">Préstamo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Moneda</Label>
                <Select value={currentCredit.currency}
                  onValueChange={v => editingCredit ? setEditingCredit({ ...editingCredit, currency: v }) : setNewCredit({ ...newCredit, currency: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">CRC</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tasa de Interés (%)</Label>
                <Input type="number" step="0.1" placeholder="15.5"
                  value={currentCredit.interest_rate}
                  onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, interest_rate: parseFloat(e.target.value) || 0 }) : setNewCredit({ ...newCredit, interest_rate: parseFloat(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10 mt-1" />
              </div>

              <div>
                <Label>Saldo Actual</Label>
                <Input type="number" placeholder="0"
                  value={currentCredit.current_balance}
                  onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, current_balance: parseFloat(e.target.value) || 0 }) : setNewCredit({ ...newCredit, current_balance: parseFloat(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10 mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Día vencimiento</Label>
                <Input type="number" min={1} max={31} placeholder="1"
                  value={currentCredit.payment_due_day}
                  onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, payment_due_day: parseInt(e.target.value) || 1 }) : setNewCredit({ ...newCredit, payment_due_day: parseInt(e.target.value) || 1 })}
                  className="bg-white/5 border-white/10 mt-1" />
              </div>

              <div>
                <Label>Día de corte</Label>
                <Input type="number" min={1} max={31} placeholder="1"
                  value={currentCredit.statement_closing_day}
                  onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, statement_closing_day: parseInt(e.target.value) || 1 }) : setNewCredit({ ...newCredit, statement_closing_day: parseInt(e.target.value) || 1 })}
                  className="bg-white/5 border-white/10 mt-1" />
              </div>
            </div>

            {(editingCredit ? editingCredit.product_type : newCredit.product_type) === 'loan' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Monto Inicial Adeudado</Label>
                    <Input type="number" placeholder="0"
                      value={currentCredit.initial_amount}
                      onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, initial_amount: parseFloat(e.target.value) || 0 }) : setNewCredit({ ...newCredit, initial_amount: parseFloat(e.target.value) || 0 })}
                      className="bg-white/5 border-white/10 mt-1" />
                  </div>

                  <div>
                    <Label>Tiempo (años)</Label>
                    <Input type="number" step="0.1" placeholder="1"
                      value={currentCredit.loan_term_years}
                      onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, loan_term_years: parseFloat(e.target.value) || 1 }) : setNewCredit({ ...newCredit, loan_term_years: parseFloat(e.target.value) || 1 })}
                      className="bg-white/5 border-white/10 mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cantidad de Cuotas</Label>
                    <Input type="number" placeholder="60"
                      value={currentCredit.total_installments}
                      onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, total_installments: parseInt(e.target.value) || 60 }) : setNewCredit({ ...newCredit, total_installments: parseInt(e.target.value) || 60 })}
                      className="bg-white/5 border-white/10 mt-1" />
                  </div>

                  <div>
                    <Label>Cuotas Pagadas</Label>
                    <Input type="number" placeholder="0"
                      value={currentCredit.paid_installments}
                      onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, paid_installments: parseInt(e.target.value) || 0 }) : setNewCredit({ ...newCredit, paid_installments: parseInt(e.target.value) || 0 })}
                      className="bg-white/5 border-white/10 mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Día vencimiento</Label>
                    <Input type="number" min={1} max={31} placeholder="1"
                      value={currentCredit.payment_due_day}
                      onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, payment_due_day: parseInt(e.target.value) || 1 }) : setNewCredit({ ...newCredit, payment_due_day: parseInt(e.target.value) || 1 })}
                      className="bg-white/5 border-white/10 mt-1" />
                  </div>
                </div>

                {(editingCredit ? editingCredit : newCredit) && (editingCredit ? editingCredit.initial_amount : newCredit.initial_amount) > 0 && (
                  <div className="bg-white/5 rounded p-3">
                    <p className="text-xs text-muted-foreground mb-1">Cuota Mensual Estimada:</p>
                    <p className="text-lg font-semibold text-green-400">
                      {formatCurrency(
                        calculateMonthlyPayment(
                          editingCredit ? editingCredit.initial_amount : newCredit.initial_amount,
                          editingCredit ? editingCredit.interest_rate : newCredit.interest_rate,
                          editingCredit ? editingCredit.total_installments : newCredit.total_installments
                        ),
                        editingCredit ? editingCredit.currency : newCredit.currency
                      )}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Límite de Crédito</Label>
                    <Input type="number" placeholder="0"
                      value={currentCredit.credit_limit}
                      onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, credit_limit: parseFloat(e.target.value) || 0 }) : setNewCredit({ ...newCredit, credit_limit: parseFloat(e.target.value) || 0 })}
                      className="bg-white/5 border-white/10 mt-1" />
                  </div>
                  <div>
                    <Label>Pago Mínimo</Label>
                    <Input type="number" placeholder="0"
                      value={currentCredit.minimum_payment}
                      onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, minimum_payment: parseFloat(e.target.value) || 0 }) : setNewCredit({ ...newCredit, minimum_payment: parseFloat(e.target.value) || 0 })}
                      className="bg-white/5 border-white/10 mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Día de corte</Label>
                    <Input type="number" min={1} max={31} placeholder="1"
                      value={currentCredit.statement_closing_day}
                      onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, statement_closing_day: parseInt(e.target.value) || 1 }) : setNewCredit({ ...newCredit, statement_closing_day: parseInt(e.target.value) || 1 })}
                      className="bg-white/5 border-white/10 mt-1" />
                  </div>

                  <div>
                    <Label>Día vencimiento</Label>
                    <Input type="number" min={1} max={31} placeholder="1"
                      value={currentCredit.payment_due_day}
                      onChange={e => editingCredit ? setEditingCredit({ ...editingCredit, payment_due_day: parseInt(e.target.value) || 1 }) : setNewCredit({ ...newCredit, payment_due_day: parseInt(e.target.value) || 1 })}
                      className="bg-white/5 border-white/10 mt-1" />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={editingCredit ? updateCredit : createCredit} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
