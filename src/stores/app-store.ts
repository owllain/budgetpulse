import { create } from 'zustand'

export type PageId = 'dashboard' | 'presupuesto' | 'calculadoras' | 'aguinaldo' | 'metas' | 'consejos' | 'config'

interface AppState {
  activePage: PageId
  sidebarCollapsed: boolean
  mobileMenuOpen: boolean
  setActivePage: (page: PageId) => void
  toggleSidebar: () => void
  setMobileMenuOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  activePage: 'dashboard',
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  setActivePage: (page) => set({ activePage: page, mobileMenuOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
}))
