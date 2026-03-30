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
