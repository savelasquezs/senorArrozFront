import { beforeEach, describe, expect, it, vi } from 'vitest'
const apiMock = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../baseApi', () => ({ BaseApi: class { get = apiMock.get } }))
import { orderApi } from '../orderApi'
describe('M10-F03 detail HTTP transport', () => {
    beforeEach(() => { apiMock.get.mockReset() })
    it('forwards the signal to the existing detail endpoint', async () => {
        const signal = new AbortController().signal
        apiMock.get.mockResolvedValue({ id: 7 })
        await orderApi.fetchDetail(7, signal)
        expect(apiMock.get).toHaveBeenCalledWith('/orders/7/details', { signal })
    })
})
