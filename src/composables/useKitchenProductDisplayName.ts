/**
 * Misma semántica que `KitchenProductNameFormatter.Format` en el backend
 * (comanda de cocina): omite "arroz"/"con"; "chicharron…" → "chich…".
 */
const CHICHARRON = 'chicharron'

export function formatKitchenProductDisplayName(productName: string | null | undefined): string {
    if (productName == null || !productName.trim()) return ''

    const trimmed = productName.trim()
    const parts = trimmed.split(/\s+/).filter((p) => p.length > 0)
    const result: string[] = []

    for (const w of parts) {
        const lw = w.toLowerCase()
        if (lw === 'arroz' || lw === 'con') continue

        if (lw.startsWith(CHICHARRON)) {
            result.push(lw.length === CHICHARRON.length ? 'chich' : 'chich' + w.slice(CHICHARRON.length))
            continue
        }

        result.push(w)
    }

    const s = result.join(' ').trim()
    return s.length === 0 ? trimmed : s
}
