import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/auth'
import { useWhatsAppStore } from '@/store/whatsapp'
import MainLayout from '../MainLayout.vue'

const harness = vi.hoisted(() => ({ route: {} as any, push: vi.fn(), on: vi.fn() }))
vi.mock('vue-router', () => ({
    useRoute: () => harness.route,
    useRouter: () => ({ push: harness.push }),
    RouterView: { template: '<div />' },
}))
vi.mock('@/composables/useSignalR', async () => {
    const { ref } = await import('vue')
    return { useSignalR: () => ({ on: harness.on, off: vi.fn(), connectionState: ref('disconnected') }) }
})
vi.mock('@/composables/useNetworkActivityManager', async () => {
    const { ref } = await import('vue')
    return { useNetworkActivityManager: () => ({ isPageVisible: ref(true), isUserActive: ref(true) }) }
})
vi.mock('@/utils/orderCatalogBootstrap', () => ({ bootstrapOrderCatalog: vi.fn() }))

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

describe('WhatsApp desktop notifications', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('shows the incoming text and opens its conversation from the notification click', () => {
        const pinia = createPinia()
        harness.route = reactive({ path: '/orders', fullPath: '/orders', meta: {} })
        harness.on.mockClear()
        harness.push.mockClear()
        const auth = useAuthStore(pinia)
        auth.token = 'test'
        auth.user = { id: 7, name: 'Cajero', email: '', phone: '', active: true, role: 'Cashier', branchId: 1, branchName: 'Santander' }
        const store = useWhatsAppStore(pinia)
        vi.spyOn(store, 'ensureStatus').mockResolvedValue(null)
        vi.spyOn(store, 'applyRealtimeMessage').mockImplementation(() => {})
        const focus = vi.spyOn(window, 'focus').mockImplementation(() => {})

        const notifications: TestNotification[] = []
        class TestNotification {
            static permission = 'granted'
            title: string
            options: NotificationOptions
            onclick?: () => void
            close = vi.fn()
            constructor(title: string, options: NotificationOptions) {
                this.title = title
                this.options = options
                notifications.push(this)
            }
        }
        vi.stubGlobal('Notification', TestNotification)
        const wrapper = shallowMount(MainLayout, { global: { plugins: [pinia] } })
        const incoming = harness.on.mock.calls.find(([event]) => event === 'WhatsAppMessageCreated')![1]
        const conversation = { id: 1854, contactName: 'Milena' }
        const message = { id: 101, conversationId: 1854, direction: 'inbound', type: 'text', textBody: 'Hola\nQuiero un arroz súper.' }

        incoming({ branchId: 1, conversation, message })
        expect(notifications[0]).toMatchObject({ title: 'WhatsApp · Milena', options: { body: 'Hola Quiero un arroz súper.' } })
        expect(harness.push).not.toHaveBeenCalled()
        notifications[0]!.onclick?.()
        expect(focus).toHaveBeenCalledOnce()
        expect(notifications[0]!.close).toHaveBeenCalledOnce()
        expect(harness.push).toHaveBeenCalledWith({ name: 'WhatsApp', query: { conversationId: 1854 } })

        incoming({ branchId: 1, conversation, message: { ...message, id: 102, type: 'audio', textBody: '' } })
        incoming({ branchId: 1, conversation, message: { ...message, id: 103, textBody: '🍚'.repeat(121) } })
        incoming({ branchId: 1, conversation, message: { ...message, isUpdate: true } })
        expect(notifications.slice(1).map(n => n.options.body)).toEqual(['Audio', `${'🍚'.repeat(119)}…`])
        wrapper.unmount()
    })
})
