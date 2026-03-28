/**
 * Reparte `newTotal` entre líneas de pago bancario del gasto de forma proporcional
 * a los montos actuales; corrige diferencias de redondeo en la última línea.
 */
export function distributeExpenseBankPaymentsProportionally(
    payments: { bankId: number; amount: number }[],
    newTotal: number,
): { bankId: number; amount: number }[] {
    const target = Math.round(Number(newTotal))
    const n = payments.length
    if (n === 0) return []
    if (n === 1) return [{ bankId: payments[0].bankId, amount: target }]

    const oldAmounts = payments.map((p) => Math.max(0, Math.round(Number(p.amount))))
    const oldSum = oldAmounts.reduce((a, b) => a + b, 0)
    if (oldSum <= 0) {
        return payments.map((p, i) => ({
            bankId: p.bankId,
            amount: i === 0 ? target : 0,
        }))
    }

    const floats = oldAmounts.map((a) => (a / oldSum) * target)
    const rounded = floats.map((x) => Math.round(x))
    let diff = target - rounded.reduce((a, b) => a + b, 0)
    const result = payments.map((p, i) => ({ bankId: p.bankId, amount: rounded[i] }))
    let i = result.length - 1
    while (diff !== 0 && i >= 0) {
        result[i].amount += diff
        diff = 0
        i--
    }
    return result
}
