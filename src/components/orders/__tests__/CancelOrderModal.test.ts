import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CancelOrderModal from '@/components/orders/CancelOrderModal.vue'
import type { Order, OrderListItem } from '@/types/order'

const { cancelMock, successMock, errorMock } = vi.hoisted(() => ({
    cancelMock: vi.fn(),
    successMock: vi.fn(),
    errorMock: vi.fn(),
}))

vi.mock('@/services/MainAPI/orderApi', () => ({
    orderApi: { cancel: cancelMock },
}))

vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ success: successMock, error: errorMock }),
}))

const BaseDialogStub = defineComponent({
    props: { modelValue: Boolean },
    emits: ['update:modelValue'],
    template: '<div><slot /><slot name="footer" /></div>',
})

const BaseButtonStub = defineComponent({
    props: { disabled: Boolean, loading: Boolean },
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})

const order = {
    id: 42,
    type: 'delivery',
    typeDisplayName: 'Domicilio',
    customerName: 'Ana',
    guestName: null,
    total: 35000,
    reservationDeposits: [],
    bankPayments: [],
} as unknown as OrderListItem

describe('CancelOrderModal', () => {
    beforeEach(() => {
        cancelMock.mockReset()
        successMock.mockReset()
        errorMock.mockReset()
    })

    it('entrega al padre el pedido cancelado devuelto por la API', async () => {
        const cancelledOrder = {
            id: 42,
            status: 'cancelled',
            updatedAt: '2026-08-03T15:00:00Z',
        } as Order
        cancelMock.mockResolvedValue(cancelledOrder)
        const wrapper = mount(CancelOrderModal, {
            props: { open: true, order },
            global: {
                stubs: {
                    BaseDialog: BaseDialogStub,
                    BaseButton: BaseButtonStub,
                },
            },
        })

        await wrapper.get('textarea').setValue('El cliente cambió de opinión')
        await wrapper.get('input[type="checkbox"]').setValue(true)
        const confirmButton = wrapper.findAll('button')
            .find(button => button.text().includes('Confirmar Cancelación'))
        expect(confirmButton).toBeDefined()
        await confirmButton!.trigger('click')
        await flushPromises()

        expect(cancelMock).toHaveBeenCalledWith(42, 'El cliente cambió de opinión')
        expect(wrapper.emitted('cancelled')).toEqual([[cancelledOrder]])
        expect(wrapper.emitted('close')).toHaveLength(1)
        expect(successMock).toHaveBeenCalledWith(
            'Pedido cancelado',
            5000,
            'El pedido ha sido cancelado correctamente',
        )
    })
})
