/** Montos con shape mínimo { amount } (persistido, borrador, API). */
export type PaymentLike = { amount: number }

export function sumPaymentsAmounts(payments: PaymentLike[] | undefined | null): number {
    if (!payments?.length) return 0
    return payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
}

export interface OrderCashInputs {
    bankPayments?: PaymentLike[] | null
    /** Pedido persistido: varios pagos app */
    appPayments?: PaymentLike[] | null
    /** Borrador de pedido: un solo pago app */
    appPayment?: PaymentLike | null
}

/** Suma banco + apps (arrays) + app suelta de borrador. */
export function sumOrderNonCashPayments(inputs: OrderCashInputs): number {
    return (
        sumPaymentsAmounts(inputs.bankPayments) +
        sumPaymentsAmounts(inputs.appPayments) +
        (inputs.appPayment ? Number(inputs.appPayment.amount ?? 0) : 0)
    )
}

/**
 * Efectivo del pedido: total − pagos no efectivo − (opcional) efectivo ya cobrado en tienda.
 * @param floorAtZero true en UI de cobro (no mostrar negativo por sobrepago).
 * @param paidInStoreCashAmount si `paidInStoreCash` y hay número, monto COP cobrado en sucursal; si es null/omitido con flag activo, se asume cubierto todo el remanente (comportamiento previo).
 */
export function orderCashToCollect(
    orderTotal: number,
    inputs: OrderCashInputs,
    options?: {
        floorAtZero?: boolean
        paidInStoreCash?: boolean
        paidInStoreCashAmount?: number | null
    }
): number {
    const nonCash = sumOrderNonCashPayments(inputs)
    const remainder = orderTotal - nonCash

    if (options?.paidInStoreCash) {
        const covered =
            typeof options.paidInStoreCashAmount === 'number' && Number.isFinite(options.paidInStoreCashAmount)
                ? Math.max(0, options.paidInStoreCashAmount)
                : Math.max(0, remainder)
        const raw = remainder - covered
        if (options.floorAtZero) return Math.max(0, raw)
        return raw
    }

    if (options?.floorAtZero) return Math.max(0, remainder)
    return remainder
}
