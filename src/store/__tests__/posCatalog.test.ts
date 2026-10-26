import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProductsStore } from '../products'
import { useAuthStore } from '../auth'
import type { Product } from '@/types/product'

const api = vi.hoisted(() => ({ products: vi.fn(), availability: vi.fn() }))
vi.mock('@/services/MainAPI/productApi', () => ({ productApi: { getProducts: api.products } }))
vi.mock('@/services/MainAPI/inventoryApi', () => ({ inventoryApi: { getAvailability: api.availability } }))
const product = (id: number, extra = {}) => ({ id, name: `Product ${id}`, active: true, stock: null,
    inventoryEnabled: false, inventoryControlMode: 'estimated', ...extra }) as Product
const page = (items: Product[], totalPages = 1) => ({ data: { items, page: 1, pageSize: 150, totalCount: totalPages === 1 ? items.length : 151, totalPages } })

describe('POS catalog ownership', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.resetAllMocks()
        api.availability.mockResolvedValue([])
    })
    it('loads every catalog page and keeps administrative searches independent', async () => {
        api.products.mockResolvedValueOnce(page([product(1)], 2)).mockResolvedValueOnce(page([product(151)], 2))
            .mockResolvedValueOnce(page([product(999)]))
        const store = useProductsStore()
        await Promise.all([store.ensureCatalogLoaded(1), store.ensureCatalogLoaded(1)])
        expect(api.products).toHaveBeenCalledTimes(2)
        expect(store.catalogProducts.map(p => p.id)).toEqual([1, 151])
        await store.fetch({ page: 1, pageSize: 10 })
        expect(store.list?.items.map(p => p.id)).toEqual([999])
        expect(store.catalogProducts.map(p => p.id)).toEqual([1, 151])
    })
    it('treats an empty successful catalog as loaded', async () => {
        api.products.mockResolvedValue(page([]))
        const store = useProductsStore()
        await store.ensureCatalogLoaded(1)
        await store.ensureCatalogLoaded(1)
        expect(api.products).toHaveBeenCalledOnce()
        expect(api.availability).not.toHaveBeenCalled()
        expect(store.catalogLoaded).toBe(true)
    })
    it('keeps strict stock unknown and retryable after availability fails', async () => {
        api.products.mockResolvedValue(page([product(1, { inventoryEnabled: true, inventoryControlMode: 'strict' })]))
        api.availability.mockRejectedValueOnce(new Error('network'))
            .mockResolvedValueOnce([{ productId: 1, controlMode: 'strict', maximumQuantity: 4, available: true }])
        const store = useProductsStore()
        await expect(store.ensureCatalogLoaded(1)).rejects.toThrow('network')
        expect(store.catalogProducts[0].availabilityPending).toBe(true)
        expect(store.catalogLoaded).toBe(false)
        await store.ensureCatalogLoaded(1)
        expect(store.catalogProducts[0]).toMatchObject({ availabilityPending: false, stock: 4 })
    })
    it('cannot restore an old catalog after the identity changes', async () => {
        let resolve!: (value: ReturnType<typeof page>) => void
        api.products.mockReturnValue(new Promise(done => { resolve = done }))
        const store = useProductsStore()
        const pending = store.ensureCatalogLoaded(1)
        useAuthStore().user = { id: 8, role: 'Admin', branchId: 1 } as never
        resolve(page([product(1)]))
        await pending
        expect(store.catalogProducts).toEqual([])
        expect(store.catalogLoaded).toBe(false)
        expect(api.availability).not.toHaveBeenCalled()
    })
})
