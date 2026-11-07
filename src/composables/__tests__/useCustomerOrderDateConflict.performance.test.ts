import { beforeEach, describe, expect, it, vi } from 'vitest'
import { orderApi } from '@/services/MainAPI/orderApi'
import { findCustomerOrdersOnSameBusinessDate } from '@/composables/useCustomerOrderDateConflict'

vi.mock('@/services/MainAPI/orderApi', () => ({
    orderApi: { searchOrders: vi.fn() },
}))

const search = vi.mocked(orderApi.searchOrders)
const page = (items: Array<Record<string, unknown>>, totalPages = 1) => ({
    items, totalPages, page: 1, pageSize: 150, totalCount: 150 * totalPages,
}) as Awaited<ReturnType<typeof orderApi.searchOrders>>

describe('M09-F07 POS pre-submit duplicate-date search', () => {
    beforeEach(() => search.mockReset())

    it('filters the complete Colombia operational day server-side when checking CreatedAt', async () => {
        search.mockResolvedValue(page([
            { id: 100, createdAt: '2026-11-07T04:59:00Z', reservedFor: '2026-11-07T18:00:00Z' },
            { id: 101, createdAt: '2026-11-07T05:00:00Z' },
            { id: 102, createdAt: '2026-11-08T04:59:00Z' },
            { id: 103, createdAt: '2026-11-08T05:00:00Z' },
        ]))
        const items = await findCustomerOrdersOnSameBusinessDate({
            customerId: 44, targetDate: new Date('2026-11-07T16:00:00Z'), compareByPrepareAt: false,
        })
        expect(items.map(item => item.id)).toEqual([101, 102])
        expect(search).toHaveBeenCalledTimes(1)
        expect(search).toHaveBeenCalledWith(expect.objectContaining({
            customerId: 44, fromDate: '2026-11-07', toDate: '2026-11-07',
            excludeFutureReservations: false, page: 1, pageSize: 150,
        }))
    })

    it('uses the same bounded date filter on every page and preserves all matching conflicts', async () => {
        search.mockResolvedValueOnce(page([
            { id: 111, createdAt: '2026-11-07T06:00:00Z' },
        ], 2)).mockResolvedValueOnce(page([
            { id: 112, createdAt: '2026-11-07T07:00:00Z' },
            { id: 111, createdAt: '2026-11-07T06:00:00Z' },
        ], 2))
        const result = await findCustomerOrdersOnSameBusinessDate({
            customerId: 4, targetDate: new Date('2026-11-07T16:00:00Z'), compareByPrepareAt: false,
        })
        expect(result.map(x => x.id)).toEqual([111, 112])
        expect(search).toHaveBeenCalledTimes(2)
        for (const [index, args] of search.mock.calls.entries()) {
            expect(args[0]).toMatchObject({ customerId: 4, fromDate: '2026-11-07',
                toDate: '2026-11-07', page: index + 1 })
        }
    })

    it('keeps the original unbounded history query for scheduled orders compared by PrepareAt', async () => {
        search.mockResolvedValue(page([
            { id: 120, createdAt: '2026-10-05T13:00:00Z', prepareAt: '2026-11-07T17:00:00Z' },
            { id: 121, createdAt: '2026-11-01T14:00:00Z', prepareAt: '2026-11-08T05:00:00Z' },
        ]))
        const items = await findCustomerOrdersOnSameBusinessDate({
            customerId: 4, targetDate: new Date('2026-11-07T17:00:00Z'), compareByPrepareAt: true,
        })
        expect(items.map(item => item.id)).toEqual([120])
        expect(search).toHaveBeenCalledTimes(1)
        expect(search.mock.calls[0]?.[0]).not.toHaveProperty('fromDate')
        expect(search.mock.calls[0]?.[0]).not.toHaveProperty('toDate')
        expect(search.mock.calls[0]?.[0]).toMatchObject({
            customerId: 4, excludeFutureReservations: false, pageSize: 150,
        })
    })
})
