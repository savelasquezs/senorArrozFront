import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../auth'
import { authApi } from '@/services/MainAPI/authApi'

vi.mock('@/services/MainAPI/authApi', () => ({ authApi: { logout: vi.fn() } }))

beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('auth_token', 'access')
    localStorage.setItem('refresh_token', 'refresh')
    localStorage.setItem('user_data', JSON.stringify({ id: 7, role: 'Deliveryman', branchId: 1 }))
    setActivePinia(createPinia())
})

it('keeps credentials and the current user when pending deliveries block logout', async () => {
    const auth = useAuthStore()
    auth.initializeAuth()
    vi.mocked(authApi.logout).mockRejectedValue(new Error('Entrega o reasigna todos tus pedidos pendientes antes de cerrar sesión.'))

    expect(await auth.logout()).toBe(false)
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.id).toBe(7)
    expect(localStorage.getItem('auth_token')).toBe('access')
    expect(localStorage.getItem('refresh_token')).toBe('refresh')
    expect(auth.error).toContain('pedidos pendientes')
})

it('clears the session after the server confirms logout', async () => {
    const auth = useAuthStore()
    auth.initializeAuth()
    vi.mocked(authApi.logout).mockResolvedValue()

    expect(await auth.logout()).toBe(true)
    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
})
