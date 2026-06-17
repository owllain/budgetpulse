# Guía de Mejores Prácticas - QA, Resiliencia y Estado

Esta guía documenta las mejoras implementadas en el proyecto para garantizar calidad, resiliencia y escalabilidad.

## 1. Testing - Aseguramiento de Calidad (QA)

### Vitest - Pruebas Unitarias

**Propósito:** Verificar que las fórmulas financieras sean siempre exactas.

**Ubicación:** `tests/unit/financial-calculations.test.ts`

**Ejecutar:**
```bash
npm run test                    # Ejecuta todas las pruebas
npm run test:ui                 # Interfaz visual
npm run test:coverage           # Reporte de cobertura
```

**Ejemplo de prueba:**
```typescript
import { describe, it, expect } from 'vitest'

describe('Cálculos Financieros - Amortización', () => {
  it('debe calcular correctamente el pago mensual', () => {
    const payment = calculateMonthlyPayment(10_000_000, 8, 60)
    expect(payment).toBeCloseTo(202_763.94, 1)
  })
})
```

**Funciones clave probadas:**
- ✅ Amortización de créditos: `calculateMonthlyPayment()`
- ✅ Tabla de amortización: `calculateAmortizationSchedule()`
- ✅ Proyección tarjeta crédito: `calculateCreditCardProjection()`
- ✅ Cálculo aguinaldo: `calculateAguinaldo()`
- ✅ Salario neto: `calculateNetSalary()`
- ✅ Minicuotas y tasa cero

### Playwright - Pruebas End-to-End (E2E)

**Propósito:** Validar los flujos críticos del usuario en la interfaz.

**Ubicación:** `tests/e2e/critical-flows.spec.ts`

**Ejecutar:**
```bash
npm run test:e2e                # Ejecuta todas las pruebas E2E
npm run test:e2e:ui             # Interfaz visual
```

**Ejemplo de E2E test:**
```typescript
import { test, expect } from '@playwright/test'

test('debe crear un presupuesto correctamente', async ({ page }) => {
  await page.goto('/')
  await page.click('button:has-text("Crear Presupuesto")')
  await page.fill('input[name="name"]', 'Mi Presupuesto')
  await page.click('button:has-text("Guardar")')
  await expect(page.locator('text=Mi Presupuesto')).toBeVisible()
})
```

**Flujos críticos probados:**
- ✅ Carga del dashboard
- ✅ Navegación entre secciones
- ✅ Creación de presupuestos
- ✅ Gestión de créditos
- ✅ Calculadora financiera
- ✅ Responsividad móvil

---

## 2. Resiliencia y Caché - APIs Externas

### Circuit Breaker Pattern

**Propósito:** Proteger la app cuando APIs externas caen.

**Ubicación:** `src/lib/circuit-breaker.ts`

**Cómo funciona:**
```
CLOSED (normal) → OPEN (caída detectada) → HALF_OPEN (recuperación) → CLOSED
```

**Ejemplo de uso:**
```typescript
import { createCircuitBreaker } from '@/lib/circuit-breaker'

const breaker = createCircuitBreaker(
  async () => await fetch('https://api.external.com'),
  {
    failureThreshold: 5,    // Abre después de 5 fallos
    successThreshold: 2,    // Cierra después de 2 éxitos en HALF_OPEN
    resetTimeout: 60000,    // Intenta recuperar cada 1 minuto
  }
)

try {
  const result = await breaker.execute()
} catch (error) {
  console.error('Circuit abierto:', error.message)
}
```

**Métricas:**
```typescript
const metrics = breaker.getMetrics()
// { state: 'CLOSED', failureCount: 0, successCount: 2, lastFailureTime: 0 }
```

### Caché en Memoria (TTL)

**Propósito:** Almacenar respuestas rápidamente antes de persistencia.

**Ubicación:** `src/lib/cache.ts`

**Ejemplo de uso:**
```typescript
import { getOrCreateCache } from '@/lib/cache'

const cache = getOrCreateCache<ExchangeRate>('exchange_rates')

// Guardar con TTL de 1 hora
cache.set('hacienda_2024-01-15', { buy: 505.5, sell: 515.5 }, 3600000)

// Obtener
const rate = cache.get('hacienda_2024-01-15')

// Invalidar patrón (ej: todas las tasas de hoy)
cache.invalidateByPattern(/hacienda_2024-01-15/)

// Estadísticas
const stats = cache.getStats()
// { size: 10, hits: 45, misses: 5, hitRate: 90 }
```

### Endpoint Mejorado: Tasas de Cambio

**Ubicación:** `src/app/api/exchange-rate/route.ts`

**Flujo de resiliencia (5 niveles):**

1. **Caché en Memoria** (milisegundos) → Si existe y no expiró
2. **BD Local** (milisegundos) → Si fue consultado hoy
3. **API Hacienda + Circuit Breaker** (segundos) → Si disponible
4. **API BCCR Fallback** (segundos) → Si Hacienda falla
5. **Último valor conocido + Estimado** (fallback) → Si todo falla

**Respuesta JSON:**
```json
{
  "date": "2024-01-15",
  "buy": 505.5,
  "sell": 515.5,
  "source": "Hacienda",
  "cached": true,
  "cacheSource": "memory",
  "fresh": false
}
```

---

## 3. Separación de Estado - Zustand + React Query

### Principio de Separación

```
┌─────────────────────────────────────────┐
│   ESTADO DE SERVIDOR (React Query)      │
│  - Presupuestos                         │
│  - Créditos                             │
│  - Tasas de cambio                      │
│  ✓ Caching automático                   │
│  ✓ Invalidación inteligente              │
│  ✓ Sincronización entre pestañas        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│    ESTADO DE UI (Zustand)               │
│  - Página activa                        │
│  - Modales abiertos                     │
│  - Tema visual                          │
│  - Sidebar colapsado                    │
│  ✓ Persistencia local                   │
│  ✓ Rápido y sincrónico                  │
└─────────────────────────────────────────┘
```

### Zustand - Solo Estado de UI

**Ubicación:** `src/stores/app-store.ts`

**Uso:**
```typescript
import { useUIStore } from '@/stores/app-store'

function MyComponent() {
  const activePage = useUIStore((s) => s.activePage)
  const setActivePage = useUIStore((s) => s.setActivePage)
  
  return (
    <button onClick={() => setActivePage('presupuesto')}>
      {activePage}
    </button>
  )
}
```

**Estados disponibles:**
```typescript
{
  activePage: PageId,
  sidebarCollapsed: boolean,
  mobileMenuOpen: boolean,
  theme: 'light' | 'dark' | 'system',
  modals: {
    createBudget: boolean,
    createCredit: boolean,
    calculator: boolean,
    settings: boolean,
  }
}
```

### React Query - Estado del Servidor

**Ubicación:** `src/hooks/use-queries.ts`

**Ejemplo: Obtener créditos del usuario**
```typescript
import { useCredits } from '@/hooks/use-queries'

function CreditsPage() {
  const userId = useSession().data?.user?.id
  const { data: credits, isLoading, error } = useCredits(userId)
  
  if (isLoading) return <div>Cargando...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return (
    <div>
      {credits?.map(credit => (
        <CreditCard key={credit.id} credit={credit} />
      ))}
    </div>
  )
}
```

**Ejemplo: Crear presupuesto**
```typescript
import { useCreateBudget } from '@/hooks/use-queries'

function CreateBudgetForm() {
  const { mutate: createBudget, isPending } = useCreateBudget()
  
  const handleSubmit = (data: Partial<Budget>) => {
    createBudget(data, {
      onSuccess: () => {
        toast.success('Presupuesto creado')
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }
  
  return <form onSubmit={handleSubmit}>{/* ... */}</form>
}
```

**Configuración Global** (`src/lib/query-client.ts`):
```typescript
{
  queries: {
    staleTime: 5 * 60 * 1000,        // Datos frescos por 5 min
    gcTime: 10 * 60 * 1000,          // Mantiene en caché 10 min
    retry: 3,                        // Reintentos automáticos
    refetchOnWindowFocus: true,      // Actualiza si vuelves a la pestaña
  }
}
```

---

## 4. Hooks Disponibles

### Exchange Rate
```typescript
const { data, isLoading } = useExchangeRate()
// data: { date, buy, sell, source, cached, ... }
```

### Presupuestos
```typescript
const { data: budgets } = useBudgets(userId)
const { mutate: create } = useCreateBudget()
const { mutate: update } = useUpdateBudget()
const { mutate: delete: deleteBudget } = useDeleteBudget()
```

### Créditos
```typescript
const { data: credits } = useCredits(userId)
const { mutate: create } = useCreateCredit()
```

### Calculadora
```typescript
const { mutate: calculateAmortization } = useCalculateAmortization()
const { mutate: calculateAguinaldo } = useCalculateAguinaldo()
```

---

## 5. Checklist de Implementación

- [x] Vitest configurado con +32 pruebas unitarias
- [x] Playwright configurado para E2E
- [x] Circuit Breaker implementado
- [x] Caché en memoria con TTL
- [x] Endpoint mejorado con resiliencia en 5 niveles
- [x] React Query integrado
- [x] Zustand refactorizado (UI-only)
- [x] Hooks de queries creados
- [x] Providers integrados

---

## 6. Próximos Pasos

1. **Ejecutar pruebas regularmente:**
   ```bash
   npm run test              # Después de cada cambio en cálculos
   npm run test:e2e          # Antes de deploy
   ```

2. **Monitorear métricas de caché:**
   - Logs de Circuit Breaker en producción
   - Hit rate del caché en memoria
   - Tiempo de respuesta de API

3. **Migrar componentes a React Query:**
   - Reemplazar `useState` + `useEffect` con hooks de `use-queries.ts`
   - Eliminar lógica de fetching de componentes

4. **Agregar más tests E2E:**
   - Formularios complejos
   - Validaciones
   - Casos de error

---

**Última actualización:** 2024-01-15
**Versión:** 2.0.0
