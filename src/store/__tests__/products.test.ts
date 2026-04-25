import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProductsStore } from '../products'
import type { Product, ProductDetail } from '@/types/product'
import type { ApiResponse, PagedResult } from '@/types/common'

const { productApiMock } = vi.hoisted(() => ({
    productApiMock: {
        getProducts: vi.fn(),
        getProductById: vi.fn(),
        getProductDetail: vi.fn(),
        createProduct: vi.fn(),
        updateProduct: vi.fn(),
        deleteProduct: vi.fn(),
        adjustStock: vi.fn(),
    },
}))

vi.mock('@/services/MainAPI/productApi', () => ({
    productApi: productApiMock,
}))

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
    id: 1,
    branchId: 1,
    branchName: 'Centro',
    categoryId: 1,
    categoryName: 'Principales',
    name: 'Arroz mixto',
    description: null,
    price: 25000,
    stock: 10,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    imageUrl: null,
    weightGrams: null,
    ...overrides,
})

describe('products store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('fetches and stores the paged product list', async () => {
        const store = useProductsStore()
        const payload: PagedResult<Product> = {
            items: [makeProduct()],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }

        productApiMock.getProducts.mockResolvedValue({
            data: payload,
        } satisfies ApiResponse<PagedResult<Product>>)

        await store.fetch({ page: 1, pageSize: 10 })

        expect(productApiMock.getProducts).toHaveBeenCalledWith({ page: 1, pageSize: 10 })
        expect(store.list).toEqual(payload)
        expect(store.currentProducts).toEqual(payload.items)
        expect(store.totalProducts).toBe(1)
        expect(store.error).toBeNull()
    })

    it('creates a product and prepends it to the current list', async () => {
        const store = useProductsStore()
        store.list = {
            items: [makeProduct()],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }

        const created = makeProduct({ id: 2, name: 'Arroz chino' })
        productApiMock.createProduct.mockResolvedValue({
            data: created,
        } satisfies ApiResponse<Product>)

        const result = await store.create({ name: 'Arroz chino' } as never)

        expect(result).toEqual(created)
        expect(store.list.items[0]).toEqual(created)
        expect(store.list.totalCount).toBe(2)
    })

    it('updates the current product and replaces it in the list', async () => {
        const store = useProductsStore()
        const existing = makeProduct()
        store.list = {
            items: [existing],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        store.current = existing

        const updated = makeProduct({ name: 'Arroz especial', price: 30000 })
        productApiMock.updateProduct.mockResolvedValue({
            data: updated,
        } satisfies ApiResponse<Product>)

        const result = await store.update(1, { name: 'Arroz especial' } as never)

        expect(result).toEqual(updated)
        expect(store.current).toEqual(updated)
        expect(store.list.items[0]).toEqual(updated)
    })

    it('removes a product from the list and clears current detail when deleted', async () => {
        const store = useProductsStore()
        const existing = makeProduct()
        store.list = {
            items: [existing],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        store.current = existing
        store.currentDetail = {
            ...existing,
            totalSales: 5,
            totalRevenue: 100000,
        } as ProductDetail

        productApiMock.deleteProduct.mockResolvedValue({
            data: 'ok',
        } satisfies ApiResponse<string>)

        await store.remove(existing.id)

        expect(store.list.items).toEqual([])
        expect(store.list.totalCount).toBe(0)
        expect(store.current).toBeNull()
        expect(store.currentDetail).toBeNull()
    })

    it('adjusts stock in the list and current product', async () => {
        const store = useProductsStore()
        const existing = makeProduct({ stock: 4 })
        store.list = {
            items: [existing],
            totalCount: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
        }
        store.current = { ...existing }

        productApiMock.adjustStock.mockResolvedValue({
            data: 7,
        } satisfies ApiResponse<number>)

        const result = await store.adjustStock(existing.id, { quantity: 3 } as never)

        expect(result).toBe(7)
        expect(store.list.items[0].stock).toBe(7)
        expect(store.current?.stock).toBe(7)
    })

    it('sets the store error when an API action fails', async () => {
        const store = useProductsStore()
        productApiMock.getProducts.mockRejectedValue(new Error('fallo remota'))

        await expect(store.fetch()).rejects.toThrow('fallo remota')
        expect(store.error).toBe('fallo remota')
        expect(store.isLoading).toBe(false)
    })
})
