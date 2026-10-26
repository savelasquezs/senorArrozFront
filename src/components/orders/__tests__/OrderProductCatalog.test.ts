import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrderProductCatalog from '../OrderProductCatalog.vue'
import ProductCard from '../products/ProductCard.vue'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useProductsStore } from '@/store/products'
import type { Product } from '@/types/product'

const addProduct = vi.hoisted(() => vi.fn())
vi.mock('@/composables/useOrderItems', () => ({ useOrderItems: () => ({ addProduct }) }))
const categories = [{ id: 1, name: 'Paisa' }, { id: 2, name: 'Paisa Chich' }, { id: 3, name: 'Gaseosas' }]
const product = (id: number, name: string, categoryId: number) => ({ id, name, categoryId,
    categoryName: categories.find(category => category.id === categoryId)!.name,
    price: 8000, stock: null, active: true, inventoryEnabled: false }) as Product
const products = [product(1, 'Arroz paisa Trío', 1), product(2, 'Arroz paisa con chicharrón Trío', 2),
    product(3, 'CocaCola 1.5L', 3), product(4, 'CocaCola PET 400', 3)]
function render(selectionOnly = true, rows = products) {
    return mount(OrderProductCatalog, { props: { products: rows, categories, selectionOnly }, global: { plugins: [createPinia()] } })
}

describe('shared POS catalog', () => {
    beforeEach(() => vi.clearAllMocks())

    it('shares Paisa/Chich categories and beverage grouping without changing the POS filter', async () => {
        const wrapper = render()
        const drafts = useOrdersDraftsStore()
        drafts.selectedCategoryIds = [77]
        await wrapper.findAll('button').find(button => button.text() === 'Paisa')!.trigger('click')
        expect(wrapper.findAllComponents(ProductCard)).toHaveLength(2)
        expect(wrapper.text()).toContain('Con chicharrón')
        expect(drafts.selectedCategoryIds).toEqual([77])
        await wrapper.findAll('button').find(button => button.text() === 'Gaseosas')!.trigger('click')
        expect(wrapper.findAllComponents(ProductCard)).toHaveLength(0)
        await wrapper.get('.first-word-group-btn').trigger('click')
        expect(wrapper.findAllComponents(ProductCard)).toHaveLength(2)
        await wrapper.findAll('button').find(button => button.text() === 'Volver')!.trigger('click')
        expect(wrapper.find('.first-word-group-btn').exists()).toBe(true)
        wrapper.unmount()
    })

    it('finds accented multiword presentations globally and emits one local selection', async () => {
        const wrapper = render()
        await wrapper.get('input').setValue('paisa trio')
        expect(wrapper.findAllComponents(ProductCard)).toHaveLength(2)
        await wrapper.findAllComponents(ProductCard)[0].trigger('keydown', { key: 'Enter' })
        expect(wrapper.emitted('product-selected')).toHaveLength(1)
        expect(addProduct).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('retains automatic POS additions by default', async () => {
        const wrapper = render(false)
        await wrapper.findAllComponents(ProductCard)[0].trigger('click')
        expect(addProduct).toHaveBeenCalledExactlyOnceWith(products[0])
        expect(wrapper.emitted('product-selected')).toHaveLength(1)
        wrapper.unmount()
    })

    it('never falls back to another workspace when an explicit catalog is empty', async () => {
        const wrapper = render(true, [])
        useProductsStore().catalogProducts = products
        await flushPromises()
        expect(wrapper.findAllComponents(ProductCard)).toHaveLength(0)
        expect(wrapper.text()).toContain('No hay productos')
        wrapper.unmount()
    })
})
