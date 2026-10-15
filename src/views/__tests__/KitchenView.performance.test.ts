import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowMount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import KitchenView from '@/views/KitchenView.vue'
import OrderCardGrid from '@/components/kitchen/OrderCardGrid.vue'

const mocks = vi.hoisted(() => ({
    getOrders: vi.fn(), fetchDetail: vi.fn(), searchOrders: vi.fn(), summary: vi.fn(),
    speak: vi.fn(), notify: vi.fn(), error: vi.fn(), push: vi.fn(),
    callbacks: {} as Record<string, (...args: any[]) => Promise<void>>,
}))
const store = reactive({
    list: null as any,
    current: null as any,
    fetchById: vi.fn(),
    updateStatus: vi.fn(),
})

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/store/auth', () => ({ useAuthStore: () => ({
    user: { branchId: 1 }, userRole: 'Kitchen', isKitchen: true,
    isAdmin: false, isSuperadmin: false,
}) }))
vi.mock('@/store/ordersData', () => ({ useOrdersDataStore: () => store }))
vi.mock('@/services/MainAPI/orderApi', () => ({ orderApi: {
    getOrders: mocks.getOrders, fetchDetail: mocks.fetchDetail,
    searchOrders: mocks.searchOrders, getKitchenSummary: mocks.summary,
} }))
vi.mock('@/composables/useSignalR', () => ({ useSignalR: () => ({
    isConnected: ref(true),
    on: (name: string, fn: (...args: any[]) => Promise<void>) => { mocks.callbacks[name] = fn },
    off: vi.fn(),
}) }))
vi.mock('@/composables/useTextToSpeech', () => ({ useTextToSpeech: () => ({
    speak: mocks.speak, cancel: vi.fn(),
}) }))
vi.mock('@/composables/useNotifications', () => ({ useNotifications: () => ({
    permission: ref('granted'), requestPermission: vi.fn(),
    notify: mocks.notify,
}) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({
    success: vi.fn(), error: mocks.error,
}) }))
vi.mock('@/services/MainAPI/printJobsApi', () => ({ printJobsApi: {
    enqueueKitchenJob: vi.fn(),
} }))

const line = (orderId: number, count = 1) => ({
    id: orderId * 10, orderId, productId: 2,
    productName: 'Arroz', productDescription: null,
    productCategoryId: 1, productCategoryName: 'Arroces',
    quantity: count, unitPrice: 18000, discount: 0, subtotal: 18000,
    notes: null, createdAt: '2026-10-15T15:00:00Z', updatedAt: '2026-10-15T15:00:00Z',
})
const order = (id: number, count = 1) => ({
    id, branchId: 1, branchName: 'Santander',
    type: 'delivery', status: 'taken', statusTimes: { taken: '2026-10-15T15:00:00Z' },
    notes: 'Sin cebolla', createdAt: '2026-10-15T15:00:00Z',
    updatedAt: '2026-10-15T15:00:00Z', prepareAt: null, reservedFor: null,
    kitchenDetails: [line(id, count)],
})
const paged = (items: any[], total: number) => ({
    items, page: 1, pageSize: 100, totalCount: total, totalPages: Math.ceil(total / 100),
})
let wrapper: VueWrapper
function mount() {
    wrapper = shallowMount(KitchenView, { global: { stubs: {
        MainLayout: { template: '<div><slot /></div>' },
    } } })
    return wrapper
}
beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(mocks.callbacks)) delete mocks.callbacks[key]
    store.list = null
    store.current = null
    mocks.summary.mockResolvedValue([])
    mocks.getOrders.mockImplementation(async () => paged([order(1)], 1))
})
afterEach(() => { wrapper?.unmount() })

describe('KitchenView batched requests and event refresh', () => {
    it('loads every page and renders embedded lines without N detail requests', async () => {
        mocks.getOrders.mockImplementation(async ({ page }) => {
            const start = page === 1 ? 1 : 101
            const stop = page === 1 ? 100 : 105
            return paged(Array.from({ length: stop - start + 1 }, (_, i) => order(start + i)), 105)
        })
        mount()
        await flushPromises()
        expect(mocks.getOrders).toHaveBeenCalledTimes(2)
        expect(mocks.getOrders).toHaveBeenNthCalledWith(1, expect.objectContaining({
            forKitchen: true, page: 1, sortBy: 'id', pageSize: 100,
        }))
        expect(mocks.getOrders).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2 }))
        expect(store.list.items).toHaveLength(105)
        expect(mocks.fetchDetail).not.toHaveBeenCalled()
        const cache = wrapper.findComponent(OrderCardGrid).props('orderItemsMap') as Map<number, any[]>
        expect(cache.get(105)?.[0]?.quantity).toBe(1)
    })

    it('coalesces concurrent SignalR events and updates quantities instead of stale cache', async () => {
        mount()
        await flushPromises()
        expect(mocks.getOrders).toHaveBeenCalledTimes(1)
        mocks.getOrders.mockImplementation(async () => paged([order(1, 3)], 1))
        await Promise.all([
            mocks.callbacks.NewOrder!({ id: 1 }),
            mocks.callbacks.OrderModified!({ order: { id: 1 }, modificationKind: 'content' }),
        ])
        await flushPromises()
        expect(mocks.getOrders).toHaveBeenCalledTimes(2)
        expect(mocks.fetchDetail).not.toHaveBeenCalled()
        const cache = wrapper.findComponent(OrderCardGrid).props('orderItemsMap') as Map<number, any[]>
        expect(cache.get(1)?.[0]?.quantity).toBe(3)
    })

    it('loads the selected-day summary without scanning historical order pages', async () => {
        mocks.summary.mockResolvedValue([{
            id: 1, status: 'taken', prepareAt: null,
            createdAt: '2026-10-15T15:00:00Z', kitchenDetails: [line(1, 4)],
        }])
        mount()
        await flushPromises()
        const button = wrapper.findAll('button').find(b => b.text().includes('Resumen por hora'))
        expect(button).toBeTruthy()
        await button!.trigger('click')
        await flushPromises()
        expect(mocks.summary).toHaveBeenCalledWith(expect.any(String), 1)
        expect(mocks.searchOrders).not.toHaveBeenCalled()
        expect(mocks.fetchDetail).not.toHaveBeenCalled()
    })
})
