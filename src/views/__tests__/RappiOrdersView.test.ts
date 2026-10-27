import { flushPromises, shallowMount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import RappiOrdersView from '../RappiOrdersView.vue'

const mocks = vi.hoisted(() => ({ list: vi.fn(), events: vi.fn(), retry: vi.fn(), push: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: { branchId: '7' } }), useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/services/MainAPI/integrationApi', () => ({ integrationApi: { getRappiOrders: mocks.list, getRappiEvents: mocks.events, retryRappiReadyForPickup: mocks.retry } }))

it('paginates beyond 100 orders and refreshes the same page after a permitted READY retry', async () => {
  const order = {
    id: 12, externalOrderId: 'synthetic-order', status: 'accepted', total: 10000,
    validationErrors: [], lines: [], discounts: [],
    readyForPickup: { status: 'outbox_failed', attemptCount: 10, retryable: true, error: 'Revisar envío' },
  }
  mocks.list.mockImplementation((_branch, _signal, page) => Promise.resolve({
    data: { items: [order], totalCount: 151, page, pageSize: 25, totalPages: 7 },
  }))
  mocks.retry.mockResolvedValue({ data: { queued: true } })
  mocks.events.mockResolvedValue({ data: { items: [], totalCount: 0, totalPages: 0 } })
  const wrapper = shallowMount(RappiOrdersView, { global: { stubs: {
    BaseCard: { template: '<section><slot /></section>' },
    BaseButton: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
    BaseDialog: { template: '<div />' },
  } } })
  await flushPromises()
  expect(mocks.list).toHaveBeenLastCalledWith(7, expect.any(AbortSignal), 1)
  expect(wrapper.text()).toContain('151 órdenes')
  expect(wrapper.text()).toContain('Aceptada')
  const next = wrapper.findAll('button').find(button => button.text() === 'Siguiente')!
  await next.trigger('click')
  await flushPromises()
  expect(mocks.list).toHaveBeenLastCalledWith(7, expect.any(AbortSignal), 2)
  const retry = wrapper.findAll('button').find(button => button.text() === 'Reintentar envío de Listo')!
  await retry.trigger('click')
  await flushPromises()
  expect(mocks.retry).toHaveBeenCalledExactlyOnceWith(12)
  expect(mocks.list).toHaveBeenLastCalledWith(7, expect.any(AbortSignal), 2)
  wrapper.unmount()
})

it('keeps orders available when the independent diagnostics request fails', async () => {
  mocks.list.mockResolvedValue({ data: {
    items: [{ id: 14, externalOrderId: 'order-without-diagnostics', status: 'accepted',
      validationErrors: [], lines: [], discounts: [], total: 18000 }],
    totalCount: 1, totalPages: 1,
  } })
  mocks.events.mockRejectedValue(new Error('Synthetic diagnostics outage'))
  const wrapper = shallowMount(RappiOrdersView, { global: { stubs: {
    BaseCard: { template: '<section><slot /></section>' },
    BaseAlert: { template: '<p><slot /></p>' },
    BaseDialog: { template: '<div />' },
  } } })
  await flushPromises()
  expect(wrapper.text()).toContain('order-without-diagnostics')
  expect(wrapper.text()).toContain('No fue posible cargar los eventos Rappi.')
  wrapper.unmount()
})
