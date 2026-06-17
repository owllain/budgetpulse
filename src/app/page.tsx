'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState, useEffect, useCallback } from 'react'
import { useAppStore, type PageId } from '@/stores/app-store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Wallet, Calculator, PiggyBank, Lightbulb,
  Settings, ChevronLeft, ChevronRight, LogOut, Menu, X,
  TrendingUp, TrendingDown, Plus, Minus, Trash2, Download, Eye, EyeOff,
  CreditCard, Shield, Target, Banknote, Percent, Calendar,
  ArrowUpRight, ArrowDownRight, DollarSign, Landmark,
  Heart, Star, Zap, Home, ChevronDown, ChevronUp,
  Copy, ExternalLink, BarChart3, PieChart, CircleDot,
  Gem, Coins, BadgeDollarSign, Scale, BookOpen, Sparkles,
  AlertTriangle, Info, Check, User, Mail, Lock, KeyRound,
  RotateCcw, FileSpreadsheet, FileJson, Search,
  RefreshCw, Globe, ToggleLeft, ToggleRight, Save,
  ChevronRight as ChevronRightIcon, Users, Send, Wifi, Layers
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
import { PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import { toast } from 'sonner'
import { CreditsPage } from '@/components/CreditsPage'

// ─── Constants ───────────────────────────────────────────────
const APP_NAME = 'BudgetPulse'
const FOOTER_TEXT = 'Hecho por @enrique-cascante on LinkedIn'

const NAV_ITEMS: { id: PageId; label: string; icon: React.ReactNode; group: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, group: 'Principal' },
  { id: 'presupuesto', label: 'Presupuesto', icon: <Wallet size={20} />, group: 'Principal' },
  { id: 'creditos', label: 'Créditos', icon: <CreditCard size={20} />, group: 'Principal' },
  { id: 'calculadoras', label: 'Calculadora Financiera', icon: <Calculator size={20} />, group: 'Herramientas' },
  { id: 'aguinaldo', label: 'Aguinaldo', icon: <Coins size={20} />, group: 'Herramientas' },
  { id: 'metas', label: 'Metas de Ahorro', icon: <Target size={20} />, group: 'Herramientas' },
  { id: 'consejos', label: 'Consejos', icon: <Lightbulb size={20} />, group: 'Aprende' },
  { id: 'config', label: 'Configuración', icon: <Settings size={20} />, group: 'Sistema' },
]

const CHART_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

const TIPS = [
  { title: 'Regla 50/30/20', desc: 'Dedica 50% a necesidades, 30% a deseos y 20% al ahorro. Es un punto de partida excelente para organizar tus finanzas.', icon: <PieChart size={24} /> },
  { title: 'Fondo de Emergencia', desc: 'Antes de invertir, ahorra al menos 3-6 meses de gastos básicos. Este colchón te protege de imprevistos sin endeudarte.', icon: <Shield size={24} /> },
  { title: 'Paga Más del Mínimo', desc: 'En tarjetas de crédito, pagar solo el mínimo puede costarte el doble. Intenta pagar al menos el doble del mínimo requerido.', icon: <CreditCard size={24} /> },
  { title: 'Aguinaldo Inteligente', desc: 'No gastes todo tu aguinaldo. Destina al menos 50% a deuda o ahorro. Tu yo del futuro te lo agradecerá.', icon: <PiggyBank size={24} /> },
  { title: 'Automatiza tu Ahorro', desc: 'Configura transferencias automáticas el día de pago. Si no lo ves, no lo gastas. La automatización es la clave.', icon: <Zap size={24} /> },
  { title: 'Revisa tus Suscripciones', desc: 'Audita mensualmente tus suscripciones activas. Muchas veces pagamos por servicios que ya no usamos.', icon: <Search size={24} /> },
  { title: 'Costo de Oportunidad', desc: 'Antes de comprar, piensa: ¿este dinero rendiría más invertido? Cada colón gastado es un colón que no genera intereses.', icon: <TrendingUp size={24} /> },
  { title: 'Diversifica Ingresos', desc: 'No dependas de una sola fuente de ingresos. Un side project o inversión pasiva puede marcar la diferencia.', icon: <DollarSign size={24} /> },
]

const INCOME_CATEGORIES = [
  { value: 'salary', label: 'Salario' },
  { value: 'bonus', label: 'Bonificación' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'investment', label: 'Inversión' },
  { value: 'other', label: 'Otro' },
]

const EXPENSE_CATEGORIES = [
  { value: 'fixed', label: 'Fijos' },
  { value: 'credit', label: 'Crédito' },
  { value: 'emergency', label: 'Emergencia' },
  { value: 'other', label: 'Otros' },
]

// ─── Helpers ─────────────────────────────────────────────────
function formatCRC(amount: number, currency = 'CRC'): string {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount)
}

function formatCompact(amount: number): string {
  if (Math.abs(amount) >= 1000000) return `₡${(amount / 1000000).toFixed(1)}M`
  if (Math.abs(amount) >= 1000) return `₡${(amount / 1000).toFixed(0)}K`
  return `₡${amount.toFixed(0)}`
}

function calcHealthScore(params: {
  totalIncome: number; totalExpenses: number; totalDebt: number;
  emergencyFund: number; savingsRate: number
}): number {
  let score = 50
  const { savingsRate, totalIncome, totalDebt, totalExpenses, emergencyFund } = params
  if (savingsRate >= 20) score += 25
  else if (savingsRate >= 10) score += 15
  else if (savingsRate > 0) score += 5
  else score -= 10
  const debtRatio = totalIncome > 0 ? totalDebt / totalIncome : 0
  if (debtRatio <= 0.2) score += 25
  else if (debtRatio <= 0.35) score += 15
  else if (debtRatio <= 0.5) score += 5
  else score -= 15
  if (emergencyFund >= totalExpenses * 3) score += 25
  else if (emergencyFund >= totalExpenses * 1) score += 12
  else score -= 5
  const expenseRatio = totalIncome > 0 ? totalExpenses / totalIncome : 1
  if (expenseRatio <= 0.6) score += 25
  else if (expenseRatio <= 0.8) score += 15
  else if (expenseRatio <= 1) score += 0
  else score -= 25
  return Math.max(0, Math.min(100, score))
}

function calcPMT(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months
  const r = annualRate / 12
  const factor = Math.pow(1 + r, months)
  return principal * (r * factor) / (factor - 1)
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
  return { gross, ccss, ir, net: gross - ccss - ir }
}

const BP_CC_CONFIG = {
  CRC: { defaultRate: 27.5, floor: 4000 },
  USD: { defaultRate: 20, floor: 10 },
} as const

function calcBPCreditCard(params: {
  currency: 'CRC' | 'USD'
  principal: number
  annualRate: number
  charges: number
  cuotaTasaCero: number
  cuotaMinicuotas: number
  saldoPromedio?: number
  sobregiro: number
  mora: number
}) {
  const { currency, principal, annualRate, charges, cuotaTasaCero, cuotaMinicuotas, saldoPromedio, sobregiro, mora } = params
  const promedio = saldoPromedio != null && saldoPromedio > 0 ? saldoPromedio : principal
  const totalCuotas = cuotaTasaCero + cuotaMinicuotas
  const obligacionesExtra = sobregiro + mora
  const tasaMensual = (annualRate / 100) / 12
  const intereses = promedio * tasaMensual
  let amortizacion = principal / 60
  const piso = BP_CC_CONFIG[currency].floor
  let subtotalMinimo = amortizacion + intereses + charges
  let appliesFloor = false
  if (principal > 0 && subtotalMinimo < piso && subtotalMinimo > 0) {
    amortizacion += piso - subtotalMinimo
    subtotalMinimo = piso
    appliesFloor = true
  }
  return {
    amortizacion, intereses, charges, totalCuotas, obligacionesExtra, promedio,
    pagoMinimoTotal: subtotalMinimo + totalCuotas + obligacionesExtra,
    pagoContadoTotal: principal + intereses + charges + totalCuotas + obligacionesExtra,
    appliesFloor,
  }
}

// ─── Types ───────────────────────────────────────────────────
interface Budget {
  id: string; name: string; period: string; currency: string; holderName: string;
  userId: string; incomes: IncomeItem[]; expenses: ExpenseItem[];
}
interface IncomeItem { id?: string; category: string; description: string; amount: number }
interface ExpenseItem { id?: string; category: string; description: string; amount: number }
interface Goal { id: string; name: string; targetAmount: number; currentAmount: number; targetDate: string; currency: string }

// ─── Auth Form ───────────────────────────────────────────────
function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isLogin) {
        const res = await signIn('credentials', { email, password, redirect: false })
        if (res?.error) toast.error('Credenciales incorrectas')
        else toast.success('¡Bienvenido!')
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, password }),
        })
        const data = await res.json()
        if (res.ok) {
          toast.success(data.message)
          setIsLogin(true)
        } else {
          toast.error(data.error)
        }
      }
    } catch { toast.error('Error de conexión') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060609] p-4">
        <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
            <Landmark className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold gold-shimmer">{APP_NAME}</h1>
          <p className="text-muted-foreground mt-2">Gestión Financiera Inteligente</p>
        </div>

        <Card className="glass-strong border-white/10">
          <CardHeader className="pb-4">
            <div className="flex gap-2">
              <Button variant={isLogin ? 'default' : 'ghost'} size="sm" onClick={() => setIsLogin(true)}
                className={isLogin ? 'bg-indigo-600 hover:bg-indigo-700' : ''}>
                Iniciar Sesión
              </Button>
              <Button variant={!isLogin ? 'default' : 'ghost'} size="sm" onClick={() => setIsLogin(false)}
                className={!isLogin ? 'bg-indigo-600 hover:bg-indigo-700' : ''}>
                Registrarse
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre"
                    className="bg-white/5 border-white/10" required />
                </div>
              )}
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com"
                    type="email" className="pl-10 bg-white/5 border-white/10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPw ? 'text' : 'password'} placeholder="••••••"
                    className="pl-10 pr-10 bg-white/5 border-white/10" required />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {!isLogin && (
                  <p className="text-xs text-muted-foreground">
                    Mayúsculas, minúsculas, números y caracteres especiales. 4-16 caracteres.
                  </p>
                )}
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                {loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Solicitar Registro'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Debit Card ──────────────────────────────────────────────
function DebitCard({ balance, holderName, currency, healthScore, exchangeRate }: {
  balance: number; holderName: string; currency: string; healthScore: number; exchangeRate?: { buy: number; sell: number } | null
}) {
  const [flipped, setFlipped] = useState(false)
  const [showBalance, setShowBalance] = useState(true)

  const healthClass = healthScore >= 70 ? 'health-good' : healthScore >= 40 ? 'health-warning' : 'health-danger'
  const maskedNumber = '*4293 1891 0000 AHORRO'

  const flipCurrency = currency === 'CRC' ? 'USD' : 'CRC'
  let flipBalance = balance
  if (exchangeRate) {
    flipBalance = currency === 'CRC'
      ? (exchangeRate.sell > 0 ? balance / exchangeRate.sell : 0)
      : balance * exchangeRate.buy
  }

  const renderFace = (faceCurrency: string, faceBalance: number, subtitle?: string) => (
    <div className={`debit-card visa-card ${healthClass} rounded-2xl p-6 text-white cursor-pointer relative overflow-hidden h-full flex flex-col justify-between`}>
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative flex justify-between items-start">
        <div className="flex items-center gap-2">
          <Landmark size={22} className="opacity-90" />
          <span className="text-xs font-medium opacity-70">{APP_NAME}</span>
        </div>
        <span className="visa-logo opacity-90">VISA</span>
      </div>

      <div className="relative flex items-center gap-3">
        <div className="w-11 h-8 rounded-md bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 shadow-inner">
          <div className="w-full h-full border border-yellow-700/30 rounded-md grid grid-cols-2 grid-rows-2 gap-px p-0.5">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-yellow-800/20 rounded-[1px]" />)}
          </div>
        </div>
        <Wifi size={18} className="opacity-50 rotate-90" />
      </div>

      <div className="relative text-lg tracking-[0.25em] font-mono">{maskedNumber}</div>

      <div className="relative flex justify-between items-end pt-2">
        <div>
          <p className="text-[10px] uppercase opacity-50 mb-0.5">Titular</p>
          <p className="text-sm font-medium tracking-wide">{holderName || 'USUARIO'}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase opacity-50 mb-0.5">
            {subtitle || 'Disponible'}
          </p>
          <p className="text-xl font-bold tracking-tight">
            {showBalance ? formatCRC(faceBalance, faceCurrency) : '••••••'}
          </p>
          <span className="text-[10px] opacity-60">{faceCurrency}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="card-flip w-full max-w-sm mx-auto" onClick={() => exchangeRate && setFlipped(!flipped)}>
      <div className={`card-flip-inner ${flipped ? 'flipped' : ''}`}>
        <div className="card-front">
          {renderFace(currency, balance)}
        </div>
        <div className="card-back">
          {exchangeRate
            ? renderFace(flipCurrency, flipBalance, `Equivalente en ${flipCurrency}`)
            : renderFace(currency, balance, 'Sin tipo de cambio')}
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 mt-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance) }}
          className="text-xs text-muted-foreground hover:text-indigo-400 transition-colors flex items-center gap-1"
        >
          {showBalance ? <Eye size={12} /> : <EyeOff size={12} />}
          {showBalance ? 'Ocultar saldo' : 'Mostrar saldo'}
        </button>
        {exchangeRate && (
          <span className="text-xs text-muted-foreground">· Toca la tarjeta para ver en {flipCurrency}</span>
        )}
      </div>
    </div>
  )
}

// ─── Health Score ────────────────────────────────────────────
function HealthScoreGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444'
  const label = score >= 70 ? 'Saludable' : score >= 40 ? 'Precaución' : 'Crítico'
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (score / 100) * circumference

  return (
    <Card className="glass border-white/5 p-4">
        <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold" style={{ color }}>{score}</span>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-sm">Salud Financiera</h3>
          <Badge variant="outline" style={{ borderColor: color, color }} className="mt-1">{label}</Badge>
          <p className="text-xs text-muted-foreground mt-1">
            {score >= 70 ? 'Tus finanzas están en buen estado' : score >= 40 ? 'Hay áreas que mejorar' : 'Necesitas acción urgente'}
          </p>
        </div>
      </div>
    </Card>
  )
}

// ─── Expense Donut Chart ─────────────────────────────────────
function ExpenseDonut({ expenses }: { expenses: { category: string; amount: number }[] }) {
  const data = expenses.map(e => ({
    name: EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category,
    value: e.amount,
  })).filter(d => d.value > 0)

  if (data.length === 0) {
    return (
      <Card className="glass border-white/5 p-4">
          <h3 className="font-semibold text-sm mb-4">Distribución de Gastos</h3>
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          Sin datos de gastos
        </div>
      </Card>
    )
  }

  return (
    <Card className="glass border-white/5 p-4">
      <h3 className="font-semibold text-sm mb-4">Distribución de Gastos</h3>
      <ResponsiveContainer width="100%" height={200}>
        <RechartsPie>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <RechartsTooltip formatter={(v: number) => formatCRC(v)} />
          <Legend formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>} />
        </RechartsPie>
      </ResponsiveContainer>
    </Card>
  )
}

// ─── Income vs Expense Bar Chart ─────────────────────────────
function IncomeExpenseBar({ totalIncome, totalExpenses }: { totalIncome: number; totalExpenses: number }) {
  const data = [{ name: 'Resumen', Ingresos: totalIncome, Gastos: totalExpenses }]

  return (
    <Card className="glass border-white/5 p-4">
      <h3 className="font-semibold text-sm mb-4">Ingresos vs Gastos</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" tickFormatter={formatCompact} stroke="rgba(255,255,255,0.2)" fontSize={11} />
          <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={11} width={60} />
          <RechartsTooltip
            formatter={(v: number) => formatCRC(v)}
            contentStyle={{ background: '#0F0F1A', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.75rem' }}
            labelStyle={{ color: '#94A3B8' }}
            itemStyle={{ color: '#E2E8F0' }}
            cursor={{ fill: 'rgba(99,102,241,0.08)' }}
          />
          <Bar dataKey="Ingresos" fill="#10B981" radius={[0, 4, 4, 0]} activeBar={{ fill: '#34D399' }} />
          <Bar dataKey="Gastos" fill="#EF4444" radius={[0, 4, 4, 0]} activeBar={{ fill: '#F87171' }} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ─── Dashboard Page ──────────────────────────────────────────
function DashboardPage({ budgets, goals, exchangeRate, userName }: {
  budgets: Budget[]; goals: Goal[]; exchangeRate: { buy: number; sell: number } | null; userName: string
}) {
  const activeBudget = budgets[0] || null
  const totalIncome = activeBudget?.incomes.reduce((s, i) => s + i.amount, 0) || 0
  const totalExpenses = activeBudget?.expenses.reduce((s, e) => s + e.amount, 0) || 0
  const totalCredit = activeBudget?.expenses.filter(e => e.category === 'credit').reduce((s, e) => s + e.amount, 0) || 0
  const available = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? ((available / totalIncome) * 100) : 0
  const emergencyFund = activeBudget?.expenses.filter(e => e.category === 'emergency').reduce((s, e) => s + e.amount, 0) || 0
  const healthScore = calcHealthScore({
    totalIncome, totalExpenses, totalDebt: totalCredit, emergencyFund, savingsRate
  })

  const currency = activeBudget?.currency || 'CRC'

  if (!activeBudget) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">¡Hola, {userName}!</h1>
            <p className="text-muted-foreground text-sm">Crea tu primer presupuesto para empezar a ver tu resumen financiero.</p>
          </div>
          {exchangeRate && (
            <div className="glass rounded-lg px-3 py-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Globe size={12} /> Tipo de cambio al día de hoy
              </div>
              <div className="flex gap-3 mt-0.5">
                <span className="text-green-400">Compra: {formatCRC(exchangeRate.buy, 'USD')}</span>
                <span className="text-orange-400">Venta: {formatCRC(exchangeRate.sell, 'USD')}</span>
              </div>
            </div>
          )}
        </div>
        <Card className="glass border-white/5 p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">No hay presupuestos</h2>
          <p className="text-sm text-muted-foreground mb-4">Crea un presupuesto en la pestaña de Presupuesto para comenzar a registrar ingresos y gastos.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">¡Hola, {userName}!</h1>
          <p className="text-muted-foreground text-sm">Aquí está tu resumen financiero</p>
        </div>
        {exchangeRate && (
          <div className="glass rounded-lg px-3 py-2 text-xs shrink-0">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Globe size={12} /> Tipo de cambio al día de hoy
            </div>
            <div className="flex gap-3 mt-0.5">
              <span className="text-green-400">Compra: {formatCRC(exchangeRate.buy, 'USD')}</span>
              <span className="text-orange-400">Venta: {formatCRC(exchangeRate.sell, 'USD')}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <div className="space-y-6">
          {/* Debit Card */}
          <DebitCard balance={available} holderName={userName} currency={currency} healthScore={healthScore} exchangeRate={exchangeRate} />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Ingresos', value: totalIncome, icon: <TrendingUp size={18} />, color: 'text-green-400' },
              { label: 'Gastos', value: totalExpenses, icon: <TrendingDown size={18} />, color: 'text-red-400' },
              { label: 'Disponible', value: available, icon: <Wallet size={18} />, color: available >= 0 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Deuda TC', value: totalCredit, icon: <CreditCard size={18} />, color: 'text-orange-400' },
            ].map((stat, i) => (
              <Card key={i} className="glass border-white/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={stat.color}>{stat.icon}</span>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className={`text-lg font-bold ${stat.color}`}>{formatCompact(stat.value)}</p>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <HealthScoreGauge score={healthScore} />
          <IncomeExpenseBar totalIncome={totalIncome} totalExpenses={totalExpenses} />
          <ExpenseDonut expenses={activeBudget.expenses.map(e => ({ category: e.category, amount: e.amount }))} />
        </div>
      </div>

      {/* Goals Quick View */}
      {goals.length > 0 && (
        <Card className="glass border-white/5 p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Target size={16} /> Metas de Ahorro</h3>
          <div className="space-y-3">
            {goals.slice(0, 3).map(g => (
              <div key={g.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{g.name}</span>
                  <span className="text-muted-foreground">{formatCRC(g.currentAmount, g.currency)} / {formatCRC(g.targetAmount, g.currency)}</span>
                </div>
                <Progress value={(g.currentAmount / g.targetAmount) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Presupuesto Page ────────────────────────────────────────
function PresupuestoPage({ budgets, userId, onRefresh, userName, exchangeRate }: {
  budgets: Budget[]; userId: string; onRefresh: () => void; userName?: string; exchangeRate?: { buy: number; sell: number; source: string; date: string } | null
}) {
  const { data: session } = useSession()
  const effectiveUserId = userId || (session?.user as any)?.id || ''

  const [activeBudget, setActiveBudget] = useState<Budget | null>(budgets[0] || null)
  const [newIncome, setNewIncome] = useState({ category: 'salary', description: '', amount: 0, currency: 'CRC' })
  const [newExpense, setNewExpense] = useState({ category: 'fixed', description: '', amount: 0, currency: 'CRC' })
  const [showNewBudget, setShowNewBudget] = useState(false)
  const [budgetName, setBudgetName] = useState('')
  const [budgetPeriod, setBudgetPeriod] = useState('monthly')
  const [budgetCurrency, setBudgetCurrency] = useState('CRC')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (budgets.length === 0) {
      setActiveBudget(null)
      return
    }
    setActiveBudget(prev => {
      if (!prev || !budgets.some(b => b.id === prev.id)) return budgets[0]
      return budgets.find(b => b.id === prev.id) || budgets[0]
    })
  }, [budgets])

  const totalIncome = activeBudget?.incomes.reduce((s, i) => s + i.amount, 0) || 0
  const totalExpenses = activeBudget?.expenses.reduce((s, e) => s + e.amount, 0) || 0
  const available = totalIncome - totalExpenses

  const createBudget = async () => {
    const name = budgetName.trim()
    if (!name) { toast.error('Ingresa un nombre para el presupuesto'); return }
    if (!effectiveUserId) { toast.error('Sesión no válida. Cierra sesión e ingresa de nuevo.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, period: budgetPeriod, currency: budgetCurrency,
          userId: effectiveUserId, holderName: userName || (session?.user as any)?.name || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Presupuesto creado')
        setShowNewBudget(false)
        setBudgetName('')
        setActiveBudget({ ...data, incomes: data.incomes || [], expenses: data.expenses || [] })
        onRefresh()
      } else {
        toast.error(data?.error || 'Error creando presupuesto')
      }
    } catch { toast.error('Error al crear presupuesto') }
    finally { setSaving(false) }
  }

  const addIncome = async () => {
    if (!activeBudget || !newIncome.description || newIncome.amount <= 0) return
    setSaving(true)
    try {
      // Convert USD to CRC if necessary
      let amountInBudgetCurrency = newIncome.amount
      if (newIncome.currency !== activeBudget.currency && newIncome.currency === 'USD' && exchangeRate?.buy) {
        amountInBudgetCurrency = newIncome.amount * exchangeRate.buy
      } else if (newIncome.currency !== activeBudget.currency && newIncome.currency === 'CRC' && exchangeRate?.sell) {
        amountInBudgetCurrency = newIncome.amount / exchangeRate.sell
      }
      const incomeToAdd = { ...newIncome, amount: amountInBudgetCurrency, currency: activeBudget.currency, id: crypto.randomUUID() }
      const updated = { ...activeBudget, incomes: [...activeBudget.incomes, incomeToAdd] }
      const res = await fetch(`/api/budgets/${activeBudget.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!res.ok) throw new Error('Error updating budget')
      setActiveBudget(updated)
      setNewIncome({ category: 'salary', description: '', amount: 0, currency: 'CRC' })
      onRefresh()
      toast.success('Ingreso agregado')
    } catch {
      toast.error('Error al agregar')
    } finally { setSaving(false) }
  }

  const addExpense = async () => {
    if (!activeBudget || !newExpense.description || newExpense.amount <= 0) return
    setSaving(true)
    try {
      // Convert USD to CRC if necessary
      let amountInBudgetCurrency = newExpense.amount
      if (newExpense.currency !== activeBudget.currency && newExpense.currency === 'USD' && exchangeRate?.buy) {
        amountInBudgetCurrency = newExpense.amount * exchangeRate.buy
      } else if (newExpense.currency !== activeBudget.currency && newExpense.currency === 'CRC' && exchangeRate?.sell) {
        amountInBudgetCurrency = newExpense.amount / exchangeRate.sell
      }
      const expenseToAdd = { ...newExpense, amount: amountInBudgetCurrency, currency: activeBudget.currency, id: crypto.randomUUID() }
      const updated = { ...activeBudget, expenses: [...activeBudget.expenses, expenseToAdd] }
      const res = await fetch(`/api/budgets/${activeBudget.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!res.ok) throw new Error('Error updating budget')
      setActiveBudget(updated)
      setNewExpense({ category: 'fixed', description: '', amount: 0, currency: 'CRC' })
      onRefresh()
      toast.success('Gasto agregado')
    } catch {
      toast.error('Error al agregar')
    } finally { setSaving(false) }
  }

  const removeIncome = async (idx: number) => {
    if (!activeBudget) return
    const updated = { ...activeBudget, incomes: activeBudget.incomes.filter((_, i) => i !== idx) }
    const res = await fetch(`/api/budgets/${activeBudget.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    if (res.ok) {
      setActiveBudget(updated)
      onRefresh()
      toast.success('Ingreso eliminado')
    } else {
      toast.error('Error al eliminar ingreso')
    }
  }

  const removeExpense = async (idx: number) => {
    if (!activeBudget) return
    const updated = { ...activeBudget, expenses: activeBudget.expenses.filter((_, i) => i !== idx) }
    const res = await fetch(`/api/budgets/${activeBudget.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    if (res.ok) {
      setActiveBudget(updated)
      onRefresh()
      toast.success('Gasto eliminado')
    } else {
      toast.error('Error al eliminar gasto')
    }
    toast.success('Gasto eliminado')
  }

  const deleteBudget = async (id: string) => {
    await fetch(`/api/budgets/${id}`, { method: 'DELETE' })
    setActiveBudget(null)
    onRefresh()
    toast.success('Presupuesto eliminado')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Presupuesto</h1>
        <Button onClick={() => setShowNewBudget(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={16} className="mr-1" /> Nuevo Presupuesto
        </Button>
      </div>

      {/* Budget Selector */}
      {budgets.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {budgets.map(b => (
            <Button key={b.id} variant={activeBudget?.id === b.id ? 'default' : 'outline'}
              size="sm" onClick={() => setActiveBudget(b)}
              className={activeBudget?.id === b.id ? 'bg-indigo-600' : 'border-white/10'}>
              {b.name}
            </Button>
          ))}
        </div>
      )}

      {/* New Budget Dialog */}
      <Dialog open={showNewBudget} onOpenChange={setShowNewBudget}>
        <DialogContent className="glass-strong border-white/10">
          <DialogHeader><DialogTitle>Nuevo Presupuesto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={budgetName} onChange={e => setBudgetName(e.target.value)}
                placeholder="Mi presupuesto mensual" className="bg-white/5 border-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Periodo</Label>
                <Select value={budgetPeriod} onValueChange={setBudgetPeriod}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="biweekly">Quincenal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={budgetCurrency} onValueChange={setBudgetCurrency}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">Colones (₡)</SelectItem>
                    <SelectItem value="USD">Dólares ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={createBudget} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">
              Crear Presupuesto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {activeBudget ? (
        <>
          {/* Summary Bar */}
          <Card className="glass border-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">{activeBudget.name}</h2>
              <Button variant="ghost" size="sm" onClick={() => deleteBudget(activeBudget.id)} className="text-red-400 hover:text-red-300">
                <Trash2 size={14} />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Ingresos</p>
                <p className="text-lg font-bold text-green-400">{formatCRC(totalIncome, activeBudget.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gastos</p>
                <p className="text-lg font-bold text-red-400">{formatCRC(totalExpenses, activeBudget.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Disponible</p>
                <p className={`text-lg font-bold ${available >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCRC(available, activeBudget.currency)}
                </p>
              </div>
            </div>
            <Progress value={totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : 0}
              className="mt-3 h-2" />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Incomes */}
            <Card className="glass border-white/5 p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-green-400">
                <TrendingUp size={16} /> Ingresos
              </h3>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto custom-scroll">
                {activeBudget.incomes.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/3 hover:bg-indigo-600/6 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{INCOME_CATEGORIES.find(c => c.value === item.category)?.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-green-400">{formatCRC(item.amount, activeBudget.currency)}</span>
                      <button onClick={() => removeIncome(idx)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {activeBudget.incomes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin ingresos</p>}
              </div>
              <Separator className="bg-white/5 mb-3" />
              <div className="space-y-2">
                <Input placeholder="Descripción (ej: Salario, Bonificación)" value={newIncome.description}
                  onChange={e => setNewIncome({ ...newIncome, description: e.target.value })}
                  className="bg-white/5 border-white/10 text-sm" />
                <div className="flex gap-2">
                  <Select value={newIncome.category} onValueChange={v => setNewIncome({ ...newIncome, category: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-sm flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INCOME_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex-1 min-w-[140px]">
                    <Input type="number" placeholder="Monto" value={newIncome.amount || ''}
                      onChange={e => setNewIncome({ ...newIncome, amount: parseFloat(e.target.value) || 0 })}
                      className="bg-white/5 border-white/10 text-sm w-full" />
                  </div>
                  <Select value={newIncome.currency} onValueChange={v => setNewIncome({ ...newIncome, currency: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-sm w-24 flex-shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRC">₡ CRC</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={addIncome} disabled={saving} className="bg-green-600 hover:bg-green-700 flex-shrink-0">
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Expenses */}
            <Card className="glass border-white/5 p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-red-400">
                <TrendingDown size={16} /> Gastos
              </h3>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto custom-scroll">
                {activeBudget.expenses.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/3 hover:bg-indigo-600/6 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{EXPENSE_CATEGORIES.find(c => c.value === item.category)?.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-red-400">{formatCRC(item.amount, activeBudget.currency)}</span>
                      <button onClick={() => removeExpense(idx)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {activeBudget.expenses.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin gastos</p>}
              </div>
              <Separator className="bg-white/5 mb-3" />
              <div className="space-y-2">
                <Input placeholder="Descripción (ej: Comida, Transporte, Servicios)" value={newExpense.description}
                  onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="bg-white/5 border-white/10 text-sm" />
                <div className="flex gap-2">
                  <Select value={newExpense.category} onValueChange={v => setNewExpense({ ...newExpense, category: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-sm flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex-1 min-w-[140px]">
                    <Input type="number" placeholder="Monto" value={newExpense.amount || ''}
                      onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                      className="bg-white/5 border-white/10 text-sm w-full" />
                  </div>
                  <Select value={newExpense.currency} onValueChange={v => setNewExpense({ ...newExpense, currency: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-sm w-24 flex-shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRC">₡ CRC</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={addExpense} disabled={saving} className="bg-red-600 hover:bg-red-700 flex-shrink-0">
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Export */}
          <Card className="glass border-white/5 p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Download size={16} /> Exportar</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-white/10"
                onClick={() => {
                  const data = JSON.stringify(activeBudget, null, 2)
                  const blob = new Blob([data], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = `${activeBudget.name}.json`; a.click()
                }}>
                <FileJson size={14} className="mr-1" /> JSON
              </Button>
              <Button variant="outline" size="sm" className="border-white/10"
                onClick={() => {
                  const rows = [
                    ['Tipo', 'Categoría', 'Descripción', 'Monto'],
                    ...activeBudget.incomes.map(i => ['Ingreso', i.category, i.description, i.amount.toString()]),
                    ...activeBudget.expenses.map(e => ['Gasto', e.category, e.description, e.amount.toString()]),
                  ]
                  const escapeCSV = (val: string) => (val.includes(',') || val.includes('"') || val.includes('\n')) ? `"${val.replace(/"/g, '""')}"` : val
                  const csv = rows.map(r => r.map(escapeCSV).join(',')).join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = `${activeBudget.name}.csv`; a.click()
                }}>
                <FileSpreadsheet size={14} className="mr-1" /> CSV
              </Button>
            </div>
          </Card>
        </>
      ) : (
        <Card className="glass border-white/5 p-8 text-center">
          <Wallet size={40} className="mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Sin presupuesto activo</h2>
          <p className="text-muted-foreground text-sm mb-4">Crea tu primer presupuesto para empezar a gestionar tus finanzas</p>
          <Button onClick={() => setShowNewBudget(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus size={16} className="mr-1" /> Crear Presupuesto
          </Button>
        </Card>
      )}
    </div>
  )
}

// ─── Calculators Page ────────────────────────────────────────
function CalculatorsPage() {
  const [activeCalc, setActiveCalc] = useState('loan')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calculadoras</h1>

      <Tabs value={activeCalc} onValueChange={setActiveCalc}>
        <TabsList className="bg-white/5 border border-white/10 w-full flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="loan" className="text-xs data-[state=active]:bg-indigo-600">Préstamo</TabsTrigger>
          <TabsTrigger value="cc" className="text-xs data-[state=active]:bg-indigo-600">Tarjeta Crédito</TabsTrigger>
          <TabsTrigger value="bp" className="text-xs data-[state=active]:bg-indigo-600">Extrafinanciamientos</TabsTrigger>
          <TabsTrigger value="netSalary" className="text-xs data-[state=active]:bg-indigo-600">Salario Neto</TabsTrigger>
        </TabsList>

        <TabsContent value="loan"><LoanCalc /></TabsContent>
        <TabsContent value="cc"><CreditCardCalc /></TabsContent>
        <TabsContent value="bp"><BPLoyaltyCalc /></TabsContent>
        <TabsContent value="netSalary"><NetSalaryCalc /></TabsContent>
      </Tabs>
    </div>
  )
}

function LoanCalc() {
  const [principal, setPrincipal] = useState(5000000)
  const [rate, setRate] = useState(12)
  const [months, setMonths] = useState(36)
  const [result, setResult] = useState<any>(null)

  const calculate = async () => {
    const res = await fetch('/api/calculators', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'amortization', principal, annualRate: rate / 100, months }),
    })
    setResult(await res.json())
  }

  return (
    <Card className="glass border-white/5 p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2"><Banknote size={18} /> Calculadora de Préstamo</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Monto del Préstamo (₡)</Label>
            <Input type="number" value={principal} onChange={e => setPrincipal(parseFloat(e.target.value) || 0)}
              className="bg-white/5 border-white/10" />
          </div>
          <div className="space-y-2">
            <Label>Tasa Anual (%)</Label>
            <Input type="number" value={rate} onChange={e => setRate(parseFloat(e.target.value) || 0)} step={0.01}
              className="bg-white/5 border-white/10" />
          </div>
          <div className="space-y-2">
            <Label>Plazo (meses)</Label>
            <Input type="number" value={months} onChange={e => setMonths(parseInt(e.target.value) || 0)}
              className="bg-white/5 border-white/10" />
          </div>
          <Button onClick={calculate} className="w-full bg-indigo-600 hover:bg-indigo-700">Calcular</Button>
        </div>
        {result && !result.error && (
          <div className="space-y-3">
            <div className="glass-strong rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Cuota Mensual</p>
              <p className="text-2xl font-bold text-indigo-400">{formatCRC(result.monthlyPayment)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Total Intereses</p>
                <p className="text-sm font-bold text-orange-400">{formatCRC(result.totalInterest)}</p>
              </div>
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Total a Pagar</p>
                <p className="text-sm font-bold">{formatCRC(result.totalPaid)}</p>
              </div>
            </div>
            <ScrollArea className="h-48 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-white/5">
                    <th className="py-1 text-left">Mes</th><th className="text-right">Cuota</th>
                    <th className="text-right">Capital</th><th className="text-right">Interés</th>
                    <th className="text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule?.slice(0, 60).map((r: any) => (
                    <tr key={r.month} className="border-b border-white/3">
                      <td className="py-1">{r.month}</td>
                      <td className="text-right">{formatCRC(r.payment)}</td>
                      <td className="text-right text-green-400">{formatCRC(r.principal)}</td>
                      <td className="text-right text-orange-400">{formatCRC(r.interest)}</td>
                      <td className="text-right">{formatCRC(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        )}
      </div>
    </Card>
  )
}

function CreditCardCalc() {
  const [currency, setCurrency] = useState<'CRC' | 'USD'>('CRC')
  const [principal, setPrincipal] = useState(1000000)
  const [rate, setRate] = useState(BP_CC_CONFIG.CRC.defaultRate)
  const [charges, setCharges] = useState(0)
  const [tasaCeroOn, setTasaCeroOn] = useState(false)
  const [minicuotasOn, setMinicuotasOn] = useState(false)
  const [cuotaTasaCero, setCuotaTasaCero] = useState(0)
  const [cuotaMinicuotas, setCuotaMinicuotas] = useState(0)
  const [expertoOn, setExpertoOn] = useState(false)
  const [saldoPromedio, setSaldoPromedio] = useState<number | null>(null)
  const [sobregiro, setSobregiro] = useState(0)
  const [mora, setMora] = useState(0)

  const setMoneda = (m: 'CRC' | 'USD') => {
    setCurrency(m)
    setRate(BP_CC_CONFIG[m].defaultRate)
  }

  const result = calcBPCreditCard({
    currency, principal, annualRate: rate, charges,
    cuotaTasaCero: tasaCeroOn ? cuotaTasaCero : 0,
    cuotaMinicuotas: minicuotasOn ? cuotaMinicuotas : 0,
    saldoPromedio: expertoOn ? (saldoPromedio ?? undefined) : undefined,
    sobregiro: expertoOn ? sobregiro : 0,
    mora: expertoOn ? mora : 0,
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-semibold flex items-center gap-2">
          <CreditCard size={18} className="text-[var(--bp-orange)]" /> Simulador Tarjeta de Crédito BP
        </h3>
        <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
          <button type="button" onClick={() => setMoneda('CRC')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${currency === 'CRC' ? 'bg-[var(--bp-purple)] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            CRC ₡
          </button>
          <button type="button" onClick={() => setMoneda('USD')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${currency === 'USD' ? 'bg-[var(--bp-purple)] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            USD $
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <Card className="glass border-white/5 p-5">
            <h4 className="font-medium text-sm mb-4 flex items-center gap-2"><Wallet size={16} className="text-[var(--bp-purple-light)]" /> Datos Principales</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Saldo Principal Adeudado</Label>
                <Input type="number" value={principal || ''} onChange={e => setPrincipal(parseFloat(e.target.value) || 0)}
                  className="bg-white/5 border-white/10 text-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tasa Anual (%)</Label>
                  <Input type="number" value={rate} onChange={e => setRate(parseFloat(e.target.value) || 0)} step={0.01}
                    className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>Cargos Administrativos</Label>
                  <Input type="number" value={charges || ''} onChange={e => setCharges(parseFloat(e.target.value) || 0)}
                    className="bg-white/5 border-white/10" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="glass border-white/5 p-5">
            <h4 className="font-medium text-sm mb-4 flex items-center gap-2"><Layers size={16} className="text-[var(--bp-purple-light)]" /> Financiamientos (Al 100%)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`bp-switch-card rounded-xl p-4 ${tasaCeroOn ? 'active' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm cursor-pointer">Cero interés</Label>
                  <Switch checked={tasaCeroOn} onCheckedChange={setTasaCeroOn} />
                </div>
                {tasaCeroOn && (
                  <div className="space-y-1 mt-2">
                    <Label className="text-xs text-muted-foreground">Cuota mensual facturada</Label>
                    <Input type="number" value={cuotaTasaCero || ''} onChange={e => setCuotaTasaCero(parseFloat(e.target.value) || 0)}
                      className="bg-white/5 border-white/10 h-9" />
                  </div>
                )}
              </div>
              <div className={`bp-switch-card rounded-xl p-4 ${minicuotasOn ? 'active' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm cursor-pointer">Financiamiento con interes</Label>
                  <Switch checked={minicuotasOn} onCheckedChange={setMinicuotasOn} />
                </div>
                {minicuotasOn && (
                  <div className="space-y-1 mt-2">
                    <Label className="text-xs text-muted-foreground">Cuota mensual facturada</Label>
                    <Input type="number" value={cuotaMinicuotas || ''} onChange={e => setCuotaMinicuotas(parseFloat(e.target.value) || 0)}
                      className="bg-white/5 border-white/10 h-9" />
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="glass border-white/5 p-5 bg-[#12121f]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-sm flex items-center gap-2"><Settings size={16} className="text-[var(--bp-orange)]" /> Modo Experto</h4>
                <p className="text-xs text-muted-foreground">Calibración avanzada</p>
              </div>
              <Switch checked={expertoOn} onCheckedChange={setExpertoOn} />
            </div>
            {expertoOn && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs">Saldo Promedio Diario</Label>
                  <p className="text-[10px] text-muted-foreground">Si se deja vacío, se usa el saldo principal.</p>
                  <Input type="number" placeholder="Mismo que el principal" value={saldoPromedio ?? ''}
                    onChange={e => setSaldoPromedio(e.target.value === '' ? null : parseFloat(e.target.value))}
                    className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Sobregiro (Al 100%)</Label>
                  <Input type="number" value={sobregiro || ''} onChange={e => setSobregiro(parseFloat(e.target.value) || 0)}
                    className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Saldo en Mora (Al 100%)</Label>
                  <Input type="number" value={mora || ''} onChange={e => setMora(parseFloat(e.target.value) || 0)}
                    className="bg-white/5 border-white/10" />
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <Card className="glass-strong border-white/5 p-5 bp-result-min">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-bold">Pago Mínimo</h4>
              {result.appliesFloor && (
                <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-400">Aplica Piso Base</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">Total a pagar para no caer en mora</p>
            <p className="text-3xl font-extrabold text-[var(--bp-orange)] mb-4">
              {formatCRC(result.pagoMinimoTotal, currency)}
            </p>
            <div className="space-y-2 bg-white/3 p-3 rounded-xl text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Amortización (P/60)</span><span>{formatCRC(result.amortizacion, currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Intereses</span><span>{formatCRC(result.intereses, currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cargos Admin.</span><span>{formatCRC(result.charges, currency)}</span></div>
              {result.obligacionesExtra > 0 && (
                <div className="flex justify-between text-red-400"><span>Sobregiro + Mora</span><span>{formatCRC(result.obligacionesExtra, currency)}</span></div>
              )}
              <div className="flex justify-between border-t border-white/10 pt-2 font-semibold">
                <span className="text-[var(--bp-purple-light)]">Cuotas (TC / MC)</span>
                <span>{formatCRC(result.totalCuotas, currency)}</span>
              </div>
            </div>
          </Card>

          <Card className="border-0 p-5 text-white bp-result-contado">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Pago de Contado</h4>
              <Check size={18} className="opacity-80" />
            </div>
            <p className="text-[11px] opacity-80 mb-3">Cancele este monto para no generar nuevos intereses de financiamiento.</p>
            <p className="text-3xl font-bold">{formatCRC(result.pagoContadoTotal, currency)}</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function BPLoyaltyCalc() {
  const [program, setProgram] = useState<'minicuotas' | 'tasaCero' | 'compraSaldos' | 'otros'>('minicuotas')
  const [amount, setAmount] = useState(500000)
  const [currency, setCurrency] = useState<'CRC' | 'USD'>('CRC')
  const [manualRate, setManualRate] = useState<number | null>(null)
  const [manualCommission, setManualCommission] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)

  const calculate = async () => {
    if (program === 'otros') {
      // local calculation: simple amortization using manualRate and manualCommission
      const rate = (manualRate || 0) / 100
      const commission = manualCommission ? (amount * (manualCommission / 100)) : 0
      const monthlyRate = rate / 12
      const terms = [12, 24, 36]
      const payments = terms.map(t => ({ term: t, payment: calcPMT(amount + commission, rate, t) }))
      setResult({ program: 'Otros', amount, currency, commission, payments })
      return
    }
    const typeMap = { minicuotas: 'bpMinicuotas', tasaCero: 'bpTasaCero', compraSaldos: 'bpCompraSaldos' }
    const res = await fetch('/api/calculators', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: typeMap[program], amount, currency }),
    })
    setResult(await res.json())
  }

  const programs = [
    { id: 'minicuotas' as const, name: 'Mini Cuotas', desc: 'Tasa 24% CRC / 20% USD', icon: <Percent size={18} /> },
    { id: 'tasaCero' as const, name: 'Cero interés', desc: '0% + comisión 3%', icon: <Star size={18} /> },
    { id: 'compraSaldos' as const, name: 'Compra de Saldos', desc: 'Tasa 21% CRC / 18% USD', icon: <Scale size={18} /> },
    { id: 'otros' as const, name: 'Otros', desc: 'Tasa/Comisión Personalizada', icon: <Gem size={18} /> },
  ]

  return (
    <Card className="glass border-white/5 p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2"><Landmark size={18} className="text-purple-400" /> Extrafinanciamientos</h3>

      {/* Program selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {programs.map(p => (
          <button key={p.id} onClick={() => { setProgram(p.id); setResult(null) }}
            className={`p-3 rounded-xl border text-left transition-all ${program === p.id
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-white/5 bg-white/3 hover:bg-indigo-600/6'}`}>
            <div className="flex items-center gap-2 mb-1 text-purple-400">{p.icon} <span className="font-medium text-sm">{p.name}</span></div>
            <p className="text-xs text-muted-foreground">{p.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Moneda</Label>
            <div className="flex gap-2">
              <Button variant={currency === 'CRC' ? 'default' : 'outline'} size="sm"
                onClick={() => setCurrency('CRC')}
                className={currency === 'CRC' ? 'bg-purple-600' : 'border-white/10'}>₡ CRC</Button>
              <Button variant={currency === 'USD' ? 'default' : 'outline'} size="sm"
                onClick={() => setCurrency('USD')}
                className={currency === 'USD' ? 'bg-purple-600' : 'border-white/10'}>$ USD</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Monto a Financiar</Label>
            <Input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              className="bg-white/5 border-white/10" />
          </div>
          {program === 'otros' && (
            <>
              <div className="space-y-2">
                <Label>Tasa Anual (%)</Label>
                <Input type="number" value={manualRate ?? ''} onChange={e => setManualRate(e.target.value === '' ? null : parseFloat(e.target.value))} step={0.01}
                  className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Comisión (%)</Label>
                <Input type="number" value={manualCommission ?? ''} onChange={e => setManualCommission(e.target.value === '' ? null : parseFloat(e.target.value))} step={0.01}
                  className="bg-white/5 border-white/10" />
              </div>
            </>
          )}
          {program === 'tasaCero' && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-300">
              <AlertTriangle size={14} className="inline mr-1" />
              Comisión del 3% por formalización. Plazos: 3, 4, 6, 9, 10, 12 meses.
            </div>
          )}
          <Button onClick={calculate} className="w-full bg-purple-600 hover:bg-purple-700">Calcular Cuotas</Button>
        </div>
        {result && !result.error && (
          <div className="space-y-3">
            <div className="glass-strong rounded-xl p-4">
              <p className="text-sm text-muted-foreground">{result.program}</p>
              <p className="text-lg font-bold text-purple-400">{formatCRC(result.amount, result.currency)}</p>
              {result.commission && (
                <p className="text-xs text-yellow-400 mt-1">Comisión: {formatCRC(result.commission, result.currency)}</p>
              )}
            </div>
            <div className="space-y-2">
              {result.payments?.map((p: any) => (
                <div key={p.term} className="flex justify-between items-center p-2 rounded-lg glass">
                  <span className="text-sm">{p.term} meses</span>
                  <span className="font-bold text-purple-400">{formatCRC(p.payment, result.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

function NetSalaryCalc() {
  const [gross, setGross] = useState(500000)
  const [result, setResult] = useState<ReturnType<typeof calcNetSalary> | null>(null)

  const calculate = async () => {
    const res = await fetch('/api/calculators', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'netSalary', grossSalary: gross }),
    })
    const data = await res.json()
    setResult(data)
  }

  return (
    <Card className="glass border-white/5 p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2"><BadgeDollarSign size={18} /> Calculadora de Salario Neto CR</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Salario Bruto Mensual (₡)</Label>
            <Input type="number" value={gross} onChange={e => setGross(parseFloat(e.target.value) || 0)}
              className="bg-white/5 border-white/10" />
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
            <Info size={14} className="inline mr-1" />
            Deducciones: CCSS 10.67% + Impuesto sobre la Renta (tramos 2024)
          </div>
          <Button onClick={calculate} className="w-full bg-indigo-600 hover:bg-indigo-700">Calcular Salario Neto</Button>
        </div>
        {result && !result.error && (
          <div className="space-y-3">
            <div className="glass-strong rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Salario Neto</p>
              <p className="text-2xl font-bold text-green-400">{formatCRC(result.net)}</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 rounded-lg glass">
                <span className="text-sm">Salario Bruto</span>
                <span className="font-medium">{formatCRC(result.gross)}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg glass">
                <span className="text-sm text-red-400">- CCSS (10.67%)</span>
                <span className="font-medium text-red-400">{formatCRC(result.ccss)}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg glass">
                <span className="text-sm text-red-400">- Impuesto Renta</span>
                <span className="font-medium text-red-400">{formatCRC(result.ir)}</span>
              </div>
              <Separator className="bg-white/5" />
              <div className="flex justify-between items-center p-2 rounded-lg glass-strong">
                <span className="text-sm font-semibold">Salario Neto</span>
                <span className="font-bold text-green-400">{formatCRC(result.net)}</span>
              </div>
            </div>
            <div className="mt-2">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={[
                  { name: 'Neto', value: result.net, fill: '#10B981' },
                  { name: 'CCSS', value: result.ccss, fill: '#EF4444' },
                  { name: 'IR', value: result.ir, fill: '#F59E0B' },
                ]} layout="vertical">
                  <XAxis type="number" tickFormatter={formatCompact} stroke="rgba(255,255,255,0.2)" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} width={40} />
                  <RechartsTooltip formatter={(v: number) => formatCRC(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {[
                      { name: 'Neto', value: result.net, fill: '#10B981' },
                      { name: 'CCSS', value: result.ccss, fill: '#EF4444' },
                      { name: 'IR', value: result.ir, fill: '#F59E0B' },
                    ].map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── Aguinaldo Page ──────────────────────────────────────────
function AguinaldoPage() {
  const [salaries, setSalaries] = useState<number[]>(Array(12).fill(0))
  const [result, setResult] = useState<any>(null)
  const months = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov']

  const calculate = async () => {
    const res = await fetch('/api/aguinaldo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salaries }),
    })
    setResult(await res.json())
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calculadora de Aguinaldo</h1>
      <Card className="glass border-white/5 p-6">
        <p className="text-sm text-muted-foreground mb-4">
          Ingresa los salarios brutos de cada mes (diciembre del año anterior a noviembre del año actual)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {salaries.map((s, i) => (
            <div key={i} className="space-y-1">
              <Label className="text-xs">{months[i]}</Label>
              <Input type="number" value={s || ''} placeholder="0"
                onChange={e => { const next = [...salaries]; next[i] = parseFloat(e.target.value) || 0; setSalaries(next) }}
                className="bg-white/5 border-white/10 text-sm" />
            </div>
          ))}
        </div>
        <Button onClick={calculate} className="w-full bg-indigo-600 hover:bg-indigo-700">Calcular Aguinaldo</Button>
      </Card>
      {result && (
        <Card className="glass-strong border-white/5 p-6">
          <h3 className="font-semibold mb-4">Resultado</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Bruto</p>
              <p className="text-lg font-bold">{formatCRC(result.totalGross)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Promedio Mensual</p>
              <p className="text-lg font-bold">{formatCRC(result.averageSalary)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Meses Trabajados</p>
              <p className="text-lg font-bold">{result.monthsWorked}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Aguinaldo</p>
              <p className="text-2xl font-bold text-green-400">{formatCRC(result.aguinaldoAmount)}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Savings Goals Page ──────────────────────────────────────
function SavingsGoalsPage({ goals, userId, onRefresh }: {
  goals: Goal[]; userId: string; onRefresh: () => void
}) {
  const { data: session } = useSession()
  const effectiveUserId = userId || (session?.user as any)?.id || ''

  const [showNew, setShowNew] = useState(false)
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: 0, currentAmount: 0, targetDate: '', currency: 'CRC' })
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [transactingGoalId, setTransactingGoalId] = useState<string | null>(null)
  const [transactionType, setTransactionType] = useState<'add' | 'withdraw' | null>(null)
  const [transactionAmount, setTransactionAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const createGoal = async () => {
    const name = newGoal.name.trim()
    if (!name) { toast.error('Ingresa un nombre para la meta'); return }
    if (newGoal.targetAmount <= 0) { toast.error('El monto objetivo debe ser mayor a 0'); return }
    if (!effectiveUserId) { toast.error('Sesión no válida. Cierra sesión e ingresa de nuevo.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/goals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newGoal, name, userId: effectiveUserId }),
      })
      const data = await res.json()
      if (res.ok) {
        setShowNew(false)
        setNewGoal({ name: '', targetAmount: 0, currentAmount: 0, targetDate: '', currency: 'CRC' })
        onRefresh()
        toast.success('Meta creada')
      } else {
        toast.error(data?.error || 'Error creando meta')
      }
    } catch { toast.error('Error al crear meta') }
    finally { setSaving(false) }
  }

  const updateGoal = async () => {
    if (!editingGoal) return
    await fetch('/api/goals', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingGoal),
    })
    setEditingGoal(null)
    onRefresh()
    toast.success('Meta actualizada')
  }

  const deleteGoal = async (id: string) => {
    await fetch('/api/goals?id=' + encodeURIComponent(id), { method: 'DELETE' })
    onRefresh()
    toast.success('Meta eliminada')
  }

  const handleTransaction = async (goal: Goal, type: 'add' | 'withdraw', amount: number) => {
    if (amount <= 0) { toast.error('Ingresa un monto válido'); return }
    const newAmount = type === 'add' 
      ? Math.min(goal.currentAmount + amount, goal.targetAmount)
      : Math.max(goal.currentAmount - amount, 0)
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...goal, currentAmount: newAmount }),
      })
      if (res.ok) {
        onRefresh()
        setTransactingGoalId(null)
        setTransactionAmount('')
        toast.success(type === 'add' ? 'Monto agregado' : 'Monto retirado')
      } else {
        toast.error('Error actualizando meta')
      }
    } catch { toast.error('Error al actualizar meta') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Metas de Ahorro</h1>
        <Button onClick={() => setShowNew(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={16} className="mr-1" /> Nueva Meta
        </Button>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="glass-strong border-white/10">
          <DialogHeader><DialogTitle>Nueva Meta de Ahorro</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nombre de la meta" value={newGoal.name}
              onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
              className="bg-white/5 border-white/10" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto Objetivo</Label>
                <Input type="number" value={newGoal.targetAmount || ''}
                  onChange={e => setNewGoal({ ...newGoal, targetAmount: parseFloat(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Ahorro Actual</Label>
                <Input type="number" value={newGoal.currentAmount || ''}
                  onChange={e => setNewGoal({ ...newGoal, currentAmount: parseFloat(e.target.value) || 0 })}
                  className="bg-white/5 border-white/10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Objetivo</Label>
                <Input type="date" value={newGoal.targetDate}
                  onChange={e => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                  className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={newGoal.currency} onValueChange={v => setNewGoal({ ...newGoal, currency: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">Colones (₡)</SelectItem>
                    <SelectItem value="USD">Dólares ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={createGoal} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {saving ? 'Creando...' : 'Crear Meta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingGoal} onOpenChange={() => setEditingGoal(null)}>
        <DialogContent className="glass-strong border-white/10">
          <DialogHeader><DialogTitle>Editar Meta</DialogTitle></DialogHeader>
          {editingGoal && (
            <div className="space-y-4">
              <Input value={editingGoal.name} onChange={e => setEditingGoal({ ...editingGoal, name: e.target.value })}
                className="bg-white/5 border-white/10" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto Objetivo</Label>
                  <Input type="number" value={editingGoal.targetAmount}
                    onChange={e => setEditingGoal({ ...editingGoal, targetAmount: parseFloat(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>Ahorro Actual</Label>
                  <Input type="number" value={editingGoal.currentAmount}
                    onChange={e => setEditingGoal({ ...editingGoal, currentAmount: parseFloat(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10" />
                </div>
              </div>
              <Button onClick={updateGoal} className="w-full bg-indigo-600 hover:bg-indigo-700">Guardar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {goals.length === 0 ? (
        <Card className="glass border-white/5 p-8 text-center">
          <Target size={40} className="mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Sin metas de ahorro</h2>
          <p className="text-muted-foreground text-sm">Crea tu primera meta para empezar a ahorrar</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(g => {
            const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0
            return (
              <Card key={g.id} className="glass border-white/5 p-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold">{g.name}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditingGoal(g)}><Settings size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteGoal(g.id)} className="text-red-400"><Trash2 size={14} /></Button>
                  </div>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-green-400">{formatCRC(g.currentAmount, g.currency)}</span>
                  <span className="text-muted-foreground">de {formatCRC(g.targetAmount, g.currency)}</span>
                </div>
                <Progress value={Math.min(pct, 100)} className="h-3 mb-3" />
                <div className="flex justify-between text-xs text-muted-foreground mb-3">
                  <span>{pct.toFixed(1)}% completado</span>
                  {g.targetDate && <span>Meta: {g.targetDate}</span>}
                </div>
                {transactingGoalId === g.id ? (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1 block">Monto ({transactionType === 'add' ? 'Agregar' : 'Retirar'})</Label>
                      <Input type="number" placeholder="0" value={transactionAmount}
                        onChange={e => setTransactionAmount(e.target.value)}
                        className="bg-white/5 border-white/10 text-sm" />
                    </div>
                    <Button size="sm" className={transactionType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                      onClick={() => handleTransaction(g, transactionType!, parseFloat(transactionAmount) || 0)}>
                      Confirmar
                    </Button>
                    <Button size="sm" variant="outline" 
                      onClick={() => { setTransactingGoalId(null); setTransactionAmount('') }}>
                      X
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10" 
                      onClick={() => { setTransactingGoalId(g.id); setTransactionType('add'); setTransactionAmount('') }}>
                      <Plus size={14} className="mr-1" /> Agregar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10" 
                      onClick={() => { setTransactingGoalId(g.id); setTransactionType('withdraw'); setTransactionAmount('') }}>
                      <Minus size={14} className="mr-1" /> Retirar
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tips Carousel Page ──────────────────────────────────────
function TipsCarouselPage() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(0)

  const navigate = (newIndex: number) => {
    setDirection(newIndex > current ? 1 : -1)
    setCurrent(newIndex)
  }

  const goNext = () => navigate((current + 1) % TIPS.length)
  const goPrev = () => navigate((current - 1 + TIPS.length) % TIPS.length)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Consejos Financieros</h1>
          <p className="text-sm text-muted-foreground mt-1">Aprende estrategias para mejorar tu salud financiera</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-400">{current + 1}</div>
          <div className="text-xs text-muted-foreground">de {TIPS.length}</div>
        </div>
      </div>

      {/* Main carousel card */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: direction > 0 ? 40 : -40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction > 0 ? -40 : 40, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <div className="relative overflow-hidden rounded-3xl">
              {/* Background gradient decorative elements */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-indigo-500/20 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-purple-600/15 to-pink-600/10 rounded-full blur-3xl pointer-events-none" />

              <Card className="relative border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm p-10 lg:p-12">
                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-8">
                  {/* Icon container */}
                  <div className="flex-shrink-0">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0 text-5xl ring-1 ring-white/20 shadow-xl"
                    >
                      {TIPS[current].icon}
                    </motion.div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.15 }}
                    >
                      <h2 className="text-3xl lg:text-4xl font-bold mb-3 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                        {TIPS[current].title}
                      </h2>
                      <p className="text-base lg:text-lg text-gray-300 leading-relaxed mb-5">
                        {TIPS[current].desc}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/30">
                          💡 Consejo Práctico
                        </span>
                        <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium border border-purple-500/30">
                          Impacto Alto
                        </span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 px-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={goPrev}
            className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-white/10 hover:border-indigo-500/50 transition-all text-indigo-300 hover:text-indigo-200"
          >
            <ChevronLeft size={24} />
          </motion.button>

          {/* Progress indicators */}
          <div className="flex gap-2 items-center">
            {TIPS.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => navigate(i)}
                className={`transition-all ${
                  i === current
                    ? 'bg-gradient-to-r from-indigo-400 to-purple-400 shadow-lg shadow-indigo-500/50'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                style={{
                  width: i === current ? '32px' : '8px',
                  height: '8px',
                  borderRadius: '9999px',
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={goNext}
            className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-white/10 hover:border-indigo-500/50 transition-all text-indigo-300 hover:text-indigo-200"
          >
            <ChevronRight size={24} />
          </motion.button>
        </div>
      </div>

      {/* All tips grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Otros Consejos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIPS.map((tip, i) => (
            <motion.button
              key={i}
              onClick={() => navigate(i)}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className={`relative group p-6 rounded-2xl border transition-all duration-300 text-left overflow-hidden ${
                i === current
                  ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/50 ring-1 ring-indigo-400/50 shadow-xl shadow-indigo-500/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-500/30 shadow-lg hover:shadow-indigo-500/10'
              }`}
            >
              {/* Decorative gradient background */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                i === current ? 'opacity-30' : ''
              }`}>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/5" />
              </div>

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl">{tip.icon}</div>
                  {i === current && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-2 h-2 rounded-full bg-indigo-400"
                    />
                  )}
                </div>
                <h4 className="font-semibold text-sm mb-2 text-white group-hover:text-indigo-200 transition-colors">
                  {tip.title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-gray-300 transition-colors">
                  {tip.desc}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Config Page ─────────────────────────────────────────────
function ConfigPage({ userId, userName, userEmail, exchangeRate }: {
  userId: string; userName: string; userEmail: string; exchangeRate: { buy: number; sell: number; source: string; date: string } | null
}) {
  const [name, setName] = useState(userName)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [isDeletingData, setIsDeletingData] = useState(false)

  const deleteUserData = async () => {
    if (!userId) return
    setIsDeletingData(true)
    try {
      const response = await fetch(`/api/user-data?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Tus datos han sido eliminados correctamente')
        setShowConfirmDelete(false)
        window.location.reload()
      } else {
        toast.error('No se pudo borrar la información. Intenta de nuevo.')
      }
    } catch (error) {
      console.error('Error borrando datos del usuario:', error)
      toast.error('Error de red al borrar los datos')
    } finally {
      setIsDeletingData(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <Tabs defaultValue="profile">
        <TabsList className="bg-white/5 border border-white/10 w-full flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="profile" className="text-xs data-[state=active]:bg-indigo-600">Perfil</TabsTrigger>
          <TabsTrigger value="exchange" className="text-xs data-[state=active]:bg-indigo-600">Tipo de Cambio</TabsTrigger>
          <TabsTrigger value="privacy" className="text-xs data-[state=active]:bg-indigo-600">Tratamiento de Datos</TabsTrigger>
          <TabsTrigger value="about" className="text-xs data-[state=active]:bg-indigo-600">Acerca de</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="glass border-white/5 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><User size={18} /> Información Personal</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Correo</Label>
                <Input value={userEmail} disabled className="bg-white/5 border-white/10 opacity-60" />
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Save size={16} className="mr-1" /> Guardar
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="exchange">
          <Card className="glass border-white/5 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Globe size={18} /> Tipo de cambio al día de hoy</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tipo de cambio al día de hoy — se actualiza automáticamente desde la fuente oficial para conversiones precisas en colones y dólares.
            </p>
            {exchangeRate ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-strong rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Compra USD</p>
                    <p className="text-2xl font-bold text-green-400">₡{exchangeRate.buy.toFixed(2)}</p>
                  </div>
                  <div className="glass-strong rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Venta USD</p>
                    <p className="text-2xl font-bold text-orange-400">₡{exchangeRate.sell.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Fuente: {exchangeRate.source}</span>
                  <span>Fecha: {exchangeRate.date}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <RefreshCw size={24} className="mx-auto mb-2 text-muted-foreground animate-spin" />
                <p className="text-muted-foreground">Cargando tipo de cambio...</p>
              </div>
            )}
            <Button variant="outline" size="sm" className="mt-4 border-white/10"
              onClick={() => fetch('/api/exchange-rate').then(r => r.json()).then(() => toast.success('Tipo de cambio actualizado'))}>
              <RefreshCw size={14} className="mr-1" /> Actualizar
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card className="glass border-white/5 p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Tratamiento de Datos</h3>
              <p className="text-sm leading-7 text-muted-foreground">
                Este proyecto es un gestor financiero de código abierto. Los datos no son administrados por ninguna entidad externa, sino por usted mismo.
              </p>
              <p className="text-sm leading-7 text-muted-foreground">
                Si desea borrar sus registros, al final de esta sección encontrará la opción para eliminar su huella digital.
              </p>
              <p className="text-sm leading-7 text-muted-foreground">
                Los datos no se utilizan para estudios estadísticos, ni para alimentar inteligencia artificial, ni para generar predicciones financieras.
              </p>
              <p className="text-sm leading-7 text-muted-foreground">
                Esta herramienta tiene como única finalidad servirle como un canal para administrar sus finanzas de forma responsable.
              </p>
            </div>
            <div className="rounded-3xl border border-red-500/10 bg-red-500/5 p-5 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-red-300 uppercase tracking-[0.25em]">Borrar mis datos</p>
                <p className="text-xs text-muted-foreground leading-6">
                  Borrar mis datos no elimina su cuenta. Si desea suprimir su información o cambiar su clave, debe contactar al desarrollador.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                onClick={() => setShowConfirmDelete(true)}
              >
                Borrar mi huella digital
              </Button>
            </div>
          </Card>

          <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
            <DialogContent className="bg-slate-950/95 border-white/15 shadow-2xl backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle>Confirmar eliminación de datos</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-7">
                  Esta acción borrará todos los presupuestos, créditos y metas de ahorro asociados a su usuario. No eliminará su cuenta.
                </p>
                <p className="text-sm text-muted-foreground leading-7">
                  Una vez eliminados, los datos no podrán recuperarse. Asegúrese de tener copia de lo que necesite antes de continuar.
                </p>
              </div>
              <DialogFooter className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowConfirmDelete(false)}>
                  Cancelar
                </Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={deleteUserData} disabled={isDeletingData}>
                  {isDeletingData ? 'Eliminando...' : 'Confirmar eliminación'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="about">
          <Card className="glass border-white/5 p-6">
            <div className="text-center max-w-lg mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 overflow-hidden">
                <img src="/icon.png" alt={APP_NAME} className="w-full h-full object-cover" />
              </div>
              <h2 className="text-2xl font-bold gold-shimmer mb-2">{APP_NAME}</h2>
              <p className="text-muted-foreground text-sm mb-6">Gestión Financiera Inteligente para Costa Rica</p>
              <Separator className="bg-white/5 my-4" />
              <div className="space-y-3 text-left">
                {[
                  { icon: <Calculator size={18} />, title: 'Calculadoras financieras', desc: 'Préstamos, tarjetas de crédito, extrafinanciamientos y salario neto con fórmulas actualizadas.' },
                  { icon: <Landmark size={18} />, title: 'Extrafinanciamientos BP', desc: 'Simula Minicuotas, Tasa Cero, Compra de Saldos u opciones personalizadas con tasa y comisión.' },
                  { icon: <Globe size={18} />, title: 'Tipo de cambio al día de hoy', desc: 'Conversiones automáticas entre colones y dólares con el tipo de cambio vigente.' },
                  { icon: <Wallet size={18} />, title: 'Presupuesto personal', desc: 'Crea presupuestos, registra ingresos y gastos, y exporta en JSON o CSV.' },
                  { icon: <Target size={18} />, title: 'Metas de ahorro', desc: 'Define objetivos, haz seguimiento del progreso y visualiza tu avance.' },
                  { icon: <Lightbulb size={18} />, title: 'Consejos financieros', desc: 'Tips prácticos con rotación automática para mejorar tus decisiones diarias.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                    <span className="text-indigo-400 flex-shrink-0 mt-0.5">{item.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="bg-white/5 my-4" />
              <a href="https://www.linkedin.com/in/enrique-cascante" target="_blank" rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center justify-center gap-1">
                <ExternalLink size={14} /> {FOOTER_TEXT}
              </a>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────
function Sidebar() {
  const { activePage, setActivePage, sidebarCollapsed, toggleSidebar } = useAppStore()
  const { data: session } = useSession()

  const groups = NAV_ITEMS.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, typeof NAV_ITEMS>)

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.2 }}
      className="hidden md:flex flex-col bg-[#0A0A12] border-r border-white/5 h-screen sticky top-0 overflow-hidden"
    >
      {/* Header */}
      <div className={`border-b border-white/5 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/10">
              <img src="/icon.png" alt={APP_NAME} className="w-full h-full object-cover" />
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expandir menú"
              className="sidebar-toggle-btn w-full flex justify-center py-2 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/10">
              <img src="/icon.png" alt={APP_NAME} className="w-full h-full object-cover" />
            </div>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="font-bold gold-shimmer text-sm whitespace-nowrap">
              {APP_NAME}
            </motion.span>
            <button type="button" onClick={toggleSidebar}
              className="ml-auto text-muted-foreground hover:text-indigo-300 transition-colors flex-shrink-0 p-1 rounded-md hover:bg-indigo-500/10">
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-2">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="mb-2">
            {!sidebarCollapsed && (
              <p className="px-4 py-1 text-[10px] uppercase text-muted-foreground/60 font-medium tracking-wider">{group}</p>
            )}
            {items.map(item => (
              <TooltipProvider key={item.id} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActivePage(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                        activePage === item.id
                          ? 'bg-indigo-500/15 text-indigo-400 border-r-2 border-indigo-500'
                          : 'text-muted-foreground hover:bg-indigo-600/10 hover:text-foreground'
                      } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      {item.icon}
                      {!sidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                    </button>
                  </TooltipTrigger>
                  {sidebarCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        ))}
      </ScrollArea>

      {/* User */}
      {session?.user && (
        <div className="p-3 border-t border-white/5">
          <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              {(session.user as any).name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{(session.user as any).name}</p>
                <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                <button onClick={() => signOut()} className="text-xs text-red-400 hover:text-red-300 mt-1 font-medium">Cerrar sesión</button>
              </div>
            )}
            {sidebarCollapsed && (
              <button onClick={() => signOut()} className="text-xs text-red-400 hover:text-red-300" title="Cerrar sesión">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </motion.aside>
  )
}

// ─── Mobile Nav ──────────────────────────────────────────────
function MobileNav() {
  const { activePage, setActivePage, mobileMenuOpen, setMobileMenuOpen } = useAppStore()
  const { data: session } = useSession()

  const mobileItems = NAV_ITEMS.filter(i => ['dashboard', 'presupuesto', 'creditos', 'calculadoras', 'metas', 'config'].includes(i.id))

  return (
    <>
      {/* Top bar */}
      <div className="md:hidden flex items-center justify-between p-3 bg-[#0A0A12] border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/10">
            <img src="/icon.png" alt={APP_NAME} className="w-full h-full object-cover" />
          </div>
          <span className="font-bold gold-shimmer text-sm">{APP_NAME}</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-muted-foreground">
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Full menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 top-12 bg-[#060609]/95 z-40 backdrop-blur-xl p-4"
          >
            <div className="space-y-1">
              {NAV_ITEMS.map(item => (
                <button key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${
                    activePage === item.id
                      ? 'bg-indigo-500/15 text-indigo-400'
                      : 'text-muted-foreground hover:bg-indigo-600/10'
                  }`}>
                  {item.icon} {item.label}
                </button>
              ))}
              {session && (
                <button onClick={() => signOut()}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10">
                  <LogOut size={20} /> Cerrar Sesión
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A12] border-t border-white/5 safe-area-pb z-50">
        <div className="flex justify-around py-2">
          {mobileItems.map(item => (
            <button key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-lg transition-colors ${
                activePage === item.id ? 'text-indigo-400' : 'text-muted-foreground'
              }`}>
              {item.icon}
              <span className="text-[10px]">{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Main App ────────────────────────────────────────────────
function MainApp() {
  const { data: session } = useSession()
  const { activePage } = useAppStore()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [credits, setCredits] = useState<any[]>([])
  const [exchangeRate, setExchangeRate] = useState<{ buy: number; sell: number; source: string; date: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const userId = (session?.user as any)?.id || ''

  const refreshData = useCallback(async () => {
    if (!userId) return
    try {
      const [bRes, gRes, cRes, eRes] = await Promise.all([
        fetch(`/api/budgets?userId=${userId}`),
        fetch(`/api/goals?userId=${userId}`),
        fetch(`/api/credits?userId=${userId}`),
        fetch('/api/exchange-rate'),
      ])
      const bData = await bRes.json()
      const gData = await gRes.json()
      const cData = await cRes.json()
      const eData = await eRes.json()
      setBudgets(Array.isArray(bData) ? bData : [])
      setGoals(Array.isArray(gData) ? gData : [])
      setCredits(Array.isArray(cData) ? cData : [])
      setExchangeRate(eData)
    } catch (e) { console.error('Data fetch error:', e) }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { refreshData() }, [refreshData])

  useEffect(() => {
    if (activePage === 'dashboard') {
      const interval = setInterval(() => fetch('/api/exchange-rate').then(r => r.json()).then(setExchangeRate), 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [activePage])

  const userName = (session?.user as any)?.name || 'Usuario'
  const userEmail = session?.user?.email || ''

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage budgets={budgets} goals={goals} exchangeRate={exchangeRate} userName={userName} />
      case 'presupuesto':
        return <PresupuestoPage budgets={budgets} userId={userId} onRefresh={refreshData} userName={userName} exchangeRate={exchangeRate} />
      case 'creditos':
        return <CreditsPage credits={credits} userId={userId} onRefresh={refreshData} />
      case 'calculadoras':
        return <CalculatorsPage />
      case 'aguinaldo':
        return <AguinaldoPage />
      case 'metas':
        return <SavingsGoalsPage goals={goals} userId={userId} onRefresh={refreshData} />
      case 'consejos':
        return <TipsCarouselPage />
      case 'config':
        return <ConfigPage userId={userId} userName={userName} userEmail={userEmail} exchangeRate={exchangeRate} />
      default:
        return <DashboardPage budgets={budgets} goals={goals} exchangeRate={exchangeRate} userName={userName} />
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <MobileNav />
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-8 max-w-[1480px] mx-auto w-full">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : renderPage()}
        </main>
        <footer className="mt-auto border-t border-white/5 py-3 px-4 text-center text-xs text-muted-foreground bg-[#0A0A12]">
          <a href="https://www.linkedin.com/in/enrique-cascante" target="_blank" rel="noopener noreferrer"
            className="hover:text-indigo-400 transition-colors">
            {FOOTER_TEXT}
          </a>
        </footer>
      </div>
    </div>
  )
}

// ─── Root Page ───────────────────────────────────────────────
export default function BudgetPulseApp() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060609]">
        <RefreshCw className="animate-spin text-indigo-500" size={32} />
      </div>
    )
  }

  if (!session) return <AuthForm />
  return <MainApp />
}
