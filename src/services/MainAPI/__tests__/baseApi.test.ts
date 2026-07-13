const {
    axiosCreateMock,
    axiosInstanceMock,
    requestUseMock,
    responseUseMock,
    getAccessTokenMock,
    refreshAccessTokenMock,
} = vi.hoisted(() => {
    const requestUseMock = vi.fn()
    const responseUseMock = vi.fn()
    const axiosInstanceMock = Object.assign(vi.fn(), {
        interceptors: {
            request: { use: requestUseMock },
            response: { use: responseUseMock },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    })

    return {
        axiosCreateMock: vi.fn(() => axiosInstanceMock),
        axiosInstanceMock,
        requestUseMock,
        responseUseMock,
        getAccessTokenMock: vi.fn(),
        refreshAccessTokenMock: vi.fn(),
    }
})

vi.mock('axios', () => ({
    default: {
        create: axiosCreateMock,
    },
    create: axiosCreateMock,
}))

vi.mock('@/services/auth/authSession', () => ({
    getAccessToken: getAccessTokenMock,
    refreshAccessToken: refreshAccessTokenMock,
}))

class TestApi extends (await import('@/services/MainAPI/baseApi')).BaseApi {}

describe('BaseApi interceptors', () => {
    beforeEach(() => {
        axiosCreateMock.mockClear()
        axiosInstanceMock.mockClear()
        axiosInstanceMock.get.mockReset()
        axiosInstanceMock.post.mockReset()
        axiosInstanceMock.put.mockReset()
        axiosInstanceMock.patch.mockReset()
        axiosInstanceMock.delete.mockReset()
        requestUseMock.mockClear()
        responseUseMock.mockClear()
        getAccessTokenMock.mockReset()
        refreshAccessTokenMock.mockReset()
    })

    it('adds the bearer token to outgoing requests', async () => {
        getAccessTokenMock.mockReturnValue('session-token')
        new TestApi()

        const onRequest = requestUseMock.mock.calls[0][0]
        const config = await onRequest({ headers: {} })

        expect(config.headers.Authorization).toBe('Bearer session-token')
    })

    it('retries a 401 request with a refreshed token', async () => {
        refreshAccessTokenMock.mockResolvedValue('new-token')
        axiosInstanceMock.mockResolvedValue({ data: { ok: true } })

        new TestApi()

        const onResponseError = responseUseMock.mock.calls[0][1]
        const originalRequest = { url: '/orders', headers: {} }

        const response = await onResponseError({
            config: originalRequest,
            response: { status: 401 },
        })

        expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1)
        expect(originalRequest.headers.Authorization).toBe('Bearer new-token')
        expect(axiosInstanceMock).toHaveBeenCalledWith(originalRequest)
        expect(response).toEqual({ data: { ok: true } })
    })

    it('does not retry login and refresh endpoints', async () => {
        new TestApi()

        const onResponseError = responseUseMock.mock.calls[0][1]
        const error = {
            config: { url: '/auth/login', headers: {} },
            response: { status: 401 },
        }

        await expect(onResponseError(error)).rejects.toBe(error)
        expect(refreshAccessTokenMock).not.toHaveBeenCalled()
        expect(axiosInstanceMock).not.toHaveBeenCalled()
    })

    it('preserves the API message when the errors array is empty', async () => {
        const api = new TestApi()
        axiosInstanceMock.get.mockRejectedValue({
            response: {
                status: 400,
                statusText: 'Bad Request',
                data: {
                    isSuccess: false,
                    message: 'La cuota de OpenAI fue agotada.',
                    errors: [],
                },
            },
        })

        await expect(api.get('/connection-test')).rejects.toThrow(
            'La cuota de OpenAI fue agotada.',
        )
    })

    it('shows populated validation errors before the generic API message', async () => {
        const api = new TestApi()
        axiosInstanceMock.get.mockRejectedValue({
            response: {
                status: 400,
                statusText: 'Bad Request',
                data: {
                    message: 'Solicitud invalida.',
                    errors: ['El modelo no soporta herramientas.'],
                },
            },
        })

        await expect(api.get('/connection-test')).rejects.toThrow(
            'El modelo no soporta herramientas.',
        )
    })
})
