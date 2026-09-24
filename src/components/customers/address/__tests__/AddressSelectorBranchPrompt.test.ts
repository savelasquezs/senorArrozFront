import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({
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
    useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

import AddressSelector from '@/components/customers/address/AddressSelector.vue'
import OrderBranchSelectionDialog from '@/components/orders/OrderBranchSelectionDialog.vue'

describe('AddressSelector branch prompt', () => {
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
        dependencies.customersStore.fetchAddresses.mockClear()
        dependencies.draftStore.changeOperationalBranch.mockClear()
    })

    it('waits for an explicit address click before showing the branch dialog', async () => {
        const wrapper = shallowMount(AddressSelector, {
            props: { customerId: 7, mode: 'draft' },
        })
        await flushPromises()

        const dialog = wrapper.getComponent(OrderBranchSelectionDialog)
        expect(dialog.props('modelValue')).toBe(false)
        expect(wrapper.emitted('addressSelected')).toBeUndefined()

        await wrapper.findAll('.cursor-pointer')[0].trigger('click')
        await flushPromises()

        expect(dialog.props('modelValue')).toBe(true)
        expect(dialog.props('options')).toEqual([
            expect.objectContaining({ branchId: 2, branchName: 'Manrique' }),
        ])
    })

    it('opens the branch dialog automatically when the customer has only one address', async () => {
        dependencies.customersStore.addresses = [dependencies.customersStore.addresses[0]]

        const wrapper = shallowMount(AddressSelector, {
            props: { customerId: 7, mode: 'draft' },
        })
        await flushPromises()

        const dialog = wrapper.getComponent(OrderBranchSelectionDialog)
        expect(dialog.props('modelValue')).toBe(true)
        expect(dialog.props('options')).toEqual([
            expect.objectContaining({ branchId: 2, branchName: 'Manrique' }),
        ])
        expect(wrapper.emitted('addressSelected')).toBeUndefined()
    })
})
