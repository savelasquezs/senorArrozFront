import { computed, defineComponent, effectScope, h, nextTick, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { useDashboardSection } from '@/composables/dashboard/useDashboardSection'
import { useDashboardShellMockState } from '@/composables/dashboard/useDashboardShellMockState'
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds'
import type { DeliveryDashboardPayload } from '@/services/MainAPI/dashboardSectionApi'

const Page = defineComponent({ setup: () => () => h('div') })

describe('dashboard section navigation', () => {
  it('does not reset a real courier selection against mock rows when leaving or reentering Domicilios', async () => {
    const section = ref<DashboardSectionId>('domicilios')
    const driver = ref<number | 'all'>(9999)
    const payload = ref<DeliveryDashboardPayload | null>({ deliverymen: [] } as unknown as DeliveryDashboardPayload)
    const scope = effectScope()
    scope.run(() => useDashboardShellMockState({ branchId: ref(1), ventasComparisonRows: computed(() => []),
      activeSection: section, deliveryEvolutionDriverId: driver, deliveryFromApi: payload }))
    section.value = 'ventas'
    await nextTick()
    expect(driver.value).toBe(9999)
    section.value = 'domicilios'
    payload.value = null
    await nextTick()
    expect(driver.value).toBe(9999)
    scope.stop()
  })

  it('opens Domicilios directly and keeps existing query parameters when switching sections', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/dashboard', component: Page }] })
    await router.push('/dashboard?section=domicilios&other=kept')
    await router.isReady()
    const wrapper = mount(defineComponent({
      setup() {
        const section = useDashboardSection()
        return () => h('button', { onClick: () => { section.value = 'ventas' } }, section.value)
      },
    }), { global: { plugins: [router] } })
    expect(wrapper.text()).toBe('domicilios')
    await wrapper.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ section: 'ventas', other: 'kept' })
    expect(wrapper.text()).toBe('ventas')
    await router.push('/dashboard?section=unknown')
    expect(wrapper.text()).toBe('principal')
    wrapper.unmount()
  })
})
