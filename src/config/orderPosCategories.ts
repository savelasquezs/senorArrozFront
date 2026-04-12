/**
 * Reglas puntuales para la vista de nuevo pedido (/orders/new):
 * agrupar categorías, orden de botones "arroces" y orden de porciones en el grid.
 */

export type RiceGroupKey =
    | 'paisa'
    | 'ranchero'
    | 'ropa_vieja'
    | 'carbonara'
    | 'vegetariano'

const RICE_BAR_ORDER: RiceGroupKey[] = [
    'paisa',
    'ranchero',
    'ropa_vieja',
    'carbonara',
    'vegetariano',
]

const RICE_GROUP_LABEL: Record<RiceGroupKey, string> = {
    paisa: 'Paisa',
    ranchero: 'Ranchero',
    ropa_vieja: 'Ropa Vieja',
    carbonara: 'Carbonara',
    vegetariano: 'Vegetariano',
}

export function normalizeCategoryLabel(name: string): string {
    return name
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .trim()
}

/** Si el nombre de categoría pertenece a un grupo "arroz" del POS, devuelve su clave. */
export function riceGroupKeyForCategoryName(name: string): RiceGroupKey | null {
    const n = normalizeCategoryLabel(name)
    if (!n) return null
    if (n.includes('paisa')) return 'paisa'
    if (n.includes('ropa vieja')) return 'ropa_vieja'
    if (n.includes('ranchero')) return 'ranchero'
    if (n.includes('carbonara')) return 'carbonara'
    if (n.includes('vegetariano')) return 'vegetariano'
    return null
}

export interface OrderPosCategoryTab {
    key: string
    label: string
    categoryIds: number[]
    section: 'rice' | 'other'
}

export function buildOrderPosTabs(
    catalog: { id: number; name: string }[],
): { rice: OrderPosCategoryTab[]; other: OrderPosCategoryTab[] } {
    const riceMap = new Map<RiceGroupKey, number[]>()
    for (const key of RICE_BAR_ORDER) riceMap.set(key, [])

    const other: { id: number; name: string }[] = []

    for (const c of catalog) {
        const g = riceGroupKeyForCategoryName(c.name)
        if (g) riceMap.get(g)!.push(c.id)
        else other.push(c)
    }

    const rice: OrderPosCategoryTab[] = []
    for (const key of RICE_BAR_ORDER) {
        const ids = riceMap.get(key) || []
        if (ids.length > 0) {
            rice.push({
                key,
                label: RICE_GROUP_LABEL[key],
                categoryIds: ids,
                section: 'rice',
            })
        }
    }

    other.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
    const otherTabs: OrderPosCategoryTab[] = other.map((c) => ({
        key: `cat-${c.id}`,
        label: c.name,
        categoryIds: [c.id],
        section: 'other',
    }))

    return { rice, other: otherTabs }
}

export function getRiceCategoryIdSet(catalog: { id: number; name: string }[]): Set<number> {
    const s = new Set<number>()
    for (const c of catalog) {
        if (riceGroupKeyForCategoryName(c.name)) s.add(c.id)
    }
    return s
}

/**
 * Pestaña del POS con una o varias categorías del mismo grupo arroz Paisa o Ropa vieja
 * (incluye el caso “Paisa + Paisa con chicharrón” con varios categoryId).
 */
export function selectedTabIsPaisaOrRopaVieja(
    catalog: { id: number; name: string }[],
    selectedCategoryIds: number[] | null,
): boolean {
    if (!selectedCategoryIds?.length) return false
    const catById = new Map(catalog.map(c => [c.id, c]))
    let group: RiceGroupKey | null = null
    for (const id of selectedCategoryIds) {
        const c = catById.get(id)
        if (!c) return false
        const g = riceGroupKeyForCategoryName(c.name)
        if (!g) return false
        if (group === null) group = g
        else if (g !== group) return false
    }
    return group === 'paisa' || group === 'ropa_vieja'
}

export type FirstWordGroupTabKind = 'gaseosas' | 'adiciones'

/** Gaseosas vs Adiciones (no ambos en el mismo nombre). */
export function categoryFirstWordGroupKind(name: string): FirstWordGroupTabKind | null {
    const n = normalizeCategoryLabel(name)
    if (!n) return null
    const isGaseosa = n.includes('gaseosa')
    const isAdicion = n.includes('adicion')
    if (isGaseosa && isAdicion) return null
    if (isGaseosa) return 'gaseosas'
    if (isAdicion) return 'adiciones'
    return null
}

/**
 * Pestaña con una o varias categorías, todas del mismo tipo (solo gaseosas o solo adiciones).
 * Si se mezclan tipos o hay categorías fuera de esos buckets, false (grid plano).
 */
export function selectedTabIsFirstWordGroupCategory(
    catalog: { id: number; name: string }[],
    selectedCategoryIds: number[] | null,
): boolean {
    if (!selectedCategoryIds?.length) return false
    const catById = new Map(catalog.map(c => [c.id, c]))
    let kind: FirstWordGroupTabKind | null = null
    for (const id of selectedCategoryIds) {
        const c = catById.get(id)
        if (!c) return false
        const k = categoryFirstWordGroupKind(c.name)
        if (k === null) return false
        if (kind === null) kind = k
        else if (k !== kind) return false
    }
    return kind !== null
}

const FIRST_WORD_GROUP_STOPWORDS = new Set([
    'gaseosa',
    'gaseosas',
    'bebida',
    'bebidas',
    'adicion',
    'adiciones',
])

/**
 * Clave estable para agrupar productos por “marca” o primera palabra útil del nombre (POS).
 * Normaliza acentos; trata guiones como espacio; salta palabras genéricas.
 */
export function firstWordGroupKeyFromProductName(name: string): string {
    const withSpaces = name.replace(/-/g, ' ')
    const n = normalizeCategoryLabel(withSpaces)
    if (!n) return 'otros'
    const tokens = n.split(/\s+/).filter(Boolean)
    let i = 0
    while (i < tokens.length && FIRST_WORD_GROUP_STOPWORDS.has(tokens[i])) {
        i++
    }
    if (i < tokens.length) return tokens[i]
    return tokens[0] ?? 'otros'
}

/** Súper → Familiar → Trío → Dúo → Personal (índice menor = antes). Texto ya sin acentos. */
const PORTION_ENDINGS: { rank: number; pattern: RegExp }[] = [
    { rank: 0, pattern: /\bsuper\s*$/i },
    { rank: 1, pattern: /\bfamiliar\s*$/i },
    { rank: 2, pattern: /\btrio\s*$/i },
    { rank: 3, pattern: /\bduo\s*$/i },
    { rank: 4, pattern: /\bpersonal\s*$/i },
]

export function portionSortRank(productName: string): number {
    const n = normalizeCategoryLabel(productName)
    for (const { rank, pattern } of PORTION_ENDINGS) {
        if (pattern.test(n)) return rank
    }
    return 100
}

export function sortProductsByPortionOrder<T extends { name: string }>(products: T[]): T[] {
    return [...products].sort((a, b) => {
        const ra = portionSortRank(a.name)
        const rb = portionSortRank(b.name)
        if (ra !== rb) return ra - rb
        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    })
}

export function sameCategoryIdSelection(a: number[] | null, b: number[]): boolean {
    if (a === null) return false
    if (a.length !== b.length) return false
    const sa = [...a].sort((x, y) => x - y)
    const sb = [...b].sort((x, y) => x - y)
    return sa.every((v, i) => v === sb[i])
}
