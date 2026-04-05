/** Máx. caracteres visibles en la pestaña del sidebar de pedidos. */
export const ORDER_TAB_LABEL_MAX_CHARS = 18

export function truncateOrderTabLabel(text: string, maxChars = ORDER_TAB_LABEL_MAX_CHARS): string {
    const t = text.trim()
    if (!t) return ''
    if (t.length <= maxChars) return t
    return `${t.slice(0, Math.max(1, maxChars - 1))}…`
}

/**
 * Fallback cuando no hay guestName: último segmento numérico de tabId (`tab-{ts}-{n}` → `#n`).
 */
export function draftTabFallbackId(tabId: string): string {
    const m = tabId.match(/-(\d+)$/)
    if (m) return `#${m[1]}`
    const compact = tabId.replace(/[^a-zA-Z0-9]/g, '').slice(-6)
    return compact ? `#${compact}` : '#?'
}

export function orderTabSidebarLabel(guestName: string | null | undefined, tabId: string): { label: string; title: string } {
    const g = guestName?.trim()
    if (g) {
        return {
            label: truncateOrderTabLabel(g),
            title: g,
        }
    }
    const fb = draftTabFallbackId(tabId)
    return { label: fb, title: fb }
}
