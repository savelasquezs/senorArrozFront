import { describe, expect, it } from 'vitest'
import { filterOrderCatalog } from '../orderProductCatalog'
import type { Product } from '@/types/product'

const categories = [{ id: 1, name: 'Arroz Paisa' }, { id: 2, name: 'Gaseosas' }]
const product = (id: number, name: string, categoryId = 1, active = true) => ({
    id, name, categoryId, categoryName: categories.find(category => category.id === categoryId)?.name ?? '',
    active, price: 10000, stock: null,
}) as Product

describe('M09-F02 local order catalog filtering', () => {
    it('reads each eligible product name once during multi-term search', () => {
        let nameReads = 0
        const rows = Array.from({ length: 40 }, (_, i) => {
            const row = product(i + 1, '', 2)
            Object.defineProperty(row, 'name', {
                enumerable: true,
                get() {
                    nameReads++
                    return i === 0 ? 'Ropa Vieja Super Familiar' : 'Ropa Vieja Personal'
                },
            })
            return row
        })

        expect(filterOrderCatalog(rows, categories, 'ropa vieja super', null).map(row => row.id)).toEqual([1])
        // Previously, terms.every recomputed name + category once for each
        // matching query term (120 reads for these 40 three-word candidates).
        expect(nameReads).toBe(40)
    })

    it('preserves accent folding, comma decimal search and rice portion order', () => {
        const rows = [
            product(1, 'Arroz Paísa 1,5L Personal'),
            product(2, 'Arroz Paísa 1,5L Súper'),
            product(3, 'Arroz Paísa 1,5L Trío'),
            product(4, 'Arroz Paísa 1,5L Inactivo', 1, false),
            product(5, 'Arroz Paísa 1,5L Bebida', 2),
        ]
        expect(filterOrderCatalog(rows, categories, 'PÁISA 1.5', [1]).map(row => row.id)).toEqual([2, 3, 1])
        expect(filterOrderCatalog(rows, categories, 'PÁISA 1.5', null).map(row => row.id)).toEqual([1, 2, 3, 5])
        expect(filterOrderCatalog(rows, categories, '', [2]).map(row => row.id)).toEqual([5])
    })

    it('does not read names for an empty query or excluded categories', () => {
        let nameReads = 0
        const rows = [product(1, 'ignored', 1), product(2, 'also ignored', 2)]
        for (const row of rows) Object.defineProperty(row, 'name', {
            get() { nameReads++; return 'Cualquier Nombre' },
        })
        expect(filterOrderCatalog(rows, categories, '', null).map(row => row.id)).toEqual([1, 2])
        expect(filterOrderCatalog(rows, categories, 'término', [99])).toEqual([])
        expect(nameReads).toBe(0)
    })
})
