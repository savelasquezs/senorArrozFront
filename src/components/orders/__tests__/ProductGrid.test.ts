import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import ProductGrid from '@/components/orders/products/ProductGrid.vue'
import type { Product } from '@/types/order'

// Mock del store
const mockOrdersStore = {
    filteredProducts: []
}

vi.mock('@/store/orders', () => ({
    useOrdersStore: () => mockOrdersStore
}))

describe('ProductGrid', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    const mockProducts: Product[] = [
        {
            id: 1,
            name: 'Test Product 1',
            price: 10000,
            stock: 10,
            categoryId: 1,
            categoryName: 'Test Category',
            active: true
        },
        {
            id: 2,
            name: 'Test Product 2',
            price: 15000,
            stock: 5,
            categoryId: 1,
            categoryName: 'Test Category',
            active: true
        }
    ]

    it('renders products correctly', () => {
        const wrapper = mount(ProductGrid, {
            props: { products: mockProducts }
        })

        expect(wrapper.find('.products-grid').exists()).toBe(true)
        expect(wrapper.findAllComponents({ name: 'ProductCard' })).toHaveLength(2)
    })

    it('shows loading state with skeleton', () => {
        const wrapper = mount(ProductGrid, {
            props: {
                products: mockProducts,
                loading: true
            }
        })

        expect(wrapper.find('.products-grid').exists()).toBe(false)
        expect(wrapper.findAllComponents({ name: 'ProductCardSkeleton' })).toHaveLength(8) // default skeletonCount
    })

    it('shows empty state when no products', () => {
        const wrapper = mount(ProductGrid, {
            props: { products: [] }
        })

        expect(wrapper.find('.empty-state').exists()).toBe(true)
        expect(wrapper.text()).toContain('No hay productos')
    })

    it('shows custom empty message', () => {
        const wrapper = mount(ProductGrid, {
            props: {
                products: [],
                emptyMessage: 'Custom empty message',
                emptyDescription: 'Custom description'
            }
        })

        expect(wrapper.text()).toContain('Custom empty message')
        expect(wrapper.text()).toContain('Custom description')
    })

    it('applies correct gap classes', () => {
        const wrapper = mount(ProductGrid, {
            props: {
                products: mockProducts,
                gap: 'lg'
            }
        })

        expect(wrapper.find('.products-grid').classes()).toContain('gap-6')
    })

    it('applies fixed columns when specified', () => {
        const wrapper = mount(ProductGrid, {
            props: {
                products: mockProducts,
                columns: 3
            }
        })

        expect(wrapper.find('.products-grid').classes()).toContain('grid-cols-3')
    })

    it('applies responsive columns by default', () => {
        const wrapper = mount(ProductGrid, {
            props: { products: mockProducts }
        })

        const gridElement = wrapper.find('.products-grid')
        expect(gridElement.classes()).toContain('grid-cols-1')
        expect(gridElement.classes()).toContain('sm:grid-cols-2')
        expect(gridElement.classes()).toContain('md:grid-cols-3')
    })

    it('passes correct props to ProductCard', () => {
        const wrapper = mount(ProductGrid, {
            props: {
                products: mockProducts,
                cardVariant: 'compact',
                showStock: false
            }
        })

        const productCard = wrapper.findComponent({ name: 'ProductCard' })
        expect(productCard.props('variant')).toBe('compact')
        expect(productCard.props('showStock')).toBe(false)
    })

    it('emits product-click event', async () => {
        const wrapper = mount(ProductGrid, {
            props: { products: mockProducts }
        })

        const productCard = wrapper.findComponent({ name: 'ProductCard' })
        await productCard.vm.$emit('product-click', mockProducts[0])

        expect(wrapper.emitted('product-click')).toBeTruthy()
        expect(wrapper.emitted('product-click')?.[0]).toEqual([mockProducts[0]])
    })

    it('emits product-add event', async () => {
        const wrapper = mount(ProductGrid, {
            props: { products: mockProducts }
        })

        const productCard = wrapper.findComponent({ name: 'ProductCard' })
        await productCard.vm.$emit('product-add', mockProducts[0])

        expect(wrapper.emitted('product-add')).toBeTruthy()
        expect(wrapper.emitted('product-add')?.[0]).toEqual([mockProducts[0]])
    })

    it('emits products-loaded event when products change', async () => {
        const wrapper = mount(ProductGrid, {
            props: { products: [] }
        })

        await wrapper.setProps({ products: mockProducts })

        expect(wrapper.emitted('products-loaded')).toBeTruthy()
        expect(wrapper.emitted('products-loaded')?.[0]).toEqual([mockProducts])
    })

    it('shows selected state for selected products', () => {
        const wrapper = mount(ProductGrid, {
            props: {
                products: mockProducts,
                selectedProducts: [mockProducts[0]]
            }
        })

        const productCards = wrapper.findAllComponents({ name: 'ProductCard' })
        expect(productCards[0].props('isSelected')).toBe(true)
        expect(productCards[1].props('isSelected')).toBe(false)
    })

    it('uses custom skeleton count', () => {
        const wrapper = mount(ProductGrid, {
            props: {
                products: mockProducts,
                loading: true,
                skeletonCount: 4
            }
        })

        expect(wrapper.findAllComponents({ name: 'ProductCardSkeleton' })).toHaveLength(4)
    })

    it('limits skeleton count when using fixed columns', () => {
        const wrapper = mount(ProductGrid, {
            props: {
                products: mockProducts,
                loading: true,
                columns: 2,
                skeletonCount: 10 // Should be limited to columns * 2
            }
        })

        expect(wrapper.findAllComponents({ name: 'ProductCardSkeleton' })).toHaveLength(4) // 2 * 2
    })
})
