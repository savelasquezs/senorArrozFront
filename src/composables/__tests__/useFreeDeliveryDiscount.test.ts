import { describe, it, expect } from 'vitest'
import {
    buildDeliveryCopyMessage,
    deliveryDiscountBudget,
    distributeEqualWithCaps,
    lineCapacityCop,
} from '@/composables/useFreeDeliveryDiscount'

const fc = (n: number) => `$${n.toLocaleString('es-CO')}`

describe('deliveryDiscountBudget', () => {
    it('toma el mínimo entre domicilio y tope', () => {
        expect(deliveryDiscountBudget(5000, 3000)).toBe(3000)
        expect(deliveryDiscountBudget(2000, 3000)).toBe(2000)
        expect(deliveryDiscountBudget(0, 3000)).toBe(0)
    })
})

describe('distributeEqualWithCaps', () => {
    it('una línea recibe todo el presupuesto si cabe', () => {
        expect(distributeEqualWithCaps(3000, [10000])).toEqual([3000])
    })

    it('divide en partes iguales y cuadra COP', () => {
        const r = distributeEqualWithCaps(3000, [5000, 5000, 5000])
        expect(r.reduce((a, b) => a + b, 0)).toBe(3000)
        expect(r).toEqual([1000, 1000, 1000])
    })

    it('respeta capacidades y redistribuye', () => {
        const r = distributeEqualWithCaps(5000, [500, 5000, 5000])
        expect(r.reduce((a, b) => a + b, 0)).toBe(5000)
        expect(r[0]).toBe(500)
    })
})

describe('lineCapacityCop', () => {
    it('capacidad = bruto − descuento manual', () => {
        expect(lineCapacityCop({ quantity: 2, unitPrice: 5000, manualDiscount: 2000 })).toBe(8000)
    })
})

describe('buildDeliveryCopyMessage', () => {
    it('sin promo: menciona costo de envío', () => {
        const s = buildDeliveryCopyMessage({
            deliveryFee: 4000,
            orderTotal: 25000,
            freeDeliveryRequested: false,
            maxBranchCap: 3000,
            formatCurrency: fc,
            etaPhrase: '30-40 min',
        })
        expect(s).toContain('costo')
        expect(s).toContain('30-40 min')
        expect(s).not.toContain('gratis')
    })

    it('con promo y envío ≤ tope: domicilio gratis', () => {
        const s = buildDeliveryCopyMessage({
            deliveryFee: 2500,
            orderTotal: 20000,
            freeDeliveryRequested: true,
            maxBranchCap: 3000,
            formatCurrency: fc,
            etaPhrase: '30-40 min',
        })
        expect(s.toLowerCase()).toContain('gratis')
    })

    it('con promo y envío > tope: cubrimos hasta el tope', () => {
        const s = buildDeliveryCopyMessage({
            deliveryFee: 6000,
            orderTotal: 22000,
            freeDeliveryRequested: true,
            maxBranchCap: 3000,
            formatCurrency: fc,
            etaPhrase: '30-40 min',
        })
        expect(s).toContain('cubrimos hasta')
        expect(s).toContain('domicilio')
    })
})
