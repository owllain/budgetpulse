'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, CreditCard, TrendingUp, TrendingDown, Plus, Trash2,
  ChevronDown, ChevronUp, Download, Upload, Calculator,
  PiggyBank, Shield, Receipt, DollarSign, Landmark,
  ArrowRight, Eye, EyeOff, Sparkles, ChevronLeft, ChevronRight,
  FileSpreadsheet, FileText, FileJson, X, Check, AlertTriangle,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

// ============= TYPES =============
interface Income {
  id: string; name: string; amount: number; category: string; isRecurring: boolean
}
interface FixedExpense {
  id: string; name: string; amount: number; category: string; dueDate: string; isPaid: boolean
}
interface CreditObligation {
  id: string; name: string; type: string; totalDebt: number; monthlyPayment: number;
  annualRate: number; remainingMonths: number; minimumPayment: number; isPaid: boolean
}
interface EmergencyFund {
  id: string; name: string; targetAmount: number; currentAmount: number; monthlyContribution: number
}
interface VariableExpense {
  id: string; name: string; amount: number; category: string
}
interface Budget {
  id: string; name: string; periodType: string; periodStart: string; periodEnd: string; currency: string
  incomes: Income[]; fixedExpenses: FixedExpense[]; creditObligations: CreditObligation[];
  emergencyFunds: EmergencyFund[]; variableExpenses: VariableExpense[]
}

// ============= CONSTANTS =============
const INCOME_CATEGORIES = [
  { value: 'salary', label: 'Salario', icon: '💰' },
  { value: 'freelance', label: 'Freelance', icon: '💻' },
  { value: 'investment', label: 'Inversión', icon: '📈' },
  { value: 'other', label: 'Otro', icon: '📌' },
]
const FIXED_EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Alquiler', icon: '🏠' },
  { value: 'utilities', label: 'Servicios', icon: '💡' },
  { value: 'insurance', label: 'Seguros', icon: '🛡️' },
  { value: 'subscriptions', label: 'Suscripciones', icon: '📱' },
  { value: 'transport', label: 'Transporte', icon: '🚗' },
  { value: 'other', label: 'Otro', icon: '📌' },
]
const VARIABLE_EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Alimentación', icon: '🍕' },
  { value: 'entertainment', label: 'Entretenimiento', icon: '🎬' },
  { value: 'clothing', label: 'Ropa', icon: '👕' },
  { value: 'health', label: 'Salud', icon: '🏥' },
  { value: 'education', label: 'Educación', icon: '📚' },
  { value: 'gifts', label: 'Regalos', icon: '🎁' },
  { value: 'other', label: 'Otro', icon: '📌' },
]
const CREDIT_TYPES = [
  { value: 'credit_card', label: 'Tarjeta de Crédito' },
  { value: 'loan', label: 'Préstamo' },
  { value: 'financing', label: 'Financiamiento' },
]
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const FINANCIAL_TIPS = [
  { title: 'Regla 50/30/20', desc: 'Destina 50% a necesidades, 30% a deseos y 20% a ahorro. Es la base de un presupuesto saludable.', icon: '📊' },
  { title: 'Fondo de Emergencia', desc: 'Ahorra al menos 3-6 meses de gastos esenciales. Protege tu estabilidad ante imprevistos.', icon: '🛡️' },
  { title: 'Paga más del mínimo', desc: 'En tarjetas de crédito, pagar solo el mínimo genera intereses compuestos que duplican tu deuda.', icon: '💳' },
  { title: 'Automatiza tus ahorros', desc: 'Configura transferencias automáticas el día de pago. Ahorrar primero, gastar después.', icon: '🤖' },
  { title: 'Revisa tus suscripciones', desc: 'Audita mensualmente tus suscripciones activas. Elimina las que no uses regularmente.', icon: '📱' },
  { title: 'Interés compuesto', desc: 'En Costa Rica, las tarjetas pueden cobrar 24-36% anual. El interés compuesto hace que tu deuda crezca exponencialmente.', icon: '📈' },
  { title: 'Aguinaldo inteligente', desc: 'Usa tu aguinaldo para pagar deudas de alto interés o fortalecer tu fondo de emergencia.', icon: '🎄' },
  { title: 'Presupuesto por quincena', desc: 'Si cobras quincenal, divide tus gastos en dos mitades. Evita el estrés de fin de mes.', icon: '📅' },
]

const uid = () => Math.random().toString(36).substr(2, 9)

// ============= FORMAT HELPERS =============
function fmtCRC(n: number, cur: string = 'CRC') {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency', currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}
function getNow() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() }
}
function getMonthRange(periodType: string) {
  const { year, month } = getNow()
  if (periodType === 'biweek') {
    const day = new Date().getDate()
    if (day <= 15) {
      return { start: `${year}-${String(month + 1).padStart(2, '0')}-01`, end: `${year}-${String(month + 1).padStart(2, '0')}-15` }
    } else {
      const lastDay = new Date(year, month + 1, 0).getDate()
      return { start: `${year}-${String(month + 1).padStart(2, '0')}-16`, end: `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}` }
    }
  }
  const lastDay = new Date(year, month + 1, 0).getDate()
  return { start: `${year}-${String(month + 1).padStart(2, '0')}-01`, end: `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}` }
}

// ============= MAIN COMPONENT =============
export default function Home() {
  const [budgets, setBudgets] = useState<any[]>([])
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null)
  const [showBalance, setShowBalance] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [tipIndex, setTipIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)

  // Calculator states
  const [calcType, setCalcType] = useState<'loan' | 'credit-card' | 'bp-programs'>('loan')
  const [calcResults, setCalcResults] = useState<any>(null)
  const [aguinaldoSalaries, setAguinaldoSalaries] = useState<number[]>(Array(12).fill(0))
  const [aguinaldoResult, setAguinaldoResult] = useState<any>(null)

  // Form state
  const [formName, setFormName] = useState('Mi Presupuesto')
  const [formPeriodType, setFormPeriodType] = useState('month')
  const [formCurrency, setFormCurrency] = useState('CRC')
  const [formIncomes, setFormIncomes] = useState<Income[]>([])
  const [formFixedExpenses, setFormFixedExpenses] = useState<FixedExpense[]>([])
  const [formCreditObligations, setFormCreditObligations] = useState<CreditObligation[]>([])
  const [formEmergencyFunds, setFormEmergencyFunds] = useState<EmergencyFund[]>([])
  const [formVariableExpenses, setFormVariableExpenses] = useState<VariableExpense[]>([])

  // Calculator form states
  const [loanPrincipal, setLoanPrincipal] = useState(1000000)
  const [loanRate, setLoanRate] = useState(24)
  const [loanMonths, setLoanMonths] = useState(36)
  const [ccDebt, setCcDebt] = useState(500000)
  const [ccRate, setCcRate] = useState(27.5)
  const [ccPayment, setCcPayment] = useState(25000)
  const [bpAmount, setBpAmount] = useState(500000)
  const [bpCurrency, setBpCurrency] = useState<'CRC' | 'USD'>('CRC')

  // Fetch budget detail
  const fetchBudgetDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/budgets/${id}`)
      const data = await res.json()
      setActiveBudget({
        id: data.budget.id,
        name: data.budget.name,
        periodType: data.budget.period_type,
        periodStart: data.budget.period_start,
        periodEnd: data.budget.period_end,
        currency: data.budget.currency,
        incomes: (data.incomes || []).map((r: any) => ({
          id: r.id, name: r.name, amount: r.amount, category: r.category, isRecurring: !!r.is_recurring,
        })),
        fixedExpenses: (data.fixedExpenses || []).map((r: any) => ({
          id: r.id, name: r.name, amount: r.amount, category: r.category, dueDate: r.due_date || '', isPaid: !!r.is_paid,
        })),
        creditObligations: (data.creditObligations || []).map((r: any) => ({
          id: r.id, name: r.name, type: r.type, totalDebt: r.total_debt,
          monthlyPayment: r.monthly_payment, annualRate: r.annual_rate,
          remainingMonths: r.remaining_months, minimumPayment: r.minimum_payment, isPaid: !!r.is_paid,
        })),
        emergencyFunds: (data.emergencyFunds || []).map((r: any) => ({
          id: r.id, name: r.name, targetAmount: r.target_amount,
          currentAmount: r.current_amount, monthlyContribution: r.monthly_contribution,
        })),
        variableExpenses: (data.variableExpenses || []).map((r: any) => ({
          id: r.id, name: r.name, amount: r.amount, category: r.category,
        })),
      })
    } catch (e) {
      console.error('Failed to fetch budget detail', e)
    }
  }

  // Fetch budgets list on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/budgets')
        const data = await res.json()
        const list = data.budgets || []
        setBudgets(list)
        if (list.length > 0) {
          const firstId = list[0].id
          const detailRes = await fetch(`/api/budgets/${firstId}`)
          const detail = await detailRes.json()
          setActiveBudget({
            id: detail.budget.id,
            name: detail.budget.name,
            periodType: detail.budget.period_type,
            periodStart: detail.budget.period_start,
            periodEnd: detail.budget.period_end,
            currency: detail.budget.currency,
            incomes: (detail.incomes || []).map((r: any) => ({
              id: r.id, name: r.name, amount: r.amount, category: r.category, isRecurring: !!r.is_recurring,
            })),
            fixedExpenses: (detail.fixedExpenses || []).map((r: any) => ({
              id: r.id, name: r.name, amount: r.amount, category: r.category, dueDate: r.due_date || '', isPaid: !!r.is_paid,
            })),
            creditObligations: (detail.creditObligations || []).map((r: any) => ({
              id: r.id, name: r.name, type: r.type, totalDebt: r.total_debt,
              monthlyPayment: r.monthly_payment, annualRate: r.annual_rate,
              remainingMonths: r.remaining_months, minimumPayment: r.minimum_payment, isPaid: !!r.is_paid,
            })),
            emergencyFunds: (detail.emergencyFunds || []).map((r: any) => ({
              id: r.id, name: r.name, targetAmount: r.target_amount,
              currentAmount: r.current_amount, monthlyContribution: r.monthly_contribution,
            })),
            variableExpenses: (detail.variableExpenses || []).map((r: any) => ({
              id: r.id, name: r.name, amount: r.amount, category: r.category,
            })),
          })
        }
      } catch (e) {
        console.error('Failed to load budgets', e)
      }
    }
    load()
  }, [])

  // Budget summary calculations
  const summary = activeBudget ? {
    totalIncome: activeBudget.incomes.reduce((s, i) => s + i.amount, 0),
    totalFixedExpenses: activeBudget.fixedExpenses.reduce((s, e) => s + e.amount, 0),
    totalCreditObligations: activeBudget.creditObligations.reduce((s, o) => s + o.monthlyPayment, 0),
    totalEmergencyContribution: activeBudget.emergencyFunds.reduce((s, e) => s + e.monthlyContribution, 0),
    totalVariableExpenses: activeBudget.variableExpenses.reduce((s, e) => s + e.amount, 0),
  } : { totalIncome: 0, totalFixedExpenses: 0, totalCreditObligations: 0, totalEmergencyContribution: 0, totalVariableExpenses: 0 }

  const totalExpenses = summary.totalFixedExpenses + summary.totalCreditObligations + summary.totalEmergencyContribution + summary.totalVariableExpenses
  const available = summary.totalIncome - totalExpenses
  const availablePct = summary.totalIncome > 0 ? Math.round((available / summary.totalIncome) * 100) : 0

  // Refresh budgets list
  const refreshBudgets = async () => {
    try {
      const res = await fetch('/api/budgets')
      const data = await res.json()
      setBudgets(data.budgets || [])
    } catch (e) {
      console.error('Failed to refresh budgets', e)
    }
  }

  // Save budget
  const saveBudget = async () => {
    setLoading(true)
    try {
      const range = getMonthRange(formPeriodType)
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          periodType: formPeriodType,
          periodStart: range.start,
          periodEnd: range.end,
          currency: formCurrency,
          incomes: formIncomes,
          fixedExpenses: formFixedExpenses,
          creditObligations: formCreditObligations,
          emergencyFunds: formEmergencyFunds,
          variableExpenses: formVariableExpenses,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Presupuesto guardado exitosamente')
        setIsCreating(false)
        resetForm()
        await refreshBudgets()
        if (data.id) await fetchBudgetDetail(data.id)
      } else {
        toast.error('Error al guardar: ' + data.error)
      }
    } catch (e) {
      toast.error('Error de conexión')
    }
    setLoading(false)
  }

  const deleteBudget = async (id: string) => {
    try {
      await fetch(`/api/budgets/${id}`, { method: 'DELETE' })
      toast.success('Presupuesto eliminado')
      if (activeBudget?.id === id) setActiveBudget(null)
      await refreshBudgets()
    } catch (e) {
      toast.error('Error al eliminar')
    }
  }

  // Calculator functions
  const runLoanCalc = async () => {
    try {
      const res = await fetch('/api/calculators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'loan', principal: loanPrincipal, annualRate: loanRate / 100, months: loanMonths }),
      })
      const data = await res.json()
      setCalcResults({ type: 'loan', ...data })
    } catch (e) { toast.error('Error en cálculo') }
  }

  const runCCCalc = async () => {
    try {
      const res = await fetch('/api/calculators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'credit-card-projection', principal: ccDebt,
          annualRate: ccRate / 100, monthlyPayment: ccPayment, months: 60,
        }),
      })
      const data = await res.json()
      setCalcResults({ type: 'credit-card', ...data })
    } catch (e) { toast.error('Error en cálculo') }
  }

  const runBPCalc = async (programType: string) => {
    try {
      const res = await fetch('/api/calculators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: programType, amount: bpAmount, currency: bpCurrency }),
      })
      const data = await res.json()
      setCalcResults({ type: 'bp', program: data.program, ...data })
    } catch (e) { toast.error('Error en cálculo') }
  }

  const calcAguinaldoLocal = async () => {
    try {
      const res = await fetch('/api/aguinaldo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaries: aguinaldoSalaries, year: new Date().getFullYear() }),
      })
      const data = await res.json()
      setAguinaldoResult(data)
    } catch (e) { toast.error('Error en cálculo') }
  }

  // Export functions
  const exportJSON = async () => {
    if (!activeBudget) return toast.error('No hay presupuesto activo')
    const data = { ...activeBudget, summary: { ...summary, totalExpenses, available } }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${activeBudget.name}.json`; a.click()
    URL.revokeObjectURL(url)
    toast.success('JSON exportado')
  }

  const exportXLSX = () => {
    if (!activeBudget) return toast.error('No hay presupuesto activo')
    const wb = XLSX.utils.book_new()

    const summaryData = [
      ['Resumen del Presupuesto'],
      ['Nombre', activeBudget.name],
      ['Período', activeBudget.periodType === 'month' ? 'Mensual' : 'Quincenal'],
      ['Moneda', activeBudget.currency],
      ['', ''],
      ['Total Ingresos', summary.totalIncome],
      ['Gastos Fijos', summary.totalFixedExpenses],
      ['Obligaciones Crediticias', summary.totalCreditObligations],
      ['Fondos Emergencia', summary.totalEmergencyContribution],
      ['Gastos Variables', summary.totalVariableExpenses],
      ['Total Egresos', totalExpenses],
      ['Disponible', available],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen')

    const incomeRows = [['Ingresos', 'Categoría', 'Monto'], ...activeBudget.incomes.map(i => [i.name, i.category, i.amount])]
    const ws2 = XLSX.utils.aoa_to_sheet(incomeRows)
    XLSX.utils.book_append_sheet(wb, ws2, 'Ingresos')

    const expenseRows = [['Gasto Fijo', 'Categoría', 'Monto', 'Vencimiento', 'Pagado'], ...activeBudget.fixedExpenses.map(e => [e.name, e.category, e.amount, e.dueDate, e.isPaid ? 'Sí' : 'No'])]
    const ws3 = XLSX.utils.aoa_to_sheet(expenseRows)
    XLSX.utils.book_append_sheet(wb, ws3, 'Gastos Fijos')

    const creditRows = [['Obligación', 'Tipo', 'Deuda Total', 'Cuota Mensual', 'Tasa Anual', 'Meses Restantes'], ...activeBudget.creditObligations.map(o => [o.name, o.type, o.totalDebt, o.monthlyPayment, o.annualRate, o.remainingMonths])]
    const ws4 = XLSX.utils.aoa_to_sheet(creditRows)
    XLSX.utils.book_append_sheet(wb, ws4, 'Obligaciones')

    const varRows = [['Gasto Variable', 'Categoría', 'Monto'], ...activeBudget.variableExpenses.map(e => [e.name, e.category, e.amount])]
    const ws5 = XLSX.utils.aoa_to_sheet(varRows)
    XLSX.utils.book_append_sheet(wb, ws5, 'Gastos Variables')

    XLSX.writeFile(wb, `${activeBudget.name}.xlsx`)
    toast.success('Excel exportado')
  }

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.incomes) {
          setFormIncomes(data.incomes.map((i: any) => ({ ...i, id: uid() })))
          setFormFixedExpenses((data.fixedExpenses || []).map((e: any) => ({ ...e, id: uid() })))
          setFormCreditObligations((data.creditObligations || []).map((o: any) => ({ ...o, id: uid() })))
          setFormEmergencyFunds((data.emergencyFunds || []).map((f: any) => ({ ...f, id: uid() })))
          setFormVariableExpenses((data.variableExpenses || []).map((v: any) => ({ ...v, id: uid() })))
          setFormName(data.name || 'Presupuesto Importado')
          setFormCurrency(data.currency || 'CRC')
          setFormPeriodType(data.periodType || 'month')
          setIsCreating(true)
          setShowImportDialog(false)
          toast.success('JSON importado correctamente')
        } else {
          toast.error('Formato de archivo no válido')
        }
      } catch {
        toast.error('Error al leer el archivo JSON')
      }
    }
    reader.readAsText(file)
  }

  const resetForm = () => {
    setFormName('Mi Presupuesto')
    setFormPeriodType('month')
    setFormCurrency('CRC')
    setFormIncomes([])
    setFormFixedExpenses([])
    setFormCreditObligations([])
    setFormEmergencyFunds([])
    setFormVariableExpenses([])
  }

  // Tip carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex(i => (i + 1) % FINANCIAL_TIPS.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const cur = activeBudget?.currency || formCurrency

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* ============= HEADER ============= */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-poppins)' }}>
                  BudgetFlow
                </h1>
                <p className="text-emerald-100 text-xs sm:text-sm">Gestión Financiera Inteligente</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {budgets.length > 0 && (
                <Select value={activeBudget?.id || ''} onValueChange={(v) => fetchBudgetDetail(v)}>
                  <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgets.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setIsCreating(true) }} className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold gap-1.5">
                    <Plus className="w-4 h-4" /> Nuevo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-emerald-800" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Crear Presupuesto
                    </DialogTitle>
                  </DialogHeader>
                  {/* ===== BUDGET FORM ===== */}
                  <div className="space-y-6 mt-4">
                    {/* Basic info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre del Presupuesto</Label>
                        <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Mi Presupuesto" />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Período</Label>
                        <Select value={formPeriodType} onValueChange={setFormPeriodType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="month">Mensual</SelectItem>
                            <SelectItem value="biweek">Quincenal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Moneda</Label>
                        <Select value={formCurrency} onValueChange={setFormCurrency}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CRC">Colones (₡)</SelectItem>
                            <SelectItem value="USD">Dólares ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    {/* Incomes */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" /> Ingresos
                        </h3>
                        <Button size="sm" variant="outline" onClick={() => setFormIncomes([...formIncomes, { id: uid(), name: '', amount: 0, category: 'salary', isRecurring: true }])}>
                          <Plus className="w-3 h-3 mr-1" /> Agregar
                        </Button>
                      </div>
                      {formIncomes.map((inc, i) => (
                        <div key={inc.id} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-4"><Input placeholder="Nombre" value={inc.name} onChange={e => { const u = [...formIncomes]; u[i] = { ...u[i], name: e.target.value }; setFormIncomes(u) }} /></div>
                          <div className="col-span-3">
                            <Select value={inc.category} onValueChange={v => { const u = [...formIncomes]; u[i] = { ...u[i], category: v }; setFormIncomes(u) }}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>{INCOME_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3"><Input type="number" placeholder="Monto" value={inc.amount || ''} onChange={e => { const u = [...formIncomes]; u[i] = { ...u[i], amount: parseFloat(e.target.value) || 0 }; setFormIncomes(u) }} /></div>
                          <div className="col-span-1 flex items-center justify-center">
                            <TooltipProvider><Tooltip><TooltipTrigger><Switch checked={inc.isRecurring} onCheckedChange={v => { const u = [...formIncomes]; u[i] = { ...u[i], isRecurring: v }; setFormIncomes(u) }} /></TooltipTrigger><TooltipContent>Recurrente</TooltipContent></Tooltip></TooltipProvider>
                          </div>
                          <div className="col-span-1"><Button size="sm" variant="ghost" className="text-red-500 h-9" onClick={() => setFormIncomes(formIncomes.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></Button></div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Fixed Expenses */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
                          <Receipt className="w-4 h-4" /> Gastos Fijos
                        </h3>
                        <Button size="sm" variant="outline" onClick={() => setFormFixedExpenses([...formFixedExpenses, { id: uid(), name: '', amount: 0, category: 'utilities', dueDate: '', isPaid: false }])}>
                          <Plus className="w-3 h-3 mr-1" /> Agregar
                        </Button>
                      </div>
                      {formFixedExpenses.map((exp, i) => (
                        <div key={exp.id} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-3"><Input placeholder="Nombre" value={exp.name} onChange={e => { const u = [...formFixedExpenses]; u[i] = { ...u[i], name: e.target.value }; setFormFixedExpenses(u) }} /></div>
                          <div className="col-span-2">
                            <Select value={exp.category} onValueChange={v => { const u = [...formFixedExpenses]; u[i] = { ...u[i], category: v }; setFormFixedExpenses(u) }}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>{FIXED_EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2"><Input type="number" placeholder="Monto" value={exp.amount || ''} onChange={e => { const u = [...formFixedExpenses]; u[i] = { ...u[i], amount: parseFloat(e.target.value) || 0 }; setFormFixedExpenses(u) }} /></div>
                          <div className="col-span-2"><Input placeholder="Día venc." value={exp.dueDate} onChange={e => { const u = [...formFixedExpenses]; u[i] = { ...u[i], dueDate: e.target.value }; setFormFixedExpenses(u) }} /></div>
                          <div className="col-span-2 flex items-center gap-1">
                            <Switch checked={exp.isPaid} onCheckedChange={v => { const u = [...formFixedExpenses]; u[i] = { ...u[i], isPaid: v }; setFormFixedExpenses(u) }} />
                            <span className="text-xs text-muted-foreground">{exp.isPaid ? 'Pagado' : 'Pend.'}</span>
                          </div>
                          <div className="col-span-1"><Button size="sm" variant="ghost" className="text-red-500 h-9" onClick={() => setFormFixedExpenses(formFixedExpenses.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></Button></div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Credit Obligations */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" /> Obligaciones Crediticias
                        </h3>
                        <Button size="sm" variant="outline" onClick={() => setFormCreditObligations([...formCreditObligations, { id: uid(), name: '', type: 'credit_card', totalDebt: 0, monthlyPayment: 0, annualRate: 0, remainingMonths: 0, minimumPayment: 0, isPaid: false }])}>
                          <Plus className="w-3 h-3 mr-1" /> Agregar
                        </Button>
                      </div>
                      {formCreditObligations.map((obl, i) => (
                        <div key={obl.id} className="space-y-2 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                          <div className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-3"><Input placeholder="Nombre" value={obl.name} onChange={e => { const u = [...formCreditObligations]; u[i] = { ...u[i], name: e.target.value }; setFormCreditObligations(u) }} /></div>
                            <div className="col-span-3">
                              <Select value={obl.type} onValueChange={v => { const u = [...formCreditObligations]; u[i] = { ...u[i], type: v }; setFormCreditObligations(u) }}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>{CREDIT_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2"><Input type="number" placeholder="Deuda total" value={obl.totalDebt || ''} onChange={e => { const u = [...formCreditObligations]; u[i] = { ...u[i], totalDebt: parseFloat(e.target.value) || 0 }; setFormCreditObligations(u) }} /></div>
                            <div className="col-span-2"><Input type="number" placeholder="Cuota mensual" value={obl.monthlyPayment || ''} onChange={e => { const u = [...formCreditObligations]; u[i] = { ...u[i], monthlyPayment: parseFloat(e.target.value) || 0 }; setFormCreditObligations(u) }} /></div>
                            <div className="col-span-1 flex items-center">
                              <Switch checked={obl.isPaid} onCheckedChange={v => { const u = [...formCreditObligations]; u[i] = { ...u[i], isPaid: v }; setFormCreditObligations(u) }} />
                            </div>
                            <div className="col-span-1"><Button size="sm" variant="ghost" className="text-red-500 h-9" onClick={() => setFormCreditObligations(formCreditObligations.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></Button></div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div><Label className="text-xs">Tasa Anual (%)</Label><Input type="number" step="0.01" value={obl.annualRate || ''} onChange={e => { const u = [...formCreditObligations]; u[i] = { ...u[i], annualRate: parseFloat(e.target.value) || 0 }; setFormCreditObligations(u) }} /></div>
                            <div><Label className="text-xs">Meses restantes</Label><Input type="number" value={obl.remainingMonths || ''} onChange={e => { const u = [...formCreditObligations]; u[i] = { ...u[i], remainingMonths: parseInt(e.target.value) || 0 }; setFormCreditObligations(u) }} /></div>
                            <div><Label className="text-xs">Pago mínimo</Label><Input type="number" value={obl.minimumPayment || ''} onChange={e => { const u = [...formCreditObligations]; u[i] = { ...u[i], minimumPayment: parseFloat(e.target.value) || 0 }; setFormCreditObligations(u) }} /></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Emergency Funds */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
                          <Shield className="w-4 h-4" /> Fondos de Emergencia
                        </h3>
                        <Button size="sm" variant="outline" onClick={() => setFormEmergencyFunds([...formEmergencyFunds, { id: uid(), name: '', targetAmount: 0, currentAmount: 0, monthlyContribution: 0 }])}>
                          <Plus className="w-3 h-3 mr-1" /> Agregar
                        </Button>
                      </div>
                      {formEmergencyFunds.map((ef, i) => (
                        <div key={ef.id} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-3"><Input placeholder="Nombre" value={ef.name} onChange={e => { const u = [...formEmergencyFunds]; u[i] = { ...u[i], name: e.target.value }; setFormEmergencyFunds(u) }} /></div>
                          <div className="col-span-2"><Input type="number" placeholder="Meta" value={ef.targetAmount || ''} onChange={e => { const u = [...formEmergencyFunds]; u[i] = { ...u[i], targetAmount: parseFloat(e.target.value) || 0 }; setFormEmergencyFunds(u) }} /></div>
                          <div className="col-span-2"><Input type="number" placeholder="Actual" value={ef.currentAmount || ''} onChange={e => { const u = [...formEmergencyFunds]; u[i] = { ...u[i], currentAmount: parseFloat(e.target.value) || 0 }; setFormEmergencyFunds(u) }} /></div>
                          <div className="col-span-3"><Input type="number" placeholder="Aporte mensual" value={ef.monthlyContribution || ''} onChange={e => { const u = [...formEmergencyFunds]; u[i] = { ...u[i], monthlyContribution: parseFloat(e.target.value) || 0 }; setFormEmergencyFunds(u) }} /></div>
                          <div className="col-span-2"><Button size="sm" variant="ghost" className="text-red-500 h-9" onClick={() => setFormEmergencyFunds(formEmergencyFunds.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></Button></div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Variable Expenses */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
                          <TrendingDown className="w-4 h-4" /> Gastos Variables / Otros
                        </h3>
                        <Button size="sm" variant="outline" onClick={() => setFormVariableExpenses([...formVariableExpenses, { id: uid(), name: '', amount: 0, category: 'food' }])}>
                          <Plus className="w-3 h-3 mr-1" /> Agregar
                        </Button>
                      </div>
                      {formVariableExpenses.map((ve, i) => (
                        <div key={ve.id} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-4"><Input placeholder="Nombre" value={ve.name} onChange={e => { const u = [...formVariableExpenses]; u[i] = { ...u[i], name: e.target.value }; setFormVariableExpenses(u) }} /></div>
                          <div className="col-span-3">
                            <Select value={ve.category} onValueChange={v => { const u = [...formVariableExpenses]; u[i] = { ...u[i], category: v }; setFormVariableExpenses(u) }}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>{VARIABLE_EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-4"><Input type="number" placeholder="Monto" value={ve.amount || ''} onChange={e => { const u = [...formVariableExpenses]; u[i] = { ...u[i], amount: parseFloat(e.target.value) || 0 }; setFormVariableExpenses(u) }} /></div>
                          <div className="col-span-1"><Button size="sm" variant="ghost" className="text-red-500 h-9" onClick={() => setFormVariableExpenses(formVariableExpenses.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></Button></div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button onClick={saveBudget} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 flex-1">
                        {loading ? 'Guardando...' : 'Guardar Presupuesto'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {/* Import */}
              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                    <Upload className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Importar Presupuesto JSON</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Selecciona un archivo JSON exportado previamente para editar o recrear tu presupuesto.</p>
                    <Input type="file" accept=".json" onChange={handleImportJSON} />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* ============= MAIN CONTENT ============= */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm border">
            <TabsTrigger value="dashboard" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Wallet className="w-4 h-4" /> <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="calculators" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Calculator className="w-4 h-4" /> <span className="hidden sm:inline">Calculadoras</span>
            </TabsTrigger>
            <TabsTrigger value="aguinaldo" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <DollarSign className="w-4 h-4" /> <span className="hidden sm:inline">Aguinaldo</span>
            </TabsTrigger>
            <TabsTrigger value="tips" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">Consejos</span>
            </TabsTrigger>
          </TabsList>

          {/* ============= DASHBOARD TAB ============= */}
          <TabsContent value="dashboard" className="space-y-6">
            {!activeBudget ? (
              <div className="text-center py-16">
                <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                  ¡Bienvenido a BudgetFlow!
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Crea tu primer presupuesto para comenzar a gestionar tus finanzas de forma inteligente.
                </p>
                <Button onClick={() => { resetForm(); setIsCreating(true) }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                  <Plus className="w-4 h-4" /> Crear Mi Primer Presupuesto
                </Button>
              </div>
            ) : (
              <>
                {/* ===== DEBIT CARD VISUAL ===== */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <div className="w-full max-w-md">
                    <div className="relative overflow-hidden rounded-2xl shadow-2xl" style={{
                      background: available >= 0
                        ? 'linear-gradient(135deg, #065f46 0%, #059669 40%, #10b981 100%)'
                        : 'linear-gradient(135deg, #991b1b 0%, #dc2626 40%, #ef4444 100%)',
                    }}>
                      {/* Card decorative circles */}
                      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
                      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
                      <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/5" />

                      <div className="relative p-6 sm:p-8">
                        {/* Card header */}
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-2">
                            <Landmark className="w-6 h-6 text-white/80" />
                            <span className="text-white/80 font-medium text-sm">BudgetFlow</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-white/60 text-xs">
                              {activeBudget.periodType === 'month' ? 'MENSUAL' : 'QUINCENAL'}
                            </span>
                            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white h-6 w-6 p-0" onClick={() => setShowBalance(!showBalance)}>
                              {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Available balance */}
                        <div className="mb-8">
                          <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Disponible</p>
                          <p className="text-white text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {showBalance ? fmtCRC(available, cur) : '••••••••'}
                          </p>
                          <p className="text-white/50 text-xs mt-1">
                            {activeBudget.currency === 'CRC' ? 'Colones' : 'Dólares'} · {activeBudget.name}
                          </p>
                        </div>

                        {/* Card details */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-white/50 text-[10px] uppercase tracking-widest">Ingresos</p>
                            <p className="text-white font-semibold text-sm">
                              {showBalance ? fmtCRC(summary.totalIncome, cur) : '••••••'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-white/50 text-[10px] uppercase tracking-widest">Egresos</p>
                            <p className="text-white font-semibold text-sm">
                              {showBalance ? fmtCRC(totalExpenses, cur) : '••••••'}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white/50 text-[10px]">Uso del presupuesto</span>
                            <span className="text-white/80 text-xs font-medium">{availablePct}% libre</span>
                          </div>
                          <div className="w-full bg-white/20 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, Math.max(0, 100 - availablePct))}%`,
                                backgroundColor: availablePct >= 20 ? '#ffffff' : availablePct >= 0 ? '#fbbf24' : '#fca5a5',
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card chip */}
                      <div className="absolute top-16 right-8">
                        <div className="w-10 h-8 rounded bg-gradient-to-br from-yellow-200/40 to-yellow-400/40 border border-white/20" />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* ===== SUMMARY CARDS ===== */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-emerald-100 p-1.5 rounded-lg"><TrendingUp className="w-4 h-4 text-emerald-600" /></div>
                          <span className="text-xs text-muted-foreground">Ingresos</span>
                        </div>
                        <p className="font-bold text-emerald-800 text-lg">{fmtCRC(summary.totalIncome, cur)}</p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-orange-100 p-1.5 rounded-lg"><Receipt className="w-4 h-4 text-orange-600" /></div>
                          <span className="text-xs text-muted-foreground">Gastos Fijos</span>
                        </div>
                        <p className="font-bold text-orange-800 text-lg">{fmtCRC(summary.totalFixedExpenses, cur)}</p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-amber-100 p-1.5 rounded-lg"><CreditCard className="w-4 h-4 text-amber-600" /></div>
                          <span className="text-xs text-muted-foreground">Créditos</span>
                        </div>
                        <p className="font-bold text-amber-800 text-lg">{fmtCRC(summary.totalCreditObligations, cur)}</p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-white">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-sky-100 p-1.5 rounded-lg"><Shield className="w-4 h-4 text-sky-600" /></div>
                          <span className="text-xs text-muted-foreground">Emergencia</span>
                        </div>
                        <p className="font-bold text-sky-800 text-lg">{fmtCRC(summary.totalEmergencyContribution, cur)}</p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-2 lg:col-span-1">
                    <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-white">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-rose-100 p-1.5 rounded-lg"><TrendingDown className="w-4 h-4 text-rose-600" /></div>
                          <span className="text-xs text-muted-foreground">Variables</span>
                        </div>
                        <p className="font-bold text-rose-800 text-lg">{fmtCRC(summary.totalVariableExpenses, cur)}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* ===== BUDGET DETAILS ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Income list */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> Ingresos</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ScrollArea className="max-h-48">
                        {activeBudget.incomes.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Sin ingresos registrados</p>
                        ) : (
                          <div className="space-y-2">
                            {activeBudget.incomes.map(inc => (
                              <div key={inc.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{INCOME_CATEGORIES.find(c => c.value === inc.category)?.icon || '📌'}</span>
                                  <span className="text-sm font-medium">{inc.name}</span>
                                  {inc.isRecurring && <Badge variant="secondary" className="text-[10px]">Recurrente</Badge>}
                                </div>
                                <span className="text-sm font-semibold text-emerald-700">{fmtCRC(inc.amount, cur)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Fixed expenses */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><Receipt className="w-4 h-4 text-orange-600" /> Gastos Fijos</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ScrollArea className="max-h-48">
                        {activeBudget.fixedExpenses.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Sin gastos fijos</p>
                        ) : (
                          <div className="space-y-2">
                            {activeBudget.fixedExpenses.map(exp => (
                              <div key={exp.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{FIXED_EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.icon || '📌'}</span>
                                  <span className="text-sm font-medium">{exp.name}</span>
                                  {exp.isPaid ? <Badge className="text-[10px] bg-emerald-100 text-emerald-700">Pagado</Badge> : <Badge variant="outline" className="text-[10px]">Pendiente</Badge>}
                                </div>
                                <span className="text-sm font-semibold text-orange-700">{fmtCRC(exp.amount, cur)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Credit obligations */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4 text-amber-600" /> Obligaciones Crediticias</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ScrollArea className="max-h-48">
                        {activeBudget.creditObligations.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Sin obligaciones</p>
                        ) : (
                          <div className="space-y-2">
                            {activeBudget.creditObligations.map(obl => (
                              <div key={obl.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{obl.name}</span>
                                    <Badge variant="secondary" className="text-[10px]">{CREDIT_TYPES.find(c => c.value === obl.type)?.label || obl.type}</Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Deuda: {fmtCRC(obl.totalDebt, cur)} · Tasa: {obl.annualRate}% · {obl.remainingMonths} meses
                                  </div>
                                </div>
                                <span className="text-sm font-semibold text-amber-700">{fmtCRC(obl.monthlyPayment, cur)}/mes</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Variable expenses */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><TrendingDown className="w-4 h-4 text-rose-600" /> Gastos Variables</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ScrollArea className="max-h-48">
                        {activeBudget.variableExpenses.length === 0 && activeBudget.emergencyFunds.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Sin gastos variables ni fondos</p>
                        ) : (
                          <div className="space-y-2">
                            {activeBudget.emergencyFunds.map(ef => (
                              <div key={ef.id} className="flex items-center justify-between py-1.5 border-b">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3.5 h-3.5 text-sky-500" />
                                  <span className="text-sm font-medium">{ef.name}</span>
                                  <Badge variant="secondary" className="text-[10px]">Emergencia</Badge>
                                </div>
                                <span className="text-sm font-semibold text-sky-700">{fmtCRC(ef.monthlyContribution, cur)}/mes</span>
                              </div>
                            ))}
                            {activeBudget.variableExpenses.map(ve => (
                              <div key={ve.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{VARIABLE_EXPENSE_CATEGORIES.find(c => c.value === ve.category)?.icon || '📌'}</span>
                                  <span className="text-sm font-medium">{ve.name}</span>
                                </div>
                                <span className="text-sm font-semibold text-rose-700">{fmtCRC(ve.amount, cur)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* Export buttons */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">Exportar:</span>
                      <Button size="sm" variant="outline" onClick={exportXLSX} className="gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                      </Button>
                      <Button size="sm" variant="outline" onClick={exportJSON} className="gap-1.5">
                        <FileJson className="w-3.5 h-3.5" /> JSON
                      </Button>
                      <div className="flex-1" />
                      <Button size="sm" variant="destructive" onClick={() => deleteBudget(activeBudget.id)} className="gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ============= CALCULATORS TAB ============= */}
          <TabsContent value="calculators" className="space-y-6">
            <Tabs value={calcType} onValueChange={v => { setCalcType(v as any); setCalcResults(null) }}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="loan">Préstamo</TabsTrigger>
                <TabsTrigger value="credit-card">Tarjeta Crédito</TabsTrigger>
                <TabsTrigger value="bp-programs">Planes BP</TabsTrigger>
              </TabsList>

              {/* Loan Calculator */}
              <TabsContent value="loan" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Landmark className="w-5 h-5 text-emerald-600" /> Calculadora de Préstamos</CardTitle>
                    <CardDescription>Calcula tu cuota mensual usando el sistema de amortización francés</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Monto del Préstamo</Label>
                        <Input type="number" value={loanPrincipal} onChange={e => setLoanPrincipal(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Tasa Anual (%)</Label>
                        <Input type="number" step="0.01" value={loanRate} onChange={e => setLoanRate(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Plazo (meses)</Label>
                        <Input type="number" value={loanMonths} onChange={e => setLoanMonths(parseInt(e.target.value) || 0)} />
                      </div>
                    </div>
                    <Button onClick={runLoanCalc} className="bg-emerald-600 hover:bg-emerald-700 gap-2 w-full sm:w-auto">
                      <Calculator className="w-4 h-4" /> Calcular
                    </Button>
                  </CardContent>
                </Card>

                {calcResults?.type === 'loan' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-emerald-200 bg-emerald-50/30">
                      <CardHeader>
                        <CardTitle className="text-lg">Resultados</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-white p-4 rounded-xl border">
                            <p className="text-xs text-muted-foreground">Cuota Mensual</p>
                            <p className="text-2xl font-bold text-emerald-700" style={{ fontFamily: 'var(--font-poppins)' }}>{fmtCRC(calcResults.monthlyPayment)}</p>
                          </div>
                          <div className="bg-white p-4 rounded-xl border">
                            <p className="text-xs text-muted-foreground">Total a Pagar</p>
                            <p className="text-2xl font-bold text-orange-700" style={{ fontFamily: 'var(--font-poppins)' }}>{fmtCRC(calcResults.totalPaid)}</p>
                          </div>
                          <div className="bg-white p-4 rounded-xl border">
                            <p className="text-xs text-muted-foreground">Total Intereses</p>
                            <p className="text-2xl font-bold text-red-700" style={{ fontFamily: 'var(--font-poppins)' }}>{fmtCRC(calcResults.totalInterest)}</p>
                          </div>
                        </div>
                        {calcResults.schedule && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Tabla de Amortización (primeros 12 meses)</h4>
                            <ScrollArea className="max-h-64">
                              <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-emerald-50">
                                  <tr>
                                    <th className="text-left p-2">Mes</th>
                                    <th className="text-right p-2">Cuota</th>
                                    <th className="text-right p-2">Principal</th>
                                    <th className="text-right p-2">Interés</th>
                                    <th className="text-right p-2">Saldo</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {calcResults.schedule.slice(0, 12).map((row: any) => (
                                    <tr key={row.month} className="border-b">
                                      <td className="p-2">{row.month}</td>
                                      <td className="text-right p-2">{fmtCRC(row.payment)}</td>
                                      <td className="text-right p-2 text-emerald-700">{fmtCRC(row.principal)}</td>
                                      <td className="text-right p-2 text-red-600">{fmtCRC(row.interest)}</td>
                                      <td className="text-right p-2">{fmtCRC(row.balance)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </ScrollArea>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </TabsContent>

              {/* Credit Card Calculator */}
              <TabsContent value="credit-card" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-amber-600" /> Proyección de Tarjeta de Crédito</CardTitle>
                    <CardDescription>Ve cómo evoluciona tu deuda con el interés compuesto</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Deuda Actual</Label>
                        <Input type="number" value={ccDebt} onChange={e => setCcDebt(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Tasa Anual (%)</Label>
                        <Input type="number" step="0.01" value={ccRate} onChange={e => setCcRate(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Pago Mensual</Label>
                        <Input type="number" value={ccPayment} onChange={e => setCcPayment(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    <Button onClick={runCCCalc} className="bg-amber-600 hover:bg-amber-700 gap-2 w-full sm:w-auto">
                      <Calculator className="w-4 h-4" /> Proyectar Deuda
                    </Button>
                  </CardContent>
                </Card>

                {calcResults?.type === 'credit-card' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-amber-200 bg-amber-50/30">
                      <CardHeader>
                        <CardTitle className="text-lg">Proyección</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {calcResults.payoff?.months === -1 ? (
                          <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                            <div>
                              <p className="font-semibold text-red-800">¡Tu pago no cubre los intereses!</p>
                              <p className="text-sm text-red-700">Con este pago mensual, tu deuda crecerá indefinidamente. Necesitas pagar al menos {fmtCRC(ccDebt * (ccRate / 100 / 12))} mensuales para empezar a reducir la deuda.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-xl border">
                              <p className="text-xs text-muted-foreground">Meses para liquidar</p>
                              <p className="text-2xl font-bold text-amber-700" style={{ fontFamily: 'var(--font-poppins)' }}>{calcResults.payoff?.months || 0}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border">
                              <p className="text-xs text-muted-foreground">Total intereses</p>
                              <p className="text-2xl font-bold text-red-700" style={{ fontFamily: 'var(--font-poppins)' }}>{fmtCRC(calcResults.payoff?.totalInterest || 0)}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border">
                              <p className="text-xs text-muted-foreground">Total pagado</p>
                              <p className="text-2xl font-bold text-orange-700" style={{ fontFamily: 'var(--font-poppins)' }}>{fmtCRC(calcResults.payoff?.totalPaid || 0)}</p>
                            </div>
                          </div>
                        )}
                        {calcResults.projection && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Evolución de la Deuda</h4>
                            <ScrollArea className="max-h-64">
                              <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-amber-50">
                                  <tr>
                                    <th className="text-left p-2">Mes</th>
                                    <th className="text-right p-2">Saldo</th>
                                    <th className="text-right p-2">Intereses Acum.</th>
                                    <th className="text-right p-2">Total Pagado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {calcResults.projection.filter((_: any, i: number) => i < 24 || i % 6 === 0).map((row: any) => (
                                    <tr key={row.month} className="border-b">
                                      <td className="p-2">{row.month}</td>
                                      <td className="text-right p-2">{fmtCRC(row.balance)}</td>
                                      <td className="text-right p-2 text-red-600">{fmtCRC(row.interestAccumulated)}</td>
                                      <td className="text-right p-2">{fmtCRC(row.totalPaid)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </ScrollArea>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </TabsContent>

              {/* BP Programs */}
              <TabsContent value="bp-programs" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Landmark className="w-5 h-5 text-purple-600" /> Planes de Lealtad Banco Popular</CardTitle>
                    <CardDescription>Minicuotas, Tasa Cero y Compra de Saldos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Monto</Label>
                        <Input type="number" value={bpAmount} onChange={e => setBpAmount(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Moneda</Label>
                        <Select value={bpCurrency} onValueChange={v => setBpCurrency(v as 'CRC' | 'USD')}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CRC">Colones (₡)</SelectItem>
                            <SelectItem value="USD">Dólares ($)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => runBPCalc('bp-minicuotas')} className="bg-purple-600 hover:bg-purple-700 gap-1.5">
                        <Calculator className="w-4 h-4" /> Minicuotas
                      </Button>
                      <Button onClick={() => runBPCalc('bp-tasa-cero')} className="bg-teal-600 hover:bg-teal-700 gap-1.5">
                        <Calculator className="w-4 h-4" /> Tasa Cero
                      </Button>
                      <Button onClick={() => runBPCalc('bp-compra-saldos')} className="bg-orange-600 hover:bg-orange-700 gap-1.5">
                        <Calculator className="w-4 h-4" /> Compra de Saldos
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {calcResults?.type === 'bp' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-purple-200 bg-purple-50/30">
                      <CardHeader>
                        <CardTitle className="text-lg">{calcResults.program}</CardTitle>
                        {calcResults.commission !== undefined && (
                          <CardDescription>Comisión del 3%: {fmtCRC(calcResults.commission, bpCurrency)} · Total: {fmtCRC(calcResults.totalWithCommission, bpCurrency)}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {calcResults.paymentsByTerm?.map((item: any) => (
                            <div key={item.term} className="bg-white p-4 rounded-xl border text-center">
                              <p className="text-xs text-muted-foreground mb-1">Cuota a {item.term} meses</p>
                              <p className="text-xl font-bold text-purple-700" style={{ fontFamily: 'var(--font-poppins)' }}>
                                {fmtCRC(item.payment, bpCurrency)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ============= AGUINALDO TAB ============= */}
          <TabsContent value="aguinaldo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-600" /> Calculadora de Aguinaldo</CardTitle>
                <CardDescription>
                  Ingresa tus 12 salarios mensuales (diciembre del año anterior a noviembre del actual) según la normativa de Costa Rica.
                  El aguinaldo equivale al promedio de los 12 salarios.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {aguinaldoSalaries.map((sal, i) => (
                    <div key={i} className="space-y-1">
                      <Label className="text-xs font-medium">{MONTHS[i]}</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={sal || ''}
                        onChange={e => {
                          const newSalaries = [...aguinaldoSalaries]
                          newSalaries[i] = parseFloat(e.target.value) || 0
                          setAguinaldoSalaries(newSalaries)
                        }}
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={calcAguinaldoLocal} className="bg-emerald-600 hover:bg-emerald-700 gap-2 w-full sm:w-auto">
                  <Calculator className="w-4 h-4" /> Calcular Aguinaldo
                </Button>
              </CardContent>
            </Card>

            {aguinaldoResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Total Salarios Brutos</p>
                        <p className="text-2xl font-bold text-slate-700" style={{ fontFamily: 'var(--font-poppins)' }}>{fmtCRC(aguinaldoResult.totalGross)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Promedio Mensual</p>
                        <p className="text-2xl font-bold text-teal-700" style={{ fontFamily: 'var(--font-poppins)' }}>{fmtCRC(aguinaldoResult.averageSalary)}</p>
                      </div>
                      <div className="text-center bg-emerald-100/50 p-4 rounded-2xl">
                        <p className="text-sm text-emerald-600 mb-1 font-medium">🎉 Tu Aguinaldo</p>
                        <p className="text-3xl font-bold text-emerald-700" style={{ fontFamily: 'var(--font-poppins)' }}>{fmtCRC(aguinaldoResult.aguinaldoAmount)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Info card about aguinaldo */}
            <Card className="bg-sky-50/50 border-sky-200">
              <CardContent className="p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-sky-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-sky-800">
                  <p className="font-semibold mb-1">Normativa de Aguinaldo en Costa Rica</p>
                  <ul className="list-disc list-inside space-y-1 text-sky-700">
                    <li>El aguinaldo equivale al promedio de los salarios devengados del 1° de diciembre al 30 de noviembre.</li>
                    <li>Se debe pagar antes del 20 de diciembre de cada año.</li>
                    <li>Es irrenunciable y no puede ser compensado con otras deudas.</li>
                    <li>Si trabajaste menos de 12 meses, se promedian los meses trabajados.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============= TIPS TAB ============= */}
          <TabsContent value="tips" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'var(--font-poppins)' }}>
                <Sparkles className="w-6 h-6 inline-block mr-2 text-emerald-500" />
                Consejos Financieros
              </h2>
              <p className="text-muted-foreground mt-1">Tips para mejorar tu salud financiera</p>
            </div>

            {/* Carousel */}
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tipIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-2xl mx-auto"
                >
                  <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 overflow-hidden">
                    <CardContent className="p-8 sm:p-10 text-center">
                      <div className="text-5xl mb-4">{FINANCIAL_TIPS[tipIndex].icon}</div>
                      <h3 className="text-xl font-bold text-slate-800 mb-3" style={{ fontFamily: 'var(--font-poppins)' }}>
                        {FINANCIAL_TIPS[tipIndex].title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {FINANCIAL_TIPS[tipIndex].desc}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-center gap-4 mt-6">
                <Button variant="outline" size="icon" onClick={() => setTipIndex((tipIndex - 1 + FINANCIAL_TIPS.length) % FINANCIAL_TIPS.length)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex gap-1.5">
                  {FINANCIAL_TIPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setTipIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === tipIndex ? 'bg-emerald-600 w-6' : 'bg-emerald-200'}`}
                    />
                  ))}
                </div>
                <Button variant="outline" size="icon" onClick={() => setTipIndex((tipIndex + 1) % FINANCIAL_TIPS.length)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* All tips grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
              {FINANCIAL_TIPS.map((tip, i) => (
                <Card
                  key={i}
                  className={`cursor-pointer transition-all hover:shadow-md ${i === tipIndex ? 'border-emerald-400 shadow-md' : 'hover:border-emerald-200'}`}
                  onClick={() => setTipIndex(i)}
                >
                  <CardContent className="p-4">
                    <div className="text-2xl mb-2">{tip.icon}</div>
                    <h4 className="font-semibold text-sm text-slate-800 mb-1">{tip.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{tip.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ============= FOOTER ============= */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>BudgetFlow</span>
          </div>
          <p className="text-xs">Gestión Financiera Inteligente · Costa Rica 🇨🇷</p>
          <p className="text-xs mt-1 text-slate-500">Las calculadoras son orientativas. Consulta siempre con tu entidad financiera.</p>
        </div>
      </footer>
    </div>
  )
}
