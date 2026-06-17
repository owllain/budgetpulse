'use client'

/**
 * EJEMPLO: Componente migrado para usar React Query
 * Antes: useState + useEffect (fetching manual)
 * Después: React Query hooks (caching automático)
 */

import { useCredits, useCreateCredit } from '@/hooks/use-queries'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/app-store'
import { useState } from 'react'
import { toast } from 'sonner'

export function CreditsPageExample() {
  const session = useSession()
  const userId = session.data?.user?.id

  // ========== STATE DE SERVIDOR (React Query) ==========
  // Maneja automáticamente: caching, invalidación, reintentos, sincronización
  const {
    data: credits,
    isLoading: creditsLoading,
    error: creditsError,
    isFetching,
  } = useCredits(userId)

  // Mutation para crear crédito
  const { mutate: createCredit, isPending: isCreating } = useCreateCredit()

  // ========== STATE DE UI (Zustand) ==========
  // Solo para UI efímera: modal, sidebar, etc.
  const openModal = useUIStore((s) => s.openModal)
  const closeModal = useUIStore((s) => s.closeModal)
  const isModalOpen = useUIStore((s) => s.modals.createCredit)

  // ========== STATE LOCAL (para formulario) ==========
  const [formData, setFormData] = useState({
    name: '',
    entity: '',
    balance: 0,
  })

  // ========== HANDLERS ==========
  const handleCreateCredit = async (e: React.FormEvent) => {
    e.preventDefault()

    createCredit(
      {
        user_id: userId!,
        name: formData.name,
        financial_entity: formData.entity,
        current_balance: formData.balance,
        product_type: 'credit_card',
        currency: 'CRC',
        interest_rate: 18,
        payment_due_day: 15,
      },
      {
        onSuccess: () => {
          toast.success('Crédito creado correctamente')
          closeModal('createCredit')
          setFormData({ name: '', entity: '', balance: 0 })
          // React Query automáticamente invalida y recarga la lista
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  }

  // ========== RENDERIZADO ==========
  if (creditsLoading) {
    return <div className="p-4">Cargando créditos...</div>
  }

  if (creditsError) {
    return (
      <div className="p-4 text-red-500">
        Error: {creditsError.message}
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="ml-2"
        >
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Indicador de recarga en background */}
      {isFetching && (
        <div className="text-sm text-gray-500">Actualizando...</div>
      )}

      {/* Botón para crear */}
      <Button onClick={() => openModal('createCredit')}>
        Agregar Crédito
      </Button>

      {/* Lista de créditos */}
      <div className="grid gap-4">
        {credits?.map((credit) => (
          <Card key={credit.id} className="p-4">
            <h3 className="font-semibold">{credit.name}</h3>
            <p className="text-sm text-gray-600">{credit.financial_entity}</p>
            <p className="text-lg font-bold">₡{credit.current_balance}</p>
            <p className="text-sm">Tasa: {credit.interest_rate}%</p>
          </Card>
        ))}
      </div>

      {/* Modal para crear crédito */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <Card className="w-96 p-6">
            <h2 className="text-xl font-bold mb-4">Agregar Crédito</h2>

            <form onSubmit={handleCreateCredit} className="space-y-4">
              <input
                type="text"
                placeholder="Nombre"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              />

              <select
                value={formData.entity}
                onChange={(e) =>
                  setFormData({ ...formData, entity: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Seleccionar entidad</option>
                <option value="BAC">BAC</option>
                <option value="BNCR">BNCR</option>
                <option value="Scotiabank">Scotiabank</option>
              </select>

              <input
                type="number"
                placeholder="Saldo actual"
                value={formData.balance}
                onChange={(e) =>
                  setFormData({ ...formData, balance: Number(e.target.value) })
                }
                className="w-full p-2 border rounded"
                required
              />

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1"
                >
                  {isCreating ? 'Creando...' : 'Crear'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => closeModal('createCredit')}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

/**
 * ========== VENTAJAS DE ESTA ARQUITECTURA ==========
 *
 * ✅ REACT QUERY MANEJA:
 *    - Caching automático
 *    - Invalidación inteligente (mutación triggerea actualización)
 *    - Reintentos en caso de error
 *    - Sincronización entre pestañas
 *    - Deduplicación de requests
 *    - Estados de carga/error/éxito
 *
 * ✅ ZUSTAND MANEJA:
 *    - Estado efímero de UI (modales, sidebar)
 *    - Persistencia local
 *    - Rápido y sincrónico
 *
 * ✅ COMPONENTE ES:
 *    - Simple y enfocado
 *    - Reutilizable
 *    - Fácil de testear
 *    - Sin lógica de fetching
 *
 * ========== COMPARACIÓN: ANTES vs DESPUÉS ==========
 *
 * ANTES (con useState + useEffect):
 * - 50+ líneas de código
 * - Manejo manual de estados (loading, error, data)
 * - useEffect con dependencies complejas
 * - Posibles memory leaks
 * - No hay deduplicación de requests
 * - Caché manual o inexistente
 *
 * DESPUÉS (con React Query):
 * - ~30 líneas de código
 * - Estados manejados automáticamente
 * - Una línea de hook por funcionalidad
 * - Caching automático
 * - Invalidación inteligente
 * - Reintentos automáticos
 */
