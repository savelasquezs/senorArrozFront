import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, disposePinia, type Pinia } from 'pinia'
import { nextTick, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProductGrid from '../products/ProductGrid.vue'
import ProductCard from '../products/ProductCard.vue'
import type { Product } from '@/types/product'
import { portionSortRank, sortProductsByPortionOrder } from '@/config/orderPosCategories'

vi.mock('@/composables/useOrderItems', () => ({ useOrderItems: () => ({ addProduct: vi.fn() }) }))
const categories = [{ id: 1, name: 'Paisa' }, { id: 2, name: 'Paisa Chich' }, { id: 3, name: 'Gaseosas' }, { id: 4, name: 'Adiciones' }]
const product = (id: number, name: string, categoryId = 3) => ({ id, name, categoryId,
    categoryName: categories.find(c => c.id === categoryId)!.name, price: 8000, stock: null, active: true, inventoryEnabled: false }) as Product
let pinia: Pinia
const wrappers: VueWrapper[] = []
function render(products = [product(1, 'CocaCola Personal'), product(2, 'CocaCola Familiar'), product(3, 'Pepsi Personal')],
    selectedCategoryIds: number[] = [3], extra = {}) {
    const wrapper = mount(ProductGrid, { props: { products, categories, selectedCategoryIds, selectionOnly: true, ...extra }, global: { plugins: [pinia] } })
    wrappers.push(wrapper)
    return wrapper
}
const cards = (wrapper: VueWrapper) => wrapper.findAllComponents(ProductCard)
const cardIds = (wrapper: VueWrapper) => cards(wrapper).map(card => card.props('product').id)
async function openCoca(wrapper: VueWrapper) {
    await wrapper.findAll('.first-word-group-btn').find(button => button.text().includes('Cocacola'))!.trigger('click')
}

describe('M09-F02 stable groups and reactive selections', () => {
    beforeEach(() => { pinia = createPinia() })
    afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); disposePinia(pinia) })

    it('keeps the open group when catalog rows and category arrays are replaced', async () => {
        const wrapper = render(); await openCoca(wrapper)
        await wrapper.setProps({ products: [product(1, 'CocaCola Personal'), product(2, 'CocaCola Familiar'), product(3, 'Pepsi Personal')], selectedCategoryIds: [3] })
        expect(cardIds(wrapper)).toEqual([2, 1])
        expect(wrapper.find('.first-word-back-btn').exists()).toBe(true)
    })
    it('retains a group across a temporary empty loading state', async () => {
        const wrapper = render(); await openCoca(wrapper)
        await wrapper.setProps({ loading: true, products: [] })
        await wrapper.setProps({ loading: false, products: [product(2, 'CocaCola Familiar')] })
        expect(cardIds(wrapper)).toEqual([2])
    })
    it('returns to groups if the selected group disappears or its names change', async () => {
        const wrapper = render(); await openCoca(wrapper)
        await wrapper.setProps({ products: [product(1, 'Pepsi Familiar')] })
        expect(cards(wrapper)).toHaveLength(0)
        expect(wrapper.get('.first-word-group-btn').text()).toContain('Pepsi')
    })
    it('resets a group when the actual category selection changes', async () => {
        const wrapper = render(); await openCoca(wrapper)
        await wrapper.setProps({ selectedCategoryIds: [4], products: [product(1, 'CocaCola Familiar', 4)] })
        expect(cards(wrapper)).toHaveLength(0)
        expect(wrapper.find('.first-word-group-btn').exists()).toBe(true)
    })
    it('tracks in-place additions/removals in selected and excluded arrays', async () => {
        const selected = reactive<Product[]>([]), excluded = reactive<number[]>([])
        const rows = [product(1, 'CocaCola Personal'), product(2, 'CocaCola Familiar')]
        const wrapper = render(rows, [3], { selectedProducts: selected, disabledProductIds: excluded })
        await openCoca(wrapper)
        selected.push(rows[0]!); excluded.push(2); await nextTick()
        expect(cards(wrapper).find(c => c.props('product').id === 1)!.props('isSelected')).toBe(true)
        const second = () => cards(wrapper).find(c => c.props('product').id === 2)!
        expect(second().props('disabled')).toBe(true)
        await second().trigger('click'); expect(wrapper.emitted('product-add')).toBeUndefined()
        selected.splice(0); excluded.splice(0); await nextTick()
        expect(cards(wrapper).every(c => !c.props('isSelected') && !c.props('disabled'))).toBe(true)
        await second().trigger('click'); expect(wrapper.emitted('product-add')).toHaveLength(1)
    })
    it('preserves order and membership in both rice sections', async () => {
        const rows = [product(1, 'Paisa Super', 1), product(2, 'Paisa Personal', 1), product(3, 'Paisa con chicharrón Familiar', 2)]
        const selected = reactive<Product[]>([rows[0]!]), excluded = reactive<number[]>([3])
        const wrapper = render(rows, [1, 2], { selectedProducts: selected, disabledProductIds: excluded })
        expect(cardIds(wrapper)).toEqual([1, 2, 3])
        expect(wrapper.get('.chich-section').findAllComponents(ProductCard)).toHaveLength(1)
        selected.splice(0, 1, rows[2]!); excluded.splice(0, 1, 1); await nextTick()
        expect(cards(wrapper).find(c => c.props('product').id === 3)!.props('isSelected')).toBe(true)
        expect(cards(wrapper).find(c => c.props('product').id === 1)!.props('disabled')).toBe(true)
    })
    it('sorts without mutating input and reads every name only once', () => {
        let reads = 0
        const names = ['Paisa Personal', 'Paisa Súper', 'Bebida', 'paisa super', 'Paisa Familiar']
        const rows = names.map((name, id) => ({ id, get name() { reads++; return name } }))
        const expected = names.map((name, id) => ({ id, name })).sort((a, b) =>
            portionSortRank(a.name) - portionSortRank(b.name) || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })).map(row => row.id)
        expect(sortProductsByPortionOrder(rows).map(row => row.id)).toEqual(expected)
        expect(reads).toBe(rows.length)
        expect(rows.map(row => row.id)).toEqual([0, 1, 2, 3, 4])
    })
})
