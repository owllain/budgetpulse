/**
 * Hook de React Query para el Motor de Optimización de Deuda
 * Mantiene la separación de capas: UI → React Query → API → Motor
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Debt, OptimizationResult } from '@/lib/financial/debt-optimizer'

/**
 * Hook para optimizar deudas con ambas estrategias
 * 
 * @param deudas Array de deudas a analizar
 * @param presupuestoExtra Presupuesto mensual extra disponible
 * @returns Query con resultado de optimización
 * 
 * @example
 * const { data, isLoading, error } = useOptimizeDebts(deudas, 50000)
 * 
 * if (isLoading) return <div>Calculando estrategias...</div>
 * if (error) return <div>Error: {error.message}</div>
 * 
 * return (
 *   <DebtComparison 
 *     avalanche={data.avalanche}
 *     snowball={data.snowball}
 *   />
 * )
 */
export function useOptimizeDebts(
  deudas: Debt[],
  presupuestoExtra: number,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['debt-optimizer', deudas, presupuestoExtra],
    queryFn: async (): Promise<OptimizationResult> => {
      const response = await fetch('/api/debt-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deudas, presupuestoExtra }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al optimizar deudas')
      }

      return response.json()
    },
    enabled: enabled && deudas.length > 0 && presupuestoExtra >= 0,
    // Configuración de caché
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 2,
  })
}

/**
 * Hook para guardar una estrategia de optimización como preferencia
 * 
 * @returns Mutation para guardar preferencia
 * 
 * @example
 * const { mutate } = useSaveDebtStrategy()
 * 
 * const handleSaveStrategy = (strategy: 'avalanche' | 'snowball') => {
 *   mutate({ 
 *     userId, 
 *     strategy,
 *     deudas,
 *     presupuestoExtra 
 *   })
 * }
 */
export function useSaveDebtStrategy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      userId: string
      strategy: 'avalanche' | 'snowball'
      deudas: Debt[]
      presupuestoExtra: number
    }) => {
      const response = await fetch('/api/user-data/debt-strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Error al guardar estrategia')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidar caché de optimizaciones
      queryClient.invalidateQueries({ queryKey: ['debt-optimizer'] })
    },
  })
}

/**
 * Hook para obtener estrategias guardadas del usuario
 * 
 * @param userId ID del usuario
 * @returns Query con historial de estrategias
 * 
 * @example
 * const { data: strategies } = useDebtStrategies(userId)
 * 
 * strategies?.forEach(s => {
 *   console.log(`${s.strategy}: ${s.savedAt}`)
 * })
 */
export function useDebtStrategies(userId: string) {
  return useQuery({
    queryKey: ['debt-strategies', userId],
    queryFn: async () => {
      const response = await fetch(`/api/user-data/debt-strategies?userId=${userId}`)

      if (!response.ok) {
        throw new Error('Error al obtener estrategias')
      }

      return response.json()
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

/**
 * Hook compuesto para flujo completo de optimización
 * Combina obtener datos, optimizar y guardar en un solo hook
 * 
 * @example
 * const { 
 *   result,
 *   isOptimizing,
 *   isSaving,
 *   optimizeDebts,
 *   saveStrategy
 * } = useDebtOptimizationFlow(userId)
 */
export function useDebtOptimizationFlow(userId: string) {
  const queryClient = useQueryClient()

  const optimization = useMutation({
    mutationFn: async (data: { deudas: Debt[]; presupuestoExtra: number }) => {
      const response = await fetch('/api/debt-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Error en optimización')
      return response.json()
    },
  })

  const saveStrategy = useMutation({
    mutationFn: async (data: {
      strategy: 'avalanche' | 'snowball'
      result: OptimizationResult
    }) => {
      const response = await fetch('/api/user-data/debt-strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...data,
        }),
      })

      if (!response.ok) throw new Error('Error al guardar')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt-strategies', userId] })
    },
  })

  return {
    result: optimization.data,
    isOptimizing: optimization.isPending,
    optimizeDebts: optimization.mutate,
    isSaving: saveStrategy.isPending,
    saveStrategy: saveStrategy.mutate,
    error: optimization.error || saveStrategy.error,
  }
}
