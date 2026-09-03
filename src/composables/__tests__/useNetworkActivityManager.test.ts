import { defineComponent, h } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNetworkActivityManager } from '@/composables/useNetworkActivityManager'

function mountManager() {
  let manager!: ReturnType<typeof useNetworkActivityManager>
  const wrapper = mount(defineComponent({
    setup() {
      manager = useNetworkActivityManager()
      return () => h('div')
    },
  }))
  return { wrapper, get manager() { return manager } }
}

describe('useNetworkActivityManager', () => {
  const wrappers: VueWrapper[] = []
  let visibilityState = 'visible'

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-02T15:00:00Z'))
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(
      () => visibilityState as DocumentVisibilityState,
    )
  })

  afterEach(() => {
    wrappers.splice(0).forEach(wrapper => wrapper.unmount())
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('suspende actividad al ocultarse y despierta al volver', () => {
    const mounted = mountManager()
    wrappers.push(mounted.wrapper)

    visibilityState = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(mounted.manager.isPageVisible.value).toBe(false)

    visibilityState = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(mounted.manager.isPageVisible.value).toBe(true)
    expect(mounted.manager.isUserActive.value).toBe(true)
  })

  it('entra en idle a los quince minutos y despierta con interacción', async () => {
    const mounted = mountManager()
    wrappers.push(mounted.wrapper)

    await vi.advanceTimersByTimeAsync(15 * 60_000)
    expect(mounted.manager.isUserActive.value).toBe(false)

    window.dispatchEvent(new Event('pointerdown'))
    expect(mounted.manager.isUserActive.value).toBe(true)
  })

  it('comparte un solo reloj y limpia listeners al desmontar', () => {
    const intervalSpy = vi.spyOn(window, 'setInterval')
    const first = mountManager()
    const second = mountManager()
    wrappers.push(first.wrapper, second.wrapper)

    expect(intervalSpy).toHaveBeenCalledTimes(1)
    first.wrapper.unmount()
    second.wrapper.unmount()
    wrappers.length = 0

    visibilityState = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(second.manager.isPageVisible.value).toBe(true)
  })
})
