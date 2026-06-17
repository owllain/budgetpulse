/**
 * Custom Hooks para React Query (TanStack Query)
 * Encapsula toda la lógica de fetching de datos del servidor
 * Separación clara: Zustand = UI State, React Query = Server State
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'

// ============= EXCHANGE RATES =============

export interface ExchangeRate {
  date: string
  buy: number
  sell: number
  source: string
  cached: boolean
  fresh?: boolean
  fallback?: boolean
  warning?: string
}

export const useExchangeRate = (options?: Partial<UseQueryOptions<ExchangeRate>>) => {
  return useQuery<ExchangeRate>({
    queryKey: ['exchangeRate'],
    queryFn: async () => {
      const res = await fetch('/api/exchange-rate')
      if (!res.ok) throw new Error('Failed to fetch exchange rate')
      return res.json()
    },
    staleTime: 60 * 60 * 1000, // 1 hora para tasas de cambio
    refetchInterval: 60 * 60 * 1000, // Refresca cada hora
    ...options,
  })
}

// ============= BUDGETS =============

export interface Budget {
  id: string
  user_id: string
  name: string
  description?: string
  total_amount: number
  current_spending: number
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'archived'
  created_at: string
  updated_at: string
}

export const useBudgets = (userId?: string, options?: Partial<UseQueryOptions<Budget[]>>) => {
  return useQuery<Budget[]>({
    queryKey: ['budgets', userId],
    queryFn: async () => {
      const params = userId ? `?userId=${userId}` : ''
      const res = await fetch(`/api/budgets${params}`)
      if (!res.ok) throw new Error('Failed to fetch budgets')
      return res.json()
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    ...options,
  })
}

export const useBudgetDetail = (budgetId?: string) => {
  return useQuery<Budget>({
    queryKey: ['budget', budgetId],
    queryFn: async () => {
      const res = await fetch(`/api/budgets/${budgetId}`)
      if (!res.ok) throw new Error('Failed to fetch budget')
      return res.json()
    },
    enabled: !!budgetId,
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateBudget = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: Partial<Budget>) => {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create budget')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export const useUpdateBudget = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Budget> }) => {
      const res = await fetch(`/api/budgets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update budget')
      return res.json()
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['budget', id] })
    },
  })
}

export const useDeleteBudget = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete budget')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

// ============= CREDITS =============

export interface Credit {
  id: string
  user_id: string
  name: string
  financial_entity: string
  product_type: 'credit_card' | 'loan'
  currency: string
  interest_rate: number
  current_balance: number
  created_at: string
  updated_at: string
  [key: string]: any
}

export const useCredits = (userId?: string, options?: Partial<UseQueryOptions<Credit[]>>) => {
  return useQuery<Credit[]>({
    queryKey: ['credits', userId],
    queryFn: async () => {
      const params = userId ? `?userId=${userId}` : ''
      const res = await fetch(`/api/credits${params}`)
      if (!res.ok) throw new Error('Failed to fetch credits')
      return res.json()
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

export const useCreateCredit = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: Partial<Credit>) => {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create credit')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] })
    },
  })
}

// ============= CALCULATOR =============

export interface AmortizationResult {
  monthlyPayment: number
  totalInterest: number
  totalPaid: number
  schedule: Array<{
    month: number
    payment: number
    principal: number
    interest: number
    balance: number
  }>
}

export const useCalculateAmortization = () => {
  return useMutation({
    mutationFn: async (data: { principal: number; annualRate: number; months: number }) => {
      const res = await fetch('/api/calculators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'amortization', ...data }),
      })
      if (!res.ok) throw new Error('Failed to calculate amortization')
      return res.json() as Promise<AmortizationResult>
    },
  })
}

// ============= AGUINALDO =============

export interface AguinaldoResult {
  salaries: number[]
  totalGross: number
  averageSalary: number
  aguinaldoAmount: number
  monthsWorked: number
}

export const useCalculateAguinaldo = () => {
  return useMutation({
    mutationFn: async (data: { salaries: number[] }) => {
      const res = await fetch('/api/aguinaldo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to calculate aguinaldo')
      return res.json() as Promise<AguinaldoResult>
    },
  })
}
