import { flushPromises, shallowMount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditCustomerModal from '../EditCustomerModal.vue'
import type { OrderListItem } from '@/types/order'

const deps = vi.hoisted(() => ({
    update: vi.fn(),
    customer: {} as Record<string, any>,
    fetchById: vi.fn(),
    fetchAddresses: vi.fn(),
    addresses: [] as Record<string, any>[],
}))
vi.mock('@/store/ordersData', () => ({ useOrdersDataStore: () => ({ update: deps.update }) }))
vi.mock('@/store/customers', () => ({ useCustomersStore: () => ({
    fetchById: deps.fetchById, fetchAddresses: deps.fetchAddresses,
    get current() { return deps.customer },
    get addresses() { return deps.addresses },
}) }))
vi.mock('@/store/auth', () => ({ useAuthStore: () => ({ userRole: 'Admin' }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

const BaseDialog = defineComponent({
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>',
})
function mountModal() {
    return shallowMount(EditCustomerModal, {
        props: { open: true, order: {
            id: 81, branchId: 1, type: 'reservation', status: 'taken',
            customerId: 10, addressId: 12, guestName: 'Cliente', customerName: 'Cliente',
            deliveryFee: 20000, total: 105400, bankPayments: [], appPayments: [],
            reservationDeposits: [{ id: 11, amount: 10000 }],
        } as unknown as OrderListItem },
        global: { stubs: { BaseDialog, BaseInput: false, BaseButton: false } },
    })
}

describe('EditCustomerModal reservation delivery fee', () => {
    beforeEach(() => {
        deps.customer = { id: 10, name: 'Cliente', addresses: [{ id: 12 }] }
        deps.addresses = [{ id: 12, customerId: 10, deliveryFee: 20000 }]
        deps.fetchById.mockReset().mockResolvedValue(undefined)
        deps.fetchAddresses.mockReset().mockResolvedValue(undefined)
        deps.update.mockReset().mockResolvedValue({ id: 81, deliveryFee: 0 })
    })

    it('saves zero without resending the address or requesting deletion of deposits', async () => {
        const wrapper = mountModal()
        await flushPromises()
        await wrapper.get('input[type="number"]').setValue(0)
        await wrapper.findAll('button').find(b => b.text() === 'Guardar cambios')!.trigger('click')
        await flushPromises()
        expect(deps.update).toHaveBeenCalledExactlyOnceWith(81, { deliveryFee: 0 }, { order: expect.objectContaining({ id: 81 }) })
        expect(wrapper.emitted('close')).toHaveLength(1)
        wrapper.unmount()
    })

    it('blocks an empty fee, retains it after a save failure, and resets on reopen', async () => {
        const wrapper = mountModal()
        await flushPromises()
        const input = wrapper.get('input[type="number"]')
        const saveButton = () => wrapper.findAll('button').find(b => b.text() === 'Guardar cambios')!
        await input.setValue('')
        expect(saveButton().attributes('disabled')).toBeDefined()
        await input.setValue(3500)
        deps.update.mockRejectedValueOnce(new Error('Sin conexión'))
        await saveButton().trigger('click')
        await flushPromises()
        expect((input.element as HTMLInputElement).value).toBe('3500')
        expect(wrapper.emitted('close')).toBeUndefined()
        await wrapper.setProps({ open: false })
        await wrapper.setProps({ open: true })
        await flushPromises()
        expect((wrapper.get('input[type="number"]').element as HTMLInputElement).value).toBe('20000')
        wrapper.unmount()
    })
    it('uses the complete detail payload without a second HTTP request for empty addresses', async () => {
        deps.customer = { id: 10, name: 'Cliente', addresses: [] }
        const wrapper = mountModal()
        await flushPromises()
        expect(deps.fetchById).toHaveBeenCalledExactlyOnceWith(10)
        expect(deps.fetchAddresses).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('does not reload addresses that are already included in the customer detail', async () => {
        const address = { id: 12, customerId: 10, address: 'Dirección sintética', branchServices: [] }
        deps.customer = { id: 10, name: 'Cliente', addresses: [address] }
        const wrapper = mountModal()
        await flushPromises()
        expect(deps.fetchAddresses).not.toHaveBeenCalled()
        const selected = wrapper.findComponent({ name: 'CustomerSection' }).props('selectedCustomer')
        expect(selected).toEqual(deps.customer)
        wrapper.unmount()
    })

    it('keeps the addresses fallback for incomplete legacy customer payloads', async () => {
        deps.customer = { id: 10, name: 'Cliente' }
        const wrapper = mountModal()
        await flushPromises()
        expect(deps.fetchAddresses).toHaveBeenCalledExactlyOnceWith(10)
        const selected = wrapper.findComponent({ name: 'CustomerSection' }).props('selectedCustomer') as any
        expect(selected.addresses).toEqual(deps.addresses)
        wrapper.unmount()
    })

    it('ignores a stale initial customer response after the operator selects someone else', async () => {
        let releaseInitial!: () => void
        deps.fetchById.mockImplementationOnce(() => new Promise<void>(resolve => { releaseInitial = resolve }))
        deps.addresses = [{ id: 29, customerId: 20, address: 'Dirección nueva' }]
        const wrapper = mountModal()
        const selector = wrapper.findComponent({ name: 'CustomerSection' })
        selector.vm.$emit('customer-selected', { id: 20, name: 'Otro cliente', addresses: [] })
        await flushPromises()
        expect((selector.props('selectedCustomer') as any).id).toBe(20)
        expect(deps.fetchAddresses).toHaveBeenCalledExactlyOnceWith(20)

        releaseInitial()
        await flushPromises()
        expect((selector.props('selectedCustomer') as any).id).toBe(20)
        wrapper.unmount()
    })

    it('does not apply a pending customer response after closing the modal', async () => {
        let releaseInitial!: () => void
        deps.fetchById.mockImplementationOnce(() => new Promise<void>(resolve => { releaseInitial = resolve }))
        const wrapper = mountModal()
        await wrapper.setProps({ open: false })
        releaseInitial()
        await flushPromises()
        expect(wrapper.findComponent({ name: 'CustomerSection' }).props('selectedCustomer')).toBeNull()
        wrapper.unmount()
    })

})
