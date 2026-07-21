import { describe, it, expect } from 'vitest'
import { buildPosOrderCopyMessage, resolveBenefitDiscountPercentage, resolveFreeGiftProductNames } from '@/composables/useOrderCopyMessage'
import type { DraftOrder } from '@/types/order'

const fc = (n: number) => `$${n.toLocaleString('es-CO')}`
const ft = () => '15:30'
const fds = () => '15/04/2026'

const base = {
    orderTotal: 64000,
    deliveryFee: 3000,
    freeDeliveryRequested: false,
    maxBranchCap: 3000,
    formatCurrency: fc,
    formatTime: ft,
    formatDateShort: fds,
    guestName: 'María',
    etaPhrase: '30-45 min',
}

describe('buildPosOrderCopyMessage', () => {
    it('onsite inmediato: total, recogida en ventana y nombre', () => {
        const s = buildPosOrderCopyMessage({
            ...base,
            orderType: 'onsite',
            isLater: false,
            addressId: null,
            reservedFor: null,
        })
        expect(s).toContain('64.000')
        expect(s).toContain('30-45 min')
        expect(s.toLowerCase()).toContain('recoger')
        expect(s).toContain('María')
    })

    it('onsite para más tarde: hora de reserva', () => {
        const s = buildPosOrderCopyMessage({
            ...base,
            orderType: 'onsite',
            isLater: true,
            addressId: null,
            reservedFor: new Date('2026-04-15T20:00:00'),
        })
        expect(s).toContain('a las 15:30')
        expect(s).toContain('María')
    })

    it('delivery inmediato: costo domicilio y ETA', () => {
        const s = buildPosOrderCopyMessage({
            ...base,
            orderType: 'delivery',
            isLater: false,
            addressId: 1,
            reservedFor: null,
        })
        expect(s).toContain('domicilio')
        expect(s).toContain('3.000')
        expect(s).toContain('30-45 min')
    })

    it('delivery programado: allá a la hora, sin 30-40', () => {
        const s = buildPosOrderCopyMessage({
            ...base,
            orderType: 'delivery',
            isLater: true,
            addressId: 1,
            reservedFor: new Date('2026-04-15T20:00:00'),
        })
        expect(s).toContain('allá estaremos entonces a las 15:30')
        expect(s).not.toMatch(/30-45 min/)
    })

    it('reserva con domicilio: fecha y hora en el cierre', () => {
        const s = buildPosOrderCopyMessage({
            ...base,
            orderType: 'reservation',
            isLater: false,
            addressId: 2,
            reservedFor: new Date('2026-04-20T19:00:00'),
        })
        expect(s).toContain('allá estaremos entonces el 15/04/2026 a las 15:30')
    })

    it('reserva sin domicilio: total y evento, con guest', () => {
        const s = buildPosOrderCopyMessage({
            ...base,
            orderType: 'reservation',
            isLater: false,
            addressId: null,
            reservedFor: new Date('2026-04-20T19:00:00'),
        })
        expect(s).toContain('15/04/2026')
        expect(s).toContain('15:30')
        expect(s).toContain('María')
    })

    it('agrega el producto gratis del beneficio y la pregunta por bebida', () => {
        const s = buildPosOrderCopyMessage({
            ...base,
            orderType: 'delivery',
            isLater: false,
            addressId: 1,
            reservedFor: null,
            freeGiftProductNames: ['Yucas'],
        })
        expect(s).toContain('30-45 min.\n\nHoy te llegan unas yuquitas gratis')
        expect(s).toContain('¿Deseas algo de tomar?')
    })

    it.each([
        ['Papas a la francesa', 'unas papitas'],
        ['Costilla BBQ', 'una costillita'],
        ['Gaseosa 400 ml', 'una gaseosita'],
        ['Chicharrón', 'un chicharroncito'],
    ])('usa el nombre amigable de %s', (productName, expected) => {
        const s = buildPosOrderCopyMessage({
            ...base,
            orderType: 'onsite',
            isLater: false,
            addressId: null,
            reservedFor: null,
            freeGiftProductNames: [productName],
        })
        expect(s).toContain(`Hoy te llegan ${expected} gratis`)
    })

    it('recupera el regalo desde los metadatos del beneficio si la línea perdió su marca', () => {
        const order = {
            appliedBenefitType: 'DailyPromotion',
            appliedBenefitRewardType: 'GiftProduct',
            appliedDailyPromotionGiftProductName: 'Yucas',
            orderItems: [{ productName: 'Yucas', isDailyPromotionGift: false }],
        } as DraftOrder

        expect(resolveFreeGiftProductNames(order)).toEqual(['Yucas'])
    })

    it('incluye el porcentaje, el total final y el tiempo en delivery', () => {
        const s = buildPosOrderCopyMessage({
            ...base,
            orderType: 'delivery',
            isLater: false,
            addressId: 1,
            reservedFor: null,
            benefitDiscountPercentage: 5,
        })

        expect(s).toBe('Hoy tienes 5% de descuento, el domicilio tiene un costo de $3.000, en total pagas $64.000 y llega en 30-45 min.')
    })

    it('resuelve el porcentaje desde los metadatos del beneficio aplicado', () => {
        const order = {
            appliedBenefitType: 'DailyPromotion',
            appliedBenefitRewardType: 'PercentageDiscount',
            appliedBenefitAmount: 5,
            orderItems: [],
        } as unknown as DraftOrder

        expect(resolveBenefitDiscountPercentage(order)).toBe(5)
    })
})
