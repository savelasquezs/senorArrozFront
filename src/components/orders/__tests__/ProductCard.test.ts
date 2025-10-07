import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import ProductCard from '@/components/orders/ProductCard.vue'
import type { Product } from '@/types/order'

// Mock del store
const mockOrdersStore = {
    addProductToActiveOrder: vi.fn()
}

// Mock del composable
const mockToast = {
    success: vi.fn()
}

vi.mock('@/store/orders', () => ({
    useOrdersStore: () => mockOrdersStore
}))

vi.mock('@/composables/useToast', () => ({
    useToast: () => mockToast
}))

describe('ProductCard', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    const mockProduct: Product = {
        id: 1,
        name: 'Test Product',
        price: 10000,
        stock: 10,
        categoryId: 1,
        categoryName: 'Test Category',
        active: true
    }

    it('renders product information correctly', () => {
        const wrapper = mount(ProductCard, {
            props: { product: mockProduct }
        })

        expect(wrapper.text()).toContain('Test Product')
        expect(wrapper.text()).toMatch(/\$.*10\.000/)
        expect(wrapper.text()).toContain('Agregar')
    })

    it('applies correct variant classes', () => {
        const wrapper = mount(ProductCard, {
            props: {
                product: mockProduct,
                variant: 'featured'
            }
        })

        expect(wrapper.classes()).toContain('ring-2')
        expect(wrapper.classes()).toContain('ring-emerald-500')
    })

    it('shows disabled state when product is inactive', () => {
        const inactiveProduct = { ...mockProduct, active: false }
        const wrapper = mount(ProductCard, {
            props: { product: inactiveProduct }
        })

        expect(wrapper.classes()).toContain('opacity-50')
        expect(wrapper.classes()).toContain('cursor-not-allowed')
    })

    it('shows disabled state when product has negative stock', () => {
        const negativeStockProduct = { ...mockProduct, stock: -1 }
        const wrapper = mount(ProductCard, {
            props: { product: negativeStockProduct }
        })

        expect(wrapper.classes()).toContain('opacity-50')
        expect(wrapper.classes()).toContain('cursor-not-allowed')
    })

    it('shows enabled state when product has zero stock', () => {
        const zeroStockProduct = { ...mockProduct, stock: 0 }
        const wrapper = mount(ProductCard, {
            props: { product: zeroStockProduct }
        })

        expect(wrapper.classes()).not.toContain('opacity-50')
        expect(wrapper.classes()).not.toContain('cursor-not-allowed')
    })

    it('emits product-click event when clicked', async () => {
        const wrapper = mount(ProductCard, {
            props: { product: mockProduct }
        })

        await wrapper.trigger('click')

        expect(wrapper.emitted('product-click')).toBeTruthy()
        expect(wrapper.emitted('product-click')?.[0]).toEqual([mockProduct])
    })

    it('calls store method when add button is clicked', async () => {
        const wrapper = mount(ProductCard, {
            props: { product: mockProduct }
        })

        const addButton = wrapper.findComponent({ name: 'BaseButton' })
        await addButton.trigger('click')

        expect(mockOrdersStore.addProductToActiveOrder).toHaveBeenCalledWith(mockProduct)
        expect(wrapper.emitted('product-add')).toBeTruthy()
    })

    it('does not emit events when disabled', async () => {
        const inactiveProduct = { ...mockProduct, active: false }
        const wrapper = mount(ProductCard, {
            props: { product: inactiveProduct }
        })

        await wrapper.trigger('click')

        expect(wrapper.emitted('product-click')).toBeFalsy()
    })

    it('shows loading state correctly', () => {
        const wrapper = mount(ProductCard, {
            props: {
                product: mockProduct,
                isLoading: true
            }
        })

        expect(wrapper.text()).toContain('Agregando...')
    })

    it('shows selected state correctly', () => {
        const wrapper = mount(ProductCard, {
            props: {
                product: mockProduct,
                isSelected: true
            }
        })

        expect(wrapper.classes()).toContain('ring-2')
        expect(wrapper.classes()).toContain('ring-emerald-500')
    })
})
