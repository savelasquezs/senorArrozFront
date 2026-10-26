import { afterEach, describe, expect, it, vi } from 'vitest'
import { BaseApi } from '@/services/MainAPI/baseApi'
import { buildExpenseHeaderQueryParams, expenseHeaderApi } from '@/services/MainAPI/expenseHeaderApi'

describe('buildExpenseHeaderQueryParams', () => {
    it('serializa una categoria string como un solo CategoryNames', () => {
        const params = buildExpenseHeaderQueryParams({
            fromDate: '2026-05-01',
            toDate: '2026-05-31',
            categoryNames: 'Apps' as unknown as string[],
            page: 1,
            pageSize: 50,
            sortBy: 'id',
            sortOrder: 'desc',
        })

        expect(params.getAll('CategoryNames')).toEqual(['Apps'])
        expect(params.toString()).toContain('CategoryNames=Apps')
        expect(params.toString()).not.toContain('CategoryNames=A&CategoryNames=p')
    })

    it('serializa filtros multiples repitiendo el nombre del parametro', () => {
        const params = buildExpenseHeaderQueryParams({
            categoryNames: ['Aseo', 'Nomina'],
            bankNames: ['Bancolombia', 'Nequi'],
            supplierIds: [1, 2],
        })

        expect(params.getAll('CategoryNames')).toEqual(['Aseo', 'Nomina'])
        expect(params.getAll('BankNames')).toEqual(['Bancolombia', 'Nequi'])
        expect(params.getAll('SupplierIds')).toEqual(['1', '2'])
        expect(params.get('Page')).toBe('1')
        expect(params.get('PageSize')).toBe('10')
    })

    it('omite filtros vacios y conserva el texto escrito limpio', () => {
        const params = buildExpenseHeaderQueryParams({
            categoryNames: [' ', 'Aseo'],
            bankNames: [],
            supplierIds: [],
            expenseName: '  servilleta  ',
        })

        expect(params.getAll('CategoryNames')).toEqual(['Aseo'])
        expect(params.getAll('BankNames')).toEqual([])
        expect(params.getAll('SupplierIds')).toEqual([])
        expect(params.get('ExpenseName')).toBe('servilleta')
    })
})

describe('expense list cancellation at the HTTP boundary', () => {
    afterEach(() => vi.restoreAllMocks())

    it('forwards AbortSignal while preserving all page/filter query parameters', async () => {
        const signal = new AbortController().signal
        const get = vi.spyOn(BaseApi.prototype, 'get').mockResolvedValue({
            items: [], totalCount: 0, page: 3, pageSize: 25, totalPages: 0,
        })
        await expenseHeaderApi.getExpenseHeaders({
            page: 3, pageSize: 25, expenseName: 'caja', categoryNames: ['Operación'],
        }, signal)
        expect(get).toHaveBeenCalledTimes(1)
        const [url, config] = get.mock.calls[0]!
        expect(url).toBe('/expenseheaders')
        expect(config?.signal).toBe(signal)
        expect((config?.params as URLSearchParams).get('Page')).toBe('3')
        expect((config?.params as URLSearchParams).get('PageSize')).toBe('25')
        expect((config?.params as URLSearchParams).getAll('CategoryNames')).toEqual(['Operación'])
    })
})
