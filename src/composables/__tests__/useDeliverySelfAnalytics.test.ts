import { effectScope, nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useDeliverySelfAnalytics } from '../dashboard/useDeliverySelfAnalytics'

const api = vi.hoisted(() => ({ self: vi.fn() }))
vi.mock('@/services/MainAPI/dashboardSectionApi', () => ({ fetchDeliveryDashboardForSelf: api.self, USE_DELIVERY_MOCK: false }))
describe('delivery analytics ownership', () => {
    it('does no work while hidden and aborts a request when leaving analytics', async () => {
        let finish!: (value: unknown) => void
        api.self.mockReturnValue(new Promise(resolve => { finish = resolve }))
        const scope = effectScope(), enabled = ref(false)
        const metrics = scope.run(() => useDeliverySelfAnalytics(ref([new Date(), new Date()]), ref(null), enabled))!
        expect(api.self).not.toHaveBeenCalled()
        enabled.value = true; await nextTick()
        expect(api.self).toHaveBeenCalledOnce()
        const signal = api.self.mock.calls[0][2] as AbortSignal
        enabled.value = false; await nextTick()
        expect(signal.aborted).toBe(true)
        finish({ avgPrepMinutes: 99 }); await flushPromises()
        expect(metrics.payload.value).toBeNull()
        expect(metrics.loading.value).toBe(false)
        scope.stop()
    })
})
