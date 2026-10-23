import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowMount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import KitchenView from '@/views/KitchenView.vue'
import OrderCardGrid from '@/components/kitchen/OrderCardGrid.vue'
import { defaultBusinessCalendar } from '@/utils/datetime'

const mocks = vi.hoisted(() => ({
    getOrders: vi.fn(), fetchDetail: vi.fn(), searchOrders: vi.fn(), summary: vi.fn(), voiceEvents: vi.fn(),
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
    user: { id: 10, branchId: 1 }, userRole: 'Kitchen', isKitchen: true,
    isAdmin: false, isSuperadmin: false,
}) }))
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => ({ selectedBranchId: 1, revision: 0 }) }))
vi.mock('@/store/ordersData', () => ({ useOrdersDataStore: () => store }))
vi.mock('@/services/MainAPI/orderApi', () => ({ orderApi: {
    getOrders: mocks.getOrders, fetchDetail: mocks.fetchDetail,
    searchOrders: mocks.searchOrders, getKitchenSummary: mocks.summary,
    getKitchenVoiceEvents: mocks.voiceEvents,
} }))
vi.mock('@/composables/useSignalR', () => ({ useSignalR: () => ({
    isConnected: ref(true),
    on: (name: string, fn: (...args: any[]) => Promise<void>) => { mocks.callbacks[name] = fn },
    off: vi.fn(),
}) }))
vi.mock('@/composables/useTextToSpeech', () => ({ useTextToSpeech: () => ({
    speak: mocks.speak, cancel: vi.fn(), lastError: ref(null),
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

const line = (orderId: number, count = 1, notes: string | null = null) => ({
    id: orderId * 10, orderId, productId: 2,
    productName: 'Arroz', productDescription: null,
    productCategoryId: 1, productCategoryName: 'Arroces',
    quantity: count, unitPrice: 18000, discount: 0, subtotal: 18000,
    notes, createdAt: '2026-10-15T15:00:00Z', updatedAt: '2026-10-15T15:00:00Z',
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
    mocks.speak.mockResolvedValue(true)
    mocks.voiceEvents.mockResolvedValue({ cursor: 0, hasMore: false, events: [] })
    localStorage.clear()
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
    it('recovers a missed order from the cursor and only announces it once', async () => {
        mocks.voiceEvents.mockResolvedValue({
            cursor: 19, hasMore: false,
            events: [{ id: 19, orderId: 1, branchId: 1, kind: 'new' }],
        })
        mount()
        await flushPromises()
        const enable = wrapper.findAll('button').find(b => b.text().includes('Activar voz'))
        expect(enable).toBeTruthy()
        await enable!.trigger('click')
        await flushPromises()
        expect(mocks.voiceEvents).toHaveBeenCalled()
        expect(mocks.speak).toHaveBeenCalledWith('Listo')
        expect(mocks.speak).toHaveBeenCalledWith(expect.stringContaining('Nuevo pedido'))
        expect(localStorage.getItem(`senor-arroz:kitchen-voice:10:1:${defaultBusinessCalendar.todayYmd()}`)).toBe('19')
        await mocks.callbacks.NewOrder!({ id: 1 })
        await flushPromises()
        expect(mocks.speak).toHaveBeenCalledTimes(2)
    })

    it.each(['new', 'reservation'])('reads the product note for a %s event', async kind => {
        mocks.getOrders.mockResolvedValue(paged([{ ...order(1), kitchenDetails: [line(1, 2, 'Salsa aparte')] }], 1))
        mocks.voiceEvents.mockResolvedValue({ cursor: 30, hasMore: false, events: [{ id: 30, orderId: 1, branchId: 1, kind }] })
        mount()
        await flushPromises()
        await wrapper.findAll('button').find(b => b.text().includes('Activar voz'))!.trigger('click')
        await flushPromises()
        const speech = mocks.speak.mock.calls.at(-1)![0]
        expect(speech).toContain(kind === 'new' ? 'Nuevo pedido' : 'Reserva lista para cocina')
        expect(speech).toContain('dos Arroz, nota: Salsa aparte.')
        expect(speech).toContain('Notas generales del pedido: Sin cebolla')
        expect(mocks.notify).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: expect.stringContaining('2x Arroz (Nota: Salsa aparte)') }))
        expect(mocks.fetchDetail).not.toHaveBeenCalled()
    })

    it.each([
        [null, 'Sin salsa', 'Se agregó'],
        ['Sin salsa', 'Salsa aparte', 'Se cambió'],
        ['Salsa aparte', '', 'Se eliminó'],
    ])('refreshes and announces a product note change: %s -> %s', async (previousNotes, notes, action) => {
        mount()
        await flushPromises()
        await wrapper.findAll('button').find(b => b.text().includes('Activar voz'))!.trigger('click')
        await flushPromises()
        mocks.speak.mockClear()
        mocks.getOrders.mockResolvedValue(paged([{ ...order(1), kitchenDetails: [line(1, 1, notes)] }], 1))
        await mocks.callbacks.OrderModified!({ order: { id: 1 }, modificationKind: 'content', kitchenChanges: {
            lineNoteChanges: [{ productName: 'Arroz', quantity: 1, previousNotes, notes }],
        } })
        const instruction = notes ? `: ${notes}.` : '.'
        expect(mocks.speak).toHaveBeenCalledWith(expect.stringContaining(`${action} la nota para una Arroz${instruction}`))
        const cache = wrapper.findComponent(OrderCardGrid).props('orderItemsMap') as Map<number, any[]>
        expect(cache.get(1)![0].notes).toBe(notes)
        expect(mocks.fetchDetail).not.toHaveBeenCalled()
    })

    it('includes product notes when announcing an order transferred into the branch', async () => {
        mocks.getOrders.mockResolvedValue(paged([{ ...order(1), kitchenDetails: [line(1, 1, 'Sin salsa')] }], 1))
        mount()
        await flushPromises()
        await wrapper.findAll('button').find(b => b.text().includes('Activar voz'))!.trigger('click')
        await flushPromises()
        await mocks.callbacks.OrderTransferred!({ orderId: 1, targetBranchId: 1, announceKitchen: true })
        expect(mocks.speak).toHaveBeenCalledWith(expect.stringContaining('Pedido trasladado, una Arroz, nota: Sin salsa.'))
    })

    it('does not acknowledge a browser-rejected voice alert', async () => {
        mocks.speak.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
        mocks.voiceEvents.mockResolvedValue({
            cursor: 22, hasMore: false,
            events: [{ id: 22, orderId: 1, branchId: 1, kind: 'new' }],
        })
        mount()
        await flushPromises()
        const enable = wrapper.findAll('button').find(b => b.text().includes('Activar voz'))
        await enable!.trigger('click')
        await flushPromises()
        expect(localStorage.getItem(`senor-arroz:kitchen-voice:10:1:${defaultBusinessCalendar.todayYmd()}`)).toBe('21') // bootstrap cursor retained; failed utterance 22 remains pending
        expect(wrapper.text()).toContain('No se pudo reproducir el anuncio')
    })

    it('retains arrivals while the operator has not enabled browser audio', async () => {
        mocks.voiceEvents.mockResolvedValue({
            cursor: 41, hasMore: false,
            events: [{ id: 41, orderId: 1, branchId: 1, kind: 'new' }],
        })
        mount()
        await flushPromises()
        expect(mocks.speak).not.toHaveBeenCalled()
        expect(localStorage.getItem(`senor-arroz:kitchen-voice:10:1:${defaultBusinessCalendar.todayYmd()}`)).toBe('40')
        const enable = wrapper.findAll('button').find(b => b.text().includes('Activar voz'))
        await enable!.trigger('click')
        await flushPromises()
        expect(mocks.speak).toHaveBeenCalledWith(expect.stringContaining('Nuevo pedido'))
        expect(localStorage.getItem(`senor-arroz:kitchen-voice:10:1:${defaultBusinessCalendar.todayYmd()}`)).toBe('41')
    })

})
