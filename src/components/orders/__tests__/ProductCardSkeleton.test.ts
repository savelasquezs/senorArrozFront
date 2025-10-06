import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ProductCardSkeleton from '@/components/orders/ProductCardSkeleton.vue'

describe('ProductCardSkeleton', () => {
    it('renders skeleton elements correctly', () => {
        const wrapper = mount(ProductCardSkeleton)

        expect(wrapper.find('.product-card-skeleton').exists()).toBe(true)
        expect(wrapper.find('.aspect-square').exists()).toBe(true)
        expect(wrapper.findAll('.animate-pulse')).toHaveLength(8) // Multiple skeleton elements
    })

    it('applies default variant classes', () => {
        const wrapper = mount(ProductCardSkeleton)

        expect(wrapper.classes()).toContain('bg-white')
        expect(wrapper.classes()).toContain('rounded-lg')
        expect(wrapper.classes()).toContain('shadow-sm')
        expect(wrapper.classes()).toContain('border')
        expect(wrapper.classes()).toContain('border-gray-200')
    })

    it('applies compact variant classes', () => {
        const wrapper = mount(ProductCardSkeleton, {
            props: { variant: 'compact' }
        })

        expect(wrapper.classes()).toContain('p-2')
    })

    it('applies featured variant classes', () => {
        const wrapper = mount(ProductCardSkeleton, {
            props: { variant: 'featured' }
        })

        expect(wrapper.classes()).toContain('ring-2')
        expect(wrapper.classes()).toContain('ring-gray-300')
        expect(wrapper.classes()).toContain('ring-opacity-50')
    })

    it('shows category skeleton only in default variant', () => {
        const wrapperDefault = mount(ProductCardSkeleton, {
            props: { variant: 'default' }
        })

        const wrapperCompact = mount(ProductCardSkeleton, {
            props: { variant: 'compact' }
        })

        // Default variant should have category skeleton
        expect(wrapperDefault.find('.h-6.bg-gray-200.rounded-full').exists()).toBe(true)

        // Compact variant should not have category skeleton
        expect(wrapperCompact.find('.h-6.bg-gray-200.rounded-full').exists()).toBe(false)
    })

    it('shows stock info skeleton only in default variant', () => {
        const wrapperDefault = mount(ProductCardSkeleton, {
            props: { variant: 'default' }
        })

        const wrapperCompact = mount(ProductCardSkeleton, {
            props: { variant: 'compact' }
        })

        // Default variant should have stock info skeleton
        expect(wrapperDefault.find('.flex.items-center.justify-between').exists()).toBe(true)

        // Compact variant should not have stock info skeleton
        expect(wrapperCompact.find('.flex.items-center.justify-between').exists()).toBe(false)
    })

    it('has correct structure for skeleton elements', () => {
        const wrapper = mount(ProductCardSkeleton)

        // Image skeleton
        expect(wrapper.find('.aspect-square.bg-gray-200').exists()).toBe(true)

        // Content skeletons
        expect(wrapper.findAll('.h-4.bg-gray-300')).toHaveLength(1) // Product name
        expect(wrapper.findAll('.h-3.bg-gray-200')).toHaveLength(2) // Product name line 2 + stock text
        expect(wrapper.findAll('.h-6.bg-gray-300')).toHaveLength(1) // Price
        expect(wrapper.findAll('.h-4.bg-gray-200')).toHaveLength(1) // Stock badge
    })
})
