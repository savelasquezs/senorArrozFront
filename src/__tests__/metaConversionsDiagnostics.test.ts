import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MetaConversionsDiagnosticsCard from '@/components/branches/MetaConversionsDiagnosticsCard.vue'

const getMetaConversionsDiagnostics = vi.hoisted(() => vi.fn())

vi.mock('@/services/MainAPI/integrationApi', () => ({
  integrationApi: { getMetaConversionsDiagnostics },
}))

const baseDiagnostics = {
  configured: true,
  pixelId: '1941546679814779',
  graphApiVersion: 'v25.0',
  eventSourceUrl: 'https://senorarroz.com',
  testMode: false,
  windowDays: 7,
  processed: 4,
  pending: 1,
  failed: 0,
  ignored: 2,
  latestProcessed: { orderId: 8450, metaProcessedAt: '2026-09-03T22:00:00Z' },
  latestFailure: null,
}

describe('MetaConversionsDiagnosticsCard', () => {
  beforeEach(() => getMetaConversionsDiagnostics.mockReset())

  it('shows validated server purchases without exposing a token field', async () => {
    getMetaConversionsDiagnostics.mockResolvedValue({ data: baseDiagnostics })

    const wrapper = mount(MetaConversionsDiagnosticsCard)
    await flushPromises()

    expect(wrapper.text()).toContain('1941546679814779')
    expect(wrapper.text()).toContain('ya existen compras confirmadas por el servidor')
    expect(wrapper.text()).toContain('#8450')
    expect(wrapper.text()).toContain('Omitidas')
    expect(wrapper.text().toLowerCase()).not.toContain('access token')
  })

  it('warns while the backend is still using Meta Test Events', async () => {
    getMetaConversionsDiagnostics.mockResolvedValue({
      data: { ...baseDiagnostics, testMode: true },
    })

    const wrapper = mount(MetaConversionsDiagnosticsCard)
    await flushPromises()

    expect(wrapper.text()).toContain('Meta CAPI está en modo de prueba')
    expect(wrapper.text()).toContain('META_CAPI_TEST_EVENT_CODE')
  })

  it('surfaces the last failed purchase', async () => {
    getMetaConversionsDiagnostics.mockResolvedValue({
      data: {
        ...baseDiagnostics,
        failed: 1,
        latestFailure: {
          orderId: 8451,
          metaStatus: 'failed',
          metaAttemptCount: 1,
          metaLastError: 'Meta rechazó el evento',
          metaNextAttemptAt: null,
        },
      },
    })

    const wrapper = mount(MetaConversionsDiagnosticsCard)
    await flushPromises()

    expect(wrapper.text()).toContain('existen envíos fallidos')
    expect(wrapper.text()).toContain('#8451')
    expect(wrapper.text()).toContain('Meta rechazó el evento')
  })
})
