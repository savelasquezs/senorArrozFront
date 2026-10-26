import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, onMounted, reactive } from 'vue'
import { RouterView } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import App from '@/App.vue'
import router from '@/router'

const counters = vi.hoisted(() => ({ shells: 0, customers: 0, products: 0 }))
const scope = reactive({ revision: 1 })
const auth = reactive({ user: { id: 7, role: 'Admin', branchId: 1, accountType: 'personal' },
    userRole: 'Admin', isAuthenticated: true, isKitchen: false, isSuperadmin: false,
    initializeAuth: vi.fn(),
})
vi.mock('@/store/auth', () => ({ useAuthStore: () => auth }))
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => ({
    get revision() { return scope.revision }, initializeForUser: vi.fn(), isInitialized: true, hasBranches: true,
}) }))
vi.mock('@/components/ui/DialogHost.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/layout/MainLayout.vue', () => ({ default: defineComponent({
    setup() { onMounted(() => counters.shells++); return () => h(RouterView) },
}) }))
vi.mock('@/views/CustomersList.vue', () => ({ default: defineComponent({
    setup() { onMounted(() => counters.customers++); return () => h('div', 'customers') },
}) }))
vi.mock('@/views/ProductsList.vue', () => ({ default: defineComponent({
    setup() { onMounted(() => counters.products++); return () => h('div', 'products') },
}) }))

describe('authenticated navigation', () => {
    it('keeps a single shell across screens and resets it for a real workspace change', async () => {
        await router.push('/customers')
        const wrapper = mount(App, { global: { plugins: [router] } })
        await flushPromises()
        for (let i = 0; i < 3; i++) {
            await router.push('/products'); await flushPromises()
            await router.push('/customers'); await flushPromises()
        }
        expect(counters.shells).toBe(1)
        expect(counters.customers).toBe(4)
        expect(counters.products).toBe(3)
        window.dispatchEvent(new CustomEvent('senor-arroz:chunk-recovery', { detail: { target: '/products' } }))
        await flushPromises()
        expect(wrapper.get('[role="alert"]').text()).toContain('Recargar y abrir')
        expect(wrapper.get('[role="alert"]').text()).toContain('Seguir aquí')
        expect(counters.shells).toBe(1)
        scope.revision++
        await flushPromises()
        expect(counters.shells).toBe(2)
        wrapper.unmount()
    })
})
