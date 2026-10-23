import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrderItemList from '../OrderItemList.vue'

const deps = vi.hoisted(() => ({
    store: {} as Record<string, any>,
    remove: vi.fn(), confirm: vi.fn(),
}))
vi.mock('@/store/ordersDrafts', () => ({ useOrdersDraftsStore: () => deps.store }))
vi.mock('@/store/branchPosSettings', () => ({ useBranchPosSettingsStore: () => ({ maxFreeDeliveryDiscount: 3000, ensureForBranch: vi.fn().mockResolvedValue(undefined) }) }))
vi.mock('@/composables/useOrderItems', () => ({ useOrderItems: () => ({ removeItem: deps.remove }) }))
vi.mock('@/composables/useDialog', () => ({ useDialog: () => ({ confirmDialog: deps.confirm }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

function render(compact = true) {
    return mount(OrderItemList, { props: { tabId: 'one', compact }, global: { stubs: { OrderItem: true } } })
}

describe('compact product list', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        deps.store.currentOrder = {
            type: 'delivery', branchId: 1, deliveryFee: 3000, subtotal: 18000, total: 21000, discountTotal: 2000,
            orderItems: [{ tempId: 'rice', productName: 'Arroz', quantity: 2, subtotal: 18000 }],
        }
        deps.store.recalculateTotals = vi.fn()
        deps.store.saveToLocalStorage = vi.fn()
        deps.confirm.mockResolvedValue(false)
    })

    it('renders every product and retains amounts without repeating the footer total', () => {
        const wrapper = render()
        expect(wrapper.findAllComponents({ name: 'OrderItem' })).toHaveLength(1)
        expect(wrapper.text()).not.toContain('Productos · 2 uds.')
        expect(wrapper.findAll('button').some(button => button.text() === 'Limpiar')).toBe(false)
        expect(wrapper.text()).toContain('18.000')
        expect(wrapper.text()).toContain('2.000')
        expect(wrapper.text()).not.toContain('Total:')
        wrapper.unmount()
    })

    it('keeps the clear confirmation and does not remove products when cancelled', async () => {
        const wrapper = render(false)
        await wrapper.findAll('button').find(button => button.text() === 'Limpiar')!.trigger('click')
        await flushPromises()
        expect(deps.confirm).toHaveBeenCalledOnce()
        expect(deps.remove).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('does not reserve a summary or duplicate controls for an empty order', () => {
        deps.store.currentOrder.orderItems = []
        const wrapper = render()
        expect(wrapper.text()).toContain('No hay productos')
        expect(wrapper.text()).not.toContain('Subtotal:')
        expect(wrapper.findAll('button').some(button => button.text() === 'Limpiar')).toBe(false)
        wrapper.unmount()
    })
})
