import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../baseApi', () => ({ BaseApi: class {
    api = { get: mocks.get }
    handleError() { return new Error('Read failed') }
} }))
import { customerApi } from '../customerApi'

describe('draft customer read transport', () => {
    beforeEach(() => { mocks.get.mockReset() })
    it('preserves status for a denied customer read', async () => {
        mocks.get.mockRejectedValue({ response: { status: 403 } })
        await expect(customerApi.getCustomerById(10)).rejects.toMatchObject({ status: 403, message: 'Read failed' })
    })
    it('passes the signal to both reads without changing their envelopes', async () => {
        const signal = new AbortController().signal
        const envelope = { isSuccess: true, data: [] }
        mocks.get.mockResolvedValue({ data: envelope })
        expect(await customerApi.getCustomerById(10, signal)).toBe(envelope)
        expect(await customerApi.getCustomerAddresses(10, signal)).toBe(envelope)
        expect(mocks.get.mock.calls).toEqual([
            ['/customers/10', { signal }], ['/customers/10/addresses', { signal }],
        ])
    })
    it('preserves voluntary cancellation instead of mapping it to a transient failure', async () => {
        const cancelled = Object.assign(new Error('cancelled'), { code: 'ERR_CANCELED' })
        mocks.get.mockRejectedValue(cancelled)
        await expect(customerApi.getCustomerAddresses(10)).rejects.toBe(cancelled)
    })
})
