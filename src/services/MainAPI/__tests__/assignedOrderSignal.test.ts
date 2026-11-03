import { beforeEach, describe, expect, it, vi } from 'vitest'
const transport = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../baseApi', () => ({ BaseApi: class { get = transport.get } }))
import { orderApi } from '../orderApi'

describe('M15-F03 assigned order HTTP request', () => {
    beforeEach(() => { transport.get.mockReset().mockResolvedValue({ items: [], totalCount: 0 }) })

    it('passes cancellation to the assigned route endpoint without changing existing server filters', async () => {
        const signal = new AbortController().signal
        await orderApi.fetchAssignedOrders(7, { page: 1, pageSize: 200, status: 'OnTheWay', type: 'Delivery' }, signal)
        expect(transport.get).toHaveBeenCalledExactlyOnceWith('/orders/delivery/assigned/7', {
            params: { Page: 1, PageSize: 200, Status: 'OnTheWay', Type: 'Delivery' },
            signal,
        })
    })

    it('keeps previous history and filters working when no signal is supplied', async () => {
        await orderApi.fetchAssignedOrders(7, {
            page: 3, fromDate: '2026-10-01', toDate: '2026-10-30',
            branchId: 2, status: 'Delivered', includeOnsiteActiveInHistory: true, neighborhoodId: 5,
        })
        expect(transport.get).toHaveBeenCalledExactlyOnceWith('/orders/delivery/assigned/7', {
            params: { Page: 3, FromDate: '2026-10-01', ToDate: '2026-10-30', BranchId: 2,
                Status: 'Delivered', IncludeOnsiteActiveInHistory: true, NeighborhoodId: 5 },
        })
    })
})
