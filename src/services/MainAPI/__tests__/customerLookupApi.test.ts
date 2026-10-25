import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CanceledError } from 'axios'
const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../baseApi', () => ({ BaseApi: class {
    api = { get: mocks.get }
    handleError() { return new Error('Request failed') }
} }))
import { CustomerLookupApi } from '../customerLookupApi'
const api = new CustomerLookupApi()
const response = (data: unknown) => ({ data: { data } })

describe('customer lookup transport', () => {
    beforeEach(() => { mocks.get.mockReset() })
    it('passes the branch, page and abort signal to the lightweight endpoint', async () => {
        const signal = new AbortController().signal
        mocks.get.mockResolvedValue(response({ items: [], page: 2, hasMore: false }))
        await api.search('Ana', 2, 2, signal)
        expect(mocks.get).toHaveBeenCalledWith('/customers/lookup', { params: { search: 'Ana', branchId: 2, page: 2 }, signal })
    })
    it('supports an older API only when the new route is unavailable', async () => {
        const signal = new AbortController().signal
        mocks.get.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce(response({
            items: [{ id: 1, branchId: 1, name: 'Test', addresses: ['not part of suggestions'] }], page: 1, totalPages: 3,
        }))
        const result = await api.search('Test', 1, 1, signal)
        expect(mocks.get.mock.calls[1]).toEqual(['/customers', { params: { search: 'Test', branchId: 1, page: 1, pageSize: 10, active: true }, signal }])
        expect(result.hasMore).toBe(true); expect(result.items[0]).not.toHaveProperty('addresses')
    })
    it.each([401, 403, 500])('never retries authorization/server failure %s through a different route', async status => {
        mocks.get.mockRejectedValue({ response: { status } })
        await expect(api.search('Ana', 1)).rejects.toThrow('Request failed')
        expect(mocks.get).toHaveBeenCalledTimes(1)
    })
    it('preserves cancellation and never launches a fallback request after abort', async () => {
        const controller = new AbortController(); controller.abort()
        mocks.get.mockRejectedValue(new CanceledError('cancelled'))
        await expect(api.search('Ana', 1, 1, controller.signal)).rejects.toBeInstanceOf(CanceledError)
        expect(mocks.get).toHaveBeenCalledTimes(1)
    })
    it('hydrates the complete customer with the same cancellation token', async () => {
        const signal = new AbortController().signal, customer = { id: 1, active: true, addresses: [{ id: 2 }], loyaltyRewardDueOnCurrentOrder: true }
        mocks.get.mockResolvedValue(response(customer))
        expect(await api.getCustomer(1, signal)).toEqual(customer)
        expect(mocks.get).toHaveBeenCalledWith('/customers/lookup/1', { params: undefined, signal })
    })
    it('can hydrate through the existing endpoint during an API rollback', async () => {
        mocks.get.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValueOnce(response({ id: 1, active: true }))
        expect((await api.getCustomer(1)).id).toBe(1)
        expect(mocks.get.mock.calls[1]![0]).toBe('/customers/1')
    })
})
