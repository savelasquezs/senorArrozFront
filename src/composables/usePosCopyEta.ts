/**
 * Ventana de tiempo en «Copiar mensaje» (POS): mínimo en minutos + rango (minutos adicionales al tope).
 * Ej.: min=30, range=15 → "30-45 min".
 */

export const DEFAULT_POS_COPY_ETA_MIN_MINUTES = 30
export const DEFAULT_POS_COPY_ETA_RANGE_MINUTES = 15
const MAX_MINUTES = 10080

function clampM(n: number, fallback: number): number {
    if (!Number.isFinite(n)) return fallback
    const r = Math.round(n)
    if (r < 0) return 0
    if (r > MAX_MINUTES) return MAX_MINUTES
    return r
}

export function formatPosCopyEtaPhrase(minM: number, rangeM: number): string {
    const min = clampM(minM, DEFAULT_POS_COPY_ETA_MIN_MINUTES)
    const range = clampM(rangeM, DEFAULT_POS_COPY_ETA_RANGE_MINUTES)
    if (range === 0) {
        return `${min} min`
    }
    return `${min}-${min + range} min`
}

export function parseBranchPosCopyMinutes(
    min: unknown,
    range: unknown,
): { min: number; range: number } {
    const m = typeof min === 'number' && Number.isFinite(min) ? Math.round(min) : DEFAULT_POS_COPY_ETA_MIN_MINUTES
    const r = typeof range === 'number' && Number.isFinite(range) ? Math.round(range) : DEFAULT_POS_COPY_ETA_RANGE_MINUTES
    return {
        min: clampM(m, DEFAULT_POS_COPY_ETA_MIN_MINUTES),
        range: clampM(r, DEFAULT_POS_COPY_ETA_RANGE_MINUTES),
    }
}
