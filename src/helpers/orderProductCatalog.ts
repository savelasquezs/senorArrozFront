import { getRiceCategoryIdSet, normalizeCategoryLabel, sortProductsByPortionOrder } from '@/config/orderPosCategories'
import type { Product } from '@/types/product'

export function orderCatalogCategories(products: Product[], categories: { id: number; name: string }[] = []) {
    if (categories.length) return categories
    return [...new Map(products.map(product => [product.categoryId, {
        id: product.categoryId, name: product.categoryName || 'Sin categoría',
    }])).values()]
}

export function filterOrderCatalog(products: Product[], categories: { id: number; name: string }[], query: string, categoryIds: number[] | null) {
    const terms = normalizeCategoryLabel(query).replace(/,/g, '.').split(/\s+/).filter(Boolean)
    const allowed = categoryIds?.length ? new Set(categoryIds) : null
    const filtered = products.filter(product => {
        if (!product.active || (allowed && !allowed.has(product.categoryId))) return false
        if (!terms.length) return true
        // Normalize the candidate once, not once per term on each keystroke.
        const text = normalizeCategoryLabel(`${product.name} ${product.categoryName ?? ''}`).replace(/,/g, '.')
        return terms.every(term => text.includes(term))
    })
    // Group ordering is needed only for an explicitly selected rice category.
    if (!categoryIds?.length) return filtered
    const riceIds = getRiceCategoryIdSet(categories)
    return categoryIds.every(id => riceIds.has(id)) ? sortProductsByPortionOrder(filtered) : filtered
}
