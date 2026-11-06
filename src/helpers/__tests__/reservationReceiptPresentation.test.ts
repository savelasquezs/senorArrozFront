import { describe, expect, it } from 'vitest'
import { invoiceOrderSummary, invoiceSnapshotSummary } from '../invoicePresentation'
import type { OrderDetailView } from '@/types/order'

describe('reservation receipt presentation', () => {
    it('shows initial mixed receipts once with the remaining balance', () => {
        const order = {
            id: 10, total: 100_000, orderDetails: [], paidInStoreCash: true, paidInStoreCashAmount: 10_000,
            bankPayments: [{ amount: 20_000, sourceReservationDepositId: 1 }],
            appPayments: [{ amount: 30_000, sourceReservationDepositId: 2 }],
            reservationDeposits: [
                { id: 1, amount: 20_000, isEffective: false, bankId: 1, bankName: 'Banco' },
                { id: 2, amount: 30_000, isEffective: false, appId: 1, appName: 'App' },
                { id: 3, amount: 10_000, isEffective: true, cashAppliedToOrder: true },
            ],
        } as unknown as OrderDetailView
        const result = invoiceOrderSummary(order)
        expect(result.payments).toHaveLength(3)
        expect(result.balance).toBe(40_000)
    })
    it('deduplicates app and cash operational copies in persisted invoice snapshots', () => {
        const result = invoiceSnapshotSummary(JSON.stringify({ order: {
            Id: 10, Total: 100_000, lines: [], PaidInStoreCashAmount: 10_000,
            appPayments: [{ Amount: 30_000, SourceReservationDepositId: 2 }],
            deposits: [{ Amount: 30_000, AppId: 1 }, { Amount: 10_000, IsEffective: true, CashAppliedToOrder: true }],
        } }))
        expect(result?.payments).toHaveLength(2)
        expect(result?.balance).toBe(60_000)
    })
})
