import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BranchForm from '../BranchForm.vue'

describe('BranchForm auto delivery settings', () => {
  it('hydrates and submits the branch auto delivery configuration', async () => {
    const wrapper = mount(BranchForm, {
      props: {
        branch: {
          id: 7,
          name: 'Centro',
          address: 'Calle 1 # 2-30',
          phone1: '3001234567',
          latitude: 4.6,
          longitude: -74.08,
          deliveryAutoCompleteEnabled: true,
          deliveryAutoCompleteArrivalRadiusMeters: 45,
          deliveryAutoCompleteDepartureRadiusMeters: 130,
          deliveryAutoCompleteMinPresenceSeconds: 20,
          createdAt: '2026-08-13T00:00:00Z',
          updatedAt: '2026-08-13T00:00:00Z',
          totalUsers: 0,
          totalCustomers: 0,
          totalNeighborhoods: 0,
          activeUsers: 0,
          activeCustomers: 0,
          neighborhoods: [],
          users: [],
        },
      },
      global: {
        stubs: {
          GoogleMapsSelector: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Marcar pedidos como entregados')
    expect((wrapper.find('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true)

    await wrapper.find('form').trigger('submit')

    const payload = wrapper.emitted('submit')?.[0]?.[0] as Record<string, unknown>
    expect(payload).toMatchObject({
      deliveryAutoCompleteEnabled: true,
      deliveryAutoCompleteArrivalRadiusMeters: 45,
      deliveryAutoCompleteDepartureRadiusMeters: 130,
      deliveryAutoCompleteMinPresenceSeconds: 20,
    })
  })
})
