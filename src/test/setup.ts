// src/test/setup.ts
import { config } from '@vue/test-utils'
import { createPinia } from 'pinia'

// Configurar Pinia para tests
const pinia = createPinia()

// Configurar Vue Test Utils
config.global.plugins = [pinia]

// Mock de localStorage con almacenamiento real en memoria
const localStorageState = new Map<string, string>()

Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: vi.fn((key: string) => localStorageState.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            localStorageState.set(key, String(value))
        }),
        removeItem: vi.fn((key: string) => {
            localStorageState.delete(key)
        }),
        clear: vi.fn(() => {
            localStorageState.clear()
        }),
    },
    writable: true,
})

beforeEach(() => {
    localStorageState.clear()
    vi.clearAllMocks()
})

// Mock de console para evitar warnings en tests
global.console = {
    ...console,
    warn: vi.fn(),
    error: vi.fn(),
}
