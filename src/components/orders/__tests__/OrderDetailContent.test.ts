import { flushPromises, shallowMount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrderDetailView } from '@/types/order'
import OrderDetailContent from '../OrderDetailContent.vue'

const deps = vi.hoisted(() => ({ store: {} as Record<string, any>, update: vi.fn(), options: vi.fn() }))
vi.mock('@/store/ordersData', () => ({ useOrdersDataStore: () => deps.store }))
vi.mock('@/store/auth', () => ({ useAuthStore: () => ({ userRole: 'Admin', isAdmin: true, branchId: 1 }) }))
vi.mock('@/store/products', () => ({ useProductsStore: () => ({ currentProducts: [], ensureCatalogLoaded: vi.fn() }) }))
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => ({ selectedBranchId: 1 }) }))
vi.mock('@/services/MainAPI/orderManagementApi', () => ({ orderManagementApi: { options: deps.options } }))
vi.mock('@/composables/useOrderManagementUpdates', () => ({ useOrderManagementUpdates: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

function fixture(overrides = {}): OrderDetailView {
    return {
        id: 81, branchId: 1, branchName: 'Santander', type: 'reservation', typeDisplayName: 'Reserva',
        status: 'taken', statusTimes: {}, takenByName: 'Caja', guestName: 'Cliente de prueba',
        customerId: null, addressId: 12, addressDescription: 'Dirección de prueba',
        createdAt: '2026-10-22T15:00:00Z', updatedAt: '2026-10-22T15:00:00Z',
        reservedFor: '2026-10-24T19:00:00Z', prepareAt: '2026-10-24T18:00:00Z', managementVersion: 1,
        deliveryFee: 20000, total: 105400, subtotal: 85400, discountTotal: 0,
        bankPayments: [], appPayments: [], reservationDeposits: [{ id: 11, amount: 10000 }],
        orderDetails: [{ id: 1, productId: 1, productName: 'Arroz familiar', quantity: 1, unitPrice: 85400, discount: 0, subtotal: 85400 }],
        ...overrides,
    } as unknown as OrderDetailView
}

function mountDetail() {
    return shallowMount(OrderDetailContent, {
        props: { flatOrder: deps.store.current },
        global: { stubs: { OrderDetailProductsList: false, OrderDeliveryFeeEditor: false, BaseButton: false, BaseInput: false } },
    })
}

describe('OrderDetailContent presentation and reservation delivery fee', () => {
    beforeEach(() => {
        deps.options.mockResolvedValue({ banks: [], apps: [], deliverymen: [], maxFreeDeliveryDiscount: 0 })
        deps.update.mockReset().mockImplementation(async (_id, payload) => {
            deps.store.current = { ...deps.store.current, ...payload, total: 85400 + payload.deliveryFee }
            return deps.store.current
        })
        deps.store = reactive({ current: fixture(), update: deps.update })
    })

    it('labels all tabs and supports arrows, Home and End with linked panels', async () => {
        const wrapper = mountDetail()
        await flushPromises()
        const tabs = wrapper.findAll('[role="tab"]')
        expect(wrapper.findComponent({ name: 'OrderDetailProductsList' }).exists()).toBe(false)
        expect(tabs.map(tab => tab.text())).toEqual(['Información', 'Productos', 'Pagos'])
        expect(tabs[0]!.attributes('aria-selected')).toBe('true')
        await tabs[0]!.trigger('keydown', { key: 'ArrowRight' })
        expect(tabs[1]!.attributes('tabindex')).toBe('0')
        const panel = wrapper.get(`[id="${tabs[1]!.attributes('aria-controls')}"]`)
        expect(panel.isVisible()).toBe(true)
        expect(panel.attributes('aria-labelledby')).toBe(tabs[1]!.attributes('id'))
        await tabs[1]!.trigger('keydown', { key: 'End' })
        expect(tabs[2]!.attributes('aria-selected')).toBe('true')
        await tabs[2]!.trigger('keydown', { key: 'Home' })
        expect(tabs[0]!.attributes('aria-selected')).toBe('true')
        wrapper.unmount()
    })

    it('saves only deliveryFee from Products and preserves the reservation, schedule and deposits', async () => {
        const wrapper = mountDetail()
        await flushPromises()
        await wrapper.findAll('[role="tab"]')[1]!.trigger('click')
        const panel = wrapper.findAll('[role="tabpanel"]')[1]!
        await panel.get('[aria-label="Editar tarifa de domicilio"]').trigger('click')
        await panel.get('input').setValue(3500)
        // Visiting another tab must preserve the entered value.
        await wrapper.findAll('[role="tab"]')[2]!.trigger('click')
        await wrapper.findAll('[role="tab"]')[1]!.trigger('click')
        expect((panel.get('input').element as HTMLInputElement).value).toBe('3500')
        await panel.get('input').trigger('keydown', { key: 'Enter' })
        await flushPromises()
        expect(deps.update).toHaveBeenCalledExactlyOnceWith(81, { deliveryFee: 3500 })
        expect(deps.store.current.type).toBe('reservation')
        expect(deps.store.current.reservedFor).toBe('2026-10-24T19:00:00Z')
        expect(deps.store.current.prepareAt).toBe('2026-10-24T18:00:00Z')
        expect(deps.store.current.reservationDeposits).toEqual([{ id: 11, amount: 10000 }])
        expect(wrapper.text()).toContain('88.900')
        wrapper.unmount()
    })

    it('does not offer a fee editor for a reservation without delivery', async () => {
        deps.store.current = fixture({ addressId: null, deliveryFee: null })
        const wrapper = mountDetail()
        await flushPromises()
        expect(wrapper.find('[aria-label="Editar tarifa de domicilio"]').exists()).toBe(false)
        wrapper.unmount()
    })

    it('preserves product edits between tabs and disables fee changes until they finish', async () => {
        const wrapper = mountDetail()
        await flushPromises()
        await wrapper.findAll('[role="tab"]')[1]!.trigger('click')
        const panel = wrapper.findAll('[role="tabpanel"]')[1]!
        await panel.findAll('button').find(b => b.text() === 'Editar Productos')!.trigger('click')
        await panel.get('input[type="number"]').setValue(2)
        await wrapper.findAll('[role="tab"]')[0]!.trigger('click')
        expect(wrapper.findAll('[role="tabpanel"]')[0]!.get('[aria-label="Editar tarifa de domicilio"]').attributes('disabled')).toBeDefined()
        await wrapper.findAll('[role="tab"]')[1]!.trigger('click')
        expect((panel.get('input[type="number"]').element as HTMLInputElement).value).toBe('2')
        expect(deps.update).not.toHaveBeenCalled()
        wrapper.unmount()
    })
})
