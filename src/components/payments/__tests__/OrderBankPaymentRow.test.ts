import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OrderBankPaymentRow from '@/components/payments/OrderBankPaymentRow.vue'
import type { OrderBankPaymentDetail } from '@/types/order'

function payment(isVerified: boolean): OrderBankPaymentDetail {
    return {
        id: 10,
        orderId: 20,
        bankId: 30,
        bankName: 'Banco Uno',
        branchId: 1,
        branchName: 'Centro',
        amount: 25000,
        isVerified,
        verifiedAt: isVerified ? '2026-08-06T15:00:00.000Z' : null,
    }
}

describe('OrderBankPaymentRow verification actions', () => {
    it('muestra verificar para un pago pendiente cuando está autorizado', () => {
        const wrapper = mount(OrderBankPaymentRow, {
            props: {
                payment: payment(false),
                density: 'compact',
                showVerifyAction: true,
                showUnverifyAction: false,
            },
        })

        expect(wrapper.find('[title="Verificar pago"]').exists()).toBe(true)
        expect(wrapper.find('[title="Desverificar pago"]').exists()).toBe(false)
    })

    it('no ofrece desverificar un pago confirmado sin el permiso administrativo', () => {
        const wrapper = mount(OrderBankPaymentRow, {
            props: {
                payment: payment(true),
                density: 'compact',
                showVerifyAction: true,
                showUnverifyAction: false,
                showVerificationBadge: false,
            },
        })

        expect(wrapper.find('[title="Verificado"]').exists()).toBe(true)
        expect(wrapper.find('[title="Desverificar pago"]').exists()).toBe(false)
    })

    it('ofrece desverificar a quien tenga el permiso explícito', () => {
        const wrapper = mount(OrderBankPaymentRow, {
            props: {
                payment: payment(true),
                density: 'compact',
                showVerifyAction: true,
                showUnverifyAction: true,
            },
        })

        expect(wrapper.find('[title="Desverificar pago"]').exists()).toBe(true)
    })
})
