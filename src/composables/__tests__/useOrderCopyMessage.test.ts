import { describe, it, expect } from 'vitest'
import { buildPosOrderCopyMessage } from '@/composables/useOrderCopyMessage'

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
    etaPhrase: '30-40 min',
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
        expect(s).toContain('30-40 min')
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
        expect(s).toContain('30-40 min')
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
        expect(s).not.toMatch(/30-40 min/)
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
})
