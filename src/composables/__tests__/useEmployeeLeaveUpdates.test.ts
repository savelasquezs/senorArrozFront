import { defineComponent, h, nextTick, type Ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  state: null as unknown as Ref<string>,
  on: vi.fn(),
  off: vi.fn(),
}))
vi.mock('@/composables/useSignalR', async () => {
  const { ref } = await import('vue')
  mocks.state = ref('connecting')
  return { useSignalR: () => ({
    on: mocks.on,
    off: mocks.off,
    connectionState: mocks.state,
  }) }
})
import { useEmployeeLeaveUpdates } from '../useEmployeeLeaveUpdates'

let wrapper: VueWrapper | undefined
function mountUpdates(refresh: () => void | Promise<void>) {
  wrapper = mount(defineComponent({
    setup() {
      useEmployeeLeaveUpdates(refresh)
      return () => h('div')
    },
  }))
}
describe('employee leave realtime refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.state.value = 'connecting'
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.restoreAllMocks()
  })

  it('does not repeat the page initial load when SignalR first connects normally', async () => {
    const refresh = vi.fn()
    mountUpdates(refresh)
    expect(mocks.on).toHaveBeenCalledWith('EmployeeLeaveChanged', expect.any(Function))
    mocks.state.value = 'connected'
    await nextTick()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('refreshes once after a genuine reconnection', async () => {
    const refresh = vi.fn()
    mountUpdates(refresh)
    mocks.state.value = 'connected'
    await nextTick()
    mocks.state.value = 'reconnecting'
    await nextTick()
    mocks.state.value = 'connected'
    await nextTick()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('refreshes on recovery from an initial failed connection', async () => {
    const refresh = vi.fn()
    mountUpdates(refresh)
    mocks.state.value = 'error'
    await nextTick()
    mocks.state.value = 'connecting'
    await nextTick()
    mocks.state.value = 'connected'
    await nextTick()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('refreshes when the composable mounts on a connected hub and later reconnects', async () => {
    mocks.state.value = 'connected'
    const refresh = vi.fn()
    mountUpdates(refresh)
    expect(refresh).not.toHaveBeenCalled()
    mocks.state.value = 'reconnecting'
    await nextTick()
    mocks.state.value = 'connected'
    await nextTick()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('continues refreshing for server events and visible tabs', async () => {
    const refresh = vi.fn()
    mountUpdates(refresh)
    const handler = mocks.on.mock.calls.find(([event]) => event === 'EmployeeLeaveChanged')?.[1]
    expect(handler).toBeTypeOf('function')
    handler()
    await flushPromises()
    expect(refresh).toHaveBeenCalledTimes(1)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('removes subscriptions and visibility listeners when unmounted', () => {
    const refresh = vi.fn()
    const remove = vi.spyOn(document, 'removeEventListener')
    mountUpdates(refresh)
    const handler = mocks.on.mock.calls.find(([event]) => event === 'EmployeeLeaveChanged')?.[1]
    wrapper!.unmount()
    wrapper = undefined
    expect(mocks.off).toHaveBeenCalledWith('EmployeeLeaveChanged', handler)
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  })
})
