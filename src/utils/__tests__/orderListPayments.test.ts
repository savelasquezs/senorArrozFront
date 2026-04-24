import { describe, expect, it } from 'vitest'
import { appPaymentIsSettled, orderHasElectronicPayments } from '../orderListPayments'

describe('orderHasElectronicPayments', () => {
    it('false sin bancos ni apps', () => {
        expect(orderHasElectronicPayments({ bankPayments: [], appPayments: [] })).toBe(false)
    })

    it('true con un banco', () => {
        expect(
            orderHasElectronicPayments({
                bankPayments: [{ id: 1, orderId: 1, bankId: 1, bankName: 'x', branchId: 1, branchName: 'b', amount: 1, verifiedAt: null, isVerified: false }],
                appPayments: [],
            }),
        ).toBe(true)
    })

    it('true con una app', () => {
        expect(
            orderHasElectronicPayments({
                bankPayments: [],
                appPayments: [
                    {
                        id: 1,
                        orderId: 1,
                        appId: 1,
                        appName: 'Rappi',
                        bankId: null,
                        bankName: null,
                        branchId: 1,
                        branchName: 'b',
                        amount: 100,
                        isSettled: false,
                        settledAt: null,
                    },
                ],
            }),
        ).toBe(true)
    })
})

describe('appPaymentIsSettled', () => {
    it('true con isSettled', () => {
        expect(appPaymentIsSettled({ isSettled: true })).toBe(true)
    })

    it('true con isSetted (API)', () => {
        expect(appPaymentIsSettled({ isSettled: false, isSetted: true })).toBe(true)
    })

    it('false sin ninguno', () => {
        expect(appPaymentIsSettled({ isSettled: false })).toBe(false)
    })
})
