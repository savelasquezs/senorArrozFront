import { flushPromises, shallowMount } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrderDetailView } from '@/types/order'
import OrderDetailContent from '../OrderDetailContent.vue'
import { useOrderManagementUpdates } from '@/composables/useOrderManagementUpdates'
import { orderApi } from '@/services/MainAPI/orderApi'

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
        global: { stubs: { OrderNoteDialog: false, OrderDetailProductsList: false, OrderDeliveryFeeEditor: false, BaseButton: false, BaseInput: false, BaseDialog: false, teleport: true } },
    })
}

describe('OrderDetailContent presentation and reservation delivery fee', () => {
    beforeEach(() => {
        deps.options.mockResolvedValue({ banks: [], apps: [], deliverymen: [], maxFreeDeliveryDiscount: 0 })
        deps.update.mockReset().mockImplementation(async (_id, payload) => {
            deps.store.current = { ...deps.store.current, ...payload, total: payload.deliveryFee === undefined ? deps.store.current.total : 85400 + payload.deliveryFee }
            return deps.store.current
        })
        deps.store = reactive({ current: fixture(), update: deps.update })
        vi.spyOn(orderApi, 'fetchDetail').mockResolvedValue(fixture())
    })
    afterEach(() => vi.restoreAllMocks())

    it('preserves an open notes draft when returning to an unchanged order', async () => {
        deps.store.current = fixture({ notes: 'Nota original' })
        const wrapper = mountDetail()
        await flushPromises()
        await wrapper.get('[aria-label="Editar notas del pedido"]').trigger('click')
        await wrapper.get('textarea').setValue('Borrador sin guardar')
        vi.mocked(useOrderManagementUpdates).mock.lastCall![1]()
        await flushPromises()
        expect(wrapper.find('[role="status"]').exists()).toBe(false)
        expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Borrador sin guardar')
        expect(deps.store.current.notes).toBe('Nota original')
        wrapper.unmount()
    })

    it('preserves the draft for a confirmed external change until explicit discard and refresh', async () => {
        deps.store.current = fixture({ notes: 'Nota original' })
        deps.store.fetchById = vi.fn(async () => {
            deps.store.current = fixture({ notes: 'Nota remota', managementVersion: 2 })
        })
        const wrapper = mountDetail()
        await flushPromises()
        await wrapper.get('[aria-label="Editar notas del pedido"]').trigger('click')
        await wrapper.get('textarea').setValue('Borrador sin guardar')
        const changed = vi.mocked(useOrderManagementUpdates).mock.lastCall![0]
        changed({ orderId: 82, branchId: 1, managementVersion: 2 })
        await flushPromises()
        expect(wrapper.find('[role="status"]').exists()).toBe(false)
        changed({ orderId: 81, branchId: 1, managementVersion: 2 })
        await flushPromises()
        expect(wrapper.get('[role="status"]').text()).toContain('Este pedido cambió')
        expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Borrador sin guardar')
        expect(wrapper.findAll('button').find(button => button.text() === 'Guardar notas')!.attributes('disabled')).toBeDefined()
        expect(deps.store.fetchById).not.toHaveBeenCalled()
        await wrapper.findAll('button').find(button => button.text() === 'Descartar cambios y actualizar')!.trigger('click')
        await flushPromises()
        expect(wrapper.find('[role="status"]').exists()).toBe(false)
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
        await wrapper.get('[aria-label="Editar notas del pedido"]').trigger('click')
        expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Nota remota')
        wrapper.unmount()
    })

    it('keeps product quantities in progress while confirming an external change', async () => {
        const wrapper = mountDetail()
        await flushPromises()
        const panel = wrapper.get('section[aria-label="Productos del pedido"]')
        await panel.findAll('button').find(button => button.text() === 'Editar Productos')!.trigger('click')
        await panel.get('input[type="number"]').setValue(3)
        vi.mocked(orderApi.fetchDetail).mockResolvedValue(fixture({ managementVersion: 2 }))
        vi.mocked(useOrderManagementUpdates).mock.lastCall![1]()
        await flushPromises()
        expect(wrapper.get('[role="status"]').text()).toContain('Este pedido cambió')
        expect((panel.get('input[type="number"]').element as HTMLInputElement).value).toBe('3')
        expect(deps.update).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('shows reservation information, products and payments together with section links', async () => {
        const wrapper = mountDetail()
        await flushPromises()
        expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
        expect(wrapper.findComponent({ name: 'OrderDetailProductsList' }).exists()).toBe(true)
        for (const name of ['Información del pedido', 'Productos del pedido', 'Pagos del pedido']) {
            expect(wrapper.get(`section[aria-label="${name}"]`).isVisible()).toBe(true)
        }
        const links = wrapper.findAll('nav[aria-label="Secciones del pedido"] a')
        expect(links.map(link => link.text())).toEqual(['Información', 'Productos', 'Pagos'])
        for (const link of links) expect(wrapper.find(`[id="${link.attributes('href')!.slice(1)}"]`).exists()).toBe(true)
        expect(wrapper.get('section[aria-label="Programación y atención"]').text()).toContain('2026')
        expect(wrapper.get('section[aria-label="Pagos del pedido"] details').attributes('open')).toBeUndefined()
        expect(deps.update).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('saves only deliveryFee from Products and preserves the reservation, schedule and deposits', async () => {
        const wrapper = mountDetail()
        await flushPromises()
        const panel = wrapper.get('section[aria-label="Productos del pedido"]')
        await panel.get('[aria-label="Editar tarifa de domicilio"]').trigger('click')
        await panel.get('input').setValue(3500)
        await wrapper.get('nav a[href$="-payments"]').trigger('click')
        await wrapper.get('nav a[href$="-products"]').trigger('click')
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

    it('preserves product edits while navigating sections and disables the single fee editor', async () => {
        const wrapper = mountDetail()
        await flushPromises()
        const panel = wrapper.get('section[aria-label="Productos del pedido"]')
        await panel.findAll('button').find(b => b.text() === 'Editar Productos')!.trigger('click')
        await panel.get('input[type="number"]').setValue(2)
        await wrapper.get('nav a[href$="-info"]').trigger('click')
        expect(wrapper.findAll('[aria-label="Editar tarifa de domicilio"]')).toHaveLength(1)
        expect(panel.get('[aria-label="Editar tarifa de domicilio"]').attributes('disabled')).toBeDefined()
        await wrapper.get('nav a[href$="-products"]').trigger('click')
        expect((panel.get('input[type="number"]').element as HTMLInputElement).value).toBe('2')
        expect(deps.update).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('edits long notes in a modal and discards cancelled edits without saving on blur', async () => {
        deps.store.current = fixture({ notes: 'Nota original' })
        const wrapper = mountDetail()
        await flushPromises()
        await wrapper.get('[aria-label="Editar notas del pedido"]').trigger('click')
        const input = wrapper.get('textarea')
        await input.setValue('Indicaciones largas\n' + 'Separar y rotular los productos. '.repeat(25))
        await input.trigger('blur')
        expect(deps.update).not.toHaveBeenCalled()
        await wrapper.findAll('button').find(button => button.text() === 'Cancelar')!.trigger('click')
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
        await wrapper.get('[aria-label="Editar notas del pedido"]').trigger('click')
        expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Nota original')
        wrapper.unmount()
    })

    it.each(['Nota larga\nConservar todos los saltos de línea.', ''])('saves notes explicitly including an empty value: %s', async notes => {
        deps.store.current = fixture({ notes: 'Nota original' })
        const wrapper = mountDetail()
        await flushPromises()
        await wrapper.get('[aria-label="Editar notas del pedido"]').trigger('click')
        await wrapper.get('textarea').setValue(notes)
        await wrapper.findAll('button').find(button => button.text() === 'Guardar notas')!.trigger('click')
        await flushPromises()
        expect(deps.update).toHaveBeenCalledExactlyOnceWith(81, { notes })
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
        expect(deps.store.current.notes).toBe(notes)
        wrapper.unmount()
    })

    it('keeps the note draft visible after a save failure so it can be retried', async () => {
        deps.update.mockRejectedValueOnce(new Error('No se pudo guardar'))
        const wrapper = mountDetail()
        await flushPromises()
        await wrapper.get('[aria-label="Editar notas del pedido"]').trigger('click')
        await wrapper.get('textarea').setValue('Conservar este borrador')
        await wrapper.findAll('button').find(button => button.text() === 'Guardar notas')!.trigger('click')
        await flushPromises()
        expect(wrapper.get('[role="dialog"]').text()).toContain('No se pudo guardar')
        expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Conservar este borrador')
        wrapper.unmount()
    })

    it.each(['Separar esta porción', ''])('saves only the selected product note without changing amounts: %s', async notes => {
        const original = fixture()
        original.orderDetails[0]!.notes = 'Original'
        deps.store.current = original
        const wrapper = mountDetail()
        await flushPromises()
        await wrapper.get('[aria-label="Editar nota de Arroz familiar"]').trigger('click')
        await wrapper.get('textarea').setValue(notes)
        await wrapper.findAll('button').find(button => button.text() === 'Guardar notas')!.trigger('click')
        await flushPromises()
        expect(deps.update).toHaveBeenCalledExactlyOnceWith(81, {
            orderDetails: [{ id: 1, productId: 1, quantity: 1, unitPrice: 85400, discount: 0, notes }],
        })
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
        wrapper.unmount()
    })

    it('keeps a failed product note draft available for retry', async () => {
        deps.update.mockRejectedValueOnce(new Error('No se pudo guardar'))
        const wrapper = mountDetail()
        await flushPromises()
        await wrapper.get('[aria-label="Editar nota de Arroz familiar"]').trigger('click')
        await wrapper.get('textarea').setValue('Separar y rotular')
        await wrapper.findAll('button').find(button => button.text() === 'Guardar notas')!.trigger('click')
        await flushPromises()
        expect(wrapper.get('[role="dialog"]').text()).toContain('No se pudo guardar')
        expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Separar y rotular')
        wrapper.unmount()
    })

    it('uses the same modal for schedule edits and keeps the kitchen confirmation before saving', async () => {
        const wrapper = mountDetail()
        await flushPromises()
        expect(wrapper.findComponent({ name: 'OrderScheduleFields' }).exists()).toBe(false)
        await wrapper.get('[aria-label="Editar horarios del pedido"]').trigger('click')
        expect(wrapper.get('[role="dialog"]').text()).toContain('Programación del pedido')
        const fields = wrapper.getComponent({ name: 'OrderScheduleFields' })
        fields.vm.$emit('change', { prepareAt: new Date('2026-10-25T18:00:00Z'), reservedFor: new Date('2026-10-25T19:00:00Z') })
        await wrapper.findAll('button').find(button => button.text() === 'Guardar horarios')!.trigger('click')
        expect(deps.update).not.toHaveBeenCalled()
        expect(wrapper.text()).toContain('Este pedido está en cocina')
        await wrapper.findAll('button').find(button => button.text() === 'Continuar')!.trigger('click')
        await flushPromises()
        expect(deps.update).toHaveBeenCalledExactlyOnceWith(81, { prepareAt: '2026-10-25T18:00:00.000Z', reservedFor: '2026-10-25T19:00:00.000Z' })
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
        wrapper.unmount()
    })

    it('restores the persisted schedule when reopening after cancelling', async () => {
        const wrapper = mountDetail()
        await flushPromises()
        await wrapper.get('[aria-label="Editar horarios del pedido"]').trigger('click')
        wrapper.getComponent({ name: 'OrderScheduleFields' }).vm.$emit('change', { prepareAt: new Date('2026-10-25T18:00:00Z'), reservedFor: new Date('2026-10-25T19:00:00Z') })
        await wrapper.findAll('button').find(button => button.text() === 'Cancelar')!.trigger('click')
        await wrapper.get('[aria-label="Editar horarios del pedido"]').trigger('click')
        expect(wrapper.getComponent({ name: 'OrderScheduleFields' }).props('prepareAt')?.toISOString()).toBe('2026-10-24T18:00:00.000Z')
        expect(deps.update).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('offers tracking inside More actions only while a delivery is on the way', async () => {
        deps.store.current = fixture({ type: 'delivery', status: 'on_the_way' })
        const wrapper = mountDetail()
        await flushPromises()
        const header = wrapper.get('section[aria-label="Resumen del pedido"]')
        const tracking = header.get('details').findAll('button').find(button => button.text() === 'Ver ubicación')!
        expect(tracking).toBeDefined()
        await tracking.trigger('click')
        expect(wrapper.findComponent({ name: 'OrderTrackingDialog' }).exists()).toBe(true)
        expect(deps.update).not.toHaveBeenCalled()
        deps.store.current = fixture({ type: 'delivery', status: 'delivered' })
        await flushPromises()
        expect(header.findAll('button').some(button => button.text() === 'Ver ubicación')).toBe(false)
        expect(wrapper.find('[aria-label="Editar horarios del pedido"]').exists()).toBe(false)
        wrapper.unmount()
    })
    it('does not send a second status PUT when assigning an order already transitioned by the backend', async () => {
        deps.store.current = fixture({ type: 'delivery', status: 'ready', deliveryManId: null, deliveryManName: null })
        deps.store.updateCurrent = vi.fn((patch: Record<string, unknown>) => {
            deps.store.current = { ...deps.store.current, ...patch }
        })
        const extraStatusPut = vi.spyOn(orderApi, 'updateStatus')
        const wrapper = mountDetail()
        await flushPromises()
        const label = wrapper.findAll('label').find(item => item.text().trim() === 'Domiciliario')
        expect(label).toBeDefined()
        const pencil = label!.element.parentElement?.querySelector('button')
        expect(pencil).not.toBeNull()
        pencil!.click()
        await flushPromises()
        const modal = wrapper.getComponent({ name: 'AssignDeliveryModal' })
        expect(modal.exists()).toBe(true)
        const assigned = fixture({ type: 'delivery', status: 'on_the_way',
            deliveryManId: 20, deliveryManName: 'Domiciliario sintético' })
        modal.vm.$emit('updated', assigned)
        modal.vm.$emit('statusChanged', 'on_the_way')
        await flushPromises()
        expect(extraStatusPut).not.toHaveBeenCalled()
        expect(deps.store.updateCurrent).toHaveBeenCalledWith(expect.objectContaining({
            deliveryManId: 20, status: 'on_the_way',
        }))
        wrapper.unmount()
    })

})
