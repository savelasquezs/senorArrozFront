import type { LoginResponse, User } from '@/types/auth'

const { axiosCreateMock, redirectToLoginMock } = vi.hoisted(() => ({
    axiosCreateMock: vi.fn(),
    redirectToLoginMock: vi.fn(),
}))

vi.mock('axios', () => ({
    default: {
        create: axiosCreateMock,
    },
    create: axiosCreateMock,
}))

vi.mock('@/services/auth/authNavigation', () => ({
    redirectToLogin: redirectToLoginMock,
}))

describe('authSession', () => {
    const user: User = {
        id: 7,
        name: 'Santiago',
        email: 'santiago@example.com',
        phone: '3001234567',
        active: true,
        role: 'Admin',
        branchId: 1,
        branchName: 'Centro',
    }

    const loginResponse: LoginResponse = {
        token: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: '2026-12-31T00:00:00Z',
        user,
    }

    beforeEach(() => {
        axiosCreateMock.mockReset()
        redirectToLoginMock.mockReset()
    })

    it('persists and clears the stored session', async () => {
        const authSession = await import('@/services/auth/authSession')

        authSession.persistSession(loginResponse)

        expect(authSession.getSessionSnapshot()).toEqual({
            token: 'access-token',
            refreshToken: 'refresh-token',
            user,
        })
        expect(authSession.hasAccessToken()).toBe(true)

        authSession.clearSession()

        expect(authSession.getSessionSnapshot()).toEqual({
            token: null,
            refreshToken: null,
            user: null,
        })
        expect(authSession.hasAccessToken()).toBe(false)
    })

    it('refreshes the session and updates the stored tokens', async () => {
        vi.resetModules()

        const refreshClient = {
            post: vi.fn().mockResolvedValue({
                data: {
                    token: 'new-access-token',
                    refreshToken: 'new-refresh-token',
                    user,
                },
            }),
        }
        axiosCreateMock.mockReturnValue(refreshClient)

        const authSession = await import('@/services/auth/authSession')
        localStorage.setItem('refresh_token', 'stale-refresh-token')

        const token = await authSession.refreshAccessToken()

        expect(token).toBe('new-access-token')
        expect(refreshClient.post).toHaveBeenCalledWith('/auth/refresh', {
            refreshToken: 'stale-refresh-token',
        })
        expect(authSession.getSessionSnapshot()).toEqual({
            token: 'new-access-token',
            refreshToken: 'new-refresh-token',
            user,
        })
        expect(redirectToLoginMock).not.toHaveBeenCalled()
    })

    it('clears the session and redirects when refresh fails', async () => {
        vi.resetModules()

        const refreshClient = {
            post: vi.fn().mockRejectedValue(new Error('401')),
        }
        axiosCreateMock.mockReturnValue(refreshClient)

        const authSession = await import('@/services/auth/authSession')
        authSession.persistSession(loginResponse)

        const token = await authSession.refreshAccessToken()

        expect(token).toBeNull()
        expect(authSession.getSessionSnapshot()).toEqual({
            token: null,
            refreshToken: null,
            user: null,
        })
        expect(redirectToLoginMock).toHaveBeenCalledTimes(1)
    })
})
