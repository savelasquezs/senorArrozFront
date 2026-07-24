import { describe, expect, it } from 'vitest'
import {
    buildDeliveryInquiryMessage,
    deliveryAddressText,
} from '@/utils/deliveryInquiryMessage'

describe('deliveryInquiryMessage', () => {
    it('incluye domiciliario, pedido, dirección e información adicional', () => {
        expect(buildDeliveryInquiryMessage({
            deliverymanName: 'Abelardo',
            orderId: 567,
            addressDescription: 'Calle 10 # 20-30',
            addressAdditionalInfo: 'Apto 401',
        })).toBe(
            'Abelardo, me están preguntando por el pedido número 567, que va para la dirección Calle 10 # 20-30, Apto 401, ¿cuánto demora en llegar?',
        )
    })

    it('usa un texto seguro cuando no hay dirección', () => {
        expect(buildDeliveryInquiryMessage({
            deliverymanName: 'Abelardo',
            orderId: 567,
        })).toContain('que va para la dirección registrada')
        expect(deliveryAddressText({ addressDescription: '  ', addressAdditionalInfo: null })).toBe('')
    })
})
