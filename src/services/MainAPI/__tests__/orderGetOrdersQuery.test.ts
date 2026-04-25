import { buildQueryParams } from '../queryParams'
import { orderGetOrdersQueryMapper } from '../orderApi'
import type { OrderFilters } from '@/types/order'

describe('orderGetOrdersQueryMapper + buildQueryParams', () => {
    it('defaults Page and PageSize when absent', () => {
        const params = buildQueryParams(
            {} as OrderFilters,
            orderGetOrdersQueryMapper
        )
        expect(params).toEqual({ Page: 1, PageSize: 10 })
    })

    it('maps PascalCase keys like the previous manual getOrders params', () => {
        const params = buildQueryParams(
            {
                branchId: 3,
                customerId: 99,
                type: 'delivery',
                status: 'taken',
                fromDate: '2026-01-01',
                toDate: '2026-01-31',
                forKitchen: true,
                page: 2,
                pageSize: 50,
            } as OrderFilters,
            orderGetOrdersQueryMapper
        )

        expect(params).toEqual({
            BranchId: 3,
            CustomerId: 99,
            Type: 'delivery',
            Status: 'taken',
            FromDate: '2026-01-01',
            ToDate: '2026-01-31',
            ForKitchen: true,
            Page: 2,
            PageSize: 50,
        })
    })

    it('includes BranchId and CustomerId when zero', () => {
        const params = buildQueryParams(
            {
                branchId: 0,
                customerId: 0,
                page: 1,
                pageSize: 10,
            } as OrderFilters,
            orderGetOrdersQueryMapper
        )
        expect(params.BranchId).toBe(0)
        expect(params.CustomerId).toBe(0)
    })

    it('includes ForKitchen when false', () => {
        const params = buildQueryParams(
            {
                forKitchen: false,
                page: 1,
                pageSize: 10,
            } as OrderFilters,
            orderGetOrdersQueryMapper
        )
        expect(params.ForKitchen).toBe(false)
    })

    it('omits optional fields when undefined or empty string', () => {
        const params = buildQueryParams(
            {
                branchId: undefined,
                customerId: undefined,
                type: undefined,
                status: undefined,
                fromDate: undefined,
                toDate: undefined,
                forKitchen: undefined,
                page: 1,
                pageSize: 10,
            } as OrderFilters,
            orderGetOrdersQueryMapper
        )
        expect(params).toEqual({ Page: 1, PageSize: 10 })
    })
})
