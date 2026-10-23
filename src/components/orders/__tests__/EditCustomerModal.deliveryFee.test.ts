import { flushPromises, shallowMount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditCustomerModal from '../EditCustomerModal.vue'
import type { OrderListItem } from '@/types/order'

const deps = vi.hoisted(() => ({ update: vi.fn(), customer: {} as Record<string, any> }))
vi.mock('@/store/ordersData', () => ({ useOrdersDataStore: () => ({ update: deps.update }) }))
vi.mock('@/store/customers', () => ({ useCustomersStore: () => ({
    fetchById: vi.fn(), fetchAddresses: vi.fn(), get current() { return deps.customer },
    addresses: [{ id: 12, customerId: 10, deliveryFee: 20000 }],
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
})
