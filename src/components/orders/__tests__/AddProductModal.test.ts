import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddProductModal from '../AddProductModal.vue'
import OrderDetailProductsList from '../OrderDetailProductsList.vue'
import OrderItem from '../OrderItem.vue'
import ProductCard from '../products/ProductCard.vue'
import { useProductsStore } from '@/store/products'
import { useProductCategoriesStore } from '@/store/productCategories'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import type { Product } from '@/types/product'

const api = vi.hoisted(() => ({ products: vi.fn(), categories: vi.fn(), availability: vi.fn() }))
vi.mock('@/services/MainAPI/productApi', () => ({ productApi: { getProducts: api.products } }))
vi.mock('@/services/MainAPI/productCategoryApi', () => ({ productCategoryApi: { getProductCategories: api.categories } }))
vi.mock('@/services/MainAPI/inventoryApi', () => ({ inventoryApi: { getAvailability: api.availability } }))
const product = (id: number, name: string, extra = {}) => ({ id, name, categoryId: 2, categoryName: 'Gaseosas',
    price: 8000, stock: 4, active: true, inventoryEnabled: false, inventoryControlMode: 'estimated', ...extra }) as Product
const page = (items: unknown[], totalPages = 1) => ({ data: { items, page: 1, pageSize: 150,
    totalCount: totalPages === 1 ? items.length : 151, totalPages } })
const stubs = { BaseDialog: { props: ['modelValue'], template: '<div v-if="modelValue" role="dialog"><slot /><slot name="footer" /></div>' } }
function render(open = true, extra = {}) {
    return mount(AddProductModal, { props: { open, branchId: 2, existingProductIds: [1], ...extra },
        global: { plugins: [createPinia()], stubs } })
}
function button(wrapper: VueWrapper<any>, text: string) {
    return wrapper.findAll('button').find(item => item.text() === text)!
}
async function choose(wrapper: VueWrapper<any>, id = 2) {
    await wrapper.findAllComponents(ProductCard).find(card => card.props('product').id === id)!.trigger('click')
}

describe('order detail product catalog', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        api.products.mockResolvedValue(page([product(1, 'Ya agregado'), product(2, 'CocaCola 1.5L')]))
        api.categories.mockResolvedValue(page([{ id: 2, name: 'Gaseosas' }]))
        api.availability.mockResolvedValue([])
    })

    it('shows the complete paginated catalog on a direct visit and identifies existing products', async () => {
        api.products.mockResolvedValueOnce(page([product(1, 'Ya agregado')], 2))
            .mockResolvedValueOnce(page([product(151, 'CocaCola 1.5L')], 2))
        const wrapper = render()
        await flushPromises()
        expect(useProductsStore().currentProducts).toEqual([])
        expect(useProductCategoriesStore().currentCategories).toEqual([])
        expect(wrapper.text()).toContain('Gaseosas')
        expect(wrapper.text()).toContain('CocaCola 1.5L')
        expect(wrapper.findAllComponents(ProductCard)[0].attributes('aria-disabled')).toBe('true')
        expect(wrapper.text()).toContain('Ya en el pedido')
        await wrapper.get('input[aria-label="Buscar productos"]').setValue('coca')
        await choose(wrapper, 151)
        expect(wrapper.findComponent(OrderItem).exists()).toBe(true)
        await button(wrapper, 'Añadir a la edición').trigger('click')
        expect(wrapper.emitted('products-added')?.[0]?.[0]).toMatchObject([{ productId: 151, quantity: 1, unitPrice: 8000 }])
        wrapper.unmount()
    })

    it('loads only on open and distinguishes a slow catalog from an empty result', async () => {
        let finish!: (value: ReturnType<typeof page>) => void
        api.products.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
        const wrapper = render(false)
        await flushPromises()
        expect(api.products).not.toHaveBeenCalled()
        expect(api.categories).not.toHaveBeenCalled()
        await wrapper.setProps({ open: true })
        expect(wrapper.find('.animate-pulse').exists()).toBe(true)
        expect(button(wrapper, 'Añadir a la edición').attributes('disabled')).toBeDefined()
        finish(page([]))
        await flushPromises()
        expect(wrapper.text()).toContain('No hay productos')
        expect(wrapper.find('.animate-pulse').exists()).toBe(false)
        wrapper.unmount()
    })

    it('retries failed availability for the order branch and resets selection on a branch change', async () => {
        api.products.mockResolvedValue(page([product(2, 'CocaCola 1.5L', { inventoryEnabled: true, inventoryControlMode: 'strict' })]))
        api.availability.mockRejectedValueOnce(new Error('network'))
            .mockResolvedValue([{ productId: 2, controlMode: 'strict', maximumQuantity: 4, available: true }])
        const wrapper = render()
        await flushPromises()
        expect(wrapper.get('[role="alert"]').text()).toContain('No se pudieron cargar')
        expect(wrapper.getComponent(ProductCard).attributes('aria-disabled')).toBe('true')
        await button(wrapper, 'Reintentar').trigger('click')
        await flushPromises()
        expect(api.availability.mock.calls.map(call => call.slice(1))).toEqual([[2, true], [2, true]])
        await choose(wrapper)
        expect(wrapper.findComponent(OrderItem).exists()).toBe(true)
        await wrapper.setProps({ open: false })
        await wrapper.setProps({ open: true, branchId: 3 })
        await flushPromises()
        expect(api.availability).toHaveBeenLastCalledWith([2], 3, true)
        expect(wrapper.findComponent(OrderItem).exists()).toBe(false)
        expect(button(wrapper, 'Añadir a la edición').attributes('disabled')).toBeDefined()
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

    it('uses the shared row for quantity, price, percentage and notes without touching the POS draft', async () => {
        const wrapper = render()
        await flushPromises()
        const drafts = useOrdersDraftsStore()
        drafts.searchQuery = 'Filtro POS'
        drafts.selectedCategoryIds = [99]
        const before = JSON.stringify([...drafts.draftOrders])
        await choose(wrapper)
        await wrapper.get('[aria-label="Descuento en porcentaje de CocaCola 1.5L"]').setValue(10)
        await wrapper.get('[aria-label="Aumentar cantidad de CocaCola 1.5L"]').trigger('click')
        await wrapper.get('[aria-label="Precio de CocaCola 1.5L"]').setValue(10000)
        const row = wrapper.getComponent(OrderItem)
        await (row.props('saveNote') as (notes: string) => void)('Sin hielo')
        await button(wrapper, 'Añadir a la edición').trigger('click')
        expect(wrapper.emitted('products-added')?.[0]?.[0]).toMatchObject([{ quantity: 2, unitPrice: 10000, discount: 2000, notes: 'Sin hielo' }])
        expect(JSON.stringify([...drafts.draftOrders])).toBe(before)
        expect(drafts.currentTabId).toBeNull()
        expect(drafts.searchQuery).toBe('Filtro POS')
        expect(drafts.selectedCategoryIds).toEqual([99])
        wrapper.unmount()
    })

    it('keeps an explicitly empty search empty instead of showing products from the POS', async () => {
        const wrapper = render()
        await flushPromises()
        await wrapper.get('input[aria-label="Buscar productos"]').setValue('NoExiste')
        expect(wrapper.findAllComponents(ProductCard)).toHaveLength(0)
        expect(wrapper.text()).toContain('No hay productos')
        wrapper.unmount()
    })

    it('blocks confirmation for overstock, negative prices and external edit restrictions', async () => {
        const wrapper = render()
        await flushPromises()
        await choose(wrapper)
        for (let i = 0; i < 4; i++) await wrapper.get('[aria-label="Aumentar cantidad de CocaCola 1.5L"]').trigger('click')
        expect(wrapper.get('[role="alert"]').text()).toContain('Stock insuficiente')
        expect(button(wrapper, 'Añadir a la edición').attributes('disabled')).toBeDefined()
        await wrapper.get('[aria-label="Reducir cantidad de CocaCola 1.5L"]').trigger('click')
        await wrapper.get('[aria-label="Precio de CocaCola 1.5L"]').setValue(-1)
        expect(button(wrapper, 'Añadir a la edición').attributes('disabled')).toBeDefined()
        await wrapper.get('[aria-label="Precio de CocaCola 1.5L"]').setValue(0)
        expect(button(wrapper, 'Añadir a la edición').attributes('disabled')).toBeUndefined()
        await wrapper.setProps({ disabled: true })
        expect(wrapper.get('[role="alert"]').text()).toContain('La edición no está disponible')
        expect(button(wrapper, 'Añadir a la edición').attributes('disabled')).toBeDefined()
        expect(wrapper.findAllComponents(OrderItem)).toHaveLength(1)
        wrapper.unmount()
    })

    it('requires explicit discard to close or clear an unconfirmed selection', async () => {
        const wrapper = render()
        await flushPromises()
        await choose(wrapper)
        await button(wrapper, 'Cancelar').trigger('click')
        expect(wrapper.emitted('close')).toBeUndefined()
        await button(wrapper, 'Seguir editando').trigger('click')
        expect(wrapper.findComponent(OrderItem).exists()).toBe(true)
        await button(wrapper, 'Vaciar').trigger('click')
        await button(wrapper, 'Descartar selección').trigger('click')
        expect(wrapper.emitted('close')).toBeUndefined()
        expect(wrapper.findComponent(OrderItem).exists()).toBe(false)
        await choose(wrapper)
        await button(wrapper, 'Cancelar').trigger('click')
        await button(wrapper, 'Descartar selección').trigger('click')
        expect(wrapper.emitted('close')).toHaveLength(1)
        expect(wrapper.emitted('products-added')).toBeUndefined()
        wrapper.unmount()
    })

    it('adds several products as one local edit and saves only with the detail Save action', async () => {
        api.products.mockResolvedValue(page([product(2, 'CocaCola 1.5L'), product(3, 'Sprite 1.5L')]))
        const wrapper = mount(OrderDetailProductsList, {
            props: { products: [], branchId: 3, deliveryFee: 0, canEdit: true },
            global: { plugins: [createPinia()], stubs },
        })
        await button(wrapper, 'Editar Productos').trigger('click')
        await button(wrapper, 'Agregar Producto').trigger('click')
        await flushPromises()
        const modal = wrapper.getComponent(AddProductModal)
        await choose(modal, 2)
        await choose(modal, 3)
        expect(wrapper.emitted('save')).toBeUndefined()
        await button(modal, 'Añadir a la edición').trigger('click')
        expect(wrapper.findAll('tbody tr')).toHaveLength(2)
        expect(wrapper.emitted('save')).toBeUndefined()
        await button(wrapper, 'Guardar Cambios').trigger('click')
        expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({ products: [{ productId: 2 }, { productId: 3 }] })
        wrapper.unmount()
    })

    it('preserves existing manual discounts and distributes free delivery once across the added batch', async () => {
        api.products.mockResolvedValue(page([product(2, 'CocaCola 1.5L'), product(3, 'Sprite 1.5L')]))
        const wrapper = mount(OrderDetailProductsList, {
            props: { products: [{ id: 1, orderId: 1, productId: 1, productName: 'Arroz', productDescription: null,
                quantity: 1, unitPrice: 10000, discount: 3500, subtotal: 6500, notes: null, createdAt: '', updatedAt: '' }],
                branchId: 3, deliveryFee: 3000, orderType: 'delivery', addressId: 1, maxFreeDeliveryDiscount: 3000,
                freeDeliveryRequested: true, canEdit: true },
            global: { plugins: [createPinia()], stubs },
        })
        await button(wrapper, 'Editar Productos').trigger('click')
        await button(wrapper, 'Agregar Producto').trigger('click')
        await flushPromises()
        const modal = wrapper.getComponent(AddProductModal)
        await choose(modal, 2)
        await choose(modal, 3)
        await button(modal, 'Añadir a la edición').trigger('click')
        await button(wrapper, 'Guardar Cambios').trigger('click')
        expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({ freeDeliveryRequested: true,
            products: [{ productId: 1, discount: 1500 }, { productId: 2, discount: 1000 }, { productId: 3, discount: 1000 }] })
        wrapper.unmount()
    })
})
