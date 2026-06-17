import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * ZUSTAND STORE - UI State Only
 * 
 * Este store SOLO gestiona estado efímero de UI:
 * - Navegación (página activa)
 * - Modales y sidebars
 * - Temas visuales
 * 
 * TODO el estado del servidor (presupuestos, créditos, tasas de cambio)
 * está delegado a React Query en src/hooks/use-queries.ts
 */

export type PageId = 'dashboard' | 'presupuesto' | 'creditos' | 'calculadoras' | 'aguinaldo' | 'metas' | 'debt_optimizer' | 'consejos' | 'config' | 'audit'
export type Theme = 'light' | 'dark' | 'system'

interface UIState {
  // Navegación
  activePage: PageId
  sidebarCollapsed: boolean
  mobileMenuOpen: boolean

  // Tema
  theme: Theme

  // Modales
  modals: {
    createBudget: boolean
    createCredit: boolean
    calculator: boolean
    settings: boolean
  }

  // Acciones
  setActivePage: (page: PageId) => void
  toggleSidebar: () => void
  setMobileMenuOpen: (open: boolean) => void
  setTheme: (theme: Theme) => void
  openModal: (modalName: keyof UIState['modals']) => void
  closeModal: (modalName: keyof UIState['modals']) => void
  closeAllModals: () => void
}

/**
 * Store principal de UI
 * Persistencia local para tema y navegación
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activePage: 'dashboard',
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      theme: 'system',
      modals: {
        createBudget: false,
        createCredit: false,
        calculator: false,
        settings: false,
      },

      setActivePage: (page) =>
        set({ activePage: page, mobileMenuOpen: false }),

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      setMobileMenuOpen: (open) =>
        set({ mobileMenuOpen: open }),

      setTheme: (theme) =>
        set({ theme }),

      openModal: (modalName) =>
        set((s) => ({
          modals: { ...s.modals, [modalName]: true },
        })),

      closeModal: (modalName) =>
        set((s) => ({
          modals: { ...s.modals, [modalName]: false },
        })),

      closeAllModals: () =>
        set({
          modals: {
            createBudget: false,
            createCredit: false,
            calculator: false,
            settings: false,
          },
        }),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)

/**
 * Store para notificaciones/toasts
 * Efímero, no persiste
 */
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

interface NotificationState {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (notification) =>
    set((s) => ({
      notifications: [
        ...s.notifications,
        { ...notification, id: crypto.randomUUID() },
      ],
    })),
  removeNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),
}))

// Alias para compatibilidad backward compat con código existente
export const useAppStore = useUIStore

