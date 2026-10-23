import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({
    showError: vi.fn(),
    customersStore: {
        addresses: [] as any[],
        fetchAddresses: vi.fn().mockResolvedValue(undefined),
    },
    draftStore: {
        currentOrder: { branchId: 1, type: 'delivery' },
        changeOperationalBranch: vi.fn(),
    },
    dataStore: { current: null },
    branchContext: {
        selectedBranchId: 1,
        options: [
            { id: 1, name: 'Santander' },
            { id: 2, name: 'Manrique' },
        ],
    },
    authStore: {
        branchId: 1,
        user: { branchName: 'Santander' },
    },
}))

vi.mock('@/store/customers', () => ({
    useCustomersStore: () => dependencies.customersStore,
}))
vi.mock('@/store/ordersDrafts', () => ({
    useOrdersDraftsStore: () => dependencies.draftStore,
}))
vi.mock('@/store/ordersData', () => ({
    useOrdersDataStore: () => dependencies.dataStore,
}))
vi.mock('@/store/branchContext', () => ({
    useBranchContextStore: () => dependencies.branchContext,
}))
vi.mock('@/store/auth', () => ({
    useAuthStore: () => dependencies.authStore,
}))
vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ success: vi.fn(), error: dependencies.showError }),
}))

import AddressSelector from '@/components/customers/address/AddressSelector.vue'
import CustomerAddressForm from '@/components/customers/address/CustomerAddressForm.vue'
import AddressDeliveryFeeDialog from '@/components/customers/address/AddressDeliveryFeeDialog.vue'

describe('AddressSelector branch coverage', () => {
    beforeEach(() => {
        dependencies.customersStore.addresses = [
            {
                id: 10,
                customerId: 7,
                neighborhoodId: 20,
                neighborhoodName: 'Popular',
                address: 'Carrera 40 # 101-22',
                latitude: 6.28,
                longitude: -75.55,
                isPrimary: true,
                deliveryFee: 5000,
                branchServices: [{
                    branchId: 2,
                    branchName: 'Manrique',
                    neighborhoodId: 20,
                    neighborhoodName: 'Popular',
                    deliveryFee: 5000,
                    isCovered: true,
                }],
            },
            {
                id: 11,
                customerId: 7,
                neighborhoodId: 21,
                neighborhoodName: 'Santander',
                address: 'Calle 1 # 2-03',
                latitude: 6.24,
                longitude: -75.58,
                isPrimary: false,
                deliveryFee: 7000,
                branchServices: [{
                    branchId: 1,
                    branchName: 'Santander',
                    neighborhoodId: 21,
                    neighborhoodName: 'Santander',
                    deliveryFee: 7000,
                    isCovered: true,
                }],
            },
        ]
        dependencies.draftStore.currentOrder.branchId = 1
        dependencies.customersStore.fetchAddresses.mockClear()
        dependencies.draftStore.changeOperationalBranch.mockClear()
        dependencies.showError.mockClear()
    })

    it('does not offer a duplicate branch checkbox when creating an address inside an order', async () => {
        const wrapper = shallowMount(AddressSelector, {
            props: { customerId: 7, mode: 'draft' },
            // Shallow BaseDialog hides its slot by default; render it to inspect the form props.
            global: { stubs: { BaseDialog: { template: '<div><slot /></div>' } } },
        })
        await flushPromises()
        expect(wrapper.getComponent(CustomerAddressForm).props('allowBranchSelection')).toBe(false)
        expect(wrapper.getComponent(CustomerAddressForm).props('forOrderAddress')).toBe(true)
    })

    it('calculates coverage for whichever operational branch is selected, without switching the order', async () => {
        dependencies.draftStore.currentOrder.branchId = 3 // A future third branch
        const wrapper = shallowMount(AddressSelector, {
            props: { customerId: 7, mode: 'draft', operationBranchId: 3 },
            global: { stubs: { BaseDialog: { template: '<div><slot /></div>' } } },
        })
        await flushPromises()
        await wrapper.findAll('.cursor-pointer')[0].trigger('click')
        await flushPromises()

        expect(dependencies.showError).not.toHaveBeenCalled()
        expect(dependencies.draftStore.changeOperationalBranch).not.toHaveBeenCalled()
        expect(wrapper.getComponent(AddressDeliveryFeeDialog).props()).toMatchObject({
            branchId: 3,
            forOrderCreation: true,
        })
    })

    it('does not auto-select an address only covered by another branch', async () => {
        dependencies.customersStore.addresses = [dependencies.customersStore.addresses[0]]
        const wrapper = shallowMount(AddressSelector, {
            props: { customerId: 7, mode: 'draft' },
        })
        await flushPromises()
        expect(dependencies.showError).not.toHaveBeenCalled()
        expect(dependencies.draftStore.changeOperationalBranch).not.toHaveBeenCalled()
        expect(wrapper.emitted('addressSelected')).toBeUndefined()
    })

    it('keeps a shared covered address selectable without switching branches', async () => {
        const shared = dependencies.customersStore.addresses[1]
        shared.branchServices.push({
            branchId: 2, branchName: 'Manrique', neighborhoodId: 21,
            neighborhoodName: 'Santander', deliveryFee: 8000, isCovered: true,
        })
        dependencies.customersStore.addresses = [shared]
        const wrapper = shallowMount(AddressSelector, {
            props: { customerId: 7, mode: 'draft' },
        })
        await flushPromises()
        expect(dependencies.showError).not.toHaveBeenCalled()
        expect(wrapper.emitted('addressSelected')?.[0]?.[0]).toMatchObject({ id: 11 })
        expect(dependencies.draftStore.changeOperationalBranch).not.toHaveBeenCalled()
    })

    it('opens editing from the shared address text and clears only the selection', async () => {
        const wrapper = shallowMount(AddressSelector, {
            props: { customerId: 7, selectedAddress: 11, mode: 'persisted', operationBranchId: 1 },
            global: { stubs: { BaseDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot /></div>' } } },
        })
        await flushPromises()
        expect(wrapper.get('[aria-label="Cambiar dirección"]').exists()).toBe(true)
        const address = wrapper.get('[aria-label="Editar dirección"]')
        expect(address.element.tagName).toBe('BUTTON')
        expect(address.text()).toContain('Calle 1 # 2-03')
        await address.trigger('click')
        expect(wrapper.getComponent(CustomerAddressForm).props('addressId')).toBe(11)
        await wrapper.get('[aria-label="Quitar dirección"]').trigger('click')
        expect(wrapper.emitted('addressSelected')?.at(-1)).toEqual([undefined])
        expect(dependencies.customersStore.addresses).toHaveLength(2)
        wrapper.unmount()
    })

    it('hides the change action when the customer has only one address', async () => {
        dependencies.customersStore.addresses = [dependencies.customersStore.addresses[1]]
        const wrapper = shallowMount(AddressSelector, { props: { customerId: 7, selectedAddress: 11, compact: true } })
        await flushPromises()
        expect(wrapper.find('[aria-label="Cambiar dirección"]').exists()).toBe(false)
        expect(wrapper.find('[aria-label="Editar dirección"]').exists()).toBe(true)
        wrapper.unmount()
    })

})
