// src/test/setup.ts
import { config } from '@vue/test-utils'
import { createPinia } from 'pinia'

// Configurar Pinia para tests
const pinia = createPinia()

// Configurar Vue Test Utils
config.global.plugins = [pinia]

// Mock de localStorage
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
    },
    writable: true,
})

// Mock de console para evitar warnings en tests
global.console = {
    ...console,
    warn: vi.fn(),
    error: vi.fn(),
}
