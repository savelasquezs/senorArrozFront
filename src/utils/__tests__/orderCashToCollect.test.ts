import { describe, expect, it } from 'vitest'
import { orderCashToCollect } from '../orderCashToCollect'

describe('orderCashToCollect (remanente UI pagos / efectivo en tienda)', () => {
    const total = 100_000

    it('con transferencia parcial deja remanente > 0', () => {
        const r = orderCashToCollect(
            total,
            { bankPayments: [{ amount: 30_000 }] },
            { floorAtZero: true },
        )
        expect(r).toBe(70_000)
    })

    it('con banco+app que cubren el total el remanente es 0', () => {
        const r = orderCashToCollect(
            total,
            {
                bankPayments: [{ amount: 40_000 }],
                appPayments: [{ amount: 60_000 }],
            },
            { floorAtZero: true },
        )
        expect(r).toBe(0)
    })

    it('borrador: app suelta cuenta en el remanente', () => {
        const r = orderCashToCollect(total, { appPayment: { amount: 25_000 } }, { floorAtZero: true })
        expect(r).toBe(75_000)
    })

    it('con paidInStoreCash y monto explícito reduce el remanente para cobro en entrega', () => {
        const r = orderCashToCollect(
            total,
            { bankPayments: [{ amount: 20_000 }] },
            {
                floorAtZero: true,
                paidInStoreCash: true,
                paidInStoreCashAmount: 50_000,
            },
        )
        expect(r).toBe(30_000)
    })
})
