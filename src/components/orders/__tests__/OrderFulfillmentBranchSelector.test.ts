import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DraftOrder } from '@/types/order'
import BaseSelect from '@/components/ui/BaseSelect.vue'

const mocks = vi.hoisted(() => ({
    getBranchOptions: vi.fn(),
    changeOperationalBranch: vi.fn(),
    warn: vi.fn(),
    showError: vi.fn(),
}))
vi.mock('@/services/MainAPI/branchApi', () => ({
    branchApi: { getBranchOptions: mocks.getBranchOptions },
}))
vi.mock('@/store/ordersDrafts', () => ({
    useOrdersDraftsStore: () => ({
        activeBranchId: 1,
        currentOrder: null,
        changeOperationalBranch: mocks.changeOperationalBranch,
    }),
}))
vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ warning: mocks.warn, error: mocks.showError }),
}))

import OrderFulfillmentBranchSelector from '../OrderFulfillmentBranchSelector.vue'

function draft(branchId = 1, tabId = 'tab-1'): DraftOrder {
    return {
        tabId, branchId, workspaceBranchId: 1, type: 'onsite',
        addressId: null, bankPayments: [], appPayment: null, paidInStoreCash: false,
    } as unknown as DraftOrder
}

describe('OrderFulfillmentBranchSelector', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.getBranchOptions.mockResolvedValue({ data: [
            { id: 1, name: 'Santander' }, { id: 2, name: 'Manrique' },
        ] })
        mocks.changeOperationalBranch.mockResolvedValue(true)
    })

    it('shows the selector for onsite without a customer or an address', async () => {
        const wrapper = shallowMount(OrderFulfillmentBranchSelector, { props: { order: draft() } })
        await flushPromises()

        const toggle = wrapper.get('[data-test="remote-branch-toggle"]')
        expect(toggle.element.tagName).toBe('BUTTON')
        expect(toggle.attributes('aria-expanded')).toBe('false')
        await toggle.trigger('click')
        await flushPromises()

        expect(mocks.changeOperationalBranch).toHaveBeenCalledOnce()
        expect(mocks.changeOperationalBranch).toHaveBeenCalledWith(2)
        expect(wrapper.getComponent(BaseSelect).props('options')).toEqual([
            { id: 2, name: 'Manrique' },
        ])
        expect(wrapper.getComponent(BaseSelect).props('label')).toBe('Sucursal donde se recoge')
    })

    it('does not change a branch until a destination is selected when multiple exist', async () => {
        mocks.getBranchOptions.mockResolvedValue({ data: [
            { id: 1, name: 'Santander' }, { id: 2, name: 'Manrique' }, { id: 3, name: 'Bello' },
        ] })
        const wrapper = shallowMount(OrderFulfillmentBranchSelector, { props: { order: draft() } })
        await flushPromises()
        await wrapper.get('[data-test="remote-branch-toggle"]').trigger('click')
        expect(mocks.changeOperationalBranch).not.toHaveBeenCalled()

        wrapper.getComponent(BaseSelect).vm.$emit('update:modelValue', 3)
        await flushPromises()
        expect(mocks.changeOperationalBranch).toHaveBeenCalledWith(3)
    })

    it('restores the origin for a remote order without changing the authenticated branch', async () => {
        const wrapper = shallowMount(OrderFulfillmentBranchSelector, { props: { order: draft(2) } })
        await flushPromises()
        expect(wrapper.get('[data-test="remote-branch-toggle"]').attributes('aria-expanded')).toBe('true')
        expect(wrapper.text()).toContain('Atiende Manrique · Volver a Santander')
        await wrapper.get('[data-test="remote-branch-toggle"]').trigger('click')
        await flushPromises()
        expect(mocks.changeOperationalBranch).toHaveBeenCalledWith(1)
    })

    it('does not switch branches on a failed load', async () => {
        mocks.getBranchOptions.mockRejectedValue(new Error('Conexión interrumpida'))
        const wrapper = shallowMount(OrderFulfillmentBranchSelector, { props: { order: draft() } })
        await flushPromises()
        expect(wrapper.find('[role="alert"]').text()).toContain('Conexión interrumpida')
        expect(wrapper.find('[data-test="remote-branch-toggle"]').exists()).toBe(false)
        expect(mocks.changeOperationalBranch).not.toHaveBeenCalled()
    })
})
