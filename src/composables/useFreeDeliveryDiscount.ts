/**
 * Descuento "domicilio gratis": presupuesto y reparto equitativo por línea con tope por capacidad (COP enteros).
 */

/** Presupuesto total a repartir: min(domicilio, tope sucursal). */
export function deliveryDiscountBudget(deliveryFee: number, maxCap: number): number {
    const f = Math.max(0, Math.round(Number(deliveryFee) || 0))
    const c = Math.max(0, Math.round(Number(maxCap) || 0))
    return Math.min(f, c)
}

/**
 * Reparte `total` COP en partes enteras entre `n` líneas con capacidades `caps`.
 * Suma del resultado = min(total, sum(caps)). Reparto equitativo por rondas (water-filling).
 */
export function distributeEqualWithCaps(total: number, caps: number[]): number[] {
    const n = caps.length
    if (n === 0) return []
    const safeCaps = caps.map((c) => Math.max(0, Math.round(c)))
    const sumCaps = safeCaps.reduce((a, b) => a + b, 0)
    const T = Math.min(Math.max(0, Math.round(total)), sumCaps)
    const result = safeCaps.map(() => 0)
    let remaining = T
    while (remaining > 0) {
        const active = result
            .map((v, i) => i)
            .filter((i) => result[i] < safeCaps[i])
        if (active.length === 0) break
        const share = Math.floor(remaining / active.length)
        if (share === 0) {
            for (const i of active) {
                if (remaining <= 0) break
                const room = safeCaps[i] - result[i]
                const add = Math.min(1, room, remaining)
                result[i] += add
                remaining -= add
            }
        } else {
            for (const i of active) {
                if (remaining <= 0) break
                const room = safeCaps[i] - result[i]
                const add = Math.min(share, room, remaining)
                result[i] += add
                remaining -= add
            }
        }
    }
    return result
}

export interface LineCapacityInput {
    quantity: number
    unitPrice: number
    manualDiscount: number
}

export function lineCapacityCop(line: LineCapacityInput): number {
    const gross = Math.max(0, line.quantity) * Math.max(0, line.unitPrice)
    const manual = Math.max(0, Math.round(line.manualDiscount || 0))
    return Math.max(0, Math.round(gross) - manual)
}
