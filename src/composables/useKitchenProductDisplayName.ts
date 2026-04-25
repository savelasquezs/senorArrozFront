/**
 * Misma semántica que `KitchenProductNameFormatter.Format` en el backend
 * (comanda de cocina y tarjetas). Reglas: `senorArrozFront/docs/business-rules.md` (Cocina).
 */
const OMIT_WORDS = new Set(['arroz', 'con', 'de', 'unidades'])
const CHICH_REGEX = /chicharr[óo]n|chicharron/giu

function stripAccents(s: string): string {
    return s.normalize('NFD').replace(/\p{M}/gu, '')
}

function lowerStrip(s: string): string {
    return stripAccents(s.toLowerCase())
}

function removeAlaFrancesa(s: string): string {
    // Obvia "a la francesa" (incl. francésa / typo fransesa)
    return s.replace(
        /(?:^|\s)(?:a|á)\s+la\s+fr(?:ancesa|ancésa|ansesa)(?=\s|$)/giu,
        ' ',
    )
}

function mergeRopaVieja(parts: string[]): string[] {
    const out: string[] = []
    for (let i = 0; i < parts.length; i++) {
        const a = parts[i]!
        const b = i + 1 < parts.length ? parts[i + 1] : null
        if (b && lowerStrip(a) === 'ropa' && lowerStrip(b) === 'vieja') {
            out.push('ropa')
            i++
            continue
        }
        out.push(a)
    }
    return out
}

function applyChichInWord(word: string): string {
    return word.replace(CHICH_REGEX, 'chich')
}

function isOmittedToken(word: string): boolean {
    return OMIT_WORDS.has(lowerStrip(word))
}

function isSuperToken(word: string): boolean {
    return lowerStrip(word) === 'super'
}

function isFamiliarToken(word: string): boolean {
    return lowerStrip(word) === 'familiar'
}

function scanHasSuperAndFamiliar(parts: string[]): { hasSuper: boolean; hasFamiliar: boolean } {
    let hasSuper = false
    let hasFamiliar = false
    for (const w of parts) {
        if (isSuperToken(w)) hasSuper = true
        if (isFamiliarToken(w)) hasFamiliar = true
    }
    return { hasSuper, hasFamiliar }
}

/** Si hay "Súper" en el pedido, se muestra primero (cocina lee el tamaño al inicio). */
function putSuperFirst(tokens: string[]): string[] {
    if (!tokens.includes('super')) return tokens
    return ['super', ...tokens.filter((t) => t !== 'super')]
}

function postFormatLine(s: string): string {
    let t = s.replace(/\s+/g, ' ').trim()
    t = t.replace(/\b(\d+)\s*gr\b/gi, '$1g')
    t = t.replace(/\b([xX])(\d+)\b/g, (_, _x: string, n: string) => `x ${n}`)
    return t
}

export function formatKitchenProductDisplayName(productName: string | null | undefined): string {
    if (productName == null || !productName.trim()) return ''

    const trimmed = productName.trim()
    let working = removeAlaFrancesa(trimmed)
    working = working.replace(/\s+/g, ' ').trim()

    const parts = working.split(/\s+/).filter((p) => p.length > 0)
    if (parts.length === 0) return trimmed

    const { hasSuper, hasFamiliar } = scanHasSuperAndFamiliar(parts)
    const merged = mergeRopaVieja(parts)
    const result: string[] = []

    for (const w of merged) {
        if (isOmittedToken(w)) continue
        if (hasSuper && hasFamiliar && isFamiliarToken(w)) continue
        if (isSuperToken(w)) {
            result.push('super')
            continue
        }
        result.push(applyChichInWord(w))
    }

    let s = putSuperFirst(result).join(' ').trim()
    s = postFormatLine(s)
    if (s.length === 0) return trimmed
    return s
}
