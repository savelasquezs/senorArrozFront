import { defineComponent, h, nextTick, type Ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    connectionState: null as unknown as Ref<string>,
    visible: null as unknown as Ref<boolean>,
    online: null as unknown as Ref<boolean>,
    on: vi.fn(),
    off: vi.fn(),
}))
vi.mock('@/composables/useSignalR', async () => {
    const { ref } = await import('vue')
    mocks.connectionState = ref('connecting')
    return { useSignalR: () => ({
        on: mocks.on,
        off: mocks.off,
        connectionState: mocks.connectionState,
    }) }
})
vi.mock('@/composables/useNetworkActivityManager', async () => {
    const { ref } = await import('vue')
    mocks.visible = ref(true)
    mocks.online = ref(true)
    return { useNetworkActivityManager: () => ({
        isPageVisible: mocks.visible,
        isOnline: mocks.online,
    }) }
})
import { useOrderManagementUpdates } from '../useOrderManagementUpdates'

let wrapper: VueWrapper | undefined
function mountUpdates(refresh: () => void) {
    wrapper = mount(defineComponent({
        setup() {
            useOrderManagementUpdates(() => {}, refresh, () => {})
            return () => h('div')
        },
    }))
}
describe('order management realtime refresh', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.connectionState.value = 'connecting'
        mocks.visible.value = true
        mocks.online.value = true
    })
    afterEach(() => {
        wrapper?.unmount()
        wrapper = undefined
    })
    it('does not fetch on the first SignalR connection but refreshes after reconnect', async () => {
        const refresh = vi.fn()
        mountUpdates(refresh)
        mocks.connectionState.value = 'connected'
        await nextTick()
        expect(refresh).not.toHaveBeenCalled()

        mocks.connectionState.value = 'reconnecting'
        await nextTick()
        mocks.connectionState.value = 'connected'
        await nextTick()
        expect(refresh).toHaveBeenCalledTimes(1)
    })
    it('continues notifying the view when it returns from the background', async () => {
        const refresh = vi.fn()
        mountUpdates(refresh)
        mocks.visible.value = false
        await nextTick()
        mocks.visible.value = true
        await nextTick()
        expect(refresh).toHaveBeenCalledTimes(1)
    })
})
