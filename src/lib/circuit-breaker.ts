/**
 * Circuit Breaker Pattern Implementation
 * Previene el hammering de APIs externas cuando están caídas
 * Estados: CLOSED (normal) → OPEN (caída) → HALF_OPEN (recuperación)
 */

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal
  OPEN = 'OPEN', // Servicio caído
  HALF_OPEN = 'HALF_OPEN', // Intentando recuperar
}

interface CircuitBreakerConfig {
  failureThreshold: number // Número de fallos antes de abrir
  successThreshold: number // Número de éxitos antes de cerrar en HALF_OPEN
  timeout: number // Milisegundos antes de pasar a HALF_OPEN
  resetTimeout: number // Milisegundos para mantener abierto antes de HALF_OPEN
}

class CircuitBreaker<T> {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount: number = 0
  private successCount: number = 0
  private lastFailureTime: number = 0
  private nextAttemptTime: number = 0

  constructor(
    private operation: () => Promise<T>,
    private config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minuto
      resetTimeout: 30000, // 30 segundos
      ...this.config,
    }
  }

  async execute(): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() >= this.nextAttemptTime) {
        this.state = CircuitState.HALF_OPEN
        this.successCount = 0
      } else {
        throw new Error(
          `Circuit breaker is OPEN. Next retry in ${Math.ceil((this.nextAttemptTime - Date.now()) / 1000)}s`
        )
      }
    }

    try {
      const result = await this.operation()

      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++
        if (this.successCount >= this.config.successThreshold!) {
          this.close()
        }
      } else if (this.state === CircuitState.CLOSED) {
        this.failureCount = 0
      }

      return result
    } catch (error) {
      this.failureCount++
      this.lastFailureTime = Date.now()

      if (this.state === CircuitState.HALF_OPEN) {
        // Si falla en HALF_OPEN, vuelve a OPEN
        this.open()
      } else if (this.failureCount >= this.config.failureThreshold!) {
        // Si alcanzan el umbral de fallos, abre el circuito
        this.open()
      }

      throw error
    }
  }

  private open(): void {
    this.state = CircuitState.OPEN
    this.nextAttemptTime = Date.now() + this.config.resetTimeout!
    console.warn(
      `[CircuitBreaker] Opened. Will retry in ${this.config.resetTimeout}ms`
    )
  }

  private close(): void {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    console.info('[CircuitBreaker] Closed. Service recovered.')
  }

  getState(): CircuitState {
    return this.state
  }

  getMetrics(): {
    state: CircuitState
    failureCount: number
    successCount: number
    lastFailureTime: number
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    }
  }
}

export function createCircuitBreaker<T>(
  operation: () => Promise<T>,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker<T> {
  return new CircuitBreaker(operation, config)
}

export { CircuitBreaker }
