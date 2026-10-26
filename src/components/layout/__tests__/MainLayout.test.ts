import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MainLayout from '../MainLayout.vue'

const harness = vi.hoisted(() => ({ route: {} as any }))
vi.mock('vue-router', () => ({
    useRoute: () => harness.route,
    useRouter: () => ({ push: vi.fn() }),
    RouterView: { template: '<div />' },
}))
vi.mock('@/composables/useSignalR', async () => {
    const { ref } = await import('vue')
    return { useSignalR: () => ({ on: vi.fn(), off: vi.fn(), connectionState: ref('disconnected') }) }
})
vi.mock('@/composables/useNetworkActivityManager', async () => {
    const { ref } = await import('vue')
    return { useNetworkActivityManager: () => ({ isPageVisible: ref(true), isUserActive: ref(true) }) }
})

describe('MainLayout route presentation', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        harness.route = reactive({ path: '/orders/new', fullPath: '/orders/new', meta: { noCard: true } })
    })

    it('uses route settings when optional Boolean props are absent and updates on navigation', async () => {
        const wrapper = shallowMount(MainLayout)
        expect(wrapper.get('main').classes()).toContain('overflow-hidden')
        expect(wrapper.get('main').classes()).not.toContain('px-6')
        expect(wrapper.find('.rounded-2xl').exists()).toBe(false)

        harness.route.path = harness.route.fullPath = '/products'
        harness.route.meta.noCard = false
        await nextTick()
        expect(wrapper.get('main').classes()).toContain('overflow-y-auto')
        expect(wrapper.find('.rounded-2xl').exists()).toBe(true)

        harness.route.path = harness.route.fullPath = '/orders/new'
        harness.route.meta.noCard = true
        await nextTick()
        expect(wrapper.get('main').classes()).toContain('overflow-hidden')
        expect(wrapper.find('.rounded-2xl').exists()).toBe(false)
        wrapper.unmount()
    })

    it('honors an explicit false prop over the route setting', () => {
        const wrapper = shallowMount(MainLayout, { props: { noCard: false } })
        expect(wrapper.get('main').classes()).toContain('overflow-y-auto')
        expect(wrapper.find('.rounded-2xl').exists()).toBe(true)
        wrapper.unmount()
    })
})
