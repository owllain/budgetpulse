'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, CreditCard, TrendingUp, TrendingDown, Plus, Trash2,
  Download, Upload, Calculator, PiggyBank, Shield, Receipt,
  DollarSign, Landmark, ArrowRight, Eye, EyeOff, Sparkles,
  ChevronLeft, ChevronRight, FileSpreadsheet, FileJson, X,
  Check, AlertTriangle, Info, Settings, LayoutDashboard,
  Target, Lightbulb, RotateCcw, BarChart3, PieChart as PieChartIcon,
  Banknote, Percent, Calendar, ChevronDown, Search,
  ArrowUpRight, ArrowDownRight, CircleDot, Gem, Coins,
  BadgeDollarSign, Scale, BookOpen, Heart, Star, Zap,
  Home as HomeIcon, Menu, ChevronUp, Copy, ExternalLink
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { toast } from 'sonner'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LineChart, Line, Area, AreaChart
} from 'recharts'
import * as XLSX from 'xlsx'

// ============= TYPES =============
interface IncomeItem {
  id: string; category: string; description: string; amount: number; sortOrder: number
}
interface ExpenseItem {
  id: string; category: string; subCategory: string; description: string; amount: number
  extraData: { totalDebt?: number; annualRate?: number; remainingMonths?: number; targetAmount?: number; currentAmount?: number; monthlyContribution?: number }
  sortOrder: number
}
interface Budget {
  id: string; name: string; period: string; currency: string; holderName: string
  incomes: IncomeItem[]; expenses: ExpenseItem[]
}
interface SavingsGoal {
  id: string; name: string; targetAmount: number; currentAmount: number; targetDate: string | null; currency: string
}

// ============= CONSTANTS =============
const INCOME_CATEGORIES = [
  { value: 'salary', label: 'Salario', icon: '💰' },
  { value: 'freelance', label: 'Freelance', icon: '💻' },
  { value: 'investment', label: 'Inversión', icon: '📈' },
  { value: 'other', label: 'Otro', icon: '📌' },
]
const EXPENSE_CATEGORIES = [
  { value: 'fixed', label: 'Gastos Fijos', icon: '🏠', color: '#6366F1' },
  { value: 'credit', label: 'Crédito', icon: '💳', color: '#EF4444' },
  { value: 'emergency', label: 'Emergencia', icon: '🛡️', color: '#F59E0B' },
  { value: 'other', label: 'Otros', icon: '📦', color: '#8B5CF6' },
]
const MONTHS_CR = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov']
const MONTHS_FULL = ['Diciembre', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre']

const FINANCIAL_TIPS = [
  { title: 'Regla 50/30/20', desc: 'Destina 50% a necesidades, 30% a deseos y 20% a ahorro. Es la base de un presupuesto saludable.', icon: '📊', category: 'presupuesto' },
  { title: 'Fondo de Emergencia', desc: 'Ahorra al menos 3-6 meses de gastos esenciales. Protege tu estabilidad ante imprevistos.', icon: '🛡️', category: 'ahorro' },
  { title: 'Paga más del mínimo', desc: 'En tarjetas de crédito, pagar solo el mínimo genera intereses compuestos que duplican tu deuda.', icon: '💳', category: 'credito' },
  { title: 'Automatiza tus ahorros', desc: 'Configura transferencias automáticas el día de pago. Ahorrar primero, gastar después.', icon: '🤖', category: 'ahorro' },
  { title: 'Revisa tus suscripciones', desc: 'Audita mensualmente tus suscripciones activas. Elimina las que no uses regularmente.', icon: '📱', category: 'presupuesto' },
  { title: 'Interés compuesto', desc: 'En Costa Rica, las tarjetas pueden cobrar 24-36% anual. El interés compuesto hace que tu deuda crezca exponencialmente.', icon: '📈', category: 'credito' },
  { title: 'Aguinaldo inteligente', desc: 'Usa tu aguinaldo para pagar deudas de alto interés o fortalecer tu fondo de emergencia.', icon: '🎄', category: 'ahorro' },
  { title: 'Presupuesto por quincena', desc: 'Si cobras quincenal, divide tus gastos en dos mitades. Evita el estrés de fin de mes.', icon: '📅', category: 'presupuesto' },
  { title: 'Diversifica ingresos', desc: 'No dependas de una sola fuente de ingresos. Busca alternativas: freelance, inversiones, venta de servicios.', icon: '💡', category: 'ingresos' },
  { title: 'Tasa efectiva vs nominal', desc: 'La tasa efectiva incluye la capitalización. Siempre compara tasas efectivas al evaluar créditos.', icon: '🔍', category: 'credito' },
  { title: 'Ley de aguinaldo CR', desc: 'El aguinaldo equivale al promedio de los salarios del 1 de dic al 30 de nov. Es un derecho laboral irrenunciable.', icon: '⚖️', category: 'legal' },
  { title: 'CCSS y deducciones', desc: 'Conoce tus deducciones obligatorias: CCSS (~10.67%) e Impuesto Renta. Así sabrás tu salario neto real.', icon: '🏥', category: 'legal' },
]

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'presupuesto', label: 'Presupuesto', icon: Receipt },
  { id: 'proyecciones', label: 'Proyecciones', icon: Calculator },
  { id: 'aguinaldo', label: 'Aguinaldo', icon: PiggyBank },
  { id: 'consejos', label: 'Consejos', icon: Lightbulb },
  { id: 'configuracion', label: 'Config', icon: Settings },
]

const uid = () => Math.random().toString(36).substr(2, 9)

// ============= FORMAT HELPERS =============
function fmtCRC(n: number, cur: string = 'CRC') {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency', currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}
function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}K`
  return n.toFixed(0)
}

// ============= HEALTH SCORE HELPERS =============
function calcHealthScore(params: {
  totalIncome: number; totalExpenses: number; totalDebt: number;
  emergencyFund: number; monthlyEmergencyTarget: number; savingsRate: number
}): number {
  let score = 50
  if (params.savingsRate >= 20) score += 25
  else if (params.savingsRate >= 10) score += 15
  else if (params.savingsRate > 0) score += 5
  else score -= 10
  const debtRatio = params.totalIncome > 0 ? params.totalDebt / params.totalIncome : 0
  if (debtRatio <= 0.2) score += 25
  else if (debtRatio <= 0.35) score += 15
  else if (debtRatio <= 0.5) score += 5
  else score -= 15
  if (params.emergencyFund >= params.monthlyEmergencyTarget) score += 25
  else if (params.emergencyFund >= params.monthlyEmergencyTarget * 0.5) score += 12
  else score -= 5
  const expenseRatio = params.totalIncome > 0 ? params.totalExpenses / params.totalIncome : 1
  if (expenseRatio <= 0.6) score += 25
  else if (expenseRatio <= 0.8) score += 15
  else if (expenseRatio <= 1) score += 0
  else score -= 25
  return Math.max(0, Math.min(100, score))
}

function getHealthColor(score: number): string {
  if (score >= 70) return '#10B981'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}
function getHealthLabel(score: number): string {
  if (score >= 80) return 'Excelente'
  if (score >= 60) return 'Bueno'
  if (score >= 40) return 'Regular'
  if (score >= 20) return 'Precaución'
  return 'Crítico'
}
function getCardHealthClass(available: number, totalIncome: number): string {
  if (totalIncome === 0) return ''
  const ratio = available / totalIncome
  if (ratio >= 0.2) return 'health-good'
  if (ratio >= 0) return 'health-warning'
  return 'health-danger'
}

// ============= FINANCIAL CALC HELPERS =============
function calcPMT(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months
  const r = annualRate / 12
  const factor = Math.pow(1 + r, months)
  return principal * (r * factor) / (factor - 1)
}
function amortizationSchedule(principal: number, annualRate: number, months: number) {
  const schedule: { month: number; payment: number; principal: number; interest: number; balance: number }[] = []
  const r = annualRate / 12
  const pmt = calcPMT(principal, annualRate, months)
  let bal = principal
  for (let i = 1; i <= Math.min(months, 60); i++) {
    const int = bal * r
    const prin = pmt - int
    bal = Math.max(0, bal - prin)
    schedule.push({ month: i, payment: pmt, principal: prin, interest: int, balance: bal })
    if (bal === 0) break
  }
  return schedule
}
function payoffTime(principal: number, annualRate: number, payment: number) {
  const r = annualRate / 12
  let bal = principal, totalInt = 0, months = 0
  while (bal > 0 && months < 600) {
    const int = bal * r
    if (payment <= int) return { months: -1, totalInterest: Infinity, totalPaid: Infinity }
    totalInt += int
    bal = bal + int - payment
    months++
    if (bal < 0) bal = 0
  }
  return { months, totalInterest: totalInt, totalPaid: principal + totalInt }
}
function projectCCDebt(principal: number, annualRate: number, payment: number, months: number) {
  const proj: { month: number; balance: number; interestAccum: number; totalPaid: number }[] = []
  const r = annualRate / 12
  let bal = principal, intAccum = 0, paid = 0
  for (let i = 1; i <= months; i++) {
    const int = bal * r
    intAccum += int
    bal = bal + int - payment
    paid += payment
    if (bal < 0) { paid += bal; bal = 0 }
    proj.push({ month: i, balance: bal, interestAccum: intAccum, totalPaid: paid })
    if (bal === 0) break
  }
  return proj
}
function calcNetSalary(gross: number) {
  const ccss = gross * 0.1067
  const taxable = gross - ccss
  let ir = 0
  if (taxable > 4238000) ir = taxable * 0.25 - 272000
  else if (taxable > 2120000) ir = taxable * 0.20 - 60000
  else if (taxable > 1317000) ir = taxable * 0.15 - 25800
  else if (taxable > 922000) ir = taxable * 0.10
  ir = Math.max(0, ir)
  return { gross, ccss, ir, net: gross - ccss - ir, deductions: [{ name: 'CCSS (Seguro Social)', amount: ccss }, { name: 'Impuesto Renta', amount: ir }] }
}
function calcAguinaldoLocal(salaries: number[]) {
  const totalGross = salaries.reduce((s, v) => s + v, 0)
  const monthsWorked = salaries.filter(s => s > 0).length || 1
  const aguinaldoAmount = totalGross / 12
  return { salaries, totalGross, averageSalary: totalGross / monthsWorked, aguinaldoAmount, monthsWorked }
}

// ============= MAIN COMPONENT =============
export default function Home() {
  // Navigation
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Budget state
  const [budgets, setBudgets] = useState<any[]>([])
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null)
  const [showBalance, setShowBalance] = useState(true)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Goals
  const [goals, setGoals] = useState<SavingsGoal[]>([])

  // Budget form
  const [formName, setFormName] = useState('Mi Presupuesto')
  const [formPeriod, setFormPeriod] = useState('monthly')
  const [formCurrency, setFormCurrency] = useState('CRC')
  const [formHolderName, setFormHolderName] = useState('')
  const [formIncomes, setFormIncomes] = useState<IncomeItem[]>([])
  const [formExpenses, setFormExpenses] = useState<ExpenseItem[]>([])

  // Calculator states
  const [calcTab, setCalcTab] = useState('credit-card')
  const [calcResults, setCalcResults] = useState<any>(null)
  const [ccDebt, setCcDebt] = useState(500000)
  const [ccRate, setCcRate] = useState(27.5)
  const [ccPayment, setCcPayment] = useState(25000)
  const [loanPrincipal, setLoanPrincipal] = useState(1000000)
  const [loanRate, setLoanRate] = useState(24)
  const [loanMonths, setLoanMonths] = useState(36)
  const [financePrincipal, setFinancePrincipal] = useState(2000000)
  const [financeRate, setFinanceRate] = useState(18)
  const [financeTerms, setFinanceTerms] = useState('12,24,36,48')
  const [bpAmount, setBpAmount] = useState(500000)
  const [bpCurrency, setBpCurrency] = useState<'CRC' | 'USD'>('CRC')
  const [bpProgram, setBpProgram] = useState('minicuotas')

  // Aguinaldo
  const [aguinaldoSalaries, setAguinaldoSalaries] = useState<number[]>(Array(12).fill(0))
  const [aguinaldoResult, setAguinaldoResult] = useState<any>(null)
  const [aguinaldoMonthsWorked, setAguinaldoMonthsWorked] = useState(12)

  // Tips
  const [tipIndex, setTipIndex] = useState(0)
  const [tipCategory, setTipCategory] = useState('todos')
  const [tipAutoPlay, setTipAutoPlay] = useState(true)

  // Config
  const [configHolderName, setConfigHolderName] = useState('')
  const [configCurrency, setConfigCurrency] = useState('CRC')
  const [configExchangeRate, setConfigExchangeRate] = useState(520)
  const [configGrossSalary, setConfigGrossSalary] = useState(0)
  const [netSalaryResult, setNetSalaryResult] = useState<any>(null)

  // Import
  const [showImportDialog, setShowImportDialog] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)

  // Computed budget summary
  const cur = activeBudget?.currency || formCurrency || 'CRC'

  const summary = useMemo(() => {
    if (!activeBudget) return { totalIncome: 0, totalExpenses: 0, available: 0, totalDebt: 0, emergencyFund: 0 }
    const totalIncome = activeBudget.incomes.reduce((s, i) => s + i.amount, 0)
    const totalExpenses = activeBudget.expenses.reduce((s, e) => s + e.amount, 0)
    const totalDebt = activeBudget.expenses.filter(e => e.category === 'credit').reduce((s, e) => s + (e.extraData?.totalDebt || 0), 0)
    const emergencyFund = activeBudget.expenses.filter(e => e.category === 'emergency').reduce((s, e) => s + (e.extraData?.currentAmount || 0), 0)
    return { totalIncome, totalExpenses, available: totalIncome - totalExpenses, totalDebt, emergencyFund }
  }, [activeBudget])

  const healthScore = useMemo(() => {
    if (!activeBudget || summary.totalIncome === 0) return 50
    return calcHealthScore({
      totalIncome: summary.totalIncome,
      totalExpenses: summary.totalExpenses,
      totalDebt: summary.totalDebt,
      emergencyFund: summary.emergencyFund,
      monthlyEmergencyTarget: summary.totalExpenses * 3,
      savingsRate: summary.totalIncome > 0 ? ((summary.totalIncome - summary.totalExpenses) / summary.totalIncome) * 100 : 0,
    })
  }, [activeBudget, summary])

  const expenseByCategory = useMemo(() => {
    if (!activeBudget) return []
    const map: Record<string, number> = {}
    activeBudget.expenses.forEach(e => {
      const cat = EXPENSE_CATEGORIES.find(c => c.value === e.category)
      const label = cat?.label || e.category
      map[label] = (map[label] || 0) + e.amount
    })
    return Object.entries(map).map(([name, value]) => ({ name, value, color: EXPENSE_CATEGORIES.find(c => c.label === name)?.color || '#8B5CF6' }))
  }, [activeBudget])

  const incomeVsExpenseData = useMemo(() => {
    if (!activeBudget) return []
    const incomeTotal = activeBudget.incomes.reduce((s, i) => s + i.amount, 0)
    const expenseTotal = activeBudget.expenses.reduce((s, e) => s + e.amount, 0)
    return [
      { name: 'Ingresos', value: incomeTotal, fill: '#10B981' },
      { name: 'Egresos', value: expenseTotal, fill: '#EF4444' },
      { name: 'Disponible', value: Math.max(0, incomeTotal - expenseTotal), fill: '#6366F1' },
    ]
  }, [activeBudget])

  // Fetch budgets
  const refreshBudgets = useCallback(async () => {
    try {
      const res = await fetch('/api/budgets')
      const data = await res.json()
      setBudgets(data.budgets || [])
    } catch (e) { console.error('Failed to refresh budgets', e) }
  }, [])

  const fetchBudgetDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/budgets/${id}`)
      const data = await res.json()
      if (data.budget) {
        setActiveBudget({
          id: data.budget.id,
          name: data.budget.name,
          period: data.budget.period,
          currency: data.budget.currency,
          holderName: data.budget.holder_name || '',
          incomes: (data.incomes || []).map((r: any) => ({
            id: r.id, category: r.category, description: r.description, amount: r.amount, sortOrder: r.sort_order
          })),
          expenses: (data.expenses || []).map((r: any) => ({
            id: r.id, category: r.category, subCategory: r.sub_category || '',
            description: r.description, amount: r.amount, sortOrder: r.sort_order,
            extraData: JSON.parse(r.extra_data || '{}')
          })),
        })
      }
    } catch (e) { console.error('Failed to fetch budget detail', e) }
  }, [])

  const refreshGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/goals')
      const data = await res.json()
      setGoals((data.goals || []) as SavingsGoal[])
    } catch (e) { console.error('Failed to fetch goals', e) }
  }, [])

  // Init load
  useEffect(() => {
    const load = async () => {
      await refreshBudgets()
      await refreshGoals()
    }
    load()
  }, [refreshBudgets, refreshGoals])

  // Auto-load first budget
  useEffect(() => {
    if (budgets.length > 0 && !activeBudget) {
      fetchBudgetDetail(budgets[0].id)
    }
  }, [budgets, activeBudget, fetchBudgetDetail])

  // Tip carousel
  useEffect(() => {
    if (!tipAutoPlay) return
    const timer = setInterval(() => {
      setTipIndex(i => (i + 1) % FINANCIAL_TIPS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [tipAutoPlay])

  // Save budget
  const saveBudget = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName, period: formPeriod, currency: formCurrency, holderName: formHolderName,
          incomes: formIncomes.map((inc, i) => ({ category: inc.category, description: inc.description, amount: inc.amount, sortOrder: i })),
          expenses: formExpenses.map((exp, i) => ({
            category: exp.category, subCategory: exp.subCategory, description: exp.description,
            amount: exp.amount, extraData: exp.extraData, sortOrder: i
          })),
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
    } catch (e) { toast.error('Error de conexión') }
    setLoading(false)
  }

  const deleteBudget = async (id: string) => {
    try {
      await fetch(`/api/budgets/${id}`, { method: 'DELETE' })
      toast.success('Presupuesto eliminado')
      if (activeBudget?.id === id) setActiveBudget(null)
      await refreshBudgets()
    } catch (e) { toast.error('Error al eliminar') }
  }

  // Export functions
  const exportJSON = () => {
    if (!activeBudget) return toast.error('No hay presupuesto activo')
    const data = { ...activeBudget, summary }
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
      ['Resumen del Presupuesto'], ['Nombre', activeBudget.name],
      ['Período', activeBudget.period === 'monthly' ? 'Mensual' : 'Quincenal'],
      ['Moneda', activeBudget.currency], ['', ''],
      ['Total Ingresos', summary.totalIncome], ['Total Egresos', summary.totalExpenses],
      ['Disponible', summary.available], ['Deuda Total', summary.totalDebt],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Resumen')
    const incomeRows = [['Descripción', 'Categoría', 'Monto'], ...activeBudget.incomes.map(i => [i.description, i.category, i.amount])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(incomeRows), 'Ingresos')
    const expenseRows = [['Descripción', 'Categoría', 'Subcategoría', 'Monto'], ...activeBudget.expenses.map(e => [e.description, e.category, e.subCategory, e.amount])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expenseRows), 'Egresos')
    XLSX.writeFile(wb, `${activeBudget.name}.xlsx`)
    toast.success('Excel exportado')
  }

  const exportPDF = async () => {
    if (!activeBudget) return toast.error('No hay presupuesto activo')
    try {
      const jsPDF = (await import('jspdf')).default
      await import('jspdf-autotable')
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text(`Presupuesto: ${activeBudget.name}`, 14, 20)
      doc.setFontSize(11)
      doc.text(`Periodo: ${activeBudget.period === 'monthly' ? 'Mensual' : 'Quincenal'} | Moneda: ${activeBudget.currency}`, 14, 30)
      doc.text(`Ingresos: ${fmtCRC(summary.totalIncome, cur)} | Egresos: ${fmtCRC(summary.totalExpenses, cur)}`, 14, 38)
      doc.text(`Disponible: ${fmtCRC(summary.available, cur)}`, 14, 46)
      ;(doc as any).autoTable({
        startY: 55, head: [['Descripción', 'Categoría', 'Monto']],
        body: activeBudget.incomes.map(i => [i.description, i.category, fmtCRC(i.amount, cur)]),
        theme: 'grid', headStyles: { fillColor: [99, 102, 241] }
      })
      ;(doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Descripción', 'Categoría', 'Monto']],
        body: activeBudget.expenses.map(e => [e.description, e.category, fmtCRC(e.amount, cur)]),
        theme: 'grid', headStyles: { fillColor: [239, 68, 68] }
      })
      doc.save(`${activeBudget.name}.pdf`)
      toast.success('PDF exportado')
    } catch (e) { toast.error('Error al exportar PDF') }
  }

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.incomes || data.expenses) {
          setFormIncomes((data.incomes || []).map((i: any) => ({ ...i, id: uid() })))
          setFormExpenses((data.expenses || []).map((e: any) => ({ ...e, id: uid(), extraData: e.extraData || {} })))
          setFormName(data.name || 'Presupuesto Importado')
          setFormCurrency(data.currency || 'CRC')
          setFormPeriod(data.period || 'monthly')
          setFormHolderName(data.holderName || '')
          setIsCreating(true)
          setShowImportDialog(false)
          setActivePage('presupuesto')
          toast.success('JSON importado correctamente')
        } else {
          toast.error('Formato de archivo no válido')
        }
      } catch { toast.error('Error al leer el archivo JSON') }
    }
    reader.readAsText(file)
  }

  const resetForm = () => {
    setFormName('Mi Presupuesto'); setFormPeriod('monthly'); setFormCurrency('CRC')
    setFormHolderName(''); setFormIncomes([]); setFormExpenses([])
  }

  // Calculator runners
  const runCCCalc = async () => {
    try {
      const res = await fetch('/api/calculators', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'credit-card', principal: ccDebt, annualRate: ccRate / 100, payment: ccPayment, months: 60 }),
      })
      const data = await res.json()
      setCalcResults({ type: 'credit-card', ...data })
    } catch (e) { toast.error('Error en cálculo') }
  }

  const runLoanCalc = async () => {
    try {
      const res = await fetch('/api/calculators', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'loan', principal: loanPrincipal, annualRate: loanRate / 100, months: loanMonths }),
      })
      const data = await res.json()
      setCalcResults({ type: 'loan', ...data })
    } catch (e) { toast.error('Error en cálculo') }
  }

  const runFinanceCalc = () => {
    const terms = financeTerms.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t) && t > 0)
    const results = terms.map(term => ({
      term,
      payment: calcPMT(financePrincipal, financeRate / 100, term),
      totalPaid: calcPMT(financePrincipal, financeRate / 100, term) * term,
      totalInterest: calcPMT(financePrincipal, financeRate / 100, term) * term - financePrincipal,
    }))
    setCalcResults({ type: 'financing', results, principal: financePrincipal, rate: financeRate })
  }

  const runBPCalc = async () => {
    try {
      const type = bpProgram === 'minicuotas' ? 'bp-minicuotas' : bpProgram === 'tasa-cero' ? 'bp-tasa-cero' : 'bp-compra-saldos'
      const res = await fetch('/api/calculators', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount: bpAmount, currency: bpCurrency }),
      })
      const data = await res.json()
      setCalcResults({ type: 'bp', ...data })
    } catch (e) { toast.error('Error en cálculo') }
  }

  const runAguinaldoCalc = async () => {
    try {
      const res = await fetch('/api/aguinaldo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaries: aguinaldoSalaries, year: new Date().getFullYear() }),
      })
      const data = await res.json()
      setAguinaldoResult(data)
    } catch (e) { toast.error('Error en cálculo') }
  }

  const runNetSalaryCalc = async () => {
    try {
      const res = await fetch('/api/calculators', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'net-salary', grossSalary: configGrossSalary }),
      })
      const data = await res.json()
      setNetSalaryResult(data)
    } catch (e) { toast.error('Error en cálculo') }
  }

  // ============= RENDER HELPERS =============
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  }

  // ============= DEBIT CARD =============
  const renderDebitCard = () => {
    const healthClass = getCardHealthClass(summary.available, summary.totalIncome)
    const maskedNumber = '•••• •••• •••• 4829'
    const holderName = activeBudget?.holderName || configHolderName || 'TITULAR DE LA TARJETA'
    const expiryDate = '12/28'

    return (
      <div className="card-flip w-full max-w-sm mx-auto" onClick={() => setCardFlipped(!cardFlipped)}>
        <div className={`card-flip-inner ${cardFlipped ? 'flipped' : ''}`} style={{ minHeight: 220 }}>
          {/* Front */}
          <div className={`debit-card ${healthClass} card-front rounded-2xl p-6 text-white relative`} style={{ minHeight: 220 }}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-8 rounded bg-gradient-to-br from-yellow-300 to-yellow-600" style={{ clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0% 100%)' }} />
                <span className="text-xs font-mono opacity-70">CHIP</span>
              </div>
              <span className="text-xl font-bold italic tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex)' }}>VISA</span>
            </div>
            <div className="mb-4">
              <p className="text-xs opacity-50 mb-1">Balance Disponible</p>
              <p className={`text-3xl font-bold ${showBalance ? 'gold-shimmer' : 'opacity-30'}`} style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                {showBalance ? fmtCRC(summary.available, cur) : '••••••••'}
              </p>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs font-mono tracking-[0.2em] opacity-70">{showBalance ? maskedNumber : '•••• •••• •••• ••••'}</p>
                <p className="text-xs mt-1 uppercase tracking-wider opacity-60">{holderName}</p>
              </div>
              <p className="text-xs opacity-60">{expiryDate}</p>
            </div>
            {/* Decorative circles */}
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent)' }} />
            <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2), transparent)' }} />
            {/* Show/hide balance toggle */}
            <button
              className="absolute top-4 right-4 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance) }}
            >
              {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          {/* Back */}
          <div className="debit-card card-back rounded-2xl p-5 text-white" style={{ minHeight: 220 }}>
            <div className="w-full h-8 bg-gray-800 mb-4 rounded" />
            <div className="space-y-3">
              <p className="text-xs opacity-50 font-semibold uppercase tracking-wider">Desglose de Gastos</p>
              {expenseByCategory.length > 0 ? (
                <div className="space-y-2">
                  {expenseByCategory.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs">{cat.name}</span>
                      </div>
                      <span className="text-xs font-mono">{fmtCRC(cat.value, cur)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs opacity-40">Sin datos de gastos</p>
              )}
              <Separator className="bg-white/10" />
              <div className="flex justify-between text-xs">
                <span className="opacity-60">Ingresos</span>
                <span className="text-emerald-400 font-mono">{fmtCRC(summary.totalIncome, cur)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="opacity-60">Egresos</span>
                <span className="text-red-400 font-mono">{fmtCRC(summary.totalExpenses, cur)}</span>
              </div>
            </div>
            <p className="text-[10px] opacity-30 text-center mt-3">Click para voltear</p>
          </div>
        </div>
      </div>
    )
  }

  // ============= HEALTH SCORE GAUGE =============
  const renderHealthGauge = () => {
    const color = getHealthColor(healthScore)
    const circumference = 2 * Math.PI * 45
    const offset = circumference - (healthScore / 100) * circumference
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color }}>{healthScore}</span>
            <span className="text-[10px] text-muted-foreground">de 100</span>
          </div>
        </div>
        <Badge variant="outline" className="mt-2" style={{ borderColor: color, color }}>
          {getHealthLabel(healthScore)}
        </Badge>
      </div>
    )
  }

  // ============= DASHBOARD PAGE =============
  const renderDashboard = () => (
    <motion.div key="dashboard" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      {/* Debit Card */}
      <div className="glass rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Mi Tarjeta
          </h2>
          <Badge variant="outline" className="text-xs">
            {activeBudget ? activeBudget.period === 'monthly' ? 'Mensual' : 'Quincenal' : 'Sin presupuesto'}
          </Badge>
        </div>
        {renderDebitCard()}
      </div>

      {/* Health Score + Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Health Score */}
        <div className="glass rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Salud Financiera</h3>
          {renderHealthGauge()}
        </div>

        {/* Summary Stats */}
        <div className="glass rounded-2xl p-4 sm:p-6 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Resumen</h3>
          {[
            { label: 'Ingresos', value: summary.totalIncome, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Egresos', value: summary.totalExpenses, icon: TrendingDown, color: 'text-red-400' },
            { label: 'Disponible', value: summary.available, icon: Wallet, color: summary.available >= 0 ? 'text-emerald-400' : 'text-red-400' },
            { label: 'Deuda Total', value: summary.totalDebt, icon: CreditCard, color: 'text-amber-400' },
          ].map((stat, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <span className={`text-sm font-mono font-semibold ${stat.color}`}>{fmtCRC(stat.value, cur)}</span>
            </div>
          ))}
          {summary.totalIncome > 0 && (
            <div className="pt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Ratio Deuda/Ingreso</span>
                <span>{((summary.totalDebt / summary.totalIncome) * 100).toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(100, (summary.totalDebt / summary.totalIncome) * 100)}
                className="h-2" />
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Expense Donut */}
        <div className="glass rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Distribución de Gastos</h3>
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value" stroke="none">
                  {expenseByCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(v: number) => fmtCRC(v, cur)}
                  contentStyle={{ background: '#0F0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
              Sin datos de gastos
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {expenseByCategory.map((cat, i) => (
              <div key={i} className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-muted-foreground">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Income vs Expenses Bar */}
        <div className="glass rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Ingresos vs Egresos</h3>
          {incomeVsExpenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={incomeVsExpenseData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" tickFormatter={(v: number) => fmtCompact(v)} stroke="#64748B" fontSize={10} />
                <YAxis type="category" dataKey="name" stroke="#64748B" fontSize={11} width={70} />
                <RechartsTooltip formatter={(v: number) => fmtCRC(v, cur)}
                  contentStyle={{ background: '#0F0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {incomeVsExpenseData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              Sin datos
            </div>
          )}
        </div>
      </div>

      {/* Savings Goals */}
      <div className="glass rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Metas de Ahorro
          </h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1 text-xs">
                <Plus className="w-3 h-3" /> Nueva Meta
              </Button>
            </DialogTrigger>
            <NewGoalDialog onCreated={refreshGoals} />
          </Dialog>
        </div>
        {goals.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scroll">
            {goals.map((goal) => {
              const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
              return (
                <div key={goal.id} className="glass-strong rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{goal.name}</span>
                    <Badge variant="outline" className="text-xs">{goal.currency}</Badge>
                  </div>
                  <Progress value={Math.min(100, pct)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{fmtCRC(goal.currentAmount, goal.currency)} de {fmtCRC(goal.targetAmount, goal.currency)}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No hay metas de ahorro</p>
        )}
      </div>

      {/* Recent Budgets */}
      <div className="glass rounded-2xl p-4 sm:p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-primary" /> Presupuestos Recientes
        </h3>
        {budgets.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scroll">
            {budgets.slice(0, 5).map((b: any) => (
              <button key={b.id}
                className={`w-full text-left glass-strong rounded-lg p-3 hover:bg-white/[0.06] transition-colors flex items-center justify-between ${activeBudget?.id === b.id ? 'ring-1 ring-primary' : ''}`}
                onClick={() => fetchBudgetDetail(b.id)}>
                <div>
                  <p className="text-sm font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.period === 'monthly' ? 'Mensual' : 'Quincenal'} · {b.currency}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No hay presupuestos guardados</p>
        )}
      </div>
    </motion.div>
  )

  // ============= PRESUPUESTO PAGE =============
  const renderPresupuesto = () => (
    <motion.div key="presupuesto" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      {/* Budget List + Actions */}
      <div className="glass rounded-2xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" /> Presupuesto
          </h2>
          <div className="flex gap-2 flex-wrap">
            {activeBudget && (
              <>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={exportJSON}>
                  <FileJson className="w-3 h-3" /> JSON
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={exportXLSX}>
                  <FileSpreadsheet className="w-3 h-3" /> XLSX
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={exportPDF}>
                  <Download className="w-3 h-3" /> PDF
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => importFileRef.current?.click()}>
                  <Upload className="w-3 h-3" /> Importar
                </Button>
                <input type="file" ref={importFileRef} accept=".json" className="hidden" onChange={handleImportJSON} />
              </>
            )}
            <Button size="sm" className="gap-1 text-xs" onClick={() => { resetForm(); setIsCreating(true) }}>
              <Plus className="w-3 h-3" /> Nuevo
            </Button>
          </div>
        </div>

        {/* Budget selector */}
        {budgets.length > 0 && (
          <Select value={activeBudget?.id || ''} onValueChange={(v) => fetchBudgetDetail(v)}>
            <SelectTrigger className="w-full mb-4 bg-white/[0.04] border-white/[0.06]">
              <SelectValue placeholder="Seleccionar presupuesto" />
            </SelectTrigger>
            <SelectContent>
              {budgets.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Active Budget Detail or Create Form */}
      {isCreating ? renderBudgetForm() : activeBudget ? renderBudgetDetail() : (
        <div className="glass rounded-2xl p-8 text-center">
          <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Crea un nuevo presupuesto para comenzar</p>
          <Button className="mt-4 gap-2" onClick={() => { resetForm(); setIsCreating(true) }}>
            <Plus className="w-4 h-4" /> Crear Presupuesto
          </Button>
        </div>
      )}
    </motion.div>
  )

  const renderBudgetForm = () => (
    <div className="glass rounded-2xl p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Nuevo Presupuesto
        </h3>
        <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}><X className="w-4 h-4" /></Button>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Nombre</Label>
          <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Mi Presupuesto"
            className="bg-white/[0.04] border-white/[0.06]" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Período</Label>
          <Select value={formPeriod} onValueChange={setFormPeriod}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.06]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensual</SelectItem>
              <SelectItem value="biweekly">Quincenal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Moneda</Label>
          <Select value={formCurrency} onValueChange={setFormCurrency}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.06]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CRC">Colones (₡)</SelectItem>
              <SelectItem value="USD">Dólares ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Nombre del Titular</Label>
          <Input value={formHolderName} onChange={e => setFormHolderName(e.target.value)} placeholder="Nombre"
            className="bg-white/[0.04] border-white/[0.06]" />
        </div>
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Incomes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
            <TrendingUp className="w-4 h-4" /> Ingresos
          </h4>
          <Button size="sm" variant="outline" className="gap-1 text-xs"
            onClick={() => setFormIncomes([...formIncomes, { id: uid(), category: 'salary', description: '', amount: 0, sortOrder: formIncomes.length }])}>
            <Plus className="w-3 h-3" /> Agregar
          </Button>
        </div>
        <div className="space-y-2">
          {formIncomes.map((inc, i) => (
            <div key={inc.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <Input placeholder="Descripción" value={inc.description}
                  onChange={e => { const u = [...formIncomes]; u[i] = { ...u[i], description: e.target.value }; setFormIncomes(u) }}
                  className="bg-white/[0.04] border-white/[0.06] text-sm h-9" />
              </div>
              <div className="col-span-3">
                <Select value={inc.category} onValueChange={v => { const u = [...formIncomes]; u[i] = { ...u[i], category: v }; setFormIncomes(u) }}>
                  <SelectTrigger className="h-9 bg-white/[0.04] border-white/[0.06] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCOME_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4">
                <Input type="number" placeholder="Monto" value={inc.amount || ''}
                  onChange={e => { const u = [...formIncomes]; u[i] = { ...u[i], amount: parseFloat(e.target.value) || 0 }; setFormIncomes(u) }}
                  className="bg-white/[0.04] border-white/[0.06] text-sm h-9" />
              </div>
              <div className="col-span-1 flex justify-center">
                <Button size="sm" variant="ghost" className="text-red-400 h-9 w-9 p-0"
                  onClick={() => setFormIncomes(formIncomes.filter((_, j) => j !== i))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {formIncomes.length > 0 && (
            <div className="text-right text-xs text-muted-foreground">
              Total Ingresos: <span className="text-emerald-400 font-mono">{fmtCRC(formIncomes.reduce((s, i) => s + i.amount, 0), formCurrency)}</span>
            </div>
          )}
        </div>
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Expenses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-red-400">
            <TrendingDown className="w-4 h-4" /> Egresos
          </h4>
          <Button size="sm" variant="outline" className="gap-1 text-xs"
            onClick={() => setFormExpenses([...formExpenses, { id: uid(), category: 'fixed', subCategory: '', description: '', amount: 0, extraData: {}, sortOrder: formExpenses.length }])}>
            <Plus className="w-3 h-3" /> Agregar
          </Button>
        </div>
        <div className="space-y-3">
          {formExpenses.map((exp, i) => (
            <div key={exp.id} className="glass-strong rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <Input placeholder="Descripción" value={exp.description}
                    onChange={e => { const u = [...formExpenses]; u[i] = { ...u[i], description: e.target.value }; setFormExpenses(u) }}
                    className="bg-white/[0.04] border-white/[0.06] text-sm h-9" />
                </div>
                <div className="col-span-3">
                  <Select value={exp.category} onValueChange={v => { const u = [...formExpenses]; u[i] = { ...u[i], category: v }; setFormExpenses(u) }}>
                    <SelectTrigger className="h-9 bg-white/[0.04] border-white/[0.06] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Input type="number" placeholder="Monto" value={exp.amount || ''}
                    onChange={e => { const u = [...formExpenses]; u[i] = { ...u[i], amount: parseFloat(e.target.value) || 0 }; setFormExpenses(u) }}
                    className="bg-white/[0.04] border-white/[0.06] text-sm h-9" />
                </div>
                <div className="col-span-1 flex justify-center">
                  <Button size="sm" variant="ghost" className="text-red-400 h-9 w-9 p-0"
                    onClick={() => setFormExpenses(formExpenses.filter((_, j) => j !== i))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {/* Extra fields for credit */}
              {exp.category === 'credit' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">Deuda Total</Label>
                    <Input type="number" placeholder="Deuda" value={exp.extraData.totalDebt || ''}
                      onChange={e => { const u = [...formExpenses]; u[i] = { ...u[i], extraData: { ...u[i].extraData, totalDebt: parseFloat(e.target.value) || 0 } }; setFormExpenses(u) }}
                      className="bg-white/[0.04] border-white/[0.06] text-xs h-8" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Tasa Anual %</Label>
                    <Input type="number" placeholder="Tasa" value={exp.extraData.annualRate ? exp.extraData.annualRate * 100 : ''}
                      onChange={e => { const u = [...formExpenses]; u[i] = { ...u[i], extraData: { ...u[i].extraData, annualRate: (parseFloat(e.target.value) || 0) / 100 } }; setFormExpenses(u) }}
                      className="bg-white/[0.04] border-white/[0.06] text-xs h-8" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Meses Restantes</Label>
                    <Input type="number" placeholder="Meses" value={exp.extraData.remainingMonths || ''}
                      onChange={e => { const u = [...formExpenses]; u[i] = { ...u[i], extraData: { ...u[i].extraData, remainingMonths: parseInt(e.target.value) || 0 } }; setFormExpenses(u) }}
                      className="bg-white/[0.04] border-white/[0.06] text-xs h-8" />
                  </div>
                </div>
              )}
              {/* Extra fields for emergency */}
              {exp.category === 'emergency' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">Monto Objetivo</Label>
                    <Input type="number" placeholder="Objetivo" value={exp.extraData.targetAmount || ''}
                      onChange={e => { const u = [...formExpenses]; u[i] = { ...u[i], extraData: { ...u[i].extraData, targetAmount: parseFloat(e.target.value) || 0 } }; setFormExpenses(u) }}
                      className="bg-white/[0.04] border-white/[0.06] text-xs h-8" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Monto Actual</Label>
                    <Input type="number" placeholder="Actual" value={exp.extraData.currentAmount || ''}
                      onChange={e => { const u = [...formExpenses]; u[i] = { ...u[i], extraData: { ...u[i].extraData, currentAmount: parseFloat(e.target.value) || 0 } }; setFormExpenses(u) }}
                      className="bg-white/[0.04] border-white/[0.06] text-xs h-8" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Aporte Mensual</Label>
                    <Input type="number" placeholder="Aporte" value={exp.extraData.monthlyContribution || ''}
                      onChange={e => { const u = [...formExpenses]; u[i] = { ...u[i], extraData: { ...u[i].extraData, monthlyContribution: parseFloat(e.target.value) || 0 } }; setFormExpenses(u) }}
                      className="bg-white/[0.04] border-white/[0.06] text-xs h-8" />
                  </div>
                </div>
              )}
            </div>
          ))}
          {formExpenses.length > 0 && (
            <div className="text-right text-xs text-muted-foreground">
              Total Egresos: <span className="text-red-400 font-mono">{fmtCRC(formExpenses.reduce((s, e) => s + e.amount, 0), formCurrency)}</span>
            </div>
          )}
        </div>
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Summary + Save */}
      <div className="glass-strong rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="text-lg font-mono text-emerald-400">{fmtCRC(formIncomes.reduce((s, i) => s + i.amount, 0), formCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Egresos</p>
            <p className="text-lg font-mono text-red-400">{fmtCRC(formExpenses.reduce((s, e) => s + e.amount, 0), formCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Disponible</p>
            <p className={`text-lg font-mono ${formIncomes.reduce((s, i) => s + i.amount, 0) - formExpenses.reduce((s, e) => s + e.amount, 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmtCRC(formIncomes.reduce((s, i) => s + i.amount, 0) - formExpenses.reduce((s, e) => s + e.amount, 0), formCurrency)}
            </p>
          </div>
        </div>
        <Button className="w-full gap-2" onClick={saveBudget} disabled={loading}>
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
          Guardar Presupuesto
        </Button>
      </div>
    </div>
  )

  const renderBudgetDetail = () => {
    if (!activeBudget) return null
    return (
      <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{activeBudget.name}</h3>
            <p className="text-xs text-muted-foreground">
              {activeBudget.period === 'monthly' ? 'Mensual' : 'Quincenal'} · {activeBudget.currency}
              {activeBudget.holderName ? ` · ${activeBudget.holderName}` : ''}
            </p>
          </div>
          <Button size="sm" variant="destructive" className="gap-1 text-xs"
            onClick={() => deleteBudget(activeBudget.id)}>
            <Trash2 className="w-3 h-3" /> Eliminar
          </Button>
        </div>

        <Separator className="bg-white/[0.06]" />

        {/* Incomes list */}
        <div>
          <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Ingresos
          </h4>
          {activeBudget.incomes.length > 0 ? (
            <div className="space-y-1">
              {activeBudget.incomes.map(inc => (
                <div key={inc.id} className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {INCOME_CATEGORIES.find(c => c.value === inc.category)?.icon || '📌'} {INCOME_CATEGORIES.find(c => c.value === inc.category)?.label || inc.category}
                    </Badge>
                    <span className="text-sm">{inc.description}</span>
                  </div>
                  <span className="text-sm font-mono text-emerald-400">{fmtCRC(inc.amount, cur)}</span>
                </div>
              ))}
              <div className="text-right text-xs text-muted-foreground pt-1 border-t border-white/[0.04]">
                Total: <span className="text-emerald-400 font-mono">{fmtCRC(activeBudget.incomes.reduce((s, i) => s + i.amount, 0), cur)}</span>
              </div>
            </div>
          ) : <p className="text-xs text-muted-foreground">Sin ingresos</p>}
        </div>

        <Separator className="bg-white/[0.06]" />

        {/* Expenses list */}
        <div>
          <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" /> Egresos
          </h4>
          {activeBudget.expenses.length > 0 ? (
            <div className="space-y-1">
              {activeBudget.expenses.map(exp => (
                <div key={exp.id} className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.color, color: EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.color }}>
                      {EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.icon || '📦'} {EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.label || exp.category}
                    </Badge>
                    <span className="text-sm">{exp.description}</span>
                    {exp.category === 'credit' && exp.extraData?.totalDebt && (
                      <span className="text-[10px] text-amber-400">(Deuda: {fmtCRC(exp.extraData.totalDebt, cur)})</span>
                    )}
                  </div>
                  <span className="text-sm font-mono text-red-400">{fmtCRC(exp.amount, cur)}</span>
                </div>
              ))}
              <div className="text-right text-xs text-muted-foreground pt-1 border-t border-white/[0.04]">
                Total: <span className="text-red-400 font-mono">{fmtCRC(activeBudget.expenses.reduce((s, e) => s + e.amount, 0), cur)}</span>
              </div>
            </div>
          ) : <p className="text-xs text-muted-foreground">Sin egresos</p>}
        </div>
      </div>
    )
  }

  // ============= PROYECCIONES PAGE =============
  const renderProyecciones = () => (
    <motion.div key="proyecciones" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div className="glass rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-primary" /> Proyecciones Financieras
        </h2>
        <Tabs value={calcTab} onValueChange={setCalcTab}>
          <TabsList className="grid grid-cols-4 w-full bg-white/[0.04]">
            <TabsTrigger value="credit-card" className="text-xs">TC</TabsTrigger>
            <TabsTrigger value="loan" className="text-xs">Préstamo</TabsTrigger>
            <TabsTrigger value="financing" className="text-xs">Financiam.</TabsTrigger>
            <TabsTrigger value="bp" className="text-xs">BP</TabsTrigger>
          </TabsList>

          {/* Credit Card Tab */}
          <TabsContent value="credit-card" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Deuda Actual</Label>
                <Input type="number" value={ccDebt} onChange={e => setCcDebt(parseFloat(e.target.value) || 0)}
                  className="bg-white/[0.04] border-white/[0.06]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tasa Anual (%)</Label>
                <Input type="number" value={ccRate} onChange={e => setCcRate(parseFloat(e.target.value) || 0)}
                  className="bg-white/[0.04] border-white/[0.06]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Pago Mensual</Label>
                <Input type="number" value={ccPayment} onChange={e => setCcPayment(parseFloat(e.target.value) || 0)}
                  className="bg-white/[0.04] border-white/[0.06]" />
              </div>
            </div>
            <Button className="w-full gap-2" onClick={runCCCalc}>
              <CreditCard className="w-4 h-4" /> Calcular Proyección
            </Button>
            {calcResults?.type === 'credit-card' && (
              <div className="space-y-4">
                <div className="glass-strong rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Meses para liquidar</p>
                      <p className="text-xl font-mono font-bold text-primary">
                        {calcResults.payoff?.months === -1 ? '∞ (pago insuficiente)' : `${calcResults.payoff?.months} meses`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Interés total</p>
                      <p className="text-xl font-mono font-bold text-red-400">
                        {calcResults.payoff?.months === -1 ? '∞' : fmtCRC(calcResults.payoff?.totalInterest || 0, 'CRC')}
                      </p>
                    </div>
                  </div>
                </div>
                {calcResults.projection?.length > 0 && (
                  <div className="glass-strong rounded-lg p-4">
                    <h4 className="text-xs text-muted-foreground mb-2">Proyección de Deuda</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={calcResults.projection}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="month" stroke="#64748B" fontSize={10} />
                        <YAxis tickFormatter={(v: number) => fmtCompact(v)} stroke="#64748B" fontSize={10} />
                        <RechartsTooltip formatter={(v: number) => fmtCRC(v, 'CRC')}
                          contentStyle={{ background: '#0F0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0' }} />
                        <Area type="monotone" dataKey="balance" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} name="Balance" />
                        <Area type="monotone" dataKey="totalPaid" stroke="#6366F1" fill="#6366F1" fillOpacity={0.1} name="Total Pagado" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Loan Tab */}
          <TabsContent value="loan" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Capital</Label>
                <Input type="number" value={loanPrincipal} onChange={e => setLoanPrincipal(parseFloat(e.target.value) || 0)}
                  className="bg-white/[0.04] border-white/[0.06]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tasa Anual (%)</Label>
                <Input type="number" value={loanRate} onChange={e => setLoanRate(parseFloat(e.target.value) || 0)}
                  className="bg-white/[0.04] border-white/[0.06]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Plazo (meses)</Label>
                <Input type="number" value={loanMonths} onChange={e => setLoanMonths(parseInt(e.target.value) || 0)}
                  className="bg-white/[0.04] border-white/[0.06]" />
              </div>
            </div>
            <Button className="w-full gap-2" onClick={runLoanCalc}>
              <Landmark className="w-4 h-4" /> Calcular Préstamo
            </Button>
            {calcResults?.type === 'loan' && (
              <div className="space-y-4">
                <div className="glass-strong rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Cuota Mensual</p>
                      <p className="text-xl font-mono font-bold text-primary">{fmtCRC(calcResults.monthlyPayment, 'CRC')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total a Pagar</p>
                      <p className="text-xl font-mono font-bold text-amber-400">{fmtCRC(calcResults.totalPaid, 'CRC')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Interés Total</p>
                      <p className="text-xl font-mono font-bold text-red-400">{fmtCRC(calcResults.totalInterest, 'CRC')}</p>
                    </div>
                  </div>
                </div>
                {calcResults.schedule?.length > 0 && (
                  <div className="glass-strong rounded-lg p-4">
                    <h4 className="text-xs text-muted-foreground mb-2">Tabla de Amortización</h4>
                    <div className="max-h-64 overflow-y-auto custom-scroll">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0">
                          <tr className="border-b border-white/[0.06] bg-[#0F0F1A]">
                            <th className="text-left py-1.5 px-2 text-muted-foreground">Mes</th>
                            <th className="text-right py-1.5 px-2 text-muted-foreground">Cuota</th>
                            <th className="text-right py-1.5 px-2 text-muted-foreground">Capital</th>
                            <th className="text-right py-1.5 px-2 text-muted-foreground">Interés</th>
                            <th className="text-right py-1.5 px-2 text-muted-foreground">Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calcResults.schedule.map((row: any, i: number) => (
                            <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                              <td className="py-1 px-2 font-mono">{row.month}</td>
                              <td className="py-1 px-2 text-right font-mono">{fmtCRC(row.payment, 'CRC')}</td>
                              <td className="py-1 px-2 text-right font-mono text-emerald-400">{fmtCRC(row.principal, 'CRC')}</td>
                              <td className="py-1 px-2 text-right font-mono text-red-400">{fmtCRC(row.interest, 'CRC')}</td>
                              <td className="py-1 px-2 text-right font-mono">{fmtCRC(row.balance, 'CRC')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Financing Tab */}
          <TabsContent value="financing" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Capital</Label>
                <Input type="number" value={financePrincipal} onChange={e => setFinancePrincipal(parseFloat(e.target.value) || 0)}
                  className="bg-white/[0.04] border-white/[0.06]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tasa Anual (%)</Label>
                <Input type="number" value={financeRate} onChange={e => setFinanceRate(parseFloat(e.target.value) || 0)}
                  className="bg-white/[0.04] border-white/[0.06]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Plazos (separar con coma)</Label>
                <Input value={financeTerms} onChange={e => setFinanceTerms(e.target.value)}
                  placeholder="12,24,36,48" className="bg-white/[0.04] border-white/[0.06]" />
              </div>
            </div>
            <Button className="w-full gap-2" onClick={runFinanceCalc}>
              <BarChart3 className="w-4 h-4" /> Comparar Plazos
            </Button>
            {calcResults?.type === 'financing' && (
              <div className="glass-strong rounded-lg p-4">
                <h4 className="text-xs text-muted-foreground mb-3">Comparación de Plazos — Capital: {fmtCRC(calcResults.principal, 'CRC')}</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={calcResults.results}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="term" stroke="#64748B" fontSize={10} label={{ value: 'Meses', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 10 }} />
                    <YAxis tickFormatter={(v: number) => fmtCompact(v)} stroke="#64748B" fontSize={10} />
                    <RechartsTooltip formatter={(v: number) => fmtCRC(v, 'CRC')}
                      contentStyle={{ background: '#0F0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0' }} />
                    <Bar dataKey="payment" fill="#6366F1" name="Cuota Mensual" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="totalInterest" fill="#EF4444" name="Interés Total" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1">
                  {calcResults.results.map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04]">
                      <span className="font-mono">{r.term} meses</span>
                      <span className="font-mono text-primary">{fmtCRC(r.payment, 'CRC')}/mes</span>
                      <span className="font-mono text-red-400">Int: {fmtCRC(r.totalInterest, 'CRC')}</span>
                      <span className="font-mono text-muted-foreground">Total: {fmtCRC(r.totalPaid, 'CRC')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* BP Programs Tab */}
          <TabsContent value="bp" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Monto</Label>
                <Input type="number" value={bpAmount} onChange={e => setBpAmount(parseFloat(e.target.value) || 0)}
                  className="bg-white/[0.04] border-white/[0.06]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Moneda</Label>
                <Select value={bpCurrency} onValueChange={(v: any) => setBpCurrency(v)}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.06]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">Colones (₡)</SelectItem>
                    <SelectItem value="USD">Dólares ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Programa</Label>
                <Select value={bpProgram} onValueChange={setBpProgram}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.06]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minicuotas">Minicuotas</SelectItem>
                    <SelectItem value="tasa-cero">Tasa Cero</SelectItem>
                    <SelectItem value="compra-saldos">Compra de Saldos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full gap-2" onClick={runBPCalc}>
              <Landmark className="w-4 h-4" /> Calcular BP
            </Button>
            {calcResults?.type === 'bp' && (
              <div className="glass-strong rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold">{calcResults.program}</h4>
                <p className="text-xs text-muted-foreground">Monto: {fmtCRC(calcResults.amount, bpCurrency)}</p>
                {calcResults.commission !== undefined && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Comisión (3%): </span>
                    <span className="text-amber-400 font-mono">{fmtCRC(calcResults.commission, bpCurrency)}</span>
                    <span className="text-muted-foreground ml-2">Total: </span>
                    <span className="font-mono">{fmtCRC(calcResults.totalWithCommission, bpCurrency)}</span>
                  </div>
                )}
                <div className="space-y-1">
                  {(calcResults.paymentsByTerm || []).map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-white/[0.04]">
                      <span className="font-mono">{p.term} meses</span>
                      <span className="font-mono text-primary">{fmtCRC(p.payment, bpCurrency)}/mes</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  )

  // ============= AGUINALDO PAGE =============
  const renderAguinaldo = () => (
    <motion.div key="aguinaldo" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div className="glass rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <PiggyBank className="w-5 h-5 text-primary" /> Calculadora de Aguinaldo
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Período: Diciembre {new Date().getFullYear() - 1} — Noviembre {new Date().getFullYear()}
        </p>

        {/* Info box */}
        <div className="glass-strong rounded-lg p-3 mb-4 flex gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Según la ley costarricense, el aguinaldo equivale al promedio de los salarios devengados entre el 1° de diciembre del año anterior y el 30 de noviembre del año actual. Se debe pagar en la primera quincena de diciembre.
          </p>
        </div>

        {/* Months worked */}
        <div className="space-y-2 mb-4">
          <Label className="text-xs">Meses trabajados (si es proporcional)</Label>
          <Select value={String(aguinaldoMonthsWorked)} onValueChange={v => setAguinaldoMonthsWorked(parseInt(v))}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.06]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'mes' : 'meses'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Salary inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {MONTHS_CR.map((month, i) => (
            <div key={i} className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{month}</Label>
              <Input type="number" placeholder="0" value={aguinaldoSalaries[i] || ''}
                onChange={e => {
                  const arr = [...aguinaldoSalaries]
                  arr[i] = parseFloat(e.target.value) || 0
                  setAguinaldoSalaries(arr)
                }}
                className="bg-white/[0.04] border-white/[0.06] text-sm h-9" />
            </div>
          ))}
        </div>

        <div className="text-right text-xs text-muted-foreground mt-2">
          Total salarios: <span className="text-emerald-400 font-mono">{fmtCRC(aguinaldoSalaries.reduce((s, v) => s + v, 0), 'CRC')}</span>
        </div>

        <Button className="w-full mt-4 gap-2" onClick={runAguinaldoCalc}>
          <Calculator className="w-4 h-4" /> Calcular Aguinaldo
        </Button>
      </div>

      {/* Results */}
      {aguinaldoResult && (
        <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" /> Resultado del Aguinaldo
          </h3>
          <div className="glass-strong rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Salarios Brutos</p>
                <p className="text-lg font-mono font-bold">{fmtCRC(aguinaldoResult.totalGross, 'CRC')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Salario Promedio</p>
                <p className="text-lg font-mono font-bold text-primary">{fmtCRC(aguinaldoResult.averageSalary, 'CRC')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Meses Trabajados</p>
                <p className="text-lg font-mono font-bold">{aguinaldoResult.monthsWorked}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-muted-foreground">Aguinaldo</p>
                <p className="text-2xl font-mono font-bold gold-shimmer">{fmtCRC(aguinaldoResult.aguinaldoAmount, 'CRC')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Net Salary Quick Calc */}
      <div className="glass rounded-2xl p-4 sm:p-6 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" /> Calculadora Rápida: Salario Neto
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Salario Bruto Mensual</Label>
            <Input type="number" placeholder="0" value={configGrossSalary || ''}
              onChange={e => setConfigGrossSalary(parseFloat(e.target.value) || 0)}
              className="bg-white/[0.04] border-white/[0.06]" />
          </div>
          <div className="flex items-end">
            <Button className="w-full gap-2" onClick={runNetSalaryCalc}>
              <Calculator className="w-4 h-4" /> Calcular Salario Neto
            </Button>
          </div>
        </div>
        {netSalaryResult && (
          <div className="glass-strong rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Salario Bruto</p>
                <p className="text-sm font-mono">{fmtCRC(netSalaryResult.gross, 'CRC')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CCSS (10.67%)</p>
                <p className="text-sm font-mono text-red-400">-{fmtCRC(netSalaryResult.ccss, 'CRC')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Impuesto Renta</p>
                <p className="text-sm font-mono text-red-400">-{fmtCRC(netSalaryResult.ir, 'CRC')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Salario Neto</p>
                <p className="text-lg font-mono font-bold text-emerald-400">{fmtCRC(netSalaryResult.net, 'CRC')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )

  // ============= CONSEJOS PAGE =============
  const renderConsejos = () => {
    const categories = ['todos', ...new Set(FINANCIAL_TIPS.map(t => t.category))]
    const filtered = tipCategory === 'todos' ? FINANCIAL_TIPS : FINANCIAL_TIPS.filter(t => t.category === tipCategory)
    const currentTip = FINANCIAL_TIPS[tipIndex % FINANCIAL_TIPS.length]

    return (
      <motion.div key="consejos" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
        {/* Featured Tip Carousel */}
        <div className="glass rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" /> Consejo Destacado
            </h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setTipAutoPlay(!tipAutoPlay)}>
                {tipAutoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setTipIndex(i => (i - 1 + FINANCIAL_TIPS.length) % FINANCIAL_TIPS.length)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setTipIndex(i => (i + 1) % FINANCIAL_TIPS.length)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={tipIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="glass-strong rounded-xl p-6 text-center">
              <span className="text-4xl mb-3 block">{currentTip.icon}</span>
              <h3 className="text-lg font-semibold mb-2">{currentTip.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{currentTip.desc}</p>
              <Badge variant="outline" className="mt-3 text-xs capitalize">{currentTip.category}</Badge>
            </motion.div>
          </AnimatePresence>
          <div className="flex justify-center gap-1 mt-3">
            {FINANCIAL_TIPS.map((_, i) => (
              <button key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === tipIndex % FINANCIAL_TIPS.length ? 'bg-primary' : 'bg-white/20'}`}
                onClick={() => setTipIndex(i)} />
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <Button key={cat} size="sm" variant={tipCategory === cat ? 'default' : 'outline'}
              className="text-xs capitalize" onClick={() => setTipCategory(cat)}>
              {cat === 'todos' ? '🌟 Todos' : cat}
            </Button>
          ))}
        </div>

        {/* Tips Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((tip, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="glass rounded-xl p-4 hover:bg-white/[0.06] transition-colors cursor-pointer"
                onClick={() => { setTipIndex(FINANCIAL_TIPS.indexOf(tip)); setTipAutoPlay(false) }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tip.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold mb-1">{tip.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{tip.desc}</p>
                    <Badge variant="outline" className="mt-2 text-[10px] capitalize">{tip.category}</Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    )
  }

  // ============= CONFIGURACIÓN PAGE =============
  const renderConfiguracion = () => (
    <motion.div key="configuracion" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <div className="glass rounded-2xl p-4 sm:p-6 space-y-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Configuración
        </h2>

        {/* Holder Name */}
        <div className="space-y-2">
          <Label className="text-xs">Nombre del Titular (para la tarjeta)</Label>
          <Input value={configHolderName} onChange={e => setConfigHolderName(e.target.value)}
            placeholder="Nombre completo" className="bg-white/[0.04] border-white/[0.06]" />
        </div>

        <Separator className="bg-white/[0.06]" />

        {/* Default Currency */}
        <div className="space-y-2">
          <Label className="text-xs">Moneda por Defecto</Label>
          <Select value={configCurrency} onValueChange={setConfigCurrency}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.06]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CRC">Colones (₡)</SelectItem>
              <SelectItem value="USD">Dólares ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator className="bg-white/[0.06]" />

        {/* Exchange Rate */}
        <div className="space-y-2">
          <Label className="text-xs">Tipo de Cambio Manual (CRC/USD)</Label>
          <Input type="number" value={configExchangeRate} onChange={e => setConfigExchangeRate(parseFloat(e.target.value) || 0)}
            className="bg-white/[0.04] border-white/[0.06]" />
          <p className="text-[10px] text-muted-foreground">
            1 USD = {configExchangeRate} CRC
          </p>
        </div>

        <Separator className="bg-white/[0.06]" />

        {/* Net Salary Calculator */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Calculadora de Salario Neto
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Salario Bruto Mensual (CRC)</Label>
              <Input type="number" placeholder="0" value={configGrossSalary || ''}
                onChange={e => setConfigGrossSalary(parseFloat(e.target.value) || 0)}
                className="bg-white/[0.04] border-white/[0.06]" />
            </div>
            <div className="flex items-end">
              <Button className="w-full gap-2" onClick={runNetSalaryCalc}>
                <Calculator className="w-4 h-4" /> Calcular
              </Button>
            </div>
          </div>
          {netSalaryResult && (
            <div className="glass-strong rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Salario Bruto</p>
                  <p className="text-sm font-mono">{fmtCRC(netSalaryResult.gross, 'CRC')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Salario Neto</p>
                  <p className="text-lg font-mono font-bold text-emerald-400">{fmtCRC(netSalaryResult.net, 'CRC')}</p>
                </div>
              </div>
              <Separator className="bg-white/[0.06]" />
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">Desglose de Deducciones</h4>
                {netSalaryResult.deductions?.map((d: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-mono text-red-400">-{fmtCRC(d.amount, 'CRC')}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center text-xs pt-1 border-t border-white/[0.06]">
                  <span className="font-semibold">Total Deducciones</span>
                  <span className="font-mono text-red-400 font-semibold">
                    -{fmtCRC(netSalaryResult.ccss + netSalaryResult.ir, 'CRC')}
                  </span>
                </div>
              </div>
              {/* Tax bracket info */}
              <div className="glass rounded-lg p-3 text-[10px] text-muted-foreground">
                <p className="font-semibold mb-1">Tramos IR 2024 (mensual):</p>
                <p>≤ ₡922,000: Exento</p>
                <p>₡922,001 — ₡1,317,000: 10%</p>
                <p>₡1,317,001 — ₡2,120,000: 15% — ₡25,800</p>
                <p>₡2,120,001 — ₡4,238,000: 20% — ₡60,000</p>
                <p>{'>'} ₡4,238,000: 25% — ₡272,000</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )

  // ============= PAGE ROUTER =============
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return renderDashboard()
      case 'presupuesto': return renderPresupuesto()
      case 'proyecciones': return renderProyecciones()
      case 'aguinaldo': return renderAguinaldo()
      case 'consejos': return renderConsejos()
      case 'configuracion': return renderConfiguracion()
      default: return renderDashboard()
    }
  }

  // ============= SIDEBAR =============
  const renderSidebar = () => (
    <aside className="hidden lg:flex flex-col w-64 bg-[#0A0A12] border-r border-white/[0.04] min-h-screen p-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight" style={{ fontFamily: 'var(--font-ibm-plex)' }}>FinanzasCR</h1>
          <p className="text-[10px] text-muted-foreground">Gestión Financiera</p>
        </div>
      </div>
      <nav className="space-y-1 flex-1">
        {NAV_ITEMS.map(item => (
          <button key={item.id}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activePage === item.id
                ? 'bg-primary/15 text-primary font-medium'
                : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
            }`}
            onClick={() => setActivePage(item.id)}>
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="glass-strong rounded-lg p-3 mt-4">
        <p className="text-[10px] text-muted-foreground text-center">FinanzasCR v1.0</p>
        <p className="text-[10px] text-muted-foreground text-center">Hecho en Costa Rica 🇨🇷</p>
      </div>
    </aside>
  )

  // ============= BOTTOM NAV (MOBILE) =============
  const renderBottomNav = () => (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/[0.06] safe-area-pb">
      <div className="flex justify-around items-center py-2">
        {NAV_ITEMS.map(item => (
          <button key={item.id}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
              activePage === item.id ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => setActivePage(item.id)}>
            <item.icon className="w-4 h-4" />
            <span className="text-[9px]">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )

  // ============= MAIN RENDER =============
  return (
    <div className="min-h-screen flex bg-[#060609]">
      {renderSidebar()}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 glass-strong border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <h1 className="font-bold text-sm" style={{ fontFamily: 'var(--font-ibm-plex)' }}>FinanzasCR</h1>
            </div>
            <Badge variant="outline" className="text-[10px]">{cur}</Badge>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 pb-24 lg:pb-6">
          <AnimatePresence mode="wait">
            {renderPage()}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="mt-auto border-t border-white/[0.04] py-3 px-4 text-center hidden lg:block">
          <p className="text-[10px] text-muted-foreground">
            FinanzasCR — Gestión Financiera Inteligente · Hecho en Costa Rica 🇨🇷
          </p>
        </footer>
      </main>

      {renderBottomNav()}
    </div>
  )
}

// ============= NEW GOAL DIALOG COMPONENT =============
function NewGoalDialog({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState(0)
  const [current, setCurrent] = useState(0)
  const [date, setDate] = useState('')
  const [currency, setCurrency] = useState('CRC')

  const handleSave = async () => {
    if (!name || target <= 0) return toast.error('Complete los campos requeridos')
    try {
      const res = await fetch('/api/goals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, targetAmount: target, currentAmount: current, targetDate: date, currency }),
      })
      if (res.ok) {
        toast.success('Meta de ahorro creada')
        setName(''); setTarget(0); setCurrent(0); setDate('')
        onCreated()
      } else {
        toast.error('Error al crear meta')
      }
    } catch { toast.error('Error de conexión') }
  }

  return (
    <DialogContent className="glass border-white/[0.06]">
      <DialogHeader>
        <DialogTitle>Nueva Meta de Ahorro</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label className="text-xs">Nombre de la meta</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Vacaciones, Emergencia"
            className="bg-white/[0.04] border-white/[0.06]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Monto Objetivo</Label>
            <Input type="number" value={target || ''} onChange={e => setTarget(parseFloat(e.target.value) || 0)}
              className="bg-white/[0.04] border-white/[0.06]" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Monto Actual</Label>
            <Input type="number" value={current || ''} onChange={e => setCurrent(parseFloat(e.target.value) || 0)}
              className="bg-white/[0.04] border-white/[0.06]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Fecha Objetivo</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-white/[0.04] border-white/[0.06]" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Moneda</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.06]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CRC">CRC</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave} className="gap-2">
          <Check className="w-4 h-4" /> Crear Meta
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

// Play/Pause icon helper
function Play({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}
function Pause({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
    </svg>
  )
}
