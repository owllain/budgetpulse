import { QueryClient } from '@tanstack/react-query'

/**
 * Configuración global de TanStack Query
 * Este cliente maneja todas las operaciones de caching y sincronización de servidor
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mantiene datos frescos
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (antes: cacheTime)
      
      // Reintentos automáticos
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Sincronización entre pestañas
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: 'stale',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
})
