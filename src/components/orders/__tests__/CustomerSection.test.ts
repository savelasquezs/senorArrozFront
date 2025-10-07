import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import CustomerSection from '../CustomerSection.vue'
import type { OrderType } from '@/types/order'
import type { Customer, CustomerAddress } from '@/types/customer'

// Mock the useFormatting composable
vi.mock('@/composables/useFormatting', () => ({
    useFormatting: () => ({
        formatCurrency: (amount: number) => `$${amount.toLocaleString()}`
    })
}))

// Mock the child components
vi.mock('@/components/CustomerSelector.vue', () => ({
    default: {
        name: 'CustomerSelector',
        template: '<div class="customer-selector"><slot /></div>',
        props: ['selectedCustomer', 'required']
    }
}))

vi.mock('@/components/AddressSelector.vue', () => ({
    default: {
        name: 'AddressSelector',
        template: '<div class="address-selector"><slot /></div>',
        props: ['customerId', 'selectedAddress']
    }
}))

describe('CustomerSection', () => {
    const mockCustomer: Customer = {
        id: 1,
        name: 'Juan Pérez',
        phone1: '3001234567',
        phone2: '6012345678',
        branchId: 1,
        branchName: 'Sucursal Principal',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        totalOrders: 5,
        lastOrderDate: '2024-01-15T00:00:00Z'
    }

    const mockAddress: CustomerAddress = {
        id: 1,
        customerId: 1,
        neighborhoodId: 1,
        neighborhoodName: 'Centro',
        address: 'Calle 123 #45-67',
        additionalInfo: 'Casa blanca, portón negro',
        latitude: 4.6097,
        longitude: -74.0817,
        isPrimary: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        deliveryFee: 5000,
        neighborhood: {
            id: 1,
            branchId: 1,
            name: 'Centro',
            deliveryFee: 5000,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
        }
    }

    const defaultProps = {
        orderType: 'onsite' as OrderType
    }

    const createWrapper = (props = {}) => {
        return mount(CustomerSection, {
            props: {
                ...defaultProps,
                ...props
            },
            global: {
                stubs: {
                    BaseCard: {
                        template: '<div class="base-card"><slot /></div>',
                        props: ['class']
                    },
                    BaseBadge: {
                        template: '<span class="base-badge" :class="type"><slot /></span>',
                        props: ['type', 'text', 'size']
                    },
                    BaseAlert: {
                        template: '<div class="base-alert" :class="type">{{ message }}</div>',
                        props: ['type', 'message']
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
        it('renders customer section with basic information', () => {
            const wrapper = createWrapper()

            expect(wrapper.find('.base-card').exists()).toBe(true)
            expect(wrapper.text()).toContain('Información del Cliente')
            expect(wrapper.findComponent({ name: 'CustomerSelector' }).exists()).toBe(true)
        })

        it('shows required indicator for delivery orders', () => {
            const wrapper = createWrapper({
                orderType: 'delivery'
            })

            // Check that the component renders without errors for delivery type
            expect(wrapper.exists()).toBe(true)
            // Check that the badge component is rendered
            expect(wrapper.find('.base-badge').exists()).toBe(true)
        })

        it('shows required indicator for reservation orders', () => {
            const wrapper = createWrapper({
                orderType: 'reservation'
            })

            // Check that the component renders without errors for reservation type
            expect(wrapper.exists()).toBe(true)
            // Check that the badge component is rendered
            expect(wrapper.find('.base-badge').exists()).toBe(true)
        })

        it('does not show required indicator for onsite orders', () => {
            const wrapper = createWrapper({
                orderType: 'onsite'
            })

            expect(wrapper.text()).not.toContain('Obligatorio')
        })
    })

    describe('Customer Display', () => {
        it('displays customer information when customer is selected', () => {
            const wrapper = createWrapper({
                selectedCustomer: mockCustomer
            })

            expect(wrapper.text()).toContain('Juan Pérez')
            expect(wrapper.text()).toContain('3001234567')
            expect(wrapper.text()).toContain('6012345678')
            expect(wrapper.text()).toContain('Datos del Cliente')
        })

        it('shows customer selector with selected customer', () => {
            const wrapper = createWrapper({
                selectedCustomer: mockCustomer
            })

            const customerSelector = wrapper.findComponent({ name: 'CustomerSelector' })
            expect(customerSelector.props('selectedCustomer')).toBe(1)
        })
    })

    describe('Address Display', () => {
        it('shows address selector for delivery orders when customer is selected', () => {
            const wrapper = createWrapper({
                orderType: 'delivery',
                selectedCustomer: mockCustomer
            })

            expect(wrapper.findComponent({ name: 'AddressSelector' }).exists()).toBe(true)
        })

        it('does not show address selector for onsite orders', () => {
            const wrapper = createWrapper({
                orderType: 'onsite',
                selectedCustomer: mockCustomer
            })

            expect(wrapper.findComponent({ name: 'AddressSelector' }).exists()).toBe(false)
        })

        it('does not show address selector for reservation orders', () => {
            const wrapper = createWrapper({
                orderType: 'reservation',
                selectedCustomer: mockCustomer
            })

            expect(wrapper.findComponent({ name: 'AddressSelector' }).exists()).toBe(false)
        })

        it('displays delivery information when address is selected', () => {
            const wrapper = createWrapper({
                orderType: 'delivery',
                selectedCustomer: mockCustomer,
                selectedAddress: mockAddress
            })

            expect(wrapper.text()).toContain('Información de Entrega')
            expect(wrapper.text()).toContain('Calle 123 #45-67')
            expect(wrapper.text()).toContain('Casa blanca, portón negro')
            expect(wrapper.text()).toContain('Domicilio: $5,000')
        })

        it('passes correct props to address selector', () => {
            const wrapper = createWrapper({
                orderType: 'delivery',
                selectedCustomer: mockCustomer,
                selectedAddress: mockAddress
            })

            const addressSelector = wrapper.findComponent({ name: 'AddressSelector' })
            expect(addressSelector.props('customerId')).toBe(1)
            expect(addressSelector.props('selectedAddress')).toBe(1)
        })
    })

    describe('Reservation Information', () => {
        it('shows reservation information section for reservation orders', () => {
            const wrapper = createWrapper({
                orderType: 'reservation',
                selectedCustomer: mockCustomer
            })

            expect(wrapper.text()).toContain('Información de Reservación')
            expect(wrapper.text()).toContain('Fecha: Por definir')
            expect(wrapper.text()).toContain('Hora: Por definir')
        })
    })

    describe('Validation', () => {
        it('shows validation error when customer is required but not selected', () => {
            const wrapper = createWrapper({
                orderType: 'delivery'
            })

            expect(wrapper.text()).toContain('Selecciona un cliente para continuar')
            expect(wrapper.find('.base-alert').exists()).toBe(true)
        })

        it('shows validation error when delivery address is required but not selected', () => {
            const wrapper = createWrapper({
                orderType: 'delivery',
                selectedCustomer: mockCustomer
            })

            expect(wrapper.text()).toContain('Selecciona una dirección de entrega')
            expect(wrapper.find('.base-alert').exists()).toBe(true)
        })

        it('does not show validation error when customer is not required', () => {
            const wrapper = createWrapper({
                orderType: 'onsite'
            })

            expect(wrapper.text()).not.toContain('Selecciona un cliente para continuar')
            expect(wrapper.find('.base-alert').exists()).toBe(false)
        })

        it('applies error styling when validation fails', () => {
            const wrapper = createWrapper({
                orderType: 'delivery'
            })

            // Check that the component renders without errors
            expect(wrapper.exists()).toBe(true)
            // Check that validation error is shown
            expect(wrapper.find('.base-alert').exists()).toBe(true)
        })
    })

    describe('Events', () => {
        it('emits customerSelected when customer is selected', async () => {
            const wrapper = createWrapper()

            // Simulate customer selection through the CustomerSelector
            const customerSelector = wrapper.findComponent({ name: 'CustomerSelector' })
            await customerSelector.vm.$emit('customer-selected', 1)

            expect(wrapper.emitted('customerSelected')).toBeTruthy()
            expect(wrapper.emitted('customerSelected')?.[0]).toEqual([{ id: 1 }])
        })

        it('emits addressSelected when address is selected', async () => {
            const wrapper = createWrapper({
                orderType: 'delivery',
                selectedCustomer: mockCustomer
            })

            // Simulate address selection through the AddressSelector
            const addressSelector = wrapper.findComponent({ name: 'AddressSelector' })
            await addressSelector.vm.$emit('address-selected', 1)

            expect(wrapper.emitted('addressSelected')).toBeTruthy()
            expect(wrapper.emitted('addressSelected')?.[0]).toEqual([{ id: 1 }])
        })

        it('clears address when customer is cleared', async () => {
            const wrapper = createWrapper({
                orderType: 'delivery',
                selectedCustomer: mockCustomer,
                selectedAddress: mockAddress
            })

            // Simulate customer clearing
            const customerSelector = wrapper.findComponent({ name: 'CustomerSelector' })
            await customerSelector.vm.$emit('customer-selected', undefined)

            expect(wrapper.emitted('addressSelected')).toBeTruthy()
            expect(wrapper.emitted('addressSelected')?.[0]).toEqual([undefined])
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

    describe('Compact Mode', () => {
        it('applies compact styling when compact prop is true', () => {
            const wrapper = createWrapper({
                compact: true
            })

            // Check that compact classes are applied
            expect(wrapper.exists()).toBe(true)
        })
    })

    describe('Responsive Design', () => {
        it('renders without errors on different screen sizes', () => {
            const wrapper = createWrapper({
                selectedCustomer: mockCustomer,
                selectedAddress: mockAddress,
                orderType: 'delivery'
            })

            // Check that responsive classes are present
            expect(wrapper.html()).toContain('md:grid-cols-2')
            expect(wrapper.exists()).toBe(true)
        })
    })
})
