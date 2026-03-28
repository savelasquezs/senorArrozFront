import type { OrderDetailView, OrderListItem } from '@/types/order'

/** Listado o detalle: ambos incluyen total y pagos */
export type OrderPaymentSnapshotSource = Pick<OrderListItem, 'total' | 'bankPayments' | 'appPayments'>

/** Snapshot mínima para evaluar cobertura bancaria antes de un cambio de total */
export interface OrderPaymentSnapshot {
    total: number
    bankPayments: { id: number; amount: number }[]
    appPayments: { amount: number }[]
}

export type BankSyncPrompt =
    | { kind: 'none' }
    | { kind: 'adjust'; paymentId: number; newTotal: number; previousTotal: number }
    | { kind: 'warn'; newTotal: number; previousTotal: number }

export function bankPaymentsSum(snapshot: Pick<OrderPaymentSnapshot, 'bankPayments'>): number {
    return snapshot.bankPayments.reduce((s, p) => s + Math.round(Number(p.amount)), 0)
}

/** Solo banco, sin app, y la suma bancaria iguala el total del pedido */
export function isFullyCoveredByBankOnly(snapshot: OrderPaymentSnapshot): boolean {
    if (snapshot.appPayments.length > 0) return false
    if (snapshot.bankPayments.length < 1) return false
    const bankSum = bankPaymentsSum(snapshot)
    return bankSum === Math.round(Number(snapshot.total))
}

export function toPaymentSnapshot(order: OrderPaymentSnapshotSource): OrderPaymentSnapshot {
    return {
        total: Math.round(Number(order.total)),
        bankPayments: (order.bankPayments || []).map((p) => ({
            id: p.id,
            amount: Math.round(Number(p.amount)),
        })),
        appPayments: (order.appPayments || []).map((p) => ({
            amount: Math.round(Number(p.amount)),
        })),
    }
}

/**
 * Tras cambiar el total: si antes estaba 100 % cubierto por banco(s), sugerir ajuste o aviso.
 */
export function evaluateBankSyncAfterTotalChange(
    snapshotBefore: OrderPaymentSnapshot,
    orderAfter: OrderDetailView,
): BankSyncPrompt {
    const newTotal = Math.round(Number(orderAfter.total))
    if (newTotal === snapshotBefore.total) return { kind: 'none' }
    if (!isFullyCoveredByBankOnly(snapshotBefore)) return { kind: 'none' }

    if (snapshotBefore.bankPayments.length === 1 && snapshotBefore.appPayments.length === 0) {
        return {
            kind: 'adjust',
            paymentId: snapshotBefore.bankPayments[0].id,
            newTotal,
            previousTotal: snapshotBefore.total,
        }
    }

    return {
        kind: 'warn',
        newTotal,
        previousTotal: snapshotBefore.total,
    }
}
