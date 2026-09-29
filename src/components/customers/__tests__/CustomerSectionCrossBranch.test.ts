import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({
  drafts: {
    currentOrder: { guestName: '', branchId: 1 },
    ensureCustomerInList: vi.fn(),
    updateCustomer: vi.fn(),
    updateGuestName: vi.fn(),
    changeOperationalBranch: vi.fn().mockResolvedValue(true),
    updateAddress: vi.fn(),
    addAddressToCustomer: vi.fn(),
  },
}))

vi.mock('@/store/ordersDrafts', () => ({
  useOrdersDraftsStore: () => dependencies.drafts,
}))
vi.mock('@/composables/useOrderTabs', () => ({
  useOrderTabs: () => ({ updateOrderType: vi.fn() }),
}))

import CustomerSection from '@/components/customers/CustomerSection.vue'
import CustomerSelector from '@/components/customers/CustomerSelector.vue'

describe('CustomerSection cross-branch customer creation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dependencies.drafts.currentOrder = { guestName: '', branchId: 1 }
    dependencies.drafts.changeOperationalBranch.mockResolvedValue(true)
  })

  it('moves a new-customer draft to the service branch using the exact created address', async () => {
    const createdAddress = {
      id: 99,
      customerId: 10,
      neighborhoodId: 20,
      address: 'Carrera 30 # 40-50',
      isPrimary: true,
      deliveryFee: 6500,
      createdAt: '',
      updatedAt: '',
      branchServices: [{ branchId: 2, deliveryFee: 6500, isCovered: true }],
    }
    const customer = {
      id: 10,
      name: 'Cliente nuevo',
      branchId: 1,
      active: true,
      createdAt: '',
      updatedAt: '',
      addresses: [createdAddress],
      wasCreated: true,
    }
    const wrapper = shallowMount(CustomerSection, {
      props: { orderType: 'delivery', mode: 'draft', selectedCustomer: null },
    })

    wrapper.getComponent(CustomerSelector).vm.$emit('customer-selected', customer, 2, 99)
    await flushPromises()

    expect(dependencies.drafts.ensureCustomerInList).toHaveBeenCalledWith(customer)
    expect(dependencies.drafts.changeOperationalBranch).toHaveBeenCalledWith(2, createdAddress)
    expect(dependencies.drafts.updateAddress).toHaveBeenCalledWith(createdAddress)
  })
})
