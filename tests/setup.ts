import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock fetch globalmente para testing
global.fetch = vi.fn()

// Configurar opciones por defecto de expect
expect.extend({})
