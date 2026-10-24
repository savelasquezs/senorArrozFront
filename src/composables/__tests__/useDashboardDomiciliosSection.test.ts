import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { DeliveryDashboardPayload } from '@/services/MainAPI/dashboardSectionApi'
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds'
const { fetchDeliveryDashboard } = vi.hoisted(() => ({ fetchDeliveryDashboard: vi.fn() }))
vi.mock('@/services/MainAPI/dashboardSectionApi', () => ({ fetchDeliveryDashboard, USE_DELIVERY_MOCK: false }))
import { useDashboardDomiciliosSection } from '@/composables/dashboard/useDashboardDomiciliosSection'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}
const payload = (value: number) => ({ avgDeliveryMinutes: value } as DeliveryDashboardPayload)

describe('delivery dashboard requests', () => {
  it('requests the new date range while preserving branch, driver and Wednesday exclusion', async () => {
    fetchDeliveryDashboard.mockReset().mockResolvedValue(payload(10))
    const dates = ref<[Date, Date]>([new Date('2026-10-01T05:00:00Z'), new Date('2026-10-23T05:00:00Z')])
    const scope = effectScope()
    scope.run(() => useDashboardDomiciliosSection(ref<DashboardSectionId>('domicilios'), ref(1), dates, ref<number | 'all'>(26), ref(true)))
    await flushPromises()
    dates.value = [new Date('2026-10-22T05:00:00Z'), new Date('2026-10-22T05:00:00Z')]
    await nextTick()
    await flushPromises()
    expect(fetchDeliveryDashboard).toHaveBeenCalledTimes(2)
    expect(fetchDeliveryDashboard).toHaveBeenLastCalledWith(1, dates.value, 26, true, expect.any(AbortSignal))
    scope.stop()
  })

  it('reloads and sends the Wednesday filter to the API', async () => {
    fetchDeliveryDashboard.mockReset().mockResolvedValue(payload(10))
    const excluded = ref(false)
    const range: [Date, Date] = [new Date(), new Date()]
    const scope = effectScope()
    scope.run(() => useDashboardDomiciliosSection(ref<DashboardSectionId>('domicilios'), ref(1), ref(range), ref<number | 'all'>('all'), excluded))
    await flushPromises()
    excluded.value = true
    await nextTick()
    await flushPromises()
    expect(fetchDeliveryDashboard).toHaveBeenLastCalledWith(1, range, 'all', true, expect.any(AbortSignal))
    scope.stop()
  })
  it('ignores a response belonging to an earlier branch selection', async () => {
    const first = deferred<DeliveryDashboardPayload>(), second = deferred<DeliveryDashboardPayload>()
    fetchDeliveryDashboard.mockReset().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const branch = ref<number | null>(1)
    const scope = effectScope()
    const state = scope.run(() => useDashboardDomiciliosSection(ref<DashboardSectionId>('domicilios'), branch, ref([new Date(), new Date()] as [Date, Date]), ref<number | 'all'>('all')))!
    branch.value = 2
    await nextTick()
    second.resolve(payload(20))
    await flushPromises()
    first.resolve(payload(99))
    await flushPromises()
    expect(state.deliveryPayload.value?.avgDeliveryMinutes).toBe(20)
    expect(state.loading.value).toBe(false)
    scope.stop()
  })

  it('clears old results after a filter request fails and permits retry', async () => {
    fetchDeliveryDashboard.mockReset().mockResolvedValueOnce(payload(10)).mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce(payload(30))
    const branch = ref<number | null>(1)
    const scope = effectScope()
    const state = scope.run(() => useDashboardDomiciliosSection(ref<DashboardSectionId>('domicilios'), branch, ref([new Date(), new Date()] as [Date, Date]), ref<number | 'all'>('all')))!
    await flushPromises()
    branch.value = 2
    await nextTick()
    await flushPromises()
    expect(state.deliveryPayload.value).toBeNull()
    expect(state.error.value).toBe('Sin conexión')
    await state.refresh()
    expect(state.deliveryPayload.value?.avgDeliveryMinutes).toBe(30)
    expect(state.error.value).toBeNull()
    scope.stop()
  })
})
