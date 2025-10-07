import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import OrderHeader from '../OrderHeader.vue'
import type { OrderType } from '@/types/order'

// Mock the useFormatting composable
vi.mock('@/composables/useFormatting', () => ({
    useFormatting: () => ({
        formatCurrency: (amount: number) => `$${amount.toLocaleString()}`
    })
}))

describe('OrderHeader', () => {
    const defaultProps = {
        orderType: 'onsite' as OrderType,
        totalItems: 3,
        totalAmount: 25000
    }

    const createWrapper = (props = {}) => {
        return mount(OrderHeader, {
            props: {
                ...defaultProps,
                ...props
            },
            global: {
                stubs: {
                    BaseCard: {
                        template: '<div class="base-card" :class="$attrs.class"><slot /></div>',
                        props: ['class']
                    },
                    BaseBadge: {
                        template: '<span class="base-badge" :class="type"><slot /></span>',
                        props: ['type', 'text', 'size']
                    },
                    BaseButton: {
                        template: '<button @click="$emit(\'click\')" :class="variant" :disabled="disabled"><slot /></button>',
                        props: ['variant', 'size', 'disabled']
                    },
                    BaseSelect: {
                        template: '<select @change="$emit(\'update:modelValue\', $event.target.value)" :value="modelValue"><option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option></select>',
                        props: ['modelValue', 'options', 'placeholder', 'size']
                    },
                    BaseLoading: {
                        template: '<div class="loading">Loading...</div>',
                        props: ['size']
                    }
                }
            }
        })
    }

    describe('Rendering', () => {
        it('renders order header with basic information', () => {
            const wrapper = createWrapper()

            expect(wrapper.find('.base-card').exists()).toBe(true)
            expect(wrapper.text()).toContain('En el local')
            expect(wrapper.text()).toContain('Cliente no seleccionado')
            expect(wrapper.text()).toContain('3 productos')
            expect(wrapper.text()).toContain('$25,000')
        })

        it('displays order number when provided', () => {
            const wrapper = createWrapper({
                orderNumber: 'ORD-123'
            })

            expect(wrapper.text()).toContain('#ORD-123')
        })

        it('displays customer name when provided', () => {
            const wrapper = createWrapper({
                customerName: 'Juan Pérez'
            })

            expect(wrapper.text()).toContain('Juan Pérez')
            expect(wrapper.text()).not.toContain('Cliente no seleccionado')
        })

        it('shows correct product count for singular', () => {
            const wrapper = createWrapper({
                totalItems: 1
            })

            expect(wrapper.text()).toContain('1 producto')
            expect(wrapper.text()).not.toContain('productos')
        })

        it('shows correct product count for plural', () => {
            const wrapper = createWrapper({
                totalItems: 5
            })

            expect(wrapper.text()).toContain('5 productos')
        })
    })

    describe('Order Types', () => {
        it('displays onsite order type correctly', () => {
            const wrapper = createWrapper({
                orderType: 'onsite'
            })

            expect(wrapper.text()).toContain('En el local')
            // Check that the component renders without errors for onsite type
            expect(wrapper.exists()).toBe(true)
        })

        it('displays delivery order type correctly', () => {
            const wrapper = createWrapper({
                orderType: 'delivery'
            })

            expect(wrapper.text()).toContain('A domicilio')
            // Check that the component renders without errors for delivery type
            expect(wrapper.exists()).toBe(true)
        })

        it('displays reservation order type correctly', () => {
            const wrapper = createWrapper({
                orderType: 'reservation'
            })

            expect(wrapper.text()).toContain('Reservación')
            // Check that the component renders without errors for reservation type
            expect(wrapper.exists()).toBe(true)
        })
    })

    describe('Actions', () => {
        it('emits typeChange when order type is changed', async () => {
            const wrapper = createWrapper()

            const select = wrapper.find('select')
            await select.setValue('delivery')
            await select.trigger('change')

            expect(wrapper.emitted('typeChange')).toBeTruthy()
            expect(wrapper.emitted('typeChange')?.[0]).toEqual(['delivery'])
        })

        it('emits clear when clear button is clicked', async () => {
            const wrapper = createWrapper()

            const clearButton = wrapper.find('button')
            await clearButton.trigger('click')

            expect(wrapper.emitted('clear')).toBeTruthy()
        })

        it('disables clear button when no items', () => {
            const wrapper = createWrapper({
                totalItems: 0
            })

            const clearButton = wrapper.find('button')
            expect(clearButton.attributes('disabled')).toBeDefined()
        })

        it('hides clear button when showClearButton is false', () => {
            const wrapper = createWrapper({
                showClearButton: false
            })

            expect(wrapper.find('button').exists()).toBe(false)
        })
    })

    describe('Loading State', () => {
        it('shows loading overlay when loading is true', () => {
            const wrapper = createWrapper({
                loading: true
            })

            expect(wrapper.find('.loading').exists()).toBe(true)
        })

        it('does not show loading overlay when loading is false', () => {
            const wrapper = createWrapper({
                loading: false
            })

            expect(wrapper.find('.loading').exists()).toBe(false)
        })
    })

    describe('Props Validation', () => {
        it('uses default props correctly', () => {
            const wrapper = createWrapper()

            expect(wrapper.props('showClearButton')).toBe(true)
            expect(wrapper.props('loading')).toBe(false)
        })

        it('handles all required props', () => {
            const props = {
                orderType: 'delivery' as OrderType,
                orderNumber: 'TEST-001',
                customerName: 'Test Customer',
                totalItems: 10,
                totalAmount: 50000,
                showClearButton: false,
                loading: true
            }

            const wrapper = createWrapper(props)

            expect(wrapper.props()).toMatchObject(props)
        })
    })

    describe('Accessibility', () => {
        it('has proper button labels', () => {
            const wrapper = createWrapper()

            const clearButton = wrapper.find('button')
            expect(clearButton.text()).toContain('Limpiar')
        })

        it('has proper select options', () => {
            const wrapper = createWrapper()

            const select = wrapper.find('select')
            const options = select.findAll('option')

            expect(options).toHaveLength(3)
            expect(options[0].text()).toBe('En el local')
            expect(options[1].text()).toBe('A domicilio')
            expect(options[2].text()).toBe('Reservación')
        })
    })

    describe('Responsive Design', () => {
        it('applies responsive classes', () => {
            const wrapper = createWrapper()

            // Check that the component renders without errors and has responsive structure
            expect(wrapper.exists()).toBe(true)
            expect(wrapper.html()).toContain('lg:flex-row')
        })

        it('handles different screen sizes', () => {
            const wrapper = createWrapper()

            // Check that responsive classes are applied
            expect(wrapper.html()).toContain('lg:flex-row')
            expect(wrapper.html()).toContain('sm:flex-row')
        })
    })

    describe('Currency Formatting', () => {
        it('formats currency correctly', () => {
            const wrapper = createWrapper({
                totalAmount: 123456
            })

            expect(wrapper.text()).toContain('$123,456')
        })

        it('handles zero amount', () => {
            const wrapper = createWrapper({
                totalAmount: 0
            })

            expect(wrapper.text()).toContain('$0')
        })
    })
})
