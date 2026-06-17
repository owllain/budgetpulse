# 🚀 Guía de Ejecución - Testing, Resiliencia y Estado

## 1. Ejecutar las Pruebas Unitarias

```bash
# Ejecutar todas las pruebas unitarias
npm run test

# Ver interfaz visual interactiva
npm run test:ui

# Generar reporte de cobertura
npm run test:coverage
```

**Ubicación de tests:** `tests/unit/financial-calculations.test.ts`

**Lo que se prueba (32 tests):**
- ✅ Amortización de créditos (6 tests)
- ✅ Tabla de amortización (6 tests)
- ✅ Proyección tarjeta de crédito (4 tests)
- ✅ Cálculo de aguinaldo (5 tests)
- ✅ Salario neto (4 tests)
- ✅ Minicuotas (4 tests)
- ✅ Tasa cero (3 tests)

---

## 2. Ejecutar Pruebas E2E

```bash
# Ejecutar pruebas E2E (requiere que el servidor esté corriendo en http://localhost:3000)
npm run test:e2e

# Modo interactivo/visual
npm run test:e2e:ui

# Probar en navegadores específicos
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

**Ubicación de tests:** `tests/e2e/critical-flows.spec.ts`

**Lo que se prueba:**
- ✅ Dashboard carga correctamente
- ✅ Navegación entre secciones
- ✅ CRUD de presupuestos
- ✅ CRUD de créditos
- ✅ Calculadora funciona
- ✅ Responsividad móvil
- ✅ Manejo de errores
- ✅ Rendimiento (<5 segundos)

---

## 3. Iniciar el Servidor para Pruebas E2E

```bash
# Terminal 1: Inicia el servidor en http://localhost:3000
npm run dev

# Terminal 2: En otra ventana, ejecuta las pruebas E2E
npm run test:e2e
```

---

## 4. Verificar Circuit Breaker en Acción

El Circuit Breaker está automáticamente activo en `src/app/api/exchange-rate/route.ts`.

**Para ver los logs:**

```bash
# En desarrollo, revisa la consola del servidor para mensajes como:
# [CircuitBreaker] Opened. Will retry in 60000ms
# [CircuitBreaker] Closed. Service recovered.
```

**Para forzar un estado OPEN (simular caída):**
1. Detén la conexión a internet o simula un error
2. El endpoint se abrirá automáticamente después de 3 fallos
3. Verás logs en consola

---

## 5. Explorar Caché en Memoria

**En el navegador (DevTools Console):**

```javascript
// Acceder a estadísticas de caché
fetch('/api/exchange-rate')
  .then(r => r.json())
  .then(data => {
    console.log('Respuesta:', data)
    // Si cacheSource === 'memory', es del caché rápido
    // Si cached === true, es de BD o caché
    // Si fresh === true, es de la API
  })
```

---

## 6. Usar React Query en Componentes

**Ejemplo simple:**

```typescript
import { useExchangeRate } from '@/hooks/use-queries'

function MyComponent() {
  const { data, isLoading, error } = useExchangeRate()

  if (isLoading) return <div>Cargando tasa...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      Dólar: ₡{data?.buy} / ₡{data?.sell}
    </div>
  )
}
```

**Crear datos:**

```typescript
import { useCreateBudget } from '@/hooks/use-queries'

function CreateForm() {
  const { mutate, isPending } = useCreateBudget()

  const handleSubmit = (data) => {
    mutate(data, {
      onSuccess: () => console.log('Creado!'),
      onError: (error) => console.error(error.message),
    })
  }

  return <form onSubmit={handleSubmit}>{/* ... */}</form>
}
```

---

## 7. Verificar Zustand Store (UI-only)

```typescript
import { useUIStore } from '@/stores/app-store'

function Nav() {
  const activePage = useUIStore((s) => s.activePage)
  const setActivePage = useUIStore((s) => s.setActivePage)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)

  return (
    <div>
      <button onClick={() => setActivePage('presupuesto')}>
        Ir a presupuestos
      </button>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        Cambiar tema
      </button>
    </div>
  )
}
```

---

## 8. Checklist de Verificación

- [ ] `npm run test` pasa 32 tests ✅
- [ ] `npm run test:ui` abre interfaz visual
- [ ] `npm run dev` inicia el servidor sin errores
- [ ] `npm run test:e2e` ejecuta 10+ tests E2E
- [ ] `/api/exchange-rate` responde en <1 segundo (caché)
- [ ] Zustand persiste tema en localStorage
- [ ] React Query cachea datos automáticamente
- [ ] Circuit Breaker está activo en logs
- [ ] Componente ejemplo compila sin errores

---

## 9. Archivos Clave Creados/Modificados

### Testing
- ✅ `vitest.config.ts` - Configuración Vitest
- ✅ `playwright.config.ts` - Configuración Playwright
- ✅ `tests/setup.ts` - Setup de tests
- ✅ `tests/unit/financial-calculations.test.ts` - 32 tests
- ✅ `tests/e2e/critical-flows.spec.ts` - Tests E2E
- ✅ `package.json` - Scripts de test

### Resiliencia
- ✅ `src/lib/circuit-breaker.ts` - Patrón Circuit Breaker
- ✅ `src/lib/cache.ts` - Caché en memoria con TTL
- ✅ `src/app/api/exchange-rate/route.ts` - Mejorado con 5 niveles de fallback

### Estado
- ✅ `src/lib/query-client.ts` - Configuración React Query
- ✅ `src/stores/app-store.ts` - Zustand refactorizado (UI-only)
- ✅ `src/hooks/use-queries.ts` - Hooks de React Query
- ✅ `src/components/providers/react-query-provider.tsx` - Provider
- ✅ `src/components/budgetpulse/providers.tsx` - Integración
- ✅ `src/components/examples/credits-page-example.tsx` - Ejemplo práctico

### Documentación
- ✅ `QUALITY_ASSURANCE.md` - Guía completa
- ✅ `TESTING_GUIDE.md` - Este archivo

---

## 10. Proximos Pasos

### Inmediatos
1. Ejecuta `npm run test` para verificar tests
2. Ejecuta `npm run dev` luego `npm run test:e2e`
3. Revisa logs de Circuit Breaker en consola

### Corto Plazo
1. Migra componentes a usar hooks de `use-queries.ts`
2. Reemplaza `useState + useEffect` con React Query
3. Aumenta cobertura de tests a >80%

### Mediano Plazo
1. Monitorea métricas de caché en producción
2. Agrega tests para validaciones de formularios
3. Implementa DevTools de React Query para debugging

### Largo Plazo
1. Integración con CI/CD (ejecutar tests en cada PR)
2. Alertas para Circuit Breaker abierto
3. Dashboard de métricas de QA

---

## 11. Troubleshooting

### Tests no ejecutan
```bash
# Limpia node_modules e instala de nuevo
rm -rf node_modules package-lock.json
npm install
```

### E2E tests fallan por timeout
```bash
# Aumenta timeout en playwright.config.ts
timeout: 30000  // de 30s a más si es necesario
```

### React Query no cachea
- Verifica que `ReactQueryProvider` esté en el layout
- Revisa `staleTime` y `gcTime` en `src/lib/query-client.ts`
- Abre DevTools → React Query → explorer

### Circuit Breaker siempre OPEN
- Verifica logs del servidor
- Aumenta `failureThreshold` si la API es inestable
- Revisa conectividad de red

---

**Última actualización:** 2024-01-16
**Soporte:** Ver `QUALITY_ASSURANCE.md` para guía completa
