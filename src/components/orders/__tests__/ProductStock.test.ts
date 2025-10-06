import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ProductStock from '@/components/orders/ProductStock.vue'

describe('ProductStock', () => {
    it('shows correct status for available stock', () => {
        const wrapper = mount(ProductStock, {
            props: { stock: 10 }
        })

        expect(wrapper.text()).toContain('Disponible (10)')
    })

    it('shows correct status for low stock', () => {
        const wrapper = mount(ProductStock, {
            props: { stock: 3 }
        })

        expect(wrapper.text()).toContain('Bajo stock (3)')
    })

    it('shows correct status for out of stock', () => {
        const wrapper = mount(ProductStock, {
            props: { stock: 0 }
        })

        expect(wrapper.text()).toContain('Sin stock')
    })

    it('applies correct variant classes for badge', () => {
        const wrapper = mount(ProductStock, {
            props: {
                stock: 10,
                variant: 'badge'
            }
        })

        expect(wrapper.findComponent({ name: 'BaseBadge' }).exists()).toBe(true)
    })

    it('applies correct variant classes for text', () => {
        const wrapper = mount(ProductStock, {
            props: {
                stock: 10,
                variant: 'text'
            }
        })

        expect(wrapper.find('span').exists()).toBe(true)
    })

    it('applies correct variant classes for bar', () => {
        const wrapper = mount(ProductStock, {
            props: {
                stock: 10,
                variant: 'bar'
            }
        })

        expect(wrapper.find('.bg-gray-200').exists()).toBe(true)
    })

    it('applies correct variant classes for icon', () => {
        const wrapper = mount(ProductStock, {
            props: {
                stock: 10,
                variant: 'icon'
            }
        })

        expect(wrapper.find('.flex.items-center.justify-center').exists()).toBe(true)
    })

    it('hides stock number when showNumber is false', () => {
        const wrapper = mount(ProductStock, {
            props: {
                stock: 10,
                showNumber: false
            }
        })

        expect(wrapper.text()).toContain('Disponible')
        expect(wrapper.text()).not.toContain('(10)')
    })

    it('uses custom low stock threshold', () => {
        const wrapper = mount(ProductStock, {
            props: {
                stock: 8,
                lowStockThreshold: 10
            }
        })

        expect(wrapper.text()).toContain('Bajo stock (8)')
    })
})
