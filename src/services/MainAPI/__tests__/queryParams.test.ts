import { buildQueryParams } from '../queryParams'

describe('buildQueryParams', () => {
    it('maps camelCase filters to backend params and preserves false/zero values', () => {
        const params = buildQueryParams(
            {
                name: 'Arroz',
                active: false,
                minPrice: 0,
                page: 2,
                pageSize: 25,
                sortBy: 'name',
                sortOrder: 'asc',
            },
            {
                Name: 'name',
                Active: 'active',
                MinPrice: 'minPrice',
                Page: (filters) => filters.page ?? 1,
                PageSize: (filters) => filters.pageSize ?? 10,
                SortBy: 'sortBy',
                SortOrder: 'sortOrder',
            }
        )

        expect(params).toEqual({
            Name: 'Arroz',
            Active: false,
            MinPrice: 0,
            Page: 2,
            PageSize: 25,
            SortBy: 'name',
            SortOrder: 'asc',
        })
    })

    it('omits undefined, null, and empty string values', () => {
        const params = buildQueryParams(
            {
                name: '',
                categoryId: undefined,
                branchId: null,
                page: undefined,
            },
            {
                Name: 'name',
                CategoryId: 'categoryId',
                BranchId: 'branchId',
                Page: (filters) => filters.page,
            }
        )

        expect(params).toEqual({})
    })

    it('returns an empty object when filters are missing', () => {
        expect(
            buildQueryParams(undefined, {
                Page: () => 1,
            })
        ).toEqual({})
    })
})
