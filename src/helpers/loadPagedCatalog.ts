import type { PagedResult } from '@/types/common'

export async function loadPagedCatalog<T extends { id: number }>(
    fetchPage: (page: number) => Promise<PagedResult<T>>,
    onPage: (items: T[]) => void,
): Promise<T[]> {
    const items = new Map<number, T>()
    let pages = 1
    for (let page = 1; page <= pages; page++) {
        const result = await fetchPage(page)
        for (const item of result.items ?? []) items.set(item.id, item)
        pages = Math.max(1, result.totalPages ?? (Math.ceil(result.totalCount / result.pageSize) || 1))
        if (page < pages && !result.items?.length) throw new Error('El catálogo recibido está incompleto. Reintenta cargarlo.')
        onPage([...items.values()])
    }
    return [...items.values()]
}
