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

export interface BuildDeliveryCopyMessageParams {
    deliveryFee: number
    orderTotal: number
    freeDeliveryRequested: boolean
    /** Tope COP de la sucursal para el descuento tipo domicilio gratis. */
    maxBranchCap: number
    formatCurrency: (amount: number) => string
    etaPhrase: string
}

/**
 * Texto para copiar a WhatsApp (domicilio): menciona promoción si aplica.
 */
export function buildDeliveryCopyMessage(p: BuildDeliveryCopyMessageParams): string {
    const fee = Math.max(0, Math.round(Number(p.deliveryFee) || 0))
    const total = Math.max(0, Math.round(Number(p.orderTotal) || 0))
    const cap = Math.max(0, Math.round(Number(p.maxBranchCap) || 0))
    const fc = p.formatCurrency
    const eta = p.etaPhrase

    if (!p.freeDeliveryRequested) {
        return `El domicilio tiene un costo de ${fc(fee)}, serían ${fc(total)} y llega en ${eta}.`
    }

    if (fee <= 0) {
        return `Hoy tienes el domi gratis, serían ${fc(total)} y llega en ${eta}.`
    }

    // Promo activa: si el envío no supera el tope, el descuento cubre todo el domicilio.
    if (fee <= cap) {
        return `Hoy tienes el domi gratis, serían ${fc(total)} y llega en ${eta}.`
    }

    const remainder = fee - cap
    return `Hoy el domicilio te queda en solo ${fc(remainder)} pesitos, serían ${fc(total)}, y te llega en ${eta}.`
}
