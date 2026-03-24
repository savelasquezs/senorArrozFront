/**
 * Sugerencia de "billete" para armar vuelta (solo ayuda visual).
 * Reglas típicas en COP: redondear hacia arriba a denominaciones prácticas.
 */
export function suggestVueltosDenominations(orderTotalCop: number): {
    primary: number
    alternatives: number[]
} {
    const v = Math.max(0, Math.round(orderTotalCop))
    if (v === 0) return { primary: 0, alternatives: [] }

    const candidates = [50_000, 100_000, 150_000, 200_000, 500_000]
    const above = candidates.filter((c) => c >= v)
    if (above.length) {
        const primary = above[0]
        const alternatives = above.slice(1, 4)
        return { primary, alternatives }
    }
    const step = 50_000
    const primary = Math.ceil(v / step) * step
    return { primary, alternatives: [primary + step, primary + 2 * step].filter((x) => x > primary) }
}

export function formatVueltosHint(orderTotalCop: number): string {
    const { primary, alternatives } = suggestVueltosDenominations(orderTotalCop)
    if (!primary) return ''
    const alt = alternatives.length ? ` · opciones: ${alternatives.map((a) => `$${a.toLocaleString('es-CO')}`).join(', ')}` : ''
    return `Sugerencia vuelta: llevar ~$${primary.toLocaleString('es-CO')}${alt}`
}
