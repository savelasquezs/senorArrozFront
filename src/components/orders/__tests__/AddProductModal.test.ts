import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddProductModal from '../AddProductModal.vue'
import OrderDetailProductsList from '../OrderDetailProductsList.vue'
import { useProductsStore } from '@/store/products'
import { useProductCategoriesStore } from '@/store/productCategories'
import type { Product } from '@/types/product'

const api = vi.hoisted(() => ({ products: vi.fn(), categories: vi.fn(), availability: vi.fn() }))
vi.mock('@/services/MainAPI/productApi', () => ({ productApi: { getProducts: api.products } }))
vi.mock('@/services/MainAPI/productCategoryApi', () => ({ productCategoryApi: { getProductCategories: api.categories } }))
vi.mock('@/services/MainAPI/inventoryApi', () => ({ inventoryApi: { getAvailability: api.availability } }))

const product = (id: number, name: string, extra = {}) => ({ id, name, categoryId: 2, categoryName: 'Gaseosas',
    price: 8000, stock: 4, active: true, inventoryEnabled: false, inventoryControlMode: 'estimated', ...extra }) as Product
const page = (items: unknown[], totalPages = 1) => ({ data: { items, page: 1, pageSize: 150,
    totalCount: totalPages === 1 ? items.length : 151, totalPages } })
const stubs = {
    BaseDialog: { props: ['modelValue'], template: '<div v-if="modelValue" role="dialog"><slot /><slot name="footer" /></div>' },
    ProductCategories: { props: ['categories', 'loading'], emits: ['category-selected'],
        template: '<div><button v-for="category in categories" :key="category.id" @click="$emit(\'category-selected\', category.id)">{{ category.name }}</button></div>' },
}
function render(open = true) {
    return mount(AddProductModal, { props: { open, branchId: 2, existingProductIds: [1] },
        global: { plugins: [createPinia()], stubs } })
}
function button(wrapper: ReturnType<typeof render>, text: string) {
    return wrapper.findAll('button').find(item => item.text() === text)!
}

describe('order detail product catalog', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        api.products.mockResolvedValue(page([product(1, 'Ya agregado'), product(2, 'CocaCola 1.5L')]))
        api.categories.mockResolvedValue(page([{ id: 2, name: 'Gaseosas' }]))
        api.availability.mockResolvedValue([])
    })

    it('shows the complete catalog on a direct detail visit without administrative lists', async () => {
        api.products.mockResolvedValueOnce(page([product(1, 'Ya agregado')], 2))
            .mockResolvedValueOnce(page([product(151, 'CocaCola 1.5L')], 2))
        const wrapper = render()
        await flushPromises()
        expect(useProductsStore().currentProducts).toEqual([])
        expect(useProductCategoriesStore().currentCategories).toEqual([])
        expect(wrapper.text()).toContain('Gaseosas')
        expect(wrapper.text()).toContain('CocaCola 1.5L')
        expect(wrapper.text()).not.toContain('Ya agregado')
        await wrapper.get('input[placeholder="Buscar productos..."]').setValue('coca')
        await wrapper.get('.product-list-item').trigger('click')
        await button(wrapper, 'Agregar al Pedido').trigger('click')
        expect(wrapper.emitted('product-added')?.[0]?.[0]).toMatchObject({ productId: 151, quantity: 1, unitPrice: 8000 })
        wrapper.unmount()
    })

    it('loads only when opened and keeps a slow catalog in the loading state', async () => {
        let finish!: (value: ReturnType<typeof page>) => void
        api.products.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
        const wrapper = render(false)
        await flushPromises()
        expect(api.products).not.toHaveBeenCalled()
        expect(api.categories).not.toHaveBeenCalled()
        await wrapper.setProps({ open: true })
        expect(wrapper.find('.animate-pulse').exists()).toBe(true)
        expect(wrapper.text()).not.toContain('No se encontraron productos')
        expect(button(wrapper, 'Agregar al Pedido').attributes('disabled')).toBeDefined()
        finish(page([product(2, 'CocaCola 1.5L')]))
        await flushPromises()
        expect(wrapper.text()).toContain('CocaCola 1.5L')
        expect(wrapper.find('.animate-pulse').exists()).toBe(false)
        wrapper.unmount()
    })

    it('offers retry after availability fails and uses the order branch on every attempt', async () => {
        api.products.mockResolvedValue(page([product(2, 'CocaCola 1.5L', { inventoryEnabled: true, inventoryControlMode: 'strict' })]))
        api.availability.mockRejectedValueOnce(new Error('network'))
            .mockResolvedValue([{ productId: 2, controlMode: 'strict', maximumQuantity: 4, available: true }])
        const wrapper = render()
        await flushPromises()
        expect(wrapper.get('[role="alert"]').text()).toContain('No se pudieron cargar')
        expect(wrapper.text()).not.toContain('No se encontraron productos')
        expect(wrapper.find('.product-list-item').exists()).toBe(false)
        await button(wrapper, 'Reintentar').trigger('click')
        await flushPromises()
        expect(api.availability.mock.calls.map(call => call.slice(1))).toEqual([[2, true], [2, true]])
        expect(wrapper.find('[role="alert"]').exists()).toBe(false)
        await wrapper.get('.product-list-item').trigger('click')
        await button(wrapper, 'Agregar al Pedido').trigger('click')
        expect(wrapper.emitted('product-added')?.[0]?.[0]).toMatchObject({ productId: 2 })
        await wrapper.setProps({ open: false })
        await wrapper.setProps({ open: true, branchId: 3 })
        await flushPromises()
        expect(api.availability).toHaveBeenLastCalledWith([2], 3, true)
        expect(wrapper.find('[role="alert"]').exists()).toBe(false)
        expect(button(wrapper, 'Agregar al Pedido').attributes('disabled')).toBeDefined()
        wrapper.unmount()
    })

    it('keeps errors from a closed request out of the next opening', async () => {
        let fail!: (reason: Error) => void
        api.products.mockReturnValueOnce(new Promise((_, reject) => { fail = reject }))
        const wrapper = render()
        await flushPromises()
        await wrapper.setProps({ open: false })
        fail(new Error('network'))
        await flushPromises()
        await wrapper.setProps({ open: true })
        await flushPromises()
        expect(wrapper.find('[role="alert"]').exists()).toBe(false)
        expect(wrapper.text()).toContain('CocaCola 1.5L')
        wrapper.unmount()
    })

    it('passes the persisted order branch and adds only to the local edit until Save', async () => {
        api.products.mockResolvedValue(page([product(2, 'CocaCola 1.5L', { inventoryEnabled: true, inventoryControlMode: 'strict' })]))
        api.availability.mockResolvedValue([{ productId: 2, controlMode: 'strict', maximumQuantity: 4, available: true }])
        const wrapper = mount(OrderDetailProductsList, {
            props: { products: [], branchId: 3, deliveryFee: 0, canEdit: true },
            global: { plugins: [createPinia()], stubs },
        })
        await wrapper.findAll('button').find(item => item.text() === 'Editar Productos')!.trigger('click')
        await wrapper.findAll('button').find(item => item.text() === 'Agregar Producto')!.trigger('click')
        await flushPromises()
        expect(api.availability).toHaveBeenCalledWith([2], 3, true)
        const modal = wrapper.getComponent(AddProductModal)
        await modal.get('.product-list-item').trigger('click')
        await modal.findAll('button').find(item => item.text() === 'Agregar al Pedido')!.trigger('click')
        expect(wrapper.find('tbody').text()).toContain('CocaCola 1.5L')
        expect(wrapper.emitted('save')).toBeUndefined()
        await wrapper.findAll('button').find(item => item.text() === 'Guardar Cambios')!.trigger('click')
        expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({ products: [{ productId: 2, quantity: 1, unitPrice: 8000 }] })
        wrapper.unmount()
    })
})
